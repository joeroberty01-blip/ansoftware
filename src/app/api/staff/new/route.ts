import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { canAddPatientsAndStaff } from "@/lib/permissions";
import { createStaffWithUser } from "@/lib/repo/staff";
import { findUserByEmail } from "@/lib/repo/users";

// The Chief C.O may add clinical staff only. Billing professions (ADMIN_STAFF,
// ACCOUNTANT) open finance records, which the Chief C.O can't see or grant.
const CLINICAL_PROFESSIONS = ["NURSE", "DOCTOR", "CHW"] as const;
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

const schema = z.object({
  fullName: z.string().trim().min(2, "Name is required"),
  email: z.string().trim().email("Invalid email address"),
  phone: z.string().trim().min(9, "Invalid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  profession: z.enum(CLINICAL_PROFESSIONS, { message: "Choose Nurse, Doctor or Caregiver (CHW)." }),
  startDate: date,
  licenseNumber: z.string().trim().max(100).optional().or(z.literal("")),
  licenseExpiryDate: date.optional().or(z.literal("")),
});

/**
 * Adds a staff member without any pay details: salary and allowances start
 * at 0 and only an Admin sets them, from Staff Management.
 */
export async function POST(req: Request) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }
  if (!(await canAddPatientsAndStaff(session))) {
    return NextResponse.json({ error: "You don't have permission to do this." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid data" },
      { status: 400 }
    );
  }
  const d = parsed.data;

  if (await findUserByEmail(d.email)) {
    return NextResponse.json({ error: "This email is already registered." }, { status: 400 });
  }

  const staff = await createStaffWithUser({
    fullName: d.fullName,
    email: d.email,
    phone: d.phone,
    password: d.password,
    profession: d.profession,
    baseSalary: "0",
    allowances: "0",
    startDate: d.startDate,
    licenseNumber: d.licenseNumber || null,
    licenseExpiryDate: d.licenseExpiryDate || null,
  });

  await logAudit({
    userId: session.id,
    action: "STAFF_CREATED",
    entity: "staff",
    entityId: staff.id,
    meta: { profession: d.profession, addedBy: session.role === "ADMIN" ? "ADMIN" : "CHIEF_CO" },
  });

  // Only what the form needs to confirm; no pay fields.
  return NextResponse.json(
    { staff: { id: staff.id, staff_number: staff.staff_number, full_name: staff.full_name } },
    { status: 201 }
  );
}
