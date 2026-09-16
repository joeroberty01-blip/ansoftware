import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateBookingSchema } from "@/lib/validation/bookings";
import { deleteBooking, getBookingById, updateBooking } from "@/lib/repo/bookings";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/bookings/[id]">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unahitaji kuingia kwanza." }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Ruhusa hairuhusiwi." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const booking = await getBookingById(id);
  if (!booking) {
    return NextResponse.json({ error: "Booking haikupatikana." }, { status: 404 });
  }
  return NextResponse.json({ booking });
}

export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/bookings/[id]">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unahitaji kuingia kwanza." }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Ruhusa hairuhusiwi." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const existing = await getBookingById(id);
  if (!existing) {
    return NextResponse.json({ error: "Booking haikupatikana." }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }
  const d = parsed.data;

  const booking = await updateBooking(id, {
    status: d.status,
    assignedStaffId:
      d.assignedStaffId === undefined ? undefined : d.assignedStaffId || null,
    patientId: d.patientId === undefined ? undefined : d.patientId || null,
    notes: d.notes === undefined ? undefined : d.notes || null,
  });

  return NextResponse.json({ booking });
}

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/bookings/[id]">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unahitaji kuingia kwanza." }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Ruhusa hairuhusiwi." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const deleted = await deleteBooking(id);
  if (!deleted) {
    return NextResponse.json({ error: "Booking haikupatikana." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
