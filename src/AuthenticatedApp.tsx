import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./layouts/AppShell";
import type { User } from "./lib/api";
import { ProtectedRoute } from "./router/ProtectedRoute";
import {
  DashboardRoute, HomeRoute, ARDashboardRoute, AccountSettingsRoute, RBACRoute, GeneralJournalRoute,
  CoalIndexRoute, RaiseFallRoute, FinanceDashboardRoute, FinanceBATrackerRoute,
  FinanceInvoiceRoute, FinancePaymentRoute, FinanceCustomerRoute,
  CompanyRoute, TreasuryManagementRoute, BudgetManagementRoute, ClosingPeriodRoute,
  NotificationCenterRoute, OrgUnitsRoute, VariableSOWRoute, KopraRoute
} from "./router/RouteWrappers";
import { slugify, treasuryTabs, viewPath } from "./data/navigation";

const TunaiPOPage = lazy(() => import("./pages/tunai-po/TunaiPOPage").then((m) => ({ default: m.TunaiPOPage })));
const TrackingTunaiPOPage = lazy(() => import("./pages/tunai-po/TrackingTunaiPOPage").then((m) => ({ default: m.TrackingTunaiPOPage })));
const AccurateLogPage = lazy(() => import("./pages/AccurateLogPage").then((m) => ({ default: m.AccurateLogPage })));
const RekapVoucherView =lazy(() => import("./pages/treasury/views/RekapVoucherView"));

const VariableSOWFormPage = lazy(() => import("./pages/VariableSOWFormPage").then((m) => ({ default: m.VariableSOWFormPage })));
const MasterDataFormRoute = lazy(() => import("./pages/MasterDataFormRoute").then((m) => ({ default: m.MasterDataFormRoute })));
const TransactionFormPage = lazy(() => import("./pages/TransactionFormPage").then((m) => ({ default: m.TransactionFormPage })));

function FormLoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-slate-400">
      <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-3" />
      <span className="text-xs font-medium text-slate-500">Memuat formulir...</span>
    </div>
  );
}

export function AuthenticatedApp({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <Routes>
      <Route path="/*" element={<AppShell user={user} onLogout={onLogout} />}>
        <Route index element={<HomeRoute />} />
        <Route path="account-settings" element={<AccountSettingsRoute />} />
        <Route path="rbac-management" element={<ProtectedRoute requiredView="RBAC Management"><RBACRoute /></ProtectedRoute>} />
        <Route path="role-and-permission" element={<ProtectedRoute requiredView="Role and Permission"><RBACRoute initialTab="matrix" pageTitle="Role and Permission" /></ProtectedRoute>} />
        <Route path="system-settings" element={<ProtectedRoute requiredView="System Settings"><RBACRoute initialTab="tcodes" pageTitle="System Settings" /></ProtectedRoute>} />
        
        <Route path="ar-dashboard" element={<ProtectedRoute requiredView="AR Dashboard"><ARDashboardRoute /></ProtectedRoute>} />
        <Route path="executive-dashboard" element={<ProtectedRoute requiredView="Executive Dashboard"><DashboardRoute /></ProtectedRoute>} />
        <Route path="finance-dashboard" element={<ProtectedRoute requiredView="Finance Dashboard"><DashboardRoute /></ProtectedRoute>} />
        
        <Route path="journal-entry" element={<ProtectedRoute requiredView="Journal Entry"><GeneralJournalRoute viewTitle="Journal Entry" /></ProtectedRoute>} />
        <Route path="general-journal" element={<ProtectedRoute requiredView="Journal Entry"><GeneralJournalRoute viewTitle="Journal Entry" /></ProtectedRoute>} />
        <Route path="journal-approval" element={<ProtectedRoute requiredView="Journal Approval"><GeneralJournalRoute viewTitle="Journal Approval" /></ProtectedRoute>} />
        <Route path="journal-posting" element={<ProtectedRoute requiredView="Journal Posting"><GeneralJournalRoute viewTitle="Journal Posting" /></ProtectedRoute>} />
        <Route path="general-ledger" element={<ProtectedRoute requiredView="General Ledger"><GeneralJournalRoute viewTitle="General Ledger" /></ProtectedRoute>} />
        <Route path="trial-balance" element={<ProtectedRoute requiredView="Trial Balance"><GeneralJournalRoute viewTitle="Trial Balance" /></ProtectedRoute>} />
        <Route path="profit-loss" element={<ProtectedRoute requiredView="General Journal"><GeneralJournalRoute viewTitle="Profit & Loss" /></ProtectedRoute>} />
        <Route path="balance-sheet" element={<ProtectedRoute requiredView="General Journal"><GeneralJournalRoute viewTitle="Balance Sheet" /></ProtectedRoute>} />
        <Route path="closing-period" element={<ProtectedRoute requiredView="Closing Period"><ClosingPeriodRoute viewTitle="Closing Period" /></ProtectedRoute>} />

        <Route path="annual-budget" element={<ProtectedRoute requiredView="Annual Budget"><BudgetManagementRoute viewTitle="Annual Budget" /></ProtectedRoute>} />
        <Route path="monthly-budget" element={<ProtectedRoute requiredView="Monthly Budget"><BudgetManagementRoute viewTitle="Monthly Budget" /></ProtectedRoute>} />
        <Route path="budget-submission" element={<ProtectedRoute requiredView="Budget Submission"><BudgetManagementRoute viewTitle="Budget Submission" /></ProtectedRoute>} />
        <Route path="budget-approval" element={<ProtectedRoute requiredView="Budget Approval"><BudgetManagementRoute viewTitle="Budget Approval" /></ProtectedRoute>} />
        <Route path="budget-revision" element={<ProtectedRoute requiredView="Budget Revision"><BudgetManagementRoute viewTitle="Budget Revision" /></ProtectedRoute>} />
        <Route path="budget-transfer" element={<ProtectedRoute requiredView="Budget Transfer"><BudgetManagementRoute viewTitle="Budget Transfer" /></ProtectedRoute>} />
        <Route path="budget-versus-actual" element={<ProtectedRoute requiredView="Budget versus Actual"><BudgetManagementRoute viewTitle="Budget versus Actual" /></ProtectedRoute>} />

        <Route path="accrual-and-adjustment-journal" element={<ProtectedRoute requiredView="Accrual and Adjustment Journal"><ClosingPeriodRoute viewTitle="Accrual and Adjustment Journal" /></ProtectedRoute>} />
        <Route path="depreciation-posting" element={<ProtectedRoute requiredView="Depreciation Posting"><ClosingPeriodRoute viewTitle="Depreciation Posting" /></ProtectedRoute>} />
        <Route path="review-trial-balance" element={<ProtectedRoute requiredView="Review Trial Balance"><ClosingPeriodRoute viewTitle="Review Trial Balance" /></ProtectedRoute>} />
        <Route path="financial-review-and-approval" element={<ProtectedRoute requiredView="Financial Review and Approval"><ClosingPeriodRoute viewTitle="Financial Review and Approval" /></ProtectedRoute>} />
        <Route path="close-period-lock" element={<ProtectedRoute requiredView="Close Period Lock"><ClosingPeriodRoute viewTitle="Close Period Lock" /></ProtectedRoute>} />

        <Route path="notification-center" element={<ProtectedRoute requiredView="Notification Center"><NotificationCenterRoute /></ProtectedRoute>} />
        <Route path="accurate-api-log" element={<ProtectedRoute requiredView="Accurate API Log"><Suspense fallback={<FormLoadingFallback />}><AccurateLogPage /></Suspense></ProtectedRoute>} />
        
        <Route path="site-setup" element={<Navigate to="/client-setup" replace />} />
        <Route path="setup-parameter-site-klien" element={<Navigate to="/client-setup" replace />} />
        
        <Route path="coal-index" element={<ProtectedRoute requiredView="Coal Index"><CoalIndexRoute /></ProtectedRoute>} />
        <Route path="company" element={<ProtectedRoute requiredView="Company"><CompanyRoute /></ProtectedRoute>} />
        <Route path="raise-fall" element={<ProtectedRoute requiredView="RAISE & FALL"><RaiseFallRoute viewTitle="RAISE & FALL" /></ProtectedRoute>} />
        <Route path="currency" element={<ProtectedRoute requiredView="Currency"><RaiseFallRoute viewTitle="Currency" /></ProtectedRoute>} />
        
        <Route path="transaction/new" element={<ProtectedRoute requiredView="Payment Request"><Suspense fallback={<FormLoadingFallback />}><TransactionFormPage /></Suspense></ProtectedRoute>} />
        <Route path="transaction/:id/edit" element={<ProtectedRoute requiredView="Payment Request"><Suspense fallback={<FormLoadingFallback />}><TransactionFormPage /></Suspense></ProtectedRoute>} />
        
        <Route path="finance-ar-dashboard" element={<ProtectedRoute requiredView="Finance & AR Dashboard"><FinanceDashboardRoute /></ProtectedRoute>} />
        <Route path="berita-acara-ba-tracker" element={<ProtectedRoute requiredView="Berita Acara (BA) Tracker"><FinanceBATrackerRoute /></ProtectedRoute>} />
        
        <Route path="invoice-management" element={<ProtectedRoute requiredView="Invoice Management"><FinanceInvoiceRoute /></ProtectedRoute>} />
        
        <Route path="payment-receipt-log" element={<ProtectedRoute requiredView="Payment & Receipt Log"><FinancePaymentRoute /></ProtectedRoute>} />
        <Route path="pengajuan-tunai-po" element={<ProtectedRoute requiredView="Pengajuan Tunai PO"><Suspense fallback={<FormLoadingFallback />}><TunaiPOPage /></Suspense></ProtectedRoute>} />
        <Route path="fuel" element={<ProtectedRoute requiredView="Fuel"><Suspense fallback={<FormLoadingFallback />}><TunaiPOPage key="fuel" kind="FUEL" /></Suspense></ProtectedRoute>} />
        <Route path="tracking-tunai-po" element={<ProtectedRoute requiredView="Tracking Tunai PO"><Suspense fallback={<FormLoadingFallback />}><TrackingTunaiPOPage /></Suspense></ProtectedRoute>} />
        <Route path="rekap-voucher" element={<ProtectedRoute requiredView="Rekap Voucher"><Suspense fallback={<FormLoadingFallback />}><RekapVoucherView /></Suspense></ProtectedRoute>} />
        <Route path="treasury-management" element={<Navigate to={viewPath("Pivot Hutang")} replace />} />
        <Route path="payment-plan" element={<Navigate to={viewPath("Plan AP")} replace />} />
        <Route path="payment-voucher" element={<Navigate to={viewPath("Voucher Payment")} replace />} />
        {(Object.keys(treasuryTabs) as (keyof typeof treasuryTabs)[]).map((title) => (
          <Route key={title} path={slugify(title)} element={<ProtectedRoute requiredView={title}><TreasuryManagementRoute tab={treasuryTabs[title]} /></ProtectedRoute>} />
        ))}
        <Route path="feastkop" element={<KopraRoute />} />
        <Route path="client-setup" element={<ProtectedRoute requiredView="Client Setup"><FinanceCustomerRoute viewTitle="Client Setup" /></ProtectedRoute>} />
        <Route path="customer-master-credit-terms" element={<ProtectedRoute requiredView="Client Setup"><FinanceCustomerRoute viewTitle="Client Setup" /></ProtectedRoute>} />
        
        <Route path="variable-sow" element={<ProtectedRoute requiredView="Variable SOW"><VariableSOWRoute /></ProtectedRoute>} />
        <Route path="variable-sow/new" element={<ProtectedRoute requiredView="Variable SOW"><Suspense fallback={<FormLoadingFallback />}><VariableSOWFormPage /></Suspense></ProtectedRoute>} />
        <Route path="variable-sow/:id/edit" element={<ProtectedRoute requiredView="Variable SOW"><Suspense fallback={<FormLoadingFallback />}><VariableSOWFormPage /></Suspense></ProtectedRoute>} />
        <Route path=":slug/new" element={<Suspense fallback={<FormLoadingFallback />}><MasterDataFormRoute /></Suspense>} />
        <Route path=":slug/:id/edit" element={<Suspense fallback={<FormLoadingFallback />}><MasterDataFormRoute /></Suspense>} />
      </Route>
    </Routes>
  );
}
