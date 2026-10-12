export type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  companyId?: number | null;
  companyCode?: string | null;
  companyName?: string | null;
  companyScope?: string[] | "ALL" | null;
  isHeadOffice?: boolean;
  scopeType?: "GLOBAL" | "HO" | "SITE";
  twoFactorEnabled?: boolean;
  lastLoginAt?: string | null;
  permissions?: Permission[];
  tcodes?: TCode[];
};

export type Transaction = {
  id: number;
  number: string;
  type: string;
  requester: string;
  company: string;
  description: string;
  amount: number;
  status: string;
  budgetStatus: string;
  createdAt: string;
};

export type MasterRecord = {
  id: number;
  type: string;
  code: string;
  name: string;
  status: string;
  metadata: string;
  createdAt: string;
};

export type AuditLog = {
  id: number;
  user: string;
  module: string;
  action: string;
  referenceType: string;
  referenceId: string;
  ipAddress: string;
  device: string;
  createdAt: string;
};

export type Permission = {
  module: string;
  action: string;
  description: string;
};

export type TCode = {
  id: number;
  code: string;
  description: string;
  route: string;
  module: string;
  action: string;
};

export type RoleAccess = {
  role: string;
  scopeType?: "GLOBAL" | "HO" | "SITE";
  isSystem?: boolean;
  permissions: Permission[];
  tcodes: TCode[];
  scopes: string[];
};

export type Company = {
  id: number;
  code: string;
  name: string;
  isHo: boolean;
  createdAt: string;
};

export type OrgUnit = {
  id: number;
  companyId: number;
  type: string;
  code: string;
  name: string;
  parentId?: number | null;
  status: string;
  companyCode?: string;
  companyName?: string;
};

export const ORG_UNIT_TYPES = [
  "business_unit",
  "branch",
  "site",
  "department",
  "division",
  "cost_center",
  "profit_center",
  "project"
] as const;

export type Dashboard = {
  kpis: Array<{ label: string; value: number; delta: number; tone: string }>;
  monthlyFinance: Array<Record<string, number | string>>;
  cashFlow: Array<Record<string, number | string>>;
  agingReceivable: Array<Record<string, number | string>>;
  agingPayable: Array<Record<string, number | string>>;
  pendingApprovals: Transaction[];
  cashPosition: Array<Record<string, number | string>>;
};

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("financeerp.token");
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem("financeerp.token");
    localStorage.removeItem("financeerp.user");
    window.location.href = "/";
    throw new Error("Sesi telah berakhir, silakan login kembali.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.message ?? err.error ?? "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
export type LoginResult =
  | { token: string; user: User; requires2FA?: false }
  | { token?: undefined; user?: User; requires2FA: true; userId: number; email: string };

export async function login(email: string, password: string) {
  return api<LoginResult>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export async function downloadTemplate(type: string) {
  const token = localStorage.getItem("financeerp.token");
  const res = await fetch(`${API_BASE}/api/import/templates/${type}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error("Gagal download template");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${type}-template.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function importCSV(type: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  return api<{ type: string; inserted: number; skipped: number; errors: string[] }>(`/api/imports/${type}`, {
    method: "POST",
    body: form
  });
}

export async function uploadDocumentFile(file: File, module = "Finance", category = "BA Attachment") {
  const form = new FormData();
  form.append("file", file);
  form.append("module", module);
  form.append("category", category);
  return api<{ fileName: string; storedName: string; url: string; sizeBytes: number }>("/api/documents", {
    method: "POST",
    body: form
  });
}

export function createTransaction(input: { type: string; companyId: number; description: string; amount: number }) {
  return api<Transaction>("/api/transactions", { method: "POST", body: JSON.stringify(input) });
}

export function createMasterRecord(input: { type: string; code: string; name: string; status: string; metadata: string }) {
  return api<MasterRecord>("/api/master-data", { method: "POST", body: JSON.stringify(input) });
}

export function updateMasterRecord(id: number, input: { type: string; code: string; name: string; status: string; metadata: string }) {
  return api<MasterRecord>(`/api/master-data/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

export function deleteMasterRecord(id: number) {
  return api<{ status: string }>(`/api/master-data/${id}`, { method: "DELETE" });
}

export function getMasterData(params: { type: string; company?: string; q?: string }) {
  const qs = new URLSearchParams();
  if (params.type) qs.set("type", params.type);
  if (params.company) qs.set("company", params.company);
  if (params.q) qs.set("q", params.q);
  const q = qs.toString();
  return api<MasterRecord[]>(`/api/master-data${q ? `?${q}` : ""}`);
}

export function previewNumber(object: string, type = "*") {
  return api<{ object: string; type: string; nextNumber: string }>(`/api/number-ranges/preview?object=${encodeURIComponent(object)}&type=${encodeURIComponent(type)}`);
}

export function updateTransaction(id: number, input: { type: string; companyId: number; description: string; amount: number }) {
  return api<Transaction>(`/api/transactions/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

export function cancelTransaction(id: number) {
  return api<{ status: string }>(`/api/transactions/${id}`, { method: "DELETE" });
}

export function approvalAction(id: number, action: "approve" | "reject" | "revision" | "hold", note: string) {
  return api<{ status: string }>(`/api/approvals/${id}/action`, { method: "POST", body: JSON.stringify({ action, note }) });
}

export function generateJournal(sourceModule: string, sourceReference: string) {
  return api("/api/accounting/generate-journal", { method: "POST", body: JSON.stringify({ sourceModule, sourceReference }) });
}

export function runReconciliation(type: string, period: string) {
  return api("/api/reconciliations", { method: "POST", body: JSON.stringify({ type, period }) });
}

export function closePeriod(period: string) {
  return api("/api/closing-periods/close", { method: "POST", body: JSON.stringify({ period }) });
}

export function verifyBATracker(id: number, action: "verify" | "reject", note: string) {
  return api(`/api/finance/ba-trackers/${id}/verify`, { method: "POST", body: JSON.stringify({ action, note }) });
}

export function approveBATracker(id: number, action: "approve" | "reject", note: string) {
  return api(`/api/finance/ba-trackers/${id}/approve`, { method: "POST", body: JSON.stringify({ action, note }) });
}

export function generateInvoiceFromBA(id: number, category?: "Operation & Mining" | "MDO") {
  return api(`/api/finance/ba-trackers/${id}/generate-invoice${category ? `?category=${encodeURIComponent(category)}` : ""}`, { method: "POST" });
}

export function verifyInvoice(id: number, action: "verify" | "reject", note: string) {
  return api(`/api/finance/invoices/${id}/verify`, { method: "POST", body: JSON.stringify({ action, note }) });
}

export function approveInvoice(id: number, action: "approve" | "reject", note: string) {
  return api(`/api/finance/invoices/${id}/approve`, { method: "POST", body: JSON.stringify({ action, note }) });
}

export function approveInvoiceTier1(id: number, action: "approve" | "reject", note: string) {
  return approveInvoice(id, action, note);
}

export function approveInvoiceTier2(id: number, action: "approve" | "reject", note: string) {
  return approveInvoice(id, action, note);
}

export function getUsers() {
  return api<User[]>("/api/users");
}

export function createUser(input: {
  name: string;
  email: string;
  password?: string;
  role: string;
  status: string;
  companyId?: number | null;
  companyCode?: string;
  companyName?: string;
  companyScope?: string[] | "ALL";
  permissions?: string[];
}) {
  return api<User>("/api/users", { method: "POST", body: JSON.stringify(input) });
}

export function updateUser(
  id: number,
  input: {
    name: string;
    email: string;
    password?: string;
    role: string;
    status: string;
    companyId?: number | null;
    companyCode?: string;
    companyName?: string;
    companyScope?: string[] | "ALL";
    permissions?: string[];
  }
) {
  return api<User>(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

export function deleteUser(id: number) {
  return api<{ status: string }>(`/api/users/${id}`, { method: "DELETE" });
}

export function resetUserPassword(id: number, password?: string) {
  return api<{ status: string; temporaryPassword?: string }>(`/api/users/${id}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ password: password ?? "" })
  });
}

export function getRoles() {
  return api<RoleAccess[]>("/api/roles");
}

export function createRole(input: { name: string; description?: string; permissions: string[]; tcodes?: string[] }) {
  return api<RoleAccess>("/api/roles", { method: "POST", body: JSON.stringify(input) });
}

export function updateRolePermissions(role: string, permissions: string[], tcodes?: string[]) {
  return api<RoleAccess>(`/api/roles/${encodeURIComponent(role)}/permissions`, {
    method: "PUT",
    body: JSON.stringify({ permissions, tcodes })
  });
}

export function deleteRole(role: string) {
  return api<{ status: string }>(`/api/roles/${encodeURIComponent(role)}`, { method: "DELETE" });
}

// T-Codes
export function getTCodes() {
  return api<TCode[]>("/api/t-codes");
}

export function createTCode(input: { code: string; description: string; route: string; module: string; action: string }) {
  return api<TCode>("/api/t-codes", { method: "POST", body: JSON.stringify(input) });
}

export function updateTCode(id: number, input: { code: string; description: string; route: string; module: string; action: string }) {
  return api<TCode>(`/api/t-codes/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

export function deleteTCode(id: number) {
  return api<void>(`/api/t-codes/${id}`, { method: "DELETE" });
}

// Finance Templates (master data yang sebelumnya hardcoded di FinancePage)
export type FinanceTemplate = {
  id: number;
  templateKey: string;
  customerCode?: string;
  section?: string;
  label?: string;
  sortOrder: number;
  payload: any;
};

export function getAuditLogs(params?: { module?: string; referenceType?: string; referenceId?: string }) {
  const query = new URLSearchParams();
  if (params?.module) query.append("module", params.module);
  if (params?.referenceType) query.append("referenceType", params.referenceType);
  if (params?.referenceId) query.append("referenceId", params.referenceId);
  const qStr = query.toString();
  return api<AuditLog[]>(`/api/audit-logs${qStr ? `?${qStr}` : ""}`);
}

export function getFinanceTemplates() {
  return api<Record<string, FinanceTemplate[]>>("/api/finance/templates");
}

export function getFinanceTemplatesByKey(key: string) {
  return api<FinanceTemplate[]>(`/api/finance/templates/${encodeURIComponent(key)}`);
}

export function saveFinanceTemplate(input: { id?: number; templateKey: string; customerCode?: string; section?: string; label?: string; sortOrder?: number; payload: any }) {
  return api<FinanceTemplate>("/api/finance/templates", {
    method: input.id ? "PUT" : "POST",
    body: JSON.stringify(input)
  });
}

export function deleteFinanceTemplate(id: number) {
  return api<{ status: string }>(`/api/finance/templates/${id}`, { method: "DELETE" });
}

export function changePassword(oldPassword: string, newPassword: string) {
  return api<{ status: string }>("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ oldPassword, newPassword })
  });
}

export function forgotPassword(email: string) {
  return api<{ status: string; resetToken?: string; expires?: string }>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email })
  });
}

export function resetPassword(token: string, newPassword: string) {
  return api<{ status: string }>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, newPassword })
  });
}

// Accounting Endpoints
import type { JournalEntry, COAAccount, SubLedger, GeneralLedgerView, TrialBalanceRow, ProfitLossData, BalanceSheetData } from "../types";

export function getJournals(): Promise<JournalEntry[]> {
  return api<JournalEntry[]>("/api/accounting/journals");
}

export function saveJournal(entry: Partial<JournalEntry>): Promise<JournalEntry> {
  return api<JournalEntry>("/api/accounting/journals", { method: "POST", body: JSON.stringify(entry) });
}

export function deleteJournal(id: number): Promise<void> {
  return api<void>(`/api/accounting/journals/${id}`, { method: "DELETE" });
}

export function verifyJournal(id: number): Promise<{ status: string }> {
  return api<{ status: string }>(`/api/accounting/journals/${id}/verify`, { method: "POST" });
}

export function approveJournal(id: number): Promise<{ status: string }> {
  return api<{ status: string }>(`/api/accounting/journals/${id}/approve`, { method: "POST" });
}

export function postJournalsBatch(ids: number[]): Promise<{ status: string }> {
  return api<{ status: string }>("/api/accounting/journals/post-batch", { method: "POST", body: JSON.stringify({ ids }) });
}

export function reverseJournal(id: number, reason = ""): Promise<JournalEntry> {
  return api<JournalEntry>(`/api/accounting/journals/${id}/reverse`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
}

export function getCOAAccounts(): Promise<COAAccount[]> {
  return api<COAAccount[]>("/api/accounting/coa");
}

export function saveCOAAccount(account: Partial<COAAccount>): Promise<COAAccount> {
  return api<COAAccount>("/api/accounting/coa", { method: "POST", body: JSON.stringify(account) });
}

export function getSubLedgers(): Promise<SubLedger[]> {
  return api<SubLedger[]>("/api/accounting/sub-ledgers");
}

export function saveSubLedger(sub: Partial<SubLedger>): Promise<SubLedger> {
  return api<SubLedger>("/api/accounting/sub-ledgers", { method: "POST", body: JSON.stringify(sub) });
}

export function getGeneralLedger(accountCode = "1101.001", period = "Juni 2026"): Promise<GeneralLedgerView> {
  return api<GeneralLedgerView>(`/api/accounting/general-ledger?account=${encodeURIComponent(accountCode)}&period=${encodeURIComponent(period)}`);
}

export function getTrialBalance(period = "Juni 2026"): Promise<TrialBalanceRow[]> {
  return api<TrialBalanceRow[]>(`/api/accounting/trial-balance?period=${encodeURIComponent(period)}`);
}

export function getProfitLoss(site = "CoY", period = "Juni 2026"): Promise<ProfitLossData> {
  return api<ProfitLossData>(`/api/accounting/profit-loss?site=${encodeURIComponent(site)}&period=${encodeURIComponent(period)}`);
}

export function getBalanceSheet(site = "CoY", period = "Juni 2026"): Promise<BalanceSheetData> {
  return api<BalanceSheetData>(`/api/accounting/balance-sheet?site=${encodeURIComponent(site)}&period=${encodeURIComponent(period)}`);
}

export const money = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export const compactMoney = (value: number) =>
  new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(value);

export const DEFAULT_COMPANIES: Company[] = [
  { id: 1, code: "HO", name: "Head Office", isHo: true, createdAt: "" },
  { id: 2, code: "BGG", name: "PT Budi Gema Gempita", isHo: false, createdAt: "" },
  { id: 3, code: "POS", name: "PT Position", isHo: false, createdAt: "" },
  { id: 4, code: "SBS", name: "PT Satria Bahana Sarana", isHo: false, createdAt: "" },
  { id: 5, code: "PTRO", name: "PT Petrosea", isHo: false, createdAt: "" },
];

const ALLOWED_COMPANY_CODES = ["HO", "BGG", "POS", "SBS", "PTRO"];

// Company Endpoints
export async function getCompanies(): Promise<Company[]> {
  try {
    const list = await api<Company[]>("/api/companies");
    if (Array.isArray(list) && list.length > 0) {
      const filtered = list.filter((c) => ALLOWED_COMPANY_CODES.includes(c.code));
      if (filtered.length > 0) return filtered;
    }
    return DEFAULT_COMPANIES;
  } catch {
    return DEFAULT_COMPANIES;
  }
}

export function createCompany(input: { code: string; name: string; isHo: boolean }) {
  return api<Company>("/api/companies", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateCompany(id: number, input: { code: string; name: string; isHo: boolean }) {
  return api<Company>(`/api/companies/${id}`, {
    method: "PUT",
    body: JSON.stringify(input)
  });
}

export function deleteCompany(id: number) {
  return api<void>(`/api/companies/${id}`, { method: "DELETE" });
}

// Org Unit Endpoints
export function getOrgUnits(params: { type?: string; companyId?: number; withCompany?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.type) qs.set("type", params.type);
  if (params.companyId) qs.set("companyId", String(params.companyId));
  if (params.withCompany) qs.set("withCompany", String(params.withCompany));
  const query = qs.toString();
  return api<OrgUnit[]>(`/api/org-units${query ? `?${query}` : ""}`);
}

export function createOrgUnit(input: Partial<OrgUnit>) {
  return api<OrgUnit>("/api/org-units", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateOrgUnit(id: number, input: Partial<OrgUnit>) {
  return api<OrgUnit>(`/api/org-units/${id}`, {
    method: "PUT",
    body: JSON.stringify(input)
  });
}

export function deleteOrgUnit(id: number) {
  return api<void>(`/api/org-units/${id}`, { method: "DELETE" });
}

// Missing API Integrations
export function calculateMiningInvoice(input: any) {
  return api<any>("/api/finance/invoices/calculate-mining", { method: "POST", body: JSON.stringify(input) });
}

export function calculateBATracker(input: any) {
  return api<any>("/api/finance/ba-trackers/calculate", { method: "POST", body: JSON.stringify(input) });
}

export function calculateInvoicePreview(input: any) {
  return api<any>("/api/finance/invoices/calculate-preview", { method: "POST", body: JSON.stringify(input) });
}

export function generateJournalFromInvoice(id: number) {
  return api<any>(`/api/accounting/generate-from-invoice/${id}`, { method: "POST" });
}

export function generateJournalFromBA(id: number) {
  return api<any>(`/api/accounting/generate-from-ba/${id}`, { method: "POST" });
}

export function generateJournalFromPayment(id: number) {
  return api<any>(`/api/accounting/generate-from-payment/${id}`, { method: "POST" });
}

export function getSystemSettings() {
  return api<any[]>("/api/system-settings");
}

export function saveSystemSetting(setting: any) {
  return api<any>("/api/system-settings", { method: "POST", body: JSON.stringify(setting) });
}

export function getAccountingRuns() {
  return api<any[]>("/api/accounting/runs");
}

export function getManagementDashboard() {
  return api<any[]>("/api/management-dashboard");
}

export function getFinanceFlow() {
  return api<any>("/api/finance-flow");
}

export function getModules() {
  return api<any[]>("/api/modules");
}

export function createAuditLog(input: any) {
  return api<any>("/api/audit-logs", { method: "POST", body: JSON.stringify(input) });
}

// =========================== Budget Management ===========================
export type Budget = {
  id: number;
  fiscalYear: number;
  periodMonth: number;
  companyId: number;
  companyCode?: string;
  companyName?: string;
  departmentId?: number | null;
  projectId?: number | null;
  costCenterId?: number | null;
  accountId: number;
  accountCode?: string;
  accountName?: string;
  amount: number;
  utilized: number;
  reserved: number;
  available: number;
  status: string;
  createdBy?: string;
  createdAt: string;
};

export type BudgetInput = {
  fiscalYear: number;
  periodMonth: number;
  companyId: number;
  departmentId?: number | null;
  projectId?: number | null;
  costCenterId?: number | null;
  accountId: number;
  amount: number;
};

export type BudgetEvent = {
  id: number;
  budgetId: number;
  eventType: string;
  amount: number;
  note: string;
  createdBy: string;
  createdAt: string;
};

export type BudgetStatusSummary = {
  period: string;
  budget: number;
  actual: number;
  used: number;
  variance: number;
};

export function getBudgets(status?: string, company?: string, fiscalYear?: number) {
  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  if (company) qs.set("company", company);
  if (fiscalYear) qs.set("fiscalYear", String(fiscalYear));
  const q = qs.toString();
  return api<Budget[]>(`/api/budgets${q ? `?${q}` : ""}`);
}

export function createBudget(input: BudgetInput) {
  return api<Budget>("/api/budgets", { method: "POST", body: JSON.stringify(input) });
}

export function updateBudget(id: number, input: BudgetInput) {
  return api<Budget>(`/api/budgets/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

export function deleteBudget(id: number) {
  return api<void>(`/api/budgets/${id}`, { method: "DELETE" });
}

export function submitBudget(id: number, note = "") {
  return api<Budget>(`/api/budgets/${id}/submit`, { method: "POST", body: JSON.stringify({ note }) });
}

export function approveBudget(id: number, note = "") {
  return api<Budget>(`/api/budgets/${id}/approve`, { method: "POST", body: JSON.stringify({ note }) });
}

export function rejectBudget(id: number, note = "") {
  return api<Budget>(`/api/budgets/${id}/reject`, { method: "POST", body: JSON.stringify({ note }) });
}

export function lockBudget(id: number, note = "") {
  return api<Budget>(`/api/budgets/${id}/lock`, { method: "POST", body: JSON.stringify({ note }) });
}

export function reviseBudget(id: number, note = "") {
  return api<Budget>(`/api/budgets/${id}/revise`, { method: "POST", body: JSON.stringify({ note }) });
}

export function getBudgetEvents(id: number) {
  return api<BudgetEvent[]>(`/api/budgets/${id}/events`);
}

export function getBudgetVsActual(fiscalYear?: number) {
  const q = fiscalYear ? `?fiscalYear=${fiscalYear}` : "";
  return api<BudgetStatusSummary[]>(`/api/budgets/vs-actual${q}`);
}

export function validateBudget(input: { companyId: number; accountId: number; amount: number }) {
  return api<{ status: string; budgetAmount: number; utilized: number; reserved: number; availableAmount: number; message: string }>("/api/budgets/validate", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

// =========================== Period Closing (sub-process) ===========================
export type ClosingStep = {
  period: string;
  step: string;
  progress: number;
  status: string;
  lockedAt?: string | null;
  createdAt?: string;
};

export function getClosingPeriods() {
  return api<ClosingStep[]>("/api/closing-periods");
}

export function startClosing(period: string) {
  return api<ClosingStep>("/api/closing-periods/start", { method: "POST", body: JSON.stringify({ period }) });
}

export function advanceClosingStep(period: string) {
  return api<ClosingStep>("/api/closing-periods/advance", { method: "POST", body: JSON.stringify({ period }) });
}

export function resetClosing(period: string) {
  return api<ClosingStep>("/api/closing-periods/reset", { method: "POST", body: JSON.stringify({ period }) });
}

export function lockClosingPeriod(period: string) {
  return api<ClosingStep>("/api/closing-periods/close", { method: "POST", body: JSON.stringify({ period }) });
}

// =========================== Notification Center ===========================
export type Notification = {
  id: number;
  userId: number;
  title: string;
  body: string;
  module: string;
  refType?: string;
  refId?: string;
  isRead: boolean;
  createdAt: string;
};

export function getNotifications(unreadOnly = false) {
  return api<Notification[]>(`/api/notifications${unreadOnly ? "?unread=true" : ""}`);
}

export function getUnreadNotificationCount() {
  return api<{ count: number }>("/api/notifications/unread-count");
}

export function markNotificationRead(id: number) {
  return api<Notification>(`/api/notifications/${id}/read`, { method: "POST" });
}

export function markAllNotificationsRead() {
  return api<{ updated: number }>("/api/notifications/read-all", { method: "POST" });
}

// =========================== Profile ===========================
export type Profile = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  companyId?: number | null;
  companyCode?: string;
  companyName?: string;
  department?: string;
  position?: string;
  phone?: string;
  avatarUrl?: string;
  twoFactorOn: boolean;
  lastLoginAt?: string | null;
};

export function getProfile() {
  return api<Profile>("/api/profile");
}

export function updateProfile(input: { name?: string; position?: string; phone?: string }) {
  return api<Profile>("/api/profile", { method: "PUT", body: JSON.stringify(input) });
}

export function uploadAvatar(file: File) {
  const form = new FormData();
  form.append("file", file);
  return api<Profile>("/api/profile/avatar", { method: "POST", body: form });
}

// =========================== 2FA ===========================
export type TwoFactorSetup = {
  secret: string;
  otpAuthUrl: string;
  backupCodes?: string[];
};

export function generateTwoFactorSetup() {
  return api<TwoFactorSetup>("/api/auth/2fa/setup", { method: "POST" });
}

export function enableTwoFactor(code: string) {
  return api<TwoFactorSetup>("/api/auth/2fa/enable", { method: "POST", body: JSON.stringify({ code }) });
}

export function disableTwoFactor(code: string) {
  return api<{ status: string }>("/api/auth/2fa/disable", { method: "POST", body: JSON.stringify({ code }) });
}

export function getTwoFactorStatus() {
  return api<{ enabled: boolean }>("/api/auth/2fa/status");
}

export function verifyTwoFactorLogin(userId: number, code: string) {
  return api<{ token: string; user: User }>("/api/auth/2fa/verify", {
    method: "POST",
    body: JSON.stringify({ userId, code })
  });
}

// SBS Penalty Ledger API
export interface SBSPenaltyItem {
  id: number;
  customerCode: string;
  workPeriod: string;
  claimRefNo: string;
  description: string;
  claimAmount: number;
  deductedAmount: number;
  outstandingAmount: number;
  status: "Pending Cut" | "Deducted";
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function getSBSPenalties(period?: string) {
  const query = period && period !== "All" ? `?period=${encodeURIComponent(period)}` : "";
  return api<SBSPenaltyItem[]>(`/api/finance/sbs-penalties${query}`);
}

export function saveSBSPenalty(data: Partial<SBSPenaltyItem>) {
  const method = data.id ? "PUT" : "POST";
  const url = data.id ? `/api/finance/sbs-penalties/${data.id}` : "/api/finance/sbs-penalties";
  return api<SBSPenaltyItem>(url, { method, body: JSON.stringify(data) });
}

export function deleteSBSPenalty(id: number) {
  return api<{ message: string }>(`/api/finance/sbs-penalties/${id}`, { method: "DELETE" });
}


