import { z } from "zod";
import { PAYMENT_METHODS } from "./invoices";

export const INCOME_CATEGORIES = ["HUDUMA", "MSAADA", "UWEKEZAJI", "MENGINEYO"] as const;

export const createIncomeSchema = z.object({
  category: z.enum(INCOME_CATEGORIES),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid number (e.g. 15000 or 15000.50)")
    .refine((v) => Number(v) > 0, "Amount must be greater than zero"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  source: z.string().trim().min(1, "Source is required").max(200),
  description: z.string().trim().min(1, "Description is required").max(500),
  paymentMethod: z.enum(PAYMENT_METHODS).optional().or(z.literal("")),
});

export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;
