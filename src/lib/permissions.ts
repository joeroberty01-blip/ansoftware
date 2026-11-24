import { NextResponse } from "next/server";
import { getStaffByUserId } from "./repo/staff";
import type { Profession, UserRole } from "./types";

// Role-based access. ADMIN can do everything. Staff access depends on their
// profession:
//   NURSE / DOCTOR / CHW (caregiver) - clinical area only (patients assigned
//                                      to them, visits, MAR, documents)
//   ACCOUNTANT                       - billing area (invoices, clients,
//                                      payments, receipts) only
//   ADMIN_STAFF (front desk)         - both areas
// The Chief C.O is clinical only, whatever their profession: no finance
// records, not even their own expense requests.
const BILLING_PROFESSIONS: Profession[] = ["ACCOUNTANT", "ADMIN_STAFF"];

export function canAccessBilling(
  role: UserRole,
  profession: Profession | null | undefined,
  isChiefCo = false
): boolean {
  if (role === "ADMIN") return true;
  if (isChiefCo) return false;
  return !!profession && BILLING_PROFESSIONS.includes(profession);
}

export async function userCanAccessBilling(user: {
  id: string;
  role: UserRole;
}): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  const staff = await getStaffByUserId(user.id);
  return canAccessBilling(user.role, staff?.profession, staff?.is_chief_co);
}

/** True for the Chief C.O, who sees no finance records. */
export async function isFinanceHidden(user: { id: string; role: UserRole }): Promise<boolean> {
  if (user.role === "ADMIN") return false;
  return !!(await getStaffByUserId(user.id))?.is_chief_co;
}

/** API guard: returns a 403 response when the user may not use billing. */
export async function assertBillingAccess(user: {
  id: string;
  role: UserRole;
}): Promise<NextResponse | null> {
  if (await userCanAccessBilling(user)) return null;
  return NextResponse.json(
    { error: "You don't have access to payments and invoices." },
    { status: 403 }
  );
}
