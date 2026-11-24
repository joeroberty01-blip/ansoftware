import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canManagePartTime } from "@/lib/part-time-access";
import { PartTimeVisitsView } from "./_components/part-time-visits-view";

export default async function PartTimeVisitsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(await canManagePartTime(user))) redirect("/dashboard");
  return <PartTimeVisitsView />;
}
