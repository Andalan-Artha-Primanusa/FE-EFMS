import React from "react";
import { Printer, X } from "lucide-react";
import { formatCurrency, formatDate } from "../../../lib/format";
import type { PaymentPlan, TreasuryVendor } from "../types";

type Props = {
  data: { plan: PaymentPlan; vendor: TreasuryVendor } | null;
  onClose: () => void;
};

export function PrintableVendorSlipModal({ data, onClose }: Props) {
  if (!data) return null;

  const { plan, vendor } = data;
  const vendorItems = plan.items?.filter((i) => i.vendorId === vendor.id) || [];
  const totalVendorAmount = vendorItems.reduce(
    (sum, i) => sum + Number(i.amountPaid || 0),
    0
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-3xl my-8 overflow-hidden print:shadow-none print:border-none print:w-full print:max-w-none print:my-0">
        {/* Modal Top Actions */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="text-sm font-bold text-slate-800">
            Preview Slip Cover Fisik Vendor: {vendor.name}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-md transition cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Cetak Slip Cover
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded"
            >
              ✕ Tutup
            </button>
          </div>
        </div>

        {/* Printable Slip Body */}
        <div className="p-8 space-y-6 text-slate-900 font-sans print:p-4 text-xs">
          <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4">
            <div>
              <h1 className="text-sm font-black tracking-wider uppercase">PT ANDALAN ARTHA PRIMANUSA</h1>
              <p className="text-[11px] text-slate-600 font-medium">SLIP PEMBAYARAN VOUCHER (COVER BUNDEL TAGIHAN)</p>
            </div>
            <div className="text-right font-mono text-[11px]">
              <div className="font-bold text-sm text-blue-900">{plan.voucherNo}</div>
              <div className="text-slate-500">Tanggal: {formatDate(plan.voucherDate)}</div>
            </div>
          </div>

          {/* Vendor Details */}
          <div className="p-3 bg-slate-50 border border-slate-300 rounded space-y-1 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500 font-medium">Nama Vendor:</span>{" "}
                <span className="font-bold text-slate-900">{vendor.name}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Bank Tujuan:</span>{" "}
                <span className="font-bold">{vendor.bankName || "MANDIRI"}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500 font-medium">No. Rekening:</span>{" "}
                <span className="font-mono font-bold text-blue-700">{vendor.accountNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Nama Rekening:</span>{" "}
                <span>{vendor.accountName || vendor.name}</span>
              </div>
            </div>
          </div>

          {/* Invoice Lines Table */}
          <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                <th className="p-2 border-r border-slate-300 w-8 text-center">NO</th>
                <th className="p-2 border-r border-slate-300">NO. PO</th>
                <th className="p-2 border-r border-slate-300">NO. INVOICE</th>
                <th className="p-2 border-r border-slate-300">NO. FAKTUR PAJAK</th>
                <th className="p-2 border-r border-slate-300">DESKRIPSI BARANG</th>
                <th className="p-2 border-slate-300 text-right">JUMLAH DIBAYAR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {vendorItems.map((item, idx) => (
                <tr key={item.id}>
                  <td className="p-2 border-r border-slate-300 text-center">{idx + 1}</td>
                  <td className="p-2 border-r border-slate-300 font-mono">{item.invoice?.poNo || "-"}</td>
                  <td className="p-2 border-r border-slate-300 font-mono font-semibold">{item.invoice?.invoiceNo || "-"}</td>
                  <td className="p-2 border-r border-slate-300 font-mono">{item.invoice?.taxInvoiceNo || "-"}</td>
                  <td className="p-2 border-r border-slate-300">{item.remarks || item.invoice?.itemDescription || "-"}</td>
                  <td className="p-2 border-slate-300 text-right font-mono font-bold">
                    {formatCurrency(Number(item.amountPaid))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-800 text-xs">
                <td colSpan={5} className="p-2.5 text-right border-r border-slate-300">
                  TOTAL DITRANSFER KE VENDOR:
                </td>
                <td className="p-2.5 text-right font-mono text-sm text-blue-900">
                  {formatCurrency(totalVendorAmount)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Signature Verification */}
          <div className="pt-4 grid grid-cols-2 gap-8 text-center border-t border-slate-300">
            <div className="border border-slate-300 rounded p-3 flex flex-col justify-between h-28">
              <div className="text-[10px] font-bold uppercase text-slate-600">Disiapkan Oleh (Finance),</div>
              <div className="border-b border-slate-400 w-1/2 mx-auto mt-8"></div>
              <div className="text-[10px] font-semibold text-slate-800">Admin Finance</div>
            </div>

            <div className="border border-slate-300 rounded p-3 flex flex-col justify-between h-28">
              <div className="text-[10px] font-bold uppercase text-slate-600">Diverifikasi Oleh (Accounting),</div>
              <div className="border-b border-slate-400 w-1/2 mx-auto mt-8"></div>
              <div className="text-[10px] font-semibold text-slate-800">Tim Accounting</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
