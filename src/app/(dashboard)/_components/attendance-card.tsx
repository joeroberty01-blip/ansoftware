"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NEAR_HOME_METERS, formatDistance } from "@/lib/geo";

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
  date?: string;
  shiftStart?: string;
  open?: Shift | null;
  forgotten?: Shift | null;
  today?: Shift[];
  patients?: { id: string; full_name: string; address: string | null; has_home: boolean }[];
}

interface Position {
  lat: number;
  lng: number;
  accuracy: number;
}

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("sw-TZ", { hour: "2-digit", minute: "2-digit" });

const hours = (minutes: number | null) =>
  minutes == null ? "-" : `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;

type GeoProblem = "denied" | "unavailable" | "unsupported";

class GeoError extends Error {
  constructor(public kind: GeoProblem, message: string) {
    super(message);
  }
}

function readPosition(options: PositionOptions): Promise<Position> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      reject,
      options
    );
  });
}

/**
 * One GPS reading. Tries the precise GPS first; if the phone cannot get a
 * satellite fix (indoors, weak signal) it falls back to the network/Wi-Fi
 * location instead of failing.
 */
async function getPosition(): Promise<Position> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new GeoError("unsupported", "Kivinjari hiki hakina GPS. Fungua ERP kwenye Google Chrome.");
  }
  const denied = () =>
    new GeoError(
      "denied",
      "Simu imezuia Location kwa ERP. Location ya simu kuwashwa haitoshi: fuata hatua zilizo hapa chini."
    );
  try {
    return await readPosition({ enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  } catch (err) {
    const e = err as GeolocationPositionError;
    if (e?.code === 1) throw denied();
  }
  try {
    return await readPosition({ enableHighAccuracy: false, timeout: 20000, maximumAge: 120000 });
  } catch (err) {
    const e = err as GeolocationPositionError;
    if (e?.code === 1) throw denied();
    throw new GeoError(
      "unavailable",
      "Simu imeshindwa kupata mahali. Hakikisha Location imewashwa, toka nje au karibu na dirisha, kisha bonyeza tena."
    );
  }
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
  if (kind === "unavailable") return null;
  return (
    <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="font-bold">Jinsi ya kuruhusu Location kwa ERP</p>
      {inAppBrowser() ? (
        <div className="mt-2 space-y-2">
          <p>
            Umefungua ERP ndani ya WhatsApp/Facebook. Humo GPS haifanyi kazi. Fungua ERP kwenye{" "}
            <b>Google Chrome</b>{isIphone() ? " au Safari" : ""}: bonyeza vitone 3 (⋮) juu kulia, chagua
            &quot;Open in Chrome / Fungua kwenye kivinjari&quot;.
          </p>
          <button
            type="button"
            onClick={copyLink}
            className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold"
          >
            {copied ? "Link imenakiliwa ✓ Ibandike kwenye Chrome" : "Nakili link ya ERP"}
          </button>
        </div>
      ) : isIphone() ? (
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Fungua <b>Settings</b> (Mipangilio) ya iPhone.</li>
          <li><b>Privacy &amp; Security</b> → <b>Location Services</b> → hakikisha iko ON.</li>
          <li>Shuka chini, chagua <b>Safari Websites</b> (au Chrome) → <b>While Using the App</b>.</li>
          <li>Rudi kwenye ERP, funga ukurasa uufungue upya, bonyeza <b>Pata mahali</b>, kisha <b>Allow</b>.</li>
        </ol>
      ) : (
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            Kwenye Chrome, gusa <b>alama ya kufuli 🔒</b> (au ⓘ) kushoto mwa anwani ya ERP juu.
          </li>
          <li>
            Chagua <b>Permissions / Ruhusa</b> → <b>Location</b> → <b>Allow / Ruhusu</b>. Ukiona &quot;Reset
            permissions&quot;, ibonyeze.
          </li>
          <li>
            Bado? Fungua <b>Settings</b> ya simu → <b>Apps</b> → <b>Chrome</b> → <b>Permissions</b> →{" "}
            <b>Location</b> → <b>Allow only while using the app</b>, na washa <b>Use precise location</b>.
          </li>
          <li>
            Kama umeweka ERP kama app kwenye skrini, fanya hatua hizo hizo kwa app hiyo (Settings → Apps).
          </li>
          <li>Rudi kwenye ERP, <b>refresh</b> ukurasa, bonyeza <b>Pata mahali</b>, kisha <b>Allow</b>.</li>
        </ol>
      )}
    </div>
  );
}

/** Small JPEG of the selfie (max 480 px), so it uploads fast on mobile data. */
async function shrinkSelfie(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 480 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.72));
  if (!blob) throw new Error("Imeshindikana kusoma picha.");
  return blob;
}

function DistanceBadge({ distance, hasHome }: { distance: number | null; hasHome: boolean }) {
  if (distance == null) {
    return (
      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">
        {hasHome ? "Umbali haujulikani" : "Nyumbani kwa mgonjwa bado hapajawekwa"}
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
      {near ? "✓" : "⚠"} {formatDistance(distance)} {near ? "kutoka nyumbani kwa mgonjwa" : "mbali na nyumbani kwa mgonjwa"}
    </span>
  );
}

/** "Nimefika kazini" / "Naondoka" for field staff: selfie + GPS on arrival, GPS on leaving. */
export function AttendanceCard() {
  const router = useRouter();
  const [data, setData] = useState<MeResponse | null>(null);
  const [patientId, setPatientId] = useState("");
  const [selfie, setSelfie] = useState<Blob | null>(null);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoProblem, setGeoProblem] = useState<GeoProblem | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/attendance/me");
    const json = (await res.json().catch(() => null)) as MeResponse | null;
    if (!res.ok || !json) return;
    setData(json);
    if (json.patients?.length === 1) setPatientId((p) => p || json.patients![0].id);
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  useEffect(() => {
    return () => {
      if (selfieUrl) URL.revokeObjectURL(selfieUrl);
    };
  }, [selfieUrl]);

  if (!data?.staff || data.staff.profession === "ADMIN_STAFF") return null;

  const locate = async () => {
    setError(null);
    setGeoProblem(null);
    setLocating(true);
    try {
      setPosition(await getPosition());
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof GeoError) setGeoProblem(e.kind);
    } finally {
      setLocating(false);
    }
  };

  const onSelfie = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const small = await shrinkSelfie(file);
      setSelfie(small);
      setSelfieUrl(URL.createObjectURL(small));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const checkIn = async () => {
    if (!patientId || !selfie || !position) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const form = new FormData();
      form.set("patientId", patientId);
      form.set("lat", String(position.lat));
      form.set("lng", String(position.lng));
      form.set("accuracy", String(Math.round(position.accuracy)));
      form.set("photo", selfie, "selfie.jpg");
      const res = await fetch("/api/attendance/check-in", { method: "POST", body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Imeshindikana kuingia kazini.");
        return;
      }
      setSelfie(null);
      setSelfieUrl(null);
      setPosition(null);
      setMessage("Umeingia kazini. Sasa unaweza kujaza ripoti ya leo.");
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
      const pos = await getPosition();
      const res = await fetch("/api/attendance/check-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: pos.lat, lng: pos.lng, accuracy: Math.round(pos.accuracy) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Imeshindikana kutoka kazini.");
        return;
      }
      setMessage("Umetoka kazini. Asante!");
      await load();
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof GeoError) setGeoProblem(e.kind);
    } finally {
      setBusy(false);
    }
  };

  const open = data.open ?? null;
  const forgotten = data.forgotten ?? null;
  const today = data.today ?? [];
  const patients = data.patients ?? [];

  return (
    <section
      id="mahudhurio"
      className="scroll-mt-20 rounded-2xl border border-brand-blue/20 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-zinc-900">Mahudhurio ya Leo</h2>
        <span className="text-xs text-zinc-500">Zamu inaanza saa {data.shiftStart}</span>
      </div>

      {!open && forgotten && (
        <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Zamu yako ya{" "}
          {new Date(forgotten.check_in_at).toLocaleDateString("sw-TZ", { day: "numeric", month: "short" })}{" "}
          saa {time(forgotten.check_in_at)}
          {forgotten.patient_name ? ` kwa ${forgotten.patient_name}` : ""} haikufungwa (hukubonyeza
          &quot;Naondoka&quot;). Ukiingia kazini sasa, itafungwa bila saa za kazi. Kumbuka kubonyeza
          &quot;Naondoka&quot; ukimaliza zamu.
        </p>
      )}

      {open ? (
        <div className="mt-3 rounded-xl bg-emerald-50 p-3">
          <p className="text-sm font-semibold text-emerald-900">
            Uko kazini tangu {time(open.check_in_at)}
            {open.patient_name ? ` kwa ${open.patient_name}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <DistanceBadge distance={open.check_in_distance_m} hasHome={!!open.patient_home_lat} />
            {open.late_minutes > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                Umechelewa dakika {open.late_minutes}
              </span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {open.patient_id && data.date && (
              <Link
                href={`/patients/${open.patient_id}/daily/${data.date}`}
                className="rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue-dark"
              >
                Jaza ripoti ya leo
              </Link>
            )}
            <button
              type="button"
              onClick={checkOut}
              disabled={busy}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
            >
              {busy ? "Inapata mahali..." : "Naondoka"}
            </button>
          </div>
        </div>
      ) : patients.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600">
          Hujapangiwa mgonjwa yeyote bado. Wasiliana na Admin akupangie mgonjwa.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Umefika kwa mgonjwa gani?
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2.5 text-base sm:text-sm"
            >
              <option value="">-- chagua mgonjwa --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                  {p.address ? ` (${p.address})` : ""}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl border border-zinc-200 p-3">
              {selfieUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- local preview of a blob URL
                <img src={selfieUrl} alt="Selfie" className="h-14 w-14 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs text-zinc-500">
                  1
                </span>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-800">{selfieUrl ? "Selfie imepigwa ✓" : "Piga selfie"}</p>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-1 min-h-9 rounded-lg border border-zinc-300 px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  {selfieUrl ? "Piga tena" : "Fungua kamera"}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={(e) => {
                    onSelfie(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-zinc-200 p-3">
              <span
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xs ${
                  position ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                }`}
              >
                {position ? "GPS ✓" : "2"}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-800">
                  {position ? `Mahali pamepatikana (usahihi ~m ${Math.round(position.accuracy)})` : "Pata mahali (GPS)"}
                </p>
                <button
                  type="button"
                  onClick={locate}
                  disabled={locating}
                  className="mt-1 min-h-9 rounded-lg border border-zinc-300 px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                >
                  {locating ? "Inatafuta..." : position ? "Pata tena" : "Pata mahali"}
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={checkIn}
            disabled={busy || !patientId || !selfie || !position}
            className="rounded-lg bg-brand-blue px-4 py-3 text-sm font-semibold text-white hover:bg-brand-blue-dark disabled:opacity-50"
          >
            {busy ? "Inahifadhi..." : "Nimefika kazini"}
          </button>
        </div>
      )}

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {geoProblem && <GpsHelp kind={geoProblem} />}
      {message && <p className="mt-3 text-sm font-medium text-emerald-700">{message}</p>}

      {today.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1 border-t border-zinc-100 pt-3 text-xs text-zinc-600">
          {today.map((s) => (
            <li key={s.id} className="flex flex-wrap justify-between gap-2">
              <span>
                {s.patient_name ?? "-"}: {time(s.check_in_at)} – {s.check_out_at ? time(s.check_out_at) : "bado kazini"}
              </span>
              <span>{hours(s.minutes_worked)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
