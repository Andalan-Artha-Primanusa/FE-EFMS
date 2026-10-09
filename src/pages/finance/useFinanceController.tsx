import { useState, useEffect, useCallback } from "react";
import { Clock } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { SBSPenaltyItem, User as UserType } from "../../lib/api";
import { createFinanceCalculations, getSBSTarifByDistance, fetchServerInvoicePreview } from "./calculations";
import { createFinanceExporters } from "./exporters";
import { buildInvoiceItemsFromBA } from "./invoiceItemGenerator";
import { useFinanceMasterData } from "./useFinanceMasterData";
import { useFinanceBAState } from "./useFinanceBAState";
import { useFinanceInvoiceState } from "./useFinanceInvoiceState";
import { useFinanceModalManager } from "./useFinanceModalManager";
import { useFinanceSaveHandlers } from "./useFinanceSaveHandlers";
import { useFinanceDataLoader } from "./useFinanceDataLoader";
import { useFinanceUIState } from "./useFinanceUIState";

export function useFinanceController({
  viewTitle,
  query,
  onNotice,
  user
}: {
  viewTitle: string;
  query: string;
  onNotice: (msg: string) => void;
  user?: UserType;
}) {
  const dataLoader = useFinanceDataLoader({ viewTitle, user, onNotice });
  const {
    loading, setLoading, dashboardData, setDashboardData, baRows, setBaRows,
    invoiceRows, setInvoiceRows, paymentRows, setPaymentRows, customerRows, setCustomerRows,
    pendingVolumeLedgers, setPendingVolumeLedgers, sbsPenalties, setSbsPenalties,
    accountingJournals, userRole, isSuper, isFinanceSpecialist, isSPV, isManager, isDirector,
    loadData
  } = dataLoader;

  const uiState = useFinanceUIState();
  const {
    sbsPenaltyModalOpen, setSbsPenaltyModalOpen, sbsPenaltyEditItem, setSbsPenaltyEditItem,
    baFilter, setBaFilter, periodFilter, setPeriodFilter, invStatusFilter, setInvStatusFilter,
    invCardTab, setInvCardTab, invPeriodFilter, setInvPeriodFilter,
    modalType, setModalType, editItem, setEditItem, isSaving, setIsSaving,
    formData, setFormData, showActivityGroupDropdown, setShowActivityGroupDropdown,
    showExportBADropdown, setShowExportBADropdown, showInputBADropdown, setShowInputBADropdown,
    showExportARDropdown, setShowExportARDropdown, showInputARDropdown, setShowInputARDropdown,
    baRowActionDropdownId, setBaRowActionDropdownId, detailViewItem, setDetailViewItem,
    showPendingVolumeDrawer, setShowPendingVolumeDrawer, showAddPartialPayment, setShowAddPartialPayment,
    partialPaymentForm, setPartialPaymentForm, deletingKey, setDeletingKey, actionLoadingKey, setActionLoadingKey,
    getCurrentMonthPeriod, getPreviousMonthPeriod
  } = uiState;

  // Master Data Hook
  const masterData = useFinanceMasterData(formData.customerCode, customerRows, formData.workPeriod);
  const {
    mRate, setMRate, fuelPriceUSD, setFuelPriceUSD, laborPriceIDR, setLaborPriceIDR,
    dynamicSowOptions, setDynamicSowOptions, bankAccountOptions, setBankAccountOptions,
    latestKursBI, coalIndexMaster, getBGGActiveCoalTier, getSowMasterRate,
    financeTemplates, setFinanceTemplates, templatesLoaded, setTemplatesLoaded, templateRows, masterBankAccounts,
    rfIndexCalculated, defaultMasterVariableOptions, masterVariableOptions, activeSOWCatalog,
    customerContractMap, applyRateLookup, blankPOSItems, demoPOSItems, blankBGGItems, demoBGGItems,
    blankPTROItems, blankDBKItems, demoPTROItems, demoDBKItems, blankSBSItems, demoSBSItems,
    defaultPOSBAOperatingItems, defaultPOSBAMDOItems, defaultBGGBAItems, defaultPTROBAItems, defaultDBKBAItems,
    defaultSBSBAOperatingItems, defaultSBSBAMDOItems, defaultSBSBADeductionItems, syncBARatesWithMasterData, reloadMasterData,
    raiseFallMasters, raiseFallMaster, minWageMasters
  } = masterData;

  // BA State Hook
  const baState = useFinanceBAState({
    setEditItem, setFormData, setDetailViewItem, setModalType, loadData, onNotice,
    defaultBGGBAItems, defaultDBKBAItems, defaultPTROBAItems, defaultSBSBAOperatingItems, defaultPOSBAOperatingItems, defaultPOSBAMDOItems,
    detailViewItem, getCurrentMonthPeriod, getSowMasterRate, syncBARatesWithMasterData, actionLoadingKey, setActionLoadingKey,
    setBaRows
  });
  const {
    baOperatingItems, setBaOperatingItems, baMDOItems, setBaMDOItems, baDeductionItems, setBaDeductionItems,
    activeBAStep, setActiveBAStep, isInlineEditingBA, setIsInlineEditingBA, showAddRowDropdown, setShowAddRowDropdown,
    openBAModal, handleVerifyBA, handleApproveBA, handleAccrueBA, handleSaveBGGBA,
    reorderBAItems, moveBAItem, createBlankBGGBAItems, createBlankSBSBAItems
  } = baState;

  // Invoice State Hook
  const invoiceState = useFinanceInvoiceState({
    formData, setFormData, blankPOSItems, demoPOSItems, blankBGGItems, demoBGGItems,
    blankPTROItems, demoPTROItems, blankSBSItems, demoSBSItems, masterVariableOptions,
    latestKursBI, mRate, onNotice, loadData, detailViewItem, setDetailViewItem, getSowMasterRate,
    actionLoadingKey, setActionLoadingKey,
    setInvoiceRows, setBaRows
  });
  const {
    posInvoiceCategory, setPosInvoiceCategory, invLineItems, setInvLineItems,
    selectedVarA, setSelectedVarA, selectedVarB, setSelectedVarB, selectedVarC, setSelectedVarC,
    selectedVarD, setSelectedVarD, selectedVarE, setSelectedVarE, selectedVarF, setSelectedVarF,
    selectedVarP, setSelectedVarP, addVariableToSection,
    removeInvLineItem, updateInvItemVolume, updateInvItemOverhaul, updateInvItemRateIDR,
    updateInvItemRateUSD, updateInvItemKurs, updateInvItemAmount, addInvLineItem,
    updateInvItemField, reorderInvLineItems, moveInvRow, handleGenerateInvoiceFromBA,
    handleVerifyInvoice, handleApproveInvoice, handleApproveInvoiceTier1, handleApproveInvoiceTier2
  } = invoiceState;

  // Invoice calculations via calculations.tsx
  const {
    getItemEffectiveVolume, getItemEffectiveOverhaulMtr,
    calculateItemRateAndAmount, getCustomerCalculations,
  } = createFinanceCalculations({ formData, invLineItems, rfIndexCalculated, getSowMasterRate, mRate });

  // Authoritative Backend SSOT Real-time Calculation
  const [serverInvoiceCalc, setServerInvoiceCalc] = useState<any>(null);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const payload = {
          customerCode: formData.customerCode,
          workPeriod: formData.workPeriod,
          lineItems: invLineItems,
          items: invLineItems,
        };
        const res = await fetchServerInvoicePreview(payload);
        if (active && res) {
          setServerInvoiceCalc(res);
        }
      } catch (err) {
        console.error("Gagal sinkronisasi perhitungan invoice BE:", err);
      }
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [invLineItems, formData.customerCode, formData.workPeriod]);

  const getAuthoritativeCustomerCalculations = useCallback((itemsList: any[], custCode?: string) => {
    const local = getCustomerCalculations(itemsList, custCode);
    if (!serverInvoiceCalc) return local;
    return {
      subtotalA: serverInvoiceCalc.subtotalA ?? local.subtotalA,
      subtotalB: serverInvoiceCalc.subtotalB ?? local.subtotalB,
      subtotalC: serverInvoiceCalc.subtotalC ?? local.subtotalC,
      subtotalD: serverInvoiceCalc.subtotalD ?? local.subtotalD,
      subtotalE: serverInvoiceCalc.subtotalE ?? local.subtotalE,
      subtotalF: serverInvoiceCalc.subtotalF ?? local.subtotalF,
      subtotalP: serverInvoiceCalc.subtotalP ?? local.subtotalP,
      totalGross: serverInvoiceCalc.revenueGross ?? local.totalGross,
      dpp11_12: serverInvoiceCalc.dpp11_12 ?? local.dpp11_12,
      vat12: serverInvoiceCalc.ppn12 ?? local.vat12,
      pph23: serverInvoiceCalc.pph23 ?? local.pph23,
      totalInvoice: serverInvoiceCalc.totalInvoice ?? local.totalInvoice,
      totalDibayar: serverInvoiceCalc.totalDibayar ?? local.totalDibayar,
    };
  }, [getCustomerCalculations, serverInvoiceCalc]);

  const calcs = getAuthoritativeCustomerCalculations(invLineItems, formData.customerCode);
  const { subtotalA, subtotalB, subtotalC, subtotalD, subtotalE, subtotalF, subtotalP, totalGross: totalGrossCalc, dpp11_12: dpp11_12Calc, vat12: vat12Calc, pph23: pph23Calc, totalInvoice: netTotalInvoiceCalc, totalDibayar: totalDibayarCalc } = calcs;

  // Generator Adapter
  const buildInvItems = (ba: any, custCode?: string, category: "Operation & Mining" | "MDO" = "Operation & Mining") => {
    return buildInvoiceItemsFromBA(ba, custCode, category, {
      baRows, baMDOItems, latestKursBI, rfIndexCalculated, demoBGGItems, demoPTROItems, demoDBKItems, blankSBSItems, demoSBSItems,
      blankBGGItems, blankPTROItems, blankPOSItems
    });
  };

  // Exporters Snapshot
  const exportCtx = {
    baRows, buildInvoiceItemsFromBA: buildInvItems, calculateItemRateAndAmount, customerContractMap,
    formData, getCustomerCalculations: getAuthoritativeCustomerCalculations, getItemEffectiveOverhaulMtr, getItemEffectiveVolume, invLineItems,
    invoiceRows, invPeriodFilter, onNotice, periodFilter, query, rfIndexCalculated,
    subtotalA, subtotalB, subtotalC, subtotalD, subtotalE, subtotalF
  };
  const {
    exportPaymentDetailPDF, exportBADocumentPDF, exportARBAIMonitoringExcel, exportARBAIMonitoringPDF,
    exportBAOnlyExcel, exportBAOnlyPDF, exportAROnlyExcel, exportAROnlyPDF,
    exportCoretaxEFakturCSV, exportEBupotPPh23CSV
  } = createFinanceExporters(exportCtx);

  const {
    handleCompanySelect, handleBASelect, createInvoiceFromBA,
    openCreateModal, openEditModal, handleFileUpload
  } = useFinanceModalManager({
    user, formData, setFormData, customerRows, customerContractMap, invoiceRows, baRows,
    setInvLineItems, blankPOSItems, blankBGGItems, blankPTROItems, blankSBSItems,
    buildInvItems, onNotice, setModalType, setEditItem, setDetailViewItem,
    setIsInlineEditingBA, createBlankBGGBAItems, createBlankSBSBAItems, defaultDBKBAItems, defaultPTROBAItems,
    defaultPOSBAOperatingItems, defaultSBSBAMDOItems, defaultPOSBAMDOItems, defaultSBSBADeductionItems,
    setBaOperatingItems, setBaMDOItems, setBaDeductionItems, setActiveBAStep,
    setShowPendingVolumeDrawer, openBAModal, getCurrentMonthPeriod, getPreviousMonthPeriod,
    raiseFallMasters, minWageMasters, latestKursBI, mRate
  });

  const {
    handleSave, handleDelete, handleSavePartialPayment,
    handleVerifyPartialPayment, handleSaveSBSPenalty, handleDeleteSBSPenalty
  } = useFinanceSaveHandlers({
    isSaving, setIsSaving, modalType, setModalType, formData, editItem, setEditItem,
    baOperatingItems, baMDOItems, baDeductionItems, invLineItems, baRows, setBaRows, loadData, reloadMasterData, onNotice,
    setShowPendingVolumeDrawer, totalGrossCalc, dpp11_12Calc, vat12Calc, pph23Calc,
    netTotalInvoiceCalc, calcs, rfIndexCalculated, detailViewItem, setDetailViewItem,
    partialPaymentForm, setPartialPaymentForm, setShowAddPartialPayment, setInvoiceRows,
    setPaymentRows, setCustomerRows, setPendingVolumeLedgers, setSbsPenalties,
    setSbsPenaltyModalOpen, setSbsPenaltyEditItem,
    deletingKey, setDeletingKey, actionLoadingKey, setActionLoadingKey
  });

  const openSBSPenaltyModal = (item?: SBSPenaltyItem) => { setSbsPenaltyEditItem(item || null); setSbsPenaltyModalOpen(true); };
  const closeSBSPenaltyModal = () => { setSbsPenaltyEditItem(null); setSbsPenaltyModalOpen(false); };

  if (loading) {
    return (
      <div className="workspace-body">
        <PageHeader title={viewTitle} description="Memuat data keuangan dan penagihan..." />
        <div className="panel flex items-center justify-center p-12 text-slate-500 bg-white border border-slate-200 rounded-xl shadow-sm">
          <Clock className="animate-spin mr-2 text-cyan-600" size={20} /> Memuat data...
        </div>
      </div>
    );
  }

  // Previews & Matrix
  const volPreview = Number(formData.volume || 0);
  const ratePreview = Number(formData.rate || 0);
  const grossPreview = volPreview * ratePreview;
  const solarPreview = Number(formData.solarDeduction || 0);
  const subtotalDPPPreview = grossPreview - solarPreview;
  const ppn11Preview = subtotalDPPPreview * 0.11;
  const pph23Preview = subtotalDPPPreview * 0.02;
  const totalNetInvoicePreview = subtotalDPPPreview + ppn11Preview - pph23Preview;

  const totalAgingMatrix = (dashboardData?.agingMatrix ?? []).reduce(
    (acc: any, row: any) => ({
      notDue: acc.notDue + (row.notDue || 0),
      bucket1_30: acc.bucket1_30 + (row.bucket1_30 || 0),
      bucket31_60: acc.bucket31_60 + (row.bucket31_60 || 0),
      bucket61_90: acc.bucket61_90 + (row.bucket61_90 || 0),
      bucketOver90: acc.bucketOver90 + (row.bucketOver90 || 0),
      total: acc.total + (row.total || 0),
      invoiceCount: acc.invoiceCount + (row.invoiceCount || 0),
    }),
    { notDue: 0, bucket1_30: 0, bucket31_60: 0, bucket61_90: 0, bucketOver90: 0, total: 0, invoiceCount: 0 }
  );

  return {
    loading, setLoading, dashboardData, setDashboardData, baRows, setBaRows, userRole, isSuper,
    isFinanceSpecialist, isSPV, isManager, isDirector, invoiceRows, setInvoiceRows, paymentRows,
    setPaymentRows, customerRows, setCustomerRows, pendingVolumeLedgers, setPendingVolumeLedgers,
    sbsPenalties, setSbsPenalties, sbsPenaltyModalOpen, setSbsPenaltyModalOpen, sbsPenaltyEditItem,
    setSbsPenaltyEditItem, handleSaveSBSPenalty, handleDeleteSBSPenalty, openSBSPenaltyModal,
    closeSBSPenaltyModal, showPendingVolumeDrawer, setShowPendingVolumeDrawer, baFilter, setBaFilter,
    periodFilter, setPeriodFilter, invStatusFilter, setInvStatusFilter, invCardTab, setInvCardTab,
    invPeriodFilter, setInvPeriodFilter, modalType, setModalType, editItem, setEditItem, isSaving,
    formData, setFormData, showActivityGroupDropdown, setShowActivityGroupDropdown, showExportBADropdown,
    setShowExportBADropdown, showInputBADropdown, setShowInputBADropdown, showExportARDropdown,
    setShowExportARDropdown, showInputARDropdown, setShowInputARDropdown, baRowActionDropdownId,
    setBaRowActionDropdownId, detailViewItem, setDetailViewItem, isInlineEditingBA, setIsInlineEditingBA,
    showAddPartialPayment, setShowAddPartialPayment, partialPaymentForm, setPartialPaymentForm, mRate,
    setMRate, fuelPriceUSD, setFuelPriceUSD, laborPriceIDR, setLaborPriceIDR, dynamicSowOptions,
    setDynamicSowOptions, bankAccountOptions, setBankAccountOptions, getSowMasterRate, financeTemplates,
    setFinanceTemplates, templatesLoaded, setTemplatesLoaded, templateRows, masterBankAccounts,
    rfIndexCalculated, defaultMasterVariableOptions, masterVariableOptions, activeSOWCatalog,
    applyRateLookup, blankPOSItems, demoPOSItems, blankBGGItems, demoBGGItems, blankPTROItems,
    blankDBKItems, demoPTROItems, demoDBKItems, blankSBSItems, demoSBSItems, defaultPOSBAOperatingItems,
    defaultPOSBAMDOItems, defaultBGGBAItems, defaultPTROBAItems, defaultDBKBAItems, defaultSBSBAOperatingItems,
    defaultSBSBAMDOItems, defaultSBSBADeductionItems, latestKursBI, coalIndexMaster, getBGGActiveCoalTier,
    baOperatingItems, setBaOperatingItems, baMDOItems, setBaMDOItems, baDeductionItems, setBaDeductionItems,
    reorderBAItems, moveBAItem, activeBAStep, setActiveBAStep, showAddRowDropdown, setShowAddRowDropdown, posInvoiceCategory,
    setPosInvoiceCategory, invLineItems, setInvLineItems, selectedVarA, setSelectedVarA, selectedVarB,
    setSelectedVarB, selectedVarC, setSelectedVarC, selectedVarD, setSelectedVarD, selectedVarE,
    setSelectedVarE, selectedVarF, setSelectedVarF, selectedVarP, setSelectedVarP, addVariableToSection,
    customerContractMap, handleCompanySelect, removeInvLineItem, addInvLineItem, updateInvItemField,
    reorderInvLineItems, moveInvRow, updateInvItemVolume, updateInvItemOverhaul, updateInvItemRateIDR,
    updateInvItemRateUSD, updateInvItemKurs, updateInvItemAmount, getItemEffectiveVolume,
    getItemEffectiveOverhaulMtr, calculateItemRateAndAmount, getCustomerCalculations: getAuthoritativeCustomerCalculations,
    getSBSTarifByDistance, calcs, subtotalA, subtotalB, subtotalC, subtotalD,
    subtotalE, subtotalF, subtotalP, totalGrossCalc, dpp11_12Calc, vat12Calc, pph23Calc,
    netTotalInvoiceCalc, totalDibayarCalc, exportPaymentDetailPDF, exportBADocumentPDF,
    exportARBAIMonitoringExcel, exportARBAIMonitoringPDF, exportBAOnlyExcel, exportBAOnlyPDF,
    exportAROnlyExcel, exportAROnlyPDF, exportCoretaxEFakturCSV, exportEBupotPPh23CSV, loadData, reloadMasterData,
    handleSavePartialPayment, handleVerifyPartialPayment, buildInvoiceItemsFromBA: buildInvItems,
    handleBASelect, createInvoiceFromBA, openBAModal, openCreateModal, openEditModal, handleFileUpload,
    handleSave, handleVerifyBA, handleApproveBA, handleAccrueBA, handleSaveBGGBA,
    handleGenerateInvoiceFromBA, handleVerifyInvoice, handleApproveInvoice, handleApproveInvoiceTier1,
    handleApproveInvoiceTier2, handleDelete, volPreview, ratePreview, grossPreview, solarPreview,
    subtotalDPPPreview, ppn11Preview, pph23Preview, totalNetInvoicePreview, totalAgingMatrix, viewTitle,
    query, onNotice, user, accountingJournals, deletingKey, setDeletingKey, actionLoadingKey, setActionLoadingKey,
    raiseFallMasters, raiseFallMaster, minWageMasters
  };
}
