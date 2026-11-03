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
const BILLING_PROFESSIONS: Profession[] = ["ACCOUNTANT", "ADMIN_STAFF"];

export function canAccessBilling(
  role: UserRole,
  profession: Profession | null | undefined
): boolean {
  if (role === "ADMIN") return true;
  return !!profession && BILLING_PROFESSIONS.includes(profession);
}

export async function userCanAccessBilling(user: {
  id: string;
  role: UserRole;
}): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  const staff = await getStaffByUserId(user.id);
  return canAccessBilling(user.role, staff?.profession);
}

/** API guard: returns a 403 response when the user may not use billing. */
export async function assertBillingAccess(user: {
  id: string;
  role: UserRole;
}): Promise<NextResponse | null> {
  if (await userCanAccessBilling(user)) return null;
  return NextResponse.json(
    { error: "Huna ruhusa ya kufikia sehemu ya malipo na invoices." },
    { status: 403 }
  );
}
