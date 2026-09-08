import React from "react";
import { formatIDR } from "../helpers";

interface InvoiceTaxSummaryProps {
  currentCust: string;
  cCalc: {
    totalGross: number;
    dpp11_12?: number;
    vat12?: number;
    pph23?: number;
    totalInvoice: number;
  };
}

export function InvoiceTaxSummary({ currentCust, cCalc }: InvoiceTaxSummaryProps) {
  const colSpanLeft = currentCust === "PTRO" || currentCust === "DBK" ? 4 : 3;
  const dpp = cCalc.dpp11_12 ?? Math.round((cCalc.totalGross * 11) / 12);
  const vat = cCalc.vat12 ?? Math.round(dpp * 0.12);
  const pph = cCalc.pph23 ?? Math.round(cCalc.totalGross * 0.02);

  return (
    <tfoot className="border-t-2 border-[#1A1612] bg-slate-50 font-bold text-xs">
      <tr>
        <td colSpan={colSpanLeft} className="p-2.5 text-right font-black uppercase text-slate-700">
          SUBTOTAL REVENUE (GROSS):
        </td>
        <td colSpan={2} className="p-2.5 text-right font-mono text-sm font-black text-[#1A1612]">
          {formatIDR(cCalc.totalGross)}
        </td>
      </tr>
      <tr>
        <td colSpan={colSpanLeft} className="p-2.5 text-right uppercase text-slate-600 font-bold">
          DPP PPN 11/12:
        </td>
        <td colSpan={2} className="p-2.5 text-right font-mono font-bold text-slate-800">
          {formatIDR(dpp)}
        </td>
      </tr>
      <tr>
        <td colSpan={colSpanLeft} className="p-2.5 text-right uppercase text-slate-700 font-bold">
          VAT (12%) (+):
        </td>
        <td colSpan={2} className="p-2.5 text-right font-mono font-bold text-slate-900">
          {formatIDR(vat)}
        </td>
      </tr>
      <tr>
        <td colSpan={colSpanLeft} className="p-2.5 text-right uppercase text-slate-700 font-bold">
          WITHHOLDING TAX ART 23 (2%) (-):
        </td>
        <td colSpan={2} className="p-2.5 text-right font-mono font-bold text-slate-900">
          ({formatIDR(pph)})
        </td>
      </tr>
      <tr className="bg-[#1A1612] text-white font-black text-sm border-t-2 border-[#1A1612]">
        <td colSpan={colSpanLeft} className="p-3 text-right uppercase tracking-wider text-amber-100">
          TOTAL INVOICE (NETTO):
        </td>
        <td colSpan={2} className="p-3 text-right font-mono text-base font-black text-[#A57C50]">
          {formatIDR(cCalc.totalInvoice)}
        </td>
      </tr>
    </tfoot>
  );
}
