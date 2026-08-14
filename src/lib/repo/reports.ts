import { query } from "../db";
import { countActivePatients, countNewPatientsThisMonth, countPatients } from "./patients";
import { getStaffStatusCounts, listExpiringLicenses } from "./staff";
import { getStaffVisitLeaderboard } from "./home-visits";
import { listLowStockItems, listExpiringBatches } from "./inventory";
import { getFinanceSummary } from "./finance";

export interface GenderBreakdownRow {
  gender: string | null;
  count: number;
}

export async function getPatientGenderBreakdown(): Promise<GenderBreakdownRow[]> {
  const rows = await query<{ gender: string | null; count: string }>(
    `SELECT gender, COUNT(*)::text AS count FROM patients GROUP BY gender`
  );
  return rows.map((r) => ({ gender: r.gender, count: parseInt(r.count, 10) }));
}

export interface NursePatientLoadRow {
  staffId: string;
  staffName: string;
  patientCount: number;
}

/** How many patients are currently assigned to each active nurse. */
export async function getPatientsPerNurse(): Promise<NursePatientLoadRow[]> {
  const rows = await query<{ staff_id: string; staff_name: string; count: string }>(
    `SELECT s.id AS staff_id, u.full_name AS staff_name, COUNT(p.id)::text AS count
     FROM staff s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN patients p ON p.assigned_staff_id = s.id
     WHERE s.employment_status = 'ACTIVE'
     GROUP BY s.id, u.full_name
     ORDER BY COUNT(p.id) DESC, u.full_name ASC`
  );
  return rows.map((r) => ({
    staffId: r.staff_id,
    staffName: r.staff_name,
    patientCount: parseInt(r.count, 10),
  }));
}

export interface VisitStatusBreakdownRow {
  status: string;
  count: number;
}

/** Home visit status counts over the last `days` days. */
export async function getVisitStatusBreakdown(
  days: number
): Promise<VisitStatusBreakdownRow[]> {
  const rows = await query<{ status: string; count: string }>(
    `SELECT status, COUNT(*)::text AS count FROM home_visits
     WHERE visit_date >= CURRENT_DATE - $1::int
     GROUP BY status`,
    [days]
  );
  return rows.map((r) => ({ status: r.status, count: parseInt(r.count, 10) }));
}

export interface ReportsOverview {
  days: number;
  patientsCount: number;
  newPatientsThisMonth: number;
  activePatientsCount: number;
  genderBreakdown: GenderBreakdownRow[];
  patientsPerNurse: NursePatientLoadRow[];
  visitStatusBreakdown: VisitStatusBreakdownRow[];
  staffLeaderboard: { staffId: string; staffName: string; completedCount: number }[];
  staffStatusCounts: {
    active: number;
    onLeave: number;
    inactive: number;
    terminated: number;
  };
  expiringLicenses: { staffId: string; staffName: string; expiryDate: string | null }[];
  lowStockItems: { id: string; name: string; unit: string; currentStock: string; reorderLevel: number }[];
  expiringBatches: {
    itemId: string;
    itemName: string;
    batchNumber: string | null;
    expiryDate: string;
    quantity: number;
  }[];
  income: string;
  expenses: string;
  netProfit: string;
}

export async function getReportsOverview(days: number): Promise<ReportsOverview> {
  const [
    patientsCount,
    newPatientsThisMonth,
    activePatientsCount,
    genderBreakdown,
    patientsPerNurse,
    visitStatusBreakdown,
    staffLeaderboardRows,
    staffStatusCounts,
    expiringLicenseRows,
    lowStock,
    expiringBatchesRows,
    finance,
  ] = await Promise.all([
    countPatients(),
    countNewPatientsThisMonth(),
    countActivePatients(),
    getPatientGenderBreakdown(),
    getPatientsPerNurse(),
    getVisitStatusBreakdown(days),
    getStaffVisitLeaderboard(days, 50),
    getStaffStatusCounts(),
    listExpiringLicenses(90),
    listLowStockItems(),
    listExpiringBatches(90),
    getFinanceSummary("month"),
  ]);

  return {
    days,
    patientsCount,
    newPatientsThisMonth,
    activePatientsCount,
    genderBreakdown,
    patientsPerNurse,
    visitStatusBreakdown,
    staffLeaderboard: staffLeaderboardRows.map((r) => ({
      staffId: r.staff_id,
      staffName: r.staff_name,
      completedCount: parseInt(r.completed_count, 10),
    })),
    staffStatusCounts,
    expiringLicenses: expiringLicenseRows.map((r) => ({
      staffId: r.id,
      staffName: r.full_name,
      expiryDate: r.license_expiry_date,
    })),
    lowStockItems: lowStock.map((i) => ({
      id: i.id,
      name: i.name,
      unit: i.unit,
      currentStock: i.current_stock,
      reorderLevel: i.reorder_level,
    })),
    expiringBatches: expiringBatchesRows.map((b) => ({
      itemId: b.item_id,
      itemName: b.item_name,
      batchNumber: b.batch_number,
      expiryDate: b.expiry_date ?? "",
      quantity: b.quantity,
    })),
    income: finance.income,
    expenses: finance.expenses,
    netProfit: finance.netProfit,
  };
}
