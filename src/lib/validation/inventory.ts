import { z } from "zod";

export const createItemSchema = z.object({
  name: z.string().trim().min(2, "Item name is required"),
  category: z.string().trim().min(1, "Category is required"),
  unit: z.string().trim().min(1, "Unit is required (e.g. pieces, bottles)"),
  reorderLevel: z.number().int().min(0),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;

export const updateItemSchema = z.object({
  name: z.string().trim().min(2, "Item name is required").optional(),
  category: z.string().trim().min(1, "Category is required").optional(),
  unit: z.string().trim().min(1, "Unit is required (e.g. pieces, bottles)").optional(),
  reorderLevel: z.number().int().min(0).optional(),
});

export type UpdateItemInput = z.infer<typeof updateItemSchema>;

export const recordMovementSchema = z.object({
  movementType: z.enum(["IN", "OUT"]),
  quantity: z.number().int().positive("Quantity must be greater than zero"),
  batchNumber: z.string().trim().max(100).optional().or(z.literal("")),
  expiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
    .optional()
    .or(z.literal("")),
  reference: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type RecordMovementInput = z.infer<typeof recordMovementSchema>;
