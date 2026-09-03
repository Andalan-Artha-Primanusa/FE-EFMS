import { useCallback, useEffect, useState, useMemo } from "react";
import { 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  Lock, 
  Play, 
  RotateCcw, 
  ShieldCheck, 
  Scale, 
  AlertTriangle, 
  FileCheck, 
  ShieldAlert 
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import {
  advanceClosingStep,
  getClosingPeriods,
  resetClosing,
  startClosing,
  lockClosingPeriod,
  getJournals,
  getTrialBalance,
  type ClosingStep
} from "../lib/api";

const STEPS = [
  "Accrual & Adjustment Journal",
  "Depreciation Posting",
  "Review Trial Balance",
  "Financial Review & Approval",
  "Close Period Lock"
];

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "—");
const formatIDR = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0);

export function ClosingPeriodPage({ viewTitle = "Period Closing" }: { viewTitle?: string }) {
  const [periods, setPeriods] = useState<ClosingStep[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [periodJournals, setPeriodJournals] = useState<any[]>([]);
  const [tbData, setTbData] = useState<any[]>([]);

  const currentYear = new Date().getFullYear();
  const monthOptions = Array.from({ length: 12 }, (_, i) => `${currentYear}-${String(i + 1).padStart(2, "0")}`);

  const loadAuditChecklist = useCallback(async (period: string) => {
    if (!period) return;
    try {
      const [jList, tb] = await Promise.all([
        getJournals().catch(() => []),
        getTrialBalance(period).catch(() => [])
      ]);
      const filtered = (jList || []).filter((j: any) => {
        if (!j.journalDate) return false;
        const d = new Date(j.journalDate);
        const p = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return p === period;
      });
      setPeriodJournals(filtered);
      setTbData(tb || []);
    } catch (e) {
      // ignore
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getClosingPeriods();
      setPeriods(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setNotice(err instanceof Error ? err.message : "Gagal memuat periode.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!selected && periods.length > 0) setSelected(periods[0].period);
  }, [periods, selected]);

  useEffect(() => {
    if (selected) {
      loadAuditChecklist(selected);
    }
  }, [selected, loadAuditChecklist]);

  const current = periods.find((p) => p.period === selected);
  const currentIdx = current ? STEPS.indexOf(current.step) : 0;
  const isClosed = current?.status === "Closed" || current?.step === STEPS[STEPS.length - 1];

  // Audit calculations for pre-closing checklist
  const draftJournals = useMemo(() => periodJournals.filter(j => !j.status || j.status === "Draft"), [periodJournals]);
  const approvedJournals = useMemo(() => periodJournals.filter(j => j.status === "Approved"), [periodJournals]);
  const postedJournals = useMemo(() => periodJournals.filter(j => j.status === "Posted to GL"), [periodJournals]);
  const reversedJournals = useMemo(() => periodJournals.filter(j => j.status === "Reversed"), [periodJournals]);

  const totalTbDebit = useMemo(() => tbData.reduce((acc, r) => acc + (r.neracaSaldoDebit || 0), 0), [tbData]);
  const totalTbCredit = useMemo(() => tbData.reduce((acc, r) => acc + (r.neracaSaldoKredit || 0), 0), [tbData]);
  const isTbBalanced = useMemo(() => Math.abs(totalTbDebit - totalTbCredit) < 100, [totalTbDebit, totalTbCredit]);
  const isReadyToLock = draftJournals.length === 0 && isTbBalanced;

  function setNoticeMsg(m: string) { setNotice(m); }

  async function run(label: string, fn: (p: string) => Promise<ClosingStep>) {
    if (!selected) { setNoticeMsg("Pilih periode terlebih dahulu."); return; }
    if (label.toLowerCase().includes("lock") && draftJournals.length > 0) {
      if (!window.confirm(`Perhatian: Masih ada ${draftJournals.length} jurnal berstatus Draft pada periode ${selected}. Yakin ingin mengunci periode?`)) {
        return;
      }
    }
    setBusy(true);
    setNoticeMsg("");
    try {
      await fn(selected);
      setNoticeMsg(`${label} berhasil untuk ${selected}.`);
      await load();
    } catch (err: any) {
      setNoticeMsg(err?.message || `Gagal ${label}.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title={viewTitle}
        description="Sub-proses penutupan periode: akrual & jurnal penyesuaian, posting depresiasi, review trial balance, review & persetujuan, hingga kunci periode."
        meta={<button className="ghost" onClick={() => load()}><ShieldCheck size={14} /> Muat Ulang</button>}
      />

      {notice && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={14} /> {notice}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <label className="block">
          <span className="block text-xs font-bold text-slate-700 mb-1">Periode (Tahun-Bulan)</span>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#20a6b8] text-xs font-semibold"
          >
            <option value="">— Pilih Periode —</option>
            {monthOptions.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>

        {isClosed && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 size={14} /> Periode <b>{selected}</b> sudah terkunci (Closed).
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <button className="primary" disabled={busy || isClosed} onClick={() => run("Start closing", (p) => startClosing(p))}>
            <Play size={14} /> Mulai Closing
          </button>
          <button className="ghost" disabled={busy || !current || isClosed} onClick={() => run("Lanjut step", (p) => advanceClosingStep(p))}>
            <ChevronRight size={14} /> Lanjut Step Berikutnya
          </button>
          <button className="ghost" disabled={busy || !current || isClosed} onClick={() => run("Lock period", (p) => lockClosingPeriod(p))}>
            <Lock size={14} /> Kunci Periode
          </button>
          <button className="ghost text-amber-700" disabled={busy} onClick={() => run("Reset closing", (p) => resetClosing(p))}>
            <RotateCcw size={14} /> Reset ke Draft
          </button>
        </div>
      </div>

      {/* 🛡️ Enterprise Pre-Closing Audit & Readiness Checklist */}
      {selected && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Scale size={15} className="text-[#20a6b8]" /> Audit Pra-Closing & Kesiapan Tutup Buku ({selected})
            </span>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
              isReadyToLock ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"
            }`}>
              {isReadyToLock ? "✓ Siap Kunci Periode" : "⚠️ Perlu Review Auditor"}
            </span>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
            {/* Card 1: Balance Trial Balance */}
            <div className={`p-3.5 rounded-xl border ${isTbBalanced ? "bg-emerald-50/50 border-emerald-200" : "bg-rose-50/50 border-rose-200"}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-700">Keseimbangan Neraca Saldo</span>
                {isTbBalanced ? <CheckCircle2 size={16} className="text-emerald-600" /> : <ShieldAlert size={16} className="text-rose-600" />}
              </div>
              <div className="space-y-1 font-mono text-[11px]">
                <div className="flex justify-between text-slate-600"><span>Σ Debet:</span><span className="font-bold text-slate-900">{formatIDR(totalTbDebit)}</span></div>
                <div className="flex justify-between text-slate-600"><span>Σ Kredit:</span><span className="font-bold text-slate-900">{formatIDR(totalTbCredit)}</span></div>
                <div className={`flex justify-between pt-1 border-t font-bold ${isTbBalanced ? "text-emerald-700 border-emerald-200" : "text-rose-700 border-rose-200"}`}>
                  <span>Status:</span>
                  <span>{isTbBalanced ? "SEIMBANG (0 Diff)" : `SELISIH: ${formatIDR(Math.abs(totalTbDebit - totalTbCredit))}`}</span>
                </div>
              </div>
            </div>

            {/* Card 2: Journal Status Breakdown */}
            <div className={`p-3.5 rounded-xl border ${draftJournals.length === 0 ? "bg-emerald-50/50 border-emerald-200" : "bg-amber-50/50 border-amber-200"}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-700">Integritas Jurnal Transaksi</span>
                {draftJournals.length === 0 ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertTriangle size={16} className="text-amber-600" />}
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>Jurnal Draft (Unapproved):</span>
                  <span className={`font-bold font-mono ${draftJournals.length > 0 ? "text-amber-700" : "text-emerald-700"}`}>{draftJournals.length} JV</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Jurnal Approved:</span>
                  <span className="font-bold font-mono text-blue-700">{approvedJournals.length} JV</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Jurnal Posted to GL:</span>
                  <span className="font-bold font-mono text-slate-900">{postedJournals.length} JV</span>
                </div>
              </div>
            </div>

            {/* Card 3: Reversals & Control Summary */}
            <div className="p-3.5 rounded-xl border bg-slate-50 border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-700">Kontrol & Pembalikan (Reversal)</span>
                <FileCheck size={16} className="text-slate-500" />
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>Jurnal Dibalik (Reversed):</span>
                  <span className="font-bold font-mono text-amber-700">{reversedJournals.length} JV</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Entri Periode Ini:</span>
                  <span className="font-bold font-mono text-slate-900">{periodJournals.length} JV</span>
                </div>
                <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                  {draftJournals.length > 0 ? "Selesaikan approval seluruh jurnal draft sebelum melakukan closing." : "Seluruh jurnal telah diverifikasi & disetujui."}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Alur Penutupan Periode</span>
          {current && (
            <span className="text-xs font-bold text-[#20a6b8]">Status: {current.status} • Progres {current.progress}%</span>
          )}
        </div>
        <div className="px-4 py-4 space-y-2">
          {loading ? (
            <p className="text-xs text-slate-400 text-center py-4">Memuat...</p>
          ) : STEPS.map((step, i) => {
            const active = current && current.step === step;
            const done = currentIdx > i;
            const locked = step === STEPS[STEPS.length - 1] && isClosed;
            return (
              <div key={step} className={`flex items-center gap-3 p-3 rounded-xl border ${active ? "border-[#20a6b8] bg-sky-50" : done || locked ? "border-emerald-200 bg-emerald-50/60" : "border-slate-150 bg-slate-50"}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${done || locked ? "bg-emerald-500 text-white" : active ? "bg-[#20a6b8] text-white" : "bg-slate-200 text-slate-500"}`}>
                  {done || locked ? <CheckCircle2 size={15} /> : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-800">{step}</div>
                  {done && <div className="text-[11px] text-emerald-600 font-semibold">Selesai</div>}
                  {locked && <div className="text-[11px] text-indigo-600 font-semibold">Terkunci</div>}
                  {active && !locked && <div className="text-[11px] text-[#1c92a2] font-semibold">Sedang berjalan</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Riwayat Periode</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left font-bold">Periode</th>
                <th className="px-4 py-3 text-left font-bold">Step Aktif</th>
                <th className="px-4 py-3 text-right font-bold">Progres</th>
                <th className="px-4 py-3 text-left font-bold">Status</th>
                <th className="px-4 py-3 text-left font-bold">Dikunci</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {periods.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Belum ada proses closing.</td></tr>}
              {periods.map((p) => (
                <tr key={p.period} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelected(p.period)}>
                  <td className="px-4 py-3 font-bold text-slate-700">{p.period}</td>
                  <td className="px-4 py-3">{p.step}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{p.progress}%</td>
                  <td className="px-4 py-3"><span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold ${p.status === "Closed" ? "bg-indigo-100 text-indigo-800" : "bg-sky-100 text-sky-800"}`}>{p.status}</span></td>
                  <td className="px-4 py-3">{fmtDate(p.lockedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
