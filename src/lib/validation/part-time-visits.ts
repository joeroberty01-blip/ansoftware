import { z } from "zod";
import { PAYMENT_METHODS } from "./invoices";

/** Why a part-time person was sent instead of, or on top of, the usual staff. */
export const PART_TIME_REASONS = [
  "STAFF_ON_LEAVE",
  "STAFF_SICK",
  "STAFF_ABSENT",
  "STAFF_DAY_OFF",
  "HOLIDAY_COVER",
  "PATIENT_EMERGENCY",
  "EXTRA_HELP",
  "SPECIAL_PROCEDURE",
  "NEW_PATIENT",
  "FAMILY_REQUEST",
  "OTHER",
] as const;
export type PartTimeReason = (typeof PART_TIME_REASONS)[number];

export const PART_TIME_REASON_LABELS: Record<PartTimeReason, string> = {
  STAFF_ON_LEAVE: "Assigned staff on leave",
  STAFF_SICK: "Assigned staff sick",
  STAFF_ABSENT: "Assigned staff absent",
  STAFF_DAY_OFF: "Assigned staff on day off",
  HOLIDAY_COVER: "Public holiday cover",
  PATIENT_EMERGENCY: "Patient emergency",
  EXTRA_HELP: "Extra help needed",
  SPECIAL_PROCEDURE: "Special procedure",
  NEW_PATIENT: "New patient, no staff assigned yet",
  FAMILY_REQUEST: "Family request",
  OTHER: "Other",
};

/** Reasons that mean someone was replaced, so the form asks who. */
export const COVER_REASONS: readonly PartTimeReason[] = [
  "STAFF_ON_LEAVE",
  "STAFF_SICK",
  "STAFF_ABSENT",
  "STAFF_DAY_OFF",
  "HOLIDAY_COVER",
];

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Please keep this under ${max} characters`)
    .nullish()
    .transform((v) => v || null);

const optionalTime = z
  .string()
  .regex(/^(([01]\d|2[0-3]):[0-5]\d)?$/, "Invalid time (e.g. 07:00)")
  .nullish()
  .transform((v) => v || null);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Invalid date");

export const partTimeVisitSchema = z
  .object({
    staffId: optionalText(100),
    externalName: optionalText(200),
    externalPhone: optionalText(30),
    patientId: z.string().trim().min(1, "Select a patient").max(100),
    visitDate: isoDate,
    startTime: optionalTime,
    endTime: optionalTime,
    reason: z.enum(PART_TIME_REASONS, { error: "Select a reason" }),
    reasonNote: optionalText(500),
    coveredStaffId: optionalText(100),
    notes: optionalText(1000),
  })
  .superRefine((d, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    if (!d.staffId && !d.externalName) fail("Select the staff member who visited");
    if (d.staffId && d.externalName) fail("Choose a staff member or type a name, not both");
    if (d.endTime && !d.startTime) fail("Enter the start time too");
    if (d.startTime && d.startTime === d.endTime) fail("The start and end times are the same");
    if (d.reason === "OTHER" && !d.reasonNote) fail("Explain the reason");
    if (d.staffId && d.staffId === d.coveredStaffId) {
      fail("The staff member who visited can't be the one being covered");
    }
  });
export type PartTimeVisitInput = z.infer<typeof partTimeVisitSchema>;

/** Admin only: set what a visit pays and why, mark it paid, or undo a wrong mark. */
export const partTimePaySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("SET_AMOUNT"),
    amount: z
      .string()
      .trim()
      .regex(/^\d{1,10}(\.\d{1,2})?$/, "Invalid amount (e.g. 15000 or 15000.50)")
      .refine((v) => Number(v) > 0, "Amount must be greater than zero"),
    reason: z.string().trim().min(3, "Write the reason for this amount").max(500),
  }),
  z.object({
    action: z.literal("MARK_PAID"),
    method: z.enum(PAYMENT_METHODS, { error: "Choose a payment method" }),
    reference: optionalText(200),
  }),
  z.object({
    action: z.literal("UNDO_PAID"),
    reason: z.string().trim().min(3, "Write why the payment is being undone").max(500),
  }),
]);
export type PartTimePayInput = z.infer<typeof partTimePaySchema>;

export const voidPartTimeVisitSchema = z.object({
  reason: z.string().trim().min(3, "Write why this record is being cancelled").max(500),
});
