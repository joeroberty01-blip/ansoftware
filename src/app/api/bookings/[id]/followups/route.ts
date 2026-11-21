import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { withTransaction } from "@/lib/db";
import {
  getBookingById,
  insertFollowUp,
  listFollowUps,
  updateBooking,
} from "@/lib/repo/bookings";
import { createFollowUpSchema } from "@/lib/validation/bookings";

async function requireAdmin() {
  const session = await getCurrentUser();
  if (!session) {
    return { error: NextResponse.json({ error: "Please sign in first." }, { status: 401 }) };
  }
  if (session.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "You don't have permission to do this." }, { status: 403 }) };
  }
  return { session };
}

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/bookings/[id]/followups">
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  const followUps = await listFollowUps(id);
  return NextResponse.json({ followUps });
}

/**
 * Logs one call or message with this request and sets when to contact it
 * next (or clears it). Optionally changes the booking's status in the
 * same transaction.
 */
export async function POST(
  req: Request,
  ctx: RouteContext<"/api/bookings/[id]/followups">
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { session } = auth;

  const { id } = await ctx.params;
  const existing = await getBookingById(id);
  if (!existing) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
  const parsed = createFollowUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid data" },
      { status: 400 }
    );
  }
  const d = parsed.data;
  const next = d.nextFollowUpDate ? d.nextFollowUpDate : null;

  const booking = await withTransaction(async (client) => {
    const entry = await insertFollowUp(client, {
      bookingId: id,
      channel: d.channel,
      note: d.note,
      nextFollowUpDate: next,
      createdById: session.id,
    });
    const updated = await updateBooking(
      id,
      { status: d.status, nextFollowUpDate: next },
      client
    );
    await logAudit(
      {
        userId: session.id,
        action: "BOOKING_FOLLOW_UP",
        entity: "booking",
        entityId: id,
        meta: { followUpId: entry.id, channel: d.channel, next, status: d.status ?? null },
      },
      client
    );
    return updated;
  });

  return NextResponse.json({ booking }, { status: 201 });
}
