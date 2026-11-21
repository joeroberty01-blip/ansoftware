import { z } from "zod";

export const adminSignupSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(9, "Invalid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  adminSecretCode: z.string().min(1, "Admin secret code is required"),
});

export const staffSignupSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(9, "Invalid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  profession: z.enum(["NURSE", "DOCTOR", "CHW", "ADMIN_STAFF", "ACCOUNTANT"]),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  // Which sign-in tab the user used. Optional so API clients keep working.
  role: z.enum(["ADMIN", "STAFF"]).optional(),
});

export const forgotPasswordRequestSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
});

export const resetPasswordSchema = z
  .object({
    email: z.string().trim().email("Invalid email address"),
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "Enter the 6-digit code we emailed you"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Repeat new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type AdminSignupInput = z.infer<typeof adminSignupSchema>;
export type StaffSignupInput = z.infer<typeof staffSignupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordRequestInput = z.infer<typeof forgotPasswordRequestSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
