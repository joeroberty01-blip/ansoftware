import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createBookingSchema } from "@/lib/validation/bookings";
import { createBooking, listBookings } from "@/lib/repo/bookings";

export async function GET(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unahitaji kuingia kwanza." }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Ruhusa hairuhusiwi." }, { status: 403 });
  }

  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const bookings = await listBookings({ status });
  return NextResponse.json({ bookings });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unahitaji kuingia kwanza." }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Ruhusa hairuhusiwi." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }
  const d = parsed.data;

  const booking = await createBooking({
    fullName: d.fullName,
    phone: d.phone,
    serviceType: d.serviceType,
    preferredDate: d.preferredDate ? d.preferredDate : null,
    notes: d.notes ? d.notes : null,
    createdById: session.id,
  });

  return NextResponse.json({ booking }, { status: 201 });
}
