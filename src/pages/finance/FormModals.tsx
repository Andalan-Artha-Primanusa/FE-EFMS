import React, { useEffect, useState } from "react";
import { X, CheckCircle2, Loader2 } from "lucide-react";
import { InvoiceModal } from "./modals/InvoiceModal";
import { BATrackerModal } from "./modals/BATrackerModal";
import { PaymentModal } from "./modals/PaymentModal";
import { CustomerModal } from "./modals/CustomerModal";
import { PendingVolumeRecordModal } from "./modals/PendingVolumeRecordModal";
import { SITE_SOW_DEFAULTS, getSiteSOWList, SOWSelectDropdown } from "./modals/SOWSelectDropdown";
import { getCompanies, type Company } from "../../lib/api";

// Re-export SOW helpers for backward compatibility
export { SITE_SOW_DEFAULTS, getSiteSOWList, SOWSelectDropdown };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-1.5 sm:p-3">
      <div
        className={`bg-white border border-slate-200 rounded-[4px] p-4 sm:p-5 w-full ${
          modalType === "pending_volume" ? "max-w-[96vw] 2xl:max-w-[1550px]" : "max-w-3xl"
        } shadow-2xl space-y-4 max-h-[96vh] overflow-y-auto transition-all`}
      >
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-3">
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
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
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

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-200">
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
