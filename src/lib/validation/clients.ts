import { z } from "zod";

export const CLIENT_TYPES = ["INDIVIDUAL", "CORPORATE", "INSURANCE"] as const;

export const createClientSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  phone: z.string().trim().min(9, "Invalid phone number"),
  email: z.string().trim().email("Invalid email address").optional().or(z.literal("")),
  type: z.enum(CLIENT_TYPES).default("INDIVIDUAL"),
  address: z.string().trim().optional().or(z.literal("")),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;

export const updateClientSchema = z.object({
  name: z.string().trim().min(2, "Name is required").optional(),
  phone: z.string().trim().min(9, "Invalid phone number").optional(),
  email: z.string().trim().email("Invalid email address").optional().or(z.literal("")),
  type: z.enum(CLIENT_TYPES).optional(),
  address: z.string().trim().optional().or(z.literal("")),
});

export type UpdateClientInput = z.infer<typeof updateClientSchema>;
