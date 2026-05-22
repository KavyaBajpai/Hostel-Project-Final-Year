import { connectToDB } from "../config/db.js";
import {
  leaves,
  complaints,
  users,
  residentProfiles,
  notices,
  messExpenses,
  mealOptOuts,
  attendanceRecords,
  fines,
  messRefunds,
} from "../schema/schema.js";
import { and, eq, inArray, desc } from "drizzle-orm";
import { computeMessRefunds, normalizeExpenseMonth } from "../utils/messRefund.js";

function resolveHostelScope(req, { bodyHostel, queryHostel } = {}) {
  const requested = bodyHostel || queryHostel;
  if (req.hostelScope) return req.hostelScope;
  if (req.user?.role === "admin" && requested) return requested;
  return null;
}

async function getMessExpenseForHostel(db, id, hostel) {
  const [row] = await db
    .select()
    .from(messExpenses)
    .where(and(eq(messExpenses.id, id), eq(messExpenses.hostelName, hostel)));
  return row ?? null;
}

// View Leaves //working
export const viewLeaves = async (req, res) => {
  try {
    const db = await connectToDB();
    const { status, session, semester } = req.query;

    if (!session || !semester) {
      return res.status(400).json({ message: "Session and semester are required." });
    }

    const sem = Number(semester);
    if (!Number.isInteger(sem)) {
      return res.status(400).json({ message: "Semester must be a valid number." });
    }

    // Enforce hostel scope from middleware (checkHostelAccess)
    const hostel = req.hostelScope;
    const conditions = [
      eq(leaves.session, session),
      eq(leaves.semester, sem),
    ];

    if (status) {
      conditions.push(eq(leaves.status, String(status).toLowerCase()));
    }
    if (hostel) {
      conditions.push(eq(users.hostelName, hostel));
    }

    const leavesData = await db
      .select({
        id: leaves.id,
        fromDate: leaves.fromDate,
        toDate: leaves.toDate,
        reason: leaves.reason,
        destination: leaves.destination,
        studentName: users.name,
        status: leaves.status,
        email: users.email,
      })
      .from(leaves)
      .leftJoin(users, eq(leaves.userId, users.id))
      .where(and(...conditions));

    return res.status(200).json({ leaves: leavesData });
  } catch (err) {
    console.error("Error viewing leave applications:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Approve Leave working
export const approveLeave = async (req, res) => {
  try {
    const db = await connectToDB();
    const leaveId = req.params.id;

    // Normalize status to lowercase to match resident-side filters and schema usage
    const updated = await db
      .update(leaves)
      .set({ status: "approved" })
      .where(eq(leaves.id, leaveId))
      .returning();

    if (!updated.length) {
      return res.status(404).json({ message: "Leave not found" });
    }

    return res.status(200).json({ message: "Leave approved", leave: updated[0] });
  } catch (err) {
    console.error("Error approving leave:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Reject Leave working
export const rejectLeave = async (req, res) => {
  try {
    const db = await connectToDB();
    const leaveId = req.params.id;

    // Normalize status to lowercase
    const updated = await db
      .update(leaves)
      .set({ status: "rejected" })
      .where(eq(leaves.id, leaveId))
      .returning();

    if (!updated.length) {
      return res.status(404).json({ message: "Leave not found" });
    }

    return res.status(200).json({ message: "Leave rejected", leave: updated[0] });
  } catch (err) {
    console.error("Error rejecting leave:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// View Complaints working
export const viewComplaints = async (req, res) => {
  try {
    const db = await connectToDB();
    const { session, semester, status } = req.query;

    if (!session || !semester) {
      return res.status(400).json({ message: "Session and semester are required." });
    }

    const hostel = req.hostelScope;
    const sem = Number(semester);
    if (!Number.isInteger(sem)) {
      return res.status(400).json({ message: "Semester must be a valid number." });
    }

    const conditions = [
      eq(complaints.session, session),
      eq(complaints.semester, sem),
    ];

    if (status) {
      conditions.push(eq(complaints.status, String(status).toLowerCase()));
    }
    if (hostel) {
      conditions.push(eq(complaints.hostelName, hostel));
    }

    const complaintsData = await db
      .select({
        id: complaints.id,
        title: complaints.title,
        description: complaints.description,
        category: complaints.category,
        createdAt: complaints.createdAt,
        studentName: users.name,
        email: users.email,
        status: complaints.status
      })
      .from(complaints)
      .leftJoin(users, eq(complaints.userId, users.id))
      .where(and(...conditions));

    return res.status(200).json({ complaints: complaintsData });
  } catch (err) {
    console.error("Error viewing complaints:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// View Residents working
export const viewResidents = async (req, res) => {
  try {
    const db = await connectToDB();
    const { session, semester } = req.query;

    if (!session || !semester) {
      return res.status(400).json({ message: "Session and semester are required." });
    }

    const hostel = req.hostelScope;

    const students = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        batch: residentProfiles.batch,
        branch: residentProfiles.branch,
        phone: residentProfiles.phone,
        address: residentProfiles.address,
        motherName: residentProfiles.motherName,
        motherPhone: residentProfiles.motherPhone,
        fatherName: residentProfiles.fatherName,
        fatherPhone: residentProfiles.fatherPhone,
        localGuardianName: residentProfiles.localGuardianName,
        localGuardianPhone: residentProfiles.localGuardianPhone,
        localGuardianAddress: residentProfiles.localGuardianAddress,
      })
      .from(users)
      .leftJoin(residentProfiles, eq(users.id, residentProfiles.userId))
      .where(
        and(
          eq(users.role, "resident"),
           eq(users.hostelName, hostel)
          // eq(residentProfiles.session, session),
          // eq(residentProfiles.semester, semester)
        )
      );

    return res
      .status(200)
      .json({ students, message: "Students' information fetched successfully." });
  } catch (err) {
    console.error("Error viewing residents:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Issue Notice 
export const issueNotice = async (req, res) => {
  try {
    const db = await connectToDB();
    const { title, body, session, semester } = req.body;
    const issuedBy = req.user.id;
    const hostelName = req.hostelScope;

    if (!title || !body || !session || !semester) {
      return res.status(400).json({ message: "Title, body, session and semester are required." });
    }
    if (!hostelName) {
      return res.status(400).json({ message: "Hostel scope is required to issue a notice." });
    }

    const sem = Number(semester);
    if (!Number.isInteger(sem) || sem < 1 || sem > 8) {
      return res.status(400).json({ message: "Semester must be a number between 1 and 8." });
    }

    const fileUrl = req.file?.path || null;

    const [newNotice] = await db
      .insert(notices)
      .values({
        title,
        body,
        session,
        semester: sem,
        hostelName,
        fileUrl,
        issuedBy,
      })
      .returning();

    return res
      .status(200)
      .json({ message: "Notice issued successfully.", notice: newNotice });
  } catch (err) {
    console.error("Error issuing notice:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// Calculate Mess Refunds (end of semester)
export const calculateMessRefunds = async (req, res) => {
  try {
    const db = await connectToDB();
    const { semester, session } = req.query;

    if (!semester || !session) {
      return res.status(400).json({ message: "Session and semester are required." });
    }

    const sem = Number(semester);
    if (!Number.isInteger(sem) || sem < 1 || sem > 8) {
      return res.status(400).json({ message: "Semester must be a number between 1 and 8." });
    }

    const hostel = req.hostelScope;
    if (!hostel) {
      return res.status(400).json({ message: "Hostel scope is required." });
    }

    const students = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(and(eq(users.hostelName, hostel), eq(users.role, "resident")));

    if (!students.length) {
      return res.status(404).json({ message: "No students found for this hostel." });
    }

    const studentIds = students.map((s) => s.id);

    const [expenses, optOuts, finesRows] = await Promise.all([
      db.select().from(messExpenses).where(eq(messExpenses.hostelName, hostel)),
      db
        .select()
        .from(mealOptOuts)
        .where(
          and(
            eq(mealOptOuts.hostelName, hostel),
            eq(mealOptOuts.session, session),
            eq(mealOptOuts.semester, sem),
            inArray(mealOptOuts.userId, studentIds)
          )
        ),
      db
        .select()
        .from(fines)
        .where(
          and(
            eq(fines.hostelName, hostel),
            eq(fines.session, session),
            eq(fines.semester, sem),
            inArray(fines.userId, studentIds)
          )
        ),
    ]);

    const result = computeMessRefunds({
      students,
      expenses,
      optOuts,
      finesRows,
      session,
      semester: sem,
    });

    if (result.error === "NO_STUDENTS") {
      return res.status(404).json({ message: "No students found for this hostel." });
    }

    if (result.refunds?.length) {
      await db
        .delete(messRefunds)
        .where(
          and(eq(messRefunds.semester, String(sem)), inArray(messRefunds.studentId, studentIds))
        );

      await db.insert(messRefunds).values(
        result.refunds.map((r) => ({
          studentId: r.studentId,
          semester: String(sem),
          baseRefund: String(r.baseRefund),
          extraRefund: String(r.extraRefund),
          totalRefund: String(r.totalRefund),
        }))
      );
    }

    return res.status(200).json({
      ...result,
      saved: Boolean(result.refunds?.length),
    });
  } catch (err) {
    console.error("Error calculating mess refunds:", err);
    if (err.message?.includes("session") || err.message?.includes("Semester")) {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: "Server error" });
  }
};

export const listAttendance = async (req, res) => {
  try {
    const db = await connectToDB();
    const { date, session, semester, verificationStatus } = req.query;
    const hostel = req.hostelScope;
    console.log("received data for fetching attendance: ", date, session, semester)
    if (!date) {
      return res.status(400).json({ message: "date is required." });
    }

    const conditions = [
      eq(attendanceRecords.attendanceDate, date),
    ];

    if (session) {
      conditions.push(eq(attendanceRecords.session, session));
    }
    if (semester) {
      const sem = Number(semester);
      if (!Number.isInteger(sem) || sem < 1 || sem > 8) {
        return res.status(400).json({ message: "Semester must be a number between 1 and 8." });
      }
      conditions.push(eq(attendanceRecords.semester, sem));
    }
    if (hostel) {
      conditions.push(eq(attendanceRecords.hostelName, hostel));
    }
    if (verificationStatus) {
      conditions.push(eq(attendanceRecords.verificationStatus, verificationStatus));
    }

    const rows = await db
      .select({
        id: attendanceRecords.id,
        userId: attendanceRecords.userId,
        studentName: users.name,
        email: users.email,
        attendanceDate: attendanceRecords.attendanceDate,
        checkInTime: attendanceRecords.checkInTime,
        status: attendanceRecords.status,
        proofVideoUrl: attendanceRecords.proofVideoUrl,
        verificationStatus: attendanceRecords.verificationStatus,
        verificationSource: attendanceRecords.verificationSource,
        faceMatchScore: attendanceRecords.faceMatchScore,
        faceMatchThreshold: attendanceRecords.faceMatchThreshold,
        matchedFrameIndex: attendanceRecords.matchedFrameIndex,
        verificationRemark: attendanceRecords.verificationRemark,
        checkInLatitude: attendanceRecords.checkInLatitude,
        checkInLongitude: attendanceRecords.checkInLongitude,
        locationAccuracyMeters: attendanceRecords.locationAccuracyMeters,
        locationVerified: attendanceRecords.locationVerified,
        locationRemark: attendanceRecords.locationRemark,
      })
      .from(attendanceRecords)
      .leftJoin(users, eq(attendanceRecords.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(attendanceRecords.checkInTime));
    console.log("response: ", rows);
    return res.status(200).json({ attendance: rows });
  } catch (error) {
    console.error("Error listing attendance:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const updateAttendanceVerification = async (req, res) => {
  try {
    const db = await connectToDB();
    const recordId = Number(req.params.id);
    const { action, remark } = req.body;

    if (!recordId || Number.isNaN(recordId)) {
      return res.status(400).json({ message: "Invalid attendance id." });
    }
    if (!["verify", "reject"].includes(action)) {
      return res.status(400).json({ message: "action must be either verify or reject." });
    }

    const verificationStatus = action === "verify" ? "verified" : "rejected";

    const updated = await db
      .update(attendanceRecords)
      .set({
        verificationStatus,
        verificationSource: "manual",
        verifiedBy: req.user.id,
        verificationRemark: remark || null,
        verifiedAt: new Date(),
      })
      .where(eq(attendanceRecords.id, recordId))
      .returning();

    if (!updated.length) {
      return res.status(404).json({ message: "Attendance record not found." });
    }

    return res.status(200).json({
      message: `Attendance ${verificationStatus} successfully.`,
      attendance: updated[0],
    });
  } catch (error) {
    console.error("Error updating attendance verification:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// —— Mess expenses (hostel monthly totals for refund calculation; not mess_bill) ——

export const listMessExpenses = async (req, res) => {
  try {
    const db = await connectToDB();
    const hostel = resolveHostelScope(req, { queryHostel: req.query.hostelName });
    if (!hostel) {
      return res.status(400).json({
        message: "Hostel scope is required. Wardens use their assigned hostel; admins may pass hostelName.",
      });
    }

    const rows = await db
      .select({
        id: messExpenses.id,
        month: messExpenses.month,
        hostelName: messExpenses.hostelName,
        totalExpense: messExpenses.totalExpense,
        uploadedBy: messExpenses.uploadedBy,
        uploadedByName: users.name,
        uploadedAt: messExpenses.uploadedAt,
      })
      .from(messExpenses)
      .leftJoin(users, eq(messExpenses.uploadedBy, users.id))
      .where(eq(messExpenses.hostelName, hostel))
      .orderBy(desc(messExpenses.month));

    return res.status(200).json({ hostel, expenses: rows });
  } catch (err) {
    console.error("Error listing mess expenses:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const createMessExpense = async (req, res) => {
  try {
    const db = await connectToDB();
    const { month, totalExpense, hostelName: bodyHostel } = req.body;
    const hostel = resolveHostelScope(req, { bodyHostel });

    if (!hostel) {
      return res.status(400).json({ message: "Hostel scope is required." });
    }

    const normalizedMonth = normalizeExpenseMonth(month);
    if (!normalizedMonth) {
      return res.status(400).json({
        message: "Invalid month. Use YYYY-MM (e.g. 2025-07) so refund calculation can include this expense.",
      });
    }

    const amount = parseInt(totalExpense, 10);
    if (!Number.isInteger(amount) || amount <= 0) {
      return res.status(400).json({ message: "Total expense must be a positive whole number (rupees)." });
    }

    const existing = await db
      .select({ id: messExpenses.id })
      .from(messExpenses)
      .where(and(eq(messExpenses.hostelName, hostel), eq(messExpenses.month, normalizedMonth)));

    if (existing.length) {
      return res.status(409).json({
        message: `An expense for ${normalizedMonth} already exists for this hostel. Edit or delete it first.`,
        existingId: existing[0].id,
      });
    }

    const [created] = await db
      .insert(messExpenses)
      .values({
        month: normalizedMonth,
        hostelName: hostel,
        totalExpense: amount,
        uploadedBy: req.user.id,
      })
      .returning();

    return res.status(201).json({
      message: "Mess expense recorded.",
      expense: created,
    });
  } catch (err) {
    console.error("Error creating mess expense:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const updateMessExpense = async (req, res) => {
  try {
    const db = await connectToDB();
    const expenseId = Number(req.params.id);
    const { month, totalExpense } = req.body;
    const hostel = resolveHostelScope(req);

    if (!hostel) {
      return res.status(400).json({ message: "Hostel scope is required." });
    }
    if (!expenseId || Number.isNaN(expenseId)) {
      return res.status(400).json({ message: "Invalid expense id." });
    }

    const current = await getMessExpenseForHostel(db, expenseId, hostel);
    if (!current) {
      return res.status(404).json({ message: "Mess expense not found for this hostel." });
    }

    const updates = {};
    if (month !== undefined) {
      const normalizedMonth = normalizeExpenseMonth(month);
      if (!normalizedMonth) {
        return res.status(400).json({ message: "Invalid month. Use YYYY-MM (e.g. 2025-07)." });
      }
      if (normalizedMonth !== current.month) {
        const clash = await db
          .select({ id: messExpenses.id })
          .from(messExpenses)
          .where(
            and(
              eq(messExpenses.hostelName, hostel),
              eq(messExpenses.month, normalizedMonth)
            )
          );
        if (clash.length) {
          return res.status(409).json({
            message: `Another expense for ${normalizedMonth} already exists for this hostel.`,
          });
        }
      }
      updates.month = normalizedMonth;
    }

    if (totalExpense !== undefined) {
      const amount = parseInt(totalExpense, 10);
      if (!Number.isInteger(amount) || amount <= 0) {
        return res.status(400).json({ message: "Total expense must be a positive whole number (rupees)." });
      }
      updates.totalExpense = amount;
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: "Provide month and/or totalExpense to update." });
    }

    const [updated] = await db
      .update(messExpenses)
      .set(updates)
      .where(eq(messExpenses.id, expenseId))
      .returning();

    return res.status(200).json({ message: "Mess expense updated.", expense: updated });
  } catch (err) {
    console.error("Error updating mess expense:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteMessExpense = async (req, res) => {
  try {
    const db = await connectToDB();
    const expenseId = Number(req.params.id);
    const hostel = resolveHostelScope(req);

    if (!hostel) {
      return res.status(400).json({ message: "Hostel scope is required." });
    }
    if (!expenseId || Number.isNaN(expenseId)) {
      return res.status(400).json({ message: "Invalid expense id." });
    }

    const current = await getMessExpenseForHostel(db, expenseId, hostel);
    if (!current) {
      return res.status(404).json({ message: "Mess expense not found for this hostel." });
    }

    await db.delete(messExpenses).where(eq(messExpenses.id, expenseId));

    return res.status(200).json({ message: "Mess expense deleted." });
  } catch (err) {
    console.error("Error deleting mess expense:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
