import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { api, useReloadOnSave } from "../lib/api";

type AccurateLog = {
  id: number;
  action: string;
  method: string;
  path: string;
  request: string;
  success: boolean;
  message: string;
  response: string;
  durationMs: number;
  createdAt: string;
};

const tabs = [
  { key: "ambil", label: "Ambil Data" },
  { key: "kirim", label: "Kirim Data" },
  { key: "ubah", label: "Ubah Data" },
  { key: "hapus", label: "Hapus Data" },
];

export function AccurateLogPage() {
  const [tab, setTab] = useState("kirim");
  const [q, setQ] = useState("");
  const [failedOnly, setFailedOnly] = useState(false);
  const [rows, setRows] = useState<AccurateLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  const latest = useRef(0);
  const load = useCallback(async () => {
    const seq = ++latest.current;
    setLoading(true);
    const params = new URLSearchParams({ action: tab, q, failed: String(failedOnly) });
    const data = await api<AccurateLog[]>(`/api/accurate-logs?${params}`).catch(() => []);
    if (seq !== latest.current) return;
    setRows(data);
    setLoading(false);
  }, [tab, q, failedOnly]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);
  useReloadOnSave(load);

  return (
    <section className="space-y-4">
      <PageHeader
        title="Accurate API Log"
        meta={
          <div className="flex items-center gap-2 flex-wrap">
            <input className="h-8 px-2 text-xs border border-slate-300 rounded-[4px]" placeholder="Cari no. BA, path, pesan..." value={q} onChange={(e) => setQ(e.target.value)} />
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <input type="checkbox" checked={failedOnly} onChange={(e) => setFailedOnly(e.target.checked)} />
              Gagal
            </label>
            <button className="ghost" onClick={() => load()}><RefreshCw size={14} /> Muat Ulang</button>
          </div>
        }
      />

      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setOpen(null); }}
            className={`px-4 py-2 text-xs font-bold border-b-2 -mb-px ${tab === t.key ? "border-[#20a6b8] text-[#20a6b8]" : "border-transparent text-slate-500"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-[4px] border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="p-2">Waktu</th>
              <th className="p-2">Endpoint</th>
              <th className="p-2">Status</th>
              <th className="p-2">Pesan</th>
              <th className="p-2 text-right">ms</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-400">Memuat...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-400">Tidak ada log.</td></tr>
            ) : rows.map((r) => (
              <Fragment key={r.id}>
                <tr className="border-t border-slate-100 cursor-pointer hover:bg-slate-50" onClick={() => setOpen(open === r.id ? null : r.id)}>
                  <td className="p-2 whitespace-nowrap">{new Date(r.createdAt).toLocaleString("id-ID")}</td>
                  <td className="p-2 font-mono">{r.method} {r.path}</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.success ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{r.success ? "Sukses" : "Gagal"}</span>
                  </td>
                  <td className="p-2 text-rose-700">{r.message}</td>
                  <td className="p-2 text-right">{r.durationMs}</td>
                </tr>
                {open === r.id && (
                  <tr className="bg-slate-50">
                    <td colSpan={5} className="p-2 space-y-2">
                      <pre className="whitespace-pre-wrap break-all text-[11px]">{r.request}</pre>
                      {r.response && <pre className="whitespace-pre-wrap break-all text-[11px] border-t border-slate-200 pt-2">{r.response}</pre>}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
