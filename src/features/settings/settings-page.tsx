"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ContentCard } from "@/components/shared/cards";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea, fieldA11y } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SESSION_KEY, useSession } from "@/hooks/use-session";
import { churchSchema, type ChurchValues } from "@/schemas/onboarding";
import { accountSchema, passwordChangeSchema, type AccountValues, type PasswordChangeValues } from "@/schemas/settings";
import { ApiError } from "@/services/api-client";
import { authService } from "@/services/auth.service";
import { churchService } from "@/services/church.service";

const errText = (e: unknown) => (e instanceof ApiError ? e.message : "Couldn't save. Please try again.");

function SaveBar({ pending, dirty }: { pending: boolean; dirty: boolean }) {
  return (
    <div className="flex justify-end pt-2">
      <Button type="submit" loading={pending} disabled={!dirty}>
        Save changes
      </Button>
    </div>
  );
}

function AccountSection() {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<AccountValues>({ resolver: zodResolver(accountSchema), defaultValues: { fullName: "", email: "", phoneNumber: "" } });
  useEffect(() => {
    if (session) reset({ fullName: session.user.fullName, email: session.user.email, phoneNumber: session.user.phoneNumber ?? "" });
  }, [session, reset]);
  const save = useMutation({
    mutationFn: authService.updateAccount,
    onSuccess: (s) => {
      qc.setQueryData(SESSION_KEY, s);
      toast.success("Account updated");
    },
    onError: (e) => toast.error(errText(e)),
  });
  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4" noValidate>
      <Field label="Full name" htmlFor="acc-name" error={errors.fullName?.message}>
        <Input {...fieldA11y("acc-name", errors.fullName?.message)} {...register("fullName")} />
      </Field>
      <Field label="Email" htmlFor="acc-email" error={errors.email?.message}>
        <Input type="email" {...fieldA11y("acc-email", errors.email?.message)} {...register("email")} />
      </Field>
      <Field label="Phone number" htmlFor="acc-phone" optional error={errors.phoneNumber?.message} hint="Include your country code if applicable.">
        <Input type="tel" autoComplete="tel" {...fieldA11y("acc-phone", errors.phoneNumber?.message, "hint")} {...register("phoneNumber")} />
      </Field>
      <SaveBar pending={save.isPending} dirty={isDirty} />
    </form>
  );
}

/** Church profile and brand are edited through PATCH /church. */
function useChurchSave(success: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: churchService.update,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SESSION_KEY });
      toast.success(success);
    },
    onError: (e) => toast.error(errText(e)),
  });
}

function ChurchSection() {
  const { data: session } = useSession();
  const save = useChurchSave("Church profile updated");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ChurchValues>({ resolver: zodResolver(churchSchema), defaultValues: { name: "", ownerRole: "" } });
  useEffect(() => {
    const c = session?.church;
    if (c) reset({ name: c.name, ownerRole: c.ownerRole, denomination: c.denomination ?? "", address: c.address ?? "", website: c.website ?? "" });
  }, [session?.church, reset]);
  return (
    <form onSubmit={handleSubmit((v) => save.mutate({ ...v, denomination: v.denomination ?? "", address: v.address ?? "", website: v.website ?? "" }))} className="space-y-4" noValidate>
      <Field label="Church / Ministry name" htmlFor="ch-name" error={errors.name?.message}>
        <Input {...fieldA11y("ch-name", errors.name?.message)} {...register("name")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your role" htmlFor="ch-role" error={errors.ownerRole?.message}>
          <Input {...fieldA11y("ch-role", errors.ownerRole?.message)} {...register("ownerRole")} />
        </Field>
        <Field label="Denomination" htmlFor="ch-den" optional>
          <Input {...fieldA11y("ch-den")} {...register("denomination")} />
        </Field>
      </div>
      <Field label="Church / Ministry address" htmlFor="ch-addr" optional>
        <Input autoComplete="street-address" {...fieldA11y("ch-addr")} {...register("address")} />
      </Field>
      <Field label="Website" htmlFor="ch-web" error={errors.website?.message} optional>
        <Input {...fieldA11y("ch-web", errors.website?.message)} {...register("website")} />
      </Field>
      <SaveBar pending={save.isPending} dirty={isDirty} />
    </form>
  );
}

function BrandPointer() {
  return (
    <div className="space-y-3 text-sm">
      <p>Your logo, colors, fonts, voice and templates now live in Brand Studio, with a live preview.</p>
      <Button asChild>
        <Link href="/brand-studio">Open Brand Studio</Link>
      </Button>
    </div>
  );
}

function SecuritySection() {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<PasswordChangeValues>({ resolver: zodResolver(passwordChangeSchema), defaultValues: { current: "", next: "", confirm: "" } });
  const save = useMutation({
    mutationFn: (v: PasswordChangeValues) => authService.changePassword({ current: v.current, next: v.next }),
    onSuccess: () => {
      toast.success("Password changed");
      reset();
    },
    onError: (e) => {
      if (e instanceof ApiError && e.fields?.currentPassword) setError("current", { message: e.fields.currentPassword === "Incorrect" ? e.message : e.fields.currentPassword });
      else toast.error(errText(e));
    },
  });
  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} className="max-w-sm space-y-4" noValidate>
      <Field label="Current password" htmlFor="sec-cur" error={errors.current?.message}>
        <Input type="password" autoComplete="current-password" {...fieldA11y("sec-cur", errors.current?.message)} {...register("current")} />
      </Field>
      <Field label="New password" htmlFor="sec-new" error={errors.next?.message}>
        <Input type="password" autoComplete="new-password" {...fieldA11y("sec-new", errors.next?.message)} {...register("next")} />
      </Field>
      <Field label="Confirm new password" htmlFor="sec-conf" error={errors.confirm?.message}>
        <Input type="password" autoComplete="new-password" {...fieldA11y("sec-conf", errors.confirm?.message)} {...register("confirm")} />
      </Field>
      <Button type="submit" loading={save.isPending}>
        Change password
      </Button>
    </form>
  );
}

const SECTIONS = [
  { value: "account", label: "Account", node: <AccountSection /> },
  { value: "church", label: "Church Profile", node: <ChurchSection /> },
  { value: "brand", label: "Brand", node: <BrandPointer /> },
  { value: "security", label: "Security", node: <SecuritySection /> },
];

export function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <Tabs defaultValue="account">
        <TabsList>
          {SECTIONS.map((s) => (
            <TabsTrigger key={s.value} value={s.value}>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {SECTIONS.map((s) => (
          <TabsContent key={s.value} value={s.value}>
            <ContentCard bodyClassName="p-5" className="max-w-2xl">
              {s.node}
            </ContentCard>
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}
