import { z } from "zod";

export const churchSchema = z.object({
  name: z.string().trim().min(2, "Enter your church or ministry name"),
  ownerRole: z.string().trim().min(1, "Tell us your role"),
  denomination: z.string().trim().optional(),
  address: z.string().trim().optional(),
  website: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^https?:\/\/.+\..+/.test(v), "Use a full URL, like https://yourchurch.org"),
});
export type ChurchValues = z.infer<typeof churchSchema>;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #7A21B0");

export const brandSchema = z.object({
  primaryColor: hex.optional().or(z.literal("")),
  secondaryColor: hex.optional().or(z.literal("")),
  preferredBibleTranslation: z.string().optional(),
});
export type BrandValues = z.infer<typeof brandSchema>;
