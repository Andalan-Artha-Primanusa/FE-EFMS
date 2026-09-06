import { useEffect, useState, useMemo, useCallback, Fragment } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Edit2, FileSpreadsheet, FileText, Filter, Plus, Trash2, X, DollarSign, Calendar, Info, Layers, UserCheck, ShieldAlert, ShieldCheck, ArrowUpRight, CheckCircle, BarChart3, Eye, User, FileCheck, History, Upload, FileCode, ExternalLink, Calculator, Pickaxe, RefreshCw, Printer, ChevronDown, ChevronRight, Receipt, Lock, Unlock, ArrowRight, Building2, Sparkles, Check, Send, Zap, TrendingUp, Archive, Scale } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { Panel } from "../../components/Panel";
import { api, API_BASE, uploadDocumentFile, verifyBATracker, approveBATracker, generateInvoiceFromBA, verifyInvoice, approveInvoiceTier1, approveInvoiceTier2, getFinanceTemplates, User as UserType } from "../../lib/api";

import {
  resolveDocumentUrl, formatIDR, parseNumber, formatThousand, formatDateInput,
  indonesianMonths, formatMonthLabel, formatMonthInput, getRomanMonth,
  generateBANumberPreview, generateInvoiceNumberPreview, getYearFromPeriod,
  generateInvoiceNumber, getBAInvoiceStatus, renderBAStatusBadge,
  getBAStatusForExport, renderInvoiceStatusBadge, parsePeriodToMonthIndex,
  RupiahInput, generateAuditTimeline
} from "./helpers";

export function DashboardView({ c }: { c: any }) {
  const {
    dashboardData, setDetailViewItem, totalAgingMatrix: rawTotalAgingMatrix
  } = c as Record<string, any>;
  const totalAgingMatrix = rawTotalAgingMatrix || { notDue: 0, bucket1_30: 0, bucket31_60: 0, bucket61_90: 0, bucketOver90: 0, total: 0, invCount: 0 };
  return (
        <>
          {/* Top KPI Cards - Neutral & Clean Corporate Style */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2k:grid-cols-5 gap-3.5">
            {(dashboardData?.kpis ?? []).map((kpi: any, idx: number) => {
              const label = String(kpi?.Label || kpi?.label || "");
              const tone = String(kpi?.Tone || kpi?.tone || "");
              const isMoney = label.toUpperCase().includes("TOTAL AR") || label.toUpperCase().includes("AR CRITICAL") || label.toUpperCase().includes("PPN") || label.toUpperCase().includes("PPH");
              const isPct = label.includes("%");
              const isDays = label.toUpperCase().includes("DSO");
              const rawVal = kpi?.Value !== undefined ? kpi?.Value : kpi?.value;
              const numVal = typeof rawVal === "number" ? rawVal : parseFloat(rawVal || 0) || 0;

              let valStr = String(rawVal ?? 0);
              if (isMoney) valStr = formatIDR(numVal);
              else if (isPct) valStr = `${numVal.toFixed(1)}%`;
              else if (isDays) valStr = `${Math.round(numVal)} Hari`;

              let badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
              let badgeText = "Healthy";
              if (tone === "critical") {
                badgeStyle = "bg-rose-50 text-rose-700 border-rose-200";
                badgeText = "High Risk";
              } else if (tone === "warning") {
                badgeStyle = "bg-amber-50 text-amber-800 border-amber-200";
                badgeText = "Attention";
              }

              return (
                <div key={idx} className="p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
                  <div className="my-2">
                    <span className="text-lg sm:text-xl xl:text-2xl 2k:text-3xl font-black text-slate-900 tracking-tight font-mono block truncate" title={valStr}>
                      {valStr}
                    </span>
                  </div>
                  <div className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border w-fit font-bold ${badgeStyle}`}>
                    {badgeText}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Visual Aging Bucket Distribution Bar */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 size={16} className="text-cyan-700" /> Distribusi Umur Piutang (Aging Share)
              </span>
              <span className="text-slate-600 font-bold font-mono">Total AR: {formatIDR(totalAgingMatrix.total)}</span>
            </div>
            <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
              <div
                style={{ width: `${totalAgingMatrix.total ? (totalAgingMatrix.notDue / totalAgingMatrix.total) * 100 : 0}%` }}
                className="bg-cyan-500 h-full transition-all"
                title={`Not Due: ${formatIDR(totalAgingMatrix.notDue)}`}
              />
              <div
                style={{ width: `${totalAgingMatrix.total ? (totalAgingMatrix.bucket1_30 / totalAgingMatrix.total) * 100 : 0}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`1-30 Hari: ${formatIDR(totalAgingMatrix.bucket1_30)}`}
              />
              <div
                style={{ width: `${totalAgingMatrix.total ? (totalAgingMatrix.bucket31_60 / totalAgingMatrix.total) * 100 : 0}%` }}
                className="bg-amber-400 h-full transition-all"
                title={`31-60 Hari: ${formatIDR(totalAgingMatrix.bucket31_60)}`}
              />
              <div
                style={{ width: `${totalAgingMatrix.total ? (totalAgingMatrix.bucket61_90 / totalAgingMatrix.total) * 100 : 0}%` }}
                className="bg-orange-500 h-full transition-all"
                title={`61-90 Hari: ${formatIDR(totalAgingMatrix.bucket61_90)}`}
              />
              <div
                style={{ width: `${totalAgingMatrix.total ? (totalAgingMatrix.bucketOver90 / totalAgingMatrix.total) * 100 : 0}%` }}
                className="bg-rose-500 h-full transition-all"
                title={`>90 Hari: ${formatIDR(totalAgingMatrix.bucketOver90)}`}
              />
            </div>
            <div className="flex flex-wrap gap-4 text-xs font-semibold pt-1">
              <div className="flex items-center gap-1.5 text-slate-700"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block"></span> Not Due ({formatIDR(totalAgingMatrix.notDue)})</div>
              <div className="flex items-center gap-1.5 text-slate-700"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> 1-30 Hari ({formatIDR(totalAgingMatrix.bucket1_30)})</div>
              <div className="flex items-center gap-1.5 text-slate-700"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span> 31-60 Hari ({formatIDR(totalAgingMatrix.bucket31_60)})</div>
              <div className="flex items-center gap-1.5 text-slate-700"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span> 61-90 Hari ({formatIDR(totalAgingMatrix.bucket61_90)})</div>
              <div className="flex items-center gap-1.5 text-slate-700"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> &gt;90 Hari ({formatIDR(totalAgingMatrix.bucketOver90)})</div>
            </div>
          </div>

          <Panel title="Aging Analysis — Posisi Piutang Saat Ini per Customer">
            <div className="table-wrapper overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
              <table className="data-table w-full text-xs text-left border-collapse font-sans">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider">
                    <th className="p-3">Customer</th>
                    <th className="p-3 text-right">Not Due</th>
                    <th className="p-3 text-right">1 - 30 Hari</th>
                    <th className="p-3 text-right">31 - 60 Hari</th>
                    <th className="p-3 text-right">61 - 90 Hari</th>
                    <th className="p-3 text-right">&gt; 90 Hari</th>
                    <th className="p-3 text-right font-black">Total Outstanding</th>
                    <th className="p-3 text-center">Inv Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-800 font-medium">
                  {(dashboardData?.agingMatrix ?? []).map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 font-bold text-cyan-900">{row.customer}</td>
                      <td className="p-3 text-right font-mono text-slate-500">{row.notDue ? formatIDR(row.notDue) : "-"}</td>
                      <td className="p-3 text-right font-mono text-emerald-700 font-semibold">{row.bucket1_30 ? formatIDR(row.bucket1_30) : "-"}</td>
                      <td className="p-3 text-right font-mono text-amber-700 font-semibold">{row.bucket31_60 ? formatIDR(row.bucket31_60) : "-"}</td>
                      <td className="p-3 text-right font-mono text-orange-700 font-semibold">{row.bucket61_90 ? formatIDR(row.bucket61_90) : "-"}</td>
                      <td className="p-3 text-right font-mono text-rose-700 font-semibold">{row.bucketOver90 ? formatIDR(row.bucketOver90) : "-"}</td>
                      <td className="p-3 text-right font-mono font-black text-slate-900">{formatIDR(row.total)}</td>
                      <td className="p-3 text-center font-mono font-bold text-slate-600">{row.invoiceCount}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50/95 text-slate-800 font-bold text-xs border-t-2 border-slate-200 uppercase">
                    <td className="p-3 font-black text-slate-800">TOTAL SUMMARY AR</td>
                    <td className="p-3 text-right font-mono text-slate-600">{formatIDR(totalAgingMatrix.notDue)}</td>
                    <td className="p-3 text-right font-mono text-emerald-700 font-bold">{formatIDR(totalAgingMatrix.bucket1_30)}</td>
                    <td className="p-3 text-right font-mono text-amber-700 font-bold">{formatIDR(totalAgingMatrix.bucket31_60)}</td>
                    <td className="p-3 text-right font-mono text-orange-700 font-bold">{formatIDR(totalAgingMatrix.bucket61_90)}</td>
                    <td className="p-3 text-right font-mono text-rose-700 font-bold">{formatIDR(totalAgingMatrix.bucketOver90)}</td>
                    <td className="p-3 text-right font-mono text-sm font-black text-slate-950">{formatIDR(totalAgingMatrix.total)}</td>
                    <td className="p-3 text-center text-slate-700 font-mono font-bold">{totalAgingMatrix.invoiceCount} Inv</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Panel>

          {/* Top Overdue & BA Bottlenecks */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Panel title="Top Invoice Overdue — Prioritas Collection Action">
                <div className="table-wrapper overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
                  <table className="data-table w-full text-xs text-left border-collapse font-sans">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider">
                        <th className="p-3">No. Invoice</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Periode</th>
                        <th className="p-3 text-right">Outstanding</th>
                        <th className="p-3 text-center">Aging Days</th>
                        <th className="p-3 text-center">Bucket</th>
                        <th className="p-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-slate-800 font-medium">
                      {(dashboardData?.topOverdueInvoices ?? []).map((inv: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 font-mono font-bold text-cyan-900">{inv.invoiceNo}</td>
                          <td className="p-3 font-bold text-slate-900">{inv.customerCode}</td>
                          <td className="p-3 text-slate-600 font-mono">{inv.workPeriod}</td>
                          <td className="p-3 text-right font-mono font-bold text-rose-700">{formatIDR(inv.outstanding)}</td>
                          <td className="p-3 text-center font-mono font-bold text-amber-700">{inv.agingDays} hari</td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                              {inv.agingBucket}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              className="p-1.5 rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 transition cursor-pointer"
                              onClick={() => setDetailViewItem({ type: "invoice", data: inv })}
                              title="Lihat Detail & Tracking Log"
                            >
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}

                      {(dashboardData?.topOverdueInvoices ?? []).length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-slate-500 font-medium">
                            Tidak ada tagihan yang melewati jatuh tempo (Overdue). Semua penagihan dalam batas waktu lancar.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </div>

            <div>
              <Panel title="Internal BA Bottleneck Summary">
                <div className="space-y-3">
                  {(dashboardData?.baBottlenecks ?? []).map((b: any, idx: number) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 shadow-xs space-y-1 hover:border-slate-300 transition">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-cyan-900 text-sm">{b.customer}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-slate-200/80 text-slate-700">{b.baCount} BA</span>
                      </div>
                      <div className="text-xs text-slate-600 flex justify-between pt-1 font-medium">
                        <span>Avg Lead Time BA:</span>
                        <span className="font-bold text-amber-700 font-mono">{b.avgLeadTimeBA ? `${Math.round(b.avgLeadTimeBA)} hari` : "-"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        </>
  );
}

