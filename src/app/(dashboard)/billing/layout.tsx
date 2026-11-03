import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { userCanAccessBilling } from "@/lib/permissions";

export default async function Layout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user || !(await userCanAccessBilling(user))) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
