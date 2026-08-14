import { z } from "zod";

export const MARKETING_PLATFORMS = [
  "FACEBOOK",
  "INSTAGRAM",
  "WHATSAPP",
  "TIKTOK",
  "X",
  "OTHER",
] as const;

export const createPostSchema = z.object({
  title: z.string().trim().min(2, "Kichwa kinahitajika"),
  content: z.string().trim().min(2, "Maudhui yanahitajika"),
  platform: z.enum(MARKETING_PLATFORMS).default("OTHER"),
  aiGenerated: z.boolean().default(false),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

export const updatePostSchema = z.object({
  title: z.string().trim().min(2, "Kichwa kinahitajika").optional(),
  content: z.string().trim().min(2, "Maudhui yanahitajika").optional(),
  platform: z.enum(MARKETING_PLATFORMS).optional(),
});

export type UpdatePostInput = z.infer<typeof updatePostSchema>;

export const generatePostSchema = z.object({
  topic: z.string().trim().min(2, "Mada inahitajika").max(300),
  audience: z.string().trim().max(200).optional().or(z.literal("")),
  platform: z.enum(MARKETING_PLATFORMS).default("OTHER"),
  tone: z.string().trim().max(100).optional().or(z.literal("")),
});

export type GeneratePostInput = z.infer<typeof generatePostSchema>;

export const socialLinksSchema = z.object({
  social_facebook_url: z.string().trim().max(500).optional().or(z.literal("")),
  social_instagram_url: z.string().trim().max(500).optional().or(z.literal("")),
  social_whatsapp_url: z.string().trim().max(500).optional().or(z.literal("")),
  social_website_url: z.string().trim().max(500).optional().or(z.literal("")),
});

export type SocialLinksInput = z.infer<typeof socialLinksSchema>;
