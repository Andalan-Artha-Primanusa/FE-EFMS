import React, { useEffect } from "react";
import { Receipt, Plus, DollarSign, CheckCircle2, Edit2, XCircle } from "lucide-react";
import { RupiahInput, compensationSources, formatIDR, invoiceOutstanding, pph23Prefill } from "../helpers";
import { PaymentAccurateStatus } from "./PaymentCustomerDetailSheet";

interface DetailPaymentTrackerProps {
  detailData: any;
  invoiceRows: any[];
  paymentRows: any[];
  showAddPartialPayment: boolean;
  setShowAddPartialPayment: (show: boolean) => void;
  partialPaymentForm: any;
  setPartialPaymentForm: (form: any) => void;
  handleSavePartialPayment: (e: React.FormEvent) => void;
  handleVerifyPartialPayment?: (id: number, rejectNote?: string) => void;
  canEditPayment?: (p: any) => boolean;
  canSyncAccurate?: boolean;
  onNotice?: (msg: string) => void;
  onAccurateSaved?: () => void;
}

export const DetailPaymentTracker: React.FC<DetailPaymentTrackerProps> = ({
  detailData,
  invoiceRows,
  paymentRows,
  showAddPartialPayment,
  setShowAddPartialPayment,
  partialPaymentForm,
  setPartialPaymentForm,
  handleSavePartialPayment,
  handleVerifyPartialPayment,
  canEditPayment,
  canSyncAccurate,
  onNotice,
  onAccurateSaved
}) => {
  const totalInv = detailData.totalDibayar || detailData.totalReceipt || detailData.totalInvoice || 1;
  const paid = detailData.totalPaid || 0;
  const outstanding = invoiceOutstanding(detailData);
  const overpaid = Math.max(0, -outstanding);
  const percent = Math.min(100, Math.round((paid / totalInv) * 100));

  const linkedPayments = paymentRows.filter((p: any) => p.invoiceNo === detailData.invoiceNo);
  const editing = partialPaymentForm.base;
  const comp = Number(partialPaymentForm.compensation || 0);
  const settling = Number(partialPaymentForm.amountPaid || 0) + comp;
  const sources = compensationSources(detailData, invoiceRows, paymentRows, editing?.id);
  const compKey = partialPaymentForm.compensationType ? `${partialPaymentForm.compensationType}|${partialPaymentForm.compensationInvoiceNo}` : "";
  const compLabel = (type: string, no: string) => `${type === "BACKCHARGE" ? "Backcharge" : "Lebih Bayar"} ${no}`;
  // Form edit milik invoice ini saja: ditutup & dikosongkan saat invoice berganti / modal ditutup.
  useEffect(() => () => {
    setShowAddPartialPayment(false);
    setPartialPaymentForm({ amountPaid: "", pph23Withheld: 0, paymentDate: new Date().toISOString().split("T")[0], receivingBank: "Bank Mandiri Escrow", refNo: "", receiptNo: "", excessReceiptNo: "", notes: "" });
  }, [detailData.invoiceNo]);
  const startEdit = (p: any) => {
    setPartialPaymentForm({
      base: p, amountPaid: p.amountPaid, pph23Withheld: p.pph23Withheld || 0,
      paymentDate: p.paymentDate ? String(p.paymentDate).slice(0, 10) : "", receivingBank: p.receivingBank || "",
      refNo: p.refNo || "", receiptNo: p.receiptNo || "", excessReceiptNo: p.excessReceiptNo || "", notes: p.notes || "",
      compensation: p.compensation || 0, compensationType: p.compensationType || "", compensationInvoiceNo: p.compensationInvoiceNo || ""
    });
    setShowAddPartialPayment(true);
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-[4px] p-4 shadow-xs space-y-3.5">
      <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
        <div className="flex items-center gap-1.5">
          <Receipt className="text-[#A57C50]" size={16} />
          <h4 className="text-xs font-black uppercase tracking-wider text-[#1A1612]">
            Payment Tracker (Cicilan)
          </h4>
        </div>
        <button
          onClick={() => {
            if (editing) setPartialPaymentForm({ ...partialPaymentForm, base: undefined, amountPaid: "", pph23Withheld: 0, refNo: "", receiptNo: "", excessReceiptNo: "", notes: "", compensation: 0, compensationType: "", compensationInvoiceNo: "" });
            setShowAddPartialPayment(!showAddPartialPayment);
          }}
          className="px-3 py-1 text-xs font-extrabold bg-[#A57C50] hover:bg-[#8e6941] text-white rounded-[3px] flex items-center gap-1 transition shadow-xs cursor-pointer"
        >
          <Plus size={14} /> {showAddPartialPayment ? "Batal" : "Catat Cicilan"}
        </button>
      </div>

      {/* Progress Bar & Summary */}
      <div className="space-y-2.5 text-xs">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-white border border-slate-200 p-2.5 rounded-[4px] shadow-xs">
            <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Total Terbayar</span>
            <strong className="text-[#1A1612] text-sm font-black">{formatIDR(paid)}</strong>
          </div>
          <div className="bg-[#A57C50]/5 border border-[#A57C50]/20 p-2.5 rounded-[4px] shadow-xs">
            <span className="text-[10px] text-[#A57C50] block uppercase font-bold tracking-wider">{overpaid > 0 ? "Lebih Bayar" : "Sisa Tagihan"}</span>
            <strong className="text-[#1A1612] text-sm font-black">{formatIDR(overpaid || outstanding)}</strong>
          </div>
        </div>

        <div className="space-y-1 pt-0.5">
          <div className="flex justify-between text-[11px] font-bold">
            <span className="text-slate-600">Status Pelunasan</span>
            <span className="text-[#A57C50] font-extrabold">{percent}% Lunas</span>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-[2px] overflow-hidden border border-slate-300">
            <div className="bg-[#A57C50] h-full transition-all duration-300" style={{ width: `${percent}%` }} />
          </div>
        </div>
      </div>

      {/* Form Catat Cicilan Baru */}
      {showAddPartialPayment && (
        <form onSubmit={handleSavePartialPayment} className="bg-white border border-slate-300 p-3.5 rounded-[4px] shadow-xs space-y-3 text-xs text-slate-800 mt-2">
          <div className="font-extrabold text-[#1A1612] border-b border-slate-200 pb-2 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
            <DollarSign size={14} className="text-[#A57C50]" /> {editing ? "Edit Cicilan" : "Form Entri Cicilan Baru"}
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Nominal Bayar (Rp) <span className="text-[#A57C50]">*</span>
            </label>
            <RupiahInput
              label=""
              required
              value={partialPaymentForm.amountPaid}
              onChange={(v) => setPartialPaymentForm({ ...partialPaymentForm, amountPaid: v, pph23Withheld: pph23Prefill(detailData, v + comp, paymentRows, editing?.id) })}
            />
          </div>
          {sources.length > 0 || compKey ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">Kompensasi</label>
                <select
                  className="w-full bg-slate-50 border border-slate-300 rounded-[3px] px-2.5 py-2 text-slate-900 font-medium focus:border-[#A57C50] focus:bg-white focus:ring-1 focus:ring-[#A57C50]/30 outline-none transition text-xs"
                  value={compKey}
                  onChange={(e) => {
                    const src = sources.find((s) => `${s.type}|${s.invoiceNo}` === e.target.value);
                    const next = src ? Math.min(src.available, Math.max(0, totalInv - paid - Number(partialPaymentForm.amountPaid || 0))) : 0;
                    setPartialPaymentForm({
                      ...partialPaymentForm, compensationType: src?.type || "", compensationInvoiceNo: src?.invoiceNo || "", compensation: next,
                      pph23Withheld: pph23Prefill(detailData, Number(partialPaymentForm.amountPaid || 0) + next, paymentRows, editing?.id)
                    });
                  }}
                >
                  <option value="">—</option>
                  {compKey && !sources.some((s) => `${s.type}|${s.invoiceNo}` === compKey) && (
                    <option value={compKey}>{compLabel(partialPaymentForm.compensationType, partialPaymentForm.compensationInvoiceNo)}</option>
                  )}
                  {sources.map((s) => (
                    <option key={`${s.type}|${s.invoiceNo}`} value={`${s.type}|${s.invoiceNo}`}>
                      {compLabel(s.type, s.invoiceNo)} · {formatIDR(s.available)}
                    </option>
                  ))}
                </select>
              </div>
              {compKey && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Nominal Kompensasi (Rp) <span className="text-[#A57C50]">*</span>
                  </label>
                  <RupiahInput
                    label=""
                    required
                    value={partialPaymentForm.compensation ?? 0}
                    onChange={(v) => setPartialPaymentForm({
                      ...partialPaymentForm, compensation: v,
                      pph23Withheld: pph23Prefill(detailData, Number(partialPaymentForm.amountPaid || 0) + v, paymentRows, editing?.id)
                    })}
                  />
                </div>
              )}
            </div>
          ) : null}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              PPh 23 Dipotong Customer (Rp)
            </label>
            <RupiahInput
              label=""
              value={partialPaymentForm.pph23Withheld ?? 0}
              onChange={(v) => setPartialPaymentForm({ ...partialPaymentForm, pph23Withheld: v })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Tgl Bayar <span className="text-[#A57C50]">*</span>
              </label>
              <input
                type="date"
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-[3px] px-2.5 py-1.5 text-slate-900 font-medium focus:border-[#A57C50] focus:bg-white focus:ring-1 focus:ring-[#A57C50]/30 outline-none transition text-xs"
                value={partialPaymentForm.paymentDate}
                onChange={(e) => setPartialPaymentForm({ ...partialPaymentForm, paymentDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Bank Penerima
              </label>
              <input
                type="text"
                placeholder="Bank Mandiri Escrow"
                className="w-full bg-slate-50 border border-slate-300 rounded-[3px] px-2.5 py-1.5 text-slate-900 font-medium focus:border-[#A57C50] focus:bg-white focus:ring-1 focus:ring-[#A57C50]/30 outline-none transition text-xs"
                value={partialPaymentForm.receivingBank}
                onChange={(e) => setPartialPaymentForm({ ...partialPaymentForm, receivingBank: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                No. Ref Transfer
              </label>
              <input
                type="text"
                placeholder="TRF-MND-XXXX"
                className="w-full bg-slate-50 border border-slate-300 rounded-[3px] px-2.5 py-1.5 text-slate-900 font-medium focus:border-[#A57C50] focus:bg-white focus:ring-1 focus:ring-[#A57C50]/30 outline-none transition font-mono text-xs"
                value={partialPaymentForm.refNo}
                onChange={(e) => setPartialPaymentForm({ ...partialPaymentForm, refNo: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Catatan
              </label>
              <input
                type="text"
                placeholder="Cicilan ke-1"
                className="w-full bg-slate-50 border border-slate-300 rounded-[3px] px-2.5 py-1.5 text-slate-900 font-medium focus:border-[#A57C50] focus:bg-white focus:ring-1 focus:ring-[#A57C50]/30 outline-none transition text-xs"
                value={partialPaymentForm.notes}
                onChange={(e) => setPartialPaymentForm({ ...partialPaymentForm, notes: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              No. Bukti Penerimaan Accurate {detailData.accurate?.docs?.FAKTUR && <span className="text-[#A57C50]">*</span>}
            </label>
            <input
              type="text"
              required={Boolean(detailData.accurate?.docs?.FAKTUR)}
              placeholder="006/BBM-MDR OP/X/26"
              className="w-full bg-slate-50 border border-slate-300 rounded-[3px] px-2.5 py-1.5 text-slate-900 font-medium focus:border-[#A57C50] focus:bg-white focus:ring-1 focus:ring-[#A57C50]/30 outline-none transition font-mono text-xs"
              value={partialPaymentForm.receiptNo || ""}
              onChange={(e) => setPartialPaymentForm({ ...partialPaymentForm, receiptNo: e.target.value })}
            />
          </div>
          {detailData.accurate?.docs?.FAKTUR && settling > totalInv - paid && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                No. Bukti Kelebihan Bayar Accurate ({formatIDR(settling - (totalInv - paid))}) <span className="text-[#A57C50]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="007/BBM-MDR OP/X/26"
                className="w-full bg-slate-50 border border-slate-300 rounded-[3px] px-2.5 py-1.5 text-slate-900 font-medium focus:border-[#A57C50] focus:bg-white focus:ring-1 focus:ring-[#A57C50]/30 outline-none transition font-mono text-xs"
                value={partialPaymentForm.excessReceiptNo || ""}
                onChange={(e) => setPartialPaymentForm({ ...partialPaymentForm, excessReceiptNo: e.target.value })}
              />
            </div>
          )}
          <button
            type="submit"
            className="w-full py-2 bg-[#A57C50] hover:bg-[#8e6941] text-white font-extrabold rounded-[3px] transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5 text-xs mt-1"
          >
            {editing ? "Simpan Perubahan" : "Simpan Cicilan"} (Menunggu Verifikasi)
          </button>
        </form>
      )}

      {/* Riwayat List Cicilan */}
      <div className="space-y-2 pt-2 border-t border-slate-200 max-h-60 overflow-y-auto pr-1">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Daftar History Cicilan:</span>
        {linkedPayments.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic py-1">Belum ada rincian cicilan yang terdaftar.</p>
        ) : (
          linkedPayments.map((p: any, pIdx: number) => {
            const isVerified = p.verificationStatus === "Verified" || !p.verificationStatus;
            const isRejected = p.verificationStatus === "Rejected";
            return (
              <div key={p.id || pIdx} className="bg-white border border-slate-200 rounded-[4px] p-3 space-y-1.5 shadow-xs text-xs">
                <div className="flex justify-between items-start">
                  <span className="font-black text-[#1A1612] font-mono text-sm">{formatIDR(p.amountPaid)}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-[3px] font-bold ${isVerified ? "bg-[#A57C50]/10 text-[#A57C50] border border-[#A57C50]/30" : isRejected ? "bg-red-50 text-red-700 border border-red-300" : "bg-amber-50 text-amber-800 border border-amber-300"}`}>
                    {isVerified ? "✓ Verified" : isRejected ? "✕ Ditolak" : "⏳ Pending Verifikasi"}
                  </span>
                </div>
                {Number(p.compensation) > 0 && (
                  <div className="text-[11px] text-slate-600 font-semibold flex flex-wrap justify-between gap-x-2">
                    <span>{compLabel(p.compensationType, p.compensationInvoiceNo)}</span>
                    <span className="font-mono">{formatIDR(p.compensation)}</span>
                  </div>
                )}
                {isRejected && p.rejectNote && (
                  <div className="text-[11px] bg-red-50 border border-red-200 text-red-700 rounded-[3px] px-2 py-1 break-words">
                    {p.rejectNote} — <strong>{p.verifiedBy}</strong>
                  </div>
                )}
                <div className="flex justify-between text-[11px] text-slate-600 font-semibold">
                  <span>Tgl: {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString("id-ID") : "-"}</span>
                  <span>{p.receivingBank || "-"}</span>
                </div>
                <PaymentAccurateStatus data={p} hasFaktur={Boolean(detailData.accurate?.docs?.FAKTUR)} canSync={canSyncAccurate} onNotice={onNotice} onSaved={onAccurateSaved} />
                <div className="text-[10px] text-slate-500 flex justify-between items-center pt-1.5 border-t border-slate-100 font-medium">
                  <span>Inputter: <strong className="text-slate-800 font-bold">{p.createdBy || "AR Admin"}</strong></span>
                  {isVerified && p.verifiedBy && (
                    <span>Verifikator: <strong className="text-[#A57C50] font-bold">{p.verifiedBy}</strong></span>
                  )}
                </div>
                {!isVerified && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {canEditPayment?.(p) && (
                      <button
                        onClick={() => startEdit(p)}
                        className="flex-1 min-w-[90px] py-1.5 text-xs border border-[#A57C50] text-[#A57C50] hover:bg-[#A57C50]/10 font-extrabold rounded-[3px] flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Edit2 size={13} /> Edit
                      </button>
                    )}
                    {!isRejected && handleVerifyPartialPayment && (
                      <>
                        <button
                          onClick={() => {
                            const note = window.prompt("Alasan Tolak");
                            if (note?.trim()) handleVerifyPartialPayment(p.id, note.trim());
                          }}
                          className="flex-1 min-w-[90px] py-1.5 text-xs border border-red-300 text-red-700 hover:bg-red-50 font-extrabold rounded-[3px] flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <XCircle size={13} /> Tolak
                        </button>
                        <button
                          onClick={() => handleVerifyPartialPayment(p.id)}
                          className="basis-full py-1.5 text-xs bg-[#A57C50] hover:bg-[#8e6941] text-white font-extrabold rounded-[3px] flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
                        >
                          <CheckCircle2 size={14} /> Verifikasi Pembayaran (1-Level)
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
