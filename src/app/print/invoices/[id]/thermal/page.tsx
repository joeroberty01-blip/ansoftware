import Decimal from "decimal.js";
import { getInvoiceDetail } from "@/lib/repo/invoices";
import { BRAND, STATUS_LABELS } from "@/lib/invoice-brand";
import { AutoPrint } from "../../../_components/auto-print";

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

export default async function InvoiceThermalPrintPage(
  props: PageProps<"/print/invoices/[id]/thermal">
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

  return (
    <div className="mx-auto w-[80mm] p-3 font-mono text-[11px] text-zinc-900">
      <AutoPrint />
      <style>{`@page { size: 80mm auto; margin: 3mm; }`}</style>

      <div className="flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-afyanyumbani-icon.png"
          alt=""
          className="mb-1 h-8 w-auto"
        />
      </div>
      <p className="text-center text-sm font-bold">{BRAND.name}</p>
      <p className="text-center text-[10px] text-zinc-600">{BRAND.tagline}</p>
      <p className="text-center text-[10px] text-zinc-600">
        {DOC_TITLES[invoice.doc_type] ?? invoice.doc_type}
      </p>

      <div className="my-2 border-b border-dashed border-zinc-900" />

      <div className="flex justify-between">
        <span>Hati</span>
        <span>{invoice.document_number}</span>
      </div>
      <div className="flex justify-between">
        <span>Client</span>
        <span>{invoice.client_name}</span>
      </div>
      <div className="flex justify-between">
        <span>Tarehe</span>
        <span>{new Date(invoice.issue_date).toISOString().slice(0, 10)}</span>
      </div>
      <div className="flex justify-between">
        <span>Due</span>
        <span>
          {invoice.due_date
            ? new Date(invoice.due_date).toISOString().slice(0, 10)
            : "On Receipt"}
        </span>
      </div>
      <div className="flex justify-between font-bold">
        <span>Status</span>
        <span>{statusLabel}</span>
      </div>

      <div className="my-2 border-b border-dashed border-zinc-900" />

      {invoice.items.map((item) => (
        <div key={item.id} className="mb-1.5">
          <p className="font-bold">{item.description}</p>
          <div className="flex justify-between text-zinc-600">
            <span>
              {item.quantity} x {fmt(item.unit_price)}
            </span>
            <span className="font-bold text-zinc-900">TZS {fmt(item.total)}</span>
          </div>
        </div>
      ))}

      <div className="my-2 border-b border-dashed border-zinc-900" />

      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>{fmt(invoice.subtotal)}</span>
      </div>
      <div className="flex justify-between">
        <span>VAT</span>
        <span>{hasTax ? fmt(invoice.tax_amount) : "N/A"}</span>
      </div>
      <div className="flex justify-between font-bold text-sm">
        <span>TOTAL DUE</span>
        <span>TZS {fmt(invoice.total_amount)}</span>
      </div>
      {isPayable && Number(invoice.amount_paid) > 0 && (
        <>
          <div className="flex justify-between">
            <span>Imelipwa</span>
            <span>{fmt(invoice.amount_paid)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Salio</span>
            <span>{fmt(balance)}</span>
          </div>
        </>
      )}

      {isPayable && (
        <>
          <div className="my-2 border-b border-dashed border-zinc-900" />
          <p className="text-center text-[10px] font-bold">MALIPO / PAYMENT</p>
          <div className="flex justify-between">
            <span>Tigo Pesa Lipa Namba</span>
            <span className="font-bold">{BRAND.tigoPesaNumber}</span>
          </div>
          <p className="text-[10px] text-zinc-600">{BRAND.tigoPesaAccountName}</p>
          <p className="mt-1 text-[10px] text-zinc-600">
            Tumia namba ya invoice kama reference. WhatsApp: {BRAND.whatsapp}
          </p>
        </>
      )}

      {invoice.notes && (
        <>
          <div className="my-2 border-b border-dashed border-zinc-900" />
          <p className="text-[10px]">
            <span className="font-bold">Notes: </span>
            {invoice.notes}
          </p>
        </>
      )}

      <div className="my-2 border-b border-dashed border-zinc-900" />

      <p className="text-center text-[10px] text-zinc-600">
        Asante kwa kutumia huduma zetu
      </p>
      <p className="text-center text-[10px] text-zinc-600">{BRAND.name}</p>
    </div>
  );
}
