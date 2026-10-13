"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { CONTENT_TYPE_META } from "@/constants/content";
import { ApiError } from "@/services/api-client";
import type { SocialPost } from "@/types";
import { formatDateTime } from "@/utils/format";
import { LAGOS_LABEL, fromLagosInput, toLagosInput } from "@/utils/lagos";
import { usePostActions } from "./queries";
import { PlatformGlyph, PlatformResults, SocialStatusBadge } from "./status";
import { PLATFORMS } from "@/constants/brand";

const EDITABLE = ["DRAFT", "READY", "SCHEDULED"];

/** Details for a social post: caption, per-platform results, reschedule and retry. */
export function SocialPostDialog({ post, onOpenChange }: { post: SocialPost | null; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={!!post} onOpenChange={onOpenChange}>
      {post && <Body key={post.id + post.status + (post.scheduledAt ?? "")} post={post} onClose={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function Body({ post, onClose }: { post: SocialPost; onClose: () => void }) {
  const actions = usePostActions();
  const [when, setWhen] = useState(post.scheduledAt ? toLagosInput(post.scheduledAt) : "");
  const onError = (e: unknown) => toast.error(e instanceof ApiError ? e.message : "Something went wrong.");

  return (
    <DialogContent title={post.title} description={`${CONTENT_TYPE_META[post.contentType].label} · ${post.targets.map((t) => PLATFORMS[t.platform].label).join(", ")}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">{post.targets.map((t) => <PlatformGlyph key={t.connectionId} platform={t.platform} />)}</div>
          <SocialStatusBadge status={post.status} />
        </div>
        {post.thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- rendered media
          <img src={post.thumbnailUrl} alt="Rendered visual" className="mx-auto max-h-64 rounded-md border border-border" />
        )}
        <p className="whitespace-pre-line rounded-md bg-muted/60 p-3 text-sm">{post.caption}</p>
        <PlatformResults results={post.results} />
        {EDITABLE.includes(post.status) && (
          <Field label={post.scheduledAt ? "Scheduled time" : "Schedule for"} htmlFor="sp-when" hint={`Times are in ${LAGOS_LABEL}.`}>
            <Input id="sp-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </Field>
        )}
        {post.scheduledAt && !EDITABLE.includes(post.status) && <p className="text-xs text-muted-foreground">Scheduled for {formatDateTime(post.scheduledAt)}</p>}
      </div>
      <DialogFooter className="sm:justify-between">
        <Button asChild variant="ghost">
          <Link href={`/content/${post.contentId}`}>Open content</Link>
        </Button>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          {post.canRetry && (
            <Button variant="outline" loading={actions.retry.isPending} onClick={() => actions.retry.mutate(post.id, { onSuccess: () => toast.success("Retrying…"), onError })}>
              Retry
            </Button>
          )}
          {EDITABLE.includes(post.status) && (
            <Button
              disabled={!when}
              loading={actions.schedule.isPending}
              onClick={() => actions.schedule.mutate({ id: post.id, scheduledAt: fromLagosInput(when) }, { onSuccess: () => { toast.success("Schedule updated"); onClose(); }, onError })}
            >
              Save time
            </Button>
          )}
        </div>
      </DialogFooter>
    </DialogContent>
  );
}
