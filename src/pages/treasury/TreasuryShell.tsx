import React from "react";
import {
  ArrowLeftRight,
  Building2,
  Calendar,
  CheckCircle2,
  Coins,
  FileSpreadsheet,
  FileText,
  Layers,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { useTreasuryController } from "./useTreasuryController";
import { ApAgingView } from "./views/ApAgingView";
import { PivotAgingPlanningView } from "./views/PivotAgingPlanningView";
import { WeeklyPlanningExcelView } from "./views/WeeklyPlanningExcelView";
import { FinanceVoucherView } from "./views/FinanceVoucherView";
import { PaymentPlanView } from "./views/PaymentPlanView";
import { KopraExportView } from "./views/KopraExportView";
import { ReconciliationView } from "./views/ReconciliationView";
import { RekapAapView } from "./views/RekapAapView";
import { CreatePlanModal } from "./modals/CreatePlanModal";
import { ImportAccurateModal } from "./modals/ImportAccurateModal";
import { ImportKopraCsvModal } from "./modals/ImportKopraCsvModal";
import { PrintableVendorSlipModal } from "./components/PrintableVendorSlipModal";

export function TreasuryShell({
  viewTitle = "Treasury Management",
  onNotice,
  user,
}: {
  viewTitle?: string;
  query?: string;
  onNotice?: (msg: string) => void;
  user?: any;
}) {
  const c = useTreasuryController(onNotice);
  const {
    activeTab,
    setActiveTab,
    selectedVendorForSlip,
    setSelectedVendorForSlip,
  } = c;

  const tabs = [
    { id: "pivot", label: "1. Pivot Hutang", icon: Layers },
    { id: "planning", label: "2. Payment Plan", icon: Calendar },
    { id: "voucher", label: "3. Payment Voucher", icon: FileText },
    { id: "kopra", label: "4. Kopra Export", icon: FileSpreadsheet },
    { id: "reconcile", label: "5. Rekonsiliasi Bank", icon: ArrowLeftRight },
    { id: "rekap", label: "6. Rekap AAP", icon: CheckCircle2 },
  ] as const;

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] max-w-[1600px] mx-auto p-2 gap-2 overflow-hidden">
      {/* SOP Step Navigation Tabs & Refresh Button */}
      <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-2 overflow-x-auto shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;

            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 pr-1">
          <button
            onClick={() => c.setShowImportAccurateModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-[#A57C50] hover:bg-[#8e6941] rounded-lg transition cursor-pointer shadow-2xs whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Import Accurate
          </button>
          <button
            onClick={() => c.refreshAll()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition cursor-pointer shadow-2xs whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" /> Refresh Data
          </button>
        </div>
      </div>

      {/* 3. Main Tab Content — Constrained inside viewport */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {activeTab === "aging" && <ApAgingView c={c} />}
        {activeTab === "pivot" && <PivotAgingPlanningView c={c} />}
        {activeTab === "planning" && <WeeklyPlanningExcelView c={c} />}
        {(activeTab === "voucher" || activeTab === "plans") && <PaymentPlanView c={c} />}
        {activeTab === "kopra" && <KopraExportView c={c} />}
        {activeTab === "reconcile" && <ReconciliationView c={c} />}
        {activeTab === "rekap" && <RekapAapView c={c} />}
      </div>

      {/* 4. Global Modals */}
      <CreatePlanModal c={c} />
      <ImportAccurateModal c={c} />
      <ImportKopraCsvModal c={c} />
      <PrintableVendorSlipModal
        data={selectedVendorForSlip}
        onClose={() => setSelectedVendorForSlip(null)}
      />
    </div>
  );
}
