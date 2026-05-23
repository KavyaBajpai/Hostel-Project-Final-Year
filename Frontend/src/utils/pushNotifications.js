import {
  getPushVapidPublicKey,
  subscribePush,
  unsubscribePush,
} from "../services/api.js";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register("/sw.js");
}

export async function enableWardenPushNotifications() {
  if (!isPushSupported()) {
    throw new Error("Push notifications are not supported in this browser.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was denied.");
  }

  const { publicKey } = await getPushVapidPublicKey();
  if (!publicKey) {
    throw new Error("Server push notifications are not configured.");
  }

  const registration = await registerServiceWorker();
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const json = subscription.toJSON();
  await subscribePush({
    endpoint: json.endpoint,
    keys: json.keys,
  });

  return subscription;
}

export async function disableWardenPushNotifications() {
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager?.getSubscription();
  if (subscription) {
    await unsubscribePush({ endpoint: subscription.endpoint });
    await subscription.unsubscribe();
  }
}

export async function getPushSubscriptionStatus() {
  if (!isPushSupported()) return { supported: false, subscribed: false, permission: "unsupported" };
  const permission = Notification.permission;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager?.getSubscription();
  return {
    supported: true,
    subscribed: Boolean(subscription),
    permission,
  };
}
