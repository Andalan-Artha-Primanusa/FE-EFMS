import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { RefreshCw, Search } from "lucide-react";
import { api } from "../../lib/api";
import { authorized } from "../../lib/auth";
import { formatDate } from "../../lib/format";
import type { TPORequest } from "./types";
import { DOC_SHORT, DOC_TYPES, DocToggle, OverdueBadge, StatusBadge, btnSecondary, inputCls, useAccountMappings } from "./shared";
import { RequestDetailModal } from "./RequestDetailModal";

export function TrackingTunaiPOPage() {
  const { user, setNotice } = useOutletContext<any>();
  const canSubmit = authorized(user, "tunai_po", "submit");
  const canVerify = authorized(user, "tunai_po", "verify");
  const { mappings } = useAccountMappings();

  const [rows, setRows] = useState<TPORequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [all, setAll] = useState(false);
  const [overdue, setOverdue] = useState(false);
  const [search, setSearch] = useState("");
  const [site, setSite] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ success: boolean; requests: TPORequest[] }>(`/api/tunai-po/requests${all ? "" : "?status=paid,posted"}`);
      setRows(r.requests || []);
    } catch (e: any) {
      setNotice(e.message || "Gagal memuat tracking");
    } finally {
      setLoading(false);
    }
  }, [all, setNotice]);
  useEffect(() => {
    load();
  }, [load]);

  const sites = useMemo(() => [...new Set(rows.map((r) => r.site).filter(Boolean))].sort(), [rows]);
  const filtered = rows.filter((r) => {
    if (overdue && !r.docsOverdue) return false;
    if (site && r.site !== site) return false;
    if (search) {
      const q = search.toLowerCase();
      return [r.poNo, r.vendor?.name, r.voucherNo, r.proformaNo].some((v) => (v || "").toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] max-w-[1600px] mx-auto p-2 gap-2 overflow-hidden">
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-2 shrink-0">
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-2.5 top-2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="PO / Vendor / Voucher" className={`${inputCls} pl-8`} />
        </div>
        <select value={site} onChange={(e) => setSite(e.target.value)} className={`${inputCls} w-40`}>
          <option value="">Semua Site</option>
          {sites.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <input type="checkbox" checked={overdue} onChange={(e) => setOverdue(e.target.checked)} /> Terlambat
        </label>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Semua Status
        </label>
        <button onClick={load} className={btnSecondary} title="Refresh">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto bg-white rounded-lg border border-slate-200 shadow-sm">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-600 sticky top-0">
            <tr>
              <th className="text-left p-2">No. PO</th>
              <th className="text-left p-2">Vendor</th>
              <th className="text-left p-2">Site</th>
              <th className="text-left p-2">Voucher</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Tgl Bayar</th>
              <th className="text-left p-2">Jatuh Tempo Dok.</th>
              {DOC_TYPES.map((t) => (
                <th key={t} className="text-center p-2">
                  {DOC_SHORT[t]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className={`border-t border-slate-100 hover:bg-slate-50 ${r.docsOverdue ? "bg-rose-50" : ""}`}>
                <td className="p-2">
                  <button onClick={() => setDetailId(r.id)} className="font-semibold text-blue-700 hover:underline cursor-pointer">
                    {r.poNo}
                  </button>
                </td>
                <td className="p-2">{r.vendor?.name || "-"}</td>
                <td className="p-2">{r.site}</td>
                <td className="p-2">{r.voucherNo || "-"}</td>
                <td className="p-2">
                  <StatusBadge status={r.status} />
                </td>
                <td className="p-2">{formatDate(r.paidAt)}</td>
                <td className="p-2">
                  <span className="inline-flex items-center gap-1">
                    {formatDate(r.docsDueAt)} {r.docsOverdue && <OverdueBadge />}
                  </span>
                </td>
                {DOC_TYPES.map((t) => (
                  <td key={t} className="p-2 text-center">
                    <DocToggle request={r} docType={t} canEdit={canSubmit || canVerify} onSaved={load} onError={setNotice} />
                  </td>
                ))}
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={7 + DOC_TYPES.length} className="p-6 text-center text-slate-400">
                  {loading ? "Memuat…" : "Tidak ada data"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {detailId != null && (
        <RequestDetailModal
          requestId={detailId}
          userId={user?.id}
          canSubmit={canSubmit}
          canVerify={canVerify}
          mappings={mappings}
          onClose={() => setDetailId(null)}
          onChanged={load}
          onError={setNotice}
        />
      )}
    </div>
  );
}
