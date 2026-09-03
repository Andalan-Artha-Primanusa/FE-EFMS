import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, Pickaxe, Layers, Calculator, Zap, TrendingUp, Scale,
  Eye, Edit2, Trash2, Plus, RefreshCw, Save, DollarSign, Sliders,
  CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, Info, Check,
  ExternalLink
} from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { api, getCompanies, type Company } from "../../lib/api";
import { formatIDR } from "./helpers";

interface SOWItem {
  id?: number | string;
  customerCode: string;
  category: string;
  itemName: string;
  unit: string;
  rateIDR: number;
  tier1Rate?: number;
  tier2Rate?: number;
  tier3Rate?: number;
  status: string;
}

interface CoalIndexData {
  period: string;
  avgIci3: number;
  avgIci4: number;
  avgR3: number;
  activeTier: string;
  status: string;
}

interface RaiseFallData {
  customerCode: string;
  weightFuelA: number;
  weightLaborB: number;
  weightFixedC: number;
  baseFuelFo: number;
  baseLaborLo: number;
  actualFuelFn: number;
  actualLaborLn: number;
  rfIndexResult: number;
}

export function CustomerView({ c }: { c: any }) {
  const {
    customerRows, setDetailViewItem, openCreateModal, openEditModal, handleDelete,
    query, onNotice = () => {}
  } = c as Record<string, any>;
  const safeCustomerRows = Array.isArray(customerRows) ? customerRows : [];

  // Active top-level view: "cards" (Direktori Klien) or "setup" (Parameter, SOW & Formula)
  const [viewMode, setViewMode] = useState<"cards" | "setup">("cards");
  const [selectedClientCode, setSelectedClientCode] = useState<string>("");
  const [setupSubTab, setSetupSubTab] = useState<"profile" | "sow" | "formula" | "simulation">("sow");
  const [companyList, setCompanyList] = useState<Company[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    getCompanies().then((c) => { if (Array.isArray(c)) setCompanyList(c); }).catch(() => {});
  }, []);

  // Auxiliary data for SOW, Coal Index, Raise & Fall
  const [sowList, setSowList] = useState<SOWItem[]>([]);
  const [coalIndices, setCoalIndices] = useState<CoalIndexData[]>([]);
  const [raiseFalls, setRaiseFalls] = useState<RaiseFallData[]>([]);
  const [loadingSetup, setLoadingSetup] = useState(false);

  // SOW Modal State
  const [isSowModalOpen, setIsSowModalOpen] = useState(false);
  const [editingSOW, setEditingSOW] = useState<SOWItem | null>(null);

  // Simulation Playground State
  const [simCoalVolume, setSimCoalVolume] = useState<number>(20000);
  const [simOBVolume, setSimOBVolume] = useState<number>(65000);

  // Fetch SOW and parameters
  const loadSetupData = async () => {
    setLoadingSetup(true);
    try {
      const [sowRes, coalRes, rfRes] = await Promise.allSettled([
        api<SOWItem[]>("/api/master-data/variable-sow"),
        api<CoalIndexData[]>("/api/master-data/coal-index"),
        api<RaiseFallData[]>("/api/master-data/raise-fall")
      ]);
      if (sowRes.status === "fulfilled" && Array.isArray(sowRes.value)) setSowList(sowRes.value);
      if (coalRes.status === "fulfilled" && Array.isArray(coalRes.value)) setCoalIndices(coalRes.value);
      if (rfRes.status === "fulfilled" && Array.isArray(rfRes.value)) setRaiseFalls(rfRes.value);
    } catch (e) {
      console.warn("Failed loading setup auxiliary data:", e);
    } finally {
      setLoadingSetup(false);
    }
  };

  useEffect(() => {
    loadSetupData();
  }, []);

  const handleOpenSetupForClient = (clientCode: string) => {
    setSelectedClientCode(clientCode.toUpperCase());
    setViewMode("setup");
    setSetupSubTab("sow");
  };

  // Filtered client SOW items
  const activeClientSOW = sowList.filter((it) => {
    const code = (it.customerCode || "").toUpperCase();
    const target = selectedClientCode.toUpperCase();
    return code === target || (target === "POS" && code.includes("POS")) || (target === "BGG" && code.includes("BGG"));
  });

  // Current client customer record
  const currentClientRecord = safeCustomerRows.find((r: any) => (r.code || "").toUpperCase() === selectedClientCode.toUpperCase());

  // Save SOW Item
  const handleSaveSOW = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSOW) return;
    try {
      await api("/api/master-data/variable-sow", {
        method: "POST",
        body: JSON.stringify(editingSOW)
      });
      onNotice(`Tarif material SOW [${editingSOW.itemName}] untuk ${selectedClientCode} berhasil disimpan.`);
      setIsSowModalOpen(false);
      setEditingSOW(null);
      await loadSetupData();
    } catch (err: any) {
      onNotice(`Gagal menyimpan tarif SOW: ${err?.message}`);
    }
  };

  const handleDeleteSOW = async (id: number | string | undefined) => {
    if (!id) return;
    if (!window.confirm("Hapus item material SOW ini dari konfigurasi client?")) return;
    try {
      await api(`/api/master-data/variable-sow/${id}`, { method: "DELETE" });
      onNotice(`Item material SOW berhasil dihapus.`);
      await loadSetupData();
    } catch (err: any) {
      onNotice(`Gagal menghapus SOW: ${err?.message}`);
    }
  };

  // Coal Index details for BGG
  const latestCoal = coalIndices.length > 0 ? coalIndices[0] : {
    period: "Jul-26",
    avgIci3: 65.4,
    avgIci4: 48.2,
    avgR3: 52.8,
    activeTier: "Tier 2",
    status: "Verified"
  };

  // Raise & Fall details for BGG
  const currentRF = raiseFalls.find((rf) => rf.customerCode === "BGG") || {
    customerCode: "BGG",
    weightFuelA: 0.25,
    weightLaborB: 0.15,
    weightFixedC: 0.60,
    baseFuelFo: 13500,
    baseLaborLo: 3800000,
    actualFuelFn: 14800,
    actualLaborLn: 4100000,
    rfIndexResult: 1.035
  };

  return (
    <>
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          title="Client Setup"
          description="Pusat konfigurasi terpadu seluruh klien & site: direktori kontrak, termin pembayaran, katalog tarif SOW, formula multi-tier batubara, dan aturan penagihan Berita Acara & Invoice."
        />
        <div className="flex items-center gap-2 shrink-0">
          <button
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-black rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white shadow-sm transition cursor-pointer"
            onClick={() => openCreateModal("customer")}
          >
            <Plus size={15} /> Tambah Customer Baru
          </button>
        </div>
      </div>

      {/* Main View Mode Selector Tabs */}
      <div className="flex border-b border-slate-200 gap-3">
        <button
          type="button"
          onClick={() => setViewMode("cards")}
          className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
            viewMode === "cards"
              ? "border-b-2 border-cyan-700 text-cyan-900"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Building2 size={16} />
          <span>Direktori & Profil Klien ({safeCustomerRows.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode("setup")}
          className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
            viewMode === "setup"
              ? "border-b-2 border-cyan-700 text-cyan-900"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Sliders size={16} />
          <span>Konfigurasi Parameter, SOW & Formula Khusus</span>
        </button>
      </div>

      {/* VIEW MODE 1: CLIENT CARDS DIRECTORY */}
      {viewMode === "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {safeCustomerRows
            .filter((r) => JSON.stringify(r).toLowerCase().includes(query.toLowerCase()))
            .map((c: any) => {
              const code = (c.code || "").toUpperCase();
              const isBGG = code === "BGG";
              const isPOS = code === "POS";
              const isDBK = code === "PTRO" || code === "DBK";
              const isSBS = code === "SBS";

              return (
                <div key={c.id} className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3 relative hover:shadow-md transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-mono font-black text-cyan-900 bg-cyan-50 border border-cyan-200 px-2.5 py-0.5 rounded-lg">
                        {c.code}
                      </span>
                      <h3 className="text-base font-black text-slate-900 mt-1.5">{c.fullName}</h3>
                      <p className="text-xs text-slate-500 font-medium">Grup: <span className="text-slate-800 font-bold">{c.groupParent || "-"}</span></p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Termin Hari</span>
                      <div className="text-base font-black text-amber-700">{c.terminDays} Hari</div>
                    </div>
                  </div>

                  {/* Operational Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {isBGG && (
                      <>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <TrendingUp size={11} /> Multi-Tier Coal Index
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <Scale size={11} /> Quota SR 3:1 (Pending OB)
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-800 border border-cyan-200 flex items-center gap-1">
                          <Calculator size={11} /> Raise & Fall BBM
                        </span>
                      </>
                    )}
                    {isPOS && (
                      <>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-800 border border-cyan-200 flex items-center gap-1">
                          <Pickaxe size={11} /> Dual-Invoice (Mining & MDO)
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200">
                          Nikel WM1
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          Overhaul 1.000m
                        </span>
                      </>
                    )}
                    {isDBK && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                        Dual Currency USD/IDR (Petrosea)
                      </span>
                    )}
                    {isSBS && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200">
                        Batubara OB & Jasa Penunjang
                      </span>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-2.5 text-xs text-slate-700 space-y-1 font-medium">
                    <div><span className="text-slate-500 font-bold">No. Kontrak:</span> <span className="font-mono text-slate-800">{c.contractNo || "-"}</span></div>
                    <div><span className="text-slate-500 font-bold">Nilai Kontrak:</span> <span className="font-mono font-extrabold text-slate-900">{formatIDR(c.contractValue)}</span></div>
                    <div><span className="text-slate-500 font-bold">Kontak AR:</span> {c.contactAR} ({c.emailAR || "-"})</div>
                    <div><span className="text-slate-500 font-bold">Catatan:</span> {c.notes || "-"}</div>
                  </div>

                  <div className="flex flex-wrap justify-between items-center gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleOpenSetupForClient(c.code)}
                      className="text-xs font-black text-cyan-800 hover:text-cyan-950 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-50 border border-cyan-300 hover:bg-cyan-100 transition cursor-pointer"
                    >
                      <Sliders size={13} className="text-cyan-700" /> Setup SOW & Formula
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        className="text-xs font-bold text-slate-700 hover:text-cyan-800 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer"
                        onClick={() => setDetailViewItem({ type: "customer", data: c })}
                      >
                        <Eye size={13} /> View Audit
                      </button>
                      <button
                        className="text-xs font-bold text-slate-700 hover:text-cyan-800 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer"
                        onClick={() => openEditModal("customer", c)}
                      >
                        <Edit2 size={13} /> Edit
                      </button>
                      <button
                        className="text-xs font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 cursor-pointer"
                        onClick={() => handleDelete("customer", c.id)}
                      >
                        <Trash2 size={13} /> Hapus
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* VIEW MODE 2: INTEGRATED SETUP HUB (SOW, FORMULAS & SIMULATION) */}
      {viewMode === "setup" && (
        <div className="space-y-4">
          {/* Site Selector Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {companyList.map((c) => {
              const isActive = selectedClientCode.toUpperCase() === c.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setSelectedClientCode(c.code)}
                  className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                    isActive
                      ? "bg-cyan-900/10 border-cyan-600 ring-2 ring-cyan-600/30 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-black text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-900">{c.code}</span>
                    {isActive && <span className="text-[9px] font-black uppercase text-cyan-800 bg-cyan-100 px-1.5 py-0.5 rounded">Aktif</span>}
                  </div>
                  <div className="font-extrabold text-xs text-slate-900 mt-1.5">
                    {c.code === "POS" ? "Site POS (PT Position)" : c.code === "BGG" ? "Site BGG (PT Budi Gema Gempita)" : (c.code === "PTRO" || c.code === "DBK") ? "Site PTRO (PT Petrosea)" : "Site SBS (PT Satria Bahana Sarana)"}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Sub Tabs */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="flex border-b border-slate-200 bg-slate-50/80 px-4 pt-3 gap-2 overflow-x-auto">
              <button
                onClick={() => setSetupSubTab("sow")}
                className={`px-4 py-2.5 font-extrabold text-xs rounded-t-xl transition flex items-center gap-1.5 cursor-pointer ${
                  setupSubTab === "sow"
                    ? "bg-white text-cyan-900 border-t-2 border-cyan-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Layers size={15} />
                <span>1. Katalog SOW & Tarif Material ({activeClientSOW.length})</span>
              </button>

              <button
                onClick={() => setSetupSubTab("formula")}
                className={`px-4 py-2.5 font-extrabold text-xs rounded-t-xl transition flex items-center gap-1.5 cursor-pointer ${
                  setupSubTab === "formula"
                    ? "bg-white text-cyan-900 border-t-2 border-cyan-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Calculator size={15} />
                <span>2. Formula Penagihan & Eskalasi Khusus</span>
              </button>

              <button
                onClick={() => setSetupSubTab("simulation")}
                className={`px-4 py-2.5 font-extrabold text-xs rounded-t-xl transition flex items-center gap-1.5 cursor-pointer ${
                  setupSubTab === "simulation"
                    ? "bg-white text-cyan-900 border-t-2 border-cyan-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Zap size={15} className="text-amber-500" />
                <span>3. Live Simulation Playground (BA & Invoice)</span>
              </button>
            </div>

            {/* SUB-TAB 1: SOW & MATERIAL RATES */}
            {setupSubTab === "sow" && (
              <div className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <Layers className="text-cyan-700" size={16} /> Katalog Scope of Work & Tarif: {selectedClientCode}
                    </h3>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Tarif acuan pekerjaan penambangan yang otomatis terisi saat membuat Berita Acara (BA) klien {selectedClientCode}.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSOW({
                        customerCode: selectedClientCode,
                        category: selectedClientCode === "POS" ? "Operating & Mining" : "Mining",
                        itemName: "",
                        unit: "BCM",
                        rateIDR: 0,
                        status: "Active"
                      });
                      setIsSowModalOpen(true);
                    }}
                    className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer shrink-0"
                  >
                    <Plus size={14} /> Tambah Material SOW
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/variable-sow")}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition border border-slate-300 cursor-pointer shrink-0"
                  >
                    <ExternalLink size={14} /> Buka Master Global SOW
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Kategori</th>
                        <th className="p-3">Nama Material / Pekerjaan</th>
                        <th className="p-3 text-center">Satuan</th>
                        <th className="p-3 text-right">Tarif Baseline (Rp)</th>
                        {selectedClientCode === "BGG" && (
                          <>
                            <th className="p-3 text-right">Tier 1 (R3 ≤ $45)</th>
                            <th className="p-3 text-right">Tier 2 ($45-$70)</th>
                            <th className="p-3 text-right">Tier 3 (R3 &gt; $70)</th>
                          </>
                        )}
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {activeClientSOW.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 font-semibold text-slate-600">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-bold">
                              {item.category}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-slate-900">{item.itemName}</td>
                          <td className="p-3 text-center font-mono font-bold text-slate-700">{item.unit}</td>
                          <td className="p-3 text-right font-mono font-black text-slate-900">{formatIDR(item.rateIDR)}</td>
                          {selectedClientCode === "BGG" && (
                            <>
                              <td className="p-3 text-right font-mono text-cyan-800">{formatIDR(item.tier1Rate || item.rateIDR)}</td>
                              <td className="p-3 text-right font-mono text-emerald-800 font-bold">{formatIDR(item.tier2Rate || item.rateIDR)}</td>
                              <td className="p-3 text-right font-mono text-purple-800 font-bold">{formatIDR(item.tier3Rate || item.rateIDR)}</td>
                            </>
                          )}
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              {item.status || "Active"}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSOW(item);
                                  setIsSowModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-cyan-700 hover:bg-cyan-50 transition cursor-pointer"
                                title="Edit Tarif"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSOW(item.id)}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                title="Hapus"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {activeClientSOW.length === 0 && (
                        <tr>
                          <td colSpan={selectedClientCode === "BGG" ? 8 : 5} className="p-6 text-center text-slate-400 italic">
                            Belum ada katalog material SOW untuk {selectedClientCode}. Klik "Tambah Material SOW" untuk input data baru.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-TAB 2: FORMULA & SPECIAL CALCULATION RULES */}
            {setupSubTab === "formula" && (
              <div className="p-6 space-y-6">
                {selectedClientCode === "POS" ? (
                  <div className="space-y-5">
                    <div className="bg-cyan-50 border border-cyan-200 rounded-2xl p-4 space-y-2 text-xs text-cyan-950">
                      <h4 className="font-black uppercase tracking-wider text-cyan-900 flex items-center gap-1.5">
                        <Pickaxe size={16} /> Aturan Khusus Penagihan: Site POS (Nikel)
                      </h4>
                      <p className="text-slate-700">
                        Site POS menggunakan skema <strong>Dual-Invoice Separation</strong>. Setiap Berita Acara yang disetujui menghasilkan 2 draft faktur tagihan:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div className="bg-white p-3 rounded-xl border border-cyan-200 shadow-xs">
                          <strong className="block text-cyan-900 font-extrabold">Faktur 1: Operation & Mining</strong>
                          <span className="text-[11px] text-slate-600">Top Soil, Limonite, Saprolite, Waste, dan Overhaul Distance.</span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-indigo-200 shadow-xs">
                          <strong className="block text-indigo-900 font-extrabold">Faktur 2: Mine Development (MDO)</strong>
                          <span className="text-[11px] text-slate-600">Land Clearing, Grubbing, Hauling Road Construction, dan Water Management.</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <h5 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px]">Parameter Overhaul Jarak Jauh</h5>
                        <div className="flex justify-between"><span className="text-slate-500">Jarak Dasar:</span><strong className="font-mono">1.000 Meter</strong></div>
                        <div className="flex justify-between"><span className="text-slate-500">Penyesuaian Jarak:</span><strong className="font-mono text-cyan-900">Per 1.000 Meter (USD 0,538/1KM)</strong></div>
                      </div>
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <h5 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px]">Pajak & Rekening Default</h5>
                        <div className="flex justify-between"><span className="text-slate-500">PPN / PPh 23:</span><strong>11% / 2%</strong></div>
                        <div className="flex justify-between"><span className="text-slate-500">Bank AAP:</span><strong>Bank BNI (A/C 8188788882)</strong></div>
                      </div>
                    </div>
                  </div>
                ) : selectedClientCode === "BGG" ? (
                  <div className="space-y-5 text-xs">
                    {(() => {
                      const activeTierComputed = latestCoal.activeTier || (latestCoal.avgR3 > 75 ? "Tier 3" : latestCoal.avgR3 >= 50 ? "Tier 2" : "Tier 1");
                      return (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <h4 className="font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                              <TrendingUp size={16} className="text-emerald-700" /> Multi-Tier Coal Indexing Engine (BGG Batubara)
                            </h4>
                            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-200 text-emerald-900 border border-emerald-400">
                              Tier Aktif: {activeTierComputed} (R3 Avg: ${latestCoal.avgR3.toFixed(2)})
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className={`p-3 rounded-xl border ${activeTierComputed === "Tier 1" ? "bg-emerald-100 border-emerald-400 font-bold" : "bg-white border-slate-200"}`}>
                              <span className={`text-[10px] uppercase block ${activeTierComputed === "Tier 1" ? "text-emerald-800 font-black" : "text-slate-500"}`}>
                                Tier 1 (≤$50) {activeTierComputed === "Tier 1" ? "(AKTIF)" : ""}
                              </span>
                              <strong className="text-xs font-black text-slate-900">Tarif OB 1: Rp 27.000 / BCM</strong>
                              <p className="text-[10px] text-slate-600 mt-1">Tarif OB 2: Rp 26.250 / BCM</p>
                            </div>
                            <div className={`p-3 rounded-xl border ${activeTierComputed === "Tier 2" ? "bg-emerald-100 border-emerald-400 font-bold" : "bg-white border-slate-200"}`}>
                              <span className={`text-[10px] uppercase block ${activeTierComputed === "Tier 2" ? "text-emerald-800 font-black" : "text-slate-500"}`}>
                                Tier 2 ($50-$75) {activeTierComputed === "Tier 2" ? "(AKTIF)" : ""}
                              </span>
                              <strong className="text-xs font-black text-slate-900">Tarif OB 1: Rp 27.250 / BCM</strong>
                              <p className="text-[10px] text-slate-600 mt-1">Tarif OB 2: Rp 26.500 / BCM</p>
                            </div>
                            <div className={`p-3 rounded-xl border ${activeTierComputed === "Tier 3" ? "bg-emerald-100 border-emerald-400 font-bold" : "bg-white border-slate-200"}`}>
                              <span className={`text-[10px] uppercase block ${activeTierComputed === "Tier 3" ? "text-emerald-800 font-black" : "text-slate-500"}`}>
                                Tier 3 (&gt;$75) {activeTierComputed === "Tier 3" ? "(AKTIF)" : ""}
                              </span>
                              <strong className="text-xs font-black text-slate-900">Tarif OB 1: Rp 29.500 / BCM</strong>
                              <p className="text-[10px] text-slate-600 mt-1">Tarif OB 2: Rp 28.750 / BCM</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-1.5">
                      <h4 className="font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                        <Scale size={16} className="text-amber-700" /> Kontrak Batas Kuota Stripping Ratio (Maks. 3.0 : 1)
                      </h4>
                      <p className="text-slate-700 text-[11px]">
                        Volume OB yang dapat ditagihkan langsung dibatasi sebesar <strong>3x Volume Batubara (Ton)</strong>. Kelebihan volume survei OB dicatat ke <strong>Pending Volume Ledger (Carry-Forward)</strong> dan dialokasikan secara manual oleh Finance Site.
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <h4 className="font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                        <Calculator size={16} className="text-cyan-700" /> Formula Eskalasi Raise & Fall: 1-Faktor BBM Murni (BGG)
                      </h4>
                      <div className="p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-[11px] text-slate-800">
                        <code>Index = 0,60 + 0,40 × (Fn / Fo)</code>
                        <span className="text-slate-500 font-sans ml-2 text-[10px]">(Tanpa komponen Upah/Labor & tanpa faktor kurs)</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                        <div><span className="text-slate-500 font-bold">Base Fuel (Fo):</span> <strong className="font-mono">Rp 9.000 / Liter</strong></div>
                        <div><span className="text-slate-500 font-bold">Aktual Fuel (Fn):</span> <strong className="font-mono">Rp 21.601,53</strong></div>
                        <div><span className="text-slate-500 font-bold">Faktor Pengali RF:</span> <strong className="font-mono text-emerald-800">1.560x</strong></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500 text-xs italic">
                    Konfigurasi formula standar penambangan berlaku untuk {selectedClientCode}.
                  </div>
                )}
              </div>
            )}

            {/* SUB-TAB 3: PLAYGROUND SIMULATION */}
            {setupSubTab === "simulation" && (() => {
              const isBGG = selectedClientCode === "BGG";
              const coalVol = simCoalVolume || 0;
              const obVol = simOBVolume || 0;
              const maxQuotaOB = coalVol * 3.0;
              const excessOB = obVol > maxQuotaOB ? (obVol - maxQuotaOB) : 0;
              const billableOB = isBGG ? Math.min(obVol, maxQuotaOB) : obVol;

              const rateCoal = isBGG ? 85000 : 95000;
              const rateOB = isBGG ? 32500 : 28000;
              const rfMultiplier = isBGG ? currentRF.rfIndexResult : 1.0;

              const coalAmount = coalVol * rateCoal;
              const obAmount = billableOB * rateOB * rfMultiplier;
              const grossAmount = coalAmount + obAmount;
              const ppn = grossAmount * 0.11;
              const pph23 = grossAmount * 0.02;
              const netReceipt = grossAmount + ppn - pph23;

              return (
                <div className="p-6 space-y-5 text-xs">
                  <div className="bg-cyan-50 border border-cyan-200 rounded-2xl p-4 space-y-1">
                    <h4 className="font-black uppercase tracking-wider text-cyan-950 flex items-center gap-1.5">
                      <Zap size={16} className="text-amber-600" /> Live Simulation Playground: Perhitungan Otomatis BA & Invoice ({selectedClientCode})
                    </h4>
                    <p className="text-slate-600 text-[11px]">
                      Masukkan volume hasil survei untuk memvalidasi alur kalkulasi, kuota SR 3:1, dan proyeksi nilai faktur invoice.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                        Volume Batubara / Nikel (Ton)
                      </label>
                      <input
                        type="number"
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono font-bold focus:border-cyan-700 outline-none"
                        value={simCoalVolume}
                        onChange={(e) => setSimCoalVolume(Number(e.target.value))}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                        Volume Overburden (BCM)
                      </label>
                      <input
                        type="number"
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono font-bold focus:border-cyan-700 outline-none"
                        value={simOBVolume}
                        onChange={(e) => setSimOBVolume(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <h5 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px]">1. Validasi Berita Acara & Rasio Kuota</h5>
                      <div className="flex justify-between"><span className="text-slate-500">Stripping Ratio (SR) Aktual:</span><strong className="font-mono">{(obVol / (coalVol || 1)).toFixed(2)} : 1</strong></div>
                      {isBGG && (
                        <>
                          <div className="flex justify-between"><span className="text-slate-500">Kapasitas Kuota Kontrak (3x):</span><strong className="font-mono text-cyan-900">{maxQuotaOB.toLocaleString("id-ID")} BCM</strong></div>
                          <div className="flex justify-between"><span className="text-slate-500">Volume OB Siap Ditagih:</span><strong className="font-mono text-emerald-800">{billableOB.toLocaleString("id-ID")} BCM</strong></div>
                          <div className="flex justify-between"><span className="text-slate-500">Alokasi Pending Volume:</span><strong className={`font-mono ${excessOB > 0 ? "text-amber-700 font-bold" : "text-slate-400"}`}>{excessOB > 0 ? `+${excessOB.toLocaleString("id-ID")} BCM (Carry-Over)` : "0 BCM"}</strong></div>
                        </>
                      )}
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <h5 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px]">2. Proyeksi Nominal Tagihan (Invoice)</h5>
                      <div className="flex justify-between"><span className="text-slate-500">Subtotal DPP (Gross):</span><strong className="font-mono text-slate-900">{formatIDR(grossAmount)}</strong></div>
                      <div className="flex justify-between"><span className="text-slate-500">PPN (11%):</span><strong className="font-mono text-emerald-700">+{formatIDR(ppn)}</strong></div>
                      <div className="flex justify-between"><span className="text-slate-500">PPh 23 (2% Kredit Pajak):</span><strong className="font-mono text-rose-700">-{formatIDR(pph23)}</strong></div>
                      <div className="flex justify-between border-t border-slate-300 pt-1.5 font-black text-sm bg-white p-2 rounded-xl border">
                        <span className="text-cyan-950">Estimasi Uang Masuk Bersih:</span>
                        <strong className="font-mono text-emerald-800">{formatIDR(netReceipt)}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* SOW MODAL (ADD / EDIT) */}
      {isSowModalOpen && editingSOW && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden p-6 space-y-4 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Layers className="text-cyan-700" size={16} /> {editingSOW.id ? "Edit Material SOW" : "Tambah Material SOW Baru"} ({selectedClientCode})
              </h3>
              <button
                type="button"
                onClick={() => setIsSowModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSOW} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  Kategori Pekerjaan <span className="text-rose-600">*</span>
                </label>
                <select
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold outline-none"
                  value={editingSOW.category}
                  onChange={(e) => setEditingSOW({ ...editingSOW, category: e.target.value })}
                >
                  <option value="Operating & Mining">Operating & Mining</option>
                  <option value="Mining">Mining</option>
                  <option value="MDO">Mine Development (MDO)</option>
                  <option value="Over Distance">Over Distance / Jarak Tambahan</option>
                  <option value="General">General Penunjang</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  Nama Material / Pekerjaan <span className="text-rose-600">*</span>
                </label>
                <input
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold outline-none"
                  placeholder="Contoh: Overburden Removal / Top Soil"
                  value={editingSOW.itemName}
                  onChange={(e) => setEditingSOW({ ...editingSOW, itemName: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Satuan Volume <span className="text-rose-600">*</span>
                  </label>
                  <select
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold outline-none"
                    value={editingSOW.unit}
                    onChange={(e) => setEditingSOW({ ...editingSOW, unit: e.target.value })}
                  >
                    <option value="BCM">BCM</option>
                    <option value="Ton">Ton</option>
                    <option value="LCM">LCM</option>
                    <option value="WMT">WMT</option>
                    <option value="Bcm.Hm">Bcm.Hm</option>
                    <option value="Meter">Meter</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Tarif Baseline (Rp) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono font-bold outline-none"
                    value={editingSOW.rateIDR || 0}
                    onChange={(e) => setEditingSOW({ ...editingSOW, rateIDR: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              {selectedClientCode === "BGG" && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <span className="text-[10px] font-black uppercase text-emerald-900 block">
                    Tarif Multi-Tier Batubara (Opsional untuk BGG)
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[9px] text-slate-500 font-bold">Tier 1 (≤$45)</label>
                      <input
                        type="number"
                        className="w-full bg-white border border-emerald-300 rounded p-1.5 text-xs font-mono"
                        value={editingSOW.tier1Rate || 0}
                        onChange={(e) => setEditingSOW({ ...editingSOW, tier1Rate: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 font-bold">Tier 2 ($45-$70)</label>
                      <input
                        type="number"
                        className="w-full bg-white border border-emerald-300 rounded p-1.5 text-xs font-mono"
                        value={editingSOW.tier2Rate || 0}
                        onChange={(e) => setEditingSOW({ ...editingSOW, tier2Rate: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 font-bold">Tier 3 (&gt;$70)</label>
                      <input
                        type="number"
                        className="w-full bg-white border border-emerald-300 rounded p-1.5 text-xs font-mono"
                        value={editingSOW.tier3Rate || 0}
                        onChange={(e) => setEditingSOW({ ...editingSOW, tier3Rate: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSowModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-700 hover:bg-cyan-800 text-white font-black rounded-xl text-xs shadow-sm cursor-pointer"
                >
                  Simpan Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

