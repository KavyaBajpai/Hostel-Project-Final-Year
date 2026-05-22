import { config } from "dotenv";
config();

import { eq } from "drizzle-orm";
import { connectToDB } from "../config/db.js";
import { pushSubscriptions } from "../schema/schema.js";
import { getVapidPublicKey } from "../utils/webPush.js";

export const getPushVapidPublicKey = (req, res) => {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return res.status(503).json({
      message: "Push notifications are not configured on the server.",
    });
  }
  return res.json({ publicKey });
};

export const subscribePush = async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ message: "Invalid push subscription payload." });
  }

  try {
    const db = await connectToDB();
    const userId = req.user.id;

    const existing = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint));

    if (existing.length) {
      await db
        .update(pushSubscriptions)
        .set({ userId, p256dh: keys.p256dh, auth: keys.auth })
        .where(eq(pushSubscriptions.endpoint, endpoint));
    } else {
      await db.insert(pushSubscriptions).values({
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      });
    }

    return res.status(201).json({ message: "Push subscription saved." });
  } catch (err) {
    console.error("subscribePush error:", err);
    return res.status(500).json({ message: "Failed to save push subscription." });
  }
};

export const unsubscribePush = async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) {
    return res.status(400).json({ message: "Endpoint is required." });
  }

  try {
    const db = await connectToDB();
    await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint));
    return res.json({ message: "Push subscription removed." });
  } catch (err) {
    console.error("unsubscribePush error:", err);
    return res.status(500).json({ message: "Failed to remove push subscription." });
  }
};
