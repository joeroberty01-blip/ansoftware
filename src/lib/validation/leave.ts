import { z } from "zod";

export const createLeaveRequestSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid end date"),
  reason: z.string().trim().min(3, "A reason is required").max(500),
});

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;

export const decideLeaveRequestSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  decisionNote: z.string().trim().max(500).optional().or(z.literal("")),
});

export type DecideLeaveRequestInput = z.infer<typeof decideLeaveRequestSchema>;
