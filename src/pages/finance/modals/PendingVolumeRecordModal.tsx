import React from "react";
import { Scale, Info } from "lucide-react";
import { formatIDR, formatMonthInput, formatMonthLabel, RupiahInput, VolumeInput } from "../helpers";
import { masterRegistry, obSplitSOWs, contractParams } from "../masterRegistry";

// Tarif & porsi split OB pending dari Master Variable SOW customer.
const masterOBRates = (code: string) => {
  const [a, b] = obSplitSOWs(code);
  return { r1: Number(a?.rateIDR || a?.tier2Rate || 0), r2: Number(b?.rateIDR || b?.tier2Rate || 0) };
};
export const pendingAmount = (vol: number, r1: number, r2: number, code: string) => {
  const [a, b] = obSplitSOWs(code);
  return Math.round(vol * (r1 * Number(a?.splitPercentage || 0) + r2 * Number(b?.splitPercentage || 0)) / 100);
};

interface PendingVolumeRecordModalProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function PendingVolumeRecordModal({ formData, setFormData }: PendingVolumeRecordModalProps) {
  const [sow1, sow2] = obSplitSOWs(formData.customerCode);
  const pct1 = Number(sow1?.splitPercentage || 0);
  const pct2 = Number(sow2?.splitPercentage || 0);
  const absorbed = Number(formData.absorbedVolume || 0);
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
          {contractParams(formData.customerCode).maxStrippingRatio > 0 ? (
            <span>
              Perbandingan Top Soil & Overburden maksimal <strong>{contractParams(formData.customerCode).maxStrippingRatio} BCM / 1 Ton ({contractParams(formData.customerCode).maxStrippingRatio} : 1)</strong>. Kelebihan volume pengerjaan di-pending ke invoice selanjutnya.
            </span>
          ) : (
            <span>Kuota Stripping Ratio belum diatur di Master Customer (Client Setup).</span>
          )}
        </div>
        {absorbed > 0 && (
          <div className="text-rose-800 font-bold pl-4">
            Sudah ditagih {absorbed.toLocaleString("id-ID", { minimumFractionDigits: 2 })} BCM: customer terkunci dan volume saldo minimal sebesar itu.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Customer Code <span className="text-rose-600">*</span>
          </label>
          <select
            className="w-full bg-white border border-slate-300 rounded-[3px] p-2.5 text-slate-900 font-bold focus:border-[#A57C50] outline-none text-xs"
            value={formData.customerCode || ""}
            onChange={(e) => {
              const code = e.target.value;
              const { r1, r2 } = masterOBRates(code);
              const v = Number(formData.originalOBVolume || 0);
              setFormData({
                ...formData,
                customerCode: code,
                ob1Rate: r1,
                ob2Rate: r2,
                workAmount: pendingAmount(v, r1, r2, code)
              });
            }}
            required
            disabled={absorbed > 0}
          >
            <option value="" disabled>— Pilih customer (Master Customer) —</option>
            {masterRegistry.customers.filter((c: any) => c.pendingVolumeEligible || contractParams(c.code).maxStrippingRatio > 0).map((c: any) => (
              <option key={c.code} value={c.code}>
                {c.code} - {c.fullName}{contractParams(c.code).maxStrippingRatio > 0 ? ` (Quota SR ${contractParams(c.code).maxStrippingRatio}:1)` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Periode Asal <span className="text-rose-600">*</span>
          </label>
          <input
            type="month"
            className="w-full bg-white border border-slate-300 rounded-[3px] p-2.5 text-slate-900 font-bold focus:border-[#A57C50] outline-none text-xs"
            value={formatMonthInput(formData.workPeriod || formData.sourcePeriod || "")}
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
              const r1 = Number(formData.ob1Rate || 0);
              const r2 = Number(formData.ob2Rate || 0);
              setFormData({
                ...formData,
                originalOBVolume: v,
                workAmount: pendingAmount(v, r1, r2, formData.customerCode)
              });
            }}
          />
        </div>

        <div>
          <RupiahInput
            label={`Tarif OB1 ${pct1}% (Rp)`}
            value={formData.ob1Rate || 0}
            onChange={(r1: number) => {
              const r2 = Number(formData.ob2Rate || 0);
              const v = Number(formData.originalOBVolume || 0);
              setFormData({ ...formData, ob1Rate: r1, workAmount: pendingAmount(v, r1, r2, formData.customerCode) });
            }}
          />
        </div>

        <div>
          <RupiahInput
            label={`Tarif OB2 ${pct2}% (Rp)`}
            value={formData.ob2Rate || 0}
            onChange={(r2: number) => {
              const r1 = Number(formData.ob1Rate || 0);
              const v = Number(formData.originalOBVolume || 0);
              setFormData({ ...formData, ob2Rate: r2, workAmount: pendingAmount(v, r1, r2, formData.customerCode) });
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
            {formatIDR(formData.workAmount || pendingAmount(Number(formData.originalOBVolume) || 0, Number(formData.ob1Rate) || 0, Number(formData.ob2Rate) || 0, formData.customerCode))}
          </strong>
        </div>
        <span className="text-[10px] text-slate-500 font-medium">
          Formula: Vol × ({pct1}% × OB1 + {pct2}% × OB2)
        </span>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
          Catatan / Keterangan Pending Volume (Selisih Stripping Ratio)
        </label>
        <textarea
          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 text-xs focus:border-cyan-700 focus:bg-white outline-none"
          rows={2}
          placeholder="Contoh: Pending volume selisih Top Soil & Overburden over-contract ratio..."
          value={formData.notes || ""}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        />
      </div>
    </div>
  );
}
