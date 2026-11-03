import { z } from "zod";
import { MAR_SLOTS, MAR_STATUSES } from "../mar";

export const marDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tarehe sio sahihi");

export const recordMarSchema = z.object({
  medicationId: z.string().min(1, "Chagua dawa"),
  date: marDateSchema,
  slot: z.enum(MAR_SLOTS),
  status: z.enum([...MAR_STATUSES, "PENDING"]),
  givenTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Saa sio sahihi (mf. 08:30)")
    .optional()
    .or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});
