import { useState, useEffect } from "react";
import { api, getSBSPenalties, SBSPenaltyItem, User as UserType } from "../../lib/api";
import { authorized, filterRowsByCompanyScope, isHeadOfficeUser, companyScopeOf, scopedEndpoint, isSuperAdminRole } from "../../lib/auth";

interface UseFinanceDataLoaderProps {
  viewTitle: string;
  user?: UserType;
  onNotice: (msg: string) => void;
}

export function useFinanceDataLoader({ viewTitle, user, onNotice }: UseFinanceDataLoaderProps) {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [baRows, setBaRows] = useState<any[]>([]);
  const [invoiceRows, setInvoiceRows] = useState<any[]>([]);
  const [paymentRows, setPaymentRows] = useState<any[]>([]);
  const [customerRows, setCustomerRows] = useState<any[]>([]);
  const [pendingVolumeLedgers, setPendingVolumeLedgers] = useState<any[]>([]);
  const [sbsPenalties, setSbsPenalties] = useState<SBSPenaltyItem[]>([]);
  const [accountingJournals, setAccountingJournals] = useState<any[]>([]);

  const userRole = user?.role || "User";
  const isSuper = isSuperAdminRole(user?.role || "");
  const isFinanceSpecialist = isSuper || authorized(user, "operational_transaction", "write") || authorized(user, "ba_tracker", "write") || authorized(user, "finance", "write");
  const isSPV = isSuper || authorized(user, "ba_tracker", "verify") || authorized(user, "invoice", "verify") || authorized(user, "finance", "verify");
  const isManager = isSuper || authorized(user, "ba_tracker", "approve") || authorized(user, "invoice", "approve_tier1") || authorized(user, "approval", "act");
  const isDirector = isSuper || authorized(user, "invoice", "approve_tier2") || authorized(user, "finance", "approve_tier2") || authorized(user, "management_dashboard", "read");

  async function loadData(showLoading = false) {
    if (showLoading) setLoading(true);
    try {
      const [dashRes, baRes, invRes, payRes, custRes, pVolRes, sbsPenRes, jrnRes] = await Promise.all([
        (viewTitle === "Finance & AR Dashboard" || viewTitle === "Finance AR Dashboard" || viewTitle.includes("AR Dashboard"))
          ? api<any>(scopedEndpoint("/api/finance/dashboard", user || ({ role: userRole } as any))).catch(() => null)
          : Promise.resolve(null),
        api<any[]>("/api/finance/ba-trackers").catch(() => []),
        api<any[]>("/api/finance/invoices").catch(() => []),
        api<any[]>("/api/finance/payments").catch(() => []),
        api<any[]>("/api/finance/customers").catch(() => []),
        api<any[]>("/api/finance/pending-volumes").catch(() => []),
        getSBSPenalties().catch(() => []),
        api<any[]>("/api/finance/journals").catch(() => [])
      ]);

      if (dashRes) {
        if (user && !isHeadOfficeUser(user)) {
          const scope = companyScopeOf(user);
          const siteCode = (scope.codes[0] || user.companyCode || "").toUpperCase();
          const matchesSite = (cCode: string) => {
            const up = String(cCode || "").toUpperCase();
            if (scope.codes.length > 0) return scope.codes.includes(up);
            return up === siteCode || (siteCode === "POS" && (up === "IBP" || up === "BBA"));
          };
          setDashboardData({
            ...dashRes,
            agingMatrix: (dashRes.agingMatrix ?? []).filter((r: any) => matchesSite(r.customer || r.customerCode)),
            topOverdueInvoices: (dashRes.topOverdueInvoices ?? []).filter((inv: any) => matchesSite(inv.customerCode || inv.customer)),
            baBottlenecks: (dashRes.baBottlenecks ?? []).filter((b: any) => matchesSite(b.customer || b.customerCode)),
          });
        } else {
          setDashboardData(dashRes);
        }
      }
      if (Array.isArray(baRes)) setBaRows(user ? filterRowsByCompanyScope(baRes, user) : baRes);
      if (Array.isArray(invRes)) setInvoiceRows(user ? filterRowsByCompanyScope(invRes, user) : invRes);
      if (Array.isArray(payRes)) setPaymentRows(user ? filterRowsByCompanyScope(payRes, user) : payRes);
      if (Array.isArray(custRes)) setCustomerRows(user ? filterRowsByCompanyScope(custRes, user) : custRes);
      if (Array.isArray(pVolRes)) setPendingVolumeLedgers(user ? filterRowsByCompanyScope(pVolRes, user) : pVolRes);
      if (Array.isArray(sbsPenRes)) setSbsPenalties(sbsPenRes);
      if (Array.isArray(jrnRes)) setAccountingJournals(jrnRes);
    } catch (err: any) {
      onNotice(err?.message || "Gagal memuat data finance");
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  useEffect(() => {
    loadData(true);
    if (customerRows.length === 0) {
      api<any[]>("/api/finance/customers").then(res => {
        if (Array.isArray(res)) setCustomerRows(res);
      }).catch(() => {});
    }
  }, [viewTitle]);

  return {
    loading,
    setLoading,
    dashboardData,
    setDashboardData,
    baRows,
    setBaRows,
    invoiceRows,
    setInvoiceRows,
    paymentRows,
    setPaymentRows,
    customerRows,
    setCustomerRows,
    pendingVolumeLedgers,
    setPendingVolumeLedgers,
    sbsPenalties,
    setSbsPenalties,
    accountingJournals,
    setAccountingJournals,
    userRole,
    isSuper,
    isFinanceSpecialist,
    isSPV,
    isManager,
    isDirector,
    loadData
  };
}
