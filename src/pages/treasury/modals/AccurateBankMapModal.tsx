import React, { useEffect, useState } from "react";
import { Landmark, Loader2, X } from "lucide-react";
import { api } from "../../../lib/api";
import type { useTreasuryController } from "../useTreasuryController";

type Props = {
  c: ReturnType<typeof useTreasuryController>;
  isOpen: boolean;
  onClose: () => void;
};

type CashBank = { no: string; name: string };

// Maps each FEAST source bank account to the Accurate Kas/Bank account used as bankNo when posting
// Pembayaran Pembelian. Choices come from Accurate itself; the backend re-validates and audits.
export function AccurateBankMapModal({ c, isOpen, onClose }: Props) {
  const { companyBanks, refreshAll } = c;
  const [accounts, setAccounts] = useState<CashBank[]>([]);
  const [choice, setChoice] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setMessage("");
    setLoading(true);
    api<{ success: boolean; accounts: CashBank[] }>("/api/treasury/accurate/cash-banks")
      .then((res) => setAccounts(res.accounts || []))
      .catch((e: any) => setMessage(e.message || "Gagal memuat akun Kas/Bank dari Accurate"))
      .finally(() => setLoading(false));
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) setChoice(Object.fromEntries(companyBanks.map((b) => [b.id, b.accurateBankNo || ""])));
  }, [isOpen, companyBanks]);

  if (!isOpen) return null;

  const save = async (id: number) => {
    setSavingId(id);
    try {
      const res = await api<{ success: boolean; message: string }>(`/api/treasury/company-banks/${id}/accurate-bank`, {
        method: "PUT",
        body: JSON.stringify({ accurateBankNo: choice[id] || "" }),
      });
      setMessage(res.message);
      refreshAll();
    } catch (e: any) {
      setMessage(e.message || "Gagal menyimpan pemetaan");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-[4px] shadow-2xl border border-stone-200 w-full max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden">
        <div className="shrink-0 bg-[#1A1612] text-white p-4 flex items-center justify-between border-b border-amber-900/30">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-[#A57C50]" />
            <div>
              <h3 className="text-sm font-bold">Pemetaan Akun Kas/Bank Accurate</h3>
              <p className="text-[10px] text-stone-400">
                Akun ini dipakai sebagai sumber dana saat Posting Pembayaran Pembelian ke Accurate.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 text-xs">
          {loading && (
            <div className="flex items-center gap-2 text-stone-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Memuat akun Kas/Bank dari Accurate…
            </div>
          )}
          {message && <div className="p-2 rounded border border-amber-200 bg-amber-50 text-amber-900">{message}</div>}

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="sticky top-0 z-10 bg-stone-100 text-stone-600 font-semibold uppercase text-[10px]">
                <th className="p-2">Rekening Sumber (FEAST)</th>
                <th className="p-2">Akun Kas/Bank Accurate</th>
                <th className="p-2 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {companyBanks.map((b) => (
                <tr key={b.id}>
                  <td className="p-2">
                    <div className="font-semibold text-stone-900">{b.bankName}</div>
                    <div className="font-mono text-[10px] text-stone-500">{b.accountNumber}</div>
                  </td>
                  <td className="p-2">
                    <select
                      value={choice[b.id] || ""}
                      onChange={(e) => setChoice((prev) => ({ ...prev, [b.id]: e.target.value }))}
                      disabled={loading}
                      className="w-full p-1.5 border border-stone-300 rounded-[3px] bg-white"
                    >
                      <option value="">— Belum dipetakan —</option>
                      {accounts.map((a) => (
                        <option key={a.no} value={a.no}>
                          {a.no} · {a.name}
                        </option>
                      ))}
                      {/* Keep a saved value visible even if Accurate is unreachable right now. */}
                      {b.accurateBankNo && !accounts.some((a) => a.no === b.accurateBankNo) && (
                        <option value={b.accurateBankNo}>{b.accurateBankNo}</option>
                      )}
                    </select>
                  </td>
                  <td className="p-2 text-right">
                    <button
                      onClick={() => save(b.id)}
                      disabled={savingId !== null || (choice[b.id] || "") === (b.accurateBankNo || "")}
                      className="px-3 py-1.5 rounded-[3px] bg-[#A57C50] hover:bg-[#8e6941] text-white font-bold disabled:opacity-40"
                    >
                      {savingId === b.id ? "…" : "Simpan"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
