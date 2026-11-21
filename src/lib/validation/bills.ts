import { z } from "zod";

const decimalString = (message: string) =>
  z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, message)
    .refine((v) => Number(v) >= 0, message);

export const createBillSchema = z.object({
  name: z.string().trim().min(2, "Bill name is required"),
  category: z.string().trim().min(1, "Category is required"),
  amount: decimalString("Invalid amount"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type CreateBillInput = z.infer<typeof createBillSchema>;

export const updateBillSchema = z.object({
  name: z.string().trim().min(2, "Bill name is required").optional(),
  category: z.string().trim().min(1, "Category is required").optional(),
  amount: decimalString("Invalid amount").optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date").optional(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type UpdateBillInput = z.infer<typeof updateBillSchema>;
