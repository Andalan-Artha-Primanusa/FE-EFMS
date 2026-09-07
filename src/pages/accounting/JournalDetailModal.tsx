import React, { useState } from "react";
import { X, Printer, RotateCcw, CheckCircle2, ShieldCheck, Send, Trash2, Edit3, AlertCircle, FileText } from "lucide-react";
import { JournalEntry } from "../../types";

interface JournalDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  journal: JournalEntry | null;
  onVerify?: (id: number) => Promise<void>;
  onApprove?: (id: number) => Promise<void>;
  onPost?: (ids: number[]) => Promise<void>;
  onReverse?: (id: number, reason: string) => Promise<void>;
  onEdit?: (journal: JournalEntry) => void;
  onDelete?: (id: number) => Promise<void>;
  userRole?: string;
}

const formatIDR = (val: number) => {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0);
};

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

export const JournalDetailModal: React.FC<JournalDetailModalProps> = ({
  isOpen,
  onClose,
  journal,
  onVerify,
  onApprove,
  onPost,
  onReverse,
  onEdit,
  onDelete,
}) => {
  const [reversalOpen, setReversalOpen] = useState(false);
  const [reversalReason, setReversalReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!isOpen || !journal) return null;

  const handleVerify = async () => {
    if (!onVerify) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await onVerify(journal.id);
      onClose();
    } catch (e: any) {
      setActionError(e?.message || "Gagal verifikasi jurnal.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!onApprove) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await onApprove(journal.id);
      onClose();
    } catch (e: any) {
      setActionError(e?.message || "Gagal menyetujui jurnal.");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePost = async () => {
    if (!onPost) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await onPost([journal.id]);
      onClose();
    } catch (e: any) {
      setActionError(e?.message || "Gagal posting jurnal ke GL.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReversalSubmit = async () => {
    if (!onReverse) return;
    if (!reversalReason.trim()) {
      setActionError("Alasan pembalikan jurnal (storno/reversal) wajib diisi.");
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      await onReverse(journal.id, reversalReason.trim());
      setReversalOpen(false);
      onClose();
    } catch (e: any) {
      setActionError(e?.message || "Gagal membuat jurnal pembalik.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!window.confirm(`Yakin ingin menghapus draf jurnal ${journal.journalNumber}?`)) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await onDelete(journal.id);
      onClose();
    } catch (e: any) {
      setActionError(e?.message || "Gagal menghapus jurnal.");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white">
      <div
        className="relative w-full max-w-4xl my-8 bg-white border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] shadow-2xl print:max-h-none print:border-none print:bg-white print:text-black"
        style={{ borderRadius: 4 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200 print:bg-white print:border-b-2 print:border-black">
          <div className="flex items-center gap-3">
            <div className="p-2 border border-slate-200 bg-white print:hidden" style={{ borderRadius: 3 }}>
              <FileText className="w-5 h-5 text-[#A57C50]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-slate-900 print:text-black">
                  Voucher Jurnal: {journal.journalNumber}
                </h3>
                <span className={`px-2 py-0.5 border text-[10px] font-semibold print:hidden ${statusBadge(journal.status)}`} style={{ borderRadius: 2 }}>
                  {journal.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 print:text-slate-600">
                PT ANDALAN ARTHA PRIMANUSA — Finance & Accounting System
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors shadow-sm"
              style={{ borderRadius: 3 }}
              title="Cetak Slip"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak Slip
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              style={{ borderRadius: 3 }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50 print:p-0 print:space-y-4">
          {actionError && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs print:hidden" style={{ borderRadius: 3 }}>
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{actionError}</div>
            </div>
          )}

          {/* Metadata Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-white border border-slate-200 shadow-sm print:bg-transparent print:border print:border-black text-xs" style={{ borderRadius: 4 }}>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold mb-0.5">Tanggal Transaksi</span>
              <span className="text-slate-900 font-semibold text-sm print:text-black">
                {journal.journalDate ? new Date(journal.journalDate).toLocaleDateString("id-ID", { dateStyle: "medium" }) : "-"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold mb-0.5">Site / Project</span>
              <span className="text-slate-900 font-bold text-sm print:text-black">{journal.customerCode || "HO"}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold mb-0.5">Modul Sumber / Ref</span>
              <span className="text-slate-900 font-semibold text-sm print:text-black">
                {journal.sourceModule || "MANUAL"} {journal.sourceReference ? `(${journal.sourceReference})` : ""}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold mb-0.5">Total Nilai</span>
              <span className="text-emerald-700 font-bold text-sm font-mono print:text-black">
                {formatIDR(journal.totalDebit)}
              </span>
            </div>
            <div className="col-span-2 md:col-span-4 pt-2.5 border-t border-slate-200 print:border-black">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold mb-0.5">Uraian / Keterangan</span>
              <span className="text-slate-900 font-medium text-xs print:text-black">{journal.description || "-"}</span>
            </div>
          </div>

          {/* Lines Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 print:text-black">
              Rincian Jurnal Double-Entry
            </h4>
            <div className="border border-slate-200 overflow-hidden bg-white shadow-sm print:border-black" style={{ borderRadius: 4 }}>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-semibold print:bg-slate-100 print:text-black print:border-black">
                    <th className="p-2.5 w-10 text-center uppercase tracking-wider text-[10px]">#</th>
                    <th className="p-2.5 w-32 uppercase tracking-wider text-[10px]">Kode Akun</th>
                    <th className="p-2.5 w-48 uppercase tracking-wider text-[10px]">Nama Akun</th>
                    <th className="p-2.5 w-36 uppercase tracking-wider text-[10px]">Kode Bantu</th>
                    <th className="p-2.5 uppercase tracking-wider text-[10px]">Uraian Baris</th>
                    <th className="p-2.5 w-36 text-right uppercase tracking-wider text-[10px]">Debet (Rp)</th>
                    <th className="p-2.5 w-36 text-right uppercase tracking-wider text-[10px]">Kredit (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 print:divide-black">
                  {journal.lines && journal.lines.length > 0 ? (
                    journal.lines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 print:text-black">
                        <td className="p-2.5 text-center text-slate-400 font-mono print:text-black">{idx + 1}</td>
                        <td className="p-2.5 font-mono font-semibold text-slate-900 print:text-black">{line.accountCode}</td>
                        <td className="p-2.5 font-semibold text-slate-900 print:text-black">{line.accountName}</td>
                        <td className="p-2.5 text-slate-600 font-mono print:text-black">{line.subAccountCode || "-"}</td>
                        <td className="p-2.5 text-slate-800 print:text-black">{line.description || "-"}</td>
                        <td className="p-2.5 text-right font-mono font-semibold text-emerald-700 print:text-black">
                          {line.debit > 0 ? formatIDR(line.debit) : "-"}
                        </td>
                        <td className="p-2.5 text-right font-mono font-semibold text-sky-700 print:text-black">
                          {line.credit > 0 ? formatIDR(line.credit) : "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-slate-400">
                        Tidak ada baris rincian pada jurnal ini.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-200 text-xs print:bg-slate-100 print:border-black print:text-black">
                    <td colSpan={5} className="p-2.5 text-right uppercase tracking-wider text-slate-700 print:text-black">
                      Total
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-emerald-700 print:text-black">
                      {formatIDR(journal.totalDebit)}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-sky-700 print:text-black">
                      {formatIDR(journal.totalCredit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Audit Trail Sign-Off Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-white border border-slate-200 shadow-sm print:border-black text-xs" style={{ borderRadius: 4 }}>
            <div className="text-center p-2.5 border border-slate-200 bg-slate-50 print:border-black" style={{ borderRadius: 3 }}>
              <span className="text-slate-500 block text-[9px] uppercase font-semibold mb-1">Dibuat Oleh (Maker)</span>
              <div className="font-semibold text-slate-900 print:text-black">{journal.createdBy || "-"}</div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {journal.createdAt ? new Date(journal.createdAt).toLocaleDateString("id-ID") : ""}
              </span>
            </div>
            <div className="text-center p-2.5 border border-slate-200 bg-slate-50 print:border-black" style={{ borderRadius: 3 }}>
              <span className="text-slate-500 block text-[9px] uppercase font-semibold mb-1">Diverifikasi (Checker)</span>
              <div className="font-semibold text-slate-900 print:text-black">{journal.verifiedBy || "-"}</div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {journal.verifiedBy ? "Verified" : "Pending"}
              </span>
            </div>
            <div className="text-center p-2.5 border border-slate-200 bg-slate-50 print:border-black" style={{ borderRadius: 3 }}>
              <span className="text-slate-500 block text-[9px] uppercase font-semibold mb-1">Disetujui (Approver)</span>
              <div className="font-semibold text-slate-900 print:text-black">{journal.approvedBy || "-"}</div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {journal.approvedBy ? "Approved" : "Pending"}
              </span>
            </div>
            <div className="text-center p-2.5 border border-slate-200 bg-slate-50 print:border-black" style={{ borderRadius: 3 }}>
              <span className="text-slate-500 block text-[9px] uppercase font-semibold mb-1">Diposting ke GL (Poster)</span>
              <div className="font-semibold text-slate-900 print:text-black">{journal.postedBy || "-"}</div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {journal.postedBy ? "Posted" : "Unposted"}
              </span>
            </div>
          </div>

          {/* Reversal Prompt Drawer */}
          {reversalOpen && (
            <div className="p-4 bg-rose-50 border border-rose-200 space-y-3 print:hidden" style={{ borderRadius: 3 }}>
              <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
                <RotateCcw className="w-4 h-4" />
                Konfirmasi Jurnal Pembalik (Storno / Reversal)
              </div>
              <p className="text-xs text-slate-600">
                Sesuai standar PSAK, jurnal yang sudah diposting tidak akan dihapus, melainkan dibuatkan satu jurnal pembalik baru dengan posisi debet/kredit yang saling mengeliminasi secara otomatis.
              </p>
              <div>
                <label className="block text-[10px] font-semibold text-slate-700 uppercase mb-1">Alasan Pembalikan Jurnal</label>
                <input
                  type="text"
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="Contoh: Salah alokasi akun lawan pada transaksi invoice #091..."
                  className="w-full px-3 py-2 bg-white border border-rose-200 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
                  style={{ borderRadius: 3 }}
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setReversalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleReversalSubmit}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors"
                  style={{ borderRadius: 3 }}
                >
                  {actionLoading ? "Memproses..." : "Eksekusi Pembalikan Jurnal"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 border-t border-slate-200 print:hidden">
          <div className="flex items-center gap-2">
            {journal.status === "Draft" && onDelete && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDelete}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-rose-700 hover:bg-rose-50 text-xs font-semibold border border-rose-200 transition-colors"
                style={{ borderRadius: 3 }}
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus Draf
              </button>
            )}
            {journal.status === "Draft" && onEdit && (
              <button
                type="button"
                onClick={() => {
                  onEdit(journal);
                  onClose();
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold border border-slate-200 transition-colors"
                style={{ borderRadius: 3 }}
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Draf
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {journal.status === "Draft" && onVerify && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleVerify}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors shadow-sm"
                style={{ borderRadius: 3 }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {actionLoading ? "Memproses..." : "Verifikasi Jurnal"}
              </button>
            )}

            {journal.status === "Verified" && onApprove && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleApprove}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold transition-colors shadow-sm"
                style={{ borderRadius: 3 }}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {actionLoading ? "Memproses..." : "Setujui (Approve)"}
              </button>
            )}

            {journal.status === "Approved" && onPost && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={handlePost}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-white text-xs font-bold transition-colors hover:brightness-95 shadow-sm"
                style={{ background: "#A57C50", borderRadius: 3 }}
              >
                <Send className="w-3.5 h-3.5" />
                {actionLoading ? "Memproses..." : "Posting ke Buku Besar"}
              </button>
            )}

            {journal.status === "Posted to GL" && onReverse && !reversalOpen && (
              <button
                type="button"
                onClick={() => setReversalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-rose-700 hover:bg-rose-50 text-xs font-semibold border border-rose-200 transition-colors"
                style={{ borderRadius: 3 }}
              >
                <RotateCcw className="w-3.5 h-3.5" /> Jurnal Pembalik (Storno)
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              style={{ borderRadius: 3 }}
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
