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
import { api, getCompanies, type Company } from "../lib/api";
import { useNavigate, useLocation } from "react-router-dom";

const formatIDR = (val: number) => {
  if (!val && val !== 0) return "Rp 0";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 2 }).format(val);
};

export const SOW_OPERATIONAL_SITES = [
  { code: "BGG", name: "PT Budi Gema Gempita", fullName: "PT Budi Gema Gempita (BGG)", contractNo: "09/BGG-AAP/VIII/2018" },
  { code: "POS", name: "PT Position", fullName: "PT Position (POS)", contractNo: "002/POS-AAP/2025" },
  { code: "SBS", name: "PT Satria Bahana Sarana", fullName: "PT Satria Bahana Sarana (SBS)", contractNo: "230/AAP-SBS/EXT/XII/24" },
  { code: "PTRO", name: "PT Petrosea", fullName: "PT Petrosea (PTRO)", contractNo: "001/PTRO-AAP/2024" },
];

export const VALID_SOW_SITE_CODES = new Set(["BGG", "POS", "SBS", "PTRO"]);

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

export const defaultSBSSOWTemplate = [
  // OB Removal (Per Area Kerja)
  { category: "OB Removal", itemName: "PIT E - DISPOSAL SEKATAN", unit: "BCM", rateIDR: 22654, rateUSD: 0 },
  { category: "OB Removal", itemName: "PIT E - RENCANA JALAN", unit: "BCM", rateIDR: 12638, rateUSD: 0 },
  { category: "OB Removal", itemName: "PIT E - RENCANA CSA", unit: "BCM", rateIDR: 8346, rateUSD: 0 },
  { category: "OB Removal", itemName: "PIT E - JALAN BARITO", unit: "BCM", rateIDR: 15500, rateUSD: 0 },
  { category: "OB Removal", itemName: "PIT E - SEKATAN", unit: "BCM", rateIDR: 16931, rateUSD: 0 },
  { category: "OB Removal", itemName: "PIT E - TS MAHONI", unit: "BCM", rateIDR: 22654, rateUSD: 0 },
  { category: "OB Removal", itemName: "PIT E - IPD WARWEFILL", unit: "BCM", rateIDR: 8346, rateUSD: 0 },
  { category: "OB Removal", itemName: "PIT E - SEKATAN (High Rate)", unit: "BCM", rateIDR: 19375, rateUSD: 0 },

  // Jasa Penunjang Produksi (Rental Alat Berat - Kontrak SPPH-05852)
  { category: "Jasa Penunjang Produksi", itemName: "Dozer CAT D10 - BDCT 1001", unit: "Hours", rateIDR: 1980000, rateUSD: 0 },
  { category: "Jasa Penunjang Produksi", itemName: "Dozer CAT D10 - BDCT 1002", unit: "Hours", rateIDR: 1980000, rateUSD: 0 },
  { category: "Jasa Penunjang Produksi", itemName: "Excavator CAT 395 - EXCT 3901", unit: "Hours", rateIDR: 1425000, rateUSD: 0 },
  { category: "Jasa Penunjang Produksi", itemName: "Excavator CAT 395 - EXCT 3902", unit: "Hours", rateIDR: 1425000, rateUSD: 0 },

  // Pengurang Pembayaran (Denda Operasional & BBM)
  { category: "Pengurang Pembayaran", itemName: "1. Denda Ketidaktercapaian MA", unit: "Hours", rateIDR: 0, rateUSD: 0 },
  { category: "Pengurang Pembayaran", itemName: "2. Kelebihan Pemakaian BBM Loader", unit: "Lot", rateIDR: 0, rateUSD: 0 },
  { category: "Pengurang Pembayaran", itemName: "3. Kelebihan Pemakaian BBM Hauler", unit: "Lot", rateIDR: 0, rateUSD: 0 },
  { category: "Pengurang Pembayaran", itemName: "4. Denda ketidakcapaian volume", unit: "Lot", rateIDR: 0, rateUSD: 0 },
];

export const defaultPTROSOWTemplate = [
  { category: "Operating & Mining", itemName: "OVER BURDEN", unit: "USD/Bcm", rateUSD: 1.490, rateIDR: 0 },
  { category: "Operating & Mining", itemName: "COAL GETTING", unit: "USD/MT", rateUSD: 0.840, rateIDR: 0 },
  { category: "Over Distance", itemName: "OVERHAUL OB", unit: "USD/BCM/100 Mtr", rateUSD: 0.028, rateIDR: 0, baseDistanceMeters: 1000 },
  { category: "Over Distance", itemName: "OVERHAUL COAL GETTING", unit: "IDR/TON/100 Mtr", rateUSD: 0, rateIDR: 230, baseDistanceMeters: 3000 },
];

export const defaultDBKSOWTemplate = defaultPTROSOWTemplate;

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
  const [companyList, setCompanyList] = useState<any[]>(SOW_OPERATIONAL_SITES);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.notice) {
      onNotice(location.state.notice);
      // Clear notice from state so it doesn't pop up again on refresh
      window.history.replaceState({}, document.title)
    }
  }, [location, onNotice]);

  async function loadData() {
    setLoading(true);
    try {
      const [resSow, resMrate] = await Promise.all([
        api<any[]>("/api/master-data/variable-sow").catch(() => []),
        api<any[]>("/api/master-data/daily-exchange-rates").catch(() => []),
      ]);

      const activeSows = Array.isArray(resSow) ? resSow : [];
      setSowRows(activeSows);

      // Latest BI M-Rate
      if (Array.isArray(resMrate) && resMrate.length > 0) {
        const latest = resMrate[0];
        const val = latest.kursTengah || ((latest.kursJual + latest.kursBeli) / 2);
        if (val > 0) setMrateBi(val);
      }

      // Group SOWs strictly for the 4 Operational Mining Sites
      const groupedMap: Record<string, any> = {};

      SOW_OPERATIONAL_SITES.forEach((site) => {
        let template = defaultSOWTemplate;
        if (site.code === "BGG") {
          template = defaultBGGSOWTemplate;
        } else if (site.code === "SBS") {
          template = defaultSBSSOWTemplate;
        } else if (site.code === "PTRO") {
          template = defaultPTROSOWTemplate;
        }
        groupedMap[site.code] = {
          companyName: site.name,
          companyCode: site.code,
          contractNo: site.contractNo,
          type: site.code === "BGG" ? "coal" : "generic",
          badgeColor: "slate",
          desc: "",
          itemCount: template.length,
          items: template
        };
      });

      // Overlay items from database (filtering out non-master / period-tagged legacy items)
      activeSows.forEach((item) => {
        if (item.itemName && (/\(Feb-|\(Jun-|\(Jan-|\(Mar-|\(Apr-|\(May-|\(Jul-|\(Aug-|\(Sep-|\(Oct-|\(Nov-|\(Dec-/i.test(item.itemName))) {
          return;
        }

        const cCode = (item.customerCode || item.customer || "").toUpperCase();
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
      setCompanyList(SOW_OPERATIONAL_SITES);
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
    navigate("/variable-sow/new", { state: { mrateBi } });
  };

  const openEditGridModal = (contractGroup: any) => {
    navigate("/variable-sow/edit", { state: { contractGroup, mrateBi } });
  };

  const filteredContracts = contractsList.filter((c) => {
    if (selectedCompanyFilter !== "ALL" && c.companyCode !== selectedCompanyFilter) return false;
    const matchQ = JSON.stringify(c).toLowerCase().includes(query.toLowerCase());
    return matchQ;
  });

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-12">
      {/* Top Header */}
      <PageHeader
        title="Master Data Variable SOW"
        description="Katalog tarif dan parameter komersial operasional per kontrak site pertambangan."
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
            onClick={openCreateGridModal}
            className="px-3.5 py-2 rounded-lg bg-cyan-800 hover:bg-cyan-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Plus size={15} />
            <span>Input Tarif SOW Baru</span>
          </button>
        </div>
      </PageHeader>

      {/* KPI Cards Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kurs Acuan BI (M-Rate)</span>
            <span className="p-0.5 px-2 bg-emerald-50 rounded text-emerald-700 font-bold text-[10px] border border-emerald-200">Live Sync</span>
          </div>
          <div className="text-xl font-black text-slate-900 font-mono tracking-tight pt-0.5">
            {formatIDR(mrateBi)}
            <span className="text-xs font-sans font-normal text-slate-400 ml-1">/ USD</span>
          </div>
          <p className="text-[11px] text-slate-500">Acuan konversi tarif USD (PT POS & PT DBK)</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kontrak Aktif</span>
            <span className="p-0.5 px-2 bg-slate-100 rounded text-slate-700 font-bold text-[10px] border border-slate-200">{contractsList.length} Entitas</span>
          </div>
          <div className="text-xl font-black text-slate-900 font-mono tracking-tight pt-0.5">
            {contractsList.length} Site & Klien
          </div>
          <p className="text-[11px] text-slate-500">{companyList.map((c) => c.code).join(", ") || "Terdaftar di database"}</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Model Komersial</span>
            <span className="p-0.5 px-2 bg-cyan-50 rounded text-cyan-800 font-bold text-[10px] border border-cyan-200">Multi-Site</span>
          </div>
          <div className="text-sm font-bold text-slate-900 pt-1">
            Batubara (Tiering), Nikel (USD) & Rental (IDR)
          </div>
          <p className="text-[11px] text-slate-500">Tersinkronisasi ke BA Tracker & Invoice</p>
        </div>
      </div>

      {/* Filter Tabs by Company */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedCompanyFilter("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
            selectedCompanyFilter === "ALL"
              ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          }`}
        >
          Semua Kontrak ({contractsList.length})
        </button>
        {companyList.map((c) => (
          <button
            key={c.code}
            onClick={() => setSelectedCompanyFilter(c.code)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer ${
              selectedCompanyFilter === c.code
                ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span>{c.name}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${selectedCompanyFilter === c.code ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}>
              {c.code}
            </span>
          </button>
        ))}
      </div>

      {/* Main Table Panel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Daftar Master Variable SOW Berdasarkan Kontrak
            </h3>
            <p className="text-xs text-slate-500">
              Katalog tarif dasar yang otomatis dipakai saat pembuatan Berita Acara dan Invoice.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="p-3 pl-4 text-center w-12">NO</th>
                <th className="p-3">NAMA PERUSAHAAN</th>
                <th className="p-3 text-center w-20">KODE</th>
                <th className="p-3 font-mono">NOMOR KONTRAK</th>
                <th className="p-3 text-center">KOMODITAS & MODEL</th>
                <th className="p-3 text-center w-28">JUMLAH SOW</th>
                <th className="p-3 pr-4 text-right w-36">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredContracts.map((c, idx) => (
                <tr key={c.companyCode || idx} className="hover:bg-slate-50 transition">
                  <td className="p-3 pl-4 text-center font-bold text-slate-400">{idx + 1}</td>
                  <td className="p-3">
                    <div className="font-bold text-slate-900">{c.companyName}</div>
                    {c.desc && <p className="text-[11px] text-slate-500 mt-0.5">{c.desc}</p>}
                  </td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                      {c.companyCode}
                    </span>
                  </td>
                  <td className="p-3 font-mono font-bold text-slate-700 text-xs">{c.contractNo || "-"}</td>
                  <td className="p-3 text-center">
                    {c.type === "coal" || c.companyCode === "BGG" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                        <Flame size={12} className="text-amber-600" /> Batubara (Multi-Tier)
                      </span>
                    ) : c.companyCode === "SBS" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
                        <CheckCircle2 size={12} className="text-emerald-700" /> IDR (OB, Rental & Denda)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-cyan-50 text-cyan-900 border border-cyan-200">
                        <DollarSign size={12} className="text-cyan-700" /> Nikel (USD Presisi)
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center font-bold text-slate-700">
                    <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono text-xs">
                      {c.itemCount} Item
                    </span>
                  </td>
                  <td className="p-3 pr-4 text-right">
                    <button
                      className="px-3 py-1.5 rounded-lg bg-cyan-800 hover:bg-cyan-900 text-white font-bold text-xs flex items-center gap-1 ml-auto transition shadow-2xs cursor-pointer active:scale-95"
                      onClick={() => openEditGridModal(c)}
                    >
                      <Eye size={13} />
                      <span>Lihat & Edit Tarif</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
