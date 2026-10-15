import React from "react";
import { X, CheckCircle2, Loader2 } from "lucide-react";
import { InvoiceHeaderForm } from "./InvoiceHeaderForm";
import { InvoiceLineItemsEditor } from "./InvoiceLineItemsEditor";

export function InvoiceModal({ c }: { c: any }) {
  const {
    editItem,
    isSaving,
    formData,
    setFormData,
    setModalType,
    baRows = [],
    invoiceRows = [],
    handleBASelect,
    handleCompanySelect,
    invLineItems = [],
    setInvLineItems,
    updateInvItemVolume,
    updateInvItemOverhaul,
    updateInvItemRateIDR,
    updateInvItemRateUSD,
    updateInvItemKurs,
    updateInvItemAmount,
    removeInvLineItem,
    moveInvRow,
    handleUpdateInvItemField,
    handleReorderInvLineItems,
    getItemEffectiveVolume,
    getItemEffectiveOverhaulMtr,
    calculateItemRateAndAmount,
    getCustomerCalculations,
    rfIndexCalculated = 0,
    handleSave,
  } = c || {};

  const currentCust = (formData?.customerCode || "POS").toUpperCase();

  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (typeof setModalType === "function") {
          setModalType(null);
        }
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [setModalType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof handleSave === "function") {
      handleSave(e);
    }
  };

  return (
    <div
      onClick={() => {
        if (typeof setModalType === "function") setModalType(null);
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-1.5 sm:p-3 overflow-hidden"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200 rounded-[4px] w-full max-w-[96vw] 2xl:max-w-[1550px] shadow-2xl flex flex-col max-h-[96vh] overflow-hidden transition-all"
      >
        {/* Modal Header (Sticky Top) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 p-4 sm:p-5 pb-3 bg-white shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
            <h3 className="text-lg sm:text-xl font-black text-slate-900 truncate">
              {editItem ? "Edit Invoice" : "Create Invoice"}
            </h3>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-[3px] border border-slate-200">
                Site: <strong className="text-[#A57C50] font-black">{currentCust}</strong>
              </span>
              {currentCust === "POS" && (
                <span className="text-xs font-bold text-slate-700 bg-[#A57C50]/10 px-2.5 py-0.5 rounded-[3px] border border-[#A57C50]/30">
                  RF Index: <strong className="text-[#A57C50] font-mono font-black">{Number(rfIndexCalculated || 0).toFixed(3)}</strong>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setModalType("none")}
              className="p-1.5 rounded-[3px] text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            <InvoiceHeaderForm
              formData={formData}
              setFormData={setFormData}
              baRows={baRows}
              invoiceRows={invoiceRows}
              handleBASelect={handleBASelect}
              handleCompanySelect={handleCompanySelect}
            />

            <InvoiceLineItemsEditor
              formData={formData}
              invLineItems={invLineItems}
              setInvLineItems={setInvLineItems}
              updateInvItemVolume={updateInvItemVolume}
              updateInvItemOverhaul={updateInvItemOverhaul}
              updateInvItemRateIDR={updateInvItemRateIDR}
              updateInvItemRateUSD={updateInvItemRateUSD}
              updateInvItemKurs={updateInvItemKurs}
              updateInvItemAmount={updateInvItemAmount}
              removeInvLineItem={removeInvLineItem}
              moveInvRow={moveInvRow}
              handleUpdateInvItemField={handleUpdateInvItemField}
              handleReorderInvLineItems={handleReorderInvLineItems}
              getItemEffectiveVolume={getItemEffectiveVolume}
              getItemEffectiveOverhaulMtr={getItemEffectiveOverhaulMtr}
              calculateItemRateAndAmount={calculateItemRateAndAmount}
              getCustomerCalculations={getCustomerCalculations}
              setFormData={setFormData}
            />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-1">
              <span className="text-[11px] text-slate-500 font-medium">
                * Pilih customer di atas untuk berganti otomatis format dan urutan field SOW (POS, BGG, PTRO, SBS). Kolom tabel & perhitungan otomatis menyesuaikan.
              </span>
            </div>
          </div>

          {/* Form Action Buttons (Sticky Bottom) */}
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
