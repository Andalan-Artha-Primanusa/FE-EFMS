import type { ReactNode } from "react";
import { useFinanceController } from "./useFinanceController";
import { DetailModal } from "./DetailModal";
import { FormModals } from "./FormModals";
import { formatIDR, pendingCalc } from "./helpers";

type ShellProps = {
  viewTitle: string;
  query?: string;
  onNotice?: (msg: string) => void;
  user?: any;
  render?: (c: any) => ReactNode;
};

// Terbit invoice BGG: checklist pending volume BA lain yang ikut ditagih (satu periode maksimal satu pending).
function InvoicePendingPick({ c }: { c: any }) {
  const { invoicePick: pick, setInvoicePick, handleGenerateInvoiceFromBA } = c;
  const selected = pick.rows.filter((r: any) => pick.ids.includes(r.id));
  const toggle = (id: number) => setInvoicePick({ ...pick, ids: pick.ids.includes(id) ? pick.ids.filter((x: number) => x !== id) : [...pick.ids, id] });
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-3">
      <div className="bg-white rounded-[4px] border border-slate-200 shadow-2xl p-5 w-full max-w-xl space-y-4 text-xs">
        <h4 className="text-sm font-black text-slate-900">Terbitkan Draft Invoice{pick.category ? ` [${pick.category}]` : ""} · {pick.ba.baNumber}</h4>
        <table className="w-full border border-slate-200">
          <caption className="text-left font-black uppercase tracking-wider text-slate-700 pb-1.5">Pending Volume</caption>
          <thead className="bg-slate-100 text-[10px] uppercase font-extrabold text-slate-700">
            <tr><th className="p-2 w-8" /><th className="p-2 text-left">Periode</th><th className="p-2 text-left">Ref. BA</th><th className="p-2 text-right">DPP (IDR)</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pick.rows.map((r: any) => {
              const on = pick.ids.includes(r.id);
              const clash = !on && selected.some((s: any) => s.pendingVolume.period === r.pendingVolume.period);
              return (
                <tr key={r.id} className={clash ? "opacity-50" : ""}>
                  <td className="p-2 text-center"><input type="checkbox" checked={on} disabled={clash} onChange={() => toggle(r.id)} /></td>
                  <td className="p-2 font-bold">{r.pendingVolume.period}</td>
                  <td className="p-2 font-mono">{r.baNumber}</td>
                  <td className="p-2 text-right font-mono font-bold">{formatIDR(pendingCalc(r).gross)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 font-black"><td colSpan={3} className="p-2">Total</td><td className="p-2 text-right font-mono">{formatIDR(selected.reduce((s: number, r: any) => s + pendingCalc(r).gross, 0))}</td></tr>
          </tfoot>
        </table>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setInvoicePick(null)} className="px-5 py-2 rounded-[3px] border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold cursor-pointer">Batal</button>
          <button type="button" onClick={() => { setInvoicePick(null); handleGenerateInvoiceFromBA(pick.ba.id, pick.category, pick.ids); }} className="px-5 py-2 rounded-[3px] bg-[#A57C50] hover:bg-[#8e6941] text-white font-black cursor-pointer">Terbitkan Invoice</button>
        </div>
      </div>
    </div>
  );
}

// Kerangka bersama semua halaman finance: data + modal global.
// Konten spesifik tiap halaman disuntikkan lewat prop render.
export function FinanceShell({ viewTitle, query = "", onNotice = (_m: string) => {}, user, render }: ShellProps) {
  const c = useFinanceController({ viewTitle, query, onNotice, user });
  return (
    <div className="workspace-body space-y-3.5">
      {render ? render(c) : null}
      <DetailModal c={c} />
      <FormModals c={c} />
      {(c as any).invoicePick && <InvoicePendingPick c={c} />}
    </div>
  );
}
