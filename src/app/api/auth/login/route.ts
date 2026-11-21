import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { findUserByEmail } from "@/lib/repo/users";
import { loginSchema } from "@/lib/validation/auth";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid data" },
      { status: 400 }
    );
  }
  try {
    const { email, password, role } = parsed.data;
    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: "Incorrect email or password." },
        { status: 401 }
      );
    }

    const validPassword = await verifyPassword(password, user.password_hash);
    if (!validPassword) {
      return NextResponse.json(
        { error: "Incorrect email or password." },
        { status: 401 }
      );
    }

    if (user.status === "PENDING") {
      return NextResponse.json(
        { error: "Your account is still waiting for Admin approval." },
        { status: 403 }
      );
    }
    if (user.status === "REJECTED" || user.status === "SUSPENDED") {
      return NextResponse.json(
        { error: "Your account isn't allowed to sign in. Contact the Admin." },
        { status: 403 }
      );
    }

    // Admin/Staff tab must match the account's real role.
    if (role && user.role !== role) {
      return NextResponse.json(
        {
          error:
            role === "ADMIN"
              ? "This is not an Admin account. Choose 'Staff' to sign in."
              : "This is an Admin account. Choose 'Admin' to sign in.",
        },
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
      message: "Signed in successfully.",
      user: { id: user.id, role: user.role, fullName: user.full_name },
    });
  } catch (err) {
    // Shows the real cause in Vercel → Logs instead of an empty 500.
    console.error("[login] unexpected error:", err);
    return NextResponse.json(
      { error: "Server error. Please try again later." },
      { status: 500 }
    );
  }
}
