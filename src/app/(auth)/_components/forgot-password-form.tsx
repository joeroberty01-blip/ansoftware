"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Lock, Mail, ShieldCheck } from "@/components/icons";
import {
  forgotPasswordRequestSchema,
  resetPasswordSchema,
  type ForgotPasswordRequestInput,
  type ResetPasswordInput,
} from "@/lib/validation/auth";
import { BrandMark } from "./brand-mark";
import { IconInput } from "./icon-input";

type ApiResponse = {
  error?: string;
  message?: string;
};

const RESEND_WAIT_SECONDS = 60;

async function post(url: string, data: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = (await response.json().catch(() => null)) as ApiResponse | null;
  return { ok: response.ok, result };
}

/**
 * "Forgot password?" in two steps:
 *  1. enter email -> a 6-digit code is emailed
 *  2. enter the code and a new password
 */
export function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  const requestForm = useForm<ForgotPasswordRequestInput>({
    resolver: zodResolver(forgotPasswordRequestSchema),
  });
  const resetForm = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    if (!successMessage) return;
    const timer = window.setTimeout(() => router.push("/login"), 2000);
    return () => window.clearTimeout(timer);
  }, [successMessage, router]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const sendCode = async (address: string) => {
    setServerError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const { ok, result } = await post("/api/auth/forgot-password", { email: address });
      if (!ok) {
        setServerError(result?.error ?? "Could not send the code. Please try again.");
        return;
      }
      setEmail(address);
      resetForm.setValue("email", address);
      setNotice(result?.message ?? "We sent a code to your email.");
      setResendIn(RESEND_WAIT_SECONDS);
    } catch {
      setServerError("No network connection. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const onReset = async (data: ResetPasswordInput) => {
    setServerError(null);
    setSubmitting(true);
    try {
      const { ok, result } = await post("/api/auth/reset-password", data);
      if (!ok) {
        setServerError(result?.error ?? "Could not change the password.");
        return;
      }
      setSuccessMessage(result?.message ?? "Password changed. You can now sign in.");
    } catch {
      setServerError("No network connection. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const buttonClass =
    "mt-2 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-blue to-brand-blue-dark px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-blue/25 transition-opacity hover:opacity-95 disabled:opacity-50";

  const errorBox = serverError && (
    <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      {serverError}
    </p>
  );

  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-100 bg-white p-6 shadow-xl shadow-zinc-200/50 sm:p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <BrandMark size="md" />
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Forgot password?</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {email
              ? "Enter the code we emailed you and a new password."
              : "Enter your email. We'll send you a 6-digit code."}
          </p>
        </div>
      </div>

      {successMessage ? (
        <div
          className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-800"
          role="status"
          aria-live="polite"
        >
          <p className="font-semibold">{successMessage}</p>
          <p className="mt-1">Taking you to the login...</p>
        </div>
      ) : !email ? (
        <form
          onSubmit={requestForm.handleSubmit((d) => sendCode(d.email.trim().toLowerCase()))}
          className="mt-6 flex flex-col gap-4"
          noValidate
        >
          <IconInput
            id="email"
            icon={Mail}
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            error={requestForm.formState.errors.email?.message}
            {...requestForm.register("email")}
          />
          {errorBox}
          <button type="submit" disabled={submitting} className={buttonClass}>
            {submitting ? "Inatuma..." : "Send code"}
            {!submitting && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>
      ) : (
        <form
          onSubmit={resetForm.handleSubmit(onReset)}
          className="mt-6 flex flex-col gap-4"
          noValidate
        >
          {notice && (
            <p
              className="rounded-xl bg-brand-blue-light px-3 py-2 text-sm text-brand-blue"
              role="status"
              aria-live="polite"
            >
              {notice}
            </p>
          )}
          <p className="text-sm text-zinc-600">
            Email: <span className="font-medium text-zinc-900 break-all">{email}</span>{" "}
            <button
              type="button"
              onClick={() => {
                setEmail(null);
                setNotice(null);
                setServerError(null);
                resetForm.reset();
              }}
              className="font-semibold text-brand-blue hover:text-brand-blue-dark"
            >
              Change
            </button>
          </p>
          <input type="hidden" {...resetForm.register("email")} />

          <IconInput
            id="code"
            icon={ShieldCheck}
            label="6-digit code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            error={resetForm.formState.errors.code?.message}
            {...resetForm.register("code")}
          />

          <IconInput
            id="newPassword"
            icon={Lock}
            label="New password"
            type="password"
            autoComplete="new-password"
            error={resetForm.formState.errors.newPassword?.message}
            {...resetForm.register("newPassword")}
          />

          <IconInput
            id="confirmPassword"
            icon={Lock}
            label="Repeat new password"
            type="password"
            autoComplete="new-password"
            error={resetForm.formState.errors.confirmPassword?.message}
            {...resetForm.register("confirmPassword")}
          />

          {errorBox}

          <button type="submit" disabled={submitting} className={buttonClass}>
            {submitting ? "Inabadilisha..." : "Change password"}
            {!submitting && <ArrowRight className="h-4 w-4" />}
          </button>

          <button
            type="button"
            disabled={submitting || resendIn > 0}
            onClick={() => sendCode(email)}
            className="min-h-11 text-sm font-semibold text-brand-blue hover:text-brand-blue-dark disabled:text-zinc-400"
          >
            {resendIn > 0 ? `Resend code (${resendIn}s)` : "Resend code"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-zinc-500">
        <Link href="/login" className="font-semibold text-brand-blue hover:text-brand-blue-dark">
          Back to login
        </Link>
      </p>
    </div>
  );
}
