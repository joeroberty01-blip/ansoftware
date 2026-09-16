import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCarePlanById, generateVisitsForCarePlan } from "@/lib/repo/care-plans";
import { assertPatientAccess } from "@/lib/patient-access";

const ERROR_RESPONSES: Record<string, { status: number; message: string }> = {
  NOT_FOUND: { status: 404, message: "Care plan haikupatikana." },
  NOT_ACTIVE: {
    status: 400,
    message: "Care plan hii si ACTIVE — haiwezi kutengeneza ziara.",
  },
};

export async function POST(
  _req: Request,
  ctx: RouteContext<"/api/care-plans/[id]/generate">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unahitaji kuingia kwanza." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const plan = await getCarePlanById(id);
  if (!plan) {
    return NextResponse.json({ error: "Care plan haikupatikana." }, { status: 404 });
  }
  const denied = await assertPatientAccess(session, plan.patient_id);
  if (denied) return denied;

  try {
    const result = await generateVisitsForCarePlan(id, session.id);
    return NextResponse.json(result);
  } catch (err) {
    const code = err instanceof Error ? err.message : "";
    const mapped = ERROR_RESPONSES[code];
    if (mapped) {
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }
    throw err;
  }
}
