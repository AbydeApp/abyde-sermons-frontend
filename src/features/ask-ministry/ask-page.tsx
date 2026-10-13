"use client";

import { ArrowUp, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsk } from "@/features/library/queries";
import type { AskAnswer } from "@/types";
import { formatTimestamp } from "@/utils/format";

const SUGGESTIONS = [
  "What have we taught about forgiveness?",
  "Show me sermons about fear.",
  "What have we said about trusting God in difficult seasons?",
];

export function AskPage() {
  const [q, setQ] = useState("");
  const [history, setHistory] = useState<AskAnswer[]>([]);
  const ask = useAsk();
  const bottom = useRef<HTMLDivElement>(null);

  function submit(question: string) {
    const text = question.trim();
    if (!text || ask.isPending) return;
    setQ("");
    ask.mutate(text, {
      onSuccess: (a) => {
        setHistory((h) => [...h, a]);
        setTimeout(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), 50);
      },
    });
  }

  const empty = history.length === 0 && !ask.isPending && !ask.isError;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Ask Abyde Sermon" description="Answers come from your own sermon archive — with sources shown." />

      {empty && (
        <div className="py-10 text-center">
          <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent">
            <MessageSquareText className="size-5" aria-hidden />
          </div>
          <p className="font-serif text-3xl tracking-tight">What would you like to know?</p>
          <div className="mt-6 flex flex-col items-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => submit(s)} className="rounded-full border border-border-strong bg-card px-4 py-2 text-[13px] hover:border-accent hover:text-accent">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-8" aria-live="polite">
        {history.map((a) => (
          <div key={a.id} className="space-y-3">
            <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-foreground px-4 py-2 text-sm text-background">{a.question}</p>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="leading-relaxed">{a.answer}</p>
              {a.sources.length > 0 && (
                <div className="mt-4 border-t border-border pt-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Sources</p>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {a.sources.map((s) => (
                      <li key={`${s.sermonId}-${s.segmentId ?? s.startTimeMs}`}>
                        <Link href={`/sermons/${s.sermonId}`} className="block rounded-md border border-border bg-muted/40 p-3 text-[13px] hover:border-border-strong">
                          <span className="flex items-center justify-between gap-2 font-medium">
                            <span className="truncate">{s.sermonTitle}</span>
                            {s.startTimeMs !== undefined && <span className="font-mono text-xs text-muted-foreground">{formatTimestamp(s.startTimeMs)}</span>}
                          </span>
                          <span className="mt-1 line-clamp-3 text-muted-foreground">{s.excerpt}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {a.sources.length === 0 && <p className="mt-3 text-xs text-muted-foreground">No sermon sources matched this question.</p>}
            </div>
          </div>
        ))}
        {ask.isPending && (
          <div className="space-y-2 rounded-lg border border-border bg-card p-4" role="status" aria-label="Searching your sermons">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}
        {ask.isError && <ErrorState error={ask.error} onRetry={() => ask.variables && submit(ask.variables)} className="py-6" />}
        <div ref={bottom} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); submit(q); }}
        className="sticky bottom-4 mt-6 flex items-center gap-2 rounded-xl border border-border-strong bg-card p-2 shadow-sm"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask your ministry..."
          aria-label="Ask your ministry"
          className="h-10 min-w-0 flex-1 bg-transparent px-3 text-[15px] outline-none placeholder:text-muted-foreground/70"
        />
        <Button type="submit" size="icon" disabled={!q.trim() || ask.isPending} aria-label="Send question"><ArrowUp /></Button>
      </form>
    </div>
  );
}
