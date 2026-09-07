import React, { useMemo, useCallback } from "react";
import DataEditor, {
  GridColumn,
  GridCell,
  GridCellKind,
  Item,
  Theme,
  CellClickedEventArgs
} from "@glideapps/glide-data-grid";
import "@glideapps/glide-data-grid/dist/index.css";
import { JournalEntry } from "../../../types";

interface JournalGlideGridProps {
  journals: JournalEntry[];
  onRowClick?: (journal: JournalEntry) => void;
  onEditClick?: (journal: JournalEntry) => void;
  height?: number;
}

const formatIDR = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0);

// FEAST Enterprise Theme — Neutral grey canvas matching standard AppShell with Andalan Gold accents
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

export const JournalGlideGrid: React.FC<JournalGlideGridProps> = ({
  journals,
  onRowClick,
  onEditClick,
  height = 520,
}) => {
  // Columns grounded on PT AAP Jurnal Umum Excel format
  const columns: GridColumn[] = useMemo(() => [
    { title: "#",                          id: "index",         width: 45,  group: "Identitas Bukti" },
    { title: "No. Bukti / Jurnal",         id: "journalNumber", width: 165, group: "Identitas Bukti" },
    { title: "Tanggal",                    id: "journalDate",   width: 105, group: "Identitas Bukti" },
    { title: "Project / Site",             id: "customerCode",  width: 100, group: "Identitas Bukti" },
    { title: "Keterangan / Uraian",        id: "description",   width: 290, group: "Rincian Akun" },
    { title: "Akun Terkait (COA)",         id: "accounts",      width: 230, group: "Rincian Akun" },
    { title: "Debet (IDR)",                id: "totalDebit",    width: 155, group: "Nominal" },
    { title: "Kredit (IDR)",               id: "totalCredit",   width: 155, group: "Nominal" },
    { title: "Status",                     id: "status",        width: 120, group: "Verifikasi" },
    { title: "Dibuat Oleh",                id: "createdBy",     width: 130, group: "Verifikasi" },
    { title: "Aksi",                       id: "action",        width: 90,  group: "Verifikasi" },
  ], []);

  const statusColor = (s: string): string => {
    if (s === "Draft") return "#b45309";          // amber-700
    if (s === "Verified") return "#0369a1";       // sky-700
    if (s === "Approved") return "#A57C50";       // andalan-500 gold
    if (s === "Posted to GL") return "#15803d";   // emerald-700
    if (s === "Reversed") return "#be123c";       // rose-700
    return "#475569";
  };

  const getCellContent = useCallback(
    (cell: Item): GridCell => {
      const [col, row] = cell;
      const j = journals[row];
      if (!j) return { kind: GridCellKind.Text, allowOverlay: false, data: "", displayData: "" };

      switch (col) {
        case 0:
          return { kind: GridCellKind.Text, allowOverlay: false, data: String(row + 1), displayData: String(row + 1), themeOverride: { textDark: "#94a3b8" } };

        case 1:
          return { kind: GridCellKind.Text, allowOverlay: false, data: j.journalNumber || "", displayData: j.journalNumber || "", themeOverride: { textDark: "#0f172a", baseFontStyle: "600 12px" } };

        case 2:
          const d = j.journalDate ? new Date(j.journalDate).toLocaleDateString("id-ID") : "-";
          return { kind: GridCellKind.Text, allowOverlay: false, data: d, displayData: d, themeOverride: { textDark: "#334155" } };

        case 3:
          return { kind: GridCellKind.Text, allowOverlay: false, data: j.customerCode || "HO", displayData: j.customerCode || "HO", themeOverride: { textDark: "#0f172a", baseFontStyle: "600 11px" } };

        case 4:
          return { kind: GridCellKind.Text, allowOverlay: false, data: j.description || "-", displayData: j.description || "-", themeOverride: { textDark: "#0f172a" } };

        case 5: {
          let acc = "-";
          if (j.lines?.length) {
            acc = `${j.lines[0].accountCode} — ${j.lines[0].accountName}`;
            if (j.lines.length > 1) acc += ` +${j.lines.length - 1}`;
          }
          return { kind: GridCellKind.Text, allowOverlay: false, data: acc, displayData: acc, themeOverride: { textDark: "#475569" } };
        }

        case 6:
          return { kind: GridCellKind.Text, allowOverlay: false, data: formatIDR(j.totalDebit), displayData: formatIDR(j.totalDebit), themeOverride: { textDark: "#15803d", baseFontStyle: "600 12px" } };

        case 7:
          return { kind: GridCellKind.Text, allowOverlay: false, data: formatIDR(j.totalCredit), displayData: formatIDR(j.totalCredit), themeOverride: { textDark: "#0369a1", baseFontStyle: "600 12px" } };

        case 8: {
          const s = j.status || "Draft";
          return { kind: GridCellKind.Text, allowOverlay: false, data: s, displayData: `● ${s}`, themeOverride: { textDark: statusColor(s), baseFontStyle: "600 11px" } };
        }

        case 9:
          return { kind: GridCellKind.Text, allowOverlay: false, data: j.createdBy || "-", displayData: j.createdBy || "-", themeOverride: { textDark: "#475569" } };

        case 10: {
          const label = j.status === "Draft" ? "✎ Edit" : "↗ Lihat";
          return { kind: GridCellKind.Text, allowOverlay: false, data: label, displayData: label, themeOverride: { textDark: "#A57C50", baseFontStyle: "600 11px" } };
        }

        default:
          return { kind: GridCellKind.Text, allowOverlay: false, data: "", displayData: "" };
      }
    },
    [journals]
  );

  const handleCellClicked = useCallback(
    (cell: Item, _event: CellClickedEventArgs) => {
      const [col, row] = cell;
      const j = journals[row];
      if (!j) return;
      if (col === 10) {
        j.status === "Draft" && onEditClick ? onEditClick(j) : onRowClick?.(j);
      } else {
        onRowClick?.(j);
      }
    },
    [journals, onRowClick, onEditClick]
  );

  return (
    <div className="w-full border border-slate-200 bg-white overflow-hidden shadow-sm" style={{ height, borderRadius: 4 }}>
      <DataEditor
        width="100%"
        height="100%"
        columns={columns}
        rows={journals.length}
        getCellContent={getCellContent}
        onCellClicked={handleCellClicked}
        theme={feastGridTheme}
        smoothScrollX
        smoothScrollY
        freezeColumns={2}
        rowHeight={36}
        headerHeight={38}
        verticalBorder
        rowMarkers="none"
      />
    </div>
  );
};
