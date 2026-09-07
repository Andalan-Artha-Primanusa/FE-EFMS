import React, { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface FeastTabItem {
  id: string;
  label: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  badge?: ReactNode;
}

export interface FeastSubTabsProps {
  tabs: FeastTabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

/**
 * FeastSubTabs — Standard FEAST Enterprise Top Sub-Tab Navigation
 * Matching the exact look & feel established in the Accounting module.
 */
export const FeastSubTabs: React.FC<FeastSubTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = "",
}) => {
  return (
    <div className={`flex-none bg-white border-b border-slate-200 shadow-sm ${className}`.trim()}>
      <div className="px-4 md:px-6 pt-3 md:pt-4 pb-0 flex items-end gap-0.5 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`flex items-center gap-2 px-3.5 md:px-4 py-2 md:py-2.5 text-xs font-semibold border-t border-l border-r select-none transition-all duration-140 cursor-pointer whitespace-nowrap ${
                isActive
                  ? "bg-white text-[#1A1612] border-slate-200 -mb-px z-10 shadow-sm"
                  : "bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-800 hover:bg-slate-100"
              }`}
              style={{
                borderRadius: "4px 4px 0 0",
              }}
            >
              {Icon && (
                <Icon
                  className={`w-3.5 h-3.5 transition-colors ${
                    isActive ? "text-[#A57C50]" : "text-slate-400"
                  }`}
                />
              )}
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge !== null && (
                <span
                  className={`ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full transition-colors ${
                    isActive
                      ? "bg-[#FBF6F0] text-[#A57C50] border border-[#E7D3BC]"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
