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
  getSowMasterRate?: (cust: string, name: string, fb: number, isUSD?: boolean, tier?: string) => number;
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
  getCurrentMonthPeriod,
  getSowMasterRate
}: UseFinanceBAStateProps) {
  const [baOperatingItems, setBaOperatingItems] = useState<any[]>(() =>
    (FALLBACK_POS_OPERATING_ITEMS || []).map((it) => ({
      ...it,
      initialVolume: 0,
      adjustedVolume: 0,
      subtotalInitial: 0,
      subtotalAdjusted: 0,
    }))
  );
  const [baMDOItems, setBaMDOItems] = useState<any[]>(() =>
    (FALLBACK_POS_MDO_ITEMS || []).map((it) => ({
      ...it,
      initialVolume: 0,
      adjustedVolume: 0,
      subtotalInitial: 0,
      subtotalAdjusted: 0,
    }))
  );
  const [baDeductionItems, setBaDeductionItems] = useState<any[]>([]);
  const [activeBAStep, setActiveBAStep] = useState<number>(1);
  const [isInlineEditingBA, setIsInlineEditingBA] = useState<boolean>(true);
  const [showAddRowDropdown, setShowAddRowDropdown] = useState<boolean>(false);

  const createBlankBGGBAItems = useCallback((period = getCurrentMonthPeriod()) => {
    const ob1Rate = getSowMasterRate ? getSowMasterRate("BGG", "OVER BURDEN REMOVAL 1 (75%)", 29500) : 29500;
    const ob2Rate = getSowMasterRate ? getSowMasterRate("BGG", "OVER BURDEN REMOVAL 2 (25%)", 28750) : 28750;
    const cwRate = getSowMasterRate ? getSowMasterRate("BGG", "Coal Winning Pit Kungkilan", 17500) : 17500;
    const odObRate = getSowMasterRate ? getSowMasterRate("BGG", "Over Distance For OB Removal", 1550) : 1550;
    const odCwRate = getSowMasterRate ? getSowMasterRate("BGG", "Over Distance For Coal Winning", 19700) : 19700;
    return [
      { id: `bgg_ob1_${Date.now()}`, section: "A", category: "Operating & Mining", area: "Pit KKL", material: "OVER BURDEN REMOVAL 1 (75%)", period, notes: "", keterangan: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: ob1Rate, subtotalInitial: 0, subtotalAdjusted: 0 },
      { id: `bgg_ob2_${Date.now() + 1}`, section: "A", category: "Operating & Mining", area: "Pit KKL", material: "OVER BURDEN REMOVAL 2 (25%)", period, notes: "", keterangan: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: ob2Rate, subtotalInitial: 0, subtotalAdjusted: 0 },
      { id: `bgg_cw_${Date.now() + 2}`, section: "B", category: "Operating & Mining", area: "Pit KKL", material: "Coal Winning", period, notes: "", keterangan: "", unit: "Ton", initialVolume: 0, adjustedVolume: 0, rate: cwRate, subtotalInitial: 0, subtotalAdjusted: 0 },
      { id: `bgg_od_ob_${Date.now() + 3}`, section: "C", category: "Over Distance", area: "Pit KKL", material: "Over Distance For OB Removal", period, notes: "", keterangan: "", unit: "BCM", distanceBasis: 1000, distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: odObRate, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 },
      { id: `bgg_od_cw_${Date.now() + 4}`, section: "C", category: "Over Distance", area: "Pit KKL", material: "Over Distance For Coal Winning", period, notes: "", keterangan: "", unit: "Ton", distanceBasis: 1000, distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: odCwRate, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 }
    ];
  }, [getCurrentMonthPeriod, getSowMasterRate]);

  const createBlankSBSBAItems = useCallback((period = getCurrentMonthPeriod()) => [
    { id: `sbs_ba_a1_${Date.now()}`, category: "Operating & Mining", area: "Pit E", material: "PIT E - DISPOSAL SEKATAN", period, notes: "", keterangan: "", unit: "BCM", distance: 0, distanceWeightAvg: 0, initialVolume: 0, adjustedVolume: 0, rate: 0, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: `sbs_ba_a2_${Date.now() + 1}`, category: "Operating & Mining", area: "Pit E", material: "PIT E - RENCANA JALAN", period, notes: "", keterangan: "", unit: "BCM", distance: 0, distanceWeightAvg: 0, initialVolume: 0, adjustedVolume: 0, rate: 0, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: `sbs_ba_a3_${Date.now() + 2}`, category: "Operating & Mining", area: "Pit E", material: "PIT E - RENCANA CSA", period, notes: "", keterangan: "", unit: "BCM", distance: 0, distanceWeightAvg: 0, initialVolume: 0, adjustedVolume: 0, rate: 0, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: `sbs_ba_a4_${Date.now() + 3}`, category: "Operating & Mining", area: "Pit E", material: "PIT E - JALAN BARITO", period, notes: "", keterangan: "", unit: "BCM", distance: 0, distanceWeightAvg: 0, initialVolume: 0, adjustedVolume: 0, rate: 0, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: `sbs_ba_a5_${Date.now() + 4}`, category: "Operating & Mining", area: "Pit E", material: "PIT E - SEKATAN", period, notes: "", keterangan: "", unit: "BCM", distance: 0, distanceWeightAvg: 0, initialVolume: 0, adjustedVolume: 0, rate: 0, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: `sbs_ba_a6_${Date.now() + 5}`, category: "Operating & Mining", area: "Pit E", material: "PIT E - TS MAHONI", period, notes: "", keterangan: "", unit: "BCM", distance: 0, distanceWeightAvg: 0, initialVolume: 0, adjustedVolume: 0, rate: 0, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: `sbs_ba_a7_${Date.now() + 6}`, category: "Operating & Mining", area: "Pit E", material: "PIT E - IPD WARWEFILL", period, notes: "", keterangan: "", unit: "BCM", distance: 0, distanceWeightAvg: 0, initialVolume: 0, adjustedVolume: 0, rate: 0, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: `sbs_ba_a8_${Date.now() + 7}`, category: "Operating & Mining", area: "Pit E", material: "PIT E - SEKATAN", period, notes: "", keterangan: "", unit: "BCM", distance: 0, distanceWeightAvg: 0, initialVolume: 0, adjustedVolume: 0, rate: 0, subtotalInitial: 0, subtotalAdjusted: 0 }
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

  const reorderBAItems = useCallback((startIndex: number, endIndex: number, listType: "operating" | "mdo" | "deduction" = "operating") => {
    const setter = listType === "mdo" ? setBaMDOItems : listType === "deduction" ? setBaDeductionItems : setBaOperatingItems;
    setter((prev) => {
      if (startIndex < 0 || startIndex >= prev.length || endIndex < 0 || endIndex >= prev.length) return prev;
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  }, []);

  const moveBAItem = useCallback((id: string, dir: "up" | "down", listType: "operating" | "mdo" | "deduction" = "operating") => {
    const setter = listType === "mdo" ? setBaMDOItems : listType === "deduction" ? setBaDeductionItems : setBaOperatingItems;
    setter((prev) => {
      const idx = prev.findIndex((item) => item.id === id);
      if (idx === -1) return prev;
      const targetIdx = dir === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const result = Array.from(prev);
      const [removed] = result.splice(idx, 1);
      result.splice(targetIdx, 0, removed);
      return result;
    });
  }, []);

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
    reorderBAItems,
    moveBAItem,
    createBlankBGGBAItems,
    createBlankSBSBAItems
  };
}
