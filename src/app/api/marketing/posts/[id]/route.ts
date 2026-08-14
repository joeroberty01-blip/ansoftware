import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updatePostSchema } from "@/lib/validation/marketing";
import { deletePost, updatePost } from "@/lib/repo/marketing";

export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/marketing/posts/[id]">
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
  const parsed = updatePostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  const post = await updatePost(id, parsed.data);
  if (!post) {
    return NextResponse.json({ error: "Post haikupatikana." }, { status: 404 });
  }

  return NextResponse.json({ post });
}

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/marketing/posts/[id]">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const { id } = await ctx.params;
  const deleted = await deletePost(id);
  if (!deleted) {
    return NextResponse.json({ error: "Post haikupatikana." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
