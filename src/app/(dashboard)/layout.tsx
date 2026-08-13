import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listPendingStaff } from "@/lib/repo/users";
import { listLowStockItems } from "@/lib/repo/inventory";
import { countOutstandingInvoices } from "@/lib/repo/invoices";
import { DashboardShell } from "./_components/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  let pendingStaffCount = 0;
  let lowStockCount = 0;
  let outstandingCount = 0;

  if (user.role === "ADMIN") {
    const [pendingStaff, lowStock, outstanding] = await Promise.all([
      listPendingStaff(),
      listLowStockItems(),
      countOutstandingInvoices(),
    ]);
    pendingStaffCount = pendingStaff.length;
    lowStockCount = lowStock.length;
    outstandingCount = outstanding;
  }

  const notificationCount = pendingStaffCount + lowStockCount + outstandingCount;

  return (
    <DashboardShell
      fullName={user.fullName}
      role={user.role}
      pendingStaffCount={pendingStaffCount}
      lowStockCount={lowStockCount}
      outstandingCount={outstandingCount}
      notificationCount={notificationCount}
    >
      {children}
    </DashboardShell>
  );
}
