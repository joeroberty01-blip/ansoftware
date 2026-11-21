import { z } from "zod";

export const BOOKING_STATUSES = ["NEW", "ASSIGNED", "COMPLETED", "CANCELLED"] as const;

/** Where a request came from. Shown in Swahili via BOOKING_SOURCE_LABELS. */
export const BOOKING_SOURCES = [
  "HOSPITAL",
  "DOCTOR",
  "DIASPORA",
  "SOCIAL",
  "CLIENT_REFERRAL",
  "COMMUNITY",
  "WEBSITE",
  "OTHER",
] as const;
export type BookingSource = (typeof BOOKING_SOURCES)[number];

export const BOOKING_SOURCE_LABELS: Record<BookingSource, string> = {
  HOSPITAL: "Hospital",
  DOCTOR: "Doctor / physio",
  DIASPORA: "Diaspora",
  SOCIAL: "Social media",
  CLIENT_REFERRAL: "Existing client",
  COMMUNITY: "Community / church / mosque",
  WEBSITE: "Website / app",
  OTHER: "Other",
};

export const FOLLOW_UP_CHANNELS = ["CALL", "WHATSAPP", "VISIT", "OTHER"] as const;
export type FollowUpChannel = (typeof FOLLOW_UP_CHANNELS)[number];

export const FOLLOW_UP_CHANNEL_LABELS: Record<FollowUpChannel, string> = {
  CALL: "Phone",
  WHATSAPP: "WhatsApp",
  VISIT: "Visit / assessment",
  OTHER: "Other",
};

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

export const createBookingSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required").max(200),
  phone: z.string().trim().min(6, "Invalid phone number").max(30),
  serviceType: z.string().trim().min(1, "Service type is required").max(200),
  preferredDate: isoDate.optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  source: z.enum(BOOKING_SOURCES).optional(),
  sourceDetail: z.string().trim().max(200).optional().or(z.literal("")),
  nextFollowUpDate: isoDate.optional().or(z.literal("")),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const updateBookingSchema = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  assignedStaffId: z.string().optional().or(z.literal("")),
  patientId: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  source: z.enum(BOOKING_SOURCES).optional(),
  sourceDetail: z.string().trim().max(200).optional().or(z.literal("")),
  /** "" or null clears it. */
  nextFollowUpDate: isoDate.nullable().optional().or(z.literal("")),
});

export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;

export const createFollowUpSchema = z.object({
  channel: z.enum(FOLLOW_UP_CHANNELS),
  note: z.string().trim().min(2, "Write what was discussed").max(1000),
  /** "" or null = no further follow-up needed. */
  nextFollowUpDate: isoDate.nullable().optional().or(z.literal("")),
  status: z.enum(BOOKING_STATUSES).optional(),
});

export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>;
