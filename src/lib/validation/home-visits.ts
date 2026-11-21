import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

const optionalDecimal = (message: string) =>
  z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, message)
    .optional()
    .or(z.literal(""));

export const HOME_VISIT_STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED"] as const;
export const VISIT_SESSIONS = ["MORNING", "AFTERNOON", "EVENING"] as const;
export const VISIT_TYPES = ["FULL_TIME", "PART_TIME"] as const;

const optionalLat = z.number().min(-90).max(90).optional();
const optionalLng = z.number().min(-180).max(180).optional();
const optionalAccuracy = z.number().nonnegative().optional();

export const createHomeVisitSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  staffId: z.string().optional().or(z.literal("")),
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  visitSession: z.enum(VISIT_SESSIONS).optional().or(z.literal("")),
  visitType: z.enum(VISIT_TYPES).default("FULL_TIME"),
  status: z.enum(HOME_VISIT_STATUSES).default("SCHEDULED"),
  location: optionalText(300),
  checkInLat: optionalLat,
  checkInLng: optionalLng,
  checkInAccuracyM: optionalAccuracy,
  bloodPressure: optionalText(20),
  temperature: optionalDecimal("Invalid temperature (e.g. 36.5)"),
  pulse: z.number().int().positive().optional(),
  weight: optionalDecimal("Invalid weight (e.g. 68.5)"),
  heightCm: optionalDecimal("Invalid height (e.g. 170)"),
  bloodGlucose: optionalDecimal("Invalid blood glucose (e.g. 5.5)"),
  spo2: z.number().int().min(50, "SpO₂ must be 50–100").max(100, "SpO₂ must be 50–100").optional(),
  foodIntake: optionalText(500),
  treatmentNotes: optionalText(2000),
  notes: optionalText(1000),
});

export type CreateHomeVisitInput = z.infer<typeof createHomeVisitSchema>;

export const updateHomeVisitSchema = z.object({
  status: z.enum(HOME_VISIT_STATUSES).optional(),
  visitSession: z.enum(VISIT_SESSIONS).optional().or(z.literal("")),
  location: optionalText(300),
  bloodPressure: optionalText(20),
  temperature: optionalDecimal("Invalid temperature (e.g. 36.5)"),
  pulse: z.number().int().positive().optional(),
  weight: optionalDecimal("Invalid weight (e.g. 68.5)"),
  heightCm: optionalDecimal("Invalid height (e.g. 170)"),
  bloodGlucose: optionalDecimal("Invalid blood glucose (e.g. 5.5)"),
  spo2: z.number().int().min(50, "SpO₂ must be 50–100").max(100, "SpO₂ must be 50–100").optional(),
  foodIntake: optionalText(500),
  treatmentNotes: optionalText(2000),
  notes: optionalText(1000),
});

export type UpdateHomeVisitInput = z.infer<typeof updateHomeVisitSchema>;
