// Shared Medication Administration Record constants (client + server).

export const MAR_SLOTS = ["MORNING", "AFTERNOON", "EVENING"] as const;
export type MarSlot = (typeof MAR_SLOTS)[number];

export const MAR_SLOT_LABELS: Record<MarSlot, string> = {
  MORNING: "Asubuhi",
  AFTERNOON: "Mchana",
  EVENING: "Jioni",
};

export const MAR_STATUSES = ["GIVEN", "MISSED", "REFUSED"] as const;
export type MarStatus = (typeof MAR_STATUSES)[number];

export const MAR_STATUS_LABELS: Record<MarStatus | "PENDING", string> = {
  GIVEN: "Given",
  MISSED: "Missed",
  REFUSED: "Refused",
  PENDING: "Pending",
};

/** Slots a medication is scheduled for; legacy meds with none show in all. */
export function effectiveSlots(scheduleSlots: string[] | null | undefined): MarSlot[] {
  const slots = (scheduleSlots ?? []).filter((s): s is MarSlot =>
    (MAR_SLOTS as readonly string[]).includes(s)
  );
  return slots.length > 0 ? MAR_SLOTS.filter((s) => slots.includes(s)) : [...MAR_SLOTS];
}
