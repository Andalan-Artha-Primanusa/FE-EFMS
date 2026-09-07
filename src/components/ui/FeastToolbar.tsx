import React, { ReactNode } from "react";
import { Search, RefreshCw, Download, Plus } from "lucide-react";

export interface FeastToolbarProps {
  primaryActionLabel?: string;
  primaryActionIcon?: React.ComponentType<{ className?: string }>;
  onPrimaryAction?: () => void;
  primaryActionDisabled?: boolean;
  
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  searchPlaceholder?: string;

  filters?: ReactNode;
  
  onRefresh?: () => void;
  isRefreshing?: boolean;
  
  onExport?: () => void;
  exportTitle?: string;

  extraActions?: ReactNode;
  className?: string;
}

/**
 * FeastToolbar — Standard FEAST Enterprise Action & Filter Toolbar
 * Matching the exact look & feel established in the Accounting module.
 */
export const FeastToolbar: React.FC<FeastToolbarProps> = ({
  primaryActionLabel,
  primaryActionIcon: PrimaryIcon = Plus,
  onPrimaryAction,
  primaryActionDisabled = false,

  searchTerm,
  onSearchChange,
  searchPlaceholder = "Cari data...",

  filters,
  
  onRefresh,
  isRefreshing = false,

  onExport,
  exportTitle = "Ekspor Excel",

  extraActions,
  className = "",
}) => {
  return (
    <div
      className={`bg-white border border-slate-200 p-3 shadow-sm ${className}`.trim()}
      style={{ borderRadius: 4 }}
    >
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left Side: Primary Action or custom slot */}
        <div className="flex items-center gap-2">
          {primaryActionLabel && onPrimaryAction && (
            <button
              type="button"
              onClick={onPrimaryAction}
              disabled={primaryActionDisabled}
              className="flex items-center justify-center gap-2 px-4 py-2 text-white text-xs font-semibold transition-all duration-140 hover:brightness-95 active:brightness-90 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              style={{ background: "#A57C50", borderRadius: 3 }}
            >
              <PrimaryIcon className="w-3.5 h-3.5 shrink-0" />
              <span>{primaryActionLabel}</span>
            </button>
          )}
          {extraActions}
        </div>

        {/* Right Side: Search, Filters, Refresh, Export */}
        <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
          {onSearchChange !== undefined && (
            <div className="relative flex-1 md:max-w-xs min-w-[160px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#A57C50] focus:bg-white transition-colors"
                style={{ borderRadius: 3 }}
              />
            </div>
          )}

          {filters}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1.5 bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer"
              style={{ borderRadius: 3 }}
              title="Segarkan data"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#A57C50]" : ""}`}
              />
            </button>
          )}

          {onExport && (
            <button
              type="button"
              onClick={onExport}
              className="p-1.5 bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer"
              style={{ borderRadius: 3 }}
              title={exportTitle}
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
