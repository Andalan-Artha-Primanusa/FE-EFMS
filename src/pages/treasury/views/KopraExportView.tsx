import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  HelpCircle,
  Info,
  Layers,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { formatCurrency, formatDate } from "../../../lib/format";
import type { useTreasuryController } from "../useTreasuryController";

type Props = {
  c: ReturnType<typeof useTreasuryController>;
};

export function KopraExportView({ c }: Props) {
  const navigate = useNavigate();
  const { plans, handleExportKopra } = c;

  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  // Filter only approved or exported plans
  const exportablePlans = plans.filter(
    (p) => p.status === "approved" || p.status === "exported"
  );

  const currentPlan =
    exportablePlans.find((p) => p.id === selectedPlanId) ||
    exportablePlans[0] ||
    null;

  // Group items by vendor to validate and preview Kopra consolidated rows
  interface VendorTransferGroup {
    vendorId: number;
    vendorName: string;
    email: string;
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    totalAmount: number;
    pos: string[];
    invs: string[];
    isValid: boolean;
    invalidReason?: string;
  }

  const groupedTransfers: VendorTransferGroup[] = [];
  let hasInvalidVendor = false;

  if (currentPlan && currentPlan.items) {
    const map = new Map<number, VendorTransferGroup>();

    currentPlan.items.forEach((item) => {
      const v = item.vendor;
      if (!v) return;

      let grp = map.get(v.id);
      if (!grp) {
        // Validate vendor bank details
        let valid = true;
        let reason = "";
        if (!v.accountNumber || v.accountNumber.trim() === "") {
          valid = false;
          reason = "Nomor rekening kosong";
        } else if (!v.bankName || v.bankName.trim() === "") {
          valid = false;
          reason = "Nama bank kosong";
        } else if (!v.accountName || v.accountName.trim() === "") {
          valid = false;
          reason = "Nama pemilik rekening kosong";
        }

        if (!valid) hasInvalidVendor = true;

        grp = {
          vendorId: v.id,
          vendorName: v.name,
          email: v.email || "",
          bankName: v.bankName || "",
          bankCode: v.bankCode || "BMRIIDJA",
          accountNumber: v.accountNumber || "",
          accountName: v.accountName || "",
          totalAmount: 0,
          pos: [],
          invs: [],
          isValid: valid,
          invalidReason: reason,
        };
        map.set(v.id, grp);
      }

      grp.totalAmount += Number(item.amountPaid || 0);
      if (item.invoice?.poNo) grp.pos.push(item.invoice.poNo);
      if (item.invoice?.invoiceNo) grp.invs.push(item.invoice.invoiceNo);
    });

    map.forEach((val) => groupedTransfers.push(val));
  }

  return (
    <div className="space-y-4">
      {/* 1. Header Guide */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-4 rounded-lg shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-300" /> Export Mass Transfer Kopra Mandiri
          </h2>
          <p className="text-xs text-blue-200 mt-1 max-w-2xl">
            Sistem mengkonsolidasi banyak tagihan per vendor menjadi 1 baris transfer, menginjeksi
            format Reference (<code>0128/12244+7</code>), Remark PO lengkap, dan email notifikasi resmi vendor (Kolom L).
          </p>
        </div>

        {currentPlan && (
          <button
            disabled={hasInvalidVendor}
            onClick={() => handleExportKopra(currentPlan.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded shadow-md transition ${
              hasInvalidVendor
                ? "bg-slate-500/50 text-slate-300 cursor-not-allowed"
                : "bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer"
            }`}
          >
            <Download className="w-4 h-4" /> Download Format Kopra (.xlsx)
          </button>
        )}
      </div>

      {/* 2. Voucher Selector & Status */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-700">Pilih Voucher Siap Transfer:</label>
          <select
            value={currentPlan?.id || ""}
            onChange={(e) => setSelectedPlanId(Number(e.target.value))}
            className="text-xs border border-slate-300 rounded px-3 py-1.5 bg-white font-mono font-semibold text-blue-700 focus:ring-1 focus:ring-blue-500"
          >
            {exportablePlans.length === 0 ? (
              <option value="">Tidak ada voucher yang sudah di-approve</option>
            ) : (
              exportablePlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.voucherNo} - {p.companyBank?.bankName} ({formatCurrency(Number(p.totalAmount))})
                </option>
              ))
            )}
          </select>
        </div>

        {hasInvalidVendor && (
          <div className="inline-flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 px-2.5 py-1 rounded border border-rose-200 font-medium">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            Ada rekening vendor yang belum lengkap. Lengkapi di Master Data ➔ Vendor sebelum export!
          </div>
        )}
      </div>

      {/* 3. Transfer Preview Table (What goes into Kopra Excel) */}
      {currentPlan ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden space-y-2">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="text-xs font-bold text-slate-800">
              Preview Baris Transfer ({groupedTransfers.length} Transaksi Transfer)
            </div>
            <div className="text-xs text-slate-500 font-mono">
              Debet: {currentPlan.companyBank?.bankName} ({currentPlan.companyBank?.accountNumber})
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-600 font-semibold uppercase">
                  <th className="p-2.5">No</th>
                  <th className="p-2.5">Metode Transfer</th>
                  <th className="p-2.5">Rekening Tujuan</th>
                  <th className="p-2.5">Nama Vendor (Beneficiary)</th>
                  <th className="p-2.5 text-right">Nominal Transfer (IDR)</th>
                  <th className="p-2.5">Transaction Ref (Max 19)</th>
                  <th className="p-2.5">Remark PO (Max 200)</th>
                  <th className="p-2.5">Email Vendor (Kolom L)</th>
                  <th className="p-2.5 text-center">Status Validasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {groupedTransfers.map((t, idx) => {
                  const isMandiri = t.bankName.toUpperCase().includes("MANDIRI");
                  const method = isMandiri ? "In-House" : t.totalAmount <= 250000000 ? "BI FAST" : "RTGS";

                  // Reference No Logic
                  let refNo = `${String(currentPlan.voucherSeq).padStart(4, "0")}`;
                  if (t.pos.length === 1) {
                    refNo = `${refNo}/${t.pos[0]}`;
                    if (refNo.length > 19) refNo = refNo.slice(0, 19);
                  } else if (t.pos.length > 1) {
                    refNo = `${refNo}/${t.pos[0]}+${t.pos.length - 1}`;
                    if (refNo.length > 19) refNo = `${String(currentPlan.voucherSeq).padStart(4, "0")}/${t.pos.length}PO`;
                  }

                  const remark = `VCH ${String(currentPlan.voucherSeq).padStart(4, "0")} ${t.vendorName} - PO: ${t.pos.join(", ")}`;

                  return (
                    <tr key={t.vendorId} className="hover:bg-slate-50 transition">
                      <td className="p-2.5 text-slate-400 font-sans">{idx + 1}</td>
                      <td className="p-2.5 font-sans">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            method === "In-House"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {method}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <div className="font-bold text-slate-800">{t.accountNumber || "-"}</div>
                        <div className="text-[10px] text-slate-500 font-sans">{t.bankName}</div>
                      </td>
                      <td className="p-2.5 font-sans font-medium text-slate-900">
                        {t.accountName || t.vendorName}
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-900 text-xs">
                        {formatCurrency(t.totalAmount)}
                      </td>
                      <td className="p-2.5 text-blue-700 font-bold">{refNo}</td>
                      <td className="p-2.5 text-slate-600 max-w-xs truncate" title={remark}>
                        {remark}
                      </td>
                      <td className="p-2.5 text-slate-500 text-[10px] truncate max-w-[150px]">
                        {t.email || <span className="text-slate-300 italic">tidak ada email</span>}
                      </td>
                      <td className="p-2.5 text-center font-sans">
                        {t.isValid ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                            <CheckCircle2 className="w-3 h-3" /> Valid
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-semibold cursor-pointer hover:bg-rose-100"
                            onClick={() => navigate("/vendor")}
                            title={`${t.invalidReason} - Klik untuk buka Master Data Vendor`}
                          >
                            <AlertCircle className="w-3 h-3" /> {t.invalidReason}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 text-center rounded-lg border border-slate-200 shadow-sm text-slate-400">
          Belum ada voucher berstatus <strong>Approved</strong> yang siap di-export ke format Kopra Mandiri.
        </div>
      )}
    </div>
  );
}
