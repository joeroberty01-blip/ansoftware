import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getStaffByUserId } from "@/lib/repo/staff";
import { PartTimeVisitsView } from "./_components/part-time-visits-view";

export default async function PartTimeVisitsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login?from=%2Fpart-time-visits");

  const ownStaff = session.role === "ADMIN" ? null : await getStaffByUserId(session.id);
  const allowed = session.role === "ADMIN" || !!ownStaff?.is_chief_co;

  if (!allowed) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-700 shadow-sm">
        Only an Admin or the Chief C.O can record Part-time visits.
      </div>
    );
  }

  return <PartTimeVisitsView />;
}
