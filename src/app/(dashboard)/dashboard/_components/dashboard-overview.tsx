"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  ClipboardList,
  MapPinned,
  UserCheck,
  Wallet,
  FileWarning,
  type LucideIcon,
} from "lucide-react";

type Period = "today" | "week" | "month";

interface Overview {
  period: Period;
  income: string;
  expenses: string;
  netProfit: string;
  outstandingCount: number;
  outstandingAmount: string;
  patientsCount: number;
  activeStaffCount: number;
  todayHomeVisitsCount: number;
  todayHomeVisitsCompleted: number;
  monthlyPayrollTotal: string;
  homeVisitStatusCounts: { scheduled: number; completed: number; cancelled: number };
  staffStatusCounts: {
    active: number;
    onLeave: number;
    inactive: number;
    terminated: number;
  };
  todaySchedule: {
    id: string;
    patientName: string;
    staffName: string | null;
    status: string;
  }[];
  pendingActions: { label: string; count: number; href: string }[];
  revenueTrend: { month: string; income: string }[];
}

const PERIOD_LABELS: Record<Period, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
};

function fmt(value: string) {
  return new Intl.NumberFormat("en-TZ", { maximumFractionDigits: 0 }).format(
    Number(value)
  );
}

function fmtCompact(value: string) {
  const n = Number(value);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return fmt(value);
}

export function DashboardOverview({ fullName }: { fullName: string }) {
  const [period, setPeriod] = useState<Period>("month");
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    fetch(`/api/dashboard/summary?period=${period}`)
      .then((r) => r.json())
      .then(setData);
  }, [period]);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 sm:text-2xl">
            {greeting}, {fullName.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-zinc-500">
            Here&apos;s what&apos;s happening across Afya Nyumbani today.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-zinc-200 bg-white p-1">
            {(["today", "week", "month"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap sm:text-sm ${
                  period === p
                    ? "bg-brand-blue text-white"
                    : "text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          <Link
            href="/home-visits/new"
            className="rounded-lg bg-brand-orange px-3 py-2 text-xs font-medium whitespace-nowrap text-white hover:bg-brand-orange-dark sm:text-sm"
          >
            + New Home Visit
          </Link>
        </div>
      </div>

      {!data ? (
        <p className="text-sm text-zinc-500">Inapakia...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard
              icon={Users}
              color="blue"
              label="Active Patients"
              value={String(data.patientsCount)}
            />
            <StatCard
              icon={ClipboardList}
              color="orange"
              label="Scheduled Visits"
              value={String(data.homeVisitStatusCounts.scheduled)}
            />
            <StatCard
              icon={MapPinned}
              color="green"
              label="Today's Home Visits"
              value={String(data.todayHomeVisitsCount)}
              sub={`${data.todayHomeVisitsCompleted} completed`}
            />
            <StatCard
              icon={UserCheck}
              color="purple"
              label="Active Care Team"
              value={String(data.activeStaffCount)}
            />
            <StatCard
              icon={Wallet}
              color="blue"
              label={`Revenue (${PERIOD_LABELS[period]})`}
              value={`TZS ${fmtCompact(data.income)}`}
            />
            <StatCard
              icon={FileWarning}
              color="orange"
              label="Outstanding"
              value={`TZS ${fmtCompact(data.outstandingAmount)}`}
              sub={`${data.outstandingCount} unpaid`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 bg-white p-5 lg:col-span-2">
              <h2 className="mb-4 text-sm font-semibold text-zinc-900">
                Home Visit Status
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <PipelineStep
                  label="Scheduled"
                  count={data.homeVisitStatusCounts.scheduled}
                  color="orange"
                />
                <span className="text-zinc-300">→</span>
                <PipelineStep
                  label="Completed"
                  count={data.homeVisitStatusCounts.completed}
                  color="green"
                />
                <span className="text-zinc-300">→</span>
                <PipelineStep
                  label="Cancelled"
                  count={data.homeVisitStatusCounts.cancelled}
                  color="zinc"
                />
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-900">
                  Today&apos;s Schedule
                </h2>
                <Link
                  href="/home-visits"
                  className="text-xs font-medium text-brand-blue"
                >
                  View All
                </Link>
              </div>
              {data.todaySchedule.length === 0 ? (
                <p className="text-sm text-zinc-500">Hakuna ziara leo.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {data.todaySchedule.map((v) => (
                    <li
                      key={v.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div>
                        <p className="font-medium text-zinc-900">
                          {v.patientName}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {v.staffName ?? "Hajapangiwa staff"}
                        </p>
                      </div>
                      <StatusBadge status={v.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-900">
                  Pending Actions
                </h2>
                {data.pendingActions.length > 0 && (
                  <span className="rounded-full bg-brand-orange-light px-2 py-0.5 text-xs font-semibold text-brand-orange">
                    {data.pendingActions.reduce((s, a) => s + a.count, 0)}
                  </span>
                )}
              </div>
              {data.pendingActions.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  Hakuna vitendo vinavyosubiri.
                </p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {data.pendingActions.map((a) => (
                    <li key={a.label}>
                      <Link
                        href={a.href}
                        className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-zinc-50"
                      >
                        <span className="text-zinc-700">{a.label}</span>
                        <span className="font-semibold text-zinc-900">
                          {a.count}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold text-zinc-900">
                Care Team Overview
              </h2>
              <CareTeamDonut counts={data.staffStatusCounts} />
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold text-zinc-900">
                Revenue Overview
              </h2>
              <RevenueBarChart points={data.revenueTrend} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const STAT_COLOR_MAP: Record<string, { bg: string; text: string }> = {
  blue: { bg: "bg-brand-blue-light", text: "text-brand-blue" },
  orange: { bg: "bg-brand-orange-light", text: "text-brand-orange" },
  green: { bg: "bg-green-50", text: "text-green-600" },
  purple: { bg: "bg-purple-50", text: "text-purple-600" },
};

function StatCard({
  icon: Icon,
  color,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  color: string;
  label: string;
  value: string;
  sub?: string;
}) {
  const c = STAT_COLOR_MAP[color] ?? STAT_COLOR_MAP.blue;
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 sm:p-4">
      <span
        className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${c.bg} ${c.text}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-lg font-semibold text-zinc-900 sm:text-xl">{value}</p>
      {sub && <p className="text-xs text-zinc-400">{sub}</p>}
    </div>
  );
}

const PIPELINE_COLORS: Record<string, string> = {
  orange: "bg-brand-orange-light text-brand-orange",
  green: "bg-green-50 text-green-600",
  zinc: "bg-zinc-100 text-zinc-500",
};

function PipelineStep({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div
      className={`flex min-w-[90px] flex-col items-center gap-1 rounded-lg px-4 py-3 ${PIPELINE_COLORS[color]}`}
    >
      <span className="text-xl font-bold">{count}</span>
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: "bg-green-50 text-green-700",
  SCHEDULED: "bg-blue-50 text-blue-700",
  CANCELLED: "bg-zinc-100 text-zinc-500",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        STATUS_STYLES[status] ?? "bg-zinc-100 text-zinc-600"
      }`}
    >
      {status}
    </span>
  );
}

function CareTeamDonut({
  counts,
}: {
  counts: {
    active: number;
    onLeave: number;
    inactive: number;
    terminated: number;
  };
}) {
  const total = counts.active + counts.onLeave + counts.inactive + counts.terminated;
  const segments = [
    { label: "Available", value: counts.active, color: "#16a34a" },
    { label: "On Leave", value: counts.onLeave, color: "#f59e0b" },
    { label: "Inactive", value: counts.inactive, color: "#a1a1aa" },
    { label: "Terminated", value: counts.terminated, color: "#dc2626" },
  ].filter((s) => s.value > 0);

  if (total === 0) {
    return <p className="text-sm text-zinc-500">Hakuna staff bado.</p>;
  }

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-28 w-28 shrink-0">
        <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#f4f4f5" strokeWidth="14" />
          {segments.map((seg) => {
            const fraction = seg.value / total;
            const dash = fraction * circumference;
            const el = (
              <circle
                key={seg.label}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth="14"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-zinc-900">{total}</span>
          <span className="text-[10px] text-zinc-500">Total</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-zinc-600">{seg.label}</span>
            <span className="font-medium text-zinc-900">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RevenueBarChart({
  points,
}: {
  points: { month: string; income: string }[];
}) {
  const max = Math.max(...points.map((p) => Number(p.income)), 1);
  return (
    <div className="flex h-32 items-end gap-2">
      {points.map((p) => {
        const height = Math.max((Number(p.income) / max) * 100, 2);
        return (
          <div key={p.month} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-24 w-full items-end">
              <div
                className="w-full rounded-t bg-brand-blue"
                style={{ height: `${height}%` }}
                title={`${p.month}: ${fmt(p.income)}`}
              />
            </div>
            <span className="text-[10px] text-zinc-400">{p.month.slice(5)}</span>
          </div>
        );
      })}
    </div>
  );
}
