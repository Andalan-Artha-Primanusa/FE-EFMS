import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { RefreshCw, Search } from "lucide-react";
import { api } from "../../lib/api";
import { authorized } from "../../lib/auth";
import { formatCurrency, formatDate } from "../../lib/format";
import type { TPORequest } from "./types";
import { DOC_LABEL, DOC_SHORT, DOC_TYPES, DocToggle, OverdueBadge, StatusBadge, btnSecondary, cents, docOf, fromCents, inputCls, isDocRequired, useAccountMappings } from "./shared";
import { RequestDetailModal } from "./RequestDetailModal";

const docProgress = (r: TPORequest) => {
  const req = DOC_TYPES.filter((t) => isDocRequired(r, t));
  return { req, done: req.filter((t) => docOf(r, t)?.checked).length };
};

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

  const overdueCount = rows.filter((r) => r.docsOverdue).length;
  const sumPay = fromCents(filtered.reduce((s, r) => s + cents(r.payAmount), 0));

  const stats = useMemo(() => {
    const scope = rows.filter((r) => !site || r.site === site);
    const soon = Date.now() + 7 * 864e5;
    const s = { total: 0, done: 0, open: 0, dueSoon: 0, late: 0, pay: 0, latePay: 0, pending: {} as Record<string, number> };
    for (const r of scope) {
      const { req, done } = docProgress(r);
      const complete = done === req.length;
      s.total++;
      s.pay += cents(r.payAmount);
      if (complete) s.done++;
      else s.open++;
      if (r.docsOverdue) {
        s.late++;
        s.latePay += cents(r.payAmount);
      } else if (!complete && r.docsDueAt && new Date(r.docsDueAt).getTime() <= soon) s.dueSoon++;
      for (const t of req) if (!docOf(r, t)?.checked) s.pending[t] = (s.pending[t] || 0) + 1;
    }
    return s;
  }, [rows, site]);
  const card = "bg-white rounded-lg border border-slate-200 shadow-sm p-2.5";
  const label = "text-[10px] font-bold text-slate-500 uppercase tracking-wider";
  const chip = (on: boolean, tone: string) =>
    `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition cursor-pointer ${on ? tone : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"}`;

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] max-w-[1600px] mx-auto p-2 gap-2 overflow-hidden text-xs">
      <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center gap-2 shrink-0">
        <div className="relative w-72">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="PO / Vendor / Voucher" className={`${inputCls} pl-8`} />
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
        <button onClick={() => setOverdue(!overdue)} className={chip(overdue, "border-rose-300 bg-rose-50 text-rose-700")}>
          Terlambat
          <span className={`px-1.5 rounded-full text-[10px] font-bold ${overdue ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600"}`}>{overdueCount}</span>
        </button>
        <button onClick={() => setAll(!all)} className={chip(all, "border-[#A57C50] bg-[#A57C50] text-white")}>
          Semua Status
        </button>
        <button onClick={load} className={btnSecondary} title="Refresh">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 shrink-0">
        <div className="bg-[#1A1612] rounded-lg p-2.5">
          <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Total PO</div>
          <div className="text-lg font-bold text-white leading-tight">{stats.total}</div>
          <div className="font-mono font-bold text-amber-400">{formatCurrency(fromCents(stats.pay))}</div>
        </div>
        <div className={card}>
          <div className={label}>Dokumen Lengkap</div>
          <div className="text-lg font-bold text-emerald-700 leading-tight">{stats.done}</div>
          <div className="h-1.5 mt-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${stats.total ? (stats.done / stats.total) * 100 : 0}%` }} />
          </div>
        </div>
        <div className={card}>
          <div className={label}>Belum Lengkap</div>
          <div className="text-lg font-bold text-slate-900 leading-tight">{stats.open}</div>
        </div>
        <div className={card}>
          <div className={label}>Jatuh Tempo ≤ 7 Hari</div>
          <div className="text-lg font-bold text-amber-700 leading-tight">{stats.dueSoon}</div>
        </div>
        <div className={`${card} ${stats.late ? "border-rose-200 bg-rose-50" : ""}`}>
          <div className={label}>Terlambat</div>
          <div className="text-lg font-bold text-rose-700 leading-tight">{stats.late}</div>
          <div className="font-mono font-bold text-rose-700">{formatCurrency(fromCents(stats.latePay))}</div>
        </div>
        <div className={card}>
          <div className={label}>Outstanding Dokumen</div>
          <div className="grid grid-cols-3 gap-x-2 gap-y-0.5 mt-1">
            {DOC_TYPES.map((t) => (
              <div key={t} title={DOC_LABEL[t]} className="flex justify-between gap-1">
                <span className="text-slate-500">{DOC_SHORT[t]}</span>
                <span className={`font-mono font-bold ${stats.pending[t] ? "text-slate-900" : "text-slate-300"}`}>{stats.pending[t] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto bg-white rounded-lg border border-slate-200 shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-10 text-slate-600">
            <tr className="bg-slate-50">
              <th rowSpan={2} className="p-2.5 whitespace-nowrap border-b border-slate-200">No. PO</th>
              <th rowSpan={2} className="p-2.5 border-b border-slate-200">Vendor</th>
              <th rowSpan={2} className="p-2.5 border-b border-slate-200">Site</th>
              <th rowSpan={2} className="p-2.5 text-right whitespace-nowrap border-b border-slate-200">Total Bayar</th>
              <th rowSpan={2} className="p-2.5 border-b border-slate-200">Voucher</th>
              <th rowSpan={2} className="p-2.5 text-center border-b border-slate-200">Status</th>
              <th rowSpan={2} className="p-2.5 whitespace-nowrap border-b border-slate-200">Tgl Bayar</th>
              <th rowSpan={2} className="p-2.5 whitespace-nowrap border-b border-slate-200">Jatuh Tempo Dok.</th>
              <th colSpan={DOC_TYPES.length + 1} className="p-2 text-center border-b border-l border-slate-200">
                Kelengkapan Dokumen
              </th>
            </tr>
            <tr className="bg-slate-50">
              {DOC_TYPES.map((t, i) => (
                <th key={t} title={DOC_LABEL[t]} className={`p-2 text-center whitespace-nowrap border-b border-slate-200 ${i ? "" : "border-l"}`}>
                  {DOC_SHORT[t]}
                </th>
              ))}
              <th className="p-2 text-center border-b border-slate-200">Lengkap</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((r) => {
              const { req, done } = docProgress(r);
              return (
                <tr key={r.id} className={`hover:bg-slate-50 ${r.docsOverdue ? "bg-rose-50/60 shadow-[inset_3px_0_0_#e11d48]" : ""}`}>
                  <td className="p-2.5 whitespace-nowrap">
                    <button onClick={() => setDetailId(r.id)} className="font-mono font-bold text-blue-700 hover:underline cursor-pointer">
                      {r.poNo}
                    </button>
                    {r.kind === "FUEL" && <span className="ml-1 px-1 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">FUEL</span>}
                  </td>
                  <td className="p-2.5 font-semibold text-slate-800">{r.vendor?.name || "-"}</td>
                  <td className="p-2.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">{r.site}</span>
                  </td>
                  <td className="p-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">{formatCurrency(r.payAmount)}</td>
                  <td className="p-2.5 font-mono whitespace-nowrap">{r.voucherNo || "-"}</td>
                  <td className="p-2.5 text-center">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="p-2.5 whitespace-nowrap">{formatDate(r.paidAt)}</td>
                  <td className="p-2.5 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 ${r.docsOverdue ? "font-bold text-rose-700" : ""}`}>
                      {formatDate(r.docsDueAt)} {r.docsOverdue && <OverdueBadge />}
                    </span>
                  </td>
                  {DOC_TYPES.map((t, i) => (
                    <td key={t} className={`p-2 text-center ${i ? "" : "border-l border-slate-100"}`}>
                      <DocToggle request={r} docType={t} canEdit={canSubmit || canVerify} onSaved={load} onError={setNotice} />
                    </td>
                  ))}
                  <td className="p-2 text-center">
                    <span
                      className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${done === req.length ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                    >
                      {done}/{req.length}
                    </span>
                  </td>
                </tr>
              );
            })}
            {!filtered.length && (
              <tr>
                <td colSpan={9 + DOC_TYPES.length} className="p-10 text-center text-slate-400">
                  {loading ? "Memuat…" : "Tidak ada data"}
                </td>
              </tr>
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot className="sticky bottom-0">
              <tr className="bg-slate-50 border-t border-slate-200 font-bold text-slate-900">
                <td colSpan={3} className="p-2.5 text-slate-600">
                  {filtered.length} PO
                </td>
                <td className="p-2.5 text-right font-mono whitespace-nowrap">{formatCurrency(sumPay)}</td>
                <td colSpan={5 + DOC_TYPES.length} />
              </tr>
            </tfoot>
          )}
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
