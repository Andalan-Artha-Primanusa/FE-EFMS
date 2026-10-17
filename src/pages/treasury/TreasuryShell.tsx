import React, { useState } from "react";
import { FileSpreadsheet, Landmark, RefreshCw } from "lucide-react";
import { useTreasuryController } from "./useTreasuryController";
import type { TreasuryTab } from "../../data/navigation";
import { PivotAgingPlanningView } from "./views/PivotAgingPlanningView";
import { WeeklyPlanningExcelView } from "./views/WeeklyPlanningExcelView";
import { PaymentPlanView } from "./views/PaymentPlanView";
import { KopraExportView } from "./views/KopraExportView";
import { ReconciliationView } from "./views/ReconciliationView";
import { RekapAapView } from "./views/RekapAapView";
import { MasterVendorView } from "./views/MasterVendorView";
import { CreatePlanModal } from "./modals/CreatePlanModal";
import { ImportAccurateModal } from "./modals/ImportAccurateModal";
import { ImportKopraCsvModal } from "./modals/ImportKopraCsvModal";
import { AccurateBankMapModal } from "./modals/AccurateBankMapModal";
import { PrintableVendorSlipModal } from "./components/PrintableVendorSlipModal";

export function TreasuryShell({
  viewTitle = "Treasury Management",
  tab,
  onNotice,
  user,
}: {
  viewTitle?: string;
  tab: TreasuryTab;
  query?: string;
  onNotice?: (msg: string) => void;
  user?: any;
}) {
  const c = useTreasuryController(onNotice, user, tab);
  const {
    activeTab,
    setActiveTab,
    selectedVendorForSlip,
    setSelectedVendorForSlip,
  } = c;

  const pendingBanks = c.vendors.filter((v) => v.pendingAccountNumber).length;
  const unmappedBanks = c.companyBanks.filter((b) => !b.accurateBankNo).length;
  const [showBankMap, setShowBankMap] = useState(false);
  const lastSync = c.syncState?.last?.endedAt;

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] max-w-[1600px] mx-auto p-2 gap-2 overflow-hidden">
      {/* Toolbar — the SOP steps are sidebar sub-menus of Treasury Management */}
      <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-2 overflow-x-auto shrink-0">
        {pendingBanks > 0 ? (
          <button
            onClick={() => setActiveTab("vendors")}
            className="px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition cursor-pointer whitespace-nowrap"
          >
            {pendingBanks} perubahan rekening vendor menunggu verifikasi
          </button>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-1.5 shrink-0 pr-1">
          <span
            className="text-[10px] text-slate-500 whitespace-nowrap"
            title={c.syncState?.lastError ? `Sync terakhir gagal: ${c.syncState.lastError}` : undefined}
          >
            {c.syncState?.running
              ? "Sync berjalan…"
              : lastSync
                ? `Terakhir sync: ${new Date(lastSync).toLocaleString("id-ID")}`
                : "Belum pernah sync"}
            {c.syncState?.lastError && <span className="text-rose-600 font-bold"> (gagal)</span>}
          </span>
          {c.canApprove && (
            <button
              onClick={() => setShowBankMap(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition cursor-pointer shadow-2xs whitespace-nowrap"
              title="Petakan rekening sumber FEAST ke akun Kas/Bank Accurate (wajib untuk Posting ke Accurate)"
            >
              <Landmark className="w-3.5 h-3.5 text-slate-500" /> Akun Bank Accurate
              {unmappedBanks > 0 && (
                <span className="px-1.5 rounded-full bg-amber-500 text-white text-[10px]">{unmappedBanks}</span>
              )}
            </button>
          )}
          {c.canWrite && (
            <button
              onClick={() => c.handleSyncAccurate()}
              disabled={!!c.syncState?.running}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-[#A57C50] hover:bg-[#8e6941] disabled:opacity-60 disabled:cursor-wait rounded-lg transition cursor-pointer shadow-2xs whitespace-nowrap"
              title="Tarik Faktur Pembelian terbaru dari Accurate Online (data disimpan di FEAST)"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${c.syncState?.running ? "animate-spin" : ""}`} /> Sync dari Accurate
            </button>
          )}
          <button
            onClick={() => c.setShowImportAccurateModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#8e6941] bg-white border border-[#A57C50]/40 hover:bg-amber-50 rounded-lg transition cursor-pointer shadow-2xs whitespace-nowrap"
            title="Cadangan bila Accurate tidak dapat diakses"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Import Excel
          </button>
          <button
            onClick={() => c.refreshAll()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition cursor-pointer shadow-2xs whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" /> Refresh Data
          </button>
        </div>
      </div>

      {/* Main content — constrained inside viewport */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {activeTab === "pivot" && <PivotAgingPlanningView c={c} />}
        {activeTab === "planning" && <WeeklyPlanningExcelView c={c} />}
        {activeTab === "voucher" && <PaymentPlanView c={c} />}
        {activeTab === "kopra" && <KopraExportView c={c} />}
        {activeTab === "reconcile" && <ReconciliationView c={c} />}
        {activeTab === "rekap" && <RekapAapView c={c} />}
        {activeTab === "vendors" && <MasterVendorView c={c} />}
      </div>

      {/* Global modals */}
      <CreatePlanModal c={c} />
      <ImportAccurateModal c={c} />
      <ImportKopraCsvModal c={c} />
      <AccurateBankMapModal c={c} isOpen={showBankMap} onClose={() => setShowBankMap(false)} />
      <PrintableVendorSlipModal
        data={selectedVendorForSlip}
        onClose={() => setSelectedVendorForSlip(null)}
      />
    </div>
  );
}
