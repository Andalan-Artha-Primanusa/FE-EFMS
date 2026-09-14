import React from "react";
import { api, saveSBSPenalty, deleteSBSPenalty, SBSPenaltyItem, generateJournalFromPayment } from "../../lib/api";
import { getBAEffectiveVolume, getBAItemSubtotal, calculateBACommercialBreakdown } from "./ba_calculations";

interface UseFinanceSaveHandlersProps {
  isSaving: boolean;
  setIsSaving: (val: boolean) => void;
  modalType: string;
  setModalType: (val: any) => void;
  formData: any;
  editItem: any;
  setEditItem: (val: any) => void;
  baOperatingItems: any[];
  baMDOItems: any[];
  baDeductionItems: any[];
  invLineItems: any[];
  baRows: any[];
  setBaRows?: (rows: any[] | ((prev: any[]) => any[])) => void;
  loadData: (showLoading?: boolean) => Promise<void>;
  reloadMasterData?: () => Promise<void>;
  onNotice: (msg: string) => void;
  setShowPendingVolumeDrawer: (val: boolean) => void;
  totalGrossCalc: number;
  dpp11_12Calc: number;
  vat12Calc: number;
  pph23Calc: number;
  netTotalInvoiceCalc: number;
  calcs: any;
  rfIndexCalculated: number;
  detailViewItem: any;
  setDetailViewItem: (val: any) => void;
  partialPaymentForm: any;
  setPartialPaymentForm: (val: any) => void;
  setShowAddPartialPayment: (val: boolean) => void;
  setInvoiceRows: (rows: any[] | ((prev: any[]) => any[])) => void;
  setPaymentRows: (rows: any[] | ((prev: any[]) => any[])) => void;
  setCustomerRows?: (rows: any[] | ((prev: any[]) => any[])) => void;
  setPendingVolumeLedgers?: (rows: any[] | ((prev: any[]) => any[])) => void;
  setSbsPenalties?: (rows: SBSPenaltyItem[] | ((prev: SBSPenaltyItem[]) => SBSPenaltyItem[])) => void;
  setSbsPenaltyModalOpen: (val: boolean) => void;
  setSbsPenaltyEditItem: (val: any) => void;
  deletingKey?: string | null;
  setDeletingKey?: (key: string | null) => void;
  actionLoadingKey?: string | null;
  setActionLoadingKey?: (key: string | null) => void;
}

export function useFinanceSaveHandlers({
  isSaving,
  setIsSaving,
  modalType,
  setModalType,
  formData,
  editItem,
  setEditItem,
  baOperatingItems,
  baMDOItems,
  baDeductionItems,
  invLineItems,
  baRows,
  setBaRows,
  loadData,
  reloadMasterData,
  onNotice,
  setShowPendingVolumeDrawer,
  totalGrossCalc,
  dpp11_12Calc,
  vat12Calc,
  pph23Calc,
  netTotalInvoiceCalc,
  calcs,
  rfIndexCalculated,
  detailViewItem,
  setDetailViewItem,
  partialPaymentForm,
  setPartialPaymentForm,
  setShowAddPartialPayment,
  setInvoiceRows,
  setPaymentRows,
  setCustomerRows,
  setPendingVolumeLedgers,
  setSbsPenalties,
  setSbsPenaltyModalOpen,
  setSbsPenaltyEditItem,
  deletingKey,
  setDeletingKey,
  actionLoadingKey,
  setActionLoadingKey
}: UseFinanceSaveHandlersProps) {
  const handleSavePartialPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailViewItem || detailViewItem.type !== "invoice") return;
    const amount = parseFloat(partialPaymentForm.amountPaid);
    if (!amount || amount <= 0) { onNotice("Nominal pembayaran harus lebih besar dari 0"); return; }
    try {
      await api("/api/finance/payments", {
        method: "POST",
        body: JSON.stringify({
          invoiceNo: detailViewItem.data.invoiceNo, customerCode: detailViewItem.data.customerCode, amountPaid: amount,
          paymentDate: partialPaymentForm.paymentDate ? new Date(partialPaymentForm.paymentDate).toISOString() : new Date().toISOString(),
          receivingBank: partialPaymentForm.receivingBank || "Bank Mandiri Escrow", refNo: partialPaymentForm.refNo || "-",
          notes: partialPaymentForm.notes || "Cicilan Klien", verificationStatus: "Pending", createdBy: "AR Treasury Dept"
        })
      });
      onNotice("Pembayaran cicilan berhasil dicatat (Menunggu Verifikasi).");
      setShowAddPartialPayment(false);
      setPartialPaymentForm({ amountPaid: "", paymentDate: new Date().toISOString().split("T")[0], receivingBank: "Bank Mandiri Escrow", refNo: "", notes: "" });
      const [invRes, payRes] = await Promise.all([api<any[]>("/api/finance/invoices"), api<any[]>("/api/finance/payments")]);
      setInvoiceRows(Array.isArray(invRes) ? invRes : []);
      setPaymentRows(Array.isArray(payRes) ? payRes : []);
      const updatedInv = Array.isArray(invRes) ? invRes.find((i: any) => i.invoiceNo === detailViewItem.data.invoiceNo) : null;
      if (updatedInv) setDetailViewItem({ type: "invoice", data: updatedInv });
    } catch (err: any) { onNotice(err?.message || "Gagal mencatat cicilan"); }
  };

  const handleVerifyPartialPayment = async (paymentId: number) => {
    try {
      await api(`/api/finance/payments/${paymentId}/verify`, { method: "PUT", body: JSON.stringify({ verifiedBy: "Hendra Wijaya (Finance Specialist)" }) });
      try { await generateJournalFromPayment(paymentId); } catch (e: any) { console.error("Gagal journal payment", e); }
      onNotice("Pembayaran cicilan berhasil diverifikasi.");
      const [invRes, payRes] = await Promise.all([api<any[]>("/api/finance/invoices"), api<any[]>("/api/finance/payments")]);
      setInvoiceRows(Array.isArray(invRes) ? invRes : []);
      setPaymentRows(Array.isArray(payRes) ? payRes : []);
      if (detailViewItem?.type === "invoice") {
        const updatedInv = Array.isArray(invRes) ? invRes.find((i: any) => i.invoiceNo === detailViewItem.data.invoiceNo) : null;
        if (updatedInv) setDetailViewItem({ type: "invoice", data: updatedInv });
      }
    } catch (err: any) { onNotice(err?.message || "Gagal memverifikasi cicilan"); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      let endpoint = "";
      let payload: any = { ...formData };
      if (modalType === "ba") {
        endpoint = "/api/finance/ba-trackers";
        const isBGG = formData.customerCode === "BGG" || formData.customerCode === "PT BGG";
        const isPOS = formData.customerCode === "POS" || formData.customerCode === "PT POSITION" || formData.customerCode === "PT POS";
        const isPTRO = formData.customerCode === "PTRO" || formData.customerCode === "DBK" || formData.customerCode === "PT Petrosea";
        const isSBS = formData.customerCode === "SBS";
        const isCustomerDBK = isPTRO || formData.customerCode === "DBK";
        const allRawItems = [...baOperatingItems, ...baMDOItems, ...baDeductionItems];
        const allItems = allRawItems.map((it) => {
          const initVol = getBAEffectiveVolume(it, allRawItems, false);
          const adjVol = getBAEffectiveVolume(it, allRawItems, true);
          return {
            ...it,
            subtotalInitial: getBAItemSubtotal(it, initVol, isCustomerDBK, formData.customerCode),
            subtotalAdjusted: getBAItemSubtotal(it, adjVol, isCustomerDBK, formData.customerCode),
          };
        });
        const initSum = allItems.reduce((acc, item) => acc + Number(item.subtotalInitial || 0), 0);
        const adjSum = allItems.reduce((acc, item) => acc + Number(item.subtotalAdjusted || 0), 0);
        const hasAdjusted = allItems.some((it) => !it.isDeduction && it.category !== "DP Fuel" && Number(it.adjustedVolume || 0) > 0);
        const activeFuelPeriods = formData.bggData?.fuelPeriods || formData.posData?.fuelPeriods || formData.ptroData?.fuelPeriods || formData.sbsData?.fuelPeriods;
        const breakdownInit = calculateBACommercialBreakdown(formData.customerCode, allItems, rfIndexCalculated, isCustomerDBK, false, activeFuelPeriods);
        const breakdownAdj = calculateBACommercialBreakdown(formData.customerCode, allItems, rfIndexCalculated, isCustomerDBK, true, activeFuelPeriods);
        const finalInitialWorkAmount = breakdownInit.totalGross > 0 ? breakdownInit.totalGross : initSum;
        const finalAdjustedWorkAmount = breakdownAdj.totalGross > 0 ? breakdownAdj.totalGross : adjSum;
        const finalWorkAmount = (hasAdjusted && finalAdjustedWorkAmount > 0) ? finalAdjustedWorkAmount : (finalInitialWorkAmount > 0 ? finalInitialWorkAmount : Number(formData.workAmount || 0));

        payload = {
          ...formData,
          customerCode: formData.customerCode || "",
          workPeriod: formData.workPeriod || "Juni 2026",
          picAAP: formData.picAAP || "Operations / Site Engineer",
          items: allItems,
          initialWorkAmount: finalInitialWorkAmount,
          adjustedWorkAmount: finalAdjustedWorkAmount,
          workAmount: finalWorkAmount,
          rfIndexCalculated: rfIndexCalculated || formData.rfIndexCalculated || 1.0,
          step1Locked: true,
          bggData: isBGG ? {
            ...(formData.bggData || {}),
            agreedSurveyVolume: Number(formData.bggTotalTerbongkar ?? formData.bggData?.agreedSurveyVolume ?? 0),
            coalVolumeBCM: Number(formData.bggCoalVolumeBCM ?? formData.bggData?.coalVolumeBCM ?? 0),
            coalVolumeTon: Number(formData.bggCoalVolumeTon ?? formData.bggData?.coalVolumeTon ?? 0),
            nettOBVolume: Number(formData.bggNettOB ?? formData.bggData?.nettOBVolume ?? 0),
            obOverDistanceHm: Number(formData.bggOBDistanceHm ?? formData.bggData?.obOverDistanceHm ?? 0),
          } : formData.bggData,
          posData: isPOS ? { ...(formData.posData || {}) } : formData.posData,
          ptroData: isPTRO ? { ...(formData.ptroData || {}) } : formData.ptroData,
          sbsData: isSBS ? { ...(formData.sbsData || {}) } : formData.sbsData,
        };
      } else if (modalType === "pending_volume") {
        endpoint = "/api/finance/pending-volumes";
        const vol = Number(formData.originalOBVolume || 0);
        if (vol <= 0) { onNotice("Volume Saldo Pending wajib diisi > 0"); setIsSaving(false); return; }
        const r1 = Number(formData.ob1Rate || (formData.customerCode === "SBS" ? 27250 : 7467));
        const r2 = Number(formData.ob2Rate || (formData.customerCode === "SBS" ? 26500 : 7261));
        const rem = formData.remainingVolume !== undefined ? Number(formData.remainingVolume) : vol;
        payload = {
          customerCode: formData.customerCode || "BGG", sourcePeriod: formData.sourcePeriod || formData.workPeriod || "Agustus 2026",
          sourceBARef: formData.sourceBARef || "-", originalOBVolume: vol, absorbedVolume: Number(formData.absorbedVolume || 0),
          remainingVolume: rem, ob1Rate: r1, ob2Rate: r2,
          status: rem <= 0 ? "Settled" : (Number(formData.absorbedVolume || 0) > 0 ? "Partially Settled" : "Active"), notes: formData.notes || ""
        };
      } else if (modalType === "invoice") {
        endpoint = "/api/finance/invoices";
        payload = {
          ...formData, status: formData.status || "Draft", items: invLineItems, lineItems: invLineItems,
          invoiceNo: formData.invoiceNo || "003/POS-AAP/RF/VI/2026", customerCode: formData.customerCode || "",
          projectSite: formData.projectSite || "POS PROJECT", contractNo: formData.contractNo || "002/POS-AAP/2025",
          workPeriod: formData.workPeriod || "Juni 2026", jobType: "Mining Production & Overhaul Billing", volumeUnit: "BCM",
          revenueGross: totalGrossCalc, subTotalDPP: dpp11_12Calc, ppn11: vat12Calc, pph23: pph23Calc, totalInvoice: netTotalInvoiceCalc,
          totalDibayar: (formData.customerCode === "SBS") ? calcs.totalDibayar : netTotalInvoiceCalc,
          invoiceDate: formData.invoiceDate ? new Date(formData.invoiceDate).toISOString() : new Date().toISOString(),
          notes: formData.customerCode === "SBS" ? "PAYMENT DETAIL (PPN & PPh Dikenakan Sebelum Pengurang Pembayaran)" : `PAYMENT DETAIL (RF Index: ${rfIndexCalculated.toFixed(3)})`
        };
      } else if (modalType === "payment") endpoint = "/api/finance/payments";
      else if (modalType === "customer") endpoint = "/api/finance/customers";

      const dateKeys = ["workEndDate", "baSubmittedDate", "baSentDate", "internalRoutingDate", "baSignedDate", "invoiceIssuedDate", "baDate", "invoiceDate", "paymentDate", "verifiedAt", "approvedAt", "dueDate", "taxReportedDate"];
      dateKeys.forEach((key) => {
        if (payload[key] && typeof payload[key] === "string" && payload[key].trim() !== "") {
          try { payload[key] = new Date(payload[key]).toISOString(); } catch { payload[key] = null; }
        } else if (payload[key] === "" || payload[key] === undefined) { payload[key] = null; }
      });

      let savedRes: any = null;
      if (editItem?.id) {
        endpoint += `/${editItem.id}`;
        savedRes = await api(endpoint, { method: "PUT", body: JSON.stringify(payload) });
        onNotice("Data berhasil diperbarui!");
      } else {
        savedRes = await api(endpoint, { method: "POST", body: JSON.stringify(payload) });
        onNotice("Data baru berhasil ditambahkan!");
      }

      // 🚀 Optimistic UI Update: perbarui/tambahkan langsung ke state lokal
      const effectiveId = savedRes?.id || editItem?.id || Date.now();
      const finalItem = savedRes || { id: effectiveId, ...payload };

      if (modalType === "ba" && setBaRows) {
        if (editItem?.id) {
          setBaRows((prev) => prev.map((r) => r.id === editItem.id ? { ...r, ...finalItem } : r));
        } else {
          setBaRows((prev) => [finalItem, ...prev]);
        }
      } else if (modalType === "invoice") {
        if (editItem?.id) {
          setInvoiceRows((prev) => prev.map((r) => r.id === editItem.id ? { ...r, ...finalItem } : r));
        } else {
          setInvoiceRows((prev) => [finalItem, ...prev]);
        }
      } else if (modalType === "payment") {
        if (editItem?.id) {
          setPaymentRows((prev) => prev.map((r) => r.id === editItem.id ? { ...r, ...finalItem } : r));
        } else {
          setPaymentRows((prev) => [finalItem, ...prev]);
        }
      } else if (modalType === "customer" && setCustomerRows) {
        if (editItem?.id) {
          setCustomerRows((prev) => prev.map((r) => r.id === editItem.id ? { ...r, ...finalItem } : r));
        } else {
          setCustomerRows((prev) => [finalItem, ...prev]);
        }
      } else if (modalType === "pending_volume" && setPendingVolumeLedgers) {
        if (editItem?.id) {
          setPendingVolumeLedgers((prev) => prev.map((r) => r.id === editItem.id ? { ...r, ...finalItem } : r));
        } else {
          setPendingVolumeLedgers((prev) => [finalItem, ...prev]);
        }
      }

      if (detailViewItem && (detailViewItem.data?.id === effectiveId || detailViewItem.id === effectiveId)) {
        setDetailViewItem({ ...detailViewItem, data: { ...(detailViewItem.data || detailViewItem), ...finalItem } });
      }

      if (modalType === "invoice" && payload.baNoReference) {
        const targetBA = baRows.find((r) => r.baNumber === payload.baNoReference);
        if (targetBA) {
          const linkedInvoiceId = finalItem.id || payload.id;
          if (setBaRows) {
            setBaRows((prev) => prev.map((b) => b.id === targetBA.id ? { ...b, statusBA: "Arsip", invoiceNoLinked: payload.invoiceNo, invoiceID: linkedInvoiceId } : b));
          }
          await api(`/api/finance/ba-trackers/${targetBA.id}`, { method: "PUT", body: JSON.stringify({ ...targetBA, statusBA: "Arsip", invoiceNoLinked: payload.invoiceNo, invoiceID: linkedInvoiceId }) });
        }
      }

      const savedModalType = modalType;
      setModalType("none");
      setEditItem(null);
      await loadData();
      if (reloadMasterData) await reloadMasterData();
      if (savedModalType === "pending_volume") setShowPendingVolumeDrawer(true);
    } catch (err: any) { onNotice(err?.message || "Gagal menyimpan data"); } finally { setIsSaving(false); }
  };

  const handleDelete = async (type: any, id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data ini?")) return;
    const key = `${type}-${id}`;
    if (setDeletingKey) setDeletingKey(key);
    onNotice("⏳ Sedang memproses penghapusan data...");

    // 🚀 Optimistic UI Update: hapus baris secara instan dari state
    if (type === "ba" && setBaRows) {
      setBaRows((prev) => prev.filter((r) => r.id !== id));
    } else if (type === "invoice" && setInvoiceRows) {
      setInvoiceRows((prev) => prev.filter((r) => r.id !== id));
    } else if (type === "payment" && setPaymentRows) {
      setPaymentRows((prev) => prev.filter((r) => r.id !== id));
    } else if (type === "customer" && setCustomerRows) {
      setCustomerRows((prev) => prev.filter((r) => r.id !== id));
    } else if (type === "pending_volume" && setPendingVolumeLedgers) {
      setPendingVolumeLedgers((prev) => prev.filter((r) => r.id !== id));
    }

    if (detailViewItem?.data?.id === id || detailViewItem?.id === id) {
      setDetailViewItem(null);
    }

    try {
      let endpoint = "";
      if (type === "ba") endpoint = `/api/finance/ba-trackers/${id}`;
      else if (type === "invoice") endpoint = `/api/finance/invoices/${id}`;
      else if (type === "payment") endpoint = `/api/finance/payments/${id}`;
      else if (type === "customer") endpoint = `/api/finance/customers/${id}`;
      else if (type === "pending_volume") endpoint = `/api/finance/pending-volumes/${id}`;
      await api(endpoint, { method: "DELETE" });
      onNotice("✅ Data berhasil dihapus!");
      await loadData();
    } catch (err: any) { 
      onNotice(err?.message || "Gagal menghapus data"); 
      await loadData();
    } finally {
      if (setDeletingKey) setDeletingKey(null);
    }
  };

  const handleSaveSBSPenalty = async (item: Partial<SBSPenaltyItem>) => {
    try {
      const saved: any = await saveSBSPenalty(item);
      onNotice("Catatan Klaim Penalti SBS berhasil disimpan.");
      setSbsPenaltyModalOpen(false);
      setSbsPenaltyEditItem(null);
      if (setSbsPenalties) {
        if (item.id) {
          setSbsPenalties((prev) => prev.map((p) => p.id === item.id ? (saved || { ...p, ...item }) : p));
        } else {
          setSbsPenalties((prev) => [saved || { id: Date.now(), ...item } as any, ...prev]);
        }
      }
      await loadData();
    } catch (err: any) { onNotice(err?.message || "Gagal menyimpan klaim penalti SBS"); }
  };

  const handleDeleteSBSPenalty = async (id: number) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus catatan klaim penalti SBS ini?")) return;
    const key = `sbs-penalty-${id}`;
    if (setDeletingKey) setDeletingKey(key);
    onNotice("⏳ Sedang memproses penghapusan catatan penalti...");

    // 🚀 Optimistic UI Update
    if (setSbsPenalties) {
      setSbsPenalties((prev) => prev.filter((r) => r.id !== id));
    }
    if (detailViewItem?.data?.id === id || detailViewItem?.id === id) {
      setDetailViewItem(null);
    }

    try {
      await deleteSBSPenalty(id);
      onNotice("✅ Catatan Klaim Penalti SBS berhasil dihapus.");
      await loadData();
    } catch (err: any) { 
      onNotice(err?.message || "Gagal menghapus klaim penalti SBS"); 
      await loadData();
    } finally {
      if (setDeletingKey) setDeletingKey(null);
    }
  };

  return {
    handleSave,
    handleDelete,
    handleSavePartialPayment,
    handleVerifyPartialPayment,
    handleSaveSBSPenalty,
    handleDeleteSBSPenalty
  };
}
