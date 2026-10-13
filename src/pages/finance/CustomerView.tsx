import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, Pickaxe, Layers, Calculator, Zap, TrendingUp, Scale,
  Eye, Edit2, Trash2, Plus, RefreshCw, Save, DollarSign, Sliders,
  CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, Info, Check,
  ExternalLink, Loader2
} from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { api, getCompanies, type Company } from "../../lib/api";
import { formatIDR, getCustomerOfficialName } from "./helpers";
import { sowFor, obSplitSOWs, contractParams, rfTemplateFor, bankAccountForCustomer, baseDistanceFor } from "./masterRegistry";

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
    query, onNotice = () => {}, deletingKey, setDeletingKey
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
      const saved: any = await api("/api/master-data/variable-sow", {
        method: "POST",
        body: JSON.stringify(editingSOW)
      });
      onNotice(`Tarif material SOW [${editingSOW.itemName}] untuk ${selectedClientCode} berhasil disimpan.`);
      setIsSowModalOpen(false);
      // 🚀 Optimistic UI Update
      setSowList((prev) => {
        const targetId = editingSOW.id || saved?.id;
        const exists = prev.some((it) => (targetId && it.id === targetId) || (it.itemName === editingSOW.itemName && it.customerCode === editingSOW.customerCode));
        if (exists) {
          return prev.map((it) => ((targetId && it.id === targetId) || (it.itemName === editingSOW.itemName && it.customerCode === editingSOW.customerCode)) ? (saved || editingSOW) : it);
        }
        return [saved || editingSOW, ...prev];
      });
      setEditingSOW(null);
      await loadSetupData();
      if (c && typeof c.reloadMasterData === "function") {
        await c.reloadMasterData();
      }
    } catch (err: any) {
      onNotice(`Gagal menyimpan tarif SOW: ${err?.message}`);
    }
  };

  const handleDeleteSOW = async (id: number | string | undefined) => {
    if (!id) return;
    if (!window.confirm("Hapus item material SOW ini dari konfigurasi client?")) return;
    const key = `sow-${id}`;
    if (setDeletingKey) setDeletingKey(key);
    onNotice("⏳ Sedang menghapus item material SOW...");

    // 🚀 Optimistic UI Update
    setSowList((prev) => prev.filter((item) => String(item.id) !== String(id)));

    try {
      await api(`/api/master-data/variable-sow/${id}`, { method: "DELETE" });
      onNotice(`✅ Item material SOW berhasil dihapus.`);
      await loadSetupData();
      if (c && typeof c.reloadMasterData === "function") {
        await c.reloadMasterData();
      }
    } catch (err: any) {
      onNotice(`Gagal menghapus SOW: ${err?.message}`);
      await loadSetupData();
    } finally {
      if (setDeletingKey) setDeletingKey(null);
    }
  };

  // Coal Index details for BGG
  const latestCoal = coalIndices.length > 0 ? coalIndices[0] : {
    period: "-",
    avgIci3: 0,
    avgIci4: 0,
    avgR3: 0,
    activeTier: "",
    status: "Belum ada data Coal Index"
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
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-[3px] bg-[#A57C50] hover:bg-[#8e6941] text-white shadow-xs transition cursor-pointer"
            onClick={() => openCreateModal("customer")}
          >
            <Plus size={14} /> Tambah Customer Baru
          </button>
        </div>
      </div>

      {/* Main View Mode Selector Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => setViewMode("cards")}
          className={`pb-2.5 px-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
            viewMode === "cards"
              ? "border-b-2 border-[#A57C50] text-[#A57C50]"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Building2 size={15} />
          <span>Direktori & Profil Klien ({safeCustomerRows.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode("setup")}
          className={`pb-2.5 px-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
            viewMode === "setup"
              ? "border-b-2 border-[#A57C50] text-[#A57C50]"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Sliders size={15} />
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
                <div key={c.id} className="p-4 rounded-[4px] border border-slate-200 bg-white shadow-xs space-y-3 relative hover:border-slate-300 transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-[3px] tabular-nums">
                        {c.code}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-1.5">{c.fullName}</h3>
                      <p className="text-xs text-slate-500 font-medium">Grup: <span className="text-slate-800 font-bold">{c.groupParent || "-"}</span></p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Termin Hari</span>
                      <div className="text-sm font-bold text-amber-700 tabular-nums">{c.terminDays} Hari</div>
                    </div>
                  </div>

                  {/* Operational Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {isBGG && (
                      <>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-[3px] bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <TrendingUp size={11} /> Multi-Tier Coal Index
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-[3px] bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <Scale size={11} /> Quota SR 3:1 (Pending OB)
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-[3px] bg-slate-100 text-slate-800 border border-slate-200 flex items-center gap-1">
                          <Calculator size={11} /> Raise & Fall BBM
                        </span>
                      </>
                    )}
                    {isPOS && (
                      <>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-[3px] bg-[#A57C50]/10 text-[#A57C50] border border-[#A57C50]/30 flex items-center gap-1">
                          <Pickaxe size={11} /> Dual-Invoice (Mining & MDO)
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-[3px] bg-indigo-50 text-indigo-800 border border-indigo-200">
                          Nikel WM1
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-[3px] bg-slate-100 text-slate-700 border border-slate-200">
                          Overhaul 1.000m
                        </span>
                      </>
                    )}
                    {isDBK && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-[3px] bg-blue-50 text-blue-800 border border-blue-200">
                        Dual Currency USD/IDR (Petrosea)
                      </span>
                    )}
                    {isSBS && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-[3px] bg-purple-50 text-purple-800 border border-purple-200">
                        Batubara OB & Jasa Penunjang
                      </span>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-2.5 text-xs text-slate-700 space-y-1 font-medium">
                    <div><span className="text-slate-500 font-bold">No. Kontrak:</span> <span className="tabular-nums text-slate-800">{c.contractNo || "-"}</span></div>
                    <div><span className="text-slate-500 font-bold">Nilai Kontrak:</span> <span className="tabular-nums font-bold text-slate-900">{formatIDR(c.contractValue)}</span></div>
                    <div><span className="text-slate-500 font-bold">Kontak AR:</span> {c.contactAR} ({c.emailAR || "-"})</div>
                    <div><span className="text-slate-500 font-bold">Catatan:</span> {c.notes || "-"}</div>
                  </div>

                  <div className="flex flex-wrap justify-between items-center gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleOpenSetupForClient(c.code)}
                      className="text-xs font-bold text-slate-800 hover:text-[#A57C50] flex items-center gap-1.5 px-2.5 py-1.5 rounded-[3px] bg-slate-50 border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
                    >
                      <Sliders size={13} className="text-[#A57C50]" /> Setup SOW & Formula
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        className="text-xs font-bold text-slate-700 hover:text-[#A57C50] flex items-center gap-1 px-2.5 py-1 rounded-[3px] bg-slate-50 border border-slate-200 cursor-pointer"
                        onClick={() => setDetailViewItem({ type: "customer", data: c })}
                      >
                        <Eye size={13} /> View Audit
                      </button>
                      <button
                        className="text-xs font-bold text-slate-700 hover:text-[#A57C50] flex items-center gap-1 px-2.5 py-1 rounded-[3px] bg-slate-50 border border-slate-200 cursor-pointer"
                        onClick={() => openEditModal("customer", c)}
                      >
                        <Edit2 size={13} /> Edit
                      </button>
                      {(() => {
                        const isDeleting = deletingKey === `customer-${c.id}`;
                        return (
                          <button
                            disabled={isDeleting}
                            className={`text-xs font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1 px-2.5 py-1 rounded-[3px] bg-rose-50 border border-rose-200 cursor-pointer ${isDeleting ? "opacity-60 cursor-not-allowed" : ""}`}
                            onClick={() => handleDelete("customer", c.id)}
                          >
                            {isDeleting ? <Loader2 size={13} className="animate-spin text-rose-600" /> : <Trash2 size={13} />}
                            <span>{isDeleting ? "Menghapus..." : "Hapus"}</span>
                          </button>
                        );
                      })()}
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
                  className={`p-3 rounded-[4px] border text-left transition cursor-pointer ${
                    isActive
                      ? "bg-[#A57C50]/10 border-[#A57C50] shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs px-1.5 py-0.5 rounded-[3px] bg-slate-100 text-slate-900">{c.code}</span>
                    {isActive && <span className="text-[9px] font-bold uppercase text-[#A57C50] bg-[#A57C50]/15 px-1.5 py-0.5 rounded-[3px]">Aktif</span>}
                  </div>
                  <div className="font-bold text-xs text-slate-900 mt-1.5">
                    {`Site ${c.code} (${getCustomerOfficialName(c.code)})`}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Sub Tabs */}
          <div className="bg-white border border-slate-200 rounded-[4px] shadow-xs overflow-hidden">
            <div className="flex border-b border-slate-200 bg-slate-50/80 px-3 pt-2 gap-2 overflow-x-auto">
              <button
                onClick={() => setSetupSubTab("sow")}
                className={`px-3.5 py-2 font-bold text-xs rounded-t-[3px] transition flex items-center gap-1.5 cursor-pointer ${
                  setupSubTab === "sow"
                    ? "bg-white text-slate-900 border-t-2 border-[#A57C50] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Layers size={14} />
                <span>1. Katalog SOW & Tarif Material ({activeClientSOW.length})</span>
              </button>

              <button
                onClick={() => setSetupSubTab("formula")}
                className={`px-3.5 py-2 font-bold text-xs rounded-t-[3px] transition flex items-center gap-1.5 cursor-pointer ${
                  setupSubTab === "formula"
                    ? "bg-white text-slate-900 border-t-2 border-[#A57C50] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Calculator size={14} />
                <span>2. Formula Penagihan & Eskalasi Khusus</span>
              </button>

              <button
                onClick={() => setSetupSubTab("simulation")}
                className={`px-3.5 py-2 font-bold text-xs rounded-t-[3px] transition flex items-center gap-1.5 cursor-pointer ${
                  setupSubTab === "simulation"
                    ? "bg-white text-slate-900 border-t-2 border-[#A57C50] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Zap size={14} className="text-amber-500" />
                <span>3. Live Simulation Playground (BA & Invoice)</span>
              </button>
            </div>

            {/* SUB-TAB 1: SOW & MATERIAL RATES */}
            {setupSubTab === "sow" && (
              <div className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <Layers className="text-[#A57C50]" size={15} /> Katalog Scope of Work & Tarif: {selectedClientCode}
                    </h3>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Tarif acuan pekerjaan penambangan yang otomatis terisi saat membuat Berita Acara (BA) klien {selectedClientCode}.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
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
                      className="px-3 py-1.5 bg-[#A57C50] hover:bg-[#8e6941] text-white font-bold rounded-[3px] text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer shrink-0"
                    >
                      <Plus size={13} /> Tambah Material SOW
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/variable-sow")}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-[3px] text-xs flex items-center gap-1.5 transition border border-slate-300 cursor-pointer shrink-0"
                    >
                      <ExternalLink size={13} /> Master Global SOW
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-[4px] border border-slate-200">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">Kategori</th>
                        <th className="p-2.5">Nama Material / Pekerjaan</th>
                        <th className="p-2.5 text-center">Satuan</th>
                        <th className="p-2.5 text-right">Tarif Baseline (Rp)</th>
                        {selectedClientCode === "BGG" && (
                          <>
                            <th className="p-2.5 text-right">Tier 1 (R3 ≤ $45)</th>
                            <th className="p-2.5 text-right">Tier 2 ($45-$70)</th>
                            <th className="p-2.5 text-right">Tier 3 (R3 &gt; $70)</th>
                          </>
                        )}
                        <th className="p-2.5 text-center">Status</th>
                        <th className="p-2.5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {activeClientSOW.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-50/80 transition">
                          <td className="p-2.5 font-semibold text-slate-600">
                            <span className="px-2 py-0.5 rounded-[3px] bg-slate-100 border border-slate-200 text-[10px] font-bold">
                              {item.category}
                            </span>
                          </td>
                          <td className="p-2.5 font-bold text-slate-900">{item.itemName}</td>
                          <td className="p-2.5 text-center tabular-nums font-bold text-slate-700">{item.unit}</td>
                          <td className="p-2.5 text-right tabular-nums font-bold text-slate-900">{formatIDR(item.rateIDR)}</td>
                          {selectedClientCode === "BGG" && (
                            <>
                              <td className="p-2.5 text-right tabular-nums text-slate-800">{formatIDR(item.tier1Rate || item.rateIDR)}</td>
                              <td className="p-2.5 text-right tabular-nums text-emerald-800 font-bold">{formatIDR(item.tier2Rate || item.rateIDR)}</td>
                              <td className="p-2.5 text-right tabular-nums text-purple-800 font-bold">{formatIDR(item.tier3Rate || item.rateIDR)}</td>
                            </>
                          )}
                          <td className="p-2.5 text-center">
                            <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              {item.status || "Active"}
                            </span>
                          </td>
                          <td className="p-2.5 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSOW(item);
                                  setIsSowModalOpen(true);
                                }}
                                className="p-1 rounded-[3px] text-slate-600 hover:text-[#A57C50] hover:bg-slate-100 transition cursor-pointer"
                                title="Edit Tarif"
                              >
                                <Edit2 size={13} />
                              </button>
                              {(() => {
                                const isDeleting = deletingKey === `sow-${item.id}`;
                                return (
                                  <button
                                    type="button"
                                    disabled={isDeleting}
                                    onClick={() => handleDeleteSOW(item.id)}
                                    className={`p-1 rounded-[3px] text-rose-600 hover:bg-rose-50 transition cursor-pointer ${isDeleting ? "opacity-60 cursor-not-allowed" : ""}`}
                                    title="Hapus"
                                  >
                                    {isDeleting ? <Loader2 size={13} className="animate-spin text-rose-600" /> : <Trash2 size={13} />}
                                  </button>
                                );
                              })()}
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
              <div className="p-5 space-y-5">
                {selectedClientCode === "POS" ? (
                  <div className="space-y-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-[4px] p-4 space-y-2 text-xs text-slate-800">
                      <h4 className="font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                        <Pickaxe size={15} className="text-[#A57C50]" /> Aturan Khusus Penagihan: Site POS (Nikel)
                      </h4>
                      <p className="text-slate-600">
                        Site POS menggunakan skema <strong>Dual-Invoice Separation</strong>. Setiap Berita Acara yang disetujui menghasilkan 2 draft faktur tagihan:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div className="bg-white p-3 rounded-[4px] border border-slate-200 shadow-xs">
                          <strong className="block text-slate-900 font-bold">Faktur 1: Operation & Mining</strong>
                          <span className="text-[11px] text-slate-600">Top Soil, Limonite, Saprolite, Waste, dan Overhaul Distance.</span>
                        </div>
                        <div className="bg-white p-3 rounded-[4px] border border-slate-200 shadow-xs">
                          <strong className="block text-indigo-900 font-bold">Faktur 2: Mine Development (MDO)</strong>
                          <span className="text-[11px] text-slate-600">Land Clearing, Grubbing, Hauling Road Construction, dan Water Management.</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-[4px] space-y-2">
                        <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Parameter Overhaul Jarak Jauh</h5>
                        <div className="flex justify-between"><span className="text-slate-500">Jarak Dasar:</span><strong className="tabular-nums">{baseDistanceFor(selectedClientCode, "OB/Waste - over/underhaul").toLocaleString("id-ID")} Meter</strong></div>
                        <div className="flex justify-between"><span className="text-slate-500">Penyesuaian Jarak:</span><strong className="tabular-nums text-slate-900">USD {Number(sowFor(selectedClientCode, "OB/Waste - over/underhaul")?.rateUSD || 0).toLocaleString("id-ID", { maximumFractionDigits: 3 })} / {sowFor(selectedClientCode, "OB/Waste - over/underhaul")?.unit || "-"}</strong></div>
                      </div>
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-[4px] space-y-2">
                        <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Pajak & Rekening Default</h5>
                        <div className="flex justify-between"><span className="text-slate-500">PPN / PPh 23:</span><strong>11% / 2%</strong></div>
                        <div className="flex justify-between"><span className="text-slate-500">Bank AAP:</span><strong>{bankAccountForCustomer(selectedClientCode) ? `${bankAccountForCustomer(selectedClientCode).bankName} (A/C ${bankAccountForCustomer(selectedClientCode).accountNo})` : "Belum diatur di Master Customer"}</strong></div>
                      </div>
                    </div>
                  </div>
                ) : selectedClientCode === "BGG" ? (
                  <div className="space-y-4 text-xs">
                    {(() => {
                      const activeTierComputed = latestCoal.activeTier || "";
                      return (
                        <div className="bg-emerald-50/60 border border-emerald-200 rounded-[4px] p-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <h4 className="font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                              <TrendingUp size={15} className="text-emerald-700" /> Multi-Tier Coal Indexing Engine (BGG Batubara)
                            </h4>
                            <span className="px-2.5 py-0.5 rounded-[3px] text-[11px] font-bold bg-emerald-200 text-emerald-900 border border-emerald-400">
                              Tier Aktif: {activeTierComputed} (R3 Avg: ${latestCoal.avgR3.toFixed(2)})
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className={`p-3 rounded-[4px] border ${activeTierComputed === "Tier 1" ? "bg-emerald-100 border-emerald-400 font-bold" : "bg-white border-slate-200"}`}>
                              <span className={`text-[10px] uppercase block ${activeTierComputed === "Tier 1" ? "text-emerald-800 font-bold" : "text-slate-500"}`}>
                                Tier 1 (R3 ≤ $45) {activeTierComputed === "Tier 1" ? "(AKTIF)" : ""}
                              </span>
                              <strong className="text-xs font-bold text-slate-900">Tarif OB 1: {formatIDR(obSplitSOWs(selectedClientCode)[0]?.tier1Rate || 0)} / BCM</strong>
                              <p className="text-[10px] text-slate-600 mt-1">Tarif OB 2: {formatIDR(obSplitSOWs(selectedClientCode)[1]?.tier1Rate || 0)} / BCM</p>
                            </div>
                            <div className={`p-3 rounded-[4px] border ${activeTierComputed === "Tier 2" ? "bg-emerald-100 border-emerald-400 font-bold" : "bg-white border-slate-200"}`}>
                              <span className={`text-[10px] uppercase block ${activeTierComputed === "Tier 2" ? "text-emerald-800 font-bold" : "text-slate-500"}`}>
                                Tier 2 ($45-$70) {activeTierComputed === "Tier 2" ? "(AKTIF)" : ""}
                              </span>
                              <strong className="text-xs font-bold text-slate-900">Tarif OB 1: {formatIDR(obSplitSOWs(selectedClientCode)[0]?.tier2Rate || 0)} / BCM</strong>
                              <p className="text-[10px] text-slate-600 mt-1">Tarif OB 2: {formatIDR(obSplitSOWs(selectedClientCode)[1]?.tier2Rate || 0)} / BCM</p>
                            </div>
                            <div className={`p-3 rounded-[4px] border ${activeTierComputed === "Tier 3" ? "bg-emerald-100 border-emerald-400 font-bold" : "bg-white border-slate-200"}`}>
                              <span className={`text-[10px] uppercase block ${activeTierComputed === "Tier 3" ? "text-emerald-800 font-bold" : "text-slate-500"}`}>
                                Tier 3 (R3 &gt; $70) {activeTierComputed === "Tier 3" ? "(AKTIF)" : ""}
                              </span>
                              <strong className="text-xs font-bold text-slate-900">Tarif OB 1: {formatIDR(obSplitSOWs(selectedClientCode)[0]?.tier3Rate || 0)} / BCM</strong>
                              <p className="text-[10px] text-slate-600 mt-1">Tarif OB 2: {formatIDR(obSplitSOWs(selectedClientCode)[1]?.tier3Rate || 0)} / BCM</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-[4px] space-y-1.5">
                      <h4 className="font-bold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                        <Scale size={15} className="text-amber-700" /> Kontrak Batas Kuota Stripping Ratio (Maks. {contractParams(selectedClientCode).maxStrippingRatio} : 1)
                      </h4>
                      <p className="text-slate-700 text-[11px]">
                        Volume OB yang dapat ditagihkan langsung dibatasi sebesar <strong>{contractParams(selectedClientCode).maxStrippingRatio}x Volume Batubara (Ton)</strong>. Kelebihan volume survei OB dicatat ke <strong>Pending Volume Ledger (Carry-Forward)</strong> dan dialokasikan secara manual oleh Finance Site.
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-[4px] space-y-2">
                      <h4 className="font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                        <Calculator size={15} className="text-[#A57C50]" /> Formula Eskalasi Raise & Fall: 1-Faktor BBM Murni (BGG)
                      </h4>
                      <div className="p-2 bg-white border border-slate-200 rounded-[3px] font-mono text-[11px] text-slate-800">
                        <code>Index = {Number(rfTemplateFor(selectedClientCode)?.weightFixedC || 0).toLocaleString("id-ID")} + {Number(rfTemplateFor(selectedClientCode)?.weightFuelA || 0).toLocaleString("id-ID")} × (Fn / Fo)</code>
                        <span className="text-slate-500 font-sans ml-2 text-[10px]">(Tanpa komponen Upah/Labor & tanpa faktor kurs)</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                        <div><span className="text-slate-500 font-bold">Base Fuel (Fo):</span> <strong className="tabular-nums">{formatIDR(rfTemplateFor(selectedClientCode)?.baseFuelFo || 0)} / Liter</strong></div>
                        <div><span className="text-slate-500 font-bold">Aktual Fuel (Fn):</span> <strong className="tabular-nums">{formatIDR(rfTemplateFor(selectedClientCode)?.actualFuelFn || 0, 2)} ({rfTemplateFor(selectedClientCode)?.period || "-"})</strong></div>
                        <div><span className="text-slate-500 font-bold">Faktor Pengali RF:</span> <strong className="tabular-nums text-emerald-800">{Number(rfTemplateFor(selectedClientCode)?.rfIndexResult || 1).toFixed(3)}x</strong></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-[4px] text-center text-slate-500 text-xs italic">
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
                <div className="p-5 space-y-4 text-xs">
                  <div className="bg-slate-50 border border-slate-200 rounded-[4px] p-3.5 space-y-1">
                    <h4 className="font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <Zap size={15} className="text-amber-600" /> Live Simulation Playground: Perhitungan Otomatis BA & Invoice ({selectedClientCode})
                    </h4>
                    <p className="text-slate-600 text-[11px]">
                      Masukkan volume hasil survei untuk memvalidasi alur kalkulasi, kuota SR 3:1, dan proyeksi nilai faktur invoice.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Volume Batubara / Nikel (Ton)
                      </label>
                      <input
                        type="number"
                        className="w-full bg-white border border-slate-300 rounded-[3px] p-2 text-slate-900 tabular-nums font-bold focus:border-[#A57C50] outline-none"
                        value={simCoalVolume}
                        onChange={(e) => setSimCoalVolume(Number(e.target.value))}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Volume Overburden (BCM)
                      </label>
                      <input
                        type="number"
                        className="w-full bg-white border border-slate-300 rounded-[3px] p-2 text-slate-900 tabular-nums font-bold focus:border-[#A57C50] outline-none"
                        value={simOBVolume}
                        onChange={(e) => setSimOBVolume(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-[4px] space-y-2">
                      <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">1. Validasi Berita Acara & Rasio Kuota</h5>
                      <div className="flex justify-between"><span className="text-slate-500">Stripping Ratio (SR) Aktual:</span><strong className="tabular-nums">{(obVol / (coalVol || 1)).toFixed(2)} : 1</strong></div>
                      {isBGG && (
                        <>
                          <div className="flex justify-between"><span className="text-slate-500">Kapasitas Kuota Kontrak (3x):</span><strong className="tabular-nums text-slate-900">{maxQuotaOB.toLocaleString("id-ID")} BCM</strong></div>
                          <div className="flex justify-between"><span className="text-slate-500">Volume OB Siap Ditagih:</span><strong className="tabular-nums text-emerald-800">{billableOB.toLocaleString("id-ID")} BCM</strong></div>
                          <div className="flex justify-between"><span className="text-slate-500">Alokasi Pending Volume:</span><strong className={`tabular-nums ${excessOB > 0 ? "text-amber-700 font-bold" : "text-slate-400"}`}>{excessOB > 0 ? `+${excessOB.toLocaleString("id-ID")} BCM (Carry-Over)` : "0 BCM"}</strong></div>
                        </>
                      )}
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-[4px] space-y-2">
                      <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">2. Proyeksi Nominal Tagihan (Invoice)</h5>
                      <div className="flex justify-between"><span className="text-slate-500">Subtotal DPP (Gross):</span><strong className="tabular-nums text-slate-900">{formatIDR(grossAmount)}</strong></div>
                      <div className="flex justify-between"><span className="text-slate-500">PPN (11%):</span><strong className="tabular-nums text-emerald-700">+{formatIDR(ppn)}</strong></div>
                      <div className="flex justify-between"><span className="text-slate-500">PPh 23 (2% Kredit Pajak):</span><strong className="tabular-nums text-rose-700">-{formatIDR(pph23)}</strong></div>
                      <div className="flex justify-between border-t border-slate-300 pt-1.5 font-bold text-sm bg-white p-2 rounded-[3px] border">
                        <span className="text-slate-900">Estimasi Uang Masuk Bersih:</span>
                        <strong className="tabular-nums text-emerald-800">{formatIDR(netReceipt)}</strong>
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
          <div className="bg-white rounded-[4px] border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden p-5 space-y-4 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Layers className="text-[#A57C50]" size={15} /> {editingSOW.id ? "Edit Material SOW" : "Tambah Material SOW Baru"} ({selectedClientCode})
              </h3>
              <button
                type="button"
                onClick={() => setIsSowModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-[3px] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSOW} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Kategori Pekerjaan <span className="text-rose-600">*</span>
                </label>
                <select
                  className="w-full bg-white border border-slate-300 rounded-[3px] p-2 text-slate-900 font-bold outline-none"
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Nama Material / Pekerjaan <span className="text-rose-600">*</span>
                </label>
                <input
                  className="w-full bg-white border border-slate-300 rounded-[3px] p-2 text-slate-900 font-bold outline-none"
                  placeholder="Contoh: Overburden Removal / Top Soil"
                  value={editingSOW.itemName}
                  onChange={(e) => setEditingSOW({ ...editingSOW, itemName: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Satuan Volume <span className="text-rose-600">*</span>
                  </label>
                  <select
                    className="w-full bg-white border border-slate-300 rounded-[3px] p-2 text-slate-900 font-bold outline-none"
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
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Tarif Baseline (Rp) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    className="w-full bg-white border border-slate-300 rounded-[3px] p-2 text-slate-900 tabular-nums font-bold outline-none"
                    value={editingSOW.rateIDR || 0}
                    onChange={(e) => setEditingSOW({ ...editingSOW, rateIDR: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              {selectedClientCode === "BGG" && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-[4px] space-y-2">
                  <span className="text-[10px] font-bold uppercase text-emerald-900 block">
                    Tarif Multi-Tier Batubara (Opsional untuk BGG)
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[9px] text-slate-500 font-bold">Tier 1 (≤$45)</label>
                      <input
                        type="number"
                        className="w-full bg-white border border-emerald-300 rounded-[3px] p-1.5 text-xs tabular-nums"
                        value={editingSOW.tier1Rate || 0}
                        onChange={(e) => setEditingSOW({ ...editingSOW, tier1Rate: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 font-bold">Tier 2 ($45-$70)</label>
                      <input
                        type="number"
                        className="w-full bg-white border border-emerald-300 rounded-[3px] p-1.5 text-xs tabular-nums"
                        value={editingSOW.tier2Rate || 0}
                        onChange={(e) => setEditingSOW({ ...editingSOW, tier2Rate: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 font-bold">Tier 3 (&gt;$70)</label>
                      <input
                        type="number"
                        className="w-full bg-white border border-emerald-300 rounded-[3px] p-1.5 text-xs tabular-nums"
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
                  className="px-3.5 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-[3px] text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#A57C50] hover:bg-[#8e6941] text-white font-bold rounded-[3px] text-xs shadow-xs cursor-pointer"
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

