import Decimal from "decimal.js";
import QRCode from "qrcode";
import { getInvoiceDetail } from "@/lib/repo/invoices";
import {
  BRAND,
  STATUS_COLORS,
  STATUS_LABELS,
  formatInvoiceDate,
  invoiceQrText,
} from "@/lib/invoice-brand";
import { AutoPrint } from "../../_components/auto-print";

function fmt(value: string) {
  return new Intl.NumberFormat("en-TZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

const DOC_TITLES: Record<string, string> = {
  QUOTATION: "QUOTATION",
  PROFORMA: "PROFORMA INVOICE",
  INVOICE: "INVOICE",
  TAX_INVOICE: "TAX INVOICE",
};

const PAYABLE_TYPES = ["INVOICE", "TAX_INVOICE"];

export default async function InvoicePrintPage(
  props: PageProps<"/print/invoices/[id]">
) {
  const { id } = await props.params;
  const invoice = await getInvoiceDetail(id);

  if (!invoice) {
    return <div className="p-6 text-sm text-zinc-500">Haikupatikana.</div>;
  }

  const isPayable = PAYABLE_TYPES.includes(invoice.doc_type);
  const balance = new Decimal(invoice.total_amount)
    .minus(invoice.amount_paid)
    .toFixed(2);
  const hasTax = Number(invoice.tax_amount) > 0;
  const statusLabel = STATUS_LABELS[invoice.payment_status] ?? invoice.payment_status;
  const statusColor = STATUS_COLORS[invoice.payment_status] ?? BRAND.gray;
  const qrDataUri = await QRCode.toDataURL(invoiceQrText(invoice), {
    margin: 1,
    width: 200,
  });

  return (
    <div className="mx-auto max-w-[210mm] text-zinc-900 print:p-0">
      <AutoPrint />
      <style>{`@page { size: A4; margin: 0; }`}</style>

      <div
        className="flex items-center justify-between px-8 py-6"
        style={{ backgroundColor: BRAND.navy }}
      >
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-afyanyumbani.png"
            alt={BRAND.name}
            className="h-12 w-12 rounded-md object-cover"
          />
          <div>
            <p className="text-xl font-bold text-white">{BRAND.name}</p>
            <p className="mt-0.5 text-[9px] tracking-wide text-blue-200">
              {BRAND.tagline}
            </p>
            <p className="mt-1 text-[9px] text-blue-200">
              {BRAND.website} &nbsp;&nbsp; {BRAND.social}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span
            className="mb-1.5 rounded-full px-3 py-1 text-[10px] font-bold text-white"
            style={{ backgroundColor: BRAND.orange }}
          >
            {DOC_TITLES[invoice.doc_type] ?? invoice.doc_type}
          </span>
          <p className="text-lg font-bold text-white">{invoice.document_number}</p>
          <p className="mt-0.5 text-[9px] text-blue-200">
            {formatInvoiceDate(invoice.issue_date)}
          </p>
        </div>
      </div>
      <div className="h-1" style={{ backgroundColor: BRAND.orange }} />

      <div className="p-8">
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div>
            <p className="text-[9px] font-bold tracking-wide text-zinc-500">
              BILLED TO
            </p>
            <p className="mt-1 text-sm font-bold">{invoice.client_name}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold tracking-wide text-zinc-500">
              DUE DATE
            </p>
            <p className="mt-1 text-sm font-bold">
              {invoice.due_date ? formatInvoiceDate(invoice.due_date) : "On Receipt"}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold tracking-wide text-zinc-500">
              STATUS
            </p>
            <p
              className="mt-1 flex items-center gap-1.5 text-sm font-bold"
              style={{ color: statusColor }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: statusColor }}
              />
              {statusLabel}
            </p>
          </div>
        </div>

        <table className="mb-6 w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-200 text-[9px] font-bold tracking-wide text-zinc-500">
              <th className="w-8 py-2">#</th>
              <th className="py-2">DESCRIPTION</th>
              <th className="py-2 text-right">QTY</th>
              <th className="py-2 text-right">UNIT PRICE</th>
              <th className="py-2 text-right">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => (
              <tr key={item.id} className="border-b border-zinc-100">
                <td className="py-2.5">{i + 1}</td>
                <td className="py-2.5 font-bold">{item.description}</td>
                <td className="py-2.5 text-right">{item.quantity}</td>
                <td className="py-2.5 text-right">TZS {fmt(item.unit_price)}</td>
                <td className="py-2.5 text-right font-bold" style={{ color: BRAND.orange }}>
                  TZS {fmt(item.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mb-5 grid grid-cols-2 gap-4">
          {isPayable && (
            <div className="rounded-lg p-4" style={{ backgroundColor: BRAND.cream }}>
              <p className="mb-2 text-[9px] font-bold tracking-wide text-zinc-500">
                PAYMENT METHOD
              </p>
              <div className="flex items-center gap-2">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold text-white"
                  style={{ backgroundColor: BRAND.orange }}
                >
                  T
                </span>
                <div>
                  <p className="text-[8px] text-zinc-500">TIGO PESA LIPA NAMBA</p>
                  <p className="text-base font-bold leading-tight">
                    {BRAND.tigoPesaNumber}
                  </p>
                  <p className="text-[9px] font-bold">{BRAND.tigoPesaAccountName}</p>
                </div>
              </div>
              <p className="mt-2 text-[8px] leading-snug text-zinc-500">
                Send exact amount and use invoice number as reference.
                <br />
                WhatsApp confirmation: {BRAND.whatsapp}
              </p>
            </div>
          )}
          <div
            className={`rounded-lg p-4 ${isPayable ? "" : "col-start-2"}`}
            style={{ backgroundColor: BRAND.cream }}
          >
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Subtotal</span>
              <span className="font-bold">TZS {fmt(invoice.subtotal)}</span>
            </div>
            <div className="mt-1 flex justify-between text-xs">
              <span className="text-zinc-500">VAT</span>
              <span className="font-bold">
                {hasTax ? `TZS ${fmt(invoice.tax_amount)}` : "N/A"}
              </span>
            </div>
            <div className="my-2 border-t border-zinc-300" />
            <div className="flex justify-between text-sm font-bold">
              <span>TOTAL DUE</span>
              <span style={{ color: BRAND.orange }}>TZS {fmt(invoice.total_amount)}</span>
            </div>
            {isPayable && Number(invoice.amount_paid) > 0 && (
              <>
                <div className="my-2 border-t border-zinc-300" />
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Imelipwa</span>
                  <span className="font-bold">TZS {fmt(invoice.amount_paid)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Salio</span>
                  <span className="font-bold">TZS {fmt(balance)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {invoice.notes && (
          <div className="mb-6 rounded-lg p-3" style={{ backgroundColor: BRAND.cream }}>
            <span className="text-xs font-bold" style={{ color: BRAND.orange }}>
              Notes:{" "}
            </span>
            <span className="text-xs">{invoice.notes}</span>
          </div>
        )}

        <div className="flex items-start justify-between border-t border-zinc-200 pt-4">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUri} alt="QR" className="h-14 w-14" />
            <p className="mt-1 w-28 text-[7px] leading-tight text-zinc-500">
              Scan to Verify — this QR contains invoice details, amount & Tigo
              Pesa payment reference.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold">{BRAND.name}</p>
            <p className="text-[8px] text-zinc-500">{BRAND.address}</p>
            <p className="text-[8px] text-zinc-500">Tigo Pesa: {BRAND.tigoPesaNumber}</p>
            <p className="text-[8px] text-zinc-500">WhatsApp: {BRAND.whatsapp}</p>
            <p className="text-[8px] text-zinc-500">
              Generated: {formatInvoiceDate(new Date().toISOString())}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
