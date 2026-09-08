import React from "react";
import { RupiahInput } from "../helpers";

interface PaymentModalProps {
  formData: any;
  setFormData: (data: any) => void;
  companyList: any[];
}

export function PaymentModal({ formData, setFormData, companyList }: PaymentModalProps) {
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
            onChange={(val: number) => setFormData({ ...formData, amountPaid: val })}
            required={true}
            helperText="Otomatis mengurangi sisa Outstanding & update status Lunas/Partial"
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
