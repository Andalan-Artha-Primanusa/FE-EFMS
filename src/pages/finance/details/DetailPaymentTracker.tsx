import React from "react";
import { Receipt, Plus, DollarSign, CheckCircle2 } from "lucide-react";
import { formatIDR } from "../helpers";

interface DetailPaymentTrackerProps {
  detailData: any;
  paymentRows: any[];
  showAddPartialPayment: boolean;
  setShowAddPartialPayment: (show: boolean) => void;
  partialPaymentForm: any;
  setPartialPaymentForm: (form: any) => void;
  handleSavePartialPayment: (e: React.FormEvent) => void;
  handleVerifyPartialPayment?: (id: number) => void;
}

export const DetailPaymentTracker: React.FC<DetailPaymentTrackerProps> = ({
  detailData,
  paymentRows,
  showAddPartialPayment,
  setShowAddPartialPayment,
  partialPaymentForm,
  setPartialPaymentForm,
  handleSavePartialPayment,
  handleVerifyPartialPayment
}) => {
  const totalInv = detailData.totalReceipt || detailData.totalInvoice || 1;
  const paid = detailData.totalPaid || 0;
  const outstanding = detailData.outstanding !== undefined ? detailData.outstanding : (totalInv - paid);
  const percent = Math.min(100, Math.round((paid / totalInv) * 100));

  const linkedPayments = paymentRows.filter((p: any) => p.invoiceNo === detailData.invoiceNo);

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
          onClick={() => setShowAddPartialPayment(!showAddPartialPayment)}
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
            <span className="text-[10px] text-[#A57C50] block uppercase font-bold tracking-wider">Sisa Tagihan</span>
            <strong className="text-[#1A1612] text-sm font-black">{formatIDR(outstanding)}</strong>
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
            <DollarSign size={14} className="text-[#A57C50]" /> Form Entri Cicilan Baru
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Nominal Bayar (Rp) <span className="text-[#A57C50]">*</span>
            </label>
            <input
              type="number"
              required
              placeholder="Contoh: 5000000000"
              className="w-full bg-slate-50 border border-slate-300 rounded-[3px] px-3 py-2 text-slate-900 font-extrabold focus:border-[#A57C50] focus:bg-white focus:ring-1 focus:ring-[#A57C50]/30 outline-none transition font-mono text-xs"
              value={partialPaymentForm.amountPaid}
              onChange={(e) => setPartialPaymentForm({ ...partialPaymentForm, amountPaid: e.target.value })}
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
          <button
            type="submit"
            className="w-full py-2 bg-[#A57C50] hover:bg-[#8e6941] text-white font-extrabold rounded-[3px] transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5 text-xs mt-1"
          >
            Simpan Cicilan (Menunggu Verifikasi)
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
            return (
              <div key={p.id || pIdx} className="bg-white border border-slate-200 rounded-[4px] p-3 space-y-1.5 shadow-xs text-xs">
                <div className="flex justify-between items-start">
                  <span className="font-black text-[#1A1612] font-mono text-sm">{formatIDR(p.amountPaid)}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-[3px] font-bold ${isVerified ? "bg-[#A57C50]/10 text-[#A57C50] border border-[#A57C50]/30" : "bg-amber-50 text-amber-800 border border-amber-300"}`}>
                    {isVerified ? "✓ Verified" : "⏳ Pending Verifikasi"}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600 font-semibold">
                  <span>Tgl: {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString("id-ID") : "-"}</span>
                  <span>{p.receivingBank || "-"}</span>
                </div>
                <div className="text-[10px] text-slate-500 flex justify-between items-center pt-1.5 border-t border-slate-100 font-medium">
                  <span>Inputter: <strong className="text-slate-800 font-bold">{p.createdBy || "AR Admin"}</strong></span>
                  {isVerified && p.verifiedBy && (
                    <span>Verifikator: <strong className="text-[#A57C50] font-bold">{p.verifiedBy}</strong></span>
                  )}
                </div>
                {!isVerified && handleVerifyPartialPayment && (
                  <button
                    onClick={() => handleVerifyPartialPayment(p.id)}
                    className="w-full mt-2 py-1.5 text-xs bg-[#A57C50] hover:bg-[#8e6941] text-white font-extrabold rounded-[3px] flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
                  >
                    <CheckCircle2 size={14} /> Verifikasi Pembayaran (1-Level)
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
