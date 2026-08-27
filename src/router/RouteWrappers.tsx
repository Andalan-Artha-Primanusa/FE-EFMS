import { useOutletContext, useNavigate } from "react-router-dom";
import { routes } from "./routes";
import { DashboardPage } from "../pages/DashboardPage";
import { AccountSettingsPage } from "../pages/AccountSettingsPage";
import { RBACPage } from "../pages/RBACPage";
import { GeneralJournalPage } from "../pages/GeneralJournalPage";
import { CoalIndexPage } from "../pages/CoalIndexPage";
import { MasterRaiseFallPage } from "../pages/MasterRaiseFallPage";
import { FinanceDashboardPage } from "../pages/FinanceDashboardPage";
import { FinanceBATrackerPage } from "../pages/FinanceBATrackerPage";
import { FinanceInvoicePage } from "../pages/FinanceInvoicePage";
import { FinancePaymentPage } from "../pages/FinancePaymentPage";
import { FinanceCustomerPage } from "../pages/FinanceCustomerPage";
import { CompanyPage } from "../pages/CompanyPage";

export function DashboardRoute() {
  const { dashboard, transactions, query, refresh, setNotice } = useOutletContext<any>();
  const navigate = useNavigate();
  return <DashboardPage dashboard={dashboard} transactions={transactions} query={query} onRefresh={refresh} onCreate={() => navigate(routes.transaction.new)} onNotice={setNotice} />;
}

export function AccountSettingsRoute() {
  const { user, notifications } = useOutletContext<any>();
  const navigate = useNavigate();
  return <AccountSettingsPage user={user} auditLogs={notifications ?? []} onBack={() => navigate("/")} />;
}

export function RBACRoute() {
  const { user, roles, permissions, tcodes } = useOutletContext<any>();
  return <RBACPage user={user} roles={roles} myPermissions={permissions} myTcodes={tcodes} />;
}

export function GeneralJournalRoute({ viewTitle }: { viewTitle: string }) {
  const { user, query, setNotice } = useOutletContext<any>();
  return <GeneralJournalPage viewTitle={viewTitle} query={query} onNotice={setNotice} user={user} />;
}

export function CoalIndexRoute() {
  const { query, setNotice } = useOutletContext<any>();
  return <CoalIndexPage viewTitle="Coal Index" query={query} onNotice={setNotice} />;
}

export function RaiseFallRoute({ viewTitle }: { viewTitle: string }) {
  const { query, setNotice } = useOutletContext<any>();
  return <MasterRaiseFallPage viewTitle={viewTitle} query={query} onNotice={setNotice} initialTab={viewTitle === "Currency" ? "mrate" : "monthly"} />;
}

export function FinanceDashboardRoute() {
  const { query, setNotice, user } = useOutletContext<any>();
  return <FinanceDashboardPage viewTitle="Finance & AR Dashboard" query={query} onNotice={setNotice} user={user} />;
}

export function FinanceBATrackerRoute({ viewTitle = "Berita Acara (BA) Tracker" }: { viewTitle?: string }) {
  const { query, setNotice, user } = useOutletContext<any>();
  return <FinanceBATrackerPage viewTitle={viewTitle} query={query} onNotice={setNotice} user={user} />;
}

export function FinanceInvoiceRoute({ viewTitle = "Invoice Management" }: { viewTitle?: string }) {
  const { query, setNotice, user } = useOutletContext<any>();
  return <FinanceInvoicePage viewTitle={viewTitle} query={query} onNotice={setNotice} user={user} />;
}

export function FinancePaymentRoute() {
  const { query, setNotice, user } = useOutletContext<any>();
  return <FinancePaymentPage viewTitle="Payment & Receipt Log" query={query} onNotice={setNotice} user={user} />;
}

export function FinanceCustomerRoute() {
  const { query, setNotice, user } = useOutletContext<any>();
  return <FinanceCustomerPage viewTitle="Customer Master & Credit Terms" query={query} onNotice={setNotice} user={user} />;
}

export function CompanyRoute() {
  const { query, setNotice, user } = useOutletContext<any>();
  return <CompanyPage viewTitle="Company" query={query} onNotice={setNotice} user={user} />;
}
