import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Download, RefreshCw, Printer, TrendingUp, Building2, Calendar, FileSpreadsheet, Pickaxe, BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react";
import * as XLSX from "xlsx";
import { ProfitLossData } from "../../types";
import { getProfitLoss } from "../../lib/api";

interface ProfitLossViewProps {
  initialSite?: string;
  initialPeriod?: string;
}

const formatIDR = (val: number) => {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0);
};

const formatPercent = (val: number) => {
  if (isNaN(val) || !isFinite(val)) return "0.0%";
  return `${val.toFixed(1)}%`;
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

export const ProfitLossView: React.FC<ProfitLossViewProps> = ({
  initialSite = "CoY",
  initialPeriod = "Juni 2026",
}) => {
  const [site, setSite] = useState(initialSite);
  const [period, setPeriod] = useState(initialPeriod);
  const [data, setData] = useState<ProfitLossData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProfitLoss(site, period);
      setData(res);
    } catch (e) {
      console.error("Failed to load Profit & Loss:", e);
    } finally {
      setLoading(false);
    }
  }, [site, period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived KPI calculations
  const totalRevenue = data?.totalRevenue || 0;
  const totalCOGS = data?.totalCOGS || 0;
  const grossProfit = data?.grossProfit || (totalRevenue - totalCOGS);
  const totalOPEX = data?.totalOPEX || 0;
  const netIncome = data?.netIncome || (grossProfit - totalOPEX);

  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const netMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

  // Export to Excel handler
  const handleExportExcel = () => {
    if (!data) return;

    const rows: any[] = [];
    rows.push(["PT ANDALAN AGRO PRIMA"]);
    rows.push(["LAPORAN LABA RUGI KOMPREHENSIF (PROFIT & LOSS STATEMENT)"]);
    rows.push([`Entitas / Site: ${data.projectCode || site}`, `Periode: ${data.period || period}`]);
    rows.push([]);

    // Production Metrics
    if (data.productionMetrics && data.productionMetrics.length > 0) {
      rows.push(["--- METRIK PRODUKSI TAMBANG ---"]);
      rows.push(["Indikator Produksi", "Satuan", "Realisasi (Actual)", "Anggaran (Budget)", "Deviasi (%)"]);
      data.productionMetrics.forEach((m) => {
        const dev = m.budget > 0 ? ((m.actual - m.budget) / m.budget) * 100 : 0;
        rows.push([m.metricName, m.unit, m.actual, m.budget, `${dev.toFixed(1)}%`]);
      });
      rows.push([]);
    }

    // Revenue
    rows.push(["KODE AKUN", "KETERANGAN", "AKTUAL (IDR)", "ANGGARAN (IDR)", "% RASIO REVENUE"]);
    rows.push(["4000", "PENDAPATAN USAHA (REVENUE)", "", "", ""]);
    (data.revenueItems || []).forEach((r) => {
      rows.push([r.accountCode, r.accountName, r.actual, r.budget, `${r.percentage.toFixed(1)}%`]);
    });
    rows.push(["", "TOTAL PENDAPATAN USAHA", totalRevenue, "", "100.0%"]);
    rows.push([]);

    // COGS
    rows.push(["5000", "BEBAN POKOK PENDAPATAN (COGS / HPP)", "", "", ""]);
    (data.cogsItems || []).forEach((c) => {
      rows.push([c.accountCode, c.accountName, c.actual, c.budget, `${c.percentage.toFixed(1)}%`]);
    });
    rows.push(["", "TOTAL BEBAN POKOK PENDAPATAN", totalCOGS, "", `${formatPercent((totalCOGS / (totalRevenue || 1)) * 100)}`]);
    rows.push([]);

    // Gross Profit
    rows.push(["", "LABA KOTOR (GROSS PROFIT)", grossProfit, "", `${formatPercent(grossMargin)}`]);
    rows.push([]);

    // OPEX
    rows.push(["6000", "BEBAN OPERASIONAL (OPEX)", "", "", ""]);
    (data.opexItems || []).forEach((o) => {
      rows.push([o.accountCode, o.accountName, o.actual, o.budget, `${o.percentage.toFixed(1)}%`]);
    });
    rows.push(["", "TOTAL BEBAN OPERASIONAL", totalOPEX, "", `${formatPercent((totalOPEX / (totalRevenue || 1)) * 100)}`]);
    rows.push([]);

    // Net Income
    rows.push(["", "LABA BERSIH BERJALAN (NET INCOME)", netIncome, "", `${formatPercent(netMargin)}`]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Profit & Loss");
    XLSX.writeFile(wb, `Laba_Rugi_${site}_${period.replace(/\s+/g, "_")}.xlsx`);
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pendapatan Usaha</div>
          <div className="text-base font-bold text-slate-900 mt-1 font-mono">{formatIDR(totalRevenue)}</div>
          <div className="text-[10px] text-emerald-600 mt-1 font-medium flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" /> 100% Target Operasional
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">HPP / COGS Tambang</div>
          <div className="text-base font-bold text-amber-900 mt-1 font-mono">{formatIDR(totalCOGS)}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">
            Rasio: {formatPercent((totalCOGS / (totalRevenue || 1)) * 100)} terhadap revenue
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Laba Kotor</div>
          <div className={`text-base font-bold mt-1 font-mono ${grossProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {formatIDR(grossProfit)}
          </div>
          <div className="text-[10px] text-emerald-600 mt-1 font-medium">
            Gross Margin: {formatPercent(grossMargin)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Beban Usaha (OPEX)</div>
          <div className="text-base font-bold text-slate-900 mt-1 font-mono">{formatIDR(totalOPEX)}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">
            Rasio: {formatPercent((totalOPEX / (totalRevenue || 1)) * 100)} terhadap revenue
          </div>
        </div>

        <div className="bg-[#1A1612] text-white rounded p-3.5 shadow-md border border-[#A57C50]/40">
          <div className="text-[11px] font-semibold text-[#D4AF37] uppercase tracking-wider">Laba Bersih Berjalan</div>
          <div className={`text-base font-bold mt-1 font-mono ${netIncome >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {formatIDR(netIncome)}
          </div>
          <div className="text-[10px] text-slate-300 mt-1 font-medium">
            Net Margin: {formatPercent(netMargin)}
          </div>
        </div>
      </div>

      {/* Production Metrics Banner */}
      {data?.productionMetrics && data.productionMetrics.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded p-3.5 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-emerald-900 font-bold">
            <Pickaxe className="w-4 h-4 text-emerald-700" />
            <span>Realisasi Fisik Penambangan Periode {period} ({data.projectCode}):</span>
          </div>
          <div className="flex items-center gap-6">
            {data.productionMetrics.map((m, idx) => {
              const diff = m.actual - m.budget;
              const isOver = diff >= 0;
              return (
                <div key={idx} className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">{m.metricName}:</span>
                  <span className="font-bold font-mono text-slate-900">{m.actual.toLocaleString("id-ID")} {m.unit}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isOver ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                    Budget: {m.budget.toLocaleString("id-ID")} ({isOver ? "+" : ""}{((diff / (m.budget || 1)) * 100).toFixed(1)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detailed Financial Statement Table */}
      <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Laporan Laba Rugi — {data?.projectCode || site}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Standar Akuntansi Keuangan PT AAP per {period}
            </p>
          </div>
          <span className="text-[11px] font-mono bg-slate-200 text-slate-700 px-2 py-1 rounded">
            Mata Uang: IDR (Rupiah)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse font-sans">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold text-[11px]">
                <th className="py-2.5 px-4 w-28">Kode Akun</th>
                <th className="py-2.5 px-4">Uraian / Akun Perkiraan</th>
                <th className="py-2.5 px-4 text-right w-44">Realisasi (Actual)</th>
                <th className="py-2.5 px-4 text-right w-40">Anggaran (Budget)</th>
                <th className="py-2.5 px-4 text-right w-28">% Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {/* SECTION I: REVENUE */}
              <tr className="bg-slate-50/70 font-bold text-slate-900">
                <td className="py-2 px-4 font-mono text-[11px] text-[#A57C50]">4000</td>
                <td colSpan={4} className="py-2 px-4 uppercase tracking-wider text-[11px]">
                  I. Pendapatan Usaha (Revenue)
                </td>
              </tr>
              {(data?.revenueItems || []).map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80">
                  <td className="py-1.5 px-4 font-mono text-slate-500">{item.accountCode}</td>
                  <td className="py-1.5 px-4 pl-8">{item.accountName}</td>
                  <td className="py-1.5 px-4 text-right font-mono font-medium">{formatIDR(item.actual)}</td>
                  <td className="py-1.5 px-4 text-right font-mono text-slate-500">{formatIDR(item.budget)}</td>
                  <td className="py-1.5 px-4 text-right font-mono text-slate-600">{formatPercent(item.percentage)}</td>
                </tr>
              ))}
              <tr className="bg-emerald-50/60 font-bold border-t border-b border-emerald-200 text-slate-900">
                <td className="py-2 px-4"></td>
                <td className="py-2 px-4">TOTAL PENDAPATAN USAHA</td>
                <td className="py-2 px-4 text-right font-mono text-emerald-900">{formatIDR(totalRevenue)}</td>
                <td className="py-2 px-4 text-right font-mono text-slate-600">—</td>
                <td className="py-2 px-4 text-right font-mono text-emerald-800">100.0%</td>
              </tr>

              {/* SECTION II: COGS */}
              <tr className="bg-slate-50/70 font-bold text-slate-900">
                <td className="py-2 px-4 font-mono text-[11px] text-[#A57C50]">5000</td>
                <td colSpan={4} className="py-2 px-4 uppercase tracking-wider text-[11px]">
                  II. Beban Pokok Pendapatan (COGS / HPP)
                </td>
              </tr>
              {(data?.cogsItems || []).map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80">
                  <td className="py-1.5 px-4 font-mono text-slate-500">{item.accountCode}</td>
                  <td className="py-1.5 px-4 pl-8">{item.accountName}</td>
                  <td className="py-1.5 px-4 text-right font-mono font-medium text-amber-900">{formatIDR(item.actual)}</td>
                  <td className="py-1.5 px-4 text-right font-mono text-slate-500">{formatIDR(item.budget)}</td>
                  <td className="py-1.5 px-4 text-right font-mono text-slate-600">{formatPercent(item.percentage)}</td>
                </tr>
              ))}
              <tr className="bg-amber-50/60 font-bold border-t border-b border-amber-200 text-slate-900">
                <td className="py-2 px-4"></td>
                <td className="py-2 px-4">TOTAL BEBAN POKOK PENDAPATAN</td>
                <td className="py-2 px-4 text-right font-mono text-amber-900">{formatIDR(totalCOGS)}</td>
                <td className="py-2 px-4 text-right font-mono text-slate-600">—</td>
                <td className="py-2 px-4 text-right font-mono text-amber-800">{formatPercent((totalCOGS / (totalRevenue || 1)) * 100)}</td>
              </tr>

              {/* GROSS PROFIT ROW */}
              <tr className="bg-slate-100/90 font-bold border-t-2 border-b-2 border-slate-300 text-slate-900 text-xs">
                <td className="py-2.5 px-4"></td>
                <td className="py-2.5 px-4 uppercase">LABA KOTOR (GROSS PROFIT)</td>
                <td className={`py-2.5 px-4 text-right font-mono ${grossProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {formatIDR(grossProfit)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono text-slate-600">—</td>
                <td className="py-2.5 px-4 text-right font-mono">{formatPercent(grossMargin)}</td>
              </tr>

              {/* SECTION III: OPEX */}
              <tr className="bg-slate-50/70 font-bold text-slate-900">
                <td className="py-2 px-4 font-mono text-[11px] text-[#A57C50]">6000</td>
                <td colSpan={4} className="py-2 px-4 uppercase tracking-wider text-[11px]">
                  III. Beban Usaha & Operasional (OPEX)
                </td>
              </tr>
              {(data?.opexItems || []).map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80">
                  <td className="py-1.5 px-4 font-mono text-slate-500">{item.accountCode}</td>
                  <td className="py-1.5 px-4 pl-8">{item.accountName}</td>
                  <td className="py-1.5 px-4 text-right font-mono font-medium">{formatIDR(item.actual)}</td>
                  <td className="py-1.5 px-4 text-right font-mono text-slate-500">{formatIDR(item.budget)}</td>
                  <td className="py-1.5 px-4 text-right font-mono text-slate-600">{formatPercent(item.percentage)}</td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-bold border-t border-b border-slate-200 text-slate-900">
                <td className="py-2 px-4"></td>
                <td className="py-2 px-4">TOTAL BEBAN OPERASIONAL</td>
                <td className="py-2 px-4 text-right font-mono">{formatIDR(totalOPEX)}</td>
                <td className="py-2 px-4 text-right font-mono text-slate-600">—</td>
                <td className="py-2 px-4 text-right font-mono">{formatPercent((totalOPEX / (totalRevenue || 1)) * 100)}</td>
              </tr>

              {/* FINAL NET INCOME ROW */}
              <tr className="bg-[#1A1612] text-white font-bold border-t-2 border-[#A57C50] text-sm">
                <td className="py-3 px-4 font-mono text-[#D4AF37]">3103.001</td>
                <td className="py-3 px-4 uppercase tracking-wider text-[#D4AF37]">
                  LABA BERSIH TAHUN BERJALAN (NET INCOME)
                </td>
                <td className={`py-3 px-4 text-right font-mono ${netIncome >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {formatIDR(netIncome)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-slate-400">—</td>
                <td className="py-3 px-4 text-right font-mono text-[#D4AF37]">{formatPercent(netMargin)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
