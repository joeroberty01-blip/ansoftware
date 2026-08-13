import { getStaffById } from "@/lib/repo/staff";
import { StaffDetailView } from "../_components/staff-detail-view";

export default async function StaffProfilePage(
  props: PageProps<"/staff/[id]">
) {
  const { id } = await props.params;
  const staff = await getStaffById(id);

  if (!staff) {
    return <div className="p-6 text-sm text-zinc-500">Staff hakupatikana.</div>;
  }

  return (
    <StaffDetailView
      initialStaff={staff}
      viewerIsAdmin={true}
      isOwnProfile={false}
    />
  );
}
