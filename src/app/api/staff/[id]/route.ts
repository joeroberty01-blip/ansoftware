import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateStaffSchema } from "@/lib/validation/staff";
import { getStaffById, updateStaffProfile } from "@/lib/repo/staff";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/staff/[id]">
) {
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

  const { id } = await ctx.params;
  const staff = await getStaffById(id);
  if (!staff) {
    return NextResponse.json({ error: "Staff hakupatikana." }, { status: 404 });
  }

  return NextResponse.json({ staff });
}

export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/staff/[id]">
) {
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

  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = updateStaffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  const staff = await updateStaffProfile(id, {
    profession: parsed.data.profession,
    licenseNumber:
      parsed.data.licenseNumber === undefined
        ? undefined
        : parsed.data.licenseNumber || null,
    licenseExpiryDate:
      parsed.data.licenseExpiryDate === undefined
        ? undefined
        : parsed.data.licenseExpiryDate || null,
    employmentStatus: parsed.data.employmentStatus,
    baseSalary: parsed.data.baseSalary,
    allowances: parsed.data.allowances,
    startDate: parsed.data.startDate,
  });

  if (!staff) {
    return NextResponse.json({ error: "Staff hakupatikana." }, { status: 404 });
  }

  return NextResponse.json({ staff });
}
