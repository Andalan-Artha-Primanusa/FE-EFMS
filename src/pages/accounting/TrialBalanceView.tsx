import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Download, RefreshCw, Printer, Search, CheckCircle2, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import DataEditor, { GridColumn, GridCell, GridCellKind, Item, CellClickedEventArgs } from "@glideapps/glide-data-grid";
import "@glideapps/glide-data-grid/dist/index.css";
import { TrialBalanceRow } from "../../types";
import { getTrialBalance } from "../../lib/api";
import { feastGridTheme } from "./components/JournalGlideGrid";

interface TrialBalanceViewProps {
  onDrillDownToGL?: (accountCode: string) => void;
  initialPeriod?: string;
}

const formatIDR = (val: number) => {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0);
};

export const TrialBalanceView: React.FC<TrialBalanceViewProps> = ({
  onDrillDownToGL,
  initialPeriod = "Juni 2026",
}) => {
  const [period, setPeriod] = useState(initialPeriod);
  const [rows, setRows] = useState<TrialBalanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTrialBalance(period);
      setRows(data);
    } catch (e) {
      console.error("Failed to load Trial Balance:", e);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredRows = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r) => {
      return (
        searchTerm === "" ||
        r.accountCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.accountName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [rows, searchTerm]);

  // Grand totals
  const totals = useMemo(() => {
    let nsDb = 0, nsKr = 0, lrDb = 0, lrKr = 0, nrcDb = 0, nrcKr = 0;
    filteredRows.forEach((r) => {
      nsDb += r.neracaSaldoDebit || 0;
      nsKr += r.neracaSaldoKredit || 0;
      lrDb += r.labaRugiDebit || 0;
      lrKr += r.labaRugiKredit || 0;
      nrcDb += r.neracaDebit || 0;
      nrcKr += r.neracaKredit || 0;
    });

    const nsBalanced = Math.abs(nsDb - nsKr) < 1;
    return { nsDb, nsKr, lrDb, lrKr, nrcDb, nrcKr, nsBalanced };
  }, [filteredRows]);

  const columns: GridColumn[] = useMemo(() => [
    {
      title: "Kode Akun",
      id: "accountCode",
      width: 110,
      group: "Identitas Akun",
    },
    {
      title: "Nama Akun",
      id: "accountName",
      width: 250,
      group: "Identitas Akun",
    },
    {
      title: "Pos Saldo",
      id: "posSaldo",
      width: 85,
      group: "Klasifikasi",
    },
    {
      title: "Pos Laporan",
      id: "posLaporan",
      width: 95,
      group: "Klasifikasi",
    },
    {
      title: "NS Debet",
      id: "nsDebit",
      width: 145,
      group: "Neraca Saldo",
    },
    {
      title: "NS Kredit",
      id: "nsKredit",
      width: 145,
      group: "Neraca Saldo",
    },
    {
      title: "LR Debet",
      id: "lrDebit",
      width: 145,
      group: "Laba Rugi",
    },
    {
      title: "LR Kredit",
      id: "lrKredit",
      width: 145,
      group: "Laba Rugi",
    },
    {
      title: "Neraca Debet",
      id: "nrcDebit",
      width: 145,
      group: "Neraca Akhir",
    },
    {
      title: "Neraca Kredit",
      id: "nrcKredit",
      width: 145,
      group: "Neraca Akhir",
    },
  ], []);

  const getCellContent = useCallback(
    (cell: Item): GridCell => {
      const [colIndex, rowIndex] = cell;
      const row = filteredRows[rowIndex];

      if (!row) {
        return { kind: GridCellKind.Text, allowOverlay: false, data: "", displayData: "" };
      }

      switch (colIndex) {
        case 0:
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: row.accountCode,
            displayData: row.accountCode,
            themeOverride: { textDark: "#0f172a", baseFontStyle: "600 12px" },
          };
        case 1:
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: row.accountName,
            displayData: row.accountName,
            themeOverride: { textDark: "#0f172a", baseFontStyle: "500 12px" },
          };
        case 2:
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: row.posSaldo,
            displayData: row.posSaldo,
            themeOverride: { textDark: "#475569", baseFontStyle: "11px" },
          };
        case 3:
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: row.posLaporan,
            displayData: row.posLaporan,
            themeOverride: { textDark: "#475569", baseFontStyle: "11px" },
          };
        case 4:
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: row.neracaSaldoDebit > 0 ? formatIDR(row.neracaSaldoDebit) : "-",
            displayData: row.neracaSaldoDebit > 0 ? formatIDR(row.neracaSaldoDebit) : "-",
            themeOverride: { textDark: row.neracaSaldoDebit > 0 ? "#15803d" : "#94a3b8", baseFontStyle: "600 12px" },
          };
        case 5:
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: row.neracaSaldoKredit > 0 ? formatIDR(row.neracaSaldoKredit) : "-",
            displayData: row.neracaSaldoKredit > 0 ? formatIDR(row.neracaSaldoKredit) : "-",
            themeOverride: { textDark: row.neracaSaldoKredit > 0 ? "#0369a1" : "#94a3b8", baseFontStyle: "600 12px" },
          };
        case 6:
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: row.labaRugiDebit > 0 ? formatIDR(row.labaRugiDebit) : "-",
            displayData: row.labaRugiDebit > 0 ? formatIDR(row.labaRugiDebit) : "-",
            themeOverride: { textDark: "#475569", baseFontStyle: "12px" },
          };
        case 7:
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: row.labaRugiKredit > 0 ? formatIDR(row.labaRugiKredit) : "-",
            displayData: row.labaRugiKredit > 0 ? formatIDR(row.labaRugiKredit) : "-",
            themeOverride: { textDark: "#475569", baseFontStyle: "12px" },
          };
        case 8:
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: row.neracaDebit > 0 ? formatIDR(row.neracaDebit) : "-",
            displayData: row.neracaDebit > 0 ? formatIDR(row.neracaDebit) : "-",
            themeOverride: { textDark: "#0f172a", baseFontStyle: "600 12px" },
          };
        case 9:
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: row.neracaKredit > 0 ? formatIDR(row.neracaKredit) : "-",
            displayData: row.neracaKredit > 0 ? formatIDR(row.neracaKredit) : "-",
            themeOverride: { textDark: "#0f172a", baseFontStyle: "600 12px" },
          };
        default:
          return { kind: GridCellKind.Text, allowOverlay: false, data: "", displayData: "" };
      }
    },
    [filteredRows]
  );

  const handleCellClicked = useCallback(
    (cell: Item, _event: CellClickedEventArgs) => {
      const [colIndex, rowIndex] = cell;
      const row = filteredRows[rowIndex];
      if (row && onDrillDownToGL && colIndex < 2) {
        onDrillDownToGL(row.accountCode);
      }
    },
    [filteredRows, onDrillDownToGL]
  );

  const exportExcel = () => {
    const exportRows = filteredRows.map((r) => ({
      "Kode Akun": r.accountCode,
      "Nama Akun": r.accountName,
      "Pos Saldo": r.posSaldo,
      "Pos Laporan": r.posLaporan,
      "Neraca Saldo Debet": r.neracaSaldoDebit,
      "Neraca Saldo Kredit": r.neracaSaldoKredit,
      "Laba Rugi Debet": r.labaRugiDebit,
      "Laba Rugi Kredit": r.labaRugiKredit,
      "Neraca Debet": r.neracaDebit,
      "Neraca Kredit": r.neracaKredit,
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Neraca_Lajur");
    XLSX.writeFile(wb, `Neraca_Lajur_PT_AAP_${period.replace(/\s+/g, "_")}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="p-4 bg-white border border-slate-200 space-y-3 shadow-sm" style={{ borderRadius: 4 }}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Periode Laporan
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#A57C50] focus:bg-white transition-colors"
                style={{ borderRadius: 3 }}
              >
                <option value="Juni 2026">Juni 2026</option>
                <option value="Juli 2026">Juli 2026</option>
                <option value="Agustus 2026">Agustus 2026</option>
                <option value="September 2026">September 2026</option>
              </select>
            </div>

            <div className="relative flex-1 md:w-64 mt-4">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari kode akun atau nama akun..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#A57C50] focus:bg-white transition-colors"
                style={{ borderRadius: 3 }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 self-end w-full md:w-auto justify-end">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 bg-slate-50 border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              style={{ borderRadius: 3 }}
              title="Segarkan Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#A57C50]" : ""}`} />
            </button>

            <button
              onClick={exportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold transition-colors"
              style={{ borderRadius: 3 }}
            >
              <Download className="w-3.5 h-3.5" /> Ekspor Excel
            </button>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold transition-colors"
              style={{ borderRadius: 3 }}
            >
              <Printer className="w-3.5 h-3.5" /> Cetak
            </button>
          </div>
        </div>

        {/* Balance Status Banner */}
        <div
          className={`flex items-center justify-between p-3 border text-xs ${
            totals.nsBalanced ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
          style={{ borderRadius: 3 }}
        >
          <div className="flex items-center gap-2">
            {totals.nsBalanced ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">
              {totals.nsBalanced
                ? "Neraca Saldo Seimbang (Balanced) — Total Debet sama dengan Total Kredit."
                : `Neraca Saldo Tidak Seimbang! Selisih: ${formatIDR(Math.abs(totals.nsDb - totals.nsKr))}`}
            </span>
          </div>

          <div className="flex items-center gap-4 font-mono font-bold">
            <span>Debet: {formatIDR(totals.nsDb)}</span>
            <span className="text-slate-300">|</span>
            <span>Kredit: {formatIDR(totals.nsKr)}</span>
          </div>
        </div>
      </div>

      {/* Glide Data Grid */}
      <div className="w-full bg-white border border-slate-200 overflow-hidden shadow-sm relative" style={{ height: 480, borderRadius: 4 }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <div className="w-5 h-5 border-2 border-slate-200 border-t-[#A57C50] rounded-full animate-spin mb-2" />
            <span className="text-xs">Memuat Neraca Saldo...</span>
          </div>
        ) : (
          <DataEditor
            width="100%"
            height="100%"
            columns={columns}
            rows={filteredRows.length}
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
        )}
      </div>

      <div className="text-[11px] text-slate-400 italic">
        * Petunjuk: Klik pada kode akun untuk melompat langsung ke rincian Buku Besar (General Ledger).
      </div>
    </div>
  );
};
