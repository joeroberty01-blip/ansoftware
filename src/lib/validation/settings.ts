import { z } from "zod";

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Jina linahitajika"),
  phone: z.string().trim().min(9, "Namba ya simu sio sahihi"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Password ya sasa inahitajika"),
    newPassword: z.string().min(8, "Password mpya iwe angalau herufi 8"),
    confirmPassword: z.string().min(1, "Thibitisha password mpya"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Password mpya hazifanani",
    path: ["confirmPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
