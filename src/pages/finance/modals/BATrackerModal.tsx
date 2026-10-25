import React, { useState, useEffect, useRef } from "react";
import { X, Edit2, CheckCircle2, Loader2 } from "lucide-react";
import { renderBAStatusBadge, formatIDR } from "../helpers";
import { api, getBAAuditLogs, verifyBATracker, approveBATracker } from "../../../lib/api";
import { BAGLJournalPreview } from "./BAGLJournalPreview";
import { AccuratePostingPanel } from "../details/AccuratePostingPanel";
import {
  isDistanceItem,
  getBAEffectiveVolume,
  customerKind,
  canEditPending,
  isRentalBA,
  isMessBA,
} from "../ba_calculations";
import { fetchServerBACalculation } from "../calculations";
import { buildBAPayload } from "../useFinanceSaveHandlers";
import type { BACalc } from "../../../types";
import { BAPOSRentalTable, BAPOSMessTable } from "./BAPOSRentalTable";
import { BATrackerHeaderForm } from "./BATrackerHeaderForm";
import { BATrackerSurveyItems } from "./BATrackerSurveyItems";
import { BATrackerSurveyMatrix } from "./BATrackerSurveyMatrix";
import { BATrackerSidebar } from "./BATrackerSidebar";

export function BATrackerModal({ c }: { c: any }) {
  const {
    editItem,
    isSaving,
    formData,
    setFormData,
    setModalType,
    isInlineEditingBA,
    setIsInlineEditingBA,
    activeBAStep = 1,
    setActiveBAStep,
    baOperatingItems = [],
    setBaOperatingItems,
    baMDOItems = [],
    setBaMDOItems,
    baDeductionItems = [],
    setBaDeductionItems,
    mRate,
    activeSOWCatalog = [],
    latestKursBI = 0,
    user,
    invoiceRows = [],
    canVerifyBA,
    can = () => false,
    handleFileUpload,
    handleSave,
    reorderBAItems,
    moveBAItem,
    defaultPOSBAOperatingItems,
    defaultPOSBAMDOItems,
    defaultDBKBAItems,
    defaultPTROBAItems,
    defaultBGGBAItems,
    defaultSBSBAOperatingItems,
    defaultSBSBAMDOItems,
    defaultSBSBADeductionItems,
    rfIndexCalculated = 1.0,
    coalIndexMaster = [],
    fuelPriceUSD = 1.15,
    laborPriceIDR = 0,
    raiseFallMaster,
    raiseFallMasters = [],
    minWageMasters = [],
    getBGGActiveCoalTier,
    getSowMasterRate,
    openBAModal,
    handleDeletePendingVolume,
    loadData,
  } = c || {};

  const [baAuditLogs, setBaAuditLogs] = useState<any[]>([]);
  const [askPending, setAskPending] = useState(false);
  const [baTab, setBaTab] = useState<"input" | "posting">("input");
  const [accLogs, setAccLogs] = useState<any[] | null>([]);
  const baId = editItem?.id;
  const baNo = editItem?.baNumber;
  useEffect(() => {
    if (baTab !== "posting" || !baId) return;
    // JV akrual bertag "[FEAST BA-<id>-<kategori>]"; JV pembalik invoice memuat "FEAST <no. BA>" di keterangannya.
    const qs = [`FEAST BA-${baId}-`, ...(baNo ? [`FEAST ${baNo}`] : [])];
    Promise.all(qs.map((q) => api<any[]>(`/api/accurate-logs?q=${encodeURIComponent(q)}`)))
      .then((res) => {
        const byId = new Map<number, any>();
        res.flat().forEach((r) => r && byId.set(r.id, r));
        setAccLogs([...byId.values()].sort((a, b) => b.id - a.id));
      })
      .catch(() => setAccLogs(null));
  }, [baTab, baId, baNo, formData.accurate]);

  const kind = customerKind(formData.customerCode);
  const isCustomerBGG = kind === "BGG";
  const isCustomerPOS = kind === "POS";
  const pending = Boolean(formData.pendingMode);
  const isMess = isMessBA(formData);
  const isRental = isRentalBA(formData) || isMess;
  const pv = editItem?.pendingVolume;
  const pendingEditable = canEditPending(editItem);
  const allBAItems = [...baOperatingItems, ...baMDOItems, ...(baDeductionItems || [])];

  useEffect(() => {
    const targetId = String(formData?.id || editItem?.id || "");
    if (!targetId) return;
    getBAAuditLogs(targetId)
      .then((logs) => setBaAuditLogs(Array.isArray(logs) ? logs : []))
      .catch(() => {});
  }, [formData?.id, editItem?.id]);

  // Uang BA dihitung BE (/ba-trackers/calculate, tanpa simpan); respons usang diabaikan.
  const [calc, setCalc] = useState<BACalc | undefined>(pending ? pv?.calc : editItem?.calc);
  const [preview, setPreview] = useState<any>();
  const [glPreview, setGlPreview] = useState<any[]>();
  const calcSeq = useRef(0);
  useEffect(() => { setCalc(pending ? pv?.calc : editItem?.calc); setPreview(undefined); setGlPreview(undefined); }, [pending, editItem]);
  const calcInput = JSON.stringify(buildBAPayload(formData, editItem, allBAItems));
  useEffect(() => {
    const seq = ++calcSeq.current;
    const t = setTimeout(async () => {
      const res = await fetchServerBACalculation(JSON.parse(calcInput));
      if (res && seq === calcSeq.current) { setCalc(pending ? res.pendingVolume?.calc : res.calc); setPreview(pending ? res.pendingVolume : res); setGlPreview(res.glPreview); }
    }, 400);
    return () => clearTimeout(t);
  }, [calcInput, pending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCustomerBGG && !pending && !formData.pendingVolume) setAskPending(true);
    else handleSave(e);
  };
  const saveAnswer = (openPending: boolean) => { setAskPending(false); handleSave(undefined, openPending); };
  const act = async (call: () => Promise<any>) => {
    try {
      const updated: any = await call();
      setFormData({ ...formData, statusBA: updated?.statusBA, verifiedBy: updated?.verifiedBy, verifiedAt: updated?.verifiedAt, approvedBy: updated?.approvedBy, approvedAt: updated?.approvedAt, accurate: updated?.accurate ?? formData.accurate });
    } catch (err: any) {
      alert(err?.message || "Gagal memproses Berita Acara");
    }
  };
  const reject = (run: (note: string) => void) => {
    const note = window.prompt("Alasan Reject");
    if (note) run(note);
  };
  const viewOnly = Boolean(editItem) && !isInlineEditingBA;
  const canVerifyMain = viewOnly && !pending && canVerifyBA && !formData.verifiedBy && !(formData.statusBA || "").startsWith("Reject");
  const canApproveMain = viewOnly && !pending && can("ba_tracker", "approve") && formData.verifiedBy && formData.statusBA === "Ready to Invoice" && !formData.approvedBy;
  const canVerifyPending = viewOnly && pending && pv && canVerifyBA && !pv.verifiedBy && !pv.billedInvoiceId;
  const actPending = async (action: "verify_pending" | "reject_pending", note: string) => {
    try {
      const updated = await verifyBATracker(editItem.id, action, note);
      await loadData?.();
      openBAModal(updated, false, true);
    } catch (err: any) {
      alert(err?.message || "Gagal memproses Pending Volume");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-1.5 sm:p-3">
      <div className="bg-white border border-slate-200 rounded-[4px] w-full max-w-[96vw] 2xl:max-w-[1550px] shadow-2xl flex flex-col max-h-[96dvh] transition-all overflow-hidden">
        {/* Modal Header (Sticky Top) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 p-4 sm:p-5 pb-3 bg-white shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
            <h3 className="text-lg sm:text-xl font-black text-slate-900 truncate">
              {pending ? `Pending Volume: ${editItem?.baNumber || ""}` : editItem ? `Berita Acara: ${formData.baNumber || formData.signedBANumber || formData.draftBARefNo || "Draft BA"}` : "Input Berita Acara Baru"}
            </h3>
            {editItem && (
              <div className="shrink-0">
                {renderBAStatusBadge(formData.statusBA || editItem.statusBA, formData.invoiceNoLinked || editItem.invoiceNoLinked, undefined, editItem || formData, invoiceRows)}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => setModalType("none")}
              className="p-1.5 rounded-[3px] text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* Left Column: Forms */}
              <div className="xl:col-span-9 2xl:col-span-9 space-y-4 border-b xl:border-b-0 xl:border-r border-slate-200 pb-6 xl:pb-0 xl:pr-6">
                {editItem && (
                  <div className="flex gap-1 text-[11px] font-bold">
                    {([["input", "Input BA"], ["posting", "Posting Jurnal"]] as const).map(([k, label]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setBaTab(k)}
                        className={`px-3 py-1 rounded-[3px] border transition cursor-pointer ${baTab === k ? "bg-[#1A1612] border-[#1A1612] text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
                {baTab === "posting" && editItem ? (
                  <div className="space-y-4">
                    <BAGLJournalPreview lines={glPreview} />
                    <AccuratePostingPanel
                      type="ba"
                      data={{ ...editItem, accurate: formData.accurate ?? editItem.accurate }}
                      canSync={Boolean(canVerifyBA && formData.verifiedBy)}
                      onNotice={(msg) => alert(msg)}
                      onSaved={(updated) => {
                        if (updated) setFormData({ ...formData, accurate: updated.accurate });
                        loadData?.();
                      }}
                    />
                    <div className="rounded-[4px] border border-slate-200 bg-white overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-slate-500 text-left">
                          <tr>
                            <th className="p-2">Waktu</th>
                            <th className="p-2">Aksi</th>
                            <th className="p-2">Endpoint</th>
                            <th className="p-2">Status</th>
                            <th className="p-2">Dokumen / Pesan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {!accLogs ? (
                            <tr><td colSpan={5} className="p-4 text-center text-rose-600">Log Accurate gagal dimuat.</td></tr>
                          ) : accLogs.length === 0 ? (
                            <tr><td colSpan={5} className="p-4 text-center text-slate-400">Belum ada log posting Accurate.</td></tr>
                          ) : accLogs.map((r) => (
                            <tr key={r.id} className="border-t border-slate-100">
                              <td className="p-2 whitespace-nowrap">{new Date(r.createdAt).toLocaleString("id-ID")}</td>
                              <td className="p-2 capitalize">{r.action}</td>
                              <td className="p-2 font-mono">{r.method} {r.path}</td>
                              <td className="p-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.success ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{r.success ? "Sukses" : "Gagal"}</span>
                              </td>
                              <td className={`p-2 font-mono ${r.success ? "text-slate-700" : "text-rose-700"}`}>{r.success ? r.response : r.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (<>
                {pv && !isInlineEditingBA && (
                  <div className="flex gap-1 border-b border-slate-200 text-xs font-bold">
                    {[{ label: "BA Utama", on: !pending }, { label: `Pending Volume · ${pv.period}`, on: pending }].map((t, i) => (
                      <button
                        key={t.label}
                        type="button"
                        onClick={() => !t.on && openBAModal(editItem, false, i === 1)}
                        className={`px-3 py-2 -mb-px border-b-2 transition cursor-pointer ${t.on ? "border-[#A57C50] text-[#A57C50]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
                <BATrackerHeaderForm
                  activeBAStep={activeBAStep}
                  setActiveBAStep={setActiveBAStep}
                  isInlineEditingBA={isInlineEditingBA}
                  formData={formData}
                  setFormData={setFormData}
                  baOperatingItems={baOperatingItems}
                  setBaOperatingItems={setBaOperatingItems}
                  baMDOItems={baMDOItems}
                  setBaMDOItems={setBaMDOItems}
                  baDeductionItems={baDeductionItems}
                  setBaDeductionItems={setBaDeductionItems}
                  latestKursBI={latestKursBI}
                  user={user}
                  rfIndexCalculated={rfIndexCalculated}
                  coalIndexMaster={coalIndexMaster}
                  fuelPriceUSD={fuelPriceUSD}
                  laborPriceIDR={laborPriceIDR}
                  defaultPOSBAOperatingItems={defaultPOSBAOperatingItems}
                  defaultPOSBAMDOItems={defaultPOSBAMDOItems}
                  defaultDBKBAItems={defaultDBKBAItems}
                  defaultPTROBAItems={defaultPTROBAItems}
                  defaultBGGBAItems={defaultBGGBAItems}
                  defaultSBSBAOperatingItems={defaultSBSBAOperatingItems}
                  defaultSBSBAMDOItems={defaultSBSBAMDOItems}
                  defaultSBSBADeductionItems={defaultSBSBADeductionItems}
                  raiseFallMaster={raiseFallMaster}
                  raiseFallMasters={raiseFallMasters}
                  minWageMasters={minWageMasters}
                  getBGGActiveCoalTier={getBGGActiveCoalTier}
                />

                {isMess && (
                  <BAPOSMessTable
                    formData={formData}
                    setFormData={setFormData}
                    baOperatingItems={baOperatingItems}
                    setBaOperatingItems={setBaOperatingItems}
                    isInlineEditingBA={isInlineEditingBA}
                    calc={calc}
                  />
                )}

                {activeBAStep === 1 && isRental && !isMess && (
                  <BAPOSRentalTable
                    formData={formData}
                    setFormData={setFormData}
                    baOperatingItems={baOperatingItems}
                    setBaOperatingItems={setBaOperatingItems}
                    baDeductionItems={baDeductionItems}
                    setBaDeductionItems={setBaDeductionItems}
                    isInlineEditingBA={isInlineEditingBA}
                    activeSOWCatalog={activeSOWCatalog}
                    calc={calc}
                  />
                )}

                {activeBAStep === 1 && !isRental && (
                  <BATrackerSurveyItems
                    formData={formData}
                    setFormData={setFormData}
                    baOperatingItems={baOperatingItems}
                    setBaOperatingItems={setBaOperatingItems}
                    baMDOItems={baMDOItems}
                    setBaMDOItems={setBaMDOItems}
                    baDeductionItems={baDeductionItems}
                    setBaDeductionItems={setBaDeductionItems}
                    isInlineEditingBA={isInlineEditingBA}
                    activeSOWCatalog={activeSOWCatalog}
                    mRate={mRate}
                    allBAItems={allBAItems}
                    isDistanceItem={isDistanceItem}
                    getBAEffectiveVolume={getBAEffectiveVolume}
                    calc={calc}
                    setActiveBAStep={setActiveBAStep}
                    rfIndexCalculated={rfIndexCalculated}
                    latestKursBI={latestKursBI}
                    raiseFallMasters={raiseFallMasters}
                    minWageMasters={minWageMasters}
                    reorderBAItems={reorderBAItems}
                    moveBAItem={moveBAItem}
                    getSowMasterRate={getSowMasterRate}
                  />
                )}

                {activeBAStep === 2 && !isRental && (
                  <BATrackerSurveyMatrix
                    allBAItems={allBAItems}
                    baOperatingItems={baOperatingItems}
                    setBaOperatingItems={setBaOperatingItems}
                    baMDOItems={baMDOItems}
                    setBaMDOItems={setBaMDOItems}
                    baDeductionItems={baDeductionItems}
                    setBaDeductionItems={setBaDeductionItems}
                    isInlineEditingBA={isInlineEditingBA}
                    formData={formData}
                    isCustomerBGG={isCustomerBGG}
                    isDistanceItem={isDistanceItem}
                    preview={preview ?? (pending ? pv : editItem)}
                    setActiveBAStep={setActiveBAStep}
                  />
                )}

                {pv && (
                  <table className="w-full max-w-md text-xs border border-slate-200 rounded-[4px]">
                    <tbody className="divide-y divide-slate-100">
                      <tr><td className="p-2 font-bold text-slate-600">BA Utama</td><td className="p-2 text-right font-mono font-bold">{formatIDR(editItem?.workAmount || 0)}</td></tr>
                      <tr><td className="p-2 font-bold text-slate-600">Pending Volume</td><td className="p-2 text-right font-mono font-bold">{formatIDR(pv.amount || 0)}</td></tr>
                      <tr className="bg-slate-50"><td className="p-2 font-black text-slate-900">Total JV Akrual</td><td className="p-2 text-right font-mono font-black">{formatIDR(Number(editItem?.workAmount || 0) + Number(pv.amount || 0))}</td></tr>
                    </tbody>
                  </table>
                )}

                {/* Verifikasi Pending Volume: Finance Specialist saja, tanpa approval Manager */}
                {pending && pv && !isInlineEditingBA && (
                  <div className="max-w-md p-3 rounded-[4px] border border-slate-200 space-y-2">
                    <div className="flex justify-between gap-2 font-bold">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">Verifikator: Finance Specialist</span>
                      <span className={pv.verifiedBy ? "text-[#A57C50]" : pv.rejectNote ? "text-rose-700" : "text-amber-700"}>
                        {pv.verifiedBy ? `${pv.verifiedBy} · ${new Date(pv.verifiedAt).toLocaleString("id-ID")}` : pv.rejectNote ? "Revisi" : "Menunggu Verifikasi"}
                      </span>
                    </div>
                    {pv.rejectNote && <div className="text-rose-700">{pv.rejectNote}</div>}
                  </div>
                )}
                </>)}
              </div>

              {/* Right Column: Sidebar */}
              <BATrackerSidebar
                formData={formData}
                setFormData={setFormData}
                editItem={editItem}
                invoiceRows={invoiceRows}
                calc={calc}
                baAuditLogs={baAuditLogs}
                isInlineEditingBA={isInlineEditingBA}
                handleFileUpload={can("ba_tracker", "upload") ? handleFileUpload : undefined}
              />
            </div>
          </div>

          {/* Form Action Buttons (Sticky Bottom) */}
          <div className="flex items-center justify-between p-4 sm:p-5 pt-3 border-t border-slate-200 bg-white shrink-0 sticky bottom-0 z-20">
            <div className="flex items-center gap-2 flex-wrap">
              {editItem && !isInlineEditingBA && (!pending || pendingEditable) && (
                <button
                  type="button"
                  onClick={() => { setBaTab("input"); setIsInlineEditingBA(true); }}
                  className="px-5 py-2 rounded-[3px] bg-[#A57C50] hover:bg-[#8e6941] text-white font-black text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Edit2 size={14} /> {pending ? "Edit Pending Volume" : "Ubah / Edit Data BA Ini"}
                </button>
              )}
              {pending && pv && !isInlineEditingBA && pendingEditable && (
                <button
                  type="button"
                  onClick={() => handleDeletePendingVolume(editItem)}
                  className="px-4 py-2 rounded-[3px] border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition cursor-pointer"
                >
                  Hapus Pending Volume
                </button>
              )}
              {(canVerifyMain || canVerifyPending) && (
                <>
                  <button
                    type="button"
                    // Verifikasi lewat endpoint server (verifikator = user login, akrual GL diposting server).
                    onClick={() => canVerifyPending
                      ? actPending("verify_pending", "Verifikasi Pending Volume oleh Finance Specialist")
                      : act(() => verifyBATracker(editItem.id, "verify", "Verifikasi Berita Acara oleh Finance Specialist"))}
                    className="px-4 py-2 rounded-[3px] bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <CheckCircle2 size={14} /> {canVerifyPending ? "Verifikasi Pending Volume" : "Verifikasi"}
                  </button>
                  <button
                    type="button"
                    onClick={() => reject((note) => canVerifyPending ? actPending("reject_pending", note) : act(() => verifyBATracker(editItem.id, "reject", note)))}
                    className="px-4 py-2 rounded-[3px] border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <X size={14} /> Reject
                  </button>
                </>
              )}
              {canApproveMain && (
                <button
                  type="button"
                  onClick={() => act(() => approveBATracker(editItem.id, "approve", "Disetujui oleh Manager"))}
                  className="px-4 py-2 rounded-[3px] bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <CheckCircle2 size={14} /> Approve
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="px-5 py-2 rounded-[3px] border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold transition shadow-xs text-xs cursor-pointer"
                onClick={() => setModalType("none")}
              >
                {!isInlineEditingBA ? "Tutup Pratinjau" : "Batal"}
              </button>

              {isInlineEditingBA && (
                <button
                  type="submit"
                  title="Ctrl + S"
                  disabled={isSaving}
                  className="primary px-6 py-2 rounded-[3px] bg-[#A57C50] hover:bg-[#8e6941] disabled:bg-slate-400 text-white font-black shadow-md transition text-xs flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      <span>Simpan Perubahan Berita Acara</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {askPending && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40">
          <div className="max-h-[90dvh] overflow-y-auto bg-white rounded-[4px] border border-slate-200 shadow-2xl p-5 w-full max-w-sm space-y-4">
            <h4 className="text-sm font-black text-slate-900">Apakah Ada Pending Volume?</h4>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => saveAnswer(false)} className="px-5 py-2 rounded-[3px] border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer">Tidak</button>
              <button type="button" onClick={() => saveAnswer(true)} className="px-5 py-2 rounded-[3px] bg-[#A57C50] hover:bg-[#8e6941] text-white font-black text-xs cursor-pointer">Ya</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
