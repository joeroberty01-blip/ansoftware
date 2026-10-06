"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/reports", label: "Ripoti za Uendeshaji" },
  { href: "/reports/financial-statements", label: "Taarifa za Fedha" },
  { href: "/reports/audit-log", label: "Audit Log" },
];

export function ReportsNav() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 self-start rounded-lg bg-zinc-100 p-1 print:hidden">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors ${
            pathname === link.href
              ? "bg-white text-brand-blue shadow-sm"
              : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
