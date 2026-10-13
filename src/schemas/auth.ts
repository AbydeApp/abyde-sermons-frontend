import { z } from "zod";

const email = z.string().trim().min(1, "Enter your email").email("Enter a valid email address");
const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
  remember: z.boolean(),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name"),
    email,
    password,
    confirmPassword: z.string().min(1, "Confirm your password"),
    phoneNumber: z
      .string()
      .trim()
      .min(1, "Enter your phone number")
      .refine((value) => {
        const digits = value.replace(/\D/g, "");
        return /^\+?[0-9\s().-]+$/.test(value) && digits.length >= 7 && digits.length <= 15;
      }, "Enter a valid phone number"),
    churchName: z.string().trim().optional(),
    denomination: z.string().trim().optional(),
    churchAddress: z.string().trim().optional(),
    primaryColor: z.string().trim().optional().or(z.literal("")).refine((value) => !value || /^#[0-9a-f]{6}$/i.test(value), "Use a hex color like #B5502F"),
    secondaryColor: z.string().trim().optional().or(z.literal("")).refine((value) => !value || /^#[0-9a-f]{6}$/i.test(value), "Use a hex color like #B5502F"),
    accentColor: z.string().trim().optional().or(z.literal("")).refine((value) => !value || /^#[0-9a-f]{6}$/i.test(value), "Use a hex color like #B5502F"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  });
export type SignupValues = z.infer<typeof signupSchema>;

export const forgotSchema = z.object({ email });
export type ForgotValues = z.infer<typeof forgotSchema>;

export const resetSchema = z
  .object({ password, confirmPassword: z.string().min(1, "Confirm your password") })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  });
export type ResetValues = z.infer<typeof resetSchema>;
