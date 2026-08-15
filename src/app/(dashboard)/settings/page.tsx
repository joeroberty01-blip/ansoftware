"use client";

import { useEffect, useState } from "react";

interface Me {
  fullName: string;
  email: string;
  role: string;
  phone: string | null;
}

export default function SettingsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((json) => {
        setMe(json.user ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Settings</h1>
      {loading ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : (
        <>
          <ProfileForm initialMe={me} />
          <PasswordForm />
        </>
      )}
    </div>
  );
}

function ProfileForm({ initialMe }: { initialMe: Me | null }) {
  const [fullName, setFullName] = useState(initialMe?.fullName ?? "");
  const [phone, setPhone] = useState(initialMe?.phone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, phone }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to save.");
        return;
      }
      setMessage("Details saved.");
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
    >
      <h2 className="text-sm font-semibold text-zinc-900">Taarifa Zangu</h2>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-600">Email</label>
        <input
          value={initialMe?.email ?? ""}
          disabled
          className="rounded border border-zinc-300 bg-zinc-100 px-2 py-1.5 text-sm text-zinc-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-600">Jina Kamili</label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-600">Namba ya Simu</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
        />
      </div>
      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {message && (
        <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="mt-1 self-start rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-dark disabled:opacity-50"
      >
        {saving ? "Saving..." : "Hifadhi"}
      </button>
    </form>
  );
}

function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to change password.");
        return;
      }
      setMessage(json.message ?? "Password changed.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
    >
      <h2 className="text-sm font-semibold text-zinc-900">Change Password</h2>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-600">Password ya Sasa</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
          className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-600">Password Mpya</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-600">
          Thibitisha Password Mpya
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
        />
      </div>
      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {message && (
        <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="mt-1 self-start rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-dark disabled:opacity-50"
      >
        {saving ? "Updating..." : "Change Password"}
      </button>
    </form>
  );
}
