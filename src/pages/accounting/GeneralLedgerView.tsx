import React, { useState, useEffect, useMemo, useCallback } from "react";
import { BookOpen, Search, Download, RefreshCw, Printer, ArrowRight } from "lucide-react";
import * as XLSX from "xlsx";
import DataEditor, { GridColumn, GridCell, GridCellKind, Item, CellClickedEventArgs } from "@glideapps/glide-data-grid";
import "@glideapps/glide-data-grid/dist/index.css";
import { COAAccount, GeneralLedgerView as GLData, GeneralLedgerRow } from "../../types";
import { getGeneralLedger } from "../../lib/api";
import { feastGridTheme } from "./components/JournalGlideGrid";

interface GeneralLedgerViewProps {
  coaAccounts: COAAccount[];
  initialAccount?: string;
  initialPeriod?: string;
}

const formatIDR = (val: number) => {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0);
};

export const GeneralLedgerView: React.FC<GeneralLedgerViewProps> = ({
  coaAccounts,
  initialAccount = "1101.001",
  initialPeriod = "Juni 2026",
}) => {
  const [selectedAccount, setSelectedAccount] = useState<string>(initialAccount);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(initialPeriod);
  const [siteFilter, setSiteFilter] = useState<string>("ALL");
  const [glData, setGlData] = useState<GLData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (initialAccount) {
      setSelectedAccount(initialAccount);
    }
  }, [initialAccount]);

  const loadGL = useCallback(async () => {
    if (!selectedAccount) return;
    setLoading(true);
    try {
      const data = await getGeneralLedger(selectedAccount, selectedPeriod);
      setGlData(data);
    } catch (e) {
      console.error("Failed to load General Ledger:", e);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, selectedPeriod]);

  useEffect(() => {
    loadGL();
  }, [loadGL]);

  const currentAccount = useMemo(() => {
    return coaAccounts.find((a) => a.code === selectedAccount) || {
      code: selectedAccount,
      name: glData?.accountName || "Akun Buku Besar",
    };
  }, [coaAccounts, selectedAccount, glData]);

  // Compute running balance
  const computedRows = useMemo(() => {
    if (!glData || !glData.rows) return [];
    let running = glData.openingBalance || 0;
    const isNormalDebit = !["2", "3", "4"].some((prefix) => selectedAccount.startsWith(prefix));

    return glData.rows.map((r, idx) => {
      if (isNormalDebit) {
        running += (r.debit || 0) - (r.credit || 0);
      } else {
        running += (r.credit || 0) - (r.debit || 0);
      }
      return {
        ...r,
        index: idx + 1,
        balance: running,
      };
    });
  }, [glData, selectedAccount]);

  // Filter rows
  const filteredRows = useMemo(() => {
    if (siteFilter === "ALL") return computedRows;
    return computedRows.filter((r) => r.projectCode === siteFilter);
  }, [computedRows, siteFilter]);

  const columns: GridColumn[] = useMemo(() => [
    {
      title: "#",
      id: "index",
      width: 45,
      group: "Identitas Transaksi",
    },
    {
      title: "Tanggal",
      id: "date",
      width: 105,
      group: "Identitas Transaksi",
    },
    {
      title: "No. Bukti / Jurnal",
      id: "buktiNo",
      width: 165,
      group: "Identitas Transaksi",
    },
    {
      title: "Project / Site",
      id: "project",
      width: 100,
      group: "Identitas Transaksi",
    },
    {
      title: "Keterangan Transaksi",
      id: "description",
      width: 290,
      group: "Uraian",
    },
    {
      title: "Debet (IDR)",
      id: "debit",
      width: 155,
      group: "Mutasi Finansial",
    },
    {
      title: "Kredit (IDR)",
      id: "credit",
      width: 155,
      group: "Mutasi Finansial",
    },
    {
      title: "Saldo Berjalan (IDR)",
      id: "balance",
      width: 175,
      group: "Mutasi Finansial",
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
            data: String(rowIndex + 1),
            displayData: String(rowIndex + 1),
            themeOverride: { textDark: "#94a3b8" },
          };
        case 1: {
          const d = row.date ? new Date(row.date).toLocaleDateString("id-ID") : "-";
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: d,
            displayData: d,
            themeOverride: { textDark: "#334155" },
          };
        }
        case 2:
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: row.buktiNo || "-",
            displayData: row.buktiNo || "-",
            themeOverride: { textDark: "#0f172a", baseFontStyle: "600 12px" },
          };
        case 3:
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: row.projectCode || "HO",
            displayData: row.projectCode || "HO",
            themeOverride: { textDark: "#0f172a", baseFontStyle: "600 11px" },
          };
        case 4:
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: row.description || "-",
            displayData: row.description || "-",
            themeOverride: { textDark: "#0f172a" },
          };
        case 5:
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: row.debit > 0 ? formatIDR(row.debit) : "-",
            displayData: row.debit > 0 ? formatIDR(row.debit) : "-",
            themeOverride: {
              textDark: row.debit > 0 ? "#15803d" : "#94a3b8",
              baseFontStyle: "600 12px",
            },
          };
        case 6:
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: row.credit > 0 ? formatIDR(row.credit) : "-",
            displayData: row.credit > 0 ? formatIDR(row.credit) : "-",
            themeOverride: {
              textDark: row.credit > 0 ? "#0369a1" : "#94a3b8",
              baseFontStyle: "600 12px",
            },
          };
        case 7:
          return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            data: formatIDR(row.balance),
            displayData: formatIDR(row.balance),
            themeOverride: {
              textDark: "#0f172a",
              baseFontStyle: "bold 12px",
            },
          };
        default:
          return { kind: GridCellKind.Text, allowOverlay: false, data: "", displayData: "" };
      }
    },
    [filteredRows]
  );

  const exportExcel = () => {
    if (!glData) return;
    const exportRows = filteredRows.map((r) => ({
      "No": r.index,
      "Tanggal": r.date ? r.date.slice(0, 10) : "",
      "No. Bukti / Jurnal": r.buktiNo,
      "Site / Project": r.projectCode || "HO",
      "Keterangan Transaksi": r.description,
      "Debet (IDR)": r.debit,
      "Kredit (IDR)": r.credit,
      "Saldo Berjalan (IDR)": r.balance,
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `GL_${selectedAccount}`);
    XLSX.writeFile(wb, `Buku_Besar_${selectedAccount}_${selectedPeriod.replace(/\s+/g, "_")}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Account Selection Bar */}
      <div className="p-4 bg-white border border-slate-200 space-y-4 shadow-sm" style={{ borderRadius: 4 }}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* COA Account Picker */}
            <div className="w-full md:w-80">
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Pilih Akun Buku Besar (COA)</label>
              <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#A57C50] focus:bg-white transition-colors"
                style={{ borderRadius: 3 }}>
                {coaAccounts.map((a) => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
              </select>
            </div>

            {/* Periode */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Periode</label>
              <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#A57C50] focus:bg-white transition-colors"
                style={{ borderRadius: 3 }}>
                {["Juni 2026","Juli 2026","Agustus 2026","September 2026"].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {/* Site Filter */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Project / Site</label>
              <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#A57C50] focus:bg-white transition-colors"
                style={{ borderRadius: 3 }}>
                <option value="ALL">Semua Site</option>
                {["HO","BGG","SBS","POS","PTRO","CoY"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end w-full md:w-auto justify-end">
            <button onClick={loadGL} disabled={loading}
              className="p-2 bg-slate-50 border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              style={{ borderRadius: 3 }} title="Segarkan">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#A57C50]" : ""}`} />
            </button>
            <button onClick={exportExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold transition-colors"
              style={{ borderRadius: 3 }}>
              <Download className="w-3.5 h-3.5" /> Ekspor
            </button>
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold transition-colors"
              style={{ borderRadius: 3 }}>
              <Printer className="w-3.5 h-3.5" /> Cetak
            </button>
          </div>
        </div>

        {/* Account Summary Cards */}
        {glData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-200">
            {[
              { label: "Saldo Awal", value: glData.openingBalance, color: "#334155", bg: "bg-slate-50", border: "border-slate-200" },
              { label: "Total Mutasi Debet", value: glData.totalDebit, color: "#15803d", bg: "bg-emerald-50/60", border: "border-emerald-200" },
              { label: "Total Mutasi Kredit", value: glData.totalCredit, color: "#0369a1", bg: "bg-sky-50/60", border: "border-sky-200" },
              { label: "Saldo Akhir", value: glData.endingBalance, color: "#0f172a", bg: "bg-slate-100", border: "border-slate-300" },
            ].map((c, i) => (
              <div key={i} className={`p-3 border ${c.bg} ${c.border}`} style={{ borderRadius: 3 }}>
                <span className="text-[10px] uppercase block font-semibold mb-1" style={{ color: c.color }}>{c.label}</span>
                <span className="text-sm font-bold font-mono" style={{ color: c.color }}>{formatIDR(c.value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Glide Data Grid */}
      <div className="w-full bg-white border border-slate-200 overflow-hidden shadow-sm" style={{ borderRadius: 4, height: 480 }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <div className="w-5 h-5 border-2 border-slate-200 border-t-[#A57C50] rounded-full animate-spin mb-2" />
            <span className="text-xs">Memuat Buku Besar...</span>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <BookOpen className="w-8 h-8 text-slate-300 mb-2" />
            <span className="text-xs font-semibold text-slate-600">Tidak ada mutasi transaksi pada akun dan periode ini</span>
          </div>
        ) : (
          <DataEditor
            width="100%"
            height="100%"
            columns={columns}
            rows={filteredRows.length}
            getCellContent={getCellContent}
            theme={feastGridTheme}
            smoothScrollX
            smoothScrollY
            freezeColumns={3}
            rowHeight={36}
            headerHeight={38}
            verticalBorder
            rowMarkers="none"
          />
        )}
      </div>
    </div>
  );
};
