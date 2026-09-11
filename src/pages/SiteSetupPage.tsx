import React, { useState, useEffect } from "react";
import {
  Building2,
  Pickaxe,
  FileText,
  Sliders,
  DollarSign,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Scale,
  TrendingUp,
  RefreshCw,
  Landmark,
  Save,
  Calculator,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info
} from "lucide-react";
import { api, type User } from "../lib/api";

interface CustomerData {
  id?: number;
  code: string;
  fullName: string;
  groupParent?: string;
  projectSite?: string;
  terminDays: number;
  contactAR?: string;
  emailAR?: string;
  phone?: string;
  contractNo?: string;
  contractValue?: number;
  notes?: string;
}

interface SOWItem {
  id?: number | string;
  customerCode: string;
  category: string; // "Operating & Mining", "MDO", "Over Distance", etc.
  itemName: string;
  unit: string;
  rateIDR: number;
  rateUSD?: number;
  tier1Rate?: number;
  tier2Rate?: number;
  tier3Rate?: number;
  baseDistanceMeters?: number;
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

const DEFAULT_POS_CUSTOMER: CustomerData = {
  code: "POS",
  fullName: "PT Position",
  groupParent: "Paramitha Group",
  projectSite: "Site WM1 / Pit Nikel",
  terminDays: 30,
  contactAR: "Bpk. Ronald (Finance Site Paramitha)",
  emailAR: "finance@paramitha.co.id",
  phone: "+62 21 5790 1234",
  contractNo: "018/PBP-AAP/OPS-NIKEL/2025",
  contractValue: 45000000000,
  notes: "Dual Invoice Scheme (Kategori 1: Operation & Mining, Kategori 2: MDO). Tagihan diterbitkan terpisah per BA.",
};

const DEFAULT_BGG_CUSTOMER: CustomerData = {
  code: "BGG",
  fullName: "PT Budi Gema Gempita",
  groupParent: "Petrindo Jaya Kreasi Tbk",
  projectSite: "Pit KKL / Muara Enim",
  terminDays: 30,
  contactAR: "Bpk. Hendra (AR Finance BGG)",
  emailAR: "ar@bgg.co.id",
  phone: "+62 21 555 0192",
  contractNo: "09/BGG-AAP/VIII/2018",
  contractValue: 120000000000,
  notes: "Multi-Tier Coal Indexing (Tier 1/2/3) berdasarkan R3 bulanan. Stripping Ratio Quota maksimal 3.0 : 1 dengan Pending Volume carry-over.",
};

export function SiteSetupPage({
  viewTitle = "Setup Parameter Site & Klien",
  onNotice = () => {},
  user
}: {
  viewTitle?: string;
  query?: string;
  onNotice?: (msg: string) => void;
  user?: User | null;
}) {
  const [activeSite, setActiveSite] = useState<"POS" | "BGG">("POS");
  const [activeTab, setActiveTab] = useState<"profile" | "sow" | "formula" | "simulation">("profile");

  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [sowItems, setSowItems] = useState<SOWItem[]>([]);
  const [coalIndices, setCoalIndices] = useState<CoalIndexData[]>([]);
  const [raiseFalls, setRaiseFalls] = useState<RaiseFallData[]>([]);

  // Current working customer profile
  const [currentCustomer, setCurrentCustomer] = useState<CustomerData>(DEFAULT_POS_CUSTOMER);

  // SOW Modal state
  const [editingSOW, setEditingSOW] = useState<SOWItem | null>(null);
  const [isSowModalOpen, setIsSowModalOpen] = useState(false);

  // Simulation Playground State
  const [simCoalVolume, setSimCoalVolume] = useState<number>(20000);
  const [simOBVolume, setSimOBVolume] = useState<number>(65000);
  const [simDistance, setSimDistance] = useState<number>(1400);

  // Load all configurations
  const loadData = async () => {
    setLoading(true);
    try {
      const [custRes, sowRes, coalRes, rfRes] = await Promise.allSettled([
        api<CustomerData[]>("/api/finance/customers"),
        api<SOWItem[]>("/api/master-data/variable-sow"),
        api<CoalIndexData[]>("/api/master-data/coal-index"),
        api<RaiseFallData[]>("/api/master-data/raise-fall")
      ]);

      if (custRes.status === "fulfilled" && Array.isArray(custRes.value)) {
        setCustomers(custRes.value);
      }
      if (sowRes.status === "fulfilled" && Array.isArray(sowRes.value)) {
        setSowItems(sowRes.value);
      }
      if (coalRes.status === "fulfilled" && Array.isArray(coalRes.value)) {
        setCoalIndices(coalRes.value);
      }
      if (rfRes.status === "fulfilled" && Array.isArray(rfRes.value)) {
        setRaiseFalls(rfRes.value);
      }
    } catch (err: any) {
      console.warn("Failed to load site setup data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update currentCustomer when activeSite or customers change
  useEffect(() => {
    const found = customers.find((c) => c.code.toUpperCase() === activeSite);
    if (found) {
      setCurrentCustomer(found);
    } else {
      setCurrentCustomer(activeSite === "POS" ? DEFAULT_POS_CUSTOMER : DEFAULT_BGG_CUSTOMER);
    }
  }, [activeSite, customers]);

  // Save Customer Profile
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api("/api/finance/customers", {
        method: "POST",
        body: JSON.stringify(currentCustomer)
      });
      onNotice(`Profil & aturan kontrak Site ${activeSite} berhasil diperbarui.`);
      await loadData();
    } catch (err: any) {
      onNotice(`Gagal menyimpan profil site: ${err?.message}`);
    }
  };

  // Save SOW Item
  const handleSaveSOW = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSOW) return;
    try {
      await api("/api/master-data/variable-sow", {
        method: "POST",
        body: JSON.stringify(editingSOW)
      });
      onNotice(`Tarif material SOW [${editingSOW.itemName}] untuk Site ${activeSite} berhasil disimpan.`);
      setIsSowModalOpen(false);
      setEditingSOW(null);
      await loadData();
    } catch (err: any) {
      onNotice(`Gagal menyimpan tarif SOW: ${err?.message}`);
    }
  };

  const handleDeleteSOW = async (id: number | string | undefined) => {
    if (!id) return;
    if (!window.confirm("Hapus item material SOW ini dari konfigurasi site?")) return;
    // 🚀 Optimistic UI Update
    setSowItems((prev) => prev.filter((item) => String(item.id) !== String(id)));
    try {
      await api(`/api/master-data/variable-sow/${id}`, { method: "DELETE" });
      onNotice(`Item material SOW berhasil dihapus.`);
      await loadData();
    } catch (err: any) {
      onNotice(`Gagal menghapus SOW: ${err?.message}`);
      await loadData();
    }
  };

  // Filter SOW for active site
  const siteSOWItems = sowItems.filter((it) => {
    const c = (it.customerCode || "").toUpperCase();
    return c === activeSite || (activeSite === "POS" && c.includes("POS")) || (activeSite === "BGG" && c.includes("BGG"));
  });

  // Current BGG Active Coal Index & Tier
  const latestCoal = coalIndices.length > 0 ? coalIndices[0] : {
    period: "Jul-26",
    avgIci3: 65.4,
    avgIci4: 48.2,
    avgR3: 52.8,
    activeTier: "Tier 2",
    status: "Verified"
  };

  // Current BGG Raise & Fall data
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

  // Helper IDR format
  const formatIDR = (val: number = 0) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
  };

  const setupTabs = [
    { id: "profile", label: "1. Profil & Kontrak Klien", icon: Building2 },
    { id: "sow", label: `2. Katalog SOW & Tarif Material (${siteSOWItems.length})`, icon: Layers },
    { id: "formula", label: "3. Formula Penagihan & Eskalasi Khusus", icon: Calculator },
    { id: "simulation", label: "4. Simulasi BA & Kalkulasi Invoice", icon: Zap },
  ];

  return (
    <div className="space-y-4">
      {/* Top Site Selector Grid — Enterprise Clean */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* POS Site Card */}
        <button
          type="button"
          onClick={() => setActiveSite("POS")}
          className={`p-4 bg-white border text-left transition-all duration-140 cursor-pointer relative ${
            activeSite === "POS"
              ? "border-[#A57C50] ring-1 ring-[#A57C50] shadow-sm bg-[#FBF6F0]/40"
              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
          }`}
          style={{ borderRadius: 4 }}
        >
          <div className="flex justify-between items-start">
            <span className="px-2 py-0.5 rounded-[3px] bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200">POS</span>
            {activeSite === "POS" && (
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-[3px] bg-[#A57C50] text-white">
                Aktif Dipilih
              </span>
            )}
          </div>
          <h3 className="font-bold text-slate-900 text-sm mt-2">Site POS (Paramitha)</h3>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">Komoditas: Nikel (WM1)</p>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold text-[#8C6740]">
            <Pickaxe className="w-3.5 h-3.5 text-[#A57C50]" /> Dual Invoice (Mining & MDO)
          </div>
        </button>

        {/* BGG Site Card */}
        <button
          type="button"
          onClick={() => setActiveSite("BGG")}
          className={`p-4 bg-white border text-left transition-all duration-140 cursor-pointer relative ${
            activeSite === "BGG"
              ? "border-[#2E7D53] ring-1 ring-[#2E7D53] shadow-sm bg-emerald-50/30"
              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
          }`}
          style={{ borderRadius: 4 }}
        >
          <div className="flex justify-between items-start">
            <span className="px-2 py-0.5 rounded-[3px] bg-emerald-50 text-emerald-900 font-bold text-xs border border-emerald-200">BGG</span>
            {activeSite === "BGG" && (
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-[3px] bg-[#2E7D53] text-white">
                Aktif Dipilih
              </span>
            )}
          </div>
          <h3 className="font-bold text-slate-900 text-sm mt-2">Site BGG (Budi Gema Gempita)</h3>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">Komoditas: Batubara (Pit KKL)</p>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-700" /> Multi-Tier Coal Index & SR 3:1 Quota
          </div>
        </button>

        {/* PTRO Site Card (Petrosea) */}
        <div className="p-4 bg-white border border-slate-200 opacity-70 text-left" style={{ borderRadius: 4 }}>
          <div className="flex justify-between items-start">
            <span className="px-2 py-0.5 rounded-[3px] bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200">PTRO</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-[3px] bg-slate-100 text-slate-500 border border-slate-200">Terjadwal</span>
          </div>
          <h3 className="font-bold text-slate-700 text-sm mt-2">Site PTRO (PT Petrosea)</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Komoditas: Batubara (Dual Currency USD/IDR)</p>
        </div>

        {/* SBS Site Card */}
        <div className="p-4 bg-white border border-slate-200 opacity-70 text-left" style={{ borderRadius: 4 }}>
          <div className="flex justify-between items-start">
            <span className="px-2 py-0.5 rounded-[3px] bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200">SBS</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-[3px] bg-slate-100 text-slate-500 border border-slate-200">Terjadwal</span>
          </div>
          <h3 className="font-bold text-slate-700 text-sm mt-2">Site SBS (Satria Bahana Sarana)</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Komoditas: Batubara (OB & Jasa Penunjang)</p>
        </div>
      </div>

      {/* TABBED INTERFACE PER SITE — FEAST Enterprise Tab Bar */}
      <div className="bg-white border border-slate-200 shadow-sm overflow-hidden" style={{ borderRadius: 4 }}>
        {/* Navigation Sub-Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-3 gap-1 overflow-x-auto">
          {setupTabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as any)}
                className={`px-4 py-2.5 font-semibold text-xs border-t border-l border-r transition-all flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? "bg-white text-slate-900 border-slate-200 -mb-px z-10 shadow-sm"
                    : "bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-900 hover:bg-slate-100"
                }`}
                style={{ borderRadius: "4px 4px 0 0" }}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#A57C50]" : "text-slate-400"}`} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: PROFIL & KONTRAK */}
        {activeTab === "profile" && (
          <form onSubmit={handleSaveCustomer} className="p-6 space-y-5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="text-[#A57C50] w-4 h-4" /> Profil Identitas & Legalitas Kontrak: Site {activeSite}
                </h3>
                <p className="text-slate-500 text-[11px] mt-0.5">Informasi ini otomatis mengisi kop dokumen BA, invoice, dan batas credit terms.</p>
              </div>
              <button
                type="submit"
                className="px-4 py-2 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition hover:brightness-95 cursor-pointer"
                style={{ background: "#A57C50", borderRadius: 3 }}
              >
                <Save className="w-3.5 h-3.5" /> Simpan Perubahan Profil
              </button>
            </div>


            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Kode Customer</label>
                <input
                  className="w-full bg-slate-100 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-black uppercase outline-none"
                  value={currentCustomer.code}
                  disabled
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Nama Lengkap Perusahaan</label>
                <input
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:border-cyan-700 outline-none"
                  value={currentCustomer.fullName}
                  onChange={(e) => setCurrentCustomer({ ...currentCustomer, fullName: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Induk Perusahaan (Group)</label>
                <input
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-medium focus:border-cyan-700 outline-none"
                  value={currentCustomer.groupParent || ""}
                  onChange={(e) => setCurrentCustomer({ ...currentCustomer, groupParent: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Lokasi Proyek / Pit</label>
                <input
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-medium focus:border-cyan-700 outline-none"
                  value={currentCustomer.projectSite || ""}
                  onChange={(e) => setCurrentCustomer({ ...currentCustomer, projectSite: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Credit Terms (Termin Hari Jatuh Tempo)</label>
                <div className="relative">
                  <input
                    type="number"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono font-black focus:border-cyan-700 outline-none"
                    value={currentCustomer.terminDays || 30}
                    onChange={(e) => setCurrentCustomer({ ...currentCustomer, terminDays: Number(e.target.value) })}
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">Hari</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Nomor Kontrak Kerja Sama</label>
                <input
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono font-bold focus:border-cyan-700 outline-none"
                  value={currentCustomer.contractNo || ""}
                  onChange={(e) => setCurrentCustomer({ ...currentCustomer, contractNo: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Nilai Plafon Kontrak (Rp)</label>
                <input
                  type="number"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono font-bold focus:border-cyan-700 outline-none"
                  value={currentCustomer.contractValue || 0}
                  onChange={(e) => setCurrentCustomer({ ...currentCustomer, contractValue: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">PIC Penagihan (AR Client)</label>
                <input
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 outline-none"
                  value={currentCustomer.contactAR || ""}
                  onChange={(e) => setCurrentCustomer({ ...currentCustomer, contactAR: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Email Penagihan</label>
                <input
                  type="email"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 outline-none"
                  value={currentCustomer.emailAR || ""}
                  onChange={(e) => setCurrentCustomer({ ...currentCustomer, emailAR: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Telepon / WhatsApp</label>
                <input
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 outline-none"
                  value={currentCustomer.phone || ""}
                  onChange={(e) => setCurrentCustomer({ ...currentCustomer, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Catatan Khusus Kontrak</label>
              <textarea
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 text-xs focus:border-cyan-700 outline-none"
                rows={2}
                value={currentCustomer.notes || ""}
                onChange={(e) => setCurrentCustomer({ ...currentCustomer, notes: e.target.value })}
              />
            </div>
          </form>
        )}

        {/* TAB 2: KATALOG SOW & TARIF */}
        {activeTab === "sow" && (
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Layers className="text-cyan-700" size={18} /> Katalog Scope of Work & Tarif: Site {activeSite}
                </h3>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Daftar material dan tarif acuan penambangan yang otomatis ditarik ke dalam formulir Berita Acara (BA).
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingSOW({
                    customerCode: activeSite,
                    category: activeSite === "POS" ? "Operating & Mining" : "Mining",
                    itemName: "",
                    unit: "BCM",
                    rateIDR: 0,
                    status: "Active"
                  });
                  setIsSowModalOpen(true);
                }}
                className="px-3 py-1.5 bg-[#A57C50] hover:bg-[#8e6941] text-white font-bold rounded-[3px] text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer shrink-0"
              >
                <Plus size={13} /> Tambah Material SOW Baru
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
                    {activeSite === "BGG" && (
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
                  {siteSOWItems.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 font-semibold text-slate-600">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-bold">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-900">{item.itemName}</td>
                      <td className="p-3 text-center font-mono font-bold text-slate-700">{item.unit}</td>
                      <td className="p-3 text-right font-mono font-black text-slate-900">{formatIDR(item.rateIDR)}</td>
                      {activeSite === "BGG" && (
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
                  {siteSOWItems.length === 0 && (
                    <tr>
                      <td colSpan={activeSite === "BGG" ? 8 : 5} className="p-6 text-center text-slate-400 italic">
                        Belum ada data katalog material SOW untuk {activeSite}. Klik tombol Tambah untuk membuat baru.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: FORMULA & ATURAN PENAGIHAN KHUSUS SITE */}
        {activeTab === "formula" && (
          <div className="p-6 space-y-6">
            {activeSite === "POS" ? (
              /* POS FORMULA & RULES */
              <div className="space-y-5">
                <div className="bg-cyan-50 border border-cyan-200 rounded-2xl p-4 space-y-2 text-xs text-cyan-950">
                  <h4 className="font-black uppercase tracking-wider text-cyan-900 flex items-center gap-1.5">
                    <Pickaxe size={16} /> Aturan Khusus Penagihan: Site POS (Nikel)
                  </h4>
                  <p className="text-slate-700">
                    Site POS menggunakan skema <strong>Dual-Invoice Separation</strong>. Setiap Berita Acara yang diterbitkan akan menghasilkan 2 draft faktur tagihan terpisah:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="bg-white p-3 rounded-xl border border-cyan-200 shadow-xs">
                      <strong className="block text-cyan-900 font-extrabold">Faktur 1: Operation & Mining</strong>
                      <span className="text-[11px] text-slate-600">Mencakup Top Soil, Limonite, Saprolite, Waste, dan Overhaul Distance.</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-indigo-200 shadow-xs">
                      <strong className="block text-indigo-900 font-extrabold">Faktur 2: Mine Development (MDO)</strong>
                      <span className="text-[11px] text-slate-600">Mencakup Land Clearing, Grubbing, Hauling Road Construction, dan Water Management.</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <h5 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px]">Parameter Overhaul Jarak Jauh</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Jarak Dasar Kontrak:</span>
                        <strong className="font-mono">1.000 Meter</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Satuan Penyesuaian:</span>
                        <strong className="font-mono">Per Kelipatan 100 Meter</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Rumus Subtotal:</span>
                        <code className="text-cyan-800 font-bold bg-cyan-100/50 px-1.5 py-0.5 rounded">
                          Vol * ((Jarak - 1000) / 100) * Rate
                        </code>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <h5 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px]">Ketentuan Pajak & Bank Default</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tarif PPN:</span>
                        <strong className="text-emerald-800">11% (atau 12%)</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tarif PPh 23:</span>
                        <strong className="text-rose-800">2.0% (Kredit Pajak)</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Rekening Penerima Default:</span>
                        <strong className="text-slate-900">Bank BNI (A/C 8188788882)</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* BGG FORMULA & RULES */
              <div className="space-y-5">
                {/* 1. Coal Index Live Tiering */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <h4 className="font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                      <TrendingUp size={16} className="text-emerald-700" /> Multi-Tier Coal Indexing Engine (BGG Batubara)
                    </h4>
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-200 text-emerald-900 border border-emerald-400">
                      Tier Aktif: {latestCoal.activeTier} (R3 Avg: ${latestCoal.avgR3.toFixed(2)})
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className={`p-3 rounded-xl border ${latestCoal.activeTier === "Tier 1" ? "bg-cyan-100 border-cyan-400 font-bold" : "bg-white border-slate-200"}`}>
                      <span className="text-[10px] uppercase text-slate-500 block">Tier 1 Rate</span>
                      <strong className="text-sm font-black text-slate-900">R3 Index ≤ $45.00</strong>
                      <p className="text-[10px] text-slate-600 mt-1">Tarif OB Baseline: Rp 28.000 / BCM</p>
                    </div>

                    <div className={`p-3 rounded-xl border ${latestCoal.activeTier === "Tier 2" ? "bg-emerald-100 border-emerald-400 font-bold" : "bg-white border-slate-200"}`}>
                      <span className="text-[10px] uppercase text-emerald-700 block font-black">Tier 2 Rate (Aktif Saat Ini)</span>
                      <strong className="text-sm font-black text-slate-900">$45.00 &lt; R3 Index ≤ $70.00</strong>
                      <p className="text-[10px] text-slate-600 mt-1">Tarif OB Baseline: Rp 32.500 / BCM</p>
                    </div>

                    <div className={`p-3 rounded-xl border ${latestCoal.activeTier === "Tier 3" ? "bg-purple-100 border-purple-400 font-bold" : "bg-white border-slate-200"}`}>
                      <span className="text-[10px] uppercase text-slate-500 block">Tier 3 Rate</span>
                      <strong className="text-sm font-black text-slate-900">R3 Index &gt; $70.00</strong>
                      <p className="text-[10px] text-slate-600 mt-1">Tarif OB Baseline: Rp 36.800 / BCM</p>
                    </div>
                  </div>
                </div>

                {/* 2. Stripping Ratio Quota Rule & Pending Volume */}
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2 text-xs">
                  <h4 className="font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                    <Scale size={16} className="text-amber-700" /> Kontrak Batas Kuota Stripping Ratio (Maks. 3.0 : 1)
                  </h4>
                  <p className="text-slate-700 text-[11px]">
                    Volume pengupasan OB yang dapat ditagihkan langsung dibatasi sebesar <strong>3x Volume Batubara (Ton)</strong>.
                    Jika volume survei OB melebihi rasio 3:1, kelebihan volume dicatat ke <strong>Pending Volume Ledger (Carry-Forward)</strong> dan dialokasikan secara manual oleh Finance Site saat periode penagihan berikutnya mencukupi.
                  </p>
                </div>

                {/* 3. Raise & Fall Formula Settings */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs">
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
            )}
          </div>
        )}

        {/* TAB 4: SIMULASI & PLAYGROUND KALKULASI */}
        {activeTab === "simulation" && (() => {
          // Live simulation logic based on active site
          const isBGG = activeSite === "BGG";
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
                  <Zap size={16} className="text-amber-600" /> Live Simulation Playground: Perhitungan Otomatis BA & Invoice ({activeSite})
                </h4>
                <p className="text-slate-600 text-[11px]">
                  Masukkan sampel volume hasil joint survey untuk memvalidasi alur kalkulasi, kuota SR, dan proyeksi nilai faktur invoice.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Jarak Angkut Hauling (Meter)
                  </label>
                  <input
                    type="number"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono font-bold focus:border-cyan-700 outline-none"
                    value={simDistance}
                    onChange={(e) => setSimDistance(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Simulation Results Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Left: Quota & Carry-over */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <h5 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px]">
                    1. Validasi Berita Acara & Rasio Kuota
                  </h5>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Stripping Ratio (SR) Aktual:</span>
                      <strong className="font-mono">{(obVol / (coalVol || 1)).toFixed(2)} : 1</strong>
                    </div>
                    {isBGG && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Kapasitas Kuota Kontrak (3x):</span>
                          <strong className="font-mono text-cyan-900">{maxQuotaOB.toLocaleString("id-ID")} BCM</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Volume OB Siap Ditagih:</span>
                          <strong className="font-mono text-emerald-800">{billableOB.toLocaleString("id-ID")} BCM</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Alokasi Pending Volume:</span>
                          <strong className={`font-mono ${excessOB > 0 ? "text-amber-700 font-bold" : "text-slate-400"}`}>
                            {excessOB > 0 ? `+${excessOB.toLocaleString("id-ID")} BCM (Carry-Over)` : "0 BCM (Nihil)"}
                          </strong>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: Projected Invoice Amount */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <h5 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px]">
                    2. Proyeksi Nominal Faktur Tagihan (Invoice)
                  </h5>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Subtotal Batubara / Nikel:</span>
                      <strong className="font-mono">{formatIDR(coalAmount)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Subtotal Overburden:</span>
                      <strong className="font-mono">{formatIDR(obAmount)}</strong>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold">
                      <span className="text-slate-700">Subtotal DPP (Gross):</span>
                      <strong className="font-mono text-slate-900">{formatIDR(grossAmount)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">PPN (11%):</span>
                      <strong className="font-mono text-emerald-700">+{formatIDR(ppn)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">PPh 23 (2% Kredit Pajak):</span>
                      <strong className="font-mono text-rose-700">-{formatIDR(pph23)}</strong>
                    </div>
                    <div className="flex justify-between border-t border-slate-300 pt-2 font-black text-sm bg-white p-2.5 rounded-xl border">
                      <span className="text-cyan-950">Estimasi Uang Masuk Bersih:</span>
                      <strong className="font-mono text-emerald-800">{formatIDR(netReceipt)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* SOW MODAL (ADD / EDIT) */}
      {isSowModalOpen && editingSOW && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden p-6 space-y-4 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Layers className="text-cyan-700" size={18} /> {editingSOW.id ? "Edit Material SOW" : "Tambah Material SOW Baru"} ({activeSite})
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

              {activeSite === "BGG" && (
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
    </div>
  );
}
