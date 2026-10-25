import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { treasuryTabs, viewPath, type TreasuryTab } from "../../data/navigation";
import { api, API_BASE, useReloadOnSave } from "../../lib/api";
import { authorized } from "../../lib/auth";
import type { User } from "../../types";
import type {
  TreasuryInvoice,
  TreasuryVendor,
  TreasuryCompanyBank,
  PaymentPlan,
  BankStatementTransaction,
  AgingSummary,
  TreasuryPurchaseOrder,
  AccurateSyncState,
  SyncResult,
} from "./types";

export function useTreasuryController(onNotice?: (msg: string) => void, user?: User, activeTab: TreasuryTab = "pivot") {
  // Each step is its own sidebar sub-menu, so switching steps is navigation.
  const navigate = useNavigate();
  const setActiveTab = (tab: TreasuryTab) => {
    const title = Object.keys(treasuryTabs).find((t) => treasuryTabs[t as keyof typeof treasuryTabs] === tab);
    if (title) navigate(viewPath(title));
  };

  // UI gating only; the backend enforces the same permissions and segregation of duties.
  const canWrite = authorized(user, "treasury", "write") || authorized(user, "payment", "write");
  const canApprove = authorized(user, "treasury", "approve");
  const isMaker = (plan: PaymentPlan) =>
    !!user && (plan.makerUserId ? plan.makerUserId === user.id : (plan.makerName || "").trim().toLowerCase() === user.name.trim().toLowerCase());

  const [purchaseOrders, setPurchaseOrders] = useState<TreasuryPurchaseOrder[]>([]);
  const [syncState, setSyncState] = useState<AccurateSyncState | null>(null);
  
  // Data states
  const [invoices, setInvoices] = useState<TreasuryInvoice[]>([]);
  const [allUnpaidInvoices, setAllUnpaidInvoices] = useState<TreasuryInvoice[]>([]);
  const [paidInvoices, setPaidInvoices] = useState<TreasuryInvoice[]>([]);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [agingSummary, setAgingSummary] = useState<AgingSummary | null>(null);
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [vendors, setVendors] = useState<TreasuryVendor[]>([]);
  const [companyBanks, setCompanyBanks] = useState<TreasuryCompanyBank[]>([]);
  const [bankTransactions, setBankTransactions] = useState<BankStatementTransaction[]>([]);
  
  // Loading & Filter states
  const [loading, setLoading] = useState(false);
  const [invFilter, setInvFilter] = useState({
    status: "",
    site: "",
    vendorId: 0,
    priorityTag: "",
    agingCategory: "",
    search: "",
    limit: 100,
    offset: 0,
  });

  // Selected invoices for planning
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<number[]>([]);
  const [partialAmounts, setPartialAmounts] = useState<Record<number, string>>({});

  // Modals state
  const [showImportAccurateModal, setShowImportAccurateModal] = useState(false);
  const [showImportKopraCsvModal, setShowImportKopraCsvModal] = useState(false);
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);

  // Fetch Invoices
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (invFilter.status) params.append("status", invFilter.status);
      if (invFilter.site) params.append("site", invFilter.site);
      if (invFilter.vendorId) params.append("vendorId", String(invFilter.vendorId));
      if (invFilter.priorityTag) params.append("priorityTag", invFilter.priorityTag);
      if (invFilter.agingCategory) params.append("agingCategory", invFilter.agingCategory);
      if (invFilter.search) params.append("search", invFilter.search);
      params.append("limit", String(invFilter.limit));
      params.append("offset", String(invFilter.offset));

      const res = await api<{ success: boolean; invoices: TreasuryInvoice[]; total: number }>(
        `/api/treasury/invoices?${params.toString()}`
      );
      setInvoices(res.invoices || []);
      setTotalInvoices(res.total || 0);
    } catch (e: any) {
      onNotice?.(e.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [invFilter, onNotice]);

  // Fetch Aging Summary
  const fetchAgingSummary = useCallback(async () => {
    try {
      const res = await api<{ success: boolean; summary: AgingSummary }>("/api/treasury/aging-summary");
      setAgingSummary(res.summary || null);
    } catch (e: any) {
      console.error("Failed to load aging summary", e);
    }
  }, []);

  // Fetch Payment Plans
  const fetchPlans = useCallback(async () => {
    try {
      const res = await api<{ success: boolean; plans: PaymentPlan[] }>("/api/treasury/payment-plans");
      setPlans(res.plans || []);
    } catch (e: any) {
      console.error("Failed to load payment plans", e);
    }
  }, []);

  // Fetch Vendors
  const fetchVendors = useCallback(async () => {
    try {
      const res = await api<{ success: boolean; vendors: TreasuryVendor[] }>("/api/treasury/vendors");
      setVendors(res.vendors || []);
    } catch (e: any) {
      console.error("Failed to load vendors", e);
    }
  }, []);

  // Fetch Company Banks
  const fetchCompanyBanks = useCallback(async () => {
    try {
      const res = await api<{ success: boolean; companyBanks: TreasuryCompanyBank[] }>("/api/treasury/company-banks");
      setCompanyBanks(res.companyBanks || []);
    } catch (e: any) {
      console.error("Failed to load company banks", e);
    }
  }, []);

  // Fetch Bank Transactions
  const fetchBankTransactions = useCallback(async () => {
    try {
      const res = await api<{ success: boolean; transactions: BankStatementTransaction[] }>(
        "/api/treasury/reconciliation/transactions"
      );
      setBankTransactions(res.transactions || []);
    } catch (e: any) {
      console.error("Failed to load bank transactions", e);
    }
  }, []);

  // Fetch All Outstanding Invoices (unpaid, partially_paid, pending_paid for Pivot Matrix, Aging, & Vouchers)
  const fetchAllUnpaidInvoices = useCallback(async () => {
    try {
      const res = await api<{ success: boolean; invoices: TreasuryInvoice[]; total: number }>(
        "/api/treasury/invoices?status=outstanding&limit=5000"
      );
      setAllUnpaidInvoices(res.invoices || []);
    } catch (e: any) {
      console.error("Failed to load unpaid invoices", e);
    }
  }, []);

  // Fetch Paid & Reconciled Invoices (for Rekap AAP audit trail)
  const fetchPaidInvoices = useCallback(async () => {
    try {
      const res = await api<{ success: boolean; invoices: TreasuryInvoice[]; total: number }>(
        "/api/treasury/invoices?status=paid,partially_paid&limit=5000"
      );
      setPaidInvoices(res.invoices || []);
    } catch (e: any) {
      console.error("Failed to load paid invoices", e);
    }
  }, []);

  const fetchPurchaseOrders = useCallback(async () => {
    try {
      const res = await api<{ success: boolean; purchaseOrders: TreasuryPurchaseOrder[] }>("/api/treasury/purchase-orders");
      setPurchaseOrders(res.purchaseOrders || []);
    } catch (e: any) {
      console.error("Failed to load purchase orders", e);
    }
  }, []);

  const fetchSyncStatus = useCallback(async () => {
    try {
      const res = await api<{ success: boolean; status: AccurateSyncState }>("/api/treasury/accurate/sync-status");
      setSyncState(res.status);
      return res.status;
    } catch {
      return null;
    }
  }, []);

  const refreshAll = useCallback(() => {
    fetchInvoices();
    fetchAllUnpaidInvoices();
    fetchPaidInvoices();
    fetchAgingSummary();
    fetchPlans();
    fetchVendors();
    fetchCompanyBanks();
    fetchBankTransactions();
    fetchPurchaseOrders();
    fetchSyncStatus();
  }, [fetchInvoices, fetchAllUnpaidInvoices, fetchPaidInvoices, fetchAgingSummary, fetchPlans, fetchVendors, fetchCompanyBanks, fetchBankTransactions, fetchPurchaseOrders, fetchSyncStatus]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);
  useReloadOnSave(refreshAll);

  // Poll while a background Accurate sync runs, then reload everything once.
  useEffect(() => {
    if (!syncState?.running) return;
    const t = window.setInterval(async () => {
      const s = await fetchSyncStatus();
      if (s && !s.running) {
        const r: SyncResult | null | undefined = s.last;
        onNotice?.(
          s.lastError
            ? `Sync Accurate gagal: ${s.lastError}. Data FEAST terakhir tetap utuh.`
            : `Sync Accurate selesai: ${r?.inserted ?? 0} baru, ${r?.updated ?? 0} diperbarui, ${r?.unchanged ?? 0} tetap, ${r?.paid ?? 0} lunas, ${r?.deleted ?? 0} dihapus di Accurate, ${r?.flaggedPlans ?? 0} voucher perlu review.`
        );
        refreshAll();
      }
    }, 3000);
    return () => window.clearInterval(t);
  }, [syncState?.running, fetchSyncStatus, refreshAll, onNotice]);

  const handleSyncAccurate = async () => {
    try {
      const res = await api<{ success: boolean; message: string; status: AccurateSyncState }>(
        "/api/treasury/invoices/sync-accurate",
        { method: "POST" }
      );
      setSyncState(res.status);
      onNotice?.("Sync Accurate berjalan di latar belakang. Data akan diperbarui otomatis setelah selesai.");
    } catch (e: any) {
      onNotice?.(e.message || "Gagal memulai sync Accurate");
    }
  };

  // Create Plan Action
  const handleCreatePlan = async (data: {
    companyBankId: number;
    category: string;
    voucherDate: string;
    justification: string;
    planMonth?: string;
    planWeek?: number;
    // Tunai PO vouchers pass their own items ({tunaiPoRequestId, vendorId, amountPaid}).
    items?: Record<string, unknown>[];
  }) => {
    try {
      const pool = allUnpaidInvoices.length > 0 ? allUnpaidInvoices : invoices;
      const selectedInvs = pool.filter((i) => selectedInvoiceIds.includes(i.id));
      const items = data.items ?? selectedInvs.map((inv) => {
        const amt = partialAmounts[inv.id] || inv.remainingBalance;
        return {
          invoiceId: inv.id,
          vendorId: inv.vendorId,
          amountPaid: amt,
          remarks: inv.itemDescription || "",
        };
      });

      const res = await api<{ success: boolean; plan: PaymentPlan; message: string }>("/api/treasury/payment-plans", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          items,
        }),
      });

      onNotice?.(res.message || "Payment plan created successfully");
      setSelectedInvoiceIds([]);
      setPartialAmounts({});
      setShowCreatePlanModal(false);
      refreshAll();
      setActiveTab("voucher");
    } catch (e: any) {
      onNotice?.(e.message || "Failed to create payment plan");
    }
  };

  // Non-PO voucher (typed-in payee + Accurate account lines). Returns whether it was saved.
  const handleCreateNonPO = async (body: Record<string, unknown>) => {
    try {
      const res = await api<{ success: boolean; message: string }>("/api/treasury/vouchers/non-po", {
        method: "POST",
        body: JSON.stringify(body),
      });
      onNotice?.(res.message || "Voucher dibuat");
      fetchPlans();
      return true;
    } catch (e: any) {
      onNotice?.(e.message || "Gagal membuat voucher");
      return false;
    }
  };

  // Approve Plan. Invoices flagged as possible duplicate bills need an explicit confirmation by the approver.
  const handleApprovePlan = async (id: number, confirmDuplicates = false) => {
    try {
      await api(`/api/treasury/payment-plans/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ confirmDuplicates }),
      });
      onNotice?.("Payment plan approved successfully");
      fetchPlans();
    } catch (e: any) {
      const msg: string = e.message || "Failed to approve plan";
      if (!confirmDuplicates && msg.includes("tagihan ganda") && window.confirm(`${msg}\n\nSudah diperiksa dan tetap setujui?`)) {
        return handleApprovePlan(id, true);
      }
      onNotice?.(msg);
    }
  };

  const postAction = async (path: string, body: unknown, success: string) => {
    try {
      const res = await api<{ success: boolean; message?: string }>(path, { method: "POST", body: JSON.stringify(body) });
      onNotice?.(res.message || success);
      refreshAll();
      return true;
    } catch (e: any) {
      onNotice?.(e.message || "Aksi gagal");
      refreshAll();
      return false;
    }
  };

  const handleMarkPlanPaid = (id: number, paidDate: string) =>
    postAction(`/api/treasury/payment-plans/${id}/paid`, { paidDate }, "Voucher ditandai lunas");
  const handleVoidPlan = (id: number, reason: string) =>
    postAction(`/api/treasury/payment-plans/${id}/void`, { reason }, "Voucher di-void");
  const handleReviewPlan = (id: number, note: string) =>
    postAction(`/api/treasury/payment-plans/${id}/review`, { note }, "Review tersimpan");
  const handlePostToAccurate = (id: number) =>
    postAction(`/api/treasury/payment-plans/${id}/post-accurate`, {}, "Pembayaran diposting ke Accurate");
  // Posts vouchers one by one, then refreshes once and reports a single summary.
  const handlePostManyToAccurate = async (plansToPost: PaymentPlan[]) => {
    const failed: string[] = [];
    for (const p of plansToPost) {
      try {
        await api(`/api/treasury/payment-plans/${p.id}/post-accurate`, { method: "POST", body: "{}" });
      } catch (e: any) {
        failed.push(`${p.voucherNo}: ${e.message || "gagal"}`);
      }
    }
    onNotice?.(`${plansToPost.length - failed.length} voucher terposting${failed.length ? `, ${failed.length} gagal — ${failed.join("; ")}` : ""}`);
    refreshAll();
  };
  const handleCancelPaymentProof = async (id: number) => {
    try {
      await api(`/api/treasury/payment-plans/${id}/payment-proof`, { method: "DELETE" });
      onNotice?.("Bukti bayar dibatalkan");
    } catch (e: any) {
      onNotice?.(e.message || "Gagal membatalkan bukti bayar");
    }
    refreshAll();
  };
  const handleManualMatch = (transactionId: number, planId: number, note: string) =>
    postAction("/api/treasury/reconciliation/manual-match", { transactionId, planId, note }, "Mutasi dicocokkan");
  const handleVerifyVendorBank = (id: number, approve: boolean) =>
    postAction(`/api/treasury/vendors/${id}/verify-bank`, { approve }, "Verifikasi rekening tersimpan");

  // Reject Plan
  const handleRejectPlan = async (id: number, reason: string) => {
    try {
      await api(`/api/treasury/payment-plans/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      onNotice?.("Payment plan rejected and balances released");
      refreshAll();
    } catch (e: any) {
      onNotice?.(e.message || "Failed to reject plan");
    }
  };

  // Export Kopra
  const handleExportKopra = async (planId: number) => {
    try {
      const token = localStorage.getItem("financeerp.token") || "";
      const url = `${API_BASE}/api/treasury/payment-plans/${planId}/export-kopra`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.message || "Failed to download Kopra file");
      }
      const warning = response.headers.get("x-treasury-warning");

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      let filename = `KOPRA_EXPORT_${planId}.xlsx`;
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) filename = match[1];

      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);

      onNotice?.(warning ? `File Kopra terunduh. Peringatan: ${warning}` : "File Kopra Mandiri downloaded successfully");
      fetchPlans();
    } catch (e: any) {
      onNotice?.(e.message || "Failed to export Kopra file");
      fetchPlans();
    }
  };

  // Export REKAP AAP
  const handleExportRekapAAP = async () => {
    try {
      const token = localStorage.getItem("financeerp.token") || "";
      const url = `${API_BASE}/api/treasury/reconciliation/export-rekap-aap`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to export REKAP AAP");

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      let filename = `REKAP_AAP_${new Date().toISOString().slice(0, 10)}.xlsx`;
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) filename = match[1];

      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);

      onNotice?.("REKAP AAP Excel downloaded successfully");
    } catch (e: any) {
      onNotice?.(e.message || "Failed to export REKAP AAP");
    }
  };

  // Auto-Match Reconciliation
  const handleAutoMatch = async (companyBankId: number) => {
    try {
      const res = await api<{ success: boolean; matchedCount: number; message: string }>(
        `/api/treasury/reconciliation/auto-match?companyBankId=${companyBankId}`,
        { method: "POST" }
      );
      onNotice?.(res.message || `Reconciled ${res.matchedCount} items`);
      refreshAll();
    } catch (e: any) {
      onNotice?.(e.message || "Failed to auto-reconcile");
    }
  };

  // Update Vendor Banking Info (bank changes become pending until another user verifies them)
  const handleUpdateVendor = async (id: number, data: Partial<TreasuryVendor>) => {
    try {
      const res = await api<{ success: boolean; message: string }>(`/api/treasury/vendors/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      onNotice?.(res.message || "Vendor banking details updated");
      fetchVendors();
    } catch (e: any) {
      onNotice?.(e.message || "Failed to update vendor");
    }
  };

  // Assign Invoices to Plan (Month & Week)
  const handleAssignPlan = async (invoiceIds: number[], planMonth: string, planWeek: number) => {
    try {
      const res = await api<{ success: boolean; message: string }>("/api/treasury/invoices/assign-plan", {
        method: "POST",
        body: JSON.stringify({
          invoiceIds,
          planMonth,
          planWeek,
        }),
      });
      onNotice?.(res.message || "Rencana pembayaran berhasil disimpan");
      fetchInvoices();
      fetchAllUnpaidInvoices();
      return true;
    } catch (e: any) {
      onNotice?.(e.message || "Gagal menetapkan rencana pembayaran");
      return false;
    }
  };

  const handleUploadPaymentProof = async (planId: number, file: File) => {
    try {
      const form = new FormData();
      form.append("file", file);
      await api(`/api/treasury/payment-plans/${planId}/payment-proof`, { method: "POST", body: form });
      onNotice?.("Bukti bayar tersimpan");
      fetchPlans();
    } catch (e: any) {
      onNotice?.(e.message || "Gagal upload bukti bayar");
    }
  };

  return {
    user,
    canWrite,
    canApprove,
    isMaker,
    purchaseOrders,
    syncState,
    handleSyncAccurate,
    handleVoidPlan,
    handleReviewPlan,
    handlePostToAccurate,
    handlePostManyToAccurate,
    handleCancelPaymentProof,
    handleMarkPlanPaid,
    handleManualMatch,
    handleVerifyVendorBank,
    activeTab,
    setActiveTab,
    invoices,
    allUnpaidInvoices,
    fetchAllUnpaidInvoices,
    paidInvoices,
    fetchPaidInvoices,
    totalInvoices,
    agingSummary,
    plans,
    vendors,
    companyBanks,
    bankTransactions,
    loading,
    invFilter,
    setInvFilter,
    selectedInvoiceIds,
    setSelectedInvoiceIds,
    partialAmounts,
    setPartialAmounts,
    showImportAccurateModal,
    setShowImportAccurateModal,
    showImportKopraCsvModal,
    setShowImportKopraCsvModal,
    showCreatePlanModal,
    setShowCreatePlanModal,
    refreshAll,
    fetchInvoices,
    handleCreatePlan,
    handleCreateNonPO,
    handleApprovePlan,
    handleRejectPlan,
    handleExportKopra,
    handleExportRekapAAP,
    handleAutoMatch,
    handleUpdateVendor,
    handleAssignPlan,
    handleUploadPaymentProof,
  };
}

// Authenticated file download (plain links cannot carry the bearer token).
export async function downloadFile(path: string, fallbackName: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("financeerp.token") || ""}` },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.message || "Gagal download file");
  const name = (res.headers.get("content-disposition") || "").match(/filename="?([^"]+)"?/)?.[1] || fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
