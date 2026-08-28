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
    throw new Error(err.error ?? "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
export async function login(email: string, password: string) {
  return api<{ token: string; user: User }>("/api/auth/login", {
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

export function generateInvoiceFromBA(id: number) {
  return api(`/api/finance/ba-trackers/${id}/generate-invoice`, { method: "POST" });
}

export function verifyInvoice(id: number, action: "verify" | "reject", note: string) {
  return api(`/api/finance/invoices/${id}/verify`, { method: "POST", body: JSON.stringify({ action, note }) });
}

export function approveInvoiceTier1(id: number, action: "approve" | "reject", note: string) {
  return api(`/api/finance/invoices/${id}/approve-tier1`, { method: "POST", body: JSON.stringify({ action, note }) });
}

export function approveInvoiceTier2(id: number, action: "approve" | "reject", note: string) {
  return api(`/api/finance/invoices/${id}/approve-tier2`, { method: "POST", body: JSON.stringify({ action, note }) });
}

export function getUsers() {
  return api<User[]>("/api/users");
}

export function createUser(input: { name: string; email: string; password?: string; role: string; status: string; companyId?: number | null; companyCode?: string; companyName?: string; companyScope?: string[] | "ALL" }) {
  return api<User>("/api/users", { method: "POST", body: JSON.stringify(input) });
}

export function updateUser(id: number, input: { name: string; email: string; password?: string; role: string; status: string; companyId?: number | null; companyCode?: string; companyName?: string; companyScope?: string[] | "ALL" }) {
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
import type { JournalEntry, COAAccount, SubLedger, GeneralLedgerEntry, TrialBalanceRow, ProfitLossData, BalanceSheetData } from "../types";

export function getJournals(): Promise<JournalEntry[]> {
  return api<JournalEntry[]>("/api/accounting/journals");
}

export function saveJournal(entry: Partial<JournalEntry>): Promise<JournalEntry> {
  return api<JournalEntry>("/api/accounting/journals", { method: "POST", body: JSON.stringify(entry) });
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

export function getGeneralLedger(accountCode = "1101.001", period = "Juni 2026"): Promise<GeneralLedgerEntry[]> {
  return api<GeneralLedgerEntry[]>(`/api/accounting/general-ledger?account=${encodeURIComponent(accountCode)}&period=${encodeURIComponent(period)}`);
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

// Company Endpoints
export function getCompanies() {
  return api<Company[]>("/api/companies");
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

