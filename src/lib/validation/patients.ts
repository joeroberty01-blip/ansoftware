import { z } from "zod";
import { MAR_SLOTS } from "../mar";

const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
  .optional()
  .or(z.literal(""));

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const createPatientSchema = z.object({
  fullName: z.string().trim().min(2, "Patient name is required"),
  dateOfBirth: optionalDate,
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  phone: optionalText(30),
  email: z.string().trim().email("Invalid email address").optional().or(z.literal("")),
  address: optionalText(300),
  emergencyContactName: optionalText(150),
  emergencyContactPhone: optionalText(30),
  bloodType: optionalText(10),
  allergies: optionalText(1000),
  chronicConditions: optionalText(1000),
  notes: optionalText(1000),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;

export const updatePatientSchema = createPatientSchema.partial().extend({
  assignedStaffId: z.string().optional().or(z.literal("")),
});

export const addMedicationSchema = z.object({
  medicationName: z.string().trim().min(2, "Medication name is required"),
  dosage: optionalText(100),
  frequency: optionalText(100),
  startDate: optionalDate,
  endDate: optionalDate,
  notes: optionalText(500),
  scheduleSlots: z.array(z.enum(MAR_SLOTS)).max(3).optional().default([]),
});

export type AddMedicationInput = z.infer<typeof addMedicationSchema>;

export const addDocumentSchema = z.object({
  title: z.string().trim().min(2, "Document name is required"),
  documentType: z.string().trim().min(1, "Document type is required"),
  notes: optionalText(1000),
});

export type AddDocumentInput = z.infer<typeof addDocumentSchema>;
