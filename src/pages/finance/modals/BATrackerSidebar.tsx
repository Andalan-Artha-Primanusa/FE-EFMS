import React from "react";
import { FileText, CheckCircle, ExternalLink, History, ChevronDown, Upload } from "lucide-react";
import { isRentalBA, calcIDR } from "../ba_calculations";
import type { BACalc } from "../../../types";
import { resolveDocumentUrl, renderBAStatusBadge, generateAuditTimeline } from "../helpers";

const BA_FIELD_LABELS: Record<string, string> = {
  baNumber: "No. BA", draftBARefNo: "No. Ref Draft", signedBANumber: "No. BA Signed",
  customerCode: "Customer", workPeriod: "Periode", picAAP: "PIC Site", estimatedDeduction: "Estimasi Deduction",
  statusBA: "Status BA", workAmount: "Nilai Klaim", initialWorkAmount: "Nilai Awal (TC)", adjustedWorkAmount: "Nilai Survey",
  draftBAPath: "Draft BA PDF", finalBAPath: "Final Signed BA PDF",
  baSubmittedDate: "Tgl Submit", internalRoutingDate: "Tgl Routing", baSentDate: "Tgl Kirim", baSignedDate: "Tgl TTD",
  verifiedBy: "Diverifikasi oleh", approvedBy: "Disetujui oleh", invoiceNoLinked: "No. Invoice",
  notes: "Catatan", notesBottleneck: "Catatan Bottleneck",
};
const BA_ITEM_LABELS: Record<string, string> = {
  area: "Area", material: "Material", unit: "Satuan", initialVolume: "Volume TC", adjustedVolume: "Vol Survey", distanceM: "Jarak (m)", rate: "Rate",
};
const BA_ACTION_LABELS: Record<string, string> = {
  save: "Simpan", verify: "Verifikasi", approve: "Approval", update_notes: "Update Catatan", delete: "Hapus", generate_invoice: "Generate Invoice", accurate_sync: "Sync Accurate",
};

const BA_ACTION_TONES: Record<string, { dot: string; badge: string }> = {
  save: { dot: "bg-sky-500", badge: "bg-sky-50 text-sky-800 border-sky-200" },
  verify: { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  approve: { dot: "bg-emerald-600", badge: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  update_notes: { dot: "bg-amber-500", badge: "bg-amber-50 text-amber-800 border-amber-200" },
  delete: { dot: "bg-rose-500", badge: "bg-rose-50 text-rose-800 border-rose-200" },
  generate_invoice: { dot: "bg-purple-500", badge: "bg-purple-50 text-purple-800 border-purple-200" },
  accurate_sync: { dot: "bg-indigo-500", badge: "bg-indigo-50 text-indigo-800 border-indigo-200" },
};

const fmtAuditValue = (v: any): string => {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "number") return v.toLocaleString("id-ID");
  if (typeof v === "boolean") return v ? "Ya" : "Tidak";
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return new Date(s).toLocaleDateString("id-ID");
  if (s.includes("/uploads/") || s.endsWith(".pdf")) return s.split("/").pop() || s;
  return s;
};

// Ringkas perubahan antar snapshot BA menjadi baris "Field: lama → baru".
const diffBASnapshots = (before: any, after: any): string[] => {
  if (!after) return [];
  if (!before) return after.statusBA ? [`Status BA: ${after.statusBA}`] : [];
  const lines: string[] = [];
  for (const [k, label] of Object.entries(BA_FIELD_LABELS)) {
    const b = fmtAuditValue(before[k]), a = fmtAuditValue(after[k]);
    if (b !== a) lines.push(`${label}: ${b} → ${a}`);
  }
  const itemName = (it: any) => `${it.material || "Item"}${it.area ? ` (${it.area})` : ""}`;
  const beforeItems = new Map<string, any>((before.items || []).map((it: any, i: number) => [String(it.id || i), it]));
  (after.items || []).forEach((it: any, i: number) => {
    const prev = beforeItems.get(String(it.id || i));
    beforeItems.delete(String(it.id || i));
    if (!prev) return lines.push(`+ Tambah item ${itemName(it)}`);
    for (const [k, label] of Object.entries(BA_ITEM_LABELS)) {
      const b = fmtAuditValue(prev[k]), a = fmtAuditValue(it[k]);
      if (b !== a) lines.push(`${itemName(it)} · ${label}: ${b} → ${a}`);
    }
  });
  beforeItems.forEach((it) => lines.push(`− Hapus item ${itemName(it)}`));
  return lines;
};

// Log accurate_sync menyimpan AccuratePosting {status, error, docs{OP|MDO: {number}}} di `after`.
const accuratePostingLines = (a: any): string[] => a ? [
  `Status: ${a.status || "-"}`,
  ...Object.entries(a.docs || {}).map(([k, d]: [string, any]) => `JV ${k}: ${d?.number || "-"}`),
  ...(a.error ? [`Error: ${a.error}`] : []),
] : [];

interface BATrackerSidebarProps {
  formData: any;
  setFormData: (data: any) => void;
  editItem: any;
  invoiceRows: any[];
  calc?: BACalc;
  baAuditLogs: any[];
  isInlineEditingBA?: boolean;
  handleFileUpload?: (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => void;
}

export function BATrackerSidebar({
  formData,
  setFormData,
  editItem,
  invoiceRows,
  calc,
  baAuditLogs,
  isInlineEditingBA,
  handleFileUpload,
}: BATrackerSidebarProps) {
  const canUpload = !!isInlineEditingBA && !!handleFileUpload;
  // BA Rental POS: slot draft = Surat Permintaan Pekerjaan Tambahan (Kontrak Ps 5 ayat 2g).
  const draftLabel = isRentalBA(formData) ? "Surat Permintaan Pekerjaan Tambahan" : "Draft BA PDF";
  const pdfInput = (field: string) => (
    <input type="file" accept="application/pdf" className="hidden" onChange={(e) => { handleFileUpload?.(e, field); e.target.value = ""; }} />
  );
  const replaceButton = (field: string) => canUpload && (
    <label className="text-[10px] px-2 py-1 rounded-[3px] border border-slate-600 hover:bg-slate-800 text-slate-200 font-bold inline-flex items-center gap-1 transition cursor-pointer">
      <Upload size={11} /> Ganti
      {pdfInput(field)}
    </label>
  );
  const emptyDropzone = (field: string, idleText: string) => canUpload ? (
    <label className="block p-3 text-center text-xs text-slate-300 bg-slate-900/50 hover:bg-slate-900 hover:text-white rounded-[3px] border border-dashed border-slate-600 hover:border-[#A57C50] transition cursor-pointer">
      <Upload size={16} className="mx-auto mb-1 text-[#A57C50]" />
      Klik untuk upload PDF
      {pdfInput(field)}
    </label>
  ) : (
    <div className="p-3 text-center text-xs text-slate-400 bg-slate-900/50 rounded-[3px] border border-dashed border-slate-800">
      {idleText}
    </div>
  );

  return (
    <div className="xl:col-span-3 2xl:col-span-3 space-y-4">
      {!formData.pendingMode && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-[4px] space-y-2.5">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
              No. BA Resmi Customer <span className="text-rose-600">*</span>
            </label>
            {!isInlineEditingBA ? (
              <div className="p-2 bg-white border border-slate-200 rounded-[3px] font-mono font-bold text-xs text-slate-900">
                {formData.signedBANumber || formData.baNumber || "-"}
              </div>
            ) : (
              <input
                className="w-full bg-white border border-slate-300 rounded-[3px] p-2 text-slate-900 font-mono font-bold text-xs focus:border-[#A57C50] outline-none"
                placeholder="052/BA-POS-NIKEL/VII/2026"
                value={formData.signedBANumber || formData.baNumber || ""}
                onChange={(e) => setFormData({ ...formData, signedBANumber: e.target.value, baNumber: e.target.value })}
              />
            )}
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
              Tanggal Ditandatangani Customer
            </label>
            {!isInlineEditingBA ? (
              <div className="p-2 bg-white border border-slate-200 rounded-[3px] text-xs text-slate-900 font-bold">
                {formData.baSignedDate ? new Date(formData.baSignedDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}
              </div>
            ) : (
              <input
                type="date"
                className="w-full bg-white border border-slate-300 rounded-[3px] p-2 text-slate-900 text-xs focus:border-[#A57C50] outline-none"
                value={formData.baSignedDate || ""}
                onChange={(e) => setFormData({ ...formData, baSignedDate: e.target.value })}
              />
            )}
          </div>
        </div>
      )}

      {/* Ringkasan Dokumen Card */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-[4px] space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <span className="text-xs font-black uppercase text-slate-800 tracking-wider">Ringkasan Berita Acara</span>
          <span className="text-[10px] font-mono font-bold text-slate-500">ID: #{formData.id || editItem?.id || "New"}</span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500 font-bold">Total Nilai Klaim BA:</span>
            <span className="font-mono font-black text-emerald-800 text-sm">{calcIDR(calc?.total.gross)}</span>
          </div>
          <div className="flex justify-between text-[11px] pt-0.5 border-t border-slate-200/60">
            <span className="text-slate-500">Prediksi Netto (Inv):</span>
            <span className="font-mono font-bold text-emerald-700">
              {calcIDR(calc?.total.totalInvoice)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-bold">Status BA:</span>
            <span>{renderBAStatusBadge(formData.statusBA || "Submit", formData.invoiceNoLinked, undefined, editItem || formData, invoiceRows)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-bold">Customer:</span>
            <span className="font-bold text-slate-900">{formData.customerCode || ""}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-bold">Periode:</span>
            <span className="text-slate-800 font-bold">{formData.workPeriod || "-"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-bold">Lead Time Approval:</span>
            <span className="text-amber-700 font-extrabold">{formData.leadTimeDays || 0} Hari</span>
          </div>
        </div>
      </div>

      {/* PDF PREVIEWS CONTAINER */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-700 tracking-wider">
          <FileText size={14} className="text-[#A57C50]" /> Pratinjau Dokumen PDF
        </div>

        {/* Draft BA Card */}
        <div className="p-3 bg-[#1A1612] text-white rounded-[4px] border border-amber-900/30 space-y-2.5 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
              <FileText size={13} className="text-[#A57C50]" /> {isRentalBA(formData) ? draftLabel : "Draft BA PDF (Internal Routing)"}
            </span>
            {formData.draftBAPath ? (
              <div className="flex items-center gap-1.5">
                {replaceButton("draftBAPath")}
                <a
                  href={resolveDocumentUrl(formData.draftBAPath)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] px-2.5 py-1 rounded-[3px] bg-[#A57C50] hover:bg-[#8e6941] text-white font-bold inline-flex items-center gap-1 transition shadow-xs"
                >
                  <ExternalLink size={11} /> Buka Tab Baru
                </a>
              </div>
            ) : (
              <span className="text-[10px] text-slate-400 italic">Belum Diunggah</span>
            )}
          </div>
          {formData.draftBAPath ? (
            <div className="p-3 bg-slate-900/90 rounded-[3px] border border-slate-800 flex items-center gap-3">
              <div className="p-2 bg-[#A57C50]/20 border border-[#A57C50]/40 rounded-[3px] text-[#A57C50] shrink-0">
                <FileText size={20} />
              </div>
              <div className="min-w-0 flex-1 text-xs">
                <span className="font-mono font-bold text-slate-200 block truncate" title={formData.draftBAPath}>
                  {formData.draftBARefNo ? `Draft-${formData.draftBARefNo.replace(/\//g, '_')}.pdf` : formData.draftBAPath.split('/').pop() || "draft_berita_acara.pdf"}
                </span>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                  <span>Site: <strong className="text-amber-200">{formData.customerCode || "POS"}</strong></span>
                  <span>•</span>
                  <span>Routing: <strong className="text-slate-300">{formData.internalRoutingDate || "Tercatat"}</strong></span>
                </div>
              </div>
            </div>
          ) : emptyDropzone("draftBAPath", `${draftLabel} belum diunggah.`)}
        </div>

        {/* Final Signed BA Card */}
        <div className="p-3 bg-[#1A1612] text-white rounded-[4px] border border-amber-900/30 space-y-2.5 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle size={13} className="text-emerald-400" /> Final Signed BA PDF (TTD Resmi)
            </span>
            {formData.finalBAPath ? (
              <div className="flex items-center gap-1.5">
                {replaceButton("finalBAPath")}
                <a
                  href={resolveDocumentUrl(formData.finalBAPath)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] px-2.5 py-1 rounded-[3px] bg-emerald-700 hover:bg-emerald-600 text-white font-bold inline-flex items-center gap-1 transition shadow-xs"
                >
                  <ExternalLink size={11} /> Buka Tab Baru
                </a>
              </div>
            ) : (
              <span className="text-[10px] text-slate-400 italic">Belum Diunggah</span>
            )}
          </div>
          {formData.finalBAPath ? (
            <div className="p-3 bg-slate-900/90 rounded-[3px] border border-slate-800 flex items-center gap-3">
              <div className="p-2 bg-emerald-950/80 border border-emerald-700/50 rounded-[3px] text-emerald-400 shrink-0">
                <CheckCircle size={20} />
              </div>
              <div className="min-w-0 flex-1 text-xs">
                <span className="font-mono font-bold text-emerald-200 block truncate" title={formData.finalBAPath}>
                  {formData.signedBANumber ? `Signed-${formData.signedBANumber.replace(/\//g, '_')}.pdf` : formData.baNumber ? `BA-${formData.baNumber.replace(/\//g, '_')}.pdf` : formData.finalBAPath.split('/').pop() || "signed_berita_acara.pdf"}
                </span>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                  <span>TTD: <strong className="text-emerald-300">{formData.baSignedDate || "Selesai"}</strong></span>
                  <span>•</span>
                  <span className="text-emerald-400 font-bold">Terverifikasi ✓</span>
                </div>
              </div>
            </div>
          ) : emptyDropzone("finalBAPath", "Final Signed BA PDF belum diunggah.")}
        </div>
      </div>

      {/* ACTIVITY LOG */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-[4px] space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <span className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
            <History size={13} className="text-[#A57C50]" /> Activity Log
          </span>
          {baAuditLogs.length > 0 && (
            <span className="text-[10px] font-mono font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded-[3px]">{baAuditLogs.length}</span>
          )}
        </div>

        <ol className="max-h-80 overflow-y-auto pr-1 text-xs">
          {baAuditLogs.length > 0 ? (
            baAuditLogs.map((log: any, lIdx: number) => {
              const isSync = log.action === "accurate_sync";
              const changes = isSync ? accuratePostingLines(log.after) : diffBASnapshots(log.before, log.after);
              const actionLabel = log.action === "save" && !log.before ? "Buat BA" : (BA_ACTION_LABELS[log.action] || log.action || "Activity");
              const tone = isSync && log.after?.status === "Gagal" ? BA_ACTION_TONES.delete : (BA_ACTION_TONES[log.action] || BA_ACTION_TONES.save);
              const hasDetail = changes.length > 0 || Boolean(log.ipAddress);
              return (
                <li key={log.id || lIdx} className="relative pl-5 pb-3 last:pb-0">
                  {lIdx < baAuditLogs.length - 1 && <span className="absolute left-[5px] top-3 bottom-0 w-px bg-slate-200" />}
                  <span className={`absolute left-0 top-3 w-[11px] h-[11px] rounded-full ring-2 ring-slate-50 ${tone.dot}`} />
                  <details className="group bg-white border border-slate-200 rounded-[4px] open:border-[#A57C50]/40 transition">
                    <summary className={`block list-none p-2.5 space-y-1 [&::-webkit-details-marker]:hidden ${hasDetail ? "cursor-pointer" : "cursor-default pointer-events-none"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-1.5 py-0.5 rounded-[3px] text-[9px] font-black uppercase tracking-wide border whitespace-nowrap ${tone.badge}`}>{actionLabel}</span>
                        {hasDetail && (
                          <span className="text-[10px] font-bold text-slate-500 group-open:text-[#A57C50] shrink-0 flex items-center gap-0.5">
                            {isSync ? (log.after?.status || "Detail") : changes.length > 0 ? `${changes.length} perubahan` : "Detail"} <ChevronDown size={11} className="transition group-open:rotate-180" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0 text-[10px] text-slate-500">
                        <span className="font-bold text-slate-900 text-[11px] truncate" title={log.user}>{log.user || "System"}</span>
                        <span className="shrink-0">·</span>
                        <span className="font-mono shrink-0">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-"}
                        </span>
                      </div>
                    </summary>
                    {hasDetail && (
                      <div className="px-2.5 pb-2.5 pt-2 border-t border-slate-100 space-y-1.5">
                        {changes.length > 0 && (
                          <ul className="space-y-1 text-[10.5px] text-slate-700">
                            {changes.map((line, i) => <li key={i} className="break-words pl-2 border-l-2 border-slate-200">{line}</li>)}
                          </ul>
                        )}
                        {log.ipAddress && <p className="text-[9.5px] font-mono text-slate-400">IP {log.ipAddress}</p>}
                      </div>
                    )}
                  </details>
                </li>
              );
            })
          ) : (
            generateAuditTimeline("ba", formData).map((step: any, i: number, arr: any[]) => (
              <li key={step.step} className="relative pl-5 pb-3 last:pb-0">
                {i < arr.length - 1 && <span className="absolute left-[5px] top-3 bottom-0 w-px bg-slate-200" />}
                <span className="absolute left-0 top-3 w-[11px] h-[11px] rounded-full ring-2 ring-slate-50 bg-slate-400" />
                <div className="p-2.5 bg-white border border-slate-200 rounded-[4px] space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 text-[11px] truncate">{step.user}</span>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0">{step.time}</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{step.desc}</p>
                </div>
              </li>
            ))
          )}
        </ol>
      </div>
    </div>
  );
}
