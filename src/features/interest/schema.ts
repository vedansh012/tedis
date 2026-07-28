import { z } from "zod";
import { SUGGEST_LIMITS } from "./constants";

/** User-submitted "Suggest a New Interest" request. */
export const suggestInterestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(SUGGEST_LIMITS.name.min, "Give it a clear name.")
    .max(SUGGEST_LIMITS.name.max, "Keep the name short."),
  description: z
    .string()
    .trim()
    .min(SUGGEST_LIMITS.description.min, "Add a short description.")
    .max(SUGGEST_LIMITS.description.max),
  reason: z
    .string()
    .trim()
    .min(SUGGEST_LIMITS.reason.min, "Tell us why it belongs on TedIS.")
    .max(SUGGEST_LIMITS.reason.max),
});
export type SuggestInterestInput = z.infer<typeof suggestInterestSchema>;

// A URL-safe slug: lowercase, hyphen-separated. Used when publishing an interest.
const slug = z
  .string()
  .trim()
  .min(2)
  .max(50)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens.");

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex color.")
  .optional();

/** Admin publishes a request → creates the Interest and rewards the requester(s). */
export const publishInterestSchema = z.object({
  requestId: z.string(),
  name: z.string().trim().min(2).max(50),
  slug,
  tagline: z.string().trim().max(80).optional(),
  description: z.string().trim().max(500).optional(),
  accentColor: hexColor,
  iconKey: z.string().trim().min(1).max(40).optional(),
  isFeatured: z.boolean().optional(),
  // Other pending requests for the same interest — folded in and rewarded too.
  duplicateRequestIds: z.array(z.string()).max(50).optional(),
});
export type PublishInterestInput = z.infer<typeof publishInterestSchema>;

/** Admin creates an interest directly (no request behind it). */
export const createInterestSchema = z.object({
  name: z.string().trim().min(2).max(50),
  slug,
  tagline: z.string().trim().max(80).optional(),
  description: z.string().trim().max(500).optional(),
  accentColor: hexColor,
  iconKey: z.string().trim().min(1).max(40).optional(),
  isFeatured: z.boolean().optional(),
});
export type CreateInterestInput = z.infer<typeof createInterestSchema>;

/** Admin edits an existing interest. */
export const updateInterestSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(2).max(50).optional(),
  tagline: z.string().trim().max(80).nullish(),
  description: z.string().trim().max(500).nullish(),
  accentColor: hexColor,
  iconKey: z.string().trim().min(1).max(40).nullish(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});
export type UpdateInterestInput = z.infer<typeof updateInterestSchema>;
