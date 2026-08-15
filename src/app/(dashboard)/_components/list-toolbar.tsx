"use client";

import { downloadCsv } from "@/lib/csv-export";

export function ListToolbar({
  filename,
  columns,
  rows,
}: {
  filename: string;
  columns: { key: string; label: string }[];
  rows: object[];
}) {
  return (
    <div className="flex gap-2 print:hidden">
      <button
        type="button"
        onClick={() => downloadCsv(filename, columns, rows)}
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50"
      >
        Pakua CSV
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50"
      >
        Print
      </button>
    </div>
  );
}
