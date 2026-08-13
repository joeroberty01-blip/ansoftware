import { z } from "zod";

export const CLIENT_TYPES = ["INDIVIDUAL", "CORPORATE", "INSURANCE"] as const;

export const createClientSchema = z.object({
  name: z.string().trim().min(2, "Jina linahitajika"),
  phone: z.string().trim().min(9, "Namba ya simu sio sahihi"),
  email: z.string().trim().email("Barua pepe sio sahihi").optional().or(z.literal("")),
  type: z.enum(CLIENT_TYPES).default("INDIVIDUAL"),
  address: z.string().trim().optional().or(z.literal("")),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
