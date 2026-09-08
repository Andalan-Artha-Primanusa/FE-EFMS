import React from "react";
import { Layers, Calculator, UserCheck, DollarSign, CheckCircle2 } from "lucide-react";
import { MonthPickerInput, formatThousand, formatIDR } from "../helpers";

interface BATrackerHeaderFormProps {
  activeBAStep: number;
  setActiveBAStep: (step: number) => void;
  isInlineEditingBA: boolean;
  formData: any;
  setFormData: (data: any) => void;
  baOperatingItems: any[];
  setBaOperatingItems: React.Dispatch<React.SetStateAction<any[]>>;
  baMDOItems: any[];
  setBaMDOItems: React.Dispatch<React.SetStateAction<any[]>>;
  baDeductionItems: any[];
  setBaDeductionItems: React.Dispatch<React.SetStateAction<any[]>>;
  latestKursBI: number;
  user: any;
  rfIndexCalculated?: number;
  coalIndexMaster?: any[];
  fuelPriceUSD?: number;
  laborPriceIDR?: number;
  defaultPOSBAOperatingItems: any[];
  defaultPOSBAMDOItems: any[];
  defaultDBKBAItems: any[];
  defaultPTROBAItems?: any[];
  defaultBGGBAItems?: any[];
  defaultSBSBAOperatingItems: any[];
  defaultSBSBAMDOItems: any[];
  defaultSBSBADeductionItems: any[];
  raiseFallMaster?: any;
  getBGGActiveCoalTier?: (period?: string) => string;
}

export function BATrackerHeaderForm({
  activeBAStep,
  setActiveBAStep,
  isInlineEditingBA,
  formData,
  setFormData,
  setBaOperatingItems,
  setBaMDOItems,
  setBaDeductionItems,
  latestKursBI,
  user,
  rfIndexCalculated = 1.560,
  coalIndexMaster = [],
  fuelPriceUSD = 1.15,
  laborPriceIDR = 29500,
  defaultPOSBAOperatingItems = [],
  defaultPOSBAMDOItems = [],
  defaultDBKBAItems = [],
  defaultPTROBAItems = [],
  defaultBGGBAItems = [],
  defaultSBSBAOperatingItems = [],
  defaultSBSBAMDOItems = [],
  defaultSBSBADeductionItems = [],
  raiseFallMaster,
  getBGGActiveCoalTier,
}: BATrackerHeaderFormProps) {
  const isCustomerDBK = formData.customerCode === "PTRO" || formData.customerCode === "DBK";
  const isCustomerSBS = formData.customerCode === "SBS";

  return (
    <div className="space-y-3">
      {/* Stepper Navigation Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-[4px] border border-slate-200 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveBAStep(1)}
          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-[3px] transition cursor-pointer ${activeBAStep === 1 ? "bg-[#A57C50] text-white shadow-xs font-extrabold" : "text-slate-600 hover:bg-slate-200"}`}
        >
          <Layers size={13} />
          <span>1. SOW Operasi & Volume</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveBAStep(2)}
          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-[3px] transition cursor-pointer ${activeBAStep === 2 ? "bg-[#A57C50] text-white shadow-xs font-extrabold" : "text-slate-600 hover:bg-slate-200"}`}
        >
          <Calculator size={13} />
          <span>2. Survey & Delta BA</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveBAStep(3)}
          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-[3px] transition cursor-pointer ${activeBAStep === 3 ? "bg-[#A57C50] text-white shadow-xs font-extrabold" : "text-slate-600 hover:bg-slate-200"}`}
        >
          <UserCheck size={13} />
          <span>3. Tanda Tangan & Final</span>
        </button>
      </div>

      {/* Header Info Strip: Customer, Periode, PIC */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-[4px]">
        {isInlineEditingBA ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                Customer / Project <span className="text-rose-600">*</span>
              </label>
              <select
                className="w-full bg-white border border-slate-300 rounded-[3px] p-2 text-slate-900 font-bold focus:border-[#A57C50] outline-none"
                value={formData.customerCode || ""}
                onChange={(e) => {
                  const code = e.target.value;
                  const isBGG = code === "BGG" || code === "PT BGG";
                  const isPTRO = code === "PTRO" || code === "PT Petrosea";
                  const isDBK = code === "DBK";
                  const isSBS = code === "SBS";
                  const currentPeriod = formData.workPeriod || "Agustus 2026";
                  setFormData({ ...formData, customerCode: code });
                  if (isBGG) {
                    const bggRows = (defaultBGGBAItems && defaultBGGBAItems.length > 0) ? defaultBGGBAItems : [
                      { id: `bgg_ob1_${Date.now()}`, category: "Operating & Mining", area: "", material: "OVER BURDEN REMOVAL 1 (75%)", period: currentPeriod, notes: "", keterangan: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 29500, subtotalInitial: 0, subtotalAdjusted: 0 },
                      { id: `bgg_ob2_${Date.now() + 1}`, category: "Operating & Mining", area: "", material: "OVER BURDEN REMOVAL 2 (25%)", period: currentPeriod, notes: "", keterangan: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 28750, subtotalInitial: 0, subtotalAdjusted: 0 },
                      { id: `bgg_cw_${Date.now() + 2}`, category: "Operating & Mining", area: "", material: "Coal Winning", period: currentPeriod, notes: "", keterangan: "", unit: "Ton", initialVolume: 0, adjustedVolume: 0, rate: 17500, subtotalInitial: 0, subtotalAdjusted: 0 },
                      { id: `bgg_od_ob_${Date.now() + 3}`, category: "Over Distance", area: "", material: "Over Distance For OB Removal", period: currentPeriod, notes: "", keterangan: "", unit: "BCM", distanceBasis: 1000, distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 1550, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 },
                      { id: `bgg_od_cw_${Date.now() + 4}`, category: "Over Distance", area: "", material: "Over Distance For Coal Winning", period: currentPeriod, notes: "", keterangan: "", unit: "Ton", distanceBasis: 1000, distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 19700, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 }
                    ];
                    setBaOperatingItems((bggRows || []).map((it: any) => ({ ...it, initialVolume: 0, adjustedVolume: 0, subtotalInitial: 0, subtotalAdjusted: 0, period: currentPeriod, notes: "", keterangan: "" })));
                    setBaMDOItems([]);
                    setBaDeductionItems([]);
                  } else if (isPTRO || isDBK) {
                    const ptroRows = (defaultPTROBAItems && defaultPTROBAItems.length > 0) ? defaultPTROBAItems : defaultDBKBAItems;
                    setBaOperatingItems((ptroRows || []).map((it: any) => ({ ...it, initialVolume: 0, adjustedVolume: 0, subtotalInitial: 0, subtotalAdjusted: 0, period: currentPeriod, notes: "", keterangan: "" })));
                    setBaMDOItems([]);
                    setBaDeductionItems([]);
                  } else if (isSBS) {
                    setBaOperatingItems((defaultSBSBAOperatingItems || []).map((it: any) => ({ ...it, distance: 0, distanceWeightAvg: 0, rate: 0, initialVolume: 0, adjustedVolume: 0, subtotalInitial: 0, subtotalAdjusted: 0, period: currentPeriod, notes: "", keterangan: "" })));
                    setBaMDOItems((defaultSBSBAMDOItems || []).map((it: any) => ({ ...it, initialVolume: 0, adjustedVolume: 0, subtotalInitial: 0, subtotalAdjusted: 0, period: currentPeriod, notes: "", keterangan: "" })));
                    setBaDeductionItems((defaultSBSBADeductionItems || []).map((it: any) => ({ ...it, initialVolume: 1, adjustedVolume: 1, rate: 0, subtotalInitial: 0, subtotalAdjusted: 0, period: currentPeriod, notes: "", keterangan: "", material: it.material === "Denda ketidakcapaian Volume" ? `Denda ketidakcapaian Volume ${currentPeriod}` : it.material })));
                  } else {
                    setBaOperatingItems(defaultPOSBAOperatingItems.map(it => ({ ...it, area: "", initialVolume: 0, adjustedVolume: 0, subtotalInitial: 0, subtotalAdjusted: 0, period: currentPeriod, notes: "", keterangan: "" })));
                    setBaMDOItems(defaultPOSBAMDOItems.map(it => ({ ...it, area: "", initialVolume: 0, adjustedVolume: 0, subtotalInitial: 0, subtotalAdjusted: 0, period: currentPeriod, notes: "", keterangan: "" })));
                    setBaDeductionItems([]);
                  }
                }}
              >
                <option value="POS">POS – PT Position</option>
                <option value="IBP">IBP – PT Indo Bhumi Pasifik</option>
                <option value="BBA">BBA – PT Bara Batubara Aditama</option>
                <option value="SBS">SBS – PT Satria Bahana Sarana</option>
                <option value="BGG">BGG – PT Budi Gema Gempita</option>
                <option value="PTRO">PTRO – PT Petrosea</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                Periode Pekerjaan <span className="text-rose-600">*</span>
              </label>
              <MonthPickerInput
                value={formData.workPeriod || ""}
                onChange={(val) => {
                  setFormData({ ...formData, workPeriod: val });
                  setBaOperatingItems(prev => prev.map(it => ({ ...it, period: val })));
                  setBaMDOItems(prev => prev.map(it => ({ ...it, period: val })));
                  setBaDeductionItems(prev => (prev || []).map(it => ({ ...it, period: val, material: (it.material || "").startsWith("Denda ketidakcapaian Volume") ? `Denda ketidakcapaian Volume ${val}` : it.material })));
                }}
                format="long"
                className="w-full bg-white border border-slate-300 rounded-[3px] p-2 text-slate-900 text-xs focus:border-[#A57C50] outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                PIC Site AAP
              </label>
              <input
                className="w-full bg-white border border-slate-300 rounded-[3px] p-2 text-slate-900 text-xs focus:border-[#A57C50] outline-none font-bold"
                placeholder="Operations / Site Engineer"
                value={formData.picAAP !== undefined ? formData.picAAP : (user?.name || "Operations / Site Engineer")}
                onChange={(e) => setFormData({ ...formData, picAAP: e.target.value })}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-slate-800">
            <div><span className="text-slate-500 block font-bold text-[10px] uppercase">Customer</span> <strong className="text-slate-900 font-bold">{formData.customerCode || ""}</strong></div>
            <div><span className="text-slate-500 block font-bold text-[10px] uppercase">Periode</span> <strong className="text-slate-800">{formData.workPeriod || "-"}</strong></div>
            <div><span className="text-slate-500 block font-bold text-[10px] uppercase">PIC Site</span> <strong className="text-slate-800">{formData.picAAP || "-"}</strong></div>
          </div>
        )}
      </div>

      {/* Commercial Engine Status Badges */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        {(formData.customerCode === "POS" || formData.customerCode === "IBP" || formData.customerCode === "BBA" || !formData.customerCode || isCustomerDBK) && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#A57C50]/10 border border-[#A57C50]/30 rounded-[3px] text-[#A57C50] font-bold">
            <DollarSign size={13} className="text-[#A57C50]" />
            <span>Kurs BI M-Rate: <strong>Rp {formatThousand(latestKursBI || 17923.30)} / USD</strong> (Live Pricing Engine Sync)</span>
          </div>
        )}
        {(formData.customerCode === "BGG" || formData.customerCode === "PT BGG") && (() => {
          const bggTier = getBGGActiveCoalTier ? getBGGActiveCoalTier(formData.workPeriod) : "Tier 3";
          const fn = Number(raiseFallMaster?.actualFuelFn ?? fuelPriceUSD ?? 21601.53);
          const fo = Number(raiseFallMaster?.baseFuelFo ?? 13847.13);
          const fuelDisplay = fn > 100 ? `${formatIDR(fn)} / ${formatIDR(fo)}` : `$${fn.toFixed(2)} / $${fo.toFixed(2)}`;
          return (
            <>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-300 rounded-[3px] text-amber-950 font-bold">
                <span className="text-xs">📈</span>
                <span>R&F Eskalasi Index: <strong>{(rfIndexCalculated || 1.560).toFixed(3)}x (+{(((rfIndexCalculated || 1.560) - 1.0) * 100).toFixed(1)}%)</strong></span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-300 rounded-[3px] text-slate-800 font-bold">
                <span className="text-xs">⛽</span>
                <span>Fuel Price (Fn/Fo): <strong>{fuelDisplay}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-300 rounded-[3px] text-blue-950 font-bold">
                <span className="text-xs">⛏️</span>
                <span>Coal Index HBA: <strong>{bggTier}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-300 rounded-[3px] text-rose-950 font-bold">
                <span className="text-xs">✂️</span>
                <span>Potongan Kontrak: <strong>25% Overdistance</strong></span>
              </div>
            </>
          );
        })()}
        {isCustomerSBS && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-300 rounded-[3px] text-emerald-950 font-bold">
            <CheckCircle2 size={13} className="text-emerald-700" />
            <span>Komersial SBS: <strong>8 OB Disposal + 7 Rental Alat + 4 Pengurang Biaya (IDR Tetap)</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}
