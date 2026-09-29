import { useState, useEffect, useCallback } from "react";
import { api, API_BASE } from "../../lib/api";
import type {
  TreasuryInvoice,
  TreasuryVendor,
  TreasuryCompanyBank,
  PaymentPlan,
  BankStatementTransaction,
  AgingSummary,
} from "./types";

export function useTreasuryController(onNotice?: (msg: string) => void) {
  const [activeTab, setActiveTab] = useState<
    "aging" | "pivot" | "planning" | "plans" | "voucher" | "kopra" | "reconcile" | "rekap"
  >("pivot");
  
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
  const [selectedPlanForPrint, setSelectedPlanForPrint] = useState<PaymentPlan | null>(null);
  const [selectedVendorForSlip, setSelectedVendorForSlip] = useState<{ plan: PaymentPlan; vendor: TreasuryVendor } | null>(null);

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

  const refreshAll = useCallback(() => {
    fetchInvoices();
    fetchAllUnpaidInvoices();
    fetchPaidInvoices();
    fetchAgingSummary();
    fetchPlans();
    fetchVendors();
    fetchCompanyBanks();
    fetchBankTransactions();
  }, [fetchInvoices, fetchAllUnpaidInvoices, fetchPaidInvoices, fetchAgingSummary, fetchPlans, fetchVendors, fetchCompanyBanks, fetchBankTransactions]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Create Plan Action
  const handleCreatePlan = async (data: {
    companyBankId: number;
    category: string;
    voucherDate: string;
    justification: string;
    planMonth?: string;
    planWeek?: number;
  }) => {
    try {
      const pool = allUnpaidInvoices.length > 0 ? allUnpaidInvoices : invoices;
      const selectedInvs = pool.filter((i) => selectedInvoiceIds.includes(i.id));
      const items = selectedInvs.map((inv) => {
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

  // Approve Plan
  const handleApprovePlan = async (id: number) => {
    try {
      await api(`/api/treasury/payment-plans/${id}/approve`, { method: "POST" });
      onNotice?.("Payment plan approved successfully");
      fetchPlans();
    } catch (e: any) {
      onNotice?.(e.message || "Failed to approve plan");
    }
  };

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

      if (!response.ok) throw new Error("Failed to download Kopra file");

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

      onNotice?.("File Kopra Mandiri downloaded successfully");
      fetchPlans();
    } catch (e: any) {
      onNotice?.(e.message || "Failed to export Kopra file");
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

  // Update Vendor Banking Info
  const handleUpdateVendor = async (id: number, data: Partial<TreasuryVendor>) => {
    try {
      await api(`/api/treasury/vendors/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      onNotice?.("Vendor banking details updated");
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

  // Assign Voucher to Invoices (Strictly 1 Site + 1 Vendor)
  const handleAssignVoucher = async (invoiceIds: number[], voucherNo: string, voucherDate?: string) => {
    try {
      const res = await api<{ success: boolean; message: string }>("/api/treasury/invoices/assign-voucher", {
        method: "POST",
        body: JSON.stringify({
          invoiceIds,
          voucherNo,
          voucherDate,
        }),
      });
      onNotice?.(res.message || "Nomor voucher berhasil diterapkan dan disimpan");
      fetchInvoices();
      fetchAllUnpaidInvoices();
      return true;
    } catch (e: any) {
      onNotice?.(e.message || "Gagal menerapkan nomor voucher");
      return false;
    }
  };

  // Remove Voucher from Invoices
  const handleRemoveVoucher = async (invoiceIds: number[]) => {
    try {
      const res = await api<{ success: boolean; message: string }>("/api/treasury/invoices/remove-voucher", {
        method: "POST",
        body: JSON.stringify({
          invoiceIds,
        }),
      });
      onNotice?.(res.message || "Nomor voucher berhasil dilepas");
      fetchInvoices();
      fetchAllUnpaidInvoices();
      return true;
    } catch (e: any) {
      onNotice?.(e.message || "Gagal melepas nomor voucher");
      return false;
    }
  };

  // Fetch Next Recommended Voucher Number for a Site
  const fetchNextVoucherNo = async (site: string): Promise<string> => {
    try {
      const res = await api<{ success: boolean; nextVoucher: string }>(
        `/api/treasury/invoices/next-voucher-no?site=${encodeURIComponent(site)}`
      );
      return res.nextVoucher || "001";
    } catch (e) {
      return "001";
    }
  };

  return {
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
    selectedPlanForPrint,
    setSelectedPlanForPrint,
    selectedVendorForSlip,
    setSelectedVendorForSlip,
    refreshAll,
    fetchInvoices,
    handleCreatePlan,
    handleApprovePlan,
    handleRejectPlan,
    handleExportKopra,
    handleExportRekapAAP,
    handleAutoMatch,
    handleUpdateVendor,
    handleAssignPlan,
    handleAssignVoucher,
    handleRemoveVoucher,
    fetchNextVoucherNo,
  };
}
