import { useState, useCallback } from "react";
import { SBSPenaltyItem } from "../../lib/api";

export function useFinanceUIState() {
  const [sbsPenaltyModalOpen, setSbsPenaltyModalOpen] = useState(false);
  const [sbsPenaltyEditItem, setSbsPenaltyEditItem] = useState<SBSPenaltyItem | null>(null);
  const [baFilter, setBaFilter] = useState("All");
  const [periodFilter, setPeriodFilter] = useState("All");
  const [invStatusFilter, setInvStatusFilter] = useState("All");
  const [invCardTab, setInvCardTab] = useState<"AR_ANDALAN" | "PENALTY_UNCUT" | "SUBJECT_TO_INVOICE">("AR_ANDALAN");
  const [invPeriodFilter, setInvPeriodFilter] = useState("All");

  const [modalType, setRawModalType] = useState<"none" | "ba" | "invoice" | "payment" | "customer">("none");
  const [editItem, setEditItem] = useState<any>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [formData, setFormData] = useState<any>({ customerCode: "", workPeriod: "" });
  const [showActivityGroupDropdown, setShowActivityGroupDropdown] = useState(false);
  const [showExportBADropdown, setShowExportBADropdown] = useState(false);
  const [showInputBADropdown, setShowInputBADropdown] = useState(false);
  const [showExportARDropdown, setShowExportARDropdown] = useState(false);
  const [baRowActionDropdownId, setBaRowActionDropdownId] = useState<number | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);

  const [detailViewItem, setRawDetailViewItem] = useState<{ type: "ba" | "invoice" | "payment" | "customer"; data: any } | null>(null);

  const setDetailViewItem = useCallback((item: any) => {
    if (typeof item === "function") {
      setRawDetailViewItem((prev: any) => {
        const next = item(prev);
        if (next) { setRawModalType("none"); }
        return next;
      });
    } else {
      if (item) { setRawModalType("none"); }
      setRawDetailViewItem(item);
    }
  }, []);

  const setModalType = useCallback((type: any) => {
    if (typeof type === "function") {
      setRawModalType((prev: any) => {
        const next = type(prev);
        if (next && next !== "none") { setRawDetailViewItem(null); }
        return next;
      });
    } else {
      if (type && type !== "none") { setRawDetailViewItem(null); }
      setRawModalType(type);
    }
  }, []);

  const [showAddPartialPayment, setShowAddPartialPayment] = useState(false);
  const [partialPaymentForm, setPartialPaymentForm] = useState({
    amountPaid: "",
    pph23Withheld: 0,
    paymentDate: new Date().toISOString().split("T")[0],
    receivingBank: "Bank Mandiri Escrow",
    refNo: "",
    receiptNo: "",
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
    baRowActionDropdownId,
    setBaRowActionDropdownId,
    detailViewItem,
    setDetailViewItem,
    showAddPartialPayment,
    setShowAddPartialPayment,
    partialPaymentForm,
    setPartialPaymentForm,
    deletingKey,
    setDeletingKey,
    actionLoadingKey,
    setActionLoadingKey,
    getCurrentMonthPeriod,
    getPreviousMonthPeriod
  };
}
