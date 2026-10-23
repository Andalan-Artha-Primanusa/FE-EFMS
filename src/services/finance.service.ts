import { api } from "../lib/api";

export const FinanceService = {
  getDashboard: () => api<any>("/api/finance/dashboard"),
  getBATrackers: () => api<any[]>("/api/finance/ba-trackers"),
  getInvoices: () => api<any[]>("/api/finance/invoices"),
  getPayments: () => api<any[]>("/api/finance/payments"),
  getCustomers: () => api<any[]>("/api/finance/customers"),
  getRaiseFall: () => api<any[]>("/api/master-data/raise-fall"),
  getVariableSOW: () => api<any[]>("/api/master-data/variable-sow"),
  getBankAccounts: () => api<any[]>("/api/master-data/bank-accounts"),
  saveBATracker: (payload: any) => api<any>("/api/finance/ba-trackers", { method: "POST", body: JSON.stringify(payload) }),
  updateBATracker: (id: string, payload: any) => api<any>(`/api/finance/ba-trackers/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
};
