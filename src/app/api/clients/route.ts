import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClientSchema } from "@/lib/validation/clients";
import { createClient, listClients } from "@/lib/repo/clients";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const clients = await listClients();
  return NextResponse.json({ clients });
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
  const parsed = createClientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  const client = await createClient({
    name: parsed.data.name,
    phone: parsed.data.phone,
    email: parsed.data.email ? parsed.data.email : null,
    type: parsed.data.type,
    address: parsed.data.address ? parsed.data.address : null,
  });

  return NextResponse.json({ client }, { status: 201 });
}
