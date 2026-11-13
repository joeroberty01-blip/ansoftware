import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export async function requireAdminPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  return user;
}
