import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getBookingById, updateBooking } from "@/lib/repo/bookings";
import { createPatient } from "@/lib/repo/patients";

export async function POST(
  _req: Request,
  ctx: RouteContext<"/api/bookings/[id]/convert-to-patient">
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
  if (booking.patient_id) {
    return NextResponse.json(
      { error: "Booking hii tayari imeunganishwa na mgonjwa." },
      { status: 400 }
    );
  }

  const patient = await createPatient({
    fullName: booking.full_name,
    dateOfBirth: null,
    gender: null,
    phone: booking.phone,
    email: null,
    address: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    bloodType: null,
    allergies: null,
    chronicConditions: null,
    notes: booking.notes,
    createdById: session.id,
  });

  const updated = await updateBooking(id, { patientId: patient.id });

  return NextResponse.json({ patient, booking: updated });
}
