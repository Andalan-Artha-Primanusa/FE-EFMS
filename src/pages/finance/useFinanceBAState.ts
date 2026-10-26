import { useState, useCallback } from "react";
import { api, verifyBATracker, approveBATracker, generateJournalFromBA } from "../../lib/api";
import { formatDateInput, draftKey } from "./helpers";
import { customerKind, baseDistanceFor } from "./masterRegistry";
import { dropEmptyDPFuel, withPendingVolume, isRentalBA, isPOSMDOBA, isMessBA } from "./ba_calculations";

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
  defaultPOSBAMDOItems?: any[];
  detailViewItem: any;
  getCurrentMonthPeriod: () => string;
  getSowMasterRate?: (cust: string, name: string, fb: number, isUSD?: boolean, period?: string) => number;
  syncBARatesWithMasterData?: (items: any[], cust: string, period?: string) => any[];
  actionLoadingKey?: string | null;
  setActionLoadingKey?: (key: string | null) => void;
  setBaRows?: (rows: any[] | ((prev: any[]) => any[])) => void;
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
  defaultPOSBAMDOItems,
  detailViewItem,
  getCurrentMonthPeriod,
  getSowMasterRate,
  syncBARatesWithMasterData,
  actionLoadingKey,
  setActionLoadingKey,
  setBaRows
}: UseFinanceBAStateProps) {
  const zeroVolumes = (rows: any[] = []) =>
    rows.map((it) => ({ ...it, initialVolume: 0, adjustedVolume: 0, subtotalInitial: 0, subtotalAdjusted: 0 }));
  // Item awal BA: item tersimpan; BA tanpa item memakai template customer dari BE (volume nol).
  const getInitialBAItemsForRecord = (item: any): any[] => {
    if (Array.isArray(item?.items) && item.items.length > 0) return item.items;
    if (isRentalBA(item) || isMessBA(item)) return [];
    switch (customerKind(item?.customerCode)) {
      case "BGG": return zeroVolumes(defaultBGGBAItems);
      case "PTRO": return zeroVolumes(defaultPTROBAItems?.length ? defaultPTROBAItems : defaultDBKBAItems);
      case "SBS": return zeroVolumes(defaultSBSBAOperatingItems).map((it) => ({ ...it, distance: 0, distanceWeightAvg: 0, rate: 0 }));
      default: return zeroVolumes((isPOSMDOBA(item) ? defaultPOSBAMDOItems : defaultPOSBAOperatingItems) || []);
    }
  };
  const [baOperatingItems, setBaOperatingItems] = useState<any[]>(() => zeroVolumes(defaultPOSBAOperatingItems));
  const [baMDOItems, setBaMDOItems] = useState<any[]>(() => zeroVolumes(defaultPOSBAMDOItems));
  const [baDeductionItems, setBaDeductionItems] = useState<any[]>([]);
  const [activeBAStep, setActiveBAStep] = useState<number>(1);
  const [isInlineEditingBA, setIsInlineEditingBA] = useState<boolean>(true);
  const [showAddRowDropdown, setShowAddRowDropdown] = useState<boolean>(false);

  const createBlankBGGBAItems = useCallback((period = getCurrentMonthPeriod()) => {
    const ob1Rate = getSowMasterRate ? getSowMasterRate("BGG", "OVER BURDEN REMOVAL 1 (75%)", 0) : 0;
    const ob2Rate = getSowMasterRate ? getSowMasterRate("BGG", "OVER BURDEN REMOVAL 2 (25%)", 0) : 0;
    const cwRate = getSowMasterRate ? getSowMasterRate("BGG", "Coal Winning", 0) : 0;
    const odObRate = getSowMasterRate ? getSowMasterRate("BGG", "Over Distance For OB Removal", 0) : 0;
    const odCwRate = getSowMasterRate ? getSowMasterRate("BGG", "Over Distance For Coal Winning", 0) : 0;
    return [
      { id: `bgg_ob1_${Date.now()}`, section: "A", category: "Operating & Mining", area: "", material: "OVER BURDEN REMOVAL 1 (75%)", period, notes: "", keterangan: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: ob1Rate, subtotalInitial: 0, subtotalAdjusted: 0 },
      { id: `bgg_ob2_${Date.now() + 1}`, section: "A", category: "Operating & Mining", area: "", material: "OVER BURDEN REMOVAL 2 (25%)", period, notes: "", keterangan: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: ob2Rate, subtotalInitial: 0, subtotalAdjusted: 0 },
      { id: `bgg_cw_${Date.now() + 2}`, section: "B", category: "Operating & Mining", area: "", material: "Coal Winning", period, notes: "", keterangan: "", unit: "Ton", initialVolume: 0, adjustedVolume: 0, rate: cwRate, subtotalInitial: 0, subtotalAdjusted: 0 },
      { id: `bgg_od_ob_${Date.now() + 3}`, section: "C", category: "Over Distance", area: "", material: "Over Distance For OB Removal", period, notes: "", keterangan: "", unit: "BCM", distanceBasis: baseDistanceFor("BGG", "Over Distance For OB Removal"), distanceWeightAvg: baseDistanceFor("BGG", "Over Distance For OB Removal"), initialVolume: 0, adjustedVolume: 0, rate: odObRate, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 },
      { id: `bgg_od_cw_${Date.now() + 4}`, section: "C", category: "Over Distance", area: "", material: "Over Distance For Coal Winning", period, notes: "", keterangan: "", unit: "Ton", distanceBasis: baseDistanceFor("BGG", "Over Distance For Coal Winning"), distanceWeightAvg: baseDistanceFor("BGG", "Over Distance For Coal Winning"), initialVolume: 0, adjustedVolume: 0, rate: odCwRate, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 },
      { id: `bgg_dp_fuel_${Date.now() + 5}`, section: "F", category: "DP Fuel", area: "", material: "DP Fuel & Transport (Pengurang Solar BGG)", period, notes: "Uang Muka / Budget Solar Pengurang Tagihan", keterangan: "", unit: "Lot", initialVolume: 1, adjustedVolume: 1, rate: 0, isDeduction: true, subtotalInitial: 0, subtotalAdjusted: 0 }
    ];
  }, [getCurrentMonthPeriod, getSowMasterRate]);

  const createBlankSBSBAItems = useCallback(
    (period = getCurrentMonthPeriod()) => {
      if (defaultSBSBAOperatingItems && defaultSBSBAOperatingItems.length > 0) {
        return defaultSBSBAOperatingItems.map((it: any, idx: number) => ({
          ...it,
          id: `sbs_ba_a${idx + 1}_${Date.now() + idx}`,
          period,
          initialVolume: 0,
          adjustedVolume: 0,
          subtotalInitial: 0,
          subtotalAdjusted: 0,
        }));
      }
      return [
        { id: `sbs_ba_a1_${Date.now()}`, category: "Operating & Mining", area: "Pit E", material: "PIT E - DISPOSAL SEKATAN", period, notes: "", keterangan: "", unit: "BCM", distance: 3568, distanceWeightAvg: 3568, initialVolume: 0, adjustedVolume: 0, rate: getSowMasterRate ? getSowMasterRate("SBS", "PIT E - DISPOSAL SEKATAN", 22654) : 22654, subtotalInitial: 0, subtotalAdjusted: 0 },
        { id: `sbs_ba_a2_${Date.now() + 1}`, category: "Operating & Mining", area: "Pit E", material: "PIT E - RENCANA JALAN", period, notes: "", keterangan: "", unit: "BCM", distance: 1774, distanceWeightAvg: 1774, initialVolume: 0, adjustedVolume: 0, rate: getSowMasterRate ? getSowMasterRate("SBS", "PIT E - RENCANA JALAN", 12638) : 12638, subtotalInitial: 0, subtotalAdjusted: 0 },
        { id: `sbs_ba_a3_${Date.now() + 2}`, category: "Operating & Mining", area: "Pit E", material: "PIT E - RENCANA CSA", period, notes: "", keterangan: "", unit: "BCM", distance: 938, distanceWeightAvg: 938, initialVolume: 0, adjustedVolume: 0, rate: getSowMasterRate ? getSowMasterRate("SBS", "PIT E - RENCANA CSA", 8346) : 8346, subtotalInitial: 0, subtotalAdjusted: 0 },
        { id: `sbs_ba_a4_${Date.now() + 3}`, category: "Operating & Mining", area: "Pit E", material: "PIT E - JALAN BARITO", period, notes: "", keterangan: "", unit: "BCM", distance: 2311, distanceWeightAvg: 2311, initialVolume: 0, adjustedVolume: 0, rate: getSowMasterRate ? getSowMasterRate("SBS", "PIT E - JALAN BARITO", 15500) : 15500, subtotalInitial: 0, subtotalAdjusted: 0 },
        { id: `sbs_ba_a5_${Date.now() + 4}`, category: "Operating & Mining", area: "Pit E", material: "PIT E - SEKATAN", period, notes: "", keterangan: "", unit: "BCM", distance: 2471, distanceWeightAvg: 2471, initialVolume: 0, adjustedVolume: 0, rate: getSowMasterRate ? getSowMasterRate("SBS", "PIT E - SEKATAN", 16931) : 16931, subtotalInitial: 0, subtotalAdjusted: 0 },
        { id: `sbs_ba_a6_${Date.now() + 5}`, category: "Operating & Mining", area: "Pit E", material: "PIT E - TS MAHONI", period, notes: "", keterangan: "", unit: "BCM", distance: 3508, distanceWeightAvg: 3508, initialVolume: 0, adjustedVolume: 0, rate: getSowMasterRate ? getSowMasterRate("SBS", "PIT E - TS MAHONI", 22654) : 22654, subtotalInitial: 0, subtotalAdjusted: 0 },
        { id: `sbs_ba_a7_${Date.now() + 6}`, category: "Operating & Mining", area: "Pit E", material: "PIT E - IPD WARWEFILL", period, notes: "", keterangan: "", unit: "BCM", distance: 928, distanceWeightAvg: 928, initialVolume: 0, adjustedVolume: 0, rate: getSowMasterRate ? getSowMasterRate("SBS", "PIT E - IPD WARWEFILL", 8346) : 8346, subtotalInitial: 0, subtotalAdjusted: 0 },
        { id: `sbs_ba_a8_${Date.now() + 7}`, category: "Operating & Mining", area: "Pit E", material: "PIT E - SEKATAN", period, notes: "", keterangan: "", unit: "BCM", distance: 2954, distanceWeightAvg: 2954, initialVolume: 0, adjustedVolume: 0, rate: getSowMasterRate ? getSowMasterRate("SBS", "PIT E - SEKATAN", 19375) : 19375, subtotalInitial: 0, subtotalAdjusted: 0 }
      ];
    },
    [getCurrentMonthPeriod, defaultSBSBAOperatingItems, getSowMasterRate]
  );

  // pending = form BGG yang sama untuk pendingVolume BA induk (hanya baris overburden, periode sendiri).
  const openBAModal = (parent: any, isEditMode: boolean = false, pending: boolean = false) => {
    setEditItem(parent);
    const pv = parent.pendingVolume;
    const pvPeriod = pv?.period || parent.workPeriod;
    const item = !pending ? parent : {
      ...parent, workPeriod: pvPeriod,
      items: pv?.items?.length ? pv.items : createBlankBGGBAItems(pvPeriod).filter((it) => it.section === "A" || it.material === "Over Distance For OB Removal"),
    };
    setIsInlineEditingBA(isEditMode);
    const bggData = item.bggData || {};
    const posData = item.posData || {};
    const ptroData = item.ptroData || {};
    const sbsData = item.sbsData || {};
    const bggTotalTerbongkar = bggData?.agreedSurveyVolume || bggData?.volumeBGG || 0;
    const bggCoalVolumeBCM = bggData?.coalVolumeBCM || 0;
    const bggCoalVolumeTon = bggData?.coalVolumeTon || 0;
    const bggOBDistanceHm = bggData?.obOverDistanceHm || 0;
    const bggNettOB = bggData?.nettOBVolume || (bggTotalTerbongkar > 0 ? Math.max(0, bggTotalTerbongkar - bggCoalVolumeBCM) : 0);

    setFormData({
      ...item,
      bggData,
      posData,
      ptroData,
      sbsData,
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
      pendingMode: pending,
    });
    const initialItems = getInitialBAItemsForRecord(item);
    const syncedInitialItems = syncBARatesWithMasterData
      ? syncBARatesWithMasterData(initialItems, item.customerCode || "BGG", item.workPeriod)
      : initialItems;
    const isCustomerBGG = (item.customerCode || "BGG").toUpperCase() === "BGG" || (item.customerCode || "BGG").toUpperCase() === "PT BGG";

    // Clean residue POS items if this is a BGG BA
    const cleanedInitialItems = syncedInitialItems.filter((i: any) => {
      if (!isCustomerBGG) return true;
      const m = (i.material || "").toLowerCase();
      const id = (i.id || "").toLowerCase();
      if (id.startsWith("ba_op") || id.startsWith("ba_mdo") || id.startsWith("ba_dist")) return false;
      if (m.includes("limonite") || m.includes("saprolite") || m.includes("topsoil") || m.includes("cut or fill") || m.includes("land clearing")) {
        return false;
      }
      return true;
    });

    const isDPFuel = (i: any) => {
      const c = (i.category || "").toLowerCase();
      const m = (i.material || "").toLowerCase();
      const sec = (i.section || "").toUpperCase();
      return sec === "F" || c === "dp fuel" || m.includes("dp fuel") || m.includes("pengurang solar") || m.includes("potongan solar");
    };
    const isMDO = (i: any) => {
      const c = (i.category || "").toLowerCase();
      return c === "mdo" || c === "penunjang" || i.unit === "Hours" || i.unit === "Jam";
    };
    const isPenaltyOrDed = (i: any) => {
      const c = (i.category || "").toLowerCase();
      return (i.isDeduction || c === "pengurang biaya" || c === "pengurang pembayaran") && !isDPFuel(i);
    };

    // ID unik per baris: hapus baris & baris Raise & Fall turunan bergantung pada id.
    const seenIds = new Set<string>();
    const normalizedItems = cleanedInitialItems.map((i: any, idx: number) => {
      if (!i.id || seenIds.has(i.id)) i = { ...i, id: `ba_item_${Date.now()}_${idx}` };
      seenIds.add(i.id);
      const c = (i.category || "").toLowerCase();
      const m = (i.material || "").toLowerCase();
      const isDist = i.isDistanceVar || c.includes("distance") || m.includes("distance") || m.includes("overhaul");
      if (isDist) {
        const d = Number(i.distanceM ?? i.distance ?? i.distanceWeightAvg ?? 0);
        if (d > 0) {
          return { ...i, distanceM: d, distance: d, distanceWeightAvg: d };
        }
      }
      return i;
    });

    // DP Fuel bisa 4-6 kali per bulan: semua baris bernominal dipertahankan, baris kosong sisa simpanan lama dibuang.
    const filteredItems = isCustomerBGG ? dropEmptyDPFuel(normalizedItems) : normalizedItems;

    const ops = filteredItems.filter((i: any) => !isMDO(i) && !isPenaltyOrDed(i));
    const mdo = filteredItems.filter((i: any) => isMDO(i) && !isPenaltyOrDed(i));
    const deds = filteredItems.filter((i: any) => isPenaltyOrDed(i));
    setBaOperatingItems(ops);
    setBaMDOItems(mdo);
    setBaDeductionItems(deds);
    setActiveBAStep(1);
    setDetailViewItem(null);
    setModalType("ba");
  };

  const handleVerifyBA = async (id: number) => {
    const key = `verify-ba-${id}`;
    if (setActionLoadingKey) setActionLoadingKey(key);
    onNotice("⏳ Sedang memverifikasi Berita Acara...");
    try {
      const updated: any = await verifyBATracker(id, "verify", "Verifikasi Berita Acara oleh Finance Specialist");
      onNotice("✅ Berita Acara berhasil diverifikasi oleh Finance Specialist.");
      if (setBaRows) {
        setBaRows((prev) => prev.map((b) => b.id === id ? { ...b, ...(updated || {}), statusBA: updated?.statusBA || "Verified (Review HO)" } : b));
      }
      if (detailViewItem && detailViewItem.type === "ba" && (detailViewItem.data?.id === id || detailViewItem.id === id)) {
        setDetailViewItem({ type: "ba", data: { ...(detailViewItem.data || detailViewItem), ...(updated || {}), statusBA: updated?.statusBA || "Verified (Review HO)" } });
      }
      await loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal memverifikasi BA");
    } finally {
      if (setActionLoadingKey) setActionLoadingKey(null);
    }
  };

  const handleApproveBA = async (id: number, rejectNote?: string) => {
    const key = `approve-ba-${id}`;
    if (setActionLoadingKey) setActionLoadingKey(key);
    onNotice(rejectNote ? "⏳ Sedang menolak Berita Acara..." : "⏳ Sedang menyetujui Berita Acara...");
    try {
      const updated: any = await approveBATracker(id, rejectNote ? "reject" : "approve", rejectNote || "Disetujui oleh Manager");
      onNotice(rejectNote ? "Berita Acara ditolak Manager (Revisi)." : "✅ Berita Acara disetujui (Approved by Manager).");
      if (setBaRows) {
        setBaRows((prev) => prev.map((b) => b.id === id ? { ...b, ...(updated || {}) } : b));
      }
      if (detailViewItem && detailViewItem.type === "ba" && (detailViewItem.data?.id === id || detailViewItem.id === id)) {
        setDetailViewItem({ type: "ba", data: { ...(detailViewItem.data || detailViewItem), ...(updated || {}) } });
      }
      await loadData();
    } catch (err: any) {
      onNotice(err?.message || (rejectNote ? "Gagal menolak BA" : "Gagal menyetujui BA"));
    } finally {
      if (setActionLoadingKey) setActionLoadingKey(null);
    }
  };

  const handleAccrueBA = async (id: number) => {
    const key = `accrue-ba-${id}`;
    if (setActionLoadingKey) setActionLoadingKey(key);
    onNotice("⏳ Sedang mengakrualkan pendapatan (Unbilled AR) ke General Ledger...");
    try {
      await generateJournalFromBA(id);
      onNotice("✅ Jurnal Akrual Pendapatan (Unbilled AR) berhasil dibukukan ke General Ledger.");
      if (setBaRows) {
        setBaRows((prev) => prev.map((b) => b.id === id ? { ...b, accrualStatus: "Sudah Diakrualkan" } : b));
      }
      if (detailViewItem && detailViewItem.type === "ba" && (detailViewItem.data?.id === id || detailViewItem.id === id)) {
        setDetailViewItem({ type: "ba", data: { ...(detailViewItem.data || detailViewItem), accrualStatus: "Sudah Diakrualkan" } });
      }
      await loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal mengakrualkan Berita Acara");
    } finally {
      if (setActionLoadingKey) setActionLoadingKey(null);
    }
  };

  const handleDeletePendingVolume = async (ba: any) => {
    if (!window.confirm("Hapus Pending Volume?")) return;
    try {
      await api(`/api/finance/ba-trackers/${ba.id}`, { method: "PUT", body: JSON.stringify(withPendingVolume(ba, null)) });
      onNotice("Pending Volume dihapus.");
      setModalType("none");
      await loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal menghapus Pending Volume");
    }
  };

  const handleSaveBGGBA = async (baPayload: any, isSubmit = false) => {
    try {
      let saved: any = null;
      if (baPayload.id) {
        saved = await api(`/api/finance/ba-trackers/${baPayload.id}`, {
          method: "PUT",
          body: JSON.stringify(baPayload),
        });
      } else {
        saved = await api(`/api/finance/ba-trackers`, {
          method: "POST",
          body: JSON.stringify(baPayload),
        });
      }
      if (setBaRows) {
        if (baPayload.id) {
          setBaRows((prev) => prev.map((b) => b.id === baPayload.id ? (saved || { ...b, ...baPayload }) : b));
        } else {
          setBaRows((prev) => [saved || { id: Date.now(), ...baPayload }, ...prev]);
        }
      }
      localStorage.removeItem(draftKey("ba", baPayload.id));
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
    handleDeletePendingVolume,
    reorderBAItems,
    moveBAItem,
    createBlankBGGBAItems,
    createBlankSBSBAItems
  };
}
