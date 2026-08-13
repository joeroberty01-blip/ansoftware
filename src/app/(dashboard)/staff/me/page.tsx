import { getCurrentUser } from "@/lib/auth";
import { getStaffByUserId } from "@/lib/repo/staff";
import { StaffDetailView } from "../_components/staff-detail-view";

export default async function MyStaffProfilePage() {
  const session = await getCurrentUser();
  const staff = session ? await getStaffByUserId(session.id) : null;

  if (!staff) {
    return (
      <div className="p-6 text-sm text-zinc-500">
        Huna wasifu wa Staff kwenye akaunti hii.
      </div>
    );
  }

  return (
    <StaffDetailView
      initialStaff={staff}
      viewerIsAdmin={session?.role === "ADMIN"}
      isOwnProfile={true}
    />
  );
}
