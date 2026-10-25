import React from "react";
import { RupiahInput, formatIDR, paySettled, pph23Prefill } from "../helpers";

interface PaymentModalProps {
  formData: any;
  setFormData: (data: any) => void;
  companyList: any[];
  invoiceRows?: any[];
  paymentRows?: any[];
}

export function PaymentModal({ formData, setFormData, companyList, invoiceRows = [], paymentRows = [] }: PaymentModalProps) {
  const inv = invoiceRows.find((i) => i.invoiceNo?.toLowerCase() === formData.invoiceNo?.trim().toLowerCase());
  // Invoice yang fakturnya sudah di Accurate wajib nomor bukti penerimaan.
  const needReceipt = Boolean(inv?.accurate?.docs?.FAKTUR);
  // Lebih bayar atas faktur Accurate: Penerimaan Lain dengan nomor bukti kedua.
  const target = Number(inv?.totalDibayar || inv?.totalReceipt || inv?.totalInvoice || 0);
  const others = paymentRows.filter((p) => p.invoiceNo?.toLowerCase() === inv?.invoiceNo?.toLowerCase() && p.id !== formData.id && p.verificationStatus !== "Rejected");
  const excess = paySettled(formData) + others.reduce((s, p) => s + paySettled(p), 0) - target;
  return (
    <>
      {/* Section 1: Target Invoice */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
          <span className="text-xs font-black uppercase text-cyan-800 tracking-wider">
            1. Target Invoice Pembayaran
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              No. Invoice Target <span className="text-rose-600">*</span>
            </label>
            <input
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono font-bold focus:border-cyan-700 focus:bg-white outline-none"
              placeholder="088/BGG-AAP/II/2026"
              value={formData.invoiceNo || ""}
              onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Customer Code <span className="text-rose-600">*</span>
            </label>
            <select
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:border-cyan-700 focus:bg-white outline-none"
              value={formData.customerCode || ""}
              onChange={(e) => setFormData({ ...formData, customerCode: e.target.value })}
            >
              <option value="">— Pilih Customer —</option>
              {companyList.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Section 2: Nominal & Rekening Bank */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
          <span className="text-xs font-black uppercase text-cyan-800 tracking-wider">
            2. Nominal Uang Masuk & Rekening Bank
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <RupiahInput
            label="Jumlah Uang Masuk Received (Rp)"
            value={formData.amountPaid || 0}
            onChange={(val: number) => setFormData({ ...formData, amountPaid: val, pph23Withheld: pph23Prefill(inv, val + Number(formData.compensation || 0), paymentRows, formData.id) })}
            required={true}
          />
          <RupiahInput
            label="PPh 23 Dipotong Customer (Rp)"
            value={formData.pph23Withheld || 0}
            onChange={(val: number) => setFormData({ ...formData, pph23Withheld: val })}
          />
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Tanggal Pembayaran <span className="text-rose-600">*</span>
            </label>
            <input
              type="date"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none"
              value={formData.paymentDate || ""}
              onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Bank Receiving (Tujuan Transaksi)
            </label>
            <input
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none"
              placeholder="Contoh: BRI Escrow / Mandiri 0000 OP"
              value={formData.receivingBank || ""}
              onChange={(e) => setFormData({ ...formData, receivingBank: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              No. Referensi Bank / Transfer
            </label>
            <input
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono focus:border-cyan-700 focus:bg-white outline-none"
              placeholder="TRF-BRI-00129"
              value={formData.refNo || ""}
              onChange={(e) => setFormData({ ...formData, refNo: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              No. Bukti Penerimaan Accurate {needReceipt && <span className="text-rose-600">*</span>}
            </label>
            <input
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono focus:border-cyan-700 focus:bg-white outline-none"
              placeholder="006/BBM-MDR OP/X/26"
              value={formData.receiptNo || ""}
              onChange={(e) => setFormData({ ...formData, receiptNo: e.target.value })}
              onBlur={(e) => setFormData({ ...formData, receiptNo: e.target.value.trim() })}
              required={needReceipt}
            />
          </div>
          {needReceipt && excess > 0 && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                No. Bukti Kelebihan Bayar Accurate ({formatIDR(excess)}) <span className="text-rose-600">*</span>
              </label>
              <input
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono focus:border-cyan-700 focus:bg-white outline-none"
                placeholder="007/BBM-MDR OP/X/26"
                value={formData.excessReceiptNo || ""}
                onChange={(e) => setFormData({ ...formData, excessReceiptNo: e.target.value })}
                onBlur={(e) => setFormData({ ...formData, excessReceiptNo: e.target.value.trim() })}
                required
              />
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Catatan Pembayaran */}
      <div className="space-y-3 pt-2">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Catatan Pembayaran
          </label>
          <textarea
            className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none"
            rows={2}
            placeholder="Keterangan cicilan 1 / pelunasan BGG..."
            value={formData.notes || ""}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>
      </div>
    </>
  );
}
