import { lazy, Suspense } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { routes } from "./routes";

function RouteLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-slate-400">
      <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-3" />
      <span className="text-xs font-medium text-slate-500">Memuat modul...</span>
    </div>
  );
}

const DashboardPage = lazy(() => import("../pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const AccountSettingsPage = lazy(() => import("../pages/AccountSettingsPage").then((m) => ({ default: m.AccountSettingsPage })));
const RBACPage = lazy(() => import("../pages/RBACPage").then((m) => ({ default: m.RBACPage })));
const AccountingShell = lazy(() => import("../pages/accounting/AccountingShell").then((m) => ({ default: m.AccountingShell })));
const CoalIndexPage = lazy(() => import("../pages/CoalIndexPage").then((m) => ({ default: m.CoalIndexPage })));
const MasterRaiseFallPage = lazy(() => import("../pages/MasterRaiseFallPage").then((m) => ({ default: m.MasterRaiseFallPage })));
const FinanceDashboardPage = lazy(() => import("../pages/FinanceDashboardPage").then((m) => ({ default: m.FinanceDashboardPage })));
const FinanceBATrackerPage = lazy(() => import("../pages/FinanceBATrackerPage").then((m) => ({ default: m.FinanceBATrackerPage })));
const FinanceInvoicePage = lazy(() => import("../pages/FinanceInvoicePage").then((m) => ({ default: m.FinanceInvoicePage })));
const FinancePaymentPage = lazy(() => import("../pages/FinancePaymentPage").then((m) => ({ default: m.FinancePaymentPage })));
const FinanceCustomerPage = lazy(() => import("../pages/FinanceCustomerPage").then((m) => ({ default: m.FinanceCustomerPage })));
const CompanyPage = lazy(() => import("../pages/CompanyPage").then((m) => ({ default: m.CompanyPage })));
const TreasuryPage = lazy(() => import("../pages/TreasuryPage").then((m) => ({ default: m.TreasuryPage })));
const BudgetManagementPage = lazy(() => import("../pages/BudgetManagementPage").then((m) => ({ default: m.BudgetManagementPage })));
const ClosingPeriodPage = lazy(() => import("../pages/ClosingPeriodPage").then((m) => ({ default: m.ClosingPeriodPage })));
const NotificationCenterPage = lazy(() => import("../pages/NotificationCenterPage").then((m) => ({ default: m.NotificationCenterPage })));
const KopraPage = lazy(() => import("../pages/KopraPage").then((m) => ({ default: m.KopraPage })));
const OrgUnitsPage = lazy(() => import("../pages/OrgUnitsPage").then((m) => ({ default: m.OrgUnitsPage })));
const VariableSOWPage = lazy(() => import("../pages/VariableSOWPage").then((m) => ({ default: m.VariableSOWPage })));

export function VariableSOWRoute({ viewTitle = "Variable SOW" }: { viewTitle?: string } = {}) {
  const { query, setNotice } = useOutletContext<any>();
  return (
    <Suspense fallback={<RouteLoading />}>
      <VariableSOWPage viewTitle={viewTitle} query={query} onNotice={setNotice} />
    </Suspense>
  );
}


export function DashboardRoute() {
  const { dashboard, transactions, query, refresh, setNotice } = useOutletContext<any>();
  const navigate = useNavigate();
  return (
    <Suspense fallback={<RouteLoading />}>
      <DashboardPage dashboard={dashboard} transactions={transactions} query={query} onRefresh={refresh} onCreate={() => navigate(routes.transaction.new)} onNotice={setNotice} />
    </Suspense>
  );
}

export function AccountSettingsRoute() {
  const { user, notifications } = useOutletContext<any>();
  const navigate = useNavigate();
  return (
    <Suspense fallback={<RouteLoading />}>
      <AccountSettingsPage user={user} auditLogs={notifications ?? []} onBack={() => navigate("/")} />
    </Suspense>
  );
}

export function RBACRoute({ initialTab = "users", pageTitle = "User & RBAC Management" }: { initialTab?: "users" | "matrix" | "simulate" | "tcodes"; pageTitle?: string } = {}) {
  const { user, roles, permissions, tcodes } = useOutletContext<any>();
  return (
    <Suspense fallback={<RouteLoading />}>
      <RBACPage user={user} roles={roles} myPermissions={permissions} myTcodes={tcodes} initialTab={initialTab} pageTitle={pageTitle} />
    </Suspense>
  );
}

export function GeneralJournalRoute({ viewTitle }: { viewTitle: string }) {
  const { user } = useOutletContext<any>();

  // Map legacy viewTitle strings to AccountingShell tab IDs
  const tabMap: Record<string, string> = {
    "Journal Entry": "journal-entry",
    "Journal Approval": "posting",
    "Journal Posting": "posting",
    "General Ledger": "general-ledger",
    "Trial Balance": "trial-balance",
    "Profit & Loss": "profit-loss",
    "Profit and Loss": "profit-loss",
    "Laba Rugi": "profit-loss",
    "Balance Sheet": "balance-sheet",
    "Neraca": "balance-sheet",
  };
  const initialTab = (tabMap[viewTitle] ?? "journal-entry") as any;

  return (
    <Suspense fallback={<RouteLoading />}>
      <AccountingShell
        initialTab={initialTab}
        currentUserName={user?.name ?? "Accounting Staff"}
        userRole={user?.role}
      />
    </Suspense>
  );
}

export function CoalIndexRoute() {
  const { query, setNotice, user } = useOutletContext<any>();
  return (
    <Suspense fallback={<RouteLoading />}>
      <CoalIndexPage viewTitle="Coal Index" query={query} onNotice={setNotice} user={user} />
    </Suspense>
  );
}

export function RaiseFallRoute({ viewTitle }: { viewTitle: string }) {
  const { query, setNotice } = useOutletContext<any>();
  return (
    <Suspense fallback={<RouteLoading />}>
      <MasterRaiseFallPage viewTitle={viewTitle} query={query} onNotice={setNotice} initialTab={viewTitle === "Currency" ? "mrate" : "monthly"} />
    </Suspense>
  );
}

export function FinanceDashboardRoute() {
  const { query, setNotice, user } = useOutletContext<any>();
  return (
    <Suspense fallback={<RouteLoading />}>
      <FinanceDashboardPage viewTitle="Finance & AR Dashboard" query={query} onNotice={setNotice} user={user} />
    </Suspense>
  );
}

export function FinanceBATrackerRoute({ viewTitle = "Berita Acara (BA) Tracker" }: { viewTitle?: string }) {
  const { query, setNotice, user } = useOutletContext<any>();
  return (
    <Suspense fallback={<RouteLoading />}>
      <FinanceBATrackerPage viewTitle={viewTitle} query={query} onNotice={setNotice} user={user} />
    </Suspense>
  );
}

export function FinanceInvoiceRoute({ viewTitle = "Invoice Management" }: { viewTitle?: string }) {
  const { query, setNotice, user } = useOutletContext<any>();
  return (
    <Suspense fallback={<RouteLoading />}>
      <FinanceInvoicePage viewTitle={viewTitle} query={query} onNotice={setNotice} user={user} />
    </Suspense>
  );
}

export function FinancePaymentRoute() {
  const { query, setNotice, user } = useOutletContext<any>();
  return (
    <Suspense fallback={<RouteLoading />}>
      <FinancePaymentPage viewTitle="Payment & Receipt Log" query={query} onNotice={setNotice} user={user} />
    </Suspense>
  );
}

export function FinanceCustomerRoute({ viewTitle = "Client Setup" }: { viewTitle?: string } = {}) {
  const { query, setNotice, user } = useOutletContext<any>();
  return (
    <Suspense fallback={<RouteLoading />}>
      <FinanceCustomerPage viewTitle={viewTitle} query={query} onNotice={setNotice} user={user} />
    </Suspense>
  );
}

export function CompanyRoute() {
  const { query, setNotice, user } = useOutletContext<any>();
  return (
    <Suspense fallback={<RouteLoading />}>
      <CompanyPage viewTitle="Company" query={query} onNotice={setNotice} user={user} />
    </Suspense>
  );
}

export function TreasuryManagementRoute() {
  const { query, setNotice, user } = useOutletContext<any>();
  return (
    <Suspense fallback={<RouteLoading />}>
      <TreasuryPage viewTitle="Treasury Management" query={query} onNotice={setNotice} user={user} />
    </Suspense>
  );
}

export function BudgetManagementRoute({ viewTitle }: { viewTitle: string }) {
  const { setNotice } = useOutletContext<any>();
  return (
    <Suspense fallback={<RouteLoading />}>
      <BudgetManagementPage viewTitle={viewTitle} onNotice={setNotice} />
    </Suspense>
  );
}

export function ClosingPeriodRoute({ viewTitle }: { viewTitle: string }) {
  return (
    <Suspense fallback={<RouteLoading />}>
      <ClosingPeriodPage viewTitle={viewTitle} />
    </Suspense>
  );
}

export function NotificationCenterRoute() {
  const { setNotice } = useOutletContext<any>();
  return (
    <Suspense fallback={<RouteLoading />}>
      <NotificationCenterPage onNotice={setNotice} />
    </Suspense>
  );
}

export function OrgUnitsRoute() {
  const { query, setNotice, user } = useOutletContext<any>();
  return (
    <Suspense fallback={<RouteLoading />}>
      <OrgUnitsPage viewTitle="Unit Kerja & Departemen" query={query} onNotice={setNotice} user={user} />
    </Suspense>
  );
}

export function KopraRoute() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <KopraPage />
    </Suspense>
  );
}

