import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStaffByUserId } from "@/lib/repo/staff";
import {
  listHomeVisits,
  listUpcomingVisitsForStaff,
  listVisitsNeedingReportForStaff,
  getVisitsTodayComparisonForStaff,
} from "@/lib/repo/home-visits";
import { listDutiesDueTodayForStaff } from "@/lib/repo/duties";
import { getInventoryUsageForUser } from "@/lib/repo/inventory";
import { listExpensesForUser, getExpenseSummaryForUser } from "@/lib/repo/expenses";

function monthRange(offsetMonths: number) {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const to = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 1);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const staff = await getStaffByUserId(session.id);
  if (!staff) {
    return NextResponse.json(
      { error: "Hakuna rekodi ya staff kwa akaunti hii." },
      { status: 404 }
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = monthRange(0);
  const lastMonth = monthRange(-1);

  const [
    todaysVisits,
    upcomingVisits,
    reportsToComplete,
    dutiesToday,
    inventoryUsage,
    recentExpenses,
    expenseSummaryThisMonth,
    expenseSummaryLastMonth,
    visitsComparison,
  ] = await Promise.all([
    listHomeVisits({ staffId: staff.id, visitDate: today }),
    listUpcomingVisitsForStaff(staff.id, 5),
    listVisitsNeedingReportForStaff(staff.id),
    listDutiesDueTodayForStaff(staff.id),
    getInventoryUsageForUser(session.id, thisMonth.from, thisMonth.to),
    listExpensesForUser(session.id, 5),
    getExpenseSummaryForUser(session.id, thisMonth.from, thisMonth.to),
    getExpenseSummaryForUser(session.id, lastMonth.from, lastMonth.to),
    getVisitsTodayComparisonForStaff(staff.id),
  ]);

  const patientsToday = new Set(todaysVisits.map((v) => v.patient_id)).size;

  const lastMonthTotal = Number(expenseSummaryLastMonth.totalThisMonth);
  const thisMonthTotal = Number(expenseSummaryThisMonth.totalThisMonth);
  const expenseChangePct =
    lastMonthTotal > 0
      ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
      : null;

  return NextResponse.json({
    fullName: session.fullName,
    patientsToday,
    visitsToday: visitsComparison.todayCount,
    visitsTodayDelta: visitsComparison.todayCount - visitsComparison.yesterdayCount,
    pendingReportsCount: reportsToComplete.length,
    expensesThisMonth: expenseSummaryThisMonth.totalThisMonth,
    expenseChangePct,
    todaysVisits,
    upcomingVisits,
    reportsToComplete,
    dutiesToday,
    inventoryUsage,
    recentExpenses,
  });
}
