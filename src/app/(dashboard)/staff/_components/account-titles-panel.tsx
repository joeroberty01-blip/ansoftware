"use client";

import { useEffect, useState } from "react";

interface Account {
  user_id: string;
  full_name: string;
  role: "ADMIN" | "STAFF";
  staff_number: string | null;
  profession: string | null;
  is_chief_co: boolean;
  title: string | null;
}

function defaultLabel(a: Account) {
  if (a.role === "ADMIN") return "Super Administrator";
  if (a.is_chief_co) return "Chief C.O";
  return "Staff";
}

function AccountRow({ account }: { account: Account }) {
  const [saved, setSaved] = useState(account.title ?? "");
  const [value, setValue] = useState(account.title ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = value.trim() !== saved;

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/account-titles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: account.user_id, title: value }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: json.error ?? "Couldn't save the title." });
        return;
      }
      const next = json.title ?? "";
      setSaved(next);
      setValue(next);
      setMsg({ ok: true, text: "Saved" });
    } catch {
      setMsg({ ok: false, text: "Couldn't save the title." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 sm:w-64">
        <p className="truncate text-sm font-medium text-zinc-900">{account.full_name}</p>
        <p className="truncate text-xs text-zinc-500">
          {account.role === "ADMIN" ? "Admin account" : account.staff_number ?? "Staff account"}
          {account.profession ? ` · ${account.profession.replace("_", " ")}` : ""}
        </p>
      </div>
      <div className="flex flex-1 items-center gap-2">
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setMsg(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && dirty && !busy) save();
          }}
          maxLength={40}
          placeholder={defaultLabel(account)}
          aria-label={`Title for ${account.full_name}`}
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-blue focus:outline-none"
        />
        <button
          type="button"
          onClick={save}
          disabled={!dirty || busy}
          className="rounded-lg bg-brand-blue px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Saving..." : "Save"}
        </button>
        {msg && (
          <span className={`w-14 text-xs ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</span>
        )}
      </div>
    </li>
  );
}

/** Admin-only: the title each account shows under its name (e.g. C.E.O, Director). */
export function AccountTitlesPanel() {
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open || accounts) return;
    let cancelled = false;
    fetch("/api/account-titles")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json) => {
        if (!cancelled) setAccounts(json.accounts ?? []);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, accounts]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm print:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={open}
      >
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Account Titles</h2>
          <p className="text-xs text-zinc-500">
            The title shown under each person&apos;s name in the ERP. It doesn&apos;t change what they can access.
          </p>
        </div>
        <span className="text-sm font-medium text-brand-blue">{open ? "Hide" : "Edit titles"}</span>
      </button>

      {open && (
        <div className="mt-3">
          {failed ? (
            <p className="text-sm text-red-600">Couldn&apos;t load accounts.</p>
          ) : !accounts ? (
            <p className="text-sm text-zinc-500">Loading...</p>
          ) : (
            <>
              <ul className="divide-y divide-zinc-100">
                {accounts.map((a) => (
                  <AccountRow key={a.user_id} account={a} />
                ))}
              </ul>
              <p className="mt-2 text-xs text-zinc-500">
                Leave a title empty to go back to the default shown in grey.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
