import React, { useState, useMemo } from "react";
import { Plus, Search, RefreshCw, Download, FileText, CheckCircle2, Clock } from "lucide-react";
import * as XLSX from "xlsx";
import { JournalEntry, COAAccount, SubLedgerCode } from "../../types";
import { JournalEntryModal } from "./JournalEntryModal";
import { JournalDetailModal } from "./JournalDetailModal";
import { JournalGlideGrid } from "./components/JournalGlideGrid";

interface JournalEntryViewProps {
  journals: JournalEntry[];
  coaAccounts: COAAccount[];
  subLedgers: SubLedgerCode[];
  loading: boolean;
  onRefresh: () => void;
  onSaveJournal: (entry: Partial<JournalEntry>, submitForApproval?: boolean) => Promise<void>;
  onDeleteJournal: (id: number) => Promise<void>;
  onVerifyJournal: (id: number) => Promise<void>;
  onApproveJournal: (id: number) => Promise<void>;
  onPostJournals: (ids: number[]) => Promise<void>;
  onReverseJournal: (id: number, reason: string) => Promise<void>;
  currentUserName: string;
  userRole?: string;
}

const formatIDR = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0);

export const JournalEntryView: React.FC<JournalEntryViewProps> = ({
  journals,
  coaAccounts,
  subLedgers,
  loading,
  onRefresh,
  onSaveJournal,
  onDeleteJournal,
  onVerifyJournal,
  onApproveJournal,
  onPostJournals,
  onReverseJournal,
  currentUserName,
  userRole,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [siteFilter, setSiteFilter] = useState("ALL");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingJournal, setEditingJournal] = useState<JournalEntry | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const filteredJournals = useMemo(() => {
    return journals.filter((j) => {
      const matchSearch =
        searchTerm === "" ||
        j.journalNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.sourceReference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.lines?.some((l) =>
          l.accountCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          l.accountName?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      return matchSearch &&
        (statusFilter === "ALL" || j.status === statusFilter) &&
        (siteFilter === "ALL" || j.customerCode === siteFilter);
    });
  }, [journals, searchTerm, statusFilter, siteFilter]);

  const stats = useMemo(() => ({
    total: journals.length,
    pending: journals.filter((j) => j.status === "Draft" || j.status === "Verified").length,
    posted: journals.filter((j) => j.status === "Posted to GL").length,
    value: filteredJournals.reduce((s, j) => s + (j.totalDebit || 0), 0),
  }), [journals, filteredJournals]);

  const exportToExcel = () => {
    const rows = filteredJournals.flatMap((j) =>
      (j.lines?.length ? j.lines : [{ accountCode: "-", accountName: "-", description: "-", debit: j.totalDebit, credit: j.totalCredit, projectCode: j.customerCode }])
        .map((l) => ({
          "No. Bukti": j.journalNumber,
          "Tanggal": j.journalDate?.slice(0, 10) ?? "",
          "Sumber": j.sourceModule || "MANUAL",
          "Referensi": j.sourceReference || "",
          "Project": l.projectCode || j.customerCode || "HO",
          "Keterangan": j.description,
          "Kode Akun": l.accountCode,
          "Nama Akun": l.accountName,
          "Uraian": l.description,
          "Debet (IDR)": l.debit,
          "Kredit (IDR)": l.credit,
          "Status": j.status,
          "Dibuat Oleh": j.createdBy,
        }))
    );
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jurnal_Umum");
    XLSX.writeFile(wb, `Jurnal_Umum_PT_AAP_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* Stat Cards — Clean White on Neutral Grey Canvas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Voucher", value: stats.total, sub: "Tercatat di sistem", icon: FileText, accent: "#A57C50" },
          { label: "Menunggu Review", value: stats.pending, sub: "Draft & Terverifikasi", icon: Clock, accent: "#d97706" },
          { label: "Posted ke GL", value: stats.posted, sub: "Tercatat permanen", icon: CheckCircle2, accent: "#16a34a" },
          { label: "Nilai (Filter)", value: formatIDR(stats.value), sub: `${filteredJournals.length} voucher`, icon: FileText, accent: "#64748b", small: true },
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

      {/* Toolbar */}
      <div className="bg-white border border-slate-200 p-3 shadow-sm" style={{ borderRadius: 4 }}>
        <div className="flex flex-col md:flex-row items-center gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-white text-xs font-semibold transition-colors hover:brightness-95 shadow-sm"
            style={{ background: "#A57C50", borderRadius: 3 }}
          >
            <Plus className="w-3.5 h-3.5" /> Buat Voucher Jurnal
          </button>

          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 md:max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari no. bukti / uraian / akun..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#A57C50] focus:bg-white transition-colors"
                style={{ borderRadius: 3 }}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-[#A57C50] focus:bg-white transition-colors"
              style={{ borderRadius: 3 }}
            >
              <option value="ALL">Semua Status</option>
              <option value="Draft">Draft</option>
              <option value="Verified">Verified</option>
              <option value="Approved">Approved</option>
              <option value="Posted to GL">Posted to GL</option>
              <option value="Reversed">Reversed</option>
            </select>

            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-[#A57C50] focus:bg-white transition-colors"
              style={{ borderRadius: 3 }}
            >
              <option value="ALL">Semua Site</option>
              <option value="HO">HO</option>
              <option value="BGG">BGG</option>
              <option value="SBS">SBS</option>
              <option value="POS">POS</option>
              <option value="PTRO">PTRO</option>
              <option value="CoY">CoY</option>
            </select>

            <button onClick={onRefresh} disabled={loading} className="p-1.5 bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-100 transition-colors" style={{ borderRadius: 3 }} title="Segarkan">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#A57C50]" : ""}`} />
            </button>
            <button onClick={exportToExcel} className="p-1.5 bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-100 transition-colors" style={{ borderRadius: 3 }} title="Ekspor Excel">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Data Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white border border-slate-200 shadow-sm" style={{ borderRadius: 4 }}>
          <div className="w-5 h-5 border-2 border-slate-200 border-t-[#A57C50] rounded-full animate-spin mb-2" />
          <span className="text-xs text-slate-500">Memuat data voucher jurnal...</span>
        </div>
      ) : filteredJournals.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white border border-slate-200 shadow-sm" style={{ borderRadius: 4 }}>
          <FileText className="w-8 h-8 text-slate-300 mb-2" />
          <div className="text-sm font-semibold text-slate-700">Belum Ada Voucher Jurnal</div>
          <div className="text-xs text-slate-500 mt-1">Klik "Buat Voucher Jurnal" untuk mencatat transaksi pertama.</div>
        </div>
      ) : (
        <JournalGlideGrid
          journals={filteredJournals}
          onRowClick={(j) => { setSelectedJournal(j); setIsDetailModalOpen(true); }}
          onEditClick={(j) => { setEditingJournal(j); setIsEditModalOpen(true); }}
          height={520}
        />
      )}

      {filteredJournals.length > 0 && (
        <div className="text-[11px] text-slate-400 px-1">
          Menampilkan {filteredJournals.length} dari {journals.length} voucher &bull; Klik baris → lihat rincian &bull; Klik ✎ Edit → edit draf
        </div>
      )}

      {/* Modals */}
      {isCreateModalOpen && (
        <JournalEntryModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={onSaveJournal}
          coaAccounts={coaAccounts}
          subLedgers={subLedgers}
          currentUserName={currentUserName}
        />
      )}

      {isEditModalOpen && editingJournal && (
        <JournalEntryModal
          isOpen={isEditModalOpen}
          onClose={() => { setIsEditModalOpen(false); setEditingJournal(null); }}
          onSave={onSaveJournal}
          coaAccounts={coaAccounts}
          subLedgers={subLedgers}
          initialData={editingJournal}
          currentUserName={currentUserName}
        />
      )}

      <JournalDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => { setIsDetailModalOpen(false); setSelectedJournal(null); }}
        journal={selectedJournal}
        onVerify={onVerifyJournal}
        onApprove={onApproveJournal}
        onPost={async (ids) => { await onPostJournals(ids); }}
        onReverse={onReverseJournal}
        onEdit={(j) => { setIsDetailModalOpen(false); setEditingJournal(j); setIsEditModalOpen(true); }}
        onDelete={onDeleteJournal}
        userRole={userRole}
      />
    </div>
  );
};
