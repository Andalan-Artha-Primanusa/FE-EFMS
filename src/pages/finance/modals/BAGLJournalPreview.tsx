import React from "react";
import { BookOpen, CheckCircle2, AlertCircle } from "lucide-react";
import { formatIDR } from "../helpers";
import {
  calculateBACommercialBreakdown,
  generateBAGLJournalPreview,
} from "../ba_calculations";

interface BAGLJournalPreviewProps {
  customerCode: string;
  allBAItems?: any[];
  rfIndexCalculated?: number;
  isCustomerDBK?: boolean;
  fuelPeriods?: Record<string, any>;
}

export function BAGLJournalPreview({
  customerCode,
  allBAItems = [],
  rfIndexCalculated = 1.560,
  isCustomerDBK = false,
  fuelPeriods,
}: BAGLJournalPreviewProps) {
  const breakdown = calculateBACommercialBreakdown(
    customerCode,
    allBAItems,
    rfIndexCalculated,
    isCustomerDBK,
    false,
    fuelPeriods
  );
  const { lines, totalDebit, totalCredit, isBalanced } = generateBAGLJournalPreview(
    breakdown,
    customerCode
  );

  if (lines.length === 0) return null;

  return (
    <div className="bg-[#1A1612] border border-stone-800 rounded-[4px] p-4 text-stone-100 shadow-lg space-y-3">
      {/* GL Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-stone-800 pb-2.5">
        <div className="flex items-center gap-2">
          <BookOpen className="text-[#A57C50]" size={16} />
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-stone-200">
              Pratinjau Ayat Jurnal Akrual General Ledger (GL Posting Preview)
            </h4>
            <span className="text-[10px] text-stone-400">
              Symmetric Journal: Ayat jurnal BA ini identik dengan jurnal posting Invoice
            </span>
          </div>
        </div>

        <div className="shrink-0">
          {isBalanced ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[3px] text-[10px] font-bold bg-[#A57C50]/20 border border-[#A57C50]/40 text-amber-200">
              <CheckCircle2 size={12} className="text-[#A57C50]" /> Jurnal Seimbang (Balanced)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[3px] text-[10px] font-bold bg-rose-950/80 border border-rose-500/50 text-rose-300">
              <AlertCircle size={12} /> Unbalanced
            </span>
          )}
        </div>
      </div>

      {/* GL Lines Table */}
      <div className="overflow-x-auto rounded-[3px] border border-stone-800">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-stone-900 text-[10px] font-bold uppercase tracking-wider text-stone-400 border-b border-stone-800">
              <th className="py-2 px-3 font-mono">Kode Akun</th>
              <th className="py-2 px-3">Nama Akun (COA)</th>
              <th className="py-2 px-3 text-right">Debit (IDR)</th>
              <th className="py-2 px-3 text-right">Kredit (IDR)</th>
              <th className="py-2 px-3">Keterangan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800 font-mono text-[11px]">
            {lines.map((l, idx) => (
              <tr key={idx} className="hover:bg-stone-800/40 transition">
                <td className="py-2 px-3 text-[#A57C50] font-bold">{l.accountNo}</td>
                <td className="py-2 px-3 font-sans font-medium text-stone-200">
                  <span className={l.credit > 0 ? "pl-4 text-stone-300 block" : "font-bold text-white block"}>
                    {l.accountName}
                  </span>
                </td>
                <td className="py-2 px-3 text-right font-bold text-stone-100">
                  {l.debit > 0 ? formatIDR(l.debit) : "-"}
                </td>
                <td className="py-2 px-3 text-right font-bold text-amber-100">
                  {l.credit > 0 ? formatIDR(l.credit) : "-"}
                </td>
                <td className="py-2 px-3 font-sans text-[10px] text-stone-400">
                  {l.note}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-stone-900 text-xs font-mono font-bold text-white border-t-2 border-[#A57C50]/40">
              <td colSpan={2} className="py-2.5 px-3 font-sans uppercase text-[10px] tracking-wider text-stone-300">
                Total Jurnal Akrual:
              </td>
              <td className="py-2.5 px-3 text-right text-stone-100 font-black">
                {formatIDR(totalDebit)}
              </td>
              <td className="py-2.5 px-3 text-right text-[#A57C50] font-black">
                {formatIDR(totalCredit)}
              </td>
              <td className="py-2.5 px-3 font-sans text-[10px] text-[#A57C50] font-bold">
                ✓ Balance ({formatIDR(totalDebit)})
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
