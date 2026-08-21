import { api } from "../lib/api";

export const JournalService = {
  getJournals: () => api<any[]>("/api/accounting/journals"),
  saveJournal: (payload: any) => api<any>("/api/accounting/journals", { method: "POST", body: JSON.stringify(payload) }),
  approveJournal: (id: string) => api<any>(`/api/accounting/journals/${id}/approve`, { method: "POST" }),
  postJournal: (id: string) => api<any>(`/api/accounting/journals/${id}/post`, { method: "POST" }),
};
