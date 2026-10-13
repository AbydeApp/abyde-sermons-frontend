"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, fieldA11y } from "@/components/ui/input";
import { sermonMetaSchema, type SermonMetaValues } from "@/schemas/sermon";
import { ApiError } from "@/services/api-client";
import type { Sermon } from "@/types";
import { useUpdateSermon } from "./queries";

/** Edits sermon details. Mount with a `key` so the form resets when the sermon changes. */
export function EditSermonDialog({ sermon, open, onOpenChange }: { sermon: Sermon; open: boolean; onOpenChange: (o: boolean) => void }) {
  const update = useUpdateSermon(sermon.id);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SermonMetaValues>({
    resolver: zodResolver(sermonMetaSchema),
    defaultValues: {
      title: sermon.title,
      speaker: sermon.speaker,
      date: sermon.sermonDate.slice(0, 10),
      series: sermon.series ?? "",
      mainScripture: sermon.mainScripture ?? "",
      tags: sermon.tags.join(", "),
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Edit sermon details" description="Changes apply to your library and search.">
        <form
          noValidate
          className="space-y-4"
          onSubmit={handleSubmit((v) =>
            update.mutate(v, {
              onSuccess: () => {
                toast.success("Sermon updated");
                onOpenChange(false);
              },
              onError: (e) => toast.error(e instanceof ApiError ? e.message : "Couldn't save changes."),
            }),
          )}
        >
          <Field label="Sermon title" htmlFor="e-title" error={errors.title?.message}>
            <Input {...fieldA11y("e-title", errors.title?.message)} {...register("title")} />
          </Field>
          <Field label="Speaker" htmlFor="e-speaker" error={errors.speaker?.message}>
            <Input {...fieldA11y("e-speaker", errors.speaker?.message)} {...register("speaker")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" htmlFor="e-date" error={errors.date?.message}>
              <Input type="date" {...fieldA11y("e-date", errors.date?.message)} {...register("date")} />
            </Field>
            <Field label="Series" htmlFor="e-series" optional>
              <Input {...fieldA11y("e-series")} {...register("series")} />
            </Field>
          </div>
          <Field label="Main scripture" htmlFor="e-scripture" optional>
            <Input {...fieldA11y("e-scripture")} {...register("mainScripture")} />
          </Field>
          <Field label="Tags" htmlFor="e-tags" optional hint="Separate with commas.">
            <Input {...fieldA11y("e-tags", undefined, "hint")} {...register("tags")} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={update.isPending}>
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
