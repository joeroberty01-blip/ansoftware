import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getStaffByUserId } from "@/lib/repo/staff";
import { canAccessBilling } from "@/lib/permissions";
import { listPendingStaff } from "@/lib/repo/users";
import { listLowStockItems } from "@/lib/repo/inventory";
import { countOutstandingInvoices } from "@/lib/repo/invoices";
import { countBookingsNeedingAction } from "@/lib/repo/bookings";
import { countMissedVisitsForStaff } from "@/lib/repo/home-visits";
import { getAttendanceReminder } from "@/lib/repo/attendance";
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

  const staff = user.role === "ADMIN" ? null : await getStaffByUserId(user.id);
  const canBilling = canAccessBilling(user.role, staff?.profession);
  const canClinical = user.role === "ADMIN" || staff?.profession !== "ACCOUNTANT";

  let pendingStaffCount = 0;
  let lowStockCount = 0;
  let outstandingCount = 0;
  let newBookingsCount = 0;

  if (user.role === "ADMIN") {
    // Badge counts are extras: one failing query must not take the whole
    // ERP down, so each falls back to 0 and logs the real error.
    const safe = async <T,>(label: string, run: () => Promise<T>, fallback: T) => {
      try {
        return await run();
      } catch (err) {
        console.error(`[dashboard-layout] ${label} failed:`, err);
        return fallback;
      }
    };
    const [pendingStaff, lowStock, outstanding, newBookings] = await Promise.all([
      safe("listPendingStaff", listPendingStaff, []),
      safe("listLowStockItems", listLowStockItems, []),
      safe("countOutstandingInvoices", countOutstandingInvoices, 0),
      safe("countBookingsNeedingAction", countBookingsNeedingAction, 0),
    ]);
    pendingStaffCount = pendingStaff.length;
    lowStockCount = lowStock.length;
    outstandingCount = outstanding;
    newBookingsCount = newBookings;
  }

  // Staff: the bell counts this nurse's own missed visits.
  let missedVisitsCount = 0;
  if (user.role !== "ADMIN" && staff) {
    try {
      missedVisitsCount = await countMissedVisitsForStaff(staff.id);
    } catch (err) {
      console.error("[dashboard-layout] countMissedVisitsForStaff failed:", err);
    }
  }

  // Field staff who have not checked in today see a red reminder at the top
  // of every page until they press "Check in". Office staff and the
  // accountant are not tied to a patient's home.
  let attendanceReminder: { shiftStart: string; lateNow: boolean } | null = null;
  if (
    user.role !== "ADMIN" &&
    staff &&
    staff.profession !== "ADMIN_STAFF" &&
    staff.profession !== "ACCOUNTANT"
  ) {
    try {
      const r = await getAttendanceReminder(staff);
      if (!r.checkedInToday && r.hasPatients) {
        attendanceReminder = { shiftStart: r.shiftStart, lateNow: r.lateNow };
      }
    } catch (err) {
      console.error("[dashboard-layout] getAttendanceReminder failed:", err);
    }
  }

  const notificationCount =
    pendingStaffCount + lowStockCount + outstandingCount + newBookingsCount + missedVisitsCount;

  return (
    <DashboardShell
      fullName={user.fullName}
      role={user.role}
      canBilling={canBilling}
      canClinical={canClinical}
      pendingStaffCount={pendingStaffCount}
      lowStockCount={lowStockCount}
      outstandingCount={outstandingCount}
      newBookingsCount={newBookingsCount}
      notificationCount={notificationCount}
      attendanceReminder={attendanceReminder}
    >
      {children}
    </DashboardShell>
  );
}
