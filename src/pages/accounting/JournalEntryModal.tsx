import React, { useState, useEffect, useMemo } from "react";
import { X, Plus, Trash2, CheckCircle2, AlertCircle, Save, Send, Tag, FileText } from "lucide-react";
import { COAAccount, SubLedgerCode, JournalEntry, JournalLine } from "../../types";

interface JournalEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Partial<JournalEntry>, submitForApproval?: boolean) => Promise<void>;
  coaAccounts: COAAccount[];
  subLedgers: SubLedgerCode[];
  initialData?: JournalEntry | null;
  currentUserName: string;
}

const formatIDR = (val: number) => {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0);
};

export const JournalEntryModal: React.FC<JournalEntryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  coaAccounts,
  subLedgers,
  initialData,
  currentUserName,
}) => {
  const [journalNumber, setJournalNumber] = useState("");
  const [journalDate, setJournalDate] = useState("");
  const [sourceModule, setSourceModule] = useState("MANUAL");
  const [sourceReference, setSourceReference] = useState("");
  const [customerCode, setCustomerCode] = useState("HO");
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<JournalLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kalkulator Kurs Valas USD -> IDR
  const [showConverter, setShowConverter] = useState(false);
  const [usdAmount, setUsdAmount] = useState(0);
  const [exchangeRate, setExchangeRate] = useState(16250);
  const convertedIDR = useMemo(() => Math.round(usdAmount * exchangeRate), [usdAmount, exchangeRate]);

  useEffect(() => {
    if (initialData) {
      setJournalNumber(initialData.journalNumber || "");
      setJournalDate(initialData.journalDate ? initialData.journalDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
      setSourceModule(initialData.sourceModule || "MANUAL");
      setSourceReference(initialData.sourceReference || "");
      setCustomerCode(initialData.customerCode || "HO");
      setDescription(initialData.description || "");
      setLines(
        initialData.lines && initialData.lines.length > 0
          ? initialData.lines.map((l) => ({ ...l }))
          : [
              { accountCode: "", accountName: "", description: "", debit: 0, credit: 0, projectCode: "HO" },
              { accountCode: "", accountName: "", description: "", debit: 0, credit: 0, projectCode: "HO" }
            ]
      );
    } else {
      const now = new Date();
      const yr = now.getFullYear();
      const mo = String(now.getMonth() + 1).padStart(2, "0");
      setJournalNumber(`JV/${yr}/${mo}/${Math.floor(1000 + Math.random() * 9000)}`);
      setJournalDate(now.toISOString().slice(0, 10));
      setSourceModule("MANUAL");
      setSourceReference("");
      setCustomerCode("HO");
      setDescription("");
      setLines([
        { accountCode: "1101.001", accountName: "Kas HO AAP", description: "", debit: 0, credit: 0, projectCode: "HO" },
        { accountCode: "4101.000", accountName: "Pendapatan Over Burden (OB)", description: "", debit: 0, credit: 0, projectCode: "HO" }
      ]);
    }
    setError(null);
  }, [initialData, isOpen]);

  const activeCOAs = useMemo(() => {
    return coaAccounts.filter((c) => c.isActive !== false && c.posSaldo !== "-");
  }, [coaAccounts]);

  const totalDebit = useMemo(() => lines.reduce((acc, l) => acc + (Number(l.debit) || 0), 0), [lines]);
  const totalCredit = useMemo(() => lines.reduce((acc, l) => acc + (Number(l.credit) || 0), 0), [lines]);
  const difference = useMemo(() => Math.abs(totalDebit - totalCredit), [totalDebit, totalCredit]);
  const isBalanced = difference < 0.01 && totalDebit > 0;

  const handleAccountChange = (index: number, code: string) => {
    const selected = coaAccounts.find((c) => c.code === code);
    const updated = [...lines];
    updated[index] = {
      ...updated[index],
      accountCode: code,
      accountName: selected ? selected.name : ""
    };
    setLines(updated);
  };

  const handleLineChange = (index: number, field: keyof JournalLine, value: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const addLine = () => {
    setLines([
      ...lines,
      {
        accountCode: "",
        accountName: "",
        description: description || "",
        debit: 0,
        credit: 0,
        projectCode: customerCode || "HO"
      }
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) {
      setError("Jurnal double-entry minimal harus memiliki 2 baris (Debet & Kredit).");
      return;
    }
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleSubmit = async (submitForApproval: boolean) => {
    setError(null);
    if (!journalNumber.trim()) {
      setError("Nomor jurnal wajib diisi.");
      return;
    }
    if (!journalDate) {
      setError("Tanggal jurnal wajib diisi.");
      return;
    }
    if (!description.trim()) {
      setError("Keterangan transaksi umum wajib diisi.");
      return;
    }
    if (lines.length < 2) {
      setError("Jurnal harus memiliki minimal 2 baris.");
      return;
    }
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].accountCode) {
        setError(`Baris #${i + 1}: Silakan pilih akun COA.`);
        return;
      }
      if (lines[i].debit === 0 && lines[i].credit === 0) {
        setError(`Baris #${i + 1}: Nilai debet atau kredit harus diisi (tidak boleh nol dua-duanya).`);
        return;
      }
    }
    if (!isBalanced) {
      setError(`Jurnal tidak seimbang (Unbalanced). Selisih: ${formatIDR(difference)}. Total Debet dan Total Kredit harus sama persis.`);
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<JournalEntry> = {
        ...(initialData?.id ? { id: initialData.id } : {}),
        journalNumber: journalNumber.trim(),
        journalDate: new Date(journalDate).toISOString(),
        sourceModule,
        sourceReference: sourceReference.trim(),
        customerCode,
        description: description.trim(),
        totalDebit,
        totalCredit,
        status: submitForApproval ? "Verified" : (initialData?.status || "Draft"),
        createdBy: initialData?.createdBy || currentUserName,
        lines: lines.map((l, idx) => ({
          ...l,
          lineOrder: idx + 1,
          projectCode: l.projectCode || customerCode,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0
        }))
      };
      await onSave(payload, submitForApproval);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Gagal menyimpan voucher jurnal.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div
        className="relative w-full max-w-5xl my-8 bg-white border border-slate-200 overflow-hidden flex flex-col max-h-[90dvh] shadow-2xl"
        style={{ borderRadius: 4 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 border border-slate-200 bg-white" style={{ borderRadius: 3 }}>
              <FileText className="w-5 h-5 text-[#A57C50]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {initialData?.id ? `Edit Voucher Jurnal: ${initialData.journalNumber}` : "Buat Voucher Jurnal Baru"}
              </h3>
              <p className="text-xs text-slate-500">
                Pencatatan transaksi akuntansi double-entry standar PSAK / SAK PT AAP
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            style={{ borderRadius: 3 }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs" style={{ borderRadius: 3 }}>
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Validasi Gagal:</span> {error}
              </div>
            </div>
          )}

          {/* Header Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-white border border-slate-200 shadow-sm" style={{ borderRadius: 4 }}>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Nomor Jurnal</label>
              <input
                type="text"
                value={journalNumber}
                onChange={(e) => setJournalNumber(e.target.value)}
                placeholder="JV/2026/09/0001"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#A57C50] focus:bg-white transition-colors"
                style={{ borderRadius: 3 }}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Tanggal Transaksi</label>
              <input
                type="date"
                value={journalDate}
                onChange={(e) => setJournalDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#A57C50] focus:bg-white transition-colors"
                style={{ borderRadius: 3 }}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Site / Project</label>
              <select
                value={customerCode}
                onChange={(e) => setCustomerCode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#A57C50] focus:bg-white transition-colors"
                style={{ borderRadius: 3 }}
              >
                <option value="HO">HO (Head Office Jakarta)</option>
                <option value="BGG">BGG (PT Budi Gema Gempita)</option>
                <option value="SBS">SBS (PT Satria Bahana Sarana)</option>
                <option value="POS">POS (PT Position)</option>
                <option value="PTRO">PTRO (PT Petrosea Tbk)</option>
                <option value="CoY">CoY (Konsolidasi PT AAP)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Tipe / Referensi</label>
              <div className="flex gap-2">
                <select
                  value={sourceModule}
                  onChange={(e) => setSourceModule(e.target.value)}
                  className="w-1/2 px-2 py-2 bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#A57C50] focus:bg-white transition-colors"
                  style={{ borderRadius: 3 }}
                >
                  <option value="MANUAL">MANUAL</option>
                  <option value="ADJUSTMENT">PENYESUAIAN</option>
                  <option value="ACCRUAL">AKRUAL</option>
                  <option value="INVOICE">INVOICE</option>
                  <option value="PAYMENT">PAYMENT</option>
                </select>
                <input
                  type="text"
                  value={sourceReference}
                  onChange={(e) => setSourceReference(e.target.value)}
                  placeholder="Ref No..."
                  className="w-1/2 px-2 py-2 bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#A57C50] focus:bg-white transition-colors"
                  style={{ borderRadius: 3 }}
                />
              </div>
            </div>

            <div className="md:col-span-4">
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Keterangan Umum / Uraian Voucher</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contoh: Pembayaran tagihan solar operasional Site BGG periode Juni 2026"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#A57C50] focus:bg-white transition-colors"
                style={{ borderRadius: 3 }}
              />
            </div>
          </div>

          {/* Kalkulator Kurs Valas (USD -> IDR) Otomatis */}
          <div className="p-3.5 bg-white border border-slate-200 shadow-sm" style={{ borderRadius: 4 }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-800">💵 Kalkulator Kurs Valas (USD $\to$ IDR)</span>
                <span className="text-[11px] text-slate-400">Konversi otomatis nilai transaksi valas ke IDR</span>
              </div>
              <button
                type="button"
                onClick={() => setShowConverter(!showConverter)}
                className="text-xs font-medium text-[#A57C50] hover:text-[#8C6740] underline"
              >
                {showConverter ? "Sembunyikan" : "Buka Kalkulator Kurs"}
              </button>
            </div>

            {showConverter && (
              <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs items-end">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Nilai USD ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={usdAmount || ""}
                    onChange={(e) => setUsdAmount(parseFloat(e.target.value) || 0)}
                    placeholder="Contoh: 10000"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#A57C50] font-mono focus:bg-white"
                    style={{ borderRadius: 3 }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Kurs Transaksi (Rp / USD)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={exchangeRate || ""}
                    onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 16250)}
                    placeholder="16250"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#A57C50] font-mono focus:bg-white"
                    style={{ borderRadius: 3 }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Hasil Konversi IDR</label>
                  <div
                    className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-900"
                    style={{ borderRadius: 3 }}
                  >
                    {formatIDR(convertedIDR)}
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      if (lines.length > 0 && convertedIDR > 0) {
                        const updated = [...lines];
                        updated[0] = { ...updated[0], debit: convertedIDR };
                        setLines(updated);
                      }
                    }}
                    className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-semibold text-xs transition-colors"
                    style={{ borderRadius: 3 }}
                  >
                    Terapkan ke Baris #1 (Debet)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Lines Table */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#A57C50]" />
                Rincian Akun Double-Entry ({lines.length} Baris)
              </h4>
              <button
                type="button"
                onClick={addLine}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:text-slate-900 text-xs font-semibold transition-colors shadow-sm"
                style={{ borderRadius: 3 }}
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Baris
              </button>
            </div>

            <div className="border border-slate-200 overflow-hidden bg-white shadow-sm" style={{ borderRadius: 4 }}>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-semibold">
                    <th className="p-2.5 w-10 text-center uppercase tracking-wider text-[10px]">#</th>
                    <th className="p-2.5 w-64 uppercase tracking-wider text-[10px]">Akun COA (Wajib)</th>
                    <th className="p-2.5 w-40 uppercase tracking-wider text-[10px]">Kode Bantu / Sub-Ledger</th>
                    <th className="p-2.5 w-24 uppercase tracking-wider text-[10px]">Site</th>
                    <th className="p-2.5 uppercase tracking-wider text-[10px]">Keterangan Baris</th>
                    <th className="p-2.5 w-36 text-right uppercase tracking-wider text-[10px]">Debet (Rp)</th>
                    <th className="p-2.5 w-36 text-right uppercase tracking-wider text-[10px]">Kredit (Rp)</th>
                    <th className="p-2.5 w-10 text-center uppercase tracking-wider text-[10px]">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-1.5">
                        <select
                          value={line.accountCode}
                          onChange={(e) => handleAccountChange(idx, e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#A57C50] focus:bg-white"
                          style={{ borderRadius: 3 }}
                        >
                          <option value="">-- Pilih Akun --</option>
                          {activeCOAs.map((coa) => (
                            <option key={coa.code} value={coa.code}>
                              {coa.code} - {coa.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-1.5">
                        <select
                          value={line.subAccountCode || ""}
                          onChange={(e) => handleLineChange(idx, "subAccountCode", e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-[#A57C50] focus:bg-white"
                          style={{ borderRadius: 3 }}
                        >
                          <option value="">(Tanpa Sub-Ledger)</option>
                          {subLedgers.map((sub) => (
                            <option key={sub.code} value={sub.code}>
                              {sub.code} - {sub.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-1.5">
                        <select
                          value={line.projectCode || customerCode}
                          onChange={(e) => handleLineChange(idx, "projectCode", e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#A57C50] focus:bg-white"
                          style={{ borderRadius: 3 }}
                        >
                          <option value="HO">HO</option>
                          <option value="BGG">BGG</option>
                          <option value="SBS">SBS</option>
                          <option value="POS">POS</option>
                          <option value="PTRO">PTRO</option>
                          <option value="CoY">CoY</option>
                        </select>
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={line.description || ""}
                          onChange={(e) => handleLineChange(idx, "description", e.target.value)}
                          placeholder="Keterangan spesifik..."
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#A57C50] focus:bg-white"
                          style={{ borderRadius: 3 }}
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={line.debit || ""}
                          onChange={(e) => handleLineChange(idx, "debit", parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 text-xs text-right text-emerald-700 font-mono font-bold focus:outline-none focus:border-[#A57C50] focus:bg-white"
                          style={{ borderRadius: 3 }}
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={line.credit || ""}
                          onChange={(e) => handleLineChange(idx, "credit", parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 text-xs text-right text-sky-700 font-mono font-bold focus:outline-none focus:border-[#A57C50] focus:bg-white"
                          style={{ borderRadius: 3 }}
                        />
                      </td>
                      <td className="p-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          style={{ borderRadius: 2 }}
                          title="Hapus baris"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Balance Bar */}
          <div
            className={`p-3.5 border flex flex-col md:flex-row items-center justify-between gap-4 transition-colors ${
              isBalanced ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
            style={{ borderRadius: 4 }}
          >
            <div className="flex items-center gap-2.5">
              {isBalanced ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <div>
                <div className="font-bold text-xs">
                  {isBalanced ? "Jurnal Seimbang (Balanced) — Siap Disimpan" : "Jurnal Belum Seimbang (Unbalanced)"}
                </div>
                <div className="text-[11px] opacity-80">
                  {isBalanced
                    ? "Total Debet dan Kredit sama persis."
                    : `Terdapat selisih ${formatIDR(difference)}. Pastikan nilai Debet sama dengan Kredit.`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 font-mono text-xs">
              <div>
                <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Total Debet</span>
                <span className="text-emerald-700 font-bold text-xs">{formatIDR(totalDebit)}</span>
              </div>
              <div className="text-slate-300">/</div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Total Kredit</span>
                <span className="text-sky-700 font-bold text-xs">{formatIDR(totalCredit)}</span>
              </div>
              <div className="text-slate-300">/</div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Selisih</span>
                <span className={`font-bold text-xs ${isBalanced ? "text-emerald-700" : "text-rose-700"}`}>
                  {formatIDR(difference)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            style={{ borderRadius: 3 }}
          >
            Batal
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving || !isBalanced}
              onClick={() => handleSubmit(false)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-semibold border border-slate-300 transition-colors shadow-sm"
              style={{ borderRadius: 3 }}
            >
              <Save className="w-3.5 h-3.5 text-slate-500" />
              Simpan sebagai Draf
            </button>
            <button
              type="button"
              disabled={saving || !isBalanced}
              onClick={() => handleSubmit(true)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors hover:brightness-95 shadow-sm"
              style={{ background: "#A57C50", borderRadius: 3 }}
            >
              <Send className="w-3.5 h-3.5" />
              Kirim untuk Verifikasi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
