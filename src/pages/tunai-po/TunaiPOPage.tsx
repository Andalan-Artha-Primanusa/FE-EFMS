import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, RefreshCw, Search, Settings } from "lucide-react";
import { api } from "../../lib/api";
import { authorized } from "../../lib/auth";
import { formatCurrency, formatDate } from "../../lib/format";
import type { POSyncStatus, TPOKind, TPORequest, TPOStatus } from "./types";
import { MappingsModal, OverdueBadge, STATUS_LABEL, StatusBadge, btnPrimary, btnSecondary, cents, fromCents, inputCls, periodLabel, useAccountMappings } from "./shared";
import { RequestFormModal } from "./RequestFormModal";
import { RequestDetailModal } from "./RequestDetailModal";

const TABS = Object.keys(STATUS_LABEL) as TPOStatus[];

export function TunaiPOPage({ kind = "TUNAI_PO" }: { kind?: TPOKind }) {
  const { user, setNotice } = useOutletContext<any>();
  const canSubmit = kind === "FUEL" ? authorized(user, "payment", "write") : authorized(user, "tunai_po", "submit");
  const canVerify = authorized(user, "tunai_po", "verify");
  const { mappings, reload: reloadMappings } = useAccountMappings();

  const [rows, setRows] = useState<TPORequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<TPOStatus | "">("");
  const [search, setSearch] = useState("");
  const [site, setSite] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [form, setForm] = useState<{ editing: TPORequest | null } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [sync, setSync] = useState<POSyncStatus | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ success: boolean; requests: TPORequest[] }>(`/api/tunai-po/requests?kind=${kind}`);
      setRows(r.requests || []);
    } catch (e: any) {
      setNotice(e.message || "Gagal memuat pengajuan");
    } finally {
      setLoading(false);
    }
  }, [setNotice, kind]);
  useEffect(() => {
    load();
  }, [load]);

  const loadSync = useCallback(
    () =>
      api<{ success: boolean; status: POSyncStatus }>("/api/tunai-po/purchase-orders/sync-status")
        .then((r) => setSync(r.status))
        .catch(() => undefined),
    []
  );
  useEffect(() => {
    if (canSubmit || canVerify) loadSync();
  }, [canSubmit, canVerify, loadSync]);
  useEffect(() => {
    if (!sync?.running) return;
    const t = setInterval(loadSync, 3000);
    return () => clearInterval(t);
  }, [sync?.running, loadSync]);

  const startSync = async () => {
    try {
      const r = await api<{ success: boolean; message: string }>("/api/tunai-po/purchase-orders/sync", { method: "POST" });
      setNotice(r.message || "Sync PO berjalan");
      setSync((s) => ({ ...(s || {}), running: true }));
    } catch (e: any) {
      setNotice(e.message || "Gagal memulai sync PO");
    }
  };

  const sites = useMemo(() => [...new Set(rows.map((r) => r.site).filter(Boolean))].sort(), [rows]);
  const counts = useMemo(() => rows.reduce<Record<string, number>>((m, r) => ((m[r.status] = (m[r.status] || 0) + 1), m), {}), [rows]);
  const filtered = rows.filter((r) => {
    if (tab && r.status !== tab) return false;
    if (site && r.site !== site) return false;
    if (search) {
      const q = search.toLowerCase();
      return [r.poNo, r.vendor?.name, r.proformaNo].some((v) => (v || "").toLowerCase().includes(q));
    }
    return true;
  });

  const sumTotal = fromCents(filtered.reduce((s, r) => s + cents(r.totalAmount), 0));
  const sumPay = fromCents(filtered.reduce((s, r) => s + cents(r.payAmount), 0));

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] max-w-[1600px] mx-auto p-2 gap-2 overflow-hidden text-xs">
      <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-72">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="PO / Vendor / Proforma" className={`${inputCls} pl-8`} />
          </div>
          <div className="w-44">
            <select value={site} onChange={(e) => setSite(e.target.value)} className={inputCls}>
              <option value="">Semua Site</option>
              {sites.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <button onClick={load} className={btnSecondary} title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(canSubmit || canVerify) && (
            <>
              <span className="text-[10px] text-slate-500 whitespace-nowrap" title={sync?.lastError || undefined}>
                {sync?.running ? "Sync berjalan…" : sync?.last?.endedAt ? `Sync terakhir ${new Date(sync.last.endedAt).toLocaleString("id-ID")}` : ""}
                {sync?.lastError && <span className="text-rose-600 font-bold"> (gagal)</span>}
              </span>
              <button onClick={startSync} disabled={!!sync?.running} className={btnSecondary}>
                <RefreshCw className={`w-3.5 h-3.5 ${sync?.running ? "animate-spin" : ""}`} /> Sync PO
              </button>
            </>
          )}
          {canVerify && (
            <button onClick={() => setShowSettings(true)} className={btnSecondary} title="Pemetaan Akun Accurate">
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
          {canSubmit && (
            <button onClick={() => setForm({ editing: null })} className={btnPrimary}>
              <Plus className="w-3.5 h-3.5" /> Pengajuan Baru
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-2 shrink-0">
          {(["", ...TABS] as (TPOStatus | "")[]).map((t) => (
            <button
              key={t || "all"}
              onClick={() => setTab(t)}
              className={`-mb-px px-3 py-2.5 border-b-2 font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition cursor-pointer ${
                tab === t ? "border-[#A57C50] text-[#A57C50]" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {t ? STATUS_LABEL[t] : "Semua"}
              <span className={`min-w-[20px] px-1.5 rounded-full text-[10px] font-bold text-center ${tab === t ? "bg-[#A57C50] text-white" : "bg-slate-100 text-slate-600"}`}>
                {t ? counts[t] || 0 : rows.length}
              </span>
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="p-2.5 whitespace-nowrap">No. PO</th>
                <th className="p-2.5">Vendor</th>
                <th className="p-2.5">Site</th>
                <th className="p-2.5">Periode</th>
                <th className="p-2.5">Proforma</th>
                <th className="p-2.5 text-right">Total</th>
                <th className="p-2.5 text-right whitespace-nowrap">Total Bayar</th>
                <th className="p-2.5 text-center">Status</th>
                <th className="p-2.5">Voucher</th>
                <th className="p-2.5">Diajukan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <tr key={r.id} onClick={() => setDetailId(r.id)} className="hover:bg-slate-50 cursor-pointer">
                  <td className="p-2.5 font-mono font-bold text-blue-700 whitespace-nowrap">{r.poNo}</td>
                  <td className="p-2.5 font-semibold text-slate-800">{r.vendor?.name || "-"}</td>
                  <td className="p-2.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">{r.site}</span>
                  </td>
                  <td className="p-2.5 whitespace-nowrap">{periodLabel(r)}</td>
                  <td className="p-2.5 font-mono text-slate-600">{r.proformaNo || "-"}</td>
                  <td className="p-2.5 text-right font-mono text-slate-600 whitespace-nowrap">{formatCurrency(r.totalAmount)}</td>
                  <td className="p-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">{formatCurrency(r.payAmount)}</td>
                  <td className="p-2.5 text-center">
                    <span className="inline-flex items-center gap-1">
                      <StatusBadge status={r.status} />
                      {r.rejectCount > 0 && r.status === "rejected" && <span className="text-[10px] text-rose-700 font-bold">{r.rejectCount}x</span>}
                      {r.docsOverdue && <OverdueBadge />}
                    </span>
                  </td>
                  <td className="p-2.5 font-mono whitespace-nowrap">{r.voucherNo || "-"}</td>
                  <td className="p-2.5 whitespace-nowrap">{formatDate(r.submittedAt)}</td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={10} className="p-10 text-center text-slate-400">
                    {loading ? "Memuat…" : "Tidak ada data"}
                  </td>
                </tr>
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="sticky bottom-0">
                <tr className="bg-slate-50 border-t border-slate-200 font-bold text-slate-900">
                  <td colSpan={5} className="p-2.5 text-slate-600">
                    {filtered.length} pengajuan
                  </td>
                  <td className="p-2.5 text-right font-mono whitespace-nowrap">{formatCurrency(sumTotal)}</td>
                  <td className="p-2.5 text-right font-mono whitespace-nowrap">{formatCurrency(sumPay)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {form && (
        <RequestFormModal
          kind={kind}
          editing={form.editing}
          mappings={mappings}
          onClose={() => setForm(null)}
          onError={setNotice}
          onSaved={(req) => {
            setForm(null);
            load();
            setDetailId(req.id);
          }}
        />
      )}
      {detailId != null && !form && (
        <RequestDetailModal
          requestId={detailId}
          userId={user?.id}
          canSubmit={canSubmit}
          canVerify={canVerify}
          mappings={mappings}
          onClose={() => setDetailId(null)}
          onChanged={load}
          onEdit={(r) => setForm({ editing: r })}
          onError={setNotice}
        />
      )}
      {showSettings && <MappingsModal kinds={["DP", "PPH", "TAX"]} onClose={() => setShowSettings(false)} onSaved={reloadMappings} onError={setNotice} />}
    </div>
  );
}
