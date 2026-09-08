import React, { useState } from "react";
import {
  CheckCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  Printer,
  RefreshCw,
  Search,
} from "lucide-react";
import { formatCurrency, formatDate } from "../../../lib/format";
import type { useTreasuryController } from "../useTreasuryController";

type Props = {
  c: ReturnType<typeof useTreasuryController>;
};

export function RekapAapView({ c }: Props) {
  const { invoices, handleExportRekapAAP, refreshAll } = c;

  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState("");

  // Only paid or partially paid invoices that have been executed
  const paidInvoices = invoices.filter(
    (inv) => inv.status === "paid" || (inv.status === "partially_paid" && Number(inv.paidAmount) > 0)
  );

  const filtered = paidInvoices.filter((inv) => {
    if (siteFilter && inv.site !== siteFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        inv.invoiceNo.toLowerCase().includes(q) ||
        inv.poNo.toLowerCase().includes(q) ||
        (inv.vendor?.name && inv.vendor.name.toLowerCase().includes(q)) ||
        (inv.taxInvoiceNo && inv.taxInvoiceNo.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalReconciledAmount = filtered.reduce(
    (sum, inv) => sum + Number(inv.paidAmount || 0),
    0
  );

  return (
    <div className="space-y-4">
      {/* 1. Header Banner */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" /> REKAP AAP 2026 - Master Realisasi &amp; Jurnal Audit
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Tabel ini berisi seluruh tagihan yang telah tervalidasi lunas oleh mutasi bank. Kolom <strong>Nomor RAB</strong> berfungsi
            sebagai nomor bukti fisik pengarsipan ordner bagi tim Accounting dan pemeriksaan auditor.
          </p>
        </div>

        <button
          onClick={() => handleExportRekapAAP()}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition cursor-pointer"
        >
          <Download className="w-4 h-4" /> Download REKAP AAP (.xlsx)
        </button>
      </div>

      {/* 2. Filter & Totals */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari No Invoice, PO, Vendor, FP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="">Semua Site</option>
            <option value="BGG">BGG</option>
            <option value="POS">POS</option>
            <option value="PTRO">PTRO</option>
            <option value="HO">HO</option>
          </select>

          <button
            onClick={() => refreshAll()}
            className="p-1.5 text-slate-600 hover:text-blue-600 border border-slate-300 rounded hover:bg-slate-50 transition"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="text-xs text-slate-600 font-medium">
          Total Realisasi Terbayar:{" "}
          <span className="text-emerald-700 font-bold text-sm">
            {formatCurrency(totalReconciledAmount)}
          </span>{" "}
          ({filtered.length} Tagihan)
        </div>
      </div>

      {/* 3. REKAP AAP Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="p-2.5">No</th>
                <th className="p-2.5">Vendor &amp; Site</th>
                <th className="p-2.5">No. Invoice / PO</th>
                <th className="p-2.5">No. Faktur Pajak</th>
                <th className="p-2.5">Tgl Bayar Bank</th>
                <th className="p-2.5 text-right">DPP (Subtotal)</th>
                <th className="p-2.5 text-right">PPN</th>
                <th className="p-2.5 text-right">Total Tagihan</th>
                <th className="p-2.5 text-right">Pembayaran (IDR)</th>
                <th className="p-2.5 text-right">Sisa Utang</th>
                <th className="p-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400">
                    Belum ada tagihan yang terekonsiliasi lunas.
                  </td>
                </tr>
              ) : (
                filtered.map((inv, idx) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-2.5 text-slate-400">{idx + 1}</td>

                    <td className="p-2.5">
                      <div className="font-semibold text-slate-900">{inv.vendor?.name || "-"}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">Site: {inv.site || "HO"}</div>
                    </td>

                    <td className="p-2.5 font-mono text-[11px]">
                      <div className="font-bold text-blue-700">{inv.invoiceNo}</div>
                      <div className="text-slate-500 text-[10px]">PO: {inv.poNo || "-"}</div>
                    </td>

                    <td className="p-2.5 font-mono text-[11px] text-slate-700">
                      {inv.taxInvoiceNo || <span className="text-slate-300 italic">-</span>}
                    </td>

                    <td className="p-2.5 whitespace-nowrap font-medium text-slate-800">
                      {inv.lastPaymentDate ? formatDate(inv.lastPaymentDate) : "-"}
                    </td>

                    <td className="p-2.5 text-right text-slate-700">
                      {formatCurrency(Number(inv.subtotalAmount || 0))}
                    </td>

                    <td className="p-2.5 text-right text-slate-700">
                      {formatCurrency(Number(inv.vatAmount || 0))}
                    </td>

                    <td className="p-2.5 text-right font-medium text-slate-800">
                      {formatCurrency(Number(inv.totalAmount || 0))}
                    </td>

                    <td className="p-2.5 text-right font-bold text-emerald-700 font-mono">
                      {formatCurrency(Number(inv.paidAmount || 0))}
                    </td>

                    <td className="p-2.5 text-right font-medium text-slate-800">
                      {formatCurrency(Number(inv.remainingBalance || 0))}
                    </td>

                    <td className="p-2.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          inv.status === "paid"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-cyan-100 text-cyan-800 border border-cyan-200"
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {inv.status === "paid" ? "Lunas" : "Termin / Parsial"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
