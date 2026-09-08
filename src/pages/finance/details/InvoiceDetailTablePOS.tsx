import React from "react";
import { formatIDR } from "../helpers";

interface InvoiceDetailTablePOSProps {
  activeItems: any[];
  cCalc: any;
  detailData: any;
  isMDO: boolean;
  getItemEffectiveVolume: (item: any, currentList?: any[]) => number;
  getItemEffectiveOverhaulMtr: (item: any) => number;
  calculateItemRateAndAmount: (item: any, customerCode: string, currentList?: any[]) => { unitRate: number; amount: number };
}

export const InvoiceDetailTablePOS: React.FC<InvoiceDetailTablePOSProps> = ({
  activeItems,
  cCalc,
  detailData,
  isMDO,
  getItemEffectiveVolume,
  getItemEffectiveOverhaulMtr,
  calculateItemRateAndAmount
}) => {
  const secAItems = activeItems.filter((i: any) => i.section === "A");
  const secBItems = activeItems.filter((i: any) => i.section === "B");
  const secCItems = activeItems.filter((i: any) => i.section === "C");
  const secDItems = activeItems.filter((i: any) => i.section === "D");

  return (
    <>
      {secAItems.length > 0 && (
        <>
          <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
            <td className="p-2 underline border-r border-slate-200">
              {(detailData.jobType || "").toLowerCase().includes("mess") || (detailData.jobType || "").toLowerCase().includes("mob") || (detailData.invoiceNo || "").toLowerCase().includes("bc-") ? "A. PEKERJAAN FASILITAS / KLAIM PROYEK" : isMDO ? "A. MINE DEVELOPMENT (MDO)" : "A. PRODUCTION"}
            </td>
            <td className="p-2 text-center font-mono border-r border-slate-200 font-black">
              {secAItems.reduce((sum: number, i: any) => sum + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
            </td>
            <td className="p-2 text-center border-r border-slate-200 font-bold">{isMDO ? "" : (secAItems[0]?.unit || "Bcm")}</td>
            <td className="p-2 text-right border-r border-slate-200"></td>
            <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalA)}</td>
          </tr>
          {secAItems.map((item: any) => {
            const { unitRate, amount } = calculateItemRateAndAmount(item, "POS", activeItems);
            const effUnitRate = unitRate > 0 ? unitRate : Number(item.unitRateIDR || (item.volume > 0 ? Math.round(item.amount / item.volume) : 0));
            const effAmount = amount !== 0 ? amount : Number(item.amount || Math.round((item.volume || 0) * effUnitRate));
            return (
              <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-200">
                <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">{item.description}</td>
                <td className="p-2 text-center font-mono font-bold border-r border-slate-200">
                  {(item.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                </td>
                <td className="p-2 text-center border-r border-slate-200 text-slate-500 font-normal">{item.unit || "Bcm"}</td>
                <td className="p-2 text-right font-mono border-r border-slate-200">{effUnitRate.toLocaleString("id-ID")}</td>
                <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(effAmount)}</td>
              </tr>
            );
          })}
        </>
      )}

      {secBItems.length > 0 && (
        <>
          <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
            <td className="p-2 underline border-r border-slate-200">B. OVER DISTANCE</td>
            <td className="p-2 border-r border-slate-200"></td>
            <td className="p-2 border-r border-slate-200"></td>
            <td className="p-2 text-right border-r border-slate-200"></td>
            <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalB)}</td>
          </tr>
          {secBItems.map((item: any) => {
            const effVol = getItemEffectiveVolume(item, activeItems);
            const effMtr = getItemEffectiveOverhaulMtr(item);
            const { unitRate, amount } = calculateItemRateAndAmount(item, "POS", activeItems);
            const diffMtr = Number((effMtr - 1000).toFixed(3));
            return (
              <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-200">
                <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">
                  <div>{item.description}</div>
                  <div className="text-[10px] text-slate-500 font-mono font-normal">
                    {effMtr} mtr - 1000 mtr = ({diffMtr > 0 ? `+${diffMtr}` : diffMtr}) mtr
                  </div>
                </td>
                <td className="p-2 text-center font-mono font-bold border-r border-slate-200">
                  {effVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                </td>
                <td className="p-2 text-center border-r border-slate-200 text-slate-500 font-normal">{item.unit}</td>
                <td className="p-2 text-right font-mono border-r border-slate-200">{unitRate.toLocaleString("id-ID")}</td>
                <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
              </tr>
            );
          })}
        </>
      )}

      {secCItems.length > 0 && (
        <>
          <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
            <td className="p-2 underline border-r border-slate-200">C. LAND CLEARING</td>
            <td className="p-2 border-r border-slate-200"></td>
            <td className="p-2 border-r border-slate-200"></td>
            <td className="p-2 text-right border-r border-slate-200"></td>
            <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalC)}</td>
          </tr>
          {secCItems.map((item: any) => {
            const { unitRate, amount } = calculateItemRateAndAmount(item, "POS", activeItems);
            return (
              <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-200">
                <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">{item.description}</td>
                <td className="p-2 text-center font-mono font-bold border-r border-slate-200">
                  {(item.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                </td>
                <td className="p-2 text-center border-r border-slate-200 text-slate-500 font-normal">{item.unit}</td>
                <td className="p-2 text-right font-mono border-r border-slate-200">{unitRate.toLocaleString("id-ID")}</td>
                <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
              </tr>
            );
          })}
        </>
      )}

      {secDItems.length > 0 && (
        <>
          <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
            <td className="p-2 underline border-r border-slate-200">D. RAISE & FALL'S FACTOR</td>
            <td className="p-2 border-r border-slate-200"></td>
            <td className="p-2 border-r border-slate-200"></td>
            <td className="p-2 text-right border-r border-slate-200"></td>
            <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalD)}</td>
          </tr>
          {secDItems.map((item: any) => {
            const { unitRate, amount } = calculateItemRateAndAmount(item, "POS", activeItems);
            return (
              <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-200">
                <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">{item.description}</td>
                <td className="p-2 text-center font-mono font-bold border-r border-slate-200">
                  {(item.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                </td>
                <td className="p-2 text-center border-r border-slate-200 text-slate-500 font-normal">{item.unit}</td>
                <td className="p-2 text-right font-mono border-r border-slate-200">{unitRate.toLocaleString("id-ID")}</td>
                <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
              </tr>
            );
          })}
        </>
      )}
    </>
  );
};
