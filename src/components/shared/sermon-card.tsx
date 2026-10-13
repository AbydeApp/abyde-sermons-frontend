import { Sparkles } from "lucide-react";
import Link from "next/link";
import type { Sermon } from "@/types";
import { formatDate } from "@/utils/format";
import { ScriptureBadge, SermonStatusBadge } from "./badges";

export function SermonCard({ sermon }: { sermon: Sermon }) {
  return (
    <Link
      href={`/sermons/${sermon.id}`}
      className="group block rounded-lg border border-border bg-card p-4 transition-colors hover:border-border-strong hover:bg-muted/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-medium group-hover:text-accent">{sermon.title}</h3>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {sermon.speaker} · {formatDate(sermon.sermonDate, "MMM d, yyyy")}
          </p>
        </div>
        <SermonStatusBadge status={sermon.status} />
      </div>
      {sermon.mainScripture && (
        <div className="mt-3">
          <ScriptureBadge reference={sermon.mainScripture} />
        </div>
      )}
      {sermon.themes.length > 0 && (
        <p className="mt-3 line-clamp-1 text-xs text-muted-foreground">{sermon.themes.join(" · ")}</p>
      )}
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="size-3" aria-hidden />
        {sermon.contentCount} content {sermon.contentCount === 1 ? "piece" : "pieces"}
      </p>
    </Link>
  );
}
