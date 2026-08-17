import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { countPostsThisMonth, getPostsByPlatform } from "@/lib/repo/marketing";

export async function GET() {
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

  const [postsThisMonth, postsByPlatform] = await Promise.all([
    countPostsThisMonth(),
    getPostsByPlatform(),
  ]);

  return NextResponse.json({ postsThisMonth, postsByPlatform });
}
