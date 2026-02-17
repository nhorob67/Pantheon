import { z } from "zod/v4";

export const EMAIL_SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/;

export const updateEmailIdentitySchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      EMAIL_SLUG_REGEX,
      "Use 3-63 characters: lowercase letters, numbers, and hyphens"
    ),
});

export type UpdateEmailIdentityData = z.infer<typeof updateEmailIdentitySchema>;
