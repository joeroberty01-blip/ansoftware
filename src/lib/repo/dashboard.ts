import { queryOne } from "../db";
import {
  getExpenseTrend,
  getFinanceComparison,
  getFinanceSummary,
  getRevenueTrend,
  type FinancePeriod,
} from "./finance";
import { getOutstandingSummary } from "./invoices";
import { countActiveStaff, getStaffStatusCounts, listExpiringLicenses } from "./staff";
import { countActivePatients, countNewPatientsThisMonth, countPatients } from "./patients";
import {
  countMissedVisits,
  getHomeVisitStatusCounts,
  getStaffVisitLeaderboard,
  listHomeVisits,
} from "./home-visits";
import { listPendingStaff } from "./users";
import { listLowStockItems, listExpiringBatches } from "./inventory";
import { listLeaveRequests } from "./leave";
import { listRecentActivity, type AuditLogWithUser } from "../audit";

const ACTIVITY_LABELS: Record<string, string> = {
  PAYMENT_RECORDED: "alirekodi malipo",
  LEAVE_APPROVED: "aliidhinisha likizo",
  LEAVE_REJECTED: "alikataa ombi la likizo",
  STAFF_APPROVED: "aliidhinisha staff mpya",
  STAFF_REJECTED: "alikataa ombi la staff",
  PAYROLL_GENERATED: "alitengeneza payroll",
  EXPENSE_CREATED: "aliongeza expense",
  STOCK_IN: "aliongeza stock",
  STOCK_OUT: "alitoa stock",
  INVOICE_CANCELLED: "aliighairi invoice",
  SALARY_PAID: "alilipa mshahara",
  BILL_PAID: "alilipa bill",
};

function formatActivity(log: AuditLogWithUser): string {
  const action = ACTIVITY_LABELS[log.action] ?? log.action.toLowerCase();
  const amountPart = log.amount ? ` — TZS ${Number(log.amount).toLocaleString("en-TZ")}` : "";
  return `${log.user_name} ${action}${amountPart}`;
}

function percentChange(current: string, previous: string): number | null {
  const prev = Number(previous);
  const curr = Number(current);
  if (prev === 0) return curr === 0 ? 0 : null;
  return Math.round(((curr - prev) / prev) * 100);
}

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
  expenseTrend: { month: string; expenses: string }[];
  incomeChangePct: number | null;
  expenseChangePct: number | null;
  missedVisitsCount: number;
  expiringLicensesCount: number;
  newPatientsThisMonth: number;
  activePatientsCount: number;
  staffLeaderboard: { staffId: string; staffName: string; completedCount: number }[];
  recentActivity: { id: string; message: string; createdAt: string }[];
}

export async function getDashboardOverview(
  period: FinancePeriod
): Promise<DashboardOverview> {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [
    finance,
    financeComparison,
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
    expenseTrend,
    payrollRow,
    missedVisitsCount,
    expiringLicenses,
    newPatientsThisMonth,
    activePatientsCount,
    staffLeaderboardRows,
    recentActivityRows,
  ] = await Promise.all([
    getFinanceSummary(period),
    getFinanceComparison(period),
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
    getExpenseTrend(6),
    queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(net_pay), 0) AS total
       FROM payrolls
       WHERE month = EXTRACT(MONTH FROM CURRENT_DATE)::int
         AND year = EXTRACT(YEAR FROM CURRENT_DATE)::int`
    ),
    countMissedVisits(),
    listExpiringLicenses(30),
    countNewPatientsThisMonth(),
    countActivePatients(),
    getStaffVisitLeaderboard(30),
    listRecentActivity(8),
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
    {
      label: "Ziara zilizokosekana (missed)",
      count: missedVisitsCount,
      href: "/home-visits",
    },
    {
      label: "Leseni za staff zinazokaribia kuisha",
      count: expiringLicenses.length,
      href: "/staff",
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
    expenseTrend,
    incomeChangePct: percentChange(financeComparison.income, financeComparison.previousIncome),
    expenseChangePct: percentChange(
      financeComparison.expenses,
      financeComparison.previousExpenses
    ),
    missedVisitsCount,
    expiringLicensesCount: expiringLicenses.length,
    newPatientsThisMonth,
    activePatientsCount,
    staffLeaderboard: staffLeaderboardRows.map((r) => ({
      staffId: r.staff_id,
      staffName: r.staff_name,
      completedCount: parseInt(r.completed_count, 10),
    })),
    recentActivity: recentActivityRows.map((a) => ({
      id: a.id,
      message: formatActivity(a),
      createdAt: a.created_at,
    })),
  };
}
