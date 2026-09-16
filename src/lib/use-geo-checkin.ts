"use client";

import { useCallback, useState } from "react";

export interface GeoCheckIn {
  lat: number;
  lng: number;
  accuracy: number;
}

/**
 * Captures the device's current GPS location via the browser Geolocation
 * API — used to confirm a staff member was physically at the patient's
 * location when filing a home-visit report. Requires a secure context
 * (HTTPS or localhost) and the user's one-time permission grant.
 */
export function useGeoCheckIn() {
  const [checkIn, setCheckIn] = useState<GeoCheckIn | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const captureLocation = useCallback(() => {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Kifaa/kivinjari hiki hakiunga mkono GPS.");
      return;
    }
    setChecking(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCheckIn({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setChecking(false);
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Umekataa ruhusa ya eneo (GPS). Ruhusu eneo kwenye mipangilio ya kivinjari kisha jaribu tena."
            : "Imeshindwa kupata eneo. Hakikisha GPS/Location imewashwa kisha jaribu tena."
        );
        setChecking(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  const reset = useCallback(() => {
    setCheckIn(null);
    setError(null);
  }, []);

  return { checkIn, checking, error, captureLocation, reset };
}
