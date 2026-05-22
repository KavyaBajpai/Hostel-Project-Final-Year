import {
  computeMessRefunds,
  computeStudentPoints,
  daysInclusive,
  distributePointsPool,
  MESS_CONFIG,
} from "../utils/messRefund.js";

function assertClose(actual, expected, label) {
  if (Math.abs(actual - expected) > 0.02) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

// Kavya: snacks + dinner, 8–10 May → 3 days × 8 = 24 points
const days = daysInclusive("2026-05-08", "2026-05-10");
if (days !== 3) throw new Error(`daysInclusive: expected 3, got ${days}`);

const optOuts = [
  {
    userId: 99,
    fromDate: "2026-05-08",
    toDate: "2026-05-10",
    breakfast: false,
    lunch: false,
    snacks: true,
    dinner: true,
  },
];

const points = computeStudentPoints(optOuts, [99, 1, 2]);
if (points[99] !== 24) throw new Error(`points: expected 24, got ${points[99]}`);

const { extraByStudent, surplus, hostelPointCapacity } = distributePointsPool(
  points,
  [99, 1, 2],
  20000,
  MESS_CONFIG
);

if (hostelPointCapacity !== 135) throw new Error(`capacity: expected 135, got ${hostelPointCapacity}`);
assertClose(extraByStudent[99], 20000 * (24 / 135), "Kavya extra");
assertClose(surplus, 20000 - 20000 * (24 / 135), "surplus to base");

const result = computeMessRefunds({
  students: [
    { id: 99, name: "Kavya Bajpai" },
    { id: 1, name: "A" },
    { id: 2, name: "B" },
  ],
  expenses: [
    { month: "2026-04", totalExpense: 10000 },
    { month: "2026-05", totalExpense: 10000 },
  ],
  optOuts,
  finesRows: [],
  session: "2025-26",
  semester: 8,
});

const kavya = result.refunds.find((r) => r.studentId === 99);
assertClose(kavya.points, 24, "refund points");
assertClose(kavya.extraRefund, 3555.56, "refund extra");
assertClose(kavya.baseRefund, 12148.15, "refund base");
assertClose(result.pointsPoolReturnedToBase, 16444.44, "returned to base");

console.log("messRefund tests passed");
