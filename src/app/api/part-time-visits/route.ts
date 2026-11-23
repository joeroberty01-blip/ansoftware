import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getStaffByUserId } from "@/lib/repo/staff";
import { createHomeVisit } from "@/lib/repo/home-visits";
import {
  listActiveStaffOptions,
  listPartTimeVisits,
  listPatientOptions,
  summarisePartTimeVisitsByStaff,
} from "@/lib/repo/part-time-visits";
import { HOME_VISIT_STATUSES, VISIT_SESSIONS } from "@/lib/validation/home-visits";

/** Part-time visits are recorded and reviewed by an Admin or the Chief C.O only. */
async function requirePartTimeAccess() {
  const session = await getCurrentUser();
  if (!session) {
    return { error: NextResponse.json({ error: "Please sign in first." }, { status: 401 }) };
  }
  if (session.role !== "ADMIN") {
    const ownStaff = await getStaffByUserId(session.id);
    if (!ownStaff?.is_chief_co) {
      return {
        error: NextResponse.json(
          { error: "Only an Admin or the Chief C.O can manage Part-time visits." },
          { status: 403 }
        ),
      };
    }
  }
  return { session };
}

/** "2026-11" -> ["2026-11-01", "2026-12-01"]; anything else -> null. */
function monthRange(month: string): [string, string] | null {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return null;
  const year = Number(m[1]);
  const mon = Number(m[2]);
  if (mon < 1 || mon > 12) return null;
  const next = mon === 12 ? `${year + 1}-01` : `${year}-${String(mon + 1).padStart(2, "0")}`;
  return [`${month}-01`, `${next}-01`];
}

export async function GET(req: NextRequest) {
  const access = await requirePartTimeAccess();
  if (access.error) return access.error;

  const month = req.nextUrl.searchParams.get("month") ?? "";
  const range = monthRange(month);
  if (!range) {
    return NextResponse.json({ error: "Choose a month (YYYY-MM)." }, { status: 400 });
  }
  const staffId = req.nextUrl.searchParams.get("staffId") || undefined;
  const filters = { from: range[0], to: range[1], staffId };

  const [visits, summary, staff, patients] = await Promise.all([
    listPartTimeVisits(filters),
    summarisePartTimeVisitsByStaff(filters),
    listActiveStaffOptions(),
    listPatientOptions(),
  ]);
  return NextResponse.json({ visits, summary, staff, patients });
}

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

const createPartTimeVisitSchema = z.object({
  patientId: z.string().min(1, "Select a patient."),
  staffId: z.string().min(1, "Select the nurse who made the visit."),
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  visitSession: z.enum(VISIT_SESSIONS).optional().or(z.literal("")),
  status: z.enum(HOME_VISIT_STATUSES).default("COMPLETED"),
  location: optionalText(300),
  treatmentNotes: optionalText(2000),
  notes: optionalText(1000),
});

export async function POST(req: NextRequest) {
  const access = await requirePartTimeAccess();
  if (access.error) return access.error;
  const { session } = access;

  const body = await req.json().catch(() => null);
  const parsed = createPartTimeVisitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid data" },
      { status: 400 }
    );
  }
  const d = parsed.data;

  const staffOptions = await listActiveStaffOptions();
  if (!staffOptions.some((s) => s.id === d.staffId)) {
    return NextResponse.json({ error: "That nurse is not an active staff member." }, { status: 400 });
  }

  let visit;
  try {
    visit = await createHomeVisit({
      patientId: d.patientId,
      staffId: d.staffId,
      visitDate: d.visitDate,
      visitSession: d.visitSession ? d.visitSession : null,
      visitType: "PART_TIME",
      status: d.status,
      location: d.location ? d.location : null,
      checkInLat: null,
      checkInLng: null,
      checkInAccuracyM: null,
      bloodPressure: null,
      temperature: null,
      pulse: null,
      weight: null,
      heightCm: null,
      bloodGlucose: null,
      spo2: null,
      foodIntake: null,
      treatmentNotes: d.treatmentNotes ? d.treatmentNotes : null,
      notes: d.notes ? d.notes : null,
      createdById: session.id,
    });
  } catch (err) {
    // 23503 = foreign key violation: the patient does not exist.
    if ((err as { code?: string }).code === "23503") {
      return NextResponse.json({ error: "That patient was not found." }, { status: 400 });
    }
    throw err;
  }

  await logAudit({
    userId: session.id,
    action: "HOME_VISIT_CREATED",
    entity: "home_visit",
    entityId: visit.id,
    meta: { patientId: visit.patient_id, visitType: "PART_TIME" },
  });
  return NextResponse.json({ visit }, { status: 201 });
}
