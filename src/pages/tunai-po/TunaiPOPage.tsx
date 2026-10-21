import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, RefreshCw, Search, Settings } from "lucide-react";
import { api } from "../../lib/api";
import { authorized } from "../../lib/auth";
import { formatCurrency, formatDate } from "../../lib/format";
import type { AccountMapping, POSyncStatus, TPORequest, TPOStatus } from "./types";
import { Modal, OverdueBadge, STATUS_LABEL, StatusBadge, btnPrimary, btnSecondary, inputCls, useAccountMappings } from "./shared";
import { RequestFormModal } from "./RequestFormModal";
import { RequestDetailModal } from "./RequestDetailModal";

const TABS = Object.keys(STATUS_LABEL) as TPOStatus[];

export function TunaiPOPage() {
  const { user, setNotice } = useOutletContext<any>();
  const canSubmit = authorized(user, "tunai_po", "submit");
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
      const r = await api<{ success: boolean; requests: TPORequest[] }>("/api/tunai-po/requests");
      setRows(r.requests || []);
    } catch (e: any) {
      setNotice(e.message || "Gagal memuat Tunai PO");
    } finally {
      setLoading(false);
    }
  }, [setNotice]);
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

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] max-w-[1600px] mx-auto p-2 gap-2 overflow-hidden">
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-2.5 top-2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="PO / Vendor / Proforma" className={`${inputCls} pl-8`} />
          </div>
          <select value={site} onChange={(e) => setSite(e.target.value)} className={`${inputCls} w-40`}>
            <option value="">Semua Site</option>
            {sites.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button onClick={load} className={btnSecondary} title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {(canSubmit || canVerify) && (
            <>
              <span className="text-[10px] text-slate-500 whitespace-nowrap" title={sync?.lastError || undefined}>
                {sync?.running ? "Sync berjalan…" : sync?.last?.endedAt ? `Sync PO: ${new Date(sync.last.endedAt).toLocaleString("id-ID")}` : ""}
                {sync?.lastError && <span className="text-rose-600 font-bold"> (gagal)</span>}
              </span>
              <button onClick={startSync} disabled={!!sync?.running} className={btnSecondary}>
                <RefreshCw className={`w-3.5 h-3.5 ${sync?.running ? "animate-spin" : ""}`} /> Sync PO
              </button>
            </>
          )}
          {canVerify && (
            <button onClick={() => setShowSettings(true)} className={btnSecondary} title="Akun Uang Muka & PPh">
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

      <div className="bg-white p-1 rounded-lg border border-slate-200 flex gap-1 overflow-x-auto shrink-0">
        {(["", ...TABS] as (TPOStatus | "")[]).map((t) => (
          <button
            key={t || "all"}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition cursor-pointer ${tab === t ? "bg-[#A57C50] text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            {t ? STATUS_LABEL[t] : "Semua"} <span className="opacity-70">({t ? counts[t] || 0 : rows.length})</span>
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-auto bg-white rounded-lg border border-slate-200 shadow-sm">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-600 sticky top-0">
            <tr>
              <th className="text-left p-2">No. PO</th>
              <th className="text-left p-2">Vendor</th>
              <th className="text-left p-2">Site</th>
              <th className="text-left p-2">Proforma</th>
              <th className="text-right p-2">Total</th>
              <th className="text-right p-2">Total Bayar</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Voucher</th>
              <th className="text-left p-2">Diajukan</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} onClick={() => setDetailId(r.id)} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer">
                <td className="p-2 font-semibold text-slate-900">{r.poNo}</td>
                <td className="p-2">{r.vendor?.name || "-"}</td>
                <td className="p-2">{r.site}</td>
                <td className="p-2">{r.proformaNo || "-"}</td>
                <td className="p-2 text-right font-mono">{formatCurrency(r.totalAmount)}</td>
                <td className="p-2 text-right font-mono">{formatCurrency(r.payAmount)}</td>
                <td className="p-2">
                  <span className="inline-flex items-center gap-1">
                    <StatusBadge status={r.status} />
                    {r.rejectCount > 0 && r.status === "rejected" && <span className="text-[10px] text-rose-700 font-bold">{r.rejectCount}x</span>}
                    {r.docsOverdue && <OverdueBadge />}
                  </span>
                </td>
                <td className="p-2">{r.voucherNo || "-"}</td>
                <td className="p-2">{formatDate(r.submittedAt)}</td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-slate-400">
                  {loading ? "Memuat…" : "Tidak ada data"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {form && (
        <RequestFormModal
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
      {showSettings && <MappingsModal mappings={mappings} onClose={() => setShowSettings(false)} onSaved={reloadMappings} onError={setNotice} />}
    </div>
  );
}

function MappingsModal({ mappings, onClose, onSaved, onError }: { mappings: AccountMapping[]; onClose: () => void; onSaved: () => void; onError: (m: string) => void }) {
  const [edits, setEdits] = useState<Record<number, { name: string; accurateAccountNo: string }>>({});
  const [busy, setBusy] = useState(false);
  const val = (m: AccountMapping) => edits[m.id] || { name: m.name, accurateAccountNo: m.accurateAccountNo };

  const save = async () => {
    setBusy(true);
    try {
      for (const [id, body] of Object.entries(edits)) {
        await api(`/api/tunai-po/account-mappings/${id}`, { method: "PUT", body: JSON.stringify(body) });
      }
      onSaved();
      onClose();
    } catch (e: any) {
      onError(e.message || "Gagal menyimpan akun");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Akun Uang Muka & PPh" onClose={onClose}>
      <table className="w-full">
        <thead className="text-slate-600">
          <tr>
            <th className="text-left p-1">Jenis</th>
            <th className="text-left p-1">Kode</th>
            <th className="text-left p-1">Nama</th>
            <th className="text-left p-1">Akun Accurate</th>
          </tr>
        </thead>
        <tbody>
          {mappings.map((m) => (
            <tr key={m.id} className="border-t border-slate-100">
              <td className="p-1 font-semibold">{m.kind === "DP" ? "Uang Muka" : "PPh"}</td>
              <td className="p-1 font-mono">{m.code}</td>
              <td className="p-1">
                <input value={val(m).name} onChange={(e) => setEdits((x) => ({ ...x, [m.id]: { ...val(m), name: e.target.value } }))} className={inputCls} />
              </td>
              <td className="p-1">
                <input value={val(m).accurateAccountNo} onChange={(e) => setEdits((x) => ({ ...x, [m.id]: { ...val(m), accurateAccountNo: e.target.value } }))} className={`${inputCls} font-mono`} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pt-3 mt-3 border-t border-slate-200 flex justify-end gap-2">
        <button onClick={onClose} className={btnSecondary}>
          Batal
        </button>
        <button onClick={save} disabled={busy || !Object.keys(edits).length} className={btnPrimary}>
          Simpan
        </button>
      </div>
    </Modal>
  );
}
