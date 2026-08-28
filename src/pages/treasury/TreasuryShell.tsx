import React from "react";
import {
  ArrowLeftRight,
  Building2,
  CheckCircle2,
  Clock,
  Coins,
  FileSpreadsheet,
  FileText,
  Landmark,
  Layers,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { useTreasuryController } from "./useTreasuryController";
import { ApAgingView } from "./views/ApAgingView";
import { PaymentPlanView } from "./views/PaymentPlanView";
import { KopraExportView } from "./views/KopraExportView";
import { ReconciliationView } from "./views/ReconciliationView";
import { RekapAapView } from "./views/RekapAapView";
import { CreatePlanModal } from "./modals/CreatePlanModal";
import { ImportAccurateModal } from "./modals/ImportAccurateModal";
import { ImportKopraCsvModal } from "./modals/ImportKopraCsvModal";
import { PrintableSummaryModal } from "./components/PrintableSummaryModal";
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
    selectedPlanForPrint,
    setSelectedPlanForPrint,
    selectedVendorForSlip,
    setSelectedVendorForSlip,
  } = c;

  const tabs = [
    { id: "aging", label: "1. AP Invoices & Aging", icon: Clock },
    { id: "plans", label: "2. Payment Plans (RAB)", icon: Layers },
    { id: "kopra", label: "3. Kopra Mandiri Export", icon: FileSpreadsheet },
    { id: "reconcile", label: "4. Bank Reconciliation", icon: ArrowLeftRight },
    { id: "rekap", label: "5. REKAP AAP & Jurnal", icon: CheckCircle2 },
  ] as const;

  return (
    <div className="space-y-4 p-4 max-w-[1600px] mx-auto min-h-screen">
      {/* 1. Page Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900">
                P2P &amp; Treasury Management System
              </h1>
              <p className="text-xs text-slate-500">
                Otomatisasi Tagihan Accurate ➔ Pengajuan RAB ➔ Transfer Kopra Mandiri ➔ Auto-Rekonsiliasi Mutasi ➔ Output REKAP AAP
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => c.refreshAll()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
          </button>
        </div>
      </div>

      {/* 2. SOP Step Navigation Tabs */}
      <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-1 overflow-x-auto">
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

      {/* 3. Main Tab Content */}
      <div>
        {activeTab === "aging" && <ApAgingView c={c} />}
        {activeTab === "plans" && <PaymentPlanView c={c} />}
        {activeTab === "kopra" && <KopraExportView c={c} />}
        {activeTab === "reconcile" && <ReconciliationView c={c} />}
        {activeTab === "rekap" && <RekapAapView c={c} />}
      </div>

      {/* 4. Global Modals */}
      <CreatePlanModal c={c} />
      <ImportAccurateModal c={c} />
      <ImportKopraCsvModal c={c} />
      <PrintableSummaryModal
        plan={selectedPlanForPrint}
        onClose={() => setSelectedPlanForPrint(null)}
      />
      <PrintableVendorSlipModal
        data={selectedVendorForSlip}
        onClose={() => setSelectedVendorForSlip(null)}
      />
    </div>
  );
}
