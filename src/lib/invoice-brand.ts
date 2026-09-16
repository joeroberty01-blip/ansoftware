// Shared brand + payment-method constants for the invoice templates
// (A4 PDF, A4 print page, thermal print page) — keep these three in sync
// by editing only here.

export const BRAND = {
  navy: "#0D2A5C",
  orange: "#F58220",
  cream: "#FBF7F2",
  gray: "#6B7280",
  name: "AfyaNyumbani Care",
  tagline: "HEALTHCARE AT HOME • TANZANIA",
  website: "afyanyumbani.com",
  social: "@afyanyumbanicare",
  address: "Healthcare at Home, Tanzania",
  tigoPesaNumber: "44098241",
  tigoPesaAccountName: "AFYA NYUMBANI CARE",
  whatsapp: "+255627858827",
} as const;

export const STATUS_LABELS: Record<string, string> = {
  PENDING: "UNPAID",
  PARTIAL: "PARTIALLY PAID",
  PAID: "PAID",
  OVERDUE: "OVERDUE",
  CANCELLED: "CANCELLED",
};

export const STATUS_COLORS: Record<string, string> = {
  PENDING: "#F58220",
  PARTIAL: "#F58220",
  PAID: "#16A34A",
  OVERDUE: "#DC2626",
  CANCELLED: "#6B7280",
};

export function formatInvoiceDate(value: string): string {
  return new Intl.DateTimeFormat("en-TZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export function invoiceQrText(invoice: {
  document_number: string;
  total_amount: string;
}): string {
  return [
    "AFYA NYUMBANI CARE",
    `Invoice: ${invoice.document_number}`,
    `Amount: TZS ${invoice.total_amount}`,
    `Tigo Pesa Lipa Namba: ${BRAND.tigoPesaNumber}`,
    `Reference: ${invoice.document_number}`,
  ].join("\n");
}
