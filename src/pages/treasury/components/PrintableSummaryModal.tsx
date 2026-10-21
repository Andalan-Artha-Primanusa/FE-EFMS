import React from "react";
import { Printer } from "lucide-react";
import { formatCurrency, formatDate } from "../../../lib/format";
import { VOUCHER_CATEGORIES, type PaymentPlan } from "../types";

type Props = {
  plans: PaymentPlan[];
  onClose: () => void;
};

// Payee of a voucher: the typed-in payee (non-PO) or the vendor(s) of its items.
const payeeOf = (p: PaymentPlan) => {
  if (p.payeeName) {
    return { name: p.payeeName, bank: `${p.payeeBankName || ""} ${p.payeeAccountNumber || ""}`.trim() };
  }
  const v = p.items?.find((i) => i.vendor)?.vendor;
  const names = [...new Set((p.items || []).map((i) => i.vendor?.name).filter(Boolean))];
  return { name: names.join(", ") || "-", bank: v ? `${v.bankName || ""} ${v.accountNumber || ""}`.trim() : "" };
};

const siteOf = (p: PaymentPlan) => p.site || p.items?.map((i) => i.invoice?.site || i.tunaiPoRequest?.site).find(Boolean) || "HO";

// Summary Payment: the selected vouchers on one sheet, signed as the reference for director approval.
export function PrintableSummaryModal({ plans, onClose }: Props) {
  const total = plans.reduce((s, p) => s + Number(p.totalAmount || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-5xl my-8 overflow-hidden print:shadow-none print:border-none print:w-full print:max-w-none print:my-0">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="text-sm font-bold text-slate-800">Summary Payment</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-md transition cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Cetak
            </button>
            <button onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded">
              ✕ Tutup
            </button>
          </div>
        </div>

        <div className="p-8 space-y-6 text-slate-900 font-sans print:p-4 text-xs">
          <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4">
            <div>
              <h1 className="text-base font-black tracking-wider uppercase">PT ANDALAN ARTHA PRIMANUSA</h1>
              <p className="text-[11px] text-slate-600 font-medium">SUMMARY PAYMENT</p>
            </div>
            <div className="text-right font-mono text-[11px] text-slate-500">
              <div>Tanggal: {formatDate(new Date().toISOString())}</div>
              <div>{plans.length} Voucher</div>
            </div>
          </div>

          <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                <th className="p-2 border-r border-slate-300 w-8 text-center">NO</th>
                <th className="p-2 border-r border-slate-300">NO. VOUCHER</th>
                <th className="p-2 border-r border-slate-300">TANGGAL</th>
                <th className="p-2 border-r border-slate-300">KATEGORI</th>
                <th className="p-2 border-r border-slate-300">SITE</th>
                <th className="p-2 border-r border-slate-300">PENERIMA &amp; REKENING</th>
                <th className="p-2 border-r border-slate-300">KETERANGAN</th>
                <th className="p-2 text-right">NOMINAL (RP)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {plans.map((p, idx) => {
                const payee = payeeOf(p);
                return (
                  <tr key={p.id}>
                    <td className="p-2 border-r border-slate-300 text-center">{idx + 1}</td>
                    <td className="p-2 border-r border-slate-300 font-mono font-bold whitespace-nowrap">{p.voucherNo}</td>
                    <td className="p-2 border-r border-slate-300 whitespace-nowrap">{formatDate(p.voucherDate)}</td>
                    <td className="p-2 border-r border-slate-300">{VOUCHER_CATEGORIES[p.category] || p.category}</td>
                    <td className="p-2 border-r border-slate-300">{siteOf(p)}</td>
                    <td className="p-2 border-r border-slate-300">
                      <div className="font-bold">{payee.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{payee.bank}</div>
                    </td>
                    <td className="p-2 border-r border-slate-300 text-[10px]">{p.justification || "-"}</td>
                    <td className="p-2 text-right font-mono font-bold whitespace-nowrap">{formatCurrency(Number(p.totalAmount))}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-800 text-xs">
                <td colSpan={7} className="p-2.5 text-right border-r border-slate-300">
                  TOTAL
                </td>
                <td className="p-2.5 text-right font-mono text-sm text-blue-900 whitespace-nowrap">{formatCurrency(total)}</td>
              </tr>
            </tfoot>
          </table>

          <div className="pt-4 grid grid-cols-4 gap-4 text-center border-t border-slate-300">
            {[
              ["Dibuat Oleh,", "Admin Finance"],
              ["Diperiksa Oleh,", "Manager FATB"],
              ["Disetujui Oleh,", "Direktur"],
              ["Mengetahui,", "Komisaris"],
            ].map(([label, role]) => (
              <div key={label} className="border border-slate-300 rounded p-2 flex flex-col justify-between h-28">
                <div className="text-[10px] font-bold uppercase text-slate-600">{label}</div>
                <div className="border-b border-slate-400 w-3/4 mx-auto mt-8"></div>
                <div className="text-[10px] font-semibold text-slate-800">{role}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
