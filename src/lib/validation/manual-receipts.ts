import { z } from "zod";
import { PAYMENT_METHODS } from "./invoices";

export const createManualReceiptSchema = z.object({
  receiptNumber: z.string().trim().max(50).optional().or(z.literal("")),
  issuedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tarehe sio sahihi")
    .optional()
    .or(z.literal("")),
  clientName: z.string().trim().min(1, "Jina la client linahitajika").max(200),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Kiasi sio sahihi (mf. 15000 au 15000.50)")
    .refine((v) => Number(v) > 0, "Kiasi lazima kiwe zaidi ya sifuri"),
  method: z.enum(PAYMENT_METHODS),
  reference: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});

export type CreateManualReceiptInput = z.infer<typeof createManualReceiptSchema>;
