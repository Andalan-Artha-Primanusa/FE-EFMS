import React, { HTMLAttributes, ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export type StatDeltaTone = "go" | "caution" | "stop" | "neutral";
export type StatTone = "default" | "dark" | "soft";

export interface StatTileProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  delta?: ReactNode;
  deltaTone?: StatDeltaTone;
  target?: ReactNode;
  tone?: StatTone;
  icon?: ReactNode;
}

export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  unit,
  delta,
  deltaTone = "go",
  target,
  tone = "default",
  icon,
  className = "",
  ...props
}) => {
  const isDark = tone === "dark";
  const isSoft = tone === "soft";

  const deltaColors: Record<StatDeltaTone, string> = {
    go: "text-[#2E7D53]",
    caution: "text-[#C98A12]",
    stop: "text-[#B3352B]",
    neutral: isDark ? "text-ink-300" : "text-ink-500"
  };

  const deltaIcon = deltaTone === "stop" 
    ? <TrendingDown size={13} className="shrink-0" />
    : deltaTone === "caution" || deltaTone === "neutral"
    ? <Minus size={13} className="shrink-0" />
    : <TrendingUp size={13} className="shrink-0" />;

  return (
    <div
      className={`rounded-[4px] border p-5 flex flex-col justify-between transition-all duration-140 ${
        isDark
          ? "bg-ink-900 border-ink-800 text-white"
          : isSoft
          ? "bg-aap-50/80 border-aap-200 text-ink-900"
          : "bg-white border-ink-200 text-ink-900 shadow-sm"
      } ${className}`.trim()}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`text-[11px] font-bold uppercase tracking-[0.14em] ${isDark ? "text-aap-300" : "text-ink-600"}`}>
          {label}
        </div>
        {icon && <div className={`shrink-0 ${isDark ? "text-aap-400" : "text-aap-600"}`}>{icon}</div>}
      </div>

      <div className="flex items-baseline gap-2 mt-3">
        <span className="font-mono text-2xl sm:text-3xl font-medium tracking-tight tabular-nums">
          {value}
        </span>
        {unit && (
          <span className={`text-xs font-semibold ${isDark ? "text-aap-200" : "text-ink-500"}`}>
            {unit}
          </span>
        )}
      </div>

      {(delta || target) && (
        <div className="flex items-center gap-3 mt-4 pt-2.5 border-t border-ink-200/60 text-xs">
          {delta && (
            <span className={`inline-flex items-center gap-1 font-mono font-medium tabular-nums ${deltaColors[deltaTone]}`}>
              {deltaIcon}
              <span>{delta}</span>
            </span>
          )}
          {target && (
            <span className={`font-mono text-[11px] tabular-nums ${isDark ? "text-ink-400" : "text-ink-500"}`}>
              Target {target}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
