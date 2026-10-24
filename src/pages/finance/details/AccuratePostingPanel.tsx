import React, { useState } from "react";
import { RefreshCw, Loader2, Link2 } from "lucide-react";
import { api } from "../../../lib/api";

interface AccuratePostingPanelProps {
  type: "ba" | "invoice";
  data: any;
  canSync: boolean;
  onSaved: (updated: any) => void;
  onNotice: (msg: string) => void;
}

const DOC_LABEL: Record<string, string> = { OP: "JV Akrual", MDO: "JV Akrual MDO", FAKTUR: "Faktur Penjualan", REV: "JV Pembalik" };

// Nomor dokumen Accurate untuk baris list; gagal posting tampil merah dengan error di tooltip.
export const AccurateDocBadges: React.FC<{ accurate?: any }> = ({ accurate }) => {
  if (!accurate) return null;
  const docs = Object.entries((accurate.docs || {}) as Record<string, { number: string }>);
  return (
    <div className="flex flex-wrap items-center gap-1">
      {docs.map(([k, d]) => (
        <span key={k} title={DOC_LABEL[k] || k} className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-bold text-[9px]">
          {d.number}
        </span>
      ))}
      {accurate.status === "Gagal" && (
        <span title={accurate.error} className="px-1.5 py-0.2 rounded bg-red-50 text-red-700 border border-red-200 font-bold text-[9px]">Accurate Gagal</span>
      )}
    </div>
  );
};

// Status posting dokumen ke Accurate (JV akrual BA / faktur penjualan + JV pembalik invoice).
export const AccuratePostingPanel: React.FC<AccuratePostingPanelProps> = ({ type, data, canSync, onSaved, onNotice }) => {
  const [syncing, setSyncing] = useState(false);
  const acc = data.accurate;
  const docs = Object.entries((acc?.docs || {}) as Record<string, { id: number; number: string }>);
  const failed = acc?.status === "Gagal";

  const sync = async () => {
    setSyncing(true);
    try {
      const updated = await api<any>(`/api/finance/${type === "ba" ? "ba-trackers" : "invoices"}/${data.id}/accurate-sync`, { method: "POST" });
      onSaved(updated);
      onNotice(updated?.accurate?.status === "Gagal" ? updated.accurate.error || "Posting ke Accurate gagal" : "Terposting ke Accurate");
    } catch (err: any) {
      onNotice(err?.message || "Posting ke Accurate gagal");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-[4px] p-4 shadow-xs space-y-3">
      <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
        <div className="flex items-center gap-1.5">
          <Link2 className="text-[#A57C50]" size={16} />
          <h4 className="text-xs font-black uppercase tracking-wider text-[#1A1612]">Accurate</h4>
        </div>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
            !acc ? "bg-slate-100 text-slate-600 border-slate-200" : failed ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
          }`}
        >
          {acc?.status || "Belum Terposting"}
        </span>
      </div>

      {docs.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-[4px] px-3 py-1">
          {docs.map(([k, d]) => (
            <div key={k} className="flex items-center gap-3 min-h-[30px] border-b border-slate-100 last:border-b-0">
              <span className="w-36 shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-500">{DOC_LABEL[k] || k}</span>
              <span className="text-xs font-bold font-mono text-slate-900">{d.number}</span>
            </div>
          ))}
        </div>
      )}

      {acc?.error && <p className={`text-xs font-bold ${failed ? "text-red-700" : "text-amber-700"}`}>{acc.error}</p>}

      {canSync && (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={syncing}
            onClick={sync}
            className="px-3 py-1.5 text-xs font-extrabold bg-[#A57C50] hover:bg-[#8e6941] disabled:opacity-60 text-white rounded-[3px] flex items-center gap-1.5 transition shadow-xs cursor-pointer"
          >
            {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            {acc ? "Posting Ulang" : "Posting ke Accurate"}
          </button>
        </div>
      )}
    </div>
  );
};
