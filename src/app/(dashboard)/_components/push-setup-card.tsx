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
 * "Washa arifa za simu": registers the service worker, asks permission and
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
          ? "Arifa zimewashwa. Umetumiwa arifa ya majaribio."
          : "Arifa zimewashwa, lakini arifa ya majaribio haikufika."
      );
    } catch (err) {
      setMessage(`Imeshindikana kuwasha arifa: ${(err as Error).message}`);
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
      setMessage(res.ok ? "Arifa ya majaribio imetumwa." : json.error ?? "Imeshindikana.");
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
            {state === "on" ? "Arifa za simu zimewashwa" : "Washa arifa za simu"}
          </h2>
          <p className="mt-0.5 text-sm text-zinc-600">
            {state === "ios-install" &&
              "Kwenye iPhone: bonyeza Share, kisha “Add to Home Screen”. Fungua Afya ERP kutoka kwenye skrini ya simu, kisha urudi hapa kuwasha arifa."}
            {state === "denied" &&
              "Arifa zimezuiwa kwenye kivinjari hiki. Fungua mipangilio ya tovuti (alama ya kufuli kwenye anwani) na uruhusu Notifications."}
            {state === "off" &&
              "Pokea vikumbusho vya kujaza progress (asubuhi, mchana, jioni) na taarifa za ziara ulizokosa, hata ERP ikiwa imefungwa."}
            {state === "on" &&
              "Kifaa hiki kitapokea vikumbusho vya progress mara 3 kwa siku na ziara zilizokosekana."}
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
              {busy ? "Inawasha..." : "Washa arifa"}
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
                Jaribu arifa
              </button>
              <button
                type="button"
                onClick={disable}
                disabled={busy}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
              >
                Zima
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
