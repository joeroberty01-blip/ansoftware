import { z } from "zod";
import { PAYMENT_METHODS } from "./invoices";

export const EXPENSE_CATEGORIES = [
  "MISHAHARA",
  "VIFAA",
  "USAFIRI",
  "UENDESHAJI",
  "MENGINEYO",
] as const;

export const createExpenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  // Kept as a decimal string end-to-end (never parsed to a JS float) so the
  // value passed to the NUMERIC column in Postgres is always exact.
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Kiasi lazima kiwe namba sahihi (mf. 15000 au 15000.50)")
    .refine((v) => Number(v) > 0, "Kiasi lazima kiwe zaidi ya sifuri"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarehe sio sahihi"),
  description: z.string().trim().min(1, "Maelezo yanahitajika").max(500),
  paymentMethod: z.enum(PAYMENT_METHODS).optional().or(z.literal("")),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
