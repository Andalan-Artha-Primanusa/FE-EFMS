import { useEffect, useState, useMemo, useCallback, Fragment } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Edit2, FileSpreadsheet, FileText, Filter, Plus, Trash2, X, DollarSign, Calendar, Info, Layers, UserCheck, ShieldAlert, ShieldCheck, ArrowUpRight, CheckCircle, BarChart3, Eye, User, FileCheck, History, Upload, FileCode, ExternalLink, Calculator, Pickaxe, RefreshCw, Printer, ChevronDown, ChevronRight, Receipt, Lock, Unlock, ArrowRight, Building2, Sparkles, Check, Send, Zap, TrendingUp, Archive, Scale } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { Panel } from "../../components/Panel";
import { api, API_BASE, uploadDocumentFile, verifyBATracker, approveBATracker, generateInvoiceFromBA, verifyInvoice, approveInvoiceTier1, approveInvoiceTier2, getFinanceTemplates, User as UserType } from "../../lib/api";

import {
  resolveDocumentUrl, formatIDR, parseNumber, formatThousand, formatDateInput,
  indonesianMonths, formatMonthLabel, formatMonthInput, getRomanMonth,
  generateBANumberPreview, generateInvoiceNumberPreview, getYearFromPeriod,
  generateInvoiceNumber, getBAInvoiceStatus, renderBAStatusBadge,
  getBAStatusForExport, renderInvoiceStatusBadge, parsePeriodToMonthIndex,
  RupiahInput, generateAuditTimeline
} from "./helpers";

export function PendingVolumeModal({ c }: { c: any }) {
  const {
    pendingVolumeLedgers, showPendingVolumeDrawer, setShowPendingVolumeDrawer, openCreateModal
  } = c as Record<string, any>;
  return (
    <>
      {/* ================= MODAL KARTU KONTROL PENDING VOLUME ================= */}
      {showPendingVolumeDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
            
            {/* Modal Header */}
            <div className="p-5 bg-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <Scale size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">
                    Kartu Kontrol Saldo Pending Volume (Carry-Forward OB)
                  </h3>
                  <p className="text-xs text-indigo-200 font-medium">
                    Monitoring kuota rasio kontrak SOW (Maks. 3:1 OB/Coal) & penyerapan otomatis pada invoice berikutnya
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPendingVolumeDrawer(false)}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-xs">
              {/* Top 4 KPI Metrics */}
              {(() => {
                const ledgers = Array.isArray(pendingVolumeLedgers) ? pendingVolumeLedgers : [];
                const activeLedgers = ledgers.filter((l: any) => l.remainingVolume > 0 || l.status === "Active" || l.status === "Partially Settled");
                const totalRemainingVol = activeLedgers.reduce((s: number, l: any) => s + (l.remainingVolume || 0), 0);
                const totalAbsorbedVol = ledgers.reduce((s: number, l: any) => s + (l.absorbedVolume || 0), 0);
                const totalNominalEst = activeLedgers.reduce((sum: number, l: any) => sum + (l.remainingVolume * (l.ob1Rate * 0.75 + l.ob2Rate * 0.25 || 27000)), 0);

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200/80 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1">
                        <Layers size={13} className="text-indigo-700" /> Saldo Pending Aktif
                      </span>
                      <div className="text-xl font-black font-mono text-indigo-950">
                        {totalRemainingVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })} <span className="text-xs font-sans font-bold text-indigo-700">BCM</span>
                      </div>
                      <p className="text-[10px] text-indigo-700">Sisa volume OB belum tertagih</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1">
                        <DollarSign size={13} className="text-emerald-700" /> Estimasi Nilai Tertunda
                      </span>
                      <div className="text-xl font-black font-mono text-emerald-950 truncate">
                        {formatIDR(totalNominalEst)}
                      </div>
                      <p className="text-[10px] text-emerald-700">Proyeksi klaim saat kuota tersedia</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-200/80 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-cyan-900 flex items-center gap-1">
                        <CheckCircle2 size={13} className="text-cyan-700" /> Berhasil Diserap
                      </span>
                      <div className="text-xl font-black font-mono text-cyan-950">
                        {totalAbsorbedVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })} <span className="text-xs font-sans font-bold text-cyan-700">BCM</span>
                      </div>
                      <p className="text-[10px] text-cyan-700">Volume telah dicairkan ke invoice</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1">
                        <Clock size={13} className="text-slate-600" /> Antrean Carry-Forward
                      </span>
                      <div className="text-xl font-black font-mono text-slate-900">
                        {activeLedgers.length} <span className="text-xs font-sans font-bold text-slate-600">Periode</span>
                      </div>
                      <p className="text-[10px] text-slate-500">Prioritas penyerapan FIFO</p>
                    </div>
                  </div>
                );
              })()}

              {/* SOW Contract Rules Box */}
              <div className="p-4 bg-indigo-50 border border-indigo-200/70 rounded-2xl flex items-start gap-3">
                <Info size={18} className="text-indigo-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-extrabold text-indigo-950 uppercase tracking-wide text-[11px]">
                    Aturan Rasio Kontrak SOW (Stripping Ratio Rule):
                  </div>
                  <p className="text-slate-700 leading-relaxed text-[11px]">
                    Pada kontrak <strong>PT BGG</strong> & <strong>PT SBS</strong>, kapasitas tagih OB dibatasi maksimal <strong>3.0 BCM per 1 Ton Coal (3 : 1)</strong>. Apabila volume OB aktual melebihi kapasitas kuota, kelebihan volume otomatis dicatat ke buku besar pending ini dengan tetap mempertahankan tarif periode asalnya (OB1 75% & OB2 25%). Pada invoice berikutnya yang rasio OB-nya di bawah 3:1, sisa kuota kosong (*headroom*) akan otomatis menyerap antrean saldo pending tertua.
                  </p>
                </div>
              </div>

              {/* Ledger Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <FileText size={15} className="text-indigo-700" /> Rincian Buku Besar Pending Volume (Carry-Forward OB)
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPendingVolumeDrawer(false);
                      openCreateModal("pending_volume");
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  >
                    <Plus size={13} /> + Catat Pending Volume Baru
                  </button>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
                  <table className="w-full text-xs text-left min-w-[780px]">
                    <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Customer / Project</th>
                        <th className="p-3 text-center">Periode Asal</th>
                        <th className="p-3">Ref. No BA</th>
                        <th className="p-3 text-right">Volume Awal</th>
                        <th className="p-3 text-right">Terserap</th>
                        <th className="p-3 text-right">Sisa Saldo</th>
                        <th className="p-3 text-right">Tarif Asal SOW</th>
                        <th className="p-3 text-right">Estimasi Nominal (Rp)</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {pendingVolumeLedgers.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-6 text-center text-slate-400 italic">
                            Belum ada entri pending volume yang tercatat.
                          </td>
                        </tr>
                      ) : (
                        pendingVolumeLedgers.map((item: any, idx: number) => {
                          const estAmount = (item.remainingVolume || 0) * ((item.ob1Rate || 0) * 0.75 + (item.ob2Rate || 0) * 0.25 || 27000);
                          const isSettled = item.remainingVolume <= 0 || item.status === "Settled";
                          const isPartially = item.absorbedVolume > 0 && item.remainingVolume > 0;

                          return (
                            <tr key={item.id || idx} className={`hover:bg-indigo-50/30 transition ${isSettled ? "bg-slate-50/50 opacity-70" : ""}`}>
                              <td className="p-3 font-bold text-slate-900">
                                <div className="flex items-center gap-1.5">
                                  <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 font-mono font-black text-[10px]">
                                    {item.customerCode}
                                  </span>
                                  <span>{item.customerCode === "BGG" ? "PT Budi Gema Gempita" : item.customerCode === "SBS" ? "PT Sumber Bara Sejahtera" : "PT Position"}</span>
                                </div>
                              </td>
                              <td className="p-3 text-center font-mono font-bold text-slate-800">
                                <span className="px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-200">
                                  {item.sourcePeriod}
                                </span>
                              </td>
                              <td className="p-3 font-mono text-slate-600 text-[11px]">
                                {item.sourceBARef || "-"}
                              </td>
                              <td className="p-3 text-right font-mono text-slate-700">
                                {(item.originalOBVolume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} BCM
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-cyan-800">
                                {(item.absorbedVolume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} BCM
                              </td>
                              <td className="p-3 text-right font-mono font-black text-indigo-950">
                                <span className={item.remainingVolume > 0 ? "px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200" : ""}>
                                  {(item.remainingVolume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} BCM
                                </span>
                              </td>
                              <td className="p-3 text-right font-mono text-[11px] text-slate-600">
                                <div>75%: Rp {(item.ob1Rate || 7467).toLocaleString("id-ID")}</div>
                                <div className="text-[10px] text-slate-400">25%: Rp {(item.ob2Rate || 7261).toLocaleString("id-ID")}</div>
                              </td>
                              <td className="p-3 text-right font-mono font-black text-emerald-800">
                                {formatIDR(estAmount)}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                  isSettled
                                    ? "bg-slate-100 text-slate-700 border-slate-300"
                                    : isPartially
                                    ? "bg-amber-100 text-amber-900 border-amber-300"
                                    : "bg-indigo-100 text-indigo-900 border-indigo-300"
                                }`}>
                                  {item.status || (isSettled ? "Settled" : "Active")}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Settlement History Invoices */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="font-extrabold uppercase tracking-wider text-slate-700 text-[10px] flex items-center gap-1.5">
                  <CheckCircle size={13} className="text-emerald-700" /> Riwayat Penagihan & Pencairan Carry-Forward:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 font-mono text-[11px]">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">Invoice #088/BGG-AAP/II/2026</span>
                      <strong className="text-slate-800">Menyerap Pending Nov & Des 25</strong>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full">Dicairkan</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">Invoice #089/BGG-AAP/IV/2026</span>
                      <strong className="text-slate-800">Menyerap Pending Des 25 & Jan 26</strong>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full">Dicairkan</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">Invoice #090/BGG-AAP/V/2026</span>
                      <strong className="text-slate-800">Menyerap Pending Feb 26 (48.224 BCM)</strong>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full">Dicairkan</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPendingVolumeDrawer(false)}
                className="px-6 py-2.5 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-xl transition text-xs shadow-xs cursor-pointer"
              >
                Tutup Kartu Kontrol
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}

