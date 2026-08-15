import { getCurrentUser } from "@/lib/auth";
import { DashboardOverview } from "./_components/dashboard-overview";
import { StaffPortalDashboard } from "./_components/staff-portal-dashboard";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (user?.role !== "ADMIN") {
    return <StaffPortalDashboard />;
  }

  return <DashboardOverview fullName={user.fullName} />;
}
