import { Quote, Sparkles } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { ContentSource } from "@/types";
import { formatTimestamp } from "@/utils/format";
import { ScriptureBadge } from "./badges";

/** Shows where generated content came from — and whether the excerpt is the pastor's own words. */
export function SourceReference({ source }: { source: ContentSource }) {
  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Source sermon</p>
        <Link href={`/sermons/${source.sermonId}`} className="mt-1 block font-medium hover:text-accent hover:underline">
          {source.sermonTitle}
        </Link>
      </div>

      {source.segments.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Relevant transcript {source.segments.length > 1 ? "segments" : "segment"}</p>
          <div className="mt-1.5 space-y-2">
            {source.segments.map((seg) => (
              <blockquote key={seg.id} className="rounded-md border border-border bg-muted/50 p-3 leading-relaxed">
                <span className="mb-1 block font-mono text-xs text-muted-foreground">
                  {formatTimestamp(seg.startTimeMs)}–{formatTimestamp(seg.endTimeMs)}
                </span>
                {seg.text}
              </blockquote>
            ))}
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            {source.verbatim ? (
              <>
                <Quote className="size-3" aria-hidden /> Direct words from the sermon transcript
              </>
            ) : (
              <>
                <Sparkles className="size-3" aria-hidden /> AI interpretation of this passage — not a direct quote
              </>
            )}
          </p>
        </div>
      )}

      {source.scriptures.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Referenced scriptures</p>
          <div className="flex flex-wrap gap-1.5">
            {source.scriptures.map((s) => (
              <ScriptureBadge key={s} reference={s} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function GeneratedLabel() {
  return (
    <Badge tone="accent">
      <Sparkles className="size-3" aria-hidden />
      AI-generated draft
    </Badge>
  );
}
