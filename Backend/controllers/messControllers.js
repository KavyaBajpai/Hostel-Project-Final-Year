import { connectToDB } from "../config/db.js";
import { mealOptOuts, messExpenses, users } from "../schema/schema.js";
import { and, gte, lte, eq } from "drizzle-orm";

// ✅ Get opt-out counts for a specific date and hostel (scoped by middleware)
//working
export const getOptOutCounts = async (req, res) => {
  try {
    const db = await connectToDB();
    const { date } = req.query;
    const hostel = req.hostelScope; // set by checkMessAccess or admin override

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }
    if (!hostel) {
      return res.status(400).json({ message: "Hostel is required" });
    }

    const today = new Date(date);

    // 1. Total students in that hostel
    const totalStudents = await db
      .select({ count: users.id })
      .from(users)
      .where(and(eq(users.role, "resident"), eq(users.hostelName, hostel)));

    const total = totalStudents.length ? parseInt(totalStudents[0].count) : 0;

    // 2. Students opted out on this date
    const optOuts = await db
      .select()
      .from(mealOptOuts)
      .where(
        and(
          lte(mealOptOuts.fromDate, today),
          gte(mealOptOuts.toDate, today),
          eq(mealOptOuts.hostelName, hostel)
        )
      );

    // 3. Subtract opt-outs from total
    let counts = {
      breakfast: total,
      lunch: total,
      snacks: total,
      dinner: total,
    };

    for (const entry of optOuts) {
      if (entry.breakfast) counts.breakfast--;
      if (entry.lunch) counts.lunch--;
      if (entry.snacks) counts.snacks--;
      if (entry.dinner) counts.dinner--;
    }

    return res.status(200).json({ date, hostel, totalStudents: total, counts });
  } catch (err) {
    console.error("Error in getOptOutCounts:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


// ✅ Upload mess expense with attached bill file (scoped by middleware)
export const uploadMessExpenseWithBill = async (req, res) => {
  try {
    const db = await connectToDB();
    const { month, totalExpense } = req.body;
    const hostelName = req.hostelScope;
    const uploadedBy = req.user.id;

    if (!month || !hostelName || !totalExpense || !req.file) {
      return res.status(400).json({
        message: "Month, total expense, and bill file are required. Use month format YYYY-MM (e.g. 2025-07) for refund calculation.",
      });
    }

    const expenseAmount = parseFloat(totalExpense);
    if (expenseAmount <= 0) {
      return res.status(400).json({ message: "Total expense must be positive" });
    }

    const billFileUrl = req.file.path;

    await db.insert(messExpenses).values({
      month,
      hostelName,
      totalExpense: expenseAmount,
      billFile: billFileUrl,
      uploadedBy,
    });

    return res.status(201).json({
      message: "Mess expense uploaded successfully",
      hostel: hostelName,
      file: billFileUrl,
    });
  } catch (err) {
    console.error("Error uploading mess expense:", err);
    res.status(500).json({ message: "Server error" });
  }
};
