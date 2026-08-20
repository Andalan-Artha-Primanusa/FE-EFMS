import React, { useEffect, useState, Fragment } from "react";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit2,
  Eye,
  FileSpreadsheet,
  Flame,
  Layers,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
  ShieldCheck,
  Zap,
  Tag,
  ArrowUpRight
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { api } from "../lib/api";

const formatIDR = (val: number) => {
  if (!val && val !== 0) return "Rp 0";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 2 }).format(val);
};

export const defaultCompanyOptions = [
  { name: "PT Budi Gema Gempita", code: "BGG", contract: "09/BGG-AAP/VIII/2018", type: "coal", badgeColor: "amber", desc: "Kontrak Batubara Multi-Tiering SOW (75% / 25% Split)" },
  { name: "PT Position", code: "POS", contract: "002/POS-AAP/2025", type: "nickel", badgeColor: "cyan", desc: "Kontrak Nikel Presisi USD (3 Desimal + M-Rate BI)" },
  { name: "PT Satria Bahana Sarana", code: "SBS", contract: "230/AAP-SBS/EXT/XII/24", type: "coal", badgeColor: "indigo", desc: "Kontrak Penambangan Batubara & Sewa Alat Berat" },
  { name: "PT Daya Bumindo Karunia", code: "DBK", contract: "001/DBK-AAP/2024", type: "coal", badgeColor: "emerald", desc: "Kontrak Batubara Dual Currency (USD/IDR Overhaul)" },
  { name: "PT Andalan Bhumi Nusantara", code: "ABN", contract: "001/AAP-ABN/IV/25", type: "heavy_equipment", badgeColor: "slate", desc: "Sewa Alat Berat Afiliasi Internal" }
];

export const defaultBGGSOWTemplate = [
  { category: "OB Removal", itemName: "OVER BURDEN REMOVAL 1 (75%)", tier1Rate: 27000, tier2Rate: 27250, tier3Rate: 29500, splitPercentage: 75, baseDistanceMeters: 1000, unit: "Bcm", rateIDR: 29500, rateUSD: 0 },
  { category: "OB Removal", itemName: "OVER BURDEN REMOVAL 2 (25%)", tier1Rate: 26250, tier2Rate: 26500, tier3Rate: 28750, splitPercentage: 25, baseDistanceMeters: 1000, unit: "Bcm", rateIDR: 28750, rateUSD: 0 },
  { category: "Coal Winning", itemName: "Coal Winning Pit Kungkilan", tier1Rate: 17500, tier2Rate: 17500, tier3Rate: 17500, splitPercentage: 100, baseDistanceMeters: 0, unit: "Ton", rateIDR: 17500, rateUSD: 0 },
  { category: "Over Distance", itemName: "Over Distance For OB Removal", tier1Rate: 139.30, tier2Rate: 139.30, tier3Rate: 155.00, splitPercentage: 100, baseDistanceMeters: 1000, unit: "Bcm/Hm", rateIDR: 155.00, rateUSD: 0 },
  { category: "Over Distance", itemName: "Over Distance For Coal Winning", tier1Rate: 19700, tier2Rate: 19700, tier3Rate: 19700, splitPercentage: 100, baseDistanceMeters: 4000, unit: "Ton", rateIDR: 19700, rateUSD: 0 },
  { category: "Rehandling", itemName: "Rehandling Batubara", tier1Rate: 12000, tier2Rate: 12000, tier3Rate: 12000, splitPercentage: 100, baseDistanceMeters: 0, unit: "Ton", rateIDR: 12000, rateUSD: 0 },
];

export const defaultSOWTemplate = [
  // Operation & Mining
  { category: "Operation & Mining", itemName: "Clear & Grub", rateUSD: 0.381, unit: "USD/m2" },
  { category: "Operation & Mining", itemName: "Topsoil Removal - Base Rate (1000m)", rateUSD: 3.380, unit: "USD/BCM" },
  { category: "Operation & Mining", itemName: "Topsoil Removal - over/underhaul", rateUSD: 0.538, unit: "USD/1KM" },
  { category: "Operation & Mining", itemName: "Overburden/Waste - Base Rate (1000m)", rateUSD: 3.327, unit: "USD/BCM" },
  { category: "Operation & Mining", itemName: "OB/Waste - over/underhaul", rateUSD: 0.538, unit: "USD/1KM" },
  { category: "Operation & Mining", itemName: "Limonite - Base Rate (1000m)", rateUSD: 3.363, unit: "USD/BCM" },
  { category: "Operation & Mining", itemName: "Limonite - over/underhaul", rateUSD: 0.526, unit: "USD/1KM" },
  { category: "Operation & Mining", itemName: "Saprolite - Base Rate (1000m)", rateUSD: 3.472, unit: "USD/BCM" },
  { category: "Operation & Mining", itemName: "Saprolite - over/underhaul", rateUSD: 0.526, unit: "USD/1KM" },

  // Rehabilitation
  { category: "Rehabilitation", itemName: "Topsoil Reclaim/Haul/Spread - Base Rate (1000m)", rateUSD: 3.258, unit: "USD/BCM" },
  { category: "Rehabilitation", itemName: "Topsoil Reclaim/Haul/Spread - overhaul", rateUSD: 0.538, unit: "USD/1KM" },

  // Mine Development (MDO)
  { category: "Mine Development (MDO)", itemName: "Cut - Base Rate (1000m)", rateUSD: 2.129, unit: "USD/BCM" },
  { category: "Mine Development (MDO)", itemName: "Cut or Fill under/overhaul", rateUSD: 0.521, unit: "USD/1KM" },
  { category: "Mine Development (MDO)", itemName: "Uncrushed rocks for construction - Base Rate (1000m)", rateUSD: 7.938, unit: "USD/BCM" },
  { category: "Mine Development (MDO)", itemName: "Crusher rocks - Base Rate (1000m)", rateUSD: 13.050, unit: "USD/BCM" },
  { category: "Mine Development (MDO)", itemName: "Rocks for construction - under/overhaul", rateUSD: 0.526, unit: "USD/1KM" },
  { category: "Mine Development (MDO)", itemName: "Geotextile", rateUSD: 2.003, unit: "USD/m2" }
];

export function VariableSOWPage({
  viewTitle,
  query,
  onNotice
}: {
  viewTitle: string;
  query: string;
  onNotice: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [sowRows, setSowRows] = useState<any[]>([]);
  const [mrateBi, setMrateBi] = useState<number>(17923.30);
  const [contractsList, setContractsList] = useState<any[]>([]);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>("ALL");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [headerForm, setHeaderForm] = useState<any>({
    companyName: "PT Budi Gema Gempita",
    companyCode: "BGG",
    contractNo: "09/BGG-AAP/VIII/2018",
    type: "coal"
  });

  const [itemsGrid, setItemsGrid] = useState<any[]>(defaultBGGSOWTemplate);

  async function loadData() {
    setLoading(true);
    try {
      const [resSow, resMrate] = await Promise.all([
        api<any[]>("/api/master-data/variable-sow").catch(() => []),
        api<any[]>("/api/master-data/daily-exchange-rates").catch(() => [])
      ]);

      const activeSows = Array.isArray(resSow) ? resSow : [];
      setSowRows(activeSows);

      // Latest BI M-Rate
      if (Array.isArray(resMrate) && resMrate.length > 0) {
        const latest = resMrate[0];
        const val = latest.kursTengah || ((latest.kursJual + latest.kursBeli) / 2);
        if (val > 0) setMrateBi(val);
      }

      // Group SOWs by Company & Contract for Main Table
      const groupedMap: Record<string, any> = {};

      // Seed default contracts
      defaultCompanyOptions.forEach((opt) => {
        const template = opt.code === "BGG" ? defaultBGGSOWTemplate : defaultSOWTemplate;
        groupedMap[opt.code] = {
          companyName: opt.name,
          companyCode: opt.code,
          contractNo: opt.contract,
          type: opt.type,
          badgeColor: opt.badgeColor,
          desc: opt.desc,
          itemCount: template.length,
          items: template
        };
      });

      // Overlay items from database (filtering out non-master / period-tagged legacy items)
      activeSows.forEach((item) => {
        // Ignore legacy period-tagged items like (Feb-26), (Jun-26)
        if (item.itemName && (/\(Feb-|\(Jun-|\(Jan-|\(Mar-|\(Apr-|\(May-|\(Jul-|\(Aug-|\(Sep-|\(Oct-|\(Nov-|\(Dec-/i.test(item.itemName))) {
          return;
        }

        const cCode = item.customerCode || item.customer || "BGG";
        if (groupedMap[cCode]) {
          const existingItems = [...groupedMap[cCode].items];
          const idx = existingItems.findIndex(i => i.itemName.trim().toLowerCase() === item.itemName.trim().toLowerCase());
          if (idx !== -1) {
            existingItems[idx] = { ...existingItems[idx], ...item };
          } else {
            existingItems.push(item);
          }
          groupedMap[cCode].items = existingItems;
          groupedMap[cCode].itemCount = existingItems.length;
        }
      });

      setContractsList(Object.values(groupedMap));
    } catch (err: any) {
      onNotice(err?.message || "Gagal memuat data Variable SOW");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const openCreateGridModal = () => {
    setIsEditing(false);
    setHeaderForm({
      companyName: "PT Budi Gema Gempita",
      companyCode: "BGG",
      contractNo: "09/BGG-AAP/VIII/2018",
      type: "coal"
    });
    setItemsGrid(defaultBGGSOWTemplate.map(i => ({ ...i })));
    setModalOpen(true);
  };

  const openEditGridModal = (contractGroup: any) => {
    setIsEditing(true);
    setHeaderForm({
      companyName: contractGroup.companyName,
      companyCode: contractGroup.companyCode,
      contractNo: contractGroup.contractNo,
      type: contractGroup.type || (contractGroup.companyCode === "POS" ? "nickel" : "coal")
    });
    setItemsGrid(contractGroup.items.map((i: any) => ({ ...i })));
    setModalOpen(true);
  };

  const handleRateChange = (idx: number, field: string, val: string) => {
    const num = parseFloat(val);
    const updated = [...itemsGrid];
    updated[idx] = { ...updated[idx], [field]: isNaN(num) ? 0 : num };
    setItemsGrid(updated);
  };

  const handleSaveGrid = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      for (const item of itemsGrid) {
        const payload = {
          category: item.category,
          itemName: item.itemName,
          rateUSD: item.rateUSD || 0,
          rateIDR: item.rateIDR || item.tier3Rate || 0,
          tier1Rate: item.tier1Rate || 0,
          tier2Rate: item.tier2Rate || 0,
          tier3Rate: item.tier3Rate || 0,
          splitPercentage: item.splitPercentage || 0,
          baseDistanceMeters: item.baseDistanceMeters || 0,
          unit: item.unit,
          customer: headerForm.companyCode,
          customerCode: headerForm.companyCode,
          contractNo: headerForm.contractNo,
          description: `Contract ${headerForm.contractNo}`,
          status: "Active"
        };
        if (item.id) {
          await api(`/api/master-data/variable-sow/${item.id}`, { method: "PUT", body: JSON.stringify(payload) }).catch(() => {});
        } else {
          await api("/api/master-data/variable-sow", { method: "POST", body: JSON.stringify(payload) }).catch(() => {});
        }
      }
      onNotice(`✅ Grid Tarif Variable SOW untuk ${headerForm.companyName} (${headerForm.contractNo}) berhasil disimpan!`);
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal menyimpan Grid Variable SOW");
    }
  };

  const filteredContracts = contractsList.filter((c) => {
    if (selectedCompanyFilter !== "ALL" && c.companyCode !== selectedCompanyFilter) return false;
    const matchQ = JSON.stringify(c).toLowerCase().includes(query.toLowerCase());
    return matchQ;
  });

  const isCoalClient = headerForm.companyCode === "BGG" || headerForm.companyCode === "SBS" || headerForm.companyCode === "DBK" || headerForm.type === "coal";

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 p-6 sm:p-7 rounded-3xl border border-slate-700/60 shadow-xl text-white">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-cyan-500/10 via-amber-500/5 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center gap-1.5 shadow-sm">
                <Layers size={14} className="text-cyan-400" />
                Scope of Work Pricing Engine
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-white/10 text-amber-300 border border-white/10 flex items-center gap-1">
                <Sparkles size={13} />
                Multi-Tiering & USD Precision
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Master Data Variable SOW
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              Katalog tarif dasar per satuan operasional pertambangan: <strong>Multi-Tiering Coal Index</strong> (PT BGG) dan <strong>Presisi USD (3 Desimal)</strong> terhubung kurs M-Rate BI (PT POS).
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
              onClick={openCreateGridModal}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/25 transition active:scale-95 cursor-pointer"
            >
              <Plus size={18} className="stroke-[3]" />
              <span>+ Input Tarif SOW Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl border border-slate-200 bg-white shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">KURS BI ACUAN (M-RATE)</span>
            <span className="p-1 bg-emerald-50 rounded-lg text-emerald-700 font-bold text-[10px] px-2">Live Sync</span>
          </div>
          <div className="text-2xl font-black text-cyan-900 font-mono tracking-tight pt-1">
            {formatIDR(mrateBi)}
            <span className="text-xs font-sans font-bold text-slate-400 ml-1.5">/ USD</span>
          </div>
          <p className="text-[11px] text-slate-400">Digunakan untuk konversi otomatis SOW nikel (PT POS)</p>
        </div>

        <div className="p-5 rounded-3xl border border-slate-200 bg-white shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">KONTRAK AKTIF</span>
            <span className="p-1 bg-slate-100 rounded-lg text-slate-700 font-bold text-[10px] px-2">{contractsList.length} Entitas</span>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono tracking-tight pt-1">
            {contractsList.length} Kontrak Perusahaan
          </div>
          <p className="text-[11px] text-slate-400">BGG, POS, SBS, DBK, ABN</p>
        </div>

        <div className="p-5 rounded-3xl border border-slate-200 bg-white shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">KOMODITAS & MODEL</span>
            <span className="p-1 bg-amber-50 rounded-lg text-amber-800 font-bold text-[10px] px-2">Dual Mode</span>
          </div>
          <div className="text-sm font-black text-amber-700 tracking-tight pt-2 flex items-center gap-1.5">
            <Sparkles size={16} /> Batubara (Tiering) & Nikel (USD Presisi)
          </div>
          <p className="text-[11px] text-slate-400">Presisi 3 Desimal & Overhaul Distance</p>
        </div>
      </div>

      {/* Filter Tabs by Company */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedCompanyFilter("ALL")}
          className={`px-4 py-2 rounded-2xl text-xs font-bold border transition cursor-pointer ${
            selectedCompanyFilter === "ALL"
              ? "bg-slate-900 text-white border-slate-900 shadow-sm"
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          }`}
        >
          Semua Kontrak ({contractsList.length})
        </button>
        {defaultCompanyOptions.map((c) => (
          <button
            key={c.code}
            onClick={() => setSelectedCompanyFilter(c.code)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer ${
              selectedCompanyFilter === c.code
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span>{c.name}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-slate-100 text-slate-800">
              {c.code}
            </span>
          </button>
        ))}
      </div>

      {/* Main Table Panel */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-black text-slate-900 text-base sm:text-lg">
              Daftar Master Variable SOW Berdasarkan Kontrak
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Setiap kontrak memiliki katalog tarif unik yang secara otomatis dipakai saat pembuatan invoice & Berita Acara.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 text-slate-600 font-extrabold uppercase text-[11px] tracking-wider border-b border-slate-200">
                <th className="p-4 pl-6">NO</th>
                <th className="p-4">NAMA PERUSAHAAN</th>
                <th className="p-4 text-center">KODE</th>
                <th className="p-4 font-mono">NOMOR KONTRAK</th>
                <th className="p-4 text-center">KOMODITAS & MODEL</th>
                <th className="p-4 text-center">JUMLAH SOW</th>
                <th className="p-4 pr-6 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredContracts.map((c, idx) => (
                <tr key={c.companyCode || idx} className="hover:bg-slate-50/80 transition">
                  <td className="p-4 pl-6 text-center font-bold text-slate-400">{idx + 1}</td>
                  <td className="p-4">
                    <div className="font-black text-slate-900 text-sm">{c.companyName}</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{c.desc}</p>
                  </td>
                  <td className="p-4 text-center">
                    <span className="px-3 py-1 rounded-xl font-mono text-xs font-black bg-cyan-50 text-cyan-900 border border-cyan-200">
                      {c.companyCode}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-bold text-slate-800 text-xs">{c.contractNo}</td>
                  <td className="p-4 text-center">
                    {c.companyCode === "BGG" || c.type === "coal" ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                        <Flame size={12} className="text-amber-600" />
                        Batubara (Multi-Tier)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-cyan-100 text-cyan-900 border border-cyan-300">
                        <DollarSign size={12} className="text-cyan-700" />
                        Nikel (USD Presisi)
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center font-bold text-slate-700">
                    <span className="bg-slate-100 px-2.5 py-1 rounded-lg">
                      {c.itemCount} Item SOW
                    </span>
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <button
                      className="px-4 py-2 rounded-2xl bg-cyan-800 hover:bg-cyan-900 text-white font-black text-xs flex items-center gap-1.5 ml-auto transition shadow-xs cursor-pointer active:scale-95"
                      onClick={() => openEditGridModal(c)}
                    >
                      <Eye size={14} /> Lihat & Edit Tarif
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL GRID SOW (MULTI-TIER BATUBARA ATAU USD NIKEL) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-6xl shadow-2xl space-y-5 max-h-[94vh] overflow-y-auto transition-all">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-cyan-900 bg-cyan-50 px-3 py-1 rounded-full border border-cyan-200">
                  <FileSpreadsheet size={14} /> Form Master Tariff Grid SOW
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1.5">
                  {isEditing ? `Tariff Grid SOW — ${headerForm.companyName}` : "Input Tariff Grid SOW Baru"}
                </h3>
              </div>
              <button
                className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition cursor-pointer"
                onClick={() => setModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            {/* HEADER SELECTION FORM */}
            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                  Nama Perusahaan <span className="text-rose-600">*</span>
                </label>
                <select
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-extrabold focus:border-cyan-700 outline-none"
                  value={headerForm.companyCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    const opt = defaultCompanyOptions.find(o => o.code === code);
                    const newType = opt?.type || (code === "POS" ? "nickel" : "coal");
                    setHeaderForm({
                      companyName: opt?.name || code,
                      companyCode: code,
                      contractNo: opt?.contract || "001/AAP-NEW/2026",
                      type: newType
                    });
                    setItemsGrid(code === "BGG" ? defaultBGGSOWTemplate.map(i => ({ ...i })) : defaultSOWTemplate.map(i => ({ ...i })));
                  }}
                >
                  {defaultCompanyOptions.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.name} ({opt.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                  Kode Perusahaan
                </label>
                <input
                  type="text"
                  className="w-full bg-slate-100 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-black font-mono"
                  value={headerForm.companyCode}
                  readOnly
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                  Nomor Kontrak <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-bold focus:border-cyan-700 outline-none font-mono"
                  value={headerForm.contractNo}
                  onChange={(e) => setHeaderForm({ ...headerForm, contractNo: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                  Model Tarif SOW
                </label>
                <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-2.5 text-xs text-cyan-950 font-black">
                  {isCoalClient ? "⚡ Matrix Multi-Tier Coal Index" : `${formatIDR(mrateBi)} / USD (M-Rate BI)`}
                </div>
              </div>
            </div>

            {/* FORM TABLE */}
            <form onSubmit={handleSaveGrid} className="space-y-4">
              {isCoalClient ? (
                /* MULTI-TIER COAL MATRIX TABLE (PT BGG, SBS, DBK) */
                <div className="overflow-x-auto rounded-2xl border-2 border-slate-200 shadow-sm">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white font-black uppercase text-[11px]">
                        <th className="p-3.5 pl-4 border-r border-slate-800">ITEM PEKERJAAN (SOW)</th>
                        <th className="p-3.5 border-r border-slate-800 text-center">SATUAN</th>
                        <th className="p-3.5 border-r border-slate-800 text-right bg-emerald-950 text-emerald-300">TIER 1 (&lt; $50)</th>
                        <th className="p-3.5 border-r border-slate-800 text-right bg-blue-950 text-blue-300">TIER 2 ($50 - $75)</th>
                        <th className="p-3.5 border-r border-slate-800 text-right bg-amber-950 text-amber-300">TIER 3 (&gt; $75)</th>
                        <th className="p-3.5 border-r border-slate-800 text-center">SPLIT %</th>
                        <th className="p-3.5 pr-4 text-center">BASE DIST</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {itemsGrid.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 pl-4 font-black text-slate-900 border-r border-slate-200">
                            {item.itemName}
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-slate-600 border-r border-slate-200">
                            {item.unit}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-right">
                            <input
                              type="number"
                              className="w-full text-right p-2 rounded-xl bg-emerald-50/70 border border-emerald-300 font-mono font-bold text-xs"
                              value={item.tier1Rate || ""}
                              onChange={(e) => handleRateChange(idx, "tier1Rate", e.target.value)}
                            />
                          </td>
                          <td className="p-2 border-r border-slate-200 text-right">
                            <input
                              type="number"
                              className="w-full text-right p-2 rounded-xl bg-blue-50/70 border border-blue-300 font-mono font-bold text-xs"
                              value={item.tier2Rate || ""}
                              onChange={(e) => handleRateChange(idx, "tier2Rate", e.target.value)}
                            />
                          </td>
                          <td className="p-2 border-r border-slate-200 text-right">
                            <input
                              type="number"
                              className="w-full text-right p-2 rounded-xl bg-amber-50 border border-amber-400 font-mono font-black text-amber-950 text-xs"
                              value={item.tier3Rate || ""}
                              onChange={(e) => handleRateChange(idx, "tier3Rate", e.target.value)}
                            />
                          </td>
                          <td className="p-2 border-r border-slate-200 text-center">
                            <input
                              type="number"
                              className="w-16 text-center p-2 rounded-xl bg-slate-50 border border-slate-300 font-mono font-bold text-xs"
                              value={item.splitPercentage || 100}
                              onChange={(e) => handleRateChange(idx, "splitPercentage", e.target.value)}
                            /> %
                          </td>
                          <td className="p-2 pr-4 text-center">
                            <input
                              type="number"
                              className="w-20 text-center p-2 rounded-xl bg-slate-50 border border-slate-300 font-mono font-bold text-xs"
                              value={item.baseDistanceMeters || 0}
                              onChange={(e) => handleRateChange(idx, "baseDistanceMeters", e.target.value)}
                            /> m
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* USD RATE TABLE (PT POS / NIKEL) */
                <div className="overflow-x-auto rounded-2xl border-2 border-slate-200 shadow-sm">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white font-black uppercase text-[11px]">
                        <th className="p-3.5 pl-4 border border-amber-900 bg-amber-800 w-1/2">ITEM SOW (USD RATE)</th>
                        <th className="p-3.5 border border-amber-900 bg-amber-600 text-slate-950 text-center w-1/6">Rate (USD)</th>
                        <th className="p-3.5 border border-amber-900 bg-amber-700 text-center w-1/6">Unit</th>
                        <th className="p-3.5 pr-4 border border-emerald-950 bg-emerald-800 text-right w-1/6">Konversi IDR (M-Rate)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsGrid.map((item, idx) => {
                        const idrConverted = (item.rateUSD || 0) * mrateBi;
                        return (
                          <tr key={idx} className="hover:bg-amber-50/40 border-b border-slate-200 transition">
                            <td className="p-3 pl-4 font-bold text-slate-900 bg-white">
                              {item.itemName}
                            </td>
                            <td className="p-0 bg-yellow-200">
                              <input
                                type="number"
                                step="0.001"
                                className="w-full text-right font-mono font-black text-slate-950 bg-yellow-200 px-3 py-2 outline-none text-xs border-none"
                                value={item.rateUSD}
                                onChange={(e) => handleRateChange(idx, "rateUSD", e.target.value)}
                                required
                              />
                            </td>
                            <td className="p-3 text-center font-mono font-extrabold text-slate-700 bg-slate-50">
                              {item.unit}
                            </td>
                            <td className="p-3 pr-4 text-right font-mono font-black text-emerald-800 bg-emerald-50/40">
                              {formatIDR(idrConverted)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-500 font-medium">
                  {isCoalClient ? "* Tarif bertingkat akan otomatis terhubung ke sistem kalkulasi invoice saat Coal Index diinput." : `* Tarif otomatis dikonversi dengan kurs M-Rate BI (${formatIDR(mrateBi)}).`}
                </span>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    className="px-5 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                    onClick={() => setModalOpen(false)}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-2xl bg-cyan-800 hover:bg-cyan-900 text-white font-black text-xs shadow-md transition active:scale-95 cursor-pointer"
                  >
                    Simpan Tariff Grid SOW
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
