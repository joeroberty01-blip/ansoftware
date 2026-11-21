import { z } from "zod";
import { MAR_SLOTS, MAR_STATUSES } from "../mar";

export const marDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

export const recordMarSchema = z.object({
  medicationId: z.string().min(1, "Select a medication"),
  date: marDateSchema,
  slot: z.enum(MAR_SLOTS),
  status: z.enum([...MAR_STATUSES, "PENDING"]),
  givenTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time (e.g. 08:30)")
    .optional()
    .or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});
