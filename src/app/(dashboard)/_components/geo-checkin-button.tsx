"use client";

import { MapPin, Loader2, CheckCircle2 } from "lucide-react";
import type { GeoCheckIn } from "@/lib/use-geo-checkin";

export function GeoCheckInButton({
  checkIn,
  checking,
  error,
  onCapture,
}: {
  checkIn: GeoCheckIn | null;
  checking: boolean;
  error: string | null;
  onCapture: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-zinc-600">
        GPS Check-in (hiari)
      </label>
      {checkIn ? (
        <div className="flex items-center gap-2 rounded border border-green-200 bg-green-50 px-2 py-1.5 text-xs text-green-700">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>
            Eneo limethibitishwa ({checkIn.lat.toFixed(5)},{" "}
            {checkIn.lng.toFixed(5)}, usahihi ~{Math.round(checkIn.accuracy)}m)
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={onCapture}
          disabled={checking}
          className="flex w-fit items-center gap-1.5 rounded border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
        >
          {checking ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <MapPin className="h-3.5 w-3.5" />
          )}
          {checking ? "Inatafuta eneo..." : "Check-in kwa GPS"}
        </button>
      )}
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
