import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createStaffSchema } from "@/lib/validation/staff";
import { createStaffWithUser, listStaffWithUser } from "@/lib/repo/staff";
import { findUserByEmail } from "@/lib/repo/users";

export async function GET(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Ruhusa hairuhusiwi." }, { status: 403 });
  }

  const statusParam = req.nextUrl.searchParams.get("status");
  const userStatus = statusParam === "ALL" ? undefined : (statusParam ?? "APPROVED");

  const staff = await listStaffWithUser(userStatus);
  return NextResponse.json({ staff });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Ruhusa hairuhusiwi." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createStaffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  const existing = await findUserByEmail(parsed.data.email);
  if (existing) {
    return NextResponse.json(
      { error: "Barua pepe hii tayari imesajiliwa." },
      { status: 400 }
    );
  }

  const staff = await createStaffWithUser({
    fullName: parsed.data.fullName,
    email: parsed.data.email,
    phone: parsed.data.phone,
    password: parsed.data.password,
    profession: parsed.data.profession,
    baseSalary: parsed.data.baseSalary,
    allowances: parsed.data.allowances,
    startDate: parsed.data.startDate,
    licenseNumber: parsed.data.licenseNumber ? parsed.data.licenseNumber : null,
    licenseExpiryDate: parsed.data.licenseExpiryDate
      ? parsed.data.licenseExpiryDate
      : null,
  });

  return NextResponse.json({ staff }, { status: 201 });
}
