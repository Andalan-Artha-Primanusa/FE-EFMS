import React from "react";
import { formatIDR } from "../helpers";
import { InvoiceDetailTableSBS } from "./InvoiceDetailTableSBS";
import { InvoiceDetailTableBGG } from "./InvoiceDetailTableBGG";
import { InvoiceDetailTablePTRO } from "./InvoiceDetailTablePTRO";
import { InvoiceDetailTablePOS } from "./InvoiceDetailTablePOS";
import { InvoiceCommercialBreakdown } from "./InvoiceCommercialBreakdown";
import { InvoiceDetailSummary } from "./InvoiceDetailSummary";

interface InvoiceDetailSheetProps {
  data: any;
  baRows: any[];
  invLineItems: any[];
  formData: any;
  buildInvoiceItemsFromBA: (ba: any, custCode: string, cat?: string) => any[];
  customerContractMap: Record<string, any>;
  getItemEffectiveVolume: (item: any) => number;
  getItemEffectiveOverhaulMtr: (item: any) => number;
  calculateItemRateAndAmount: (item: any, custCode: string) => { unitRate: number; amount: number };
  getCustomerCalculations: (items: any[], custCode: string) => any;
  rfIndexCalculated: number;
}

export const InvoiceDetailSheet: React.FC<InvoiceDetailSheetProps> = ({
  data,
  baRows,
  invLineItems,
  formData,
  buildInvoiceItemsFromBA,
  customerContractMap,
  getItemEffectiveVolume,
  getItemEffectiveOverhaulMtr,
  calculateItemRateAndAmount,
  getCustomerCalculations,
  rfIndexCalculated
}) => {
  const viewCustCode = (data.customerCode || "").toUpperCase();
  const targetBA = baRows?.find((b: any) => b.baNumber === data.baNoReference || b.baNumber === data.baNumber || b.id === data.baID);
  const rawItems = (data.items && Array.isArray(data.items) && data.items.length > 0)
    ? data.items
    : (data.lineItems && Array.isArray(data.lineItems) && data.lineItems.length > 0)
      ? data.lineItems
      : null;
  let activeItems = rawItems
    ? rawItems
    : (invLineItems && invLineItems.length > 0 && formData?.invoiceNo === data.invoiceNo
        ? invLineItems
        : (typeof buildInvoiceItemsFromBA === "function"
            ? buildInvoiceItemsFromBA(targetBA || data, viewCustCode, data.invoiceCategory)
            : (data.items || data.lineItems || []))
      );

  if ((!activeItems || activeItems.length === 0 || activeItems.every((i: any) => !(i.volume > 0 || i.amount > 0 || i.unitRateIDR > 0))) && typeof buildInvoiceItemsFromBA === "function") {
    activeItems = buildInvoiceItemsFromBA(data, viewCustCode, data.invoiceCategory);
  }

  let cCalc = getCustomerCalculations(activeItems, viewCustCode);

  // Failsafe: Ensure cCalc displays correct financial totals if activeItems sum is 0
  if (cCalc.totalGross === 0 && (data.revenueGross > 0 || data.subTotalDPP > 0 || data.totalInvoice > 0)) {
    const gross = Number(data.revenueGross || data.subTotalDPP || 0);
    const dpp = Number(data.subTotalDPP || Math.round(gross * 11 / 12));
    const vat = Number(data.ppn11 || Math.round(dpp * 0.12));
    const pph = Number(data.pph23 || Math.round(gross * 0.02));
    const totInv = Number(data.totalInvoice || (gross + vat - pph));
    const totPay = Number(data.totalReceipt || data.outstanding || totInv);
    cCalc = {
      ...cCalc,
      totalGross: gross,
      subtotalA: gross,
      dpp11_12: dpp,
      vat12: vat,
      pph23: pph,
      totalInvoice: totInv,
      totalDibayar: totPay,
    };
  }

  const cInfo = customerContractMap[viewCustCode];
  const isMDO = data.invoiceCategory === "MDO" || (data.activityGroup || "").includes("MDO") || (data.invoiceNo || "").includes("MDO");
  const formattedDate = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="p-4 sm:p-6 bg-white border-2 border-slate-900 rounded-none space-y-4 shadow-xs text-xs text-slate-900">
      {/* Official ANDALAN Logo Header */}
      <div className="text-center pb-2 border-b-2 border-slate-900">
        <img src="/andalan-logo.png" alt="ANDALAN Logo" className="h-10 w-auto object-contain mx-auto" />
      </div>

      {/* Metadata Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2 border-b border-slate-300 text-[11px]">
        <div className="space-y-1">
          <div className="flex">
            <span className="w-28 font-bold text-slate-500">Customer</span>
            <span className="font-extrabold text-slate-900">: {cInfo?.name || data.customerName || data.customerCode}</span>
          </div>
          <div className="flex">
            <span className="w-28 font-bold text-slate-500">Address</span>
            <span className="text-slate-700 font-medium">: {cInfo?.address || "Jakarta, Indonesia"}</span>
          </div>
          <div className="flex">
            <span className="w-28 font-bold text-slate-500">Work Period</span>
            <span className="font-extrabold text-slate-900">: {data.workPeriod || "Juni 2026"}</span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex">
            <span className="w-32 font-bold text-slate-500">Invoice No.</span>
            <span className="font-extrabold text-slate-900 font-mono">: {data.invoiceNo}</span>
          </div>
          <div className="flex">
            <span className="w-32 font-bold text-slate-500">PO Number</span>
            <span className="font-extrabold text-slate-900">: {data.noPO || data.poNumber || (viewCustCode === "SBS" ? "I05790/0002" : viewCustCode === "POS" ? "PO-POS/2026/001" : "-")}</span>
          </div>
          <div className="flex">
            <span className="w-32 font-bold text-slate-500">Activity Group</span>
            <span className="font-extrabold text-slate-900">: {data.activityGroup || (viewCustCode === "SBS" ? "OB REMOVAL + HEAVY EQUIPMENT RENTAL" : "MINING OPERATIONS")}</span>
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="text-center py-1">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 underline">INVOICE</h3>
        <p className="text-[11px] text-slate-600 font-semibold mt-0.5">(NO KONTRAK : {data.contractNo || cInfo?.contract || "SPPH-05852"})</p>
      </div>

      {/* MAIN INVOICE TABLE — DYNAMIC PER CUSTOMER */}
      {viewCustCode === "SBS" ? (
        <InvoiceDetailTableSBS activeItems={activeItems} cCalc={cCalc} />
      ) : (
        <div className="overflow-x-auto rounded-none border border-slate-900">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/90 text-slate-900 font-extrabold text-[11px] uppercase border-b border-slate-300">
                <th className="p-2.5 border-r border-slate-300">DESCRIPTION</th>
                <th className="p-2.5 text-center border-r border-slate-300">CLAIMED VOLUME</th>
                <th className="p-2.5 text-center border-r border-slate-300">UoM</th>
                {viewCustCode === "DBK" ? (
                  <>
                    <th className="p-2.5 text-right border-r border-slate-300">UNIT RATE (USD)</th>
                    <th className="p-2.5 text-right border-r border-slate-300">KURS (USD to IDR)</th>
                  </>
                ) : (
                  <th className="p-2.5 text-right border-r border-slate-300">UNIT RATE (IDR)</th>
                )}
                <th className="p-2.5 text-right font-extrabold">AMOUNT (IDR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-[11px] font-medium text-slate-900">
              {viewCustCode === "BGG" ? (
                <InvoiceDetailTableBGG
                  activeItems={activeItems}
                  cCalc={cCalc}
                  getItemEffectiveVolume={getItemEffectiveVolume}
                  getItemEffectiveOverhaulMtr={getItemEffectiveOverhaulMtr}
                  calculateItemRateAndAmount={calculateItemRateAndAmount}
                />
              ) : viewCustCode === "DBK" ? (
                <InvoiceDetailTablePTRO activeItems={activeItems} cCalc={cCalc} />
              ) : (
                <InvoiceDetailTablePOS
                  activeItems={activeItems}
                  cCalc={cCalc}
                  detailData={data}
                  isMDO={isMDO}
                  getItemEffectiveVolume={getItemEffectiveVolume}
                  getItemEffectiveOverhaulMtr={getItemEffectiveOverhaulMtr}
                  calculateItemRateAndAmount={calculateItemRateAndAmount}
                />
              )}
            </tbody>

            {/* TOTALS FOOTER */}
            <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-bold text-[11px]">
              <tr className="border-b border-slate-200">
                <td colSpan={viewCustCode === "DBK" ? 5 : 4} className="p-2 text-left font-extrabold uppercase text-slate-900 border-r border-slate-200">TOTAL (REVENUE GROSS):</td>
                <td className="p-2 text-right font-mono font-black text-slate-900">{formatIDR(cCalc.totalGross)}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td colSpan={viewCustCode === "DBK" ? 5 : 4} className="p-2 text-left uppercase text-slate-800 border-r border-slate-200">DPP PPN 11/12:</td>
                <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(cCalc.dpp11_12)}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td colSpan={viewCustCode === "DBK" ? 5 : 4} className="p-2 text-left uppercase text-slate-800 border-r border-slate-200">VAT ( 12% ) (+):</td>
                <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(cCalc.vat12)}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td colSpan={viewCustCode === "DBK" ? 5 : 4} className="p-2 text-left uppercase text-slate-800 border-r border-slate-200">WITH HOLDING TAX ART 23 (-):</td>
                <td className="p-2 text-right font-mono font-extrabold text-slate-900">({formatIDR(cCalc.pph23)})</td>
              </tr>
              <tr className="bg-slate-100 text-slate-950 font-black text-xs sm:text-sm border-t-2 border-b-2 border-slate-400">
                <td colSpan={viewCustCode === "DBK" ? 5 : 4} className="p-3 text-left uppercase tracking-wider text-slate-950 font-black border-r border-slate-300">TOTAL INVOICE (NET):</td>
                <td className="p-3 text-right font-black text-sm sm:text-base text-slate-950 underline">{formatIDR(cCalc.totalInvoice)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Commercial Revenue Decomposition Card */}
      <InvoiceCommercialBreakdown
        viewCustCode={viewCustCode}
        rfIndexCalculated={rfIndexCalculated}
        detailData={data}
        cCalc={cCalc}
        cInfo={cInfo}
      />

      {/* Bank Account & Signatures */}
      <InvoiceDetailSummary
        detailData={data}
        cInfo={cInfo}
        formattedDate={formattedDate}
      />
    </div>
  );
};
