import React from "react";
import { Scale, Info } from "lucide-react";
import { formatIDR, formatMonthInput, formatMonthLabel, RupiahInput, VolumeInput } from "../helpers";

interface PendingVolumeRecordModalProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function PendingVolumeRecordModal({ formData, setFormData }: PendingVolumeRecordModalProps) {
  return (
    <div className="space-y-4 text-xs">
      <div className="p-4 bg-[#1A1612] text-white border border-amber-900/30 rounded-[4px] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-2xs">
        <div>
          <h4 className="text-xs font-black uppercase text-amber-200 tracking-wider flex items-center gap-2">
            <Scale size={16} className="text-[#A57C50]" /> Pencatatan Pending Volume (Over Kontrak / Stripping Ratio)
          </h4>
          <p className="text-[11px] text-amber-100/70 font-medium mt-0.5">
            Pencatatan pengerjaan material Top Soil & Overburden (OB) yang melebihi batas rasio kontrak terhadap Coal. Selisih volume di-pending untuk masuk penagihan invoice berikutnya.
          </p>
        </div>
        <span className="px-3 py-1 rounded-[3px] bg-[#A57C50]/20 border border-[#A57C50]/40 text-amber-200 font-extrabold text-[11px] shrink-0 font-mono">
          Carry Over Invoice
        </span>
      </div>

      {/* Info Box Rasio Kontrak Customer */}
      <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-[4px] text-[11px] space-y-1.5">
        <div className="font-extrabold text-amber-950 uppercase flex items-center gap-1.5">
          <Info size={13} className="text-[#A57C50]" /> Kesepakatan Rasio Kontrak ({formData.customerCode || ""}):
        </div>
        <div className="text-slate-700 font-medium pl-4">
          {formData.customerCode === "BGG" ? (
            <span>
              Kontrak BGG: Perbandingan Top Soil & Overburden adalah maksimal <strong>3.0 BCM / 1 Ton Coal (3 : 1)</strong>. Kelebihan volume pengerjaan di-pending ke invoice selanjutnya.
            </span>
          ) : formData.customerCode === "PTRO" || formData.customerCode === "DBK" ? (
            <span>
              Kontrak PTRO (PT Petrosea): Perbandingan Overburden maksimal <strong>3.5 BCM / 1 Ton Coal</strong>.
            </span>
          ) : formData.customerCode === "POS" ? (
            <span>
              Kontrak POS (PT Position): Perbandingan Waste/OB & Top Soil maksimal <strong>4.0 BCM / 1 Ton Ore</strong>.
            </span>
          ) : formData.customerCode === "SBS" ? (
            <span>
              Kontrak SBS: Penagihan berbasis 8 titik Overburden per Disposal & Jasa Alat Berat Jam-Mesin.
            </span>
          ) : (
            <span>
              Kontrak Standar: Rasio Top Soil & OB maksimal <strong>3.0 BCM / 1 Ton Coal (3 : 1)</strong>.
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Customer Code <span className="text-rose-600">*</span>
          </label>
          <select
            className="w-full bg-white border border-slate-300 rounded-[3px] p-2.5 text-slate-900 font-bold focus:border-[#A57C50] outline-none text-xs"
            value={formData.customerCode || "BGG"}
            onChange={(e) => {
              const code = e.target.value;
              const r1 = code === "SBS" ? 27250 : 7467;
              const r2 = code === "SBS" ? 26500 : 7261;
              const v = Number(formData.originalOBVolume || 0);
              setFormData({
                ...formData,
                customerCode: code,
                ob1Rate: r1,
                ob2Rate: r2,
                workAmount: Math.round(v * (r1 * 0.75 + r2 * 0.25))
              });
            }}
            required
          >
            <option value="BGG">BGG - PT Budi Gema Gempita (Quota SR 3:1)</option>
            <option value="SBS">SBS - PT Satria Bahana Sarana</option>
            <option value="PTRO">PTRO - PT Petrosea</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Periode Asal <span className="text-rose-600">*</span>
          </label>
          <input
            type="month"
            className="w-full bg-white border border-slate-300 rounded-[3px] p-2.5 text-slate-900 font-bold focus:border-[#A57C50] outline-none text-xs"
            value={formatMonthInput(formData.workPeriod || formData.sourcePeriod || "Agustus 2026")}
            onChange={(e) => {
              const mVal = e.target.value;
              const formattedLabel = formatMonthLabel(mVal);
              setFormData({ ...formData, workPeriod: formattedLabel, sourcePeriod: formattedLabel });
            }}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Ref. Nomor BA (Opsional)
          </label>
          <input
            className="w-full bg-white border border-slate-300 rounded-[3px] p-2.5 text-slate-900 focus:border-[#A57C50] outline-none text-xs font-mono"
            placeholder="Contoh: 20/BAP-AAP-KKLII/26"
            value={formData.sourceBARef || ""}
            onChange={(e) => setFormData({ ...formData, sourceBARef: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <VolumeInput
            label="Volume Saldo Pending"
            unit="BCM"
            required
            value={formData.originalOBVolume || 0}
            onChange={(v: number) => {
              const r1 = Number(formData.ob1Rate || (formData.customerCode === "SBS" ? 27250 : 7467));
              const r2 = Number(formData.ob2Rate || (formData.customerCode === "SBS" ? 26500 : 7261));
              setFormData({
                ...formData,
                originalOBVolume: v,
                remainingVolume: v,
                workAmount: Math.round(v * (r1 * 0.75 + r2 * 0.25))
              });
            }}
          />
        </div>

        <div>
          <RupiahInput
            label="Tarif OB1 75% (Rp)"
            value={formData.ob1Rate || (formData.customerCode === "SBS" ? 27250 : 7467)}
            onChange={(r1: number) => {
              const r2 = Number(formData.ob2Rate || 7261);
              const v = Number(formData.originalOBVolume || 0);
              setFormData({ ...formData, ob1Rate: r1, workAmount: Math.round(v * (r1 * 0.75 + r2 * 0.25)) });
            }}
          />
        </div>

        <div>
          <RupiahInput
            label="Tarif OB2 25% (Rp)"
            value={formData.ob2Rate || (formData.customerCode === "SBS" ? 26500 : 7261)}
            onChange={(r2: number) => {
              const r1 = Number(formData.ob1Rate || 7467);
              const v = Number(formData.originalOBVolume || 0);
              setFormData({ ...formData, ob2Rate: r2, workAmount: Math.round(v * (r1 * 0.75 + r2 * 0.25)) });
            }}
          />
        </div>
      </div>

      <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 block">
            Estimasi Nilai Nominal Tertunda (Auto-calculated):
          </span>
          <strong className="text-sm font-mono font-black text-emerald-800">
            {formatIDR(formData.workAmount || Math.round((Number(formData.originalOBVolume) || 0) * ((Number(formData.ob1Rate) || 7467) * 0.75 + (Number(formData.ob2Rate) || 7261) * 0.25)))}
          </strong>
        </div>
        <span className="text-[10px] text-slate-500 font-medium">
          Formula: Vol × (75% × OB1 + 25% × OB2)
        </span>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
          Catatan / Keterangan Pending Volume (Selisih Stripping Ratio)
        </label>
        <textarea
          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 text-xs focus:border-cyan-700 focus:bg-white outline-none"
          rows={2}
          placeholder="Contoh: Pending volume selisih Top Soil & Overburden over-contract ratio (3:1)..."
          value={formData.notes || ""}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        />
      </div>
    </div>
  );
}
