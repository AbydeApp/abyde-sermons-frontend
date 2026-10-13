"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { UploadDropzone } from "@/components/shared/upload-dropzone";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea, fieldA11y } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sermonMetaSchema, type SermonMetaValues } from "@/schemas/sermon";
import { ApiError } from "@/services/api-client";
import { sermonService } from "@/services/sermon.service";
import { sermonKeys } from "./queries";

export function NewSermonPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const abort = useRef<AbortController | null>(null);
  const [mode, setMode] = useState<"file" | "paste">("file");
  const [file, setFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState("");
  const [progress, setProgress] = useState<number | undefined>();
  const [sourceError, setSourceError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SermonMetaValues>({
    resolver: zodResolver(sermonMetaSchema),
    defaultValues: { title: "", speaker: "", date: new Date().toISOString().slice(0, 10), series: "", mainScripture: "", tags: "" },
  });

  const create = useMutation({
    mutationFn: (meta: SermonMetaValues) => {
      abort.current = new AbortController();
      return sermonService.create(
        { meta, file: mode === "file" ? (file ?? undefined) : undefined, transcript: mode === "paste" ? transcript : undefined },
        setProgress,
        abort.current.signal,
      );
    },
    onSuccess: ({ id }) => {
      qc.invalidateQueries({ queryKey: sermonKeys.all });
      qc.invalidateQueries({ queryKey: sermonKeys.dashboard });
      router.push(`/sermons/${id}`);
    },
    onError: (e) => {
      setProgress(undefined);
      if (e instanceof DOMException) return;
      toast.error(e instanceof ApiError ? e.message : "Upload failed. Please try again.");
    },
  });

  function submit(meta: SermonMetaValues) {
    if (mode === "file" && !file) return setSourceError("Add a sermon file, or switch to Paste Transcript.");
    if (mode === "paste" && transcript.trim().length < 50) return setSourceError("Paste the full transcript (at least a few sentences).");
    setSourceError(null);
    setProgress(0);
    create.mutate(meta);
  }

  const busy = create.isPending;

  return (
    <>
      <PageHeader title="New Sermon" description="Upload a sermon and Abyde Sermon will do the rest. You'll review everything before it's used." />
      <form onSubmit={handleSubmit(submit)} className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]" noValidate>
        <div className="space-y-4">
          <Tabs value={mode} onValueChange={(v) => { setMode(v as typeof mode); setSourceError(null); }}>
            <TabsList>
              <TabsTrigger value="file" disabled={busy}>Upload file</TabsTrigger>
              <TabsTrigger value="paste" disabled={busy}>Paste Transcript</TabsTrigger>
            </TabsList>
            <TabsContent value="file">
              <UploadDropzone file={file} onFile={setFile} progress={busy ? progress : undefined} disabled={busy} />
            </TabsContent>
            <TabsContent value="paste">
              <Textarea
                aria-label="Sermon transcript"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste your sermon transcript here…"
                className="min-h-72"
                disabled={busy}
              />
            </TabsContent>
          </Tabs>
          {sourceError && <p role="alert" className="text-xs text-danger">{sourceError}</p>}
        </div>

        <div className="space-y-4 rounded-lg border border-border bg-card p-5">
          <Field label="Sermon title" htmlFor="title" error={errors.title?.message}>
            <Input {...fieldA11y("title", errors.title?.message)} {...register("title")} />
          </Field>
          <Field label="Speaker" htmlFor="speaker" error={errors.speaker?.message}>
            <Input {...fieldA11y("speaker", errors.speaker?.message)} {...register("speaker")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" htmlFor="date" error={errors.date?.message}>
              <Input type="date" {...fieldA11y("date", errors.date?.message)} {...register("date")} />
            </Field>
            <Field label="Series" htmlFor="series" optional>
              <Input {...fieldA11y("series")} {...register("series")} />
            </Field>
          </div>
          <Field label="Main scripture" htmlFor="mainScripture" optional>
            <Input placeholder="e.g. 2 Corinthians 5:7" {...fieldA11y("mainScripture")} {...register("mainScripture")} />
          </Field>
          <Field label="Tags" htmlFor="tags" optional hint="Separate with commas.">
            <Input {...fieldA11y("tags", undefined, "hint")} {...register("tags")} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            {busy ? (
              <Button type="button" variant="outline" onClick={() => abort.current?.abort()}>Cancel upload</Button>
            ) : (
              <Button type="button" variant="ghost" onClick={() => router.push("/sermons")}>Cancel</Button>
            )}
            <Button type="submit" loading={busy}>Upload &amp; Process</Button>
          </div>
        </div>
      </form>
    </>
  );
}
