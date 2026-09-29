import React, { useState } from "react";
import { Layers, Printer, X } from "lucide-react";
import type { TreasuryInvoice, TreasuryVendor } from "../types";

export interface VoucherPrintItem {
  voucherNo: string;
  voucherDate: string;
  site: string;
  category: string;
  vendor: TreasuryVendor | { name: string; bankName?: string; accountNumber?: string; accountName?: string };
  invoices: TreasuryInvoice[];
  totalAmount?: number;
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  voucherData?: VoucherPrintItem | null;
  vouchers?: VoucherPrintItem[] | null;
};

export function VoucherPaymentOfficialPrint({ isOpen, onClose, voucherData, vouchers: vouchersProp }: Props) {
  if (!isOpen) return null;

  // Normalize to array of vouchers
  let vouchers: VoucherPrintItem[] = [];
  if (vouchersProp && Array.isArray(vouchersProp) && vouchersProp.length > 0) {
    vouchers = vouchersProp;
  } else if ((voucherData as any)?.vouchers && Array.isArray((voucherData as any).vouchers)) {
    vouchers = (voucherData as any).vouchers;
  } else if (voucherData) {
    vouchers = [voucherData as VoucherPrintItem];
  }

  if (vouchers.length === 0) return null;

  const [activeIndex, setActiveIndex] = useState(0);
  const [printAll, setPrintAll] = useState(false);

  const activeVoucher = vouchers[activeIndex] || vouchers[0];

  const formatNumberID = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const handlePrintCurrent = () => {
    setPrintAll(false);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handlePrintAll = () => {
    setPrintAll(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const renderSingleVoucherSheet = (v: VoucherPrintItem, isPageBreak = false) => {
    const invoices = Array.isArray(v?.invoices) ? v.invoices : [];
    const totalAmount = v?.totalAmount !== undefined
      ? v.totalAmount
      : invoices.reduce((sum, inv) => sum + Number(inv?.totalAmount || inv?.remainingBalance || 0), 0);
    const vendor = v?.vendor || { name: "VENDOR" };

    return (
      <div
        key={`${v.voucherNo || "V"}-${v.site || "HO"}-${vendor.name || "V"}`}
        className={`p-8 sm:p-10 font-sans text-stone-900 print:p-6 text-[11px] leading-tight space-y-5 max-w-full print:max-w-none bg-white ${
          isPageBreak ? "print:break-after-page print:page-break-after-always" : ""
        }`}
        style={isPageBreak ? { pageBreakAfter: "always", breakAfter: "page" } : undefined}
      >
        {/* Header with ANDALAN Logo and Document Title */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {/* ANDALAN Brand Icon */}
            <div className="w-9 h-9 text-[#8C6D3F] flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-9 h-9 fill-current">
                {/* 8-petal geometric emblem */}
                <g transform="translate(50,50)">
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                    <path
                      key={i}
                      d="M -6,-28 L 6,-28 L 8,-10 L -8,-10 Z"
                      transform={`rotate(${angle})`}
                    />
                  ))}
                </g>
              </svg>
            </div>
            <span className="text-xl font-bold tracking-[0.25em] text-[#2D2A26] uppercase">
              ANDALAN
            </span>
          </div>

          <div className="text-center pt-2">
            <h1 className="text-base font-black tracking-wider uppercase text-black">
              VOUCHER PAYMENT
            </h1>
          </div>
        </div>

        {/* Metadata Section (Strictly per Site & per Vendor) */}
        <div className="space-y-1 text-[11px] font-sans pt-1">
          <div className="grid grid-cols-[120px_12px_1fr] items-center">
            <span className="text-stone-800 font-medium">No voucher</span>
            <span>:</span>
            <span className="font-bold text-stone-900">{v.voucherNo || "-"}</span>
          </div>
          <div className="grid grid-cols-[120px_12px_1fr] items-center">
            <span className="text-stone-800 font-medium">Tanggal</span>
            <span>:</span>
            <span>{v.voucherDate}</span>
          </div>
          <div className="grid grid-cols-[120px_12px_1fr] items-center">
            <span className="text-stone-800 font-medium">Site</span>
            <span>:</span>
            <span className="font-bold text-stone-950 uppercase text-xs text-blue-950">{v.site}</span>
          </div>
          <div className="grid grid-cols-[120px_12px_1fr] items-center">
            <span className="text-stone-800 font-medium">Kategori</span>
            <span>:</span>
            <span className="font-semibold uppercase">{v.category || "ACCOUNT PAYABLE (AP)"}</span>
          </div>
          <div className="grid grid-cols-[120px_12px_1fr] items-center">
            <span className="text-stone-800 font-medium">Vendor</span>
            <span>:</span>
            <span className="font-bold text-stone-950 uppercase">{vendor.name || "-"}</span>
          </div>
          <div className="grid grid-cols-[120px_12px_1fr] items-center">
            <span className="text-stone-800 font-medium">Bank</span>
            <span>:</span>
            <span className="font-semibold uppercase">{vendor.bankName || "-"}</span>
          </div>
          <div className="grid grid-cols-[120px_12px_1fr] items-center">
            <span className="text-stone-800 font-medium">No Rekening</span>
            <span>:</span>
            <span className="font-mono font-semibold">{vendor.accountNumber || "-"}</span>
          </div>
          <div className="grid grid-cols-[120px_12px_1fr] items-center">
            <span className="text-stone-800 font-medium">Nama Rekening</span>
            <span>:</span>
            <span className="font-semibold uppercase">{vendor.accountName || vendor.name || "-"}</span>
          </div>
        </div>

        {/* Table Grid (Solid Black Borders, table-fixed to prevent clipping) */}
        <div className="pt-2 overflow-x-auto">
          <table className="w-full table-fixed text-left text-[10px] border-collapse border-2 border-black">
            <thead>
              <tr className="border-b-2 border-black font-bold uppercase text-center text-black bg-stone-50 print:bg-transparent">
                <th className="border-r border-black p-1.5 w-8">NO</th>
                <th className="border-r border-black p-1.5 w-24">COA</th>
                <th className="border-r border-black p-1.5 w-[46%] text-left pl-2">KETERANGAN</th>
                <th className="border-r border-black p-1.5 w-28">NO PO</th>
                <th className="p-1.5 w-28 text-right pr-2">NOMINAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/80">
              {invoices.map((inv, idx) => {
                const nominal = Number(inv.totalAmount || inv.remainingBalance || 0);
                return (
                  <tr key={inv.id || idx} className="align-top">
                    <td className="border-r border-black p-1.5 text-center font-medium">
                      {idx + 1}
                    </td>
                    <td className="border-r border-black p-1.5 font-medium uppercase truncate text-[9.5px]">
                      {inv.coaName || "HUTANG USAHA"}
                    </td>
                    <td className="border-r border-black p-1.5 font-normal uppercase leading-tight break-words text-[9.5px] pl-2">
                      {inv.itemDescription || "PEMBAYARAN TAGIHAN / INVOICE"}
                    </td>
                    <td className="border-r border-black p-1.5 text-center font-mono font-medium break-all text-[9.5px]">
                      {inv.poNo || "-"}
                    </td>
                    <td className="p-1.5 text-right font-mono font-semibold pr-2 whitespace-nowrap text-[9.5px]">
                      {formatNumberID(nominal)}
                    </td>
                  </tr>
                );
              })}

              {/* Empty buffer rows to maintain format spacing if few rows */}
              {invoices.length < 5 &&
                Array.from({ length: 5 - invoices.length }).map((_, i) => (
                  <tr key={`empty-${i}`} className="h-6">
                    <td className="border-r border-black p-1.5"></td>
                    <td className="border-r border-black p-1.5"></td>
                    <td className="border-r border-black p-1.5"></td>
                    <td className="border-r border-black p-1.5"></td>
                    <td className="p-1.5"></td>
                  </tr>
                ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black font-bold">
                <td
                  colSpan={4}
                  className="border-r border-black p-1.5 text-center font-bold tracking-wider"
                >
                  TOTAL ({v.site})
                </td>
                <td className="p-1.5 text-right font-mono font-bold pr-2">
                  {formatNumberID(totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 3-Column Authorization Block */}
        <div className="pt-10 grid grid-cols-3 text-center text-[11px] font-sans">
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
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-4 sm:p-6 print:p-0 print:bg-white print:overflow-visible">
      <div className="min-h-full flex items-start justify-center py-4 sm:py-6 print:py-0">
        <div className="bg-white rounded-[4px] shadow-2xl border border-stone-200 w-full max-w-4xl overflow-hidden print:shadow-none print:border-none print:w-full print:max-w-none">
          {/* Top Control Bar (Sticky on Screen) */}
          <div className="sticky top-0 z-20 p-3 bg-[#1A1612] text-white print:hidden border-b border-amber-900/30 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold flex items-center gap-2">
                <span className="text-[#A57C50]">Dokumen Resmi:</span>
                <span>
                  VOUCHER PAYMENT ({vouchers.length} Bundle Site)
                </span>
              </div>
              <div className="flex items-center gap-2">
                {vouchers.length > 1 && (
                  <button
                    onClick={handlePrintAll}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-stone-200 bg-stone-800 hover:bg-stone-700 rounded-[3px] shadow-sm transition cursor-pointer border border-stone-700"
                    title="Cetak Seluruh Voucher Site Sekaligus (A4 Per Site)"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#A57C50]" /> Cetak Semua ({vouchers.length} Site)
                  </button>
                )}
                <button
                  onClick={handlePrintCurrent}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#A57C50] hover:bg-[#8e6941] rounded-[3px] shadow-sm transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak Voucher Ini ({activeVoucher.site})
                </button>
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs font-semibold text-stone-300 hover:text-white hover:bg-stone-800 rounded-[3px] transition cursor-pointer"
                >
                  ✕ Tutup
                </button>
              </div>
            </div>

            {/* Multi-Site Selector Tabs (if plan spans across multiple sites/vendors) */}
            {vouchers.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-stone-800">
                <span className="text-[10px] text-stone-400 font-semibold uppercase shrink-0">Pilih Site:</span>
                {vouchers.map((v, idx) => {
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={`${v.site || "site"}-${idx}`}
                      onClick={() => setActiveIndex(idx)}
                      className={`px-2.5 py-1 rounded-[3px] text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
                        isActive
                          ? "bg-[#A57C50] text-white shadow-2xs"
                          : "bg-stone-800 text-stone-300 hover:bg-stone-700"
                      }`}
                    >
                      Site {v.site || "HO"} ({(v.invoices || []).length} PO — Rp {formatNumberID(v.totalAmount || 0)})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Printable Document Body: Single Active on Screen, or All if printAll is clicked */}
          <div className="divide-y-2 divide-dashed divide-stone-300 print:divide-none">
            {printAll
              ? vouchers.map((v, idx) => renderSingleVoucherSheet(v, idx < vouchers.length - 1))
              : renderSingleVoucherSheet(activeVoucher, false)}
          </div>
        </div>
      </div>
    </div>
  );
}
