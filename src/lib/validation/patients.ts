import { z } from "zod";

const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tarehe sio sahihi")
  .optional()
  .or(z.literal(""));

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const createPatientSchema = z.object({
  fullName: z.string().trim().min(2, "Jina la mgonjwa linahitajika"),
  dateOfBirth: optionalDate,
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  phone: optionalText(30),
  email: z.string().trim().email("Barua pepe sio sahihi").optional().or(z.literal("")),
  address: optionalText(300),
  emergencyContactName: optionalText(150),
  emergencyContactPhone: optionalText(30),
  bloodType: optionalText(10),
  allergies: optionalText(1000),
  chronicConditions: optionalText(1000),
  notes: optionalText(1000),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;

export const updatePatientSchema = createPatientSchema.partial();

export const addMedicationSchema = z.object({
  medicationName: z.string().trim().min(2, "Jina la dawa linahitajika"),
  dosage: optionalText(100),
  frequency: optionalText(100),
  startDate: optionalDate,
  endDate: optionalDate,
  notes: optionalText(500),
});

export type AddMedicationInput = z.infer<typeof addMedicationSchema>;

export const addDocumentSchema = z.object({
  title: z.string().trim().min(2, "Jina la document linahitajika"),
  documentType: z.string().trim().min(1, "Aina ya document inahitajika"),
  notes: optionalText(1000),
});

export type AddDocumentInput = z.infer<typeof addDocumentSchema>;
