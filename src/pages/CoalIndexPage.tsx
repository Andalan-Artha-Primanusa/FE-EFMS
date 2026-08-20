import React, { useEffect, useState, useMemo } from "react";
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
  id: number;
  period: string;
  avgIci3: number;
  avgIci4: number;
  avgR3: number;
  activeTier: "Tier 1" | "Tier 2" | "Tier 3" | string;
  status: "Draft" | "Verified" | "Locked" | string;
  notes?: string;
  weeks: CoalIndexWeekly[];
  updatedAt?: string;
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

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setFormData({
      id: 0,
      period: "Juli 2026",
      avgIci3: 91.5,
      avgIci4: 60.5,
      avgR3: 76.0,
      activeTier: "Tier 3",
      status: "Draft",
      notes: "Publikasi mingguan Argus / Coalindo",
      weeks: [
        { weekNumber: 1, releaseDate: "2026-07-03", ici3Price: 91.8, ici4Price: 60.8, r3Price: 76.3 },
        { weekNumber: 2, releaseDate: "2026-07-10", ici3Price: 91.2, ici4Price: 60.4, r3Price: 75.8 },
        { weekNumber: 3, releaseDate: "2026-07-17", ici3Price: 92.0, ici4Price: 61.0, r3Price: 76.5 },
        { weekNumber: 4, releaseDate: "2026-07-24", ici3Price: 91.0, ici4Price: 59.8, r3Price: 75.4 },
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
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 p-6 sm:p-7 rounded-3xl border border-slate-700/60 shadow-xl text-white">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-cyan-500/10 via-amber-500/5 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1.5 shadow-sm">
                <Flame size={14} className="text-amber-400 animate-pulse" />
                Indonesian Coal Index (ICI) Engine
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-white/10 text-cyan-200 border border-white/10 flex items-center gap-1">
                <ShieldCheck size={13} />
                Argus / Coalindo Standard
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Master Benchmark Coal Index
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              Acuan resmi penentuan formula tarif bertingkat (<strong>Tier 1 / 2 / 3</strong>) pada penambangan batubara PT BGG dan perhitungan penyesuaian invoice penambangan.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => loadData()}
              className="p-3 rounded-2xl border border-white/15 bg-white/10 hover:bg-white/20 text-white font-bold transition shadow-sm active:scale-95 cursor-pointer backdrop-blur-md"
              title="Perbarui Data"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/25 transition active:scale-95 cursor-pointer"
            >
              <Plus size={18} className="stroke-[3]" />
              <span>+ Input Periode Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* Period Selection Pill Navigation */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
        {indexList.map((idx) => {
          const isSelected = idx.period === selectedPeriod;
          const isTier3 = idx.activeTier === "Tier 3";
          return (
            <button
              key={idx.id || idx.period}
              onClick={() => setSelectedPeriod(idx.period)}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2.5 transition-all whitespace-nowrap border cursor-pointer ${
                isSelected
                  ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-amber-400/40"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-2xs"
              }`}
            >
              <Calendar size={15} className={isSelected ? "text-amber-400" : "text-slate-400"} />
              <span>{idx.period}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black tracking-wide ${
                isTier3
                  ? isSelected ? "bg-amber-400 text-slate-950 shadow-xs" : "bg-amber-100 text-amber-900 border border-amber-300"
                  : isSelected ? "bg-cyan-400 text-slate-950" : "bg-slate-100 text-slate-700"
              }`}>
                {idx.activeTier}
              </span>
            </button>
          );
        })}
      </div>

      {/* KPI Cards Grid */}
      {currentIndex && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Active Tier Highlight Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/15 via-white to-amber-50/40 p-5 sm:p-6 rounded-3xl border-2 border-amber-300/90 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-600" />
                Active Pricing Tier
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                currentIndex.status === "Locked"
                  ? "bg-slate-900 text-white border-slate-800"
                  : "bg-emerald-100 text-emerald-900 border-emerald-300"
              }`}>
                {currentIndex.status || "Verified"}
              </span>
            </div>

            <div className="my-3">
              <div className="text-3xl sm:text-4xl font-black text-amber-950 tracking-tight flex items-baseline gap-2">
                <span>{currentIndex.activeTier || "Tier 3"}</span>
              </div>
              <p className="text-xs font-semibold text-amber-800 mt-1">
                {currentIndex.activeTier === "Tier 3"
                  ? "🔥 R3 > $75 / MT — Tarif Tertinggi Berlaku"
                  : currentIndex.activeTier === "Tier 2"
                  ? "⚡ $50 ≤ R3 ≤ $75 / MT — Tarif Menengah"
                  : "🌱 R3 < $50 / MT — Tarif Dasar"}
              </p>
            </div>

            <div className="pt-2 border-t border-amber-200/80 text-[11px] font-bold text-slate-600 flex items-center justify-between">
              <span>OB 1: Rp 29.500/Bcm</span>
              <span>OB 2: Rp 28.750/Bcm</span>
            </div>
          </div>

          {/* Average R3 Monthly Card */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Monthly Average R3
              </span>
              <span className="p-1.5 bg-amber-50 rounded-xl text-amber-700">
                <BarChart3 size={16} />
              </span>
            </div>
            <div className="my-2">
              <div className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">
                ${currentIndex.avgR3 ? currentIndex.avgR3.toFixed(2) : "0.00"}
                <span className="text-xs font-sans font-bold text-slate-400 ml-1.5">USD/MT</span>
              </div>
              <p className="text-[11px] font-mono text-slate-500 mt-1">
                Formula: R3 = (ICI 3 + ICI 4) / 2
              </p>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-amber-500 rounded-full"
                style={{ width: `${tierPercentage}%` }}
              />
            </div>
          </div>

          {/* ICI 3 Average Card */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-700 uppercase tracking-wider">
                ICI 3 Average (5.000 GAR)
              </span>
              <span className="p-1.5 bg-cyan-50 rounded-xl text-cyan-700">
                <TrendingUp size={16} />
              </span>
            </div>
            <div className="my-2">
              <div className="text-3xl sm:text-4xl font-black text-cyan-900 font-mono tracking-tight">
                ${currentIndex.avgIci3 ? currentIndex.avgIci3.toFixed(2) : "0.00"}
                <span className="text-xs font-sans font-bold text-slate-400 ml-1.5">USD/MT</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Kualitas Batubara 5.000 kcal/kg GAR
              </p>
            </div>
            <div className="text-[11px] font-bold text-cyan-800 bg-cyan-50/80 px-2.5 py-1 rounded-xl">
              Rata-rata 4 Minggu Rilis
            </div>
          </div>

          {/* ICI 4 Average Card */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                ICI 4 Average (4.200 GAR)
              </span>
              <span className="p-1.5 bg-blue-50 rounded-xl text-blue-700">
                <TrendingUp size={16} />
              </span>
            </div>
            <div className="my-2">
              <div className="text-3xl sm:text-4xl font-black text-blue-900 font-mono tracking-tight">
                ${currentIndex.avgIci4 ? currentIndex.avgIci4.toFixed(2) : "0.00"}
                <span className="text-xs font-sans font-bold text-slate-400 ml-1.5">USD/MT</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Kualitas Batubara 4.200 kcal/kg GAR
              </p>
            </div>
            <div className="text-[11px] font-bold text-blue-800 bg-blue-50/80 px-2.5 py-1 rounded-xl">
              Rata-rata 4 Minggu Rilis
            </div>
          </div>
        </div>
      )}

      {/* Tier Benchmark Visual Range Scale */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-sm text-slate-900">
              Skala Ambang Batas Tiering Indonesian Coal Index
            </h3>
            <span className="text-xs text-slate-400 font-medium">(Sesuai Klausul Kontrak SOW PT BGG)</span>
          </div>
          <span className="text-xs font-black text-amber-800 bg-amber-100 px-3 py-1 rounded-xl">
            Posisi Saat Ini: R3 = ${r3Val.toFixed(2)} / MT ({currentIndex?.activeTier})
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs pt-1">
          {/* Tier 1 Box */}
          <div className={`p-3.5 rounded-2xl border transition-all ${
            currentIndex?.activeTier === "Tier 1"
              ? "bg-emerald-500 text-white border-emerald-600 shadow-md ring-2 ring-emerald-400"
              : "bg-slate-50 text-slate-700 border-slate-200"
          }`}>
            <div className="font-black text-sm">TIER 1 (R3 &lt; $50)</div>
            <p className="text-[11px] opacity-90 mt-0.5">Tarif Dasar OB 1: Rp 27.000 / Bcm</p>
          </div>

          {/* Tier 2 Box */}
          <div className={`p-3.5 rounded-2xl border transition-all ${
            currentIndex?.activeTier === "Tier 2"
              ? "bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-400"
              : "bg-slate-50 text-slate-700 border-slate-200"
          }`}>
            <div className="font-black text-sm">TIER 2 ($50 ≤ R3 ≤ $75)</div>
            <p className="text-[11px] opacity-90 mt-0.5">Tarif OB 1: Rp 27.250 / Bcm (Feb-26 Carryover)</p>
          </div>

          {/* Tier 3 Box */}
          <div className={`p-3.5 rounded-2xl border transition-all ${
            currentIndex?.activeTier === "Tier 3"
              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border-amber-600 shadow-lg ring-2 ring-amber-400"
              : "bg-slate-50 text-slate-700 border-slate-200"
          }`}>
            <div className="font-black text-sm">TIER 3 (R3 &gt; $75) 🔥 AKTIF</div>
            <p className="text-[11px] opacity-90 mt-0.5">Tarif OB 1: Rp 29.500 / Bcm (Juni 2026)</p>
          </div>
        </div>
      </div>

      {/* Weekly Data Table & Actions */}
      {currentIndex && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-base sm:text-lg">
                  Rincian Publikasi Mingguan — {currentIndex.period}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700">
                  {currentIndex.weeks ? currentIndex.weeks.length : 0} Minggu Rilis
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Data resmi dari laporan Indonesian Coal Index setiap hari Jumat yang digunakan sebagai dasar penagihan.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => handleToggleLock(currentIndex)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 border transition shadow-2xs cursor-pointer ${
                  currentIndex.status === "Locked"
                    ? "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                    : "bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100"
                }`}
              >
                {currentIndex.status === "Locked" ? (
                  <>
                    <Unlock size={15} /> Buka Kunci Periode
                  </>
                ) : (
                  <>
                    <Lock size={15} /> Kunci Data Periode
                  </>
                )}
              </button>
              <button
                onClick={() => handleOpenEditModal(currentIndex)}
                className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition shadow-sm cursor-pointer"
              >
                Edit Rilis Mingguan
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/80 text-slate-600 font-extrabold uppercase text-[11px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-4 pl-6">Minggu</th>
                  <th className="p-4">Tanggal Rilis (Jumat)</th>
                  <th className="p-4 font-mono text-right text-cyan-800">ICI 3 (USD/T)</th>
                  <th className="p-4 font-mono text-right text-blue-800">ICI 4 (USD/T)</th>
                  <th className="p-4 font-mono text-right text-amber-900 bg-amber-50/50">Kalkulasi R3 (USD/T)</th>
                  <th className="p-4 pr-6 text-center">Status Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {currentIndex.weeks && currentIndex.weeks.length > 0 ? (
                  currentIndex.weeks.map((week, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="p-4 pl-6 font-black text-slate-900">
                        Minggu ke-{week.weekNumber || idx + 1}
                      </td>
                      <td className="p-4 text-slate-700 font-semibold">
                        <span className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg font-mono text-xs">
                          <Calendar size={13} className="text-slate-400" />
                          {week.releaseDate || "-"}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-cyan-700 text-sm">
                        ${week.ici3Price ? week.ici3Price.toFixed(2) : "0.00"}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-blue-700 text-sm">
                        ${week.ici4Price ? week.ici4Price.toFixed(2) : "0.00"}
                      </td>
                      <td className="p-4 text-right font-mono font-black text-amber-950 text-sm bg-amber-50/40">
                        ${week.r3Price ? week.r3Price.toFixed(3) : "0.000"}
                      </td>
                      <td className="p-4 pr-6 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                          <CheckCircle2 size={12} className="text-emerald-700" />
                          Tervalidasi
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                      Belum ada data rincian mingguan untuk periode ini.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-slate-900 text-white font-black border-t-2 border-slate-800">
                <tr>
                  <td colSpan={2} className="p-4 pl-6 uppercase tracking-wider text-xs font-black">
                    Rata-Rata Bulanan (Monthly Average)
                  </td>
                  <td className="p-4 text-right font-mono text-cyan-300 text-sm">
                    ${currentIndex.avgIci3 ? currentIndex.avgIci3.toFixed(2) : "0.00"}
                  </td>
                  <td className="p-4 text-right font-mono text-blue-300 text-sm">
                    ${currentIndex.avgIci4 ? currentIndex.avgIci4.toFixed(2) : "0.00"}
                  </td>
                  <td className="p-4 text-right font-mono text-base text-amber-300 bg-slate-800">
                    ${currentIndex.avgR3 ? currentIndex.avgR3.toFixed(2) : "0.00"}
                  </td>
                  <td className="p-4 pr-6 text-center">
                    <span className="px-3 py-1 rounded-xl text-xs font-black bg-amber-400 text-slate-950 shadow-sm">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div>
                <span className="text-[11px] font-black uppercase text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                  Form Input Coal Index
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  {isEditing ? `Edit Coal Index — ${formData.period}` : "Tambah Periode Coal Index"}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Periode (Bulan & Tahun)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                    placeholder="e.g. Juli 2026"
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status Validasi
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold outline-none focus:border-amber-500 focus:bg-white transition"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Verified">Verified</option>
                    <option value="Locked">Locked (Final)</option>
                  </select>
                </div>
              </div>

              {/* Weekly Input Matrix */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-slate-900 text-white px-4 py-2.5 text-xs font-black flex items-center justify-between">
                  <span>INPUT HARGA MINGGUAN (ICI 3 & ICI 4)</span>
                  <span className="text-[11px] text-amber-300 font-mono">Auto-Calculate R3</span>
                </div>
                <div className="p-4 space-y-3 bg-slate-50/50">
                  {formData.weeks.map((w, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2.5 items-center text-xs">
                      <div className="col-span-3 font-black text-slate-800">
                        Minggu ke-{w.weekNumber || idx + 1}
                      </div>
                      <div className="col-span-3">
                        <input
                          type="date"
                          value={w.releaseDate}
                          onChange={(e) => handleWeekPriceChange(idx, "releaseDate", e.target.value)}
                          className="w-full p-2 rounded-xl bg-white border border-slate-200 text-[11px] font-mono font-bold"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="ICI 3 ($)"
                          value={w.ici3Price || ""}
                          onChange={(e) => handleWeekPriceChange(idx, "ici3Price", e.target.value)}
                          className="w-full p-2 rounded-xl bg-white border border-slate-200 text-xs font-mono font-bold text-cyan-800"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="ICI 4 ($)"
                          value={w.ici4Price || ""}
                          onChange={(e) => handleWeekPriceChange(idx, "ici4Price", e.target.value)}
                          className="w-full p-2 rounded-xl bg-white border border-slate-200 text-xs font-mono font-bold text-blue-800"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Preview Card in Modal */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-amber-100/60 border border-amber-300 flex items-center justify-between text-xs">
                <div>
                  <p className="font-extrabold text-amber-950">
                    Kalkulasi Rata-Rata: Avg R3 = ${formData.avgR3 ? formData.avgR3.toFixed(2) : "0.00"} USD/MT
                  </p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Tier yang otomatis aktif: <strong className="font-black uppercase">{formData.activeTier}</strong>
                  </p>
                </div>
                <span className="px-4 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs shadow-sm">
                  {formData.activeTier}
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md transition active:scale-95 cursor-pointer"
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
