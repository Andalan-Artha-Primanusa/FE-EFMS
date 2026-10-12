import { uploadDocumentFile } from "../../lib/api";
import { generateInvoiceNumber, formatDateInput, matchPeriod } from "./helpers";
import { resolveHOMasterLaborAndCurrency, calculateTripleFactorRF } from "./ba_calculations";
import { customerKind, rfMasterFor, computeRFIndex, obSplitSOWs, ptroContractRates } from "./masterRegistry";

interface UseFinanceModalManagerProps {
  user: any;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  customerRows: any[];
  customerContractMap: Record<string, any>;
  invoiceRows: any[];
  baRows: any[];
  setInvLineItems: (items: any[]) => void;
  blankPOSItems: any[];
  blankBGGItems: any[];
  blankPTROItems: any[];
  blankSBSItems: any[];
  buildInvItems: (ba: any, custCode?: string, category?: any) => any[];
  onNotice: (msg: string) => void;
  setModalType: (type: any) => void;
  setEditItem: (item: any) => void;
  setDetailViewItem: (item: any) => void;
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
  formData,
  setFormData,
  customerRows,
  customerContractMap,
  invoiceRows,
  baRows,
  setInvLineItems,
  blankPOSItems,
  blankBGGItems,
  blankPTROItems,
  blankSBSItems,
  buildInvItems,
  onNotice,
  setModalType,
  setEditItem,
  setDetailViewItem,
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
  // Header kontrak & rekening penerimaan invoice: Master Customer + Master Rekening Bank (kosong bila belum diatur).
  const contractHeader = (code: string) => {
    const c = customerContractMap[String(code || "").toUpperCase()] || {};
    return {
      projectSite: c.project || "", contractNo: c.contract || "", noPO: c.noPO || "",
      bankName: c.bankName || "", bankAccountNo: c.bankAccountNo || "", bankBranch: c.bankBranch || "",
      directorName: c.directorName || "", directorTitle: c.directorTitle || "",
    };
  };
  // Tarif pending OB default = tarif OB ber-split customer di Master Variable SOW.
  const pendingOBRates = (code: string) => {
    const [ob1, ob2] = obSplitSOWs(code);
    return {
      r1: Number(ob1?.rateIDR || ob1?.tier2Rate || 0), r2: Number(ob2?.rateIDR || ob2?.tier2Rate || 0),
      s1: Number(ob1?.splitPercentage || 0) / 100, s2: Number(ob2?.splitPercentage || 0) / 100,
    };
  };

  const handleCompanySelect = (code: string) => {
    if (code === "BGG") setInvLineItems(blankBGGItems.map(i => ({ ...i })));
    else if (code === "PTRO" || code === "DBK") setInvLineItems(blankPTROItems.map(i => ({ ...i })));
    else if (code === "SBS") setInvLineItems(blankSBSItems.map(i => ({ ...i })));
    else setInvLineItems(blankPOSItems.map(i => ({ ...i })));

    setFormData((prev: any) => {
      const period = prev.workPeriod || getCurrentMonthPeriod();
      return { ...prev, customerCode: code, ...contractHeader(code), noPO: prev.noPO || contractHeader(code).noPO, invoiceNo: generateInvoiceNumber(code, period, invoiceRows.length) };
    });
  };

  const handleBASelect = (baNumber: string) => {
    if (!baNumber) {
      setFormData((prev: any) => ({ ...prev, baNoReference: "" }));
      return;
    }
    const selectedBa = baRows.find((r) => r.baNumber === baNumber);
    if (selectedBa) {
      const code = selectedBa.customerCode || "";
      const header = contractHeader(code);
      const workPeriod = selectedBa.workPeriod || "";
      const cat = (formData.invoiceCategory || (formData.activityGroup?.includes("MDO") ? "MDO" : "Operation & Mining")) as "Operation & Mining" | "MDO";
      let autoInvNo = generateInvoiceNumber(code, workPeriod, invoiceRows.length);
      if (code === "POS" && cat === "MDO") autoInvNo = autoInvNo.replace(/RF|MINING/g, "MDO");
      const poNum = selectedBa.noPO || selectedBa.poNumber || header.noPO;

      setFormData((prev: any) => ({
        ...prev, ...header, baNoReference: selectedBa.baNumber, customerCode: code, workPeriod, invoiceNo: autoInvNo,
        noPO: poNum, poNumber: poNum,
        activityGroup: (code === "POS" && cat === "MDO") ? "MINE DEVELOPMENT OPERATION (MDO)" : (selectedBa.activityGroup || "OPERATION & MINING"),
        invoiceCategory: cat,
      }));
      setInvLineItems(buildInvItems(selectedBa, code, cat));
      onNotice(`No. BA ${selectedBa.baNumber} dipilih. Volume survei klaim [${cat}] berhasil diisi otomatis.`);
    }
  };

  const createInvoiceFromBA = (ba: any, category: "Operation & Mining" | "MDO" = "Operation & Mining") => {
    const isBAReady = ba.statusBA === "Ready to Invoice" || ba.statusBA === "Approved" || ba.statusBA === "Verified" || ba.statusBA === "Disetujui" || Boolean(ba.verifiedBy);
    if (!isBAReady) {
      onNotice("Perhatian: Berita Acara belum diverifikasi oleh Finance Specialist. Mohon verifikasi BA terlebih dahulu.");
      return;
    }
    const code = ba.customerCode || "";
    const period = ba.workPeriod || "";
    let autoInvNo = generateInvoiceNumber(code, period, invoiceRows.length);
    if (code === "POS" && category === "MDO") autoInvNo = autoInvNo.replace(/RF|MINING/g, "MDO");
    const header = contractHeader(code);
    const poNum = ba.noPO || ba.poNumber || header.noPO;

    setEditItem(null);
    setFormData({
      ...header, baID: ba.id, customerCode: code, workPeriod: period, invoiceNo: autoInvNo, baNoReference: ba.baNumber,
      noPO: poNum, poNumber: poNum,
      activityGroup: (code === "POS" && category === "MDO") ? "MINE DEVELOPMENT OPERATION (MDO)" : "OPERATION & MINING",
      invoiceCategory: category,
    });
    setInvLineItems(buildInvItems(ba, code, category));
    setDetailViewItem(null);
    setModalType("invoice");
    onNotice(`Menyiapkan Form Draf Invoice [${category}] dari No. BA ${ba.baNumber} (${code}).`);
  };

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
        const xn = Number(matched?.actualMRateXn || hoResolved.currencyXn);
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
        const currentM = Number(matched?.actualMRateXn || latestKursBI || mRate || 0);
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
      setBaOperatingItems(
        (cust === "BGG" || cust === "PT BGG" ? createBlankBGGBAItems(defaultPeriod)
        : (cust === "PTRO" || cust === "PT Petrosea") ? (defaultPTROBAItems || defaultDBKBAItems || []).map((it: any) => ({ ...it, period: defaultPeriod, notes: "", keterangan: "" }))
        : cust === "DBK" ? (defaultDBKBAItems || []).map((it: any) => ({ ...it, period: defaultPeriod, notes: "", keterangan: "" }))
        : cust === "SBS" ? createBlankSBSBAItems(defaultPeriod)
        : defaultPOSBAOperatingItems.map(it => ({ ...it, area: "", period: defaultPeriod, notes: "", keterangan: "" }))
        ).map((it: any) => ({ ...it, initialVolume: 0, adjustedVolume: 0, subtotalInitial: 0, subtotalAdjusted: 0 }))
      );
      setBaMDOItems(
        (cust === "SBS" ? (defaultSBSBAMDOItems || []).map((it: any) => ({ ...it, area: "Pit E", period: defaultPeriod, notes: "", keterangan: "" }))
        : (cust === "BGG" || cust === "DBK" || cust === "PTRO" || cust === "PT Petrosea") ? []
        : defaultPOSBAMDOItems.map(it => ({ ...it, area: "", period: defaultPeriod, notes: "", keterangan: "" }))
        ).map((it: any) => ({ ...it, initialVolume: 0, adjustedVolume: 0, subtotalInitial: 0, subtotalAdjusted: 0 }))
      );
      setBaDeductionItems(
        cust === "SBS" ? (defaultSBSBADeductionItems || []).map((it: any) => ({ ...it, area: "Pit E", period: defaultPeriod, notes: "", keterangan: "", rate: 0, subtotalInitial: 0, subtotalAdjusted: 0, material: it.material === "Denda ketidakcapaian Volume" ? `Denda ketidakcapaian Volume ${defaultPeriod}` : it.material })) : []
      );
      setActiveBAStep(1);
    } else if (type === "pending_volume") {
      const defaultCust = initialData?.customerCode || ((user?.companyCode && user.companyCode !== "HO") ? user.companyCode : "");
      const { r1, r2 } = pendingOBRates(defaultCust);
      setFormData({
        customerCode: defaultCust, workPeriod: initialData?.workPeriod || curMonth, sourcePeriod: initialData?.sourcePeriod || curMonth,
        sourceBARef: initialData?.sourceBARef || "-", originalOBVolume: 0, absorbedVolume: 0, remainingVolume: 0,
        ob1Rate: r1, ob2Rate: r2, workAmount: 0, picAAP: "Surveyor Site", notes: "", ...initialData,
      });
    } else if (type === "invoice") {
      const userSiteCode = (user?.companyCode && user.companyCode !== "HO") ? user.companyCode : "";
      const defaultCompany = initialData?.customerCode || userSiteCode || "";
      const defaultPeriod = initialData?.workPeriod || curMonth;
      setFormData({
        ...contractHeader(defaultCompany),
        customerCode: defaultCompany, workPeriod: defaultPeriod,
        invoiceNo: defaultCompany ? generateInvoiceNumber(defaultCompany, defaultPeriod, invoiceRows.length) : "",
        activityGroup: initialData?.activityGroup || "OPERATION & MINING",
        ...initialData,
      });
      if (defaultCompany === "BGG") setInvLineItems(blankBGGItems.map(i => ({ ...i })));
      else if (defaultCompany === "PTRO" || defaultCompany === "DBK") setInvLineItems(blankPTROItems.map(i => ({ ...i })));
      else if (defaultCompany === "SBS") setInvLineItems(blankSBSItems.map(i => ({ ...i })));
      else setInvLineItems(blankPOSItems.map(i => ({ ...i })));
    }
    setModalType(type);
  };

  const openEditModal = (type: any, item: any) => {
    if (type === "ba") { openBAModal(item, true); return; }
    if (type === "pending_volume") {
      setEditItem(item);
      const master = pendingOBRates(item.customerCode);
      const r1 = item.ob1Rate ?? master.r1;
      const r2 = item.ob2Rate ?? master.r2;
      const vol = item.originalOBVolume ?? 0;
      setFormData({
        ...item, customerCode: item.customerCode || "", workPeriod: item.sourcePeriod || "",
        sourcePeriod: item.sourcePeriod || "", sourceBARef: item.sourceBaRef || item.sourceBARef || "-",
        originalOBVolume: vol, absorbedVolume: item.absorbedVolume ?? 0, remainingVolume: item.remainingVolume ?? vol,
        ob1Rate: r1, ob2Rate: r2, workAmount: Math.round(vol * (r1 * master.s1 + r2 * master.s2)), status: item.status || "Active", notes: item.notes || ""
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
    if (type === "invoice") {
      const code = (item.customerCode || "").toUpperCase();
      const cat = item.invoiceCategory;
      const items = (item.items && Array.isArray(item.items) && item.items.length > 0)
        ? item.items
        : buildInvItems(baRows.find((b: any) => b.baNumber === item.baNoReference) || item, code, cat);
      setInvLineItems(items);
    }
    setModalType(type);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (file) {
      onNotice(`Mengunggah berkas PDF "${file.name}" ke server...`);
      try {
        const res = await uploadDocumentFile(file, "Berita Acara", fieldName === "draftBAPath" ? "Draft BA" : "Final Signed BA");
        const permanentUrl = res.url || `/uploads/${res.storedName}`;
        setFormData((prev: any) => ({ ...prev, [fieldName]: permanentUrl, [`${fieldName}Name`]: file.name }));
        onNotice(`Berkas PDF "${file.name}" berhasil disimpan.`);
      } catch (err: any) { onNotice(`Gagal mengunggah PDF: ${err?.message || "Kesalahan server"}`); }
    }
  };

  return {
    handleCompanySelect,
    handleBASelect,
    createInvoiceFromBA,
    openCreateModal,
    openEditModal,
    handleFileUpload
  };
}
