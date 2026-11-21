import { z } from "zod";

export const CARE_PLAN_FREQUENCIES = ["DAILY", "WEEKLY"] as const;
export const CARE_PLAN_STATUSES = ["ACTIVE", "PAUSED", "ENDED"] as const;
export const CARE_PLAN_SESSIONS = ["MORNING", "AFTERNOON", "EVENING"] as const;

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

export const createCarePlanSchema = z
  .object({
    patientId: z.string().min(1, "Patient is required"),
    staffId: z.string().optional().or(z.literal("")),
    frequency: z.enum(CARE_PLAN_FREQUENCIES),
    weekdays: z.array(z.number().int().min(0).max(6)).optional(),
    sessions: z
      .array(z.enum(CARE_PLAN_SESSIONS))
      .min(1, "Choose at least one session"),
    startDate: dateStr,
    endDate: dateStr,
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: "The end date must be after the start date",
    path: ["endDate"],
  })
  .refine(
    (d) => {
      const days =
        (new Date(d.endDate).getTime() - new Date(d.startDate).getTime()) /
        86_400_000;
      return days <= 120;
    },
    {
      message: "A care plan can't be longer than 120 days at a time",
      path: ["endDate"],
    }
  )
  .refine((d) => d.frequency !== "WEEKLY" || (d.weekdays && d.weekdays.length > 0), {
    message: "Choose the weekdays for a WEEKLY care plan",
    path: ["weekdays"],
  });

export type CreateCarePlanInput = z.infer<typeof createCarePlanSchema>;

export const updateCarePlanSchema = z.object({
  status: z.enum(CARE_PLAN_STATUSES).optional(),
  staffId: z.string().optional().or(z.literal("")),
});

export type UpdateCarePlanInput = z.infer<typeof updateCarePlanSchema>;
