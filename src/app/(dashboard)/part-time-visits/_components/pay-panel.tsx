"use client";

import { useEffect, useRef, useState } from "react";
import type { PartTimeVisit } from "@/lib/repo/part-time-visits";
import { PAYMENT_METHODS } from "@/lib/validation/invoices";

export const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  MPESA: "M-Pesa",
  AIRTEL_MONEY: "Airtel Money",
  MIXX_BY_YAS: "Mixx by Yas",
  BANK_TRANSFER: "Bank Transfer",
};

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900";
const labelClass = "mb-1 block text-xs font-medium text-zinc-600";
const buttonClass =
  "min-h-10 rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-50";

/** Admin: the amount for one visit with its reason, then marking it paid. */
export function PayPanel({
  visit,
  onClose,
  onSaved,
}: {
  visit: PartTimeVisit;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [amount, setAmount] = useState(visit.pay_amount ? String(Number(visit.pay_amount)) : "");
  const [reason, setReason] = useState(visit.pay_reason ?? "");
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const send = async (body: object, message: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/part-time-visits/${visit.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not save the payment.");
        return;
      }
      onSaved(message);
    } catch {
      setError("No network connection. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const changed =
    !visit.pay_amount ||
    Number(amount) !== Number(visit.pay_amount) ||
    reason.trim() !== (visit.pay_reason ?? "");

  return (
    <div
      ref={ref}
      className="scroll-mt-20 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 print:hidden"
    >
      <h2 className="text-base font-semibold text-zinc-900">Pay for Part-time Visit</h2>
      <p className="text-sm text-zinc-500">
        {visit.staff_name} visited {visit.patient_name} on {visit.visit_date}
      </p>

      <form
        className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          send({ action: "SET_AMOUNT", amount, reason }, "Amount saved.");
        }}
      >
        <div>
          <label className={labelClass} htmlFor="pay-amount">
            Amount (TZS)
          </label>
          <input
            id="pay-amount"
            required
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[,\s]/g, ""))}
            placeholder="e.g. 30000"
            className={inputClass}
          />
        </div>
        <div className="lg:col-span-2">
          <label className={labelClass} htmlFor="pay-reason">
            Reason for this amount
          </label>
          <input
            id="pay-reason"
            required
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Night shift rate plus transport"
            className={inputClass}
          />
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
          <button
            type="submit"
            disabled={busy || !changed}
            className={`${buttonClass} bg-brand-blue hover:bg-brand-blue-dark`}
          >
            Save Amount
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Close
          </button>
        </div>
      </form>

      {visit.pay_amount && (
        <form
          className="mt-4 grid gap-4 border-t border-zinc-200 pt-4 sm:grid-cols-2 lg:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            send({ action: "MARK_PAID", method, reference }, "Visit marked as paid.");
          }}
        >
          <div>
            <label className={labelClass} htmlFor="pay-method">
              Payment method
            </label>
            <select
              id="pay-method"
              required
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className={inputClass}
            >
              <option value="">-- select --</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {METHOD_LABELS[m]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="pay-reference">
              Reference (optional)
            </label>
            <input
              id="pay-reference"
              maxLength={200}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={busy || changed}
              className={`${buttonClass} bg-emerald-700 hover:bg-emerald-800`}
            >
              Mark as Paid
            </button>
          </div>
          {changed && (
            <p className="text-xs text-zinc-500 sm:col-span-2 lg:col-span-3">
              Save the new amount before marking it as paid.
            </p>
          )}
        </form>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
