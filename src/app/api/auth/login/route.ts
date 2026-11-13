import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { findUserByEmail } from "@/lib/repo/users";
import { loginSchema } from "@/lib/validation/auth";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Data sio sahihi" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  try {
    const { email, password } = parsed.data;
    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: "Barua pepe au password sio sahihi." },
        { status: 401 }
      );
    }

    const validPassword = await verifyPassword(password, user.password_hash);
    if (!validPassword) {
      return NextResponse.json(
        { error: "Barua pepe au password sio sahihi." },
        { status: 401 }
      );
    }

    if (user.status === "PENDING") {
      return NextResponse.json(
        { error: "Akaunti yako bado inasubiri idhini ya Admin." },
        { status: 403 }
      );
    }
    if (user.status === "REJECTED" || user.status === "SUSPENDED") {
      return NextResponse.json(
        { error: "Akaunti yako haijaruhusiwa kuingia. Wasiliana na Admin." },
        { status: 403 }
      );
    }

    await setSessionCookie({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      status: user.status,
    });

    return NextResponse.json({
      message: "Umeingia kikamilifu.",
      user: { id: user.id, role: user.role, fullName: user.full_name },
    });
  } catch (err) {
    // Shows the real cause in Vercel → Logs instead of an empty 500.
    console.error("[login] unexpected error:", err);
    return NextResponse.json(
      { error: "Hitilafu ya seva. Jaribu tena baadaye." },
      { status: 500 }
    );
  }
}
