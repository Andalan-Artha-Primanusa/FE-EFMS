import React from "react";
import { formatIDR } from "../helpers";

interface InvoiceDetailTableBGGProps {
  activeItems: any[];
  cCalc: any;
  getItemEffectiveVolume: (item: any, currentList?: any[]) => number;
  getItemEffectiveOverhaulMtr: (item: any) => number;
  calculateItemRateAndAmount: (item: any, customerCode: string, currentList?: any[]) => { unitRate: number; amount: number };
}

export const InvoiceDetailTableBGG: React.FC<InvoiceDetailTableBGGProps> = ({
  activeItems,
  cCalc,
  getItemEffectiveVolume,
  getItemEffectiveOverhaulMtr,
  calculateItemRateAndAmount
}) => {
  return (
    <>
      {/* Seksi A: OB Removal */}
      <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
        <td className="p-2 underline border-r border-slate-200">A. OB REMOVAL</td>
        <td className="p-2 text-center font-mono border-r border-slate-200 font-black">
          {activeItems.filter((i: any) => i.section === "A").reduce((s: number, i: any) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
        </td>
        <td className="p-2 text-center border-r border-slate-200 font-bold">Bcm</td>
        <td className="p-2 text-right border-r border-slate-200"></td>
        <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalA)}</td>
      </tr>
      <tr className="bg-slate-50 font-bold"><td colSpan={5} className="p-1.5 pl-4 text-slate-700">A1. Pit Kungkilan</td></tr>
      {activeItems.filter((i: any) => i.section === "A").map((i: any) => {
        const effVol = getItemEffectiveVolume(i, activeItems);
        const { unitRate, amount } = calculateItemRateAndAmount(i, "BGG", activeItems);
        return (
          <tr key={i.id} className="hover:bg-slate-50 border-b border-slate-200">
            <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">
              {i.description} &nbsp; &nbsp; <span className="text-[10px] text-slate-500 font-normal">{i.period}</span>
            </td>
            <td className="p-2 text-center font-mono border-r border-slate-200">{effVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
            <td className="p-2 text-center border-r border-slate-200">{i.unit || "Bcm"}</td>
            <td className="p-2 text-right font-mono border-r border-slate-200">{unitRate.toLocaleString("id-ID", { minimumFractionDigits: unitRate % 1 !== 0 ? 3 : 0, maximumFractionDigits: 3 })}</td>
            <td className="p-2 text-right font-mono font-extrabold">{formatIDR(amount)}</td>
          </tr>
        );
      })}

      {/* Seksi B: Coal Winning */}
      <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
        <td className="p-2 underline border-r border-slate-200">B. COAL WINNING</td>
        <td className="p-2 text-center font-mono border-r border-slate-200 font-black">
          {activeItems.filter((i: any) => i.section === "B").reduce((s: number, i: any) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
        </td>
        <td className="p-2 text-center border-r border-slate-200 font-bold">Ton</td>
        <td className="p-2 text-right border-r border-slate-200"></td>
        <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalB)}</td>
      </tr>
      <tr className="bg-slate-50 font-bold"><td colSpan={5} className="p-1.5 pl-4 text-slate-700">B1. Pit Kungkilan</td></tr>
      {activeItems.filter((i: any) => i.section === "B").map((i: any) => {
        const effVol = getItemEffectiveVolume(i, activeItems);
        const { unitRate, amount } = calculateItemRateAndAmount(i, "BGG", activeItems);
        return (
          <tr key={i.id} className="hover:bg-slate-50 border-b border-slate-200">
            <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">
              {i.description}
            </td>
            <td className="p-2 text-center font-mono border-r border-slate-200">{effVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
            <td className="p-2 text-center border-r border-slate-200">{i.unit || "Ton"}</td>
            <td className="p-2 text-right font-mono border-r border-slate-200">{unitRate.toLocaleString("id-ID", { minimumFractionDigits: unitRate % 1 !== 0 ? 3 : 0, maximumFractionDigits: 3 })}</td>
            <td className="p-2 text-right font-mono font-extrabold">{formatIDR(amount)}</td>
          </tr>
        );
      })}

      {/* Seksi C: Over Distance */}
      <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
        <td className="p-2 underline border-r border-slate-200">C. OVER DISTANCE</td>
        <td className="p-2 border-r border-slate-200"></td>
        <td className="p-2 border-r border-slate-200"></td>
        <td className="p-2 text-right border-r border-slate-200"></td>
        <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalC)}</td>
      </tr>
      {activeItems.filter((i: any) => i.section === "C").map((i: any) => {
        const effVol = getItemEffectiveVolume(i, activeItems);
        const effMtr = getItemEffectiveOverhaulMtr(i);
        const { unitRate, amount } = calculateItemRateAndAmount(i, "BGG", activeItems);
        const diffMtr = Number((effMtr - 1000).toFixed(3));
        return (
          <tr key={i.id} className="hover:bg-slate-50 border-b border-slate-200">
            <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">
              <div>{i.subSection || i.description}</div>
              <div className="text-[10px] text-slate-500 font-mono font-normal">
                {effMtr} mtr - 1000 mtr = ({diffMtr > 0 ? `+${diffMtr}` : diffMtr}) mtr &nbsp; &nbsp; {i.period}
              </div>
            </td>
            <td className="p-2 text-center font-mono border-r border-slate-200">{effVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
            <td className="p-2 text-center border-r border-slate-200">{i.unit || (i.subSection?.includes("Coal") ? "Ton" : "Bcm")}</td>
            <td className="p-2 text-right font-mono border-r border-slate-200">{unitRate.toLocaleString("id-ID", { minimumFractionDigits: unitRate % 1 !== 0 ? 3 : 0, maximumFractionDigits: 3 })}</td>
            <td className="p-2 text-right font-mono font-extrabold">{formatIDR(amount)}</td>
          </tr>
        );
      })}

      {/* Seksi D: Raise & Fall */}
      <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
        <td className="p-2 underline border-r border-slate-200">D. RAISE & FALL'S FACTOR</td>
        <td className="p-2 border-r border-slate-200"></td>
        <td className="p-2 border-r border-slate-200"></td>
        <td className="p-2 text-right border-r border-slate-200"></td>
        <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalD)}</td>
      </tr>
      {activeItems.filter((i: any) => i.section === "D").map((i: any) => {
        const effVol = getItemEffectiveVolume(i, activeItems);
        const { unitRate, amount } = calculateItemRateAndAmount(i, "BGG", activeItems);
        return (
          <tr key={i.id} className="hover:bg-slate-50 border-b border-slate-200">
            <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">
              <div>{i.subSection || i.description}</div>
              <div className="text-[10px] text-slate-500 font-mono font-normal">
                {i.period}
              </div>
            </td>
            <td className="p-2 text-center font-mono border-r border-slate-200">{effVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
            <td className="p-2 text-center border-r border-slate-200">{i.unit || "Bcm"}</td>
            <td className="p-2 text-right font-mono border-r border-slate-200">{unitRate.toLocaleString("id-ID", { minimumFractionDigits: unitRate % 1 !== 0 ? 3 : 0, maximumFractionDigits: 3 })}</td>
            <td className="p-2 text-right font-mono font-extrabold">{formatIDR(amount)}</td>
          </tr>
        );
      })}

      {/* Seksi E: Discount */}
      <tr className="bg-rose-50/70 font-extrabold text-rose-900 border-t border-b border-rose-200">
        <td colSpan={4} className="p-2 underline">E. DISCOUNT ON OVERDISTANCE (Deduction 25%)</td>
        <td className="p-2 text-right font-mono font-black text-rose-900">({formatIDR(Math.abs(cCalc.subtotalE))})</td>
      </tr>
      {activeItems.filter((i: any) => i.section === "E").map((i: any) => {
        const { amount } = calculateItemRateAndAmount(i, "BGG");
        return (
          <tr key={i.id} className="hover:bg-rose-50/30 border-b border-slate-200">
            <td colSpan={4} className="p-2 pl-6 font-medium text-slate-700">{i.description}</td>
            <td className="p-2 text-right font-mono font-bold text-rose-800">({formatIDR(Math.abs(amount))})</td>
          </tr>
        );
      })}

      {/* Seksi F: DP Fuel & Transport */}
      <tr className="bg-rose-50/70 font-extrabold text-rose-900 border-t border-b border-rose-200">
        <td colSpan={4} className="p-2 underline">F. DP FUEL & TRANSPORT (Deduction)</td>
        <td className="p-2 text-right font-mono font-black text-rose-900">({formatIDR(Math.abs(cCalc.subtotalF))})</td>
      </tr>
      {activeItems.filter((i: any) => i.section === "F").map((i: any) => {
        const { amount } = calculateItemRateAndAmount(i, "BGG");
        return (
          <tr key={i.id} className="hover:bg-rose-50/30 border-b border-slate-200">
            <td colSpan={4} className="p-2 pl-6 font-medium text-slate-700">{i.description}</td>
            <td className="p-2 text-right font-mono font-bold text-rose-800">({formatIDR(Math.abs(amount))})</td>
          </tr>
        );
      })}
    </>
  );
};
