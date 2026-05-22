import { useEffect, useState } from "react";
import {
  disableWardenPushNotifications,
  enableWardenPushNotifications,
  getPushSubscriptionStatus,
  isPushSupported,
} from "../utils/pushNotifications.js";

export default function WardenPushSetup() {
  const [status, setStatus] = useState({ loading: true });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!isPushSupported()) {
      setStatus({ supported: false, subscribed: false, permission: "unsupported", loading: false });
      return;
    }
    const s = await getPushSubscriptionStatus();
    setStatus({ ...s, loading: false });
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onEnable() {
    setMsg("");
    setErr("");
    setBusy(true);
    try {
      await enableWardenPushNotifications();
      setMsg("Device notifications enabled. You will be alerted for new leaves and complaints.");
      await refresh();
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Failed to enable notifications");
    } finally {
      setBusy(false);
    }
  }

  async function onDisable() {
    setMsg("");
    setErr("");
    setBusy(true);
    try {
      await disableWardenPushNotifications();
      setMsg("Device notifications disabled.");
      await refresh();
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Failed to disable notifications");
    } finally {
      setBusy(false);
    }
  }

  if (status.loading) {
    return (
      <div className="mt-6 p-4 rounded-lg border bg-white text-sm text-gray-600">
        Checking notification settings…
      </div>
    );
  }

  if (!status.supported) {
    return (
      <div className="mt-6 p-4 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-900">
        Device push notifications require a supported desktop browser (Chrome, Edge, or Firefox on localhost).
      </div>
    );
  }

  return (
    <div className="mt-6 p-4 rounded-lg border bg-white">
      <h3 className="font-medium text-gray-900">Device notifications</h3>
      <p className="mt-1 text-sm text-gray-600">
        Get alerts on this device when a resident submits a leave application or files a complaint — even when this tab is closed.
      </p>
      <p className="mt-2 text-xs text-gray-500">
        Permission: <span className="font-medium">{status.permission}</span>
        {status.subscribed ? " · Subscribed" : " · Not subscribed"}
      </p>
      {msg && <p className="mt-2 text-sm text-green-700">{msg}</p>}
      {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {!status.subscribed ? (
          <button
            type="button"
            onClick={onEnable}
            disabled={busy}
            className="px-3 py-1.5 rounded-md bg-gray-900 text-white text-sm disabled:opacity-50"
          >
            {busy ? "Enabling…" : "Enable device notifications"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onDisable}
            disabled={busy}
            className="px-3 py-1.5 rounded-md border text-sm disabled:opacity-50"
          >
            {busy ? "Disabling…" : "Disable device notifications"}
          </button>
        )}
      </div>
    </div>
  );
}
