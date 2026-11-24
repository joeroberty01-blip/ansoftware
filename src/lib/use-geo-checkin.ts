"use client";

import { useCallback, useState } from "react";
import { locate } from "./locate";

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
    setChecking(true);
    locate()
      .then(({ lat, lng, accuracy }) => setCheckIn({ lat, lng, accuracy }))
      .catch((err) => setError((err as Error).message))
      .finally(() => setChecking(false));
  }, []);

  const reset = useCallback(() => {
    setCheckIn(null);
    setError(null);
  }, []);

  return { checkIn, checking, error, captureLocation, reset };
}
