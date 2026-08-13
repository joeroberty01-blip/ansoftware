import { z } from "zod";

export const adminSignupSchema = z.object({
  fullName: z.string().min(2, "Jina linahitajika"),
  email: z.string().email("Barua pepe sio sahihi"),
  phone: z.string().min(9, "Namba ya simu sio sahihi"),
  password: z.string().min(8, "Password iwe angalau herufi 8"),
  adminSecretCode: z.string().min(1, "Admin secret code inahitajika"),
});

export const staffSignupSchema = z.object({
  fullName: z.string().min(2, "Jina linahitajika"),
  email: z.string().email("Barua pepe sio sahihi"),
  phone: z.string().min(9, "Namba ya simu sio sahihi"),
  password: z.string().min(8, "Password iwe angalau herufi 8"),
  profession: z.enum(["NURSE", "DOCTOR", "CHW", "ADMIN_STAFF"]),
});

export const loginSchema = z.object({
  email: z.string().email("Barua pepe sio sahihi"),
  password: z.string().min(1, "Password inahitajika"),
});

export type AdminSignupInput = z.infer<typeof adminSignupSchema>;
export type StaffSignupInput = z.infer<typeof staffSignupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
