"use client";

import { FileAudio, FileText, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ACCEPTED_SERMON_FILES } from "@/constants/content";
import { validateSermonFile } from "@/schemas/sermon";
import { cn } from "@/utils/cn";
import { formatBytes } from "@/utils/format";

export function UploadDropzone({
  file,
  onFile,
  progress,
  disabled,
}: {
  file: File | null;
  onFile: (f: File | null) => void;
  /** 0-100 while uploading; undefined when idle. */
  progress?: number;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function accept(f: File | undefined) {
    if (!f) return;
    const err = validateSermonFile(f);
    setError(err);
    if (!err) onFile(f);
  }

  if (file) {
    const isMedia = /\.(mp3|wav|mp4)$/i.test(file.name);
    const Icon = isMedia ? FileAudio : FileText;
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
            <Icon className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
          </div>
          {progress === undefined && (
            <Button variant="ghost" size="icon" onClick={() => onFile(null)} aria-label="Remove file" disabled={disabled}>
              <X />
            </Button>
          )}
        </div>
        {progress !== undefined && (
          <div className="mt-3">
            <div
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Upload progress"
              className="h-1.5 overflow-hidden rounded-full bg-muted"
            >
              <div className="h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">Uploading… {progress}%</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files[0]);
        }}
        className={cn(
          "flex flex-col items-center rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors",
          dragging ? "border-accent bg-accent-soft/60" : "border-border-strong bg-card",
        )}
      >
        <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent">
          <UploadCloud className="size-5" aria-hidden />
        </div>
        <p className="text-sm font-medium">Drag and drop your sermon here</p>
        <p className="mt-1 text-xs text-muted-foreground">{ACCEPTED_SERMON_FILES.label} · up to 2 GB</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => inputRef.current?.click()} disabled={disabled}>
          Browse files
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          tabIndex={-1}
          accept={ACCEPTED_SERMON_FILES.extensions.join(",")}
          aria-label="Upload sermon file"
          onChange={(e) => accept(e.target.files?.[0])}
        />
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
