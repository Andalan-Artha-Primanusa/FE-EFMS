import React from "react";
import { TrendingDown, CheckCircle2 } from "lucide-react";
import { formatIDR, FormattedNumberInput } from "../helpers";
import { InvoiceActionCell } from "./InvoiceRowActions";

interface SBSPengurangTableProps {
  invLineItems: any[];
  updateInvItemAmount: (id: string, val: any) => void;
  removeInvLineItem: (id: string) => void;
  moveInvRow: (id: string, dir: "up" | "down") => void;
  getRowDragProps: (item: any) => any;
  cCalc: any;
}

export function SBSPengurangTable({
  invLineItems,
  updateInvItemAmount,
  removeInvLineItem,
  moveInvRow,
  getRowDragProps,
  cCalc,
}: SBSPengurangTableProps) {
  return (
    <div className="space-y-4">
      {/* TABEL TERPISAH PENGURANG PEMBAYARAN */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown size={14} className="text-rose-600" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Pengurang Pembayaran
            </h4>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Denda Operasional & Kelebihan Konsumsi BBM
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider">
                <th className="p-2.5 text-center w-24">AKSI</th>
                <th className="p-2.5">PENGURANG PEMBAYARAN</th>
                <th className="p-2.5 text-right w-44 font-extrabold">AMOUNT (IDR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {invLineItems.filter((i) => i.section === "P").map((item) => (
                <tr key={item.id} {...getRowDragProps(item)} className="hover:bg-slate-50/70">
                  <InvoiceActionCell
                    itemId={item.id}
                    onMoveUp={() => moveInvRow(item.id, "up")}
                    onMoveDown={() => moveInvRow(item.id, "down")}
                    onRemove={() => removeInvLineItem(item.id)}
                  />
                  <td className="p-2 font-bold text-slate-800">{item.description}</td>
                  <td className="p-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-slate-400 font-mono font-bold">(</span>
                      <FormattedNumberInput
                        allowDecimals
                        maxDecimals={3}
                        className="w-36 bg-slate-50 hover:bg-white border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:border-cyan-700 outline-none"
                        placeholder="00.00"
                        value={item.amount === 0 ? "" : Math.abs(item.amount)}
                        onChange={(val) => updateInvItemAmount(item.id, -Math.abs(val))}
                      />
                      <span className="text-slate-400 font-mono font-bold">)</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-bold text-xs">
              <tr>
                <td colSpan={4} className="p-2.5 text-right font-black uppercase text-slate-800">TOTAL PENGURANG PEMBAYARAN:</td>
                <td className="p-2.5 text-right font-mono text-sm font-black text-rose-700">({formatIDR(Math.abs(cCalc.subtotalP))})</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* TOTAL DIBAYAR (SETTLEMENT BERSIH) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 text-white p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h4 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400" /> TOTAL DIBAYAR
          </h4>
          <p className="text-[11px] text-slate-400 font-medium">
            Total Invoice ({formatIDR(cCalc.totalInvoice)}) dikurangi Pengurang Pembayaran ({formatIDR(Math.abs(cCalc.subtotalP))})
          </p>
        </div>
        <div className="text-right w-full sm:w-auto bg-slate-800/90 border border-slate-700 px-5 py-2.5 rounded-xl shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Net Transfer Cash</span>
          <span className="font-mono text-xl sm:text-2xl font-black text-emerald-400 tracking-tight">{formatIDR(cCalc.totalDibayar)}</span>
        </div>
      </div>
    </div>
  );
}
