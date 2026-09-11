import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Lock,
  Plus,
  RefreshCw,
  Send,
  ThumbsDown,
  ThumbsUp,
  Undo2,
  WalletCards,
  X,
  Calendar,
  Layers,
  PieChart,
  FileText,
  Download,
  Search,
  Building2,
  Scale
} from "lucide-react";
import * as XLSX from "xlsx";
import { PageHeader } from "../components/PageHeader";
import { FeastToolbar } from "../components/ui/FeastToolbar";
import {
  approveBudget,
  createBudget,
  deleteBudget,
  getBudgetVsActual,
  getBudgets,
  getCompanies,
  getMasterData,
  lockBudget,
  rejectBudget,
  reviseBudget,
  submitBudget,
  updateBudget,
  type Budget,
  type Company,
  type MasterRecord,
  type BudgetInput
} from "../lib/api";

export type BudgetMode = "annual" | "monthly" | "submission" | "approval" | "revision" | "transfer" | "vsactual";

const MODE_LABEL: Record<BudgetMode, string> = {
  annual: "Annual Budget",
  monthly: "Monthly Budget",
  submission: "Budget Submission",
  approval: "Budget Approval",
  revision: "Budget Revision",
  transfer: "Budget Transfer",
  vsactual: "Budget versus Actual"
};

const formatIDR = (n: number | undefined | null) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(n ?? 0));

const STATUS_TONE: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-700 border border-slate-300",
  "Waiting Approval": "bg-amber-50 text-amber-800 border border-amber-200",
  Published: "bg-emerald-50 text-emerald-800 border border-emerald-200",
  Rejected: "bg-rose-50 text-rose-800 border border-rose-200",
  Locked: "bg-slate-100 text-slate-800 border border-slate-300",
  Revised: "bg-sky-50 text-sky-800 border border-sky-200"
};

export function BudgetManagementPage({ viewTitle, onNotice }: { viewTitle: string; onNotice?: (m: string) => void }) {
  const mode = (Object.keys(MODE_LABEL).find((m) => MODE_LABEL[m as BudgetMode] === viewTitle) ?? "annual") as BudgetMode;
  const isVsActual = mode === "vsactual";

  const [rows, setRows] = useState<Budget[]>([]);
  const [vsActual, setVsActual] = useState<{ period: string; budget: number; actual: number; used: number; variance: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState("");
  const [notice, setNotice] = useState("");

  const [companies, setCompanies] = useState<Company[]>([]);
  const [accounts, setAccounts] = useState<MasterRecord[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [form, setForm] = useState<BudgetInput>({ fiscalYear: new Date().getFullYear(), periodMonth: 1, companyId: 0, accountId: 0, amount: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (isVsActual) {
        const data = await getBudgetVsActual(fiscalYear);
        setVsActual(Array.isArray(data) ? data : []);
      } else {
        const neededStatus =
          mode === "submission" ? "Draft"
          : mode === "approval" ? "Waiting Approval"
          : mode === "revision" ? "Revised"
          : mode === "transfer" ? "Published"
          : undefined;
        const data = await getBudgets(neededStatus, undefined, fiscalYear);
        setRows(Array.isArray(data) ? data : []);
      }
    } catch (err: any) {
      setNotice(err instanceof Error ? err.message : "Gagal memuat data budget");
    } finally {
      setLoading(false);
    }
  }, [mode, fiscalYear, isVsActual]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getCompanies().then((c) => { if (Array.isArray(c)) setCompanies(c); }).catch(() => {});
    getMasterData({ type: "chart_of_accounts" }).then((a) => { setAccounts(Array.isArray(a) ? a : []); }).catch(() => {});
  }, []);

  function setNoticeMsg(m: string) {
    setNotice(m);
    onNotice?.(m);
  }

  const filteredRows = useMemo(() => {
    if (!searchTerm) return rows;
    const q = searchTerm.toLowerCase();
    return rows.filter(
      (b) =>
        b.accountName?.toLowerCase().includes(q) ||
        b.accountCode?.toLowerCase().includes(q) ||
        b.companyName?.toLowerCase().includes(q) ||
        b.companyCode?.toLowerCase().includes(q) ||
        b.status?.toLowerCase().includes(q)
    );
  }, [rows, searchTerm]);

  const stats = useMemo(() => {
    if (isVsActual) {
      const totalBudget = vsActual.reduce((s, r) => s + (r.budget || 0), 0);
      const totalActual = vsActual.reduce((s, r) => s + (r.actual || 0), 0);
      const variance = totalBudget - totalActual;
      const pct = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;
      return { totalBudget, totalActual, variance, pct, count: vsActual.length };
    }
    const totalBudget = filteredRows.reduce((s, r) => s + (r.amount || 0), 0);
    const totalUtilized = filteredRows.reduce((s, r) => s + (r.utilized || 0), 0);
    const sisa = totalBudget - totalUtilized;
    const pct = totalBudget > 0 ? (totalUtilized / totalBudget) * 100 : 0;
    return { totalBudget, totalActual: totalUtilized, variance: sisa, pct, count: filteredRows.length };
  }, [isVsActual, vsActual, filteredRows]);

  const exportToExcel = () => {
    if (isVsActual) {
      const data = vsActual.map((r) => ({
        "Periode": r.period,
        "Anggaran (IDR)": r.budget,
        "Realisasi (IDR)": r.actual,
        "Terpakai (%)": r.budget ? ((r.used / r.budget) * 100).toFixed(2) : "0",
        "Variansi (IDR)": r.variance
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Budget_vs_Actual");
      XLSX.writeFile(wb, `Budget_vs_Actual_${fiscalYear}.xlsx`);
      return;
    }

    const data = filteredRows.map((b) => ({
      "Kode Akun": b.accountCode ?? "",
      "Nama Akun": b.accountName ?? "",
      "Company": b.companyName ?? b.companyCode ?? "",
      "Tahun": b.fiscalYear,
      "Bulan": b.periodMonth,
      "Anggaran (IDR)": b.amount,
      "Realisasi (IDR)": b.utilized,
      "Status": b.status
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Budget_List");
    XLSX.writeFile(wb, `Budget_${MODE_LABEL[mode]}_${fiscalYear}.xlsx`);
  };

  function openCreate() {
    setEditing(null);
    setForm({ fiscalYear: fiscalYear, periodMonth: 1, companyId: companies[0]?.id ?? 0, accountId: Number(accounts[0]?.id ?? 0), amount: 0 });
    setModalOpen(true);
  }

  function openEdit(b: Budget) {
    setEditing(b);
    setForm({ fiscalYear: b.fiscalYear, periodMonth: b.periodMonth, companyId: b.companyId, accountId: b.accountId, amount: b.amount });
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyId || !form.accountId || !form.amount) {
      setNoticeMsg("Company, Akun, dan Jumlah wajib diisi.");
      return;
    }
    try {
      if (editing) {
        const updated: any = await updateBudget(editing.id, form);
        // 🚀 Optimistic UI Update
        setRows((prev) => prev.map((r) => r.id === editing.id ? (updated || { ...r, ...form }) : r));
      } else {
        const created: any = await createBudget(form);
        // 🚀 Optimistic UI Update
        setRows((prev) => [created || { id: Date.now(), ...form } as any, ...prev]);
      }
      setModalOpen(false);
      setNoticeMsg(editing ? "Budget diperbarui." : "Budget berhasil dibuat.");
      await load();
    } catch (err: any) {
      setNoticeMsg(err?.message || "Gagal menyimpan budget.");
    }
  }

  async function action(label: string, fn: (note: string) => Promise<unknown>) {
    if (!window.confirm(`Lanjutkan aksi "${label}"?`)) return;
    try {
      await fn("");
      setNoticeMsg(`${label} berhasil.`);
      await load();
    } catch (err: any) {
      setNoticeMsg(err?.message || `Gagal melakukan ${label}.`);
    }
  }

  async function remove(b: Budget) {
    if (!window.confirm(`Hapus budget ${b.accountCode ?? b.accountId}?`)) return;
    // 🚀 Optimistic UI Update
    setRows((prev) => prev.filter((item) => item.id !== b.id));
    try {
      await deleteBudget(b.id);
      setNoticeMsg("Budget dihapus.");
      await load();
    } catch (err: any) {
      setNoticeMsg(err?.message || "Gagal menghapus budget.");
      await load();
    }
  }

  return (
    <div className="space-y-4">
      {/* Stat Cards — FEAST Enterprise High Density Standard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Anggaran", value: formatIDR(stats.totalBudget), sub: `Tahun Fiskal ${fiscalYear}`, icon: WalletCards, accent: "#A57C50", small: true },
          { label: "Realisasi Aktual", value: formatIDR(stats.totalActual), sub: `${stats.pct.toFixed(1)}% terserap`, icon: PieChart, accent: "#16a34a", small: true },
          { label: "Sisa Anggaran", value: formatIDR(stats.variance), sub: "Tersedia untuk alokasi", icon: Scale, accent: stats.variance < 0 ? "#dc2626" : "#2563eb", small: true },
          { label: "Total Pos Anggaran", value: stats.count, sub: `${MODE_LABEL[mode]}`, icon: FileText, accent: "#64748b" },
        ].map((c, i) => (
          <div key={i} className="bg-white border border-slate-200 p-4 shadow-sm" style={{ borderRadius: 4 }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{c.label}</span>
              <c.icon className="w-3.5 h-3.5" style={{ color: c.accent }} />
            </div>
            <div className={`font-bold text-slate-900 ${c.small ? "text-sm leading-tight" : "text-2xl"}`}>{c.value}</div>
            <div className="text-[11px] text-slate-400 mt-1">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Unified Enterprise Toolbar */}
      <FeastToolbar
        primaryActionLabel={!isVsActual ? "Buat Budget" : undefined}
        primaryActionIcon={Plus}
        onPrimaryAction={openCreate}
        searchTerm={!isVsActual ? searchTerm : undefined}
        onSearchChange={!isVsActual ? setSearchTerm : undefined}
        searchPlaceholder="Cari akun / kode / company..."
        filters={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1" style={{ borderRadius: 3 }}>
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-500 font-medium">Tahun:</span>
              <select
                value={fiscalYear}
                onChange={(e) => setFiscalYear(Number(e.target.value))}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        }
        onRefresh={load}
        isRefreshing={loading}
        onExport={exportToExcel}
        exportTitle="Ekspor Excel"
      />

      {notice && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-between" style={{ borderRadius: 4 }}>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice("")} className="text-amber-600 hover:text-amber-800 text-xs font-bold">Tutup</button>
        </div>
      )}

      {/* Main Table Content */}
      {isVsActual ? (
        <div className="bg-white border border-slate-200 shadow-sm overflow-hidden" style={{ borderRadius: 4 }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left">Periode</th>
                  <th className="px-4 py-3 text-right">Anggaran</th>
                  <th className="px-4 py-3 text-right">Realisasi</th>
                  <th className="px-4 py-3 text-right">Terpakai %</th>
                  <th className="px-4 py-3 text-right">Variansi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {vsActual.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                      Belum ada data realisasi anggaran untuk tahun {fiscalYear}.
                    </td>
                  </tr>
                ) : (
                  vsActual.map((r) => {
                    const pct = r.budget ? (r.used / r.budget) * 100 : 0;
                    const tone = pct > 100 ? "text-rose-600 font-bold" : pct > 80 ? "text-amber-600 font-bold" : "text-emerald-700 font-bold";
                    return (
                      <tr key={r.period} className="hover:bg-[#FBF6F0] transition-colors">
                        <td className="px-4 py-2.5 font-bold text-slate-800">{r.period}</td>
                        <td className="px-4 py-2.5 text-right font-tabular text-slate-800">{formatIDR(r.budget)}</td>
                        <td className="px-4 py-2.5 text-right font-tabular text-slate-800">{formatIDR(r.actual)}</td>
                        <td className={`px-4 py-2.5 text-right font-tabular ${tone}`}>{pct.toFixed(1)}%</td>
                        <td className="px-4 py-2.5 text-right font-tabular text-slate-800">{formatIDR(r.variance)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 shadow-sm overflow-hidden" style={{ borderRadius: 4 }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left">Akun (COA)</th>
                  <th className="px-4 py-3 text-left">Company</th>
                  <th className="px-4 py-3 text-right">Periode</th>
                  <th className="px-4 py-3 text-right">Anggaran</th>
                  <th className="px-4 py-3 text-right">Realisasi</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                      {searchTerm ? "Tidak ditemukan anggaran yang sesuai pencarian." : "Belum ada data anggaran untuk periode ini."}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((b) => (
                    <tr key={b.id} className="hover:bg-[#FBF6F0] transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="font-bold text-slate-900">{b.accountName ?? b.accountCode ?? `Akun #${b.accountId}`}</div>
                        {b.accountCode && <div className="text-[11px] text-slate-400 font-mono">{b.accountCode}</div>}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-700">{b.companyName ?? b.companyCode ?? `#${b.companyId}`}</td>
                      <td className="px-4 py-2.5 text-right font-tabular whitespace-nowrap text-slate-600">{b.fiscalYear} / {String(b.periodMonth).padStart(2, "0")}</td>
                      <td className="px-4 py-2.5 text-right font-tabular font-bold text-slate-900">{formatIDR(b.amount)}</td>
                      <td className="px-4 py-2.5 text-right font-tabular text-slate-700">{formatIDR(b.utilized)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_TONE[b.status] ?? "bg-slate-100 text-slate-700"}`} style={{ borderRadius: 3 }}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          {b.status === "Draft" && (
                            <>
                              <button
                                title="Edit"
                                onClick={() => openEdit(b)}
                                className="px-2 py-1 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] font-semibold"
                                style={{ borderRadius: 3 }}
                              >
                                Edit
                              </button>
                              <button
                                title="Ajukan"
                                onClick={() => action("Submit", (n) => submitBudget(b.id, n))}
                                className="p-1 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                                style={{ borderRadius: 3 }}
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                              <button
                                title="Hapus"
                                onClick={() => remove(b)}
                                className="p-1 text-rose-600 hover:bg-rose-50 hover:text-rose-800"
                                style={{ borderRadius: 3 }}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {b.status === "Waiting Approval" && (
                            <>
                              <button
                                title="Setujui"
                                onClick={() => action("Approve", (n) => approveBudget(b.id, n))}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold inline-flex items-center gap-1"
                                style={{ borderRadius: 3 }}
                              >
                                <ThumbsUp className="w-3 h-3" /> Setujui
                              </button>
                              <button
                                title="Tolak"
                                onClick={() => action("Reject", (n) => rejectBudget(b.id, n))}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold inline-flex items-center gap-1"
                                style={{ borderRadius: 3 }}
                              >
                                <ThumbsDown className="w-3 h-3" /> Tolak
                              </button>
                            </>
                          )}
                          {b.status === "Published" && (
                            <>
                              <button
                                title="Kunci"
                                onClick={() => action("Lock", (n) => lockBudget(b.id, n))}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold inline-flex items-center gap-1"
                                style={{ borderRadius: 3 }}
                              >
                                <Lock className="w-3 h-3" /> Kunci
                              </button>
                              <button
                                title="Revisi"
                                onClick={() => action("Revise", (n) => reviseBudget(b.id, n))}
                                className="px-2 py-1 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] font-semibold inline-flex items-center gap-1"
                                style={{ borderRadius: 3 }}
                              >
                                <Undo2 className="w-3 h-3" /> Revisi
                              </button>
                            </>
                          )}
                          {(b.status === "Rejected" || b.status === "Revised") && (
                            <button
                              title="Ajukan Ulang"
                              onClick={() => action("Submit", (n) => submitBudget(b.id, n))}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold inline-flex items-center gap-1"
                              style={{ borderRadius: 3 }}
                            >
                              <Send className="w-3 h-3" /> Ajukan Ulang
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <div className="bg-white max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 text-sm" style={{ borderRadius: 4 }}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <WalletCards className="w-4 h-4 text-[#A57C50]" />
                {editing ? "Edit Alokasi Budget" : "Buat Alokasi Budget"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                style={{ borderRadius: 3 }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block sm:col-span-2">
                <span className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide">Company</span>
                <select
                  value={form.companyId}
                  onChange={(e) => setForm({ ...form, companyId: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#A57C50] focus:bg-white transition-colors"
                  style={{ borderRadius: 3 }}
                >
                  <option value={0}>— Pilih Entitas / Company —</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                  ))}
                </select>
              </label>

              <label className="block sm:col-span-2">
                <span className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide">Akun (Chart of Accounts)</span>
                <select
                  value={form.accountId}
                  onChange={(e) => setForm({ ...form, accountId: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#A57C50] focus:bg-white transition-colors"
                  style={{ borderRadius: 3 }}
                >
                  <option value={0}>— Pilih Akun COA —</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{(a as any).code ?? ""} - {(a as any).name ?? `Akun #${a.id}`}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide">Tahun Fiskal</span>
                <input
                  type="number"
                  value={form.fiscalYear}
                  onChange={(e) => setForm({ ...form, fiscalYear: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#A57C50] focus:bg-white transition-colors"
                  style={{ borderRadius: 3 }}
                />
              </label>

              <label className="block">
                <span className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide">Bulan (1-12)</span>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={form.periodMonth}
                  onChange={(e) => setForm({ ...form, periodMonth: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#A57C50] focus:bg-white transition-colors"
                  style={{ borderRadius: 3 }}
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide">Jumlah Anggaran (IDR)</span>
                <input
                  type="number"
                  value={form.amount || ""}
                  onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                  placeholder="0"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#A57C50] focus:bg-white transition-colors font-tabular"
                  style={{ borderRadius: 3 }}
                />
              </label>

              <div className="sm:col-span-2 flex items-center justify-end gap-2 mt-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  style={{ borderRadius: 3 }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white text-xs font-semibold transition-colors hover:brightness-95 shadow-sm inline-flex items-center gap-1.5"
                  style={{ background: "#A57C50", borderRadius: 3 }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Simpan Alokasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

