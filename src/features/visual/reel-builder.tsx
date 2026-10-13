"use client";

import { Download, Play, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ContentCard } from "@/components/shared/cards";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/checkbox";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SUBTITLE_STYLES } from "@/constants/brand";
import { useContentMutations, useRenderFlow } from "@/features/content/queries";
import { PublishPanel } from "@/features/social/publish-panel";
import { ApiError } from "@/services/api-client";
import type { BrandProfile, ContentItem, ReelAspect, ReelClip } from "@/types";
import { cn } from "@/utils/cn";
import { downloadUrl, slug } from "@/utils/download";
import { formatTimestamp } from "@/utils/format";
import { extFor } from "./shared";

const ASPECTS: { value: ReelAspect; label: string; ratio: string; safe: { top: number; bottom: number } }[] = [
  { value: "9:16", label: "9:16 · Reels, Shorts, TikTok", ratio: "9 / 16", safe: { top: 14, bottom: 22 } },
  { value: "4:5", label: "4:5 · Feed", ratio: "4 / 5", safe: { top: 8, bottom: 12 } },
  { value: "1:1", label: "1:1 · Square", ratio: "1 / 1", safe: { top: 6, bottom: 10 } },
];

const SUBTITLE_CSS: Record<string, React.CSSProperties> = {
  Clean: { background: "rgba(0,0,0,.6)", padding: "0.4em 0.7em", borderRadius: "0.3em" },
  "Bold outline": { fontWeight: 800, textTransform: "uppercase", WebkitTextStroke: "0.06em #000", paintOrder: "stroke fill" },
  "Karaoke highlight": { fontWeight: 700, textShadow: "0 0 0.3em rgba(0,0,0,.7)" },
  Minimal: { textShadow: "0 1px 6px rgba(0,0,0,.8)" },
};

/** "m:ss" or "h:mm:ss" -> ms; null when unparseable. */
export function parseTimestamp(v: string): number | null {
  const parts = v.trim().split(":").map(Number);
  if (!parts.length || parts.length > 3 || parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  return parts.reduce((acc, n) => acc * 60 + n, 0) * 1000;
}

function TimeField({ id, label, ms, onChange }: { id: string; label: string; ms: number; onChange: (ms: number) => void }) {
  // While typing we show the raw text; otherwise the formatted value follows the sliders.
  const [draft, setDraft] = useState<string | null>(null);
  const bad = draft !== null && parseTimestamp(draft) === null;
  return (
    <Field label={label} htmlFor={id} error={bad ? "Use m:ss, like 1:35" : undefined}>
      <Input
        id={id}
        value={draft ?? formatTimestamp(ms)}
        inputMode="numeric"
        aria-invalid={bad || undefined}
        onChange={(e) => {
          setDraft(e.target.value);
          const v = parseTimestamp(e.target.value);
          if (v !== null) onChange(v);
        }}
        onBlur={() => setDraft(null)}
      />
    </Field>
  );
}

export function ReelBuilder({ content, brand }: { content: ContentItem; brand: BrandProfile }) {
  const saved = content.structured!.reel!;
  const [clip, setClip] = useState<ReelClip>(saved);
  const [caption, setCaption] = useState(saved.caption);
  const [safeArea, setSafeArea] = useState(true);
  const mutations = useContentMutations(content.id);
  const flow = useRenderFlow(content.id);

  const aspect = ASPECTS.find((a) => a.value === clip.aspect)!;
  const total = clip.durationMs ?? 20 * 60_000;
  const length = clip.endTimeMs - clip.startTimeMs;
  const merged: ReelClip = { ...clip, caption };
  const dirty = JSON.stringify(merged) !== JSON.stringify(saved);
  const invalid = length < 3000 || clip.endTimeMs > total;
  const ready = content.visual?.status === "READY" && !dirty;
  const set = (p: Partial<ReelClip>) => setClip((c) => ({ ...c, ...p }));

  function setStart(ms: number) {
    set({ startTimeMs: Math.min(ms, clip.endTimeMs - 3000) });
  }
  function setEnd(ms: number) {
    set({ endTimeMs: Math.max(ms, clip.startTimeMs + 3000) });
  }

  function save() {
    mutations.save.mutate(
      { structured: { reel: merged } },
      { onSuccess: () => toast.success("Clip settings saved"), onError: (e) => toast.error(e instanceof ApiError ? e.message : "Couldn't save.") },
    );
  }

  async function renderClip(thenDownload = false) {
    try {
      if (dirty) await mutations.save.mutateAsync({ structured: { reel: merged } });
      const item = await flow.run({ format: "story" });
      if (thenDownload) {
        const a = item.visual!.assets[0];
        downloadUrl(a.url, `${slug(content.title)}.${extFor(a.url)}`);
      } else toast.success("Clip rendered");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't render the clip.");
    }
  }

  const subtitle = SUBTITLE_CSS[clip.subtitleStyle] ?? SUBTITLE_CSS.Clean;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
      <div className="min-w-0 space-y-5">
        <ContentCard title="Clip" description="Pick the moment from the sermon recording." bodyClassName="space-y-4 p-4">
          <p className="text-[13px]">
            Source sermon:{" "}
            <Link href={`/sermons/${content.sermonId}`} className="font-medium text-accent hover:underline">{content.sermonTitle}</Link>
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <TimeField id="rb-start" label="Start" ms={clip.startTimeMs} onChange={setStart} />
            <TimeField id="rb-end" label="End" ms={clip.endTimeMs} onChange={setEnd} />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="w-10">Start</span>
              <input type="range" aria-label="Start position" className="flex-1 accent-[var(--accent)]" min={0} max={total} step={1000} value={clip.startTimeMs} onChange={(e) => setStart(Number(e.target.value))} />
            </label>
            <label className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="w-10">End</span>
              <input type="range" aria-label="End position" className="flex-1 accent-[var(--accent)]" min={0} max={total} step={1000} value={clip.endTimeMs} onChange={(e) => setEnd(Number(e.target.value))} />
            </label>
          </div>
          <p className={cn("text-xs tabular-nums", invalid ? "text-danger" : "text-muted-foreground")} role={invalid ? "alert" : undefined}>
            Clip length {formatTimestamp(length)} {invalid && "— must be at least 3 seconds and inside the recording."}
          </p>
        </ContentCard>

        <ContentCard title="Look" bodyClassName="space-y-4 p-4">
          <Field label="Title hook" htmlFor="rb-hook" hint="Shown at the top for the first seconds.">
            <Input id="rb-hook" value={clip.hook} onChange={(e) => set({ hook: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Speaker name" htmlFor="rb-speaker" optional>
              <Input id="rb-speaker" value={clip.speakerName ?? ""} onChange={(e) => set({ speakerName: e.target.value })} />
            </Field>
            <Field label="Aspect ratio" htmlFor="rb-aspect">
              <Select id="rb-aspect" value={clip.aspect} onValueChange={(v) => set({ aspect: v as ReelAspect })} options={ASPECTS.map((a) => ({ value: a.value, label: a.label }))} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
              <span className="text-sm">Subtitles</span>
              <Switch checked={clip.subtitlesEnabled} aria-label="Subtitles" onCheckedChange={(v) => set({ subtitlesEnabled: v })} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
              <span className="text-sm">Logo / watermark</span>
              <Switch checked={clip.watermark} aria-label="Logo watermark" onCheckedChange={(v) => set({ watermark: v })} />
            </div>
          </div>
          <Field label="Subtitle style" htmlFor="rb-sub">
            <Select id="rb-sub" disabled={!clip.subtitlesEnabled} value={clip.subtitleStyle} onValueChange={(v) => set({ subtitleStyle: v })} options={SUBTITLE_STYLES.map((s) => ({ value: s, label: s }))} />
          </Field>
        </ContentCard>

        <ContentCard title="Generated caption" bodyClassName="p-4">
          <label htmlFor="rb-caption" className="sr-only">Caption</label>
          <Textarea id="rb-caption" value={caption} onChange={(e) => setCaption(e.target.value)} />
        </ContentCard>

        <div id="publish" className="scroll-mt-20">
          <PublishPanel content={ready ? content : { ...content, visual: content.visual?.status === "RENDERING" ? content.visual : null, structured: { reel: merged } }} captionControl={{ value: caption, onChange: setCaption }} />
        </div>
      </div>

      <aside>
        <div className="sticky top-20 space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Preview</h2>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" aria-hidden />
              Safe area
              <Switch checked={safeArea} aria-label="Safe-area overlay" onCheckedChange={setSafeArea} />
            </label>
          </div>
          <div className="mx-auto w-full max-w-[14rem] overflow-hidden rounded-lg bg-black text-white" style={{ aspectRatio: aspect.ratio, containerType: "inline-size" }}>
            <div className="relative size-full">
              {clip.videoUrl ? (
                <video src={clip.videoUrl} className="size-full object-cover" controls={false} muted playsInline aria-label="Clip preview" />
              ) : (
                <div className="flex size-full items-center justify-center bg-gradient-to-br from-zinc-800 to-black" aria-label="Clip preview placeholder">
                  <Play className="size-8 opacity-50" aria-hidden />
                </div>
              )}
              <p className="absolute inset-x-[6cqw] text-center font-bold leading-tight" style={{ top: `${aspect.safe.top}%`, fontSize: "6cqw", fontFamily: `'${brand.headingFont}', serif` }}>{clip.hook}</p>
              {clip.subtitlesEnabled && (
                <p className="absolute inset-x-[8cqw] text-center" style={{ bottom: `${aspect.safe.bottom + 4}%`, fontSize: "5cqw", fontFamily: `'${brand.bodyFont}', sans-serif`, ...subtitle }}>
                  <span>Faith is choosing to trust…</span>
                </p>
              )}
              {clip.speakerName && <p className="absolute left-[6cqw]" style={{ bottom: `${aspect.safe.bottom - 6}%`, fontSize: "3.6cqw", opacity: 0.9 }}>{clip.speakerName}</p>}
              {clip.watermark && brand.watermarkEnabled && <span className="absolute right-[5cqw] top-[4cqw] opacity-60" style={{ fontSize: "3cqw" }}>{brand.churchName}</span>}
              {safeArea && (
                <div aria-hidden className="pointer-events-none absolute inset-x-0 border-y border-dashed border-white/50" style={{ top: `${aspect.safe.top}%`, bottom: `${aspect.safe.bottom}%` }}>
                  <span className="absolute left-1 top-0.5 text-[9px] text-white/60">safe area</span>
                </div>
              )}
              <div aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-white/20"><div className="h-full w-1/3 bg-white/80" /></div>
            </div>
          </div>
          <p className="text-center text-xs tabular-nums text-muted-foreground">{formatTimestamp(clip.startTimeMs)} – {formatTimestamp(clip.endTimeMs)} · {formatTimestamp(length)}</p>
          <Button className="w-full" onClick={save} disabled={!dirty} loading={mutations.save.isPending && !flow.busy}>Save clip settings</Button>
          <Button className="w-full" variant="dark" onClick={() => renderClip(false)} loading={flow.busy} disabled={invalid}>
            {ready ? "Re-render clip" : "Render clip"}
          </Button>
          <Button className="w-full" variant="outline" disabled={!ready} onClick={() => { const a = content.visual!.assets[0]; downloadUrl(a.url, `${slug(content.title)}.${extFor(a.url)}`); }}>
            <Download /> Download
          </Button>
          <p role="status" className="text-xs text-muted-foreground">
            {flow.busy || content.visual?.status === "RENDERING" ? "Rendering your clip…" : ready ? "Clip rendered and ready to publish." : dirty ? "Unsaved changes." : "Not rendered yet."}
          </p>
        </div>
      </aside>
    </div>
  );
}
