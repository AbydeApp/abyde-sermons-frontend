"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { BrandProfile } from "@/types";
import { useBrandProfile, useSaveBrand } from "./queries";

type Edits = Partial<Omit<BrandProfile, "voice" | "assets">>;

interface BrandStudioContext {
  /** Server state merged with unsaved edits. */
  draft: BrandProfile | null;
  loading: boolean;
  error: unknown;
  refetch: () => void;
  dirty: boolean;
  canSave: boolean;
  saving: boolean;
  justSaved: boolean;
  patch: (e: Edits) => void;
  save: () => Promise<void>;
  discard: () => void;
}

const Ctx = createContext<BrandStudioContext | null>(null);

export function useBrandStudio() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useBrandStudio must be used inside BrandStudioProvider");
  return c;
}

export function BrandStudioProvider({ children }: { children: React.ReactNode }) {
  const profile = useBrandProfile();
  const saveM = useSaveBrand();
  const [edits, setEdits] = useState<Edits>({});
  const [justSaved, setJustSaved] = useState(false);

  const saved = profile.data;
  const draft = useMemo<BrandProfile | null>(() => {
    if (!saved) return null;
    const merged = { ...saved, ...edits };
    const urlOf = (id?: string | null) => saved.assets.find((a) => a.id === id)?.url ?? null;
    return { ...merged, logoUrl: urlOf(merged.logoAssetId), alternateLogoUrl: urlOf(merged.alternateLogoAssetId) };
  }, [saved, edits]);

  const dirty = Object.keys(edits).length > 0;
  const canSave = !!draft && [draft.primaryColor, draft.secondaryColor, draft.accentColor].every((color) => /^#[0-9a-f]{6}$/i.test(color));

  const patch = useCallback((e: Edits) => {
    setJustSaved(false);
    setEdits((prev) => ({ ...prev, ...e }));
  }, []);

  const save = useCallback(async () => {
    if (!draft) return;
    await saveM.mutateAsync(draft);
    setEdits({});
    setJustSaved(true);
  }, [draft, saveM]);

  const discard = useCallback(() => {
    setEdits({});
    setJustSaved(false);
  }, []);

  const value: BrandStudioContext = {
    draft,
    loading: profile.isPending,
    error: profile.error,
    refetch: () => profile.refetch(),
    dirty,
    canSave,
    saving: saveM.isPending,
    justSaved,
    patch,
    save,
    discard,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
