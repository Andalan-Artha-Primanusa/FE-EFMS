import React from "react";
import { formatIDR } from "../helpers";

interface InvoiceDetailTablePTROProps {
  activeItems: any[];
  cCalc: any;
}

export const InvoiceDetailTablePTRO: React.FC<InvoiceDetailTablePTROProps> = ({
  activeItems,
  cCalc
}) => {
  return (
    <>
      {/* Seksi A: OB Removal */}
      <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
        <td className="p-2 underline border-r border-slate-200">A. OB REMOVAL</td>
        <td className="p-2 text-center font-mono border-r border-slate-200 font-black">
          {activeItems.filter((i: any) => i.section === "A").reduce((s: number, i: any) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 3 })}
        </td>
        <td className="p-2 text-center border-r border-slate-200 font-bold">Bcm</td>
        <td className="p-2 text-right border-r border-slate-200"></td>
        <td className="p-2 text-right border-r border-slate-200"></td>
        <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalA)}</td>
      </tr>
      <tr className="bg-slate-50 font-bold"><td colSpan={6} className="p-1.5 pl-4 text-slate-700">A1. PIT SAPAN</td></tr>
      {activeItems.filter((i: any) => i.section === "A").map((i: any) => (
        <tr key={i.id} className="hover:bg-slate-50 border-b border-slate-200">
          <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">{i.description}</td>
          <td className="p-2 text-center font-mono border-r border-slate-200">{(i.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 3 })}</td>
          <td className="p-2 text-center border-r border-slate-200">{i.unit || "Bcm"}</td>
          <td className="p-2 text-right font-mono border-r border-slate-200">{(i.unitRateUSD || 0).toFixed(3)}</td>
          <td className="p-2 text-right font-mono border-r border-slate-200">{(i.kursBI || 17140.76).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
          <td className="p-2 text-right font-mono font-extrabold">{formatIDR(Math.round((i.volume || 0) * (i.unitRateUSD || 0) * (i.kursBI || 17140.76)))}</td>
        </tr>
      ))}

      {/* Seksi B: Coal Winning */}
      <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
        <td className="p-2 underline border-r border-slate-200">B. COAL WINNING</td>
        <td className="p-2 text-center font-mono border-r border-slate-200 font-black">
          {activeItems.filter((i: any) => i.section === "B").reduce((s: number, i: any) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 3 })}
        </td>
        <td className="p-2 text-center border-r border-slate-200 font-bold">Ton</td>
        <td className="p-2 text-right border-r border-slate-200"></td>
        <td className="p-2 text-right border-r border-slate-200"></td>
        <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalB)}</td>
      </tr>
      <tr className="bg-slate-50 font-bold"><td colSpan={6} className="p-1.5 pl-4 text-slate-700">B1. PIT SAPAN</td></tr>
      {activeItems.filter((i: any) => i.section === "B").map((i: any) => (
        <tr key={i.id} className="hover:bg-slate-50 border-b border-slate-200">
          <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">PIT SAPAN</td>
          <td className="p-2 text-center font-mono border-r border-slate-200">{(i.actualVolume || i.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 3 })}</td>
          <td className="p-2 text-center border-r border-slate-200">{i.unit || "Ton"}</td>
          <td className="p-2 text-right font-mono border-r border-slate-200">{(i.unitRateUSD || 0).toFixed(3)}</td>
          <td className="p-2 text-right font-mono border-r border-slate-200">{(i.kursBI || 17140.76).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
          <td className="p-2 text-right font-mono font-extrabold">{formatIDR(Math.round((i.volume || 0) * (i.unitRateUSD || 0) * (i.kursBI || 17140.76)))}</td>
        </tr>
      ))}

      {/* Seksi C: Over Distance */}
      {activeItems.some((i: any) => {
        if (i.section !== "C") return false;
        const baseM = i.baseMtr || ((i.subSection || i.description || "").toLowerCase().includes("coal") ? 3000 : 1000);
        return (i.overhaulMtr ?? baseM) > baseM;
      }) && (
        <>
          <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
            <td className="p-2 underline border-r border-slate-200">C. OVER DISTANCE</td>
            <td className="p-2 border-r border-slate-200"></td>
            <td className="p-2 border-r border-slate-200"></td>
            <td className="p-2 border-r border-slate-200"></td>
            <td className="p-2 border-r border-slate-200"></td>
            <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalC)}</td>
          </tr>
          {activeItems.filter((i: any) => {
            if (i.section !== "C") return false;
            const baseM = i.baseMtr || ((i.subSection || i.description || "").toLowerCase().includes("coal") ? 3000 : 1000);
            return (i.overhaulMtr ?? baseM) > baseM;
          }).map((i: any) => {
            const baseM = i.baseMtr || ((i.subSection || i.description || "").toLowerCase().includes("coal") ? 3000 : 1000);
            const diff = Math.max(0, (i.overhaulMtr || baseM) - baseM);
            return (
              <tr key={i.id} className="hover:bg-slate-50 border-b border-slate-200">
                <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">
                  <div>{i.subSection}</div>
                  <div className="text-[10px] text-slate-500 font-mono font-normal">
                    PIT SAPAN {(i.overhaulMtr || baseM).toLocaleString("id-ID", { minimumFractionDigits: 2 })} mtr - {baseM} mtr = {diff.toFixed(2)} mtr
                  </div>
                </td>
                <td className="p-2 text-center font-mono border-r border-slate-200">{i.volume ? i.volume.toLocaleString("id-ID", { minimumFractionDigits: 3 }) : ""}</td>
                <td className="p-2 text-center border-r border-slate-200">{i.volume ? (i.unit || "") : ""}</td>
                <td className="p-2 border-r border-slate-200"></td>
                <td className="p-2 text-right font-mono border-r border-slate-200">{i.unitRateIDR ? i.unitRateIDR.toFixed(2) : ""}</td>
                <td className="p-2 text-right font-mono font-extrabold">{i.volume && i.unitRateIDR ? formatIDR(Math.round(i.volume * i.unitRateIDR)) : "-"}</td>
              </tr>
            );
          })}
        </>
      )}
    </>
  );
};
