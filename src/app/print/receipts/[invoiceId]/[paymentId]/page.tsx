import Decimal from "decimal.js";
import { getPaymentWithContext } from "@/lib/repo/invoices";
import { AutoPrint } from "../../../_components/auto-print";

function fmt(value: string) {
  return new Intl.NumberFormat("en-TZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export default async function ReceiptPrintPage(
  props: PageProps<"/print/receipts/[invoiceId]/[paymentId]">
) {
  const { invoiceId, paymentId } = await props.params;
  const payment = await getPaymentWithContext(invoiceId, paymentId);

  if (!payment) {
    return <div className="p-6 text-sm text-zinc-500">Haikupatikana.</div>;
  }

  const balance = new Decimal(payment.total_amount)
    .minus(payment.amount_paid)
    .toFixed(2);
  const paidAt = new Date(payment.paid_at)
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");

  return (
    <div className="mx-auto w-[80mm] p-3 font-mono text-[11px] text-zinc-900">
      <AutoPrint />
      <style>{`@page { size: 80mm auto; margin: 3mm; }`}</style>

      <p className="text-center text-sm font-bold">Afya Nyumbani Home Care</p>
      <p className="text-center text-[10px] text-zinc-600">
        Dar es Salaam, Tanzania
      </p>
      <p className="text-center text-[10px] text-zinc-600">RISITI YA MALIPO</p>

      <div className="my-2 border-b border-dashed border-zinc-900" />

      <div className="flex justify-between">
        <span>Hati</span>
        <span>{payment.document_number}</span>
      </div>
      <div className="flex justify-between">
        <span>Client</span>
        <span>{payment.client_name}</span>
      </div>
      <div className="flex justify-between">
        <span>Tarehe</span>
        <span>{paidAt}</span>
      </div>
      <div className="flex justify-between">
        <span>Njia</span>
        <span>{payment.method}</span>
      </div>
      {payment.reference && (
        <div className="flex justify-between">
          <span>Kumbukumbu</span>
          <span>{payment.reference}</span>
        </div>
      )}
      <div className="flex justify-between">
        <span>Aliyepokea</span>
        <span>{payment.received_by_name}</span>
      </div>

      <div className="my-2 border-b border-dashed border-zinc-900" />

      <p className="text-center text-zinc-600">Kiasi Kilicholipwa</p>
      <p className="my-1 text-center text-base font-bold">
        TZS {fmt(payment.amount)}
      </p>

      <div className="my-2 border-b border-dashed border-zinc-900" />

      <div className="flex justify-between">
        <span>Jumla ya Hati</span>
        <span>{fmt(payment.total_amount)}</span>
      </div>
      <div className="flex justify-between">
        <span>Imelipwa Yote</span>
        <span>{fmt(payment.amount_paid)}</span>
      </div>
      <div className="flex justify-between font-bold">
        <span>Salio</span>
        <span>{fmt(balance)}</span>
      </div>

      <p className="mt-3 text-center text-[10px] text-zinc-600">
        Asante kwa kutumia huduma zetu
      </p>
      <p className="text-center text-[10px] text-zinc-600">Afya Nyumbani ERP</p>
    </div>
  );
}
