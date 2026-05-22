import { and, eq } from "drizzle-orm";
import { connectToDB } from "../config/db.js";
import { attendanceRecords, residentProfiles } from "../schema/schema.js";
import http from "http";
import https from "https";
import { URL } from "url";

const VERIFY_URL = process.env.PYTHON_VERIFY_URL || "http://127.0.0.1:8001/verify-attendance";

export async function queueAttendanceVerification(attendanceRecord) {
  setImmediate(async () => {
    try {
      console.log(
        `[attendance-verifier] queued attendanceId=${attendanceRecord?.id} userId=${attendanceRecord?.userId} verifyUrl=${VERIFY_URL}`
      );
      await verifyAttendanceRecord(attendanceRecord);
    } catch (error) {
      console.error("Attendance verification queue error:", error);
    }
  });
}

function postJson(urlString, payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const data = JSON.stringify(payload);
    const lib = url.protocol === "https:" ? https : http;

    const req = lib.request(
      {
        method: "POST",
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () =>
          resolve({
            status: res.statusCode || 0,
            ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300,
            body,
          })
        );
      }
    );

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function verifyAttendanceRecord(attendanceRecord) {
  const db = await connectToDB();
  const [profile] = await db
    .select({ referenceFaceImageUrl: residentProfiles.referenceFaceImageUrl })
    .from(residentProfiles)
    .where(eq(residentProfiles.userId, attendanceRecord.userId));

  if (!profile?.referenceFaceImageUrl) {
    console.warn(
      `[attendance-verifier] no reference face image userId=${attendanceRecord.userId} attendanceId=${attendanceRecord.id}`
    );
    await db
      .update(attendanceRecords)
      .set({
        verificationStatus: "rejected",
        verificationSource: "system",
        verificationRemark: "Reference face image not available",
        verifiedAt: new Date(),
      })
      .where(eq(attendanceRecords.id, attendanceRecord.id));
    return;
  }

  const payload = {
    attendanceId: attendanceRecord.id,
    videoUrl: attendanceRecord.proofVideoUrl,
    referenceImageUrl: profile.referenceFaceImageUrl,
  };

  console.log(
    `[attendance-verifier] calling python attendanceId=${attendanceRecord.id} videoUrl=${payload.videoUrl} refUrl=${payload.referenceImageUrl}`
  );

  const response = await postJson(VERIFY_URL, payload);
  if (!response.ok) {
    console.error(
      `[attendance-verifier] python error attendanceId=${attendanceRecord.id} status=${response.status} body=${String(response.body).slice(0, 500)}`
    );
    throw new Error(`Verifier failed (${response.status})`);
  }

  let result;
  try {
    result = JSON.parse(response.body || "{}");
  } catch (e) {
    console.error(
      `[attendance-verifier] invalid json attendanceId=${attendanceRecord.id} body=${String(response.body).slice(0, 500)}`
    );
    throw e;
  }

  const matched = Boolean(result?.matched);
  const antispoofPassed =
    typeof result?.antispoof_passed === "boolean" ? result.antispoof_passed : true;
  const livenessPassed =
    typeof result?.liveness_passed === "boolean" ? result.liveness_passed : antispoofPassed;
  const livenessReason = result?.liveness_reason || "";
  const antispoofScore = result?.antispoof_score ?? null;
  const score = result?.score ?? null;
  const threshold = result?.threshold ?? null;
  const frameIndex = Number.isInteger(result?.frame_index) ? result.frame_index : null;
  const arcReason =
    result?.reason ||
    (matched ? "Auto verified by ArcFace." : "ArcFace match below threshold.");
  const reason = livenessPassed && antispoofPassed
    ? arcReason
    : `Rejected by anti-spoof/liveness: ${livenessReason || "liveness_failed"}${antispoofScore != null ? ` (score=${antispoofScore})` : ""}`;

  console.log(
    `[attendance-verifier] result attendanceId=${attendanceRecord.id} matched=${matched} livenessPassed=${livenessPassed} score=${score} frame=${frameIndex}`
  );

  const updated = await db
    .update(attendanceRecords)
    .set({
      verificationStatus: matched && livenessPassed && antispoofPassed ? "verified" : "rejected",
      verificationSource: "system",
      faceMatchScore: score !== null ? String(score) : null,
      faceMatchThreshold: threshold !== null ? String(threshold) : null,
      matchedFrameIndex: frameIndex,
      verificationRemark: reason,
      verifiedAt: new Date(),
    })
    .where(
      and(
        eq(attendanceRecords.id, attendanceRecord.id),
        eq(attendanceRecords.verificationStatus, "pending")
      )
    );

  console.log(
    `[attendance-verifier] updated attendanceId=${attendanceRecord.id} matched=${matched} score=${score} threshold=${threshold} frame=${frameIndex} dbRows=${updated?.rowCount ?? "n/a"}`
  );
}
