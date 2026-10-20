import { uploadBADocument } from "../../lib/api";
import { formatDateInput } from "./helpers";
import { resolveHOMasterLaborAndCurrency, calculateTripleFactorRF } from "./ba_calculations";
import { masterOBRates } from "./modals/PendingVolumeRecordModal";
import { customerKind, rfMasterFor, computeRFIndex, ptroContractRates, baItemsFromSOW, kursForPeriod } from "./masterRegistry";

interface UseFinanceModalManagerProps {
  user: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  customerRows: any[];
  onNotice: (msg: string) => void;
  setModalType: (type: any) => void;
  setEditItem: (item: any) => void;
  setIsInlineEditingBA: (val: boolean) => void;
  createBlankBGGBAItems: (period?: string) => any[];
  createBlankSBSBAItems: (period?: string) => any[];
  defaultDBKBAItems: any[];
  defaultPTROBAItems?: any[];
  defaultPOSBAOperatingItems: any[];
  defaultSBSBAMDOItems: any[];
  defaultPOSBAMDOItems: any[];
  defaultSBSBADeductionItems: any[];
  setBaOperatingItems: React.Dispatch<React.SetStateAction<any[]>>;
  setBaMDOItems: React.Dispatch<React.SetStateAction<any[]>>;
  setBaDeductionItems: React.Dispatch<React.SetStateAction<any[]>>;
  setActiveBAStep: (val: number) => void;
  setShowPendingVolumeDrawer: (val: boolean) => void;
  openBAModal: (item: any, isEditMode?: boolean) => void;
  getCurrentMonthPeriod: () => string;
  getPreviousMonthPeriod?: () => string;
  raiseFallMasters?: any[];
  minWageMasters?: any[];
  latestKursBI?: number;
  mRate?: number;
}

export function useFinanceModalManager({
  user,
  setFormData,
  customerRows,
  onNotice,
  setModalType,
  setEditItem,
  setIsInlineEditingBA,
  createBlankBGGBAItems,
  createBlankSBSBAItems,
  defaultDBKBAItems,
  defaultPTROBAItems,
  defaultPOSBAOperatingItems,
  defaultSBSBAMDOItems,
  defaultPOSBAMDOItems,
  defaultSBSBADeductionItems,
  setBaOperatingItems,
  setBaMDOItems,
  setBaDeductionItems,
  setActiveBAStep,
  setShowPendingVolumeDrawer,
  openBAModal,
  getCurrentMonthPeriod,
  getPreviousMonthPeriod,
  raiseFallMasters = [],
  minWageMasters = [],
  latestKursBI,
  mRate
}: UseFinanceModalManagerProps) {
  const openCreateModal = (type: any, initialData: any = {}) => {
    setEditItem(null);
    const todayStr = new Date().toISOString().slice(0, 10);
    const curMonth = getCurrentMonthPeriod();
    if (type === "ba") {
      const userSiteCode = (user?.companyCode && user.companyCode !== "HO") ? user.companyCode : "";
      const cust = initialData.customerCode || userSiteCode || "";
      const defaultPeriod = initialData.workPeriod || (getPreviousMonthPeriod ? getPreviousMonthPeriod() : curMonth);
      setIsInlineEditingBA(true);

      let bggDataInit = initialData.bggData;
      let posDataInit = initialData.posData;
      let matchedRfIndex = initialData.rfIndexCalculated;
      if (!bggDataInit && customerKind(cust) === "BGG") {
        const matched = rfMasterFor(cust, defaultPeriod);
        if (matched) {
          const p1F = Number(matched.bggFuelP1 ?? 0);
          const p1T = Number(matched.bggTransportP1 ?? 0);
          const p2F = Number(matched.bggFuelP2 ?? 0);
          const p2T = Number(matched.bggTransportP2 ?? 0);
          const tot1 = p1F + p1T;
          const tot2 = p2F + p2T;
          const avg = Number(matched.actualFuelFn || ((tot1 > 0 && tot2 > 0) ? (tot1 + tot2) / 2 : (tot1 || tot2 || 0)));
          const rf = Number(matched.rfIndexResult || computeRFIndex(matched, avg));
          matchedRfIndex = rf;
          bggDataInit = {
            bggFuelP1: p1F,
            bggTransportP1: p1T,
            bggFuelP2: p2F,
            bggTransportP2: p2T,
            bggAvgFn: avg,
            bggRfIndex: rf,
            fuelPeriods: {
              [defaultPeriod]: {
                bggFuelP1: p1F,
                bggTransportP1: p1T,
                bggFuelP2: p2F,
                bggTransportP2: p2T,
                bggAvgFn: avg,
                bggRfIndex: rf,
              }
            }
          };
        }
      } else if (!posDataInit && customerKind(cust) === "POS") {
        const matched = rfMasterFor(cust, defaultPeriod);
        const hoResolved = resolveHOMasterLaborAndCurrency({
          customerCode: cust,
          period: defaultPeriod,
          raiseFallMasters,
          minWageMasters,
          latestKursBI,
          mRate,
        });
        const fn = Number(matched?.actualFuelFn ?? 0);
        const ln = Number(matched?.actualLaborLn || hoResolved.laborLn);
        const xn = Number(hoResolved.currencyXn || matched?.actualMRateXn || 0);
        const { rfIndex: rf } = calculateTripleFactorRF(fn, ln, xn, cust, defaultPeriod);
        matchedRfIndex = rf;
        posDataInit = {
          actualFuelFn: fn,
          actualLaborLn: ln,
          actualMRateXn: xn,
          posRfIndex: rf,
          fuelPeriods: {
            [defaultPeriod]: {
              actualFuelFn: fn,
              actualLaborLn: ln,
              actualMRateXn: xn,
              posRfIndex: rf,
            }
          }
        };
      }

      let ptroDataInit = initialData.ptroData;
      if (!ptroDataInit && customerKind(cust) === "PTRO") {
        const matched = rfMasterFor(cust, defaultPeriod);
        const currentM = Number(kursForPeriod(defaultPeriod) || matched?.actualMRateXn || latestKursBI || mRate || 0);
        const rates = ptroContractRates(cust);
        ptroDataInit = { actualMRate: currentM, ...rates, fuelPeriods: { [defaultPeriod]: { actualMRate: currentM, ...rates } } };
      }

      let sbsDataInit = initialData.sbsData;
      if (!sbsDataInit && cust === "SBS") {
        const noPenalty = { dendaMA: 0, dendaBBMLoader: 0, dendaBBMHauler: 0, dendaVolume: 0 };
        sbsDataInit = { ...noPenalty, fuelPeriods: { [defaultPeriod]: { ...noPenalty } } };
      }

      setFormData({
        statusBA: "Submit", baSubmittedDate: todayStr, workPeriod: defaultPeriod, customerCode: cust,
        picAAP: initialData?.picAAP || user?.name || "Operations / Site Engineer", step1Locked: false,
        draftBARefNo: "", signedBANumber: "", invoiceNoLinked: "", invoiceIssuedDate: "", verifiedBy: "", verifiedAt: "",
        approvedBy: "", approvedAt: "", bggTotalTerbongkar: initialData.bggTotalTerbongkar ?? "",
        bggCoalVolumeBCM: initialData.bggCoalVolumeBCM ?? "", bggCoalVolumeTon: initialData.bggCoalVolumeTon ?? "",
        bggOBDistanceHm: initialData.bggOBDistanceHm ?? 0, bggNettOB: 0,
        bggData: bggDataInit,
        posData: posDataInit,
        ptroData: ptroDataInit,
        sbsData: sbsDataInit,
        rfIndexCalculated: matchedRfIndex,
        ...initialData,
      });
      // POS & customer lain: baris default langsung dari Master Variable SOW; template BE hanya cadangan.
      const sowRows = baItemsFromSOW(cust, defaultPeriod);
      setBaOperatingItems(
        (cust === "BGG" || cust === "PT BGG" ? createBlankBGGBAItems(defaultPeriod)
        : (cust === "PTRO" || cust === "PT Petrosea") ? (defaultPTROBAItems || defaultDBKBAItems || []).map((it: any) => ({ ...it, period: defaultPeriod, notes: "", keterangan: "" }))
        : cust === "DBK" ? (defaultDBKBAItems || []).map((it: any) => ({ ...it, period: defaultPeriod, notes: "", keterangan: "" }))
        : cust === "SBS" ? createBlankSBSBAItems(defaultPeriod)
        : sowRows.operating.length ? sowRows.operating
        : defaultPOSBAOperatingItems.map(it => ({ ...it, area: "", period: defaultPeriod, notes: "", keterangan: "" }))
        ).map((it: any) => ({ ...it, initialVolume: 0, adjustedVolume: 0, subtotalInitial: 0, subtotalAdjusted: 0 }))
      );
      setBaMDOItems(
        (cust === "SBS" ? (defaultSBSBAMDOItems || []).map((it: any) => ({ ...it, area: "Pit E", period: defaultPeriod, notes: "", keterangan: "" }))
        : (cust === "BGG" || cust === "DBK" || cust === "PTRO" || cust === "PT Petrosea") ? []
        : sowRows.mdo.length ? sowRows.mdo
        : defaultPOSBAMDOItems.map(it => ({ ...it, area: "", period: defaultPeriod, notes: "", keterangan: "" }))
        ).map((it: any) => ({ ...it, initialVolume: 0, adjustedVolume: 0, subtotalInitial: 0, subtotalAdjusted: 0 }))
      );
      setBaDeductionItems(
        cust === "SBS" ? (defaultSBSBADeductionItems || []).map((it: any) => ({ ...it, area: "Pit E", period: defaultPeriod, notes: "", keterangan: "", rate: 0, subtotalInitial: 0, subtotalAdjusted: 0, material: it.material === "Denda ketidakcapaian Volume" ? `Denda ketidakcapaian Volume ${defaultPeriod}` : it.material })) : []
      );
      setActiveBAStep(1);
    } else if (type === "pending_volume") {
      const defaultCust = initialData?.customerCode || ((user?.companyCode && user.companyCode !== "HO") ? user.companyCode : "");
      const { r1, r2 } = masterOBRates(defaultCust, initialData?.sourcePeriod || curMonth);
      setFormData({
        customerCode: defaultCust, sourcePeriod: initialData?.sourcePeriod || curMonth,
        sourceBARef: "", originalOBVolume: 0, ob1Rate: r1, ob2Rate: r2, notes: "", ...initialData,
      });
    }
    setModalType(type);
  };

  const openEditModal = (type: any, item: any) => {
    if (type === "ba") { openBAModal(item, true); return; }
    if (type === "pending_volume") {
      setEditItem(item);
      const master = masterOBRates(item.customerCode, item.sourcePeriod);
      const r1 = item.ob1Rate ?? master.r1;
      const r2 = item.ob2Rate ?? master.r2;
      setFormData({
        ...item, customerCode: item.customerCode || "", sourcePeriod: item.sourcePeriod || "",
        sourceBARef: item.sourceBaRef || "", originalOBVolume: item.originalOBVolume ?? 0, ob1Rate: r1, ob2Rate: r2, notes: item.notes || ""
      });
      setShowPendingVolumeDrawer(false);
      setModalType("pending_volume");
      return;
    }
    setEditItem(item);
    setFormData({
      ...item,
      workEndDate: formatDateInput(item.workEndDate), baSubmittedDate: formatDateInput(item.baSubmittedDate),
      baSentDate: formatDateInput(item.baSentDate), internalRoutingDate: formatDateInput(item.internalRoutingDate),
      baSignedDate: formatDateInput(item.baSignedDate), invoiceIssuedDate: formatDateInput(item.invoiceIssuedDate),
      baDate: formatDateInput(item.baDate), invoiceDate: formatDateInput(item.invoiceDate), paymentDate: formatDateInput(item.paymentDate),
    });
    setModalType(type);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (file) {
      onNotice(`Mengunggah berkas PDF "${file.name}" ke server...`);
      try {
        const res = await uploadBADocument(file, fieldName === "draftBAPath" ? "Draft BA" : "Final Signed BA");
        const permanentUrl = res.url || `/uploads/${res.storedName}`;
        setFormData((prev: any) => ({ ...prev, [fieldName]: permanentUrl, [`${fieldName}Name`]: file.name }));
        onNotice(`Berkas PDF "${file.name}" tersimpan di server. Klik "Simpan Perubahan" agar tertaut ke BA.`);
      } catch (err: any) { onNotice(`Gagal mengunggah PDF: ${err?.message || "Kesalahan server"}`); }
    }
  };

  return {
    openCreateModal,
    openEditModal,
    handleFileUpload
  };
}
