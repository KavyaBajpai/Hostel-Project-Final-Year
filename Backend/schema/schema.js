//import { timestamp } from "drizzle-orm/gel-core";
import { pgTable, serial, timestamp, varchar, text, integer, date, boolean, decimal} from "drizzle-orm/pg-core"

export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    name: varchar("name", {length: 100}).notNull(),
    email: varchar("email", {length: 100}).notNull().unique(),
    password: text("password").notNull(),
    role: varchar("role", {length: 20}).notNull(),
    hostelName: varchar("hostel_name").notNull()
});

export const mealOptOuts = pgTable("meal_opt_outs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),

  fromDate: date("from_date").notNull(),
  toDate: date("to_date").notNull(),

  breakfast: boolean("breakfast").default(false),
  lunch: boolean("lunch").default(false),
  snacks: boolean("snacks").default(false),
  dinner: boolean("dinner").default(false),

  session: varchar("session", { length: 10 }).notNull(),
  semester: integer("semester").notNull(),
  hostelName: varchar("hostel_name").notNull()
});

export const residentProfiles = pgTable("resident_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(), 
  batch: varchar("batch").notNull(),
  year: integer("year").notNull(),
  branch: varchar("branch").notNull(),
  phone: varchar("phone_no", {length: 15}).notNull(),
  referenceFaceImageUrl: varchar("reference_face_image_url", { length: 255 }),
  motherName: varchar("mother_name", { length: 100 }).notNull(),
  motherPhone: varchar("mother_phone", { length: 15 }).notNull(),
  fatherName: varchar("father_name", { length: 100 }).notNull(),
  fatherPhone: varchar("father_phone", { length: 15 }).notNull(),
  address: text("address").notNull(),
  localGuardianName: varchar("localGuardian_name", { length: 100 }),
  localGuardianPhone: varchar("localGuardian_phone", { length: 15 }),
  localGuardianAddress: text("localGuardian_address")
});

export const leaves = pgTable("leaves", {
   id: serial("id").primaryKey(),
   userId: integer("user_id").references(()=> users.id).notNull(),
   batch: varchar("batch").notNull(),
   year: integer("year").notNull(),
   hostelName: varchar("hostel_name").notNull(),
   fromDate: date("from_date").notNull(),
   toDate: date("to_date").notNull(),
   reason: text("reason").notNull(),
   destination: varchar("dsetination", {length: 100}).notNull(),
   contactNo: varchar("contact_no", {length: 15}).notNull(),
   status: varchar("status", {length: 20}).default("pending"),
   session: varchar("session").notNull(),
   semester: integer("semester").notNull()
});

export const fines = pgTable("fines", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(()=> users.id).notNull(),
  batch: varchar("batch").notNull(),
   year: integer("year").notNull(),
   hostelName: varchar("hostel_name").notNull(),
  amount: integer("amount").default(0),
  reason: varchar("reason").notNull(),
  date: date("date").notNull(),
  session: varchar("session").notNull(),
  semester: integer("semester").notNull()
});

export const messBill = pgTable("messBill", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(()=> users.id).notNull(),
  batch: varchar("batch").notNull(),
   year: integer("year").notNull(),
   hostelName: varchar("hostel_name").notNull(),
  paid: integer("paid").notNull(),
  used: integer("used").default(0),
  offs: integer("reduction").default( 0 ),
  extra: integer("extra").default(0),
  session: varchar("session").notNull(),
  semester: integer("semester").notNull()
});

export const extra = pgTable("extra", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(()=> users.id).notNull(),
  amount: integer("amount").notNull(),
  item: varchar("item").notNull(),
  session: varchar("session").notNull(),
  semester: integer("semester").notNull()
});



export const complaints = pgTable("complaints", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  batch: varchar("batch").notNull(),
   year: integer("year").notNull(),
   hostelName: varchar("hostel_name").notNull(),
  title: varchar("title", { length: 100 }),
  description: text("description"),
  category: varchar("category", { length: 50 }),
  status: varchar("status", { enum: ["pending", "in-progress", "resolved"] }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  session: varchar("session").notNull(),
  semester: integer("semester").notNull()
});

export const residenceHistory = pgTable("residence_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  session: varchar("session", { length: 10 }).notNull(),       // e.g., "2024-25"
  semester: integer("semester").notNull(),
  year: integer("year").notNull(),                             // 1, 2, 3, 4
  hostelName: varchar("hostel_name", { length: 100 }).notNull(),
  roomNo: varchar("room_no", { length: 10 }).notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const messExpenses = pgTable("mess_expenses", {
  id: serial("id").primaryKey(),
  month: varchar("month", { length: 20 }).notNull(),
  hostelName: varchar("hostel_name", { length: 100 }).notNull(),
  totalExpense: integer("total_expense").notNull(),
  billFile: varchar("bill_file_url", { length: 255 }), 
  uploadedBy: integer("uploaded_by").references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const residentDocs = pgTable("resident_docs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  docType: varchar("doc_type", { length: 100 }).notNull(), // e.g., "Aadhaar", "Guardian Consent"
  fileUrl: varchar("file_url", { length: 255 }).notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  name: varchar("name").notNull(),
  session: varchar("session").notNull(),
  semester: integer("semester").notNull()
});

export const notices = pgTable("notices", {
  id: serial("id").primaryKey(),
  title: varchar("title", {length: 255}).notNull(),
  body: text("body").notNull(),
  session: varchar("session").notNull(),
  semester: integer("semester").notNull(),
  hostelName: varchar("hostelName").notNull(),
  fileUrl: varchar("file_url", {length: 255}),
  issuedBy: integer("issued_by").references(()=> users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const hostelGeofences = pgTable("hostel_geofences", {
  hostelName: varchar("hostel_name", { length: 100 }).primaryKey(),
  centerLatitude: decimal("center_latitude", { precision: 10, scale: 7 }).notNull(),
  centerLongitude: decimal("center_longitude", { precision: 10, scale: 7 }).notNull(),
  radiusMeters: integer("radius_meters").default(150).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  updatedBy: integer("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const attendanceRecords = pgTable("attendance_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  hostelName: varchar("hostel_name", { length: 100 }).notNull(),
  session: varchar("session", { length: 20 }).notNull(),
  semester: integer("semester").notNull(),
  academicYear: integer("academic_year").notNull(),
  attendanceDate: date("attendance_date").notNull(),
  checkInTime: timestamp("check_in_time").defaultNow().notNull(),
  status: varchar("status", { length: 20 }).default("present").notNull(),
  proofVideoUrl: varchar("proof_video_url", { length: 255 }).notNull(),
  checkInLatitude: decimal("check_in_latitude", { precision: 10, scale: 7 }),
  checkInLongitude: decimal("check_in_longitude", { precision: 10, scale: 7 }),
  locationAccuracyMeters: decimal("location_accuracy_meters", { precision: 8, scale: 2 }),
  locationVerified: boolean("location_verified").default(false).notNull(),
  locationRemark: text("location_remark"),
  verificationStatus: varchar("verification_status", { length: 20 }).default("pending").notNull(),
  verificationSource: varchar("verification_source", { length: 20 }).default("system").notNull(),
  faceMatchScore: decimal("face_match_score", { precision: 6, scale: 4 }),
  faceMatchThreshold: decimal("face_match_threshold", { precision: 6, scale: 4 }),
  matchedFrameIndex: integer("matched_frame_index"),
  verifiedBy: integer("verified_by").references(() => users.id),
  verificationRemark: text("verification_remark"),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messRefunds = pgTable("mess_refunds", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),       // FK to users.id
  semester: varchar("semester", { length: 20 }).notNull(),
  baseRefund: decimal("base_refund", { precision: 10, scale: 2 }).notNull(),
  extraRefund: decimal("extra_refund", { precision: 10, scale: 2 }).notNull(),
  totalRefund: decimal("total_refund", { precision: 10, scale: 2 }).notNull(),
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
});