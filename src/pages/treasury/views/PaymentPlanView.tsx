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
  Upload,
  XCircle,
} from "lucide-react";
import { formatCurrency, formatDate } from "../../../lib/format";
import { downloadFile, type useTreasuryController } from "../useTreasuryController";
import { VOUCHER_CATEGORIES, type PaymentPlan } from "../types";
import { VoucherPaymentOfficialPrint } from "../components/VoucherPaymentOfficialPrint";
import { PrintableSummaryModal } from "../components/PrintableSummaryModal";
import { NonPOVoucherModal } from "../modals/NonPOVoucherModal";
import { periodLabel } from "../../tunai-po/shared";

type Props = {
  c: ReturnType<typeof useTreasuryController>;
  // Set on a category menu (Tunai Non PO, Asuransi, Infrastruktur): list only that category and create its vouchers.
  category?: string;
};

// Paid (proof uploaded) but not yet in Accurate: what "Sync ke Accurate" posts.
const isPostable = (p: PaymentPlan) => !!p.paidAt && ["approved", "exported", "reconciled"].includes(p.status);
// Only verified vouchers go on the Summary Payment signed by the directors.
const isSummarizable = (p: PaymentPlan) => !["draft", "printed_for_signature", "rejected", "void"].includes(p.status);

export function PaymentPlanView({ c, category }: Props) {
  const {
    plans,
    companyBanks,
    handleApprovePlan,
    handleRejectPlan,
    handleExportKopra,
    handleVoidPlan,
    handleReviewPlan,
    handlePostToAccurate,
    handlePostManyToAccurate,
    handleCancelPaymentProof,
    canWrite,
    canApprove,
    isMaker,
    setSelectedVendorForSlip,
    refreshAll,
    handleUploadPaymentProof,
    setShowCreatePlanModal,
  } = c;

  // Mandatory free-text for checker actions; cancelling or leaving it empty aborts.
  const askReason = (label: string, then: (text: string) => void) => {
    const text = window.prompt(label)?.trim();
    if (text) then(text);
  };

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
  const [categoryFilter, setCategoryFilter] = useState("");
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [summaryPlans, setSummaryPlans] = useState<PaymentPlan[] | null>(null);
  const [showNonPO, setShowNonPO] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const toggleChecked = (id: number) =>
    setCheckedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const syncTodo = plans.filter((p) => isPostable(p) && !isMaker(p) && !p.needsReview);
  const syncToAccurate = async () => {
    if (!syncTodo.length) return alert("Tidak ada voucher terbayar yang belum diposting.");
    if (!window.confirm(`Posting ${syncTodo.length} voucher terbayar ke Accurate?`)) return;
    setSyncing(true);
    await handlePostManyToAccurate(syncTodo);
    setSyncing(false);
  };

  const handleOpenOfficialVoucherPrint = (plan: PaymentPlan, filterVendorId?: number, filterSite?: string) => {
    const items = plan.items || [];
    let targetItems = items;
    if (filterVendorId) {
      targetItems = targetItems.filter((i) => i.vendorId === filterVendorId);
    }
    if (filterSite) {
      targetItems = targetItems.filter(
        (i) => (i.invoice?.site || i.tunaiPoRequest?.site || "HO").trim().toUpperCase() === filterSite.trim().toUpperCase()
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
      const invSite = (it.invoice?.site || it.tunaiPoRequest?.site || plan.site || "HO").trim().toUpperCase();
      const v = it.vendor || {
        id: it.vendorId,
        name: plan.payeeName || "Vendor Tagihan",
        bankName: plan.payeeBankName || "",
        accountNumber: plan.payeeAccountNumber || "",
        accountName: plan.payeeAccountName || "",
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
        poNo: it.accountNo ? "-" : it.remarks || "-",
        site: invSite,
        coaName: it.accountNo || "HUTANG USAHA",
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
        category: VOUCHER_CATEGORIES[plan.category] || plan.category || "ACCOUNT PAYABLE (AP)",
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
    if ((category || categoryFilter) && p.category !== (category || categoryFilter)) return false;
    if (statusFilter && p.status !== statusFilter) return false;
    if (bankFilter && p.companyBankId !== bankFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.voucherNo.toLowerCase().includes(q) ||
        (p.justification && p.justification.toLowerCase().includes(q)) ||
        (p.payeeName || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Terverifikasi
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
      case "posted":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200">
            Posted Accurate
          </span>
        );
      case "void":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-stone-200 text-stone-700 border border-stone-300 line-through">
            Void
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
            Draft
          </span>
        );
    }
  };

  // Summary uses only what is visible and verified, so a hidden or rejected voucher never reaches the directors.
  const selectable = filteredPlans.filter(isSummarizable);
  const summaryCandidates = selectable.filter((p) => checkedIds.includes(p.id));

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
            <option value="draft">Draft</option>
            <option value="approved">Terverifikasi</option>
            <option value="exported">Exported Kopra</option>
            <option value="reconciled">Reconciled</option>
            <option value="posted">Posted Accurate</option>
            <option value="rejected">Rejected</option>
            <option value="void">Void</option>
          </select>

          {!category && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-700"
            >
              <option value="">Semua Kategori</option>
              {Object.entries(VOUCHER_CATEGORIES).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          )}

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

        <div className="flex items-center gap-3">
          {summaryCandidates.length > 0 && (
            <button
              onClick={() => setSummaryPlans(summaryCandidates)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-stone-800 bg-white border border-stone-300 hover:bg-stone-50 rounded-[3px] shadow-2xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Summary Payment ({summaryCandidates.length})
            </button>
          )}
          {!category && canApprove && (
            <button
              onClick={syncToAccurate}
              disabled={syncing}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 disabled:opacity-60 rounded-[3px] shadow-2xs transition cursor-pointer"
            >
              <Landmark className={`w-3.5 h-3.5 ${syncing ? "animate-pulse" : ""}`} /> Sync ke Accurate ({syncTodo.length})
            </button>
          )}
          {canWrite && (
            <button
              onClick={() => (category ? setShowNonPO(true) : setShowCreatePlanModal(true))}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-[#A57C50] hover:bg-[#8e6941] rounded-[3px] shadow-2xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> {category ? `Voucher ${VOUCHER_CATEGORIES[category]}` : "Voucher Tunai PO / Fuel"}
            </button>
          )}
          <div className="text-xs text-slate-500 font-medium">
            Total: <span className="font-bold text-slate-800">{filteredPlans.length}</span> Voucher Pengajuan
          </div>
        </div>
      </div>

      {/* 2. Plans Table */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-20 shadow-xs">
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="p-2.5 w-8">
                  <input
                    type="checkbox"
                    className="accent-[#A57C50]"
                    checked={selectable.length > 0 && selectable.every((p) => checkedIds.includes(p.id))}
                    onChange={(e) => setCheckedIds(e.target.checked ? selectable.map((p) => p.id) : [])}
                  />
                </th>
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
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    Belum ada voucher
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
                        <td className="p-2.5">
                          <input
                            type="checkbox"
                            className="accent-[#A57C50]"
                            checked={checkedIds.includes(plan.id)}
                            disabled={!isSummarizable(plan)}
                            onChange={() => toggleChecked(plan.id)}
                          />
                        </td>
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
                              {VOUCHER_CATEGORIES[plan.category] || plan.category}
                            </span>
                            {plan.payeeName && (
                              <span className="text-[11px] font-semibold text-slate-800">{plan.payeeName}</span>
                            )}
                            {plan.planMonth && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                                {periodLabel(plan)}
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
                            {plan.payeeName ? `${itemCount} Baris` : `${itemCount} Tagihan (${uniqueVendors} Vendor)`}
                          </span>
                        </td>

                        <td className="p-2.5 text-right font-bold text-slate-900 text-sm">
                          {formatCurrency(Number(plan.totalAmount || 0))}
                        </td>

                        <td className="p-2.5 text-center">
                          {getStatusBadge(plan.status)}
                          {plan.needsReview && (
                            <div
                              className="mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                              title={plan.reviewNote}
                            >
                              Perlu Review
                            </div>
                          )}
                          {plan.paymentProofName && (
                            <button
                              onClick={() =>
                                downloadFile(`/api/treasury/payment-plans/${plan.id}/payment-proof`, plan.paymentProofName!).catch(
                                  (e) => alert(e.message)
                                )
                              }
                              className="mt-1 block mx-auto text-[10px] text-blue-700 hover:underline cursor-pointer max-w-[140px] truncate"
                              title={plan.paymentProofName}
                            >
                              <Download className="w-3 h-3 inline mr-0.5" />
                              {plan.paymentProofName}
                            </button>
                          )}
                          {plan.paidAt && (
                            <div className="text-[10px] text-slate-500">Bayar: {formatDate(plan.paidAt)}</div>
                          )}
                        </td>

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

                            {/* Review (checker other than the maker clears a needs_review flag) */}
                            {plan.needsReview && canApprove && !isMaker(plan) && (
                              <button
                                onClick={() => askReason("Catatan review (wajib):", (note) => handleReviewPlan(plan.id, note))}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100 transition"
                                title={plan.reviewNote}
                              >
                                <Eye className="w-3 h-3" /> Review
                              </button>
                            )}

                            {/* Approval Actions: approver must not be the maker (segregation of duties) */}
                            {(plan.status === "draft" || plan.status === "printed_for_signature") && canApprove && !isMaker(plan) && (
                              <button
                                onClick={() => handleApprovePlan(plan.id)}
                                disabled={plan.needsReview}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 disabled:opacity-50 transition"
                                title="Verifikasi Voucher"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Verifikasi
                              </button>
                            )}
                            {(plan.status === "draft" || plan.status === "printed_for_signature" || plan.status === "approved") && !plan.paidAt && canApprove && (
                              <button
                                onClick={() => setShowRejectModal(plan.id)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100 transition"
                                title="Tolak Pengajuan"
                              >
                                <XCircle className="w-3 h-3" /> Reject
                              </button>
                            )}

                            {/* Export Kopra */}
                            {(plan.status === "approved" || plan.status === "exported") && canWrite && (
                              <button
                                onClick={() => handleExportKopra(plan.id)}
                                disabled={plan.needsReview}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 disabled:opacity-50 transition"
                                title={
                                  plan.kopraExportedCount
                                    ? `Sudah diekspor ${plan.kopraExportedCount}x. SHA-256 terakhir: ${plan.kopraFileSha256}`
                                    : "Download Format Kopra Mandiri"
                                }
                              >
                                <FileSpreadsheet className="w-3 h-3" /> Kopra .xlsx
                                {!!plan.kopraExportedCount && plan.kopraExportedCount > 1 && (
                                  <span className="text-[9px] text-rose-600">({plan.kopraExportedCount}x)</span>
                                )}
                              </button>
                            )}

                            {/* Void: bank did NOT execute an exported transfer */}
                            {plan.status === "exported" && canApprove && !isMaker(plan) && (
                              <button
                                onClick={() =>
                                  askReason(
                                    "Alasan void (wajib, mis. konfirmasi bank transfer tidak dieksekusi). Tagihan akan dapat dibayar kembali:",
                                    (reason) => handleVoidPlan(plan.id, reason)
                                  )
                                }
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-stone-700 bg-stone-50 border border-stone-300 rounded hover:bg-stone-100 transition"
                                title="Batalkan voucher yang sudah diekspor"
                              >
                                <XCircle className="w-3 h-3" /> Void
                              </button>
                            )}

                            {["approved", "exported", "reconciled", "posted"].includes(plan.status) && canWrite && (
                              <label
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100 transition cursor-pointer"
                                title={plan.paymentProofName ? "Upload ulang bukti bayar" : "Upload bukti bayar"}
                              >
                                <Upload className="w-3 h-3" /> {plan.paymentProofName ? "Ganti Bukti" : "Upload Bukti Bayar"}
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    e.target.value = "";
                                    if (file) handleUploadPaymentProof(plan.id, file);
                                  }}
                                />
                              </label>
                            )}

                            {/* A proof uploaded by mistake (transfer failed) can be withdrawn until posted */}
                            {isPostable(plan) && canWrite && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Batalkan bukti bayar voucher ${plan.voucherNo}?`)) {
                                    handleCancelPaymentProof(plan.id);
                                  }
                                }}
                                disabled={syncing}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-rose-700 bg-white border border-rose-200 rounded hover:bg-rose-50 disabled:opacity-50 transition"
                              >
                                <XCircle className="w-3 h-3" /> Batalkan Bukti
                              </button>
                            )}

                            {/* Write-back to Accurate once paid (payment proof uploaded) */}
                            {isPostable(plan) && canApprove && !isMaker(plan) && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Posting voucher ${plan.voucherNo} ke Accurate?`)) {
                                    handlePostToAccurate(plan.id);
                                  }
                                }}
                                disabled={plan.needsReview || syncing}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded hover:bg-teal-100 disabled:opacity-50 transition"
                                title="Posting pelunasan ke Accurate Online"
                              >
                                <Landmark className="w-3 h-3" /> Posting ke Accurate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Voucher Items Sub-Row */}
                      {isExpanded && (
                        <tr className="bg-stone-50/70 border-b border-stone-200">
                          <td colSpan={9} className="p-3 pl-8">
                            <div className="bg-white rounded-[4px] border border-stone-200 shadow-2xs p-3 space-y-2.5">
                              {/* Header details */}
                              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-[#A57C50] text-xs">
                                    {plan.voucherNo}
                                  </span>
                                  {(plan.items?.[0]?.invoice?.site || plan.site) && (
                                    <span className="px-1.5 py-0.5 rounded-[2px] bg-stone-100 border border-stone-300 font-bold text-[9px] text-stone-700">
                                      SITE: {plan.items?.[0]?.invoice?.site || plan.site}
                                    </span>
                                  )}
                                  <span className="font-bold text-stone-900 text-xs">
                                    {plan.items?.[0]?.vendor?.name || plan.payeeName || "VENDOR"}
                                  </span>
                                  {plan.payeeAccountNumber && (
                                    <span className="text-[10px] text-stone-500 font-mono">
                                      {plan.payeeBankName} {plan.payeeAccountNumber} a.n. {plan.payeeAccountName}
                                    </span>
                                  )}
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
                                          {inv?.poNo || it.tunaiPoRequest?.poNo || it.accountNo || "-"}
                                        </td>
                                        <td className="p-1.5 font-mono text-stone-600">
                                          {inv?.invoiceNo || it.tunaiPoRequest?.proformaNo || (it.accountNo ? "-" : `INV-${it.id}`)}
                                          {inv?.isDownPayment && (
                                            <span className="ml-1 px-1 rounded bg-sky-100 text-sky-800 text-[9px] font-bold">DP</span>
                                          )}
                                          {inv?.possibleDuplicate && (
                                            <span className="ml-1 px-1 rounded bg-rose-100 text-rose-700 text-[9px] font-bold" title="Vendor + PO + nominal sama dengan invoice lain">
                                              Duplikat?
                                            </span>
                                          )}
                                          {it.accuratePaymentNo && (
                                            <div className="text-[9px] text-teal-700">Accurate: {it.accuratePaymentNo}</div>
                                          )}
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
                <td colSpan={6} className="p-2.5 text-right font-black uppercase tracking-wider text-stone-300 bg-[#1A1612]">
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
                    const invSite = item.invoice?.site || item.tunaiPoRequest?.site || selectedPlanDetail.site || "HO";
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-2 text-slate-500">{idx + 1}</td>
                        <td className="p-2 text-center">
                          <span className="px-1.5 py-0.5 rounded-[2px] bg-stone-100 border border-stone-200 text-stone-700 font-bold text-[9px] uppercase">
                            {invSite}
                          </span>
                        </td>
                        <td className="p-2 font-semibold text-slate-800">{item.vendor?.name || selectedPlanDetail.payeeName || "-"}</td>
                        <td className="p-2 font-mono">
                          <div>PO: {item.invoice?.poNo || item.tunaiPoRequest?.poNo || "-"}</div>
                          <div className="text-slate-500 text-[10px]">Inv: {item.invoice?.invoiceNo || "-"}</div>
                        </td>
                        <td className="p-2">
                          <div>{item.vendor?.bankName || selectedPlanDetail.payeeBankName || "-"}</div>
                          <div className="font-mono text-[11px] text-slate-600">{item.vendor?.accountNumber || selectedPlanDetail.payeeAccountNumber}</div>
                          <div className="text-[10px] text-slate-400">{item.vendor?.accountName || selectedPlanDetail.payeeAccountName}</div>
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
      {summaryPlans && <PrintableSummaryModal plans={summaryPlans} onClose={() => setSummaryPlans(null)} />}
      {showNonPO && category && <NonPOVoucherModal c={c} category={category} onClose={() => setShowNonPO(false)} />}

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
