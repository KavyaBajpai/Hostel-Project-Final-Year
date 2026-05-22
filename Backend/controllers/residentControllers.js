import { complaints, messRefunds, mealOptOuts, residenceHistory, messBill, leaves, users, residentProfiles, fines, notices, attendanceRecords, hostelGeofences } from "../schema/schema.js";
import { connectToDB } from "../config/db.js";
import { eq, and, lte, gte, desc } from "drizzle-orm";
import { validateSemester } from "../utils/academic.js";
import { residentDocs } from "../schema/schema.js";
import {v2 as cloudinary} from "cloudinary"
import { queueAttendanceVerification } from "../utils/attendanceVerification.js";
import { validateAttendanceLocation } from "../utils/geofence.js";
import { notifyWardensNewLeave, notifyWardensNewComplaint } from "../utils/webPush.js";
//working
export const fillResidentProfile = async (req, res) => {
  try {
    const db = await connectToDB();
    const userId = req.user.id;

    const {
      batch,
      year,
      branch,
      phone,
      motherName,
      motherPhone,
      fatherName,
      fatherPhone,
      address,
      localGuardianName,
      localGuardianPhone,
      localGuardianAddress
    } = req.body;

    // Validate required fields
    if (!batch || !year || !branch || !phone || !motherName || !motherPhone || !fatherName || !fatherPhone || !address) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    // Check if profile already exists
    const existingProfile = await db
      .select()
      .from(residentProfiles)
      .where(eq(residentProfiles.userId, userId));

    let profile;
    if (existingProfile.length > 0) {
      // Update existing profile
      [profile] = await db
        .update(residentProfiles)
        .set({
          batch,
          year,
          branch,
          phone,
          motherName,
          motherPhone,
          fatherName,
          fatherPhone,
          address,
          localGuardianName,
          localGuardianPhone,
          localGuardianAddress
        })
        .where(eq(residentProfiles.userId, userId))
        .returning();
    } else {
      // Insert new profile
      [profile] = await db
        .insert(residentProfiles)
        .values({
          userId,
          batch,
          year,
          branch,
          phone,
          motherName,
          motherPhone,
          fatherName,
          fatherPhone,
          address,
          localGuardianName: localGuardianName || null,
          localGuardianPhone: localGuardianPhone || null,
          localGuardianAddress: localGuardianAddress || null
        })
        .returning();
    }

    return res.status(200).json({ message: "Resident profile saved successfully", profile });
  } catch (err) {
    console.error("Error saving resident profile:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getResidentProfile = (req, res) => {
  return res.status(200).json({ profile: req.profile });
};

//working
export const applyLeave = async (req, res) => {
  const userId = req.user.id;
  const { hostelName, batch } = req.profile;      // from attachResidentProfile
  const { session, year } = req.academic;         // from attachAcademicInfo
  const { fromDate, toDate, reason, destination, contactNo, semester } = req.body;

  // Basic required fields check (session/year no longer expected from body)
  if (!fromDate || !toDate || !reason || !destination || !contactNo || !semester) {
    return res.status(400).json({ message: "All fields are required." });
  }

  // Validate semester is consistent with year of study
  if (!validateSemester(Number(semester), year)) {
    return res.status(400).json({ message: "Invalid semester for your year of study." });
  }
  
  console.log( "seeing hostelName: " , hostelName );
  try {
    const db = await connectToDB();

    const [inserted] = await db.insert(leaves).values({
      userId,
      fromDate,
      toDate,
      reason,
      destination,
      contactNo,
      session,
      semester,
      batch,
      hostelName,
      year,
      status: "pending",
    }).returning();

    const residentName = req.profile?.name || req.user?.name || "A resident";
    notifyWardensNewLeave({
      hostelName,
      residentName,
      leaveId: inserted?.id,
      fromDate,
      toDate,
    }).catch(() => {});

    return res.status(201).json({ data: inserted, message: "Leave application submitted." });
  } catch (error) {
    console.error("Error applying leave:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const viewMyLeaves = async (req, res) => {
  const userId = req.user.id;
  const { session, year } = req.academic;
  const { status, semester } = req.query;

  try {
    const db = await connectToDB();

    const conditions = [
      eq(leaves.userId, userId),
      eq(leaves.session, session),
    ];

    if (semester) {
      const sem = Number(semester);
      if (!validateSemester(sem, year)) {
        return res.status(400).json({ message: "Invalid semester for your year of study." });
      }
      conditions.push(eq(leaves.semester, sem));
    }

    if (status) {
      conditions.push(eq(leaves.status, String(status).toLowerCase()));
    }

    const result = await db
      .select({
        id: leaves.id,
        fromDate: leaves.fromDate,
        toDate: leaves.toDate,
        reason: leaves.reason,
        destination: leaves.destination,
        contactNo: leaves.contactNo,
        status: leaves.status,
        semester: leaves.semester,
        session: leaves.session,
      })
      .from(leaves)
      .where(and(...conditions))
      .orderBy(desc(leaves.id));

    return res.status(200).json({
      leaves: result,
      message: "Leave applications fetched successfully.",
    });
  } catch (err) {
    console.error("Error fetching leave applications:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

//working
export const viewFines = async (req, res) => {
  const userId = req.user.id;
  const { session, year } = req.academic;   // ✅ from attachAcademicInfo
  // Expect semester only from body
  const { semester } = req.body;

  if (!semester) {
    return res.status(400).json({ message: "Semester is required." });
  }

  if (!validateSemester(Number(semester), year)) {
    return res.status(400).json({ message: "Invalid semester for your year of study." });
  }

  try {
    const db = await connectToDB();

    const fineRecords = await db
      .select()
      .from(fines)
      .where(
        and(
          eq(fines.userId, userId),
          eq(fines.session, session),
          eq(fines.semester, Number(semester))
        )
      );

    return res.status(200).json({ fines: fineRecords });
  } catch (error) {
    console.error("Error fetching fine records:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

//working
export const viewBills = async (req, res) => {
  const userId = req.user.id;
  const { session, year } = req.academic; // ✅ from middleware
  // Expect semester only from body
  const { semester } = req.body;

  if (!semester) {
    return res.status(400).json({ message: "Semester is required." });
  }

  const sem = Number(semester);
  if (isNaN(sem) || sem < 1 || sem > 8) {
    return res.status(400).json({ message: "Semester must be a number between 1 and 8." });
  }

  if (!validateSemester(sem, year)) {
    return res.status(400).json({ message: "Invalid semester for your year of study." });
  }

  try {
    const db = await connectToDB();

    const bills = await db
      .select()
      .from(messBill)
      .where(
        and(
          eq(messBill.userId, userId),
          eq(messBill.session, session),
          eq(messBill.semester, sem)
        )
      );

    if (!bills.length) {
      return res.status(404).json({ message: "No bills found for this semester." });
    }

    return res.status(200).json({
      message: "Bills fetched successfully.",
      bills,
    });
  } catch (error) {
    console.error("Error fetching bill:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

//working
export const viewOptOuts = async (req, res) => {
  const userId = req.user.id;
  const { session, year } = req.academic;   // ✅ comes from middleware
  const { semester } = req.query;

  if (!semester) {
    return res.status(400).json({ message: "Semester is required." });
  }

  const sem = Number(semester);
  if (isNaN(sem) || sem < 1 || sem > 8) {
    return res.status(400).json({ message: "Semester must be a number between 1 and 8." });
  }

  if (!validateSemester(sem, year)) {
    return res.status(400).json({ message: "Invalid semester for your year of study." });
  }

  try {
    const db = await connectToDB();

    const optOuts = await db
      .select()
      .from(mealOptOuts)
      .where(
        and(
          eq(mealOptOuts.userId, userId),
          eq(mealOptOuts.session, session),
          eq(mealOptOuts.semester, sem)
        )
      );

    if (!optOuts.length) {
      return res.status(404).json({ message: "No meal opt-outs found for this semester." });
    }

    return res.status(200).json({
      message: "Meal opt-outs fetched successfully.",
      optOuts,
    });
  } catch (err) {
    console.error("Error in viewing opt outs:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

//working
export const fileComplaint = async (req, res) => {
  const userId = req.user.id;
  const { hostelName, batch } = req.profile;   // ✅ middleware gives this
  const { session, year } = req.academic;      // ✅ derived automatically
  const { title, description, category, semester } = req.body;

  if (!title || !description || !category || !semester) {
    return res.status(400).json({ message: "All fields are required." });
  }

  const sem = Number(semester);
  if (!validateSemester(sem, year)) {
    return res.status(400).json({ message: "Invalid semester for your year of study." });
  }

  try {
    const db = await connectToDB();

    const result = await db
      .insert(complaints)
      .values({
        userId,
        title,
        description,
        category,
        status: "pending",
        batch,
        hostelName,
        year,
        session,
        semester: sem
      })
      .returning();

    const complaint = result[0];
    const residentName = req.profile?.name || req.user?.name || "A resident";
    notifyWardensNewComplaint({
      hostelName,
      residentName,
      complaintId: complaint.id,
      title,
      category,
    }).catch(() => {});

    res.status(201).json({
      message: "Complaint filed successfully.",
      complaint,
    });
  } catch (err) {
    console.error("Error in filing a complaint:", err);
    return res.status(500).json({ error: "Internal server error", message: err.message });
  }
};

//working
export const viewComplaints = async (req, res) => {
  const userId = req.user.id;
  const { session, year } = req.academic;   //  middleware
  const { status, semester } = req.query;

  try {
    const db = await connectToDB();

    const conditions = [
      eq(complaints.userId, userId),
      eq(complaints.session, session),
    ];

    if (semester) {
      const sem = Number(semester);
      if (!validateSemester(sem, year)) {
        return res.status(400).json({ message: "Invalid semester for your year of study." });
      }
      conditions.push(eq(complaints.semester, sem));
    }

    if (status) {
      conditions.push(eq(complaints.status, status));
    }

    const result = await db
      .select()
      .from(complaints)
      .where(and(...conditions));

    return res.status(200).json({
      complaints: result,
      message: "Complaints fetched successfully."
    });
  } catch (err) {
    console.error("Error in fetching complaints:", err);
    return res.status(500).json({
      error: "Internal server error",
      message: err.message
    });
  }
};

//working
export const markComplaintResolved = async (req, res) => {
  const userId = req.user.id;
  const complaintId = Number(req.params.id);

  if (isNaN(complaintId)) {
    return res.status(400).json({ message: "Invalid complaint ID." });
  }

  try {
    const db = await connectToDB();

    const complaint = await db
      .select()
      .from(complaints)
      .where(eq(complaints.id, complaintId));

    if (!complaint.length) {
      return res.status(404).json({ message: "Complaint not found." });
    }

    const comp = complaint[0];

    if (comp.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized to update this complaint." });
    }

    if (!["pending", "in-progress"].includes(comp.status)) {
      return res.status(400).json({ message: "Only pending or in-progress complaints can be marked as resolved." });
    }

    const updated = await db
      .update(complaints)
      .set({ status: "resolved" })
      .where(eq(complaints.id, complaintId))
      .returning();

    if (!updated.length) {
      return res.status(500).json({ message: "Failed to update complaint status." });
    }

    return res.status(200).json({
      message: "Complaint marked as resolved.",
      complaint: updated[0]
    });
  } catch (err) {
    console.error("Error in markComplaintResolved:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

//working
export const upsertResidence = async (req, res) => {
  const userId = req.user.id;
  const { session, year } = req.academic;   // ✅ from middleware
  const { semester, hostelName, roomNo } = req.body;

  if (!semester || !hostelName || !roomNo) {
    return res.status(400).json({ message: "Semester, hostel name, and room no. are required." });
  }

  const sem = Number(semester);
  if (!validateSemester(sem, year)) {
    return res.status(400).json({ message: "Invalid semester for your year of study." });
  }

  try {
    const db = await connectToDB();

    // Check if a record for this session already exists
    const existing = await db
      .select()
      .from(residenceHistory)
      .where(
        and(
          eq(residenceHistory.userId, userId),
          eq(residenceHistory.session, session)
        )
      );

    let residenceRecord;

    if (existing.length > 0) {
      // Update existing entry
      residenceRecord = await db
        .update(residenceHistory)
        .set({ semester: sem, year, hostelName, roomNo })
        .where(eq(residenceHistory.id, existing[0].id))
        .returning();
    } else {
      // Create new entry
      residenceRecord = await db
        .insert(residenceHistory)
        .values({
          userId,
          session,
          semester: sem,
          year,
          hostelName,
          roomNo
        })
        .returning();
    }

    // Always update current hostel in users table
    const updateUser = await db
      .update(users)
      .set({ hostelName })
      .where(eq(users.id, userId))
      .returning();

    if (!updateUser.length) {
      return res.status(500).json({ message: "Failed to update current hostel in users table." });
    }

    return res.status(existing.length > 0 ? 200 : 201).json({
      message: existing.length > 0 ? "Residence updated for this session." : "Residence record added.",
      residence: residenceRecord[0],
    });
  } catch (err) {
    console.error("Error in upsertResidence:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};


//changed
export const uploadDocs = async (req, res) => {
  const userId = req.user.id;
  const { name } = req.user;        // from JWT or profile middleware
  const { session, year } = req.academic;  // middleware gives these
  const { docType, semester } = req.body;

  if (!docType || !semester || !req.file) {
    return res.status(400).json({ message: "Document type, semester, and file are required." });
  }

  const sem = Number(semester);
  if (!validateSemester(sem, year)) {
    return res.status(400).json({ message: "Invalid semester for your year of study." });
  }

  try {
    const db = await connectToDB();
    console.log("cloudinary reponse: ", req.file);
    //const fileUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_NAME}/raw/upload/fl_inline/${req.file.filename}`;
    //const fileUrl= req.file.path;

    const cloudPath = req.file.filename; // Cloudinary path
    const fileUrl = cloudinary.url(cloudPath, {
      resource_type: 'raw',
      type: 'upload',
      secure: true,
      raw_convert: 'pdf',
      flags: 'attachment:false',
    });

    const inserted = await db.insert(residentDocs).values({
      userId,
      name,
      docType,
      fileUrl,
      session,
      semester: sem,
    }).returning();

    return res.status(201).json({
      message: "Document uploaded successfully",
      document: inserted[0],
    });
  } catch (err) {
    console.error("Error uploading document:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

//changed
export const viewMyRefund = async (req, res) => {
  try {
    const db = await connectToDB();
    const studentId = req.user.id;
    // Expect semester only from body
    const { semester } = req.body;

    if (!semester)
      return res.status(400).json({ message: "Semester is required" });

    // FIX: combine conditions using and(...) for Drizzle where clause
    const refund = await db
      .select()
      .from(messRefunds)
      .where(and(eq(messRefunds.studentId, studentId), eq(messRefunds.semester, semester)));

    if (!refund || refund.length === 0)
      return res.status(404).json({ message: "No refund available yet" });

    return res.status(200).json({ refund: refund[0] });
  } catch (err) {
    console.error("Error fetching refund:", err);
    res.status(500).json({ message: "Server error" });
  }
};

//working
export const registerMealOptOut = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized. User not found." });
    }

    const { fromDate, toDate, breakfast = false, lunch = false, snacks = false, dinner = false, semester } = req.body;
    if (!fromDate || !toDate) {
      return res.status(400).json({ message: "fromDate and toDate are required." });
    }

    const { hostelName } = req.profile; // from attachResidentProfile
    const { session } = req.academic; // from attachAcademicInfo

    const db = await connectToDB();

    // Check overlapping periods
    const overlap = await db
      .select()
      .from(mealOptOuts)
      .where(
        and(
          eq(mealOptOuts.userId, userId),
          lte(mealOptOuts.fromDate, toDate),
          gte(mealOptOuts.toDate, fromDate)
        )
      );

    if (overlap.length) {
      return res.status(400).json({ message: "You already have an opt-out registered for this period." });
    }

    // Insert opt-out
    const inserted = await db
      .insert(mealOptOuts)
      .values({
        userId,
        fromDate,
        toDate,
        breakfast,
        lunch,
        snacks,
        dinner,
        session,
        semester,
        hostelName
      })
      .returning();

    return res.status(201).json({
      message: "Meal opt-out registered successfully.",
      optOut: inserted[0]
    });
  } catch (err) {
    console.error("Error in registerMealOptOut:", err);
    return res.status(500).json({ message: "Server error while registering meal opt-out." });
  }
};

//working
export const getNotices = async (req, res) => {

  try{
    const userId= req.user.id;

    if(!userId)
      return res.status(401).json({message: "Unauthorized. User not found."});
    
    const {semester} = req.query;
    const {hostelName} = req.profile;
    const {session} = req.academic;
    
    const db = await connectToDB();
    const conditions = [
      eq(notices.session, session),
      eq(notices.hostelName, hostelName),
    ];

    if (semester) {
      const sem = Number(semester);
      if (!Number.isInteger(sem) || sem < 1 || sem > 8) {
        return res.status(400).json({ message: "Semester must be a number between 1 and 8." });
      }
      conditions.push(eq(notices.semester, sem));
    }

    const data = await db
    .select()
    .from(notices)
    .where(and(...conditions))
     .orderBy(desc(notices.createdAt));

    if (!data || data.length === 0) {
      return res.status(200).json({ message: "No notices found.", notices: [] });
    }
    return res.status(200).json({
      message: "Notices fetched successfully",
      notices: data,
    });


    
  }
  catch(error){
    console.error("Error fetching notices:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getDocuments = async (req, res) => {
   try{
    const userId= req.user.id;

    if(!userId)
      return res.status(401).json({message: "Unauthorized. User not found."});
    
    const {semester} = req.query;

    if(!semester)
      return res.status(400).json({message: "Semester is required."});

    const sem = Number(semester);
    if (!Number.isInteger(sem) || sem < 1 || sem > 8) {
      return res.status(400).json({ message: "Semester must be a number between 1 and 8." });
    }

    const {session} = req.academic;
    
    const db = await connectToDB();

    const data = await db
    .select()
    .from(residentDocs)
    .where(
      and(
           eq(residentDocs.semester, sem),
           eq(residentDocs.session, session),
           eq(residentDocs.userId, userId)
      )
    )
     .orderBy(desc(residentDocs.uploadedAt));

    const documents = data.map((doc) => ({
      ...doc,
      fileUrl: doc.fileUrl?.replace(/^http:\/\//i, "https://") ?? doc.fileUrl,
    }));

    if (!documents.length) {
      return res.status(200).json({ message: "No documents found.", documents: [] });
    }
    return res.status(200).json({
      message: "Documents fetched successfully",
      documents,
    });
  }
  catch(error){
    console.error("Error fetching documents:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export const markAttendance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { session, year } = req.academic;
    const { semester } = req.body;

    if (!semester) {
      return res.status(400).json({ message: "Semester is required." });
    }
    if (!req.file) {
      return res.status(400).json({ message: "Attendance video is required." });
    }

    const { latitude, longitude, locationAccuracy, locationCapturedAt } = req.body;
    const sem = Number(semester);
    if (!validateSemester(sem, year)) {
      return res.status(400).json({ message: "Invalid semester for your year of study." });
    }

    const db = await connectToDB();
    const userRow = await db
      .select({ hostelName: users.hostelName })
      .from(users)
      .where(eq(users.id, userId));

    if (!userRow.length) {
      return res.status(404).json({ message: "User not found." });
    }

    const hostelName = userRow[0].hostelName;

    const geofenceRows = await db
      .select()
      .from(hostelGeofences)
      .where(eq(hostelGeofences.hostelName, hostelName))
      .limit(1);

    const locationCheck = validateAttendanceLocation(
      {
        latitude,
        longitude,
        accuracy: locationAccuracy,
        capturedAt: locationCapturedAt,
      },
      geofenceRows[0]
    );

    if (!locationCheck.ok) {
      return res.status(403).json({
        message: locationCheck.message,
        code: locationCheck.code,
        distanceMeters: locationCheck.distanceMeters,
        allowedRadiusMeters: locationCheck.allowedRadiusMeters,
        accuracyMeters: locationCheck.accuracyMeters,
        maxAccuracyMeters: locationCheck.maxAccuracyMeters,
      });
    }

    const attendanceDate = new Date().toISOString().slice(0, 10);

    const allowMultiple = String(process.env.ALLOW_MULTIPLE_ATTENDANCE_PER_DAY || "").toLowerCase() === "true";
    if (!allowMultiple) {
      const existing = await db
        .select()
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.userId, userId),
            eq(attendanceRecords.attendanceDate, attendanceDate)
          )
        );

      if (existing.length) {
        return res.status(409).json({ message: "Attendance already marked for today." });
      }
    }

    const proofVideoUrl = req.file.path;
    const inserted = await db
      .insert(attendanceRecords)
      .values({
        userId,
        hostelName,
        session,
        semester: sem,
        academicYear: year,
        attendanceDate,
        status: "present",
        proofVideoUrl,
        checkInLatitude: String(latitude),
        checkInLongitude: String(longitude),
        locationAccuracyMeters:
          locationAccuracy != null && locationAccuracy !== ""
            ? String(locationAccuracy)
            : null,
        locationVerified: true,
        locationRemark: locationCheck.message,
      })
      .returning();

    queueAttendanceVerification(inserted[0]);

    return res.status(201).json({
      message: "Attendance marked successfully.",
      attendance: inserted[0],
    });
  } catch (error) {
    console.error("Error marking attendance:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getMyAttendance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { semester } = req.query;
    const { session, year } = req.academic;

    if (!semester) {
      return res.status(400).json({ message: "Semester is required." });
    }

    const sem = Number(semester);
    if (!validateSemester(sem, year)) {
      return res.status(400).json({ message: "Invalid semester for your year of study." });
    }

    const db = await connectToDB();
    const rows = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.userId, userId),
          eq(attendanceRecords.session, session),
          eq(attendanceRecords.semester, sem)
        )
      )
      .orderBy(desc(attendanceRecords.checkInTime));

    return res.status(200).json({ attendance: rows });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const uploadReferenceFaceImage = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!req.file) {
      return res.status(400).json({ message: "Reference face image is required." });
    }

    const db = await connectToDB();
    const existingProfile = await db
      .select()
      .from(residentProfiles)
      .where(eq(residentProfiles.userId, userId));

    if (!existingProfile.length) {
      return res.status(404).json({ message: "Create resident profile first, then upload face image." });
    }

    const updated = await db
      .update(residentProfiles)
      .set({ referenceFaceImageUrl: req.file.path })
      .where(eq(residentProfiles.userId, userId))
      .returning();

    return res.status(200).json({
      message: "Reference face image uploaded successfully.",
      referenceFaceImageUrl: updated[0]?.referenceFaceImageUrl || null,
    });
  } catch (error) {
    console.error("Error uploading reference face image:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
