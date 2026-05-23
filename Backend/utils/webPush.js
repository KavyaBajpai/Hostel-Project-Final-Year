import { config } from "dotenv";
config();

import webpush from "web-push";
import { eq, and, inArray } from "drizzle-orm";
import { connectToDB } from "../config/db.js";
import { users, pushSubscriptions } from "../schema/schema.js";

let vapidConfigured = false;

function configureVapid() {
  if (vapidConfigured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:hostel@localhost";
  if (!publicKey || !privateKey) {
    console.warn("[webPush] VAPID keys missing — push notifications disabled.");
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}

const frontendBase = () =>
  (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

async function getWardenSubscriptionsForHostel(hostelName) {
  const db = await connectToDB();
  const wardens = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "warden"), eq(users.hostelName, hostelName)));

  if (!wardens.length) return [];

  const wardenIds = wardens.map((w) => w.id);
  return db
    .select()
    .from(pushSubscriptions)
    .where(inArray(pushSubscriptions.userId, wardenIds));
}

async function sendToSubscription(sub, payload) {
  const pushSubscription = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  };
  await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
}

async function pruneSubscription(db, endpoint) {
  try {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  } catch (err) {
    console.error("[webPush] Failed to prune subscription:", err.message);
  }
}

/**
 * Notify all wardens of a hostel via Web Push (works when browser tab is closed).
 */
export async function notifyWardensOfHostel(hostelName, { title, body, url, type, entityId }) {
  if (!configureVapid()) return;

  try {
    const subs = await getWardenSubscriptionsForHostel(hostelName);
    if (!subs.length) {
      console.log(`[webPush] No subscriptions for wardens of hostel: ${hostelName}`);
      return;
    }

    const payload = {
      title,
      body,
      url: url || `${frontendBase()}/warden`,
      type,
      entityId,
    };

    const db = await connectToDB();
    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await sendToSubscription(sub, payload);
        } catch (err) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await pruneSubscription(db, sub.endpoint);
          } else {
            console.error("[webPush] Send failed:", err.message);
          }
        }
      })
    );
  } catch (err) {
    console.error("[webPush] notifyWardensOfHostel error:", err);
  }
}

export async function notifyWardensNewLeave({ hostelName, residentName, leaveId, fromDate, toDate }) {
  await notifyWardensOfHostel(hostelName, {
    title: "New leave application",
    body: `${residentName} applied for leave (${fromDate} to ${toDate})`,
    url: `${frontendBase()}/warden/leaves`,
    type: "leave",
    entityId: leaveId,
  });
}

export async function notifyWardensNewComplaint({ hostelName, residentName, complaintId, title, category }) {
  await notifyWardensOfHostel(hostelName, {
    title: "New complaint filed",
    body: `${residentName}: ${title} (${category})`,
    url: `${frontendBase()}/warden/complaints`,
    type: "complaint",
    entityId: complaintId,
  });
}
