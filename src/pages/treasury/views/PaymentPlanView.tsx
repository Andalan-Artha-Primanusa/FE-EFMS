import React, { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
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
import { VoucherPaymentOfficialPrint } from "../components/VoucherPaymentOfficialPrint";

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
    setSelectedVendorForSlip,
    refreshAll,
  } = c;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [bankFilter, setBankFilter] = useState<number>(0);
  const [selectedPlanDetail, setSelectedPlanDetail] = useState<PaymentPlan | null>(null);
  const [expandedPlanIds, setExpandedPlanIds] = useState<Record<number, boolean>>({});

  const toggleExpandPlan = (id: number) => {
    setExpandedPlanIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState<number | null>(null);
  const [activePrintOfficialVoucher, setActivePrintOfficialVoucher] = useState<any | null>(null);

  const handleOpenOfficialVoucherPrint = (plan: PaymentPlan, filterVendorId?: number, filterSite?: string) => {
    const items = plan.items || [];
    let targetItems = items;
    if (filterVendorId) {
      targetItems = targetItems.filter((i) => i.vendorId === filterVendorId);
    }
    if (filterSite) {
      targetItems = targetItems.filter(
        (i) => (i.invoice?.site || "HO").trim().toUpperCase() === filterSite.trim().toUpperCase()
      );
    }
    if (targetItems.length === 0) return;

    // Group items strictly by Site + Vendor
    const groupMap = new Map<string, {
      site: string;
      vendor: any;
      invoices: any[];
      totalAmount: number;
    }>();

    targetItems.forEach((it) => {
      const invSite = (it.invoice?.site || "HO").trim().toUpperCase();
      const v = it.vendor || {
        id: it.vendorId,
        name: "Vendor Tagihan",
        bankName: "",
        accountNumber: "",
        accountName: "",
      };
      const key = `${invSite}|${v.id || v.name}`;

      let grp = groupMap.get(key);
      if (!grp) {
        grp = {
          site: invSite,
          vendor: {
            id: v.id,
            name: v.name,
            bankName: v.bankName,
            accountNumber: v.accountNumber,
            accountName: v.accountName || v.name,
          },
          invoices: [],
          totalAmount: 0,
        };
        groupMap.set(key, grp);
      }

      const invObj = it.invoice ? it.invoice : {
        id: it.invoiceId || 0,
        invoiceNo: it.remarks || `INV-${it.id}`,
        poNo: it.remarks || "-",
        site: invSite,
        coaName: "HUTANG USAHA",
        itemDescription: it.remarks || "Pembayaran Tagihan",
        totalAmount: it.amountPaid,
        remainingBalance: it.amountPaid,
      };

      grp.invoices.push(invObj);
      grp.totalAmount += Number(it.amountPaid || invObj.totalAmount || 0);
    });

    const bundles = Array.from(groupMap.values()).map((grp) => {
      const vNo = groupMap.size > 1 ? `${plan.voucherNo}/${grp.site}` : plan.voucherNo;
      return {
        voucherNo: vNo,
        voucherDate: plan.voucherDate ? formatDate(plan.voucherDate) : new Date().toISOString().slice(0, 10),
        site: grp.site,
        category: plan.category || "ACCOUNT PAYABLE (AP)",
        vendor: grp.vendor,
        invoices: grp.invoices,
        totalAmount: grp.totalAmount,
      };
    });

    setActivePrintOfficialVoucher({
      vouchers: bundles,
    });
  };

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

  const totalPlansAmount = filteredPlans.reduce(
    (sum, p) => sum + Number(p.totalAmount || 0),
    0
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 font-sans text-xs overflow-hidden">
      {/* 1. Header & Filters */}
      <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 shrink-0">
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
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-20 shadow-xs">
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
                  const isExpanded = !!expandedPlanIds[plan.id];

                  return (
                    <React.Fragment key={plan.id}>
                      <tr className={`hover:bg-slate-50/80 transition ${isExpanded ? "bg-amber-50/40" : ""}`}>
                        {/* No Voucher with Accordion Toggle */}
                        <td className="p-2.5">
                          <div
                            className="flex items-center gap-2 cursor-pointer select-none group"
                            onClick={() => toggleExpandPlan(plan.id)}
                          >
                            <span className="p-0.5 rounded hover:bg-stone-200 text-stone-500 transition">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-[#A57C50]" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-700" />
                              )}
                            </span>
                            <div>
                              <div className="font-mono font-bold text-blue-700 group-hover:underline">
                                {plan.voucherNo}
                              </div>
                              <div className="text-[10px] text-slate-400 font-normal">
                                Dibuat oleh: {plan.makerName || "Admin Finance"}
                              </div>
                            </div>
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
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {plan.category}
                            </span>
                            {plan.planMonth && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                                {plan.planMonth} (W{plan.planWeek || 1})
                              </span>
                            )}
                          </div>
                          {plan.justification && (
                            <div className="text-slate-600 text-[11px] line-clamp-1">
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
                            {/* Cetak Voucher Payment Resmi (Official AAP Layout) */}
                            <button
                              onClick={() => handleOpenOfficialVoucherPrint(plan)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-[#A57C50] hover:bg-[#8e6941] rounded-[3px] shadow-2xs transition cursor-pointer"
                              title="Cetak Voucher Payment Resmi (ANDALAN)"
                            >
                              <Printer className="w-3.5 h-3.5" /> Cetak Voucher
                            </button>

                            {/* View Details */}
                            <button
                              onClick={() => setSelectedPlanDetail(plan)}
                              className="p-1.5 text-stone-600 hover:text-stone-900 border border-stone-200 rounded-[3px] hover:bg-stone-50 transition cursor-pointer"
                              title="Lihat Detail Tagihan & Cetak Per Vendor"
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

                      {/* Expandable Voucher Items Sub-Row */}
                      {isExpanded && (
                        <tr className="bg-stone-50/70 border-b border-stone-200">
                          <td colSpan={8} className="p-3 pl-8">
                            <div className="bg-white rounded-[4px] border border-stone-200 shadow-2xs p-3 space-y-2.5">
                              {/* Header details */}
                              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-[#A57C50] text-xs">
                                    {plan.voucherNo}
                                  </span>
                                  {plan.items?.[0]?.invoice?.site && (
                                    <span className="px-1.5 py-0.5 rounded-[2px] bg-stone-100 border border-stone-300 font-bold text-[9px] text-stone-700">
                                      SITE: {plan.items[0].invoice.site}
                                    </span>
                                  )}
                                  <span className="font-bold text-stone-900 text-xs">
                                    {plan.items?.[0]?.vendor?.name || "VENDOR"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleOpenOfficialVoucherPrint(plan)}
                                    className="inline-flex items-center gap-1 px-3 py-1 bg-[#A57C50] hover:bg-[#8e6941] text-white font-extrabold rounded-[3px] text-xs shadow-2xs transition cursor-pointer"
                                  >
                                    <Printer className="w-3.5 h-3.5" /> Cetak Voucher Ini
                                  </button>
                                </div>
                              </div>

                              {/* Items Table */}
                              <table className="w-full text-left text-[11px] border-collapse">
                                <thead>
                                  <tr className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200">
                                    <th className="p-1.5 w-8 text-center">No</th>
                                    <th className="p-1.5 w-44">No. PO</th>
                                    <th className="p-1.5 w-36">No. Invoice</th>
                                    <th className="p-1.5">Deskripsi Tagihan / Barang</th>
                                    <th className="p-1.5 w-24 text-center">Jatuh Tempo</th>
                                    <th className="p-1.5 w-32 text-right">Nominal Rencana</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                  {plan.items?.map((it, itemIdx) => {
                                    const inv = it.invoice;
                                    return (
                                      <tr key={it.id || itemIdx} className="hover:bg-amber-50/20">
                                        <td className="p-1.5 text-center text-stone-400 font-mono text-[10px]">
                                          {itemIdx + 1}
                                        </td>
                                        <td className="p-1.5 font-mono font-semibold text-stone-900">
                                          {inv?.poNo || "-"}
                                        </td>
                                        <td className="p-1.5 font-mono text-stone-600">
                                          {inv?.invoiceNo || `INV-${it.id}`}
                                        </td>
                                        <td className="p-1.5 text-stone-700">
                                          {inv?.itemDescription || it.remarks || "-"}
                                        </td>
                                        <td className="p-1.5 text-center text-stone-600">
                                          {inv?.dueDate ? formatDate(inv.dueDate) : "-"}
                                        </td>
                                        <td className="p-1.5 text-right font-mono font-bold text-blue-900">
                                          {formatCurrency(Number(it.amountPaid || 0))}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot>
                                  <tr className="bg-stone-50 font-bold border-t border-stone-200">
                                    <td colSpan={5} className="p-1.5 text-right text-stone-700 uppercase text-[10px]">
                                      Total Voucher:
                                    </td>
                                    <td className="p-1.5 text-right font-mono font-bold text-blue-900 text-xs">
                                      {formatCurrency(Number(plan.totalAmount || 0))}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
            <tfoot className="bg-[#1A1612] text-white font-bold border-t-2 border-amber-900/40 sticky bottom-0 z-20 text-[11px] shadow-[0_-4px_12px_rgba(0,0,0,0.3)]">
              <tr className="bg-[#1A1612]">
                <td colSpan={5} className="p-2.5 text-right font-black uppercase tracking-wider text-stone-300 bg-[#1A1612]">
                  Grand Total ({filteredPlans.length} Pengajuan):
                </td>
                <td className="p-2.5 text-right font-mono font-black text-amber-400 text-xs pr-4 whitespace-nowrap bg-[#1A1612]">
                  {formatCurrency(totalPlansAmount)}
                </td>
                <td colSpan={2} className="p-2.5 bg-[#1A1612]"></td>
              </tr>
            </tfoot>
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
                    <th className="p-2 text-center">Site</th>
                    <th className="p-2">Vendor</th>
                    <th className="p-2">No PO / Invoice</th>
                    <th className="p-2">Rekening Vendor</th>
                    <th className="p-2 text-right">Nominal Tagihan</th>
                    <th className="p-2 text-right">Nominal Bayar</th>
                    <th className="p-2 text-center">Tipe</th>
                    <th className="p-2 text-center">Aksi Voucher</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedPlanDetail.items?.map((item, idx) => {
                    const invSite = item.invoice?.site || "HO";
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-2 text-slate-500">{idx + 1}</td>
                        <td className="p-2 text-center">
                          <span className="px-1.5 py-0.5 rounded-[2px] bg-stone-100 border border-stone-200 text-stone-700 font-bold text-[9px] uppercase">
                            {invSite}
                          </span>
                        </td>
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
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() =>
                                handleOpenOfficialVoucherPrint(
                                  selectedPlanDetail,
                                  item.vendorId,
                                  invSite
                                )
                              }
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-white bg-[#A57C50] hover:bg-[#8e6941] rounded-[2px] transition cursor-pointer"
                              title={`Cetak Voucher Payment Resmi (${invSite})`}
                            >
                              <Printer className="w-3 h-3" /> Voucher
                            </button>
                            {item.vendor && (
                              <button
                                onClick={() =>
                                  setSelectedVendorForSlip({
                                    plan: selectedPlanDetail,
                                    vendor: item.vendor!,
                                  })
                                }
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded border border-blue-200 cursor-pointer"
                                title="Cetak Cover Slip Fisik Vendor"
                              >
                                <FileText className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
      {/* 5. Official Voucher Payment Printable Modal */}
      {activePrintOfficialVoucher && (
        <VoucherPaymentOfficialPrint
          isOpen={!!activePrintOfficialVoucher}
          onClose={() => setActivePrintOfficialVoucher(null)}
          vouchers={activePrintOfficialVoucher.vouchers || [activePrintOfficialVoucher]}
        />
      )}
    </div>
  );
}
