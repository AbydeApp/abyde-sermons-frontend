"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Input, fieldA11y } from "@/components/ui/input";
import { useMockApi } from "@/config/env";
import { SESSION_KEY, homeFor, useSession } from "@/hooks/use-session";
import {
  forgotSchema,
  loginSchema,
  resetSchema,
  signupSchema,
  type ForgotValues,
  type LoginValues,
  type ResetValues,
  type SignupValues,
} from "@/schemas/auth";
import { ApiError } from "@/services/api-client";
import { authService } from "@/services/auth.service";
import { brandService } from "@/services/brand.service";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/services/mock/seed";
import type { Session } from "@/types";

/** Already signed in? Skip the form and go where the session belongs. */
function useRedirectIfAuthenticated() {
  const router = useRouter();
  const { data } = useSession();
  useEffect(() => {
    if (data) router.replace(homeFor(data));
  }, [data, router]);
}

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md border border-danger/20 bg-danger-soft px-3 py-2 text-[13px] text-danger">
      {message}
    </p>
  );
}

export function LoginForm() {
  const router = useRouter();
  const qc = useQueryClient();
  useRedirectIfAuthenticated();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "", remember: true } });

  const login = useMutation({
    mutationFn: authService.login,
    onSuccess: (session: Session) => {
      qc.setQueryData(SESSION_KEY, session);
      router.replace(homeFor(session));
    },
  });

  return (
    <form onSubmit={handleSubmit((v) => login.mutate(v))} className="space-y-4" noValidate>
      <FormError message={login.error instanceof ApiError ? login.error.message : login.error ? "Something went wrong." : undefined} />
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input type="email" autoComplete="email" {...fieldA11y("email", errors.email?.message)} {...register("email")} />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password?.message}>
        <Input type="password" autoComplete="current-password" {...fieldA11y("password", errors.password?.message)} {...register("password")} />
      </Field>
      <div className="flex items-center justify-between">
        <Controller
          control={control}
          name="remember"
          render={({ field }) => (
            <label className="flex items-center gap-2 text-[13px]">
              <Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} />
              Remember me
            </label>
          )}
        />
        <Link href="/forgot-password" className="text-[13px] text-accent hover:underline">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" className="w-full" size="lg" loading={login.isPending}>
        Sign In
      </Button>
      {useMockApi && (
        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          Demo mode (no API configured). Try <span className="font-mono">{DEMO_EMAIL}</span> / <span className="font-mono">{DEMO_PASSWORD}</span>, or create a new account.
        </p>
      )}
    </form>
  );
}

export function SignupForm() {
  const router = useRouter();
  const qc = useQueryClient();
  const logoInput = useRef<HTMLInputElement>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  useRedirectIfAuthenticated();
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phoneNumber: "",
      churchName: "",
      denomination: "",
      churchAddress: "",
      primaryColor: "",
      secondaryColor: "",
      accentColor: "",
    },
  });
  const [primaryColor, secondaryColor, accentColor] = useWatch({
    control,
    name: ["primaryColor", "secondaryColor", "accentColor"],
  });

  const signup = useMutation({
    mutationFn: async ({ values, logo }: { values: SignupValues; logo: File | null }) => {
      const { confirmPassword: _c, ...rest } = values;
      void _c;
      const churchName = rest.churchName?.trim() || undefined;
      const denomination = rest.denomination?.trim() || undefined;
      const churchAddress = rest.churchAddress?.trim() || undefined;
      const primaryColor = rest.primaryColor?.trim() || undefined;
      const secondaryColor = rest.secondaryColor?.trim() || undefined;
      const accentColor = rest.accentColor?.trim() || undefined;
      const session = await authService.register({
        ...rest,
        churchName,
        denomination,
        churchAddress,
        primaryColor,
        secondaryColor,
        accentColor,
      });
      let brandSetupError: unknown;
      if (logo || primaryColor || secondaryColor || accentColor) {
        try {
          const logoAssetId = logo ? await brandService.uploadAsset(logo, "LOGO") : undefined;
          const brand = await brandService.get();
          await brandService.save({
            ...brand,
            ...(primaryColor ? { primaryColor } : {}),
            ...(secondaryColor ? { secondaryColor } : {}),
            ...(accentColor ? { accentColor } : {}),
            ...(logoAssetId ? { logoAssetId } : {}),
          });
        } catch (error) {
          brandSetupError = error;
        }
      }
      return { session, brandSetupError };
    },
    onSuccess: ({ session, brandSetupError }) => {
      qc.setQueryData(SESSION_KEY, session);
      router.replace("/brand-studio");
      if (brandSetupError) toast.error("Your account was created, but the logo or preferred colors couldn't be saved. You can add them in Brand Studio.");
    },
    onError: (err) => {
      if (err instanceof ApiError && err.fields?.email) setError("email", { message: err.message });
    },
  });

  return (
    <form onSubmit={handleSubmit((values) => signup.mutate({ values, logo: logoFile }))} className="space-y-4" noValidate>
      <FormError message={signup.error instanceof ApiError && !signup.error.fields ? signup.error.message : undefined} />
      <Field label="Full name" htmlFor="fullName" error={errors.fullName?.message}>
        <Input autoComplete="name" {...fieldA11y("fullName", errors.fullName?.message)} {...register("fullName")} />
      </Field>
      <Field label="Phone number" htmlFor="phoneNumber" error={errors.phoneNumber?.message} hint="Include your country code if applicable.">
        <Input type="tel" autoComplete="tel" {...fieldA11y("phoneNumber", errors.phoneNumber?.message, "hint")} {...register("phoneNumber")} />
      </Field>
      <Field label="Church / Ministry name" htmlFor="churchName" optional error={errors.churchName?.message}>
        <Input autoComplete="organization" {...fieldA11y("churchName", errors.churchName?.message)} {...register("churchName")} />
      </Field>
      <Field label="Denomination" htmlFor="denomination" optional error={errors.denomination?.message}>
        <Input {...fieldA11y("denomination", errors.denomination?.message)} {...register("denomination")} />
      </Field>
      <Field label="Church / Ministry address" htmlFor="churchAddress" optional error={errors.churchAddress?.message}>
        <Input autoComplete="street-address" {...fieldA11y("churchAddress", errors.churchAddress?.message)} {...register("churchAddress")} />
      </Field>
      <Field label="Church / Ministry logo" htmlFor="churchLogo" optional hint="PNG, JPG, SVG, or WebP · max 8 MB">
        <div className="flex items-center gap-3">
          <Input
            ref={logoInput}
            id="churchLogo"
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            aria-describedby="churchLogo-hint"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              if (!/^image\/(png|jpe?g|svg\+xml|webp)$/.test(file.type)) {
                toast.error("Use a PNG, JPG, SVG or WebP image.");
                event.target.value = "";
                return;
              }
              if (file.size > 8 * 1024 ** 2) {
                toast.error("Images must be under 8 MB.");
                event.target.value = "";
                return;
              }
              setLogoFile(file);
            }}
          />
          {logoFile && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove selected church logo"
              onClick={() => {
                setLogoFile(null);
                if (logoInput.current) logoInput.current.value = "";
              }}
            >
              <X />
            </Button>
          )}
        </div>
      </Field>
      <fieldset className="space-y-3">
        <legend className="text-[13px] font-medium">Preferred colors <span className="font-normal text-muted-foreground">(optional)</span></legend>
        {([
          ["primaryColor", "Primary color", primaryColor],
          ["secondaryColor", "Secondary color", secondaryColor],
          ["accentColor", "Accent color", accentColor],
        ] as const).map(([name, label, value]) => {
          const error = errors[name]?.message;
          return (
            <Field key={name} label={label} htmlFor={name} error={error}>
              <div className="flex gap-2">
                <input
                  type="color"
                  aria-label={`${label} picker`}
                  value={value && /^#[0-9a-f]{6}$/i.test(value) ? value : "#b5502f"}
                  onChange={(event) => setValue(name, event.target.value.toUpperCase(), { shouldDirty: true, shouldValidate: true })}
                  className="h-9 w-11 shrink-0 cursor-pointer rounded-md border border-border-strong bg-card p-1"
                />
                <Input {...fieldA11y(name, error)} placeholder="#B5502F" {...register(name)} />
              </div>
            </Field>
          );
        })}
      </fieldset>
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input type="email" autoComplete="email" {...fieldA11y("email", errors.email?.message)} {...register("email")} />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password?.message} hint="At least 8 characters, with a letter and a number.">
        <Input type="password" autoComplete="new-password" {...fieldA11y("password", errors.password?.message, "hint")} {...register("password")} />
      </Field>
      <Field label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
        <Input type="password" autoComplete="new-password" {...fieldA11y("confirmPassword", errors.confirmPassword?.message)} {...register("confirmPassword")} />
      </Field>
      <Button type="submit" className="w-full" size="lg" loading={signup.isPending}>
        Create Account
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        By creating an account you agree to the Terms of Service and Privacy Policy.
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [sent, setSent] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" } });
  const forgot = useMutation({ mutationFn: authService.forgotPassword });

  if (sent) {
    return (
      <div className="rounded-lg border border-border bg-card p-5 text-sm" role="status">
        <CheckCircle2 className="mb-2 size-5 text-success" aria-hidden />
        <p className="font-medium">Check your inbox</p>
        <p className="mt-1 text-muted-foreground">
          If an account exists for <span className="text-foreground">{sent}</span>, we&apos;ve sent a link to reset your password.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((v) => forgot.mutate(v, { onSuccess: () => setSent(v.email) }))}
      className="space-y-4"
      noValidate
    >
      <FormError message={forgot.error instanceof ApiError ? forgot.error.message : undefined} />
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input type="email" autoComplete="email" {...fieldA11y("email", errors.email?.message)} {...register("email")} />
      </Field>
      <Button type="submit" className="w-full" size="lg" loading={forgot.isPending}>
        Send reset link
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token?: string }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetValues>({ resolver: zodResolver(resetSchema), defaultValues: { password: "", confirmPassword: "" } });
  const reset = useMutation({
    mutationFn: ({ confirmPassword: _c, ...rest }: ResetValues) => {
      void _c;
      return authService.resetPassword({ ...rest, token: token ?? "" });
    },
    onSuccess: () => router.replace("/login"),
  });

  if (!token) {
    return (
      <div role="alert" className="rounded-lg border border-border bg-card p-5 text-sm">
        <p className="font-medium">This reset link is invalid or has expired.</p>
        <Link href="/forgot-password" className="mt-2 inline-block text-accent hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit((v) => reset.mutate(v))} className="space-y-4" noValidate>
      <FormError message={reset.error instanceof ApiError ? reset.error.message : undefined} />
      <Field label="New password" htmlFor="password" error={errors.password?.message}>
        <Input type="password" autoComplete="new-password" {...fieldA11y("password", errors.password?.message)} {...register("password")} />
      </Field>
      <Field label="Confirm new password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
        <Input type="password" autoComplete="new-password" {...fieldA11y("confirmPassword", errors.confirmPassword?.message)} {...register("confirmPassword")} />
      </Field>
      <Button type="submit" className="w-full" size="lg" loading={reset.isPending}>
        Reset password
      </Button>
    </form>
  );
}
