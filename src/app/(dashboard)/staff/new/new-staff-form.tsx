"use client";

import { useState } from "react";

const PROFESSIONS = [
  { value: "NURSE", label: "Nurse" },
  { value: "DOCTOR", label: "Doctor" },
  { value: "CHW", label: "Caregiver (CHW)" },
];

const input = "rounded border border-zinc-300 px-2 py-1.5 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-zinc-600">{label}</label>
      {children}
    </div>
  );
}

export function NewStaffForm() {
  const empty = {
    fullName: "",
    email: "",
    phone: "",
    password: "",
    profession: "NURSE",
    startDate: new Date().toISOString().slice(0, 10),
    licenseNumber: "",
    licenseExpiryDate: "",
  };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ name: string; number: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/staff/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Couldn't add the staff member.");
        return;
      }
      setDone({ name: json.staff.full_name, number: json.staff.staff_number });
      setForm(empty);
    } catch {
      setError("Couldn't add the staff member.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Add Staff Member</h1>
        <p className="text-sm text-zinc-500">
          They can sign in straight away with this email and password. The Admin sets their salary.
        </p>
      </div>

      {done && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          {done.name} was added ({done.number}). Give them their email and password to sign in.
        </div>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Full Name">
            <input value={form.fullName} onChange={set("fullName")} className={input} />
          </Field>
          <Field label="Profession">
            <select value={form.profession} onChange={set("profession")} className={input}>
              {PROFESSIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Email (used to sign in)">
            <input type="email" value={form.email} onChange={set("email")} className={input} autoComplete="off" />
          </Field>
          <Field label="Phone Number">
            <input value={form.phone} onChange={set("phone")} className={input} />
          </Field>
          <Field label="Password (at least 8 characters)">
            <input
              type="password"
              value={form.password}
              onChange={set("password")}
              className={input}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Start Date">
            <input type="date" value={form.startDate} onChange={set("startDate")} className={input} />
          </Field>
          <Field label="License Number (optional)">
            <input value={form.licenseNumber} onChange={set("licenseNumber")} className={input} />
          </Field>
          <Field label="License Expiry (optional)">
            <input
              type="date"
              value={form.licenseExpiryDate}
              onChange={set("licenseExpiryDate")}
              className={input}
            />
          </Field>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-dark disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Add Staff Member"}
          </button>
        </div>
      </form>
    </div>
  );
}
