"use client";

import { ImagePlus, X } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { ContentCard } from "@/components/shared/cards";
import { Button } from "@/components/ui/button";
import { Field, Input, fieldA11y } from "@/components/ui/input";
import { ApiError } from "@/services/api-client";
import type { BrandProfile } from "@/types";
import { useBrandStudio } from "./context";
import { useUploadAsset } from "./queries";

const MAX_IMAGE = 8 * 1024 ** 2;

function ColorField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  const valid = /^#[0-9a-f]{6}$/i.test(value);
  return (
    <Field label={label} htmlFor={id} error={valid ? undefined : "Use a hex color like #B5502F"}>
      <div className="flex gap-2">
        <input type="color" aria-label={`${label} picker`} value={valid ? value : "#b5502f"} onChange={(e) => onChange(e.target.value.toUpperCase())} className="h-9 w-11 shrink-0 cursor-pointer rounded-md border border-border-strong bg-card p-1" />
        <Input {...fieldA11y(id, valid ? undefined : "invalid")} value={value} onChange={(e) => onChange(e.target.value)} className="font-mono uppercase" />
      </div>
    </Field>
  );
}

function LogoField({ assetId, onChange }: { assetId?: string | null; onChange: (id: string | null) => void }) {
  const { draft } = useBrandStudio();
  const upload = useUploadAsset();
  const ref = useRef<HTMLInputElement>(null);
  const current = draft?.assets.find((a) => a.id === assetId);

  function pick(f?: File) {
    if (!f) return;
    if (!/^image\/(png|jpe?g|svg\+xml|webp)$/.test(f.type)) return void toast.error("Use a PNG, JPG, SVG or WebP image.");
    if (f.size > MAX_IMAGE) return void toast.error("Images must be under 8 MB.");
    upload.mutate({ file: f, kind: "LOGO" }, { onSuccess: (id) => onChange(id), onError: (e) => toast.error(e instanceof ApiError ? e.message : "Upload failed.") });
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-3">
        <div className="flex size-16 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border-strong bg-card text-muted-foreground">
          {/* eslint-disable-next-line @next/next/no-img-element -- brand asset */}
          {current ? <img src={current.url} alt="Church logo preview" className="size-full object-contain" /> : <ImagePlus className="size-5" aria-hidden />}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" loading={upload.isPending} onClick={() => ref.current?.click()}>
            {current ? "Replace" : "Upload"}
          </Button>
          {current && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              <X /> Remove
            </Button>
          )}
        </div>
        <input ref={ref} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="sr-only" tabIndex={-1} aria-label="Church logo file" onChange={(e) => pick(e.target.files?.[0])} />
      </div>
      <p className="text-xs text-muted-foreground">PNG, JPG, SVG, or WebP · max 8 MB</p>
    </div>
  );
}

export function VisualForm() {
  const { draft, patch } = useBrandStudio();
  if (!draft) return null;
  const set = <K extends keyof BrandProfile>(k: K, v: BrandProfile[K]) => patch({ [k]: v } as Partial<BrandProfile>);

  return (
    <div className="space-y-5">
      <ContentCard title="Logo" bodyClassName="p-5">
        <LogoField assetId={draft.logoAssetId} onChange={(id) => set("logoAssetId", id)} />
      </ContentCard>

      <ContentCard title="Colors" bodyClassName="grid gap-4 p-5 sm:grid-cols-3">
        <ColorField id="bs-primary" label="Primary color" value={draft.primaryColor} onChange={(v) => set("primaryColor", v)} />
        <ColorField id="bs-secondary" label="Secondary color" value={draft.secondaryColor} onChange={(v) => set("secondaryColor", v)} />
        <ColorField id="bs-accent" label="Accent color" value={draft.accentColor} onChange={(v) => set("accentColor", v)} />
      </ContentCard>
    </div>
  );
}
