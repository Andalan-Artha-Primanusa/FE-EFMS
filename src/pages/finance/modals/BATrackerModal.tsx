import React, { useState, useEffect } from "react";
import { X, Edit2, CheckCircle2, Loader2 } from "lucide-react";
import { renderBAStatusBadge } from "../helpers";
import { getAuditLogs } from "../../../lib/api";
import {
  isDistanceItem,
  getBAEffectiveVolume,
  getBAItemSubtotal,
  calculateBACommercialBreakdown,
  bggOBBillableFactor,
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
    isFinanceSpecialist,
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
  } = c || {};

  const [auditTab, setAuditTab] = useState<"flow" | "activity">("flow");
  const [baAuditLogs, setBaAuditLogs] = useState<any[]>([]);

  const isCustomerBGG = formData.customerCode === "BGG" || formData.customerCode === "PT BGG";
  const isCustomerPOS = formData.customerCode === "POS" || formData.customerCode === "PT POSITION" || formData.customerCode === "PT. POSITION" || formData.customerCode === "PT POS";
  const isCustomerDBK = formData.customerCode === "PTRO" || formData.customerCode === "DBK";
  const allBAItems = [...baOperatingItems, ...baMDOItems, ...(baDeductionItems || [])];

  useEffect(() => {
    const targetId = String(formData?.id || editItem?.id || "");
    if (!targetId) return;
    getAuditLogs({ referenceType: "ba_tracker", referenceId: targetId })
      .then((logs) => {
        if (Array.isArray(logs) && logs.length > 0) {
          setBaAuditLogs(logs);
        }
      })
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

  const breakdownInitial = calculateBACommercialBreakdown(formData.customerCode, allBAItems, effectiveRF, isCustomerDBK, false, activeFuelPeriods, bggOBBillableFactor(formData.customerCode, formData));
  const breakdownAdjusted = calculateBACommercialBreakdown(formData.customerCode, allBAItems, effectiveRF, isCustomerDBK, true, activeFuelPeriods, bggOBBillableFactor(formData.customerCode, formData));
  const activeBreakdown = (hasAdjusted && breakdownAdjusted.totalGross > 0) ? breakdownAdjusted : breakdownInitial;

  const totalClaimInitial = breakdownInitial.totalGross > 0 ? breakdownInitial.totalGross : sumInitial;
  const totalClaimAdjusted = (hasAdjusted && breakdownAdjusted.totalGross > 0) ? breakdownAdjusted.totalGross : totalClaimInitial;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof handleSave === "function") {
      handleSave(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-1.5 sm:p-3">
      <div className="bg-white border border-slate-200 rounded-[4px] w-full max-w-[96vw] 2xl:max-w-[1550px] shadow-2xl flex flex-col max-h-[96vh] transition-all overflow-hidden">
        {/* Modal Header (Sticky Top) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 p-4 sm:p-5 pb-3 bg-white shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
            <h3 className="text-lg sm:text-xl font-black text-slate-900 truncate">
              {editItem ? `Berita Acara: ${formData.baNumber || formData.signedBANumber || formData.draftBARefNo || "Draft BA"}` : "Input Berita Acara Baru"}
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
                    getBGGActiveCoalTier={getBGGActiveCoalTier}
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
                    handleFileUpload={handleFileUpload}
                    setActiveBAStep={setActiveBAStep}
                  />
                )}

                {activeBAStep === 3 && (
                  <BATrackerFinancialRecap
                    formData={formData}
                    setFormData={setFormData}
                    editItem={editItem}
                    isInlineEditingBA={isInlineEditingBA}
                    isFinanceSpecialist={isFinanceSpecialist}
                    user={user}
                    invoiceRows={invoiceRows}
                    setModalType={setModalType}
                    setDetailViewItem={setDetailViewItem}
                    createInvoiceFromBA={createInvoiceFromBA}
                    setActiveBAStep={setActiveBAStep}
                    baAuditLogs={baAuditLogs}
                    auditTab={auditTab}
                    setAuditTab={setAuditTab}
                    allBAItems={allBAItems}
                    rfIndexCalculated={rfIndexCalculated}
                    latestKursBI={latestKursBI}
                  />
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
              />
            </div>
          </div>

          {/* Form Action Buttons (Sticky Bottom) */}
          <div className="flex items-center justify-between p-4 sm:p-5 pt-3 border-t border-slate-200 bg-white shrink-0 sticky bottom-0 z-20">
            <div>
              {editItem && !isInlineEditingBA && (
                <button
                  type="button"
                  onClick={() => setIsInlineEditingBA(true)}
                  className="px-5 py-2 rounded-[3px] bg-[#A57C50] hover:bg-[#8e6941] text-white font-black text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Edit2 size={14} /> Ubah / Edit Data BA Ini
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
    </div>
  );
}
