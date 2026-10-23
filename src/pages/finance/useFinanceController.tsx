import { useState, useEffect, useCallback, useRef } from "react";
import { draftKey, isBAApproved } from "./helpers";
import { Clock } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { SBSPenaltyItem, User as UserType } from "../../lib/api";
import { getSBSTarifByDistance } from "./calculations";
import { createFinanceExporters } from "./exporters";
import { useFinanceMasterData } from "./useFinanceMasterData";
import { useFinanceBAState } from "./useFinanceBAState";
import { useFinanceInvoiceState } from "./useFinanceInvoiceState";
import { useFinanceModalManager } from "./useFinanceModalManager";
import { useFinanceSaveHandlers } from "./useFinanceSaveHandlers";
import { useFinanceDataLoader } from "./useFinanceDataLoader";
import { useFinanceUIState } from "./useFinanceUIState";
import { customerKind, isUnbilledPending, isRentalBA, isPOSMDOBA } from "./ba_calculations";

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
    sbsPenalties, setSbsPenalties,
    accountingJournals, userRole, isSuper, canVerifyBA, canVerifyInvoice, canApproveInvoice, canApproveBA, can,
    loadData
  } = dataLoader;

  const uiState = useFinanceUIState();
  const [invoicePick, setInvoicePick] = useState<any>(null);
  const {
    sbsPenaltyModalOpen, setSbsPenaltyModalOpen, sbsPenaltyEditItem, setSbsPenaltyEditItem,
    baFilter, setBaFilter, periodFilter, setPeriodFilter, invStatusFilter, setInvStatusFilter,
    invCardTab, setInvCardTab, invPeriodFilter, setInvPeriodFilter,
    modalType, setModalType, editItem, setEditItem, isSaving, setIsSaving,
    formData, setFormData, showActivityGroupDropdown, setShowActivityGroupDropdown,
    showExportBADropdown, setShowExportBADropdown, showInputBADropdown, setShowInputBADropdown,
    showExportARDropdown, setShowExportARDropdown,
    baRowActionDropdownId, setBaRowActionDropdownId, detailViewItem, setDetailViewItem,
    showAddPartialPayment, setShowAddPartialPayment,
    partialPaymentForm, setPartialPaymentForm, deletingKey, setDeletingKey, actionLoadingKey, setActionLoadingKey,
    getCurrentMonthPeriod, getPreviousMonthPeriod
  } = uiState;

  // Master Data Hook
  const masterData = useFinanceMasterData(formData.customerCode, customerRows, formData.workPeriod);
  const {
    mRate, setMRate, fuelPriceUSD, setFuelPriceUSD, laborPriceIDR, setLaborPriceIDR,
    dynamicSowOptions, setDynamicSowOptions, bankAccountOptions, setBankAccountOptions,
    latestKursBI, coalIndexMaster, sowCatalog, getBGGActiveCoalTier, getSowMasterRate,
    financeTemplates, setFinanceTemplates, templatesLoaded, setTemplatesLoaded, templateRows, masterBankAccounts,
    rfIndexCalculated, defaultMasterVariableOptions, masterVariableOptions, activeSOWCatalog,
    customerContractMap, applyRateLookup, defaultPOSBAOperatingItems, defaultPOSBAMDOItems, defaultBGGBAItems, defaultPTROBAItems, defaultDBKBAItems,
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
    openBAModal, handleVerifyBA, handleApproveBA, handleAccrueBA, handleSaveBGGBA, handleDeletePendingVolume,
    reorderBAItems, moveBAItem, createBlankBGGBAItems, createBlankSBSBAItems
  } = baState;

  // Invoice State Hook
  const invoiceState = useFinanceInvoiceState({
    onNotice, loadData, detailViewItem, setDetailViewItem, actionLoadingKey, setActionLoadingKey,
    setInvoiceRows, setBaRows
  });
  const {
    handleGenerateInvoiceFromBA, handleVerifyInvoice, handleApproveInvoice, handleApproveInvoiceTier1
  } = invoiceState;

  // Exporters Snapshot
  const exportCtx = {
    baRows, customerContractMap, customerRows, invoiceRows, invPeriodFilter, onNotice, query, sbsPenalties
  };
  const {
    exportPaymentDetailPDF, exportARBAIMonitoringExcel, exportARBAIMonitoringPDF,
    exportBAOnlyExcel, exportBAOnlyPDF, exportAROnlyExcel, exportAROnlyPDF,
    exportCoretaxEFakturCSV, exportEBupotPPh23CSV
  } = createFinanceExporters(exportCtx);

  const {
    openCreateModal, openEditModal, handleFileUpload
  } = useFinanceModalManager({
    user, setFormData, customerRows, onNotice, setModalType, setEditItem,
    setIsInlineEditingBA, createBlankBGGBAItems, createBlankSBSBAItems, defaultDBKBAItems, defaultPTROBAItems,
    defaultPOSBAOperatingItems, defaultSBSBAMDOItems, defaultPOSBAMDOItems, defaultSBSBADeductionItems,
    setBaOperatingItems, setBaMDOItems, setBaDeductionItems, setActiveBAStep,
    openBAModal, getCurrentMonthPeriod, getPreviousMonthPeriod,
    raiseFallMasters, minWageMasters, latestKursBI, mRate
  });

  // Invoice hanya diterbitkan backend dari BA yang sudah di-approve; nilainya tidak diinput manual.
  const createInvoiceFromBA = async (ba: any, cat?: "Operation & Mining" | "MDO" | "Rental") => {
    const category = cat || (isRentalBA(ba) ? "Rental" : isPOSMDOBA(ba) ? "MDO" : undefined);
    if (!isBAApproved(ba)) {
      onNotice("Berita Acara belum disetujui Manager. Invoice hanya dapat diterbitkan setelah BA diverifikasi Finance Specialist dan di-approve Manager.");
      return;
    }
    // BGG: pilih pending volume BA lain (terverifikasi, belum ditagih) untuk ikut ditagih.
    const pendingRows = customerKind(ba.customerCode) === "BGG" ? baRows.filter((r) => customerKind(r.customerCode) === "BGG" && isUnbilledPending(r) && r.id !== ba.id && r.pendingVolume.period !== ba.workPeriod) : [];
    if (pendingRows.length) { setModalType("none"); setInvoicePick({ ba, category, rows: pendingRows, ids: [] }); return; }
    if (!window.confirm(`Terbitkan Draft Invoice${category ? ` [${category}]` : ""} dari BA ${ba.baNumber}?`)) return;
    setModalType("none");
    await handleGenerateInvoiceFromBA(ba.id, category);
  };

  const {
    handleSave, handleDelete, handleSavePartialPayment,
    handleVerifyPartialPayment, handleSaveSBSPenalty, handleDeleteSBSPenalty
  } = useFinanceSaveHandlers({
    isSaving, setIsSaving, modalType, setModalType, formData, editItem, setEditItem,
    baOperatingItems, baMDOItems, baDeductionItems, baRows, setBaRows, loadData, reloadMasterData, onNotice,
    rfIndexCalculated, detailViewItem, setDetailViewItem,
    partialPaymentForm, setPartialPaymentForm, setShowAddPartialPayment, setInvoiceRows,
    setPaymentRows, setCustomerRows, setSbsPenalties,
    setSbsPenaltyModalOpen, setSbsPenaltyEditItem,
    deletingKey, setDeletingKey, actionLoadingKey, setActionLoadingKey, openBAModal
  });

  // Draf input modal di localStorage: ditulis selama modal terbuka & ada perubahan, ditawarkan kembali saat
  // modal yang sama dibuka lagi (ketutup tak sengaja / refresh), dihapus setelah berhasil disimpan.
  // Modal yang masih terbuka saat refresh dibuka ulang otomatis lewat penanda draftOpenKey.
  const DRAFT_TTL = 7 * 24 * 3600 * 1000;
  const draftOpenKey = draftKey("open");
  const draftId = modalType === "none" ? null : draftKey(modalType, editItem?.id);
  const draftBaseline = useRef("");
  const draftReopenDone = useRef(false);
  const draftAutoReopened = useRef(false);
  useEffect(() => {
    if (draftId) localStorage.setItem(draftOpenKey, JSON.stringify({ type: modalType, id: editItem?.id ?? null, view: viewTitle }));
    else if (draftReopenDone.current) localStorage.removeItem(draftOpenKey);
  }, [draftId]);
  useEffect(() => {
    if (loading || draftReopenDone.current) return;
    draftReopenDone.current = true;
    Object.keys(localStorage).filter(k => k.startsWith("efms:draft:")).forEach(k => {
      try { if (Date.now() - JSON.parse(localStorage.getItem(k) || "{}").savedAt > DRAFT_TTL) localStorage.removeItem(k); } catch { localStorage.removeItem(k); }
    });
    let open: any = null;
    try { open = JSON.parse(localStorage.getItem(draftOpenKey) || "null"); } catch { /* penanda rusak diabaikan */ }
    if (!open || open.view !== viewTitle || !localStorage.getItem(draftKey(open.type, open.id))) return;
    const rows: Record<string, any[]> = { ba: baRows, invoice: invoiceRows, payment: paymentRows, customer: customerRows };
    const item = open.id == null ? null : rows[open.type]?.find((r: any) => r.id === open.id);
    if (open.id != null && !item) return;
    draftAutoReopened.current = true;
    if (item) openEditModal(open.type, item); else openCreateModal(open.type);
  }, [loading]);
  useEffect(() => {
    draftBaseline.current = "";
    const auto = draftAutoReopened.current;
    draftAutoReopened.current = false;
    if (!draftId || formData.pendingMode) return;
    let draft: any = null;
    try { draft = JSON.parse(localStorage.getItem(draftId) || "null"); } catch { /* draf rusak diabaikan */ }
    if (!draft?.data || Date.now() - draft.savedAt > DRAFT_TTL) return;
    if (!window.confirm(`Ada draf input yang belum tersimpan (${new Date(draft.savedAt).toLocaleString("id-ID")}). Lanjutkan draf tersebut?\n\nPilih "Cancel" untuk membuang draf.`)) {
      localStorage.removeItem(draftId);
      if (auto) setModalType("none");
      return;
    }
    const d = draft.data;
    setFormData(d.formData);
    setBaOperatingItems(d.baOperatingItems); setBaMDOItems(d.baMDOItems); setBaDeductionItems(d.baDeductionItems);
    setActiveBAStep(d.activeBAStep);
    onNotice("Draf input sebelumnya berhasil dipulihkan.");
  }, [draftId]);
  useEffect(() => {
    if (!draftId || formData.pendingMode) return; // form pending tidak disimpan sebagai draf BA induk
    const timer = setTimeout(() => {
      const snap = JSON.stringify({ formData, baOperatingItems, baMDOItems, baDeductionItems, activeBAStep });
      if (!draftBaseline.current) { draftBaseline.current = snap; return; }
      if (snap === draftBaseline.current) return;
      try { localStorage.setItem(draftId, `{"savedAt":${Date.now()},"data":${snap}}`); } catch { /* storage penuh/diblokir */ }
    }, 500);
    return () => clearTimeout(timer);
  }, [draftId, formData, baOperatingItems, baMDOItems, baDeductionItems, activeBAStep]);

  const openSBSPenaltyModal =(item?: SBSPenaltyItem) => { setSbsPenaltyEditItem(item || null); setSbsPenaltyModalOpen(true); };
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
    canVerifyBA, canVerifyInvoice, canApproveInvoice, canApproveBA, can, invoiceRows, setInvoiceRows, paymentRows,
    setPaymentRows, customerRows, setCustomerRows,
    sbsPenalties, setSbsPenalties, sbsPenaltyModalOpen, setSbsPenaltyModalOpen, sbsPenaltyEditItem,
    setSbsPenaltyEditItem, handleSaveSBSPenalty, handleDeleteSBSPenalty, openSBSPenaltyModal,
    closeSBSPenaltyModal, baFilter, setBaFilter,
    periodFilter, setPeriodFilter, invStatusFilter, setInvStatusFilter, invCardTab, setInvCardTab,
    invPeriodFilter, setInvPeriodFilter, modalType, setModalType, editItem, setEditItem, isSaving,
    formData, setFormData, showActivityGroupDropdown, setShowActivityGroupDropdown, showExportBADropdown,
    setShowExportBADropdown, showInputBADropdown, setShowInputBADropdown, showExportARDropdown,
    setShowExportARDropdown, baRowActionDropdownId,
    setBaRowActionDropdownId, detailViewItem, setDetailViewItem, isInlineEditingBA, setIsInlineEditingBA,
    showAddPartialPayment, setShowAddPartialPayment, partialPaymentForm, setPartialPaymentForm, mRate,
    setMRate, fuelPriceUSD, setFuelPriceUSD, laborPriceIDR, setLaborPriceIDR, dynamicSowOptions,
    setDynamicSowOptions, bankAccountOptions, setBankAccountOptions, getSowMasterRate, financeTemplates,
    setFinanceTemplates, templatesLoaded, setTemplatesLoaded, templateRows, masterBankAccounts,
    rfIndexCalculated, defaultMasterVariableOptions, masterVariableOptions, activeSOWCatalog,
    applyRateLookup, defaultPOSBAOperatingItems,
    defaultPOSBAMDOItems, defaultBGGBAItems, defaultPTROBAItems, defaultDBKBAItems, defaultSBSBAOperatingItems,
    defaultSBSBAMDOItems, defaultSBSBADeductionItems, latestKursBI, coalIndexMaster, sowCatalog, getBGGActiveCoalTier,
    baOperatingItems, setBaOperatingItems, baMDOItems, setBaMDOItems, baDeductionItems, setBaDeductionItems,
    reorderBAItems, moveBAItem, activeBAStep, setActiveBAStep, showAddRowDropdown, setShowAddRowDropdown,
    customerContractMap, getSBSTarifByDistance, exportPaymentDetailPDF,
    exportARBAIMonitoringExcel, exportARBAIMonitoringPDF, exportBAOnlyExcel, exportBAOnlyPDF,
    exportAROnlyExcel, exportAROnlyPDF, exportCoretaxEFakturCSV, exportEBupotPPh23CSV, loadData, reloadMasterData,
    handleSavePartialPayment, handleVerifyPartialPayment,
    createInvoiceFromBA, invoicePick, setInvoicePick, openBAModal, openCreateModal, openEditModal, handleFileUpload,
    handleSave, handleVerifyBA, handleApproveBA, handleAccrueBA, handleSaveBGGBA, handleDeletePendingVolume,
    handleGenerateInvoiceFromBA, handleVerifyInvoice, handleApproveInvoice, handleApproveInvoiceTier1,
    handleDelete, totalAgingMatrix, viewTitle,
    query, onNotice, user, accountingJournals, deletingKey, setDeletingKey, actionLoadingKey, setActionLoadingKey,
    raiseFallMasters, raiseFallMaster, minWageMasters
  };
}
