import { eq } from "drizzle-orm";
import { connectToDB } from "../config/db.js";
import { hostelGeofences } from "../schema/schema.js";
import { isGeofenceEnabled, validateAttendanceLocation } from "../utils/geofence.js";

function resolveHostelName(req) {
  const fromBody = req.body?.hostelName;
  const fromQuery = req.query?.hostel || req.query?.hostelName;
  const fromUser = req.user?.hostelName;
  const fromScope = req.hostelScope;

  if (req.user?.role === "warden") {
    return fromScope || fromUser || fromBody || fromQuery;
  }
  if (req.user?.role === "admin") {
    return fromScope || fromBody || fromQuery || fromUser;
  }
  return fromScope || fromUser || fromBody || fromQuery;
}

function hostelScopeErrorMessage(req) {
  if (req.user?.role === "admin") {
    return "hostelName is required (select a hostel or pass hostelName in the request).";
  }
  if (!req.user?.hostelName) {
    return "Your account has no hostel assigned. Log out and log in again, or contact support.";
  }
  return "Hostel scope is required.";
}

export async function getHostelGeofenceForWarden(req, res) {
  try {
    const hostelName = resolveHostelName(req);
    if (!hostelName) {
      return res.status(400).json({ message: hostelScopeErrorMessage(req) });
    }

    const db = await connectToDB();
    const rows = await db
      .select()
      .from(hostelGeofences)
      .where(eq(hostelGeofences.hostelName, hostelName))
      .limit(1);

    return res.status(200).json({
      geofence: rows[0] || null,
      geofenceEnabled: isGeofenceEnabled(),
    });
  } catch (error) {
    console.error("Error fetching hostel geofence:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function upsertHostelGeofence(req, res) {
  try {
    const hostelName = resolveHostelName(req);
    if (!hostelName) {
      return res.status(400).json({ message: hostelScopeErrorMessage(req) });
    }

    if (req.user?.role === "warden" && req.user.hostelName && hostelName !== req.user.hostelName) {
      return res.status(403).json({ message: "Wardens can only configure their own hostel boundary." });
    }

    const { centerLatitude, centerLongitude, radiusMeters, isActive } = req.body;
    const lat = Number(centerLatitude);
    const lng = Number(centerLongitude);
    const radius = Number(radiusMeters ?? 150);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ message: "centerLatitude must be between -90 and 90." });
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ message: "centerLongitude must be between -180 and 180." });
    }
    if (!Number.isFinite(radius) || radius < 20 || radius > 5000) {
      return res.status(400).json({ message: "radiusMeters must be between 20 and 5000." });
    }

    const db = await connectToDB();
    const payload = {
      hostelName,
      centerLatitude: String(lat),
      centerLongitude: String(lng),
      radiusMeters: Math.round(radius),
      isActive: isActive !== false,
      updatedBy: req.user.id,
      updatedAt: new Date(),
    };

    const updated = await db
      .insert(hostelGeofences)
      .values(payload)
      .onConflictDoUpdate({
        target: hostelGeofences.hostelName,
        set: {
          centerLatitude: payload.centerLatitude,
          centerLongitude: payload.centerLongitude,
          radiusMeters: payload.radiusMeters,
          isActive: payload.isActive,
          updatedBy: payload.updatedBy,
          updatedAt: payload.updatedAt,
        },
      })
      .returning();

    return res.status(200).json({
      message: "Hostel geofence saved.",
      geofence: updated[0],
    });
  } catch (error) {
    console.error("Error saving hostel geofence:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function checkResidentLocation(req, res) {
  try {
    const hostelName = req.user?.hostelName;
    if (!hostelName) {
      return res.status(400).json({ message: "Hostel not found on user profile." });
    }

    const { latitude, longitude, accuracy, locationCapturedAt } = req.body;
    const db = await connectToDB();
    const rows = await db
      .select()
      .from(hostelGeofences)
      .where(eq(hostelGeofences.hostelName, hostelName))
      .limit(1);

    const result = validateAttendanceLocation(
      {
        latitude,
        longitude,
        accuracy,
        capturedAt: locationCapturedAt,
      },
      rows[0]
    );

    // Always 200 for preview checks — client reads `ok` / `code` (403 breaks axios UX).
    return res.status(200).json({
      ...result,
      geofenceConfigured: Boolean(rows[0]?.isActive),
      hostelName,
    });
  } catch (error) {
    console.error("Error checking resident location:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getResidentGeofenceStatus(req, res) {
  try {
    const hostelName = req.user?.hostelName;
    if (!hostelName) {
      return res.status(400).json({ message: "Hostel not found on user profile." });
    }

    const db = await connectToDB();
    const rows = await db
      .select({
        hostelName: hostelGeofences.hostelName,
        radiusMeters: hostelGeofences.radiusMeters,
        isActive: hostelGeofences.isActive,
      })
      .from(hostelGeofences)
      .where(eq(hostelGeofences.hostelName, hostelName))
      .limit(1);

    return res.status(200).json({
      geofenceEnabled: isGeofenceEnabled(),
      configured: Boolean(rows[0]?.isActive),
      radiusMeters: rows[0]?.radiusMeters ?? null,
      hostelName,
    });
  } catch (error) {
    console.error("Error fetching geofence status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
