import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canAddPatientsAndStaff } from "@/lib/permissions";
import { NewStaffForm } from "./new-staff-form";

export default async function NewStaffPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Admins add staff (with salary) from Staff Management.
  if (user.role === "ADMIN") redirect("/staff");
  if (!(await canAddPatientsAndStaff(user))) redirect("/dashboard");
  return <NewStaffForm />;
}
