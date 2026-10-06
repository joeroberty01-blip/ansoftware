"use client";

import { useCallback, useEffect, useState } from "react";
import { ReportsNav } from "../../_components/reports-nav";
import { ListToolbar } from "../../_components/list-toolbar";

interface AuditLogRow {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  amount: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
  user_name: string;
}

interface Actor {
  id: string;
  full_name: string;
}

const CSV_COLUMNS = [
  { key: "created_at", label: "Tarehe/Muda" },
  { key: "user_name", label: "Mtumiaji" },
  { key: "action", label: "Kitendo" },
  { key: "entity", label: "Entity" },
  { key: "entity_id", label: "Entity ID" },
  { key: "amount", label: "Kiasi" },
];

function fmtAmount(value: string | null) {
  if (!value) return "-";
  return new Intl.NumberFormat("en-TZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function actionLabel(action: string) {
  return action
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [allLogs, setAllLogs] = useState<AuditLogRow[]>([]);
  const [actors, setActors] = useState<Actor[]>([]);
  const [entities, setEntities] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [userId, setUserId] = useState("");
  const [entity, setEntity] = useState("");
  const [loading, setLoading] = useState(true);
  const pageSize = 50;

  const buildParams = useCallback(
    (opts: { page?: number; all?: boolean }) => {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (userId) params.set("userId", userId);
      if (entity) params.set("entity", entity);
      if (opts.all) params.set("all", "true");
      else params.set("page", String(opts.page ?? page));
      return params;
    },
    [from, to, userId, entity, page]
  );

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/reports/audit-log?${buildParams({ page }).toString()}`);
    const json = await res.json();
    setLogs(json.logs ?? []);
    setTotal(json.total ?? 0);
    setActors(json.actors ?? []);
    setEntities(json.entities ?? []);
    setLoading(false);
  }, [buildParams, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [from, to, userId, entity]);

  const onDownloadAll = async () => {
    const res = await fetch(`/api/reports/audit-log?${buildParams({ all: true }).toString()}`);
    const json = await res.json();
    setAllLogs(json.logs ?? []);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-6 p-6">
      <ReportsNav />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Audit Log
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Historia ya kila tendo la fedha/mfumo lililofanyika — nani, lini, na kiasi gani.
          </p>
        </div>
        <div className="print:hidden">
          <button
            type="button"
            onClick={onDownloadAll}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50"
          >
            Andaa CSV ya Yote Yanayolingana
          </button>
          {allLogs.length > 0 && (
            <span className="ml-2 inline-block">
              <ListToolbar
                filename="audit-log"
                columns={CSV_COLUMNS}
                rows={allLogs}
              />
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <label className="text-xs text-zinc-500">Kutoka</label>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
        />
        <label className="text-xs text-zinc-500">Hadi</label>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
        />
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
        >
          <option value="">Watumiaji Wote</option>
          {actors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.full_name}
            </option>
          ))}
        </select>
        <select
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
        >
          <option value="">Entity Zote</option>
          {entities.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-zinc-500">Hakuna rekodi zinazolingana.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    <th className="py-2 pr-4">Tarehe/Muda</th>
                    <th className="py-2 pr-4">Mtumiaji</th>
                    <th className="py-2 pr-4">Kitendo</th>
                    <th className="py-2 pr-4">Entity</th>
                    <th className="py-2 pr-4 text-right">Kiasi</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-zinc-100 last:border-0">
                      <td className="py-2 pr-4 text-zinc-600">
                        {log.created_at.slice(0, 16).replace("T", " ")}
                      </td>
                      <td className="py-2 pr-4 font-medium">{log.user_name}</td>
                      <td className="py-2 pr-4">{actionLabel(log.action)}</td>
                      <td className="py-2 pr-4 text-zinc-600">{log.entity}</td>
                      <td className="py-2 pr-4 text-right font-medium">
                        {log.amount ? `TZS ${fmtAmount(log.amount)}` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 print:hidden">
              <span>
                Ukurasa {page} kati ya {totalPages} ({total} jumla)
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-50 disabled:opacity-40"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-50 disabled:opacity-40"
                >
                  →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
