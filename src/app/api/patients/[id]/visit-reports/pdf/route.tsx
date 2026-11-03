import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentUser } from "@/lib/auth";
import { listHomeVisits } from "@/lib/repo/home-visits";
import { getPatientById } from "@/lib/repo/patients";
import { assertPatientAccess } from "@/lib/patient-access";
import { hasVitalsAlert } from "@/lib/vitals";
import { VisitReportDocument } from "@/lib/pdf/visit-report-document";

const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

export async function GET(
  req: NextRequest,
  ctx: RouteContext<"/api/patients/[id]/visit-reports/pdf">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unahitaji kuingia kwanza." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const denied = await assertPatientAccess(session, id);
  if (denied) return denied;

  const patient = await getPatientById(id);
  if (!patient) {
    return NextResponse.json({ error: "Mgonjwa hakupatikana." }, { status: 404 });
  }

  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam = req.nextUrl.searchParams.get("to");
  const from = isDate(fromParam) ? fromParam : null;
  const to = isDate(toParam) ? toParam : null;

  const all = await listHomeVisits({ patientId: id });
  const visits = all.filter((v) => {
    const d = new Date(v.visit_date).toISOString().slice(0, 10);
    return (!from || d >= from) && (!to || d <= to);
  });

  const rangeLabel =
    from || to ? `${from ?? "mwanzo"} hadi ${to ?? "leo"}` : "Ziara zote";
  const alertIds = new Set(visits.filter((v) => hasVitalsAlert(v)).map((v) => v.id));

  const buffer = await renderToBuffer(
    <VisitReportDocument
      patient={patient}
      visits={visits}
      rangeLabel={rangeLabel}
      alertIds={alertIds}
    />
  );

  const safeName = patient.full_name.replace(/[^a-z0-9]+/gi, "_");
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Ripoti_za_Ziara_${safeName}.pdf"`,
    },
  });
}
