import { Check, CircleAlert, CircleDashed, Clock, Loader2, Send, SlidersHorizontal } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { PLATFORMS } from "@/constants/brand";
import type { PlatformResult, SocialPlatform, SocialPostStatus } from "@/types";
import { cn } from "@/utils/cn";

const META: Record<SocialPostStatus, { label: string; tone: BadgeTone; icon: React.ReactNode }> = {
  DRAFT: { label: "Draft", tone: "neutral", icon: <CircleDashed className="size-3" aria-hidden /> },
  RENDERING: { label: "Rendering", tone: "warning", icon: <Loader2 className="size-3 animate-spin" aria-hidden /> },
  READY: { label: "Ready", tone: "info", icon: <Check className="size-3" aria-hidden /> },
  SCHEDULED: { label: "Scheduled", tone: "accent", icon: <Clock className="size-3" aria-hidden /> },
  QUEUED: { label: "Queued", tone: "accent", icon: <Clock className="size-3" aria-hidden /> },
  PUBLISHING: { label: "Publishing", tone: "warning", icon: <Loader2 className="size-3 animate-spin" aria-hidden /> },
  PUBLISHED: { label: "Published", tone: "success", icon: <Send className="size-3" aria-hidden /> },
  PARTIALLY_PUBLISHED: { label: "Partly published", tone: "warning", icon: <SlidersHorizontal className="size-3" aria-hidden /> },
  FAILED: { label: "Failed", tone: "danger", icon: <CircleAlert className="size-3" aria-hidden /> },
};

/** Icon + label so status never depends on color alone. */
export function SocialStatusBadge({ status }: { status: SocialPostStatus }) {
  const m = META[status];
  return (
    <Badge tone={m.tone}>
      {m.icon}
      {m.label}
    </Badge>
  );
}

export function PlatformGlyph({ platform, className }: { platform: SocialPlatform; className?: string }) {
  return (
    <span aria-hidden className={cn("inline-flex size-5 shrink-0 items-center justify-center rounded bg-foreground text-[9px] font-bold uppercase text-background", className)}>
      {PLATFORMS[platform].glyph}
    </span>
  );
}

export function PlatformResults({ results }: { results: PlatformResult[] }) {
  if (!results.length) return null;
  return (
    <ul className="divide-y divide-border rounded-md border border-border" aria-label="Per-platform results">
      {results.map((r) => (
        <li key={r.platform} className="flex items-center gap-3 px-3 py-2 text-[13px]">
          <PlatformGlyph platform={r.platform} />
          <span className="w-20 shrink-0 font-medium">{PLATFORMS[r.platform].label}</span>
          {r.status === "PUBLISHED" ? (
            <span className="flex items-center gap-1 text-success"><Check className="size-3.5" aria-hidden /> Published</span>
          ) : r.status === "FAILED" ? (
            <span className="flex items-center gap-1 text-danger"><CircleAlert className="size-3.5" aria-hidden /> Failed — {r.message ?? "something went wrong"}</span>
          ) : (
            <span className="text-muted-foreground">Pending</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Generated → Ready → Scheduled → Published, so the stage is always unambiguous. */
export function PublishProgress({ status, visualReady }: { status?: SocialPostStatus; visualReady: boolean }) {
  const steps = ["Generated", "Ready", "Scheduled", "Published"];
  let current = visualReady ? 1 : 0;
  if (status === "READY") current = 1;
  if (status === "SCHEDULED" || status === "QUEUED" || status === "PUBLISHING") current = 2;
  if (status === "PUBLISHED" || status === "PARTIALLY_PUBLISHED") current = 3;
  const failed = status === "FAILED";
  return (
    <ol className="flex items-center gap-1.5 text-xs" aria-label="Publishing progress">
      {steps.map((s, i) => (
        <li key={s} aria-current={i === current ? "step" : undefined} className="flex items-center gap-1.5">
          <span className={cn("rounded-full border px-2 py-0.5", i < current && "border-success/30 bg-success-soft text-success", i === current && (failed ? "border-danger/30 bg-danger-soft text-danger" : "border-accent/30 bg-accent-soft text-accent"), i > current && "border-border text-muted-foreground")}>
            {i === current && failed ? "Failed" : s}
          </span>
          {i < steps.length - 1 && <span aria-hidden className="h-px w-3 bg-border-strong" />}
        </li>
      ))}
    </ol>
  );
}
