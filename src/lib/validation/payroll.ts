import { z } from "zod";

export const createPayrollSchema = z.object({
  staffId: z.string().min(1, "staffId inahitajika"),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  otherDeductions: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Other deductions sio sahihi")
    .optional()
    .default("0"),
});

export type CreatePayrollInput = z.infer<typeof createPayrollSchema>;
