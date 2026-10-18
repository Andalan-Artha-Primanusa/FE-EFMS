import React, { useEffect, useState } from "react";
import { X, CheckCircle2, Loader2 } from "lucide-react";
import { InvoiceModal } from "./modals/InvoiceModal";
import { BATrackerModal } from "./modals/BATrackerModal";
import { PaymentModal } from "./modals/PaymentModal";
import { CustomerModal } from "./modals/CustomerModal";
import { PendingVolumeRecordModal } from "./modals/PendingVolumeRecordModal";
import { getSiteSOWList, SOWSelectDropdown } from "./modals/SOWSelectDropdown";
import { getCompanies, type Company } from "../../lib/api";

// Re-export SOW helpers for backward compatibility
export { getSiteSOWList, SOWSelectDropdown };

export function FormModals({ c }: { c: any }) {
  const {
    modalType,
    setModalType,
    editItem,
    isSaving,
    formData,
    setFormData,
    handleSave,
    baRows = [],
  } = c || {};

  const [companyList, setCompanyList] = useState<Company[]>([]);

  useEffect(() => {
    getCompanies().then((comps) => {
      if (Array.isArray(comps)) setCompanyList(comps);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!modalType || modalType === "none") return;
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (typeof setModalType === "function") {
          setModalType("none");
        }
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [modalType, setModalType]);

  if (!modalType || modalType === "none") return null;

  if (modalType === "invoice") {
    return <InvoiceModal c={c} />;
  }

  if (modalType === "ba") {
    return <BATrackerModal c={c} />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof handleSave === "function") {
      handleSave(e);
    }
  };

  const title =
    modalType === "pending_volume"
      ? `${editItem ? "Edit Data" : "Tambah Data Baru"} — Pending Volume`
      : modalType === "payment"
      ? `${editItem ? "Edit Data" : "Tambah Data Baru"} — Payment Receipt`
      : `${editItem ? "Edit Data" : "Tambah Data Baru"} — Customer Master`;

  return (
    <div
      onClick={() => {
        if (typeof setModalType === "function") setModalType("none");
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-1.5 sm:p-3 overflow-hidden"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200 rounded-[4px] w-full max-w-3xl shadow-2xl flex flex-col max-h-[96vh] overflow-hidden transition-all"
      >
        {/* Modal Header (Sticky Top) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 p-4 sm:p-5 pb-3 bg-white shrink-0 sticky top-0 z-20">
          <h3 className="text-lg sm:text-xl font-black text-slate-900 truncate">{title}</h3>
          <button
            type="button"
            onClick={() => setModalType("none")}
            className="p-1.5 rounded-[3px] text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {modalType === "payment" && (
              <PaymentModal
                formData={formData}
                setFormData={setFormData}
                companyList={companyList}
              />
            )}

            {modalType === "customer" && (
              <CustomerModal
                formData={formData}
                setFormData={setFormData}
              />
            )}

            {modalType === "pending_volume" && (
              <PendingVolumeRecordModal
                formData={formData}
                setFormData={setFormData}
              />
            )}
          </div>

          {/* Action Buttons (Sticky Bottom) */}
          <div className="flex items-center justify-end gap-3 p-4 sm:p-5 pt-3 border-t border-slate-200 bg-white shrink-0 sticky bottom-0 z-20">
            <button
              type="button"
              className="px-5 py-2 rounded-[3px] border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold transition shadow-xs text-xs cursor-pointer"
              onClick={() => setModalType("none")}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="primary px-6 py-2 rounded-[3px] bg-[#A57C50] hover:bg-[#8e6941] disabled:bg-slate-400 text-white font-black shadow-md transition text-xs flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  <span>Simpan Data</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
