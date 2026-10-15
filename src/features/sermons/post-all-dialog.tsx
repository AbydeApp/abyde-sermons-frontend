"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { PLATFORMS, PLATFORM_ORDER } from "@/constants/brand";
import { useBulkPost, useCapabilities, useConnections, usePosts } from "@/features/social/queries";
import { PlatformGlyph } from "@/features/social/status";
import { planBulkPost } from "@/features/social/validation";
import type { ContentItem, SocialPlatform } from "@/types";
import { cn } from "@/utils/cn";
import { formatDateTime } from "@/utils/format";
import { LAGOS_LABEL, defaultScheduleInput, fromLagosInput } from "@/utils/lagos";

/** Approve and post every social post and quote from a generated week, in one confirmed step. */
/** Posts in these states already went out or are queued, so the item must not be posted again. */
const LIVE = ["SCHEDULED", "QUEUED", "PUBLISHING", "PUBLISHED", "PARTIALLY_PUBLISHED"];

export function PostAllDialog({ items, open, onOpenChange, onPosted }: { items: ContentItem[]; open: boolean; onOpenChange: (open: boolean) => void; onPosted?: () => void }) {
  const connections = useConnections();
  const capabilities = useCapabilities();
  const bulk = useBulkPost();
  const existing = usePosts({ pageSize: 100 }, open);
  const [picked, setPicked] = useState<Set<SocialPlatform> | null>(null);
  const [mode, setMode] = useState<"schedule" | "now">("schedule");
  const [startInput, setStartInput] = useState(defaultScheduleInput);

  const connFor = (p: SocialPlatform) => connections.data?.find((c) => c.platform === p);
  const usable = useMemo(() => PLATFORM_ORDER.filter((p) => connections.data?.find((c) => c.platform === p)?.status === "connected"), [connections.data]);
  // Until the user touches the checkboxes, every connected platform is on.
  const selected = useMemo(() => (picked ? usable.filter((p) => picked.has(p)) : usable), [picked, usable]);
  const caps = useMemo(() => new Map((capabilities.data ?? []).map((c) => [c.platform, c])), [capabilities.data]);
  const alreadyPosted = useMemo(() => new Set((existing.data?.items ?? []).filter((p) => LIVE.includes(p.status)).map((p) => p.contentId)), [existing.data]);
  const fresh = useMemo(() => items.filter((i) => !alreadyPosted.has(i.id)), [items, alreadyPosted]);
  const plan = useMemo(() => planBulkPost(fresh, selected, caps), [fresh, selected, caps]);

  const posting = plan.filter((e) => e.targets.length > 0);
  const unpostable = plan.length - posting.length;
  const drafts = posting.filter((e) => e.item.status === "DRAFT").length;
  const startAt = fromLagosInput(startInput);
  const ready = !connections.isPending && !capabilities.isPending && !existing.isPending;

  function toggle(p: SocialPlatform, on: boolean) {
    setPicked((prev) => {
      const next = new Set(prev ?? usable);
      if (on) next.add(p);
      else next.delete(p);
      return next;
    });
  }

  function confirm() {
    bulk.mutate(
      { plan, connections: connections.data ?? [], when: mode === "now" ? { kind: "now" } : { kind: "schedule", startAt } },
      {
        onSuccess: ({ posted, failed }) => {
          const verb = mode === "now" ? "publishing" : "scheduled";
          if (failed.length) toast.error(`${posted} ${verb}, ${failed.length} failed: ${failed.slice(0, 2).join(", ")}${failed.length > 2 ? "…" : ""}. You can try those again.`);
          else toast.success(`${posted} ${posted === 1 ? "post" : "posts"} ${verb}`);
          onOpenChange(false);
          // Only leave when everything went through, so failures stay on screen for another try.
          if (!failed.length) onPosted?.();
        },
        onError: () => toast.error("Couldn't post your week. Please try again."),
      },
    );
  }

  const label = mode === "now" ? `Approve & publish ${posting.length}` : `Approve & schedule ${posting.length}`;

  return (
    <Dialog open={open} onOpenChange={(o) => !bulk.isPending && onOpenChange(o)}>
      <DialogContent title="Approve & post your week" description="Posts go out exactly as written. Open any draft first if you want to edit it.">
        <div className="space-y-5 overflow-y-auto px-5 py-4 text-sm">
          <p>
            <span className="font-medium">{plan.length} {plan.length === 1 ? "item" : "items"}</span> can be posted: social posts and quotes.
            Devotionals, prayers, study guides, email and WhatsApp stay as drafts.
            {items.length > fresh.length && ` ${items.length - fresh.length} already scheduled or posted.`}
          </p>

          <fieldset>
            <legend className="mb-2 text-[13px] font-medium">Post to</legend>
            {!ready ? (
              <p className="text-muted-foreground">Checking your accounts…</p>
            ) : (
              <ul className="space-y-2">
                {PLATFORM_ORDER.filter((platform) => connFor(platform)).map((platform) => {
                  const conn = connFor(platform);
                  const ok = conn?.status === "connected";
                  const on = selected.includes(platform);
                  const entries = plan.filter((e) => e.skipped.some((s) => s.platform === platform));
                  const reason = entries[0]?.skipped.find((s) => s.platform === platform)?.reasons[0];
                  const can = plan.length - entries.length;
                  return (
                    <li key={platform} className={cn("rounded-md border p-2.5", on ? "border-accent bg-accent-soft/40" : "border-border")}>
                      <label className={cn("flex items-center gap-2.5", ok ? "cursor-pointer" : "cursor-not-allowed opacity-75")}>
                        <Checkbox checked={on} disabled={!ok} onCheckedChange={(c) => toggle(platform, c === true)} />
                        <PlatformGlyph platform={platform} />
                        <span className="font-medium">{PLATFORMS[platform].label}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{ok ? conn.accountName : null}</span>
                      </label>
                      {!ok && (
                        <p className="mt-1 pl-[3.35rem] text-xs text-muted-foreground">
                          {conn ? "Authorization expired. " : "Not connected. "}
                          <Link href="/social-accounts" className="font-medium text-accent hover:underline">{conn ? "Reconnect" : "Connect"}</Link>
                        </p>
                      )}
                      {on && entries.length > 0 && (
                        <p role="status" className="mt-1 pl-[3.35rem] text-xs text-warning">
                          {can === 0 ? "None can be posted here" : `${can} of ${plan.length} can be posted here`}. {reason}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {ready && PLATFORM_ORDER.some((p) => !connFor(p)) && (
              <p className="mt-2 text-xs text-muted-foreground">
                More platforms available.{" "}
                <Link href="/social-accounts" className="font-medium text-accent hover:underline">Connect accounts</Link>
              </p>
            )}
            {ready && usable.length === 0 && connections.data?.length === 0 && (
              <p className="text-muted-foreground">No accounts connected yet.</p>
            )}
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-[13px] font-medium">When</legend>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-start gap-2.5">
                <input type="radio" name="post-all-when" className="mt-1 accent-[var(--color-accent)]" checked={mode === "schedule"} onChange={() => setMode("schedule")} />
                <span>
                  <span className="font-medium">Spread across the week</span>
                  <span className="block text-xs text-muted-foreground">One post of each kind per day, starting at the time below.</span>
                </span>
              </label>
              {mode === "schedule" && (
                <Field label="First post at" htmlFor="post-all-start" hint={`Times are in ${LAGOS_LABEL}.`} className="pl-6 sm:max-w-72">
                  <Input id="post-all-start" type="datetime-local" value={startInput} onChange={(e) => setStartInput(e.target.value)} />
                </Field>
              )}
              <label className="flex cursor-pointer items-start gap-2.5">
                <input type="radio" name="post-all-when" className="mt-1 accent-[var(--color-accent)]" checked={mode === "now"} onChange={() => setMode("now")} />
                <span>
                  <span className="font-medium">Publish everything now</span>
                  <span className="block text-xs text-muted-foreground">All posts go live immediately.</span>
                </span>
              </label>
            </div>
          </fieldset>

          <div className="rounded-md bg-muted/60 p-3 text-[13px]">
            {posting.length > 0 ? (
              <p>
                <span className="font-medium">{posting.length} {posting.length === 1 ? "post" : "posts"}</span>
                {drafts > 0 && ` (${drafts} ${drafts === 1 ? "draft" : "drafts"} will be approved first)`}
                {mode === "schedule" ? `, starting ${startInput ? formatDateTime(startAt) : "—"}.` : ", published right away."}
              </p>
            ) : (
              <p>Nothing can be posted with the platforms selected.</p>
            )}
            {unpostable > 0 && posting.length > 0 && <p className="mt-1 text-muted-foreground">{unpostable} {unpostable === 1 ? "item" : "items"} can’t be posted to any selected platform and will stay as drafts.</p>}
          </div>

          {mode === "now" && posting.length > 1 && (
            <p role="alert" className="rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-[13px] text-warning">
              This publishes {posting.length} posts immediately. Published posts can’t be unsent from here.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={bulk.isPending}>Cancel</Button>
          <Button onClick={confirm} loading={bulk.isPending} disabled={!ready || posting.length === 0 || (mode === "schedule" && !startInput)}>{label}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
