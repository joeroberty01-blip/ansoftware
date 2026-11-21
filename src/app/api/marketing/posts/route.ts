import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createPostSchema } from "@/lib/validation/marketing";
import { createPost, listPosts } from "@/lib/repo/marketing";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Please sign in first." },
      { status: 401 }
    );
  }

  const posts = await listPosts();
  return NextResponse.json({ posts });
}

export async function POST(req: Request) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Please sign in first." },
      { status: 401 }
    );
  }

  const body = await req.json();
  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid data" },
      { status: 400 }
    );
  }

  const post = await createPost({
    ...parsed.data,
    createdById: session.id,
  });

  return NextResponse.json({ post }, { status: 201 });
}
