import { z } from "zod";

export const createItemSchema = z.object({
  name: z.string().trim().min(2, "Jina la item linahitajika"),
  category: z.string().trim().min(1, "Category inahitajika"),
  unit: z.string().trim().min(1, "Unit inahitajika (mf. vipande, chupa)"),
  reorderLevel: z.number().int().min(0),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;

export const recordMovementSchema = z.object({
  movementType: z.enum(["IN", "OUT"]),
  quantity: z.number().int().positive("Idadi lazima iwe zaidi ya sifuri"),
  batchNumber: z.string().trim().max(100).optional().or(z.literal("")),
  expiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tarehe sio sahihi")
    .optional()
    .or(z.literal("")),
  reference: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type RecordMovementInput = z.infer<typeof recordMovementSchema>;
