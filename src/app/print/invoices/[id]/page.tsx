import { getCurrentUser } from "@/lib/auth";
import { userCanAccessBilling } from "@/lib/permissions";
import Decimal from "decimal.js";
import QRCode from "qrcode";
import { getInvoiceDetail } from "@/lib/repo/invoices";
import {
  BRAND,
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_TINTS,
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
  PROFORMA: "PROFORMA",
  INVOICE: "INVOICE",
  TAX_INVOICE: "TAX INVOICE",
};

const PAYABLE_TYPES = ["INVOICE", "TAX_INVOICE"];

const labelClass = "text-[9px] font-bold tracking-[0.08em] text-slate-500";

export default async function InvoicePrintPage(
  props: PageProps<"/print/invoices/[id]">
) {
  const viewer = await getCurrentUser();
  if (!viewer || !(await userCanAccessBilling(viewer))) {
    return <div className="p-6 text-sm text-zinc-500">Huna ruhusa.</div>;
  }
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
  const statusTint = STATUS_TINTS[invoice.payment_status] ?? "#EEF0F4";
  const qrDataUri = await QRCode.toDataURL(invoiceQrText(invoice), {
    margin: 1,
    width: 200,
  });

  return (
    <div className="mx-auto max-w-[210mm] bg-white text-slate-900 print:p-0">
      <AutoPrint />
      <style>{`@page { size: A4; margin: 0; } body { background: #fff; }`}</style>

      <div className="flex h-[7px]">
        <div className="flex-1" style={{ backgroundColor: BRAND.blue }} />
        <div className="w-24" style={{ backgroundColor: BRAND.orange }} />
      </div>

      <div className="flex items-start justify-between px-10 pt-7 pb-2">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-afyanyumbani-mark.png"
            alt={BRAND.name}
            className="h-12 w-12 object-contain"
          />
          <div>
            <p className="text-lg font-bold" style={{ color: BRAND.blue }}>
              {BRAND.name}
            </p>
            <p className="mt-0.5 text-[8px] tracking-[0.1em] text-slate-500">
              {BRAND.tagline}
            </p>
            <p className="mt-1 text-[9px] text-slate-500">
              {BRAND.website} &nbsp;&nbsp; {BRAND.social}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p
            className="text-[26px] leading-none font-bold tracking-[0.06em]"
            style={{ color: BRAND.blue }}
          >
            {DOC_TITLES[invoice.doc_type] ?? invoice.doc_type}
          </p>
          <p className="mt-1.5 text-sm font-bold">{invoice.document_number}</p>
        </div>
      </div>

      <div className="px-10 pt-4 pb-10">
        <div
          className="mb-5 grid grid-cols-3 gap-4 rounded-lg px-4 py-3"
          style={{ backgroundColor: BRAND.light }}
        >
          <div>
            <p className={labelClass}>ISSUE DATE</p>
            <p className="mt-1 text-[13px] font-bold">
              {formatInvoiceDate(invoice.issue_date)}
            </p>
          </div>
          <div>
            <p className={labelClass}>DUE DATE</p>
            <p className="mt-1 text-[13px] font-bold">
              {invoice.due_date ? formatInvoiceDate(invoice.due_date) : "On Receipt"}
            </p>
          </div>
          <div>
            <p className={labelClass}>STATUS</p>
            <span
              className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide"
              style={{ color: statusColor, backgroundColor: statusTint }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: statusColor }}
              />
              {statusLabel}
            </span>
          </div>
        </div>

        <div className="mb-5">
          <p className={labelClass}>BILLED TO</p>
          <p className="mt-1 text-base font-bold">{invoice.client_name}</p>
          {invoice.client_phone && (
            <p className="text-[11px] text-slate-500">{invoice.client_phone}</p>
          )}
          {invoice.client_email && (
            <p className="text-[11px] text-slate-500">{invoice.client_email}</p>
          )}
        </div>

        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr
              className="text-[9px] font-bold tracking-[0.08em] text-white"
              style={{ backgroundColor: BRAND.blue }}
            >
              <th className="w-8 rounded-tl-md px-3 py-2">#</th>
              <th className="px-3 py-2">DESCRIPTION</th>
              <th className="px-3 py-2 text-right">QTY</th>
              <th className="px-3 py-2 text-right">UNIT PRICE</th>
              <th className="rounded-tr-md px-3 py-2 text-right">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => (
              <tr
                key={item.id}
                className="break-inside-avoid"
                style={{
                  backgroundColor: i % 2 === 1 ? "#FBF7F2" : undefined,
                  borderBottom: `1px solid ${BRAND.line}`,
                }}
              >
                <td className="px-3 py-2.5 text-slate-500">{i + 1}</td>
                <td className="px-3 py-2.5 font-bold">{item.description}</td>
                <td className="px-3 py-2.5 text-right">{item.quantity}</td>
                <td className="px-3 py-2.5 text-right">TZS {fmt(item.unit_price)}</td>
                <td className="px-3 py-2.5 text-right font-bold">
                  TZS {fmt(item.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-5 flex items-start gap-5 break-inside-avoid">
          <div className="flex-1">
            {isPayable && (
              <div
                className="rounded-md p-3"
                style={{
                  backgroundColor: "#FBF7F2",
                  borderLeft: `3px solid ${BRAND.orange}`,
                }}
              >
                <p className={`${labelClass} mb-1.5`}>PAYMENT METHOD</p>
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
                    style={{ backgroundColor: BRAND.orange }}
                  >
                    T
                  </span>
                  <div>
                    <p className="text-[8px] text-slate-500">TIGO PESA LIPA NAMBA</p>
                    <p className="text-base leading-tight font-bold">
                      {BRAND.tigoPesaNumber}
                    </p>
                    <p className="text-[9px] font-bold">{BRAND.tigoPesaAccountName}</p>
                  </div>
                </div>
                <p className="mt-2 text-[9px] leading-snug text-slate-500">
                  Send exact amount and use the invoice number as reference.
                  <br />
                  WhatsApp confirmation: {BRAND.whatsapp}
                </p>
              </div>
            )}
            {invoice.notes && (
              <div className="mt-3">
                <p className={`${labelClass} mb-1`}>NOTES</p>
                <p className="text-[11px] leading-relaxed text-slate-700">
                  {invoice.notes}
                </p>
              </div>
            )}
          </div>

          <div className="w-[230px]">
            <div className="flex justify-between py-1 text-xs">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-bold">TZS {fmt(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between py-1 text-xs">
              <span className="text-slate-500">VAT</span>
              <span className="font-bold">
                {hasTax ? `TZS ${fmt(invoice.tax_amount)}` : "N/A"}
              </span>
            </div>
            <div
              className="mt-1.5 flex items-center justify-between rounded-lg px-3 py-2.5 text-white"
              style={{ backgroundColor: BRAND.blue }}
            >
              <span className="text-[11px] font-bold tracking-[0.08em]">TOTAL DUE</span>
              <span className="text-base font-bold">TZS {fmt(invoice.total_amount)}</span>
            </div>
            {isPayable && Number(invoice.amount_paid) > 0 && (
              <div className="mt-2">
                <div className="flex justify-between py-1 text-xs">
                  <span className="text-slate-500">Imelipwa</span>
                  <span className="font-bold">TZS {fmt(invoice.amount_paid)}</span>
                </div>
                <div
                  className="flex justify-between py-1 pt-1.5 text-xs"
                  style={{ borderTop: `1px solid ${BRAND.line}` }}
                >
                  <span className="font-bold">Salio</span>
                  <span className="font-bold">TZS {fmt(balance)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div
          className="mt-8 flex items-end justify-between pt-4 break-inside-avoid"
          style={{ borderTop: `1px solid ${BRAND.line}` }}
        >
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUri} alt="QR" className="h-14 w-14" />
            <p className="mt-1 w-32 text-[8px] leading-tight text-slate-500">
              Scan to verify: invoice details, amount and Tigo Pesa reference.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold" style={{ color: BRAND.blue }}>
              Thank you for choosing {BRAND.name}
            </p>
            <p className="mt-0.5 text-[9px] text-slate-500">{BRAND.address}</p>
            <p className="text-[9px] text-slate-500">
              Tigo Pesa: {BRAND.tigoPesaNumber} &nbsp; WhatsApp: {BRAND.whatsapp}
            </p>
            <p className="text-[9px] text-slate-500">
              Generated: {formatInvoiceDate(new Date().toISOString())}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
