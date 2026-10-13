"use client";

import { ChevronDown, MoreHorizontal, Pencil, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScriptureBadge, SermonStatusBadge } from "@/components/shared/badges";
import { ContentCard } from "@/components/shared/cards";
import { PageHeader } from "@/components/shared/page-header";
import { ProcessingStepper } from "@/components/shared/processing-stepper";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContentTable } from "@/features/content/content-table";
import { useContentList } from "@/features/content/queries";
import { statusGroup } from "@/services/sermon.service";
import { ApiError } from "@/services/api-client";
import type { IntelligenceCategory, Sermon, TranscriptSegment } from "@/types";
import { cn } from "@/utils/cn";
import { formatDate, formatTimestamp } from "@/utils/format";
import { EditSermonDialog } from "./edit-sermon-dialog";
import { GenerateWeekDialog } from "./generate-week-dialog";
import { useDeleteSermon, useIntelligence, useProcessing, useRetryProcessing, useSermon, useTranscript } from "./queries";

const CATEGORIES: { key: IntelligenceCategory; label: string }[] = [
  { key: "themes", label: "Themes" },
  { key: "keyPoints", label: "Key points" },
  { key: "quotes", label: "Quotes" },
  { key: "stories", label: "Stories" },
  { key: "applications", label: "Applications" },
  { key: "prayers", label: "Prayers" },
  { key: "questions", label: "Discussion questions" },
];

function ProcessingView({ sermon }: { sermon: Sermon }) {
  const processing = useProcessing(sermon.id);
  const retry = useRetryProcessing(sermon.id);
  const state = processing.data;
  const failedStep = state?.steps.find((s) => s.status === "failed");

  return (
    <div className="mx-auto max-w-lg">
      <ContentCard
        title={state?.status === "FAILED" ? "Processing failed" : "Processing your sermon"}
        description={state?.status === "FAILED" ? undefined : "This usually takes a few minutes. You can leave this page — we'll keep working."}
        bodyClassName="p-5"
      >
        {processing.isError ? (
          <ErrorState error={processing.error} onRetry={() => processing.refetch()} className="py-6" />
        ) : !state ? (
          <LoadingState label="Checking progress…" className="py-8" />
        ) : (
          <>
            <ProcessingStepper steps={state.steps} />
            {state.status === "FAILED" && (
              <div role="alert" className="mt-5 rounded-md border border-danger/20 bg-danger-soft p-3 text-[13px]">
                <p className="font-medium text-danger">Failed at: {failedStep?.label ?? "processing"}</p>
                <p className="mt-0.5 text-foreground/80">{state.error}</p>
                {state.canRetry && (
                  <Button size="sm" variant="outline" className="mt-3 bg-card" loading={retry.isPending} onClick={() => retry.mutate()}>
                    Retry processing
                  </Button>
                )}
                {retry.error && (
                  <p className="mt-2 text-xs text-danger">{retry.error instanceof ApiError ? retry.error.message : "Retry failed."}</p>
                )}
              </div>
            )}
          </>
        )}
      </ContentCard>
    </div>
  );
}

function TranscriptView({ id, highlight }: { id: string; highlight?: string }) {
  const t = useTranscript(id, true);
  if (t.isPending) return <LoadingState label="Loading transcript…" />;
  if (t.isError) return <ErrorState error={t.error} onRetry={() => t.refetch()} />;
  if (!t.data.length) return <EmptyState title="No transcript available." />;
  return (
    <div className="divide-y divide-border rounded-lg border border-border bg-card">
      {t.data.map((seg) => (
        <div key={seg.id} id={seg.id} className={cn("flex gap-4 p-4", highlight === seg.id && "bg-accent-soft/50")}>
          <span className="w-12 shrink-0 pt-0.5 font-mono text-xs text-muted-foreground">{formatTimestamp(seg.startTimeMs)}</span>
          <p className="leading-relaxed">{seg.text}</p>
        </div>
      ))}
    </div>
  );
}

function IntelligenceView({ id }: { id: string }) {
  const intel = useIntelligence(id, true);
  const transcript = useTranscript(id, true);
  const [open, setOpen] = useState<string | null>(null);
  if (intel.isPending) return <LoadingState label="Loading intelligence…" />;
  if (intel.isError) return <ErrorState error={intel.error} onRetry={() => intel.refetch()} />;
  const segs = new Map<string, TranscriptSegment>((transcript.data ?? []).map((s) => [s.id, s]));

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {CATEGORIES.map(({ key, label }) => {
        const items = intel.data[key];
        return (
          <ContentCard key={key} title={label} className={key === "themes" ? "md:col-span-2" : undefined}>
            {items.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Nothing found for this category.</p>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((item) => {
                  const seg = item.sourceSegmentId ? segs.get(item.sourceSegmentId) : undefined;
                  const expanded = open === item.id;
                  return (
                    <li key={item.id}>
                      {seg ? (
                        <button
                          onClick={() => setOpen(expanded ? null : item.id)}
                          aria-expanded={expanded}
                          className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-muted/40"
                        >
                          <span>{item.text}</span>
                          <ChevronDown className={cn("mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")} aria-hidden />
                        </button>
                      ) : (
                        <p className="px-4 py-3 text-sm">{item.text}</p>
                      )}
                      {expanded && seg && (
                        <div className="border-t border-border bg-muted/40 px-4 py-3 text-[13px]">
                          <p className="mb-1 font-mono text-xs text-muted-foreground">Transcript · {formatTimestamp(seg.startTimeMs)}</p>
                          <p className="leading-relaxed">{seg.text}</p>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </ContentCard>
        );
      })}
    </div>
  );
}

function OverviewView({ sermon, onGenerate }: { sermon: Sermon; onGenerate: () => void }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="space-y-5">
        <ContentCard title="Summary" bodyClassName="p-4">
          <p className="leading-relaxed">{sermon.summary ?? "No summary available yet."}</p>
          {sermon.mainTheme && (
            <p className="mt-4 text-[13px]">
              <span className="text-muted-foreground">Main theme: </span>
              <span className="font-medium">{sermon.mainTheme}</span>
            </p>
          )}
        </ContentCard>
        <ContentCard title="Scripture references" bodyClassName="flex flex-wrap gap-2 p-4">
          {sermon.scriptures.length ? sermon.scriptures.map((s) => <ScriptureBadge key={s} reference={s} />) : <p className="text-sm text-muted-foreground">None detected.</p>}
        </ContentCard>
      </div>
      <div className="space-y-5">
        <ContentCard title="Details" bodyClassName="p-4">
          <dl className="space-y-3 text-[13px]">
            {(
              [
                ["Speaker", sermon.speaker],
                ["Date", formatDate(sermon.sermonDate, "EEEE, MMM d, yyyy")],
                ["Series", sermon.series || "—"],
                ["Main scripture", sermon.mainScripture || "—"],
                ["Tags", sermon.tags.join(", ") || "—"],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </ContentCard>
        <div className="rounded-lg border border-accent/20 bg-accent-soft p-4">
          <p className="font-serif text-lg">Ready to continue the conversation?</p>
          <p className="mt-1 text-[13px] text-foreground/70">Create a week of devotionals, posts and prayers from this message.</p>
          <Button className="mt-4" onClick={onGenerate}>
            <Sparkles /> Generate My Week
          </Button>
        </div>
      </div>
    </div>
  );
}

function GeneratedView({ sermonId, onGenerate }: { sermonId: string; onGenerate: () => void }) {
  const [page, setPage] = useState(1);
  const query = useContentList({ sermonId, page, pageSize: 10 });
  return (
    <div className="rounded-lg border border-border bg-card">
      <ContentTable
        query={query}
        page={page}
        onPageChange={setPage}
        emptyAction={
          <Button onClick={onGenerate}>
            <Sparkles /> Generate My Week
          </Button>
        }
      />
    </div>
  );
}

export function SermonDetail({ id }: { id: string }) {
  const sermon = useSermon(id);
  const router = useRouter();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(useSearchParams().get("edit") === "1");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const del = useDeleteSermon();

  if (sermon.isPending) return <LoadingState label="Loading sermon…" />;
  if (sermon.isError) {
    const notFound = sermon.error instanceof ApiError && sermon.error.status === 404;
    return notFound ? (
      <EmptyState title="Sermon not found." description="It may have been removed." action={<Button asChild variant="outline"><Link href="/sermons">Back to sermons</Link></Button>} />
    ) : (
      <ErrorState error={sermon.error} onRetry={() => sermon.refetch()} />
    );
  }
  const s = sermon.data;
  const ready = s.status === "READY";
  const processing = statusGroup(s.status) === "PROCESSING" || s.status === "FAILED";

  return (
    <>
      <PageHeader
        title={s.title}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {s.speaker} · {formatDate(s.sermonDate, "MMM d, yyyy")} <SermonStatusBadge status={s.status} />
          </span>
        }
        actions={
          <>
            {ready && (
              <Button onClick={() => setGenerateOpen(true)}>
                <Sparkles /> Generate My Week
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="More actions"><MoreHorizontal /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => setEditOpen(true)}><Pencil /> Edit details</DropdownMenuItem>
                <DropdownMenuItem destructive onSelect={() => setDeleteOpen(true)}><Trash2 /> Delete sermon</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />
      {!ready && processing ? (
        <ProcessingView sermon={s} />
      ) : !ready ? (
        <EmptyState title="This sermon is archived." description="Restore it from your library to use it again." />
      ) : (
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
            <TabsTrigger value="content">Generated Content</TabsTrigger>
          </TabsList>
          <TabsContent value="overview"><OverviewView sermon={s} onGenerate={() => setGenerateOpen(true)} /></TabsContent>
          <TabsContent value="transcript"><TranscriptView id={id} /></TabsContent>
          <TabsContent value="intelligence"><IntelligenceView id={id} /></TabsContent>
          <TabsContent value="content"><GeneratedView sermonId={id} onGenerate={() => setGenerateOpen(true)} /></TabsContent>
        </Tabs>
      )}
      <GenerateWeekDialog sermonId={s.id} sermonTitle={s.title} open={generateOpen} onOpenChange={setGenerateOpen} />
      <EditSermonDialog key={s.id + s.title + s.speaker + s.sermonDate} sermon={s} open={editOpen} onOpenChange={setEditOpen} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this sermon?"
        description={`“${s.title}” and all content generated from it will be permanently removed.`}
        loading={del.isPending}
        onConfirm={() =>
          del.mutate(s.id, {
            onSuccess: () => {
              toast.success("Sermon deleted");
              router.replace("/sermons");
            },
            onError: (e) => toast.error(e instanceof ApiError ? e.message : "Couldn't delete the sermon."),
          })
        }
      />
    </>
  );
}
