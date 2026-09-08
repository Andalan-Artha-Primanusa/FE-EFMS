import React, { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  ShieldCheck,
  LayoutList,
  Scale,
  RefreshCw,
  Plus,
  FileText,
  TrendingUp,
  Layers,
} from "lucide-react";
import {
  getJournals,
  saveJournal,
  deleteJournal,
  verifyJournal,
  approveJournal,
  postJournalsBatch,
  reverseJournal,
  getCOAAccounts,
  getSubLedgers,
} from "../../lib/api";
import type { JournalEntry, COAAccount, SubLedgerCode } from "../../types";
import { JournalEntryView } from "./JournalEntryView";
import { JournalPostingView } from "./JournalPostingView";
import { GeneralLedgerView } from "./GeneralLedgerView";
import { TrialBalanceView } from "./TrialBalanceView";
import { ProfitLossView } from "./ProfitLossView";
import { BalanceSheetView } from "./BalanceSheetView";

import type { LucideIcon } from "lucide-react";

type Tab = "journal-entry" | "posting" | "general-ledger" | "trial-balance" | "profit-loss" | "balance-sheet";

interface AccountingShellProps {
  initialTab?: Tab;
  currentUserName: string;
  userRole?: string;
}

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "journal-entry", label: "Input Jurnal", icon: FileText },
  { id: "posting", label: "Verifikasi & Posting", icon: ShieldCheck },
  { id: "general-ledger", label: "Buku Besar", icon: BookOpen },
  { id: "trial-balance", label: "Neraca Saldo", icon: Scale },
  { id: "profit-loss", label: "Laba Rugi", icon: TrendingUp },
  { id: "balance-sheet", label: "Neraca", icon: Layers },
];

export const AccountingShell: React.FC<AccountingShellProps> = ({
  initialTab = "journal-entry",
  currentUserName,
  userRole,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [coaAccounts, setCoaAccounts] = useState<COAAccount[]>([]);
  const [subLedgers, setSubLedgers] = useState<SubLedgerCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [glDrilldownAccount, setGlDrilldownAccount] = useState<string | undefined>();

  const loadJournals = useCallback(async () => {
    setLoading(true);
    try {
      const [jrnls, coas, subs] = await Promise.all([
        getJournals(),
        getCOAAccounts(),
        getSubLedgers(),
      ]);
      setJournals(jrnls);
      setCoaAccounts(coas);
      setSubLedgers(subs as unknown as SubLedgerCode[]);
    } catch (e) {
      console.error("AccountingShell: failed to load data", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJournals();
  }, [loadJournals]);

  // Journal CRUD handlers
  const handleSaveJournal = async (entry: Partial<JournalEntry>, submitForApproval?: boolean) => {
    await saveJournal(entry);
    await loadJournals();
  };

  const handleDeleteJournal = async (id: number) => {
    await deleteJournal(id);
    await loadJournals();
  };

  const handleVerifyJournal = async (id: number) => {
    await verifyJournal(id);
    await loadJournals();
  };

  const handleApproveJournal = async (id: number) => {
    await approveJournal(id);
    await loadJournals();
  };

  // Combined approve + post in one step (for Posting/SPV tab)
  const handleApproveAndPost = async (ids: number[]) => {
    // Approve each, then batch post
    for (const id of ids) {
      const j = journals.find((x) => x.id === id);
      if (j && j.status !== "Approved" && j.status !== "Posted to GL") {
        await approveJournal(id);
      }
    }
    await postJournalsBatch(ids);
    await loadJournals();
  };

  const handleRejectToDraft = async (id: number, reason: string) => {
    // Reversal returns a journal back to draft by creating a reversal note
    // In this system we send a "reverse" action with reason for audit trail
    await reverseJournal(id, `[DITOLAK SPV] ${reason}`);
    await loadJournals();
  };

  const handleReverseJournal = async (id: number, reason: string) => {
    await reverseJournal(id, reason);
    await loadJournals();
  };

  const handleDrillDownToGL = (accountCode: string) => {
    setGlDrilldownAccount(accountCode);
    setActiveTab("general-ledger");
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Top Sub-Tab Navigation — FEAST brand enterprise style */}
      <div className="flex-none bg-white border-b border-slate-200 shadow-sm">
        <div className="px-6 pt-4 pb-0 flex items-end gap-0.5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-t border-l border-r select-none transition-all ${
                  isActive
                    ? "bg-white text-[#1A1612] border-slate-200 -mb-px z-10 shadow-sm"
                    : "bg-slate-50 text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-100"
                }`}
                style={{
                  borderRadius: "3px 3px 0 0",
                  borderBottom: isActive ? "1px solid #FFFFFF" : "1px solid transparent",
                }}
              >
                <Icon style={{ width: 14, height: 14, color: isActive ? "#A57C50" : "#94a3b8" }} />
                {tab.label}
              </button>
            );
          })}

          <div className="flex-1" />

          <button
            onClick={loadJournals}
            disabled={loading}
            className="mb-1 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            style={{ borderRadius: 3 }}
            title="Segarkan Data"
          >
            <RefreshCw style={{ width: 15, height: 15, color: loading ? "#A57C50" : undefined }} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Tab Content Panel — Seamless with App Workspace (bg-slate-50) */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5 bg-slate-50">
        {activeTab === "journal-entry" && (
          <JournalEntryView
            journals={journals}
            coaAccounts={coaAccounts}
            subLedgers={subLedgers}
            loading={loading}
            onRefresh={loadJournals}
            onSaveJournal={handleSaveJournal}
            onDeleteJournal={handleDeleteJournal}
            onVerifyJournal={handleVerifyJournal}
            onApproveJournal={handleApproveJournal}
            onPostJournals={handleApproveAndPost}
            onReverseJournal={handleReverseJournal}
            currentUserName={currentUserName}
            userRole={userRole}
          />
        )}

        {activeTab === "posting" && (
          <JournalPostingView
            journals={journals}
            loading={loading}
            onRefresh={loadJournals}
            onApproveAndPost={handleApproveAndPost}
            onRejectToDraft={handleRejectToDraft}
            onReverseJournal={handleReverseJournal}
            currentUserName={currentUserName}
            userRole={userRole}
          />
        )}

        {activeTab === "general-ledger" && (
          <GeneralLedgerView
            coaAccounts={coaAccounts}
            initialAccount={glDrilldownAccount || (coaAccounts[0]?.code ?? "1101.001")}
          />
        )}

        {activeTab === "trial-balance" && (
          <TrialBalanceView onDrillDownToGL={handleDrillDownToGL} />
        )}

        {activeTab === "profit-loss" && (
          <ProfitLossView />
        )}

        {activeTab === "balance-sheet" && (
          <BalanceSheetView />
        )}
      </div>
    </div>
  );
};

