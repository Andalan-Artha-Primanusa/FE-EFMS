import { generateInvoiceFromBA, verifyInvoice, approveInvoice } from "../../lib/api";

interface UseFinanceInvoiceStateProps {
  onNotice: (msg: string) => void;
  loadData: () => Promise<void>;
  detailViewItem: any;
  setDetailViewItem: (item: any) => void;
  actionLoadingKey?: string | null;
  setActionLoadingKey?: (key: string | null) => void;
  setInvoiceRows?: (rows: any[] | ((prev: any[]) => any[])) => void;
  setBaRows?: (rows: any[] | ((prev: any[]) => any[])) => void;
}

export function useFinanceInvoiceState({
  onNotice,
  loadData,
  detailViewItem,
  setDetailViewItem,
  actionLoadingKey,
  setActionLoadingKey,
  setInvoiceRows,
  setBaRows
}: UseFinanceInvoiceStateProps) {
  const handleGenerateInvoiceFromBA = async (baId: number, category?: "Operation & Mining" | "MDO", pendingBaIds: number[] = []) => {
    const key = `generate-inv-${baId}`;
    if (setActionLoadingKey) setActionLoadingKey(key);
    onNotice("⏳ Sedang menerbitkan draft invoice dari Berita Acara...");
    try {
      const newInv: any = await generateInvoiceFromBA(baId, category, pendingBaIds);
      onNotice(`✅ Draft Invoice No. ${newInv?.invoiceNo} diterbitkan dari Berita Acara.`);
      setDetailViewItem({ type: "invoice", data: newInv });
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
      // Jurnal piutang diposting server saat approval Manager FATB.
      const updated: any = await approveInvoice(id, "approve", "Persetujuan Invoice oleh Manager FATB");
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

  return {
    handleGenerateInvoiceFromBA, handleVerifyInvoice, handleApproveInvoice,
    handleApproveInvoiceTier1
  };
}
