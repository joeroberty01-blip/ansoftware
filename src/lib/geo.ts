/**
 * Phone GPS is good to roughly 10-50 m outdoors and worse indoors, so a
 * check-in within this distance of the patient's saved home counts as "at
 * the patient's home".
 */
export const NEAR_HOME_METERS = 200;

/** Straight-line distance in metres between two GPS points (haversine). */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(h))));
}

/** "35 m" / "6.2 km". */
export function formatDistance(m: number | null | undefined): string {
  if (m == null) return "-";
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
}

export function mapsUrl(lat: number | string, lng: number | string): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
