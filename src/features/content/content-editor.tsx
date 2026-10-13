"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, BookOpen, CalendarClock, Check, History, ImageIcon, MoreHorizontal, Sparkles, Trash2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { StatusBadge, TypeBadge } from "@/components/shared/badges";
import { ContentCard } from "@/components/shared/cards";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { GeneratedLabel, SourceReference } from "@/components/shared/source-reference";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field, Input, Textarea, fieldA11y } from "@/components/ui/input";
import { categoryFor } from "@/constants/brand";
import { PublishPanel } from "@/features/social/publish-panel";
import { contentEditSchema, type ContentEditValues } from "@/schemas/content";
import { ApiError } from "@/services/api-client";
import type { RewriteAction } from "@/services/content.service";
import type { ContentItem, ContentVersion, VersionSource } from "@/types";
import { formatDateTime } from "@/utils/format";
import { LAGOS_LABEL, defaultScheduleInput, fromLagosInput, toLagosInput } from "@/utils/lagos";
import { useContentItem, useContentMutations, useContentVersions, useDeleteContent } from "./queries";

const AI_ACTIONS: { action: RewriteAction | "REGENERATE"; label: string }[] = [
  { action: "SHORTEN", label: "Shorten" },
  { action: "EXPAND", label: "Expand" },
  { action: "WARMER", label: "Make warmer" },
  { action: "CONVERSATIONAL", label: "Make more conversational" },
  { action: "ALTERNATIVE", label: "Create alternative" },
  { action: "REGENERATE", label: "Regenerate" },
];

const VERSION_LABEL: Record<VersionSource, string> = {
  AI_GENERATED: "AI generated",
  AI_REWRITE: "AI rewrite",
  USER_EDIT: "Your edit",
};

const errMsg = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);
const valuesOf = (i: ContentItem): ContentEditValues => ({ title: i.title, body: i.body, scripture: i.scripture ?? "" });

function VersionHistory({ item, locked, onRestore, restoring }: { item: ContentItem; locked: boolean; onRestore: (v: ContentVersion) => void; restoring: boolean }) {
  const [open, setOpen] = useState(false);
  const versions = useContentVersions(item.id, open);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" type="button">
          <History /> History
        </Button>
      </SheetTrigger>
      <SheetContent side="right" title="Version history" className="p-0">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">Version history</h2>
          <SheetClose asChild>
            <Button variant="ghost" size="sm">Close</Button>
          </SheetClose>
        </div>
        <div className="flex-1 overflow-y-auto">
          {versions.isPending ? (
            <LoadingState label="Loading history…" />
          ) : versions.isError ? (
            <ErrorState error={versions.error} onRetry={() => versions.refetch()} />
          ) : (
            <ul className="divide-y divide-border">
              {versions.data.map((v) => {
                const current = v.version === item.currentVersion;
                return (
                  <li key={v.version} className="space-y-2 px-5 py-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">Version {v.version}</p>
                      <div className="flex items-center gap-2">
                        <Badge tone={v.source === "USER_EDIT" ? "neutral" : "accent"}>{VERSION_LABEL[v.source]}</Badge>
                        {current && <Badge tone="success">Current</Badge>}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(v.createdAt)}
                      {v.aiModel ? ` · ${v.aiModel}` : ""}
                    </p>
                    <p className="line-clamp-3 whitespace-pre-line text-[13px] text-foreground/80">{v.body}</p>
                    {!current && !locked && (
                      <Button variant="outline" size="sm" loading={restoring} onClick={() => { onRestore(v); setOpen(false); }}>
                        <Undo2 /> Restore this version
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function EditorForm({ item }: { item: ContentItem }) {
  const m = useContentMutations(item.id);
  const [when, setWhen] = useState(() => (item.scheduledAt ? toLagosInput(item.scheduledAt) : defaultScheduleInput()));
  const [undoVersion, setUndoVersion] = useState<number | null>(null);
  const locked = item.status === "PUBLISHED" || item.status === "ARCHIVED";
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ContentEditValues>({ resolver: zodResolver(contentEditSchema), defaultValues: valuesOf(item) });

  const busy = m.save.isPending || m.approve.isPending || m.schedule.isPending || m.rewrite.isPending || m.regenerate.isPending || m.restore.isPending;
  const canSchedule = (item.status === "APPROVED" || item.status === "SCHEDULED") && !isDirty;
  const willDemote = item.status === "APPROVED" || item.status === "SCHEDULED";

  const saveDraft = handleSubmit((v) =>
    m.save.mutate(v, {
      onSuccess: (saved) => {
        reset(valuesOf(saved));
        setUndoVersion(null);
        toast.success("Draft saved");
      },
      onError: (e) => toast.error(errMsg(e, "Couldn't save.")),
    }),
  );

  const approve = handleSubmit(async (v) => {
    try {
      const current = isDirty ? await m.save.mutateAsync(v) : item;
      const approved = await m.approve.mutateAsync();
      reset(valuesOf(approved.id === current.id ? approved : current));
      setUndoVersion(null);
      toast.success("Approved");
    } catch (e) {
      toast.error(errMsg(e, "Couldn't approve."));
    }
  });

  function schedule() {
    m.schedule.mutate(
      { item, scheduledAt: fromLagosInput(when) },
      { onSuccess: () => toast.success("Scheduled"), onError: (e) => toast.error(errMsg(e, "Couldn't schedule.")) },
    );
  }

  function assist(action: RewriteAction | "REGENERATE") {
    const previous = item.currentVersion;
    const done = (updated: ContentItem) => {
      reset(valuesOf(updated));
      setUndoVersion(previous);
    };
    const onError = (e: unknown) => toast.error(errMsg(e, "The AI helper is unavailable right now."));
    if (action === "REGENERATE") m.regenerate.mutate(undefined, { onSuccess: done, onError });
    else m.rewrite.mutate(action, { onSuccess: done, onError });
  }

  function restore(version: number) {
    m.restore.mutate(version, {
      onSuccess: (updated) => {
        reset(valuesOf(updated));
        setUndoVersion(null);
        toast.success(`Restored version ${version}`);
      },
      onError: (e) => toast.error(errMsg(e, "Couldn't restore.")),
    });
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-5" noValidate>
      <ContentCard bodyClassName="space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <TypeBadge type={item.type} />
          <StatusBadge status={item.status} />
          <GeneratedLabel />
          <span className="text-xs text-muted-foreground">Version {item.currentVersion}</span>
          {item.scheduledAt && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarClock className="size-3.5" aria-hidden /> {formatDateTime(item.scheduledAt)}
            </span>
          )}
        </div>
        <Field label="Title" htmlFor="title" error={errors.title?.message}>
          <Input disabled={locked} {...fieldA11y("title", errors.title?.message)} {...register("title")} />
        </Field>
        <Field label="Content" htmlFor="body" error={errors.body?.message}>
          <Textarea disabled={locked} className="min-h-72 font-[inherit]" {...fieldA11y("body", errors.body?.message)} {...register("body")} />
        </Field>
        <Field label="Scripture" htmlFor="scripture" optional>
          <Input disabled={locked} placeholder="e.g. 2 Corinthians 5:7" {...fieldA11y("scripture")} {...register("scripture")} />
        </Field>
      </ContentCard>

      {!locked && (
        <ContentCard
          title="AI helper"
          description={isDirty ? "Save your changes first — suggestions are applied to the saved version." : "Each suggestion is saved as a new version you can undo."}
          bodyClassName="p-4"
        >
          <div className="flex flex-wrap gap-2">
            {AI_ACTIONS.map((a) => (
              <Button key={a.action} type="button" variant="outline" size="sm" disabled={busy || isDirty} onClick={() => assist(a.action)}>
                <Sparkles /> {a.label}
              </Button>
            ))}
          </div>
          {undoVersion !== null && (
            <Button type="button" variant="link" className="mt-3 text-[13px]" onClick={() => restore(undoVersion)}>
              <Undo2 /> Undo last suggestion
            </Button>
          )}
        </ContentCard>
      )}

      <ContentCard title="Schedule" description={`Times are in ${LAGOS_LABEL}.`} bodyClassName="space-y-3 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Publish at" htmlFor="when" className="sm:w-64">
            <Input id="when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} disabled={locked || !canSchedule} />
          </Field>
          {item.status === "SCHEDULED" && item.calendarItemId && (
            <Button
              type="button"
              variant="ghost"
              loading={m.unschedule.isPending}
              onClick={() => m.unschedule.mutate(item.calendarItemId!, { onSuccess: () => toast.success("Unscheduled") })}
            >
              Unschedule
            </Button>
          )}
        </div>
        {!locked && !canSchedule && (
          <p className="text-xs text-muted-foreground">
            {isDirty ? "Save your changes and approve this content to schedule it." : "Approve this content to schedule it."}
          </p>
        )}
        {!locked && willDemote && (
          <p className="text-xs text-muted-foreground">Editing approved or scheduled content returns it to Draft and removes it from the calendar.</p>
        )}
      </ContentCard>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
        <div className="mr-auto">
          <VersionHistory item={item} locked={locked} onRestore={(v) => restore(v.version)} restoring={m.restore.isPending} />
        </div>
        {!locked && (
          <>
            <Button type="button" variant="outline" onClick={saveDraft} disabled={busy || !isDirty} loading={m.save.isPending && !m.approve.isPending}>
              Save Draft
            </Button>
            <Button type="button" variant="dark" onClick={approve} disabled={busy || (item.status === "APPROVED" && !isDirty) || item.status === "SCHEDULED" && !isDirty} loading={m.approve.isPending}>
              <Check /> Approve
            </Button>
            <Button type="button" onClick={schedule} disabled={busy || !canSchedule || !when} loading={m.schedule.isPending}>
              <CalendarClock /> {item.status === "SCHEDULED" ? "Reschedule" : "Schedule"}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}

export function ContentEditor({ id }: { id: string }) {
  const router = useRouter();
  const query = useContentItem(id);
  const del = useDeleteContent();
  const [confirm, setConfirm] = useState(false);

  if (query.isPending) return <LoadingState label="Loading content…" />;
  if (query.isError) {
    return query.error instanceof ApiError && query.error.status === 404 ? (
      <EmptyState title="Content not found." action={<Button asChild variant="outline"><Link href="/content">Back to content</Link></Button>} />
    ) : (
      <ErrorState error={query.error} onRetry={() => query.refetch()} />
    );
  }
  const item = query.data;
  const canVisual = categoryFor(item.type, { carousel: !!item.structured?.carousel, hasScripture: !!item.scripture }) !== null;

  return (
    <>
      <Link href="/content" className="mb-3 inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" aria-hidden /> All content
      </Link>
      <PageHeader
        title={item.title}
        actions={
          <>
            {canVisual && (
              <Button asChild>
                <Link href={`/content/${item.id}/visual`}>
                  <ImageIcon /> Create Visual
                </Link>
              </Button>
            )}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden">
                  <BookOpen /> Source
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" title="Source" className="p-5">
                <h2 className="mb-3 text-sm font-semibold">Source</h2>
                <div className="overflow-y-auto">
                  <SourceReference source={item.source} />
                </div>
              </SheetContent>
            </Sheet>
            {item.status !== "PUBLISHED" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="More actions"><MoreHorizontal /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem destructive onSelect={() => setConfirm(true)}><Trash2 /> Delete content</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-5">
          <EditorForm item={item} />
          {canVisual && <PublishPanel key={item.id} content={item} />}
        </div>
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <ContentCard title="Source" bodyClassName="p-4">
              <SourceReference source={item.source} />
            </ContentCard>
          </div>
        </aside>
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete this content?"
        description="It will be removed permanently, including its version history and any scheduled time."
        loading={del.isPending}
        onConfirm={() =>
          del.mutate(item.id, {
            onSuccess: () => {
              toast.success("Content deleted");
              router.replace("/content");
            },
            onError: (e) => toast.error(errMsg(e, "Couldn't delete.")),
          })
        }
      />
    </>
  );
}
