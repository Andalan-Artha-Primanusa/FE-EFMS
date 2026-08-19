export type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  twoFactorEnabled: boolean;
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

export type RoleAccess = {
  role: string;
  permissions: Permission[];
  scopes: string[];
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

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8080";

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("financeerp.token");
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
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

export function verifyInvoice(id: number, action: "verify" | "reject", note: string) {
  return api(`/api/finance/invoices/${id}/verify`, { method: "POST", body: JSON.stringify({ action, note }) });
}

export function approveInvoiceTier1(id: number, action: "approve" | "reject", note: string) {
  return api(`/api/finance/invoices/${id}/approve-tier1`, { method: "POST", body: JSON.stringify({ action, note }) });
}

export function approveInvoiceTier2(id: number, action: "approve" | "reject", note: string) {
  return api(`/api/finance/invoices/${id}/approve-tier2`, { method: "POST", body: JSON.stringify({ action, note }) });
}

export const money = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export const compactMoney = (value: number) =>
  new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(value);
