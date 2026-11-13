import { requireAdminPage } from "@/lib/require-admin-page";
import PendingStaffPage from "./pending-staff-page";

export default async function StaffApprovalsPage() {
  await requireAdminPage();
  return <PendingStaffPage />;
}
