import React, { useEffect, useState, Fragment } from "react";
<<<<<<< HEAD
import { Building2, Calculator, Calendar, CheckCircle2, Clock, DollarSign, Edit2, Eye, FileSpreadsheet, Layers, Plus, RefreshCw, Trash2, TrendingUp, X } from "lucide-react";
=======
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
>>>>>>> mockup-fe
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { api } from "../lib/api";

const formatIDR = (val: number) => {
  if (!val && val !== 0) return "Rp 0";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 2 }).format(val);
};

<<<<<<< HEAD
const defaultCompanyOptions = [
  { name: "PT Position", code: "POS", contract: "002/POS-AAP/2025" },
  { name: "PT Satria Bahana Sarana", code: "SBS", contract: "230/AAP-SBS/EXT/XII/24" },
  { name: "PT Budi Gema Gempita", code: "BGG", contract: "09/BGG-AAP/VIII/2018" },
  { name: "PT Daya Bumindo Karunia", code: "DBK", contract: "001/DBK-AAP/2024" },
  { name: "PT Andalan Bhumi Nusantara", code: "ABN", contract: "001/AAP-ABN/IV/25" }
=======
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
>>>>>>> mockup-fe
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
<<<<<<< HEAD
  { category: "Mine Development (MDO)", itemName: "Topsoil Removal - Base Rate (1000m)", rateUSD: 3.380, unit: "USD/BCM" },
  { category: "Mine Development (MDO)", itemName: "Topsoil Removal - over/underhaul", rateUSD: 0.538, unit: "USD/1KM" },
  { category: "Mine Development (MDO)", itemName: "Overburden/Waste - Base Rate (1000m)", rateUSD: 3.327, unit: "USD/BCM" },
  { category: "Mine Development (MDO)", itemName: "OB/Waste - over/underhaul", rateUSD: 0.538, unit: "USD/1KM" },
  { category: "Mine Development (MDO)", itemName: "Limonite - Base Rate (1000m)", rateUSD: 3.363, unit: "USD/BCM" },
  { category: "Mine Development (MDO)", itemName: "Limonite - over/underhaul", rateUSD: 0.526, unit: "USD/1KM" },
  { category: "Mine Development (MDO)", itemName: "Saprolite - Base Rate (1000m)", rateUSD: 3.472, unit: "USD/BCM" },
  { category: "Mine Development (MDO)", itemName: "Saprolite - over/underhaul", rateUSD: 0.526, unit: "USD/1KM" },
  { category: "Mine Development (MDO)", itemName: "Cut - Base Rate (1000m)", rateUSD: 2.129, unit: "USD/BCM" },
  { category: "Mine Development (MDO)", itemName: "Unblasted fill material", rateUSD: 3.335, unit: "USD/BCM" },
  { category: "Mine Development (MDO)", itemName: "Cut or Fill under/overhaul", rateUSD: 0.521, unit: "USD/1KM" },
  { category: "Mine Development (MDO)", itemName: "Excess Cut disposal in dump", rateUSD: 1.157, unit: "USD/BCM" },
  { category: "Mine Development (MDO)", itemName: "Fill", rateUSD: 1.109, unit: "USD/BCM" },
=======
  { category: "Mine Development (MDO)", itemName: "Cut - Base Rate (1000m)", rateUSD: 2.129, unit: "USD/BCM" },
  { category: "Mine Development (MDO)", itemName: "Cut or Fill under/overhaul", rateUSD: 0.521, unit: "USD/1KM" },
>>>>>>> mockup-fe
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
<<<<<<< HEAD
=======
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>("ALL");
>>>>>>> mockup-fe

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [headerForm, setHeaderForm] = useState<any>({
<<<<<<< HEAD
    companyName: "PT Position",
    companyCode: "POS",
    contractNo: "002/POS-AAP/2025"
  });

  const [itemsGrid, setItemsGrid] = useState<any[]>(defaultSOWTemplate);
=======
    companyName: "PT Budi Gema Gempita",
    companyCode: "BGG",
    contractNo: "09/BGG-AAP/VIII/2018",
    type: "coal"
  });

  const [itemsGrid, setItemsGrid] = useState<any[]>(defaultBGGSOWTemplate);
>>>>>>> mockup-fe

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
<<<<<<< HEAD
=======
        const template = opt.code === "BGG" ? defaultBGGSOWTemplate : defaultSOWTemplate;
>>>>>>> mockup-fe
        groupedMap[opt.code] = {
          companyName: opt.name,
          companyCode: opt.code,
          contractNo: opt.contract,
<<<<<<< HEAD
          itemCount: defaultSOWTemplate.length,
          items: defaultSOWTemplate
        };
      });

      // Overlay items from database
      activeSows.forEach((item) => {
        const cCode = item.customer || "POS";
        if (groupedMap[cCode]) {
          const existingItems = [...groupedMap[cCode].items];
          const idx = existingItems.findIndex(i => i.itemName === item.itemName && i.category === item.category);
          if (idx !== -1) {
            existingItems[idx] = { ...existingItems[idx], rateUSD: item.rateUSD, id: item.id };
=======
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
>>>>>>> mockup-fe
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
<<<<<<< HEAD
      companyName: "PT Position",
      companyCode: "POS",
      contractNo: "002/POS-AAP/2025"
    });
    setItemsGrid(defaultSOWTemplate.map(i => ({ ...i })));
=======
      companyName: "PT Budi Gema Gempita",
      companyCode: "BGG",
      contractNo: "09/BGG-AAP/VIII/2018",
      type: "coal"
    });
    setItemsGrid(defaultBGGSOWTemplate.map(i => ({ ...i })));
>>>>>>> mockup-fe
    setModalOpen(true);
  };

  const openEditGridModal = (contractGroup: any) => {
    setIsEditing(true);
    setHeaderForm({
      companyName: contractGroup.companyName,
      companyCode: contractGroup.companyCode,
<<<<<<< HEAD
      contractNo: contractGroup.contractNo
=======
      contractNo: contractGroup.contractNo,
      type: contractGroup.type || (contractGroup.companyCode === "POS" ? "nickel" : "coal")
>>>>>>> mockup-fe
    });
    setItemsGrid(contractGroup.items.map((i: any) => ({ ...i })));
    setModalOpen(true);
  };

<<<<<<< HEAD
  const handleRateChange = (idx: number, newRateStr: string) => {
    const num = parseFloat(newRateStr);
    const updated = [...itemsGrid];
    updated[idx] = { ...updated[idx], rateUSD: isNaN(num) ? 0 : num };
=======
  const handleRateChange = (idx: number, field: string, val: string) => {
    const num = parseFloat(val);
    const updated = [...itemsGrid];
    updated[idx] = { ...updated[idx], [field]: isNaN(num) ? 0 : num };
>>>>>>> mockup-fe
    setItemsGrid(updated);
  };

  const handleSaveGrid = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      for (const item of itemsGrid) {
        const payload = {
          category: item.category,
          itemName: item.itemName,
<<<<<<< HEAD
          rateUSD: item.rateUSD,
          unit: item.unit,
          customer: headerForm.companyCode,
=======
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
>>>>>>> mockup-fe
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
<<<<<<< HEAD
=======
    if (selectedCompanyFilter !== "ALL" && c.companyCode !== selectedCompanyFilter) return false;
>>>>>>> mockup-fe
    const matchQ = JSON.stringify(c).toLowerCase().includes(query.toLowerCase());
    return matchQ;
  });

<<<<<<< HEAD
  return (
    <div className="workspace-body space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          title="Master Data — Variable Scope of Work (SOW)"
          description="Katalog tarif satuan dasar pertambangan (Rate USD dengan presisi 3 desimal & konversi otomatis Kurs Tengah M-Rate BI)."
        />
        <button
          className="primary flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg bg-cyan-800 hover:bg-cyan-900 text-white shadow-sm transition shrink-0 cursor-pointer"
          onClick={openCreateGridModal}
        >
          <Plus size={16} /> + Input Tariff Grid SOW Baru
        </button>
      </div>

      {/* Summary KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">KURS BI ACUAN (M-RATE)</span>
          <div className="text-xl font-black text-cyan-900 font-mono flex items-center gap-2">
            {formatIDR(mrateBi)}
            <span className="text-[10px] font-sans font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Auto Currency ✅</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">KONTRAK TERDAFTAR</span>
          <div className="text-xl font-black text-slate-900 font-mono">{contractsList.length} Kontrak Perusahaan</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">STANDAR FORMAT PRESI</span>
          <div className="text-sm font-extrabold text-slate-700 mt-1">3 Angka Dibelakang Koma (0.001 USD)</div>
        </div>
      </div>

      {/* Main Table: Nama Perusahaan, Kode Perusahaan, Nomor Kontrak */}
      <Panel title="📋 Daftar Kontrak & Master Variable SOW Perusahaan">
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-extrabold text-xs uppercase tracking-wider">
                <th className="p-3 border-r border-slate-800">NO</th>
                <th className="p-3 border-r border-slate-800">NAMA PERUSAHAAN</th>
                <th className="p-3 border-r border-slate-800 text-center">KODE PERUSAHAAN</th>
                <th className="p-3 border-r border-slate-800">NOMOR KONTRAK</th>
                <th className="p-3 border-r border-slate-800 text-center">JUMLAH ITEM SOW</th>
                <th className="p-3 border-r border-slate-800 text-right">KURS BI ACUAN</th>
                <th className="p-3 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-slate-900 font-medium">
              {filteredContracts.map((c, idx) => (
                <tr key={c.companyCode || idx} className="hover:bg-slate-50 transition border-b border-slate-200">
                  <td className="p-3 text-center border-r border-slate-200 font-bold">{idx + 1}</td>
                  <td className="p-3 border-r border-slate-200 font-extrabold text-slate-900 text-sm">{c.companyName}</td>
                  <td className="p-3 text-center border-r border-slate-200">
                    <span className="px-2.5 py-1 rounded-md font-mono text-xs font-black bg-cyan-50 text-cyan-800 border border-cyan-200">
                      {c.companyCode}
                    </span>
                  </td>
                  <td className="p-3 border-r border-slate-200 font-mono font-bold text-slate-800">{c.contractNo}</td>
                  <td className="p-3 text-center border-r border-slate-200 font-bold">{c.itemCount} Item SOW</td>
                  <td className="p-3 text-right border-r border-slate-200 font-mono font-bold text-cyan-900">{formatIDR(mrateBi)}</td>
                  <td className="p-3 text-right">
                    <button
                      className="px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs flex items-center gap-1.5 ml-auto transition shadow-xs cursor-pointer"
                      onClick={() => openEditGridModal(c)}
                      title="Buka & Edit Tariff Grid SOW (Gambar 1)"
                    >
                      <Eye size={14} /> Lihat & Edit Tariff Grid SOW
=======
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
>>>>>>> mockup-fe
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
<<<<<<< HEAD
      </Panel>

      {/* FULL-SCREEN / LARGE MODAL GRID SOW (MATCHING GAMBAR 1 EXACTLY) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 w-full max-w-5xl shadow-2xl space-y-5 max-h-[94vh] overflow-y-auto transition-all">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-cyan-900 bg-cyan-50 px-2.5 py-1 rounded-md border border-cyan-200">
                  <FileSpreadsheet size={14} /> Tariff Grid Master Variable SOW
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  {isEditing ? `Form Tariff Grid SOW — ${headerForm.companyName}` : "Input Tariff Grid SOW Baru"}
=======
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
>>>>>>> mockup-fe
                </h3>
              </div>
              <button
                className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition cursor-pointer"
                onClick={() => setModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

<<<<<<< HEAD
            {/* HEADER SELECTION FORM: NAMA PERUSAHAAN, KODE PERUSAHAAN, NOMOR KONTRAK */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1">
                  Nama Perusahaan <span className="text-rose-600">*</span>
                </label>
                <select
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-extrabold focus:border-cyan-700 outline-none"
=======
            {/* HEADER SELECTION FORM */}
            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                  Nama Perusahaan <span className="text-rose-600">*</span>
                </label>
                <select
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-extrabold focus:border-cyan-700 outline-none"
>>>>>>> mockup-fe
                  value={headerForm.companyCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    const opt = defaultCompanyOptions.find(o => o.code === code);
<<<<<<< HEAD
                    setHeaderForm({
                      companyName: opt?.name || code,
                      companyCode: code,
                      contractNo: opt?.contract || "001/AAP-NEW/2026"
                    });
=======
                    const newType = opt?.type || (code === "POS" ? "nickel" : "coal");
                    setHeaderForm({
                      companyName: opt?.name || code,
                      companyCode: code,
                      contractNo: opt?.contract || "001/AAP-NEW/2026",
                      type: newType
                    });
                    setItemsGrid(code === "BGG" ? defaultBGGSOWTemplate.map(i => ({ ...i })) : defaultSOWTemplate.map(i => ({ ...i })));
>>>>>>> mockup-fe
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
<<<<<<< HEAD
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1">
=======
                <label className="block text-xs font-black uppercase text-slate-700 mb-1">
>>>>>>> mockup-fe
                  Kode Perusahaan
                </label>
                <input
                  type="text"
<<<<<<< HEAD
                  className="w-full bg-slate-100 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-black font-mono"
=======
                  className="w-full bg-slate-100 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-black font-mono"
>>>>>>> mockup-fe
                  value={headerForm.companyCode}
                  readOnly
                />
              </div>

              <div>
<<<<<<< HEAD
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1">
=======
                <label className="block text-xs font-black uppercase text-slate-700 mb-1">
>>>>>>> mockup-fe
                  Nomor Kontrak <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
<<<<<<< HEAD
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-bold focus:border-cyan-700 outline-none font-mono"
=======
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-bold focus:border-cyan-700 outline-none font-mono"
>>>>>>> mockup-fe
                  value={headerForm.contractNo}
                  onChange={(e) => setHeaderForm({ ...headerForm, contractNo: e.target.value })}
                  required
                />
              </div>

              <div>
<<<<<<< HEAD
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1">
                  Kurs BI Acuan (Konversi Auto)
                </label>
                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-2 text-xs text-cyan-950 font-black font-mono">
                  {formatIDR(mrateBi)} / USD
=======
                <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                  Model Tarif SOW
                </label>
                <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-2.5 text-xs text-cyan-950 font-black">
                  {isCoalClient ? "⚡ Matrix Multi-Tier Coal Index" : `${formatIDR(mrateBi)} / USD (M-Rate BI)`}
>>>>>>> mockup-fe
                </div>
              </div>
            </div>

<<<<<<< HEAD
            {/* EXCEL GRID TABLE MATCHING GAMBAR 1 EXACTLY */}
            <form onSubmit={handleSaveGrid} className="space-y-4">
              <div className="overflow-x-auto rounded-xl border-2 border-slate-300 shadow-md">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="font-extrabold text-xs uppercase tracking-wider text-white">
                      <th className="p-3 border border-amber-900 bg-amber-800 text-white w-1/2 text-left font-black">
                        in USD
                      </th>
                      <th className="p-3 border border-amber-900 bg-amber-600 text-slate-950 text-center font-black w-1/6">
                        Rate (USD)
                      </th>
                      <th className="p-3 border border-amber-900 bg-amber-700 text-white text-center font-black w-1/6">
                        Unit
                      </th>
                      <th className="p-3 border border-emerald-950 bg-emerald-800 text-white text-right font-black w-1/6">
                        Hasil Konversi (IDR)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const categories = ["Operation & Mining", "Rehabilitation", "Mine Development (MDO)"];
                      return categories.map((catName) => {
                        const catItems = itemsGrid.filter(i => i.category === catName);
                        return (
                          <Fragment key={catName}>
                            {/* Category Header Row */}
                            <tr className="bg-slate-100 font-extrabold text-slate-900 border-b border-slate-300">
                              <td colSpan={4} className="p-3 border border-slate-300 text-xs font-black uppercase tracking-wider text-slate-900 bg-slate-200/80">
                                {catName}
                              </td>
                            </tr>
                            {/* Items in Category */}
                            {catItems.map((item) => {
                              const globalIdx = itemsGrid.findIndex(i => i.category === item.category && i.itemName === item.itemName);
                              const idrConverted = (item.rateUSD || 0) * mrateBi;
                              return (
                                <tr key={globalIdx} className="hover:bg-amber-50/50 border-b border-slate-200 transition-colors">
                                  <td className="p-2.5 border border-slate-300 font-bold text-slate-900 pl-4 bg-white">
                                    {item.itemName}
                                  </td>
                                  <td className="p-0 border border-slate-300 bg-yellow-200 focus-within:bg-yellow-300">
                                    <input
                                      type="number"
                                      step="0.001"
                                      className="w-full text-right font-mono font-black text-slate-950 bg-yellow-200 focus:bg-yellow-100 focus:ring-2 focus:ring-amber-500 px-3 py-2 outline-none text-xs border-none"
                                      value={item.rateUSD}
                                      onChange={(e) => handleRateChange(globalIdx, e.target.value)}
                                      onBlur={(e) => {
                                        const num = parseFloat(e.target.value);
                                        if (!isNaN(num)) handleRateChange(globalIdx, num.toFixed(3));
                                      }}
                                      required
                                    />
                                  </td>
                                  <td className="p-2.5 border border-slate-300 text-center font-mono font-extrabold text-slate-700 bg-slate-50">
                                    {item.unit}
                                  </td>
                                  <td className="p-2.5 border border-slate-300 text-right font-mono font-black text-emerald-800 bg-emerald-50/40">
                                    {formatIDR(idrConverted)}
                                  </td>
                                </tr>
                              );
                            })}
                          </Fragment>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                <span className="text-xs text-slate-500 font-medium">
                  * Seluruh nilai Rate pada kolom kuning akan otomatis dikonversi ke Rupiah menggunakan Kurs Tengah M-Rate BI ({formatIDR(mrateBi)}).
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="px-5 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition shadow-sm cursor-pointer"
=======
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
>>>>>>> mockup-fe
                    onClick={() => setModalOpen(false)}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
<<<<<<< HEAD
                    className="px-6 py-2.5 rounded-lg bg-cyan-800 hover:bg-cyan-900 text-white font-bold text-xs shadow-md transition cursor-pointer"
=======
                    className="px-6 py-2.5 rounded-2xl bg-cyan-800 hover:bg-cyan-900 text-white font-black text-xs shadow-md transition active:scale-95 cursor-pointer"
>>>>>>> mockup-fe
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
