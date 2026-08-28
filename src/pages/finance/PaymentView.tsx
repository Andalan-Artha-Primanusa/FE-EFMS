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

export function PaymentView({ c }: { c: any }) {
  const {
    invoiceRows: rawInvoiceRows, paymentRows: rawPaymentRows, setDetailViewItem, openEditModal, handleDelete,
    query
  } = c as Record<string, any>;
  const paymentRows = Array.isArray(rawPaymentRows) ? rawPaymentRows : [];
  const invoiceRows = Array.isArray(rawInvoiceRows) ? rawInvoiceRows : [];
  return (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Recorded Receipt</span>
              <div className="text-2xl font-black text-emerald-700 tracking-tight font-mono mt-1">
                {formatIDR(paymentRows.reduce((sum, r) => sum + (r?.amountPaid || 0), 0))}
              </div>
            </div>
            <div className="text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl">
              Menampilkan {paymentRows.length} riwayat mutasi pembayaran masuk (Pelunasan & Cicilan Partial)
            </div>
          </div>

          <Panel title="Log Mutasi Pembayaran Masuk (Receiving Cash/Bank)">
            <div className="table-wrapper overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
              <table className="data-table w-full text-xs text-left border-collapse font-sans">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider">
                    <th className="p-3">Target Invoice</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3 text-right">Nominal Bayar (Rp)</th>
                    <th className="p-3">Tgl Penerimaan</th>
                    <th className="p-3">Receiving Bank</th>
                    <th className="p-3">Ref No</th>
                    <th className="p-3 text-center">Ketepatan Bayar</th>
                    <th className="p-3">Catatan</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-800 font-medium">
                  {paymentRows
                    .filter((r: any) => JSON.stringify(r).toLowerCase().includes(query.toLowerCase()))
                    .map((row: any) => {
                      const linkedInvoice = invoiceRows.find((inv: any) => inv.invoiceNo === row.invoiceNo);
                      return (
                        <tr key={row.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 font-mono font-bold">
                            {linkedInvoice ? (
                              <button
                                type="button"
                                onClick={() => setDetailViewItem({ type: "invoice", data: linkedInvoice })}
                                className="text-cyan-800 hover:text-cyan-950 hover:underline font-bold inline-flex items-center gap-1.5 cursor-pointer"
                                title="Buka Detail & Riwayat Invoice Terkait"
                              >
                                <span>{row.invoiceNo}</span>
                                <ExternalLink size={12} className="text-cyan-600 shrink-0" />
                              </button>
                            ) : (
                              <span className="text-slate-800 font-bold">{row.invoiceNo}</span>
                            )}
                          </td>
                          <td className="p-3 font-bold text-slate-900">{row.customerCode}</td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-700">{formatIDR(row.amountPaid)}</td>
                          <td className="p-3 font-mono text-slate-600">{row.paymentDate ? new Date(row.paymentDate).toLocaleDateString("id-ID") : "-"}</td>
                          <td className="p-3 font-semibold text-slate-800">{row.receivingBank}</td>
                          <td className="p-3 font-mono text-slate-500">{row.refNo}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${row.daysLateOrEarly > 0 ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-emerald-50 text-emerald-800 border-emerald-200"}`}>
                              {row.daysLateOrEarly > 0 ? `Telat ${row.daysLateOrEarly} Hari` : `On-Time / Awal`}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600">{row.notes}</td>
                          <td className="p-3 text-right space-x-1.5">
                            <button className="p-1.5 rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 transition cursor-pointer" onClick={() => setDetailViewItem({ type: "payment", data: row })} title="Lihat Detail & Tracking Log">
                              <Eye size={14} />
                            </button>
                            <button className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition cursor-pointer" onClick={() => openEditModal("payment", row)} title="Edit Payment">
                              <Edit2 size={14} />
                            </button>
                            <button
                              className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                              onClick={() => handleDelete("payment", row.id)}
                              title="Hapus Payment"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
  );
}

