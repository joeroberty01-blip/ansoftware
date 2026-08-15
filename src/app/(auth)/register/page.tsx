"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { User, Mail, Phone, Lock, ShieldCheck, ArrowRight } from "lucide-react";
import {
  adminSignupSchema,
  staffSignupSchema,
  type AdminSignupInput,
  type StaffSignupInput,
} from "@/lib/validation/auth";
import { AuthShell } from "../_components/auth-shell";
import { BrandMark } from "../_components/brand-mark";
import { IconInput } from "../_components/icon-input";

type Tab = "ADMIN" | "STAFF";

const PROFESSIONS: { value: StaffSignupInput["profession"]; label: string }[] = [
  { value: "NURSE", label: "Nurse" },
  { value: "DOCTOR", label: "Doctor" },
  { value: "CHW", label: "CHW" },
  { value: "ADMIN_STAFF", label: "Admin Staff" },
];

export default function RegisterPage() {
  const [tab, setTab] = useState<Tab>("ADMIN");

  return (
    <AuthShell>
      <div className="w-full max-w-md rounded-2xl border border-zinc-100 bg-white p-8 shadow-xl shadow-zinc-200/50">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrandMark size="md" />
          <div>
            <h1 className="text-xl font-bold text-zinc-900">
              Create your account
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Get started with Afya Nyumbani ERP
            </p>
          </div>
        </div>

        <div className="mt-6 flex rounded-full border border-zinc-200 bg-zinc-50 p-1">
          <button
            type="button"
            onClick={() => setTab("ADMIN")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
              tab === "ADMIN"
                ? "bg-brand-blue text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            Admin
          </button>
          <button
            type="button"
            onClick={() => setTab("STAFF")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
              tab === "STAFF"
                ? "bg-brand-blue text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            <User className="h-4 w-4" />
            Staff
          </button>
        </div>

        <div className="mt-6">
          {tab === "ADMIN" ? <AdminForm /> : <StaffForm />}
        </div>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Una akaunti tayari?{" "}
          <Link href="/login" className="font-semibold text-brand-blue hover:text-brand-blue-dark">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

function AdminForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminSignupInput>({
    resolver: zodResolver(adminSignupSchema),
  });

  const onSubmit = async (data: AdminSignupInput) => {
    setServerError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountType: "ADMIN", ...data }),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error ?? "Imeshindwa kusajili. Jaribu tena.");
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
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <IconInput
        id="admin-fullName"
        icon={User}
        label="Full name"
        placeholder="Joe Robert"
        error={errors.fullName?.message}
        {...register("fullName")}
      />

      <IconInput
        id="admin-email"
        icon={Mail}
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="joe@example.com"
        error={errors.email?.message}
        {...register("email")}
      />

      <IconInput
        id="admin-phone"
        icon={Phone}
        label="Phone number"
        type="tel"
        placeholder="0700 000 000"
        error={errors.phone?.message}
        {...register("phone")}
      />

      <IconInput
        id="admin-password"
        icon={Lock}
        label="Password"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register("password")}
      />

      <div className="rounded-xl border border-brand-blue-light bg-brand-blue-light/40 p-4">
        <div className="mb-2 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-brand-blue" />
          <p className="text-sm font-semibold text-zinc-800">
            Admin Verification
          </p>
        </div>
        <p className="mb-3 text-xs text-zinc-500">
          Enter your authorized admin code to continue.
        </p>
        <IconInput
          id="admin-secret"
          icon={ShieldCheck}
          label="Admin secret code"
          type="password"
          error={errors.adminSecretCode?.message}
          {...register("adminSecretCode")}
        />
      </div>

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
        {submitting ? "Inasajili..." : "Create Admin Account"}
        {!submitting && <ArrowRight className="h-4 w-4" />}
      </button>
    </form>
  );
}

function StaffForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StaffSignupInput>({
    resolver: zodResolver(staffSignupSchema),
    defaultValues: { profession: "NURSE" },
  });

  const onSubmit = async (data: StaffSignupInput) => {
    setServerError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountType: "STAFF", ...data }),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error ?? "Imeshindwa kusajili. Jaribu tena.");
        return;
      }
      setRegistered(true);
    } catch {
      setServerError("Network error. Jaribu tena.");
    } finally {
      setSubmitting(false);
    }
  };

  if (registered) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Umesajiliwa, inasubiri idhini ya Admin.
        </p>
        <Link
          href="/login"
          className="w-full rounded-xl bg-gradient-to-r from-brand-blue to-brand-blue-dark px-4 py-3 text-center text-sm font-semibold text-white shadow-md shadow-brand-blue/25"
        >
          Rudi kwenye Login
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <IconInput
        id="staff-fullName"
        icon={User}
        label="Full name"
        placeholder="Jina lako"
        error={errors.fullName?.message}
        {...register("fullName")}
      />

      <IconInput
        id="staff-email"
        icon={Mail}
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="wewe@example.com"
        error={errors.email?.message}
        {...register("email")}
      />

      <IconInput
        id="staff-phone"
        icon={Phone}
        label="Phone number"
        type="tel"
        placeholder="0700 000 000"
        error={errors.phone?.message}
        {...register("phone")}
      />

      <IconInput
        id="staff-password"
        icon={Lock}
        label="Password"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register("password")}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="staff-profession" className="text-sm font-medium text-zinc-700">
          Taaluma
        </label>
        <select
          id="staff-profession"
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
          {...register("profession")}
        >
          {PROFESSIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        {errors.profession && (
          <p className="text-xs text-red-600">{errors.profession.message}</p>
        )}
      </div>

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
        {submitting ? "Inasajili..." : "Create Staff Account"}
        {!submitting && <ArrowRight className="h-4 w-4" />}
      </button>
    </form>
  );
}
