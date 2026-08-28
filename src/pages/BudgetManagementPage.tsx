import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Lock, Plus, RefreshCw, Send, ThumbsDown, ThumbsUp, Undo2, WalletCards, X } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
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

const fmt = (n: number | undefined | null) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(n ?? 0));

const STATUS_TONE: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-700",
  "Waiting Approval": "bg-amber-100 text-amber-800",
  Published: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-rose-100 text-rose-800",
  Locked: "bg-indigo-100 text-indigo-800",
  Revised: "bg-sky-100 text-sky-800"
};

export function BudgetManagementPage({ viewTitle, onNotice }: { viewTitle: string; onNotice?: (m: string) => void }) {
  const mode = (Object.keys(MODE_LABEL).find((m) => MODE_LABEL[m as BudgetMode] === viewTitle) ?? "annual") as BudgetMode;
  const isVsActual = mode === "vsactual";

  const [rows, setRows] = useState<Budget[]>([]);
  const [vsActual, setVsActual] = useState<{ period: string; budget: number; actual: number; used: number; variance: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [notice, setNotice] = useState("");

  const [companies, setCompanies] = useState<Company[]>([]);
  const [accounts, setAccounts] = useState<MasterRecord[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [form, setForm] = useState<BudgetInput>({ fiscalYear: new Date().getFullYear(), periodMonth: 1, companyId: 0, accountId: 0, amount: 0 });

  const load = useCallback(async () => {
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
      if (editing) await updateBudget(editing.id, form);
      else await createBudget(form);
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
    try {
      await deleteBudget(b.id);
      setNoticeMsg("Budget dihapus.");
      await load();
    } catch (err: any) {
      setNoticeMsg(err?.message || "Gagal menghapus budget.");
    }
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title={MODE_LABEL[mode]}
        description="Kelola anggaran perusahaan: perencanaan, pengajuan, persetujuan, revisi, transfer, dan perbandingan realisasi."
        meta={
          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
              Tahun
              <select value={fiscalYear} onChange={(e) => setFiscalYear(Number(e.target.value))} className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold">
                {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
            <button className="ghost" onClick={() => load()}><RefreshCw size={14} /> Muat Ulang</button>
            {!isVsActual && <button className="primary" onClick={openCreate}><Plus size={14} /> Buat Budget</button>}
          </div>
        }
      />

      {notice && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={14} /> {notice}
        </div>
      )}

      {isVsActual ? (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">Periode</th>
                  <th className="px-4 py-3 text-right font-bold">Anggaran</th>
                  <th className="px-4 py-3 text-right font-bold">Realisasi</th>
                  <th className="px-4 py-3 text-right font-bold">Terpakai %</th>
                  <th className="px-4 py-3 text-right font-bold">Variansi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vsActual.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Belum ada data.</td></tr>}
                {vsActual.map((r) => {
                  const pct = r.budget ? (r.used / r.budget) * 100 : 0;
                  const tone = pct > 100 ? "text-rose-600" : pct > 80 ? "text-amber-600" : "text-emerald-600";
                  return (
                    <tr key={r.period} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-700">{r.period}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmt(r.budget)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmt(r.actual)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums font-bold ${tone}`}>{pct.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmt(r.variance)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">Akun</th>
                  <th className="px-4 py-3 text-left font-bold">Company</th>
                  <th className="px-4 py-3 text-right font-bold">Periode</th>
                  <th className="px-4 py-3 text-right font-bold">Anggaran</th>
                  <th className="px-4 py-3 text-right font-bold">Realisasi</th>
                  <th className="px-4 py-3 text-left font-bold">Status</th>
                  <th className="px-4 py-3 text-right font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Belum ada data budget.</td></tr>}
                {rows.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-700">{b.accountName ?? b.accountCode ?? `Akun #${b.accountId}`}</div>
                      {b.accountCode && <div className="text-[11px] text-slate-400">{b.accountCode}</div>}
                    </td>
                    <td className="px-4 py-3">{b.companyName ?? b.companyCode ?? `#${b.companyId}`}</td>
                    <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">{b.fiscalYear} / {String(b.periodMonth).padStart(2, "0")}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold">{fmt(b.amount)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmt(b.utilized)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold ${STATUS_TONE[b.status] ?? "bg-slate-100 text-slate-600"}`}>{b.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {(b.status === "Draft") && (
                          <>
                            <button title="Edit" className="icon-btn" onClick={() => openEdit(b)}>✎</button>
                            <button title="Ajukan" className="icon-btn text-emerald-600" onClick={() => action("Submit", (n) => submitBudget(b.id, n))}><Send size={14} /></button>
                            <button title="Hapus" className="icon-btn text-rose-600" onClick={() => remove(b)}><X size={14} /></button>
                          </>
                        )}
                        {b.status === "Waiting Approval" && (
                          <>
                            <button title="Setujui" className="icon-btn text-emerald-600" onClick={() => action("Approve", (n) => approveBudget(b.id, n))}><ThumbsUp size={14} /></button>
                            <button title="Tolak" className="icon-btn text-rose-600" onClick={() => action("Reject", (n) => rejectBudget(b.id, n))}><ThumbsDown size={14} /></button>
                          </>
                        )}
                        {b.status === "Published" && (
                          <>
                            <button title="Kunci" className="icon-btn text-indigo-600" onClick={() => action("Lock", (n) => lockBudget(b.id, n))}><Lock size={14} /></button>
                            <button title="Revisi" className="icon-btn text-sky-600" onClick={() => action("Revise", (n) => reviseBudget(b.id, n))}><Undo2 size={14} /></button>
                          </>
                        )}
                        {(b.status === "Rejected" || b.status === "Revised") && (
                          <button title="Ajukan Ulang" className="icon-btn text-emerald-600" onClick={() => action("Submit", (n) => submitBudget(b.id, n))}><Send size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <WalletCards size={18} className="text-[#20a6b8]" /> {editing ? "Edit Budget" : "Buat Budget"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-xs font-bold text-slate-700 mb-1">Company</span>
                <select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#20a6b8] text-xs font-semibold">
                  <option value={0}>— Pilih —</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="block text-xs font-bold text-slate-700 mb-1">Akun (Chart of Accounts)</span>
                <select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#20a6b8] text-xs font-semibold">
                  <option value={0}>— Pilih —</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{(a as any).code ?? ""} {(a as any).name ?? `Akun #${a.id}`}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="block text-xs font-bold text-slate-700 mb-1">Tahun Fiskal</span>
                <input type="number" value={form.fiscalYear} onChange={(e) => setForm({ ...form, fiscalYear: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#20a6b8] text-xs font-semibold" />
              </label>
              <label className="block">
                <span className="block text-xs font-bold text-slate-700 mb-1">Bulan (1-12)</span>
                <input type="number" min={1} max={12} value={form.periodMonth} onChange={(e) => setForm({ ...form, periodMonth: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#20a6b8] text-xs font-semibold" />
              </label>
              <label className="block sm:col-span-2">
                <span className="block text-xs font-bold text-slate-700 mb-1">Jumlah Anggaran (IDR)</span>
                <input type="number" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#20a6b8] text-xs font-semibold" />
              </label>
              <div className="sm:col-span-2 flex items-center justify-end gap-2 mt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50">Batal</button>
                <button type="submit" className="px-4 py-2 bg-[#20a6b8] hover:bg-[#1c92a2] text-white rounded-xl text-xs font-bold inline-flex items-center gap-2">
                  <CheckCircle2 size={14} /> Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
