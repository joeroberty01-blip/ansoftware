"use client";

import { useCallback, useEffect, useState } from "react";

type State =
  | "checking"
  | "unsupported"
  | "ios-install" // iPhone in Safari: must Add to Home Screen first
  | "no-server-key"
  | "denied"
  | "off"
  | "on";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

async function registration() {
  return navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
}

/**
 * "Turn on phone notifications": registers the service worker, asks permission and
 * saves this device so the server can send visit reminders.
 */
export function PushSetupCard({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<State>("checking");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  const refresh = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setState(isIos() && !isStandalone() ? "ios-install" : "unsupported");
      return;
    }
    if (!publicKey) {
      setState("no-server-key");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    const reg = await registration();
    const sub = await reg.pushManager.getSubscription();
    if (sub && Notification.permission === "granted") {
      // Re-save quietly so the server always has this device.
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      }).catch(() => undefined);
      setState("on");
    } else {
      setState("off");
    }
  }, [publicKey]);

  useEffect(() => {
    refresh().catch(() => setState("unsupported"));
  }, [refresh]);

  const enable = async () => {
    if (!publicKey) return;
    setBusy(true);
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await registration();
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "save failed");
      setState("on");
      const test = await fetch("/api/push/test", { method: "POST" });
      setMessage(
        test.ok
          ? "Notifications are on. A test notification was sent to you."
          : "Notifications are on, but the test notification didn't arrive."
      );
    } catch (err) {
      setMessage(`Could not turn on notifications: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const reg = await registration();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      setMessage(res.ok ? "Test notification sent." : json.error ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  if (state === "checking" || state === "unsupported" || state === "no-server-key") return null;
  if (compact && state === "on") return null;

  return (
    <section className="rounded-2xl border border-brand-blue/20 bg-brand-blue-light p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-brand-blue">
            {state === "on" ? "Phone notifications are on" : "Turn on phone notifications"}
          </h2>
          <p className="mt-0.5 text-sm text-zinc-600">
            {state === "ios-install" &&
              "On iPhone: tap Share, then “Add to Home Screen”. Open Afya ERP from your home screen, then come back here to turn on notifications."}
            {state === "denied" &&
              "Notifications are blocked in this browser. Open the site settings (the lock icon in the address bar) and allow Notifications."}
            {state === "off" &&
              "Get reminders to fill in progress (morning, afternoon, evening) and alerts about missed visits, even when the ERP is closed."}
            {state === "on" &&
              "This device will get progress reminders 3 times a day and alerts about missed visits."}
          </p>
          {message && <p className="mt-1 text-sm font-medium text-zinc-800">{message}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {state === "off" && (
            <button
              type="button"
              onClick={enable}
              disabled={busy}
              className="rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue-dark disabled:opacity-60"
            >
              {busy ? "Turning on..." : "Turn on notifications"}
            </button>
          )}
          {state === "on" && (
            <>
              <button
                type="button"
                onClick={sendTest}
                disabled={busy}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
              >
                Test notification
              </button>
              <button
                type="button"
                onClick={disable}
                disabled={busy}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
              >
                Turn off
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
