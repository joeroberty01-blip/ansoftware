// Shared vitals threshold logic — used both client-side (patient pages,
// home-visit forms) and server-side (dashboard pending-action counts) so the
// definition of "abnormal" never drifts between the two.

export type VitalStatus = "normal" | "warning" | null;

export function parseBloodPressure(
  bp: string | null | undefined
): { systolic: number; diastolic: number } | null {
  if (!bp) return null;
  const m = bp.match(/^(\d{2,3})\s*\/\s*(\d{2,3})$/);
  if (!m) return null;
  return { systolic: Number(m[1]), diastolic: Number(m[2]) };
}

export function bpStatus(bp: string | null | undefined): VitalStatus {
  const parsed = parseBloodPressure(bp);
  if (!parsed) return null;
  const { systolic, diastolic } = parsed;
  return systolic >= 90 && systolic <= 140 && diastolic >= 60 && diastolic <= 90
    ? "normal"
    : "warning";
}

export function glucoseStatus(glucose: string | null | undefined): VitalStatus {
  if (!glucose) return null;
  const v = Number(glucose);
  if (Number.isNaN(v)) return null;
  return v >= 3.9 && v <= 7.8 ? "normal" : "warning";
}

export function temperatureStatus(tempC: string | number | null | undefined): VitalStatus {
  if (tempC === null || tempC === undefined || tempC === "") return null;
  const v = Number(tempC);
  if (Number.isNaN(v)) return null;
  return v >= 35.0 && v <= 38.0 ? "normal" : "warning";
}

export function pulseStatus(pulse: number | string | null | undefined): VitalStatus {
  if (pulse === null || pulse === undefined || pulse === "") return null;
  const v = Number(pulse);
  if (Number.isNaN(v)) return null;
  return v >= 60 && v <= 100 ? "normal" : "warning";
}

export function bmiStatus(
  weight: string | null | undefined,
  heightCm: string | null | undefined
): VitalStatus {
  if (!weight || !heightCm) return null;
  const w = Number(weight);
  const hM = Number(heightCm) / 100;
  if (Number.isNaN(w) || Number.isNaN(hM) || hM <= 0) return null;
  const bmi = w / (hM * hM);
  return bmi >= 18.5 && bmi <= 24.9 ? "normal" : "warning";
}

export interface VitalsSet {
  blood_pressure?: string | null;
  temperature?: string | number | null;
  pulse?: number | string | null;
  blood_glucose?: string | null;
}

/** True if any recorded vital in the set is outside its normal range. */
export function hasVitalsAlert(v: VitalsSet): boolean {
  return (
    bpStatus(v.blood_pressure) === "warning" ||
    temperatureStatus(v.temperature) === "warning" ||
    pulseStatus(v.pulse) === "warning" ||
    glucoseStatus(v.blood_glucose) === "warning"
  );
}

/** Human-readable list of which vitals are out of range, for banners/alerts. */
export function vitalsAlertReasons(v: VitalsSet): string[] {
  const reasons: string[] = [];
  if (bpStatus(v.blood_pressure) === "warning") {
    reasons.push(`Blood Pressure ${v.blood_pressure} mmHg iko nje ya kawaida`);
  }
  if (temperatureStatus(v.temperature) === "warning") {
    reasons.push(`Joto la mwili ${v.temperature}°C liko nje ya kawaida`);
  }
  if (pulseStatus(v.pulse) === "warning") {
    reasons.push(`Mapigo ya moyo ${v.pulse} bpm yako nje ya kawaida`);
  }
  if (glucoseStatus(v.blood_glucose) === "warning") {
    reasons.push(`Sukari ${v.blood_glucose} mmol/L iko nje ya kawaida`);
  }
  return reasons;
}
