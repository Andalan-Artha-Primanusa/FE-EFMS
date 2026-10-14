import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, Pickaxe, Layers, Calculator, Zap, TrendingUp, Scale,
  Eye, Edit2, Trash2, Plus, Sliders, ExternalLink, Loader2, AlertTriangle
} from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { api } from "../../lib/api";
import { formatIDR, parsePeriodToYYYYMM } from "./helpers";
import { routes } from "../../router/routes";
import {
  masterRegistry, customerKind, obSplitSOWs, contractParams, rfTemplateFor, bankAccountForCustomer,
  baseDistanceFor, coalTierForR3, isCoalIndexFinal, sowTierRate
} from "./masterRegistry";
import { calculateBACommercialBreakdown, isDistanceItem, isOBMaterial } from "./ba_calculations";
import { latestPeriodMRate, sowModel, SOW_MODEL_LABELS } from "../VariableSOWPage";

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

// Label sama dengan pilihan "Skema Raise & Fall" di Master Customer.
const RF_SCHEME_LABELS: Record<string, string> = {
  SINGLE_FACTOR_FUEL: "Raise & Fall 1-Faktor BBM",
  TRIPLE_FACTOR_DLF: "Raise & Fall 3-Faktor (D+L+F)",
  KURS_TRANSAKSI_USD: "Kurs Transaksi USD",
};

const tagClass = "text-[10px] font-bold px-2 py-0.5 rounded-[3px] border flex items-center gap-1";
const sameKind = (s: any, kind: string) => customerKind(s.customerCode || s.customer) === kind;

/** Tag operasional kartu klien dari konfigurasi Master Customer & Variable SOW (bukan dari kode customer). */
function clientTags(c: any) {
  const kind = customerKind(c.code);
  const model = sowModel(kind, c.sowModel);
  const sr = Number(c.maxStrippingRatio || 0);
  const baseDist = baseDistanceFor(c.code, "OB");
  const tags: { label: string; cls: string; icon?: any }[] = [
    { label: SOW_MODEL_LABELS[model], cls: model === "coal" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-blue-50 text-blue-800 border-blue-200", icon: model === "coal" ? TrendingUp : undefined },
  ];
  if (sr > 0) tags.push({ label: `Quota SR ${sr}:1 (Pending OB)`, cls: "bg-amber-50 text-amber-800 border-amber-200", icon: Scale });
  if (RF_SCHEME_LABELS[c.formulaScheme]) tags.push({ label: RF_SCHEME_LABELS[c.formulaScheme], cls: "bg-slate-100 text-slate-800 border-slate-200", icon: Calculator });
  if (kind === "POS") tags.push({ label: "Dual-Invoice (Mining & MDO)", cls: "bg-[#A57C50]/10 text-[#A57C50] border-[#A57C50]/30", icon: Pickaxe });
  if (baseDist > 0) tags.push({ label: `Overhaul basis ${baseDist.toLocaleString("id-ID")} m`, cls: "bg-slate-100 text-slate-700 border-slate-200" });
  return tags;
}

export function CustomerView({ c }: { c: any }) {
  const {
    customerRows, setDetailViewItem, openCreateModal, openEditModal, handleDelete,
    query = "", deletingKey, coalIndexMaster, can = () => false
  } = c as Record<string, any>;
  const safeCustomerRows: any[] = Array.isArray(customerRows) ? customerRows : [];
  const filteredRows = safeCustomerRows.filter((r) => JSON.stringify(r).toLowerCase().includes(String(query).toLowerCase()));

  // Active top-level view: "cards" (Direktori Klien) or "setup" (Parameter, SOW & Formula)
  const [viewMode, setViewMode] = useState<"cards" | "setup">("cards");
  const [selectedClientCode, setSelectedClientCode] = useState<string>("");
  const [setupSubTab, setSetupSubTab] = useState<"sow" | "formula" | "simulation">("sow");
  const navigate = useNavigate();

  // Katalog SOW lengkap (termasuk Inactive) untuk tabel; kalkulasi memakai registry (Active saja).
  const [sowList, setSowList] = useState<SOWItem[]>([]);
  useEffect(() => {
    api<SOWItem[]>("/api/master-data/variable-sow")
      .then((rows) => { if (Array.isArray(rows)) setSowList(rows); })
      .catch(() => {});
  }, []);

  // Simulation Playground State
  const [simCoalVolume, setSimCoalVolume] = useState<number>(20000);
  const [simOBVolume, setSimOBVolume] = useState<number>(65000);

  const handleOpenSetupForClient = (clientCode: string) => {
    setSelectedClientCode(clientCode);
    setViewMode("setup");
    setSetupSubTab("sow");
  };

  // Klien aktif di hub setup = Master Customer (default: customer pertama).
  const selected = selectedClientCode || safeCustomerRows[0]?.code || "";
  const kind = customerKind(selected);
  const record = safeCustomerRows.find((r) => customerKind(r.code) === kind);
  const model = sowModel(kind, record?.sowModel);
  const isCoalModel = model === "coal";
  const params = contractParams(selected);
  const scheme = record?.formulaScheme || "";
  const rf = rfTemplateFor(selected);
  const bank = bankAccountForCustomer(selected);
  const activeClientSOW = sowList.filter((it) => sameKind(it, kind));
  const registrySows = masterRegistry.sows.filter((s) => sameKind(s, kind));
  const distanceSows = registrySows.filter((s) => Number(s.baseDistanceMeters) > 0 && !(Number(s.maxDistanceMeters) > 0));
  const distanceTiers = registrySows.filter((s) => Number(s.maxDistanceMeters) > 0).sort((a, b) => Number(a.baseDistanceMeters) - Number(b.baseDistanceMeters));
  const obSplit = obSplitSOWs(selected);

  // Coal Index acuan = periode Final terbaru (sama dengan aturan lock di halaman Coal Index).
  const latestCoal = (Array.isArray(coalIndexMaster) ? coalIndexMaster : [])
    .filter((r: any) => isCoalIndexFinal(r.status))
    .sort((a: any, b: any) => parsePeriodToYYYYMM(b.period).localeCompare(parsePeriodToYYYYMM(a.period)))[0];
  const activeTier = latestCoal ? (latestCoal.activeTier || coalTierForR3(Number(latestCoal.avgR3))) : "";

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
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-[3px] bg-[#A57C50] hover:bg-[#8e6941] text-white shadow-xs transition cursor-pointer ${can("master_data", "write") ? "" : "hidden"}`}
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
          <span>Direktori & Profil Klien ({filteredRows.length})</span>
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
          {filteredRows.map((c: any) => (
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

              {/* Operational Tags (dari konfigurasi Master Customer & Variable SOW) */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {clientTags(c).map(({ label, cls, icon: Icon }) => (
                  <span key={label} className={`${tagClass} ${cls}`}>
                    {Icon && <Icon size={11} />} {label}
                  </span>
                ))}
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
                    className={`text-xs font-bold text-slate-700 hover:text-[#A57C50] flex items-center gap-1 px-2.5 py-1 rounded-[3px] bg-slate-50 border border-slate-200 cursor-pointer ${can("master_data", "write") ? "" : "hidden"}`}
                    onClick={() => openEditModal("customer", c)}
                  >
                    <Edit2 size={13} /> Edit
                  </button>
                  {can("master_data", "delete") && (() => {
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
          ))}
        </div>
      )}

      {/* VIEW MODE 2: INTEGRATED SETUP HUB (SOW, FORMULAS & SIMULATION) */}
      {viewMode === "setup" && (
        <div className="space-y-4">
          {/* Client Selector Cards (Master Customer) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {safeCustomerRows.map((cust) => {
              const isActive = customerKind(cust.code) === kind;
              return (
                <button
                  key={cust.id ?? cust.code}
                  type="button"
                  onClick={() => setSelectedClientCode(cust.code)}
                  className={`p-3 rounded-[4px] border text-left transition cursor-pointer ${
                    isActive
                      ? "bg-[#A57C50]/10 border-[#A57C50] shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs px-1.5 py-0.5 rounded-[3px] bg-slate-100 text-slate-900">{cust.code}</span>
                    {isActive && <span className="text-[9px] font-bold uppercase text-[#A57C50] bg-[#A57C50]/15 px-1.5 py-0.5 rounded-[3px]">Aktif</span>}
                  </div>
                  <div className="font-bold text-xs text-slate-900 mt-1.5">{cust.fullName || cust.code}</div>
                </button>
              );
            })}
          </div>

          {!selected ? (
            <div className="p-6 bg-white border border-slate-200 rounded-[4px] text-center text-slate-500 text-xs italic">
              Belum ada customer. Klik "Tambah Customer Baru" untuk memulai.
            </div>
          ) : (
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
                      <Layers className="text-[#A57C50]" size={15} /> Katalog Scope of Work & Tarif: {selected}
                    </h3>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Tarif acuan pekerjaan penambangan yang otomatis terisi saat membuat Berita Acara (BA) klien {selected}. Model tarif: <strong>{SOW_MODEL_LABELS[model]}</strong>.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => navigate(routes.variableSOW.edit(kind))}
                      className="px-3 py-1.5 bg-[#A57C50] hover:bg-[#8e6941] text-white font-bold rounded-[3px] text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer shrink-0"
                    >
                      <Edit2 size={13} /> Edit Tarif SOW
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(routes.variableSOW.list)}
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
                        {isCoalModel && (
                          <>
                            <th className="p-2.5 text-right">Tier 1 (R3 ≤ $50)</th>
                            <th className="p-2.5 text-right">Tier 2 ($50-$75)</th>
                            <th className="p-2.5 text-right">Tier 3 (R3 &gt; $75)</th>
                          </>
                        )}
                        <th className="p-2.5 text-center">Status</th>
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
                          {isCoalModel && (
                            <>
                              <td className="p-2.5 text-right tabular-nums text-slate-800">{formatIDR(item.tier1Rate || item.rateIDR)}</td>
                              <td className="p-2.5 text-right tabular-nums text-emerald-800 font-bold">{formatIDR(item.tier2Rate || item.rateIDR)}</td>
                              <td className="p-2.5 text-right tabular-nums text-purple-800 font-bold">{formatIDR(item.tier3Rate || item.rateIDR)}</td>
                            </>
                          )}
                          <td className="p-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-[3px] text-[10px] font-bold border ${item.status === "Inactive" ? "bg-slate-100 text-slate-500 border-slate-300" : "bg-emerald-100 text-emerald-800 border-emerald-300"}`}>
                              {item.status || "Active"}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {activeClientSOW.length === 0 && (
                        <tr>
                          <td colSpan={isCoalModel ? 8 : 5} className="p-6 text-center text-slate-400 italic">
                            Belum ada katalog material SOW untuk {selected}. Klik "Edit Tarif SOW" untuk input data baru.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-TAB 2: FORMULA & SPECIAL CALCULATION RULES (dari Master Customer, Variable SOW, RF & Coal Index) */}
            {setupSubTab === "formula" && (
              <div className="p-5 space-y-4 text-xs">
                {kind === "POS" && (
                  <div className="bg-slate-50 border border-slate-200 rounded-[4px] p-4 space-y-2 text-slate-800">
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
                )}

                {isCoalModel && (
                  <div className="bg-emerald-50/60 border border-emerald-200 rounded-[4px] p-4 space-y-3">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <h4 className="font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                        <TrendingUp size={15} className="text-emerald-700" /> Multi-Tier Coal Indexing Engine
                      </h4>
                      <span className="px-2.5 py-0.5 rounded-[3px] text-[11px] font-bold bg-emerald-200 text-emerald-900 border border-emerald-400">
                        {latestCoal
                          ? `Tier Aktif: ${activeTier || "-"} (R3 Avg: $${Number(latestCoal.avgR3 || 0).toFixed(2)}, ${latestCoal.period})`
                          : "Belum ada Coal Index Final"}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(["Tier 1", "Tier 2", "Tier 3"] as const).map((tier, i) => {
                        const on = activeTier === tier;
                        const range = ["R3 ≤ $50", "$50-$75", "R3 > $75"][i];
                        return (
                          <div key={tier} className={`p-3 rounded-[4px] border ${on ? "bg-emerald-100 border-emerald-400 font-bold" : "bg-white border-slate-200"}`}>
                            <span className={`text-[10px] uppercase block ${on ? "text-emerald-800 font-bold" : "text-slate-500"}`}>
                              {tier} ({range}) {on ? "(AKTIF)" : ""}
                            </span>
                            {obSplit.length > 0 ? obSplit.map((s, j) => (
                              <div key={s.id ?? j} className={j === 0 ? "text-xs font-bold text-slate-900" : "text-[10px] text-slate-600 mt-1"}>
                                {s.itemName} ({Number(s.splitPercentage)}%): {formatIDR(sowTierRate(s, tier))} / {s.unit || "BCM"}
                              </div>
                            )) : <div className="text-[10px] text-slate-500 italic">Item OB split belum diatur di Variable SOW</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Parameter kontrak Master Customer */}
                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-[4px] space-y-2">
                  <h4 className="font-bold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                    <Scale size={15} className="text-amber-700" /> Parameter Kontrak (Master Customer)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div><span className="text-slate-500 font-bold block">Kuota Stripping Ratio</span><strong>{params.maxStrippingRatio > 0 ? `Maks. ${params.maxStrippingRatio} : 1` : "Tidak berlaku"}</strong></div>
                    <div><span className="text-slate-500 font-bold block">Diskon Overdistance</span><strong>{params.odDiscountPct > 0 ? `${params.odDiscountPct}%` : "Tidak berlaku"}</strong></div>
                    <div><span className="text-slate-500 font-bold block">Toleransi Joint Survey</span><strong>{params.surveyTolerancePct > 0 ? `${params.surveyTolerancePct}%` : "Tidak berlaku"}</strong></div>
                    <div><span className="text-slate-500 font-bold block">Termin Pembayaran</span><strong>{record?.terminDays ?? "-"} Hari</strong></div>
                  </div>
                  {params.maxStrippingRatio > 0 && (
                    <p className="text-slate-700 text-[11px]">
                      Volume OB yang dapat ditagihkan langsung dibatasi sebesar <strong>{params.maxStrippingRatio}x Volume Batubara (Ton)</strong>. Kelebihan volume survei OB dicatat ke <strong>Pending Volume Ledger (Carry-Forward)</strong> dan diserap otomatis (periode terlama lebih dulu) oleh invoice berikutnya yang masih punya sisa kuota.
                    </p>
                  )}
                </div>

                {/* Formula Raise & Fall sesuai skema Master Customer */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-[4px] space-y-2">
                  <h4 className="font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <Calculator size={15} className="text-[#A57C50]" /> Formula Eskalasi: {RF_SCHEME_LABELS[scheme] || "Tanpa eskalasi"}
                  </h4>
                  {scheme === "SINGLE_FACTOR_FUEL" || scheme === "TRIPLE_FACTOR_DLF" ? (
                    rf ? (
                      <>
                        <div className="p-2 bg-white border border-slate-200 rounded-[3px] font-mono text-[11px] text-slate-800">
                          {scheme === "SINGLE_FACTOR_FUEL"
                            ? <code>Index = {Number(rf.weightFixedC || 0)} + {Number(rf.weightFuelA || 0)} × (Fn / Fo)</code>
                            : <code>Index = {Number(rf.weightFuelA || 0)} × (Fn × Xn / Fo) + {Number(rf.weightLaborB || 0)} × (Ln / Lo) + {Number(rf.weightFixedC || 0)}</code>}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                          <div><span className="text-slate-500 font-bold">Base Fuel (Fo):</span> <strong className="tabular-nums">{formatIDR(rf.baseFuelFo || 0, 2)}</strong></div>
                          {scheme === "TRIPLE_FACTOR_DLF" && (
                            <>
                              <div><span className="text-slate-500 font-bold">Base Labor (Lo):</span> <strong className="tabular-nums">{formatIDR(rf.baseLaborLo || 0)}</strong></div>
                              <div><span className="text-slate-500 font-bold">Base Kurs (Xo):</span> <strong className="tabular-nums">{formatIDR(rf.baseForexXo || 0, 2)}</strong></div>
                            </>
                          )}
                          <div><span className="text-slate-500 font-bold">Faktor RF ({rf.period || "-"}):</span> <strong className="tabular-nums text-emerald-800">{Number(rf.rfIndexResult || 0) > 0 ? `${Number(rf.rfIndexResult).toFixed(3)}x` : "Belum dihitung"}</strong></div>
                        </div>
                      </>
                    ) : (
                      <p className="text-[11px] text-amber-800 flex items-center gap-1.5"><AlertTriangle size={13} /> Master Raise & Fall untuk {selected} belum diisi.</p>
                    )
                  ) : scheme === "KURS_TRANSAKSI_USD" ? (
                    <p className="text-[11px] text-slate-600">Tidak ada indeks eskalasi (RF = 1). Tarif USD dikonversi ke Rupiah dengan kurs transaksi / M-Rate BI periode tagihan.</p>
                  ) : (
                    <p className="text-[11px] text-slate-600">Skema Raise & Fall tidak diatur di Master Customer, tarif dibayar sesuai kontrak tanpa eskalasi.</p>
                  )}
                </div>

                {/* Jarak angkut dari Master Variable SOW */}
                {(distanceSows.length > 0 || distanceTiers.length > 0) && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-[4px] space-y-2">
                    <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Parameter Jarak Angkut (Overhaul / Overdistance)</h5>
                    {distanceSows.map((s) => (
                      <div key={s.id} className="flex flex-wrap justify-between gap-2">
                        <span className="text-slate-500">{s.itemName} (basis {Number(s.baseDistanceMeters).toLocaleString("id-ID")} m):</span>
                        <strong className="tabular-nums">
                          {Number(s.rateIDR) > 0 ? formatIDR(s.rateIDR) : `USD ${Number(s.rateUSD || 0).toLocaleString("id-ID", { maximumFractionDigits: 3 })}`} / {s.unit || "-"}
                          {" "}({record?.overhaulRateUnit === "PER_1000M" ? "per 1.000 m" : "per 100 m"})
                        </strong>
                      </div>
                    ))}
                    {distanceTiers.map((s) => (
                      <div key={s.id} className="flex justify-between gap-2">
                        <span className="text-slate-500">Rentang {Number(s.baseDistanceMeters || 0).toLocaleString("id-ID")}–{Number(s.maxDistanceMeters).toLocaleString("id-ID")} m:</span>
                        <strong className="tabular-nums">{formatIDR(s.rateIDR)} / {s.unit || "-"}</strong>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-[4px] space-y-2">
                  <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Pajak & Rekening Default</h5>
                  <div className="flex justify-between"><span className="text-slate-500">PPN / PPh 23:</span><strong>12% × DPP 11/12 (efektif 11%) / 2%</strong></div>
                  <div className="flex justify-between"><span className="text-slate-500">Bank AAP:</span><strong>{bank ? `${bank.bankName} (A/C ${bank.accountNo})` : "Belum diatur di Master Customer"}</strong></div>
                </div>
              </div>
            )}

            {/* SUB-TAB 3: PLAYGROUND SIMULATION — memakai mesin hitung BA yang sama (calculateBACommercialBreakdown) */}
            {setupSubTab === "simulation" && (() => {
              const kurs = latestPeriodMRate(masterRegistry.exchangeRates).rate;
              const tier = isCoalModel ? activeTier : "";
              const rateOf = (s: any) => { const idr = sowTierRate(s, tier); return idr > 0 ? idr : Number(s?.rateUSD || 0) * kurs; };
              const mainSows = registrySows.filter((s) => !isDistanceItem({ ...s, material: s.itemName }));
              const productSow = mainSows.find((s) => !isOBMaterial(s.itemName) && /coal|batubara|ore|limonite|saprolit|nikel|nickel/i.test(s.itemName || ""));
              const obSows = obSplit.length > 1 ? obSplit : mainSows.filter((s) => isOBMaterial(s.itemName)).slice(0, 1);

              const coalVol = simCoalVolume || 0;
              const obVol = simOBVolume || 0;
              const maxSR = params.maxStrippingRatio;
              const maxQuotaOB = maxSR > 0 ? coalVol * maxSR : obVol;
              const billableOB = Math.min(obVol, maxQuotaOB);
              const excessOB = obVol - billableOB;
              const rfIndex = scheme !== "KURS_TRANSAKSI_USD" && Number(rf?.rfIndexResult) > 0 ? Number(rf.rfIndexResult) : 1;

              const items = [
                ...(productSow ? [{ id: "sim-product", material: productSow.itemName, unit: productSow.unit, initialVolume: coalVol, rate: rateOf(productSow) }] : []),
                ...obSows.map((s, i) => ({
                  id: `sim-ob-${i}`, material: s.itemName, unit: s.unit,
                  initialVolume: billableOB * (obSows.length > 1 ? Number(s.splitPercentage) : 100) / 100,
                  rate: rateOf(s),
                })),
              ];
              const missingRate = items.length === 0 || items.some((it) => !(it.rate > 0));
              const b = calculateBACommercialBreakdown(selected, items, rfIndex, false, false);

              return (
                <div className="p-5 space-y-4 text-xs">
                  <div className="bg-slate-50 border border-slate-200 rounded-[4px] p-3.5 space-y-1">
                    <h4 className="font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <Zap size={15} className="text-amber-600" /> Live Simulation Playground: Perhitungan Otomatis BA & Invoice ({selected})
                    </h4>
                    <p className="text-slate-600 text-[11px]">
                      Masukkan volume hasil survei. Tarif, tier Coal Index, kuota SR, Raise & Fall, dan pajak diambil dari master data dan dihitung dengan mesin kalkulasi BA yang sama.
                    </p>
                  </div>

                  {missingRate && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-[4px] text-amber-900 text-[11px] flex items-center gap-1.5">
                      <AlertTriangle size={13} /> Sebagian tarif produk / OB untuk {selected} belum ada di Master Variable SOW{kurs > 0 ? "" : " atau M-Rate BI belum diisi"}; hasil simulasi belum lengkap.
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Volume {productSow ? `${productSow.itemName} (${productSow.unit || "Ton"})` : "Batubara / Ore (Ton)"}
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
                      {maxSR > 0 && (
                        <>
                          <div className="flex justify-between"><span className="text-slate-500">Kapasitas Kuota Kontrak ({maxSR}x):</span><strong className="tabular-nums text-slate-900">{maxQuotaOB.toLocaleString("id-ID")} BCM</strong></div>
                          <div className="flex justify-between"><span className="text-slate-500">Volume OB Siap Ditagih:</span><strong className="tabular-nums text-emerald-800">{billableOB.toLocaleString("id-ID")} BCM</strong></div>
                          <div className="flex justify-between"><span className="text-slate-500">Alokasi Pending Volume:</span><strong className={`tabular-nums ${excessOB > 0 ? "text-amber-700 font-bold" : "text-slate-400"}`}>{excessOB > 0 ? `+${excessOB.toLocaleString("id-ID")} BCM (Carry-Over)` : "0 BCM"}</strong></div>
                        </>
                      )}
                      <div className="border-t border-slate-200 pt-2 space-y-1">
                        {items.map((it) => (
                          <div key={it.id} className="flex justify-between gap-2">
                            <span className="text-slate-500">{it.material}{tier ? ` (${tier})` : ""}:</span>
                            <strong className="tabular-nums">{Math.round(it.initialVolume).toLocaleString("id-ID")} × {formatIDR(it.rate, 2)}</strong>
                          </div>
                        ))}
                        <div className="flex justify-between"><span className="text-slate-500">Faktor Raise & Fall:</span><strong className="tabular-nums">{b.rfRateFactor.toFixed(3)}x</strong></div>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-[4px] space-y-2">
                      <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">2. Proyeksi Nominal Tagihan (Invoice)</h5>
                      <div className="flex justify-between"><span className="text-slate-500">Pokok (Produk + OB):</span><strong className="tabular-nums text-slate-900">{formatIDR(b.basePokok)}</strong></div>
                      {b.rfAmount !== 0 && <div className="flex justify-between"><span className="text-slate-500">Eskalasi Raise & Fall:</span><strong className="tabular-nums text-slate-900">{formatIDR(b.rfAmount)}</strong></div>}
                      <div className="flex justify-between"><span className="text-slate-500">Subtotal DPP (Gross):</span><strong className="tabular-nums text-slate-900">{formatIDR(b.totalGross)}</strong></div>
                      <div className="flex justify-between"><span className="text-slate-500">PPN (12% × DPP 11/12):</span><strong className="tabular-nums text-emerald-700">+{formatIDR(b.ppnAmount)}</strong></div>
                      <div className="flex justify-between"><span className="text-slate-500">PPh 23 (2% Kredit Pajak):</span><strong className="tabular-nums text-rose-700">-{formatIDR(b.pph23Amount)}</strong></div>
                      <div className="flex justify-between border-t border-slate-300 pt-1.5 font-bold text-sm bg-white p-2 rounded-[3px] border">
                        <span className="text-slate-900">Estimasi Uang Masuk Bersih:</span>
                        <strong className="tabular-nums text-emerald-800">{formatIDR(b.totalDibayar ?? b.netTotalInvoice)}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
          )}
        </div>
      )}

    </>
  );
}
