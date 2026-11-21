import { z } from "zod";

const decimalString = (message: string) =>
  z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, message)
    .refine((v) => Number(v) >= 0, message);

export const PROFESSIONS = ["NURSE", "DOCTOR", "CHW", "ADMIN_STAFF", "ACCOUNTANT"] as const;
export const EMPLOYMENT_STATUSES = ["ACTIVE", "INACTIVE", "TERMINATED"] as const;

export const createStaffSchema = z.object({
  fullName: z.string().trim().min(2, "Name is required"),
  email: z.string().trim().email("Invalid email address"),
  phone: z.string().trim().min(9, "Invalid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  profession: z.enum(PROFESSIONS),
  baseSalary: decimalString("Invalid basic salary"),
  allowances: decimalString("Invalid allowances").default("0"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  licenseNumber: z.string().trim().max(100).optional().or(z.literal("")),
  licenseExpiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
    .optional()
    .or(z.literal("")),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;

export const updateStaffSchema = z.object({
  profession: z.enum(PROFESSIONS).optional(),
  licenseNumber: z.string().trim().max(100).optional().or(z.literal("")),
  licenseExpiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
    .optional()
    .or(z.literal("")),
  employmentStatus: z.enum(EMPLOYMENT_STATUSES).optional(),
  baseSalary: decimalString("Invalid basic salary").optional(),
  allowances: decimalString("Invalid allowances").optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
    .optional(),
  highestEducation: z.string().trim().max(200).optional().or(z.literal("")),
  specialization: z.string().trim().max(200).optional().or(z.literal("")),
  skills: z.string().trim().max(500).optional().or(z.literal("")),
  certifications: z.string().trim().max(500).optional().or(z.literal("")),
  isChiefCo: z.boolean().optional(),
});

export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
