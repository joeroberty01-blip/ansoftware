"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import {
  adminSignupSchema,
  staffSignupSchema,
  type AdminSignupInput,
  type StaffSignupInput,
} from "@/lib/validation/auth";

type Tab = "ADMIN" | "STAFF";

const PROFESSIONS: { value: StaffSignupInput["profession"]; label: string }[] = [
  { value: "NURSE", label: "Nurse" },
  { value: "DOCTOR", label: "Doctor" },
  { value: "CHW", label: "CHW" },
  { value: "ADMIN_STAFF", label: "Admin Staff" },
];

const inputClass =
  "rounded border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none";
const labelClass = "text-sm font-medium text-zinc-700";
const errorClass = "text-sm text-red-600";

export default function RegisterPage() {
  const [tab, setTab] = useState<Tab>("ADMIN");

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-10">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-center text-xl font-semibold text-zinc-900">
          Jisajili — Afya Nyumbani ERP
        </h1>

        <div className="mb-6 flex rounded border border-zinc-300 p-1">
          <button
            type="button"
            onClick={() => setTab("ADMIN")}
            className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === "ADMIN"
                ? "bg-brand-blue text-white"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => setTab("STAFF")}
            className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === "STAFF"
                ? "bg-brand-blue text-white"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            Staff
          </button>
        </div>

        {tab === "ADMIN" ? <AdminForm /> : <StaffForm />}

        <p className="mt-6 text-center text-sm text-zinc-600">
          Una akaunti tayari?{" "}
          <Link href="/login" className="font-medium text-zinc-900 underline">
            Ingia
          </Link>
        </p>
      </div>
    </div>
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
      setServerError("Hitilafu ya mtandao. Jaribu tena.");
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
      <div className="flex flex-col gap-1">
        <label htmlFor="admin-fullName" className={labelClass}>
          Jina kamili
        </label>
        <input
          id="admin-fullName"
          className={inputClass}
          {...register("fullName")}
        />
        {errors.fullName && (
          <p className={errorClass}>{errors.fullName.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="admin-email" className={labelClass}>
          Barua pepe
        </label>
        <input
          id="admin-email"
          type="email"
          autoComplete="email"
          className={inputClass}
          {...register("email")}
        />
        {errors.email && <p className={errorClass}>{errors.email.message}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="admin-phone" className={labelClass}>
          Namba ya simu
        </label>
        <input
          id="admin-phone"
          type="tel"
          className={inputClass}
          {...register("phone")}
        />
        {errors.phone && <p className={errorClass}>{errors.phone.message}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="admin-password" className={labelClass}>
          Password
        </label>
        <input
          id="admin-password"
          type="password"
          autoComplete="new-password"
          className={inputClass}
          {...register("password")}
        />
        {errors.password && (
          <p className={errorClass}>{errors.password.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="admin-secret" className={labelClass}>
          Admin secret code
        </label>
        <input
          id="admin-secret"
          type="password"
          className={inputClass}
          {...register("adminSecretCode")}
        />
        {errors.adminSecretCode && (
          <p className={errorClass}>{errors.adminSecretCode.message}</p>
        )}
      </div>

      {serverError && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 rounded bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-50"
      >
        {submitting ? "Inasajili..." : "Jisajili kama Admin"}
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
      setServerError("Hitilafu ya mtandao. Jaribu tena.");
    } finally {
      setSubmitting(false);
    }
  };

  if (registered) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <p className="rounded bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Umesajiliwa, inasubiri idhini ya Admin.
        </p>
        <Link
          href="/login"
          className="w-full rounded bg-brand-blue px-4 py-2 text-center text-sm font-medium text-white hover:bg-brand-blue-dark"
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
      <div className="flex flex-col gap-1">
        <label htmlFor="staff-fullName" className={labelClass}>
          Jina kamili
        </label>
        <input
          id="staff-fullName"
          className={inputClass}
          {...register("fullName")}
        />
        {errors.fullName && (
          <p className={errorClass}>{errors.fullName.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="staff-email" className={labelClass}>
          Barua pepe
        </label>
        <input
          id="staff-email"
          type="email"
          autoComplete="email"
          className={inputClass}
          {...register("email")}
        />
        {errors.email && <p className={errorClass}>{errors.email.message}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="staff-phone" className={labelClass}>
          Namba ya simu
        </label>
        <input
          id="staff-phone"
          type="tel"
          className={inputClass}
          {...register("phone")}
        />
        {errors.phone && <p className={errorClass}>{errors.phone.message}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="staff-password" className={labelClass}>
          Password
        </label>
        <input
          id="staff-password"
          type="password"
          autoComplete="new-password"
          className={inputClass}
          {...register("password")}
        />
        {errors.password && (
          <p className={errorClass}>{errors.password.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="staff-profession" className={labelClass}>
          Taaluma
        </label>
        <select
          id="staff-profession"
          className={inputClass}
          {...register("profession")}
        >
          {PROFESSIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        {errors.profession && (
          <p className={errorClass}>{errors.profession.message}</p>
        )}
      </div>

      {serverError && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 rounded bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-50"
      >
        {submitting ? "Inasajili..." : "Jisajili kama Staff"}
      </button>
    </form>
  );
}
