import { uploadDocumentFile } from "../../lib/api";
import { generateInvoiceNumber, formatDateInput, matchPeriod } from "./helpers";
import { resolveHOMasterLaborAndCurrency, calculateTripleFactorRF } from "./ba_calculations";

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
  const handleCompanySelect = (code: string) => {
    const mapMatch = customerContractMap[code];
    const cust = customerRows.find((c: any) => c.code === code);
    if (code === "BGG") setInvLineItems(blankBGGItems.map(i => ({ ...i })));
    else if (code === "PTRO" || code === "DBK") setInvLineItems(blankPTROItems.map(i => ({ ...i })));
    else if (code === "SBS") setInvLineItems(blankSBSItems.map(i => ({ ...i })));
    else setInvLineItems(blankPOSItems.map(i => ({ ...i })));

    setFormData((prev: any) => {
      const period = prev.workPeriod || "Juni 2026";
      const autoInvNo = generateInvoiceNumber(code, period, invoiceRows.length);
      const defaultSites: Record<string, string> = { BGG: "PT Budi Gema Gempita Site", POS: "POS PROJECT", IBP: "PT Indo Bhumi Pasifik Site", BBA: "PT Bara Batubara Aditama Site", SBS: "SBS - Tanjung Enim", PTRO: "PT Petrosea Site" };
      const defaultContracts: Record<string, string> = { BGG: "09/BGG-AAP/VIII/2018", POS: "002/POS-AAP/2025", IBP: "001/IBP-AAP/2026", BBA: "001/BBA-AAP/2026", SBS: "230/AAP-SBS/EXT/XII/24", PTRO: "001/PTRO-AAP/2024" };
      return {
        ...prev, customerCode: code,
        projectSite: mapMatch?.project || defaultSites[code] || cust?.projectSite || `${code} Site`,
        contractNo: mapMatch?.contract || defaultContracts[code] || cust?.contractNo || `001/${code}-AAP/2026`,
        noPO: mapMatch?.noPO || prev.noPO || (code === "SBS" ? "SPPH-05852" : `PO-${code}-2026-001`),
        bankName: mapMatch?.bankName || prev.bankName || (code === "BGG" ? "Bank Mandiri" : (code === "PTRO" || code === "SBS") ? "Bank BRI" : "Bank BNI"),
        bankAccountNo: mapMatch?.bankAccountNo || prev.bankAccountNo || (code === "BGG" ? "070-00-2888000-8" : (code === "PTRO" || code === "SBS") ? "0417-01-880088-30-8" : "8188788882"),
        bankBranch: mapMatch?.bankBranch || prev.bankBranch || (code === "BGG" ? "Plaza Mandiri Jakarta" : (code === "PTRO" || code === "SBS") ? "S. Parman - Slipi Jakarta" : "Harmoni, Jakarta"),
        directorName: mapMatch?.directorName || "GAHARI CHRISTINE",
        directorTitle: mapMatch?.directorTitle || (code === "SBS" ? "DIREKTUR UTAMA" : "DIRECTOR"),
        invoiceNo: autoInvNo
      };
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
      const cust = customerRows.find((c: any) => c.code === code);
      const cInfo = customerContractMap[code];
      const projectSite = cust?.fullName ? `${cust.fullName} Site` : selectedBa.projectSite || cInfo?.project || `${code} PROJECT`;
      const contractNo = cust?.contractNo || selectedBa.contractNo || cInfo?.contract || `002/${code}-AAP/2025`;
      const workPeriod = selectedBa.workPeriod || "Jul-26";
      const cat = (formData.invoiceCategory || (formData.activityGroup?.includes("MDO") ? "MDO" : "Operation & Mining")) as "Operation & Mining" | "MDO";
      let autoInvNo = generateInvoiceNumber(code, workPeriod, invoiceRows.length);
      if (code === "POS" && cat === "MDO") autoInvNo = autoInvNo.replace(/RF|MINING/g, "MDO");
      const poNum = selectedBa.noPO || selectedBa.poNumber || (code === "POS" ? "PO-POS-2026-001" : code === "BGG" ? "PO-BGG-2026-003" : `PO-${code}-2026-001`);

      setFormData((prev: any) => ({
        ...prev, baNoReference: selectedBa.baNumber, customerCode: code, projectSite, contractNo, workPeriod, invoiceNo: autoInvNo,
        noPO: poNum, poNumber: poNum,
        activityGroup: (code === "POS" && cat === "MDO") ? "MINE DEVELOPMENT OPERATION (MDO)" : (selectedBa.activityGroup || "OPERATION & MINING"),
        invoiceCategory: cat, bankName: cInfo?.bankName || prev.bankName || "Bank BNI",
        bankAccountNo: cInfo?.bankAccountNo || prev.bankAccountNo || "8188788882",
        bankBranch: cInfo?.bankBranch || prev.bankBranch || "Harmoni, Jakarta",
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
    const period = ba.workPeriod || "Jul-26";
    const cust = customerRows.find((c: any) => c.code === code);
    const cInfo = customerContractMap[code];
    let autoInvNo = generateInvoiceNumber(code, period, invoiceRows.length);
    if (code === "POS" && category === "MDO") autoInvNo = autoInvNo.replace(/RF|MINING/g, "MDO");
    const projectSite = cust?.fullName ? `${cust.fullName} Site` : ba.projectSite || cInfo?.project || `${code} PROJECT`;
    const contractNo = cust?.contractNo || ba.contractNo || cInfo?.contract || `002/${code}-AAP/2025`;
    const poNum = ba.noPO || ba.poNumber || (code === "POS" ? "PO-POS-2026-001" : code === "BGG" ? "PO-BGG-2026-003" : `PO-${code}-2026-001`);

    setEditItem(null);
    setFormData({
      baID: ba.id, customerCode: code, workPeriod: period, invoiceNo: autoInvNo, baNoReference: ba.baNumber,
      noPO: poNum, poNumber: poNum, status: "Draft",
      activityGroup: (code === "POS" && category === "MDO") ? "MINE DEVELOPMENT OPERATION (MDO)" : "OPERATION & MINING",
      invoiceCategory: category, projectSite, contractNo,
      bankName: cInfo?.bankName || "Bank BNI", bankAccountNo: cInfo?.bankAccountNo || "8188788882",
      bankBranch: cInfo?.bankBranch || "Harmoni, Jakarta", directorName: cInfo?.directorName || "GAHARI CHRISTINE",
      directorTitle: cInfo?.directorTitle || "DIRECTOR",
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
      if (!bggDataInit && (cust === "BGG" || cust === "PT BGG")) {
        const matched = (raiseFallMasters || []).find((r: any) => {
          const rCust = (r.customerCode || "").trim().toUpperCase();
          return (rCust === "BGG" || !rCust) && matchPeriod(r.period, defaultPeriod);
        });
        if (matched) {
          const p1F = Number(matched.bggFuelP1 ?? 0);
          const p1T = Number(matched.bggTransportP1 ?? 0);
          const p2F = Number(matched.bggFuelP2 ?? 0);
          const p2T = Number(matched.bggTransportP2 ?? 0);
          const tot1 = p1F + p1T;
          const tot2 = p2F + p2T;
          const avg = Number(matched.actualFuelFn || ((tot1 > 0 && tot2 > 0) ? (tot1 + tot2) / 2 : (tot1 || tot2 || 0)));
          const rf = Number(matched.rfIndexResult || (avg > 0 ? 0.60 + 0.40 * (avg / 9000) : 0));
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
      } else if (!posDataInit && (cust === "POS" || cust === "PT POSITION" || cust === "PT. POSITION" || cust === "PT POS")) {
        const matched = (raiseFallMasters || []).find((r: any) => {
          const rCust = (r.customerCode || "").trim().toUpperCase();
          return rCust.includes("POS") && matchPeriod(r.period, defaultPeriod);
        });
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
        const { rfIndex: rf } = calculateTripleFactorRF(fn, ln, xn);
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
      if (!ptroDataInit && (cust === "PTRO" || cust === "PT Petrosea" || cust === "DBK")) {
        const matched = (raiseFallMasters || []).find((r: any) => {
          const rCust = (r.customerCode || "").trim().toUpperCase();
          return (rCust.includes("PTRO") || rCust.includes("DBK")) && matchPeriod(r.period, defaultPeriod);
        });
        const currentM = Number(matched?.actualMRateXn || latestKursBI || mRate || 0);
        ptroDataInit = {
          actualMRate: currentM,
          obRateUSD: 1.490,
          cgRateUSD: 0.840,
          odObRateUSD: 0.028,
          odCgRateIDR: 230,
          fuelPeriods: {
            [defaultPeriod]: {
              actualMRate: currentM,
              obRateUSD: 1.490,
              cgRateUSD: 0.840,
              odObRateUSD: 0.028,
              odCgRateIDR: 230,
            }
          }
        };
      }

      let sbsDataInit = initialData.sbsData;
      if (!sbsDataInit && cust === "SBS") {
        sbsDataInit = {
          dendaMA: 191073864,
          dendaBBMLoader: 0,
          dendaBBMHauler: 520428670,
          dendaVolume: 60674886,
          fuelPeriods: {
            [defaultPeriod]: {
              dendaMA: 191073864,
              dendaBBMLoader: 0,
              dendaBBMHauler: 520428670,
              dendaVolume: 60674886,
            }
          }
        };
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
      const defaultCust = initialData?.customerCode || "BGG";
      const r1 = defaultCust === "SBS" ? 27250 : 7467;
      const r2 = defaultCust === "SBS" ? 26500 : 7261;
      setFormData({
        customerCode: defaultCust, workPeriod: initialData?.workPeriod || curMonth, sourcePeriod: initialData?.sourcePeriod || curMonth,
        sourceBARef: initialData?.sourceBARef || "-", originalOBVolume: 0, absorbedVolume: 0, remainingVolume: 0,
        ob1Rate: r1, ob2Rate: r2, workAmount: 0, picAAP: "Surveyor Site", notes: "", ...initialData,
      });
    } else if (type === "invoice") {
      const userSiteCode = (user?.companyCode && user.companyCode !== "HO") ? user.companyCode : "";
      const defaultCompany = initialData?.customerCode || userSiteCode || "POS";
      const defaultPeriod = initialData?.workPeriod || "Juni 2026";
      const autoInvNo = generateInvoiceNumber(defaultCompany, defaultPeriod, invoiceRows.length);
      const cInfo = customerContractMap[defaultCompany];
      const defaultSites: Record<string, string> = { BGG: "PT Budi Gema Gempita Site", POS: "POS PROJECT", IBP: "PT Indo Bhumi Pasifik Site", BBA: "PT Bara Batubara Aditama Site", SBS: "SBS - Tanjung Enim", PTRO: "PT Petrosea Site" };
      const defaultContracts: Record<string, string> = { BGG: "09/BGG-AAP/VIII/2018", POS: "002/POS-AAP/2025", IBP: "001/IBP-AAP/2026", BBA: "001/BBA-AAP/2026", SBS: "230/AAP-SBS/EXT/XII/24", PTRO: "001/PTRO-AAP/2024" };
      setFormData({
        customerCode: defaultCompany, workPeriod: defaultPeriod, invoiceNo: autoInvNo,
        activityGroup: initialData?.activityGroup || "OPERATION & MINING",
        projectSite: initialData?.projectSite || cInfo?.project || defaultSites[defaultCompany] || "POS PROJECT",
        contractNo: initialData?.contractNo || cInfo?.contract || defaultContracts[defaultCompany] || "002/POS-AAP/2025",
        noPO: initialData?.noPO || (defaultCompany === "SBS" ? "SPPH-05852" : `PO-${defaultCompany}-2026-001`),
        bankName: cInfo?.bankName || (defaultCompany === "BGG" ? "Bank Mandiri" : (defaultCompany === "PTRO" || defaultCompany === "SBS") ? "Bank BRI" : "Bank BNI"),
        bankAccountNo: cInfo?.bankAccountNo || (defaultCompany === "BGG" ? "070-00-2888000-8" : (defaultCompany === "PTRO" || defaultCompany === "SBS") ? "0417-01-880088-30-8" : "8188788882"),
        bankBranch: cInfo?.bankBranch || (defaultCompany === "BGG" ? "Plaza Mandiri Jakarta" : (defaultCompany === "PTRO" || defaultCompany === "SBS") ? "S. Parman - Slipi Jakarta" : "Harmoni, Jakarta"),
        directorName: cInfo?.directorName || "GAHARI CHRISTINE",
        directorTitle: cInfo?.directorTitle || (defaultCompany === "SBS" ? "DIREKTUR UTAMA" : "DIRECTOR"),
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
      const r1 = item.ob1Rate ?? (item.customerCode === "SBS" ? 27250 : 7467);
      const r2 = item.ob2Rate ?? (item.customerCode === "SBS" ? 26500 : 7261);
      const vol = item.originalOBVolume ?? 0;
      setFormData({
        ...item, customerCode: item.customerCode || "BGG", workPeriod: item.sourcePeriod || "Agustus 2026",
        sourcePeriod: item.sourcePeriod || "Agustus 2026", sourceBARef: item.sourceBaRef || item.sourceBARef || "-",
        originalOBVolume: vol, absorbedVolume: item.absorbedVolume ?? 0, remainingVolume: item.remainingVolume ?? vol,
        ob1Rate: r1, ob2Rate: r2, workAmount: Math.round(vol * (r1 * 0.75 + r2 * 0.25)), status: item.status || "Active", notes: item.notes || ""
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
