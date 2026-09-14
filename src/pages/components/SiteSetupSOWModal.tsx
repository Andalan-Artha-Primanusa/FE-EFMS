import React, { useState } from "react";
import { Layers, X, Loader2, Check } from "lucide-react";
import { SOWItem } from "../SiteSetupPage";

interface SiteSetupSOWModalProps {
  isOpen: boolean;
  editingSOW: Partial<SOWItem> | null;
  activeSite: string;
  onClose: () => void;
  onSave: (sow: Partial<SOWItem>) => Promise<void>;
}

export const SiteSetupSOWModal: React.FC<SiteSetupSOWModalProps> = ({
  isOpen,
  editingSOW,
  activeSite,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Partial<SOWItem>>(editingSOW || {});
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (editingSOW) {
      setFormData({ ...editingSOW });
    }
  }, [editingSOW, isOpen]);

  if (!isOpen || !editingSOW) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-[4px] border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150">
        {/* AAP Brand Ink Header */}
        <div className="px-6 py-4 bg-[#1A1612] text-white border-b border-amber-900/30 flex justify-between items-center">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Layers className="text-[#A57C50]" size={18} />
              {formData.id ? "Edit Material SOW" : "Tambah Material SOW Baru"} ({activeSite})
            </h3>
            <p className="text-xs text-[#A57C50]/90 mt-0.5 font-medium">
              Konfigurasi Master Tarif Scope of Work & Multi-Tier Site
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-[3px] cursor-pointer disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
              Kategori Pekerjaan <span className="text-rose-600">*</span>
            </label>
            <select
              className="w-full bg-white border border-slate-300 rounded-[3px] p-2.5 text-slate-900 font-bold focus:ring-1 focus:ring-[#A57C50] focus:border-[#A57C50] outline-none"
              value={formData.category || "General"}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="Operating & Mining">Operating & Mining</option>
              <option value="Mining">Mining</option>
              <option value="MDO">Mine Development (MDO)</option>
              <option value="Over Distance">Over Distance / Jarak Tambahan</option>
              <option value="General">General Penunjang</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
              Nama Material / Pekerjaan <span className="text-rose-600">*</span>
            </label>
            <input
              className="w-full bg-white border border-slate-300 rounded-[3px] p-2.5 text-slate-900 font-bold focus:ring-1 focus:ring-[#A57C50] focus:border-[#A57C50] outline-none"
              placeholder="Contoh: Overburden Removal / Top Soil"
              value={formData.itemName || ""}
              onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                Satuan Volume <span className="text-rose-600">*</span>
              </label>
              <select
                className="w-full bg-white border border-slate-300 rounded-[3px] p-2.5 text-slate-900 font-bold focus:ring-1 focus:ring-[#A57C50] focus:border-[#A57C50] outline-none"
                value={formData.unit || "BCM"}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              >
                <option value="BCM">BCM</option>
                <option value="Ton">Ton</option>
                <option value="LCM">LCM</option>
                <option value="WMT">WMT</option>
                <option value="Bcm.Hm">Bcm.Hm</option>
                <option value="Meter">Meter</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                Tarif Baseline (Rp) <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                className="w-full bg-white border border-slate-300 rounded-[3px] p-2.5 text-slate-900 font-mono font-bold focus:ring-1 focus:ring-[#A57C50] focus:border-[#A57C50] outline-none"
                value={formData.rateIDR || 0}
                onChange={(e) => setFormData({ ...formData, rateIDR: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          {activeSite === "BGG" && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-[3px] space-y-2">
              <span className="text-[10px] font-black uppercase text-emerald-950 block">
                Tarif Multi-Tier Batubara (Opsional untuk BGG)
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] text-slate-500 font-bold">Tier 1 (≤$45)</label>
                  <input
                    type="number"
                    className="w-full bg-white border border-emerald-300 rounded-[3px] p-1.5 text-xs font-mono focus:ring-1 focus:ring-emerald-500 outline-none"
                    value={formData.tier1Rate || 0}
                    onChange={(e) => setFormData({ ...formData, tier1Rate: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-500 font-bold">Tier 2 ($45-$70)</label>
                  <input
                    type="number"
                    className="w-full bg-white border border-emerald-300 rounded-[3px] p-1.5 text-xs font-mono focus:ring-1 focus:ring-emerald-500 outline-none"
                    value={formData.tier2Rate || 0}
                    onChange={(e) => setFormData({ ...formData, tier2Rate: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-500 font-bold">Tier 3 (&gt;$70)</label>
                  <input
                    type="number"
                    className="w-full bg-white border border-emerald-300 rounded-[3px] p-1.5 text-xs font-mono focus:ring-1 focus:ring-emerald-500 outline-none"
                    value={formData.tier3Rate || 0}
                    onChange={(e) => setFormData({ ...formData, tier3Rate: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-[3px] text-xs cursor-pointer transition disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-1.5 bg-[#A57C50] hover:bg-[#8e6941] text-white font-extrabold rounded-[3px] text-xs shadow-xs cursor-pointer transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Simpan Material</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
