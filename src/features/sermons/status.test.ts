import { describe, expect, it } from "vitest";
import { buildProcessingState, statusParam } from "@/services/sermon.service";

const base = { sermonId: "s1", failedStage: null, errorMessage: null, canRetry: false };

describe("processing state", () => {
  it("marks earlier stages complete and the current one active", () => {
    const s = buildProcessingState({ ...base, status: "TRANSCRIBING", processingStage: "TRANSCRIBE" });
    expect(s.steps.map((x) => x.status)).toEqual(["complete", "complete", "active", "pending", "pending", "pending", "pending"]);
  });
  it("shows the failed stage and keeps later ones pending", () => {
    const s = buildProcessingState({ ...base, status: "FAILED", processingStage: null, failedStage: "TRANSCRIBE", errorMessage: "bad audio", canRetry: true });
    expect(s.steps[2].status).toBe("failed");
    expect(s.steps[3].status).toBe("pending");
    expect(s.canRetry).toBe(true);
  });
  it("completes everything when READY", () => {
    const s = buildProcessingState({ ...base, status: "READY", processingStage: null });
    expect(s.steps.every((x) => x.status === "complete")).toBe(true);
  });
  it("maps the Processing tab to a comma-separated status list", () => {
    expect(statusParam("PROCESSING")).toContain("TRANSCRIBING,ANALYZING");
    expect(statusParam("READY")).toBe("READY");
    expect(statusParam()).toBeUndefined();
  });
});
