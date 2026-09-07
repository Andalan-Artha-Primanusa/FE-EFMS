import React, { useState, useMemo } from "react";
import { CheckSquare, Square, ShieldCheck, CheckCircle2, Clock, Search, Eye, AlertCircle, FileText, ArrowRight } from "lucide-react";
import { JournalEntry } from "../../types";
import { JournalDetailModal } from "./JournalDetailModal";

interface JournalApprovalViewProps {
  journals: JournalEntry[];
  loading: boolean;
  onRefresh: () => void;
  onVerifyJournal: (id: number) => Promise<void>;
  onApproveJournal: (id: number) => Promise<void>;
  onPostJournals: (ids: number[]) => Promise<void>;
  onReverseJournal: (id: number, reason: string) => Promise<void>;
  currentUserName: string;
  userRole?: string;
}

const formatIDR = (val: number) => {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0);
};

export const JournalApprovalView: React.FC<JournalApprovalViewProps> = ({
  journals,
  loading,
  onRefresh,
  onVerifyJournal,
  onApproveJournal,
  onPostJournals,
  onReverseJournal,
  currentUserName,
  userRole,
}) => {
  const [activeTab, setActiveTab] = useState<"pending_verify" | "pending_approve">("pending_verify");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filter journals based on status
  const pendingVerifyJournals = useMemo(() => {
    return journals.filter(
      (j) =>
        j.status === "Draft" &&
        (searchTerm === "" ||
          j.journalNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          j.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          j.sourceReference?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [journals, searchTerm]);

  const pendingApproveJournals = useMemo(() => {
    return journals.filter(
      (j) =>
        j.status === "Verified" &&
        (searchTerm === "" ||
          j.journalNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          j.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          j.sourceReference?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [journals, searchTerm]);

  const currentList = activeTab === "pending_verify" ? pendingVerifyJournals : pendingApproveJournals;

  const handleSelectAll = () => {
    if (selectedIds.length === currentList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentList.map((j) => j.id));
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleBatchAction = async () => {
    if (selectedIds.length === 0) return;
    setProcessing(true);
    setActionError(null);
    try {
      if (activeTab === "pending_verify") {
        for (const id of selectedIds) {
          await onVerifyJournal(id);
        }
      } else {
        for (const id of selectedIds) {
          await onApproveJournal(id);
        }
      }
      setSelectedIds([]);
      onRefresh();
    } catch (e: any) {
      setActionError(e?.message || "Gagal memproses batch persetujuan.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Tabs */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Pusat Review & Persetujuan Jurnal</h3>
            <p className="text-xs text-slate-400">
              Verifikasi berjenjang oleh FATB Specialist & FATB Manager sebelum posting ke Buku Besar
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => {
              setActiveTab("pending_verify");
              setSelectedIds([]);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "pending_verify"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Menunggu Verifikasi ({pendingVerifyJournals.length})
          </button>

          <button
            onClick={() => {
              setActiveTab("pending_approve");
              setSelectedIds([]);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "pending_approve"
                ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Menunggu Approval Manager ({pendingApproveJournals.length})
          </button>
        </div>
      </div>

      {actionError && (
        <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>{actionError}</div>
        </div>
      )}

      {/* Filter & Batch Actions Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-slate-900 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleSelectAll}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
          >
            {selectedIds.length > 0 && selectedIds.length === currentList.length ? (
              <CheckSquare className="w-4 h-4 text-emerald-400" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            Pilih Semua ({selectedIds.length}/{currentList.length})
          </button>

          {selectedIds.length > 0 && (
            <button
              onClick={handleBatchAction}
              disabled={processing}
              className={`inline-flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-lg text-white transition-all shadow ${
                activeTab === "pending_verify"
                  ? "bg-amber-600 hover:bg-amber-500 shadow-amber-900/30"
                  : "bg-blue-600 hover:bg-blue-500 shadow-blue-900/30"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {processing
                ? "Memproses..."
                : activeTab === "pending_verify"
                ? `Verifikasi ${selectedIds.length} Jurnal Terpilih`
                : `Setujui (Approve) ${selectedIds.length} Jurnal Terpilih`}
            </button>
          )}
        </div>

        <div className="w-full md:w-80 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari voucher..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800/90 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider">
                <th className="p-3.5 w-10 text-center">Pilih</th>
                <th className="p-3.5 w-40">No. Jurnal</th>
                <th className="p-3.5 w-28">Tanggal</th>
                <th className="p-3.5 w-24">Site</th>
                <th className="p-3.5 w-32">Sumber / Ref</th>
                <th className="p-3.5">Keterangan & Rincian Baris</th>
                <th className="p-3.5 w-36 text-right">Nilai Transaksi</th>
                <th className="p-3.5 w-32 text-center">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <div className="inline-block w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-2" />
                    <div>Memuat draf jurnal pending...</div>
                  </td>
                </tr>
              ) : currentList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500">
                    <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <div className="font-semibold text-slate-400 text-sm">Semua Jurnal Telah Diproses!</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Tidak ada antrean voucher yang menunggu {activeTab === "pending_verify" ? "verifikasi" : "persetujuan manager"}.
                    </div>
                  </td>
                </tr>
              ) : (
                currentList.map((j) => (
                  <tr
                    key={j.id}
                    className={`hover:bg-slate-800/50 transition-colors ${
                      selectedIds.includes(j.id) ? "bg-slate-800/70" : ""
                    }`}
                  >
                    <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggleSelect(j.id)}
                        className="text-slate-400 hover:text-white"
                      >
                        {selectedIds.includes(j.id) ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-emerald-400">
                      {j.journalNumber}
                    </td>
                    <td className="p-3.5 text-slate-300 whitespace-nowrap">
                      {j.journalDate ? new Date(j.journalDate).toLocaleDateString("id-ID") : "-"}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[11px]">
                        {j.customerCode || "HO"}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-400 text-[11px]">
                      <div className="font-semibold text-slate-300">{j.sourceModule || "MANUAL"}</div>
                      {j.sourceReference && <div className="text-slate-500 truncate max-w-[120px]">{j.sourceReference}</div>}
                    </td>
                    <td className="p-3.5">
                      <div className="text-white font-medium line-clamp-1">{j.description || "-"}</div>
                      {j.lines && j.lines.length > 0 && (
                        <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap gap-2">
                          {j.lines.slice(0, 2).map((l, i) => (
                            <span key={i} className="font-mono text-slate-400">
                              {l.accountCode}: {formatIDR(l.debit || l.credit)}
                            </span>
                          ))}
                          {j.lines.length > 2 && (
                            <span className="text-slate-500">+{j.lines.length - 2} baris lainnya</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-emerald-300">
                      {formatIDR(j.totalDebit)}
                    </td>
                    <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedJournal(j);
                            setIsDetailModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold border border-slate-700"
                        >
                          Review
                        </button>
                        {activeTab === "pending_verify" ? (
                          <button
                            onClick={async () => {
                              await onVerifyJournal(j.id);
                              onRefresh();
                            }}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold shadow"
                          >
                            Verifikasi
                          </button>
                        ) : (
                          <button
                            onClick={async () => {
                              await onApproveJournal(j.id);
                              onRefresh();
                            }}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold shadow"
                          >
                            Setujui
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

      {/* Detail Modal */}
      <JournalDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedJournal(null);
        }}
        journal={selectedJournal}
        onVerify={onVerifyJournal}
        onApprove={onApproveJournal}
        onPost={onPostJournals}
        onReverse={onReverseJournal}
        userRole={userRole}
      />
    </div>
  );
};
