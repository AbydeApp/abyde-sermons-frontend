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

/** Optional phone number, validated only when one is entered. */
export const optionalPhone = z
  .string()
  .trim()
  .optional()
  .refine((value) => {
    if (!value) return true;
    const digits = value.replace(/\D/g, "");
    return /^\+?[0-9\s().-]+$/.test(value) && digits.length >= 7 && digits.length <= 15;
  }, "Enter a valid phone number");

/** Signup asks for the bare minimum; everything else lives in Settings and Brand Studio. */
export const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name"),
  email,
  password,
  churchName: z.string().trim().optional(),
});
export type SignupValues = z.infer<typeof signupSchema>;

export const OTP_LENGTH = 6;
export const otpSchema = z.object({
  code: z.string().trim().regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), `Enter the ${OTP_LENGTH}-digit code`),
});
export type OtpValues = z.infer<typeof otpSchema>;

export const forgotSchema = z.object({ email });
export type ForgotValues = z.infer<typeof forgotSchema>;

export const resetSchema = z
  .object({ password, confirmPassword: z.string().min(1, "Confirm your password") })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  });
export type ResetValues = z.infer<typeof resetSchema>;
