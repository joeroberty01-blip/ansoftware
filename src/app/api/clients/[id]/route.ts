import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateClientSchema } from "@/lib/validation/clients";
import { deleteClient, getClientById, updateClient } from "@/lib/repo/clients";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/clients/[id]">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const { id } = await ctx.params;
  const client = await getClientById(id);
  if (!client) {
    return NextResponse.json({ error: "Client hakupatikana." }, { status: 404 });
  }

  return NextResponse.json({ client });
}

export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/clients/[id]">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = updateClientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const client = await updateClient(id, {
    name: d.name,
    phone: d.phone,
    email: d.email === undefined ? undefined : d.email || null,
    type: d.type,
    address: d.address === undefined ? undefined : d.address || null,
  });

  if (!client) {
    return NextResponse.json({ error: "Client hakupatikana." }, { status: 404 });
  }

  return NextResponse.json({ client });
}

const DELETE_ERROR_RESPONSES: Record<string, { status: number; message: string }> = {
  NOT_FOUND: { status: 404, message: "Client hakupatikana." },
  HAS_INVOICES: {
    status: 400,
    message: "Client huyu ana hati (invoices) zilizopo, hawezi kufutwa.",
  },
};

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/clients/[id]">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const { id } = await ctx.params;
  try {
    await deleteClient(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const code = err instanceof Error ? err.message : "";
    const mapped = DELETE_ERROR_RESPONSES[code];
    if (mapped) {
      return NextResponse.json(
        { error: mapped.message },
        { status: mapped.status }
      );
    }
    throw err;
  }
}
