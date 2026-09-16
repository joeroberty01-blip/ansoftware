import { z } from "zod";
import { CLIENT_TYPES } from "./clients";

// Decimal-string patterns end-to-end — never parsed to a JS float before
// hitting the DB. Server-side totals are computed with Decimal.js.
const positiveDecimalString = (message: string) =>
  z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, message)
    .refine((v) => Number(v) > 0, message);

export const invoiceItemSchema = z.object({
  description: z.string().trim().min(1, "Maelezo ya kipengele yanahitajika"),
  quantity: positiveDecimalString("Idadi sio sahihi (mf. 1 au 2.50)"),
  unitPrice: positiveDecimalString("Bei sio sahihi (mf. 15000 au 15000.50)"),
});

export const DOC_TYPES = [
  "QUOTATION",
  "PROFORMA",
  "INVOICE",
  "TAX_INVOICE",
] as const;

export const newClientOnInvoiceSchema = z.object({
  name: z.string().trim().min(2, "Jina la client linahitajika"),
  phone: z.string().trim().min(9, "Namba ya simu sio sahihi"),
  email: z.string().trim().email("Barua pepe sio sahihi").optional().or(z.literal("")),
  type: z.enum(CLIENT_TYPES).default("INDIVIDUAL"),
  address: z.string().trim().optional().or(z.literal("")),
});

export const createInvoiceSchema = z
  .object({
    docType: z.enum(DOC_TYPES),
    documentNumber: z.string().trim().max(50).optional().or(z.literal("")),
    issueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Tarehe sio sahihi")
      .optional()
      .or(z.literal("")),
    clientId: z.string().min(1).optional().or(z.literal("")),
    newClient: newClientOnInvoiceSchema.optional(),
    dueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Tarehe sio sahihi")
      .optional()
      .or(z.literal("")),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
    items: z.array(invoiceItemSchema).min(1, "Ongeza angalau kipengele kimoja"),
  })
  .refine((data) => Boolean(data.clientId) || Boolean(data.newClient), {
    message: "Chagua client aliyepo au jaza taarifa za client mpya",
    path: ["clientId"],
  });

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const PAYMENT_METHODS = [
  "CASH",
  "MPESA",
  "AIRTEL_MONEY",
  "MIXX_BY_YAS",
  "BANK_TRANSFER",
] as const;

export const recordPaymentSchema = z.object({
  amount: positiveDecimalString("Kiasi sio sahihi (mf. 15000 au 15000.50)"),
  method: z.enum(PAYMENT_METHODS),
  reference: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
