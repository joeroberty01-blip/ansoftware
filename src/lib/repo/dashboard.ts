import { queryOne } from "../db";
import { getFinanceSummary, getRevenueTrend, type FinancePeriod } from "./finance";
import { getOutstandingSummary } from "./invoices";
import { countActiveStaff, getStaffStatusCounts } from "./staff";
import { countPatients } from "./patients";
import { getHomeVisitStatusCounts, listHomeVisits } from "./home-visits";
import { listPendingStaff } from "./users";
import { listLowStockItems, listExpiringBatches } from "./inventory";
import { listLeaveRequests } from "./leave";

export interface PendingAction {
  label: string;
  count: number;
  href: string;
}

export interface TodayScheduleItem {
  id: string;
  patientName: string;
  staffName: string | null;
  status: string;
}

export interface DashboardOverview {
  period: FinancePeriod;
  income: string;
  expenses: string;
  netProfit: string;
  outstandingCount: number;
  outstandingAmount: string;
  patientsCount: number;
  activeStaffCount: number;
  todayHomeVisitsCount: number;
  todayHomeVisitsCompleted: number;
  monthlyPayrollTotal: string;
  homeVisitStatusCounts: { scheduled: number; completed: number; cancelled: number };
  staffStatusCounts: {
    active: number;
    onLeave: number;
    inactive: number;
    terminated: number;
  };
  todaySchedule: TodayScheduleItem[];
  pendingActions: PendingAction[];
  revenueTrend: { month: string; income: string }[];
}

export async function getDashboardOverview(
  period: FinancePeriod
): Promise<DashboardOverview> {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [
    finance,
    outstanding,
    patientsCount,
    activeStaffCount,
    homeVisitStatusCounts,
    staffStatusCounts,
    todayVisits,
    pendingStaff,
    lowStock,
    expiring,
    pendingLeave,
    revenueTrend,
    payrollRow,
  ] = await Promise.all([
    getFinanceSummary(period),
    getOutstandingSummary(),
    countPatients(),
    countActiveStaff(),
    getHomeVisitStatusCounts(),
    getStaffStatusCounts(),
    listHomeVisits({ visitDate: todayStr }),
    listPendingStaff(),
    listLowStockItems(),
    listExpiringBatches(30),
    listLeaveRequests({ status: "PENDING" }),
    getRevenueTrend(6),
    queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(net_pay), 0) AS total
       FROM payrolls
       WHERE month = EXTRACT(MONTH FROM CURRENT_DATE)::int
         AND year = EXTRACT(YEAR FROM CURRENT_DATE)::int`
    ),
  ]);

  const todayHomeVisitsCompleted = todayVisits.filter(
    (v) => v.status === "COMPLETED"
  ).length;

  const pendingActions: PendingAction[] = [
    {
      label: "Staff wanaosubiri idhini",
      count: pendingStaff.length,
      href: "/staff/pending",
    },
    {
      label: "Likizo zinazosubiri idhini",
      count: pendingLeave.length,
      href: "/staff",
    },
    {
      label: "Invoices zinazosubiri malipo",
      count: outstanding.count,
      href: "/billing",
    },
    {
      label: "Items chini ya stock",
      count: lowStock.length,
      href: "/inventory/alerts",
    },
    {
      label: "Batches zinazokaribia kuisha",
      count: expiring.length,
      href: "/inventory/alerts",
    },
  ].filter((a) => a.count > 0);

  return {
    period,
    income: finance.income,
    expenses: finance.expenses,
    netProfit: finance.netProfit,
    outstandingCount: outstanding.count,
    outstandingAmount: outstanding.amount,
    patientsCount,
    activeStaffCount,
    todayHomeVisitsCount: todayVisits.length,
    todayHomeVisitsCompleted,
    monthlyPayrollTotal: payrollRow?.total ?? "0.00",
    homeVisitStatusCounts,
    staffStatusCounts,
    todaySchedule: todayVisits.slice(0, 6).map((v) => ({
      id: v.id,
      patientName: v.patient_name,
      staffName: v.staff_name,
      status: v.status,
    })),
    pendingActions,
    revenueTrend,
  };
}
