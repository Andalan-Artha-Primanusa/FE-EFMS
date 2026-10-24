import React, { useState, useEffect } from "react";
import { Scale, X, Check, Loader2 } from "lucide-react";
import { MonthPickerInput, RupiahInput, formatIDR } from "../helpers";

interface SBSPenaltyModalProps {
  isOpen: boolean;
  editItem?: any;
  onClose: () => void;
  onSave: (item: any) => Promise<void> | void;
}

export const SBSPenaltyModal: React.FC<SBSPenaltyModalProps> = ({
  isOpen,
  editItem,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<{
    id?: number;
    workPeriod: string;
    claimRefNo: string;
    description: string;
    claimAmount: number;
    deductedAmount: number;
    status: "Pending Cut" | "Deducted";
    notes: string;
  }>({
    workPeriod: "Mar-26",
    claimRefNo: "",
    description: "",
    claimAmount: 0,
    deductedAmount: 0,
    status: "Pending Cut",
    notes: "",
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editItem) {
      setFormData({
        id: editItem.id,
        workPeriod: editItem.workPeriod || "Mar-26",
        claimRefNo: editItem.claimRefNo || "",
        description: editItem.description || "",
        claimAmount: Number(editItem.claimAmount || 0),
        deductedAmount: Number(editItem.deductedAmount || 0),
        status: editItem.status || "Pending Cut",
        notes: editItem.notes || "",
      });
    } else {
      setFormData({
        workPeriod: "Mar-26",
        claimRefNo: "",
        description: "",
        claimAmount: 0,
        deductedAmount: 0,
        status: "Pending Cut",
        notes: "",
      });
    }
  }, [editItem, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const outstanding = Math.max(0, formData.claimAmount - formData.deductedAmount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
      <div className="max-h-[90dvh] overflow-y-auto bg-white rounded-[4px] shadow-2xl border border-slate-200 w-full max-w-lg animate-in fade-in zoom-in-95 duration-150">
        {/* AAP Brand Ink Header */}
        <div className="px-6 py-4 bg-[#1A1612] text-white border-b border-amber-900/30 flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold flex items-center gap-2 text-white">
              <Scale size={18} className="text-[#A57C50]" />
              {formData.id ? "Edit Klaim Penalti PT SBS" : "Catat Klaim Penalti Baru PT SBS"}
            </h3>
            <p className="text-xs text-[#A57C50]/90 mt-0.5 font-medium">
              Klausul Denda Keterlambatan / Deviasi KPI Section P (Tanjung Enim)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-1 rounded-[3px] hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-medium text-slate-700">
          <div className="grid grid-cols-2 gap-4">
            <MonthPickerInput
              label="Periode Proyek *"
              value={formData.workPeriod}
              onChange={(val) => setFormData({ ...formData, workPeriod: val })}
              format="short"
              required
            />

            <div>
              <label className="block font-bold text-slate-700 mb-1">Status Pemotongan *</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-[3px] bg-white font-bold focus:ring-1 focus:ring-[#A57C50] focus:border-[#A57C50] outline-none"
              >
                <option value="Pending Cut">Pending Cut (Belum Dipotong)</option>
                <option value="Deducted">Deducted (Sudah Dipotong)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">No. Ref / BA Klaim Penalti</label>
            <input
              type="text"
              value={formData.claimRefNo}
              onChange={(e) => setFormData({ ...formData, claimRefNo: e.target.value })}
              placeholder="cth: BA-PEN-SBS/III/2026"
              className="w-full px-3 py-2 border border-slate-300 rounded-[3px] font-mono focus:ring-1 focus:ring-[#A57C50] focus:border-[#A57C50] outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Deskripsi / Klausul Denda *</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="cth: *Progress Pinalty yang belum di potong - Underperformance Pit E"
              className="w-full px-3 py-2 border border-slate-300 rounded-[3px] focus:ring-1 focus:ring-[#A57C50] focus:border-[#A57C50] outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <RupiahInput
              label="Nilai Klaim Denda (Rp) *"
              value={formData.claimAmount}
              onChange={(val) => setFormData({ ...formData, claimAmount: val })}
              placeholder="0"
              required
            />

            <RupiahInput
              label="Sudah Dipotong (Rp)"
              value={formData.deductedAmount}
              onChange={(val) => setFormData({ ...formData, deductedAmount: val })}
              placeholder="0"
            />
          </div>

          <div className="p-3 bg-amber-50/70 rounded-[3px] border border-amber-200/80 flex items-center justify-between">
            <span className="font-bold text-amber-950">Sisa Denda (Outstanding):</span>
            <span className="font-mono font-black text-sm text-amber-950">
              {formatIDR(outstanding)}
            </span>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Catatan Tambahan</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Catatan memo persetujuan / mitigasi komersial..."
              className="w-full px-3 py-2 border border-slate-300 rounded-[3px] focus:ring-1 focus:ring-[#A57C50] focus:border-[#A57C50] outline-none resize-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-[3px] transition cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-[#A57C50] hover:bg-[#8e6941] text-white font-extrabold rounded-[3px] shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>{formData.id ? "Simpan Perubahan" : "Simpan Klaim Penalti"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
