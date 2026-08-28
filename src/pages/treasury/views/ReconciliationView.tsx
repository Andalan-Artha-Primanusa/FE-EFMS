import React, { useState } from "react";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  RefreshCw,
  Search,
  Upload,
  Zap,
} from "lucide-react";
import { formatCurrency, formatDate } from "../../../lib/format";
import type { useTreasuryController } from "../useTreasuryController";

type Props = {
  c: ReturnType<typeof useTreasuryController>;
};

export function ReconciliationView({ c }: Props) {
  const {
    bankTransactions,
    companyBanks,
    setShowImportKopraCsvModal,
    handleAutoMatch,
    handleExportRekapAAP,
    refreshAll,
  } = c;

  const [selectedBankId, setSelectedBankId] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");

  const filteredTx = bankTransactions.filter((tx) => {
    if (selectedBankId && tx.companyBankId !== selectedBankId) return false;
    if (statusFilter === "reconciled" && !tx.isReconciled) return false;
    if (statusFilter === "unreconciled" && tx.isReconciled) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        tx.description.toLowerCase().includes(q) ||
        (tx.referenceNo && tx.referenceNo.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const reconciledCount = bankTransactions.filter((t) => t.isReconciled).length;
  const pendingCount = bankTransactions.filter((t) => !t.isReconciled && t.txType === "DB").length;

  return (
    <div className="space-y-4">
      {/* 1. Header Metrics & Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Total Mutasi Terbaca</div>
            <div className="text-xl font-bold text-slate-900 mt-1">{bankTransactions.length}</div>
            <div className="text-xs text-slate-400 mt-0.5">Dari File Mutasi CSV Kopra</div>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-emerald-200 shadow-sm bg-emerald-50/20 flex items-center justify-between">
          <div>
            <div className="text-xs text-emerald-700 font-medium">Berhasil Direkonsiliasi</div>
            <div className="text-xl font-bold text-emerald-800 mt-1">{reconciledCount}</div>
            <div className="text-xs text-emerald-600 mt-0.5">Matched 100% dengan Voucher</div>
          </div>
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-lg">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-amber-200 shadow-sm bg-amber-50/20 flex items-center justify-between">
          <div>
            <div className="text-xs text-amber-700 font-medium">Menunggu Pemadanan (Debit)</div>
            <div className="text-xl font-bold text-amber-800 mt-1">{pendingCount}</div>
            <div className="text-xs text-amber-600 mt-0.5">Siap di-Auto Match</div>
          </div>
          <div className="p-3 bg-amber-100 text-amber-700 rounded-lg">
            <Zap className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 2. Action Bar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari Keterangan Mutasi, No Ref..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedBankId}
            onChange={(e) => setSelectedBankId(Number(e.target.value))}
            className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-700"
          >
            {companyBanks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.bankName} ({b.accountNumber})
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="">Semua Status Mutasi</option>
            <option value="reconciled">Sudah Reconciled</option>
            <option value="unreconciled">Belum Reconciled</option>
          </select>

          <button
            onClick={() => refreshAll()}
            className="p-1.5 text-slate-600 hover:text-blue-600 border border-slate-300 rounded hover:bg-slate-50 transition"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportKopraCsvModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded shadow-sm hover:bg-slate-50 transition"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600" /> Upload Mutasi CSV
          </button>

          <button
            onClick={() => handleAutoMatch(selectedBankId)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm transition"
          >
            <Zap className="w-3.5 h-3.5" /> Jalankan Auto-Match Regex
          </button>

          <button
            onClick={() => handleExportRekapAAP()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" /> Export REKAP AAP (.xlsx)
          </button>
        </div>
      </div>

      {/* 3. Bank Transactions Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="p-2.5">Tanggal Mutasi</th>
                <th className="p-2.5">Keterangan / Remark Bank</th>
                <th className="p-2.5">No. Referensi</th>
                <th className="p-2.5 text-center">Tipe</th>
                <th className="p-2.5 text-right">Nominal (IDR)</th>
                <th className="p-2.5">Voucher Terpadankan (Matched)</th>
                <th className="p-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTx.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Belum ada data mutasi bank. Silakan upload file CSV mutasi rekening koran Kopra Mandiri.
                  </td>
                </tr>
              ) : (
                filteredTx.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-2.5 whitespace-nowrap text-slate-700 font-medium">
                      {formatDate(tx.transactionDate)}
                    </td>

                    <td className="p-2.5 max-w-md font-mono text-[11px] text-slate-800">
                      {tx.description}
                    </td>

                    <td className="p-2.5 font-mono text-[11px] text-slate-600">
                      {tx.referenceNo || "-"}
                    </td>

                    <td className="p-2.5 text-center font-bold">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          tx.txType === "DB"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {tx.txType === "DB" ? "DEBET (OUT)" : "KREDIT (IN)"}
                      </span>
                    </td>

                    <td className="p-2.5 text-right font-bold text-slate-900 font-mono">
                      {formatCurrency(Number(tx.amount || 0))}
                    </td>

                    <td className="p-2.5">
                      {tx.matchedPlan ? (
                        <div className="font-mono font-bold text-blue-700 text-[11px]">
                          {tx.matchedPlan.voucherNo}
                          <div className="text-[10px] text-slate-400 font-normal">
                            Total Plan: {formatCurrency(Number(tx.matchedPlan.totalAmount))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">- Belum ada -</span>
                      )}
                    </td>

                    <td className="p-2.5 text-center">
                      {tx.isReconciled ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Reconciled
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Pending Match
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
