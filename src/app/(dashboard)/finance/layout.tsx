import type { ReactNode } from "react";
import { requireAdminPage } from "@/lib/require-admin-page";

export default async function FinanceLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdminPage();

  return children;
}
