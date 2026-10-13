import { describe, expect, it } from "vitest";
import { firstName, formatBytes, formatTimestamp, greeting, initials } from "./format";

describe("format helpers", () => {
  it("formats timestamps", () => {
    expect(formatTimestamp(65_000)).toBe("1:05");
    expect(formatTimestamp(3_725_000)).toBe("1:02:05");
  });
  it("formats bytes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(5 * 1024 ** 2)).toBe("5.0 MB");
  });
  it("greets by time of day", () => {
    expect(greeting(new Date(2026, 0, 1, 8))).toBe("Good morning");
    expect(greeting(new Date(2026, 0, 1, 14))).toBe("Good afternoon");
    expect(greeting(new Date(2026, 0, 1, 20))).toBe("Good evening");
  });
  it("extracts names", () => {
    expect(firstName("Grace Adeyemi")).toBe("Grace");
    expect(initials("Grace Adeyemi")).toBe("GA");
  });
});
