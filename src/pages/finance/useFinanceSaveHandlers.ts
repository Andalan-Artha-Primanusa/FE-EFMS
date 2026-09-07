import React from "react";
import { api, saveSBSPenalty, deleteSBSPenalty, SBSPenaltyItem, generateJournalFromPayment } from "../../lib/api";

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
  loadData: () => Promise<void>;
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
  setInvoiceRows: (rows: any[]) => void;
  setPaymentRows: (rows: any[]) => void;
  setSbsPenaltyModalOpen: (val: boolean) => void;
  setSbsPenaltyEditItem: (val: any) => void;
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
  loadData,
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
  setSbsPenaltyModalOpen,
  setSbsPenaltyEditItem
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
        const calculateItemSubtotal = (it: any, vol: number) => {
          const r = Number(it.rate || 0);
          if (it.category === "DP Fuel" || it.category === "Pengurang Biaya" || it.isDeduction || (it.material || "").toLowerCase().includes("dp fuel") || (it.material || "").toLowerCase().includes("denda") || (it.material || "").toLowerCase().includes("kelebihan pemakaian bbm")) {
            const amt = r !== 0 ? r : (it.subtotalInitial ? Number(it.subtotalInitial) : 0);
            return -Math.abs((vol > 0 ? vol : 1) === 1 ? amt : (vol > 0 ? vol : 1) * amt);
          }
          if (it.isDistanceVar || it.category === "Over Distance" || it.material?.toLowerCase().includes("distance") || it.material?.toLowerCase().includes("overhaul")) {
            const dist = Number(it.distanceWeightAvg ?? 1000);
            return Math.round(vol * ((dist - 1000) / 1000) * r);
          }
          return Math.round(vol * r);
        };
        const allItems = [...baOperatingItems, ...baMDOItems, ...baDeductionItems].map((it) => ({
          ...it,
          subtotalInitial: calculateItemSubtotal(it, Number(it.initialVolume || 0)),
          subtotalAdjusted: calculateItemSubtotal(it, Number(it.adjustedVolume ?? it.initialVolume ?? 0)),
        }));
        const initSum = allItems.reduce((acc, item) => acc + Number(item.subtotalInitial || 0), 0);
        const adjSum = allItems.reduce((acc, item) => acc + Number(item.subtotalAdjusted || 0), 0);
        payload = {
          ...formData, customerCode: formData.customerCode || "", workPeriod: formData.workPeriod || "Juni 2026",
          picAAP: formData.picAAP || "Operations / Site Engineer", items: allItems, initialWorkAmount: initSum,
          adjustedWorkAmount: adjSum, workAmount: adjSum !== 0 ? adjSum : (initSum !== 0 ? initSum : Number(formData.workAmount || 0)),
          step1Locked: true,
          ...(isBGG ? {
            bggData: {
              agreedSurveyVolume: Number(formData.bggTotalTerbongkar || 0),
              coalVolumeBCM: Number(formData.bggCoalVolumeBCM || 0),
              coalVolumeTon: Number(formData.bggCoalVolumeTon || 0),
              nettOBVolume: Number(formData.bggNettOB || 0),
              obOverDistanceHm: Number(formData.bggOBDistanceHm || 0),
              ...(formData.bggData || {}),
            }
          } : {})
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

      if (editItem?.id) {
        endpoint += `/${editItem.id}`;
        await api(endpoint, { method: "PUT", body: JSON.stringify(payload) });
        onNotice("Data berhasil diperbarui!");
      } else {
        await api(endpoint, { method: "POST", body: JSON.stringify(payload) });
        onNotice("Data baru berhasil ditambahkan!");
      }

      if (modalType === "invoice" && payload.baNoReference) {
        const targetBA = baRows.find((r) => r.baNumber === payload.baNoReference);
        if (targetBA) {
          await api(`/api/finance/ba-trackers/${targetBA.id}`, { method: "PUT", body: JSON.stringify({ ...targetBA, statusBA: "Ready to Invoice", invoiceNoLinked: payload.invoiceNo }) }).catch(() => {});
        }
      }

      const savedModalType = modalType;
      setModalType("none");
      setEditItem(null);
      await loadData();
      if (savedModalType === "pending_volume") setShowPendingVolumeDrawer(true);
    } catch (err: any) { onNotice(err?.message || "Gagal menyimpan data"); } finally { setIsSaving(false); }
  };

  const handleDelete = async (type: any, id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data ini?")) return;
    try {
      let endpoint = "";
      if (type === "ba") endpoint = `/api/finance/ba-trackers/${id}`;
      else if (type === "invoice") endpoint = `/api/finance/invoices/${id}`;
      else if (type === "payment") endpoint = `/api/finance/payments/${id}`;
      else if (type === "customer") endpoint = `/api/finance/customers/${id}`;
      else if (type === "pending_volume") endpoint = `/api/finance/pending-volumes/${id}`;
      await api(endpoint, { method: "DELETE" });
      onNotice("Data berhasil dihapus!");
      await loadData();
    } catch (err: any) { onNotice(err?.message || "Gagal menghapus data"); }
  };

  const handleSaveSBSPenalty = async (item: Partial<SBSPenaltyItem>) => {
    try {
      await saveSBSPenalty(item);
      onNotice("Catatan Klaim Penalti SBS berhasil disimpan.");
      setSbsPenaltyModalOpen(false);
      setSbsPenaltyEditItem(null);
      await loadData();
    } catch (err: any) { onNotice(err?.message || "Gagal menyimpan klaim penalti SBS"); }
  };

  const handleDeleteSBSPenalty = async (id: number) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus catatan klaim penalti SBS ini?")) return;
    try {
      await deleteSBSPenalty(id);
      onNotice("Catatan Klaim Penalti SBS berhasil dihapus.");
      await loadData();
    } catch (err: any) { onNotice(err?.message || "Gagal menghapus klaim penalti SBS"); }
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
