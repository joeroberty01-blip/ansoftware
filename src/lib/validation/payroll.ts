import { z } from "zod";
import { PAYMENT_METHODS } from "./invoices";

export const createPayrollSchema = z.object({
  staffId: z.string().min(1, "staffId inahitajika"),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  otherDeductions: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Other deductions sio sahihi")
    .optional()
    .default("0"),
  applyNssf: z.boolean().optional().default(true),
});

export const paySalarySchema = z
  .object({
    paymentMethod: z.enum(PAYMENT_METHODS, {
      error: "Chagua njia ya malipo",
    }),
    paymentReference: z.string().trim().max(100).optional().default(""),
    paymentAccount: z.string().trim().max(150).optional().default(""),
  })
  .refine((d) => d.paymentMethod === "CASH" || d.paymentReference !== "", {
    message: "Weka reference ya malipo (mf. namba ya muamala)",
    path: ["paymentReference"],
  });

export type PaySalaryInput = z.infer<typeof paySalarySchema>;

export type CreatePayrollInput = z.infer<typeof createPayrollSchema>;
