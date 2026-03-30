import { z } from "zod";

export const roleSchema = z.enum(["TRAVELER", "ADMIN"]);
export type Role = z.infer<typeof roleSchema>;

export const providerCategorySchema = z.enum([
  "RESTAURANT",
  "ACTIVITY",
  "TRANSPORT",
  "ACCOM",
  "EXCURSION"
]);

export const bookingStatusSchema = z.enum(["PENDING", "CONFIRMED", "CANCELLED"]);

export const itineraryStatusSchema = z.enum(["DRAFT", "SENT", "VALIDATED", "BOOKED"]);

export const appEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_MIN: z.coerce.number().int().positive().default(15),
  JWT_REFRESH_EXPIRES_DAYS: z.coerce.number().int().positive().default(7),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  ALLOWED_ORIGINS: z.string().min(1),
  RESEND_API_KEY: z.string().min(1).optional(),
  ADMIN_REPORT_EMAIL: z.string().email().optional(),
  R2_ENDPOINT: z.string().url().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),
  ADMIN_BOOTSTRAP_TOKEN: z.string().optional()
});

export const providerFiltersSchema = z.object({
  city: z.string().optional(),
  category: providerCategorySchema.optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(12)
});

export type ProviderFilters = z.infer<typeof providerFiltersSchema>;
