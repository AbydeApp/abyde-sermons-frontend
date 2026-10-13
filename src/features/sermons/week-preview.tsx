"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Loader2, Pencil } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/badges";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { CONTENT_TYPE_META, GENERATION_OPTIONS } from "@/constants/content";
import { useContentList } from "@/features/content/queries";
import { useState } from "react";
import { useGenerationJob, useSermon, useStartGeneration } from "./queries";

export function WeekPreview({ sermonId }: { sermonId: string }) {
  const params = useSearchParams();
  const generationId = params.get("generationId");
  const [retryId, setRetryId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const sermon = useSermon(sermonId);
  const job = useGenerationJob(sermonId, retryId ?? generationId);
  const retry = useStartGeneration(sermonId);
  const ready = !generationId || !!job.data?.done;
  const content = useContentList({ sermonId, generationId: generationId ?? undefined, page, pageSize: 50 }, ready);
  const retryContent = useContentList({ sermonId, generationId: retryId ?? undefined, page: 1, pageSize: 50 }, !!retryId && ready);
  const failed = job.data?.jobs.filter((item) => item.status === "FAILED") ?? [];

  return (
    <>
      <PageHeader title="Preview your week" description={sermon.data ? `Content created from “${sermon.data.title}”. Review each draft before approving or publishing.` : "Review your generated content."}
        actions={<Button asChild variant="outline"><Link href={`/content?sermonId=${encodeURIComponent(sermonId)}`}>View all content</Link></Button>} />
      <p className="mb-6 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">Your content is saved as drafts. Open any item to edit, approve, or schedule it.</p>
      {job.isError ? <ErrorState error={job.error} onRetry={() => job.refetch()} /> : !ready ? (
        <section className="rounded-lg border border-border bg-card p-5" aria-live="polite">
          <h2 className="mb-4 flex items-center gap-2 font-semibold"><Loader2 className="size-4 animate-spin text-accent" />Generating your week…</h2>
          <ul className="divide-y divide-border">{job.data?.jobs.map((item) => <li key={item.contentType} className="flex justify-between gap-3 py-3 text-sm"><span>{CONTENT_TYPE_META[item.contentType].label}</span><span className="flex items-center gap-2 text-muted-foreground">{item.status === "COMPLETED" && <Check className="size-4 text-success" />}{({ COMPLETED: "Ready", QUEUED: "Waiting", PROCESSING: "Writing…", RETRYING: "Retrying…", FAILED: "Failed" })[item.status]}</span></li>)}</ul>
        </section>
      ) : (
        <>
          {failed.length > 0 && <div role="alert" className="mb-5 rounded-lg bg-warning-soft p-4 text-sm"><p>Some content couldn’t be generated. You can review the completed drafts below.</p><Button className="mt-3" variant="outline" loading={retry.isPending} onClick={() => retry.mutate(failed.map((item) => item.contentType), { onSuccess: (next) => setRetryId(next.id) })}>Retry failed content</Button>{retry.isError && <p className="mt-2 text-danger">Couldn’t retry. Please try again.</p>}</div>}
          {content.isPending || (retryId && retryContent.isPending) ? <LoadingState label="Loading your drafts…" /> : content.isError ? <ErrorState error={content.error} onRetry={() => content.refetch()} /> : retryId && retryContent.isError ? <ErrorState error={retryContent.error} onRetry={() => retryContent.refetch()} /> : !content.data.items.length && !retryContent.data?.items.length ? <EmptyState title="No drafts to preview yet" description="Return to your sermon to generate content." action={<Button asChild><Link href={`/sermons/${encodeURIComponent(sermonId)}`}>Back to sermon</Link></Button>} /> : (
            <div className="space-y-8">
              {GENERATION_OPTIONS.map(({ type }) => {
                const items = [...content.data.items, ...(retryId ? retryContent.data?.items ?? [] : [])].filter((item) => item.type === type);
                if (!items.length) return null;
                return <section key={type}><h2 className="mb-3 text-lg font-semibold">{CONTENT_TYPE_META[type].label} <span className="text-sm font-normal text-muted-foreground">({items.length})</span></h2><div className="grid gap-4 md:grid-cols-2">{items.map((item) => <article key={item.id} className="flex flex-col rounded-lg border border-border bg-card p-5"><div className="mb-3 flex items-start justify-between gap-3"><h3 className="font-semibold">{item.title}</h3><StatusBadge status={item.status} /></div>{item.scripture && <p className="mb-3 text-sm text-accent">{item.scripture}</p>}<p className="mb-5 whitespace-pre-wrap text-sm leading-relaxed">{item.body}</p><Button asChild variant="outline" size="sm" className="mt-auto self-start"><Link href={`/content/${item.id}`}><Pencil />Open &amp; edit</Link></Button></article>)}</div></section>;
              })}
              <Pagination page={page} pageSize={content.data.pageSize} total={content.data.total} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </>
  );
}
