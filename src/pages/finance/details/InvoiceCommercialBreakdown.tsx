import React from "react";
import { TrendingUp, ShieldCheck, Calculator } from "lucide-react";
import { formatIDR } from "../helpers";

interface InvoiceCommercialBreakdownProps {
  viewCustCode: string;
  rfIndexCalculated: number;
  detailData: any;
  cCalc: any;
  cInfo: any;
}

export const InvoiceCommercialBreakdown: React.FC<InvoiceCommercialBreakdownProps> = ({
  viewCustCode,
  rfIndexCalculated,
  detailData,
  cCalc,
  cInfo
}) => {
  if (viewCustCode === "BGG" || viewCustCode === "POS") {
    return (
      <div className="p-3.5 bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white rounded-xl border border-slate-700/80 shadow-md space-y-3">
        <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <TrendingUp size={16} />
            </div>
            <div>
              <h5 className="text-xs font-black uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
                Dekomposisi Pendapatan Komersial ({viewCustCode})
              </h5>
              <p className="text-[10px] text-slate-400">Pemisahan Nilai Kontrak Pokok (Core Mining) & Penyesuaian Eskalasi (Raise & Fall)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-900/60 text-cyan-300 border border-cyan-700/50">
              Index: {viewCustCode === "BGG" ? "1,560x (+56,0%)" : `${rfIndexCalculated.toFixed(3)}x (+${((rfIndexCalculated - 1) * 100).toFixed(1)}%)`}
            </span>
            {detailData.rfSnapshot && (
              <div className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-700/60 px-2 py-0.5 rounded-full">
                <ShieldCheck size={12} className="text-emerald-400" />
                <span>Terkunci</span>
              </div>
            )}
          </div>
        </div>

        {/* 2 Big Metric Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/70">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">
              1. Core Mining Revenue (Pokok)
            </span>
            <div className="text-sm font-black font-mono text-cyan-300 mt-0.5">
              {formatIDR(
                viewCustCode === "BGG"
                  ? (cCalc.subtotalA || 0) + (cCalc.subtotalB || 0) + (cCalc.subtotalC || 0) + (cCalc.subtotalE || 0) + (cCalc.subtotalF || 0)
                  : (cCalc.subtotalA || 0) + (cCalc.subtotalB || 0) + (cCalc.subtotalC || 0)
              )}
            </div>
            <span className="text-[9px] text-slate-400">
              {viewCustCode === "BGG" ? "Volume OB, Coal, Overdistance & Potongan" : "Volume Produksi, Overdistance & Land Clearing"}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-800/60">
            <span className="text-[10px] font-extrabold uppercase text-cyan-300 block tracking-wider">
              2. Escalation Recovery (Raise & Fall)
            </span>
            <div className="text-sm font-black font-mono text-amber-300 mt-0.5">
              {formatIDR(cCalc.subtotalD || 0)}
            </div>
            <span className="text-[9px] text-cyan-200/70">
              {viewCustCode === "BGG" ? "Kompensasi Indeks Solar Fn/Fo" : "Kompensasi 3-Faktor (Solar, Upah, M-Rate)"}
            </span>
          </div>
        </div>

        {/* Detail Formula Breakdown */}
        <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800 font-mono text-[10px] text-slate-300">
          {viewCustCode === "BGG" ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span>Rumus: <code>0,60 + 0,40 × (Fn / Fo)</code></span>
              <span className="text-slate-400">Fo = Rp 9.000 | Fn = Rp 21.601,53 (Solar Industri)</span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span>Rumus: <code>RF = D + L + F</code></span>
              <span className="text-slate-400">D (Solar 34%) = 0,810 | L (Upah 25%) = 0,301 | F (Tetap 41%) = 0,410</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px]">
      <div className="font-mono text-slate-600 space-y-0.5">
        <span className="font-bold text-slate-800 flex items-center gap-1">
          <Calculator size={12} className="text-cyan-700" /> Parameter Acuan & Basis Tagihan:
        </span>
        <p className="text-[10px] text-slate-600">Site: <strong>{viewCustCode}</strong> | Basis Kontrak: <strong>{cInfo?.contractNo || "Kontrak Aktif"}</strong> | Overhaul Basis: <strong>{cInfo?.overhaulBasis || "1.000m"}</strong></p>
      </div>
    </div>
  );
};
