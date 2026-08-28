import React from "react";
import { Printer, X } from "lucide-react";
import { formatCurrency, formatDate } from "../../../lib/format";
import type { PaymentPlan } from "../types";

type Props = {
  plan: PaymentPlan | null;
  onClose: () => void;
};

export function PrintableSummaryModal({ plan, onClose }: Props) {
  if (!plan) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-5xl my-8 overflow-hidden print:shadow-none print:border-none print:w-full print:max-w-none print:my-0">
        {/* Modal Top Actions (Hidden when printing) */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="text-sm font-bold text-slate-800">
            Preview Lembar Summary Pengajuan RAB (Siap Cetak A4)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-md transition cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Cetak / Print Dokumen
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded"
            >
              ✕ Tutup
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 space-y-6 text-slate-900 font-sans print:p-4 text-xs">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4">
            <div>
              <h1 className="text-base font-black tracking-wider uppercase">PT ANDALAN ARTHA PRIMANUSA</h1>
              <p className="text-[11px] text-slate-600 font-medium">
                SUMMARY PENGAJUAN PEMBAYARAN VOUCHER (RAB)
              </p>
            </div>
            <div className="text-right font-mono text-[11px]">
              <div className="font-bold text-sm text-blue-900">{plan.voucherNo}</div>
              <div className="text-slate-500">Tanggal: {formatDate(plan.voucherDate)}</div>
              <div className="text-slate-500 font-semibold">
                Bank: {plan.companyBank?.bankName} ({plan.companyBank?.accountNumber})
              </div>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded text-[11px]">
            <div>
              <span className="text-slate-500 font-semibold">Kategori:</span>{" "}
              <span className="font-bold">{plan.category}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold">Dibuat Oleh:</span>{" "}
              <span className="font-bold">{plan.makerName || "Admin Finance"}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold">Justifikasi:</span>{" "}
              <span>{plan.justification || "Reguler Sesuai Aging"}</span>
            </div>
          </div>

          {/* Item Table */}
          <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                <th className="p-2 border-r border-slate-300 w-8 text-center">NO</th>
                <th className="p-2 border-r border-slate-300">VENDOR &amp; BANK</th>
                <th className="p-2 border-r border-slate-300">NO. PO / INVOICE</th>
                <th className="p-2 border-r border-slate-300">DESKRIPSI / KEPERLUAN</th>
                <th className="p-2 border-r border-slate-300 text-right">TOTAL TAGIHAN</th>
                <th className="p-2 border-slate-300 text-right">NOMINAL BAYAR (RP)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {plan.items?.map((item, idx) => (
                <tr key={item.id}>
                  <td className="p-2 border-r border-slate-300 text-center font-medium">{idx + 1}</td>
                  <td className="p-2 border-r border-slate-300">
                    <div className="font-bold">{item.vendor?.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {item.vendor?.bankName} - {item.vendor?.accountNumber} ({item.vendor?.accountName})
                    </div>
                  </td>
                  <td className="p-2 border-r border-slate-300 font-mono text-[10px]">
                    <div>PO: {item.invoice?.poNo || "-"}</div>
                    <div className="text-slate-500">Inv: {item.invoice?.invoiceNo || "-"}</div>
                  </td>
                  <td className="p-2 border-r border-slate-300 text-[10px]">{item.remarks || item.invoice?.itemDescription || "-"}</td>
                  <td className="p-2 border-r border-slate-300 text-right font-mono">
                    {formatCurrency(Number(item.invoice?.totalAmount || item.amountPaid))}
                  </td>
                  <td className="p-2 text-right font-mono font-bold">
                    {formatCurrency(Number(item.amountPaid))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-800 text-xs">
                <td colSpan={5} className="p-2.5 text-right border-r border-slate-300">
                  GRAND TOTAL PENGAJUAN:
                </td>
                <td className="p-2.5 text-right font-mono text-sm text-blue-900">
                  {formatCurrency(Number(plan.totalAmount))}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Official 4 Signature Boxes */}
          <div className="pt-4 grid grid-cols-4 gap-4 text-center border-t border-slate-300">
            {/* Box 1 */}
            <div className="border border-slate-300 rounded p-2 flex flex-col justify-between h-28">
              <div className="text-[10px] font-bold uppercase text-slate-600">Dibuat Oleh,</div>
              <div className="border-b border-slate-400 w-3/4 mx-auto mt-8"></div>
              <div className="text-[10px] font-semibold text-slate-800">Admin Finance</div>
            </div>

            {/* Box 2 */}
            <div className="border border-slate-300 rounded p-2 flex flex-col justify-between h-28">
              <div className="text-[10px] font-bold uppercase text-slate-600">Diperiksa Oleh,</div>
              <div className="border-b border-slate-400 w-3/4 mx-auto mt-8"></div>
              <div className="text-[10px] font-semibold text-slate-800">Manager FATB</div>
            </div>

            {/* Box 3 */}
            <div className="border border-slate-300 rounded p-2 flex flex-col justify-between h-28">
              <div className="text-[10px] font-bold uppercase text-slate-600">Disetujui Oleh,</div>
              <div className="border-b border-slate-400 w-3/4 mx-auto mt-8"></div>
              <div className="text-[10px] font-semibold text-slate-800">Direktur</div>
            </div>

            {/* Box 4 */}
            <div className="border border-slate-300 rounded p-2 flex flex-col justify-between h-28">
              <div className="text-[10px] font-bold uppercase text-slate-600">Mengetahui,</div>
              <div className="border-b border-slate-400 w-3/4 mx-auto mt-8"></div>
              <div className="text-[10px] font-semibold text-slate-800">Komisaris</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
