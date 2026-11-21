import { getCurrentUser } from "@/lib/auth";
import { userCanAccessBilling } from "@/lib/permissions";
import { getManualReceiptById } from "@/lib/repo/manual-receipts";
import { AutoPrint } from "../../../_components/auto-print";

function fmt(value: string) {
  return new Intl.NumberFormat("en-TZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export default async function ManualReceiptPrintPage(
  props: PageProps<"/print/receipts/manual/[id]">
) {
  const viewer = await getCurrentUser();
  if (!viewer || !(await userCanAccessBilling(viewer))) {
    return <div className="p-6 text-sm text-zinc-500">You don't have permission.</div>;
  }
  const { id } = await props.params;
  const receipt = await getManualReceiptById(id);

  if (!receipt) {
    return <div className="p-6 text-sm text-zinc-500">Not found.</div>;
  }

  const issuedAt = new Date(receipt.issued_at)
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");

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
      <p className="text-center text-[10px] text-zinc-600">RECEIPT</p>

      <div className="my-2 border-b border-dashed border-zinc-900" />

      <div className="flex justify-between">
        <span>Number</span>
        <span>{receipt.receipt_number}</span>
      </div>
      <div className="flex justify-between">
        <span>Client</span>
        <span>{receipt.client_name}</span>
      </div>
      {receipt.phone && (
        <div className="flex justify-between">
          <span>Phone</span>
          <span>{receipt.phone}</span>
        </div>
      )}
      <div className="flex justify-between">
        <span>Date</span>
        <span>{issuedAt}</span>
      </div>
      <div className="flex justify-between">
        <span>Method</span>
        <span>{receipt.method}</span>
      </div>
      {receipt.reference && (
        <div className="flex justify-between">
          <span>Kumbukumbu</span>
          <span>{receipt.reference}</span>
        </div>
      )}
      <div className="flex justify-between">
        <span>Aliyetoa</span>
        <span>{receipt.issued_by_name}</span>
      </div>

      <div className="my-2 border-b border-dashed border-zinc-900" />

      <p className="text-center text-zinc-600">Amount</p>
      <p className="my-1 text-center text-base font-bold">
        TZS {fmt(receipt.amount)}
      </p>

      {receipt.description && (
        <>
          <div className="my-2 border-b border-dashed border-zinc-900" />
          <p className="text-[10px]">
            <span className="font-bold">Notes: </span>
            {receipt.description}
          </p>
        </>
      )}

      <div className="my-2 border-b border-dashed border-zinc-900" />

      <p className="text-center text-[10px] text-zinc-600">
        Thank you for using our services
      </p>
      <p className="text-center text-[10px] text-zinc-600">Afya Nyumbani ERP</p>
    </div>
  );
}
