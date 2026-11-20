import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { createHomeVisitSchema } from "@/lib/validation/home-visits";
import {
  createHomeVisit,
  fillScheduledVisit,
  findVisitForSession,
  listHomeVisits,
} from "@/lib/repo/home-visits";
import { DAILY_SESSION_LABELS } from "@/lib/daily-reports";
import { eatToday, hasCheckInToday } from "@/lib/repo/attendance";
import { assertPatientAccess } from "@/lib/patient-access";
import { getStaffByUserId } from "@/lib/repo/staff";

export async function GET(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const patientId = req.nextUrl.searchParams.get("patientId") ?? undefined;
  let staffId = req.nextUrl.searchParams.get("staffId") ?? undefined;
  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  // One day only (the daily report page).
  const dateParam = req.nextUrl.searchParams.get("date");
  const visitDate = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : undefined;

  if (session.role !== "ADMIN") {
    if (patientId) {
      const denied = await assertPatientAccess(session, patientId);
      if (denied) return denied;
    } else {
      // Browsing the general list (no specific patient) — scope to visits
      // this staff member performed themselves.
      const ownStaff = await getStaffByUserId(session.id);
      if (!ownStaff) return NextResponse.json({ visits: [] });
      staffId = ownStaff.id;
    }
  }

  const visits = await listHomeVisits({ patientId, staffId, status, visitDate });
  return NextResponse.json({ visits });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const body = await req.json();
  const parsed = createHomeVisitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  const d = parsed.data;

  let staffId = d.staffId ? d.staffId : null;
  if (session.role !== "ADMIN") {
    const denied = await assertPatientAccess(session, d.patientId);
    if (denied) return denied;
    // Staff always file reports under their own name, never on behalf of
    // someone else.
    const ownStaff = await getStaffByUserId(session.id);
    staffId = ownStaff?.id ?? null;
    // Part-time visits are recorded only by the appointed Chief C.O (or an Admin).
    if (d.visitType === "PART_TIME" && !ownStaff?.is_chief_co) {
      return NextResponse.json(
        { error: "Ni Chief C.O pekee anayeweza kurekodi ziara za Part-time." },
        { status: 403 }
      );
    }
    // Field staff fill today's report only after checking in at this
    // patient's home (selfie + GPS). Office staff are not tied to a home.
    if (
      ownStaff &&
      ownStaff.profession !== "ADMIN_STAFF" &&
      d.status === "COMPLETED" &&
      d.visitDate === (await eatToday()) &&
      !(await hasCheckInToday(ownStaff.id, d.patientId))
    ) {
      return NextResponse.json(
        {
          error:
            'Bonyeza "Nimefika kazini" kwenye Dashboard kwanza (selfie na GPS kwa mgonjwa huyu), kisha ujaze ripoti.',
          code: "ATTENDANCE_REQUIRED",
        },
        { status: 403 }
      );
    }
  }

  // One report per patient per day, split into morning, afternoon and
  // evening: every new entry names its session, and a session is filled once.
  if (!d.visitSession) {
    return NextResponse.json(
      { error: "Chagua muda wa ripoti: Asubuhi, Mchana au Jioni." },
      { status: 400 }
    );
  }
  const sessionWord = DAILY_SESSION_LABELS[d.visitSession];
  const existing = await findVisitForSession(d.patientId, d.visitDate, d.visitSession);
  if (existing && (existing.status !== "SCHEDULED" || d.status === "SCHEDULED")) {
    return NextResponse.json(
      {
        error: `Ripoti ya ${sessionWord} ya ${d.visitDate} kwa mgonjwa huyu tayari ipo. Ifungue uihariri badala ya kuandika nyingine.`,
        existingId: existing.id,
      },
      { status: 409 }
    );
  }

  const fields = {
    staffId,
    visitType: d.visitType,
    status: d.status,
    location: d.location ? d.location : null,
    checkInLat: d.checkInLat ?? null,
    checkInLng: d.checkInLng ?? null,
    checkInAccuracyM: d.checkInAccuracyM ?? null,
    bloodPressure: d.bloodPressure ? d.bloodPressure : null,
    temperature: d.temperature ? d.temperature : null,
    pulse: d.pulse ?? null,
    weight: d.weight ? d.weight : null,
    heightCm: d.heightCm ? d.heightCm : null,
    bloodGlucose: d.bloodGlucose ? d.bloodGlucose : null,
    spo2: d.spo2 ?? null,
    foodIntake: d.foodIntake ? d.foodIntake : null,
    treatmentNotes: d.treatmentNotes ? d.treatmentNotes : null,
    notes: d.notes ? d.notes : null,
  };

  // A session that was only planned (care plan) gets this report written
  // into it, so it stops counting as missed and is not doubled.
  if (existing) {
    const filled = await fillScheduledVisit(existing.id, fields);
    if (filled) {
      await logAudit({ userId: session.id, action: "HOME_VISIT_UPDATED", entity: "home_visit", entityId: filled.id, meta: { patientId: filled.patient_id, filledScheduled: true } });
      return NextResponse.json({ visit: filled, filledScheduled: true }, { status: 200 });
    }
  }

  const visit = await createHomeVisit({
    ...fields,
    patientId: d.patientId,
    visitDate: d.visitDate,
    visitSession: d.visitSession,
    createdById: session.id,
  });

  await logAudit({ userId: session.id, action: "HOME_VISIT_CREATED", entity: "home_visit", entityId: visit.id, meta: { patientId: visit.patient_id } });
  return NextResponse.json({ visit }, { status: 201 });
}
