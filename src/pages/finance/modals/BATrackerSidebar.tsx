import React from "react";
import { FileText, CheckCircle, ExternalLink, ShieldCheck, History, X, Clock, Upload } from "lucide-react";
import { isRentalBA, calcIDR } from "../ba_calculations";
import type { BACalc } from "../../../types";
import { formatIDR, resolveDocumentUrl, renderBAStatusBadge, generateAuditTimeline, isBAApproved } from "../helpers";

const BA_FIELD_LABELS: Record<string, string> = {
  baNumber: "No. BA", draftBARefNo: "No. Ref Draft", signedBANumber: "No. BA Signed",
  customerCode: "Customer", workPeriod: "Periode", picAAP: "PIC Site",
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
  save: "Simpan", verify: "Verifikasi", approve: "Approval", update_notes: "Update Catatan", delete: "Hapus", generate_invoice: "Generate Invoice",
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

interface BATrackerSidebarProps {
  formData: any;
  editItem: any;
  invoiceRows: any[];
  calc?: BACalc;
  auditTab: "flow" | "activity";
  setAuditTab: (tab: "flow" | "activity") => void;
  baAuditLogs: any[];
  isInlineEditingBA?: boolean;
  handleFileUpload?: (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => void;
}

export function BATrackerSidebar({
  formData,
  editItem,
  invoiceRows,
  calc,
  auditTab,
  setAuditTab,
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

      {/* AUDIT & WORKFLOW INTELLIGENCE (2 TABS: FLOW & ACTIVITY) */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-[4px] space-y-3">
        {/* Tab Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-[3px] text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setAuditTab("flow")}
              className={`px-2.5 py-1 rounded-[3px] transition flex items-center gap-1 cursor-pointer ${auditTab === "flow" ? "bg-white text-[#A57C50] shadow-xs font-black" : "text-slate-600 hover:text-slate-900"}`}
            >
              <ShieldCheck size={12} />
              <span>Flow Alur</span>
            </button>
            <button
              type="button"
              onClick={() => setAuditTab("activity")}
              className={`px-2.5 py-1 rounded-[3px] transition flex items-center gap-1 cursor-pointer ${auditTab === "activity" ? "bg-white text-[#A57C50] shadow-xs font-black" : "text-slate-600 hover:text-slate-900"}`}
            >
              <History size={12} />
              <span>Activity Log</span>
            </button>
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-500">Live Audit</span>
        </div>

        {/* TAB 1: FLOW ALUR */}
        {auditTab === "flow" && (
          <div className="space-y-2.5 text-xs">
            <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] flex items-center justify-center font-black">1</span>
                  <span>Draft BA Dibuat</span>
                </div>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  {formData.baSubmittedDate ? new Date(formData.baSubmittedDate).toLocaleDateString("id-ID") : "Tercatat"}
                </span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Dibuat oleh <strong>{formData.picAAP || "Operations / Site Engineer"}</strong> ({calcIDR(calc?.total.gross)}).
              </p>
            </div>

            <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-black ${formData.verifiedBy ? "bg-emerald-100 text-emerald-800" : formData.statusBA === "Revisi" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>2</span>
                  <span>Verifikasi Finance Supervisor</span>
                </div>
                {formData.verifiedBy ? (
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-0.5">
                    <CheckCircle size={10} /> Terverifikasi
                  </span>
                ) : formData.statusBA === "Revisi" ? (
                  <span className="text-[10px] text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 flex items-center gap-0.5">
                    <X size={10} /> Revisi
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-0.5">
                    <Clock size={10} /> Menunggu
                  </span>
                )}
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                {formData.verifiedBy ? `Volume & nilai klaim diverifikasi oleh ${formData.verifiedBy}.` : "Menunggu verifikasi keabsahan volume bersama oleh Finance Supervisor."}
              </p>
            </div>

            <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-black ${formData.invoiceNoLinked ? "bg-purple-100 text-purple-800" : isBAApproved(formData) ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>3</span>
                  <span>Invoice & Approval FATB</span>
                </div>
                {formData.invoiceNoLinked ? (
                  <span className="text-[10px] text-purple-800 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                    #{formData.invoiceNoLinked}
                  </span>
                ) : isBAApproved(formData) ? (
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    Siap Terbit
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    Menunggu BA
                  </span>
                )}
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                {formData.invoiceNoLinked
                  ? `Invoice #${formData.invoiceNoLinked} telah diterbitkan dan diajukan ke FATB Manager.`
                  : isBAApproved(formData)
                  ? "BA telah diverifikasi Finance Specialist dan disetujui Manager. Finance Site dapat men-generate invoice."
                  : formData.verifiedBy ? "Menunggu approval Manager atas BA sebelum invoice dapat digenerate." : "Invoice akan digenerate oleh Finance site setelah BA diverifikasi Finance Specialist dan disetujui Manager."}
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: ACTIVITY LOG */}
        {auditTab === "activity" && (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1 text-xs">
            {baAuditLogs.length > 0 ? (
              baAuditLogs.map((log: any, lIdx: number) => {
                const changes = diffBASnapshots(log.before, log.after);
                const actionLabel = log.action === "save" && !log.before ? "Buat BA" : (BA_ACTION_LABELS[log.action] || log.action || "Activity");
                return (
                  <details key={log.id || lIdx} className="group p-2.5 bg-white border border-slate-200 rounded-xl">
                    <summary className="list-none cursor-pointer space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 text-[11px] truncate">{log.user || "System"}</span>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0">{log.createdAt ? new Date(log.createdAt).toLocaleString("id-ID") : "-"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-cyan-50 text-cyan-800 border border-cyan-200">
                          {actionLabel}
                        </span>
                        <span className="text-[10px] text-slate-500 group-open:text-[#A57C50]">
                          {changes.length > 0 ? `${changes.length} perubahan ▾` : "Lihat detail ▾"}
                        </span>
                      </div>
                    </summary>
                    <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                      {changes.length > 0 ? (
                        <ul className="space-y-0.5 text-[10.5px] text-slate-700">
                          {changes.map((line, i) => <li key={i} className="break-words">• {line}</li>)}
                        </ul>
                      ) : (
                        <p className="text-[10.5px] text-slate-500 italic">Tidak ada perubahan data yang tercatat.</p>
                      )}
                      {log.ipAddress && <p className="text-[9.5px] font-mono text-slate-400">IP: {log.ipAddress}</p>}
                    </div>
                  </details>
                );
              })
            ) : (
              generateAuditTimeline("ba", formData).map((step: any) => (
                <div key={step.step} className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-[11px]">{step.user}</span>
                    <span className="text-[10px] font-mono text-slate-500">{step.time}</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{step.desc}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
