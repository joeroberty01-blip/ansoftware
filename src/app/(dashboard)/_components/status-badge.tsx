const STYLES: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-amber-50 text-amber-700 ring-amber-200" },
  PARTIAL: { label: "Partial", className: "bg-sky-50 text-sky-700 ring-sky-200" },
  PAID: { label: "Paid", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  OVERDUE: { label: "Overdue", className: "bg-red-50 text-red-700 ring-red-200" },
  CANCELLED: { label: "Cancelled", className: "bg-zinc-100 text-zinc-500 ring-zinc-200" },
};

/** Compact coloured pill for an invoice payment status. */
export function PaymentStatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? {
    label: status,
    className: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${style.className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {style.label}
    </span>
  );
}
