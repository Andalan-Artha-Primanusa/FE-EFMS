import { useState, useCallback } from "react";
import { SBSPenaltyItem } from "../../lib/api";

export function useFinanceUIState() {
  const [sbsPenaltyModalOpen, setSbsPenaltyModalOpen] = useState(false);
  const [sbsPenaltyEditItem, setSbsPenaltyEditItem] = useState<SBSPenaltyItem | null>(null);
  const [rawShowPendingVolumeDrawer, setRawShowPendingVolumeDrawer] = useState(false);
  const [baFilter, setBaFilter] = useState("All");
  const [periodFilter, setPeriodFilter] = useState("All");
  const [invStatusFilter, setInvStatusFilter] = useState("All");
  const [invCardTab, setInvCardTab] = useState<"AR_ANDALAN" | "PENALTY_UNCUT" | "SUBJECT_TO_INVOICE">("AR_ANDALAN");
  const [invPeriodFilter, setInvPeriodFilter] = useState("All");

  const [modalType, setRawModalType] = useState<"none" | "ba" | "invoice" | "payment" | "customer" | "pending_volume">("none");
  const [editItem, setEditItem] = useState<any>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [formData, setFormData] = useState<any>({ customerCode: "POS", workPeriod: "Juni 2026" });
  const [showActivityGroupDropdown, setShowActivityGroupDropdown] = useState(false);
  const [showExportBADropdown, setShowExportBADropdown] = useState(false);
  const [showInputBADropdown, setShowInputBADropdown] = useState(false);
  const [showExportARDropdown, setShowExportARDropdown] = useState(false);
  const [showInputARDropdown, setShowInputARDropdown] = useState(false);
  const [baRowActionDropdownId, setBaRowActionDropdownId] = useState<number | null>(null);

  const [detailViewItem, setRawDetailViewItem] = useState<{ type: "ba" | "invoice" | "payment" | "customer"; data: any } | null>(null);

  const setDetailViewItem = useCallback((item: any) => {
    if (typeof item === "function") {
      setRawDetailViewItem((prev: any) => {
        const next = item(prev);
        if (next) { setRawModalType("none"); setRawShowPendingVolumeDrawer(false); }
        return next;
      });
    } else {
      if (item) { setRawModalType("none"); setRawShowPendingVolumeDrawer(false); }
      setRawDetailViewItem(item);
    }
  }, []);

  const setModalType = useCallback((type: any) => {
    if (typeof type === "function") {
      setRawModalType((prev: any) => {
        const next = type(prev);
        if (next && next !== "none") { setRawDetailViewItem(null); setRawShowPendingVolumeDrawer(false); }
        return next;
      });
    } else {
      if (type && type !== "none") { setRawDetailViewItem(null); setRawShowPendingVolumeDrawer(false); }
      setRawModalType(type);
    }
  }, []);

  const showPendingVolumeDrawer = rawShowPendingVolumeDrawer;
  const setShowPendingVolumeDrawer = useCallback((val: any) => {
    if (typeof val === "function") {
      setRawShowPendingVolumeDrawer((prev) => {
        const next = val(prev);
        if (next) { setRawModalType("none"); setRawDetailViewItem(null); }
        return next;
      });
    } else {
      if (val) { setRawModalType("none"); setDetailViewItem(null); }
      setRawShowPendingVolumeDrawer(val);
    }
  }, [setDetailViewItem]);

  const [showAddPartialPayment, setShowAddPartialPayment] = useState(false);
  const [partialPaymentForm, setPartialPaymentForm] = useState({
    amountPaid: "",
    paymentDate: new Date().toISOString().split("T")[0],
    receivingBank: "Bank Mandiri Escrow",
    refNo: "",
    notes: ""
  });

  const getCurrentMonthPeriod = useCallback(() => {
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const now = new Date();
    return `${months[now.getMonth()]} ${now.getFullYear()}`;
  }, []);

  const getPreviousMonthPeriod = useCallback(() => {
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const now = new Date();
    let monthIdx = now.getMonth() - 1;
    let year = now.getFullYear();
    if (monthIdx < 0) {
      monthIdx = 11;
      year -= 1;
    }
    return `${months[monthIdx]} ${year}`;
  }, []);

  return {
    sbsPenaltyModalOpen,
    setSbsPenaltyModalOpen,
    sbsPenaltyEditItem,
    setSbsPenaltyEditItem,
    baFilter,
    setBaFilter,
    periodFilter,
    setPeriodFilter,
    invStatusFilter,
    setInvStatusFilter,
    invCardTab,
    setInvCardTab,
    invPeriodFilter,
    setInvPeriodFilter,
    modalType,
    setModalType,
    editItem,
    setEditItem,
    isSaving,
    setIsSaving,
    formData,
    setFormData,
    showActivityGroupDropdown,
    setShowActivityGroupDropdown,
    showExportBADropdown,
    setShowExportBADropdown,
    showInputBADropdown,
    setShowInputBADropdown,
    showExportARDropdown,
    setShowExportARDropdown,
    showInputARDropdown,
    setShowInputARDropdown,
    baRowActionDropdownId,
    setBaRowActionDropdownId,
    detailViewItem,
    setDetailViewItem,
    showPendingVolumeDrawer,
    setShowPendingVolumeDrawer,
    showAddPartialPayment,
    setShowAddPartialPayment,
    partialPaymentForm,
    setPartialPaymentForm,
    getCurrentMonthPeriod,
    getPreviousMonthPeriod
  };
}
