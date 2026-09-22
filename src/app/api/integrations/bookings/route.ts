import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkIntegrationKey } from "@/lib/integration-auth";
import { createBookingSchema } from "@/lib/validation/bookings";
import { createBooking } from "@/lib/repo/bookings";
import { ensureIntegrationUser } from "@/lib/repo/integration-user";

/**
 * Mlango wa kupokea bookings kutoka app ya wateja.
 *
 * `POST /api/bookings` ipo tayari, lakini inahitaji `getCurrentUser()`
 * — cookie ya session ya admin aliyeingia kwenye browser. Server ya app
 * ya wateja haina browser wala cookie, kwa hiyo haiwezi kuitumia kamwe.
 * Ndiyo maana mlango huu upo.
 *
 * Umewekwa `/api/integrations/` na si kuongeza ufunguo kwenye ule wa
 * zamani kwa makusudi: njia mbili tofauti za kuthibitisha kwenye
 * function moja ni jinsi mtu anavyokosea kuruhusu asiyestahili. Ule ni
 * wa binadamu; huu ni wa mashine, na unafanya kitu kimoja tu.
 *
 * Bookings zinazoingia hapa zinakuwa na status NEW, kama nyingine zote,
 * na zinaonekana kwenye ukurasa uleule wa /bookings.
 */

export async function POST(req: NextRequest) {
  const auth = checkIntegrationKey(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON sio sahihi" }, { status: 400 });
  }

  // Schema ileile inayotumika kwenye fomu ya admin. Ikibadilika,
  // inabadilika pande zote mbili kwa wakati mmoja — ambayo ndiyo hoja.
  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }
  const d = parsed.data;

  const integrationUser = await ensureIntegrationUser();

  const booking = await createBooking({
    fullName: d.fullName,
    phone: d.phone,
    serviceType: d.serviceType,
    preferredDate: d.preferredDate ? d.preferredDate : null,
    notes: d.notes ? d.notes : null,
    createdById: integrationUser.id,
  });

  return NextResponse.json({ booking }, { status: 201 });
}

/**
 * GET haipo kwa makusudi. Mlango huu ni wa kuingiza tu — app ya wateja
 * haina sababu ya kusoma bookings za wengine, na Next.js itarudisha
 * 405 yenyewe kwa method yoyote isiyotangazwa hapa.
 */
