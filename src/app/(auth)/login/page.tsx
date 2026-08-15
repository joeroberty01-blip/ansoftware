"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { AuthShell } from "../_components/auth-shell";
import { BrandMark } from "../_components/brand-mark";
import { IconInput } from "../_components/icon-input";

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setServerError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error ?? "Imeshindwa kuingia. Jaribu tena.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setServerError("Network error. Jaribu tena.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <div className="w-full max-w-md rounded-2xl border border-zinc-100 bg-white p-8 shadow-xl shadow-zinc-200/50">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrandMark size="md" />
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Welcome back</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Sign in to Afya Nyumbani ERP
            </p>
          </div>
        </div>

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
            placeholder="wewe@example.com"
            error={errors.email?.message}
            {...register("email")}
          />

          <IconInput
            id="password"
            icon={Lock}
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
          />

          {serverError && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-blue to-brand-blue-dark px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-blue/25 transition-opacity hover:opacity-95 disabled:opacity-50"
          >
            {submitting ? "Inaingia..." : "Sign in"}
            {!submitting && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Huna akaunti?{" "}
          <Link
            href="/register"
            className="font-semibold text-brand-blue hover:text-brand-blue-dark"
          >
            Jisajili
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
