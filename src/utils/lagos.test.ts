import { describe, expect, it } from "vitest";
import { fromLagosInput, toLagosInput, toLagosWall } from "./lagos";

describe("Lagos time", () => {
  it("converts Lagos wall-clock input to UTC (UTC+1)", () => {
    expect(fromLagosInput("2026-10-01T09:00")).toBe("2026-10-01T08:00:00.000Z");
  });
  it("round-trips", () => {
    const iso = "2026-10-01T08:30:00.000Z";
    expect(fromLagosInput(toLagosInput(iso))).toBe(iso);
  });
  it("rolls the Lagos date forward at 23:00 UTC", () => {
    const w = toLagosWall("2026-10-01T23:30:00Z");
    expect([w.getDate(), w.getHours()]).toEqual([2, 0]);
  });
});
