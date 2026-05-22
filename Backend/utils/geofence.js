const GEOFENCE_ENABLED =
  String(process.env.ATTENDANCE_GEOFENCE_ENABLED ?? "true").toLowerCase() !== "false";
const MAX_GPS_ACCURACY_M = Number(process.env.ATTENDANCE_MAX_GPS_ACCURACY_M || "200");
const LOCATION_MAX_AGE_SEC = Number(process.env.ATTENDANCE_LOCATION_MAX_AGE_SEC || "120");
const ALLOW_IF_UNCONFIGURED =
  String(process.env.GEOFENCE_ALLOW_IF_UNCONFIGURED ?? "false").toLowerCase() === "true";

export function isGeofenceEnabled() {
  return GEOFENCE_ENABLED;
}

export function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function parseCoordinate(value, name) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return { ok: false, code: "INVALID_COORDINATES", message: `${name} is required and must be a number.` };
  }
  if (name === "latitude" && (num < -90 || num > 90)) {
    return { ok: false, code: "INVALID_COORDINATES", message: "latitude must be between -90 and 90." };
  }
  if (name === "longitude" && (num < -180 || num > 180)) {
    return { ok: false, code: "INVALID_COORDINATES", message: "longitude must be between -180 and 180." };
  }
  return { ok: true, value: num };
}

export function validateAttendanceLocation(
  { latitude, longitude, accuracy, capturedAt },
  geofenceRow
) {
  if (!GEOFENCE_ENABLED) {
    return { ok: true, code: "GEOFENCE_DISABLED", message: "Geofence checks are disabled." };
  }

  const latParsed = parseCoordinate(latitude, "latitude");
  if (!latParsed.ok) return latParsed;
  const lngParsed = parseCoordinate(longitude, "longitude");
  if (!lngParsed.ok) return lngParsed;

  const lat = latParsed.value;
  const lng = lngParsed.value;

  const accuracyM = accuracy != null && accuracy !== "" ? Number(accuracy) : null;
  if (accuracyM != null && Number.isFinite(accuracyM) && accuracyM > MAX_GPS_ACCURACY_M) {
    return {
      ok: false,
      code: "GPS_INACCURATE",
      message: `GPS accuracy too low (${Math.round(accuracyM)}m; required ${MAX_GPS_ACCURACY_M}m or better). Enable precise location and try again near a window.`,
      accuracyMeters: accuracyM,
      maxAccuracyMeters: MAX_GPS_ACCURACY_M,
    };
  }

  if (capturedAt) {
    const capturedMs = new Date(capturedAt).getTime();
    if (!Number.isFinite(capturedMs)) {
      return { ok: false, code: "INVALID_TIMESTAMP", message: "locationCapturedAt is invalid." };
    }
    const ageSec = (Date.now() - capturedMs) / 1000;
    if (ageSec > LOCATION_MAX_AGE_SEC) {
      return {
        ok: false,
        code: "LOCATION_STALE",
        message: "Location fix is too old. Refresh location and submit again.",
        ageSeconds: Math.round(ageSec),
        maxAgeSeconds: LOCATION_MAX_AGE_SEC,
      };
    }
    if (ageSec < -30) {
      return {
        ok: false,
        code: "LOCATION_FUTURE",
        message: "Location timestamp is invalid.",
      };
    }
  }

  if (!geofenceRow || !geofenceRow.isActive) {
    if (ALLOW_IF_UNCONFIGURED) {
      return {
        ok: true,
        code: "GEOFENCE_UNCONFIGURED",
        message: "No active geofence for hostel; location stored without boundary check.",
      };
    }
    return {
      ok: false,
      code: "GEOFENCE_NOT_CONFIGURED",
      message: "Attendance location is not configured for your hostel. Contact the warden.",
    };
  }

  const centerLat = Number(geofenceRow.centerLatitude);
  const centerLng = Number(geofenceRow.centerLongitude);
  const radiusM = Number(geofenceRow.radiusMeters);

  if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng) || !Number.isFinite(radiusM)) {
    return {
      ok: false,
      code: "GEOFENCE_INVALID",
      message: "Hostel geofence configuration is invalid. Contact the warden.",
    };
  }

  const distanceMeters = haversineMeters(lat, lng, centerLat, centerLng);
  if (distanceMeters > radiusM) {
    return {
      ok: false,
      code: "GEOFENCE_OUTSIDE",
      message: "Attendance rejected: you are outside the allowed hostel area.",
      distanceMeters: Math.round(distanceMeters),
      allowedRadiusMeters: radiusM,
    };
  }

  return {
    ok: true,
    code: "GEOFENCE_INSIDE",
    message: "Inside hostel geofence.",
    distanceMeters: Math.round(distanceMeters),
    allowedRadiusMeters: radiusM,
  };
}
