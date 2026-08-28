import React, { useState } from "react";
import {
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Landmark,
  Plus,
  Printer,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { formatCurrency, formatDate } from "../../../lib/format";
import type { useTreasuryController } from "../useTreasuryController";
import type { PaymentPlan } from "../types";

type Props = {
  c: ReturnType<typeof useTreasuryController>;
};

export function PaymentPlanView({ c }: Props) {
  const {
    plans,
    companyBanks,
    handleApprovePlan,
    handleRejectPlan,
    handleExportKopra,
    setSelectedPlanForPrint,
    setSelectedVendorForSlip,
    refreshAll,
  } = c;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [bankFilter, setBankFilter] = useState<number>(0);
  const [selectedPlanDetail, setSelectedPlanDetail] = useState<PaymentPlan | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState<number | null>(null);

  const filteredPlans = plans.filter((p) => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (bankFilter && p.companyBankId !== bankFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.voucherNo.toLowerCase().includes(q) ||
        (p.justification && p.justification.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Approved
          </span>
        );
      case "exported":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            Exported Kopra
          </span>
        );
      case "reconciled":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            Reconciled
          </span>
        );
      case "rejected":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            Rejected
          </span>
        );
      case "printed_for_signature":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            Printed for Sign
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Draft (Pending Approval)
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header & Filters */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari Nomor Voucher, Justifikasi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="">Semua Status</option>
            <option value="draft">Draft / Pending</option>
            <option value="approved">Approved</option>
            <option value="exported">Exported Kopra</option>
            <option value="reconciled">Reconciled</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={bankFilter}
            onChange={(e) => setBankFilter(Number(e.target.value))}
            className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="0">Semua Bank Sumber</option>
            {companyBanks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.bankName} ({b.accountNumber})
              </option>
            ))}
          </select>

          <button
            onClick={() => refreshAll()}
            className="p-1.5 text-slate-600 hover:text-blue-600 border border-slate-300 rounded hover:bg-slate-50 transition"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Total: <span className="font-bold text-slate-800">{filteredPlans.length}</span> Voucher Pengajuan
        </div>
      </div>

      {/* 2. Plans Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="p-2.5">No. Voucher (RAB)</th>
                <th className="p-2.5">Tanggal</th>
                <th className="p-2.5">Bank Sumber</th>
                <th className="p-2.5">Kategori / Justifikasi</th>
                <th className="p-2.5 text-center">Jml Item / Vendor</th>
                <th className="p-2.5 text-right">Total Nominal</th>
                <th className="p-2.5 text-center">Status</th>
                <th className="p-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Belum ada voucher pengajuan. Buat pengajuan baru dari tab AP Invoices &amp; Aging.
                  </td>
                </tr>
              ) : (
                filteredPlans.map((plan) => {
                  const itemCount = plan.items?.length || 0;
                  const uniqueVendors = new Set(plan.items?.map((i) => i.vendorId)).size;

                  return (
                    <tr key={plan.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-2.5 font-mono font-bold text-blue-700">
                        {plan.voucherNo}
                        <div className="text-[10px] text-slate-400 font-normal">
                          Dibuat oleh: {plan.makerName || "Admin Finance"}
                        </div>
                      </td>

                      <td className="p-2.5 whitespace-nowrap text-slate-700">
                        {formatDate(plan.voucherDate)}
                      </td>

                      <td className="p-2.5">
                        <div className="font-semibold text-slate-800">
                          {plan.companyBank?.bankName || "-"}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {plan.companyBank?.accountNumber}
                        </div>
                      </td>

                      <td className="p-2.5 max-w-xs">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {plan.category}
                        </span>
                        {plan.justification && (
                          <div className="text-slate-600 text-[11px] mt-1 line-clamp-1">
                            {plan.justification}
                          </div>
                        )}
                      </td>

                      <td className="p-2.5 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          {itemCount} Tagihan ({uniqueVendors} Vendor)
                        </span>
                      </td>

                      <td className="p-2.5 text-right font-bold text-slate-900 text-sm">
                        {formatCurrency(Number(plan.totalAmount || 0))}
                      </td>

                      <td className="p-2.5 text-center">{getStatusBadge(plan.status)}</td>

                      <td className="p-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Print Summary TTD */}
                          <button
                            onClick={() => setSelectedPlanForPrint(plan)}
                            className="p-1 text-slate-600 hover:text-blue-600 border border-slate-200 rounded hover:bg-slate-50"
                            title="Cetak Ringkasan TTD A4"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* View Details */}
                          <button
                            onClick={() => setSelectedPlanDetail(plan)}
                            className="p-1 text-slate-600 hover:text-blue-600 border border-slate-200 rounded hover:bg-slate-50"
                            title="Lihat Detail Item"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Approval Actions */}
                          {plan.status === "draft" && (
                            <>
                              <button
                                onClick={() => handleApprovePlan(plan.id)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 transition"
                                title="Approve Pengajuan"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Approve
                              </button>
                              <button
                                onClick={() => setShowRejectModal(plan.id)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100 transition"
                                title="Tolak Pengajuan"
                              >
                                <XCircle className="w-3 h-3" /> Reject
                              </button>
                            </>
                          )}

                          {/* Export Kopra */}
                          {(plan.status === "approved" || plan.status === "exported") && (
                            <button
                              onClick={() => handleExportKopra(plan.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition"
                              title="Download Format Kopra Mandiri"
                            >
                              <FileSpreadsheet className="w-3 h-3" /> Kopra .xlsx
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Modal Detail Item Plan */}
      {selectedPlanDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Rincian Voucher: {selectedPlanDetail.voucherNo}
                </h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  Bank: {selectedPlanDetail.companyBank?.bankName} ({selectedPlanDetail.companyBank?.accountNumber}) |
                  Total: {formatCurrency(Number(selectedPlanDetail.totalAmount))}
                </div>
              </div>
              <button
                onClick={() => setSelectedPlanDetail(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-semibold uppercase">
                    <th className="p-2">No</th>
                    <th className="p-2">Vendor</th>
                    <th className="p-2">No PO / Invoice</th>
                    <th className="p-2">Rekening Vendor</th>
                    <th className="p-2 text-right">Nominal Tagihan</th>
                    <th className="p-2 text-right">Nominal Bayar</th>
                    <th className="p-2 text-center">Tipe</th>
                    <th className="p-2 text-center">Slip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedPlanDetail.items?.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-2 text-slate-500">{idx + 1}</td>
                      <td className="p-2 font-semibold text-slate-800">{item.vendor?.name || "-"}</td>
                      <td className="p-2 font-mono">
                        <div>PO: {item.invoice?.poNo || "-"}</div>
                        <div className="text-slate-500 text-[10px]">Inv: {item.invoice?.invoiceNo || "-"}</div>
                      </td>
                      <td className="p-2">
                        <div>{item.vendor?.bankName || "-"}</div>
                        <div className="font-mono text-[11px] text-slate-600">{item.vendor?.accountNumber}</div>
                        <div className="text-[10px] text-slate-400">{item.vendor?.accountName}</div>
                      </td>
                      <td className="p-2 text-right text-slate-700 font-medium">
                        {formatCurrency(Number(item.invoice?.totalAmount || item.amountPaid))}
                      </td>
                      <td className="p-2 text-right font-bold text-slate-900">
                        {formatCurrency(Number(item.amountPaid))}
                      </td>
                      <td className="p-2 text-center">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            item.isFullPayment
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {item.isFullPayment ? "Lunas" : "Termin / Parsial"}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        {item.vendor && (
                          <button
                            onClick={() =>
                              setSelectedVendorForSlip({
                                plan: selectedPlanDetail,
                                vendor: item.vendor!,
                              })
                            }
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded border border-blue-200"
                            title="Cetak Cover Slip Fisik Vendor"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setSelectedPlanDetail(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded shadow-sm hover:bg-slate-100"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Reject Confirmation Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-md p-4 space-y-3">
            <h3 className="text-base font-bold text-rose-700 flex items-center gap-1.5">
              <XCircle className="w-5 h-5" /> Tolak Pengajuan Voucher
            </h3>
            <p className="text-xs text-slate-600">
              Penolakan voucher akan me-rollback seluruh status saldo tagihan kembali ke status semula (unpaid).
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alasan Penolakan:
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Tuliskan alasan penolakan..."
                rows={3}
                className="w-full p-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-rose-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason("");
                }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  handleRejectPlan(showRejectModal, rejectReason);
                  setShowRejectModal(null);
                  setRejectReason("");
                }}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded shadow-sm"
              >
                Konfirmasi Tolak
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
