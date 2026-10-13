"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, Input, fieldA11y } from "@/components/ui/input";
import { SESSION_KEY } from "@/hooks/use-session";
import { churchSchema, type ChurchValues } from "@/schemas/onboarding";
import { ApiError } from "@/services/api-client";
import { churchService } from "@/services/church.service";

export function ChurchStep() {
  const router = useRouter();
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChurchValues>({
    resolver: zodResolver(churchSchema),
    defaultValues: { name: "", ownerRole: "", denomination: "", website: "" },
  });

  const save = useMutation({
    mutationFn: (v: ChurchValues) =>
      churchService.create({ ...v, denomination: v.denomination || undefined, website: v.website || undefined }),
    onSuccess: (session) => {
      // Creating the church completes onboarding on the server.
      qc.setQueryData(SESSION_KEY, session);
      router.replace("/dashboard");
    },
  });

  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-5" noValidate>
      {save.error && (
        <p role="alert" className="rounded-md border border-danger/20 bg-danger-soft px-3 py-2 text-[13px] text-danger">
          {save.error instanceof ApiError ? save.error.message : "Something went wrong."}
        </p>
      )}
      <Field label="Church / Ministry name" htmlFor="name" error={errors.name?.message}>
        <Input autoComplete="organization" {...fieldA11y("name", errors.name?.message)} {...register("name")} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your role" htmlFor="ownerRole" error={errors.ownerRole?.message}>
          <Input placeholder="e.g. Lead Pastor, Media Director" {...fieldA11y("ownerRole", errors.ownerRole?.message)} {...register("ownerRole")} />
        </Field>
        <Field label="Denomination" htmlFor="denomination" optional>
          <Input {...fieldA11y("denomination")} {...register("denomination")} />
        </Field>
      </div>
      <Field label="Website" htmlFor="website" error={errors.website?.message} optional>
        <Input type="url" inputMode="url" placeholder="https://" {...fieldA11y("website", errors.website?.message)} {...register("website")} />
      </Field>
      <p className="text-xs text-muted-foreground">
        You can add your logo, brand colors and AI writing preferences any time in Settings.
      </p>
      <div className="flex justify-end pt-2">
        <Button type="submit" size="lg" loading={save.isPending}>
          Create workspace
        </Button>
      </div>
    </form>
  );
}
