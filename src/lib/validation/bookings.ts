import { z } from "zod";

export const BOOKING_STATUSES = ["NEW", "ASSIGNED", "COMPLETED", "CANCELLED"] as const;

export const createBookingSchema = z.object({
  fullName: z.string().trim().min(1, "Jina linahitajika").max(200),
  phone: z.string().trim().min(6, "Namba ya simu si sahihi").max(30),
  serviceType: z.string().trim().min(1, "Aina ya huduma inahitajika").max(200),
  preferredDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tarehe sio sahihi")
    .optional()
    .or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const updateBookingSchema = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  assignedStaffId: z.string().optional().or(z.literal("")),
  patientId: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
