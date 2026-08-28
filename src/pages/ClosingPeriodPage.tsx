import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronRight, Lock, Play, RotateCcw, ShieldCheck } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import {
  advanceClosingStep,
  getClosingPeriods,
  resetClosing,
  startClosing,
  lockClosingPeriod,
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

export function ClosingPeriodPage({ viewTitle = "Period Closing" }: { viewTitle?: string }) {
  const [periods, setPeriods] = useState<ClosingStep[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const currentYear = new Date().getFullYear();
  const monthOptions = Array.from({ length: 12 }, (_, i) => `${currentYear}-${String(i + 1).padStart(2, "0")}`);

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

  const current = periods.find((p) => p.period === selected);
  const currentIdx = current ? STEPS.indexOf(current.step) : 0;
  const isClosed = current?.status === "Closed" || current?.step === STEPS[STEPS.length - 1];

  function setNoticeMsg(m: string) { setNotice(m); }

  async function run(label: string, fn: (p: string) => Promise<ClosingStep>) {
    if (!selected) { setNoticeMsg("Pilih periode terlebih dahulu."); return; }
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
