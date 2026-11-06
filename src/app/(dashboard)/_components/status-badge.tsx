const STYLES: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-brand-orange-light text-brand-orange-dark ring-brand-orange/25" },
  PARTIAL: { label: "Partial", className: "bg-brand-blue-light text-brand-blue ring-brand-blue/20" },
  PAID: { label: "Paid", className: "bg-green-50 text-green-700 ring-green-200" },
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
