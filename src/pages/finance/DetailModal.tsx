import { useEffect, useState, useMemo, useCallback, Fragment } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Edit2, FileSpreadsheet, FileText, Filter, Plus, Trash2, X, DollarSign, Calendar, Info, Layers, UserCheck, ShieldAlert, ShieldCheck, ArrowUpRight, CheckCircle, BarChart3, Eye, User, FileCheck, History, Upload, FileCode, ExternalLink, Calculator, Pickaxe, RefreshCw, Printer, ChevronDown, ChevronRight, Receipt, Lock, Unlock, ArrowRight, Building2, Sparkles, Check, Send, Zap, TrendingUp, TrendingDown, Archive, Scale } from "lucide-react";
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

export function DetailModal({ c }: { c: any }) {
  const {
    isSuper, isFinanceSpecialist, isSPV, isManager, isDirector, invoiceRows: rawInvoiceRows, paymentRows: rawPaymentRows, baRows: rawBaRows,
    detailViewItem, setDetailViewItem, showAddPartialPayment, setShowAddPartialPayment, partialPaymentForm,
    setPartialPaymentForm, rfIndexCalculated, invLineItems, formData, buildInvoiceItemsFromBA, customerContractMap, getItemEffectiveVolume,
    getItemEffectiveOverhaulMtr, calculateItemRateAndAmount, getCustomerCalculations, subtotalA, subtotalB,
    subtotalC, subtotalD, subtotalE, subtotalF, exportPaymentDetailPDF, exportBADocumentPDF,
    handleSavePartialPayment, handleVerifyPartialPayment, createInvoiceFromBA, handleVerifyBA, handleApproveBA,
    handleVerifyInvoice, handleApproveInvoice, handleApproveInvoiceTier1, handleApproveInvoiceTier2, openEditModal, user
  } = (c || {}) as Record<string, any>;
  const invoiceRows: any[] = Array.isArray(rawInvoiceRows) ? rawInvoiceRows : [];
  const paymentRows: any[] = Array.isArray(rawPaymentRows) ? rawPaymentRows : [];
  const baRows: any[] = Array.isArray(rawBaRows) ? rawBaRows : [];

  if (!detailViewItem || !detailViewItem.data) return null;

  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-2 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 w-full max-w-[96vw] 2xl:max-w-[1550px] shadow-2xl space-y-4 max-h-[94vh] overflow-y-auto transition-all">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-3">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200">
                  <FileText size={13} /> Detail View & Audit Log Tracking
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  {detailViewItem.type === "ba" ? `Berita Acara: ${detailViewItem.data.baNumber}` : detailViewItem.type === "invoice" ? `Invoice Master: ${detailViewItem.data.invoiceNo}` : detailViewItem.type === "payment" ? `Payment Log: ${detailViewItem.data.invoiceNo}` : `Customer: ${detailViewItem.data.fullName}`}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const itemToEdit = detailViewItem.data;
                    const typeToEdit = detailViewItem.type;
                    setDetailViewItem(null);
                    if (typeof openEditModal === "function") {
                      openEditModal(typeToEdit, itemToEdit);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Buka Form Modal Edit untuk Mengubah Data"
                >
                  <Edit2 size={13} />
                  <span>Edit Data</span>
                </button>
                <button className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition" onClick={() => setDetailViewItem(null)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* 2-COLUMN LAYOUT: 8 cols Left (Tables/Data) + 4 cols Right (Summaries/Timeline/Audit) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* LEFT COLUMN: 8 cols */}
              <div className="lg:col-span-8 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-200 pb-4 lg:pb-0 lg:pr-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Rincian Dokumen & Nilai Transaksi</h4>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      ID: #{detailViewItem.data.id}
                    </span>
                  </div>
                  {detailViewItem.type === "invoice" && (
                    <button
                      onClick={() => exportPaymentDetailPDF(detailViewItem.data)}
                      className="px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs transition flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <FileText size={13} /> Cetak / Simpan PDF
                    </button>
                  )}
                  {detailViewItem.type === "ba" && (
                    <button
                      onClick={() => exportBADocumentPDF(detailViewItem.data)}
                      className="px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs transition flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <FileText size={13} /> Cetak Dokumen BA (PDF)
                    </button>
                  )}
                </div>

                {/* BA Detail Summary */}
                {detailViewItem.type === "ba" && (
                  <div className="space-y-4">
                    {/* Quick 1-Click Invoice Callout if Ready */}
                    {/* Quick 1-Click Invoice Callout if Ready or Linked */}
                    {(() => {
                      const baInvStatus = getBAInvoiceStatus(detailViewItem.data, invoiceRows);
                      const linkedNo = (detailViewItem.data.invoiceNoLinked || "").trim();
                      const isLinked = Boolean(linkedNo && linkedNo !== "-") || baInvStatus.isFullyInvoiced;

                      if (isLinked) {
                        const displayInvNo = linkedNo || baInvStatus.createdInvoices[0]?.invoiceNo || "Terbit";
                        return (
                          <div className="bg-purple-50 border border-purple-300 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                            <div className="flex items-center gap-2.5">
                              <Archive size={16} className="text-purple-700 shrink-0" />
                              <span className="text-xs font-black text-purple-950">
                                Arsip: Telah Terbit Invoice #{displayInvNo}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const targetInv = baInvStatus.createdInvoices[0] || invoiceRows.find((inv: any) => inv.invoiceNo === displayInvNo || inv.baNoReference === detailViewItem.data.baNumber || inv.baID === detailViewItem.data.id);
                                if (targetInv) {
                                  setDetailViewItem({ type: "invoice", data: targetInv });
                                } else {
                                  alert(`Invoice #${displayInvNo} telah resmi diterbitkan.`);
                                }
                              }}
                              className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
                            >
                              <ExternalLink size={12} />
                              <span>Lihat Invoice</span>
                            </button>
                          </div>
                        );
                      }

                      if ((detailViewItem.data.statusBA === "Ready to Invoice" || Boolean(detailViewItem.data.verifiedBy))) {
                        return (
                          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                            <div className="flex items-center gap-2.5">
                              <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
                              <span className="text-xs font-black text-emerald-950">
                                BA Terverifikasi — Siap Diterbitkan Invoice
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => createInvoiceFromBA(detailViewItem.data)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
                            >
                              <Zap size={13} className="fill-amber-300 text-amber-300" />
                              <span>+ Terbitkan Invoice</span>
                            </button>
                          </div>
                        );
                      }

                      return null;
                    })()}

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs text-slate-800">
                      <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
                        <div><span className="text-slate-500 block font-bold">No. BA:</span> <strong className="text-sm font-mono text-cyan-800">{detailViewItem.data.baNumber}</strong></div>
                        <div><span className="text-slate-500 block font-bold">Customer Code:</span> <strong className="text-sm text-slate-900">{detailViewItem.data.customerCode}</strong></div>
                        <div><span className="text-slate-500 block font-bold">Periode Pekerjaan:</span> <strong className="text-slate-800">{detailViewItem.data.workPeriod || "-"}</strong></div>
                        <div><span className="text-slate-500 block font-bold">PIC AAP:</span> <strong className="text-slate-800">{detailViewItem.data.picAAP || "-"}</strong></div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-3 border-b border-slate-200 text-[11px]">
                        <div><span className="text-slate-500 block font-bold">Tgl Routing Internal:</span> <strong>{detailViewItem.data.internalRoutingDate ? new Date(detailViewItem.data.internalRoutingDate).toLocaleDateString("id-ID") : "-"}</strong></div>
                        <div><span className="text-slate-500 block font-bold">Tgl BA Diajukan:</span> <strong>{detailViewItem.data.baSubmittedDate ? new Date(detailViewItem.data.baSubmittedDate).toLocaleDateString("id-ID") : "-"}</strong></div>
                        <div><span className="text-slate-500 block font-bold">Tgl BA Dikirim:</span> <strong>{detailViewItem.data.baSentDate ? new Date(detailViewItem.data.baSentDate).toLocaleDateString("id-ID") : "-"}</strong></div>
                        <div><span className="text-slate-500 block font-bold">Tgl TTD BA:</span> <strong>{detailViewItem.data.baSignedDate ? new Date(detailViewItem.data.baSignedDate).toLocaleDateString("id-ID") : "-"}</strong></div>
                      </div>
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <span className="text-xs text-emerald-800 font-bold block uppercase tracking-wider">Nominal Pekerjaan (Nilai Klaim BA)</span>
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-xl font-black text-emerald-900 font-mono">{formatIDR(detailViewItem.data.workAmount || 0)}</span>
                          {detailViewItem.data.initialWorkAmount && detailViewItem.data.adjustedWorkAmount && detailViewItem.data.initialWorkAmount !== detailViewItem.data.adjustedWorkAmount && (() => {
                            const diffVal = detailViewItem.data.adjustedWorkAmount - detailViewItem.data.initialWorkAmount;
                            const devPct = detailViewItem.data.initialWorkAmount > 0 ? (Math.abs(diffVal) / detailViewItem.data.initialWorkAmount) * 100 : 0;
                            return (
                              <span className={`text-xs font-mono font-bold ${diffVal >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                                ({diffVal >= 0 ? `+${formatIDR(diffVal)}` : `-${formatIDR(Math.abs(diffVal))}`} Survey {devPct > 3.0 ? `| ⚠️ Deviasi ${devPct.toFixed(1)}%` : ""})
                              </span>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pb-2">
                        <div><span className="text-slate-500 block font-bold">Lead Time Approval:</span> <strong className="text-amber-700 font-extrabold text-sm">{detailViewItem.data.leadTimeDays || 0} Hari</strong></div>
                        <div><span className="text-slate-500 block font-bold mb-1">Status BA:</span> {renderBAStatusBadge(detailViewItem.data.statusBA, detailViewItem.data.invoiceNoLinked, undefined, detailViewItem.data, invoiceRows)}</div>
                      </div>
                      <div>
                        <span className="text-slate-500 block font-bold">Bottleneck & Notes:</span>
                        <p className="text-amber-800 font-bold mt-0.5">{detailViewItem.data.notesBottleneck}</p>
                        <p className="text-slate-600 text-xs mt-0.5">{detailViewItem.data.notes}</p>
                      </div>
                    </div>

                    {/* PDF PREVIEW CONTAINER SECTION */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h5 className="text-xs font-black uppercase text-cyan-800 tracking-wider flex items-center gap-1.5">
                          <FileText size={15} /> Pratinjau Dokumen PDF (Draft & Final BA)
                        </h5>
                      </div>

                      {/* Draft BA Preview Card */}
                      <div className="p-3 bg-slate-900 text-white rounded-xl space-y-2.5 shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                            <Upload size={14} /> Draft BA PDF Document
                          </span>
                          {detailViewItem.data.draftBAPath ? (
                            <a
                              href={resolveDocumentUrl(detailViewItem.data.draftBAPath)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] px-2.5 py-1 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white font-bold inline-flex items-center gap-1 transition shadow-xs"
                            >
                              <ExternalLink size={12} /> Buka PDF Tab Baru
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Belum Diunggah</span>
                          )}
                        </div>
                        {detailViewItem.data.draftBAPath ? (
                          <div className="p-3.5 bg-slate-800/90 rounded-lg border border-slate-700 flex items-center gap-3">
                            <div className="p-2.5 bg-cyan-950 border border-cyan-700/50 rounded-lg text-cyan-400 shrink-0">
                              <FileText size={22} />
                            </div>
                            <div className="min-w-0 flex-1 text-xs">
                              <span className="font-mono font-bold text-slate-200 block truncate">
                                {detailViewItem.data.draftBARefNo ? `Draft-${detailViewItem.data.draftBARefNo.replace(/\//g, '_')}.pdf` : detailViewItem.data.draftBAPath.split('/').pop() || "draft_berita_acara.pdf"}
                              </span>
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                                <span>Site: <strong className="text-cyan-300">{detailViewItem.data.customerCode || "POS"}</strong></span>
                                <span>•</span>
                                <span>Routing: <strong className="text-slate-300">{detailViewItem.data.internalRoutingDate || "Tercatat"}</strong></span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 text-center text-xs text-slate-400 bg-slate-800/50 rounded-lg border border-dashed border-slate-700">
                            Draft BA PDF belum diunggah saat entri baru.
                          </div>
                        )}
                      </div>

                      {/* Final BA Preview Card */}
                      <div className="p-3 bg-slate-900 text-white rounded-xl space-y-2.5 shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle size={14} /> Final Signed BA PDF Document
                          </span>
                          {detailViewItem.data.finalBAPath ? (
                            <a
                              href={resolveDocumentUrl(detailViewItem.data.finalBAPath)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold inline-flex items-center gap-1 transition shadow-xs"
                            >
                              <ExternalLink size={12} /> Buka PDF Tab Baru
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Belum Diunggah (Edit untuk upload)</span>
                          )}
                        </div>
                        {detailViewItem.data.finalBAPath ? (
                          <div className="p-3.5 bg-slate-800/90 rounded-lg border border-slate-700 flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-950 border border-emerald-700/50 rounded-lg text-emerald-400 shrink-0">
                              <CheckCircle size={22} />
                            </div>
                            <div className="min-w-0 flex-1 text-xs">
                              <span className="font-mono font-bold text-emerald-200 block truncate">
                                {detailViewItem.data.signedBANumber ? `Signed-${detailViewItem.data.signedBANumber.replace(/\//g, '_')}.pdf` : detailViewItem.data.baNumber ? `BA-${detailViewItem.data.baNumber.replace(/\//g, '_')}.pdf` : detailViewItem.data.finalBAPath.split('/').pop() || "signed_berita_acara.pdf"}
                              </span>
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                                <span>TTD: <strong className="text-emerald-300">{detailViewItem.data.baSignedDate || "Selesai"}</strong></span>
                                <span>•</span>
                                <span className="text-emerald-400 font-bold">Terverifikasi & Sah ✓</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 text-center text-xs text-slate-400 bg-slate-800/50 rounded-lg border border-dashed border-slate-700">
                            Final BA Signed PDF dapat diunggah saat mengedit status BA ke Approved.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Invoice Detail Summary — Official INVOICE Document Sheet (Dynamic Layout per Customer) */}
                {detailViewItem.type === "invoice" && (() => {
                  const viewCustCode = (detailViewItem.data.customerCode || "").toUpperCase();
                  const targetBA = baRows?.find((b: any) => b.baNumber === detailViewItem.data.baNoReference || b.baNumber === detailViewItem.data.baNumber || b.id === detailViewItem.data.baID);
                  const rawItems = (detailViewItem.data.items && Array.isArray(detailViewItem.data.items) && detailViewItem.data.items.length > 0)
                    ? detailViewItem.data.items
                    : (detailViewItem.data.lineItems && Array.isArray(detailViewItem.data.lineItems) && detailViewItem.data.lineItems.length > 0)
                      ? detailViewItem.data.lineItems
                      : null;
                  let activeItems = rawItems
                    ? rawItems
                    : (invLineItems && invLineItems.length > 0 && formData?.invoiceNo === detailViewItem.data.invoiceNo
                        ? invLineItems
                        : (typeof buildInvoiceItemsFromBA === "function"
                            ? buildInvoiceItemsFromBA(targetBA || detailViewItem.data, viewCustCode, detailViewItem.data.invoiceCategory)
                            : (detailViewItem.data.items || detailViewItem.data.lineItems || []))
                      );

                  if ((!activeItems || activeItems.length === 0 || activeItems.every((i: any) => !(i.volume > 0 || i.amount > 0 || i.unitRateIDR > 0))) && typeof buildInvoiceItemsFromBA === "function") {
                    activeItems = buildInvoiceItemsFromBA(detailViewItem.data, viewCustCode, detailViewItem.data.invoiceCategory);
                  }

                  let cCalc = getCustomerCalculations(activeItems, viewCustCode);

                  // Failsafe: Ensure cCalc displays correct financial totals if activeItems sum is 0
                  if (cCalc.totalGross === 0 && (detailViewItem.data.revenueGross > 0 || detailViewItem.data.subTotalDPP > 0 || detailViewItem.data.totalInvoice > 0)) {
                    const gross = Number(detailViewItem.data.revenueGross || detailViewItem.data.subTotalDPP || 0);
                    const dpp = Number(detailViewItem.data.subTotalDPP || Math.round(gross * 11 / 12));
                    const vat = Number(detailViewItem.data.ppn11 || Math.round(dpp * 0.12));
                    const pph = Number(detailViewItem.data.pph23 || Math.round(gross * 0.02));
                    const totInv = Number(detailViewItem.data.totalInvoice || (gross + vat - pph));
                    const totPay = Number(detailViewItem.data.totalReceipt || detailViewItem.data.outstanding || totInv);
                    cCalc = {
                      ...cCalc,
                      totalGross: gross,
                      subtotalA: gross,
                      dpp11_12: dpp,
                      vat12: vat,
                      pph23: pph,
                      totalInvoice: totInv,
                      totalDibayar: totPay,
                    };
                  }

                  const cInfo = customerContractMap[viewCustCode];
                  const isMDO = detailViewItem.data.invoiceCategory === "MDO" || (detailViewItem.data.activityGroup || "").includes("MDO") || (detailViewItem.data.invoiceNo || "").includes("MDO");
                  const formattedDate = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });

                  return (
                    <div className="p-4 sm:p-6 bg-white border-2 border-slate-900 rounded-none space-y-4 shadow-xs text-xs text-slate-900">
                      {/* Official ANDALAN Logo Header */}
                      <div className="text-center pb-2 border-b-2 border-slate-900">
                        <img src="/andalan-logo.png" alt="ANDALAN Logo" className="h-10 w-auto object-contain mx-auto" />
                      </div>

                      {/* Header Info Block */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-slate-300 text-[11px]">
                        <div className="space-y-1">
                          <div className="flex">
                            <span className="w-24 font-bold text-slate-500">Company</span>
                            <span className="font-extrabold text-slate-900">
                              : {viewCustCode === "POS" ? "PT. POSITION" : viewCustCode === "BGG" ? "PT. BUDI GEMA GEMPITA" : viewCustCode === "DBK" ? "PT. PETROSEA TBK" : viewCustCode === "SBS" ? "PT SATRIA BAHANA SARANA" : (detailViewItem.data.customerCode || "—")}
                            </span>
                          </div>
                          <div className="flex">
                            <span className="w-24 font-bold text-slate-500">Contractor</span>
                            <span className="font-extrabold text-slate-900">: PT. ANDALAN ARTHA PRIMANUSA</span>
                          </div>
                          <div className="flex">
                            <span className="w-24 font-bold text-slate-500">Project</span>
                            <span className="font-extrabold text-slate-900">: {detailViewItem.data.projectSite || cInfo?.project || "MINING PROJECT"}</span>
                          </div>
                          <div className="flex">
                            <span className="w-24 font-bold text-slate-500">Period Covered</span>
                            <span className="font-extrabold text-slate-900">: {detailViewItem.data.workPeriod || "Juni 2026"}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex">
                            <span className="w-32 font-bold text-slate-500">Invoice No.</span>
                            <span className="font-extrabold text-slate-900 font-mono">: {detailViewItem.data.invoiceNo}</span>
                          </div>
                          <div className="flex">
                            <span className="w-32 font-bold text-slate-500">PO Number</span>
                            <span className="font-extrabold text-slate-900">: {detailViewItem.data.noPO || detailViewItem.data.poNumber || (viewCustCode === "SBS" ? "I05790/0002" : viewCustCode === "POS" ? "PO-POS/2026/001" : "-")}</span>
                          </div>
                          <div className="flex">
                            <span className="w-32 font-bold text-slate-500">Activity Group</span>
                            <span className="font-extrabold text-slate-900">: {detailViewItem.data.activityGroup || (viewCustCode === "SBS" ? "OB REMOVAL + HEAVY EQUIPMENT RENTAL" : "MINING OPERATIONS")}</span>
                          </div>
                        </div>
                      </div>

                      {/* Title */}
                      <div className="text-center py-1">
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 underline">INVOICE</h3>
                        <p className="text-[11px] text-slate-600 font-semibold mt-0.5">(NO KONTRAK : {detailViewItem.data.contractNo || cInfo?.contract || "SPPH-05852"})</p>
                      </div>

                      {/* MAIN INVOICE TABLE — DYNAMIC PER CUSTOMER */}
                      {viewCustCode === "SBS" ? (
                        <div className="space-y-3">
                          {/* TABEL UTAMA INVOICE PEKERJAAN (NILAI JKP) */}
                          <div className="rounded-none border border-slate-900 bg-white overflow-hidden">
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                  <tr className="bg-slate-100 text-slate-900 font-extrabold text-[11px] uppercase border-b border-slate-900">
                                    <th className="p-2.5 border-r border-slate-300">DESCRIPTION</th>
                                    <th className="p-2.5 text-center w-28 border-r border-slate-300">JARAK (M)</th>
                                    <th className="p-2.5 text-center w-36 border-r border-slate-300">CLAIMED UNIT</th>
                                    <th className="p-2.5 text-right w-36 border-r border-slate-300">UNIT RATE (IDR)</th>
                                    <th className="p-2.5 text-right w-44 font-extrabold">AMOUNT (IDR)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 text-[11px] font-medium text-slate-900">
                                  {/* Seksi A: OB Removal */}
                                  <tr className="bg-slate-100/80 font-extrabold text-slate-900 border-t border-b border-slate-300">
                                    <td className="p-2 underline font-extrabold border-r border-slate-200">OB REMOVAL (Per Area Kerja)</td>
                                    <td className="p-2 text-center text-slate-400 font-mono border-r border-slate-200">-</td>
                                    <td className="p-2 text-center font-mono text-slate-900 font-black border-r border-slate-200">
                                      {activeItems.filter((i: any) => i.section === "A").reduce((s: number, i: any) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} BCM
                                    </td>
                                    <td className="p-2 text-right border-r border-slate-200"></td>
                                    <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalA)}</td>
                                  </tr>
                                  {activeItems.filter((i: any) => i.section === "A").map((i: any) => {
                                    const dist = i.distanceM ?? i.overhaulMtr;
                                    const unitRate = i.unitRateIDR || (i.volume > 0 ? Math.round((i.amount || 0) / i.volume) : 0);
                                    const amount = i.amount !== undefined && i.amount !== null && i.amount !== 0 ? i.amount : Math.round((i.volume || 0) * unitRate);
                                    return (
                                      <tr key={i.id} className="hover:bg-slate-50/80 border-b border-slate-200">
                                        <td className="p-2 pl-4 font-bold text-slate-800 border-r border-slate-200">{i.description}</td>
                                        <td className="p-2 text-center font-mono font-bold text-slate-700 border-r border-slate-200">
                                          {dist ? `${Number(dist).toLocaleString("id-ID")} m` : "-"}
                                        </td>
                                        <td className="p-2 text-center font-mono font-bold text-slate-800 border-r border-slate-200">
                                          {(i.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} {i.unit || "BCM"}
                                        </td>
                                        <td className="p-2 text-right font-mono text-slate-700 border-r border-slate-200">
                                          {unitRate.toLocaleString("id-ID")}
                                        </td>
                                        <td className="p-2 text-right font-mono font-extrabold text-slate-900">
                                          {formatIDR(amount)}
                                        </td>
                                      </tr>
                                    );
                                  })}

                                  {/* Seksi B: Jasa Penunjang Produksi */}
                                  <tr className="bg-slate-100/80 font-extrabold text-slate-900 border-t border-b border-slate-300">
                                    <td className="p-2 underline font-extrabold border-r border-slate-200">JASA PENUNJANG PRODUKSI (Rental Alat)</td>
                                    <td className="p-2 text-center text-slate-400 font-mono border-r border-slate-200">-</td>
                                    <td className="p-2 text-center font-mono text-slate-900 font-black border-r border-slate-200">
                                      {activeItems.filter((i: any) => i.section === "B").reduce((s: number, i: any) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} Hours
                                    </td>
                                    <td className="p-2 text-right border-r border-slate-200"></td>
                                    <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalB)}</td>
                                  </tr>
                                  {activeItems.filter((i: any) => i.section === "B").map((i: any) => {
                                    const unitRate = i.unitRateIDR || (i.volume > 0 ? Math.round((i.amount || 0) / i.volume) : 0);
                                    const amount = i.amount !== undefined && i.amount !== null && i.amount !== 0 ? i.amount : Math.round((i.volume || 0) * unitRate);
                                    return (
                                      <tr key={i.id} className="hover:bg-slate-50/80 border-b border-slate-200">
                                        <td className="p-2 pl-4 font-bold text-slate-800 border-r border-slate-200">{i.description}</td>
                                        <td className="p-2 text-center text-slate-400 font-mono border-r border-slate-200">-</td>
                                        <td className="p-2 text-center font-mono font-bold text-slate-800 border-r border-slate-200">
                                          {(i.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} {i.unit || "Hours"}
                                        </td>
                                        <td className="p-2 text-right font-mono text-slate-700 border-r border-slate-200">
                                          {unitRate.toLocaleString("id-ID")}
                                        </td>
                                        <td className="p-2 text-right font-mono font-extrabold text-slate-900">
                                          {formatIDR(amount)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>

                                {/* Footer Tabel Utama: Kalkulasi Pajak Bruto */}
                                <tfoot className="border-t-2 border-slate-900 bg-slate-50 font-bold text-xs">
                                  <tr className="border-b border-slate-200">
                                    <td colSpan={3} className="p-2.5 text-right font-black uppercase text-slate-700 border-r border-slate-200">TOTAL (NILAI PEKERJAAN BRUTO):</td>
                                    <td colSpan={2} className="p-2.5 text-right font-mono text-sm font-black text-slate-900">{formatIDR(cCalc.totalGross)}</td>
                                  </tr>
                                  <tr className="border-b border-slate-200">
                                    <td colSpan={3} className="p-2.5 text-right uppercase text-slate-600 font-bold border-r border-slate-200">DPP PPN 11/12:</td>
                                    <td colSpan={2} className="p-2.5 text-right font-mono font-bold text-slate-800">{formatIDR(cCalc.dpp11_12)}</td>
                                  </tr>
                                  <tr className="border-b border-slate-200">
                                    <td colSpan={3} className="p-2.5 text-right uppercase text-slate-800 font-bold border-r border-slate-200">VAT ( 12% ) (+):</td>
                                    <td colSpan={2} className="p-2.5 text-right font-mono font-bold text-slate-900">{formatIDR(cCalc.vat12)}</td>
                                  </tr>
                                  <tr className="border-b border-slate-200">
                                    <td colSpan={3} className="p-2.5 text-right uppercase text-slate-800 font-bold border-r border-slate-200">WITH HOLDING TAX ART 23 (2%) (-):</td>
                                    <td colSpan={2} className="p-2.5 text-right font-mono font-bold text-slate-900">({formatIDR(cCalc.pph23)})</td>
                                  </tr>
                                  <tr className="bg-slate-100 text-slate-950 font-black text-xs sm:text-sm border-t-2 border-b-2 border-slate-900">
                                    <td colSpan={3} className="p-3 text-right uppercase tracking-wider text-slate-950 font-black border-r border-slate-300">TOTAL INVOICE:</td>
                                    <td colSpan={2} className="p-3 text-right font-mono text-base font-black text-slate-950 underline">{formatIDR(cCalc.totalInvoice)}</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>

                          {/* TABEL KHUSUS PENGURANG PEMBAYARAN */}
                          <div className="rounded-none border border-slate-900 bg-white overflow-hidden">
                            <div className="bg-slate-100 border-b border-slate-900 px-3 py-2 flex items-center justify-between">
                              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                                BLOK 2: TABEL KHUSUS PENGURANG PEMBAYARAN (DENDA & BBM)
                              </h4>
                              <span className="text-[10px] text-slate-500 font-medium">
                                Sesuai SPPH-05852
                              </span>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 text-slate-900 font-extrabold text-[11px] uppercase border-b border-slate-300">
                                    <th className="p-2 border-r border-slate-200">PENGURANG PEMBAYARAN</th>
                                    <th className="p-2 text-center w-36 border-r border-slate-200">CLAIMED UNIT</th>
                                    <th className="p-2 text-right w-36 border-r border-slate-200">UNIT RATE (IDR)</th>
                                    <th className="p-2 text-right w-44 font-extrabold">AMOUNT (IDR)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 text-[11px] font-medium text-slate-900">
                                  {activeItems.filter((i: any) => i.section === "P").map((p: any) => (
                                    <tr key={p.id} className="hover:bg-slate-50/70 border-b border-slate-200">
                                      <td className="p-2 pl-4 font-semibold text-slate-800 border-r border-slate-200">{p.description}</td>
                                      <td className="p-2 text-center font-bold text-slate-600 border-r border-slate-200">{p.unit || "-"}</td>
                                      <td className="p-2 text-right font-mono text-slate-400 border-r border-slate-200">-</td>
                                      <td className="p-2 text-right font-mono font-bold text-slate-900">
                                        {p.amount ? `(${formatIDR(Math.abs(p.amount))})` : "-"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot className="border-t-2 border-slate-900 bg-slate-50 font-bold text-xs">
                                  <tr>
                                    <td colSpan={3} className="p-2.5 text-right font-black uppercase text-slate-800 border-r border-slate-200">TOTAL PENGURANG PEMBAYARAN:</td>
                                    <td className="p-2.5 text-right font-mono text-sm font-black text-slate-900">({formatIDR(Math.abs(cCalc.subtotalP))})</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>

                          {/* TOTAL DIBAYAR (SETTLEMENT BERSIH) */}
                          <div className="rounded-none border-2 border-slate-900 bg-slate-50 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-900">
                            <div>
                              <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                                BLOK 3: TOTAL DIBAYAR (KAS BERSIH DITERIMA)
                              </h4>
                              <p className="text-[10px] text-slate-600 mt-0.5">
                                TOTAL INVOICE ({formatIDR(cCalc.totalInvoice)}) - PENGURANG PEMBAYARAN ({formatIDR(Math.abs(cCalc.subtotalP))})
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="font-mono text-lg font-black text-slate-950">{formatIDR(cCalc.totalDibayar)}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-none border border-slate-900">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-100/90 text-slate-900 font-extrabold text-[11px] uppercase border-b border-slate-300">
                              <th className="p-2.5 border-r border-slate-300">DESCRIPTION</th>
                              <th className="p-2.5 text-center border-r border-slate-300">CLAIMED VOLUME</th>
                              <th className="p-2.5 text-center border-r border-slate-300">UoM</th>
                              {viewCustCode === "DBK" ? (
                                <>
                                  <th className="p-2.5 text-right border-r border-slate-300">UNIT RATE (USD)</th>
                                  <th className="p-2.5 text-right border-r border-slate-300">KURS (USD to IDR)</th>
                                </>
                              ) : (
                                <th className="p-2.5 text-right border-r border-slate-300">UNIT RATE (IDR)</th>
                              )}
                              <th className="p-2.5 text-right font-extrabold">AMOUNT (IDR)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 text-[11px] font-medium text-slate-900">
                            {/* BGG LAYOUT */}
                            {viewCustCode === "BGG" && (
                              <>
                                <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
                                  <td className="p-2 underline border-r border-slate-200">A. OB REMOVAL</td>
                                  <td className="p-2 text-center font-mono border-r border-slate-200 font-black">
                                    {activeItems.filter((i: any) => i.section === "A").reduce((s: number, i: any) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-2 text-center border-r border-slate-200 font-bold">Bcm</td>
                                  <td className="p-2 text-right border-r border-slate-200"></td>
                                  <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalA)}</td>
                                </tr>
                                <tr className="bg-slate-50 font-bold"><td colSpan={5} className="p-1.5 pl-4 text-slate-700">A1. Pit Kungkilan</td></tr>
                                {activeItems.filter((i: any) => i.section === "A").map((i: any) => {
                                  const effVol = getItemEffectiveVolume(i);
                                  const { unitRate, amount } = calculateItemRateAndAmount(i, "BGG");
                                  return (
                                    <tr key={i.id} className="hover:bg-slate-50 border-b border-slate-200">
                                      <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">
                                        {i.description} &nbsp; &nbsp; <span className="text-[10px] text-slate-500 font-normal">{i.period}</span>
                                      </td>
                                      <td className="p-2 text-center font-mono border-r border-slate-200">{effVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
                                      <td className="p-2 text-center border-r border-slate-200">{i.unit || "Bcm"}</td>
                                      <td className="p-2 text-right font-mono border-r border-slate-200">{unitRate.toLocaleString("id-ID")}</td>
                                      <td className="p-2 text-right font-mono font-extrabold">{formatIDR(amount)}</td>
                                    </tr>
                                  );
                                })}

                                <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
                                  <td className="p-2 underline border-r border-slate-200">B. COAL WINNING</td>
                                  <td className="p-2 text-center font-mono border-r border-slate-200 font-black">
                                    {activeItems.filter((i: any) => i.section === "B").reduce((s: number, i: any) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-2 text-center border-r border-slate-200 font-bold">Ton</td>
                                  <td className="p-2 text-right border-r border-slate-200"></td>
                                  <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalB)}</td>
                                </tr>
                                <tr className="bg-slate-50 font-bold"><td colSpan={5} className="p-1.5 pl-4 text-slate-700">B1. Pit Kungkilan</td></tr>
                                {activeItems.filter((i: any) => i.section === "B").map((i: any) => {
                                  const effVol = getItemEffectiveVolume(i);
                                  const { unitRate, amount } = calculateItemRateAndAmount(i, "BGG");
                                  return (
                                    <tr key={i.id} className="hover:bg-slate-50 border-b border-slate-200">
                                      <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">{i.description}</td>
                                      <td className="p-2 text-center font-mono border-r border-slate-200">{effVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
                                      <td className="p-2 text-center border-r border-slate-200">{i.unit || "Ton"}</td>
                                      <td className="p-2 text-right font-mono border-r border-slate-200">{unitRate.toLocaleString("id-ID")}</td>
                                      <td className="p-2 text-right font-mono font-extrabold">{formatIDR(amount)}</td>
                                    </tr>
                                  );
                                })}

                                <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
                                  <td className="p-2 underline border-r border-slate-200">C. OVER DISTANCE</td>
                                  <td className="p-2 border-r border-slate-200"></td>
                                  <td className="p-2 border-r border-slate-200"></td>
                                  <td className="p-2 text-right border-r border-slate-200"></td>
                                  <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalC)}</td>
                                </tr>
                                {activeItems.filter((i: any) => i.section === "C").map((i: any) => {
                                  const effVol = getItemEffectiveVolume(i);
                                  const effMtr = getItemEffectiveOverhaulMtr(i);
                                  const { unitRate, amount } = calculateItemRateAndAmount(i, "BGG");
                                  const diffMtr = effMtr - 1000;
                                  return (
                                    <tr key={i.id} className="hover:bg-slate-50 border-b border-slate-200">
                                      <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">
                                        <div>{i.subSection || i.description}</div>
                                        <div className="text-[10px] text-slate-500 font-mono font-normal">
                                          {effMtr} mtr - 1000 mtr = ({diffMtr > 0 ? `+${diffMtr}` : diffMtr}) mtr &nbsp; &nbsp; {i.period}
                                        </div>
                                      </td>
                                      <td className="p-2 text-center font-mono border-r border-slate-200">{effVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
                                      <td className="p-2 text-center border-r border-slate-200">{i.unit || (i.subSection?.includes("Coal") ? "Ton" : "Bcm")}</td>
                                      <td className="p-2 text-right font-mono border-r border-slate-200">{unitRate.toLocaleString("id-ID")}</td>
                                      <td className="p-2 text-right font-mono font-extrabold">{formatIDR(amount)}</td>
                                    </tr>
                                  );
                                })}

                                <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
                                  <td className="p-2 underline border-r border-slate-200">D. RAISE & FALL'S FACTOR</td>
                                  <td className="p-2 border-r border-slate-200"></td>
                                  <td className="p-2 border-r border-slate-200"></td>
                                  <td className="p-2 text-right border-r border-slate-200"></td>
                                  <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalD)}</td>
                                </tr>
                                {activeItems.filter((i: any) => i.section === "D").map((i: any) => {
                                  const effVol = getItemEffectiveVolume(i);
                                  const { unitRate, amount } = calculateItemRateAndAmount(i, "BGG");
                                  return (
                                    <tr key={i.id} className="hover:bg-slate-50 border-b border-slate-200">
                                      <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">
                                        {i.subSection || ""} {i.description} &nbsp; &nbsp; <span className="text-[10px] text-slate-500 font-normal">{i.period}</span>
                                      </td>
                                      <td className="p-2 text-center font-mono border-r border-slate-200">{effVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
                                      <td className="p-2 text-center border-r border-slate-200">{i.unit || "Bcm"}</td>
                                      <td className="p-2 text-right font-mono border-r border-slate-200">{unitRate.toLocaleString("id-ID")}</td>
                                      <td className="p-2 text-right font-mono font-extrabold">{formatIDR(amount)}</td>
                                    </tr>
                                  );
                                })}

                                <tr className="bg-rose-50/70 font-extrabold text-rose-900 border-t border-b border-rose-200">
                                  <td colSpan={4} className="p-2 underline">E. DISCOUNT ON OVERDISTANCE (Deduction 25%)</td>
                                  <td className="p-2 text-right font-mono font-black text-rose-900">({formatIDR(Math.abs(cCalc.subtotalE))})</td>
                                </tr>
                                {activeItems.filter((i: any) => i.section === "E").map((i: any) => {
                                  const { amount } = calculateItemRateAndAmount(i, "BGG");
                                  return (
                                    <tr key={i.id} className="hover:bg-rose-50/30 border-b border-slate-200">
                                      <td colSpan={4} className="p-2 pl-6 font-medium text-slate-700">{i.description}</td>
                                      <td className="p-2 text-right font-mono font-bold text-rose-800">({formatIDR(Math.abs(amount))})</td>
                                    </tr>
                                  );
                                })}

                                <tr className="bg-rose-50/70 font-extrabold text-rose-900 border-t border-b border-rose-200">
                                  <td colSpan={4} className="p-2 underline">F. DP FUEL & TRANSPORT (Deduction)</td>
                                  <td className="p-2 text-right font-mono font-black text-rose-900">({formatIDR(Math.abs(cCalc.subtotalF))})</td>
                                </tr>
                                {activeItems.filter((i: any) => i.section === "F").map((i: any) => {
                                  const { amount } = calculateItemRateAndAmount(i, "BGG");
                                  return (
                                    <tr key={i.id} className="hover:bg-rose-50/30 border-b border-slate-200">
                                      <td colSpan={4} className="p-2 pl-6 font-medium text-slate-700">{i.description}</td>
                                      <td className="p-2 text-right font-mono font-bold text-rose-800">({formatIDR(Math.abs(amount))})</td>
                                    </tr>
                                  );
                                })}
                              </>
                            )}

                            {/* DBK LAYOUT (Dual Currency USD & IDR) */}
                            {viewCustCode === "DBK" && (
                              <>
                                <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
                                  <td className="p-2 underline border-r border-slate-200">A. OB REMOVAL</td>
                                  <td className="p-2 text-center font-mono border-r border-slate-200 font-black">
                                    {activeItems.filter((i: any) => i.section === "A").reduce((s: number, i: any) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 3 })}
                                  </td>
                                  <td className="p-2 text-center border-r border-slate-200 font-bold">Bcm</td>
                                  <td className="p-2 text-right border-r border-slate-200"></td>
                                  <td className="p-2 text-right border-r border-slate-200"></td>
                                  <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalA)}</td>
                                </tr>
                                <tr className="bg-slate-50 font-bold"><td colSpan={6} className="p-1.5 pl-4 text-slate-700">A1. PIT SAPAN</td></tr>
                                {activeItems.filter((i: any) => i.section === "A").map((i: any) => (
                                  <tr key={i.id} className="hover:bg-slate-50 border-b border-slate-200">
                                    <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">{i.description}</td>
                                    <td className="p-2 text-center font-mono border-r border-slate-200">{(i.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 3 })}</td>
                                    <td className="p-2 text-center border-r border-slate-200">{i.unit || "Bcm"}</td>
                                    <td className="p-2 text-right font-mono border-r border-slate-200">{(i.unitRateUSD || 0).toFixed(3)}</td>
                                    <td className="p-2 text-right font-mono border-r border-slate-200">{(i.kursBI || 17140.76).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
                                    <td className="p-2 text-right font-mono font-extrabold">{formatIDR(Math.round((i.volume || 0) * (i.unitRateUSD || 0) * (i.kursBI || 17140.76)))}</td>
                                  </tr>
                                ))}

                                <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
                                  <td className="p-2 underline border-r border-slate-200">B. COAL WINNING</td>
                                  <td className="p-2 text-center font-mono border-r border-slate-200 font-black">
                                    {activeItems.filter((i: any) => i.section === "B").reduce((s: number, i: any) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 3 })}
                                  </td>
                                  <td className="p-2 text-center border-r border-slate-200 font-bold">Ton</td>
                                  <td className="p-2 text-right border-r border-slate-200"></td>
                                  <td className="p-2 text-right border-r border-slate-200"></td>
                                  <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalB)}</td>
                                </tr>
                                <tr className="bg-slate-50 font-bold"><td colSpan={6} className="p-1.5 pl-4 text-slate-700">B1. PIT SAPAN</td></tr>
                                {activeItems.filter((i: any) => i.section === "B").map((i: any) => (
                                  <tr key={i.id} className="hover:bg-slate-50 border-b border-slate-200">
                                    <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">PIT SAPAN</td>
                                    <td className="p-2 text-center font-mono border-r border-slate-200">{(i.actualVolume || i.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 3 })}</td>
                                    <td className="p-2 text-center border-r border-slate-200">{i.unit || "Ton"}</td>
                                    <td className="p-2 text-right font-mono border-r border-slate-200">{(i.unitRateUSD || 0).toFixed(3)}</td>
                                    <td className="p-2 text-right font-mono border-r border-slate-200">{(i.kursBI || 17140.76).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
                                    <td className="p-2 text-right font-mono font-extrabold">{formatIDR(Math.round((i.volume || 0) * (i.unitRateUSD || 0) * (i.kursBI || 17140.76)))}</td>
                                  </tr>
                                ))}

                                {activeItems.some((i: any) => {
                                  if (i.section !== "C") return false;
                                  const baseM = i.baseMtr || ((i.subSection || i.description || "").toLowerCase().includes("coal") ? 3000 : 1000);
                                  return (i.overhaulMtr ?? baseM) > baseM;
                                }) && (
                                  <>
                                    <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
                                      <td className="p-2 underline border-r border-slate-200">C. OVER DISTANCE</td>
                                      <td className="p-2 border-r border-slate-200"></td>
                                      <td className="p-2 border-r border-slate-200"></td>
                                      <td className="p-2 border-r border-slate-200"></td>
                                      <td className="p-2 border-r border-slate-200"></td>
                                      <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalC)}</td>
                                    </tr>
                                    {activeItems.filter((i: any) => {
                                      if (i.section !== "C") return false;
                                      const baseM = i.baseMtr || ((i.subSection || i.description || "").toLowerCase().includes("coal") ? 3000 : 1000);
                                      return (i.overhaulMtr ?? baseM) > baseM;
                                    }).map((i: any) => {
                                      const baseM = i.baseMtr || ((i.subSection || i.description || "").toLowerCase().includes("coal") ? 3000 : 1000);
                                      const diff = Math.max(0, (i.overhaulMtr || baseM) - baseM);
                                      return (
                                        <tr key={i.id} className="hover:bg-slate-50 border-b border-slate-200">
                                          <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">
                                            <div>{i.subSection}</div>
                                            <div className="text-[10px] text-slate-500 font-mono font-normal">
                                              PIT SAPAN {(i.overhaulMtr || baseM).toLocaleString("id-ID", { minimumFractionDigits: 2 })} mtr - {baseM} mtr = {diff.toFixed(2)} mtr
                                            </div>
                                          </td>
                                          <td className="p-2 text-center font-mono border-r border-slate-200">{i.volume ? i.volume.toLocaleString("id-ID", { minimumFractionDigits: 3 }) : ""}</td>
                                          <td className="p-2 text-center border-r border-slate-200">{i.volume ? (i.unit || "") : ""}</td>
                                          <td className="p-2 border-r border-slate-200"></td>
                                          <td className="p-2 text-right font-mono border-r border-slate-200">{i.unitRateIDR ? i.unitRateIDR.toFixed(2) : ""}</td>
                                          <td className="p-2 text-right font-mono font-extrabold">{i.volume && i.unitRateIDR ? formatIDR(Math.round(i.volume * i.unitRateIDR)) : "-"}</td>
                                        </tr>
                                      );
                                    })}
                                  </>
                                )}
                              </>
                            )}

                            {/* POS DEFAULT LAYOUT */}
                            {viewCustCode === "POS" && (() => {
                              const secAItems = activeItems.filter((i: any) => i.section === "A");
                              const secBItems = activeItems.filter((i: any) => i.section === "B");
                              const secCItems = activeItems.filter((i: any) => i.section === "C");
                              const secDItems = activeItems.filter((i: any) => i.section === "D");

                              return (
                                <>
                                  {secAItems.length > 0 && (
                                    <>
                                      <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
                                        <td className="p-2 underline border-r border-slate-200">
                                          {(detailViewItem.data.jobType || "").toLowerCase().includes("mess") || (detailViewItem.data.jobType || "").toLowerCase().includes("mob") || (detailViewItem.data.invoiceNo || "").toLowerCase().includes("bc-") ? "A. PEKERJAAN FASILITAS / KLAIM PROYEK" : isMDO ? "A. MINE DEVELOPMENT (MDO)" : "A. PRODUCTION"}
                                        </td>
                                        <td className="p-2 text-center font-mono border-r border-slate-200 font-black">
                                          {secAItems.reduce((sum: number, i: any) => sum + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-2 text-center border-r border-slate-200 font-bold">{isMDO ? "" : (secAItems[0]?.unit || "Bcm")}</td>
                                        <td className="p-2 text-right border-r border-slate-200"></td>
                                        <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalA)}</td>
                                      </tr>
                                      {secAItems.map((item: any) => {
                                        const { unitRate, amount } = calculateItemRateAndAmount(item, "POS");
                                        const effUnitRate = unitRate > 0 ? unitRate : Number(item.unitRateIDR || (item.volume > 0 ? Math.round(item.amount / item.volume) : 0));
                                        const effAmount = amount !== 0 ? amount : Number(item.amount || Math.round((item.volume || 0) * effUnitRate));
                                        return (
                                          <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-200">
                                            <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">{item.description}</td>
                                            <td className="p-2 text-center font-mono font-bold border-r border-slate-200">
                                              {(item.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-2 text-center border-r border-slate-200 text-slate-500 font-normal">{item.unit || "Bcm"}</td>
                                            <td className="p-2 text-right font-mono border-r border-slate-200">{effUnitRate.toLocaleString("id-ID")}</td>
                                            <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(effAmount)}</td>
                                          </tr>
                                        );
                                      })}
                                    </>
                                  )}

                                  {secBItems.length > 0 && (
                                    <>
                                      <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
                                        <td className="p-2 underline border-r border-slate-200">B. OVER DISTANCE</td>
                                        <td className="p-2 border-r border-slate-200"></td>
                                        <td className="p-2 border-r border-slate-200"></td>
                                        <td className="p-2 text-right border-r border-slate-200"></td>
                                        <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalB)}</td>
                                      </tr>
                                      {secBItems.map((item: any) => {
                                        const effVol = getItemEffectiveVolume(item);
                                        const effMtr = getItemEffectiveOverhaulMtr(item);
                                        const { unitRate, amount } = calculateItemRateAndAmount(item, "POS");
                                        const diffMtr = effMtr - 1000;
                                        return (
                                          <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-200">
                                            <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">
                                              <div>{item.description}</div>
                                              <div className="text-[10px] text-slate-500 font-mono font-normal">
                                                {effMtr} mtr - 1000 mtr = ({diffMtr}) mtr
                                              </div>
                                            </td>
                                            <td className="p-2 text-center font-mono font-bold border-r border-slate-200">
                                              {effVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-2 text-center border-r border-slate-200 text-slate-500 font-normal">{item.unit}</td>
                                            <td className="p-2 text-right font-mono border-r border-slate-200">{unitRate.toLocaleString("id-ID")}</td>
                                            <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
                                          </tr>
                                        );
                                      })}
                                    </>
                                  )}

                                  {secCItems.length > 0 && (
                                    <>
                                      <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
                                        <td className="p-2 underline border-r border-slate-200">C. LAND CLEARING</td>
                                        <td className="p-2 border-r border-slate-200"></td>
                                        <td className="p-2 border-r border-slate-200"></td>
                                        <td className="p-2 text-right border-r border-slate-200"></td>
                                        <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalC)}</td>
                                      </tr>
                                      {secCItems.map((item) => {
                                        const { unitRate, amount } = calculateItemRateAndAmount(item, "POS");
                                        return (
                                          <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-200">
                                            <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">{item.description}</td>
                                            <td className="p-2 text-center font-mono font-bold border-r border-slate-200">
                                              {(item.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-2 text-center border-r border-slate-200 text-slate-500 font-normal">{item.unit}</td>
                                            <td className="p-2 text-right font-mono border-r border-slate-200">{unitRate.toLocaleString("id-ID")}</td>
                                            <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
                                          </tr>
                                        );
                                      })}
                                    </>
                                  )}

                                  {secDItems.length > 0 && (
                                    <>
                                      <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
                                        <td className="p-2 underline border-r border-slate-200">D. RAISE & FALL'S FACTOR</td>
                                        <td className="p-2 border-r border-slate-200"></td>
                                        <td className="p-2 border-r border-slate-200"></td>
                                        <td className="p-2 text-right border-r border-slate-200"></td>
                                        <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalD)}</td>
                                      </tr>
                                      {secDItems.map((item) => {
                                        const { unitRate, amount } = calculateItemRateAndAmount(item, "POS");
                                        return (
                                          <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-200">
                                            <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">{item.description}</td>
                                            <td className="p-2 text-center font-mono font-bold border-r border-slate-200">
                                              {(item.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-2 text-center border-r border-slate-200 text-slate-500 font-normal">{item.unit}</td>
                                            <td className="p-2 text-right font-mono border-r border-slate-200">{unitRate.toLocaleString("id-ID")}</td>
                                            <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
                                          </tr>
                                        );
                                      })}
                                    </>
                                  )}
                                </>
                              );
                            })()}
                          </tbody>

                          {/* TOTALS FOOTER */}
                          <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-bold text-[11px]">
                            <tr className="border-b border-slate-200">
                              <td colSpan={viewCustCode === "DBK" ? 5 : 4} className="p-2 text-left font-extrabold uppercase text-slate-900 border-r border-slate-200">TOTAL (REVENUE GROSS):</td>
                              <td className="p-2 text-right font-mono font-black text-slate-900">{formatIDR(cCalc.totalGross)}</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td colSpan={viewCustCode === "DBK" ? 5 : 4} className="p-2 text-left uppercase text-slate-800 border-r border-slate-200">DPP PPN 11/12:</td>
                              <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(cCalc.dpp11_12)}</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td colSpan={viewCustCode === "DBK" ? 5 : 4} className="p-2 text-left uppercase text-slate-800 border-r border-slate-200">VAT ( 12% ) (+):</td>
                              <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(cCalc.vat12)}</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td colSpan={viewCustCode === "DBK" ? 5 : 4} className="p-2 text-left uppercase text-slate-800 border-r border-slate-200">WITH HOLDING TAX ART 23 (-):</td>
                              <td className="p-2 text-right font-mono font-extrabold text-slate-900">({formatIDR(cCalc.pph23)})</td>
                            </tr>
                            <tr className="bg-slate-100 text-slate-950 font-black text-xs sm:text-sm border-t-2 border-b-2 border-slate-400">
                              <td colSpan={viewCustCode === "DBK" ? 5 : 4} className="p-3 text-left uppercase tracking-wider text-slate-950 font-black border-r border-slate-300">TOTAL INVOICE (NET):</td>
                              <td className="p-3 text-right font-black text-sm sm:text-base text-slate-950 underline">{formatIDR(cCalc.totalInvoice)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                      )}

                      {/* Commercial Revenue Decomposition Card (R&F Escalation vs Core Mining) */}
                      {(viewCustCode === "BGG" || viewCustCode === "POS") ? (
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
                              {detailViewItem.data.rfSnapshot && (
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
                                {viewCustCode === "BGG" ? "Seksi D: Kompensasi Indeks Solar Fn/Fo" : "Seksi D: Kompensasi 3-Faktor (Solar, Upah, M-Rate)"}
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
                      ) : (
                        <div className="pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px]">
                          <div className="font-mono text-slate-600 space-y-0.5">
                            <span className="font-bold text-slate-800 flex items-center gap-1">
                              <Calculator size={12} className="text-cyan-700" /> Parameter Acuan & Basis Tagihan:
                            </span>
                            <p className="text-[10px] text-slate-600">Site: <strong>{viewCustCode}</strong> | Basis Kontrak: <strong>{cInfo?.contractNo || "Kontrak Aktif"}</strong> | Overhaul Basis: <strong>{cInfo?.overhaulBasis || "1.000m"}</strong></p>
                          </div>
                        </div>
                      )}

                      {/* Bottom Info Grid: Bank Account from Master Data & Blank Signature Area */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t-2 border-slate-900 text-[11px]">
                        {/* Left: Bank Account Info from Master Data */}
                        <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg space-y-1">
                          <p className="font-extrabold uppercase text-slate-900 tracking-wider">PLEASE MAKE PAYMENT TO THIS ACCOUNT:</p>
                          <div className="pt-1 text-[11px] space-y-1">
                            <div className="flex"><span className="w-24 font-bold text-slate-500">Bank Name</span><span className="font-extrabold text-slate-900">: {detailViewItem.data.bankName || cInfo?.bankName || "Bank BNI"}</span></div>
                            <div className="flex"><span className="w-24 font-bold text-slate-500">A/C Name</span><span className="font-extrabold text-slate-900">: {detailViewItem.data.bankAccountName || "PT Andalan Artha Primanusa"}</span></div>
                            <div className="flex"><span className="w-24 font-bold text-slate-500">A/C No</span><span className="font-black text-cyan-900">: {detailViewItem.data.bankAccountNo || cInfo?.bankAccountNo || "8188788882"}</span></div>
                            <div className="flex"><span className="w-24 font-bold text-slate-500">Branch</span><span className="font-extrabold text-slate-900">: {detailViewItem.data.bankBranch || cInfo?.bankBranch || "Harmoni, Jakarta"}</span></div>
                          </div>
                        </div>

                        {/* Right: Signature Area (Blank as requested) */}
                        <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg flex flex-col justify-between text-center">
                          <div className="text-right text-[10px] text-slate-600 font-bold">
                            Jakarta, {formattedDate}
                          </div>
                          <div className="pt-1">
                            <p className="text-[10px] font-extrabold uppercase text-slate-700">SUBMITTED BY,</p>
                            <p className="text-[11px] font-black text-slate-900">PT ANDALAN ARTHA PRIMANUSA</p>
                          </div>

                          {/* Blank signature space (no stamp/signature) */}
                          <div className="h-14 border-b border-dashed border-slate-400 my-2 flex items-center justify-center text-[10px] text-slate-400 italic">
                            ( Area Tanda Tangan & Stempel — Kosong )
                          </div>

                          <div>
                            <p className="text-[11px] font-black underline text-slate-900">{detailViewItem.data.directorName || cInfo?.directorName || "GAHARI CHRISTINE"}</p>
                            <p className="text-[10px] font-bold text-slate-600">{detailViewItem.data.directorTitle || cInfo?.directorTitle || "DIRECTOR"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Payment Detail Summary */}
                {detailViewItem.type === "payment" && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs text-slate-800">
                    <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
                      <div><span className="text-slate-500 block font-bold">Target Invoice:</span> <strong className="text-sm font-mono text-cyan-800">{detailViewItem.data.invoiceNo}</strong></div>
                      <div><span className="text-slate-500 block font-bold">Customer:</span> <strong className="text-sm text-slate-900">{detailViewItem.data.customerCode}</strong></div>
                    </div>
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <span className="text-xs text-emerald-800 font-bold block uppercase">Jumlah Uang Masuk Received</span>
                      <span className="text-2xl font-black text-emerald-900">{formatIDR(detailViewItem.data.amountPaid)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-slate-500 block">Bank Receiving:</span> <strong>{detailViewItem.data.receivingBank}</strong></div>
                      <div><span className="text-slate-500 block">No. Ref Transfer:</span> <strong className="font-mono">{detailViewItem.data.refNo}</strong></div>
                    </div>
                    <div><span className="text-slate-500 block">Ketepatan Bayar:</span> <span className="font-bold text-amber-700">{detailViewItem.data.daysLateOrEarly > 0 ? `Telat ${detailViewItem.data.daysLateOrEarly} Hari` : "On-Time / Tepat Waktu"}</span></div>
                    <div><span className="text-slate-500 block">Catatan:</span> <p className="text-slate-700 font-medium">{detailViewItem.data.notes}</p></div>
                  </div>
                )}

                {/* Customer Detail Summary */}
                {detailViewItem.type === "customer" && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs text-slate-800">
                    <div><span className="text-slate-500 block font-bold">Nama Customer:</span> <strong className="text-base text-slate-900">{detailViewItem.data.fullName} ({detailViewItem.data.code})</strong></div>
                    <div><span className="text-slate-500 block font-bold">Induk Perusahaan:</span> <strong className="text-slate-800">{detailViewItem.data.groupParent}</strong></div>
                    <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-200">
                      <div><span className="text-slate-500 block">Termin Hari:</span> <strong className="text-amber-700 font-extrabold text-sm">{detailViewItem.data.terminDays} Hari</strong></div>
                      <div><span className="text-slate-500 block">Nilai Kontrak:</span> <strong className="text-slate-900 font-black">{formatIDR(detailViewItem.data.contractValue)}</strong></div>
                    </div>
                    <div><span className="text-slate-500 block font-bold">No. Kontrak:</span> <strong className="text-slate-800">{detailViewItem.data.contractNo}</strong></div>
                    <div><span className="text-slate-500 block font-bold">Kontak Penagihan AR:</span> <p className="text-slate-700 font-medium">{detailViewItem.data.contactAR} ({detailViewItem.data.emailAR} | {detailViewItem.data.phone})</p></div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: 4 cols out of 12 for vertical Audit Trail & Summary */}
              <div className="lg:col-span-4 space-y-4">
                {/* PAYMENT TRACKER FOR INVOICE */}
                {detailViewItem.type === "invoice" && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-xs space-y-3.5">
                    <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <Receipt className="text-cyan-800" size={16} />
                        <h4 className="text-xs font-black uppercase tracking-wider text-cyan-800">
                          Payment Tracker (Cicilan)
                        </h4>
                      </div>
                      <button
                        onClick={() => setShowAddPartialPayment(!showAddPartialPayment)}
                        className="px-3 py-1 text-xs font-extrabold bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg flex items-center gap-1 transition shadow-xs cursor-pointer"
                      >
                        <Plus size={14} /> {showAddPartialPayment ? "Batal" : "Catat Cicilan"}
                      </button>
                    </div>

                    {/* Progress Bar & Summary */}
                    {(() => {
                      const totalInv = detailViewItem.data.totalReceipt || detailViewItem.data.totalInvoice || 1;
                      const paid = detailViewItem.data.totalPaid || 0;
                      const outstanding = detailViewItem.data.outstanding !== undefined ? detailViewItem.data.outstanding : (totalInv - paid);
                      const percent = Math.min(100, Math.round((paid / totalInv) * 100));

                      return (
                        <div className="space-y-2.5 text-xs">
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                              <span className="text-[10px] text-emerald-800 block uppercase font-bold tracking-wider">Total Terbayar</span>
                              <strong className="text-emerald-900 text-sm font-black">{formatIDR(paid)}</strong>
                            </div>
                            <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
                              <span className="text-[10px] text-rose-800 block uppercase font-bold tracking-wider">Sisa Tagihan</span>
                              <strong className="text-rose-900 text-sm font-black">{formatIDR(outstanding)}</strong>
                            </div>
                          </div>

                          <div className="space-y-1 pt-0.5">
                            <div className="flex justify-between text-[11px] font-bold">
                              <span className="text-slate-600">Status Pelunasan</span>
                              <span className="text-cyan-800 font-extrabold">{percent}% Lunas</span>
                            </div>
                            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden border border-slate-300">
                              <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${percent}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Form Catat Cicilan Baru */}
                    {showAddPartialPayment && (
                      <form onSubmit={handleSavePartialPayment} className="bg-white border border-slate-300 p-3.5 rounded-xl shadow-xs space-y-3 text-xs text-slate-800 mt-2">
                        <div className="font-extrabold text-cyan-800 border-b border-slate-200 pb-2 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                          <DollarSign size={14} className="text-cyan-700" /> Form Entri Cicilan Baru
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                            Nominal Bayar (Rp) <span className="text-rose-600">*</span>
                          </label>
                          <input
                            type="number"
                            required
                            placeholder="Contoh: 5000000000"
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-extrabold focus:border-cyan-700 focus:bg-white focus:ring-2 focus:ring-cyan-600/20 outline-none transition font-mono"
                            value={partialPaymentForm.amountPaid}
                            onChange={(e) => setPartialPaymentForm({ ...partialPaymentForm, amountPaid: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                              Tgl Bayar <span className="text-rose-600">*</span>
                            </label>
                            <input
                              type="date"
                              required
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-medium focus:border-cyan-700 focus:bg-white focus:ring-2 focus:ring-cyan-600/20 outline-none transition"
                              value={partialPaymentForm.paymentDate}
                              onChange={(e) => setPartialPaymentForm({ ...partialPaymentForm, paymentDate: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                              Bank Penerima
                            </label>
                            <input
                              type="text"
                              placeholder="Bank Mandiri Escrow"
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-medium focus:border-cyan-700 focus:bg-white focus:ring-2 focus:ring-cyan-600/20 outline-none transition"
                              value={partialPaymentForm.receivingBank}
                              onChange={(e) => setPartialPaymentForm({ ...partialPaymentForm, receivingBank: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                              No. Ref Transfer
                            </label>
                            <input
                              type="text"
                              placeholder="TRF-MND-XXXX"
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-medium focus:border-cyan-700 focus:bg-white focus:ring-2 focus:ring-cyan-600/20 outline-none transition font-mono"
                              value={partialPaymentForm.refNo}
                              onChange={(e) => setPartialPaymentForm({ ...partialPaymentForm, refNo: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                              Catatan
                            </label>
                            <input
                              type="text"
                              placeholder="Cicilan ke-1"
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-medium focus:border-cyan-700 focus:bg-white focus:ring-2 focus:ring-cyan-600/20 outline-none transition"
                              value={partialPaymentForm.notes}
                              onChange={(e) => setPartialPaymentForm({ ...partialPaymentForm, notes: e.target.value })}
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5 text-xs mt-1"
                        >
                          Simpan Cicilan (Menunggu Verifikasi)
                        </button>
                      </form>
                    )}

                    {/* Riwayat List Cicilan */}
                    <div className="space-y-2 pt-2 border-t border-slate-200 max-h-60 overflow-y-auto pr-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Daftar History Cicilan:</span>
                      {(() => {
                        const linkedPayments = paymentRows.filter((p: any) => p.invoiceNo === detailViewItem.data.invoiceNo);
                        if (linkedPayments.length === 0) {
                          return <p className="text-[11px] text-slate-500 italic py-1">Belum ada rincian cicilan yang terdaftar.</p>;
                        }
                        return linkedPayments.map((p: any, pIdx: number) => {
                          const isVerified = p.verificationStatus === "Verified" || !p.verificationStatus;
                          return (
                            <div key={p.id || pIdx} className="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5 shadow-xs text-xs">
                              <div className="flex justify-between items-start">
                                <span className="font-black text-emerald-700 font-mono text-sm">{formatIDR(p.amountPaid)}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold ${isVerified ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-amber-100 text-amber-800 border border-amber-300"}`}>
                                  {isVerified ? "✓ Verified" : "⏳ Pending Verifikasi"}
                                </span>
                              </div>
                              <div className="flex justify-between text-[11px] text-slate-600 font-semibold">
                                <span>Tgl: {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString("id-ID") : "-"}</span>
                                <span>{p.receivingBank || "-"}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 flex justify-between items-center pt-1.5 border-t border-slate-100 font-medium">
                                <span>Inputter: <strong className="text-slate-800 font-bold">{p.createdBy || "AR Admin"}</strong></span>
                                {isVerified && p.verifiedBy && (
                                  <span>Verifikator: <strong className="text-cyan-800 font-bold">{p.verifiedBy}</strong></span>
                                )}
                              </div>
                              {!isVerified && (
                                <button
                                  onClick={() => handleVerifyPartialPayment(p.id)}
                                  className="w-full mt-2 py-1.5 text-xs bg-cyan-700 hover:bg-cyan-800 text-white font-extrabold rounded-lg flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                                >
                                  <CheckCircle2 size={14} /> Verifikasi Pembayaran (1-Level)
                                </button>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-cyan-800 flex items-center gap-1.5">
                    <History size={16} /> Audit Trail & Flow Tracking
                  </h4>
                  <span className="text-[11px] text-slate-400 font-bold">Jejak Aktivitas User</span>
                </div>

                {/* Vertical Stepper Timeline */}
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {generateAuditTimeline(detailViewItem.type, detailViewItem.data).map((log: any, idx: number) => {
                    let circleColor = "bg-emerald-600 text-white shadow-sm ring-4 ring-emerald-100";
                    if (log.status === "pending") circleColor = "bg-slate-300 text-slate-600";
                    else if (log.status === "warning") circleColor = "bg-amber-500 text-white ring-4 ring-amber-100";
                    else if (log.status === "rejected") circleColor = "bg-rose-600 text-white ring-4 ring-rose-100";

                    return (
                      <div key={idx} className="relative group">
                        {/* Circle Node */}
                        <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${circleColor}`}>
                          {idx + 1}
                        </div>

                        {/* Log Content Card */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-xs space-y-1">
                          <div className="flex justify-between items-start">
                            <h5 className="font-extrabold text-slate-900 text-xs">{log.title}</h5>
                            <span className="text-[10px] font-mono text-slate-500 font-bold">{log.time}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-700">
                            <User size={12} className="text-cyan-700" />
                            <span className="font-bold text-slate-900">{log.user}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">{log.role}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 pt-0.5 font-medium leading-relaxed">{log.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer (Sticky at bottom) */}
            <div className="sticky -bottom-6 sm:-bottom-7 bg-white border-t border-slate-200 pt-4 pb-6 sm:pb-7 -mx-6 sm:-mx-7 px-6 sm:px-7 rounded-b-2xl z-20 flex justify-between items-center shadow-md">
              <div className="flex items-center gap-2">
                {detailViewItem.type === "ba" && (
                  <>
                    {(isFinanceSpecialist || isSuper || isSPV) && (["Submit", "Pending Berita Acara", "Draft", "Revisi", "Rejected"].includes(detailViewItem.data.statusBA) || !detailViewItem.data.statusBA) && (
                      <button
                        className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                        onClick={() => handleVerifyBA(detailViewItem.data.id)}
                      >
                        <ShieldCheck size={14} /> Verifikasi Finance Specialist
                      </button>
                    )}
                    {(isManager || isDirector || isSuper) && (["Pending Berita Acara", "Verified", "Submit", "Draft", "Revisi"].includes(detailViewItem.data.statusBA)) && (
                      <button
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                        onClick={() => handleApproveBA(detailViewItem.data.id)}
                      >
                        <CheckCircle2 size={14} /> Approve Manager
                      </button>
                    )}
                  </>
                )}

                {detailViewItem.type === "invoice" && (
                  <>
                    {(isManager || isDirector || isSuper) && (detailViewItem.data.status === "Draft" || !detailViewItem.data.status || detailViewItem.data.status === "Pending" || detailViewItem.data.status === "Submitted" || detailViewItem.data.status === "Verified") && (
                      <button
                        className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                        onClick={() => handleApproveInvoice(detailViewItem.data.id)}
                      >
                        <UserCheck size={14} /> Setujui Invoice (Manager FATB)
                      </button>
                    )}
                  </>
                )}
              </div>
              <button
                className="px-6 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition shadow-sm"
                onClick={() => setDetailViewItem(null)}
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
  );
}

