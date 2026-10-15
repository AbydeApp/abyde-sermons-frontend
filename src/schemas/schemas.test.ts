import { describe, expect, it } from "vitest";
import { loginSchema, optionalPhone, otpSchema, signupSchema } from "./auth";
import { churchSchema } from "./onboarding";
import { validateSermonFile } from "./sermon";

describe("schemas", () => {
  it("accepts a signup with just name, email and password", () => {
    expect(signupSchema.safeParse({ fullName: "Grace A", email: "g@church.org", password: "abcd1234" }).success).toBe(true);
    expect(signupSchema.safeParse({ fullName: "Grace A", email: "g@church.org", password: "abcd1234", churchName: "Grace Church" }).success).toBe(true);
  });
  it("enforces signup basics", () => {
    const base = { fullName: "Grace A", email: "g@church.org", password: "abcd1234" };
    expect(signupSchema.safeParse({ ...base, fullName: "G" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...base, email: "nope" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...base, password: "short1" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...base, password: "abcdefgh" }).success).toBe(false);
  });
  it("accepts only a full numeric one-time code", () => {
    expect(otpSchema.safeParse({ code: "123456" }).success).toBe(true);
    expect(otpSchema.safeParse({ code: "12345" }).success).toBe(false);
    expect(otpSchema.safeParse({ code: "12345a" }).success).toBe(false);
  });
  it("treats phone as optional but validates it when given", () => {
    expect(optionalPhone.safeParse(undefined).success).toBe(true);
    expect(optionalPhone.safeParse("").success).toBe(true);
    expect(optionalPhone.safeParse("+234 801 234 5678").success).toBe(true);
    expect(optionalPhone.safeParse("phone").success).toBe(false);
  });
  it("requires an email on login", () => {
    expect(loginSchema.safeParse({ email: "", password: "x", remember: false }).success).toBe(false);
  });
  it("validates church website", () => {
    const base = { name: "Grace", ownerRole: "Pastor" };
    expect(churchSchema.safeParse({ ...base, website: "nope" }).success).toBe(false);
    expect(churchSchema.safeParse({ ...base, website: "https://grace.org" }).success).toBe(true);
  });
  it("validates sermon files", () => {
    expect(validateSermonFile(new File(["x"], "a.exe"))).toMatch(/Unsupported/);
    expect(validateSermonFile(new File(["x"], "a.mp3"))).toBeNull();
  });
});
