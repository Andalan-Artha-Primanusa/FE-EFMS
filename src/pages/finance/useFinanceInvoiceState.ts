import { useState } from "react";
import { api, generateInvoiceFromBA, verifyInvoice, approveInvoice, generateJournalFromInvoice } from "../../lib/api";

interface UseFinanceInvoiceStateProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  blankPOSItems: any[];
  demoPOSItems: any[];
  blankBGGItems: any[];
  demoBGGItems: any[];
  blankPTROItems: any[];
  demoPTROItems: any[];
  blankSBSItems: any[];
  demoSBSItems: any[];
  masterVariableOptions: any[];
  latestKursBI: number;
  mRate: number;
  onNotice: (msg: string) => void;
  loadData: () => Promise<void>;
  detailViewItem: any;
  setDetailViewItem: (item: any) => void;
  getSowMasterRate: (cust: string, name: string, fb: number, isUSD?: boolean) => number;
  actionLoadingKey?: string | null;
  setActionLoadingKey?: (key: string | null) => void;
  setInvoiceRows?: (rows: any[] | ((prev: any[]) => any[])) => void;
  setBaRows?: (rows: any[] | ((prev: any[]) => any[])) => void;
}

export function useFinanceInvoiceState({
  formData,
  setFormData,
  blankPOSItems,
  demoPOSItems,
  blankBGGItems,
  demoBGGItems,
  blankPTROItems,
  demoPTROItems,
  blankSBSItems,
  demoSBSItems,
  masterVariableOptions,
  latestKursBI,
  mRate,
  onNotice,
  loadData,
  detailViewItem,
  setDetailViewItem,
  getSowMasterRate,
  actionLoadingKey,
  setActionLoadingKey,
  setInvoiceRows,
  setBaRows
}: UseFinanceInvoiceStateProps) {
  const [posInvoiceCategory, setPosInvoiceCategory] = useState<"Operation & Mining" | "MDO">("Operation & Mining");
  const [invLineItems, setInvLineItems] = useState<any[]>(blankPOSItems);

  const [selectedVarA, setSelectedVarA] = useState("");
  const [selectedVarB, setSelectedVarB] = useState("");
  const [selectedVarC, setSelectedVarC] = useState("");
  const [selectedVarD, setSelectedVarD] = useState("");
  const [selectedVarE, setSelectedVarE] = useState("");
  const [selectedVarF, setSelectedVarF] = useState("");
  const [selectedVarP, setSelectedVarP] = useState("");

  const addVariableToSection = (section: string, code: string) => {
    if (!code) return;
    const opt = masterVariableOptions.find(o => o.code === code);
    if (!opt) return;

    const newItem = {
      id: `SOW_${Date.now()}`,
      section,
      code: opt.code,
      description: `${section}.${invLineItems.filter(i => i.section === section).length + 1} ${opt.name}`,
      volume: 0,
      unit: opt.unit,
      baseRateUSD: opt.baseRateUSD,
      unitRateIDR: opt.rateIDR || Math.round((opt.baseRateUSD || 1) * mRate),
      overhaulMtr: opt.overhaulMtr || 1000,
      type: section === "D" && opt.code.includes("OVERHAUL") ? "overhaul" : section === "D" && opt.code.includes("CLEARING") ? "land_clearing" : "production"
    };

    setInvLineItems(prev => [...prev, newItem]);
    if (section === "A") setSelectedVarA("");
    if (section === "B") setSelectedVarB("");
    if (section === "C") setSelectedVarC("");
    if (section === "D") setSelectedVarD("");
    if (section === "E") setSelectedVarE("");
    if (section === "F") setSelectedVarF("");
    if (section === "P") setSelectedVarP("");
  };

  const loadDemoPOSData = () => {
    setFormData((prev: any) => ({
      ...prev,
      customerCode: "POS",
      invoiceNo: "003/POS-AAP/RF/VI/2026",
      workPeriod: "Juni 2026",
      projectSite: "POS PROJECT",
      contractNo: "002/POS-AAP/2025",
      bankName: "Bank BNI",
      bankAccountNo: "8188788882",
      bankBranch: "Harmoni, Jakarta",
      directorName: "GAHARI CHRISTINE",
      directorTitle: "DIRECTOR"
    }));
    setInvLineItems(demoPOSItems);
    onNotice("Template preset POS Mining (Juni 2026) berhasil dimuat.");
  };

  const loadDemoBGGData = () => {
    setFormData((prev: any) => ({
      ...prev,
      customerCode: "BGG",
      invoiceNo: "091/BGG-AAP/VI/2026",
      workPeriod: "1-30 JUN 26",
      projectSite: "BGG MINING PROJECT",
      contractNo: "001/BGG-AAP/2025",
      bankName: "Bank Mandiri",
      bankAccountNo: "070-00-2888000-8",
      bankBranch: "Plaza Mandiri Jakarta",
      directorName: "GAHARI CHRISTINE",
      directorTitle: "DIRECTOR"
    }));
    setInvLineItems(demoBGGItems);
    onNotice("Template preset BGG Mining (Juni 2026) berhasil dimuat.");
  };

  const loadDemoPTROData = () => {
    setFormData((prev: any) => ({
      ...prev,
      customerCode: "PTRO",
      invoiceNo: "013/AAP-PTRO/VI/2026",
      workPeriod: "01 - 30 JUNI 2026",
      projectSite: "PT Petrosea Site",
      contractNo: "001/PTRO-AAP/2024",
      bankName: "Bank BRI",
      bankAccountNo: "0417-01-880088-30-8",
      bankBranch: "S. Parman - Slipi Jakarta",
      directorName: "GAHARI CHRISTINE",
      directorTitle: "DIRECTOR"
    }));
    if (demoPTROItems.length > 0) {
      setInvLineItems(demoPTROItems);
    } else {
      const kurs = latestKursBI;
      const obRate = getSowMasterRate("PTRO", "OVER BURDEN REMOVAL", 1.49, true);
      const cgRate = getSowMasterRate("PTRO", "COAL GETTING", 0.84, true);
      const odObRate = getSowMasterRate("PTRO", "Overhaul OB", 0.028, true);
      const odCgRate = getSowMasterRate("PTRO", "Overhaul Coal Getting", 230, false);
      setInvLineItems([
        { id: "ptro_inv_a1", section: "A", description: "OVER BURDEN REMOVAL", unit: "Bcm", volume: 259165.259, unitRateUSD: obRate, kursBI: kurs },
        { id: "ptro_inv_b1", section: "B", description: "COAL GETTING", unit: "Ton", volume: 19456.32, unitRateUSD: cgRate, kursBI: kurs },
        { id: "ptro_inv_c1", section: "C", subSection: "C1. Over Distance For OB Removal", unit: "Bcm", volume: 259165.259, overhaulMtr: 1012.92, baseMtr: 1000, unitRateUSD: odObRate, kursBI: kurs },
        { id: "ptro_inv_c2", section: "C", subSection: "C2. Over Distance For Coal Winning", unit: "Ton", volume: 34025.212, overhaulMtr: 3174.88, baseMtr: 3000, unitRateIDR: odCgRate },
      ]);
    }
    onNotice("Template preset Petrosea (PTRO Juni 2026) berhasil dimuat — rate & kurs dari master data.");
  };

  const loadDemoDBKData = loadDemoPTROData;

  const loadDemoSBSData = () => {
    setFormData((prev: any) => ({
      ...prev,
      customerCode: "SBS",
      invoiceNo: "019/SBS-AAP/VI/2026",
      workPeriod: "01 - 30 JUNI 2026",
      projectSite: "SBS - Tanjung Enim",
      contractNo: "SPPH-05852",
      noPO: "I05790/0002",
      bankName: "Bank BRI",
      bankAccountNo: "0417-01-880088-30-8",
      bankBranch: "S. Parman - Slipi Jakarta",
      directorName: "GAHARI CHRISTINE",
      directorTitle: "DIREKTUR UTAMA"
    }));
    const itemsWithDist = demoSBSItems.map((item: any) => {
      if (item.section === "A" && !item.distanceM) {
        if (item.unitRateIDR === 22654) return { ...item, distanceM: 3100, overhaulMtr: 3100 };
        if (item.unitRateIDR === 12638) return { ...item, distanceM: 1350, overhaulMtr: 1350 };
        if (item.unitRateIDR === 8346) return { ...item, distanceM: 600, overhaulMtr: 600 };
        if (item.unitRateIDR === 15500) return { ...item, distanceM: 1850, overhaulMtr: 1850 };
        if (item.unitRateIDR === 16931) return { ...item, distanceM: 2150, overhaulMtr: 2150 };
        if (item.unitRateIDR === 19375) return { ...item, distanceM: 2450, overhaulMtr: 2450 };
      }
      return item;
    });
    setInvLineItems(itemsWithDist);
    onNotice("Template preset SBS Mining berhasil dimuat.");
  };

  const removeInvLineItem = (idToRemove: string) => {
    setInvLineItems(prev => prev.filter(item => item.id !== idToRemove));
  };

  const updateInvItemVolume = (id: string, vol: number) => {
    setInvLineItems(prev => prev.map(item => item.id === id ? { ...item, volume: vol } : item));
  };

  const updateInvItemOverhaul = (id: string, mtr: number) => {
    setInvLineItems(prev => prev.map(item => item.id === id ? { ...item, overhaulMtr: mtr } : item));
  };

  const updateInvItemRateIDR = (id: string, rate: number) => {
    setInvLineItems(prev => prev.map(item => item.id === id ? { ...item, unitRateIDR: rate } : item));
  };

  const updateInvItemRateUSD = (id: string, rate: number) => {
    setInvLineItems(prev => prev.map(item => item.id === id ? { ...item, unitRateUSD: rate } : item));
  };

  const updateInvItemKurs = (id: string, kurs: number) => {
    setInvLineItems(prev => prev.map(item => item.id === id ? { ...item, kursBI: kurs } : item));
  };

  const updateInvItemAmount = (id: string, amt: number) => {
    setInvLineItems(prev => prev.map(item => item.id === id ? { ...item, amount: amt } : item));
  };

  const addInvLineItem = (section: string = "A") => {
    const cust = (formData.customerCode || "POS").toUpperCase();
    const isUSD = cust === "POS" || cust === "PTRO" || cust === "DBK";
    const isSBS = cust === "SBS";
    const desc = isSBS
      ? (section === "B" ? "Alat Berat Tambahan (Jasa Penunjang)" : section === "P" ? "Pengurang Pembayaran Tambahan" : "Area Kerja OB Tambahan")
      : "Pekerjaan / Item Tambahan";
    const unit = isSBS
      ? (section === "B" ? "Hours" : section === "P" ? "Lot" : "BCM")
      : "Bcm";
    const newItem = {
      id: `custom_inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      section,
      description: desc,
      unit,
      volume: 0,
      unitRateUSD: isUSD ? 0 : undefined,
      unitRateIDR: isUSD ? undefined : 0,
      kursBI: latestKursBI || mRate || 17923.30,
      amount: 0,
      isCustom: true
    };
    setInvLineItems(prev => [...prev, newItem]);
  };

  const updateInvItemField = (id: string, field: string, val: any) => {
    setInvLineItems(prev => prev.map(item => item.id === id ? { ...item, [field]: val } : item));
  };

  const reorderInvLineItems = (startIndex: number, endIndex: number) => {
    setInvLineItems(prev => {
      if (startIndex < 0 || startIndex >= prev.length || endIndex < 0 || endIndex >= prev.length) return prev;
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  };

  const moveInvRow = (id: string, dir: "up" | "down") => {
    setInvLineItems(prev => {
      const idx = prev.findIndex(item => item.id === id);
      if (idx === -1) return prev;
      const targetIdx = dir === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const result = Array.from(prev);
      const [removed] = result.splice(idx, 1);
      result.splice(targetIdx, 0, removed);
      return result;
    });
  };

  const handleGenerateInvoiceFromBA = async (baId: number) => {
    const key = `generate-inv-${baId}`;
    if (setActionLoadingKey) setActionLoadingKey(key);
    onNotice("⏳ Sedang menerbitkan draft invoice dari Berita Acara...");
    try {
      const newInv: any = await generateInvoiceFromBA(baId);
      onNotice(`✅ Berhasil membuat Draft Mining Invoice No. ${newInv?.invoiceNo || "091/BGG-AAP/VI/2026"} dari Berita Acara.`);
      if (setInvoiceRows && newInv) {
        setInvoiceRows((prev) => [newInv, ...prev.filter((i) => i.id !== newInv.id)]);
      }
      if (setBaRows && newInv) {
        setBaRows((prev) => prev.map((b) => b.id === baId ? { ...b, statusBA: "Arsip (Ditautkan Invoice)", invoiceNoLinked: newInv.invoiceNo, invoiceID: newInv.id } : b));
      }
      await loadData();
    } catch (err: any) {
      onNotice(`Gagal membuat invoice: ${err?.message || err}`);
    } finally {
      if (setActionLoadingKey) setActionLoadingKey(null);
    }
  };

  const handleVerifyInvoice = async (id: number) => {
    const key = `verify-inv-${id}`;
    if (setActionLoadingKey) setActionLoadingKey(key);
    onNotice("⏳ Sedang memverifikasi invoice...");
    try {
      const updated: any = await verifyInvoice(id, "verify", "Verifikasi rincian Invoice oleh Finance Specialist");
      onNotice("✅ Invoice berhasil diverifikasi oleh Finance Specialist. Menunggu Approval Manager FATB.");
      if (setInvoiceRows) {
        setInvoiceRows((prev) => prev.map((i) => i.id === id ? { ...i, ...(updated || {}), status: updated?.status || "Verified (Review HO)" } : i));
      }
      if (detailViewItem && detailViewItem.type === "invoice" && (detailViewItem.data?.id === id || detailViewItem.id === id)) {
        setDetailViewItem({ type: "invoice", data: { ...(detailViewItem.data || detailViewItem), ...(updated || {}), status: updated?.status || "Verified (Review HO)" } });
      }
      await loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal memverifikasi Invoice");
    } finally {
      if (setActionLoadingKey) setActionLoadingKey(null);
    }
  };

  const handleApproveInvoice = async (id: number) => {
    const key = `approve-inv-${id}`;
    if (setActionLoadingKey) setActionLoadingKey(key);
    onNotice("⏳ Sedang memproses persetujuan invoice & penerbitan jurnal piutang...");
    try {
      const updated: any = await approveInvoice(id, "approve", "Persetujuan Invoice oleh Manager FATB");
      try {
        await generateJournalFromInvoice(id);
      } catch (jErr: any) {
        console.warn("Auto-journal info/warning:", jErr);
      }
      onNotice("✅ Invoice berhasil disetujui oleh Manager FATB. Status: Disetujui & Jurnal Piutang AR Terbit.");
      if (setInvoiceRows) {
        setInvoiceRows((prev) => prev.map((i) => i.id === id ? { ...i, ...(updated || {}), status: updated?.status || "Unpaid" } : i));
      }
      if (detailViewItem && detailViewItem.type === "invoice" && (detailViewItem.data?.id === id || detailViewItem.id === id)) {
        setDetailViewItem({ type: "invoice", data: { ...(detailViewItem.data || detailViewItem), ...(updated || {}), status: updated?.status || "Unpaid" } });
      }
      await loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal menyetujui Invoice");
    } finally {
      if (setActionLoadingKey) setActionLoadingKey(null);
    }
  };

  const handleApproveInvoiceTier1 = async (id: number) => handleApproveInvoice(id);
  const handleApproveInvoiceTier2 = async (id: number) => handleApproveInvoice(id);

  return {
    posInvoiceCategory, setPosInvoiceCategory,
    invLineItems, setInvLineItems,
    selectedVarA, setSelectedVarA,
    selectedVarB, setSelectedVarB,
    selectedVarC, setSelectedVarC,
    selectedVarD, setSelectedVarD,
    selectedVarE, setSelectedVarE,
    selectedVarF, setSelectedVarF,
    selectedVarP, setSelectedVarP,
    addVariableToSection,
    loadDemoPOSData, loadDemoBGGData, loadDemoPTROData, loadDemoDBKData, loadDemoSBSData,
    removeInvLineItem, updateInvItemVolume, updateInvItemOverhaul,
    updateInvItemRateIDR, updateInvItemRateUSD, updateInvItemKurs, updateInvItemAmount,
    addInvLineItem, updateInvItemField, reorderInvLineItems, moveInvRow,
    handleGenerateInvoiceFromBA, handleVerifyInvoice, handleApproveInvoice,
    handleApproveInvoiceTier1, handleApproveInvoiceTier2
  };
}
