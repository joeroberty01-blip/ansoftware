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

export const createHomeVisitSchema = z.object({
  patientId: z.string().min(1, "Mgonjwa anahitajika"),
  staffId: z.string().optional().or(z.literal("")),
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarehe sio sahihi"),
  status: z.enum(HOME_VISIT_STATUSES).default("SCHEDULED"),
  location: optionalText(300),
  bloodPressure: optionalText(20),
  temperature: optionalDecimal("Joto sio sahihi (mf. 36.5)"),
  pulse: z.number().int().positive().optional(),
  weight: optionalDecimal("Uzito sio sahihi (mf. 68.5)"),
  treatmentNotes: optionalText(2000),
  notes: optionalText(1000),
});

export type CreateHomeVisitInput = z.infer<typeof createHomeVisitSchema>;

export const updateHomeVisitSchema = z.object({
  status: z.enum(HOME_VISIT_STATUSES).optional(),
  location: optionalText(300),
  bloodPressure: optionalText(20),
  temperature: optionalDecimal("Joto sio sahihi (mf. 36.5)"),
  pulse: z.number().int().positive().optional(),
  weight: optionalDecimal("Uzito sio sahihi (mf. 68.5)"),
  treatmentNotes: optionalText(2000),
  notes: optionalText(1000),
});

export type UpdateHomeVisitInput = z.infer<typeof updateHomeVisitSchema>;
