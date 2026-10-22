import React, { useRef } from "react";
import { Printer } from "lucide-react";
import { formatDate } from "../../../lib/format";
import { VOUCHER_CATEGORIES, type PaymentPlan } from "../types";

type Props = {
  plan: PaymentPlan;
  onClose: () => void;
};

const formatNumberID = (val: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val || 0);

// A separate window holds only the sheet (with the app's styles), so long documents paginate on A4 without the app shell.
export function printElement(el: HTMLElement | null, title: string, size = "A4 portrait") {
  if (!el) return;
  const w = window.open("", "_blank");
  if (!w) return alert("Pop-up diblokir browser");
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((n) => n.outerHTML)
    .join("");
  w.document.write(`<!DOCTYPE html><html><head><base href="${location.origin}/"><title>${title.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</title>${styles}
    <style>@page { size: ${size}; margin: 10mm; } body { margin: 0; background: #fff; } tr, .sig { break-inside: avoid; }</style>
    </head><body>${el.outerHTML}<script>window.onafterprint = () => window.close(); window.onload = () => document.fonts.ready.then(() => window.print());</script></body></html>`);
  w.document.close();
}

// One payment plan = one voucher sheet; every row is what this voucher pays (amountPaid), so rows sum to TOTAL.
export function VoucherPaymentOfficialPrint({ plan, onClose }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const items = plan.items || [];

  const rows = items
    .map((it) => {
      const inv = it.invoice;
      const tpo = it.tunaiPoRequest;
      const remarks = it.remarks || "";
      const isPph = !!it.accountNo && Number(it.amountPaid) < 0;
      return {
        id: it.id,
        poNo: inv?.poNo || tpo?.poNo || "",
        invoiceNo: inv?.invoiceNo || tpo?.proformaNo || "",
        taxInvoiceNo: inv?.taxInvoiceNo || "",
        coa: it.accountNo || "",
        description: inv?.itemDescription || tpo?.description || (isPph && !/^pph/i.test(remarks) ? `PPh ${remarks}` : remarks),
        amount: Number(it.amountPaid || 0),
      };
    })
    .sort((a, b) => (!a.poNo ? 1 : 0) - (!b.poNo ? 1 : 0) || a.poNo.localeCompare(b.poNo));
  const hasCoa = rows.some((r) => r.coa);

  const first = items[0];
  const vendor = first?.vendor;
  const vendorName = plan.payeeName || vendor?.name || "-";
  const bankName = plan.payeeBankName || vendor?.bankName || "-";
  const accountNumber = plan.payeeAccountNumber || vendor?.accountNumber || "-";
  const accountName = plan.payeeAccountName || vendor?.accountName || vendorName;
  const site = plan.site || first?.invoice?.site || first?.tunaiPoRequest?.site || "HO";


  const meta: [string, React.ReactNode][] = [
    ["No voucher", <span className="font-bold text-stone-900">{plan.voucherNo || "-"}</span>],
    ["Tanggal", formatDate(plan.voucherDate)],
    ["Site", <span className="font-bold uppercase text-xs text-blue-950">{site}</span>],
    ["Kategori", <span className="font-semibold uppercase">{VOUCHER_CATEGORIES[plan.category] || plan.category}</span>],
    ["Vendor", <span className="font-bold text-stone-950 uppercase">{vendorName}</span>],
    ["Bank", <span className="font-semibold uppercase">{bankName}</span>],
    ["No Rekening", <span className="font-mono font-semibold">{accountNumber}</span>],
    ["Nama Rekening", <span className="font-semibold uppercase">{accountName}</span>],
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-4 sm:p-6">
      <div className="min-h-full flex items-start justify-center py-4 sm:py-6">
        <div className="bg-white rounded-[4px] shadow-2xl border border-stone-200 w-full max-w-4xl overflow-hidden">
          <div className="sticky top-0 z-20 p-3 bg-[#1A1612] text-white border-b border-amber-900/30 shadow-sm flex items-center justify-between">
            <div className="text-xs font-bold">VOUCHER PAYMENT {plan.voucherNo}</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => printElement(sheetRef.current, plan.voucherNo)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#A57C50] hover:bg-[#8e6941] rounded-[3px] shadow-sm transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak
              </button>
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-semibold text-stone-300 hover:text-white hover:bg-stone-800 rounded-[3px] transition cursor-pointer"
              >
                ✕ Tutup
              </button>
            </div>
          </div>

          <div ref={sheetRef} className="p-8 sm:p-10 font-sans text-stone-900 print:p-0 text-[11px] leading-tight space-y-5 bg-white">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 text-[#8C6D3F] flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-9 h-9 fill-current">
                    <g transform="translate(50,50)">
                      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                        <path key={i} d="M -6,-28 L 6,-28 L 8,-10 L -8,-10 Z" transform={`rotate(${angle})`} />
                      ))}
                    </g>
                  </svg>
                </div>
                <span className="text-xl font-bold tracking-[0.25em] text-[#2D2A26] uppercase">ANDALAN</span>
              </div>
              <div className="text-center pt-2">
                <h1 className="text-base font-black tracking-wider uppercase text-black">VOUCHER PAYMENT</h1>
              </div>
            </div>

            <div className="space-y-1 text-[11px] font-sans pt-1">
              {meta.map(([label, value]) => (
                <div key={label} className="grid grid-cols-[120px_12px_1fr] items-center">
                  <span className="text-stone-800 font-medium">{label}</span>
                  <span>:</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <table className="w-full table-fixed text-left text-[10px] border-collapse border-2 border-black">
                <thead>
                  <tr className="border-b-2 border-black font-bold uppercase text-center text-black bg-stone-50 print:bg-transparent">
                    <th className="border-r border-black p-1.5 w-8">NO</th>
                    {hasCoa && <th className="border-r border-black p-1.5 w-24">COA</th>}
                    <th className="border-r border-black p-1.5 w-28">NO PO</th>
                    <th className="border-r border-black p-1.5 w-32">NO INVOICE</th>
                    <th className="border-r border-black p-1.5 text-left pl-2">KETERANGAN</th>
                    <th className="p-1.5 w-28 text-right pr-2">NOMINAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/80">
                  {rows.map((r, idx) => (
                    <tr key={r.id || idx} className="align-top">
                      <td className="border-r border-black p-1.5 text-center font-medium">{idx + 1}</td>
                      {hasCoa && <td className="border-r border-black p-1.5 font-mono text-[9.5px]">{r.coa || "-"}</td>}
                      <td className="border-r border-black p-1.5 text-center font-mono font-medium break-all text-[9.5px]">
                        {r.poNo && r.poNo === rows[idx - 1]?.poNo ? "" : r.poNo || "-"}
                      </td>
                      <td className="border-r border-black p-1.5 font-mono break-all text-[9.5px]">
                        {r.invoiceNo || "-"}
                        {r.taxInvoiceNo && <div className="text-[8.5px] text-stone-600">FP: {r.taxInvoiceNo}</div>}
                      </td>
                      <td className="border-r border-black p-1.5 uppercase leading-tight break-words text-[9.5px] pl-2">
                        {r.description || "-"}
                      </td>
                      <td className="p-1.5 text-right font-mono font-semibold pr-2 whitespace-nowrap text-[9.5px]">
                        {formatNumberID(r.amount)}
                      </td>
                    </tr>
                  ))}
                  {rows.length < 5 &&
                    Array.from({ length: 5 - rows.length }).map((_, i) => (
                      <tr key={`empty-${i}`} className="h-6">
                        <td className="border-r border-black p-1.5"></td>
                        {hasCoa && <td className="border-r border-black p-1.5"></td>}
                        <td className="border-r border-black p-1.5"></td>
                        <td className="border-r border-black p-1.5"></td>
                        <td className="border-r border-black p-1.5"></td>
                        <td className="p-1.5"></td>
                      </tr>
                    ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-black font-bold">
                    <td colSpan={hasCoa ? 5 : 4} className="border-r border-black p-1.5 text-center font-bold tracking-wider">
                      TOTAL
                    </td>
                    <td className="p-1.5 text-right font-mono font-bold pr-2">{formatNumberID(Number(plan.totalAmount || 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="sig pt-10 grid grid-cols-3 text-center text-[11px] font-sans">
              <div>
                <p className="font-semibold text-stone-900 mb-16">Disiapkan oleh</p>
                <p className="font-bold underline text-stone-950">Lian Li</p>
                <p className="text-stone-700 text-[10px]">Supt Finance</p>
              </div>
              <div>
                <p className="font-semibold text-stone-900 mb-16">Diperiksa oleh</p>
                <p className="font-bold underline text-stone-950">M. Axel Valentino</p>
                <p className="text-stone-700 text-[10px]">Manager FATB</p>
              </div>
              <div>
                <p className="font-semibold text-stone-900 mb-16">Disetujui oleh</p>
                <p className="font-bold underline text-stone-950">Gahari Christine</p>
                <p className="text-stone-700 text-[10px]">Direktur Utama</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
