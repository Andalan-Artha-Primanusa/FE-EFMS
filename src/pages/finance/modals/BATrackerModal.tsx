import React, { useState, useEffect } from "react";
import { X, Edit2, CheckCircle2, Loader2 } from "lucide-react";
import { renderBAStatusBadge, formatIDR } from "../helpers";
import { getBAAuditLogs, verifyBATracker } from "../../../lib/api";
import {
  isDistanceItem,
  getBAEffectiveVolume,
  getBAItemSubtotal,
  calculateBACommercialBreakdown,
  customerKind,
  canEditPending,
} from "../ba_calculations";
import { BATrackerHeaderForm } from "./BATrackerHeaderForm";
import { BATrackerSurveyItems } from "./BATrackerSurveyItems";
import { BATrackerSurveyMatrix } from "./BATrackerSurveyMatrix";
import { BATrackerFinancialRecap } from "./BATrackerFinancialRecap";
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
    setDetailViewItem,
    createInvoiceFromBA,
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

  const [auditTab, setAuditTab] = useState<"flow" | "activity">("flow");
  const [baAuditLogs, setBaAuditLogs] = useState<any[]>([]);
  const [askPending, setAskPending] = useState(false);

  const kind = customerKind(formData.customerCode);
  const isCustomerBGG = kind === "BGG";
  const isCustomerPOS = kind === "POS";
  const isCustomerDBK = kind === "PTRO";
  const pending = Boolean(formData.pendingMode);
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

  const calcSubtotal = (it: any, vol: number) => getBAItemSubtotal(it, vol, isCustomerDBK, formData.customerCode);
  const sumInitial = allBAItems.reduce((acc, it) => acc + calcSubtotal(it, getBAEffectiveVolume(it, allBAItems, false)), 0);
  const sumAdjusted = allBAItems.reduce((acc, it) => acc + calcSubtotal(it, getBAEffectiveVolume(it, allBAItems, true)), 0);
  const deltaAmount = sumAdjusted - sumInitial;

  const activeFuelPeriods = formData.bggData?.fuelPeriods || formData.posData?.fuelPeriods || formData.ptroData?.fuelPeriods || formData.sbsData?.fuelPeriods;
  const effectiveRF = Number(
    (isCustomerBGG && (formData.bggData?.bggRfIndex || formData.bggRfIndex)) ||
    (isCustomerPOS && (formData.posData?.posRfIndex || formData.posRfIndex)) ||
    formData.rfIndexCalculated ||
    rfIndexCalculated ||
    1.0
  );
  const hasAdjusted = allBAItems.some((it) => !it.isDeduction && it.category !== "DP Fuel" && Number(it.adjustedVolume || 0) > 0);

  const breakdownInitial = calculateBACommercialBreakdown(formData.customerCode, allBAItems, effectiveRF, isCustomerDBK, false, activeFuelPeriods);
  const breakdownAdjusted = calculateBACommercialBreakdown(formData.customerCode, allBAItems, effectiveRF, isCustomerDBK, true, activeFuelPeriods);
  const activeBreakdown = (hasAdjusted && breakdownAdjusted.totalGross > 0) ? breakdownAdjusted : breakdownInitial;

  const totalClaimInitial = breakdownInitial.totalGross > 0 ? breakdownInitial.totalGross : sumInitial;
  const totalClaimAdjusted = (hasAdjusted && breakdownAdjusted.totalGross > 0) ? breakdownAdjusted.totalGross : totalClaimInitial;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCustomerBGG && !pending && !formData.pendingVolume) setAskPending(true);
    else handleSave(e);
  };
  const saveAnswer = (openPending: boolean) => { setAskPending(false); handleSave(undefined, openPending); };
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
      <div className="bg-white border border-slate-200 rounded-[4px] w-full max-w-[96vw] 2xl:max-w-[1550px] shadow-2xl flex flex-col max-h-[96vh] transition-all overflow-hidden">
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

                {activeBAStep === 1 && (
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
                    getBAItemSubtotal={calcSubtotal}
                    sumInitial={sumInitial}
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

                {activeBAStep === 2 && (
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
                    getBAEffectiveVolume={getBAEffectiveVolume}
                    getBAItemSubtotal={calcSubtotal}
                    sumInitial={sumInitial}
                    sumAdjusted={sumAdjusted}
                    deltaAmount={deltaAmount}
                    totalClaimInitial={totalClaimInitial}
                    totalClaimAdjusted={totalClaimAdjusted}
                    setActiveBAStep={setActiveBAStep}
                  />
                )}

                {activeBAStep === 3 && !pending && (
                  <BATrackerFinancialRecap
                    formData={formData}
                    setFormData={setFormData}
                    editItem={editItem}
                    isInlineEditingBA={isInlineEditingBA}
                    canVerifyBA={canVerifyBA}
                    canApproveBA={can("ba_tracker", "approve")}
                    user={user}
                    invoiceRows={invoiceRows}
                    setModalType={setModalType}
                    setDetailViewItem={setDetailViewItem}
                    createInvoiceFromBA={can("invoice", "write") ? createInvoiceFromBA : undefined}
                    setActiveBAStep={setActiveBAStep}
                    baAuditLogs={baAuditLogs}
                    auditTab={auditTab}
                    setAuditTab={setAuditTab}
                    allBAItems={allBAItems}
                    rfIndexCalculated={rfIndexCalculated}
                    latestKursBI={latestKursBI}
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
                    {canVerifyBA && !pv.verifiedBy && !pv.billedInvoiceId && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => actPending("verify_pending", "Verifikasi Pending Volume oleh Finance Specialist")}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#A57C50] hover:bg-[#8e6941] text-white font-bold text-xs rounded-[3px] shadow-xs transition cursor-pointer"
                        >
                          <CheckCircle2 size={14} /> Verifikasi Pending Volume
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const note = window.prompt("Alasan Reject");
                            if (note) actPending("reject_pending", note);
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-[3px] transition cursor-pointer"
                        >
                          <X size={14} /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Sidebar */}
              <BATrackerSidebar
                formData={formData}
                editItem={editItem}
                invoiceRows={invoiceRows}
                sumInitial={totalClaimInitial}
                sumAdjusted={totalClaimAdjusted}
                netTotalInvoice={activeBreakdown.netTotalInvoice}
                auditTab={auditTab}
                setAuditTab={setAuditTab}
                baAuditLogs={baAuditLogs}
                isInlineEditingBA={isInlineEditingBA}
                handleFileUpload={can("ba_tracker", "upload") ? handleFileUpload : undefined}
              />
            </div>
          </div>

          {/* Form Action Buttons (Sticky Bottom) */}
          <div className="flex items-center justify-between p-4 sm:p-5 pt-3 border-t border-slate-200 bg-white shrink-0 sticky bottom-0 z-20">
            <div>
              {editItem && !isInlineEditingBA && (!pending || pendingEditable) && (
                <button
                  type="button"
                  onClick={() => setIsInlineEditingBA(true)}
                  className="px-5 py-2 rounded-[3px] bg-[#A57C50] hover:bg-[#8e6941] text-white font-black text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Edit2 size={14} /> {pending ? "Edit Pending Volume" : "Ubah / Edit Data BA Ini"}
                </button>
              )}
              {pending && pv && !isInlineEditingBA && pendingEditable && (
                <button
                  type="button"
                  onClick={() => handleDeletePendingVolume(editItem)}
                  className="ml-2 px-4 py-2 rounded-[3px] border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition cursor-pointer"
                >
                  Hapus Pending Volume
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
          <div className="bg-white rounded-[4px] border border-slate-200 shadow-2xl p-5 w-full max-w-sm space-y-4">
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
