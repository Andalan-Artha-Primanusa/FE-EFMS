import { useState, useCallback } from "react";
import { api, verifyBATracker, approveBATracker, generateJournalFromBA } from "../../lib/api";
import { formatDateInput } from "./helpers";
import { FALLBACK_POS_OPERATING_ITEMS, FALLBACK_POS_MDO_ITEMS, getInitialBAItemsForRecord } from "./demoDataSeed";

interface UseFinanceBAStateProps {
  setEditItem: (item: any) => void;
  setFormData: (data: any) => void;
  setDetailViewItem: (item: any) => void;
  setModalType: (type: any) => void;
  loadData: () => Promise<void>;
  onNotice: (msg: string) => void;
  defaultBGGBAItems: any[];
  defaultDBKBAItems: any[];
  defaultPTROBAItems?: any[];
  defaultSBSBAOperatingItems: any[];
  defaultPOSBAOperatingItems: any[];
  detailViewItem: any;
  getCurrentMonthPeriod: () => string;
}

export function useFinanceBAState({
  setEditItem,
  setFormData,
  setDetailViewItem,
  setModalType,
  loadData,
  onNotice,
  defaultBGGBAItems,
  defaultDBKBAItems,
  defaultPTROBAItems,
  defaultSBSBAOperatingItems,
  defaultPOSBAOperatingItems,
  detailViewItem,
  getCurrentMonthPeriod
}: UseFinanceBAStateProps) {
  const [baOperatingItems, setBaOperatingItems] = useState<any[]>(FALLBACK_POS_OPERATING_ITEMS);
  const [baMDOItems, setBaMDOItems] = useState<any[]>(FALLBACK_POS_MDO_ITEMS);
  const [baDeductionItems, setBaDeductionItems] = useState<any[]>([]);
  const [activeBAStep, setActiveBAStep] = useState<number>(1);
  const [isInlineEditingBA, setIsInlineEditingBA] = useState<boolean>(true);
  const [showAddRowDropdown, setShowAddRowDropdown] = useState<boolean>(false);

  const createBlankBGGBAItems = useCallback((period = getCurrentMonthPeriod()) => [
    { id: `bgg_ob1_${Date.now()}`, category: "Operating & Mining", area: "", material: "OVER BURDEN REMOVAL 1 (75%)", period, notes: "", keterangan: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 29500, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: `bgg_ob2_${Date.now() + 1}`, category: "Operating & Mining", area: "", material: "OVER BURDEN REMOVAL 2 (25%)", period, notes: "", keterangan: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 28750, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: `bgg_cw_${Date.now() + 2}`, category: "Operating & Mining", area: "", material: "Coal Winning", period, notes: "", keterangan: "", unit: "Ton", initialVolume: 0, adjustedVolume: 0, rate: 17500, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: `bgg_od_ob_${Date.now() + 3}`, category: "Over Distance", area: "", material: "Over Distance For OB Removal", period, notes: "", keterangan: "", unit: "BCM", distanceBasis: 1000, distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 1550, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: `bgg_od_cw_${Date.now() + 4}`, category: "Over Distance", area: "", material: "Over Distance For Coal Winning", period, notes: "", keterangan: "", unit: "Ton", distanceBasis: 1000, distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 19700, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 }
  ], [getCurrentMonthPeriod]);

  const createBlankSBSBAItems = useCallback((period = getCurrentMonthPeriod()) => [
    { id: `sbs_ba_a1_${Date.now()}`, category: "Operating & Mining", area: "Pit E", material: "PIT E - DISPOSAL SEKATAN", period, notes: "", keterangan: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 22654, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: `sbs_ba_a2_${Date.now() + 1}`, category: "Operating & Mining", area: "Pit E", material: "PIT E - RENCANA JALAN", period, notes: "", keterangan: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 12638, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: `sbs_ba_a3_${Date.now() + 2}`, category: "Operating & Mining", area: "Pit E", material: "PIT E - RENCANA CSA", period, notes: "", keterangan: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 8346, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: `sbs_ba_a4_${Date.now() + 3}`, category: "Operating & Mining", area: "Pit E", material: "PIT E - JALAN BARITO", period, notes: "", keterangan: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 15500, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: `sbs_ba_a5_${Date.now() + 4}`, category: "Operating & Mining", area: "Pit E", material: "PIT E - SEKATAN", period, notes: "", keterangan: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 16931, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: `sbs_ba_a6_${Date.now() + 5}`, category: "Operating & Mining", area: "Pit E", material: "PIT E - TS MAHONI", period, notes: "", keterangan: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 22654, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: `sbs_ba_a7_${Date.now() + 6}`, category: "Operating & Mining", area: "Pit E", material: "PIT E - IPD WARWEFILL", period, notes: "", keterangan: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 8346, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: `sbs_ba_a8_${Date.now() + 7}`, category: "Operating & Mining", area: "Pit E", material: "PIT E - SEKATAN", period, notes: "", keterangan: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 19375, subtotalInitial: 0, subtotalAdjusted: 0 }
  ], [getCurrentMonthPeriod]);

  const openBAModal = (item: any, isEditMode: boolean = false) => {
    setEditItem(item);
    setIsInlineEditingBA(isEditMode);
    const bggData = item.bggData;
    const bggTotalTerbongkar = bggData?.agreedSurveyVolume || bggData?.volumeBGG || 0;
    const bggCoalVolumeBCM = bggData?.coalVolumeBCM || 0;
    const bggCoalVolumeTon = bggData?.coalVolumeTon || 0;
    const bggOBDistanceHm = bggData?.obOverDistanceHm || 0;
    const bggNettOB = bggData?.nettOBVolume || (bggTotalTerbongkar > 0 ? Math.max(0, bggTotalTerbongkar - bggCoalVolumeBCM) : 0);

    setFormData({
      ...item,
      bggTotalTerbongkar,
      bggCoalVolumeBCM,
      bggCoalVolumeTon,
      bggOBDistanceHm,
      bggNettOB,
      workEndDate: formatDateInput(item.workEndDate),
      baSubmittedDate: formatDateInput(item.baSubmittedDate),
      baSentDate: formatDateInput(item.baSentDate),
      internalRoutingDate: formatDateInput(item.internalRoutingDate),
      baSignedDate: formatDateInput(item.baSignedDate),
      invoiceIssuedDate: formatDateInput(item.invoiceIssuedDate),
      baDate: formatDateInput(item.baDate),
      invoiceDate: formatDateInput(item.invoiceDate),
      paymentDate: formatDateInput(item.paymentDate),
    });
    const initialItems = getInitialBAItemsForRecord(item, {
      defaultBGGBAItems,
      defaultDBKBAItems,
      defaultPTROBAItems,
      defaultSBSBAOperatingItems,
      defaultPOSBAOperatingItems
    });
    const ops = initialItems.filter((i: any) => !i.isDeduction && i.category !== "Pengurang Biaya" && i.category !== "MDO" && i.category !== "Penunjang" && i.unit !== "Hours");
    const mdo = initialItems.filter((i: any) => !i.isDeduction && (i.category === "MDO" || i.category === "Penunjang" || i.unit === "Hours"));
    const deds = initialItems.filter((i: any) => i.isDeduction || i.category === "Pengurang Biaya");
    setBaOperatingItems(ops);
    setBaMDOItems(mdo);
    setBaDeductionItems(deds);
    setActiveBAStep(1);
    setDetailViewItem(null);
    setModalType("ba");
  };

  const handleVerifyBA = async (id: number) => {
    try {
      const updated = await verifyBATracker(id, "verify", "Verifikasi Berita Acara oleh Finance Specialist");
      onNotice("Berita Acara berhasil diverifikasi oleh Finance Specialist.");
      await loadData();
      if (detailViewItem && detailViewItem.type === "ba" && detailViewItem.data.id === id) {
        setDetailViewItem({ type: "ba", data: updated });
      }
    } catch (err: any) {
      onNotice(err?.message || "Gagal memverifikasi BA");
    }
  };

  const handleApproveBA = async (id: number) => {
    try {
      const updated = await approveBATracker(id, "approve", "Disetujui oleh Manager");
      onNotice("Berita Acara disetujui (Approved by Manager).");
      await loadData();
      if (detailViewItem && detailViewItem.type === "ba" && detailViewItem.data.id === id) {
        setDetailViewItem({ type: "ba", data: updated });
      }
    } catch (err: any) {
      onNotice(err?.message || "Gagal menyetujui BA");
    }
  };

  const handleAccrueBA = async (id: number) => {
    try {
      await generateJournalFromBA(id);
      onNotice("Jurnal Akrual Pendapatan (Unbilled AR) berhasil dibukukan ke General Ledger.");
      await loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal mengakrualkan Berita Acara");
    }
  };

  const handleSaveBGGBA = async (baPayload: any, isSubmit = false) => {
    try {
      if (baPayload.id) {
        await api(`/api/finance/ba-trackers/${baPayload.id}`, {
          method: "PUT",
          body: JSON.stringify(baPayload),
        });
      } else {
        await api(`/api/finance/ba-trackers`, {
          method: "POST",
          body: JSON.stringify(baPayload),
        });
      }
      onNotice(isSubmit ? "Berita Acara BGG berhasil diajukan ke HO untuk verifikasi." : "Draft Berita Acara BGG berhasil disimpan.");
      await loadData();
    } catch (err: any) {
      onNotice(`Gagal menyimpan BA: ${err?.message || err}`);
    }
  };

  return {
    baOperatingItems, setBaOperatingItems,
    baMDOItems, setBaMDOItems,
    baDeductionItems, setBaDeductionItems,
    activeBAStep, setActiveBAStep,
    isInlineEditingBA, setIsInlineEditingBA,
    showAddRowDropdown, setShowAddRowDropdown,
    openBAModal,
    handleVerifyBA,
    handleApproveBA,
    handleAccrueBA,
    handleSaveBGGBA,
    createBlankBGGBAItems,
    createBlankSBSBAItems
  };
}
