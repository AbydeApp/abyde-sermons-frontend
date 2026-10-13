import { describe, expect, it } from "vitest";
import { loginSchema, signupSchema } from "./auth";
import { churchSchema } from "./onboarding";
import { validateSermonFile } from "./sermon";

describe("schemas", () => {
  it("rejects mismatched signup passwords", () => {
    const r = signupSchema.safeParse({
      fullName: "Grace A",
      email: "g@church.org",
      password: "abcd1234",
      confirmPassword: "abcd12345",
    });
    expect(r.success).toBe(false);
  });
  it("accepts a valid signup", () => {
    expect(
      signupSchema.safeParse({
        fullName: "Grace A",
        email: "g@church.org",
        password: "abcd1234",
        confirmPassword: "abcd1234",
      }).success,
    ).toBe(true);
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
