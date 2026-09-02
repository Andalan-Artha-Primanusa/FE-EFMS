import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Unlock,
  Upload,
  X,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  BarChart3,
  ArrowRight,
  Info,
  ShieldCheck
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { api } from "../lib/api";
import { MonthPickerInput } from "./finance/helpers";

export interface CoalIndexWeekly {
  id?: number;
  monthlyId?: number;
  weekNumber: number;
  releaseDate: string;
  ici3Price: number;
  ici4Price: number;
  r3Price: number;
}

export interface CoalIndexMonthly {
  id?: number;
  period: string;
  avgIci3: number;
  avgIci4: number;
  avgR3: number;
  activeTier: string;
  status: string;
  notes?: string;
  updatedAt?: string;
  weeks: CoalIndexWeekly[];
}

const MONTH_NAMES_MAP: Record<string, number> = {
  januari: 0, january: 0, jan: 0,
  februari: 1, february: 1, feb: 1,
  maret: 2, march: 2, mar: 2,
  april: 3, apr: 3,
  mei: 4, may: 4,
  juni: 5, june: 5, jun: 5,
  juli: 6, july: 6, jul: 6,
  agustus: 7, august: 7, aug: 7,
  september: 8, sep: 8, sept: 8,
  oktober: 9, october: 9, okt: 9, oct: 9,
  november: 10, nov: 10,
  desember: 11, december: 11, des: 11, dec: 11
};

export function getFridaysForPeriod(periodStr: string): string[] {
  let year = new Date().getFullYear();
  let month = new Date().getMonth();

  if (periodStr) {
    const parts = periodStr.toLowerCase().trim().split(/[\s-]+/);
    if (parts.length >= 2) {
      if (MONTH_NAMES_MAP[parts[0]] !== undefined) {
        month = MONTH_NAMES_MAP[parts[0]];
        const y = parseInt(parts[1], 10);
        if (!isNaN(y)) year = y;
      } else if (MONTH_NAMES_MAP[parts[1]] !== undefined) {
        month = MONTH_NAMES_MAP[parts[1]];
        const y = parseInt(parts[0], 10);
        if (!isNaN(y)) year = y;
      } else {
        const p0 = parseInt(parts[0], 10);
        const p1 = parseInt(parts[1], 10);
        if (p0 > 1000) {
          year = p0;
          month = Math.max(0, Math.min(11, p1 - 1));
        } else if (p1 > 1000) {
          year = p1;
          month = Math.max(0, Math.min(11, p0 - 1));
        }
      }
    }
  }

  const fridays: string[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d);
    if (dt.getDay() === 5) {
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, "0");
      const dd = String(dt.getDate()).padStart(2, "0");
      fridays.push(`${yyyy}-${mm}-${dd}`);
    }
  }

  while (fridays.length < 4) {
    const base = fridays.length > 0 ? new Date(fridays[fridays.length - 1]) : new Date(year, month, 7);
    base.setDate(base.getDate() + 7);
    const yyyy = base.getFullYear();
    const mm = String(base.getMonth() + 1).padStart(2, "0");
    const dd = String(base.getDate()).padStart(2, "0");
    fridays.push(`${yyyy}-${mm}-${dd}`);
  }

  return fridays.slice(0, 4);
}

export function CoalIndexPage({
  viewTitle,
  query,
  onNotice
}: {
  viewTitle: string;
  query: string;
  onNotice: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [indexList, setIndexList] = useState<CoalIndexMonthly[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("Juni 2026");

  // Modal / Form state
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<CoalIndexMonthly>({
    id: 0,
    period: "Juni 2026",
    avgIci3: 0,
    avgIci4: 0,
    avgR3: 0,
    activeTier: "Tier 3",
    status: "Draft",
    notes: "",
    weeks: [
      { weekNumber: 1, releaseDate: "2026-06-05", ici3Price: 92.50, ici4Price: 61.20, r3Price: 76.85 },
      { weekNumber: 2, releaseDate: "2026-06-12", ici3Price: 91.80, ici4Price: 60.50, r3Price: 76.15 },
      { weekNumber: 3, releaseDate: "2026-06-19", ici3Price: 93.00, ici4Price: 61.00, r3Price: 77.00 },
      { weekNumber: 4, releaseDate: "2026-06-26", ici3Price: 91.30, ici4Price: 60.15, r3Price: 75.725 },
    ]
  });

  async function loadData() {
    setLoading(true);
    try {
      const res = await api<CoalIndexMonthly[]>("/api/master-data/coal-index");
      if (Array.isArray(res) && res.length > 0) {
        setIndexList(res);
        if (!selectedPeriod && res[0]) {
          setSelectedPeriod(res[0].period);
        }
      } else {
        setIndexList([]);
      }
    } catch (err: any) {
      onNotice(err?.message || "Gagal memuat data Coal Index");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const currentIndex = indexList.find(
    (item) => item.period.toLowerCase() === selectedPeriod.toLowerCase()
  ) || indexList[0];

  const handlePeriodChange = (newPeriod: string) => {
    const fridays = getFridaysForPeriod(newPeriod);
    const updatedWeeks = formData.weeks.map((w, idx) => ({
      ...w,
      releaseDate: fridays[idx] || w.releaseDate
    }));
    setFormData({
      ...formData,
      period: newPeriod,
      weeks: updatedWeeks
    });
  };

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    const targetPeriod = "Agustus 2026";
    const fridays = getFridaysForPeriod(targetPeriod);
    setFormData({
      id: 0,
      period: targetPeriod,
      avgIci3: 91.5,
      avgIci4: 60.5,
      avgR3: 76.0,
      activeTier: "Tier 3",
      status: "Draft",
      notes: "Publikasi mingguan Argus / Coalindo",
      weeks: [
        { weekNumber: 1, releaseDate: fridays[0] || "2026-08-07", ici3Price: 91.8, ici4Price: 60.8, r3Price: 76.3 },
        { weekNumber: 2, releaseDate: fridays[1] || "2026-08-14", ici3Price: 91.2, ici4Price: 60.4, r3Price: 75.8 },
        { weekNumber: 3, releaseDate: fridays[2] || "2026-08-21", ici3Price: 92.0, ici4Price: 61.0, r3Price: 76.5 },
        { weekNumber: 4, releaseDate: fridays[3] || "2026-08-28", ici3Price: 91.0, ici4Price: 59.8, r3Price: 75.4 },
      ]
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (item: CoalIndexMonthly) => {
    setIsEditing(true);
    setFormData(JSON.parse(JSON.stringify(item)));
    setModalOpen(true);
  };

  const handleWeekPriceChange = (index: number, field: "ici3Price" | "ici4Price" | "releaseDate", val: any) => {
    const updatedWeeks = [...formData.weeks];
    if (field === "releaseDate") {
      updatedWeeks[index].releaseDate = val;
    } else {
      const numVal = parseFloat(val) || 0;
      updatedWeeks[index][field] = numVal;
      updatedWeeks[index].r3Price = (updatedWeeks[index].ici3Price + updatedWeeks[index].ici4Price) / 2.0;
    }

    // Recalculate summary averages
    let sum3 = 0, sum4 = 0, sumR = 0, count = 0;
    updatedWeeks.forEach((w) => {
      if (w.ici3Price > 0 || w.ici4Price > 0) {
        sum3 += w.ici3Price;
        sum4 += w.ici4Price;
        sumR += w.r3Price;
        count++;
      }
    });

    const avg3 = count > 0 ? sum3 / count : 0;
    const avg4 = count > 0 ? sum4 / count : 0;
    const avgR = count > 0 ? sumR / count : 0;

    let tier = "Tier 1";
    if (avgR > 75) tier = "Tier 3";
    else if (avgR >= 50) tier = "Tier 2";

    setFormData({
      ...formData,
      weeks: updatedWeeks,
      avgIci3: avg3,
      avgIci4: avg4,
      avgR3: avgR,
      activeTier: tier
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api("/api/master-data/coal-index", {
        method: "POST",
        body: JSON.stringify(formData)
      });
      onNotice(`Data Coal Index periode ${formData.period} berhasil disimpan!`);
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal menyimpan Coal Index");
    }
  };

  const handleToggleLock = async (item: CoalIndexMonthly) => {
    const nextStatus = item.status === "Locked" ? "Verified" : "Locked";
    try {
      await api("/api/master-data/coal-index/lock", {
        method: "POST",
        body: JSON.stringify({ period: item.period, status: nextStatus })
      });
      onNotice(`Status indeks periode ${item.period} berhasil diubah menjadi ${nextStatus}!`);
      await loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal mengubah status lock");
    }
  };

  // Min & max calculation for visual scale
  const r3Val = currentIndex?.avgR3 || 0;
  const tierPercentage = Math.min(100, Math.max(0, ((r3Val - 30) / (100 - 30)) * 100));

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-12">
      {/* Top Header */}
      <PageHeader
        title="Master Benchmark Coal Index"
        description="Acuan harga bulanan ICI-3 dan ICI-4 untuk penentuan tarif berjenjang (Tier 1/2/3) PT BGG."
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition shadow-2xs active:scale-95 cursor-pointer"
            title="Perbarui Data"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="px-3.5 py-2 rounded-lg bg-cyan-800 hover:bg-cyan-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Plus size={15} />
            <span>Input Periode Baru</span>
          </button>
        </div>
      </PageHeader>

      {/* Period Selection Pill Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {indexList.map((idx) => {
          const isSelected = idx.period === selectedPeriod;
          const isTier3 = idx.activeTier === "Tier 3";
          return (
            <button
              key={idx.id || idx.period}
              onClick={() => setSelectedPeriod(idx.period)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap border cursor-pointer ${
                isSelected
                  ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Calendar size={13} className={isSelected ? "text-slate-200" : "text-slate-400"} />
              <span>{idx.period}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                isTier3
                  ? isSelected ? "bg-amber-400 text-slate-950 font-bold" : "bg-amber-50 text-amber-900 border border-amber-200"
                  : isSelected ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-700"
              }`}>
                {idx.activeTier}
              </span>
            </button>
          );
        })}
      </div>

      {/* KPI Cards Grid */}
      {currentIndex && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
          {/* Active Tier Highlight Card */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Active Pricing Tier
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                currentIndex.status === "Locked"
                  ? "bg-slate-900 text-white border-slate-800"
                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
              }`}>
                {currentIndex.status || "Verified"}
              </span>
            </div>

            <div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {currentIndex.activeTier || "Tier 3"}
              </div>
              <p className="text-[11px] font-medium text-slate-600 mt-0.5">
                {currentIndex.activeTier === "Tier 3"
                  ? "R3 > $75 / MT (Tarif Tertinggi)"
                  : currentIndex.activeTier === "Tier 2"
                  ? "$50 ≤ R3 ≤ $75 / MT (Tarif Menengah)"
                  : "R3 < $50 / MT (Tarif Dasar)"}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 text-[11px] font-mono text-slate-600 flex items-center justify-between">
              <span>OB 1: Rp 29.500</span>
              <span>OB 2: Rp 28.750</span>
            </div>
          </div>

          {/* Average R3 Monthly Card */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Monthly Average R3
              </span>
              <span className="p-1 bg-slate-100 rounded text-slate-600">
                <BarChart3 size={14} />
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                ${currentIndex.avgR3 ? currentIndex.avgR3.toFixed(2) : "0.00"}
                <span className="text-xs font-sans font-normal text-slate-400 ml-1">USD/MT</span>
              </div>
              <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                Formula: (ICI 3 + ICI 4) / 2
              </p>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-800 rounded-full"
                style={{ width: `${tierPercentage}%` }}
              />
            </div>
          </div>

          {/* ICI 3 Average Card */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                ICI 3 (6.000 GAR)
              </span>
              <span className="p-1 bg-slate-100 rounded text-slate-600">
                <TrendingUp size={14} />
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                ${currentIndex.avgIci3 ? currentIndex.avgIci3.toFixed(2) : "0.00"}
                <span className="text-xs font-sans font-normal text-slate-400 ml-1">USD/MT</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Rata-rata 4 Minggu Rilis
              </p>
            </div>
            <div className="text-[11px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
              Kualitas 6.000 kcal/kg
            </div>
          </div>

          {/* ICI 4 Average Card */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                ICI 4 (4.200 GAR)
              </span>
              <span className="p-1 bg-slate-100 rounded text-slate-600">
                <TrendingUp size={14} />
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                ${currentIndex.avgIci4 ? currentIndex.avgIci4.toFixed(2) : "0.00"}
                <span className="text-xs font-sans font-normal text-slate-400 ml-1">USD/MT</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Rata-rata 4 Minggu Rilis
              </p>
            </div>
            <div className="text-[11px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
              Kualitas 4.200 kcal/kg
            </div>
          </div>
        </div>
      )}

      {/* Tier Benchmark Visual Range Scale */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-xs text-slate-900">
              Ambang Batas Tiering Indonesian Coal Index (Kontrak SOW PT BGG)
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200 font-mono">
            R3 Periode: ${r3Val.toFixed(2)} / MT ({currentIndex?.activeTier})
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5 text-xs pt-0.5">
          {/* Tier 1 Box */}
          <div className={`p-3 rounded-lg border transition-all ${
            currentIndex?.activeTier === "Tier 1"
              ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-bold"
              : "bg-slate-50 text-slate-700 border-slate-200"
          }`}>
            <div className="font-bold text-xs">TIER 1 (R3 &lt; $50)</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Tarif Dasar OB 1: Rp 27.000 / Bcm</p>
          </div>

          {/* Tier 2 Box */}
          <div className={`p-3 rounded-lg border transition-all ${
            currentIndex?.activeTier === "Tier 2"
              ? "bg-cyan-50 border-cyan-300 text-cyan-950 font-bold"
              : "bg-slate-50 text-slate-700 border-slate-200"
          }`}>
            <div className="font-bold text-xs">TIER 2 ($50 ≤ R3 ≤ $75)</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Tarif OB 1: Rp 27.250 / Bcm</p>
          </div>

          {/* Tier 3 Box */}
          <div className={`p-3 rounded-lg border transition-all ${
            currentIndex?.activeTier === "Tier 3"
              ? "bg-amber-50 border-amber-300 text-amber-950 font-bold"
              : "bg-slate-50 text-slate-700 border-slate-200"
          }`}>
            <div className="font-bold text-xs">TIER 3 (R3 &gt; $75) — AKTIF</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Tarif OB 1: Rp 29.500 / Bcm</p>
          </div>
        </div>
      </div>

      {/* Weekly Data Table & Actions */}
      {currentIndex && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">
                  Rincian Publikasi Mingguan — {currentIndex.period}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {currentIndex.weeks ? currentIndex.weeks.length : 0} Minggu Rilis
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Data laporan Indonesian Coal Index setiap hari Jumat sebagai dasar penagihan.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggleLock(currentIndex)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition shadow-2xs cursor-pointer ${
                  currentIndex.status === "Locked"
                    ? "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                    : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                {currentIndex.status === "Locked" ? (
                  <>
                    <Unlock size={13} /> Buka Kunci
                  </>
                ) : (
                  <>
                    <Lock size={13} /> Kunci Periode
                  </>
                )}
              </button>
              <button
                onClick={() => handleOpenEditModal(currentIndex)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-2xs cursor-pointer"
              >
                Edit Mingguan
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="p-3 pl-4">Minggu</th>
                  <th className="p-3">Tanggal Rilis</th>
                  <th className="p-3 font-mono text-right">ICI 3 (USD/T)</th>
                  <th className="p-3 font-mono text-right">ICI 4 (USD/T)</th>
                  <th className="p-3 font-mono text-right">Kalkulasi R3 (USD/T)</th>
                  <th className="p-3 pr-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {currentIndex.weeks && currentIndex.weeks.length > 0 ? (
                  currentIndex.weeks.map((week, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="p-3 pl-4 font-bold text-slate-900">
                        Minggu ke-{week.weekNumber || idx + 1}
                      </td>
                      <td className="p-3 text-slate-700">
                        <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded font-mono text-xs border border-slate-200">
                          <Calendar size={12} className="text-slate-400" />
                          {week.releaseDate || "-"}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-800">
                        ${week.ici3Price ? week.ici3Price.toFixed(2) : "0.00"}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-800">
                        ${week.ici4Price ? week.ici4Price.toFixed(2) : "0.00"}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        ${week.r3Price ? week.r3Price.toFixed(3) : "0.000"}
                      </td>
                      <td className="p-3 pr-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 size={11} className="text-emerald-700" />
                          Tervalidasi
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">
                      Belum ada data rincian mingguan untuk periode ini.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-slate-900 text-white font-bold border-t border-slate-800">
                <tr>
                  <td colSpan={2} className="p-3 pl-4 uppercase tracking-wider text-[10px]">
                    Rata-Rata Bulanan (Monthly Average)
                  </td>
                  <td className="p-3 text-right font-mono text-cyan-300">
                    ${currentIndex.avgIci3 ? currentIndex.avgIci3.toFixed(2) : "0.00"}
                  </td>
                  <td className="p-3 text-right font-mono text-cyan-300">
                    ${currentIndex.avgIci4 ? currentIndex.avgIci4.toFixed(2) : "0.00"}
                  </td>
                  <td className="p-3 text-right font-mono text-amber-300">
                    ${currentIndex.avgR3 ? currentIndex.avgR3.toFixed(2) : "0.00"}
                  </td>
                  <td className="p-3 pr-4 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950">
                      {currentIndex.activeTier}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Modal Form Edit / Tambah Periode */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-xl w-full p-5 max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isEditing ? `Edit Coal Index — ${formData.period}` : "Tambah Periode Coal Index"}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <MonthPickerInput
                  label="Nama Periode (Bulan & Tahun)"
                  value={formData.period}
                  onChange={(val) => handlePeriodChange(val)}
                  format="long"
                  className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold outline-none focus:border-cyan-700 focus:bg-white transition"
                  required
                />
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status Validasi
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold outline-none focus:border-cyan-700 focus:bg-white transition"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Verified">Verified</option>
                    <option value="Locked">Locked (Final)</option>
                  </select>
                </div>
              </div>

              {/* Weekly Input Matrix */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-900 text-white px-3 py-2 text-xs font-bold flex items-center justify-between">
                  <span>Input Harga Mingguan Indonesian Coal Index</span>
                  <span className="text-[11px] text-amber-300 font-mono">Auto Live R3</span>
                </div>

                {/* Sub-Header Kolom Acuan & Tier */}
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-100 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-600 tracking-wider items-end">
                  <div className="col-span-3">Minggu</div>
                  <div className="col-span-3">Tgl Rilis (Jumat)</div>
                  <div className="col-span-3">
                    <span className="text-slate-900 font-bold block">ICI 3 (5.000 GAR)</span>
                    <span className="text-[9px] text-slate-500 font-normal lowercase">USD/MT</span>
                  </div>
                  <div className="col-span-3">
                    <span className="text-slate-900 font-bold block">ICI 4 (4.200 GAR)</span>
                    <span className="text-[9px] text-slate-500 font-normal lowercase">USD/MT</span>
                  </div>
                </div>

                <div className="p-3 space-y-2 bg-slate-50/50">
                  {formData.weeks.map((w, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center text-xs">
                      <div className="col-span-3 font-bold text-slate-800">
                        Minggu ke-{w.weekNumber || idx + 1}
                      </div>
                      <div className="col-span-3">
                        <input
                          type="date"
                          value={w.releaseDate}
                          onChange={(e) => handleWeekPriceChange(idx, "releaseDate", e.target.value)}
                          className="w-full p-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-mono shadow-2xs focus:border-cyan-700 outline-none"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={w.ici3Price || ""}
                          onChange={(e) => handleWeekPriceChange(idx, "ici3Price", e.target.value)}
                          className="w-full p-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono font-bold text-slate-900 shadow-2xs focus:border-cyan-700 outline-none"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={w.ici4Price || ""}
                          onChange={(e) => handleWeekPriceChange(idx, "ici4Price", e.target.value)}
                          className="w-full p-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono font-bold text-slate-900 shadow-2xs focus:border-cyan-700 outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Preview Card in Modal */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900">
                    Kalkulasi Rata-Rata: Avg R3 = ${formData.avgR3 ? formData.avgR3.toFixed(2) : "0.00"} USD/MT
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tier yang otomatis aktif: <strong className="font-bold uppercase text-slate-800">{formData.activeTier}</strong>
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded bg-slate-900 text-white font-bold text-xs">
                  {formData.activeTier}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-800 hover:bg-cyan-900 text-white font-bold text-xs shadow-2xs transition active:scale-95 cursor-pointer"
                >
                  Simpan Data Index
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
