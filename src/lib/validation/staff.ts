import { z } from "zod";

const decimalString = (message: string) =>
  z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, message)
    .refine((v) => Number(v) >= 0, message);

export const PROFESSIONS = ["NURSE", "DOCTOR", "CHW", "ADMIN_STAFF"] as const;
export const EMPLOYMENT_STATUSES = ["ACTIVE", "INACTIVE", "TERMINATED"] as const;

export const createStaffSchema = z.object({
  fullName: z.string().trim().min(2, "Jina linahitajika"),
  email: z.string().trim().email("Barua pepe sio sahihi"),
  phone: z.string().trim().min(9, "Namba ya simu sio sahihi"),
  password: z.string().min(8, "Password iwe angalau herufi 8"),
  profession: z.enum(PROFESSIONS),
  baseSalary: decimalString("Mshahara wa msingi sio sahihi"),
  allowances: decimalString("Allowances sio sahihi").default("0"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarehe sio sahihi"),
  licenseNumber: z.string().trim().max(100).optional().or(z.literal("")),
  licenseExpiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tarehe sio sahihi")
    .optional()
    .or(z.literal("")),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;

export const updateStaffSchema = z.object({
  profession: z.enum(PROFESSIONS).optional(),
  licenseNumber: z.string().trim().max(100).optional().or(z.literal("")),
  licenseExpiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tarehe sio sahihi")
    .optional()
    .or(z.literal("")),
  employmentStatus: z.enum(EMPLOYMENT_STATUSES).optional(),
  baseSalary: decimalString("Mshahara wa msingi sio sahihi").optional(),
  allowances: decimalString("Allowances sio sahihi").optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tarehe sio sahihi")
    .optional(),
  highestEducation: z.string().trim().max(200).optional().or(z.literal("")),
  specialization: z.string().trim().max(200).optional().or(z.literal("")),
  skills: z.string().trim().max(500).optional().or(z.literal("")),
  certifications: z.string().trim().max(500).optional().or(z.literal("")),
});

export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
