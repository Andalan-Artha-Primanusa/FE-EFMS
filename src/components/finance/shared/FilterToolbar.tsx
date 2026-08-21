// FilterToolbar — Shared filter bar component used across all finance sub-menu pages

import { Filter, Search } from "lucide-react";

interface FilterToolbarProps {
  /** Current search/query text from global search bar (passed down from AppShell) */
  searchQuery?: string;
  /** Period filter value e.g. "Jul-26" */
  periodFilter?: string;
  onPeriodChange?: (v: string) => void;
  periodOptions?: string[];
  /** Status filter value e.g. "All" */
  statusFilter?: string;
  onStatusChange?: (v: string) => void;
  statusOptions?: { label: string; value: string }[];
  /** Customer filter value e.g. "All" */
  customerFilter?: string;
  onCustomerChange?: (v: string) => void;
  customerOptions?: string[];
  /** Additional action buttons rendered on the right side */
  children?: React.ReactNode;
}

const defaultPeriodOptions = [
  "All", "Jan-26", "Feb-26", "Mar-26", "Apr-26", "Mei-26", "Jun-26",
  "Jul-26", "Agu-26", "Sep-26", "Okt-26", "Nov-26", "Des-26",
];

const defaultCustomerOptions = ["All", "POS", "BGG", "DBK", "SBS", "ABN"];

export function FilterToolbar({
  searchQuery,
  periodFilter,
  onPeriodChange,
  periodOptions = defaultPeriodOptions,
  statusFilter,
  onStatusChange,
  statusOptions,
  customerFilter,
  onCustomerChange,
  customerOptions = defaultCustomerOptions,
  children,
}: FilterToolbarProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {searchQuery !== undefined && (
        <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg px-2.5 py-1.5 text-xs text-slate-600">
          <Search size={13} />
          <span className="font-medium truncate max-w-[150px]">{searchQuery || "Cari..."}</span>
        </div>
      )}

      {onPeriodChange && (
        <div className="flex items-center gap-1.5">
          <Filter size={13} className="text-slate-500" />
          <select
            value={periodFilter ?? "All"}
            onChange={(e) => onPeriodChange(e.target.value)}
            className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:border-cyan-600 cursor-pointer"
          >
            {periodOptions.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      )}

      {onCustomerChange && (
        <select
          value={customerFilter ?? "All"}
          onChange={(e) => onCustomerChange(e.target.value)}
          className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:border-cyan-600 cursor-pointer"
        >
          {customerOptions.map((c) => (
            <option key={c} value={c}>{c === "All" ? "Semua Customer" : c}</option>
          ))}
        </select>
      )}

      {onStatusChange && statusOptions && (
        <select
          value={statusFilter ?? "All"}
          onChange={(e) => onStatusChange(e.target.value)}
          className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:border-cyan-600 cursor-pointer"
        >
          {statusOptions.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      )}

      {children && <div className="flex gap-2 ml-auto">{children}</div>}
    </div>
  );
}
