import React, { useState } from "react";
import { Plus, ShieldCheck, X } from "lucide-react";
import { formatCurrency } from "../../../lib/format";
import type { useTreasuryController } from "../useTreasuryController";

type Props = {
  c: ReturnType<typeof useTreasuryController>;
};

export function CreatePlanModal({ c }: Props) {
  const {
    invoices,
    allUnpaidInvoices,
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

  if (!showCreatePlanModal) return null;

  const pool = allUnpaidInvoices && allUnpaidInvoices.length > 0 ? allUnpaidInvoices : invoices;
  const selectedInvoices = pool.filter((inv) =>
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
      voucherDate: new Date().toISOString().slice(0, 10),
      justification: "",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-[4px] shadow-2xl border border-stone-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header Enterprise AAP Brand Ink */}
        <div className="bg-[#1A1612] text-white p-4 flex items-center justify-between border-b border-amber-900/30">
          <div className="flex items-center gap-2.5">
            <Plus className="w-5 h-5 text-[#A57C50]" />
            <div>
              <h3 className="text-sm font-bold tracking-wide uppercase">
                Buat Pengajuan Rencana Bayar (RAB / Voucher)
              </h3>
              <p className="text-[11px] text-stone-400">
                Menjadwalkan pembayaran {selectedInvoices.length} tagihan terpilih ke Finance HO
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreatePlanModal(false)}
            className="text-stone-400 hover:text-white p-1 rounded-[3px] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-4 text-xs font-sans">
          {/* Automatic Voucher Note */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-[3px] p-2.5 flex items-center justify-between text-[11px] text-amber-900 font-medium">
            <span>Nomor Voucher dibuat otomatis per Site &amp; Vendor secara berurutan.</span>
            <span className="font-mono font-bold text-[#A57C50] text-xs">AUTO-GENERATE</span>
          </div>

          {/* Row 1: Bank & Category */}
          <div className="grid grid-cols-2 gap-4">
            {/* Company Bank */}
            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Rekening Sumber (Bank Perusahaan):
              </label>
              <select
                value={companyBankId}
                onChange={(e) => setCompanyBankId(Number(e.target.value))}
                className="w-full p-2 border border-stone-300 rounded-[3px] font-semibold text-stone-900 bg-white focus:ring-1 focus:ring-[#A57C50] focus:border-[#A57C50] focus:outline-none text-xs"
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
              <label className="block font-semibold text-stone-700 mb-1">Kategori Pengajuan:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2 border border-stone-300 rounded-[3px] font-semibold text-stone-900 bg-white focus:ring-1 focus:ring-[#A57C50] focus:border-[#A57C50] focus:outline-none text-xs"
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

          {/* Selected Invoices Summary Box */}
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-[3px] space-y-2">
            <div className="font-semibold text-stone-700">Ringkasan Tagihan Terpilih ({selectedInvoices.length} Item):</div>
            <div className="max-h-36 overflow-y-auto space-y-1">
              {selectedInvoices.map((inv) => {
                const amt = partialAmounts[inv.id] !== undefined
                  ? Number(partialAmounts[inv.id])
                  : Number(inv.remainingBalance);

                return (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between text-[11px] bg-white p-1.5 rounded-[2px] border border-stone-200"
                  >
                    <div>
                      <span className="font-bold text-stone-900">{inv.vendor?.name}</span>
                      <span className="text-stone-400 ml-1.5 font-mono">({inv.invoiceNo})</span>
                    </div>
                    <div className="font-mono font-bold text-blue-900">
                      {formatCurrency(amt)}
                      {amt < Number(inv.remainingBalance) && (
                        <span className="text-[10px] text-amber-700 font-normal ml-1">(Parsial)</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-stone-200 flex items-center justify-between font-bold text-sm">
              <span className="text-stone-700">Total Nilai Pengajuan RAB:</span>
              <span className="text-blue-900 font-mono text-base">
                {formatCurrency(totalCalculated)}
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setShowCreatePlanModal(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-[3px] transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-extrabold text-white bg-[#A57C50] hover:bg-[#8e6941] rounded-[3px] shadow-sm transition cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" /> Simpan &amp; Kunci Jadwal Voucher
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
