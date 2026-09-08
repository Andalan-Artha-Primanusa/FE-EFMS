import React, { useCallback, useEffect, useState, useMemo } from "react";
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
  ShieldAlert,
  Calendar,
  Layers,
  FileText
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
    <div className="space-y-4">
      {/* Top Metric Cards — High Density Enterprise Standard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Neraca Saldo",
            value: isTbBalanced ? "SEIMBANG" : "SELISIH",
            sub: isTbBalanced ? "0 Difference (Balanced)" : `Selisih ${formatIDR(Math.abs(totalTbDebit - totalTbCredit))}`,
            icon: Scale,
            accent: isTbBalanced ? "#16a34a" : "#dc2626",
            small: true
          },
          {
            label: "Jurnal Menunggu Review",
            value: draftJournals.length,
            sub: "Harus di-approve sebelum close",
            icon: AlertTriangle,
            accent: draftJournals.length > 0 ? "#d97706" : "#16a34a"
          },
          {
            label: "Jurnal Posted to GL",
            value: postedJournals.length,
            sub: `Dari total ${periodJournals.length} voucher`,
            icon: CheckCircle2,
            accent: "#A57C50"
          },
          {
            label: "Status Tutup Buku",
            value: current ? current.status : (isClosed ? "Closed" : "Open"),
            sub: `Progres alur: ${current?.progress ?? 0}%`,
            icon: Lock,
            accent: isClosed ? "#64748b" : "#2563eb",
            small: true
          },
        ].map((c, i) => (
          <div key={i} className="bg-white border border-slate-200 p-4 shadow-sm" style={{ borderRadius: 4 }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{c.label}</span>
              <c.icon className="w-3.5 h-3.5" style={{ color: c.accent }} />
            </div>
            <div className={`font-bold text-slate-900 ${c.small ? "text-base leading-tight" : "text-2xl"}`}>{c.value}</div>
            <div className="text-[11px] text-slate-400 mt-1">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Control & Toolbar Panel */}
      <div className="bg-white border border-slate-200 p-3.5 shadow-sm" style={{ borderRadius: 4 }}>
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Pilih Periode:</span>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#A57C50] focus:bg-white transition-colors"
              style={{ borderRadius: 3 }}
            >
              <option value="">— Pilih Periode —</option>
              {monthOptions.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy || isClosed}
              onClick={() => run("Start closing", (p) => startClosing(p))}
              className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-semibold transition-colors hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              style={{ background: "#A57C50", borderRadius: 3 }}
            >
              <Play className="w-3.5 h-3.5" /> Mulai Closing
            </button>

            <button
              type="button"
              disabled={busy || !current || isClosed}
              onClick={() => run("Lanjut step", (p) => advanceClosingStep(p))}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ borderRadius: 3 }}
            >
              <ChevronRight className="w-3.5 h-3.5" /> Lanjut Step
            </button>

            <button
              type="button"
              disabled={busy || !current || isClosed}
              onClick={() => run("Lock period", (p) => lockClosingPeriod(p))}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              style={{ borderRadius: 3 }}
            >
              <Lock className="w-3.5 h-3.5" /> Kunci Periode
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => run("Reset closing", (p) => resetClosing(p))}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-amber-800 hover:bg-amber-50 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ borderRadius: 3 }}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>
        </div>
      </div>

      {notice && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-between" style={{ borderRadius: 4 }}>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice("")} className="text-amber-600 hover:text-amber-800 text-xs font-bold">Tutup</button>
        </div>
      )}

      {/* Enterprise Pre-Closing Audit & Readiness Checklist */}
      {selected && (
        <div className="bg-white border border-slate-200 shadow-sm overflow-hidden" style={{ borderRadius: 4 }}>
          <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-[#A57C50]" /> Audit Pra-Closing & Kesiapan Tutup Buku ({selected})
            </span>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 border ${
              isReadyToLock ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-amber-50 text-amber-800 border-amber-300"
            }`} style={{ borderRadius: 3 }}>
              {isReadyToLock ? "✓ Siap Kunci Periode" : "⚠️ Perlu Review Auditor"}
            </span>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
            {/* Card 1: Balance Trial Balance */}
            <div className={`p-3.5 border ${isTbBalanced ? "bg-emerald-50/40 border-emerald-200" : "bg-rose-50/40 border-rose-200"}`} style={{ borderRadius: 4 }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-800">Keseimbangan Neraca Saldo</span>
                {isTbBalanced ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <ShieldAlert className="w-4 h-4 text-rose-600" />}
              </div>
              <div className="space-y-1 font-mono text-[11px]">
                <div className="flex justify-between text-slate-600"><span>Σ Debet:</span><span className="font-bold text-slate-900">{formatIDR(totalTbDebit)}</span></div>
                <div className="flex justify-between text-slate-600"><span>Σ Kredit:</span><span className="font-bold text-slate-900">{formatIDR(totalTbCredit)}</span></div>
                <div className={`flex justify-between pt-1 border-t font-bold ${isTbBalanced ? "text-emerald-700 border-emerald-200" : "text-rose-700 border-rose-200"}`}>
                  <span>Status:</span>
                  <span>{isTbBalanced ? "SEIMBANG (0 Selisih)" : `SELISIH: ${formatIDR(Math.abs(totalTbDebit - totalTbCredit))}`}</span>
                </div>
              </div>
            </div>

            {/* Card 2: Journal Status Breakdown */}
            <div className={`p-3.5 border ${draftJournals.length === 0 ? "bg-emerald-50/40 border-emerald-200" : "bg-amber-50/40 border-amber-200"}`} style={{ borderRadius: 4 }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-800">Integritas Jurnal Transaksi</span>
                {draftJournals.length === 0 ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-amber-600" />}
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
            <div className="p-3.5 border bg-slate-50 border-slate-200" style={{ borderRadius: 4 }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-800">Kontrol & Pembalikan (Reversal)</span>
                <FileCheck className="w-4 h-4 text-slate-500" />
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
                  {draftJournals.length > 0 ? "Selesaikan approval seluruh jurnal draft sebelum melakukan closing." : "Seluruh voucher telah diverifikasi & disetujui."}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stepper Workflow */}
      <div className="bg-white border border-slate-200 shadow-sm overflow-hidden" style={{ borderRadius: 4 }}>
        <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Tahapan Alur Penutupan Periode</span>
          {current && (
            <span className="text-xs font-bold text-[#A57C50]">Status: {current.status} &bull; Progres {current.progress}%</span>
          )}
        </div>
        <div className="p-4 space-y-2">
          {loading ? (
            <p className="text-xs text-slate-400 text-center py-4">Memuat data alur...</p>
          ) : STEPS.map((step, i) => {
            const active = current && current.step === step;
            const done = currentIdx > i;
            const locked = step === STEPS[STEPS.length - 1] && isClosed;
            return (
              <div
                key={step}
                className={`flex items-center gap-3 p-3 border transition-colors ${
                  active
                    ? "border-[#A57C50] bg-[#FBF6F0]"
                    : done || locked
                    ? "border-emerald-200 bg-emerald-50/50"
                    : "border-slate-200 bg-slate-50"
                }`}
                style={{ borderRadius: 4 }}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    done || locked
                      ? "bg-emerald-600 text-white"
                      : active
                      ? "bg-[#A57C50] text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {done || locked ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900">{step}</div>
                  {done && <div className="text-[11px] text-emerald-600 font-semibold">Tahap Selesai</div>}
                  {locked && <div className="text-[11px] text-slate-700 font-semibold">Terkunci Permanen</div>}
                  {active && !locked && <div className="text-[11px] text-[#A57C50] font-semibold">Sedang Diproses</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Closing History Table */}
      <div className="bg-white border border-slate-200 shadow-sm overflow-hidden" style={{ borderRadius: 4 }}>
        <div className="px-4 py-3 bg-slate-100 border-b border-slate-200">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Riwayat Penutupan Periode</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 text-left">Periode</th>
                <th className="px-4 py-2.5 text-left">Step Aktif</th>
                <th className="px-4 py-2.5 text-right">Progres</th>
                <th className="px-4 py-2.5 text-left">Status</th>
                <th className="px-4 py-2.5 text-left">Waktu Kunci</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {periods.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Belum ada riwayat proses closing.
                  </td>
                </tr>
              ) : (
                periods.map((p) => (
                  <tr
                    key={p.period}
                    onClick={() => setSelected(p.period)}
                    className="hover:bg-[#FBF6F0] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-2.5 font-bold text-slate-900">{p.period}</td>
                    <td className="px-4 py-2.5 text-slate-700">{p.step}</td>
                    <td className="px-4 py-2.5 text-right font-tabular font-bold text-slate-800">{p.progress}%</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex px-2.5 py-0.5 text-[11px] font-semibold ${
                        p.status === "Closed"
                          ? "bg-slate-100 text-slate-800 border border-slate-300"
                          : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      }`} style={{ borderRadius: 3 }}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 font-mono text-[11px]">{fmtDate(p.lockedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

