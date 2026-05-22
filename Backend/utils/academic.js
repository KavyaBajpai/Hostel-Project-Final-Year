// utils/academic.js
export function computeAcademicInfo(batch, opts = {}) {
  const academicStartMonth = opts.academicStartMonth ?? 7; // default July
  const programDuration = opts.programDuration ?? 4;
  const now = opts.now ?? new Date();

  const month = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const sessionStartYear = month >= academicStartMonth ? currentYear : currentYear - 1;
  const nextYearShort = (sessionStartYear + 1).toString().slice(-2);
  const session = `${sessionStartYear}-${nextYearShort}`;

  const admissionYear = parseInt(String(batch).split("-")[0], 10);
  if (Number.isNaN(admissionYear)) {
    throw new Error("Invalid batch format (expected 'YYYY-YY' or 'YYYY-YYYY').");
  }

  let yearOfStudy = sessionStartYear - admissionYear + 1;
  if (yearOfStudy < 1) yearOfStudy = 1;
  if (yearOfStudy > programDuration) yearOfStudy = programDuration;

  return { session, year: yearOfStudy, programDuration, sessionStartYear };
}

export function validateSemester(semester, year, programDuration = 4) {
  if (!Number.isInteger(semester) || !Number.isInteger(year)) return false;
  if (year < 1 || year > programDuration) return false;

  const minSem = (year - 1) * 2 + 1;
  const maxSem = Math.min(programDuration * 2, year * 2);
  return semester >= minSem && semester <= maxSem;
}
