import { computeAcademicInfo } from "../utils/academic.js";

export const attachAcademicInfo = (req, res, next) => {
  try {
    const profile = req.profile; // must be populated earlier by attachResidentProfile
    if (!profile) {
      return res.status(400).json({ message: "Resident profile missing." });
    }

    const academicStartMonth = profile.academicStartMonth ?? 7;
    const programDuration = profile.programDuration ?? 4;

    const info = computeAcademicInfo(profile.batch, { academicStartMonth, programDuration });

    req.academic = {
      session: info.session,
      year: info.year,
      programDuration: info.programDuration,
      sessionStartYear: info.sessionStartYear,
    };

    next();
  } catch (err) {
    console.error("attachAcademicInfo error:", err);
    return res.status(500).json({ message: "Could not compute academic info." });
  }
};
