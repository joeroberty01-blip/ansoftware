import Decimal from "decimal.js";
import { getInvoiceDetail } from "@/lib/repo/invoices";
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

  return (
    <div className="mx-auto max-w-[210mm] p-8 text-zinc-900 print:p-0">
      <AutoPrint />
      <style>{`@page { size: A4; margin: 14mm; }`}</style>

      <div className="mb-6 border-b-2 border-brand-blue pb-3">
        <h1 className="text-xl font-bold text-brand-blue">
          Afya Nyumbani Home Care Services Ltd
        </h1>
        <p className="text-sm text-zinc-600">Dar es Salaam, Tanzania</p>
      </div>

      <h2 className="mb-4 text-lg font-bold">
        {DOC_TITLES[invoice.doc_type] ?? invoice.doc_type} —{" "}
        {invoice.document_number}
      </h2>

      <div className="mb-6 grid max-w-sm grid-cols-2 gap-y-1 text-sm">
        <span className="text-zinc-600">Client</span>
        <span>{invoice.client_name}</span>
        <span className="text-zinc-600">Simu</span>
        <span>{invoice.client_phone}</span>
        <span className="text-zinc-600">Tarehe</span>
        <span>{new Date(invoice.issue_date).toISOString().slice(0, 10)}</span>
        <span className="text-zinc-600">Status</span>
        <span>{invoice.payment_status}</span>
      </div>

      <table className="mb-6 w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b-2 border-zinc-800">
            <th className="py-2 pr-2 font-semibold">Maelezo</th>
            <th className="py-2 pr-2 text-right font-semibold">Idadi</th>
            <th className="py-2 pr-2 text-right font-semibold">Bei</th>
            <th className="py-2 pr-2 text-right font-semibold">Jumla</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => (
            <tr key={item.id} className="border-b border-zinc-200">
              <td className="py-2 pr-2">{item.description}</td>
              <td className="py-2 pr-2 text-right">{item.quantity}</td>
              <td className="py-2 pr-2 text-right">{fmt(item.unit_price)}</td>
              <td className="py-2 pr-2 text-right">{fmt(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto flex max-w-xs flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{fmt(invoice.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Kodi</span>
          <span>{fmt(invoice.tax_amount)}</span>
        </div>
        <div className="flex justify-between border-t border-zinc-300 pt-1 text-base font-bold">
          <span>JUMLA KUU</span>
          <span>{fmt(invoice.total_amount)}</span>
        </div>
        {isPayable && (
          <>
            <div className="flex justify-between">
              <span>Imelipwa</span>
              <span>{fmt(invoice.amount_paid)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Salio</span>
              <span>{fmt(balance)}</span>
            </div>
          </>
        )}
      </div>

      <p className="mt-10 text-xs text-zinc-400">
        Imetengenezwa na Afya Nyumbani ERP
      </p>
    </div>
  );
}
