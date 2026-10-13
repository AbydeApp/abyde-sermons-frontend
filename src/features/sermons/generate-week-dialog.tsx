"use client";

import { AlertCircle, Check, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { CONTENT_TYPE_META, GENERATION_OPTIONS } from "@/constants/content";
import { ApiError } from "@/services/api-client";
import type { ContentType, GenerationJobState } from "@/types";
import { useGenerationJob, useStartGeneration } from "./queries";

const ALL = GENERATION_OPTIONS.map((o) => o.type);

function TypeRow({ s }: { s: GenerationJobState }) {
  const label = GENERATION_OPTIONS.find((o) => o.type === s.contentType)?.label ?? CONTENT_TYPE_META[s.contentType].label;
  return (
    <li className="flex items-center gap-3 py-2.5 text-sm">
      <span className="flex size-5 shrink-0 items-center justify-center">
        {s.status === "COMPLETED" && <Check className="size-4 text-success" aria-hidden />}
        {(s.status === "PROCESSING" || s.status === "RETRYING") && <Loader2 className="size-4 animate-spin text-accent" aria-hidden />}
        {s.status === "QUEUED" && <span className="size-2 rounded-full bg-border-strong" aria-hidden />}
        {s.status === "FAILED" && <AlertCircle className="size-4 text-danger" aria-hidden />}
      </span>
      <span className="flex-1">{label}</span>
      <span className={s.status === "FAILED" ? "text-xs text-danger" : "text-xs text-muted-foreground"}>
        {{ QUEUED: "Waiting", PROCESSING: "Writing…", RETRYING: "Retrying…", COMPLETED: "Done", FAILED: s.errorMessage ?? "Failed — retry available" }[s.status]}
      </span>
    </li>
  );
}

export function GenerateWeekDialog({
  sermonId,
  sermonTitle,
  open,
  onOpenChange,
}: {
  sermonId: string;
  sermonTitle: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<ContentType>>(new Set(ALL));
  const [jobId, setJobId] = useState<string | null>(null);
  const start = useStartGeneration(sermonId);
  const job = useGenerationJob(sermonId, jobId);
  const failed = job.data?.jobs.filter((t) => t.status === "FAILED") ?? [];

  function toggle(t: ContentType, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(t);
      else next.delete(t);
      return next;
    });
  }

  function begin(types: ContentType[]) {
    start.mutate(types, {
      onSuccess: (j) => {
        setJobId(j.id);
        onOpenChange(false);
        router.push(`/sermons/${encodeURIComponent(sermonId)}/preview?generationId=${encodeURIComponent(j.id)}`);
      },
      onError: (e) => toast.error(e instanceof ApiError ? e.message : "Couldn't start generation."),
    });
  }

  function close(o: boolean) {
    onOpenChange(o);
    if (!o) setTimeout(() => setJobId(null), 200);
  }

  const running = !!jobId;
  const types = job.data?.jobs;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        title={running ? (job.data?.done ? "Your week is ready" : "Generating your week…") : "Generate My Week"}
        description={running ? sermonTitle : `Choose what to create from “${sermonTitle}”.`}
      >
        {!running ? (
          <>
            <ul className="space-y-1">
              {GENERATION_OPTIONS.map((o) => (
                <li key={o.type}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-muted">
                    <Checkbox className="mt-0.5" checked={selected.has(o.type)} onCheckedChange={(c) => toggle(o.type, c === true)} />
                    <span>
                      <span className="block text-sm font-medium">{o.label}</span>
                      <span className="block text-xs text-muted-foreground">{o.hint}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">Everything is created as a draft. You review and approve before anything is published.</p>
            <DialogFooter>
              <Button variant="ghost" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button onClick={() => begin([...selected])} disabled={selected.size === 0} loading={start.isPending}>
                <Sparkles /> Generate My Week
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {job.isError && <p role="alert" className="mb-2 text-sm text-danger">We lost track of this job. Check the Content page for your drafts.</p>}
            <ul className="divide-y divide-border" aria-live="polite">
              {(types ?? []).map((t) => (
                <TypeRow key={t.contentType} s={t} />
              ))}
              {!types && <li className="py-6 text-center text-sm text-muted-foreground">Starting…</li>}
            </ul>
            {failed.length > 0 && (
              <p className="mt-3 rounded-md bg-warning-soft px-3 py-2 text-[13px] text-warning">
                {failed.length} of {types?.length} content types didn&apos;t finish. The rest are ready.
              </p>
            )}
            <DialogFooter>
              {failed.length > 0 && job.data?.done && (
                <Button variant="outline" onClick={() => begin(failed.map((f) => f.contentType))} loading={start.isPending}>
                  Retry failed
                </Button>
              )}
              {job.data?.done ? (
                <Button asChild>
                  <Link href={`/content?sermonId=${sermonId}`}>View content</Link>
                </Button>
              ) : (
                <Button variant="ghost" onClick={() => close(false)}>
                  Run in background
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
