import React, { ReactNode } from "react";
import { Inbox } from "lucide-react";

export interface Column<T = any> {
  key: string;
  label: ReactNode;
  width?: string | number;
  align?: "left" | "center" | "right";
  mono?: boolean;
  render?: (row: T, index: number) => ReactNode;
}

export interface DataTableProps<T = any> {
  columns: Column<T>[];
  rows: T[];
  dense?: boolean;
  zebra?: boolean;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  loading?: boolean;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  rows,
  dense = true,
  zebra = false,
  onRowClick,
  emptyMessage = "Belum ada data.",
  loading = false,
  className = ""
}: DataTableProps<T>) {
  return (
    <div className={`w-full overflow-x-auto rounded-[4px] border border-ink-200 bg-white shadow-sm ${className}`.trim()}>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-ink-200 bg-ink-50">
            {columns.map((c) => (
              <th
                key={c.key}
                style={{ width: c.width }}
                className={`py-2 px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-600 select-none whitespace-nowrap ${
                  c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"
                }`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-200/80">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-ink-400">
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-aap-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-medium">Memuat data...</span>
                </div>
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-ink-400">
                <div className="flex flex-col items-center justify-center gap-2">
                  <Inbox size={26} className="text-ink-300 stroke-[1.5]" />
                  <span className="text-xs font-medium">{emptyMessage}</span>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr
                key={row.id ?? idx}
                onClick={() => onRowClick && onRowClick(row)}
                className={`transition-colors duration-100 ${
                  onRowClick ? "cursor-pointer hover:bg-aap-50/80" : "hover:bg-aap-50/50"
                } ${zebra && idx % 2 === 1 ? "bg-ink-50/50" : ""}`}
              >
                {columns.map((c) => {
                  const val = row[c.key];
                  return (
                    <td
                      key={c.key}
                      className={`px-3 text-xs text-ink-800 whitespace-nowrap ${
                        dense ? "py-2" : "py-3"
                      } ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"} ${
                        c.mono ? "font-mono tabular-nums font-medium" : "font-sans"
                      }`}
                    >
                      {c.render ? c.render(row, idx) : val ?? "—"}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
