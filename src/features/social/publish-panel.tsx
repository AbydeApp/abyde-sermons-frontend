"use client";

import { Send } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BrandPreview } from "@/components/brand/brand-preview";
import { ContentCard } from "@/components/shared/cards";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { PLATFORMS, PLATFORM_ORDER } from "@/constants/brand";
import { useBrandProfile } from "@/features/brand-studio/queries";
import { ApiError } from "@/services/api-client";
import type { ContentItem, SocialPlatform, SocialPost } from "@/types";
import { cn } from "@/utils/cn";
import { formatDateTime } from "@/utils/format";
import { LAGOS_LABEL, defaultScheduleInput, fromLagosInput } from "@/utils/lagos";
import { useCapabilities, useConnections, usePostActions, usePosts } from "./queries";
import { PlatformGlyph, PlatformResults, PublishProgress, SocialStatusBadge } from "./status";
import { defaultCaption, mediaKindOf, validatePublish } from "./validation";

type Action = "draft" | "publish" | "schedule";

export function PostList({ posts, onRetry, retrying }: { posts: SocialPost[]; onRetry: (id: string) => void; retrying?: boolean }) {
  return (
    <ul className="space-y-3">
      {posts.map((p) => (
        <li key={p.id} className="space-y-2 rounded-md border border-border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {p.targets.map((t) => <PlatformGlyph key={t.connectionId} platform={t.platform} />)}
              <span className="ml-1 text-xs text-muted-foreground">{p.scheduledAt ? formatDateTime(p.scheduledAt) : formatDateTime(p.createdAt)}</span>
            </div>
            <SocialStatusBadge status={p.status} />
          </div>
          <PlatformResults results={p.results} />
          {p.canRetry && (
            <Button size="sm" variant="outline" loading={retrying} onClick={() => onRetry(p.id)}>
              Retry failed platforms
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Choose platforms, validate against backend capabilities, then save / schedule / publish. */
export function PublishPanel({ content, captionControl }: { content: ContentItem; captionControl?: { value: string; onChange: (v: string) => void } }) {
  const connections = useConnections();
  const capabilities = useCapabilities();
  const brand = useBrandProfile();
  const posts = usePosts({ contentId: content.id, pageSize: 10 });
  const actions = usePostActions();

  const reel = content.structured?.reel;
  const initialCaption = defaultCaption(content);
  const [ownCaption, setOwnCaption] = useState(initialCaption);
  const caption = captionControl ? captionControl.value : ownCaption;
  const setCaption = captionControl ? captionControl.onChange : setOwnCaption;
  const [title, setTitle] = useState(content.title);
  const [selected, setSelected] = useState<Set<SocialPlatform>>(new Set());
  const [when, setWhen] = useState(defaultScheduleInput);
  const [review, setReview] = useState<Action | null>(null);

  const mediaKind = mediaKindOf(content);
  const mediaReady = content.visual?.status === "READY";
  const videoSeconds = reel ? (reel.endTimeMs - reel.startTimeMs) / 1000 : undefined;
  const caps = useMemo(() => new Map((capabilities.data ?? []).map((c) => [c.platform, c])), [capabilities.data]);
  const connFor = (p: SocialPlatform) => connections.data?.find((c) => c.platform === p);

  const problems = useMemo(
    () =>
      [...selected].map((platform) => ({
        platform,
        issues: validatePublish({ platform, capability: caps.get(platform), caption, title, mediaKind, mediaReady, videoSeconds }),
      })),
    [selected, caps, caption, title, mediaKind, mediaReady, videoSeconds],
  );
  const blocked = problems.some((p) => p.issues.length > 0);
  const hasTargets = selected.size > 0;
  const needsTitle = [...selected].some((p) => caps.get(p)?.requiresTitle);
  const lastPost = posts.data?.items[0];

  function toggle(p: SocialPlatform, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(p);
      else next.delete(p);
      return next;
    });
  }

  function run(action: Action) {
    const targets = [...selected].map((platform) => ({ platform, connectionId: connFor(platform)!.id }));
    const post = { contentId: content.id, caption, title, targets, mediaAssetIds: mediaReady ? (content.visual?.assets.map((a) => a.id) ?? []) : [] };
    const then = action === "publish" ? { kind: "publish" as const } : action === "schedule" ? { kind: "schedule" as const, scheduledAt: fromLagosInput(when) } : { kind: "draft" as const };
    actions.createAnd.mutate(
      { post, then },
      {
        onSuccess: () => {
          setReview(null);
          toast.success(action === "publish" ? "Publishing started" : action === "schedule" ? "Post scheduled" : "Draft saved");
        },
        onError: (e) => toast.error(e instanceof ApiError ? e.message : "Couldn't create the post."),
      },
    );
  }

  const thumb = content.visual?.thumbnailUrl;
  const count = selected.size;

  return (
    <ContentCard title="Publish to social" description="Choose where this goes, check the preview, then save, schedule or publish." bodyClassName="space-y-5 p-4">
      <PublishProgress status={lastPost?.status} visualReady={mediaReady} />

      <fieldset>
        <legend className="mb-2 text-[13px] font-medium">Platforms</legend>
        <ul className="grid gap-2 sm:grid-cols-2">
          {PLATFORM_ORDER.map((platform) => {
            const conn = connFor(platform);
            const usable = conn?.status === "connected";
            const issues = problems.find((p) => p.platform === platform)?.issues ?? [];
            return (
              <li key={platform} className={cn("rounded-md border p-2.5", selected.has(platform) ? "border-accent bg-accent-soft/40" : "border-border")}>
                <label className={cn("flex items-center gap-2.5", usable ? "cursor-pointer" : "cursor-not-allowed opacity-75")}>
                  <Checkbox checked={selected.has(platform)} disabled={!usable} onCheckedChange={(c) => toggle(platform, c === true)} aria-describedby={`pp-${platform}`} />
                  <PlatformGlyph platform={platform} />
                  <span className="text-sm font-medium">{PLATFORMS[platform].label}</span>
                </label>
                <p id={`pp-${platform}`} className="mt-1 pl-[3.35rem] text-xs text-muted-foreground">
                  {usable ? conn.accountName : (
                    <>
                      {conn ? "Authorization expired. " : "Not connected. "}
                      <Link href="/social-accounts" className="font-medium text-accent hover:underline">{conn ? "Reconnect" : "Connect"}</Link>
                    </>
                  )}
                </p>
                {issues.length > 0 && (
                  <ul role="alert" className="mt-1.5 space-y-0.5 pl-[3.35rem] text-xs text-danger">
                    {issues.map((i) => <li key={i}>{i}</li>)}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </fieldset>

      {needsTitle && (
        <Field label="Video title" htmlFor="pp-title" hint="Required by YouTube.">
          <Input id="pp-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
      )}
      {captionControl ? (
        <p className="text-xs text-muted-foreground tabular-nums">Caption (edited above): {caption.length.toLocaleString()} characters</p>
      ) : (
        <Field label="Caption" htmlFor="pp-caption">
          <Textarea id="pp-caption" className="min-h-28" value={caption} onChange={(e) => setCaption(e.target.value)} />
          <p className="mt-1 text-right text-xs text-muted-foreground tabular-nums">{caption.length.toLocaleString()} characters</p>
        </Field>
      )}
      <Field label="Publish at" htmlFor="pp-when" hint={`Times are in ${LAGOS_LABEL}.`} className="sm:max-w-64">
        <Input id="pp-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
      </Field>

      {mediaKind !== "none" && !mediaReady && (
        <p className="rounded-md bg-warning-soft px-3 py-2 text-[13px] text-warning">
          {content.visual?.status === "RENDERING" ? "Your visual is rendering…" : "Create a visual first so there is media to post."}{" "}
          {content.visual?.status !== "RENDERING" && <Link href={`/content/${content.id}/visual`} className="font-medium underline">Create Visual</Link>}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" disabled={!hasTargets || blocked || actions.createAnd.isPending} onClick={() => run("draft")}>
          Save Draft
        </Button>
        <Button variant="outline" disabled={!hasTargets || blocked || !when} onClick={() => setReview("schedule")}>
          Schedule
        </Button>
        <Button disabled={!hasTargets || blocked} onClick={() => setReview("publish")}>
          <Send /> Publish Now
        </Button>
      </div>

      {posts.data && posts.data.items.length > 0 && (
        <div className="space-y-2 border-t border-border pt-4">
          <h3 className="text-[13px] font-medium">Activity</h3>
          <PostList posts={posts.data.items} onRetry={(id) => actions.retry.mutate(id, { onError: (e) => toast.error(e instanceof ApiError ? e.message : "Retry failed.") })} retrying={actions.retry.isPending} />
        </div>
      )}

      {/* Review before anything goes out */}
      <Dialog open={!!review} onOpenChange={(o) => !o && setReview(null)}>
        <DialogContent title={review === "publish" ? "Review before publishing" : "Review before scheduling"} description="This is exactly what will be posted.">
          <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
            <div>
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element -- rendered media
                <img src={thumb} alt="Rendered visual" className="w-full rounded-md border border-border" />
              ) : brand.data ? (
                <BrandPreview brand={{ ...brand.data, logoUrl: brand.data.logoUrl }} variant="minimal" format="instagram-square" headline={content.title} />
              ) : null}
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-1.5">
                {[...selected].map((p) => (
                  <span key={p} className="flex items-center gap-1.5 rounded-full border border-border-strong px-2 py-0.5 text-xs"><PlatformGlyph platform={p} className="size-4" /> {PLATFORMS[p].label}</span>
                ))}
              </div>
              <p className="whitespace-pre-line rounded-md bg-muted/60 p-3">{caption}</p>
              <p className="text-xs text-muted-foreground">{review === "schedule" ? `Scheduled for ${formatDateTime(fromLagosInput(when))} (${LAGOS_LABEL})` : "Publishes immediately."}</p>
              {review === "publish" && count > 1 && (
                <p role="alert" className="rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-[13px] text-warning">
                  This will publish immediately to {count} platforms. Published posts can&apos;t be unsent from here.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReview(null)}>Back</Button>
            <Button onClick={() => run(review!)} loading={actions.createAnd.isPending}>
              {review === "publish" ? (count > 1 ? `Publish to ${count} platforms` : "Publish now") : "Confirm schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ContentCard>
  );
}
