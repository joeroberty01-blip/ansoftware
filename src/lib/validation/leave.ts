import { z } from "zod";

export const createLeaveRequestSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarehe ya kuanza sio sahihi"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarehe ya kumaliza sio sahihi"),
  reason: z.string().trim().min(3, "Sababu inahitajika").max(500),
});

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;

export const decideLeaveRequestSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  decisionNote: z.string().trim().max(500).optional().or(z.literal("")),
});

export type DecideLeaveRequestInput = z.infer<typeof decideLeaveRequestSchema>;
