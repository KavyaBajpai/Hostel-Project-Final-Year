import { connectToDB } from "../config/db.js";
import { residentProfiles, users } from "../schema/schema.js";
import { eq } from "drizzle-orm";

export const attachResidentProfile = async (req, res, next) => {
  try {
    const userId = req.user?.id;   // req.user is already set by auth middleware
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized. User not found." });
    }

    const db = await connectToDB();

    // 1. Fetch resident profile
    const profileRes = await db
      .select()
      .from(residentProfiles)
      .where(eq(residentProfiles.userId, userId));

    if (!profileRes.length) {
      return res.status(404).json({ message: "Resident profile not found." });
    }

    const profile = profileRes[0];

    // 2. Fetch user record (hostel, name, email, etc.)
    const userRes = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!userRes.length) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = userRes[0];

    // 3. Merge both objects at app side
    const mergedProfile = {
      ...profile,
      hostelName: user.hostelName,
      name: user.name,
      email: user.email,
    };

    // Attach to request
    req.profile = mergedProfile;
    console.log("profile: ", mergedProfile);

    next();
  } catch (err) {
    console.error("Error in attachResidentProfile middleware:", err);
    return res.status(500).json({ message: "Server error while fetching profile." });
  }
};
