"use client";

import { useCallback, useEffect, useState } from "react";
import { ReportsNav } from "../../_components/reports-nav";
import { ListToolbar } from "../../_components/list-toolbar";

interface Pnl {
  from: string;
  to: string;
  serviceRevenue: string;
  otherIncomeByCategory: { category: string; total: string }[];
  totalOtherIncome: string;
  totalRevenue: string;
  expensesByCategory: { category: string; total: string }[];
  totalExpenses: string;
  netProfit: string;
}

interface BalanceSheet {
  asOf: string;
  cash: string;
  accountsReceivable: string;
  totalAssets: string;
  accountsPayable: string;
  totalLiabilities: string;
  totalEquity: string;
}

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  MISHAHARA: "Mishahara",
  VIFAA: "Vifaa",
  USAFIRI: "Usafiri",
  UENDESHAJI: "Uendeshaji",
  MENGINEYO: "Mengineyo",
};

const INCOME_CATEGORY_LABELS: Record<string, string> = {
  HUDUMA: "Huduma (Services)",
  MSAADA: "Msaada/Ruzuku",
  UWEKEZAJI: "Uwekezaji",
  MENGINEYO: "Mengineyo",
};

function fmt(value: string) {
  return new Intl.NumberFormat("en-TZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function monthStart() {
  return new Date().toISOString().slice(0, 8) + "01";
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

type Preset = "today" | "week" | "month" | "year" | "all" | "custom";

const PRESETS: { value: Exclude<Preset, "custom">; label: string }[] = [
  { value: "today", label: "Leo" },
  { value: "week", label: "Wiki Hii" },
  { value: "month", label: "Mwezi Huu" },
  { value: "year", label: "Mwaka Huu" },
  { value: "all", label: "Muda Wote" },
];

function presetRange(preset: Exclude<Preset, "custom">): { from: string; to: string } {
  const now = new Date();
  const t = today();
  if (preset === "today") return { from: t, to: t };
  if (preset === "week") {
    const day = now.getUTCDay() === 0 ? 7 : now.getUTCDay();
    const monday = new Date(now.getTime() - (day - 1) * 86_400_000);
    return { from: monday.toISOString().slice(0, 10), to: t };
  }
  if (preset === "month") return { from: monthStart(), to: t };
  if (preset === "year") return { from: `${t.slice(0, 4)}-01-01`, to: t };
  return { from: "1900-01-01", to: t };
}

export default function FinancialStatementsPage() {
  const [preset, setPreset] = useState<Preset>("month");
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [asOf, setAsOf] = useState(today());
  const [pnl, setPnl] = useState<Pnl | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPnl = useCallback(async () => {
    const res = await fetch(`/api/reports/pnl?from=${from}&to=${to}`);
    const json = await res.json();
    setPnl(json.pnl ?? null);
  }, [from, to]);

  const loadBalanceSheet = useCallback(async () => {
    const res = await fetch(`/api/reports/balance-sheet?asOf=${asOf}`);
    const json = await res.json();
    setBalanceSheet(json.balanceSheet ?? null);
  }, [asOf]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadPnl(), loadBalanceSheet()]).finally(() => setLoading(false));
  }, [loadPnl, loadBalanceSheet]);

  const pnlRows = pnl
    ? [
        { label: "Mapato ya Huduma (Service Revenue)", value: pnl.serviceRevenue },
        ...pnl.otherIncomeByCategory.map((c) => ({
          label: INCOME_CATEGORY_LABELS[c.category] ?? c.category,
          value: c.total,
        })),
        { label: "JUMLA YA MAPATO", value: pnl.totalRevenue, bold: true },
        ...pnl.expensesByCategory.map((c) => ({
          label: EXPENSE_CATEGORY_LABELS[c.category] ?? c.category,
          value: `-${c.total}`,
        })),
        { label: "JUMLA YA MATUMIZI", value: `-${pnl.totalExpenses}`, bold: true },
        { label: "NET PROFIT", value: pnl.netProfit, bold: true, accent: true },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6 p-6">
      <ReportsNav />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Taarifa za Fedha
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Profit &amp; Loss na Balance Sheet, kutokana na data halisi.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50 print:hidden"
        >
          Print
        </button>
      </div>

      {/* P&L */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-900">
            Profit &amp; Loss Statement
          </h2>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <div className="flex gap-1 rounded-lg bg-zinc-100 p-0.5">
              {PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => {
                    const range = presetRange(p.value);
                    setPreset(p.value);
                    setFrom(range.from);
                    setTo(range.to);
                  }}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                    preset === p.value
                      ? "bg-white text-brand-blue shadow-sm"
                      : "text-zinc-500 hover:text-zinc-700"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {preset !== "all" && (
              <>
                <label className="text-xs text-zinc-500">Kutoka</label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => {
                    setPreset("custom");
                    setFrom(e.target.value);
                  }}
                  className="rounded border border-zinc-300 px-2 py-1 text-sm"
                />
                <label className="text-xs text-zinc-500">Hadi</label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => {
                    setPreset("custom");
                    setTo(e.target.value);
                  }}
                  className="rounded border border-zinc-300 px-2 py-1 text-sm"
                />
              </>
            )}
            {pnl && (
              <ListToolbar
                filename={`pnl-${pnl.from}-hadi-${pnl.to}`}
                columns={[
                  { key: "label", label: "Kipengele" },
                  { key: "value", label: "Kiasi (TZS)" },
                ]}
                rows={pnlRows}
              />
            )}
          </div>
        </div>

        {loading || !pnl ? (
          <p className="text-sm text-zinc-500">Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <tbody>
                {pnlRows.map((row, i) => (
                  <tr
                    key={i}
                    className={`border-b border-zinc-100 last:border-0 ${
                      row.bold ? "font-bold" : ""
                    } ${row.accent ? "text-brand-blue" : "text-zinc-900"}`}
                  >
                    <td className="py-2 pr-4">{row.label}</td>
                    <td className="py-2 pr-4 text-right">
                      TZS {fmt(row.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Balance Sheet */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-900">
            Balance Sheet (Statement of Financial Position)
          </h2>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <label className="text-xs text-zinc-500">Kama ilivyo tarehe</label>
            <input
              type="date"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1 text-sm"
            />
            {balanceSheet && (
              <ListToolbar
                filename={`balance-sheet-${balanceSheet.asOf}`}
                columns={[
                  { key: "label", label: "Kipengele" },
                  { key: "value", label: "Kiasi (TZS)" },
                ]}
                rows={[
                  { label: "Fedha Taslimu/Akaunti (Cash)", value: balanceSheet.cash },
                  {
                    label: "Madeni ya Wateja (Accounts Receivable)",
                    value: balanceSheet.accountsReceivable,
                  },
                  { label: "JUMLA YA MALI (Assets)", value: balanceSheet.totalAssets },
                  {
                    label: "Bili Zisizolipwa (Accounts Payable)",
                    value: balanceSheet.accountsPayable,
                  },
                  {
                    label: "JUMLA YA MADENI (Liabilities)",
                    value: balanceSheet.totalLiabilities,
                  },
                  { label: "MTAJI (Equity)", value: balanceSheet.totalEquity },
                ]}
              />
            )}
          </div>
        </div>

        {loading || !balanceSheet ? (
          <p className="text-sm text-zinc-500">Loading...</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Mali (Assets)
              </h3>
              <table className="w-full text-left text-sm">
                <tbody>
                  <tr className="border-b border-zinc-100">
                    <td className="py-2 pr-4">Fedha Taslimu/Akaunti (Cash)</td>
                    <td className="py-2 pr-4 text-right">
                      TZS {fmt(balanceSheet.cash)}
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-100">
                    <td className="py-2 pr-4">Madeni ya Wateja (A/R)</td>
                    <td className="py-2 pr-4 text-right">
                      TZS {fmt(balanceSheet.accountsReceivable)}
                    </td>
                  </tr>
                  <tr className="font-bold">
                    <td className="py-2 pr-4">JUMLA YA MALI</td>
                    <td className="py-2 pr-4 text-right">
                      TZS {fmt(balanceSheet.totalAssets)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Madeni na Mtaji (Liabilities &amp; Equity)
              </h3>
              <table className="w-full text-left text-sm">
                <tbody>
                  <tr className="border-b border-zinc-100">
                    <td className="py-2 pr-4">Bili Zisizolipwa (A/P)</td>
                    <td className="py-2 pr-4 text-right">
                      TZS {fmt(balanceSheet.accountsPayable)}
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-100 font-semibold">
                    <td className="py-2 pr-4">JUMLA YA MADENI</td>
                    <td className="py-2 pr-4 text-right">
                      TZS {fmt(balanceSheet.totalLiabilities)}
                    </td>
                  </tr>
                  <tr className="font-bold text-brand-blue">
                    <td className="py-2 pr-4">MTAJI (EQUITY)</td>
                    <td className="py-2 pr-4 text-right">
                      TZS {fmt(balanceSheet.totalEquity)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-start gap-2 rounded-lg bg-zinc-50 px-3 py-2.5 text-xs text-zinc-500">
          <span>
            Kumbuka: &quot;Cash&quot; ni makadirio ya kihasibu kutoka kwenye
            malipo/mapato/matumizi yaliyorekodiwa (si hesabu ya benki
            iliyolinganishwa/reconciled). Balance sheet hii haina thamani ya
            fedha ya stock/vifaa (inventory/fixed assets) kwa sababu mfumo
            hauhifadhi bei ya ununuzi ya vitu hivyo.
          </span>
        </div>
      </div>
    </div>
  );
}
