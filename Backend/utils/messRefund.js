/**
 * End-of-semester mess refund calculation.
 *
 * Rules:
 * - Each resident deposits DEPOSIT at semester start.
 * - Sum mess_expenses for months in that semester → leftover = collected - spent.
 * - Opt-out points: per calendar day in each opt-out range, sum meal weights; cap per student.
 * - Points pool (POINTS_SHARE of leftover) is split by share of hostel capacity (n × max points),
 *   so one student cannot take the entire pool. Unallocated points-pool money returns to base pool.
 * - Base pool (+ returned surplus) split equally among all residents.
 * - Fines for the semester are deducted from gross refund (floor at 0).
 */

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];
const MONTH_SHORT = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export const MESS_CONFIG = {
  depositPerStudent: Number(process.env.MESS_DEPOSIT_PER_STUDENT || 20000),
  pointsShare: Number(process.env.MESS_POINTS_SHARE || 0.5),
  maxPointsPerStudent: Number(process.env.MESS_MAX_POINTS_PER_STUDENT || 45),
  pointsBreakfast: Number(process.env.MESS_POINTS_BREAKFAST || 2),
  pointsSnacks: Number(process.env.MESS_POINTS_SNACKS || 2),
  pointsLunch: Number(process.env.MESS_POINTS_LUNCH || 6),
  pointsDinner: Number(process.env.MESS_POINTS_DINNER || 6),
};

/** Normalize month input to YYYY-MM for storage and refund matching. */
export function normalizeExpenseMonth(input) {
  const raw = String(input ?? "").trim();
  const match = raw.match(/^(\d{4})[-/](\d{1,2})$/);
  if (!match) return null;
  const month = parseInt(match[2], 10);
  if (month < 1 || month > 12) return null;
  return `${match[1]}-${String(month).padStart(2, "0")}`;
}

export function parseSessionStartYear(session) {
  const start = parseInt(String(session).split("-")[0], 10);
  if (Number.isNaN(start)) {
    throw new Error("Invalid session format. Expected e.g. 2025-26.");
  }
  return start;
}

/** Calendar months (1–12) and year for each month in a semester. */
export function getSemesterCalendarMonths(session, semester) {
  const sessionStartYear = parseSessionStartYear(session);
  const sem = Number(semester);
  if (!Number.isInteger(sem) || sem < 1 || sem > 8) {
    throw new Error("Semester must be an integer between 1 and 8.");
  }

  const isOddSemester = sem % 2 === 1;
  if (isOddSemester) {
    return [7, 8, 9, 10, 11, 12].map((month) => ({ year: sessionStartYear, month }));
  }
  return [1, 2, 3, 4, 5, 6].map((month) => ({ year: sessionStartYear + 1, month }));
}

/** Acceptable string forms for matching mess_expenses.month */
export function buildSemesterMonthMatchers(session, semester) {
  const calendar = getSemesterCalendarMonths(session, semester);
  const keys = new Set();

  for (const { year, month } of calendar) {
    const mm = String(month).padStart(2, "0");
    keys.add(`${year}-${mm}`);
    keys.add(`${year}/${mm}`);
    keys.add(`${mm}-${year}`);
    keys.add(MONTH_NAMES[month - 1]);
    keys.add(MONTH_SHORT[month - 1]);
    keys.add(`${MONTH_NAMES[month - 1]} ${year}`);
    keys.add(`${MONTH_SHORT[month - 1]} ${year}`);
    keys.add(`${MONTH_NAMES[month - 1]}-${year}`);
  }

  return { calendar, keys };
}

export function expenseBelongsToSemester(expenseMonth, matchers) {
  if (!expenseMonth) return false;
  const raw = String(expenseMonth).trim().toLowerCase();
  if (matchers.keys.has(raw)) return true;

  const yyyymm = raw.match(/^(\d{4})[-/](\d{1,2})$/);
  if (yyyymm) {
    const key = `${yyyymm[1]}-${String(yyyymm[2]).padStart(2, "0")}`;
    if (matchers.keys.has(key)) return true;
  }

  for (const { year, month } of matchers.calendar) {
    const name = MONTH_NAMES[month - 1];
    const short = MONTH_SHORT[month - 1];
    if (raw.includes(String(year)) && (raw.includes(name) || raw.includes(short))) {
      return true;
    }
  }

  return false;
}

/** Parse YYYY-MM-DD (or ISO datetime) as UTC date-only. */
export function parseDateOnly(value) {
  if (value == null) return null;
  const str = String(value).slice(0, 10);
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

/** Inclusive day count between opt-out from/to dates. */
export function daysInclusive(fromDate, toDate) {
  const start = parseDateOnly(fromDate);
  const end = parseDateOnly(toDate);
  if (!start || !end || end < start) return 0;
  const msPerDay = 86400000;
  return Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
}

/** Meal weights for a single day (one opt-out row). */
export function pointsForOptOutRow(entry, config = MESS_CONFIG) {
  let points = 0;
  if (entry.breakfast) points += config.pointsBreakfast;
  if (entry.snacks) points += config.pointsSnacks;
  if (entry.lunch) points += config.pointsLunch;
  if (entry.dinner) points += config.pointsDinner;
  return points;
}

/**
 * Sum opt-out points per student: (points per day) × (days in range), capped at max per student.
 */
export function computeStudentPoints(optOutRows, studentIds, config = MESS_CONFIG) {
  const idSet = new Set(studentIds);
  const pointsPerStudent = {};
  for (const id of studentIds) pointsPerStudent[id] = 0;

  for (const entry of optOutRows) {
    if (!idSet.has(entry.userId)) continue;
    const days = daysInclusive(entry.fromDate, entry.toDate);
    if (days <= 0) continue;
    const perDay = pointsForOptOutRow(entry, config);
    pointsPerStudent[entry.userId] += perDay * days;
  }

  for (const id of studentIds) {
    pointsPerStudent[id] = Math.min(pointsPerStudent[id], config.maxPointsPerStudent);
  }

  return pointsPerStudent;
}

/**
 * Split points pool by share of total hostel point capacity (n × max points per student).
 * Returns per-student extra refunds and surplus returned to base pool.
 */
export function distributePointsPool(pointsPerStudent, studentIds, pointsPool, config = MESS_CONFIG) {
  const n = studentIds.length;
  const hostelPointCapacity = n * config.maxPointsPerStudent;
  const extraByStudent = {};
  let distributed = 0;

  if (hostelPointCapacity <= 0 || pointsPool <= 0) {
    for (const id of studentIds) extraByStudent[id] = 0;
    return { extraByStudent, surplus: pointsPool, hostelPointCapacity };
  }

  for (const id of studentIds) {
    const capped = Math.min(pointsPerStudent[id] || 0, config.maxPointsPerStudent);
    const share = capped / hostelPointCapacity;
    const extra = pointsPool * share;
    extraByStudent[id] = extra;
    distributed += extra;
  }

  const surplus = Math.max(0, pointsPool - distributed);
  return { extraByStudent, surplus, hostelPointCapacity };
}

export function computeMessRefunds({
  students,
  expenses,
  optOuts,
  finesRows,
  session,
  semester,
  config = MESS_CONFIG,
}) {
  const sem = Number(semester);
  const matchers = buildSemesterMonthMatchers(session, sem);
  const semesterExpenses = expenses.filter((e) => expenseBelongsToSemester(e.month, matchers));

  const studentIds = students.map((s) => s.id);
  const n = students.length;
  if (n === 0) {
    return { error: "NO_STUDENTS" };
  }

  const totalCollected = n * config.depositPerStudent;
  const totalExpenses = semesterExpenses.reduce((sum, e) => sum + Number(e.totalExpense || 0), 0);
  const leftover = totalCollected - totalExpenses;

  if (leftover <= 0) {
    return {
      session,
      semester: sem,
      studentCount: n,
      depositPerStudent: config.depositPerStudent,
      totalCollected,
      totalExpenses,
      leftoverFunds: leftover,
      pointsShare: config.pointsShare,
      includedExpenseMonths: semesterExpenses.map((e) => e.month),
      message: "No leftover funds to refund after mess expenses.",
      refunds: [],
    };
  }

  const pointsPerStudent = computeStudentPoints(optOuts, studentIds, config);
  const totalPoints = Object.values(pointsPerStudent).reduce((a, b) => a + b, 0);

  const pointsPool = leftover * config.pointsShare;
  const basePool = leftover - pointsPool;

  const { extraByStudent, surplus, hostelPointCapacity } = distributePointsPool(
    pointsPerStudent,
    studentIds,
    pointsPool,
    config
  );

  const effectiveBasePool = basePool + surplus;
  const baseRefundEach = effectiveBasePool / n;
  const poolPerCapacityPoint = hostelPointCapacity > 0 ? pointsPool / hostelPointCapacity : 0;

  const fineTotals = {};
  for (const id of studentIds) fineTotals[id] = 0;
  for (const fine of finesRows) {
    if (fineTotals[fine.userId] != null) {
      fineTotals[fine.userId] += Number(fine.amount || 0);
    }
  }

  const refunds = students.map((s) => {
    const points = pointsPerStudent[s.id] || 0;
    const extraRefund = extraByStudent[s.id] || 0;
    const grossRefund = baseRefundEach + extraRefund;
    const fineDeduction = fineTotals[s.id] || 0;
    const totalRefund = Math.max(0, grossRefund - fineDeduction);

    return {
      studentId: s.id,
      studentName: s.name,
      points,
      baseRefund: roundMoney(baseRefundEach),
      extraRefund: roundMoney(extraRefund),
      grossRefund: roundMoney(grossRefund),
      fineDeduction: roundMoney(fineDeduction),
      totalRefund: roundMoney(totalRefund),
    };
  });

  return {
    session,
    semester: sem,
    studentCount: n,
    depositPerStudent: config.depositPerStudent,
    totalCollected: roundMoney(totalCollected),
    totalExpenses: roundMoney(totalExpenses),
    leftoverFunds: roundMoney(leftover),
    pointsPool: roundMoney(pointsPool),
    basePool: roundMoney(basePool),
    pointsPoolReturnedToBase: roundMoney(surplus),
    effectiveBasePool: roundMoney(effectiveBasePool),
    totalPoints,
    hostelPointCapacity,
    poolPerCapacityPoint: roundMoney(poolPerCapacityPoint),
    pointsShare: config.pointsShare,
    maxPointsPerStudent: config.maxPointsPerStudent,
    includedExpenseMonths: semesterExpenses.map((e) => e.month),
    message: "Mess refunds calculated successfully.",
    refunds,
  };
}

function roundMoney(value) {
  return parseFloat(Number(value).toFixed(2));
}
