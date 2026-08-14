import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateProfileSchema } from "@/lib/validation/settings";
import { updateUserProfile } from "@/lib/repo/users";

export async function PATCH(req: Request) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const body = await req.json();
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  const user = await updateUserProfile(session.id, parsed.data);
  return NextResponse.json({
    user: user
      ? { fullName: user.full_name, phone: user.phone, email: user.email }
      : null,
  });
}
