"use client";

import { Check, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/services/api-client";
import { BrandStudioProvider, useBrandStudio } from "./context";

function SaveState() {
  const { dirty, saving, justSaved } = useBrandStudio();
  if (saving) return <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" aria-hidden /> Saving…</span>;
  if (dirty) return <span role="status" className="text-xs text-warning">Unsaved changes</span>;
  if (justSaved) return <span role="status" className="flex items-center gap-1 text-xs text-success"><Check className="size-3.5" aria-hidden /> Saved</span>;
  return null;
}

function Inner({ children }: { children: React.ReactNode }) {
  const { draft, loading, error, refetch, dirty, canSave, saving, save, discard } = useBrandStudio();

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  async function onSave() {
    try {
      await save();
      toast.success("Brand saved");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't save your brand.");
    }
  }

  return (
    <>
      <PageHeader
        title="Brand Studio"
        description="Upload your logo and set the colors used across your content."
        actions={
          <>
            <SaveState />
            {dirty && (
              <Button variant="ghost" onClick={discard} disabled={saving}>
                Discard
              </Button>
            )}
            <Button onClick={onSave} loading={saving} disabled={!dirty || !canSave}>
              Save Changes
            </Button>
          </>
        }
      />

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : loading || !draft ? (
        <div role="status" aria-label="Loading" className="space-y-4">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className="max-w-2xl">{children}</div>
      )}
    </>
  );
}

export function BrandStudioShell({ children }: { children: React.ReactNode }) {
  return (
    <BrandStudioProvider>
      <Inner>{children}</Inner>
    </BrandStudioProvider>
  );
}
