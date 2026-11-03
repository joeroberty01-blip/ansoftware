import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentUser } from "@/lib/auth";
import { getHomeVisitById } from "@/lib/repo/home-visits";
import { getPatientById } from "@/lib/repo/patients";
import { assertPatientAccess } from "@/lib/patient-access";
import { hasVitalsAlert } from "@/lib/vitals";
import { VisitReportDocument } from "@/lib/pdf/visit-report-document";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/home-visits/[id]/pdf">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unahitaji kuingia kwanza." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const visit = await getHomeVisitById(id);
  if (!visit) {
    return NextResponse.json({ error: "Ripoti haikupatikana." }, { status: 404 });
  }
  const denied = await assertPatientAccess(session, visit.patient_id);
  if (denied) return denied;

  const patient = await getPatientById(visit.patient_id);
  if (!patient) {
    return NextResponse.json({ error: "Mgonjwa hakupatikana." }, { status: 404 });
  }

  const date = new Date(visit.visit_date).toISOString().slice(0, 10);
  const buffer = await renderToBuffer(
    <VisitReportDocument
      patient={patient}
      visits={[visit]}
      rangeLabel={date}
      alertIds={new Set(hasVitalsAlert(visit) ? [visit.id] : [])}
    />
  );

  const safeName = patient.full_name.replace(/[^a-z0-9]+/gi, "_");
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Ripoti_${safeName}_${date}.pdf"`,
    },
  });
}
