"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NEAR_HOME_METERS, formatDistance } from "@/lib/geo";
import {
  GeoError,
  geoPermission,
  locate,
  watchGeoPermission,
  WEAK_ACCURACY_M,
  type GeoPermission,
  type GeoProblem,
  type GeoReading,
} from "@/lib/locate";
import { inPageCameraSupported, SelfieCamera, shrinkPhoto, stampPhoto } from "./selfie-camera";

interface Shift {
  id: string;
  patient_id: string | null;
  patient_name: string | null;
  check_in_at: string;
  check_out_at: string | null;
  check_in_distance_m: number | null;
  check_out_distance_m: number | null;
  late_minutes: number;
  minutes_worked: number | null;
  patient_home_lat: string | null;
}

interface MeResponse {
  staff: { id: string; profession: string } | null;
  now?: number;
  date?: string;
  shiftStart?: string;
  open?: Shift | null;
  forgotten?: Shift | null;
  today?: Shift[];
  patients?: { id: string; full_name: string; address: string | null; has_home: boolean }[];
}

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

const hours = (minutes: number | null) =>
  minutes == null ? "-" : `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;

/** "24 Nov 2026, 10:02:31" in Dar es Salaam, whatever the phone's time zone. */
const stampTime = (ms: number) =>
  new Date(ms).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Africa/Dar_es_Salaam",
  });

/** Ticks by itself so only this line re-renders every second. */
function LiveTime({ offset }: { offset: number }) {
  const [ms, setMs] = useState(() => Date.now() + offset);
  useEffect(() => {
    const timer = setInterval(() => setMs(Date.now() + offset), 1000);
    return () => clearInterval(timer);
  }, [offset]);
  return <>{stampTime(ms)}</>;
}

/** A reading older than this is taken again before it is sent. */
const FRESH_MS = 3 * 60 * 1000;

const reported = new Set<string>();

/** Tells the office why this phone is stuck (once per problem, no location sent). */
function reportProblem(kind: string, detail = "") {
  if (reported.has(kind)) return;
  reported.add(kind);
  fetch("/api/attendance/problem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, detail: detail.slice(0, 200), inApp: inAppBrowser() }),
    keepalive: true,
  }).catch(() => undefined);
}

/** Opened inside WhatsApp/Facebook/Instagram instead of a real browser. */
function inAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /WhatsApp|FBAN|FBAV|Instagram|; wv\)/i.test(navigator.userAgent);
}

function isIphone(): boolean {
  return typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/** Step-by-step help when the phone refuses location to the ERP. */
function GpsHelp({ kind }: { kind: GeoProblem }) {
  const [copied, setCopied] = useState(false);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + "/dashboard");
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  if (kind === "unavailable" || kind === "dismissed") return null;
  return (
    <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="font-bold">How to allow location for the ERP</p>
      {inAppBrowser() ? (
        <div className="mt-2 space-y-2">
          <p>
            You opened the ERP inside WhatsApp/Facebook, where GPS doesn't work. Open the ERP in{" "}
            <b>Google Chrome</b>{isIphone() ? " or Safari" : ""}: tap the 3 dots (⋮) at the top right and choose
            &quot;Open in Chrome&quot; (or &quot;Open in browser&quot;).
          </p>
          <button
            type="button"
            onClick={copyLink}
            className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold"
          >
            {copied ? "Link copied ✓ Paste it in Chrome" : "Copy the ERP link"}
          </button>
        </div>
      ) : isIphone() ? (
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Open the iPhone <b>Settings</b>.</li>
          <li><b>Privacy &amp; Security</b> → <b>Location Services</b> → make sure it is ON.</li>
          <li>Scroll down, choose <b>Safari Websites</b> (or Chrome) → <b>While Using the App</b>.</li>
          <li>Go back to the ERP, close and reopen the page, tap <b>Get location</b>, then <b>Allow</b>.</li>
        </ol>
      ) : (
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            In Chrome, tap the <b>lock icon 🔒</b> (or ⓘ) to the left of the ERP address at the top.
          </li>
          <li>
            Choose <b>Permissions</b> → <b>Location</b> → <b>Allow</b>. If you see &quot;Reset
            permissions&quot;, tap it.
          </li>
          <li>
            Still not working? Open the phone <b>Settings</b> → <b>Apps</b> → <b>Chrome</b> → <b>Permissions</b> →{" "}
            <b>Location</b> → <b>Allow only while using the app</b>, and turn on <b>Use precise location</b>.
          </li>
          <li>
            If you installed the ERP as an app on your home screen, do the same steps for that app (Settings → Apps).
          </li>
          <li>Go back to the ERP, <b>refresh</b> the page, tap <b>Get location</b>, then <b>Allow</b>.</li>
        </ol>
      )}
    </div>
  );
}

function DistanceBadge({ distance, hasHome }: { distance: number | null; hasHome: boolean }) {
  if (distance == null) {
    return (
      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">
        {hasHome ? "Distance unknown" : "Patient's home not set yet"}
      </span>
    );
  }
  const near = distance <= NEAR_HOME_METERS;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
        near ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-800"
      }`}
    >
      {near ? "✓" : "⚠"} {formatDistance(distance)} {near ? "from the patient's home" : "away from the patient's home"}
    </span>
  );
}

/** "Check in" / "Check out" for field staff: selfie + GPS on arrival, GPS on leaving. */
export function AttendanceCard() {
  const router = useRouter();
  const [data, setData] = useState<MeResponse | null>(null);
  const [patientId, setPatientId] = useState("");
  /** Taken but not saved yet (no internet or no GPS): kept for another try. */
  const [selfie, setSelfie] = useState<{ photo: Blob; at: number } | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [position, setPosition] = useState<GeoReading | null>(null);
  const [searching, setSearching] = useState<number | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraNote, setCameraNote] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoProblem, setGeoProblem] = useState<GeoProblem | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/attendance/me");
      const json = (await res.json().catch(() => null)) as MeResponse | null;
      if (!res.ok || !json) throw new Error("load failed");
      setLoadFailed(false);
      setData(json);
      if (json.now) setClockOffset(json.now - Date.now());
      if (json.patients?.length === 1) setPatientId((p) => p || json.patients![0].id);
    } catch {
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const searchRef = useRef<Promise<GeoReading> | null>(null);
  const getLocation = useCallback((): Promise<GeoReading> => {
    // One search at a time: the camera, the card and "Check in" share it.
    if (searchRef.current) return searchRef.current;
    setLocating(true);
    setSearching(null);
    setGeoProblem(null);
    const search = locate((best) => setSearching(best.accuracy))
      .then((reading) => {
        setPosition(reading);
        return reading;
      })
      .catch((e) => {
        if (e instanceof GeoError) {
          setGeoProblem(e.kind);
          reportProblem(e.kind);
        }
        throw e;
      })
      .finally(() => {
        searchRef.current = null;
        setLocating(false);
        setSearching(null);
      });
    searchRef.current = search;
    return search;
  }, []);

  // Location already allowed: start looking as soon as the card opens, so
  // it is ready by the time the selfie is taken. Already refused: say so now.
  const needsCheckIn = !!data?.staff && !data.open && (data.patients?.length ?? 0) > 0;
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!needsCheckIn || autoStarted.current) return;
    autoStarted.current = true;
    const start = (state: GeoPermission) => {
      if (state === "granted") {
        getLocation().catch(() => undefined);
      } else if (state === "denied") {
        setGeoProblem("denied");
        reportProblem("denied");
      }
    };
    geoPermission().then(start);
    // Allowed later from the browser's settings: carry on without a refresh.
    watchGeoPermission(start);
  }, [needsCheckIn, getLocation]);

  useEffect(() => {
    return () => {
      if (selfieUrl) URL.revokeObjectURL(selfieUrl);
    };
  }, [selfieUrl]);

  if (!data && loadFailed) {
    return (
      <section id="mahudhurio" className="rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-5">
        <p className="text-sm text-red-800">Attendance could not load. Check your internet.</p>
        <button
          type="button"
          onClick={() => load()}
          className="mt-2 min-h-10 rounded-lg bg-brand-blue px-4 text-sm font-semibold text-white"
        >
          Try again
        </button>
      </section>
    );
  }
  if (!data?.staff || data.staff.profession === "ADMIN_STAFF") return null;

  const patients = data.patients ?? [];

  const onLocate = async () => {
    setError(null);
    try {
      await getLocation();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const acceptSelfie = (photo: Blob) => {
    const taken = { photo, at: Date.now() + clockOffset };
    setSelfie(taken);
    setSelfieUrl(URL.createObjectURL(photo));
    setCameraOpen(false);
    setCameraNote(null);
    setError(null);
    checkIn(taken);
  };

  const onSelfieFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      acceptSelfie(await shrinkPhoto(file));
    } catch (e) {
      setError((e as Error).message);
      reportProblem("photo-failed", (e as Error).message);
    }
  };

  const isFresh = (reading: GeoReading | null) => !!reading && Date.now() - reading.at <= FRESH_MS;

  const openCamera = () => {
    setError(null);
    setMessage(null);
    // The location is found while the selfie is being taken.
    if (!isFresh(position)) getLocation().catch(() => undefined);
    if (inPageCameraSupported()) setCameraOpen(true);
    else fileRef.current?.click();
  };

  const networkError = () => {
    reportProblem("network");
    setError('No internet. Your selfie is kept: tap "Send again" when the network is back.');
  };

  const checkIn = async (taken: { photo: Blob; at: number }) => {
    if (!patientId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      let pos = position;
      if (!pos || !isFresh(pos)) {
        try {
          pos = await getLocation();
        } catch (e) {
          setError((e as Error).message);
          return;
        }
      }
      const stamped = await stampPhoto(taken.photo, [
        stampTime(taken.at),
        patients.find((x) => x.id === patientId)?.full_name ?? "",
        `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)} (±${Math.round(pos.accuracy)} m)`,
      ]);
      const form = new FormData();
      form.set("patientId", patientId);
      form.set("lat", String(pos.lat));
      form.set("lng", String(pos.lng));
      form.set("accuracy", String(Math.round(pos.accuracy)));
      form.set("photo", stamped, "selfie.jpg");
      let res: Response;
      try {
        res = await fetch("/api/attendance/check-in", { method: "POST", body: form });
      } catch {
        networkError();
        return;
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Check-in failed. Please try again.");
        // Already checked in (an earlier try did get through): show that shift.
        if (res.status === 409) {
          setSelfie(null);
          setSelfieUrl(null);
          await load();
          router.refresh();
        }
        return;
      }
      setSelfie(null);
      setSelfieUrl(null);
      setPosition(null);
      setMessage(
        "You're checked in: selfie, location and time saved. You can now fill in today's report."
      );
      await load();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const checkOut = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const pos = await getLocation();
      let res: Response;
      try {
        res = await fetch("/api/attendance/check-out", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: pos.lat, lng: pos.lng, accuracy: Math.round(pos.accuracy) }),
        });
      } catch {
        reportProblem("network");
        setError("No internet. Tap Check out again when the network is back.");
        return;
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Check-out failed. Please try again.");
        if (res.status === 409) await load();
        return;
      }
      setPosition(null);
      setMessage("You're checked out. Thank you!");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const searchingText =
    searching == null ? "Searching..." : `Improving... ±${Math.round(searching)} m`;
  const open = data.open ?? null;
  const forgotten = data.forgotten ?? null;
  const today = data.today ?? [];

  return (
    <section
      id="mahudhurio"
      className="scroll-mt-20 rounded-2xl border border-brand-blue/20 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-zinc-900">Today's Attendance</h2>
        <span className="text-xs text-zinc-500">Shift starts at {data.shiftStart}</span>
      </div>

      {!open && forgotten && (
        <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Your shift on{" "}
          {new Date(forgotten.check_in_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}{" "}
          at {time(forgotten.check_in_at)}
          {forgotten.patient_name ? ` at ${forgotten.patient_name}` : ""} was never closed (you didn&apos;t tap
          &quot;Check out&quot;). If you check in now, it will be closed with no hours. Remember to tap
          &quot;Check out&quot; when your shift ends.
        </p>
      )}

      {!open && inAppBrowser() && !geoProblem && <GpsHelp kind="denied" />}

      {open ? (
        <div className="mt-3 rounded-xl bg-emerald-50 p-3">
          <p className="text-sm font-semibold text-emerald-900">
            Checked in since {time(open.check_in_at)}
            {open.patient_name ? ` at ${open.patient_name}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <DistanceBadge distance={open.check_in_distance_m} hasHome={!!open.patient_home_lat} />
            {open.late_minutes > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                {open.late_minutes} min late
              </span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {open.patient_id && data.date && (
              <Link
                href={`/patients/${open.patient_id}/daily/${data.date}`}
                className="rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue-dark"
              >
                Fill in today's report
              </Link>
            )}
            <button
              type="button"
              onClick={checkOut}
              disabled={busy}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
            >
              {locating ? searchingText : busy ? "Saving..." : "Check out"}
            </button>
          </div>
        </div>
      ) : patients.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600">
          You haven't been assigned any patient yet. Ask the Admin to assign you a patient.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Which patient have you arrived at?
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2.5 text-base sm:text-sm"
            >
              <option value="">-- select patient --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                  {p.address ? ` (${p.address})` : ""}
                </option>
              ))}
            </select>
          </label>

          {selfie && selfieUrl ? (
            <div className="flex items-center gap-3 rounded-xl border border-zinc-200 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview of a blob URL */}
              <img
                src={selfieUrl}
                alt="Your selfie"
                className="h-16 w-16 shrink-0 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-800">
                  {busy
                    ? locating
                      ? `Selfie taken ✓ Location: ${searchingText}`
                      : "Saving your attendance..."
                    : "Selfie taken, not saved yet"}
                </p>
                {!busy && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => checkIn(selfie)}
                      disabled={!patientId}
                      className="min-h-10 rounded-lg bg-brand-blue px-4 text-sm font-semibold text-white hover:bg-brand-blue-dark disabled:opacity-50"
                    >
                      Send again
                    </button>
                    <button
                      type="button"
                      onClick={openCamera}
                      className="min-h-10 rounded-lg border border-zinc-300 px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                    >
                      Retake
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={openCamera}
              disabled={busy || !patientId}
              className="min-h-14 rounded-xl bg-brand-blue px-4 text-base font-semibold text-white hover:bg-brand-blue-dark disabled:opacity-50"
            >
              📷 Take selfie and check in
            </button>
          )}
          {!selfie && (
            <p className="text-xs text-zinc-500">
              {patientId
                ? "Your selfie, location and time are saved together, at once."
                : "Choose the patient first."}
            </p>
          )}

          <p className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
            <span>
              {locating
                ? `Location: ${searchingText}`
                : position
                  ? `Location found ✓ (±${Math.round(position.accuracy)} m)`
                  : "Location: not found yet"}
            </span>
            {!locating && (
              <button
                type="button"
                onClick={onLocate}
                className="min-h-9 font-semibold text-brand-blue underline"
              >
                {position ? "Get again" : "Get location"}
              </button>
            )}
          </p>
          {!locating && position && position.accuracy > WEAK_ACCURACY_M && (
            <p className="text-xs text-amber-800">
              Weak signal. Go outside or near a window and tap Get again.
            </p>
          )}

          {cameraNote && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <p>{cameraNote}</p>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-2 min-h-10 rounded-lg border border-amber-400 bg-white px-3 text-sm font-semibold"
              >
                Use the phone&apos;s camera app
              </button>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(e) => {
              onSelfieFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {cameraOpen && (
        <SelfieCamera
          status={
            <>
              <span className="block font-semibold">
                <LiveTime offset={clockOffset} />
              </span>
              <span className="block text-white/80">
                {locating
                  ? `Location: ${searchingText}`
                  : position
                    ? `Location found ✓ (±${Math.round(position.accuracy)} m)`
                    : geoProblem
                      ? "Location not found: you can still take the photo"
                      : "Location: waiting..."}
              </span>
            </>
          }
          onPhoto={acceptSelfie}
          onClose={() => setCameraOpen(false)}
          onProblem={(kind, detail) => {
            setCameraOpen(false);
            reportProblem(kind, detail);
            setCameraNote(
              kind === "camera-denied"
                ? "The camera is blocked for the ERP. Tap the lock icon 🔒 next to the address → Permissions → Camera → Allow, or:"
                : "The camera didn't open here. Close other apps using it and try again, or:"
            );
          }}
        />
      )}

      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {geoProblem && <GpsHelp kind={geoProblem} />}
      {message && <p className="mt-3 text-sm font-medium text-emerald-700">{message}</p>}

      {today.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1 border-t border-zinc-100 pt-3 text-xs text-zinc-600">
          {today.map((s) => (
            <li key={s.id} className="flex flex-wrap justify-between gap-2">
              <span>
                {s.patient_name ?? "-"}: {time(s.check_in_at)} – {s.check_out_at ? time(s.check_out_at) : "still checked in"}
              </span>
              <span>{hours(s.minutes_worked)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
