import { z } from "zod";

export const DUTY_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED"] as const;

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const createDutySchema = z.object({
  title: z.string().trim().min(2, "Duty title is required"),
  description: optionalText(1000),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
    .optional()
    .or(z.literal("")),
});

export type CreateDutyInput = z.infer<typeof createDutySchema>;

export const updateDutySchema = z.object({
  title: z.string().trim().min(2, "Duty title is required").optional(),
  description: optionalText(1000),
  status: z.enum(DUTY_STATUSES).optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
    .optional()
    .or(z.literal("")),
});

export type UpdateDutyInput = z.infer<typeof updateDutySchema>;
