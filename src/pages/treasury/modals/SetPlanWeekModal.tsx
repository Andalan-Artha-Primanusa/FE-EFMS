import React, { useState } from "react";
import { Calendar, Check, Clock, Loader2, X } from "lucide-react";
import { formatCurrency } from "../../../lib/format";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  selectedInvoiceIds: number[];
  totalAmount: number;
  onConfirm: (planMonth: string, planWeek: number) => Promise<boolean>;
};

export function SetPlanWeekModal({
  isOpen,
  onClose,
  selectedInvoiceIds,
  totalAmount,
  onConfirm,
}: Props) {
  const [planMonth, setPlanMonth] = useState<string>("September 2026");
  const [planWeek, setPlanWeek] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const months = [
    "Januari 2026",
    "Februari 2026",
    "Maret 2026",
    "April 2026",
    "Mei 2026",
    "Juni 2026",
    "Juli 2026",
    "Agustus 2026",
    "September 2026",
    "Oktober 2026",
    "November 2026",
    "Desember 2026",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const ok = await onConfirm(planMonth, planWeek);
      if (ok) {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-[4px] shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Enterprise AAP Brand Ink */}
        <div className="bg-[#1A1612] text-white p-4 flex items-center justify-between border-b border-amber-900/30">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#A57C50]" />
            <div>
              <h3 className="text-sm font-bold tracking-wide uppercase">
                Tetapkan Rencana Bayar
              </h3>
              <p className="text-[11px] text-stone-400">
                Alokasi Cashflow Mingguan AP
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-[3px] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans">
          {/* Summary Box */}
          <div className="bg-stone-50 border border-stone-200 rounded-[3px] p-3 space-y-1">
            <div className="flex justify-between text-stone-600">
              <span>Jumlah Tagihan Terpilih:</span>
              <span className="font-bold text-stone-900">
                {selectedInvoiceIds.length} Invoice / PO
              </span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Total Nominal Rencana:</span>
              <span className="font-mono font-bold text-blue-800 text-sm">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>

          {/* Month Selection */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Target Bulan Pencairan:
            </label>
            <select
              value={planMonth}
              onChange={(e) => setPlanMonth(e.target.value)}
              className="w-full p-2 border border-stone-300 rounded-[3px] font-semibold text-stone-900 bg-white focus:ring-1 focus:ring-[#A57C50] focus:border-[#A57C50] focus:outline-none"
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Week Selection */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1.5">
              Target Distribusi Minggu (Week):
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((w) => (
                <button
                  type="button"
                  key={w}
                  onClick={() => setPlanWeek(w)}
                  className={`py-2 px-3 rounded-[3px] border text-center font-bold text-xs transition cursor-pointer flex flex-col items-center gap-1 ${
                    planWeek === w
                      ? "bg-[#1A1612] text-[#A57C50] border-[#A57C50] shadow-xs"
                      : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  <span>Week {w}</span>
                  {planWeek === w && <Check className="w-3.5 h-3.5 text-[#A57C50]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-[3px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || selectedInvoiceIds.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-[3px] bg-[#A57C50] hover:bg-[#8e6941] text-white font-extrabold text-xs transition shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Alokasi Plan"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
