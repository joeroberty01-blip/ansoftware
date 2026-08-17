import { z } from "zod";
import { PAYMENT_METHODS } from "./invoices";

export const INCOME_CATEGORIES = ["HUDUMA", "MSAADA", "UWEKEZAJI", "MENGINEYO"] as const;

export const createIncomeSchema = z.object({
  category: z.enum(INCOME_CATEGORIES),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Kiasi lazima kiwe namba sahihi (mf. 15000 au 15000.50)")
    .refine((v) => Number(v) > 0, "Kiasi lazima kiwe zaidi ya sifuri"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarehe sio sahihi"),
  source: z.string().trim().min(1, "Chanzo (source) kinahitajika").max(200),
  description: z.string().trim().min(1, "Maelezo yanahitajika").max(500),
  paymentMethod: z.enum(PAYMENT_METHODS).optional().or(z.literal("")),
});

export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;
