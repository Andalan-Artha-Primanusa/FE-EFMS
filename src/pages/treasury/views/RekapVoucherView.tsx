import { useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, RefreshCw, Search } from "lucide-react";
import * as XLSX from "xlsx";
import { api } from "../../../lib/api";
import { formatCurrency, formatDate } from "../../../lib/format";
import { downloadFile } from "../useTreasuryController";

type RekapVoucher = {
  source: "PLAN" | "ASSIGN";
  planId?: number | null;
  voucherNo: string;
  voucherSeq: number;
  voucherYear: number;
  voucherType: string;
  voucherDate?: string | null;
  category?: string;
  vendorNames: string[] | null;
  sites: string[] | null;
  totalAmount: string | number;
  status: string;
  itemCount: number;
  paidAt?: string | null;
  paymentProofName?: string;
  postedAt?: string | null;
};

const TYPES = ["AP", "TPO", "NPO", "LSG", "LOAN", "OTH"];
const STATUSES = ["draft", "printed_for_signature", "approved", "exported", "reconciled", "posted", "rejected", "void"];

export default function RekapVoucherView() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<RekapVoucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    const q = new URLSearchParams({ year: String(year), type, status, search });
    api<{ success: boolean; vouchers: RekapVoucher[] }>(`/api/treasury/vouchers/rekap?${q}`)
      .then((res) => setRows(res.vouchers || []))
      .catch((e) => setError(e.message || "Gagal memuat rekap voucher"))
      .finally(() => setLoading(false));
  };

  // Search is applied on Enter / refresh to avoid a request per keystroke.
  useEffect(load, [year, type, status]);

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    rows.forEach((r) => (t[r.voucherType] = (t[r.voucherType] || 0) + Number(r.totalAmount || 0)));
    return t;
  }, [rows]);
  const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      rows.map((r) => ({
        "No. Voucher": r.voucherNo,
        Jenis: r.voucherType,
        Tanggal: r.voucherDate ? formatDate(r.voucherDate) : "",
        Vendor: (r.vendorNames || []).join(", "),
        Site: (r.sites || []).join(", "),
        Total: Number(r.totalAmount || 0),
        Status: r.status,
        Sumber: r.source === "PLAN" ? "Plan" : "Assign",
        "Bukti Bayar": r.paymentProofName || "",
        "Tgl Bayar": r.paidAt ? formatDate(r.paidAt) : "",
        Posted: r.postedAt ? formatDate(r.postedAt) : "",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Voucher");
    XLSX.writeFile(wb, `REKAP_VOUCHER_${year}${type ? `_${type}` : ""}.xlsx`);
  };

  const selectCls = "text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-700";

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] max-w-[1600px] mx-auto p-2 gap-2 overflow-hidden font-sans text-xs">
      {/* Filters */}
      <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={selectCls}>
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select value={type} onChange={(e) => setType(e.target.value)} className={selectCls}>
            <option value="">Semua Jenis</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
            <option value="">Semua Status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari No. Voucher / Vendor"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={load}
            className="p-1.5 text-slate-600 hover:text-blue-600 border border-slate-300 rounded hover:bg-slate-50 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
        <button
          onClick={exportExcel}
          disabled={rows.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-40"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
        </button>
      </div>

      {/* Totals per type */}
      <div className="grid grid-cols-3 md:grid-cols-7 gap-2 shrink-0">
        {TYPES.map((t) => (
          <div key={t} className="bg-white rounded-lg border border-slate-200 p-2">
            <div className="text-[10px] font-bold text-slate-500">{t}</div>
            <div className="font-mono font-bold text-slate-900">{formatCurrency(totals[t] || 0)}</div>
          </div>
        ))}
        <div className="bg-[#1A1612] rounded-lg p-2">
          <div className="text-[10px] font-bold text-stone-400">TOTAL</div>
          <div className="font-mono font-bold text-amber-400">{formatCurrency(grandTotal)}</div>
        </div>
      </div>

      {error && <div className="p-2 rounded border border-rose-200 bg-rose-50 text-rose-700 shrink-0">{error}</div>}

      {/* Table */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-slate-200 shadow-sm overflow-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <th className="p-2.5">No. Voucher</th>
              <th className="p-2.5">Jenis</th>
              <th className="p-2.5">Tanggal</th>
              <th className="p-2.5">Vendor</th>
              <th className="p-2.5">Site</th>
              <th className="p-2.5 text-right">Total</th>
              <th className="p-2.5 text-center">Status</th>
              <th className="p-2.5 text-center">Sumber</th>
              <th className="p-2.5">Bukti Bayar</th>
              <th className="p-2.5">Tgl Bayar</th>
              <th className="p-2.5">Posted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="p-8 text-center text-slate-400">
                  {loading ? "Memuat..." : "Tidak ada voucher."}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={`${r.source}|${r.voucherNo}`} className="hover:bg-slate-50/80">
                  <td className="p-2.5 font-mono font-bold text-blue-700 whitespace-nowrap">{r.voucherNo}</td>
                  <td className="p-2.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">{r.voucherType}</span>
                  </td>
                  <td className="p-2.5 whitespace-nowrap">{r.voucherDate ? formatDate(r.voucherDate) : "-"}</td>
                  <td className="p-2.5 font-semibold text-slate-800">{(r.vendorNames || []).join(", ") || "-"}</td>
                  <td className="p-2.5">{(r.sites || []).join(", ") || "-"}</td>
                  <td className="p-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                    {formatCurrency(Number(r.totalAmount || 0))}
                  </td>
                  <td className="p-2.5 text-center">{r.status || "-"}</td>
                  <td className="p-2.5 text-center">{r.source === "PLAN" ? "Plan" : "Assign"}</td>
                  <td className="p-2.5">
                    {r.paymentProofName && r.planId ? (
                      <button
                        onClick={() =>
                          downloadFile(`/api/treasury/payment-plans/${r.planId}/payment-proof`, r.paymentProofName!).catch(
                            (e) => setError(e.message)
                          )
                        }
                        className="inline-flex items-center gap-1 text-blue-700 hover:underline cursor-pointer max-w-[180px] truncate"
                        title={r.paymentProofName}
                      >
                        <Download className="w-3 h-3 shrink-0" /> {r.paymentProofName}
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="p-2.5 whitespace-nowrap">{r.paidAt ? formatDate(r.paidAt) : "-"}</td>
                  <td className="p-2.5 whitespace-nowrap">{r.postedAt ? formatDate(r.postedAt) : "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
