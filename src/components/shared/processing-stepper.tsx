import { Check, Loader2, X } from "lucide-react";
import type { ProcessingStep } from "@/types";
import { cn } from "@/utils/cn";

const label: Record<ProcessingStep["status"], string> = {
  complete: "Complete",
  active: "In progress",
  pending: "Waiting",
  failed: "Failed",
};

export function ProcessingStepper({ steps }: { steps: ProcessingStep[] }) {
  return (
    <ol className="space-y-0" aria-label="Processing progress">
      {steps.map((s, i) => (
        <li key={s.key} className="relative flex gap-3 pb-5 last:pb-0" aria-current={s.status === "active" ? "step" : undefined}>
          {i < steps.length - 1 && (
            <span
              aria-hidden
              className={cn("absolute left-[11px] top-6 h-[calc(100%-1.5rem)] w-px", s.status === "complete" ? "bg-accent/40" : "bg-border")}
            />
          )}
          <span
            className={cn(
              "z-10 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs",
              s.status === "complete" && "border-accent bg-accent text-white",
              s.status === "active" && "border-accent bg-accent-soft text-accent",
              s.status === "failed" && "border-danger bg-danger-soft text-danger",
              s.status === "pending" && "border-border-strong bg-card text-muted-foreground",
            )}
          >
            {s.status === "complete" && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
            {s.status === "active" && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
            {s.status === "failed" && <X className="size-3.5" strokeWidth={3} aria-hidden />}
            {s.status === "pending" && <span className="size-1.5 rounded-full bg-border-strong" />}
          </span>
          <div className="flex flex-1 items-baseline justify-between gap-3 pt-0.5">
            <span className={cn("text-sm", s.status === "pending" ? "text-muted-foreground" : "font-medium")}>{s.label}</span>
            <span className="text-xs text-muted-foreground">{label[s.status]}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
