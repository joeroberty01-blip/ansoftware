export function calculateAge(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function relativeDays(dateStr: string | null): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr.slice(0, 10));
  if (Number.isNaN(date.getTime())) return "-";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - date.getTime()) / 86_400_000);
  if (diffDays === 0) return "Leo";
  if (diffDays === 1) return "Jana";
  if (diffDays > 1) return `siku ${diffDays} zilizopita`;
  return dateStr.slice(0, 10);
}
