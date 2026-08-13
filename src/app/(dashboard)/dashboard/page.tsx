import { getCurrentUser } from "@/lib/auth";
import { DashboardOverview } from "./_components/dashboard-overview";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (user?.role !== "ADMIN") {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold text-zinc-900">
          Karibu, {user?.fullName} 👋
        </h1>
      </div>
    );
  }

  return <DashboardOverview fullName={user.fullName} />;
}
