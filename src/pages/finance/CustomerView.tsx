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

export function CustomerView({ c }: { c: any }) {
  const {
    customerRows, setDetailViewItem, openCreateModal, openEditModal, handleDelete,
    query
  } = c as Record<string, any>;
  return (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <PageHeader
              title="Customer Master & Credit Terms"
              description="Direktori pelanggan, grup induk entitas (Petrindo, PTBA, Harum Energy), default termin pembayaran, dan performa pembayaran historis."
            />
            <button
              className="primary flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white shadow-sm transition shrink-0"
              onClick={() => openCreateModal("customer")}
            >
              <Plus size={16} /> Tambah Customer
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customerRows
              .filter((r) => JSON.stringify(r).toLowerCase().includes(query.toLowerCase()))
              .map((c: any) => (
                <div key={c.id} className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3 relative hover:shadow-md transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-mono font-bold text-cyan-800 bg-cyan-50 border border-cyan-200 px-2.5 py-0.5 rounded-md">
                        {c.code}
                      </span>
                      <h3 className="text-lg font-black text-slate-900 mt-1">{c.fullName}</h3>
                      <p className="text-xs text-slate-500 font-medium">Grup: <span className="text-slate-800 font-bold">{c.groupParent}</span></p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Termin Hari</span>
                      <div className="text-lg font-black text-amber-700">{c.terminDays} Hari</div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 text-xs text-slate-700 space-y-1.5 font-medium">
                    <div><span className="text-slate-500 font-bold">No. Kontrak:</span> {c.contractNo}</div>
                    <div><span className="text-slate-500 font-bold">Nilai Kontrak:</span> <span className="font-extrabold text-slate-900">{formatIDR(c.contractValue)}</span></div>
                    <div><span className="text-slate-500 font-bold">Kontak AR:</span> {c.contactAR} ({c.emailAR})</div>
                    <div><span className="text-slate-500 font-bold">Catatan:</span> {c.notes}</div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button className="text-xs font-bold text-cyan-800 hover:text-cyan-900 flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-50 border border-cyan-200" onClick={() => setDetailViewItem({ type: "customer", data: c })}>
                      <Eye size={13} /> View Audit
                    </button>
                    <button className="text-xs font-bold text-slate-700 hover:text-cyan-800 flex items-center gap-1 px-2.5 py-1 rounded bg-slate-50 border border-slate-200" onClick={() => openEditModal("customer", c)}>
                      <Edit2 size={13} /> Edit
                    </button>
                    <button className="text-xs font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1 px-2.5 py-1 rounded bg-rose-50 border border-rose-200" onClick={() => handleDelete("customer", c.id)}>
                      <Trash2 size={13} /> Hapus
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </>
  );
}

