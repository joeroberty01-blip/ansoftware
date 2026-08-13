import { getCurrentUser } from "@/lib/auth";
import { getStaffByUserId } from "@/lib/repo/staff";
import { NewHomeVisitForm } from "./_components/new-home-visit-form";

export default async function NewHomeVisitPage() {
  const session = await getCurrentUser();
  const ownStaff =
    session && session.role !== "ADMIN"
      ? await getStaffByUserId(session.id)
      : null;

  return (
    <NewHomeVisitForm
      isAdmin={session?.role === "ADMIN"}
      ownStaffId={ownStaff?.id ?? null}
      ownStaffName={ownStaff?.full_name ?? null}
    />
  );
}
