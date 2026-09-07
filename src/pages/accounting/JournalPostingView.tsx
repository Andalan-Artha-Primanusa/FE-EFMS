import React, { useState, useMemo } from "react";
import { Send, CheckSquare, Square, CheckCircle2, AlertCircle, Search, RotateCcw, XCircle, Eye, ShieldCheck, Clock } from "lucide-react";
import { JournalEntry } from "../../types";
import { JournalDetailModal } from "./JournalDetailModal";

interface JournalPostingViewProps {
  journals: JournalEntry[];
  loading: boolean;
  onRefresh: () => void;
  onApproveAndPost: (ids: number[]) => Promise<void>;
  onRejectToDraft: (id: number, reason: string) => Promise<void>;
  onReverseJournal: (id: number, reason: string) => Promise<void>;
  currentUserName: string;
  userRole?: string;
}

const formatIDR = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0);

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    "Draft": "bg-amber-50 text-amber-700 border-amber-200",
    "Verified": "bg-sky-50 text-sky-700 border-sky-200",
    "Approved": "bg-slate-100 text-slate-800 border-slate-300",
    "Posted to GL": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Reversed": "bg-rose-50 text-rose-700 border-rose-200",
  };
  return map[s] || "bg-slate-50 text-slate-700 border-slate-200";
};

export const JournalPostingView: React.FC<JournalPostingViewProps> = ({
  journals,
  loading,
  onRefresh,
  onApproveAndPost,
  onRejectToDraft,
  onReverseJournal,
  userRole,
}) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [siteFilter, setSiteFilter] = useState("ALL");
  const [tab, setTab] = useState<"pending" | "posted">("pending");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailJournal, setDetailJournal] = useState<JournalEntry | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const filter = (j: JournalEntry) =>
    (siteFilter === "ALL" || j.customerCode === siteFilter) &&
    (searchTerm === "" || j.journalNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || j.description?.toLowerCase().includes(searchTerm.toLowerCase()));

  const pendingList = useMemo(() => journals.filter((j) => !["Posted to GL", "Reversed"].includes(j.status) && filter(j)), [journals, searchTerm, siteFilter]);
  const postedList  = useMemo(() => journals.filter((j) => ["Posted to GL", "Reversed"].includes(j.status) && filter(j)), [journals, searchTerm, siteFilter]);
  const activeList  = tab === "pending" ? pendingList : postedList;

  const batchSummary = useMemo(() => {
    const sel = pendingList.filter((j) => selectedIds.includes(j.id));
    const debit  = sel.reduce((s, j) => s + (j.totalDebit || 0), 0);
    const credit = sel.reduce((s, j) => s + (j.totalCredit || 0), 0);
    return { count: sel.length, debit, credit };
  }, [pendingList, selectedIds]);

  const post = async (ids: number[]) => {
    setProcessing(true); setError(null);
    try { await onApproveAndPost(ids); setSelectedIds([]); onRefresh(); }
    catch (e: any) { setError(e?.message || "Gagal posting ke GL."); }
    finally { setProcessing(false); }
  };

  const execReject = async () => {
    if (!rejectId || !rejectReason.trim()) { setError("Catatan perbaikan wajib diisi."); return; }
    setProcessing(true); setError(null);
    try { await onRejectToDraft(rejectId, rejectReason.trim()); setRejectId(null); onRefresh(); }
    catch (e: any) { setError(e?.message || "Gagal menolak voucher."); }
    finally { setProcessing(false); }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-slate-200 p-4 shadow-sm" style={{ borderRadius: 4 }}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 border border-slate-200 bg-slate-50" style={{ borderRadius: 3 }}>
              <ShieldCheck className="w-4 h-4 text-[#A57C50]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Verifikasi & Posting Jurnal — SPV / Manager</h3>
              <p className="text-xs text-slate-500">Setujui dan posting langsung ke Buku Besar, atau tolak untuk perbaikan oleh Admin Accounting</p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1" style={{ borderRadius: 3 }}>
            {(["pending", "posted"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setSelectedIds([]); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all ${tab === t ? "bg-white text-slate-900 border border-slate-200 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                style={{ borderRadius: 2 }}
              >
                {t === "pending" ? <Clock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {t === "pending" ? `Menunggu (${pendingList.length})` : `Sudah Diposting (${postedList.length})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs" style={{ borderRadius: 3 }}>
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {/* Filter & Action Bar */}
      <div className="bg-white border border-slate-200 p-3 shadow-sm" style={{ borderRadius: 4 }}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {tab === "pending" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedIds(selectedIds.length === pendingList.length ? [] : pendingList.map((j) => j.id))}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-100 transition-colors"
                style={{ borderRadius: 3 }}
              >
                {selectedIds.length > 0 && selectedIds.length === pendingList.length ? <CheckSquare className="w-4 h-4 text-[#A57C50]" /> : <Square className="w-4 h-4 text-slate-400" />}
                Pilih Semua ({selectedIds.length}/{pendingList.length})
              </button>

              {selectedIds.length > 0 && (
                <button
                  onClick={() => post(selectedIds)}
                  disabled={processing}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-white text-xs font-bold transition-colors hover:brightness-95 shadow-sm"
                  style={{ background: "#A57C50", borderRadius: 3 }}
                >
                  <Send className="w-3.5 h-3.5" />
                  {processing ? "Memproses..." : `Post ${selectedIds.length} Voucher ke GL`}
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 flex-1 justify-end">
            <div className="relative w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari no. bukti / uraian..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#A57C50] focus:bg-white transition-colors"
                style={{ borderRadius: 3 }} />
            </div>
            <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-[#A57C50] focus:bg-white transition-colors"
              style={{ borderRadius: 3 }}>
              <option value="ALL">Semua Site</option>
              {["HO","BGG","SBS","POS","PTRO","CoY"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Batch summary bar */}
        {selectedIds.length > 0 && tab === "pending" && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200 text-xs">
            <span className="text-slate-600">Batch terpilih: <strong className="text-slate-900">{batchSummary.count} voucher</strong> siap diposting ke Buku Besar</span>
            <div className="flex items-center gap-4 font-mono font-semibold text-slate-900">
              <span>Debet: {formatIDR(batchSummary.debit)}</span>
              <span className="text-slate-300">|</span>
              <span>Kredit: {formatIDR(batchSummary.credit)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 overflow-hidden shadow-sm" style={{ borderRadius: 4 }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                {tab === "pending" && <th className="px-3 py-2.5 w-10 text-center text-slate-600 font-semibold uppercase tracking-wider text-[10px]">✓</th>}
                <th className="px-3 py-2.5 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">No. Bukti</th>
                <th className="px-3 py-2.5 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">Tanggal</th>
                <th className="px-3 py-2.5 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">Project</th>
                <th className="px-3 py-2.5 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">Sumber / Ref</th>
                <th className="px-3 py-2.5 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">Keterangan Transaksi</th>
                <th className="px-3 py-2.5 text-right text-slate-600 font-semibold uppercase tracking-wider text-[10px]">Nilai (IDR)</th>
                <th className="px-3 py-2.5 text-center text-slate-600 font-semibold uppercase tracking-wider text-[10px]">Status</th>
                <th className="px-3 py-2.5 text-center text-slate-600 font-semibold uppercase tracking-wider text-[10px]">Aksi SPV</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan={9} className="py-10 text-center text-slate-400">
                  <div className="inline-block w-5 h-5 border-2 border-slate-200 border-t-[#A57C50] rounded-full animate-spin mb-2" /><br />Memuat data...
                </td></tr>
              ) : activeList.length === 0 ? (
                <tr><td colSpan={9} className="py-10 text-center text-slate-400">
                  <CheckCircle2 className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                  <div className="text-sm font-semibold text-slate-700">{tab === "pending" ? "Tidak ada voucher menunggu posting." : "Belum ada voucher diposting."}</div>
                </td></tr>
              ) : (
                activeList.map((j) => (
                  <tr key={j.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.includes(j.id) ? "bg-slate-50" : ""}`}>
                    {tab === "pending" && (
                      <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setSelectedIds((p) => p.includes(j.id) ? p.filter((x) => x !== j.id) : [...p, j.id])}>
                          {selectedIds.includes(j.id) ? <CheckSquare className="w-4 h-4 text-[#A57C50]" /> : <Square className="w-4 h-4 text-slate-400" />}
                        </button>
                      </td>
                    )}
                    <td className="px-3 py-2.5 font-mono font-semibold text-slate-900">{j.journalNumber}</td>
                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{j.journalDate ? new Date(j.journalDate).toLocaleDateString("id-ID") : "-"}</td>
                    <td className="px-3 py-2.5">
                      <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-mono font-semibold" style={{ borderRadius: 2 }}>{j.customerCode || "HO"}</span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">
                      <div className="font-semibold text-slate-800 text-[11px]">{j.sourceModule || "MANUAL"}</div>
                      {j.sourceReference && <div className="text-[10px] text-slate-400 truncate max-w-[110px]">{j.sourceReference}</div>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-slate-900 font-medium line-clamp-1">{j.description || "-"}</div>
                      {j.lines?.[0] && <div className="text-[10px] text-slate-400">{j.lines[0].accountCode} — {j.lines[0].accountName}{j.lines.length > 1 && ` +${j.lines.length - 1}`}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-900">{formatIDR(j.totalDebit)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`px-2 py-0.5 border text-[10px] font-semibold ${statusBadge(j.status)}`} style={{ borderRadius: 2 }}>{j.status}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setDetailJournal(j)} className="px-2 py-1 border border-slate-200 bg-slate-50 text-slate-700 hover:text-slate-900 hover:bg-slate-100 text-[11px] font-semibold transition-colors" style={{ borderRadius: 2 }}>
                          <Eye className="w-3.5 h-3.5 inline mr-1" />Lihat
                        </button>
                        {tab === "pending" && (<>
                          <button disabled={processing} onClick={() => post([j.id])} className="px-2 py-1 text-white text-[11px] font-bold transition-colors hover:brightness-95" style={{ background: "#A57C50", borderRadius: 2 }}>
                            <Send className="w-3 h-3 inline mr-1" />Post GL
                          </button>
                          <button disabled={processing} onClick={() => { setRejectId(j.id); setRejectReason(""); setError(null); }} className="px-2 py-1 border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-[11px] font-semibold transition-colors" style={{ borderRadius: 2 }}>
                            <XCircle className="w-3.5 h-3.5 inline mr-1" />Tolak
                          </button>
                        </>)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200 p-5 space-y-4 shadow-xl" style={{ borderRadius: 4 }}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-50 border border-rose-200" style={{ borderRadius: 3 }}>
                <RotateCcw className="w-4 h-4 text-rose-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Kembalikan ke Admin Accounting</h4>
                <p className="text-xs text-slate-500">Status voucher kembali ke Draf untuk diperbaiki</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan / Alasan Perbaikan (wajib)</label>
              <textarea rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Contoh: Kode akun biaya solar tidak sesuai site BGG, harap dikoreksi ke 5101.001..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#A57C50] focus:bg-white resize-none"
                style={{ borderRadius: 3 }} />
            </div>
            {error && <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2" style={{ borderRadius: 2 }}>{error}</div>}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button onClick={() => setRejectId(null)} className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 transition-colors">Batal</button>
              <button onClick={execReject} disabled={processing} className="px-4 py-1.5 text-white text-xs font-bold transition-colors hover:bg-rose-700" style={{ background: "#e11d48", borderRadius: 3 }}>
                {processing ? "Memproses..." : "Kirim Catatan Perbaikan"}
              </button>
            </div>
          </div>
        </div>
      )}

      <JournalDetailModal
        isOpen={!!detailJournal}
        onClose={() => setDetailJournal(null)}
        journal={detailJournal}
        onPost={async (ids) => { await post(ids); }}
        onReverse={onReverseJournal}
        userRole={userRole}
      />
    </div>
  );
};
