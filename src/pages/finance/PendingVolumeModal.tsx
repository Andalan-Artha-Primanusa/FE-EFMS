import { useEffect, useState, useMemo, useCallback, Fragment } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Edit2, FileSpreadsheet, FileText, Filter, Plus, Trash2, X, DollarSign, Calendar, Info, Layers, UserCheck, ShieldAlert, ShieldCheck, ArrowUpRight, CheckCircle, BarChart3, Eye, User, FileCheck, History, Upload, FileCode, ExternalLink, Calculator, Pickaxe, RefreshCw, Printer, ChevronDown, ChevronRight, Receipt, Lock, Unlock, ArrowRight, Building2, Sparkles, Check, Send, Zap, TrendingUp, Archive, Scale } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { Panel } from "../../components/Panel";
import { api, API_BASE, uploadDocumentFile, verifyBATracker, approveBATracker, generateInvoiceFromBA, verifyInvoice, approveInvoiceTier1, getFinanceTemplates, User as UserType } from "../../lib/api";

import {
  resolveDocumentUrl, formatIDR, parseNumber, formatThousand, formatDateInput,
  indonesianMonths, formatMonthLabel, formatMonthInput, getRomanMonth,
  generateBANumberPreview, generateInvoiceNumberPreview, getYearFromPeriod,
  generateInvoiceNumber, getBAInvoiceStatus, renderBAStatusBadge,
  getBAStatusForExport, renderInvoiceStatusBadge, parsePeriodToMonthIndex,
  RupiahInput, FormattedNumberInput, generateAuditTimeline, getCustomerOfficialName } from "./helpers";

export function PendingVolumeModal({ c }: { c: any }) {
  const {
    pendingVolumeLedgers, showPendingVolumeDrawer, setShowPendingVolumeDrawer, openCreateModal,
    openEditModal, handleDelete, onNotice = () => {}, loadData, refreshData
  } = c as Record<string, any>;
  const doRefresh = loadData || refreshData;

  const [allocatingItem, setAllocatingItem] = useState<any>(null);
  const [allocTargetInvoice, setAllocTargetInvoice] = useState("");
  const [allocVolume, setAllocVolume] = useState<number>(0);
  const [allocNote, setAllocNote] = useState("");
  const [submittingAlloc, setSubmittingAlloc] = useState(false);

  const eligibleLedgers = useMemo(() => {
    const list = Array.isArray(pendingVolumeLedgers) ? pendingVolumeLedgers : [];
    // Exclude clients without pending volume clauses (POS)
    return list.filter((l: any) => l.customerCode !== "POS");
  }, [pendingVolumeLedgers]);

  const openAllocationModal = (item: any) => {
    setAllocatingItem(item);
    setAllocTargetInvoice("");
    setAllocVolume(item.remainingVolume || 0);
    setAllocNote(`Alokasi pending volume ${item.sourcePeriod} ke invoice tagihan berjalan`);
  };

  const handleExecuteAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocatingItem) return;
    if (allocVolume <= 0 || allocVolume > allocatingItem.remainingVolume) {
      onNotice("Volume alokasi tidak valid atau melebihi sisa saldo.");
      return;
    }
    if (!allocTargetInvoice.trim()) {
      onNotice("Nomor Invoice tujuan alokasi wajib diisi.");
      return;
    }

    setSubmittingAlloc(true);
    try {
      await api(`/api/finance/pending-volumes/${allocatingItem.id}/allocate`, {
        method: "POST",
        body: JSON.stringify({
          targetInvoice: allocTargetInvoice.trim(),
          allocatedVol: allocVolume,
          note: allocNote.trim() || "Alokasi manual volume pending ke invoice"
        })
      });
      onNotice(`Berhasil mengalokasikan ${allocVolume.toLocaleString("id-ID")} BCM ke invoice ${allocTargetInvoice}!`);
      setAllocatingItem(null);
      if (typeof doRefresh === "function") await doRefresh();
    } catch (err: any) {
      onNotice(err?.message || "Gagal melakukan alokasi pending volume");
    } finally {
      setSubmittingAlloc(false);
    }
  };

  useEffect(() => {
    if (!showPendingVolumeDrawer && !allocatingItem) return;
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (allocatingItem) {
          setAllocatingItem(null);
        } else if (showPendingVolumeDrawer) {
          setShowPendingVolumeDrawer(false);
        }
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [showPendingVolumeDrawer, allocatingItem, setShowPendingVolumeDrawer]);

  return (
    <>
      {/* ================= MODAL KARTU KONTROL PENDING VOLUME ================= */}
      {showPendingVolumeDrawer && (
        <div
          onClick={() => setShowPendingVolumeDrawer(false)}
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-[4px] shadow-2xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6"
          >
            
            {/* Modal Header - AAP Brand Ink Header with Bronze Accent */}
            <div className="p-4 sm:p-5 bg-[#1A1612] text-white flex items-center justify-between border-b border-amber-900/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[3px] bg-[#A57C50]/20 border border-[#A57C50]/40 flex items-center justify-center text-[#A57C50]">
                  <Scale size={20} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-2">
                    <span>Kartu Kontrol Saldo Pending Volume</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-[3px] bg-[#A57C50]/25 text-amber-200 border border-[#A57C50]/40 font-mono uppercase tracking-wider">
                      Carry-Forward OB
                    </span>
                  </h3>
                  <p className="text-[11px] text-amber-100/70 font-medium">
                    Monitoring kuota rasio kontrak SOW (Maks. 3:1 OB/Coal) & alokasi memo volume penagihan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPendingVolumeDrawer(false)}
                className="w-8 h-8 rounded-[3px] bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
                title="Tutup Modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto text-xs bg-slate-50/50">
              {/* Top 4 KPI Metrics */}
              {(() => {
                const activeLedgers = eligibleLedgers.filter((l: any) => l.remainingVolume > 0 || l.status === "Active" || l.status === "Partially Settled");
                const totalRemainingVol = activeLedgers.reduce((s: number, l: any) => s + (l.remainingVolume || 0), 0);
                const totalAbsorbedVol = eligibleLedgers.reduce((s: number, l: any) => s + (l.absorbedVolume || 0), 0);
                const totalNominalEst = activeLedgers.reduce((sum: number, l: any) => sum + (l.remainingVolume * (l.ob1Rate * 0.75 + l.ob2Rate * 0.25 || 27000)), 0);

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-[4px] bg-white border border-amber-300/80 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#A57C50] flex items-center gap-1.5">
                        <Layers size={13} className="text-[#A57C50]" /> Saldo Pending Aktif
                      </span>
                      <div className="text-lg sm:text-xl font-black font-mono text-[#1A1612]">
                        {totalRemainingVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })} <span className="text-xs font-sans font-bold text-[#A57C50]">BCM</span>
                      </div>
                      <p className="text-[10px] text-slate-500">Sisa volume OB belum tertagih</p>
                    </div>

                    <div className="p-3.5 rounded-[4px] bg-white border border-emerald-200/90 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                        <DollarSign size={13} className="text-emerald-700" /> Estimasi Nilai Tertunda
                      </span>
                      <div className="text-lg sm:text-xl font-black font-mono text-emerald-950 truncate">
                        {formatIDR(totalNominalEst)}
                      </div>
                      <p className="text-[10px] text-emerald-700">Proyeksi klaim saat kuota tersedia</p>
                    </div>

                    <div className="p-3.5 rounded-[4px] bg-white border border-cyan-200/90 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-cyan-900 flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-cyan-700" /> Berhasil Dialokasikan
                      </span>
                      <div className="text-lg sm:text-xl font-black font-mono text-cyan-950">
                        {totalAbsorbedVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })} <span className="text-xs font-sans font-bold text-cyan-700">BCM</span>
                      </div>
                      <p className="text-[10px] text-cyan-700">Volume telah dicairkan ke invoice</p>
                    </div>

                    <div className="p-3.5 rounded-[4px] bg-white border border-slate-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Clock size={13} className="text-slate-600" /> Status Alokasi
                      </span>
                      <div className="text-lg sm:text-xl font-black font-mono text-slate-900">
                        {activeLedgers.length} <span className="text-xs font-sans font-bold text-slate-600">Periode</span>
                      </div>
                      <p className="text-[10px] text-slate-500">Tersedia untuk dialokasikan</p>
                    </div>
                  </div>
                );
              })()}

              {/* SOW Contract Rules Box */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-2.5">
                <Info size={16} className="text-[#A57C50] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-extrabold text-[#1A1612] uppercase tracking-wide text-[10.5px]">
                    Aturan Rasio Kontrak SOW (Stripping Ratio Rule & Alokasi Manual):
                  </div>
                  <p className="text-slate-700 leading-relaxed text-[11px]">
                    Kapasitas penagihan langsung OB dibatasi maksimal <strong>3.0 BCM per 1 Ton Coal (3 : 1)</strong> untuk kontrak eligible (PT BGG). Volume survei OB yang melebihi kuota 3:1 dicatat sebagai saldo pending dengan tarif periode asalnya (OB1 75% & OB2 25%). <strong>Alokasi volume pending ke invoice dilakukan secara manual oleh tim Finance Site</strong> saat kuota periode tagihan mencukupi.
                  </p>
                </div>
              </div>

              {/* Ledger Table */}
              <div className="space-y-2.5 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#1A1612] flex items-center gap-1.5">
                    <FileText size={14} className="text-[#A57C50]" /> Rincian Buku Besar Pending Volume (Carry-Forward OB)
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPendingVolumeDrawer(false);
                      openCreateModal("pending_volume");
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#A57C50] hover:bg-[#8C6740] text-white font-bold text-xs flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                  >
                    <Plus size={13} /> + Catat Pending Volume Baru
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#FBF6F0] text-[#1A1612] font-extrabold uppercase text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 px-3 whitespace-nowrap">Customer / Project</th>
                        <th className="p-2.5 px-3 text-center whitespace-nowrap">Periode Asal</th>
                        <th className="p-2.5 px-3 whitespace-nowrap">Ref. No BA</th>
                        <th className="p-2.5 px-3 text-right whitespace-nowrap">Volume Awal</th>
                        <th className="p-2.5 px-3 text-right whitespace-nowrap">Terserap</th>
                        <th className="p-2.5 px-3 text-right whitespace-nowrap">Sisa Saldo</th>
                        <th className="p-2.5 px-3 text-right whitespace-nowrap">Tarif Asal SOW</th>
                        <th className="p-2.5 px-3 text-right whitespace-nowrap">Estimasi Nominal (Rp)</th>
                        <th className="p-2.5 px-3 text-center whitespace-nowrap">Status</th>
                        <th className="p-2.5 px-3 text-center whitespace-nowrap">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {eligibleLedgers.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-6 text-center text-slate-400 italic">
                            Belum ada entri pending volume yang tercatat untuk klien eligible.
                          </td>
                        </tr>
                      ) : (
                        eligibleLedgers.map((item: any, idx: number) => {
                          const estAmount = (item.remainingVolume || 0) * ((item.ob1Rate || 0) * 0.75 + (item.ob2Rate || 0) * 0.25 || 27000);
                          const isSettled = item.remainingVolume <= 0 || item.status === "Settled";
                          const isPartially = item.absorbedVolume > 0 && item.remainingVolume > 0;

                          return (
                            <tr key={item.id || idx} className={`hover:bg-amber-50/30 transition ${isSettled ? "bg-slate-50/50 opacity-70" : ""}`}>
                              <td className="p-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-950 font-mono font-black text-[10px]">
                                    {item.customerCode}
                                  </span>
                                  <span>{getCustomerOfficialName(item.customerCode)}</span>
                                </div>
                              </td>
                              <td className="p-2.5 px-3 text-center font-mono font-bold text-slate-800 whitespace-nowrap">
                                <span className="px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200 text-[11px]">
                                  {item.sourcePeriod}
                                </span>
                              </td>
                              <td className="p-2.5 px-3 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                                {item.sourceBaRef || item.sourceBARef || "-"}
                              </td>
                              <td className="p-2.5 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                                {(item.originalOBVolume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} <span className="text-[10px] text-slate-500 font-sans">BCM</span>
                              </td>
                              <td className="p-2.5 px-3 text-right font-mono font-bold text-cyan-800 whitespace-nowrap">
                                {(item.absorbedVolume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} <span className="text-[10px] text-cyan-700 font-sans font-normal">BCM</span>
                              </td>
                              <td className="p-2.5 px-3 text-right font-mono font-black text-[#1A1612] whitespace-nowrap">
                                <span className={item.remainingVolume > 0 ? "px-2 py-0.5 rounded bg-amber-50 border border-amber-300/80 inline-block" : ""}>
                                  {(item.remainingVolume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} <span className="text-[10px] text-amber-800 font-sans font-bold">BCM</span>
                                </span>
                              </td>
                              <td className="p-2.5 px-3 text-right font-mono text-[11px] text-slate-600 whitespace-nowrap">
                                <div>75%: Rp {(item.ob1Rate || 0).toLocaleString("id-ID")}</div>
                                <div className="text-[10px] text-slate-400">25%: Rp {(item.ob2Rate || 0).toLocaleString("id-ID")}</div>
                              </td>
                              <td className="p-2.5 px-3 text-right font-mono font-black text-emerald-800 whitespace-nowrap">
                                {formatIDR(estAmount)}
                              </td>
                              <td className="p-2.5 px-3 text-center whitespace-nowrap">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider border whitespace-nowrap ${
                                  isSettled
                                    ? "bg-slate-100 text-slate-700 border-slate-300"
                                    : isPartially
                                    ? "bg-amber-100 text-amber-900 border-amber-300"
                                    : "bg-emerald-50 text-emerald-800 border-emerald-300"
                                }`}>
                                  {item.status || (isSettled ? "Settled" : "Active")}
                                </span>
                              </td>
                              <td className="p-2.5 px-3 text-center whitespace-nowrap">
                                <div className="inline-flex items-center justify-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowPendingVolumeDrawer(false);
                                      if (typeof openEditModal === "function") openEditModal("pending_volume", item);
                                    }}
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md text-[11px] transition cursor-pointer"
                                    title="Edit Catatan Pending Volume"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (typeof handleDelete === "function") handleDelete("pending_volume", item.id);
                                    }}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-md text-[11px] transition cursor-pointer"
                                    title="Hapus Catatan Pending Volume"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                  {!isSettled && (
                                    <button
                                      type="button"
                                      onClick={() => openAllocationModal(item)}
                                      className="p-1.5 bg-[#A57C50] hover:bg-[#8C6740] text-white font-bold rounded-md text-[11px] transition shadow-2xs cursor-pointer flex items-center justify-center"
                                      title="Alokasikan ke Invoice"
                                    >
                                      <Send size={13} />
                                    </button>
                                  )}
                                </div>
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
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
                <div className="font-extrabold uppercase tracking-wider text-slate-700 text-[10px] flex items-center gap-1.5">
                  <CheckCircle size={13} className="text-emerald-700" /> Log Alokasi & Riwayat Pencairan Carry-Forward:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 font-mono text-[11px]">
                  <div className="p-2.5 bg-slate-50/70 rounded-lg border border-slate-200 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">Invoice #088/BGG-AAP/II/2026</span>
                      <strong className="text-slate-800">Menyerap Pending Nov & Des 25</strong>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full">Dicairkan</span>
                  </div>
                  <div className="p-2.5 bg-slate-50/70 rounded-lg border border-slate-200 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">Invoice #089/BGG-AAP/IV/2026</span>
                      <strong className="text-slate-800">Menyerap Pending Des 25 & Jan 26</strong>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full">Dicairkan</span>
                  </div>
                  <div className="p-2.5 bg-slate-50/70 rounded-lg border border-slate-200 flex justify-between items-center">
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
            <div className="p-3.5 bg-white border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPendingVolumeDrawer(false)}
                className="px-5 py-2 bg-[#1A1612] hover:bg-black text-white font-bold rounded-lg transition text-xs shadow-xs cursor-pointer"
              >
                Tutup Kartu Kontrol
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= SUB-MODAL ALOKASI KE INVOICE ================= */}
      {allocatingItem && (
        <div
          onClick={() => setAllocatingItem(null)}
          className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[4px] shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="p-4 bg-[#1A1612] text-white flex items-center justify-between border-b border-amber-900/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[3px] bg-[#A57C50]/20 border border-[#A57C50]/40 flex items-center justify-center text-[#A57C50]">
                  <Send size={15} />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">Alokasikan Saldo Pending ke Invoice</h4>
                  <p className="text-[11px] text-amber-100/70">Klien: {allocatingItem.customerCode} | Periode Asal: {allocatingItem.sourcePeriod}</p>
                </div>
              </div>
              <button onClick={() => setAllocatingItem(null)} className="w-7 h-7 rounded-[3px] bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleExecuteAllocation} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-[4px] space-y-1">
                <div className="flex justify-between text-slate-700">
                  <span className="font-medium">Sisa Saldo Tersedia:</span>
                  <strong className="font-mono text-[#1A1612]">{allocatingItem.remainingVolume?.toLocaleString("id-ID", { minimumFractionDigits: 2 })} BCM</strong>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span className="font-medium">Referensi BA Asal:</span>
                  <span className="font-mono font-bold text-slate-800">{allocatingItem.sourceBARef || "-"}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-[#1A1612] mb-1">
                  Nomor Invoice Tujuan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 091/BGG-AAP/VII/2026"
                  className="w-full bg-slate-50 border border-slate-300 font-mono font-bold text-xs p-2.5 rounded-[3px] outline-none focus:border-[#A57C50] focus:bg-white transition"
                  value={allocTargetInvoice}
                  onChange={(e) => setAllocTargetInvoice(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-[#1A1612] mb-1">
                  Volume yang Dialokasikan (BCM) <span className="text-rose-500">*</span>
                </label>
                <FormattedNumberInput
                  allowDecimals
                  maxDecimals={2}
                  className="w-full bg-slate-50 border border-slate-300 font-mono font-bold text-xs p-2.5 rounded-[3px] outline-none focus:border-[#A57C50] focus:bg-white transition"
                  value={allocVolume}
                  onChange={(val) => setAllocVolume(val)}
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Maksimal alokasi: {allocatingItem.remainingVolume?.toLocaleString("id-ID")} BCM</span>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-[#1A1612] mb-1">
                  Catatan / Alasan Alokasi <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Alokasi pencairan kuota surplus periode Juli 2026"
                  className="w-full bg-slate-50 border border-slate-300 text-xs p-2.5 rounded-[3px] outline-none focus:border-[#A57C50] focus:bg-white transition"
                  value={allocNote}
                  onChange={(e) => setAllocNote(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAllocatingItem(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-[3px] transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingAlloc}
                  className="px-5 py-2 bg-[#A57C50] hover:bg-[#8e6941] text-white font-extrabold rounded-[3px] shadow-2xs disabled:opacity-50 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Check size={14} /> {submittingAlloc ? "Memproses..." : "Konfirmasi Alokasi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

