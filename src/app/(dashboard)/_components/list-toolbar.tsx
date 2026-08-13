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
        className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
      >
        Pakua CSV
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
      >
        Print
      </button>
    </div>
  );
}
