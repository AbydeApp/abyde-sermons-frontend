"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
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
  OTP_LENGTH,
  otpSchema,
  resetSchema,
  signupSchema,
  type ForgotValues,
  type LoginValues,
  type OtpValues,
  type ResetValues,
  type SignupValues,
} from "@/schemas/auth";
import { ApiError } from "@/services/api-client";
import { authService } from "@/services/auth.service";
import { DEMO_EMAIL, DEMO_OTP, DEMO_PASSWORD } from "@/services/mock/seed";
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

const PENDING_EMAIL_KEY = "abyde:pending-email";

/** The email awaiting verification lives in sessionStorage so it stays out of URLs and history. */
function setPendingEmail(email: string | null) {
  try {
    if (email) sessionStorage.setItem(PENDING_EMAIL_KEY, email);
    else sessionStorage.removeItem(PENDING_EMAIL_KEY);
  } catch {
    /* storage unavailable: the verify page will ask the user to start again */
  }
}
const readPendingEmail = () => {
  try {
    return sessionStorage.getItem(PENDING_EMAIL_KEY);
  } catch {
    return null;
  }
};
const noSubscribe = () => () => undefined;

function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className="pr-10" />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
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
    onError: (err, values) => {
      // The account exists but the email was never confirmed: a fresh code was sent, so finish verifying.
      if (err instanceof ApiError && err.code === "EMAIL_NOT_VERIFIED") {
        setPendingEmail(values.email.trim().toLowerCase());
        router.push("/verify-email");
      }
    },
  });

  return (
    <form onSubmit={handleSubmit((v) => login.mutate(v))} className="space-y-4" noValidate>
      <FormError message={login.error instanceof ApiError ? (login.error.code === "EMAIL_NOT_VERIFIED" ? undefined : login.error.message) : login.error ? "Something went wrong." : undefined} />
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input type="email" autoComplete="email" {...fieldA11y("email", errors.email?.message)} {...register("email")} />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password?.message}>
        <PasswordInput autoComplete="current-password" {...fieldA11y("password", errors.password?.message)} {...register("password")} />
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
  useRedirectIfAuthenticated();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", email: "", password: "", churchName: "" },
  });

  const signup = useMutation({
    mutationFn: (values: SignupValues) => authService.register({ ...values, churchName: values.churchName?.trim() || undefined }),
    onSuccess: ({ email }) => {
      setPendingEmail(email.trim().toLowerCase());
      router.push("/verify-email");
    },
    onError: (err) => {
      if (err instanceof ApiError && err.fields?.email) setError("email", { message: err.message });
    },
  });

  return (
    <form onSubmit={handleSubmit((values) => signup.mutate(values))} className="space-y-4" noValidate>
      <FormError message={signup.error instanceof ApiError && !signup.error.fields ? signup.error.message : undefined} />
      <Field label="Full name" htmlFor="fullName" error={errors.fullName?.message}>
        <Input autoComplete="name" {...fieldA11y("fullName", errors.fullName?.message)} {...register("fullName")} />
      </Field>
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input type="email" autoComplete="email" {...fieldA11y("email", errors.email?.message)} {...register("email")} />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password?.message} hint="At least 8 characters, with a letter and a number.">
        <PasswordInput autoComplete="new-password" {...fieldA11y("password", errors.password?.message, "hint")} {...register("password")} />
      </Field>
      <Field label="Church / Ministry name" htmlFor="churchName" optional error={errors.churchName?.message}>
        <Input autoComplete="organization" {...fieldA11y("churchName", errors.churchName?.message)} {...register("churchName")} />
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

const RESEND_SECONDS = 30;

export function VerifyEmailForm() {
  const router = useRouter();
  const qc = useQueryClient();
  useRedirectIfAuthenticated();
  // undefined while hydrating, null when there is nothing to verify.
  const email = useSyncExternalStore(noSubscribe, readPendingEmail, () => undefined);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const {
    register,
    control,
    handleSubmit,
    setError,
    setFocus,
    setValue,
    formState: { errors },
  } = useForm<OtpValues>({ resolver: zodResolver(otpSchema), defaultValues: { code: "" } });
  const code = useWatch({ control, name: "code" });

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const verify = useMutation({
    mutationFn: (v: OtpValues) => authService.verifyEmail({ email: email!, code: v.code }),
    onSuccess: (session: Session) => {
      setPendingEmail(null);
      qc.setQueryData(SESSION_KEY, session);
      toast.success("Email verified. Welcome to Abyde Sermon!");
      router.replace(homeFor(session));
    },
    onError: (err) => {
      // Clear the field so the user can retype straight away; the error stays until they do.
      setValue("code", "");
      setError("code", { message: err instanceof ApiError ? err.message : "Couldn't verify the code. Please try again." });
      setFocus("code");
    },
  });
  const resend = useMutation({
    mutationFn: () => authService.resendVerification(email!),
    onSuccess: () => {
      setCooldown(RESEND_SECONDS);
      toast.success("We sent you a new code.");
    },
    onError: () => toast.error("Couldn't send a new code. Please try again."),
  });

  // Submit as soon as the last digit is typed or pasted.
  useEffect(() => {
    if (email && code.length === OTP_LENGTH && /^\d+$/.test(code) && !verify.isPending) void handleSubmit((v) => verify.mutate(v))();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the code changing
  }, [code]);

  if (email === undefined) return null;
  if (email === null) {
    return (
      <div className="space-y-4 text-sm">
        <p>We couldn&apos;t find a signup in progress on this device.</p>
        <Button asChild className="w-full" size="lg">
          <Link href="/signup">Start again</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit((v) => verify.mutate(v))} className="space-y-4" noValidate>
      <p className="text-sm text-muted-foreground">
        We sent a {OTP_LENGTH}-digit code to <span className="font-medium text-foreground">{email}</span>. It expires in 10 minutes.
      </p>
      <Field label="Verification code" htmlFor="code" error={errors.code?.message}>
        <Input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={OTP_LENGTH}
          placeholder={"0".repeat(OTP_LENGTH)}
          autoFocus
          className="h-12 text-center font-mono text-xl tracking-[0.5em]"
          {...fieldA11y("code", errors.code?.message)}
          {...register("code", { onChange: (e) => { e.target.value = e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH); } })}
        />
      </Field>
      <Button type="submit" className="w-full" size="lg" loading={verify.isPending}>
        Verify email
      </Button>
      <div className="flex items-center justify-between text-[13px] text-muted-foreground">
        <span>Didn&apos;t get it? Check your spam folder.</span>
        <button
          type="button"
          onClick={() => resend.mutate()}
          disabled={cooldown > 0 || resend.isPending}
          className="font-medium text-accent hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </div>
      {useMockApi && (
        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          Demo mode: no email is sent. Use code <span className="font-mono">{DEMO_OTP}</span>.
        </p>
      )}
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
