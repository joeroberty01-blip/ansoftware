"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Lock, Mail, ShieldCheck } from "@/components/icons";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validation/auth";
import { BrandMark } from "./brand-mark";
import { IconInput } from "./icon-input";

type ForgotPasswordResponse = {
  error?: string;
  ok?: boolean;
};

export function ForgotPasswordForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  useEffect(() => {
    if (!completed) return;

    const timer = window.setTimeout(() => router.replace("/login"), 2000);
    return () => window.clearTimeout(timer);
  }, [completed, router]);

  const onSubmit = async (data: ForgotPasswordInput) => {
    setServerError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = (await response.json().catch(() => null)) as
        | ForgotPasswordResponse
        | null;

      if (!response.ok) {
        setServerError(
          result?.error ?? "Unable to reset your password. Please try again."
        );
        return;
      }

      setCompleted(true);
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-100 bg-white p-8 shadow-xl shadow-zinc-200/50">
      <div className="flex flex-col items-center gap-3 text-center">
        <BrandMark size="md" />
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Forgot password?</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Enter your email, recovery code, and a new password.
          </p>
        </div>
      </div>

      {completed ? (
        <div
          className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-800"
          role="status"
          aria-live="polite"
        >
          <p className="font-semibold">Your password has been updated.</p>
          <p className="mt-1">You will be redirected to sign in shortly.</p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
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
            error={errors.email?.message}
            {...register("email")}
          />

          <IconInput
            id="code"
            icon={ShieldCheck}
            label="Recovery code"
            type="text"
            autoComplete="off"
            error={errors.code?.message}
            {...register("code")}
          />

          <IconInput
            id="newPassword"
            icon={Lock}
            label="New password"
            type="password"
            autoComplete="new-password"
            error={errors.newPassword?.message}
            {...register("newPassword")}
          />

          <IconInput
            id="confirmPassword"
            icon={Lock}
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />

          {serverError && (
            <p
              className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-blue to-brand-blue-dark px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-blue/25 transition-opacity hover:opacity-95 disabled:opacity-50"
          >
            {submitting ? "Updating password..." : "Update password"}
            {!submitting && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>
      )}
    </div>
  );
}
