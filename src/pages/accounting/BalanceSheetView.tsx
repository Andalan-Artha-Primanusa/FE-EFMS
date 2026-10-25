import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Download, RefreshCw, Printer, Layers, Building2, Calendar, FileSpreadsheet, CheckCircle2, AlertCircle, ShieldCheck, Scale } from "lucide-react";
import * as XLSX from "xlsx";
import { BalanceSheetData } from "../../types";
import { getBalanceSheet, useReloadOnSave } from "../../lib/api";

interface BalanceSheetViewProps {
  initialSite?: string;
  initialPeriod?: string;
}

const formatIDR = (val: number) => {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0);
};

const SITE_OPTIONS = [
  { id: "CoY", label: "CoY (Konsolidasi PT AAP)" },
  { id: "BGG", label: "Site BGG (Baramega)" },
  { id: "SBS", label: "Site SBS (Tanjung Enim)" },
  { id: "POS", label: "Site POS (Morowali)" },
  { id: "PTRO", label: "Site PTRO (Petrosea)" },
];

const PERIOD_OPTIONS = [
  "Juni 2026",
  "Juli 2026",
  "Agustus 2026",
  "September 2026",
];

export const BalanceSheetView: React.FC<BalanceSheetViewProps> = ({
  initialSite = "CoY",
  initialPeriod = "Juni 2026",
}) => {
  const [site, setSite] = useState(initialSite);
  const [period, setPeriod] = useState(initialPeriod);
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBalanceSheet(site, period);
      setData(res);
    } catch (e) {
      console.error("Failed to load Balance Sheet:", e);
    } finally {
      setLoading(false);
    }
  }, [site, period]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  useReloadOnSave(loadData);

  // Derived totals
  const totalCurAsset = data?.totalCurrentAsset || 0;
  const totalFixAsset = data?.totalFixedAsset || 0;
  const totalAsset = data?.totalAsset || (totalCurAsset + totalFixAsset);

  const totalCurLiab = data?.totalCurrentLiab || 0;
  const totalLTLiab = data?.totalLongTermLiab || 0;
  const totalLiabilities = data?.totalLiabilities || (totalCurLiab + totalLTLiab);

  const totalEquity = data?.totalEquity || 0;
  const totalLiabAndEquity = data?.totalLiabAndEquity || (totalLiabilities + totalEquity);
  const diff = Math.abs(totalAsset - totalLiabAndEquity);
  const isBalanced = data?.isBalanced ?? (diff < 10);

  // Export to Excel handler
  const handleExportExcel = () => {
    if (!data) return;

    const rows: any[] = [];
    rows.push(["PT ANDALAN AGRO PRIMA"]);
    rows.push(["LAPORAN POSISI KEUANGAN / NERACA (BALANCE SHEET)"]);
    rows.push([`Entitas / Site: ${data.projectCode || site}`, `Periode: ${data.period || period}`]);
    rows.push([]);

    // Assets Section
    rows.push(["ASET (AKTIVA)", "", "JUMLAH (IDR)"]);
    rows.push(["ASET LANCAR", "", ""]);
    (data.currentAssets || []).forEach((item) => {
      rows.push([item.accountCode, item.accountName, item.amount]);
    });
    rows.push(["", "TOTAL ASET LANCAR", totalCurAsset]);
    rows.push([]);

    rows.push(["ASET TETAP", "", ""]);
    (data.fixedAssets || []).forEach((item) => {
      rows.push([item.accountCode, item.accountName, item.amount]);
    });
    rows.push(["", "TOTAL ASET TETAP (BERSIH)", totalFixAsset]);
    rows.push([]);
    rows.push(["", "TOTAL ASET (AKTIVA)", totalAsset]);
    rows.push([]);

    // Liabilities & Equity Section
    rows.push(["KEWAJIBAN & EKUITAS (PASIVA)", "", "JUMLAH (IDR)"]);
    rows.push(["KEWAJIBAN LANCAR", "", ""]);
    (data.currentLiabilities || []).forEach((item) => {
      rows.push([item.accountCode, item.accountName, item.amount]);
    });
    rows.push(["", "TOTAL KEWAJIBAN LANCAR", totalCurLiab]);
    rows.push([]);

    rows.push(["KEWAJIBAN JANGKA PANJANG", "", ""]);
    (data.longTermLiabilities || []).forEach((item) => {
      rows.push([item.accountCode, item.accountName, item.amount]);
    });
    rows.push(["", "TOTAL KEWAJIBAN JANGKA PANJANG", totalLTLiab]);
    rows.push(["", "TOTAL KEWAJIBAN", totalLiabilities]);
    rows.push([]);

    rows.push(["EKUITAS", "", ""]);
    (data.equityItems || []).forEach((item) => {
      rows.push([item.accountCode, item.accountName, item.amount]);
    });
    rows.push(["", "TOTAL EKUITAS", totalEquity]);
    rows.push([]);
    rows.push(["", "TOTAL KEWAJIBAN & EKUITAS", totalLiabAndEquity]);
    rows.push(["", "STATUS KESEIMBANGAN (BALANCE)", isBalanced ? "SEIMBANG (BALANCED)" : "SELISIH (IMBALANCED)"]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Balance Sheet");
    XLSX.writeFile(wb, `Neraca_${site}_${period.replace(/\s+/g, "_")}.xlsx`);
  };

  return (
    <div className="flex flex-col gap-4 max-w-7xl mx-auto">
      {/* Top Filter & Action Bar */}
      <div className="bg-white rounded border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Site Selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded text-xs">
            <Building2 className="w-4 h-4 text-[#A57C50]" />
            <span className="font-semibold text-slate-700">Entitas:</span>
            <select
              value={site}
              onChange={(e) => setSite(e.target.value)}
              className="bg-transparent font-medium text-slate-900 border-none outline-none cursor-pointer"
            >
              {SITE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Period Selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded text-xs">
            <Calendar className="w-4 h-4 text-[#A57C50]" />
            <span className="font-semibold text-slate-700">Periode:</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-transparent font-medium text-slate-900 border-none outline-none cursor-pointer"
            >
              {PERIOD_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Balance Status Indicator */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold ${isBalanced ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"}`}>
            {isBalanced ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Neraca Seimbang (Aktiva = Pasiva)</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Terdapat Selisih: {formatIDR(diff)}</span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#A57C50]" : ""}`} />
            Segarkan
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            Cetak
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#107c41] hover:bg-[#0e6b37] text-white rounded text-xs font-semibold shadow-sm transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Ekspor Excel
          </button>
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Aset Lancar</div>
          <div className="text-base font-bold text-slate-900 mt-1 font-mono">{formatIDR(totalCurAsset)}</div>
          <div className="text-[10px] text-slate-500 mt-1">Kas, Bank, Piutang Usaha & Persediaan</div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Aset Tetap (Bersih)</div>
          <div className="text-base font-bold text-slate-900 mt-1 font-mono">{formatIDR(totalFixAsset)}</div>
          <div className="text-[10px] text-slate-500 mt-1">Alat Berat & Armada Operasional</div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Kewajiban (Liabilitas)</div>
          <div className="text-base font-bold text-amber-900 mt-1 font-mono">{formatIDR(totalLiabilities)}</div>
          <div className="text-[10px] text-slate-500 mt-1">Hutang Usaha, Modal Kerja & Leasing</div>
        </div>

        <div className="bg-[#1A1612] text-white rounded p-3.5 shadow-md border border-[#A57C50]/40">
          <div className="text-[11px] font-semibold text-[#D4AF37] uppercase tracking-wider">Total Ekuitas</div>
          <div className="text-base font-bold text-[#D4AF37] mt-1 font-mono">{formatIDR(totalEquity)}</div>
          <div className="text-[10px] text-slate-300 mt-1">Modal Saham, Laba Ditahan & Laba Berjalan</div>
        </div>
      </div>

      {/* Two-Column Side-by-Side Balance Sheet Presentation */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,480px),1fr))] gap-4">
        {/* LEFT COLUMN: ASET (AKTIVA) */}
        <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              Sisi Kiri: Aset (Aktiva)
            </h4>
            <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {formatIDR(totalAsset)}
            </span>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold text-[11px]">
                  <th className="py-2 px-3 w-24">Kode</th>
                  <th className="py-2 px-3">Uraian Akun Aset</th>
                  <th className="py-2 px-3 text-right w-36">Saldo (IDR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {/* Aset Lancar Header */}
                <tr className="bg-slate-50/70 font-bold text-slate-900">
                  <td className="py-1.5 px-3 font-mono text-[11px] text-[#A57C50]">1100</td>
                  <td colSpan={2} className="py-1.5 px-3 uppercase tracking-wider text-[10px]">
                    Aset Lancar (Current Assets)
                  </td>
                </tr>
                {(data?.currentAssets || []).map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="py-1 px-3 font-mono text-[11px] text-slate-500">{item.accountCode}</td>
                    <td className="py-1 px-3 pl-6">{item.accountName}</td>
                    <td className="py-1 px-3 text-right font-mono font-medium">{formatIDR(item.amount)}</td>
                  </tr>
                ))}
                <tr className="bg-emerald-50/50 font-bold border-t border-b border-emerald-200 text-slate-900">
                  <td className="py-1.5 px-3"></td>
                  <td className="py-1.5 px-3">Subtotal Aset Lancar</td>
                  <td className="py-1.5 px-3 text-right font-mono text-emerald-900">{formatIDR(totalCurAsset)}</td>
                </tr>

                {/* Aset Tetap Header */}
                <tr className="bg-slate-50/70 font-bold text-slate-900">
                  <td className="py-1.5 px-3 font-mono text-[11px] text-[#A57C50]">1200</td>
                  <td colSpan={2} className="py-1.5 px-3 uppercase tracking-wider text-[10px]">
                    Aset Tetap (Fixed Assets)
                  </td>
                </tr>
                {(data?.fixedAssets || []).map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="py-1 px-3 font-mono text-[11px] text-slate-500">{item.accountCode}</td>
                    <td className="py-1 px-3 pl-6">{item.accountName}</td>
                    <td className="py-1 px-3 text-right font-mono font-medium">{formatIDR(item.amount)}</td>
                  </tr>
                ))}
                <tr className="bg-emerald-50/50 font-bold border-t border-b border-emerald-200 text-slate-900">
                  <td className="py-1.5 px-3"></td>
                  <td className="py-1.5 px-3">Subtotal Aset Tetap (Bersih)</td>
                  <td className="py-1.5 px-3 text-right font-mono text-emerald-900">{formatIDR(totalFixAsset)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-[#1A1612] text-white font-bold border-t-2 border-[#A57C50]">
                  <td className="py-2.5 px-3 font-mono text-[#D4AF37]">1000</td>
                  <td className="py-2.5 px-3 uppercase tracking-wide text-[#D4AF37]">TOTAL ASET (AKTIVA)</td>
                  <td className="py-2.5 px-3 text-right font-mono text-[#D4AF37] text-sm">{formatIDR(totalAsset)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: KEWAJIBAN & EKUITAS (PASIVA) */}
        <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#A57C50]" />
              Sisi Kanan: Kewajiban & Ekuitas (Pasiva)
            </h4>
            <span className="text-[11px] font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {formatIDR(totalLiabAndEquity)}
            </span>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold text-[11px]">
                  <th className="py-2 px-3 w-24">Kode</th>
                  <th className="py-2 px-3">Uraian Akun Pasiva</th>
                  <th className="py-2 px-3 text-right w-36">Saldo (IDR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {/* Kewajiban Lancar Header */}
                <tr className="bg-slate-50/70 font-bold text-slate-900">
                  <td className="py-1.5 px-3 font-mono text-[11px] text-[#A57C50]">2100</td>
                  <td colSpan={2} className="py-1.5 px-3 uppercase tracking-wider text-[10px]">
                    Kewajiban Lancar (Current Liabilities)
                  </td>
                </tr>
                {(data?.currentLiabilities || []).map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="py-1 px-3 font-mono text-[11px] text-slate-500">{item.accountCode}</td>
                    <td className="py-1 px-3 pl-6">{item.accountName}</td>
                    <td className="py-1 px-3 text-right font-mono font-medium text-amber-900">{formatIDR(item.amount)}</td>
                  </tr>
                ))}
                <tr className="bg-amber-50/50 font-bold border-t border-b border-amber-200 text-slate-900">
                  <td className="py-1.5 px-3"></td>
                  <td className="py-1.5 px-3">Subtotal Kewajiban Lancar</td>
                  <td className="py-1.5 px-3 text-right font-mono text-amber-900">{formatIDR(totalCurLiab)}</td>
                </tr>

                {/* Kewajiban Jangka Panjang Header */}
                <tr className="bg-slate-50/70 font-bold text-slate-900">
                  <td className="py-1.5 px-3 font-mono text-[11px] text-[#A57C50]">2200</td>
                  <td colSpan={2} className="py-1.5 px-3 uppercase tracking-wider text-[10px]">
                    Kewajiban Jangka Panjang (Long-Term Debt)
                  </td>
                </tr>
                {(data?.longTermLiabilities || []).map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="py-1 px-3 font-mono text-[11px] text-slate-500">{item.accountCode}</td>
                    <td className="py-1 px-3 pl-6">{item.accountName}</td>
                    <td className="py-1 px-3 text-right font-mono font-medium text-amber-900">{formatIDR(item.amount)}</td>
                  </tr>
                ))}
                <tr className="bg-amber-50/50 font-bold border-t border-b border-amber-200 text-slate-900">
                  <td className="py-1.5 px-3"></td>
                  <td className="py-1.5 px-3">Subtotal Kewajiban Jangka Panjang</td>
                  <td className="py-1.5 px-3 text-right font-mono text-amber-900">{formatIDR(totalLTLiab)}</td>
                </tr>

                {/* Ekuitas Header */}
                <tr className="bg-slate-50/70 font-bold text-slate-900">
                  <td className="py-1.5 px-3 font-mono text-[11px] text-[#A57C50]">3000</td>
                  <td colSpan={2} className="py-1.5 px-3 uppercase tracking-wider text-[10px]">
                    Ekuitas (Equity)
                  </td>
                </tr>
                {(data?.equityItems || []).map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="py-1 px-3 font-mono text-[11px] text-slate-500">{item.accountCode}</td>
                    <td className="py-1 px-3 pl-6 font-medium">{item.accountName}</td>
                    <td className="py-1 px-3 text-right font-mono font-medium text-slate-900">{formatIDR(item.amount)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-100 font-bold border-t border-b border-slate-200 text-slate-900">
                  <td className="py-1.5 px-3"></td>
                  <td className="py-1.5 px-3">Subtotal Ekuitas</td>
                  <td className="py-1.5 px-3 text-right font-mono text-slate-900">{formatIDR(totalEquity)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-[#1A1612] text-white font-bold border-t-2 border-[#A57C50]">
                  <td className="py-2.5 px-3 font-mono text-[#D4AF37]">2+3</td>
                  <td className="py-2.5 px-3 uppercase tracking-wide text-[#D4AF37]">TOTAL LIABILITAS & EKUITAS</td>
                  <td className="py-2.5 px-3 text-right font-mono text-[#D4AF37] text-sm">{formatIDR(totalLiabAndEquity)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
