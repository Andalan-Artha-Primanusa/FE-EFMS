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

export function FormModals({ c }: { c: any }) {
  const {
    baRows: rawBaRows, isFinanceSpecialist, isManager, invoiceRows: rawInvoiceRows, customerRows: rawCustomerRows,
    modalType, setModalType, editItem, formData, setFormData,
    setDetailViewItem, isInlineEditingBA, setIsInlineEditingBA, mRate, setMRate,
    fuelPriceUSD, setFuelPriceUSD, laborPriceIDR, setLaborPriceIDR, masterBankAccounts,
    rfIndexCalculated, activeSOWCatalog, defaultPOSBAOperatingItems, defaultPOSBAMDOItems, defaultBGGBAItems,
    baOperatingItems, setBaOperatingItems, baMDOItems, setBaMDOItems, activeBAStep,
    setActiveBAStep, showAddRowDropdown, setShowAddRowDropdown, invLineItems, handleCompanySelect,
    loadDemoPOSData, loadDemoBGGData, loadDemoDBKData, loadDemoSBSData, removeInvLineItem,
    updateInvItemVolume, updateInvItemOverhaul, updateInvItemRateIDR, updateInvItemRateUSD, updateInvItemKurs,
    updateInvItemAmount, getItemEffectiveVolume, getItemEffectiveOverhaulMtr, calculateItemRateAndAmount, getCustomerCalculations,
    subtotalA, subtotalB, subtotalC, subtotalD, subtotalE,
    subtotalF, subtotalP, loadData, handleBASelect, createInvoiceFromBA,
    handleFileUpload, handleSave, onNotice, user
  } = (c || {}) as Record<string, any>;
  const baRows: any[] = Array.isArray(rawBaRows) ? rawBaRows : [];
  const invoiceRows: any[] = Array.isArray(rawInvoiceRows) ? rawInvoiceRows : [];
  const customerRows: any[] = Array.isArray(rawCustomerRows) ? rawCustomerRows : [];

  if (!modalType || modalType === "none") return null;

  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-2 sm:p-4">
          <div className={`bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 w-full ${modalType === "ba" || modalType === "pending_volume" || modalType === "invoice" ? "max-w-[98vw] 2xl:max-w-[1680px]" : "max-w-3xl"} shadow-2xl space-y-6 max-h-[96vh] overflow-y-auto transition-all`}>
            {/* Modal Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-cyan-800 bg-cyan-50 px-2.5 py-1 rounded-md border border-cyan-200">
                    <FileText size={14} /> {modalType === "ba" ? "Berita Acara & Audit Intelligence Hub" : "Form Entri Keuangan"}
                  </span>
                  {modalType === "ba" && editItem && (
                    renderBAStatusBadge(formData.statusBA || editItem.statusBA, formData.invoiceNoLinked || editItem.invoiceNoLinked, undefined, editItem || formData, invoiceRows)
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  {modalType === "ba"
                    ? (editItem ? `Berita Acara: ${formData.baNumber || formData.signedBANumber || formData.draftBARefNo || "Draft BA"}` : "Input Berita Acara Baru")
                    : `${editItem ? "Edit Data" : "Tambah Data Baru"} â€” ${modalType === "pending_volume" ? "Pending Volume (Joint Survey)" : modalType === "invoice" ? "Invoice" : modalType === "payment" ? "Payment Receipt" : "Customer Master"}`
                  }
                </h3>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {modalType === "ba" && editItem && (
                  <>
                    {(formData.statusBA === "Ready to Invoice" || formData.statusBA === "Approved" || editItem.statusBA === "Ready to Invoice") && (
                      (editItem.customerCode === "POS" || formData.customerCode === "POS") ? (
                        (() => {
                          const modalInvStatus = getBAInvoiceStatus(editItem || formData, invoiceRows);
                          if (modalInvStatus.isFullyInvoiced) {
                            return (
                              <span className="px-3 py-1.5 rounded-xl bg-purple-100 border border-purple-300 text-purple-900 font-extrabold text-xs flex items-center gap-1.5 shadow-xs">
                                <Archive size={14} className="text-purple-700" />
                                <span>2/2 Invoice Telah Terbit</span>
                              </span>
                            );
                          }
                          return (
                            <div className="flex items-center gap-1.5">
                              {/* Tombol Inv Mining jika belum dibuat */}
                              {!modalInvStatus.createdMiningInv && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalType("none");
                                    createInvoiceFromBA(editItem || formData, "Operation & Mining");
                                  }}
                                  className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                                  title="Auto-generate Form Invoice Kategori 1: Operations & Mining"
                                >
                                  <Pickaxe size={14} />
                                  <span>âš¡ Terbitkan Inv Mining</span>
                                </button>
                              )}
                              {/* Tombol Inv MDO jika belum dibuat */}
                              {!modalInvStatus.createdMDOInv && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalType("none");
                                    createInvoiceFromBA(editItem || formData, "MDO");
                                  }}
                                  className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                                  title="Auto-generate Form Invoice Kategori 2: Mine Development (MDO)"
                                >
                                  <Building2 size={14} />
                                  <span>ðŸ—ï¸ Terbitkan Inv MDO</span>
                                </button>
                              )}
                              {/* Info Invoice yang sudah terbit jika ada */}
                              {modalInvStatus.isPartiallyInvoiced && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const targetInv = modalInvStatus.createdMiningInv || modalInvStatus.createdMDOInv;
                                    if (targetInv) {
                                      setDetailViewItem({ type: "invoice", data: targetInv });
                                    }
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-300 text-purple-900 font-extrabold text-xs flex items-center gap-1 transition cursor-pointer"
                                >
                                  <Archive size={12} className="text-purple-700" />
                                  <span>{modalInvStatus.createdMiningInv ? "Inv Mining âœ“" : "Inv MDO âœ“"}</span>
                                  <ExternalLink size={11} className="text-purple-700 ml-0.5" />
                                </button>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setModalType("none");
                            createInvoiceFromBA(editItem || formData);
                          }}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                          title="Auto-generate Form Invoice dari BA ini"
                        >
                          <Zap size={14} className="fill-amber-300 text-amber-300" />
                          <span>âš¡ Terbitkan Invoice</span>
                        </button>
                      )
                    )}
                    <button
                      type="button"
                      onClick={() => setIsInlineEditingBA(!isInlineEditingBA)}
                      className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition flex items-center gap-1.5 shadow-xs border cursor-pointer ${
                        isInlineEditingBA
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                          : "bg-cyan-700 hover:bg-cyan-800 text-white border-cyan-800"
                      }`}
                      title={isInlineEditingBA ? "Alihkan ke Mode Pratinjau Bersih" : "Buka Mode Edit Data"}
                    >
                      {isInlineEditingBA ? (
                        <>
                          <Eye size={14} /> ðŸ‘ï¸ Mode Pratinjau
                        </>
                      ) : (
                        <>
                          <Edit2 size={14} /> âœï¸ Mode Edit Data
                        </>
                      )}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition cursor-pointer"
                  onClick={() => setModalType("none")}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6 text-sm font-medium text-slate-800">

              {/* ================= MODAL INVOICE MASTER (PAYMENT DETAIL GENERATOR) ================= */}
              {modalType === "invoice" && (
                <div className="space-y-5 text-xs">
                  {/* Header Info Card */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-2">
                      <h4 className="text-sm font-black text-slate-900 tracking-wider uppercase flex items-center gap-1.5">
                        <FileText size={16} className="text-cyan-800" /> INVOICE GENERATOR
                      </h4>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={loadDemoPOSData}
                          className="px-2 py-1 text-[11px] font-extrabold text-cyan-900 bg-cyan-100 hover:bg-cyan-200 border border-cyan-300 rounded transition flex items-center gap-1"
                          title="Isi otomatis dengan data demo POS Mining"
                        >
                          <Pickaxe size={12} /> âš¡ Demo POS
                        </button>
                        <button
                          type="button"
                          onClick={loadDemoBGGData}
                          className="px-2 py-1 text-[11px] font-extrabold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded transition flex items-center gap-1"
                          title="Isi otomatis dengan data demo BGG Mining (Gambar 2)"
                        >
                          <Pickaxe size={12} /> âš¡ Demo BGG
                        </button>
                        <button
                          type="button"
                          onClick={loadDemoDBKData}
                          className="px-2 py-1 text-[11px] font-extrabold text-blue-900 bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded transition flex items-center gap-1"
                          title="Isi otomatis dengan data demo DBK Petrosea (Gambar 3)"
                        >
                          <Pickaxe size={12} /> âš¡ Demo DBK
                        </button>
                        <button
                          type="button"
                          onClick={loadDemoSBSData}
                          className="px-2 py-1 text-[11px] font-extrabold text-purple-900 bg-purple-100 hover:bg-purple-200 border border-purple-300 rounded transition flex items-center gap-1"
                          title="Isi otomatis dengan data demo SBS Mining (Gambar 4)"
                        >
                          <Pickaxe size={12} /> âš¡ Demo SBS
                        </button>
                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-300">
                          RF Index: <strong className="text-amber-700 font-mono font-black">{rfIndexCalculated.toFixed(3)}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Prominent BA Reference Bar */}
                    <div className="bg-cyan-50/80 border border-cyan-200 rounded-lg p-2.5 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <label className="text-xs font-extrabold text-cyan-950 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
                        <FileCheck size={15} className="text-cyan-800" /> Pilih No. BA (Auto-Fill):
                      </label>
                      <select
                        className="bg-white border border-cyan-300 font-bold text-cyan-950 text-xs px-3 py-1.5 rounded-lg focus:border-cyan-600 outline-none flex-1 w-full shadow-xs"
                        value={formData.baNoReference || ""}
                        onChange={(e) => handleBASelect(e.target.value)}
                      >
                        <option value="">-- Tanpa BA Reference (Input Manual) --</option>
                        {baRows.map((ba: any) => (
                          <option key={ba.id} value={ba.baNumber}>
                            {ba.baNumber} â€” Client: {ba.customerCode} â€” Periode: {ba.workPeriod || "-"} ({formatIDR(ba.workAmount || 0)}) [{ba.statusBA || "Submit"}]
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2-Column Info Grid with Equal Label Spacing */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
                      {/* Left Column */}
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-3">
                          <span className="w-28 text-slate-500 font-bold shrink-0">Company:</span>
                          <select
                            className="bg-white border border-slate-300 font-extrabold text-slate-900 text-xs px-2.5 py-1.5 rounded-lg focus:border-cyan-600 outline-none flex-1 w-full"
                            value={formData.customerCode || ""}
                            onChange={(e) => handleCompanySelect(e.target.value)}
                          >
                            <option value="">-- Pilih Customer --</option>
                            {customerRows.map((c: any) => (
                              <option key={c.id || c.code} value={c.code}>
                                {c.code} â€” {c.fullName}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="w-28 text-slate-500 font-bold shrink-0">Contractor:</span>
                          <span className="font-extrabold text-slate-800 px-2 py-1 bg-slate-100/70 rounded border border-slate-200 flex-1">
                            PT. ANDALAN ARTHA PRIMANUSA
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="w-28 text-slate-500 font-bold shrink-0">Project:</span>
                          <input
                            className="bg-white border border-slate-300 font-extrabold text-slate-800 text-xs px-2.5 py-1.5 rounded-lg outline-none flex-1 w-full"
                            value={formData.projectSite || ""}
                            onChange={(e) => setFormData({ ...formData, projectSite: e.target.value })}
                            placeholder="Otomatis terisi dari Master Customer / BA"
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="w-28 text-slate-500 font-bold shrink-0">Period Covered:</span>
                          <input
                            className="bg-white border border-slate-300 font-extrabold text-slate-900 text-xs px-2.5 py-1.5 rounded-lg focus:border-cyan-600 outline-none flex-1 w-full"
                            placeholder="Juni 2026 / Jul-26"
                            value={formData.workPeriod || ""}
                            onChange={(e) => {
                              const newPeriod = e.target.value;
                              const newInvNo = generateInvoiceNumber(formData.customerCode || "POS", newPeriod, invoiceRows.length);
                              setFormData({ ...formData, workPeriod: newPeriod, invoiceNo: newInvNo });
                            }}
                          />
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-3">
                          <span className="w-28 text-slate-500 font-bold shrink-0">Invoice No.:</span>
                          <input
                            className="bg-white border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2.5 py-1.5 rounded-lg focus:border-cyan-600 outline-none flex-1 w-full"
                            placeholder="003/POS-AAP/RF/VI/2026"
                            value={formData.invoiceNo || ""}
                            onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                            required
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="w-28 text-slate-500 font-bold shrink-0">Activity Group:</span>
                          <input
                            className="bg-white border border-slate-300 font-extrabold text-slate-900 text-xs px-2.5 py-1.5 rounded-lg focus:border-cyan-600 outline-none flex-1 w-full"
                            value={formData.activityGroup || "OPERATION & MINING"}
                            onChange={(e) => setFormData({ ...formData, activityGroup: e.target.value })}
                            placeholder="OPERATION & MINING"
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="w-28 text-slate-500 font-bold shrink-0">PO Number:</span>
                          <input
                            className="bg-white border border-slate-300 font-extrabold text-slate-900 text-xs px-2.5 py-1.5 rounded-lg focus:border-cyan-600 outline-none flex-1 w-full"
                            placeholder="PO-POS-2026-001"
                            value={formData.noPO || formData.poNumber || ""}
                            onChange={(e) => setFormData({ ...formData, noPO: e.target.value, poNumber: e.target.value })}
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="w-28 text-slate-500 font-bold shrink-0">Contract Number:</span>
                          <input
                            className="bg-white border border-slate-300 font-extrabold text-slate-800 text-xs px-2.5 py-1.5 rounded-lg outline-none flex-1 w-full"
                            placeholder="Otomatis terisi dari Master Customer / BA"
                            value={formData.contractNo || ""}
                            onChange={(e) => setFormData({ ...formData, contractNo: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Master Bank Account Selector */}
                    <div className="bg-slate-50 border border-slate-300 rounded-xl p-3 space-y-2">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <label className="text-xs font-black uppercase text-cyan-900 tracking-wider flex items-center gap-1.5 shrink-0">
                          <Receipt size={15} className="text-cyan-800" /> Rekening Pembayaran (Master Bank Account):
                        </label>
                        <select
                          className="bg-white border border-slate-300 font-extrabold text-slate-900 text-xs px-3 py-1.5 rounded-lg focus:border-cyan-600 outline-none shadow-xs"
                          value={formData.bankName || "Bank BNI"}
                          onChange={(e) => {
                            const selectedBank = masterBankAccounts.find(b => b.bankName === e.target.value) || masterBankAccounts[0];
                            setFormData({
                              ...formData,
                              bankName: selectedBank.bankName,
                              bankAccountName: selectedBank.bankAccountName,
                              bankAccountNo: selectedBank.bankAccountNo,
                              bankBranch: selectedBank.bankBranch,
                            });
                          }}
                        >
                          {masterBankAccounts.map((b) => (
                            <option key={b.id} value={b.bankName}>
                              {b.bankName} â€” A/C {b.bankAccountNo} ({b.bankBranch})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-sans text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200">
                        <div><span className="text-slate-500 block font-sans text-[10px] font-bold">Bank Name:</span> <strong>{formData.bankName || "Bank BNI"}</strong></div>
                        <div><span className="text-slate-500 block font-sans text-[10px] font-bold">A/C Name:</span> <strong>{formData.bankAccountName || "PT Andalan Artha Primanusa"}</strong></div>
                        <div><span className="text-slate-500 block font-sans text-[10px] font-bold">A/C No:</span> <strong className="text-cyan-900 font-black">{formData.bankAccountNo || "8188788882"}</strong></div>
                        <div><span className="text-slate-500 block font-sans text-[10px] font-bold">Branch:</span> <strong>{formData.bankBranch || "Harmoni, Jakarta"}</strong></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-500">M-Rate (Kurs Tengah BI)</label>
                        <div className="relative mt-0.5">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">Rp</span>
                          <input type="number" step="0.01" className="w-full bg-slate-50 border border-slate-300 rounded pl-7 pr-2 py-1 text-xs font-extrabold text-slate-900 focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={mRate === 0 ? "" : mRate} onFocus={(e) => e.target.select()} onChange={(e) => setMRate(e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-500">Fuel Price ($F_n$ USD/L)</label>
                        <div className="relative mt-0.5">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">$</span>
                          <input type="number" step="0.001" className="w-full bg-slate-50 border border-slate-300 rounded pl-6 pr-2 py-1 text-xs font-extrabold text-slate-900 focus:bg-white focus:border-cyan-600 outline-none" placeholder="0.000" value={fuelPriceUSD === 0 ? "" : fuelPriceUSD} onFocus={(e) => e.target.select()} onChange={(e) => setFuelPriceUSD(e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-500">Labor Price ($L_n$ IDR)</label>
                        <div className="relative mt-0.5">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">Rp</span>
                          <input type="number" className="w-full bg-slate-50 border border-slate-300 rounded pl-7 pr-2 py-1 text-xs font-extrabold text-slate-900 focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={laborPriceIDR === 0 ? "" : laborPriceIDR} onFocus={(e) => e.target.select()} onChange={(e) => setLaborPriceIDR(e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DYNAMIC PAYMENT DETAIL TABLE PER CUSTOMER */}
                  {(() => {
                    const currentCust = (formData.customerCode || "POS").toUpperCase();
                    const cCalc = getCustomerCalculations(invLineItems, currentCust);

                    return (
                      <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-sm bg-white">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider">
                              <th className="p-2.5 text-center w-10">Del</th>
                              <th className="p-2.5">DESCRIPTION</th>
                              <th className="p-2.5 text-center">{currentCust === "SBS" ? "CLAIMED UNIT" : "CLAIMED VOLUME / DISTANCE"}</th>
                              {currentCust === "DBK" ? (
                                <>
                                  <th className="p-2.5 text-right">UNIT RATE (USD)</th>
                                  <th className="p-2.5 text-right">KURS (USD to IDR)</th>
                                </>
                              ) : (
                                <th className="p-2.5 text-right">UNIT RATE (IDR)</th>
                              )}
                              <th className="p-2.5 text-right font-extrabold">AMOUNT (IDR)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 font-medium">

                            {/* BGG CUSTOMER TABLE (Gambar 2) */}
                            {currentCust === "BGG" && (
                              <>
                                {/* Section A: OB Removal */}
                                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
                                  <td className="p-2 text-center text-slate-400">#</td>
                                  <td className="p-2 underline font-extrabold">A. OB REMOVAL (Pit Kungkilan)</td>
                                  <td className="p-2 text-center font-mono text-cyan-900">
                                    {invLineItems.filter(i => i.section === "A").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} Bcm
                                  </td>
                                  <td className="p-2 text-right"></td>
                                  <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalA)}</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "A").map(item => (
                                  <tr key={item.id} className="hover:bg-slate-50 transition">
                                    <td className="p-2 text-center">
                                      <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                    </td>
                                    <td className="p-2 font-bold text-slate-800">
                                      {item.description} &nbsp; &nbsp; <span className="text-[10px] text-slate-500 font-mono font-normal">({item.period})</span>
                                    </td>
                                    <td className="p-2 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <input type="number" step="0.01" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={item.volume === 0 ? "" : (item.volume ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemVolume(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                        <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Bcm"}</span>
                                      </div>
                                    </td>
                                    <td className="p-2 text-right">
                                      <input type="number" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={item.unitRateIDR === 0 ? "" : (item.unitRateIDR ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemRateIDR(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                    </td>
                                    <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(Math.round((item.volume || 0) * (item.unitRateIDR || 0)))}</td>
                                  </tr>
                                ))}

                                {/* Section B: Coal Winning */}
                                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                                  <td className="p-2 text-center text-slate-400">#</td>
                                  <td className="p-2 underline font-extrabold">B. COAL WINNING</td>
                                  <td className="p-2 text-center font-mono text-cyan-900">
                                    {invLineItems.filter(i => i.section === "B").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} Ton
                                  </td>
                                  <td className="p-2 text-right"></td>
                                  <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalB)}</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "B").map(item => (
                                  <tr key={item.id} className="hover:bg-slate-50 transition">
                                    <td className="p-2 text-center">
                                      <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                    </td>
                                    <td className="p-2 font-bold text-slate-800">{item.description}</td>
                                    <td className="p-2 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <input type="number" step="0.01" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={item.volume === 0 ? "" : (item.volume ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemVolume(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                        <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Ton"}</span>
                                      </div>
                                    </td>
                                    <td className="p-2 text-right">
                                      <input type="number" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={item.unitRateIDR === 0 ? "" : (item.unitRateIDR ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemRateIDR(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                    </td>
                                    <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(Math.round((item.volume || 0) * (item.unitRateIDR || 0)))}</td>
                                  </tr>
                                ))}

                                {/* Section C: Over Distance */}
                                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                                  <td className="p-2 text-center text-slate-400">#</td>
                                  <td className="p-2 underline font-extrabold">C. OVER DISTANCE</td>
                                  <td className="p-2 text-center"></td>
                                  <td className="p-2 text-right"></td>
                                  <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalC)}</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "C").map(item => (
                                  <tr key={item.id} className="hover:bg-slate-50 transition">
                                    <td className="p-2 text-center">
                                      <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                    </td>
                                    <td className="p-2 font-bold text-slate-800">
                                      <div>{item.subSection || "Over Distance"}</div>
                                      <div className="text-[10px] text-slate-500 font-mono">
                                        Dist: {item.overhaulMtr} mtr &nbsp; &nbsp; ({item.period})
                                      </div>
                                    </td>
                                    <td className="p-2 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <input type="number" step="0.01" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={item.volume === 0 ? "" : (item.volume ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemVolume(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                        <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Bcm"}</span>
                                      </div>
                                    </td>
                                    <td className="p-2 text-right">
                                      <input type="number" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={item.unitRateIDR === 0 ? "" : (item.unitRateIDR ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemRateIDR(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                    </td>
                                    <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(Math.round((item.volume || 0) * (item.unitRateIDR || 0)))}</td>
                                  </tr>
                                ))}

                                {/* Section D: Raise & Fall Factor */}
                                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                                  <td className="p-2 text-center text-slate-400">#</td>
                                  <td className="p-2 underline font-extrabold">D. RAISE & FALL'S FACTOR</td>
                                  <td className="p-2 text-center"></td>
                                  <td className="p-2 text-right"></td>
                                  <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalD)}</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "D").map(item => (
                                  <tr key={item.id} className="hover:bg-slate-50 transition">
                                    <td className="p-2 text-center">
                                      <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                    </td>
                                    <td className="p-2 font-bold text-slate-800">
                                      {item.subSection || ""} {item.description} &nbsp; &nbsp; <span className="text-[10px] text-slate-500 font-mono">({item.period})</span>
                                    </td>
                                    <td className="p-2 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <input type="number" step="0.01" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={item.volume === 0 ? "" : (item.volume ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemVolume(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                        <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Bcm"}</span>
                                      </div>
                                    </td>
                                    <td className="p-2 text-right">
                                      <input type="number" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={item.unitRateIDR === 0 ? "" : (item.unitRateIDR ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemRateIDR(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                    </td>
                                    <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(Math.round((item.volume || 0) * (item.unitRateIDR || 0)))}</td>
                                  </tr>
                                ))}

                                {/* Section E: Discount on Overdistance */}
                                <tr className="bg-rose-50/70 font-extrabold text-rose-900 border-t-2 border-rose-300">
                                  <td className="p-2 text-center text-rose-400">#</td>
                                  <td colSpan={3} className="p-2 underline">E. DISCOUNT ON OVERDISTANCE (Deduction)</td>
                                  <td className="p-2 text-right font-mono text-rose-900 font-extrabold">({formatIDR(Math.abs(cCalc.subtotalE))})</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "E").map(item => (
                                  <tr key={item.id} className="hover:bg-rose-50/30 transition">
                                    <td className="p-2 text-center">
                                      <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                    </td>
                                    <td colSpan={3} className="p-2 font-medium text-slate-700">{item.description}</td>
                                    <td className="p-2 text-right font-mono">
                                      <input type="number" className="w-32 bg-slate-50 border border-rose-300 font-mono font-extrabold text-rose-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white outline-none" placeholder="0" value={item.amount === 0 ? "" : Math.abs(item.amount)} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemAmount(item.id, -(e.target.value === "" ? 0 : Math.abs(parseFloat(e.target.value)) || 0))} />
                                    </td>
                                  </tr>
                                ))}

                                {/* Section F: DP Fuel & Transport */}
                                <tr className="bg-rose-50/70 font-extrabold text-rose-900 border-t-2 border-rose-300">
                                  <td className="p-2 text-center text-rose-400">#</td>
                                  <td colSpan={3} className="p-2 underline">F. DP FUEL & TRANSPORT (Deduction)</td>
                                  <td className="p-2 text-right font-mono text-rose-900 font-extrabold">({formatIDR(Math.abs(cCalc.subtotalF))})</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "F").map(item => (
                                  <tr key={item.id} className="hover:bg-rose-50/30 transition">
                                    <td className="p-2 text-center">
                                      <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                    </td>
                                    <td colSpan={3} className="p-2 font-medium text-slate-700">{item.description}</td>
                                    <td className="p-2 text-right font-mono">
                                      <input type="number" className="w-36 bg-slate-50 border border-rose-300 font-mono font-extrabold text-rose-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white outline-none" placeholder="0" value={item.amount === 0 ? "" : Math.abs(item.amount)} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemAmount(item.id, -(e.target.value === "" ? 0 : Math.abs(parseFloat(e.target.value)) || 0))} />
                                    </td>
                                  </tr>
                                ))}
                              </>
                            )}

                            {/* DBK PETROSEA CUSTOMER TABLE (Gambar 3 - Dual Currency) */}
                            {currentCust === "DBK" && (
                              <>
                                {/* Section A: OB Removal */}
                                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
                                  <td className="p-2 text-center text-slate-400">#</td>
                                  <td className="p-2 underline font-extrabold">A. OB REMOVAL (Pit Sapan)</td>
                                  <td className="p-2 text-center font-mono text-cyan-900">
                                    {invLineItems.filter(i => i.section === "A").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 3 })} Bcm
                                  </td>
                                  <td className="p-2 text-right"></td>
                                  <td className="p-2 text-right"></td>
                                  <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalA)}</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "A").map(item => (
                                  <tr key={item.id} className="hover:bg-slate-50 transition">
                                    <td className="p-2 text-center">
                                      <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                    </td>
                                    <td className="p-2 font-bold text-slate-800">{item.description}</td>
                                    <td className="p-2 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <input type="number" step="0.001" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0.000" value={item.volume === 0 ? "" : (item.volume ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemVolume(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                        <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Bcm"}</span>
                                      </div>
                                    </td>
                                    <td className="p-2 text-right">
                                      <input type="number" step="0.001" className="w-20 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0.000" value={item.unitRateUSD === 0 ? "" : (item.unitRateUSD ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemRateUSD(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                    </td>
                                    <td className="p-2 text-right">
                                      <input type="number" step="0.01" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="17140.76" value={item.kursBI === 0 ? "" : (item.kursBI ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemKurs(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                    </td>
                                    <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(Math.round((item.volume || 0) * (item.unitRateUSD || 0) * (item.kursBI || 17140.76)))}</td>
                                  </tr>
                                ))}

                                {/* Section B: Coal Winning */}
                                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                                  <td className="p-2 text-center text-slate-400">#</td>
                                  <td className="p-2 underline font-extrabold">B. COAL WINNING (Pit Sapan)</td>
                                  <td className="p-2 text-center font-mono text-cyan-900">
                                    {invLineItems.filter(i => i.section === "B").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 3 })} Ton
                                  </td>
                                  <td className="p-2 text-right"></td>
                                  <td className="p-2 text-right"></td>
                                  <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalB)}</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "B").map(item => (
                                  <tr key={item.id} className="hover:bg-slate-50 transition">
                                    <td className="p-2 text-center">
                                      <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                    </td>
                                    <td className="p-2 font-bold text-slate-800">{item.description}</td>
                                    <td className="p-2 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <input type="number" step="0.001" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0.000" value={item.volume === 0 ? "" : (item.volume ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemVolume(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                        <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Ton"}</span>
                                      </div>
                                    </td>
                                    <td className="p-2 text-right">
                                      <input type="number" step="0.001" className="w-20 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0.000" value={item.unitRateUSD === 0 ? "" : (item.unitRateUSD ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemRateUSD(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                    </td>
                                    <td className="p-2 text-right">
                                      <input type="number" step="0.01" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="17140.76" value={item.kursBI === 0 ? "" : (item.kursBI ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemKurs(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                    </td>
                                    <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(Math.round((item.volume || 0) * (item.unitRateUSD || 0) * (item.kursBI || 17140.76)))}</td>
                                  </tr>
                                ))}

                                {/* Section C: Over Distance */}
                                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                                  <td className="p-2 text-center text-slate-400">#</td>
                                  <td className="p-2 underline font-extrabold">C. OVER DISTANCE</td>
                                  <td className="p-2 text-center"></td>
                                  <td className="p-2 text-right"></td>
                                  <td className="p-2 text-right"></td>
                                  <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalC)}</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "C").map(item => {
                                  const baseM = item.baseMtr || 1000;
                                  const diff = (item.overhaulMtr || baseM) - baseM;
                                  return (
                                    <tr key={item.id} className="hover:bg-slate-50 transition">
                                      <td className="p-2 text-center">
                                        <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                      </td>
                                      <td className="p-2 font-bold text-slate-800">
                                        <div>{item.subSection}</div>
                                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono mt-0.5">
                                          <span>Dist:</span>
                                          <input type="number" className="w-16 bg-slate-50 border border-slate-300 font-mono text-[10px] px-1 py-0.5 rounded text-right" placeholder={String(baseM)} value={item.overhaulMtr === 0 ? "" : (item.overhaulMtr ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemOverhaul(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                          <span>m - {baseM}m = {diff}m</span>
                                        </div>
                                      </td>
                                      <td className="p-2 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                          <input type="number" step="0.001" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0.000" value={item.volume === 0 ? "" : (item.volume ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemVolume(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                          <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Bcm"}</span>
                                        </div>
                                      </td>
                                      <td className="p-2 text-right font-mono text-slate-400">-</td>
                                      <td className="p-2 text-right">
                                        <input type="number" step="0.01" className="w-20 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white outline-none" placeholder="0" value={item.unitRateIDR === 0 ? "" : (item.unitRateIDR ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemRateIDR(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                      </td>
                                      <td className="p-2 text-right font-mono font-extrabold text-slate-900">{item.volume && item.unitRateIDR ? formatIDR(Math.round(item.volume * item.unitRateIDR)) : "-"}</td>
                                    </tr>
                                  );
                                })}
                              </>
                            )}

                            {/* SBS CUSTOMER TABLE (Gambar 4 - OB & Jasa Penunjang & Deductions) */}
                            {currentCust === "SBS" && (
                              <>
                                {/* Section OB Removal */}
                                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
                                  <td className="p-2 text-center text-slate-400">#</td>
                                  <td className="p-2 underline font-extrabold">OB REMOVAL (Per Area Kerja)</td>
                                  <td className="p-2 text-center font-mono text-cyan-900">
                                    {invLineItems.filter(i => i.section === "A").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} BCM
                                  </td>
                                  <td className="p-2 text-right"></td>
                                  <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalA)}</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "A").map(item => (
                                  <tr key={item.id} className="hover:bg-slate-50 transition">
                                    <td className="p-2 text-center">
                                      <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                    </td>
                                    <td className="p-2 font-bold text-slate-800">{item.description}</td>
                                    <td className="p-2 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <input type="number" step="0.01" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={item.volume === 0 ? "" : (item.volume ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemVolume(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                        <span className="text-[11px] text-slate-600 font-bold">{item.unit || "BCM"}</span>
                                      </div>
                                    </td>
                                    <td className="p-2 text-right">
                                      <input type="number" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={item.unitRateIDR === 0 ? "" : (item.unitRateIDR ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemRateIDR(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                    </td>
                                    <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(Math.round((item.volume || 0) * (item.unitRateIDR || 0)))}</td>
                                  </tr>
                                ))}

                                {/* Section Jasa Penunjang Produksi */}
                                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                                  <td className="p-2 text-center text-slate-400">#</td>
                                  <td className="p-2 underline font-extrabold">JASA PENUNJANG PRODUKSI (Rental Alat)</td>
                                  <td className="p-2 text-center font-mono text-cyan-900">
                                    {invLineItems.filter(i => i.section === "B").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} Hours
                                  </td>
                                  <td className="p-2 text-right"></td>
                                  <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalB)}</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "B").map(item => (
                                  <tr key={item.id} className="hover:bg-slate-50 transition">
                                    <td className="p-2 text-center">
                                      <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                    </td>
                                    <td className="p-2 font-bold text-slate-800">{item.description}</td>
                                    <td className="p-2 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <input type="number" step="0.01" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={item.volume === 0 ? "" : (item.volume ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemVolume(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                        <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Hours"}</span>
                                      </div>
                                    </td>
                                    <td className="p-2 text-right">
                                      <input type="number" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={item.unitRateIDR === 0 ? "" : (item.unitRateIDR ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemRateIDR(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                    </td>
                                    <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(Math.round((item.volume || 0) * (item.unitRateIDR || 0)))}</td>
                                  </tr>
                                ))}

                                {/* Section P: Pengurang Pembayaran */}
                                <tr className="bg-rose-50 font-extrabold text-rose-900 border-t-2 border-rose-300">
                                  <td className="p-2 text-center text-rose-400">#</td>
                                  <td colSpan={3} className="p-2 underline font-extrabold">PENGURANG PEMBAYARAN (Denda & BBM)</td>
                                  <td className="p-2 text-right font-mono text-rose-900 font-extrabold">({formatIDR(Math.abs(cCalc.subtotalP))})</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "P").map(item => (
                                  <tr key={item.id} className="hover:bg-rose-50/30 transition">
                                    <td className="p-2 text-center">
                                      <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                    </td>
                                    <td colSpan={3} className="p-2 font-medium text-slate-700">{item.description}</td>
                                    <td className="p-2 text-right font-mono">
                                      <input type="number" className="w-36 bg-slate-50 border border-rose-300 font-mono font-extrabold text-rose-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white outline-none" placeholder="0" value={item.amount === 0 ? "" : Math.abs(item.amount)} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemAmount(item.id, -(e.target.value === "" ? 0 : Math.abs(parseFloat(e.target.value)) || 0))} />
                                    </td>
                                  </tr>
                                ))}
                              </>
                            )}

                            {/* POS MINING BASELINE TABLE (Gambar 1) */}
                            {currentCust === "POS" && (
                              <>
                                {/* SECTION A. PRODUCTION / MDO */}
                                {invLineItems.filter(i => i.section === "A").length > 0 && (
                                  <>
                                    <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
                                      <td className="p-2 text-center text-slate-400">#</td>
                                      <td className="p-2 underline">
                                        {formData.customerCode === "POS" && (formData.invoiceCategory === "MDO" || formData.activityGroup?.includes("MDO"))
                                          ? "A. MINE DEVELOPMENT (MDO)"
                                          : "A. PRODUCTION"}
                                      </td>
                                      <td className="p-2 text-center font-mono text-cyan-900">
                                        {formData.customerCode === "POS" && (formData.invoiceCategory === "MDO" || formData.activityGroup?.includes("MDO"))
                                          ? ""
                                          : `${invLineItems.filter(i => i.section === "A").reduce((sum, i) => sum + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} Bcm`
                                        }
                                      </td>
                                      <td className="p-2 text-right"></td>
                                      <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalA)}</td>
                                    </tr>
                                    {invLineItems.filter(i => i.section === "A").map((item, idx) => {
                                      const { unitRate, amount } = calculateItemRateAndAmount(item, "POS");
                                      const cleanDesc = (item.description || "").replace(/^[A-Z][0-9]*[\.\s\-]+\s*/i, "").trim();
                                      return (
                                        <tr key={item.id} className="hover:bg-slate-50 transition">
                                          <td className="p-2 text-center">
                                            <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded" title="Hapus Variable Ini">
                                              <X size={14} />
                                            </button>
                                          </td>
                                          <td className="p-2 font-bold text-slate-800">
                                            <span className="text-cyan-900 font-mono mr-1.5 font-black">{`A${idx + 1}.`}</span>
                                            <span>{cleanDesc}</span>
                                          </td>
                                          <td className="p-2 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                              <input
                                                type="number"
                                                step="0.01"
                                                className="w-28 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                                placeholder="0"
                                                value={item.volume === 0 ? "" : (item.volume ?? "")}
                                                onFocus={(e) => e.target.select()}
                                                onChange={(e) => updateInvItemVolume(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
                                              />
                                              <span className="text-[11px] text-slate-600 font-bold">{item.unit}</span>
                                            </div>
                                          </td>
                                          <td className="p-2 text-right font-mono text-slate-700">{formatIDR(unitRate)}</td>
                                          <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
                                        </tr>
                                      );
                                    })}
                                  </>
                                )}

                                {/* SECTION B. OVER DISTANCE */}
                                {invLineItems.filter(i => i.section === "B").length > 0 && (
                                  <>
                                    <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                                      <td className="p-2 text-center text-slate-400">#</td>
                                      <td className="p-2 underline font-extrabold">B. OVER DISTANCE</td>
                                      <td className="p-2 text-center"></td>
                                      <td className="p-2 text-right"></td>
                                      <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalB)}</td>
                                    </tr>
                                    {invLineItems.filter(i => i.section === "B").map((item, idx) => {
                                      const effVol = getItemEffectiveVolume(item);
                                      const effMtr = getItemEffectiveOverhaulMtr(item);
                                      const { unitRate, amount } = calculateItemRateAndAmount(item, "POS");
                                      const diffMtr = effMtr - 1000;
                                      const cleanDesc = (item.description || "").replace(/^[A-Z][0-9]*[\.\s\-]+\s*/i, "").trim();

                                      return (
                                        <tr key={item.id} className="hover:bg-slate-50 transition">
                                          <td className="p-2 text-center">
                                            <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded" title="Hapus Variable Ini">
                                              <X size={14} />
                                            </button>
                                          </td>
                                          <td className="p-2 font-bold text-slate-800">
                                            <div>
                                              <span className="text-cyan-900 font-mono mr-1.5 font-black">{`B${idx + 1}.`}</span>
                                              <span>{cleanDesc}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-1">
                                              <input
                                                type="number"
                                                className="w-20 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                                placeholder="1000"
                                                value={item.overhaulMtr === 0 ? "" : (item.overhaulMtr ?? "")}
                                                onFocus={(e) => e.target.select()}
                                                onChange={(e) => updateInvItemOverhaul(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
                                              />
                                              <span className="text-[11px] text-slate-600 font-bold">mtr - 1000 mtr = ({diffMtr}) mtr</span>
                                            </div>
                                          </td>
                                          <td className="p-2 text-center">
                                            <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-300 rounded font-mono font-extrabold text-slate-800 text-xs">
                                              <span>{effVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</span>
                                              <span className="text-[11px] text-slate-600 font-bold">{item.unit}</span>
                                            </div>
                                          </td>
                                          <td className="p-2 text-right font-mono text-slate-700">{formatIDR(unitRate)}</td>
                                          <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
                                        </tr>
                                      );
                                    })}
                                  </>
                                )}

                                {/* SECTION C. LAND CLEARING */}
                                {invLineItems.filter(i => i.section === "C").length > 0 && (
                                  <>
                                    <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                                      <td className="p-2 text-center text-slate-400">#</td>
                                      <td className="p-2 underline font-extrabold">C. LAND CLEARING</td>
                                      <td className="p-2 text-center"></td>
                                      <td className="p-2 text-right"></td>
                                      <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalC)}</td>
                                    </tr>
                                    {invLineItems.filter(i => i.section === "C").map((item, idx) => {
                                      const { unitRate, amount } = calculateItemRateAndAmount(item, "POS");
                                      const cleanDesc = (item.description || "").replace(/^[A-Z][0-9]*[\.\s\-]+\s*/i, "").trim();
                                      return (
                                        <tr key={item.id} className="hover:bg-slate-50 transition">
                                          <td className="p-2 text-center">
                                            <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded" title="Hapus Variable Ini">
                                              <X size={14} />
                                            </button>
                                          </td>
                                          <td className="p-2 font-bold text-slate-800">
                                            <span className="text-cyan-900 font-mono mr-1.5 font-black">{`C${idx + 1}.`}</span>
                                            <span>{cleanDesc}</span>
                                          </td>
                                          <td className="p-2 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                              <input
                                                type="number"
                                                step="0.01"
                                                className="w-28 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                                placeholder="0"
                                                value={item.volume === 0 ? "" : (item.volume ?? "")}
                                                onFocus={(e) => e.target.select()}
                                                onChange={(e) => updateInvItemVolume(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
                                              />
                                              <span className="text-[11px] text-slate-600 font-bold">{item.unit}</span>
                                            </div>
                                          </td>
                                          <td className="p-2 text-right font-mono text-slate-700">{formatIDR(unitRate)}</td>
                                          <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
                                        </tr>
                                      );
                                    })}
                                  </>
                                )}

                                {/* SECTION D. RAISE & FALL'S FACTOR */}
                                {invLineItems.filter(i => i.section === "D").length > 0 && (
                                  <>
                                    <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                                      <td className="p-2 text-center text-slate-400">#</td>
                                      <td className="p-2 underline font-extrabold">D. RAISE & FALL'S FACTOR</td>
                                      <td className="p-2 text-center"></td>
                                      <td className="p-2 text-right"></td>
                                      <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalD)}</td>
                                    </tr>
                                    {invLineItems.filter(i => i.section === "D").map((item, idx) => {
                                      const effVol = getItemEffectiveVolume(item);
                                      const { unitRate, amount } = calculateItemRateAndAmount(item, "POS");
                                      const cleanDesc = (item.description || "").replace(/^[A-Z][0-9]*[\.\s\-]+\s*/i, "").trim();

                                      return (
                                        <tr key={item.id} className="hover:bg-slate-50 transition">
                                          <td className="p-2 text-center">
                                            <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded" title="Hapus Variable Ini">
                                              <X size={14} />
                                            </button>
                                          </td>
                                          <td className="p-2 font-bold text-slate-800">
                                            <span className="text-cyan-900 font-mono mr-1.5 font-black">{`D${idx + 1}.`}</span>
                                            <span>{cleanDesc}</span>
                                          </td>
                                          <td className="p-2 text-center">
                                            <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-300 rounded font-mono font-extrabold text-slate-800 text-xs">
                                              <span>{effVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</span>
                                              <span className="text-[11px] text-slate-600 font-bold">{item.unit}</span>
                                            </div>
                                          </td>
                                          <td className="p-2 text-right font-mono text-slate-700">{formatIDR(unitRate)}</td>
                                          <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
                                        </tr>
                                      );
                                    })}
                                  </>
                                )}
                              </>
                            )}
                          </tbody>

                          {/* SUMMARY TOTALS & TAX BREAKDOWN */}
                          <tfoot className="border-t-2 border-slate-800 bg-slate-50 font-bold text-xs">
                            <tr>
                              <td colSpan={currentCust === "DBK" ? 4 : 3} className="p-2.5 text-right font-extrabold uppercase text-slate-800">TOTAL (REVENUE GROSS):</td>
                              <td colSpan={2} className="p-2.5 text-right font-mono text-base font-black text-slate-900">{formatIDR(cCalc.totalGross)}</td>
                            </tr>
                            <tr>
                              <td colSpan={currentCust === "DBK" ? 4 : 3} className="p-2.5 text-right uppercase text-slate-700">DPP PPN 11/12:</td>
                              <td colSpan={2} className="p-2.5 text-right font-mono font-extrabold text-slate-900">{formatIDR(cCalc.dpp11_12)}</td>
                            </tr>
                            <tr>
                              <td colSpan={currentCust === "DBK" ? 4 : 3} className="p-2.5 text-right uppercase text-emerald-800">VAT ( 12% ) (+):</td>
                              <td colSpan={2} className="p-2.5 text-right font-mono font-extrabold text-emerald-700">{formatIDR(cCalc.vat12)}</td>
                            </tr>
                            <tr>
                              <td colSpan={currentCust === "DBK" ? 4 : 3} className="p-2.5 text-right uppercase text-rose-800">WITH HOLDING TAX ART 23 (-):</td>
                              <td colSpan={2} className="p-2.5 text-right font-mono font-extrabold text-rose-700">({formatIDR(cCalc.pph23)})</td>
                            </tr>
                            <tr className="bg-slate-900 text-white font-black text-sm border-t-2 border-slate-900">
                              <td colSpan={currentCust === "DBK" ? 4 : 3} className="p-3 text-right uppercase tracking-wider text-cyan-300">TOTAL INVOICE (NET):</td>
                              <td colSpan={2} className="p-3 text-right font-mono text-lg text-emerald-400">{formatIDR(cCalc.totalInvoice)}</td>
                            </tr>
                            {currentCust === "SBS" && (
                              <tr className="bg-emerald-800 text-white font-black text-base border-t-2 border-emerald-950">
                                <td colSpan={3} className="p-3 text-right uppercase tracking-wider text-emerald-200">TOTAL DIBAYAR (NET AFTER DEDUCTIONS):</td>
                                <td colSpan={2} className="p-3 text-right font-mono text-xl text-white underline">{formatIDR(cCalc.totalDibayar)}</td>
                              </tr>
                            )}
                          </tfoot>
                        </table>
                      </div>
                    );
                  })()}

                  {/* Helper legend footer */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-1">
                    <span className="text-[11px] text-slate-500 font-medium">
                      * Pilih customer di atas untuk berganti otomatis format dan urutan field SOW (POS, BGG, DBK, SBS). Kolom tabel & perhitungan otomatis menyesuaikan.
                    </span>
                  </div>
                </div>
              )}

              {/* ================= DEDICATED MODAL INPUT PENDING VOLUME ================= */}
              {modalType === "pending_volume" && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-2xs">
                    <div>
                      <h4 className="text-xs font-black uppercase text-indigo-950 tracking-wider flex items-center gap-2">
                        <Scale size={16} className="text-indigo-700" /> Pencatatan Pending Volume (Over Kontrak / Stripping Ratio)
                      </h4>
                      <p className="text-[11px] text-indigo-900 font-medium mt-0.5">
                        Pencatatan pengerjaan material Top Soil & Overburden (OB) yang melebihi batas rasio kontrak terhadap Coal. Selisih volume di-pending untuk masuk penagihan invoice berikutnya.
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-indigo-100 border border-indigo-300 text-indigo-900 font-extrabold text-[11px] shrink-0">
                      Carry Over Invoice
                    </span>
                  </div>

                  {/* Info Box Rasio Kontrak Customer */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] space-y-1.5">
                    <div className="font-extrabold text-slate-900 uppercase flex items-center gap-1.5">
                      <Info size={13} className="text-indigo-700" /> Kesepakatan Rasio Kontrak ({formData.customerCode || "POS"}):
                    </div>
                    <div className="text-slate-600 font-medium pl-4">
                      {formData.customerCode === "BGG" ? (
                        <span>Kontrak BGG: Perbandingan Top Soil & Overburden adalah maksimal <strong>3.0 BCM / 1 Ton Coal (3 : 1)</strong>. Nilai coal 1 Ton dengan nilai top soil dan overburden maksimal 3 Bcm kontraknya. Kelebihan volume pengerjaan di-pending ke invoice selanjutnya.</span>
                      ) : formData.customerCode === "DBK" ? (
                        <span>Kontrak DBK: Perbandingan Overburden maksimal <strong>3.5 BCM / 1 Ton Coal</strong>. Selisih volume over-ratio di-carry over.</span>
                      ) : formData.customerCode === "POS" ? (
                        <span>Kontrak POS: Perbandingan Waste/OB & Top Soil maksimal <strong>4.0 BCM / 1 Ton Ore</strong>. Selisih kuota masuk ke Pending Volume.</span>
                      ) : formData.customerCode === "SBS" ? (
                        <span>Kontrak SBS: Perbandingan OB maksimal <strong>3.0 BCM / 1 Ton Coal</strong>. Volume over-contract dicatat sebagai pending volume.</span>
                      ) : (
                        <span>Kontrak Standar: Rasio Top Soil & OB maksimal <strong>3.0 BCM / 1 Ton Coal (3 : 1)</strong>.</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Customer Code <span className="text-rose-600">*</span>
                      </label>
                      <select
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:border-indigo-600 focus:bg-white outline-none text-xs"
                        value={formData.customerCode || "POS"}
                        onChange={(e) => setFormData({ ...formData, customerCode: e.target.value })}
                        required
                      >
                        <option value="POS">POS - PT Position</option>
                        <option value="BGG">BGG - PT Budi Gema Gempita (Rasio 3:1)</option>
                        <option value="SBS">SBS - PT Satria Bahana Sarana (Rasio 3:1)</option>
                        <option value="DBK">DBK - PT Daya Bumindo Karunia (Rasio 3.5:1)</option>
                        <option value="ABN">ABN - PT Andalan Bhumi Nusantara (Rasio 3:1)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Periode Pekerjaan <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="month"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:border-indigo-600 focus:bg-white outline-none text-xs"
                        value={formatMonthInput(formData.workPeriod || "Juni 2026")}
                        onChange={(e) => {
                          const mVal = e.target.value;
                          const formattedLabel = formatMonthLabel(mVal);
                          setFormData({ ...formData, workPeriod: formattedLabel });
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <RupiahInput
                        label="Estimasi Nominal Pending Volume (Rp)"
                        value={formData.workAmount || 0}
                        onChange={(val) => setFormData({ ...formData, workAmount: val })}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        PIC / Tim Joint Survey
                      </label>
                      <input
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-indigo-600 focus:bg-white outline-none text-xs"
                        placeholder="Surveyor Site / Mine Engineer"
                        value={formData.picAAP || ""}
                        onChange={(e) => setFormData({ ...formData, picAAP: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Catatan / Keterangan Pending Volume (Selisih Stripping Ratio)
                    </label>
                    <textarea
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 text-xs focus:border-indigo-600 focus:bg-white outline-none"
                      rows={2}
                      placeholder="Contoh: Pending volume selisih Top Soil & Overburden over-contract ratio (3:1) untuk carry-over ke invoice berikutnya..."
                      value={formData.notes || ""}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* ================= MODAL BA TRACKER (UNIFIED WIDESCREEN DUAL-MODE WORKFLOW) ================= */}
              {modalType === "ba" && (() => {
                const isCustomerBGG = (formData.customerCode === "BGG" || formData.customerCode === "PT BGG");

                const allBAItems = [...baOperatingItems, ...baMDOItems];

                const isDistanceItem = (item: any) => {
                  if (!item) return false;
                  return Boolean(
                    item.isDistanceVar || 
                    item.category === "Over Distance" || 
                    (item.material && (
                      item.material.toLowerCase().includes("overhaul") || 
                      item.material.toLowerCase().includes("over distance") ||
                      item.material.toLowerCase().includes("distance")
                    ))
                  );
                };

                const getBAEffectiveVolume = (item: any, allItems: any[], isSurvey: boolean = false) => {
                  if (isDistanceItem(item)) {
                    const parent = allItems.find(p => {
                      if (p.id === item.id) return false;
                      if (isDistanceItem(p)) return false;
                      if (item.parentMaterial) return p.material === item.parentMaterial;
                      const mLow = (item.material || "").toLowerCase();
                      const pLow = (p.material || "").toLowerCase();
                      if (mLow.includes("ob") || mLow.includes("waste") || mLow.includes("overburden")) return pLow.includes("ob") || pLow.includes("waste") || pLow.includes("overburden");
                      if (mLow.includes("coal") || mLow.includes("batubara")) return pLow.includes("coal") || pLow.includes("batubara");
                      if (mLow.includes("top soil")) return pLow.includes("top soil");
                      if (mLow.includes("limonite")) return pLow.includes("limonite");
                      if (mLow.includes("saprolite")) return pLow.includes("saprolite");
                      return false;
                    });
                    if (parent) {
                      return isSurvey ? Number(parent.adjustedVolume ?? parent.initialVolume ?? 0) : Number(parent.initialVolume || 0);
                    }
                  }
                  return isSurvey ? Number(item.adjustedVolume ?? item.initialVolume ?? 0) : Number(item.initialVolume || 0);
                };

                const getBAItemSubtotal = (item: any, volume: number) => {
                  const r = Number(item.rate || 0);
                  if (isDistanceItem(item)) {
                    if (item.unit === "Bcm.Hm" || item.material?.toLowerCase().includes("ob removal") || item.material?.toLowerCase().includes("hm")) {
                      const hm = Number(item.distanceWeightAvg || 0);
                      return Math.round(volume * hm * r);
                    }
                    if (item.material?.toLowerCase().includes("over/underhaul") || item.material?.toLowerCase().includes("overhaul")) {
                      const dist = Number(item.distanceWeightAvg ?? 1000);
                      const diff100 = (dist - 1000) / 100;
                      return Math.round(volume * diff100 * r);
                    }
                  }
                  return Math.round(volume * r);
                };

                const sumInitial = allBAItems.reduce((acc, it) => acc + getBAItemSubtotal(it, getBAEffectiveVolume(it, allBAItems, false)), 0);
                const sumAdjusted = allBAItems.reduce((acc, it) => acc + getBAItemSubtotal(it, getBAEffectiveVolume(it, allBAItems, true)), 0);
                const deltaAmount = sumAdjusted - sumInitial;

                return (
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    {/* KOLOM KIRI (LEBAR ~70%-75% / xl:col-span-8 2xl:col-span-9): Workflow Stepper, SOW Tables, Survey & Signatures */}
                    <div className="xl:col-span-8 2xl:col-span-9 space-y-4 border-b xl:border-b-0 xl:border-r border-slate-200 pb-6 xl:pb-0 xl:pr-6">
                      
                      {/* Stepper Navigation Bar */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => setActiveBAStep(1)}
                          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg transition ${activeBAStep === 1 ? "bg-cyan-800 text-white shadow-xs font-extrabold" : "text-slate-600 hover:bg-slate-200"}`}
                        >
                          <Layers size={13} />
                          <span>1. SOW Operasi & Volume</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveBAStep(2)}
                          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg transition ${activeBAStep === 2 ? "bg-cyan-800 text-white shadow-xs font-extrabold" : "text-slate-600 hover:bg-slate-200"}`}
                        >
                          <Calculator size={13} />
                          <span>2. Survey & Delta BA</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveBAStep(3)}
                          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg transition ${activeBAStep === 3 ? "bg-cyan-800 text-white shadow-xs font-extrabold" : "text-slate-600 hover:bg-slate-200"}`}
                        >
                          <UserCheck size={13} />
                          <span>3. Tanda Tangan & Final</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveBAStep(4)}
                          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg transition ${activeBAStep === 4 ? "bg-cyan-800 text-white shadow-xs font-extrabold" : "text-slate-600 hover:bg-slate-200"}`}
                        >
                          <History size={13} />
                          <span>4. Jejak Audit & Flow</span>
                        </button>
                      </div>

                      {/* Header Info Strip: Customer, Periode, PIC */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        {isInlineEditingBA ? (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                                Customer / Project <span className="text-rose-600">*</span>
                              </label>
                              <select
                                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-bold focus:border-cyan-700 outline-none"
                                value={formData.customerCode || "POS"}
                                onChange={(e) => {
                                  const code = e.target.value;
                                  const isBGG = code === "BGG" || code === "PT BGG";
                                  setFormData({ ...formData, customerCode: code });
                                  if (isBGG) {
                                    setBaOperatingItems(defaultBGGBAItems);
                                    setBaMDOItems([]);
                                  } else {
                                    setBaOperatingItems(defaultPOSBAOperatingItems);
                                    setBaMDOItems(defaultPOSBAMDOItems);
                                  }
                                }}
                                required
                              >
                                <option value="POS">POS â€“ PT Position / Paramitha</option>
                                <option value="SBS">SBS â€“ PT Sumber Bara Sejahtera</option>
                                <option value="BGG">BGG â€“ PT Budi Gema Gempita</option>
                                <option value="DBK">DBK â€“ PT Dayabumi Kencana</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                                Periode Pekerjaan <span className="text-rose-600">*</span>
                              </label>
                              <input
                                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 text-xs focus:border-cyan-700 outline-none"
                                placeholder="June 2026 / Juni 2026"
                                value={formData.workPeriod || ""}
                                onChange={(e) => setFormData({ ...formData, workPeriod: e.target.value })}
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                                PIC Site AAP
                              </label>
                              <input
                                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 text-xs focus:border-cyan-700 outline-none"
                                placeholder="Operations / Site Engineer"
                                value={formData.picAAP || ""}
                                onChange={(e) => setFormData({ ...formData, picAAP: e.target.value })}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-slate-800">
                            <div><span className="text-slate-500 block font-bold text-[10px] uppercase">Customer</span> <strong className="text-slate-900 font-bold">{formData.customerCode || "POS"}</strong></div>
                            <div><span className="text-slate-500 block font-bold text-[10px] uppercase">Periode</span> <strong className="text-slate-800">{formData.workPeriod || "-"}</strong></div>
                            <div><span className="text-slate-500 block font-bold text-[10px] uppercase">PIC Site</span> <strong className="text-slate-800">{formData.picAAP || "-"}</strong></div>
                          </div>
                        )}
                      </div>

                      {/* STEP 1: SOW Operasional & MDO */}
                      {activeBAStep === 1 && (() => {
                        const coalItem1 = allBAItems.find(it => (it.material || "").toLowerCase().includes("coal") || (it.material || "").toLowerCase().includes("batubara"));
                        const obItems1 = allBAItems.filter(it => !isDistanceItem(it) && ((it.material || "").toLowerCase().includes("ob") || (it.material || "").toLowerCase().includes("overburden") || (it.material || "").toLowerCase().includes("waste") || (it.material || "").toLowerCase().includes("top soil")));
                        const coalVolStep1 = coalItem1 ? Number(coalItem1.initialVolume || 0) : 0;
                        const obVolStep1 = obItems1.reduce((sum, it) => sum + Number(it.initialVolume || 0), 0);
                        const srStep1 = coalVolStep1 > 0 ? (obVolStep1 / coalVolStep1) : 0;
                        const maxQuotaOB1 = coalVolStep1 * 3.0;
                        const excessOB1 = obVolStep1 > maxQuotaOB1 ? (obVolStep1 - maxQuotaOB1) : 0;

                        return (
                          <div className="space-y-4">
                            {/* Stripping Ratio 3:1 SOW Quota Live Indicator for BGG */}
                            {isCustomerBGG && coalVolStep1 > 0 && (
                              <div className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${excessOB1 > 0 ? "bg-amber-50/90 border-amber-300 text-amber-950" : "bg-emerald-50/90 border-emerald-300 text-emerald-950"}`}>
                                <Scale className={excessOB1 > 0 ? "text-amber-700 shrink-0 mt-0.5" : "text-emerald-700 shrink-0 mt-0.5"} size={18} />
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <strong className="font-extrabold uppercase tracking-wide">
                                      Validasi Kuota Stripping Ratio Kontrak SOW (Maks. 3.0 : 1)
                                    </strong>
                                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${excessOB1 > 0 ? "bg-amber-200 text-amber-900 border border-amber-400" : "bg-emerald-200 text-emerald-900 border border-emerald-400"}`}>
                                      SR Aktual: {srStep1.toFixed(2)} : 1
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                                    <div>Coal: <strong>{coalVolStep1.toLocaleString('id-ID', {minimumFractionDigits: 2})} Ton</strong></div>
                                    <div>Kapasitas Kuota OB (3x): <strong>{maxQuotaOB1.toLocaleString('id-ID', {minimumFractionDigits: 2})} BCM</strong></div>
                                    <div>Volume OB Aktual: <strong>{obVolStep1.toLocaleString('id-ID', {minimumFractionDigits: 2})} BCM</strong></div>
                                  </div>
                                  {excessOB1 > 0 ? (
                                    <div className="text-[11px] text-amber-900 font-bold bg-amber-100/90 p-2 rounded-lg mt-1 border border-amber-200">
                                      âš ï¸ Volume OB melebihi kuota kontrak sebesar <strong>{excessOB1.toLocaleString('id-ID', {minimumFractionDigits: 2})} BCM</strong>. Volume kelebihan ini otomatis dialokasikan ke <strong>Pending Volume (Carry-Forward)</strong> dan akan diserap saat ada sisa kuota di invoice berikutnya.
                                    </div>
                                  ) : (
                                    <div className="text-[11px] text-emerald-900 font-semibold bg-emerald-100/80 p-1.5 rounded-lg mt-1 border border-emerald-200">
                                      âœ… Volume OB berada di dalam kuota kontrak SOW ({srStep1.toFixed(2)} â‰¤ 3.0). Seluruh volume siap ditagihkan penuh.
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Tabel 1: Operating & Mining */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase text-cyan-900 flex items-center gap-1.5">
                                  <Pickaxe size={14} className="text-cyan-700" /> {isCustomerBGG ? "Kategori: Penambangan Batubara & OB Removal (BGG)" : "Kategori 1: Operating & Mining"}
                                </span>
                                {isInlineEditingBA && (
                                  <div className="relative inline-block text-left">
                                    <button
                                      type="button"
                                      onClick={() => setShowAddRowDropdown(!showAddRowDropdown)}
                                      className="text-[11px] font-bold text-cyan-800 bg-cyan-100 hover:bg-cyan-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer border border-cyan-300 shadow-2xs"
                                    >
                                      <Plus size={13} />
                                      <span>Tambah Baris</span>
                                      <ChevronDown size={12} className={`transition-transform duration-200 ${showAddRowDropdown ? "rotate-180" : ""}`} />
                                    </button>

                                    {showAddRowDropdown && (
                                      <div 
                                        className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-1 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100"
                                        onMouseLeave={() => setShowAddRowDropdown(false)}
                                      >
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setBaOperatingItems([...baOperatingItems, {
                                              id: `op_${Date.now()}`,
                                              category: "Operating & Mining",
                                              area: isCustomerBGG ? "Pit KKL" : "WM1",
                                              material: "",
                                              unit: "BCM",
                                              initialVolume: 0,
                                              adjustedVolume: 0,
                                              rate: 0,
                                              subtotalInitial: 0,
                                              subtotalAdjusted: 0
                                            }]);
                                            setShowAddRowDropdown(false);
                                          }}
                                          className="w-full text-left px-3.5 py-2.5 text-xs text-slate-800 hover:bg-cyan-50 hover:text-cyan-950 font-bold flex items-center gap-2.5 transition cursor-pointer"
                                        >
                                          <div className="w-6 h-6 rounded-lg bg-cyan-100 flex items-center justify-center text-cyan-800 shrink-0">
                                            <Pickaxe size={13} />
                                          </div>
                                          <div>
                                            <div className="font-bold">Variabel Material</div>
                                            <div className="text-[10px] text-slate-500 font-normal">Volume Produksi Batubara / OB / Tanah</div>
                                          </div>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setBaOperatingItems([...baOperatingItems, {
                                              id: `dist_${Date.now()}`,
                                              category: "Over Distance",
                                              area: isCustomerBGG ? "Pit KKL" : "WM1",
                                              material: "",
                                              unit: isCustomerBGG ? "Bcm.Hm" : "BCM",
                                              parentMaterial: "",
                                              distanceWeightAvg: isCustomerBGG ? 0 : 1000,
                                              initialVolume: 0,
                                              adjustedVolume: 0,
                                              rate: 0,
                                              isDistanceVar: true,
                                              subtotalInitial: 0,
                                              subtotalAdjusted: 0
                                            }]);
                                            setShowAddRowDropdown(false);
                                          }}
                                          className="w-full text-left px-3.5 py-2.5 text-xs text-slate-800 hover:bg-amber-50 hover:text-amber-950 font-bold flex items-center gap-2.5 transition cursor-pointer"
                                        >
                                          <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
                                            <Layers size={13} />
                                          </div>
                                          <div>
                                            <div className="font-bold">Variabel Distance</div>
                                            <div className="text-[10px] text-slate-500 font-normal">Jarak Hauling & Over/Underhaul</div>
                                          </div>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
                              <table className="w-full text-xs text-left">
                                <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px]">
                                  <tr>
                                    <th className="p-2.5 w-24">Area / Lokasi</th>
                                    <th className="p-2.5 min-w-[200px]">Material / Pekerjaan (Master SOW)</th>
                                    <th className="p-2.5 text-center w-18">Satuan</th>
                                    <th className="p-2.5 text-right w-28">Volume Awal</th>
                                    <th className="p-2.5 text-right w-28">SOW Rate (Rp)</th>
                                    <th className="p-2.5 text-right w-32">Subtotal (Rp)</th>
                                    {isInlineEditingBA && <th className="p-2.5 text-center w-10">#</th>}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {baOperatingItems.map((item, idx) => {
                                    const isDistance = isDistanceItem(item);
                                    const effVol = getBAEffectiveVolume(item, allBAItems, false);
                                    const subtotal = getBAItemSubtotal(item, effVol);

                                    return (
                                      <tr key={item.id || idx} className={`hover:bg-slate-50/80 transition ${isDistance ? "bg-amber-50/20" : ""}`}>
                                        <td className="p-2.5 font-bold text-slate-800 align-top">
                                          {!isInlineEditingBA ? (
                                            <span className="pt-1 block">{item.area || (isCustomerBGG ? "Pit KKL" : "WM1")}</span>
                                          ) : (
                                            <input
                                              className="w-20 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-bold focus:border-cyan-700 outline-none"
                                              value={item.area || ""}
                                              placeholder={isCustomerBGG ? "Pit KKL" : "WM1"}
                                              onChange={(e) => {
                                                const updated = [...baOperatingItems];
                                                updated[idx].area = e.target.value;
                                                setBaOperatingItems(updated);
                                              }}
                                            />
                                          )}
                                        </td>
                                        <td className="p-2.5 font-medium text-slate-900 align-top">
                                          {!isDistance ? (
                                            !isInlineEditingBA ? (
                                              <span className="font-bold text-slate-900 pt-1 block">{item.material || "-"}</span>
                                            ) : (
                                              <input
                                                className="w-full bg-cyan-50/50 border border-cyan-300 rounded px-2 py-1 text-xs font-bold text-slate-900 focus:border-cyan-700 outline-none"
                                                value={item.material || ""}
                                                placeholder="Nama Material (e.g. Volume OB)..."
                                                onChange={(e) => {
                                                  const updated = [...baOperatingItems];
                                                  updated[idx].material = e.target.value;
                                                  setBaOperatingItems(updated);
                                                }}
                                              />
                                            )
                                          ) : (
                                            <div>
                                              {!isInlineEditingBA ? (
                                                <div className="font-bold text-slate-900 pt-0.5">{item.material || "Distance / Overhaul"}</div>
                                              ) : (
                                                <input
                                                  className="w-full bg-amber-50/50 border border-amber-300 rounded px-2 py-1 text-xs font-bold text-slate-900 focus:border-amber-700 outline-none mb-1"
                                                  value={item.material || ""}
                                                  placeholder="Nama Variabel Distance (e.g. Distance OB Removal)..."
                                                  onChange={(e) => {
                                                    const updated = [...baOperatingItems];
                                                    updated[idx].material = e.target.value;
                                                    setBaOperatingItems(updated);
                                                  }}
                                                />
                                              )}
                                              <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono text-slate-700 whitespace-nowrap bg-amber-50/80 border border-amber-200 px-2 py-1 rounded-md w-fit">
                                                {isCustomerBGG ? (
                                                  <>
                                                    <span className="font-bold text-amber-900">Jarak (Hm):</span>
                                                    {!isInlineEditingBA ? (
                                                      <span className="font-bold text-slate-900 bg-white border border-amber-300 px-1.5 py-0.5 rounded font-mono">{item.distanceWeightAvg || 0} Hm</span>
                                                    ) : (
                                                      <input
                                                        type="number"
                                                        step="0.001"
                                                        className="w-18 bg-white border border-amber-300 rounded px-1.5 py-0.5 text-right font-mono font-bold text-amber-950 text-xs focus:border-amber-600 outline-none"
                                                        placeholder="0.000"
                                                        value={item.distanceWeightAvg === 0 ? "" : (item.distanceWeightAvg ?? "")}
                                                        onFocus={(e) => e.target.select()}
                                                        onChange={(e) => {
                                                          const updated = [...baOperatingItems];
                                                          updated[idx].distanceWeightAvg = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0;
                                                          setBaOperatingItems(updated);
                                                        }}
                                                      />
                                                    )}
                                                    <span>Hm</span>
                                                  </>
                                                ) : (
                                                  <>
                                                    <span className="font-medium text-slate-600">Jarak:</span>
                                                    {!isInlineEditingBA ? (
                                                      <span className="font-bold text-slate-900">{item.distanceWeightAvg || 1000} mtr - 1000 mtr = ({Number(item.distanceWeightAvg || 1000) - 1000}) mtr</span>
                                                    ) : (
                                                      <>
                                                        <input
                                                          type="number"
                                                          className="w-16 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-right font-mono font-bold text-slate-900 text-xs focus:border-cyan-700 outline-none"
                                                          placeholder="1000"
                                                          value={item.distanceWeightAvg === 0 ? "" : (item.distanceWeightAvg ?? "")}
                                                          onFocus={(e) => e.target.select()}
                                                          onChange={(e) => {
                                                            const updated = [...baOperatingItems];
                                                            updated[idx].distanceWeightAvg = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0;
                                                            setBaOperatingItems(updated);
                                                          }}
                                                        />
                                                        <span className="text-slate-600 font-sans">mtr - 1000 mtr = <strong className="font-mono text-cyan-900">({Number(item.distanceWeightAvg || 1000) - 1000}) mtr</strong></span>
                                                      </>
                                                    )}
                                                  </>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </td>
                                        <td className="p-2.5 text-center font-mono font-bold text-slate-800 align-top">
                                          {!isInlineEditingBA ? (
                                            <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs inline-block text-center min-w-[45px] mt-0.5">
                                              {item.unit || "BCM"}
                                            </span>
                                          ) : (
                                            <input
                                              className="w-16 bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-xs font-mono font-bold text-center focus:border-cyan-700 outline-none"
                                              value={item.unit || ""}
                                              placeholder="BCM"
                                              onChange={(e) => {
                                                const updated = [...baOperatingItems];
                                                updated[idx].unit = e.target.value;
                                                setBaOperatingItems(updated);
                                              }}
                                            />
                                          )}
                                        </td>
                                        <td className="p-2.5 text-right font-mono align-top">
                                          {!isDistance ? (
                                            !isInlineEditingBA ? (
                                              <span className="font-bold text-slate-900 pt-1 block">{item.initialVolume ? Number(item.initialVolume).toLocaleString("id-ID", { minimumFractionDigits: 3 }) : "0.000"}</span>
                                            ) : (
                                              <input
                                                type="number"
                                                step="0.001"
                                                className="w-24 bg-white border border-slate-300 rounded px-2 py-1 text-right font-mono font-bold text-xs focus:border-cyan-700 outline-none"
                                                value={item.initialVolume ? item.initialVolume : ""}
                                                placeholder="0.000"
                                                onFocus={(e) => e.target.select()}
                                                onChange={(e) => {
                                                  const updated = [...baOperatingItems];
                                                  const val = parseFloat(e.target.value) || 0;
                                                  updated[idx].initialVolume = val;
                                                  updated[idx].adjustedVolume = val;
                                                  setBaOperatingItems(updated);
                                                }}
                                              />
                                            )
                                          ) : (
                                            <div className="flex flex-col items-end pt-0.5">
                                              <div className="px-2.5 py-1 bg-amber-50/90 border border-amber-300 rounded font-mono font-black text-amber-950 text-xs shadow-2xs">
                                                {effVol.toLocaleString("id-ID", { minimumFractionDigits: 3 })}
                                              </div>
                                              <span className="text-[9px] text-amber-800 font-semibold italic mt-0.5 whitespace-nowrap">
                                                Auto-sync {item.parentMaterial ? item.parentMaterial.replace("Volume ", "") : "Produksi"}
                                              </span>
                                            </div>
                                          )}
                                        </td>
                                        <td className="p-2.5 text-right font-mono align-top">
                                          {!isInlineEditingBA ? (
                                            <span className="pt-1 block">{formatIDR(item.rate || 0)}</span>
                                          ) : (
                                            <input
                                              type="number"
                                              className="w-24 bg-slate-50 hover:bg-white border border-slate-300 rounded px-2 py-1 text-right font-mono font-bold text-xs focus:border-cyan-700 outline-none"
                                              value={item.rate === 0 ? "" : (item.rate ?? "")}
                                              placeholder="0"
                                              onFocus={(e) => e.target.select()}
                                              onChange={(e) => {
                                                const updated = [...baOperatingItems];
                                                updated[idx].rate = parseFloat(e.target.value) || 0;
                                                setBaOperatingItems(updated);
                                              }}
                                            />
                                          )}
                                        </td>
                                        <td className="p-2.5 text-right font-mono font-extrabold text-slate-900 align-top">
                                          <div className="pt-1">{formatIDR(subtotal)}</div>
                                        </td>
                                        {isInlineEditingBA && (
                                          <td className="p-2.5 text-center align-top">
                                            <div className="pt-0.5">
                                              <button
                                                type="button"
                                                onClick={() => setBaOperatingItems(baOperatingItems.filter((_, i) => i !== idx))}
                                                className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                                              >
                                                <Trash2 size={13} />
                                              </button>
                                            </div>
                                          </td>
                                        )}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Tabel 2: MDO (Hanya jika Customer bukan BGG / untuk POS) */}
                          {!isCustomerBGG && (
                            <div className="space-y-2 pt-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase text-indigo-900 flex items-center gap-1.5">
                                  <Building2 size={14} className="text-indigo-700" /> Kategori 2: Mine Development Operation (MDO)
                                </span>
                                {isInlineEditingBA && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const defMdo = activeSOWCatalog.find(s => s.category === "MDO") || activeSOWCatalog[activeSOWCatalog.length - 1];
                                      setBaMDOItems([...baMDOItems, {
                                        id: `mdo_${Date.now()}`,
                                        category: "MDO",
                                        area: "Site POS",
                                        material: defMdo.name,
                                        unit: defMdo.unit,
                                        initialVolume: 0,
                                        adjustedVolume: 0,
                                        rate: defMdo.defaultRate,
                                        subtotalInitial: 0,
                                        subtotalAdjusted: 0
                                      }]);
                                    }}
                                    className="text-[11px] font-bold text-cyan-800 bg-cyan-100 hover:bg-cyan-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer"
                                  >
                                    <Plus size={13} /> Tambah Baris MDO
                                  </button>
                                )}
                              </div>

                              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
                                <table className="w-full text-xs text-left">
                                  <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px]">
                                    <tr>
                                      <th className="p-2">Area / Lokasi</th>
                                      <th className="p-2 min-w-[180px]">Material / Pekerjaan MDO (Master SOW)</th>
                                      <th className="p-2 text-center">Satuan</th>
                                      <th className="p-2 text-right">Volume Awal</th>
                                      <th className="p-2 text-right">SOW Rate (Rp)</th>
                                      <th className="p-2 text-right">Subtotal (Rp)</th>
                                      {isInlineEditingBA && <th className="p-2 text-center">#</th>}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {baMDOItems.map((item, idx) => (
                                      <tr key={item.id || idx} className="hover:bg-slate-50/80 transition">
                                        <td className="p-2 font-bold text-slate-800">
                                          {!isInlineEditingBA ? (item.area || "Site POS") : (
                                            <input
                                              className="w-20 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-bold focus:border-cyan-700 outline-none"
                                              value={item.area || ""}
                                              placeholder="Site POS"
                                              onChange={(e) => {
                                                const updated = [...baMDOItems];
                                                updated[idx].area = e.target.value;
                                                setBaMDOItems(updated);
                                              }}
                                            />
                                          )}
                                        </td>
                                        <td className="p-2 font-medium text-slate-900">
                                          {!isInlineEditingBA ? (
                                            <span className="font-bold text-slate-900">{item.material}</span>
                                          ) : (
                                            <select
                                              className="w-full bg-indigo-50/50 border border-indigo-300 rounded px-2 py-1 text-xs font-bold text-slate-900 focus:border-indigo-700 outline-none"
                                              value={item.material || "Mine Development (MDO) - Clearing & Access Road"}
                                              onChange={(e) => {
                                                const matName = e.target.value;
                                                const sow = activeSOWCatalog.find(s => s.name === matName);
                                                const updated = [...baMDOItems];
                                                updated[idx].material = matName;
                                                if (sow) {
                                                  updated[idx].unit = sow.unit;
                                                  updated[idx].rate = sow.defaultRate;
                                                }
                                                const vol = Number(updated[idx].initialVolume || 0);
                                                const r = Number(updated[idx].rate || 0);
                                                updated[idx].subtotalInitial = Math.round(vol * r);
                                                updated[idx].subtotalAdjusted = Math.round(Number(updated[idx].adjustedVolume || vol) * r);
                                                setBaMDOItems(updated);
                                              }}
                                            >
                                              {activeSOWCatalog.filter(s => s.category === "MDO").map(sow => (
                                                <option key={sow.name} value={sow.name}>
                                                  {sow.name}
                                                </option>
                                              ))}
                                              {!activeSOWCatalog.some(s => s.name === item.material) && item.material && (
                                                <option value={item.material}>{item.material}</option>
                                              )}
                                            </select>
                                          )}
                                        </td>
                                        <td className="p-2 text-center font-mono font-bold text-slate-800">
                                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-xs inline-block text-center min-w-[45px]">
                                            {item.unit || "Ha"}
                                          </span>
                                        </td>
                                        <td className="p-2 text-right font-mono">
                                          {!isInlineEditingBA ? (
                                            <span className="font-bold text-slate-900">{item.initialVolume ? item.initialVolume.toLocaleString("id-ID") : "0"}</span>
                                          ) : (
                                            <input
                                              type="number"
                                              step="0.01"
                                              className="w-24 bg-white border border-slate-300 rounded px-2 py-1 text-right font-mono font-bold text-xs focus:border-cyan-700 outline-none"
                                              value={item.initialVolume ? item.initialVolume : ""}
                                              placeholder="0.00"
                                              onChange={(e) => {
                                                const updated = [...baMDOItems];
                                                const val = parseFloat(e.target.value) || 0;
                                                updated[idx].initialVolume = val;
                                                updated[idx].adjustedVolume = val;
                                                const r = Number(updated[idx].rate || 0);
                                                updated[idx].subtotalInitial = Math.round(val * r);
                                                updated[idx].subtotalAdjusted = Math.round(val * r);
                                                setBaMDOItems(updated);
                                              }}
                                            />
                                          )}
                                        </td>
                                        <td className="p-2 text-right font-mono">
                                          {!isInlineEditingBA ? (
                                            <span>{formatIDR(item.rate || 0)}</span>
                                          ) : (
                                            <input
                                              type="number"
                                              className="w-24 bg-slate-50 hover:bg-white border border-slate-300 rounded px-2 py-1 text-right font-mono font-bold text-xs focus:border-cyan-700 outline-none"
                                              value={item.rate === 0 ? "" : (item.rate ?? "")}
                                              placeholder="0"
                                              onChange={(e) => {
                                                const updated = [...baMDOItems];
                                                const r = parseFloat(e.target.value) || 0;
                                                updated[idx].rate = r;
                                                const vol = Number(updated[idx].initialVolume || 0);
                                                updated[idx].subtotalInitial = Math.round(vol * r);
                                                updated[idx].subtotalAdjusted = Math.round(Number(updated[idx].adjustedVolume || vol) * r);
                                                setBaMDOItems(updated);
                                              }}
                                            />
                                          )}
                                        </td>
                                        <td className="p-2 text-right font-mono font-extrabold text-emerald-800">
                                          {formatIDR(Math.round((Number(item.initialVolume) || 0) * (Number(item.rate) || 0)))}
                                        </td>
                                        {isInlineEditingBA && (
                                          <td className="p-2 text-center">
                                            <button
                                              type="button"
                                              onClick={() => setBaMDOItems(baMDOItems.filter((_, i) => i !== idx))}
                                              className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                                            >
                                              <Trash2 size={13} />
                                            </button>
                                          </td>
                                        )}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Estimasi Unbilled Revenue Box */}
                          <div className="bg-slate-900 text-emerald-400 p-3.5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border border-slate-800 shadow-md">
                            <div>
                              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                                Estimasi Nilai Pengakuan Awal (Unbilled Revenue):
                              </div>
                              <div className="text-[10px] text-cyan-300">
                                Akun: (Dr) 11300 Pendapatan Belum Ditagih / (Cr) 41100 Pendapatan Operasional
                              </div>
                            </div>
                            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                              {formatIDR(sumInitial)}
                            </div>
                          </div>

                          {/* Navigation Buttons */}
                          <div className="flex justify-end pt-2">
                            <button
                              type="button"
                              onClick={() => setActiveBAStep(2)}
                              className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white font-bold rounded-xl flex items-center gap-1.5 transition text-xs shadow-xs cursor-pointer"
                            >
                              <span>Lanjut ke Step 2 (Hasil Survey & Draft BA)</span>
                              <ArrowRight size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* STEP 2: Survey Lapangan & Delta Selisih (UNIFIED FOR POS & BGG) */}
                    {activeBAStep === 2 && (() => {
                      const coalItem2 = allBAItems.find(it => (it.material || "").toLowerCase().includes("coal") || (it.material || "").toLowerCase().includes("batubara"));
                      const obItems2 = allBAItems.filter(it => !isDistanceItem(it) && ((it.material || "").toLowerCase().includes("ob") || (it.material || "").toLowerCase().includes("overburden") || (it.material || "").toLowerCase().includes("waste") || (it.material || "").toLowerCase().includes("top soil")));
                      const coalVolStep2 = coalItem2 ? Number(coalItem2.adjustedVolume ?? coalItem2.initialVolume ?? 0) : 0;
                      const obVolStep2 = obItems2.reduce((sum, it) => sum + Number(it.adjustedVolume ?? it.initialVolume ?? 0), 0);
                      const srStep2 = coalVolStep2 > 0 ? (obVolStep2 / coalVolStep2) : 0;
                      const maxQuotaOB2 = coalVolStep2 * 3.0;
                      const excessOB2 = obVolStep2 > maxQuotaOB2 ? (obVolStep2 - maxQuotaOB2) : 0;

                      return (
                        <div className="space-y-4">
                          {/* Stripping Ratio 3:1 SOW Quota Live Indicator for BGG */}
                          {isCustomerBGG && coalVolStep2 > 0 && (
                            <div className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${excessOB2 > 0 ? "bg-amber-50/90 border-amber-300 text-amber-950" : "bg-emerald-50/90 border-emerald-300 text-emerald-950"}`}>
                              <Scale className={excessOB2 > 0 ? "text-amber-700 shrink-0 mt-0.5" : "text-emerald-700 shrink-0 mt-0.5"} size={18} />
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <strong className="font-extrabold uppercase tracking-wide">
                                    Hasil Survey: Kuota Stripping Ratio Kontrak SOW (Maks. 3.0 : 1)
                                  </strong>
                                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${excessOB2 > 0 ? "bg-amber-200 text-amber-900 border border-amber-400" : "bg-emerald-200 text-emerald-900 border border-emerald-400"}`}>
                                    SR Survey: {srStep2.toFixed(2)} : 1
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                                  <div>Coal Survey: <strong>{coalVolStep2.toLocaleString('id-ID', {minimumFractionDigits: 2})} Ton</strong></div>
                                  <div>Kapasitas Kuota OB (3x): <strong>{maxQuotaOB2.toLocaleString('id-ID', {minimumFractionDigits: 2})} BCM</strong></div>
                                  <div>Volume OB Survey: <strong>{obVolStep2.toLocaleString('id-ID', {minimumFractionDigits: 2})} BCM</strong></div>
                                </div>
                                {excessOB2 > 0 ? (
                                  <div className="text-[11px] text-amber-900 font-bold bg-amber-100/90 p-2 rounded-lg mt-1 border border-amber-200">
                                    âš ï¸ Hasil survey menunjukkan kelebihan OB sebesar <strong>{excessOB2.toLocaleString('id-ID', {minimumFractionDigits: 2})} BCM</strong>. Volume kelebihan ini otomatis dicatat ke <strong>Pending Volume</strong> dan tidak ditagihkan pada invoice periode ini.
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-emerald-900 font-semibold bg-emerald-100/80 p-1.5 rounded-lg mt-1 border border-emerald-200">
                                    âœ… Hasil survey berada di dalam batas rasio kontrak ({srStep2.toFixed(2)} â‰¤ 3.0). Seluruh volume hasil survey lolos tagih.
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-cyan-950">
                            <Calculator className="text-cyan-700 shrink-0 mt-0.5" size={16} />
                            <div>
                              <strong>Step 2 â€” Penyesuaian Hasil Joint Survey Lapangan:</strong> Masukkan volume hasil joint visit / survey bersama client. Volume pada variabel distance otomatis tersinkronisasi dan sistem menghitung <strong>Delta Selisih</strong> (+/-) secara live.
                            </div>
                          </div>

                          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
                            <table className="w-full text-xs text-left min-w-[780px]">
                              <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px]">
                                <tr>
                                  <th className="p-2.5 min-w-[240px]">Material / Pekerjaan</th>
                                  <th className="p-2.5 text-center w-20">Satuan</th>
                                  <th className="p-2.5 text-right w-28">Vol Awal</th>
                                  <th className="p-2.5 text-right w-32">Vol Hasil Survey</th>
                                  <th className="p-2.5 text-right w-28">Rate SOW (Rp)</th>
                                  <th className="p-2.5 text-right w-32">Subtotal Baru (Rp)</th>
                                  <th className="p-2.5 text-right w-32">Delta (+/- Rp)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {allBAItems.map((item, idx) => {
                                  const isDistance = isDistanceItem(item);
                                  const volAwal = getBAEffectiveVolume(item, allBAItems, false);
                                  const volAdj = getBAEffectiveVolume(item, allBAItems, true);
                                  const r = Number(item.rate || 0);
                                  const subAwal = getBAItemSubtotal(item, volAwal);
                                  const subAdj = getBAItemSubtotal(item, volAdj);
                                  const delta = subAdj - subAwal;
                                  const isOp = item.category === "Operating & Mining" || item.category === "Over Distance";

                                  return (
                                    <tr key={item.id || idx} className={`hover:bg-slate-50/80 transition ${isDistance ? "bg-amber-50/20" : ""}`}>
                                      <td className="p-2.5 font-bold text-slate-900 align-top">
                                        <div>{item.material || "-"}</div>
                                        <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                                          {item.category} â€¢ {item.area || (isCustomerBGG ? "Pit KKL" : "WM1")}
                                          {isDistance && (
                                            <span className="text-cyan-800 font-mono ml-1 font-bold">
                                              (Dist: {item.distanceWeightAvg || 0} {item.unit === "Bcm.Hm" ? "Hm" : "m"})
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="p-2.5 text-center font-mono font-bold text-slate-700 align-top">
                                        <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs inline-block text-center min-w-[45px] mt-0.5">
                                          {item.unit || "BCM"}
                                        </span>
                                      </td>
                                      <td className="p-2.5 text-right font-mono text-slate-600 align-top">
                                        <span className="pt-1 block">{volAwal.toLocaleString("id-ID", { minimumFractionDigits: 3 })}</span>
                                      </td>
                                      <td className="p-2.5 text-right font-mono align-top">
                                        {!isDistance ? (
                                          !isInlineEditingBA ? (
                                            <span className="font-bold text-slate-900 pt-1 block">{volAdj.toLocaleString("id-ID", { minimumFractionDigits: 3 })}</span>
                                          ) : (
                                            <input
                                              type="number"
                                              step="0.001"
                                              className="w-24 bg-cyan-50 border border-cyan-300 rounded px-2 py-1 text-right font-mono font-bold text-xs text-cyan-950 focus:border-cyan-700 outline-none"
                                              value={item.adjustedVolume !== undefined ? item.adjustedVolume : ""}
                                              placeholder="0.000"
                                              onFocus={(e) => e.target.select()}
                                              onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                if (isOp) {
                                                  const ops = [...baOperatingItems];
                                                  const opIdx = ops.findIndex(o => o.id === item.id);
                                                  if (opIdx >= 0) {
                                                    ops[opIdx].adjustedVolume = val;
                                                    setBaOperatingItems(ops);
                                                  }
                                                } else {
                                                  const mdos = [...baMDOItems];
                                                  const mIdx = mdos.findIndex(m => m.id === item.id);
                                                  if (mIdx >= 0) {
                                                    mdos[mIdx].adjustedVolume = val;
                                                    setBaMDOItems(mdos);
                                                  }
                                                }
                                              }}
                                            />
                                          )
                                        ) : (
                                          <div className="flex flex-col items-end pt-0.5">
                                            <span className="font-mono font-bold text-amber-950 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded text-xs shadow-2xs">
                                              {volAdj.toLocaleString("id-ID", { minimumFractionDigits: 3 })}
                                            </span>
                                            <span className="text-[9px] text-amber-800 font-semibold italic mt-0.5 whitespace-nowrap">
                                              Auto-sync survey
                                            </span>
                                          </div>
                                        )}
                                      </td>
                                      <td className="p-2.5 text-right font-mono text-slate-700 align-top">
                                        <span className="pt-1 block">{formatIDR(r)}</span>
                                      </td>
                                      <td className="p-2.5 text-right font-mono font-bold text-slate-900 align-top">
                                        <div className="pt-1">{formatIDR(subAdj)}</div>
                                      </td>
                                      <td className={`p-2.5 text-right font-mono font-black align-top ${delta >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                                        <div className="pt-1">{delta >= 0 ? `+${formatIDR(delta)}` : `-${formatIDR(Math.abs(delta))}`}</div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Delta Summary Box */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="p-3 bg-slate-100 rounded-xl border border-slate-200">
                              <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Awal (Site)</span>
                              <span className="text-sm font-black font-mono text-slate-800">{formatIDR(sumInitial)}</span>
                            </div>
                            <div className="p-3 bg-cyan-50 rounded-xl border border-cyan-200">
                              <span className="text-[10px] font-bold uppercase text-cyan-800 block">Total Survey Bersama</span>
                              <span className="text-sm font-black font-mono text-cyan-950">{formatIDR(sumAdjusted)}</span>
                            </div>
                            <div className={`p-3 rounded-xl border ${deltaAmount >= 0 ? "bg-emerald-50 border-emerald-300" : "bg-rose-50 border-rose-300"}`}>
                              <span className={`text-[10px] font-bold uppercase block ${deltaAmount >= 0 ? "text-emerald-800" : "text-rose-800"}`}>Delta Selisih Survey</span>
                              <span className={`text-sm font-black font-mono ${deltaAmount >= 0 ? "text-emerald-900" : "text-rose-900"}`}>
                                {deltaAmount >= 0 ? `+${formatIDR(deltaAmount)}` : `-${formatIDR(Math.abs(deltaAmount))}`}
                              </span>
                            </div>
                          </div>

                          {/* Upload Draft BA PDF */}
                          {isInlineEditingBA && (
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                              <div className="flex justify-between items-center">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                  <Upload size={14} className="text-cyan-700" /> Upload Berkas Draft BA Joint Survey (PDF)
                                </label>
                                {formData.draftBAPath && (
                                  <a
                                    href={resolveDocumentUrl(formData.draftBAPath)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] text-cyan-700 hover:text-cyan-900 font-bold inline-flex items-center gap-1 underline"
                                  >
                                    <ExternalLink size={11} /> Buka Draft PDF
                                  </a>
                                )}
                              </div>
                              <input
                                type="file"
                                accept="application/pdf"
                                className="text-xs text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-cyan-700 file:text-white hover:file:bg-cyan-800 cursor-pointer"
                                onChange={(e) => handleFileUpload(e, "draftBAPath")}
                              />
                            </div>
                          )}

                          {/* Navigation Buttons */}
                          <div className="flex justify-between items-center pt-2">
                            <button
                              type="button"
                              onClick={() => setActiveBAStep(1)}
                              className="px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold rounded-xl transition text-xs cursor-pointer"
                            >
                              â¬… Kembali ke Step 1
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveBAStep(3)}
                              className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white font-bold rounded-xl flex items-center gap-1.5 transition text-xs shadow-xs cursor-pointer"
                            >
                              <span>Lanjut ke Step 3 (Tanda Tangan & Final)</span>
                              <ArrowRight size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                      {/* STEP 3: Tanda Tangan & Finalisasi Berita Acara */}
                      {activeBAStep === 3 && (
                        <div className="space-y-4">
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-950">
                            <UserCheck className="text-emerald-700 shrink-0 mt-0.5" size={16} />
                            <div>
                              <strong>Step 3 â€” Verifikasi, Persetujuan & Final Signed BA:</strong> Tanda tangan digital internal (Finance Specialist & FATB Manager) dan pengesahan Berita Acara resmi customer.
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                                No. BA Resmi Customer <span className="text-rose-600">*</span>
                              </label>
                              {!isInlineEditingBA ? (
                                <div className="p-2 bg-white border border-slate-200 rounded font-mono font-bold text-xs text-slate-900">
                                  {formData.signedBANumber || formData.baNumber || "052/BA-POS-NIKEL/VII/2026"}
                                </div>
                              ) : (
                                <input
                                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-mono font-bold text-xs focus:border-emerald-700 outline-none"
                                  placeholder="052/BA-POS-NIKEL/VII/2026"
                                  value={formData.signedBANumber || formData.baNumber || ""}
                                  onChange={(e) => setFormData({ ...formData, signedBANumber: e.target.value, baNumber: e.target.value })}
                                />
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                                Tanggal Ditandatangani Customer
                              </label>
                              {!isInlineEditingBA ? (
                                <div className="p-2 bg-white border border-slate-200 rounded text-xs text-slate-900 font-bold">
                                  {formData.baSignedDate ? new Date(formData.baSignedDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}
                                </div>
                              ) : (
                                <input
                                  type="date"
                                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 text-xs focus:border-emerald-700 outline-none"
                                  value={formData.baSignedDate || ""}
                                  onChange={(e) => setFormData({ ...formData, baSignedDate: e.target.value })}
                                />
                              )}
                            </div>
                          </div>

                          {/* Dual Signatures Box with Real Action Buttons */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                            {/* TTD 1: Finance Specialist */}
                            <div className={`p-4 rounded-xl border shadow-xs text-center space-y-2.5 transition ${formData.verifiedBy ? "bg-emerald-50/50 border-emerald-300" : "bg-white border-slate-200"}`}>
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">1. Verifikasi Specialist</span>
                                {formData.verifiedBy ? (
                                  <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                                    <CheckCircle size={12} /> Selesai
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                                    <Clock size={12} /> Pending
                                  </span>
                                )}
                              </div>

                              <div className="py-1">
                                {formData.verifiedBy ? (
                                  <div className="inline-flex flex-col items-center gap-1">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                      <CheckCircle size={13} className="text-emerald-700" /> Digital Verified
                                    </span>
                                    <span className="text-[11px] font-bold text-slate-800">{formData.verifiedBy}</span>
                                    {formData.verifiedAt && (
                                      <span className="text-[10px] text-slate-500 font-mono">{new Date(formData.verifiedAt).toLocaleString("id-ID")}</span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
                                      <Clock size={13} className="text-amber-700" /> Menunggu Verifikasi Specialist
                                    </span>
                                    
                                    {/* Action Buttons for Finance Specialist / SPV */}
                                    {editItem && isFinanceSpecialist && (
                                      <div className="flex flex-col sm:flex-row gap-2 pt-2">
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            try {
                                              await verifyBATracker(editItem.id, "verify", formData.notes || "Verifikasi dokumen & volume BA disetujui Finance Specialist");
                                              onNotice("âœ… Berita Acara berhasil diverifikasi oleh Finance Specialist! Status diteruskan ke FATB Manager.");
                                              setFormData({ ...formData, verifiedBy: user?.name || "Finance Specialist AAP", statusBA: "Pending Berita Acara" });
                                              await loadData();
                                            } catch (err: any) {
                                              onNotice(`âŒ Gagal verifikasi: ${err?.message}`);
                                            }
                                          }}
                                          className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition text-xs shadow-xs cursor-pointer"
                                        >
                                          <Check size={14} /> Verifikasi BA (Approve)
                                        </button>
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            try {
                                              await verifyBATracker(editItem.id, "reject", formData.notes || "Volume / data BA memerlukan revisi");
                                              onNotice("âš ï¸ Berita Acara dikembalikan untuk revisi.");
                                              setFormData({ ...formData, statusBA: "Revisi" });
                                              await loadData();
                                            } catch (err: any) {
                                              onNotice(`âŒ Gagal reject: ${err?.message}`);
                                            }
                                          }}
                                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-2.5 rounded-lg flex items-center justify-center gap-1 transition text-xs shadow-xs cursor-pointer"
                                        >
                                          <X size={14} /> Revisi
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="pt-2 border-t border-slate-100">
                                <strong className="block text-xs text-slate-900">Finance Specialist</strong>
                                <span className="text-[10px] text-slate-500">PT Andalan Artha Primanusa</span>
                              </div>
                            </div>

                            {/* TTD 2: FATB Manager */}
                            <div className={`p-4 rounded-xl border shadow-xs text-center space-y-2.5 transition ${formData.approvedBy ? "bg-emerald-50/50 border-emerald-300" : "bg-white border-slate-200"}`}>
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">2. Approval FATB Manager</span>
                                {formData.approvedBy ? (
                                  <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                                    <ShieldCheck size={12} /> Approved
                                  </span>
                                ) : formData.verifiedBy ? (
                                  <span className="text-[10px] text-cyan-700 font-bold flex items-center gap-1">
                                    <Clock size={12} /> Siap Di-Approve
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                    <Lock size={12} /> Menunggu Step 1
                                  </span>
                                )}
                              </div>

                              <div className="py-1">
                                {formData.approvedBy ? (
                                  <div className="inline-flex flex-col items-center gap-1">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                      <ShieldCheck size={13} className="text-emerald-700" /> Approved by FATB Manager
                                    </span>
                                    <span className="text-[11px] font-bold text-slate-800">{formData.approvedBy}</span>
                                    {formData.approvedAt && (
                                      <span className="text-[10px] text-slate-500 font-mono">{new Date(formData.approvedAt).toLocaleString("id-ID")}</span>
                                    )}
                                  </div>
                                ) : formData.verifiedBy ? (
                                  <div className="space-y-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-50 text-cyan-900 border border-cyan-300">
                                      <Clock size={13} className="text-cyan-700" /> Menunggu Approval FATB Manager
                                    </span>

                                    {/* Action Buttons for FATB Manager */}
                                    {editItem && isManager && (
                                      <div className="flex flex-col sm:flex-row gap-2 pt-2">
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            try {
                                              await approveBATracker(editItem.id, "approve", formData.notes || "Persetujuan Berita Acara disetujui resmi FATB Manager");
                                              onNotice("ðŸŽ‰ Berita Acara disetujui FATB Manager! Status: BA Ready to Invoice.");
                                              setFormData({ ...formData, approvedBy: user?.name || "FATB Manager AAP", statusBA: "Ready to Invoice" });
                                              await loadData();
                                            } catch (err: any) {
                                              onNotice(`âŒ Gagal approve: ${err?.message}`);
                                            }
                                          }}
                                          className="flex-1 bg-cyan-700 hover:bg-cyan-800 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition text-xs shadow-xs cursor-pointer"
                                        >
                                          <ShieldCheck size={14} /> Approve BA (Manager)
                                        </button>
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            try {
                                              await approveBATracker(editItem.id, "reject", formData.notes || "Ditolak FATB Manager untuk evaluasi");
                                              onNotice("âš ï¸ Berita Acara ditolak oleh FATB Manager.");
                                              setFormData({ ...formData, statusBA: "Revisi" });
                                              await loadData();
                                            } catch (err: any) {
                                              onNotice(`âŒ Gagal reject: ${err?.message}`);
                                            }
                                          }}
                                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-2.5 rounded-lg flex items-center justify-center gap-1 transition text-xs shadow-xs cursor-pointer"
                                        >
                                          <X size={14} /> Reject
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="py-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                      <Lock size={13} className="text-slate-400" /> Terkunci (Perlu Verifikasi Specialist)
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="pt-2 border-t border-slate-100">
                                <strong className="block text-xs text-slate-900">FATB Manager</strong>
                                <span className="text-[10px] text-slate-500">PT Andalan Artha Primanusa</span>
                              </div>
                            </div>
                          </div>

                          {/* Upload Final Signed BA PDF */}
                          {isInlineEditingBA && (
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                              <div className="flex justify-between items-center">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                  <Upload size={14} className="text-emerald-700" /> Upload Berkas Final Signed BA (PDF TTD Customer) <span className="text-rose-600">*</span>
                                </label>
                                {formData.finalBAPath && (
                                  <a
                                    href={resolveDocumentUrl(formData.finalBAPath)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold inline-flex items-center gap-1 underline"
                                  >
                                    <ExternalLink size={11} /> Buka Final Signed PDF
                                  </a>
                                )}
                              </div>
                              <input
                                type="file"
                                accept="application/pdf"
                                className="text-xs text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-700 file:text-white hover:file:bg-emerald-800 cursor-pointer"
                                onChange={(e) => handleFileUpload(e, "finalBAPath")}
                              />
                            </div>
                          )}

                          {/* Status Ready to Invoice Action Banner */}
                          {(formData.statusBA === "Ready to Invoice" || formData.statusBA === "Approved") && (
                            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-emerald-950 shadow-xs">
                              <div className="flex items-center gap-2.5">
                                <CheckCircle2 size={20} className="text-emerald-700 shrink-0" />
                                <div>
                                  <strong className="block font-black text-emerald-900">Berita Acara Telah Disetujui (Ready to Invoice)</strong>
                                  <span className="text-emerald-800 text-[11px]">Dokumen siap diterbitkan invoice penagihan resmi ke pelanggan.</span>
                                </div>
                              </div>
                              {formData.customerCode === "POS" ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setModalType("none");
                                      createInvoiceFromBA(editItem || formData, "Operation & Mining");
                                    }}
                                    className="bg-cyan-700 hover:bg-cyan-800 text-white font-extrabold py-2 px-3 rounded-xl flex items-center gap-1.5 transition text-xs shadow-xs whitespace-nowrap cursor-pointer"
                                  >
                                    <Pickaxe size={14} /> âš¡ Inv Mining
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setModalType("none");
                                      createInvoiceFromBA(editItem || formData, "MDO");
                                    }}
                                    className="bg-indigo-700 hover:bg-indigo-800 text-white font-extrabold py-2 px-3 rounded-xl flex items-center gap-1.5 transition text-xs shadow-xs whitespace-nowrap cursor-pointer"
                                  >
                                    <Building2 size={14} /> ðŸ—ï¸ Inv MDO
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalType("none");
                                    createInvoiceFromBA(editItem || formData);
                                  }}
                                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-black py-2 px-3.5 rounded-xl flex items-center gap-1.5 transition text-xs shadow-xs whitespace-nowrap cursor-pointer"
                                >
                                  <Zap size={14} /> âš¡ Terbitkan Invoice
                                </button>
                              )}
                            </div>
                          )}

                          {/* Navigation Buttons */}
                          <div className="flex justify-between items-center pt-2">
                            <button
                              type="button"
                              onClick={() => setActiveBAStep(2)}
                              className="px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold rounded-xl transition text-xs cursor-pointer"
                            >
                              â¬… Kembali ke Step 2
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveBAStep(4)}
                              className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white font-bold rounded-xl flex items-center gap-1.5 transition text-xs shadow-xs cursor-pointer"
                            >
                              <span>Lihat Jejak Audit (Step 4)</span>
                              <ArrowRight size={14} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* STEP 4: Jejak Audit & Flow Tracking */}
                      {activeBAStep === 4 && (
                        <div className="space-y-4">
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                              <History size={16} className="text-cyan-800" />
                              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                                Jejak Audit & Alur Persetujuan Berita Acara
                              </h4>
                            </div>

                            <div className="space-y-3">
                              {/* 1. Draft BA Dibuat */}
                              <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg shrink-0 font-bold text-xs">1</div>
                                <div className="space-y-0.5 text-xs flex-1">
                                  <div className="flex items-center justify-between">
                                    <strong className="text-slate-900 font-bold">Draft BA Dibuat (Site Entri)</strong>
                                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                      {formData.baSubmittedDate ? new Date(formData.baSubmittedDate).toLocaleDateString("id-ID") : "Tercatat"}
                                    </span>
                                  </div>
                                  <p className="text-slate-600 text-[11px]">
                                    Draft Berita Acara dibuat oleh <strong>{formData.picAAP || "Admin Finance Site"}</strong> dan dicatat sebagai estimasi Unbilled Revenue ({formatIDR(sumInitial)}).
                                  </p>
                                </div>
                              </div>

                              {/* 2. Verifikasi Specialist */}
                              <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                                <div className={`p-2 rounded-lg shrink-0 font-bold text-xs ${formData.verifiedBy ? "bg-emerald-100 text-emerald-800" : formData.statusBA === "Revisi" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>2</div>
                                <div className="space-y-0.5 text-xs flex-1">
                                  <div className="flex items-center justify-between">
                                    <strong className="text-slate-900 font-bold">Verifikasi Specialist & Joint Survey</strong>
                                    {formData.verifiedBy ? (
                                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                                        <CheckCircle size={11} /> Terverifikasi ({formData.verifiedBy})
                                      </span>
                                    ) : formData.statusBA === "Revisi" ? (
                                      <span className="text-[10px] text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                                        <X size={11} /> Perlu Revisi
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                                        <Clock size={11} /> Menunggu Verifikasi
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-slate-600 text-[11px]">
                                    {formData.verifiedBy
                                      ? `Pemeriksaan fisik volume joint survey disetujui oleh ${formData.verifiedBy}.${formData.verifiedAt ? ` (${new Date(formData.verifiedAt).toLocaleString("id-ID")})` : ""}`
                                      : "Menunggu verifikasi keabsahan volume survei bersama oleh Finance Specialist / SPV Site."}
                                  </p>
                                </div>
                              </div>

                              {/* 3. Approval FATB Manager */}
                              <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                                <div className={`p-2 rounded-lg shrink-0 font-bold text-xs ${formData.approvedBy ? "bg-emerald-100 text-emerald-800" : formData.verifiedBy ? "bg-cyan-100 text-cyan-800" : "bg-slate-100 text-slate-500"}`}>3</div>
                                <div className="space-y-0.5 text-xs flex-1">
                                  <div className="flex items-center justify-between">
                                    <strong className="text-slate-900 font-bold">Approval FATB Manager (Final BA)</strong>
                                    {formData.approvedBy ? (
                                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                                        <ShieldCheck size={11} /> Disetujui ({formData.approvedBy})
                                      </span>
                                    ) : formData.verifiedBy ? (
                                      <span className="text-[10px] text-cyan-700 font-bold bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200 flex items-center gap-1">
                                        <Clock size={11} /> Menunggu Approval
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                                        <Lock size={11} /> Antrian Verifikasi
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-slate-600 text-[11px]">
                                    {formData.approvedBy
                                      ? `Berita Acara telah disetujui resmi oleh ${formData.approvedBy}.${formData.approvedAt ? ` (${new Date(formData.approvedAt).toLocaleString("id-ID")})` : ""}`
                                      : "Persetujuan final dokumen BA dan pengesahan nilai klaim oleh FATB Manager."}
                                  </p>
                                </div>
                              </div>

                              {/* 4. Relasi Invoice Penagihan */}
                              <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                                <div className={`p-2 rounded-lg shrink-0 font-bold text-xs ${formData.invoiceNoLinked ? "bg-purple-100 text-purple-800" : (formData.statusBA === "Ready to Invoice" || formData.approvedBy) ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>4</div>
                                <div className="space-y-0.5 text-xs flex-1">
                                  <div className="flex items-center justify-between">
                                    <strong className="text-slate-900 font-bold">Relasi Invoice Penagihan</strong>
                                    {formData.invoiceNoLinked ? (
                                      <span className="text-[10px] text-purple-800 font-bold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                                        Invoice #{formData.invoiceNoLinked}
                                      </span>
                                    ) : (formData.statusBA === "Ready to Invoice" || formData.approvedBy) ? (
                                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                        Siap Terbit Invoice
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                        Menunggu BA Approved
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-slate-600 text-[11px]">
                                    {formData.invoiceNoLinked
                                      ? `Invoice resmi #${formData.invoiceNoLinked} telah diterbitkan dan tercatat pada buku Order to Cash AR.`
                                      : (formData.statusBA === "Ready to Invoice" || formData.approvedBy)
                                      ? "Status Berita Acara siap diterbitkan Invoice oleh Tim Finance HO melalui tombol 'Terbitkan Invoice'."
                                      : "Faktur penagihan belum dapat diterbitkan sebelum Berita Acara selesai disetujui."}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Navigation Buttons */}
                          <div className="flex justify-start pt-2">
                            <button
                              type="button"
                              onClick={() => setActiveBAStep(3)}
                              className="px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold rounded-xl transition text-xs cursor-pointer"
                            >
                              â¬… Kembali ke Step 3
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Catatan / Bottleneck */}
                      <div className="pt-2 border-t border-slate-200">
                        <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Operasional / Bottleneck</label>
                        {!isInlineEditingBA ? (
                          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                            {formData.notes || formData.notesBottleneck || "Tidak ada catatan khusus."}
                          </div>
                        ) : (
                          <textarea
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs focus:border-cyan-700 outline-none"
                            rows={1}
                            placeholder="Catatan tambahan..."
                            value={formData.notes || ""}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          />
                        )}
                      </div>
                    </div>

                    {/* KOLOM KANAN (LEBAR ~25%-30% / xl:col-span-4 2xl:col-span-3): Document Viewer & Quick Intelligence Hub */}
                    <div className="xl:col-span-4 2xl:col-span-3 space-y-4">
                      {/* Ringkasan Dokumen Card */}
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <span className="text-xs font-black uppercase text-cyan-800 tracking-wider">Ringkasan Berita Acara</span>
                          <span className="text-[10px] font-mono font-bold text-slate-500">ID: #{formData.id || editItem?.id || "New"}</span>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-bold">Total Nilai Klaim BA:</span>
                            <span className="font-mono font-black text-emerald-800 text-sm">{formatIDR(sumAdjusted || sumInitial || formData.workAmount || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-bold">Status BA:</span>
                            <span>{renderBAStatusBadge(formData.statusBA || "Submit", formData.invoiceNoLinked, undefined, editItem || formData, invoiceRows)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-bold">Customer:</span>
                            <span className="font-bold text-slate-900">{formData.customerCode || "POS"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-bold">Periode:</span>
                            <span className="text-slate-800 font-bold">{formData.workPeriod || "-"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-bold">Lead Time Approval:</span>
                            <span className="text-amber-700 font-extrabold">{formData.leadTimeDays || 0} Hari</span>
                          </div>
                        </div>
                      </div>

                      {/* PDF PREVIEWS CONTAINER */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-700 tracking-wider">
                          <FileText size={14} className="text-cyan-700" /> Pratinjau Dokumen PDF
                        </div>

                        {/* Draft BA Card */}
                        <div className="p-3 bg-slate-900 text-white rounded-xl space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                              <Upload size={13} /> Draft BA PDF
                            </span>
                            {formData.draftBAPath ? (
                              <a
                                href={resolveDocumentUrl(formData.draftBAPath)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] px-2 py-0.5 rounded bg-cyan-700 hover:bg-cyan-600 text-white font-bold inline-flex items-center gap-1"
                              >
                                <ExternalLink size={11} /> Buka Tab Baru
                              </a>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Belum Diunggah</span>
                            )}
                          </div>
                          {formData.draftBAPath ? (
                            <div className="w-full h-36 rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
                              <iframe src={resolveDocumentUrl(formData.draftBAPath)} className="w-full h-full" title="Draft BA PDF Preview" />
                            </div>
                          ) : (
                            <div className="p-3 text-center text-xs text-slate-400 bg-slate-800/50 rounded-lg border border-dashed border-slate-700">
                              Draft BA PDF belum diunggah.
                            </div>
                          )}
                        </div>

                        {/* Final Signed BA Card */}
                        <div className="p-3 bg-slate-900 text-white rounded-xl space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                              <CheckCircle size={13} /> Final Signed BA PDF
                            </span>
                            {formData.finalBAPath ? (
                              <a
                                href={resolveDocumentUrl(formData.finalBAPath)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] px-2 py-0.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold inline-flex items-center gap-1"
                              >
                                <ExternalLink size={11} /> Buka Tab Baru
                              </a>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Belum Diunggah</span>
                            )}
                          </div>
                          {formData.finalBAPath ? (
                            <div className="w-full h-36 rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
                              <iframe src={resolveDocumentUrl(formData.finalBAPath)} className="w-full h-full" title="Final BA PDF Preview" />
                            </div>
                          ) : (
                            <div className="p-3 text-center text-xs text-slate-400 bg-slate-800/50 rounded-lg border border-dashed border-slate-700">
                              Final Signed BA PDF dapat diunggah pada Step 3.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ================= MODAL PAYMENT RECEIPT ================= */}
              {modalType === "payment" && (
                <>
                  {/* Section 1: Target Invoice */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                      <span className="text-xs font-black uppercase text-cyan-800 tracking-wider">ðŸ“Œ 1. Target Invoice Pembayaran</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">No. Invoice Target <span className="text-rose-600">*</span></label>
                        <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono font-bold focus:border-cyan-700 focus:bg-white outline-none" placeholder="088/BGG-AAP/II/2026" value={formData.invoiceNo || ""} onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })} required />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Customer Code <span className="text-rose-600">*</span></label>
                        <select className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:border-cyan-700 focus:bg-white outline-none" value={formData.customerCode || "BGG"} onChange={(e) => setFormData({ ...formData, customerCode: e.target.value })}>
                          <option value="BGG">BGG</option>
                          <option value="SBS">SBS</option>
                          <option value="DBK">DBK</option>
                          <option value="POS">POS</option>
                          <option value="ABN">ABN</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Nominal & Rekening Bank */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                      <span className="text-xs font-black uppercase text-cyan-800 tracking-wider">ðŸ’° 2. Nominal Uang Masuk & Rekening Bank</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <RupiahInput
                        label="Jumlah Uang Masuk Received (Rp)"
                        value={formData.amountPaid || 0}
                        onChange={(val) => setFormData({ ...formData, amountPaid: val })}
                        required={true}
                        helperText="Otomatis mengurangi sisa Outstanding & update status Lunas/Partial"
                      />
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Tanggal Pembayaran <span className="text-rose-600">*</span></label>
                        <input type="date" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" value={formData.paymentDate || ""} onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })} required />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Bank Receiving (Tujuan Transaksi)</label>
                        <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" placeholder="Contoh: BRI Escrow / Mandiri 0000 OP" value={formData.receivingBank || ""} onChange={(e) => setFormData({ ...formData, receivingBank: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">No. Referensi Bank / Transfer</label>
                        <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono focus:border-cyan-700 focus:bg-white outline-none" placeholder="TRF-BRI-00129" value={formData.refNo || ""} onChange={(e) => setFormData({ ...formData, refNo: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Catatan Pembayaran */}
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Catatan Pembayaran</label>
                      <textarea className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" rows={2} placeholder="Keterangan cicilan 1 / pelunasan BGG..." value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                    </div>
                  </div>
                </>
              )}

              {/* ================= MODAL CUSTOMER MASTER ================= */}
              {modalType === "customer" && (
                <>
                  {/* Section 1: Identitas Customer */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                      <span className="text-xs font-black uppercase text-cyan-800 tracking-wider">ðŸ“Œ 1. Profil Perusahaan & Credit Terms</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Kode Customer <span className="text-rose-600">*</span></label>
                        <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold uppercase focus:border-cyan-700 focus:bg-white outline-none" placeholder="BGG" value={formData.code || ""} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Termin Hari (Credit Terms) <span className="text-rose-600">*</span></label>
                        <input type="number" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:border-cyan-700 focus:bg-white outline-none" value={formData.terminDays || 30} onChange={(e) => setFormData({ ...formData, terminDays: Number(e.target.value) })} required />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Nama Lengkap Perusahaan <span className="text-rose-600">*</span></label>
                      <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:border-cyan-700 focus:bg-white outline-none" placeholder="PT Budi Gema Gempita" value={formData.fullName || ""} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} required />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Induk Perusahaan (Group Parent)</label>
                      <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" placeholder="Petrindo Jaya Kreasi Tbk / PTBA" value={formData.groupParent || ""} onChange={(e) => setFormData({ ...formData, groupParent: e.target.value })} />
                    </div>
                  </div>

                  {/* Section 2: Kontak AR */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                      <span className="text-xs font-black uppercase text-cyan-800 tracking-wider">ðŸ“ž 2. Contact Person & Penagihan AR</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">PIC AR</label>
                        <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" placeholder="Bpk. Hendra" value={formData.contactPerson || ""} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Email AR</label>
                        <input type="email" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" placeholder="ar@bgg.co.id" value={formData.emailAR || ""} onChange={(e) => setFormData({ ...formData, emailAR: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Telepon</label>
                        <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" placeholder="+62 21 555 0192" value={formData.phone || ""} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Kontrak & Nilai Kerjasama */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                      <span className="text-xs font-black uppercase text-cyan-800 tracking-wider">ðŸ“„ 3. Kontrak & Nilai Kerjasama</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">No. Kontrak</label>
                        <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" placeholder="09/BGG-AAP/VIII/2018" value={formData.contractNo || ""} onChange={(e) => setFormData({ ...formData, contractNo: e.target.value })} />
                      </div>
                      <RupiahInput
                        label="Nilai Kontrak (Rp)"
                        value={formData.contractValue || 0}
                        onChange={(val) => setFormData({ ...formData, contractValue: val })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Catatan Kontrak / Syarat</label>
                      <textarea className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" rows={2} placeholder="Termin per pekerjaan, 7 tahun..." value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                    </div>
                  </div>
                </>
              )}

              {/* Form Action Buttons */}
              <div className="flex items-center justify-between pt-5 border-t border-slate-200">
                <div>
                  {modalType === "ba" && editItem && !isInlineEditingBA && (
                    <button
                      type="button"
                      onClick={() => setIsInlineEditingBA(true)}
                      className="px-5 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-black text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Edit2 size={14} /> âœï¸ Ubah / Edit Data BA Ini
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold transition shadow-xs text-xs cursor-pointer"
                    onClick={() => setModalType("none")}
                  >
                    {modalType === "ba" && !isInlineEditingBA ? "Tutup Pratinjau" : "Batal"}
                  </button>
                  
                  {(modalType !== "ba" || isInlineEditingBA) && (
                    <button
                      type="submit"
                      className="primary px-6 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-black shadow-md transition text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 size={15} />
                      <span>{modalType === "ba" ? "Simpan Perubahan Berita Acara" : "Simpan Data"}</span>
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
  );
}

