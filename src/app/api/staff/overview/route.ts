import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getStaffByDepartment,
  getStaffGrowth,
  getStaffStatusCounts,
} from "@/lib/repo/staff";
import { getMonthlyPayrollComparison } from "@/lib/repo/payroll";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "You need to sign in first." },
      { status: 401 }
    );
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Permission denied." }, { status: 403 });
  }

  const [statusCounts, growth, departments, payroll] = await Promise.all([
    getStaffStatusCounts(),
    getStaffGrowth(),
    getStaffByDepartment(),
    getMonthlyPayrollComparison(),
  ]);

  return NextResponse.json({
    statusCounts,
    growth,
    departments,
    payroll,
  });
}
