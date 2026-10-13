import { BookMarked, CheckCircle2, CircleAlert, CircleDashed, Clock, Loader2, Send, Archive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CONTENT_STATUS_META, CONTENT_TYPE_META } from "@/constants/content";
import { statusGroup } from "@/services/sermon.service";
import type { ContentStatus, ContentType, SermonStatus } from "@/types";

const statusIcon: Record<ContentStatus, React.ReactNode> = {
  DRAFT: <CircleDashed className="size-3" aria-hidden />,
  APPROVED: <CheckCircle2 className="size-3" aria-hidden />,
  SCHEDULED: <Clock className="size-3" aria-hidden />,
  PUBLISHED: <Send className="size-3" aria-hidden />,
  FAILED: <CircleAlert className="size-3" aria-hidden />,
  ARCHIVED: <Archive className="size-3" aria-hidden />,
};

/** Icon + label, so status never depends on color alone. */
export function StatusBadge({ status }: { status: ContentStatus }) {
  const m = CONTENT_STATUS_META[status];
  return (
    <Badge tone={m.tone}>
      {statusIcon[status]}
      {m.label}
    </Badge>
  );
}

export function SermonStatusBadge({ status }: { status: SermonStatus }) {
  const group = statusGroup(status);
  if (group === "ARCHIVED")
    return (
      <Badge tone="muted">
        <Archive className="size-3" aria-hidden />
        Archived
      </Badge>
    );
  if (group === "READY")
    return (
      <Badge tone="success">
        <CheckCircle2 className="size-3" aria-hidden />
        Ready
      </Badge>
    );
  if (group === "FAILED")
    return (
      <Badge tone="danger">
        <CircleAlert className="size-3" aria-hidden />
        Failed
      </Badge>
    );
  return (
    <Badge tone="warning">
      <Loader2 className="size-3 animate-spin" aria-hidden />
      Processing
    </Badge>
  );
}

export function TypeBadge({ type }: { type: ContentType }) {
  const m = CONTENT_TYPE_META[type];
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px]">
      <span aria-hidden className="flex size-5 items-center justify-center rounded bg-muted text-[11px] text-muted-foreground">
        {m.glyph}
      </span>
      {m.short}
    </span>
  );
}

export function ScriptureBadge({ reference }: { reference: string }) {
  return (
    <Badge tone="neutral" className="font-normal">
      <BookMarked className="size-3 text-muted-foreground" aria-hidden />
      {reference}
    </Badge>
  );
}
