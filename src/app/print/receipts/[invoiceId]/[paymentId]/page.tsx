import { getCurrentUser } from "@/lib/auth";
import { userCanAccessBilling } from "@/lib/permissions";
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
  const viewer = await getCurrentUser();
  if (!viewer || !(await userCanAccessBilling(viewer))) {
    return <div className="p-6 text-sm text-zinc-500">You don't have permission.</div>;
  }
  const { invoiceId, paymentId } = await props.params;
  const payment = await getPaymentWithContext(invoiceId, paymentId);

  if (!payment) {
    return <div className="p-6 text-sm text-zinc-500">Not found.</div>;
  }

  const paidAt = new Date(payment.paid_at)
    .toLocaleString("sv-SE", { timeZone: "Africa/Dar_es_Salaam" })
    .slice(0, 16);

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
      <p className="text-center text-sm font-bold">Afya Nyumbani Home Care</p>
      <p className="text-center text-[10px] text-zinc-600">
        Dar es Salaam, Tanzania
      </p>
      <p className="text-center text-[10px] text-zinc-600">PAYMENT RECEIPT</p>

      <div className="my-2 border-b border-dashed border-zinc-900" />

      <div className="flex justify-between font-bold">
        <span>Receipt No.</span>
        <span>{payment.receipt_number}</span>
      </div>
      <div className="flex justify-between">
        <span>Document</span>
        <span>{payment.document_number}</span>
      </div>
      <div className="flex justify-between">
        <span>Client</span>
        <span>{payment.client_name}</span>
      </div>
      <div className="flex justify-between">
        <span>Date</span>
        <span>{paidAt}</span>
      </div>
      <div className="flex justify-between">
        <span>Method</span>
        <span>{payment.method}</span>
      </div>
      {payment.reference && (
        <div className="flex justify-between">
          <span>Reference</span>
          <span>{payment.reference}</span>
        </div>
      )}
      <div className="flex justify-between">
        <span>Received by</span>
        <span>{payment.received_by_name}</span>
      </div>

      <div className="my-2 border-b border-dashed border-zinc-900" />

      <p className="text-center text-zinc-600">Amount Paid</p>
      <p className="my-1 text-center text-base font-bold">
        TZS {fmt(payment.amount)}
      </p>

      <div className="my-2 border-b border-dashed border-zinc-900" />

      <div className="flex justify-between">
        <span>Document Total</span>
        <span>{fmt(payment.total_amount)}</span>
      </div>
      <div className="flex justify-between">
        <span>Paid in Full</span>
        <span>{fmt(payment.paid_to_date)}</span>
      </div>
      <div className="flex justify-between font-bold">
        <span>Balance</span>
        <span>{fmt(payment.balance_after)}</span>
      </div>

      <p className="mt-3 text-center text-[10px] text-zinc-600">
        Thank you for using our services
      </p>
      <p className="text-center text-[10px] text-zinc-600">Afya Nyumbani ERP</p>
    </div>
  );
}
