import React, { useState } from "react";
import { Calendar, DollarSign, Landmark, Plus, ShieldCheck, X } from "lucide-react";
import { formatCurrency } from "../../../lib/format";
import type { useTreasuryController } from "../useTreasuryController";

type Props = {
  c: ReturnType<typeof useTreasuryController>;
};

export function CreatePlanModal({ c }: Props) {
  const {
    invoices,
    companyBanks,
    selectedInvoiceIds,
    partialAmounts,
    showCreatePlanModal,
    setShowCreatePlanModal,
    handleCreatePlan,
  } = c;

  const [companyBankId, setCompanyBankId] = useState<number>(
    companyBanks[0]?.id || 1
  );
  const [category, setCategory] = useState<string>("AP");
  const [voucherDate, setVoucherDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [justification, setJustification] = useState<string>("Reguler AP Sesuai Aging");

  if (!showCreatePlanModal) return null;

  const selectedInvoices = invoices.filter((inv) =>
    selectedInvoiceIds.includes(inv.id)
  );

  const totalCalculated = selectedInvoices.reduce((sum, inv) => {
    const amt = partialAmounts[inv.id] !== undefined
      ? Number(partialAmounts[inv.id])
      : Number(inv.remainingBalance);
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCreatePlan({
      companyBankId,
      category,
      voucherDate,
      justification,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" /> Buat Pengajuan Voucher / RAB
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Menjadwalkan pembayaran untuk {selectedInvoices.length} tagihan terpilih
            </p>
          </div>
          <button
            onClick={() => setShowCreatePlanModal(false)}
            className="text-slate-400 hover:text-slate-600 rounded p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            {/* Company Bank */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Rekening Sumber (Bank Perusahaan):
              </label>
              <select
                value={companyBankId}
                onChange={(e) => setCompanyBankId(Number(e.target.value))}
                className="w-full p-2 border border-slate-300 rounded font-semibold text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                {companyBanks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bankName} ({b.accountNumber})
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kategori Pengajuan:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded font-semibold text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="AP">AP (Regular Account Payable)</option>
                <option value="TUNAI_PO">TUNAI PO (Pembayaran Tunai PO)</option>
                <option value="TUNAI_NON_PO">TUNAI NON PO (Operasional Non-PO)</option>
                <option value="SOLAR">SOLAR / FUEL</option>
                <option value="LEASING">LEASING (Cicilan Alat Berat)</option>
                <option value="PETTY_CASH">PETTY CASH (Kas Kecil)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Voucher Date */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tanggal Jadwal Bayar:</label>
              <input
                type="date"
                value={voucherDate}
                onChange={(e) => setVoucherDate(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Justification */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Justifikasi Pengajuan:</label>
              <input
                type="text"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Contoh: Overdue > 120d, Block Supply, Reguler..."
                className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Selected Invoices Summary Box */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="font-semibold text-slate-700">Ringkasan Tagihan Terpilih:</div>
            <div className="max-h-36 overflow-y-auto space-y-1">
              {selectedInvoices.map((inv) => {
                const amt = partialAmounts[inv.id] !== undefined
                  ? Number(partialAmounts[inv.id])
                  : Number(inv.remainingBalance);

                return (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between text-[11px] bg-white p-1.5 rounded border border-slate-200"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{inv.vendor?.name}</span>
                      <span className="text-slate-400 ml-1.5 font-mono">({inv.invoiceNo})</span>
                    </div>
                    <div className="font-mono font-bold text-blue-700">
                      {formatCurrency(amt)}
                      {amt < Number(inv.remainingBalance) && (
                        <span className="text-[10px] text-amber-600 font-normal ml-1">(Parsial)</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold text-sm">
              <span className="text-slate-700">Total Nilai Pengajuan RAB:</span>
              <span className="text-blue-700 font-mono text-base">
                {formatCurrency(totalCalculated)}
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowCreatePlanModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded"
            >
              Batal
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-md transition"
            >
              <ShieldCheck className="w-4 h-4" /> Simpan &amp; Kunci Jadwal Voucher
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
