import { requireAdminPage } from "@/lib/require-admin-page";
import StaffManagementPage from "./staff-management-page";

export default async function StaffPage() {
  await requireAdminPage();
  return <StaffManagementPage />;
}
