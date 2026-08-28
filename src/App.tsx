import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./layouts/AppShell";
import { LoginPage } from "./pages/LoginPage";
import type { User } from "./lib/api";
import { VariableSOWFormPage } from "./pages/VariableSOWFormPage";
import { MasterDataFormRoute } from "./pages/MasterDataFormRoute";
import { TransactionFormPage } from "./pages/TransactionFormPage";
import { ProtectedRoute } from "./router/ProtectedRoute";
import { NotFoundPage } from "./pages/NotFoundPage";
import { DashboardRoute, AccountSettingsRoute, RBACRoute, GeneralJournalRoute, CoalIndexRoute, RaiseFallRoute, FinanceDashboardRoute, FinanceBATrackerRoute, FinanceInvoiceRoute, FinancePaymentRoute, FinanceCustomerRoute, SiteSetupRoute, CompanyRoute } from "./router/RouteWrappers";

export function App() {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem("financeerp.user");
      if (!raw || raw === "undefined" || raw === "null") return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn("Failed to parse user from localStorage:", e);
      localStorage.removeItem("financeerp.user");
      return null;
    }
  });

  if (!user) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<LoginPage onLogin={setUser} />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<AppShell user={user} onLogout={() => setUser(null)} />}>
          <Route index element={<DashboardRoute />} />
          <Route path="account-settings" element={<AccountSettingsRoute />} />
          <Route path="rbac-management" element={<ProtectedRoute requiredView="RBAC Management"><RBACRoute /></ProtectedRoute>} />
          <Route path="role-and-permission" element={<ProtectedRoute requiredView="Role and Permission"><RBACRoute initialTab="matrix" pageTitle="Role and Permission" /></ProtectedRoute>} />
          <Route path="system-settings" element={<ProtectedRoute requiredView="System Settings"><RBACRoute initialTab="tcodes" pageTitle="System Settings" /></ProtectedRoute>} />
          
          <Route path="general-journal" element={<ProtectedRoute requiredView="Journal Entry"><GeneralJournalRoute viewTitle="Journal Entry" /></ProtectedRoute>} />
          <Route path="journal-approval" element={<ProtectedRoute requiredView="Journal Approval"><GeneralJournalRoute viewTitle="Journal Approval" /></ProtectedRoute>} />
          <Route path="journal-posting" element={<ProtectedRoute requiredView="Journal Posting"><GeneralJournalRoute viewTitle="Journal Posting" /></ProtectedRoute>} />
          <Route path="general-ledger" element={<ProtectedRoute requiredView="General Ledger"><GeneralJournalRoute viewTitle="General Ledger" /></ProtectedRoute>} />
          <Route path="trial-balance" element={<ProtectedRoute requiredView="Trial Balance"><GeneralJournalRoute viewTitle="Trial Balance" /></ProtectedRoute>} />
          <Route path="closing-period" element={<ProtectedRoute requiredView="Closing Period"><GeneralJournalRoute viewTitle="Closing Period" /></ProtectedRoute>} />
          
          <Route path="site-setup" element={<ProtectedRoute requiredView="Setup Parameter Site & Klien"><SiteSetupRoute /></ProtectedRoute>} />
          <Route path="setup-parameter-site-klien" element={<ProtectedRoute requiredView="Setup Parameter Site & Klien"><SiteSetupRoute /></ProtectedRoute>} />
          
          <Route path="coal-index" element={<ProtectedRoute requiredView="Coal Index"><CoalIndexRoute /></ProtectedRoute>} />
          <Route path="company" element={<ProtectedRoute requiredView="Company"><CompanyRoute /></ProtectedRoute>} />
          <Route path="raise-fall" element={<ProtectedRoute requiredView="RAISE & FALL"><RaiseFallRoute viewTitle="RAISE & FALL" /></ProtectedRoute>} />
          <Route path="currency" element={<ProtectedRoute requiredView="Currency"><RaiseFallRoute viewTitle="Currency" /></ProtectedRoute>} />
          
          <Route path="transaction/new" element={<ProtectedRoute requiredView="Payment Request"><TransactionFormPage /></ProtectedRoute>} />
          <Route path="transaction/:id/edit" element={<ProtectedRoute requiredView="Payment Request"><TransactionFormPage /></ProtectedRoute>} />
          
          <Route path="finance-ar-dashboard" element={<ProtectedRoute requiredView="Finance & AR Dashboard"><FinanceDashboardRoute /></ProtectedRoute>} />
          <Route path="berita-acara-ba-tracker" element={<ProtectedRoute requiredView="Berita Acara (BA) Tracker"><FinanceBATrackerRoute /></ProtectedRoute>} />
          
          <Route path="invoice-management" element={<ProtectedRoute requiredView="Invoice Management"><FinanceInvoiceRoute /></ProtectedRoute>} />
          
          <Route path="payment-receipt-log" element={<ProtectedRoute requiredView="Payment & Receipt Log"><FinancePaymentRoute /></ProtectedRoute>} />
          <Route path="client-setup" element={<ProtectedRoute requiredView="Client Setup"><FinanceCustomerRoute viewTitle="Client Setup" /></ProtectedRoute>} />
          <Route path="customer-master-credit-terms" element={<ProtectedRoute requiredView="Client Setup"><FinanceCustomerRoute viewTitle="Client Setup" /></ProtectedRoute>} />
          
          <Route path="variable-sow/new" element={<ProtectedRoute requiredView="Variable SOW"><VariableSOWFormPage /></ProtectedRoute>} />
          <Route path="variable-sow/:id/edit" element={<ProtectedRoute requiredView="Variable SOW"><VariableSOWFormPage /></ProtectedRoute>} />
          <Route path=":slug/new" element={<MasterDataFormRoute />} />
          <Route path=":slug/:id/edit" element={<MasterDataFormRoute />} />
          <Route path=":slug" element={null} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
