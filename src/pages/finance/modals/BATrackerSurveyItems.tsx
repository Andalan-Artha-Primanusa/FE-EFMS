import React from "react";
import { ArrowRight, Calculator, Sparkles, TrendingUp } from "lucide-react";
import { formatIDR } from "../helpers";
import { BAOperatingTable } from "./BAOperatingTable";
import { BAMDOTable } from "./BAMDOTable";
import { BADeductionTable } from "./BADeductionTable";
import { calculateBACommercialBreakdown } from "../ba_calculations";

interface BATrackerSurveyItemsProps {
  formData: any;
  baOperatingItems: any[];
  setBaOperatingItems: React.Dispatch<React.SetStateAction<any[]>>;
  baMDOItems: any[];
  setBaMDOItems: React.Dispatch<React.SetStateAction<any[]>>;
  baDeductionItems: any[];
  setBaDeductionItems: React.Dispatch<React.SetStateAction<any[]>>;
  isInlineEditingBA: boolean;
  activeSOWCatalog: any[];
  mRate: number;
  allBAItems: any[];
  isDistanceItem: (item: any) => boolean;
  getBAEffectiveVolume: (item: any, allItems: any[], isSurvey: boolean) => number;
  getBAItemSubtotal: (item: any, volume: number) => number;
  sumInitial: number;
  setActiveBAStep: (step: number) => void;
  rfIndexCalculated?: number;
  latestKursBI?: number;
  reorderBAItems?: (startIndex: number, endIndex: number, listType?: "operating" | "mdo" | "deduction") => void;
  moveBAItem?: (id: string, dir: "up" | "down", listType?: "operating" | "mdo" | "deduction") => void;
  getSowMasterRate?: (cust: string, name: string, fb: number, isUSD?: boolean, tier?: string) => number;
}

export function BATrackerSurveyItems({
  formData,
  baOperatingItems,
  setBaOperatingItems,
  baMDOItems,
  setBaMDOItems,
  baDeductionItems,
  setBaDeductionItems,
  isInlineEditingBA,
  activeSOWCatalog,
  mRate,
  allBAItems,
  isDistanceItem,
  getBAEffectiveVolume,
  getBAItemSubtotal,
  sumInitial,
  setActiveBAStep,
  rfIndexCalculated = 1.560,
  reorderBAItems,
  moveBAItem,
  getSowMasterRate,
}: BATrackerSurveyItemsProps) {
  const isCustomerDBK = formData.customerCode === "PTRO" || formData.customerCode === "DBK";
  const sumAdjusted = allBAItems.reduce((acc, it) => acc + getBAItemSubtotal(it, getBAEffectiveVolume(it, allBAItems, true)), 0);
  const breakdown = calculateBACommercialBreakdown(formData.customerCode, allBAItems, rfIndexCalculated, isCustomerDBK);
  const isBGG = formData.customerCode === "BGG" || formData.customerCode === "PT BGG";
  const isSBS = formData.customerCode === "SBS";

  return (
    <div className="space-y-4">
      {/* Tabel 1: Operating & Mining */}
      <BAOperatingTable
        formData={formData}
        baOperatingItems={baOperatingItems}
        setBaOperatingItems={setBaOperatingItems}
        baMDOItems={baMDOItems}
        setBaMDOItems={setBaMDOItems}
        baDeductionItems={baDeductionItems}
        setBaDeductionItems={setBaDeductionItems}
        isInlineEditingBA={isInlineEditingBA}
        activeSOWCatalog={activeSOWCatalog}
        mRate={mRate}
        allBAItems={allBAItems}
        isDistanceItem={isDistanceItem}
        getBAEffectiveVolume={getBAEffectiveVolume}
        getBAItemSubtotal={getBAItemSubtotal}
        reorderBAItems={reorderBAItems}
        moveBAItem={moveBAItem}
        getSowMasterRate={getSowMasterRate}
      />

      {/* Tabel 2: MDO / Support (POS & SBS) */}
      <BAMDOTable
        formData={formData}
        baMDOItems={baMDOItems}
        setBaMDOItems={setBaMDOItems}
        isInlineEditingBA={isInlineEditingBA}
        activeSOWCatalog={activeSOWCatalog}
        mRate={mRate}
      />

      {/* Tabel 3: Pengurang Biaya (SBS Only) */}
      <BADeductionTable
        formData={formData}
        baDeductionItems={baDeductionItems}
        setBaDeductionItems={setBaDeductionItems}
        isInlineEditingBA={isInlineEditingBA}
        activeSOWCatalog={activeSOWCatalog}
      />

      {/* Tabel Variabel Perhitungan Komersial BGG (Raise & Fall, Potongan OD 25%, DP Fuel) */}
      {isBGG && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-[#1A1612] flex items-center gap-1.5">
              <TrendingUp size={14} className="text-[#A57C50]" />
              Kategori 2: Variabel Perhitungan Komersial & Eskalasi Kontrak (BGG Auto-sync)
            </span>
            <span className="text-[10px] font-bold text-[#A57C50] bg-[#A57C50]/10 px-2.5 py-0.5 rounded-[3px] border border-[#A57C50]/30">
              Master Data Formula Terhubung
            </span>
          </div>

          <div className="overflow-x-auto rounded-[4px] border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 text-[10px] font-black uppercase tracking-wider border-b border-slate-200">
                  <th className="p-2 w-10 text-center">No</th>
                  <th className="p-2 min-w-[220px]">Deskripsi Formula / Parameter Kontrak</th>
                  <th className="p-2 text-center w-16">Satuan</th>
                  <th className="p-2 text-right w-24">Faktor / Rate</th>
                  <th className="p-2 text-right w-32">Nilai Subtotal (Rp)</th>
                  <th className="p-2 min-w-[160px]">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                <tr className="hover:bg-slate-50 transition">
                  <td className="p-2 text-center font-bold text-slate-500 font-sans">D</td>
                  <td className="p-2 font-sans font-bold text-[#1A1612]">
                    Eskalasi Nilai Kontrak (Raise & Fall Index: {(breakdown.rfRateFactor || 1.56).toFixed(3)}x)
                  </td>
                  <td className="p-2 text-center text-slate-700 font-sans">Lot</td>
                  <td className="p-2 text-right font-bold text-[#A57C50]">
                    +{(((breakdown.rfRateFactor || 1.56) - 1.0) * 100).toFixed(1)}%
                  </td>
                  <td className="p-2 text-right font-black text-[#A57C50]">
                    +{formatIDR(breakdown.rfAmount)}
                  </td>
                  <td className="p-2 font-sans text-[10px] text-slate-500">
                    Formula: (OB + Coal + OD) × (RF - 1.0)
                  </td>
                </tr>

                <tr className="hover:bg-slate-50 transition">
                  <td className="p-2 text-center font-bold text-slate-500 font-sans">E</td>
                  <td className="p-2 font-sans font-bold text-rose-950">
                    Potongan Kontrak Overdistance 25% (OD OB & OD Coal)
                  </td>
                  <td className="p-2 text-center text-slate-700 font-sans">Lot</td>
                  <td className="p-2 text-right font-bold text-rose-800">
                    -25.0%
                  </td>
                  <td className="p-2 text-right font-black text-rose-700">
                    -{formatIDR(breakdown.odDeduction)}
                  </td>
                  <td className="p-2 font-sans text-[10px] text-slate-500">
                    Potongan 25% atas OD Gross & R&F OD
                  </td>
                </tr>

                {breakdown.dpFuelDeduction > 0 && (
                  <tr className="hover:bg-slate-50 transition">
                    <td className="p-2 text-center font-bold text-slate-500 font-sans">F</td>
                    <td className="p-2 font-sans font-bold text-rose-950">
                      DP Fuel & Transport (Potongan Solar)
                    </td>
                    <td className="p-2 text-center text-slate-700 font-sans">Lot</td>
                    <td className="p-2 text-right font-bold text-rose-800">
                      Flat
                    </td>
                    <td className="p-2 text-right font-black text-rose-700">
                      -{formatIDR(breakdown.dpFuelDeduction)}
                    </td>
                    <td className="p-2 font-sans text-[10px] text-slate-500">
                      Potongan Uang Muka BBM Solar
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Live Commercial Breakdown & Unbilled Revenue Box */}
      <div className="bg-[#1A1612] text-white p-4 rounded-[4px] border border-amber-900/30 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-amber-900/30 pb-2.5">
          <div className="flex items-center gap-2">
            <Calculator className="text-[#A57C50]" size={16} />
            <span className="text-xs font-black uppercase tracking-wider text-amber-200">
              Live Commercial Breakdown & Rekapitulasi BA (Master Data Sync)
            </span>
          </div>
          <span className="text-[10px] px-2.5 py-0.5 rounded-[3px] bg-[#A57C50]/20 border border-[#A57C50]/40 text-amber-200 font-bold font-mono">
            GL Account: Dr 1103.101 / Cr 4101-4120
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 bg-white/5 rounded-[3px] border border-white/10">
            <span className="text-[10px] text-amber-100/70 font-bold block uppercase">Pokok Pekerjaan</span>
            <span className="font-mono font-extrabold text-sm text-slate-100">{formatIDR(breakdown.basePokok)}</span>
          </div>

          <div className="p-2.5 bg-white/5 rounded-[3px] border border-white/10">
            <span className="text-[10px] text-amber-100/70 font-bold block uppercase">Overdistance (OD)</span>
            <span className="font-mono font-extrabold text-sm text-slate-100">{formatIDR(breakdown.overdistanceGross)}</span>
          </div>

          {breakdown.rfAmount > 0 && (
            <div className="p-2.5 bg-amber-500/10 rounded-[3px] border border-amber-500/30">
              <span className="text-[10px] text-amber-300 font-bold block uppercase flex items-center gap-1">
                <TrendingUp size={10} /> Eskalasi R&F ({breakdown.rfRateFactor.toFixed(3)}x)
              </span>
              <span className="font-mono font-extrabold text-sm text-amber-300">+{formatIDR(breakdown.rfAmount)}</span>
            </div>
          )}

          {breakdown.totalDeductions > 0 && (
            <div className="p-2.5 bg-rose-500/10 rounded-[3px] border border-rose-500/30">
              <span className="text-[10px] text-rose-300 font-bold block uppercase">
                {isBGG ? "Potongan OD 25%" : "Potongan Kontrak"}
              </span>
              <span className="font-mono font-extrabold text-sm text-rose-300">-{formatIDR(breakdown.totalDeductions)}</span>
            </div>
          )}
        </div>

        <div className="pt-2.5 border-t border-amber-900/30 flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="text-[11px] font-bold text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={13} className="text-[#A57C50]" />
              Prediksi Nilai Tagihan Komersial & Pajak (Identik Draf Invoice):
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
              <div className="bg-white/5 p-1.5 rounded-[2px] border border-white/5">
                <span className="text-amber-100/60 block text-[9px] font-sans">Subtotal Gross (DPP):</span>
                <span className="font-bold text-slate-100">{formatIDR(breakdown.totalGross > 0 ? breakdown.totalGross : (sumAdjusted > 0 ? sumAdjusted : sumInitial))}</span>
              </div>
              <div className="bg-white/5 p-1.5 rounded-[2px] border border-white/5">
                <span className="text-amber-100/60 block text-[9px] font-sans">DPP PPN (11/12):</span>
                <span className="font-bold text-slate-200">{formatIDR(breakdown.dpp11_12)}</span>
              </div>
              <div className="bg-white/5 p-1.5 rounded-[2px] border border-white/5">
                <span className="text-amber-100/60 block text-[9px] font-sans">PPN (12%) (+):</span>
                <span className="font-bold text-emerald-300">+{formatIDR(breakdown.vat12)}</span>
              </div>
              <div className="bg-white/5 p-1.5 rounded-[2px] border border-white/5">
                <span className="text-amber-100/60 block text-[9px] font-sans">PPh 23 (2%) (-):</span>
                <span className="font-bold text-rose-300">-{formatIDR(breakdown.pph23Amount)}</span>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0 bg-emerald-950/40 p-2.5 rounded-[3px] border border-emerald-500/30">
            <div className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
              {isSBS ? "Prediksi Total Dibayar (Net)" : "Prediksi Total Invoice (Netto)"}
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 tracking-tight">
              {formatIDR((breakdown.totalDibayar ?? breakdown.netTotalInvoice) > 0 ? (breakdown.totalDibayar ?? breakdown.netTotalInvoice) : (sumAdjusted > 0 ? sumAdjusted : sumInitial))}
            </div>
            <div className="text-[9px] text-emerald-200/60 font-mono">
              {isSBS ? `(Inv: ${formatIDR(breakdown.netTotalInvoice)} - Denda: ${formatIDR(breakdown.subtotalP || 0)})` : "(Gross + PPN 12% - PPh 23)"}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={() => setActiveBAStep(2)}
          className="px-4 py-2 bg-[#A57C50] hover:bg-[#8e6941] text-white font-bold rounded-[3px] flex items-center gap-1.5 transition text-xs shadow-xs cursor-pointer"
        >
          <span>Lanjut ke Step 2 (Hasil Survey & Draft BA)</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
