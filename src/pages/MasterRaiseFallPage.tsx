import { useEffect, useState, useRef } from "react";
import {
  Building2,
  Calculator,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Edit2,
  Filter,
  Flame,
  Info,
  Layers,
  Percent,
  Plus,
  RefreshCw,
  Search,
  Sliders,
  Trash2,
  TrendingUp,
  Upload,
  UserCheck,
  X
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { api } from "../lib/api";

const customerContractOptions = [
  { code: "ALL", name: "Semua Customer / Kontrak", project: "All Projects", contract: "Semua Kontrak Active" },
  { code: "POS", name: "PT Position (POS)", project: "POS PROJECT", contract: "002/POS-AAP/2025" },
  { code: "SBS", name: "PT Satria Bahana Sarana (SBS)", project: "PT Satria Bahana Sarana Site", contract: "230/AAP-SBS/EXT/XII/24" },
  { code: "BGG", name: "PT Budi Gema Gempita (BGG)", project: "PT Budi Gema Gempita Site", contract: "09/BGG-AAP/VIII/2018" },
  { code: "DBK", name: "PT Daya Bumindo Karunia (DBK)", project: "PT Daya Bumindo Karunia Site", contract: "001/DBK-AAP/2024" },
  { code: "ABN", name: "PT Andalan Bhumi Nusantara (ABN)", project: "PT Andalan Bhumi Nusantara Site", contract: "001/AAP-ABN/IV/25" }
];

export function MasterRaiseFallPage({
  viewTitle,
  query,
  onNotice,
  initialTab
}: {
  viewTitle: string;
  query: string;
  onNotice: (msg: string) => void;
  initialTab?: "monthly" | "base" | "mrate" | "rates";
}) {
  const [activeTab, setActiveTab] = useState<"monthly" | "base" | "mrate" | "rates">(
    initialTab || (viewTitle === "Currency" ? "mrate" : "monthly")
  );
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data states
  const [rfRows, setRfRows] = useState<any[]>([]);
  const [mrateRows, setMrateRows] = useState<any[]>([]);
  const [sowRows, setSowRows] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState("POS");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("period", activeRf?.period || "Juni 2026");

      const json = await api<any>("/api/master-data/import-bi-exchange-rates", {
        method: "POST",
        body: formData,
      });

      onNotice(json?.message || "Berhasil mengimpor data kurs harian dari BI Excel!");
      await loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal mengimpor file Excel BI");
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"rf" | "mrate">("rf");
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteRfTarget, setDeleteRfTarget] = useState<{ id: number } | null>(null);

  // Form states
  const [rfForm, setRfForm] = useState<any>({
    period: "Juni 2026",
    customerCode: "POS",
    projectSite: "POS PROJECT",
    contractNo: "002/POS-AAP/2025",
    weightFuelA: 0.34,
    weightLaborB: 0.25,
    weightFixedC: 0.41,
    baseFuelFo: 10699.97,
    baseLaborLo: 3594536,
    baseForexXo: 15388.75,
    actualFuelFn: 1.422,
    actualLaborLn: 3721423,
    actualMRateXn: 17923.30,
    notes: ""
  });

  const [mrateForm, setMrateForm] = useState<any>({
    period: "Juni 2026",
    dateStr: "",
    kursJual: 18000,
    kursBeli: 17800,
  });

  async function loadData() {
    setLoading(true);
    try {
      const [resRf, resMrate, resSow] = await Promise.all([
        api<any[]>("/api/master-data/raise-fall"),
        api<any[]>("/api/master-data/daily-exchange-rates"),
        api<any[]>("/api/master-data/variable-sow"),
      ]);
      setRfRows(Array.isArray(resRf) ? resRf : []);
      setMrateRows(Array.isArray(resMrate) ? resMrate : []);
      setSowRows(Array.isArray(resSow) ? resSow : []);
    } catch (err: any) {
      onNotice(err?.message || "Gagal memuat data Master Raise & Fall");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Calculated current active RF Index
  const filteredRfRows = rfRows.filter((r) => {
    if (selectedCustomer !== "ALL" && r.customerCode !== selectedCustomer) return false;
    return true;
  });

  const activeRf = filteredRfRows[0] || rfRows.find((r) => r.customerCode === selectedCustomer) || rfRows[0] || {
    period: "Juni 2026",
    customerCode: "POS",
    projectSite: "POS PROJECT",
    contractNo: "002/POS-AAP/2025",
    weightFuelA: 0.34,
    weightLaborB: 0.25,
    weightFixedC: 0.41,
    baseFuelFo: 10699.97,
    baseLaborLo: 3594536,
    baseForexXo: 15388.75,
    actualFuelFn: 1.422,
    actualLaborLn: 3721423,
    actualMRateXn: 17923.30,
    rfIndexResult: 1.521
  };

  // Average M-Rate calculation
  const avgMRateCalc = mrateRows.length > 0
    ? mrateRows.reduce((sum, r) => sum + (r.kursTengah || (r.kursJual + r.kursBeli) / 2), 0) / mrateRows.length
    : 17923.30;

  // Real-time formula calculations for modal
  const calcFuelD = rfForm.baseFuelFo > 0
    ? (rfForm.weightFuelA * rfForm.actualFuelFn * rfForm.actualMRateXn) / rfForm.baseFuelFo
    : 0;

  const calcLaborL = (rfForm.baseLaborLo > 0 && rfForm.baseForexXo > 0)
    ? (rfForm.weightLaborB * rfForm.actualLaborLn * rfForm.actualMRateXn) / (rfForm.baseLaborLo * rfForm.baseForexXo)
    : 0;

  const calcFixedF = rfForm.weightFixedC || 0.41;
  const calcTotalRF = calcFuelD + calcLaborL + calcFixedF;

  const handleSaveRf = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let endpoint = "/api/master-data/raise-fall";
      if (editItem?.id) {
        endpoint += `/${editItem.id}`;
        await api(endpoint, { method: "PUT", body: JSON.stringify(rfForm) });
        onNotice("Master Raise & Fall berhasil diperbarui!");
      } else {
        await api(endpoint, { method: "POST", body: JSON.stringify(rfForm) });
        onNotice("Periode Raise & Fall baru berhasil ditambahkan!");
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal menyimpan data Raise & Fall");
    }
  };

  const handleSaveMRate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let endpoint = "/api/master-data/daily-exchange-rates";
      if (editItem?.id) {
        endpoint += `/${editItem.id}`;
        await api(endpoint, { method: "PUT", body: JSON.stringify(mrateForm) });
        onNotice("Kurs Harian M-Rate berhasil diperbarui!");
      } else {
        await api(endpoint, { method: "POST", body: JSON.stringify(mrateForm) });
        onNotice("Kurs Harian M-Rate baru berhasil ditambahkan!");
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal menyimpan Kurs Harian");
    }
  };

  const handleDeleteRf = async (id: number) => {
    try {
      await api(`/api/master-data/raise-fall/${id}`, { method: "DELETE" });
      onNotice("Data Raise & Fall berhasil dihapus");
      loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal menghapus data");
    } finally {
      setDeleteRfTarget(null);
    }
  };

  const openCreateRfModal = () => {
    setModalType("rf");
    setEditItem(null);
    setRfForm({
      period: "Juli 2026",
      customerCode: "POS",
      projectSite: "POS PROJECT",
      contractNo: "002/POS-AAP/2025",
      weightFuelA: 0.34,
      weightLaborB: 0.25,
      weightFixedC: 0.41,
      baseFuelFo: 10699.97,
      baseLaborLo: 3594536,
      baseForexXo: 15388.75,
      actualFuelFn: 1.450,
      actualLaborLn: 3721423,
      actualMRateXn: Math.round(avgMRateCalc),
      notes: "Kalkulasi RF Periode Baru"
    });
    setModalOpen(true);
  };

  const openEditRfModal = (item: any) => {
    setModalType("rf");
    setEditItem(item);
    setRfForm({ ...item });
    setModalOpen(true);
  };

  const openCreateMRateModal = () => {
    setModalType("mrate");
    setEditItem(null);
    setMrateForm({
      period: "Juni 2026",
      dateStr: new Date().toLocaleDateString("id-ID"),
      kursJual: 18000,
      kursBeli: 17800,
    });
    setModalOpen(true);
  };

  const isCurrencyPage = viewTitle === "Currency";

  return (
    <div className="space-y-5 font-sans">
      <PageHeader
        title={isCurrencyPage ? "Master Data: Currency & Kurs Tengah M-Rate (Bank Indonesia)" : (viewTitle || "Master Data: Raise & Fall Index & Formula Rate")}
        description={isCurrencyPage ? "Kelola data Kurs Harian Bank Indonesia (M-Rate), impor file Excel resmi BI, dan pemantauan pergerakan Forex USD/IDR." : "Kelola parameter indeks dasar, indeks aktual (Fuel, Labor, Forex), dan formulasi penyesuaian harga Raise & Fall berdasarkan referensi Perhitungan POS Project."}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Data
          </button>
          {isCurrencyPage ? (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Upload size={14} /> {uploading ? "Mengimpor..." : "Import Excel BI"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                onClick={openCreateMRateModal}
                className="bg-cyan-800 hover:bg-slate-900 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Plus size={15} /> + Kurs M-Rate Manual
              </button>
            </>
          ) : (
            <button
              onClick={openCreateRfModal}
              className="bg-cyan-800 hover:bg-slate-900 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Plus size={15} /> Hitung Periode RF Baru
            </button>
          )}
        </div>
      </PageHeader>

      {/* Customer & Contract Selection Bar (Only for Raise & Fall) */}
      {!isCurrencyPage && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-50 text-cyan-800 rounded-xl border border-cyan-100">
              <Building2 size={20} />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">KLIEN & KONTRAK AKTIF</span>
              <span className="text-xs font-black text-slate-900 flex items-center gap-2">
                {customerContractOptions.find((c) => c.code === selectedCustomer)?.name || "Semua Customer"}
                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono text-[11px] font-bold">
                  {customerContractOptions.find((c) => c.code === selectedCustomer)?.contract || "All"}
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-700">Pilih Klien / Kontrak:</span>
            <select
              value={selectedCustomer}
              onChange={(e) => {
                const code = e.target.value;
                setSelectedCustomer(code);
                const opt = customerContractOptions.find((c) => c.code === code);
                if (opt && opt.code !== "ALL") {
                  setRfForm((prev: any) => ({
                    ...prev,
                    customerCode: opt.code,
                    projectSite: opt.project,
                    contractNo: opt.contract
                  }));
                }
              }}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-600 shadow-xs"
            >
              {customerContractOptions.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.name} — ({opt.contract})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Top Metric Cards Summary */}
      {isCurrencyPage ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">M-RATE AVERAGE (Xn)</span>
              <TrendingUp size={16} className="text-cyan-600" />
            </div>
            <div className="text-2xl font-black text-cyan-900 font-mono">
              Rp {avgMRateCalc.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] font-medium text-slate-600 flex justify-between pt-1 border-t border-slate-100">
              <span>Sumber Data: <strong className="text-cyan-800">Bank Indonesia (Excel Import)</strong></span>
              <span className="text-emerald-700 font-bold">Official Rate ✅</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">TOTAL LOG KURS HARIAN BI</span>
              <Calendar size={16} className="text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {mrateRows.length} Hari
            </div>
            <div className="text-[11px] font-medium text-slate-600 flex justify-between pt-1 border-t border-slate-100">
              <span>Status Impor BI: <strong className="text-slate-900">Terbuka untuk Upload Excel</strong></span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">INDEX RAISE & FALL (RF)</span>
              <Calculator size={16} className="text-cyan-800" />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {activeRf.rfIndexResult ? activeRf.rfIndexResult.toFixed(3) : "1.521"}
            </div>
            <div className="text-[11px] font-medium text-slate-600 flex justify-between pt-1 border-t border-slate-100">
              <span>Periode: <strong>{activeRf.period || "Juni 2026"}</strong></span>
              <span className="text-emerald-700 font-bold">Verified ✅</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">BASE FUEL (Fo)</span>
              <Flame size={16} className="text-amber-500" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 font-mono">
              Rp {(activeRf.baseFuelFo || 10699.97).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] font-medium text-slate-600 flex justify-between pt-1 border-t border-slate-100">
              <span>Bobot Fuel (a): <strong className="text-slate-900">34.0%</strong></span>
              <span>Fn: <strong>USD {(activeRf.actualFuelFn || 1.422).toFixed(3)}</strong></span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">BASE LABOR (Lo)</span>
              <Percent size={16} className="text-teal-600" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 font-mono">
              Rp {(activeRf.baseLaborLo || 3594536).toLocaleString("id-ID")}
            </div>
            <div className="text-[11px] font-medium text-slate-600 flex justify-between pt-1 border-t border-slate-100">
              <span>Bobot Labor (b): <strong className="text-slate-900">25.0%</strong></span>
              <span>Fixed (c): <strong className="text-slate-900">41.0%</strong></span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">M-RATE AVERAGE (Xn)</span>
              <TrendingUp size={16} className="text-cyan-600" />
            </div>
            <div className="text-xl font-extrabold text-cyan-900 font-mono">
              Rp {avgMRateCalc.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] font-medium text-slate-600 flex justify-between pt-1 border-t border-slate-100">
              <span>Base Forex (Xo): <strong>Rp 15.388,75</strong></span>
              <span>Total Log BI: <strong>{mrateRows.length} Hari</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Navigation (Only for Raise & Fall page: 2 tabs) */}
      {!isCurrencyPage && (
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-1">
          <button
            onClick={() => setActiveTab("monthly")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
              activeTab === "monthly"
                ? "bg-cyan-900 text-white shadow-md shadow-cyan-900/20"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Calculator size={15} /> Log Kalkulasi Periode RF ({rfRows.length})
          </button>

          <button
            onClick={() => setActiveTab("base")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
              activeTab === "base"
                ? "bg-cyan-900 text-white shadow-md shadow-cyan-900/20"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Sliders size={15} /> Formulasi & Indeks Dasar Kontrak
          </button>
        </div>
      )}

      {/* Tab 1: Log Kalkulasi Periode RF */}
      {activeTab === "monthly" && (
        <Panel title="Daftar Perhitungan Indeks Raise & Fall Per Periode">
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-extrabold text-[11px] uppercase border-b border-slate-200">
                  <th className="p-3 border-r border-slate-200">PERIODE</th>
                  <th className="p-3 border-r border-slate-200">KONTRAK & CUSTOMER</th>
                  <th className="p-3 text-right border-r border-slate-200">FUEL (Fn USD)</th>
                  <th className="p-3 text-right border-r border-slate-200">LABOR (Ln IDR)</th>
                  <th className="p-3 text-right border-r border-slate-200">M-RATE (Xn IDR)</th>
                  <th className="p-3 text-right border-r border-slate-200">KOMPONEN D</th>
                  <th className="p-3 text-right border-r border-slate-200">KOMPONEN L</th>
                  <th className="p-3 text-right border-r border-slate-200">FIXED F</th>
                  <th className="p-3 text-right border-r border-slate-200 font-black text-cyan-900">RF INDEX RESULT</th>
                  <th className="p-3 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-900">
                {rfRows.map((r) => {
                  const d = r.baseFuelFo > 0 ? (r.weightFuelA * r.actualFuelFn * r.actualMRateXn) / r.baseFuelFo : 0;
                  const l = (r.baseLaborLo > 0 && r.baseForexXo > 0) ? (r.weightLaborB * r.actualLaborLn * r.actualMRateXn) / (r.baseLaborLo * r.baseForexXo) : 0;
                  const f = r.weightFixedC || 0.41;
                  const totalRf = r.rfIndexResult || (d + l + f);

                  return (
                    <tr key={r.id} className="hover:bg-slate-50 border-b border-slate-200">
                      <td className="p-3 font-extrabold text-slate-900 border-r border-slate-200">
                        {r.period}
                      </td>
                      <td className="p-3 border-r border-slate-200">
                        <div className="font-bold text-slate-900">{r.customerCode} — {r.projectSite}</div>
                        <div className="text-[10px] font-mono text-slate-500">{r.contractNo}</div>
                      </td>
                      <td className="p-3 text-right font-mono font-bold border-r border-slate-200">
                        USD {r.actualFuelFn?.toFixed(3)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold border-r border-slate-200">
                        Rp {r.actualLaborLn?.toLocaleString("id-ID")}
                      </td>
                      <td className="p-3 text-right font-mono font-bold border-r border-slate-200">
                        Rp {r.actualMRateXn?.toLocaleString("id-ID")}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-700 border-r border-slate-200">
                        {d.toFixed(3)}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-700 border-r border-slate-200">
                        {l.toFixed(3)}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-700 border-r border-slate-200">
                        {f.toFixed(3)}
                      </td>
                      <td className="p-3 text-right font-mono font-black text-sm text-cyan-900 border-r border-slate-200 underline">
                        {totalRf.toFixed(3)}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditRfModal(r)}
                            className="p-1.5 text-cyan-700 hover:bg-cyan-50 rounded-lg transition-colors"
                            title="Edit Record"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteRfTarget({ id: r.id })}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus Record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Tab 2: Formulasi & Indeks Dasar Kontrak */}
      {activeTab === "base" && (
        <Panel title="Parameter Formula & Indeks Dasar Kontrak (Base Index)">
          <div className="space-y-5 text-xs text-slate-800">
            {/* Box Rumus Resmi */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-md space-y-2 border border-slate-800 font-mono">
              <div className="text-xs font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                <Calculator size={16} /> FORMULA STANDARD: INDEX RF = D + L + F
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-[11px] text-slate-300">
                <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                  <strong className="text-amber-400 block mb-1">D (Komponen Fuel)</strong>
                  <code>D = [ Rate * a * (Fn * Xn) ] / (Fo * Xo)</code>
                </div>
                <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                  <strong className="text-teal-400 block mb-1">L (Komponen Labor)</strong>
                  <code>L = [ Rate * b * (Ln * Xn) ] / (Lo * Xo)</code>
                </div>
                <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                  <strong className="text-cyan-400 block mb-1">F (Komponen Fixed)</strong>
                  <code>F = Rate * c</code>
                </div>
              </div>
            </div>

            {/* Grid Detail Base Index Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl space-y-3">
                <h4 className="font-extrabold uppercase text-slate-900 text-xs tracking-wider flex items-center gap-2">
                  <Percent size={15} className="text-cyan-700" /> Bobot Komponen Terbobot (Base Weights):
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 bg-white rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-600">a (Fuel Weighting)</span>
                    <strong className="text-slate-900 font-mono text-sm">34,0%</strong>
                  </div>
                  <div className="flex justify-between p-2 bg-white rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-600">b (Labor Weighting)</span>
                    <strong className="text-slate-900 font-mono text-sm">25,0%</strong>
                  </div>
                  <div className="flex justify-between p-2 bg-white rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-600">c (Fixed Weighting)</span>
                    <strong className="text-slate-900 font-mono text-sm">41,0%</strong>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl space-y-3">
                <h4 className="font-extrabold uppercase text-slate-900 text-xs tracking-wider flex items-center gap-2">
                  <Layers size={15} className="text-cyan-700" /> Nilai Indeks Dasar Kontrak (Base Index Values):
                </h4>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between p-2 bg-white rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-600 font-sans">Fo (Base Fuel Price IDR)</span>
                    <strong className="text-slate-900">Rp 10.699,97</strong>
                  </div>
                  <div className="flex justify-between p-2 bg-white rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-600 font-sans">Lo (Base Labor Index IDR)</span>
                    <strong className="text-slate-900">Rp 3.594.536,00</strong>
                  </div>
                  <div className="flex justify-between p-2 bg-white rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-600 font-sans">Xo (Base Forex Rate IDR)</span>
                    <strong className="text-slate-900">Rp 15.388,75</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Panel>
      )}

      {/* Tab 3: Kurs M-Rate BI */}
      {activeTab === "mrate" && (
        <Panel
          title="Master Record Kurs Tengah M-Rate (Bank Indonesia)"
          action={
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx, .xls"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-cyan-800 hover:bg-slate-900 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
              >
                <Upload size={14} className={uploading ? "animate-bounce" : ""} /> {uploading ? "Mengimpor..." : "Import Excel Kurs BI"}
              </button>
            </div>
          }
        >
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-extrabold text-[11px] uppercase border-b border-slate-200">
                  <th className="p-3 border-r border-slate-200">NO</th>
                  <th className="p-3 border-r border-slate-200">TANGGAL KURS</th>
                  <th className="p-3 text-right border-r border-slate-200">KURS JUAL (IDR)</th>
                  <th className="p-3 text-right border-r border-slate-200">KURS BELI (IDR)</th>
                  <th className="p-3 text-right font-black text-cyan-900">KURS TENGAH (IDR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-900 font-mono">
                {mrateRows.map((m, idx) => (
                  <tr key={m.id || idx} className="hover:bg-slate-50 border-b border-slate-200">
                    <td className="p-3 text-center border-r border-slate-200 font-sans font-bold">{m.no || idx + 1}</td>
                    <td className="p-3 border-r border-slate-200 font-sans font-extrabold">{m.dateStr}</td>
                    <td className="p-3 text-right border-r border-slate-200">Rp {m.kursJual?.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right border-r border-slate-200">Rp {m.kursBeli?.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right font-black text-cyan-900">Rp {(m.kursTengah || (m.kursJual + m.kursBeli) / 2).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={4} className="p-3 text-left font-sans uppercase">RATA-RATA KURS TENGAH (M-RATE AVERAGE Xn):</td>
                  <td className="p-3 text-right font-mono text-sm font-black text-cyan-950 underline">
                    Rp {avgMRateCalc.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Panel>
      )}

      {/* Tab 4: Master Contract Unit Rates USD */}
      {activeTab === "rates" && (
        <Panel title="Tarif Kontrak Unit Rate USD (Referensi Sheet Rate Excel)">
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-extrabold text-[11px] uppercase border-b border-slate-200">
                  <th className="p-3 border-r border-slate-200">KATEGORI SOW</th>
                  <th className="p-3 border-r border-slate-200">ITEM PEKERJAAN</th>
                  <th className="p-3 text-center border-r border-slate-200">SATUAN</th>
                  <th className="p-3 text-right border-r border-slate-200 font-black text-cyan-900">BASE RATE (USD)</th>
                  <th className="p-3">DESKRIPSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-900">
                {sowRows.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 border-b border-slate-200">
                    <td className="p-3 font-extrabold text-cyan-900 border-r border-slate-200">{s.category}</td>
                    <td className="p-3 font-bold text-slate-900 border-r border-slate-200">{s.itemName}</td>
                    <td className="p-3 text-center font-mono border-r border-slate-200">{s.unit}</td>
                    <td className="p-3 text-right font-mono font-extrabold text-cyan-900 border-r border-slate-200">
                      USD {s.rateUSD?.toFixed(3)}
                    </td>
                    <td className="p-3 text-slate-600 text-[11px]">{s.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Modal Popup (Calculated RF / MRate) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-2">
                <Calculator size={18} className="text-cyan-400" />
                {modalType === "rf"
                  ? (editItem ? "Edit Rekam Kalkulasi Raise & Fall" : "Hitung / Input Periode Raise & Fall Baru")
                  : "Tambah Kurs Harian Bank Indonesia"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {modalType === "rf" && (
                <form onSubmit={handleSaveRf} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Periode Tagihan</label>
                      <input
                        className="w-full bg-slate-50 border border-slate-300 font-extrabold text-xs p-2 rounded-lg outline-none focus:border-cyan-600"
                        value={rfForm.period}
                        onChange={(e) => setRfForm({ ...rfForm, period: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Nomor Kontrak</label>
                      <input
                        className="w-full bg-slate-50 border border-slate-300 font-bold text-xs p-2 rounded-lg outline-none focus:border-cyan-600"
                        value={rfForm.contractNo}
                        onChange={(e) => setRfForm({ ...rfForm, contractNo: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl space-y-2">
                    <h5 className="text-[11px] font-extrabold uppercase text-cyan-900 tracking-wider">Input Indikator Aktual (Current Period):</h5>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Fn (Fuel USD)</label>
                        <input
                          type="number"
                          step="0.001"
                          className="w-full bg-white border border-slate-300 font-mono font-bold p-1.5 rounded-lg"
                          value={rfForm.actualFuelFn}
                          onChange={(e) => setRfForm({ ...rfForm, actualFuelFn: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Ln (Labor IDR)</label>
                        <input
                          type="number"
                          className="w-full bg-white border border-slate-300 font-mono font-bold p-1.5 rounded-lg"
                          value={rfForm.actualLaborLn}
                          onChange={(e) => setRfForm({ ...rfForm, actualLaborLn: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Xn (M-Rate IDR)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full bg-white border border-slate-300 font-mono font-bold p-1.5 rounded-lg"
                          value={rfForm.actualMRateXn}
                          onChange={(e) => setRfForm({ ...rfForm, actualMRateXn: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Real-time Calculation Breakdown Preview */}
                  <div className="p-3 bg-slate-900 text-white rounded-xl space-y-2 font-mono text-[11px]">
                    <div className="text-[10px] font-extrabold uppercase text-cyan-400">Live Calculation Preview:</div>
                    <div className="flex justify-between text-slate-300">
                      <span>D = (34% * {rfForm.actualFuelFn} * {rfForm.actualMRateXn}) / Fo:</span>
                      <strong className="text-amber-300">{calcFuelD.toFixed(3)}</strong>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>L = (25% * {rfForm.actualLaborLn} * {rfForm.actualMRateXn}) / (Lo*Xo):</span>
                      <strong className="text-teal-300">{calcLaborL.toFixed(3)}</strong>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>F = Fixed (41%):</span>
                      <strong className="text-cyan-300">{calcFixedF.toFixed(3)}</strong>
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-black text-white">
                      <span>INDEX RF RESULT =</span>
                      <span className="text-emerald-400 underline">{calcTotalRF.toFixed(3)}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 bg-slate-100 font-bold text-xs rounded-xl text-slate-700">
                      Batal
                    </button>
                    <button type="submit" className="px-5 py-2 bg-cyan-900 hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl">
                      Simpan Master RF
                    </button>
                  </div>
                </form>
              )}

              {modalType === "mrate" && (
                <form onSubmit={handleSaveMRate} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Tanggal Kurs</label>
                    <input
                      className="w-full bg-slate-50 border border-slate-300 font-bold text-xs p-2 rounded-lg"
                      value={mrateForm.dateStr}
                      onChange={(e) => setMrateForm({ ...mrateForm, dateStr: e.target.value })}
                      placeholder="e.g. 01/07/2026"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Kurs Jual (IDR)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full bg-slate-50 border border-slate-300 font-mono font-bold text-xs p-2 rounded-lg"
                        value={mrateForm.kursJual}
                        onChange={(e) => setMrateForm({ ...mrateForm, kursJual: parseFloat(e.target.value) || 0 })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Kurs Beli (IDR)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full bg-slate-50 border border-slate-300 font-mono font-bold text-xs p-2 rounded-lg"
                        value={mrateForm.kursBeli}
                        onChange={(e) => setMrateForm({ ...mrateForm, kursBeli: parseFloat(e.target.value) || 0 })}
                        required
                      />
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-100 rounded-lg text-xs flex justify-between font-mono">
                    <span>Kurs Tengah Hitung:</span>
                    <strong className="text-cyan-900 font-bold">
                      Rp {((mrateForm.kursJual + mrateForm.kursBeli) / 2).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                    </strong>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 bg-slate-100 font-bold text-xs rounded-xl text-slate-700">
                      Batal
                    </button>
                    <button type="submit" className="px-5 py-2 bg-cyan-900 hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl">
                      Simpan Kurs Harian
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
      {deleteRfTarget && (
        <ConfirmDialog
          title="Hapus Data Raise & Fall"
          message="Data Raise & Fall ini akan dihapus permanen. Tindakan ini tidak dapat dibatalkan."
          confirmLabel="Hapus"
          danger
          onCancel={() => setDeleteRfTarget(null)}
          onConfirm={() => handleDeleteRf(deleteRfTarget.id)}
        />
      )}
    </div>
  );
}
