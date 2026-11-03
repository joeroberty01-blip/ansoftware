import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { paySalary } from "@/lib/repo/payroll";
import { paySalarySchema } from "@/lib/validation/payroll";

const ERROR_RESPONSES: Record<string, { status: number; message: string }> = {
  NOT_FOUND: { status: 404, message: "Payroll haikupatikana." },
  ALREADY_PAID: { status: 400, message: "Payroll hii tayari imelipwa." },
};

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/payroll/[id]/pay">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Ruhusa hairuhusiwi." }, { status: 403 });
  }

  const { id } = await ctx.params;

  const body = await req.json().catch(() => ({}));
  const parsed = paySalarySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  try {
    const payroll = await paySalary(id, session.id, {
      method: parsed.data.paymentMethod,
      reference: parsed.data.paymentReference,
      account: parsed.data.paymentAccount,
    });
    return NextResponse.json({ payroll });
  } catch (err) {
    const code = err instanceof Error ? err.message : "";
    const mapped = ERROR_RESPONSES[code];
    if (mapped) {
      return NextResponse.json(
        { error: mapped.message },
        { status: mapped.status }
      );
    }
    throw err;
  }
}
