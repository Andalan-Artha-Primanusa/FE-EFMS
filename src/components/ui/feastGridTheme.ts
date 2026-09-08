import type { Theme } from "@glideapps/glide-data-grid";

/**
 * FEAST Enterprise Theme — Neutral grey canvas matching standard AppShell with Andalan Gold accents.
 * Benchmark standard from the Accounting module.
 */
export const feastGridTheme: Partial<Theme> = {
  accentColor: "#A57C50",        // andalan-500 gold
  accentFg: "#FFFFFF",
  accentLight: "#f1f5f9",        // slate-100
  bgCell: "#FFFFFF",             // pure white
  bgCellMedium: "#f8fafc",       // slate-50
  bgHeader: "#f1f5f9",           // slate-100 (neutral header)
  bgHeaderHasFocus: "#e2e8f0",   // slate-200
  bgHeaderHovered: "#e2e8f0",    // slate-200
  textDark: "#0f172a",           // slate-900 (crisp high contrast)
  textMedium: "#475569",         // slate-600
  textLight: "#94a3b8",          // slate-400
  textHeader: "#334155",         // slate-700
  textHeaderSelected: "#0f172a",
  borderColor: "#e2e8f0",        // slate-200
  fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",
  baseFontStyle: "12px",
  headerFontStyle: "600 12px",
  lineHeight: 1.4,
};
