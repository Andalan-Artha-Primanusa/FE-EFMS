import { formatIDR, formatMonthInput, formatMonthLabel, RupiahInput, VolumeInput } from "../helpers";
import { masterRegistry, obSplitSOWs, sowTierRate, coalTierFor } from "../masterRegistry";

// Unit rate OVER BURDEN REMOVAL 1 & 2 dari Master Variable SOW sesuai tier Coal Index periode.
export const masterOBRates = (code: string, period?: string) => {
  const [a, b] = obSplitSOWs(code);
  const tier = coalTierFor(period);
  return { r1: sowTierRate(a, tier), r2: sowTierRate(b, tier) };
};
export const pendingAmount = (vol: number, r1: number, r2: number, code: string) => {
  const [a, b] = obSplitSOWs(code);
  return Math.round(vol * (r1 * Number(a?.splitPercentage || 0) + r2 * Number(b?.splitPercentage || 0)) / 100);
};

interface PendingVolumeRecordModalProps {
  formData: any;
  setFormData: (data: any) => void;
}

const inputCls = "w-full bg-white border border-slate-300 rounded-[3px] p-2.5 text-slate-900 font-bold focus:border-[#A57C50] outline-none text-xs";
const labelCls = "block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1";

// Catatan pending volume: input manual, tidak terhubung ke BA Tracker maupun invoice.
export function PendingVolumeRecordModal({ formData, setFormData }: PendingVolumeRecordModalProps) {
  const [sow1, sow2] = obSplitSOWs(formData.customerCode);
  const vol = Number(formData.originalOBVolume || 0);
  const r1 = Number(formData.ob1Rate || 0);
  const r2 = Number(formData.ob2Rate || 0);
  return (
    <div className="space-y-4 text-xs">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Customer <span className="text-rose-600">*</span></label>
          <select
            className={inputCls}
            value={formData.customerCode || ""}
            onChange={(e) => {
              const rates = masterOBRates(e.target.value, formData.sourcePeriod);
              setFormData({ ...formData, customerCode: e.target.value, ob1Rate: rates.r1, ob2Rate: rates.r2 });
            }}
            required
          >
            <option value="" disabled>— Pilih customer —</option>
            {masterRegistry.customers.filter((c: any) => c.pendingVolumeEligible).map((c: any) => (
              <option key={c.code} value={c.code}>{c.code} - {c.fullName}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Period <span className="text-rose-600">*</span></label>
          <input
            type="month"
            className={inputCls}
            value={formatMonthInput(formData.sourcePeriod || "")}
            onChange={(e) => {
              const sourcePeriod = formatMonthLabel(e.target.value);
              const rates = masterOBRates(formData.customerCode, sourcePeriod);
              setFormData({ ...formData, sourcePeriod, ob1Rate: rates.r1, ob2Rate: rates.r2 });
            }}
            required
          />
        </div>

        <div>
          <label className={labelCls}>Ref. BA</label>
          <input
            className={`${inputCls} font-mono font-normal`}
            value={formData.sourceBARef || ""}
            onChange={(e) => setFormData({ ...formData, sourceBARef: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <VolumeInput
          label="Claimed Volume"
          unit="Bcm"
          required
          value={vol}
          onChange={(v: number) => setFormData({ ...formData, originalOBVolume: v })}
        />
        <RupiahInput
          label={`Unit Rate ${sow1?.itemName || "OVER BURDEN REMOVAL 1"} (IDR)`}
          value={r1}
          onChange={(v: number) => setFormData({ ...formData, ob1Rate: v })}
        />
        <RupiahInput
          label={`Unit Rate ${sow2?.itemName || "OVER BURDEN REMOVAL 2"} (IDR)`}
          value={r2}
          onChange={(v: number) => setFormData({ ...formData, ob2Rate: v })}
        />
      </div>

      <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-[4px] flex items-center justify-between">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900">Amount (IDR)</span>
        <strong className="text-sm font-mono font-black text-emerald-800">{formatIDR(pendingAmount(vol, r1, r2, formData.customerCode))}</strong>
      </div>

      <div>
        <label className={labelCls}>Keterangan</label>
        <textarea
          className="w-full bg-slate-50 border border-slate-300 rounded-[3px] p-2.5 text-slate-900 text-xs focus:border-[#A57C50] focus:bg-white outline-none"
          rows={2}
          value={formData.notes || ""}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        />
      </div>
    </div>
  );
}
