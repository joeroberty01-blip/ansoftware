import { z } from "zod";

const decimalString = (message: string) =>
  z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, message)
    .refine((v) => Number(v) >= 0, message);

export const createBillSchema = z.object({
  name: z.string().trim().min(2, "Jina la bill linahitajika"),
  category: z.string().trim().min(1, "Category inahitajika"),
  amount: decimalString("Kiasi sio sahihi"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarehe sio sahihi"),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type CreateBillInput = z.infer<typeof createBillSchema>;

export const updateBillSchema = z.object({
  name: z.string().trim().min(2, "Jina la bill linahitajika").optional(),
  category: z.string().trim().min(1, "Category inahitajika").optional(),
  amount: decimalString("Kiasi sio sahihi").optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarehe sio sahihi").optional(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type UpdateBillInput = z.infer<typeof updateBillSchema>;
