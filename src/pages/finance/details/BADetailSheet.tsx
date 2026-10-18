import React from "react";
import { Archive, ExternalLink, CheckCircle2, Zap, FileText, Upload, CheckCircle } from "lucide-react";
import { formatIDR, renderBAStatusBadge, getBAInvoiceStatus, resolveDocumentUrl, isBAApproved } from "../helpers";

interface BADetailSheetProps {
  data: any;
  invoiceRows: any[];
  createInvoiceFromBA?: (item: any) => void;
  setDetailViewItem: (item: any) => void;
}

export const BADetailSheet: React.FC<BADetailSheetProps> = ({
  data,
  invoiceRows,
  createInvoiceFromBA,
  setDetailViewItem
}) => {
  const baInvStatus = getBAInvoiceStatus(data, invoiceRows);
  const linkedNo = (data.invoiceNoLinked || "").trim();
  const isLinked = Boolean(linkedNo && linkedNo !== "-") || baInvStatus.isFullyInvoiced;

  return (
    <div className="space-y-4">
      {/* Quick 1-Click Invoice Callout if Ready or Linked */}
      {isLinked ? (
        <div className="bg-[#A57C50]/5 border border-[#A57C50]/20 rounded-[4px] p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Archive size={16} className="text-[#A57C50] shrink-0" />
            <span className="text-xs font-black text-[#1A1612]">
              Arsip: Telah Terbit Invoice #{linkedNo || baInvStatus.createdInvoices[0]?.invoiceNo || "Terbit"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              const displayInvNo = linkedNo || baInvStatus.createdInvoices[0]?.invoiceNo || "Terbit";
              const targetInv = baInvStatus.createdInvoices[0] || invoiceRows.find((inv: any) => inv.invoiceNo === displayInvNo || inv.baNoReference === data.baNumber || inv.baID === data.id);
              if (targetInv) {
                setDetailViewItem({ type: "invoice", data: targetInv });
              } else {
                alert(`Invoice #${displayInvNo} telah resmi diterbitkan.`);
              }
            }}
            className="px-3 py-1.5 bg-[#A57C50] hover:bg-[#8e6941] text-white font-bold text-xs rounded-[3px] shadow-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
          >
            <ExternalLink size={12} />
            <span>Lihat Invoice</span>
          </button>
        </div>
      ) : isBAApproved(data) ? (
        <div className="bg-[#A57C50]/5 border border-[#A57C50]/20 rounded-[4px] p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={16} className="text-[#A57C50] shrink-0" />
            <span className="text-xs font-black text-[#1A1612]">
              BA Disetujui Manager — Siap Diterbitkan Invoice
            </span>
          </div>
          <button
            type="button"
            onClick={() => createInvoiceFromBA?.(data)}
            className={`px-3 py-1.5 bg-[#A57C50] hover:bg-[#8e6941] text-white font-bold text-xs rounded-[3px] shadow-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 ${createInvoiceFromBA ? "" : "hidden"}`}
          >
            <Zap size={13} className="text-white" />
            <span>+ Terbitkan Invoice</span>
          </button>
        </div>
      ) : null}

      <div className="p-4 bg-slate-50 border border-slate-200 rounded-[4px] space-y-3 text-xs text-slate-800">
        <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
          <div><span className="text-slate-500 block font-bold">No. BA:</span> <strong className="text-sm font-mono text-[#1A1612]">{data.baNumber}</strong></div>
          <div><span className="text-slate-500 block font-bold">Customer Code:</span> <strong className="text-sm text-slate-900">{data.customerCode}</strong></div>
          <div><span className="text-slate-500 block font-bold">Periode Pekerjaan:</span> <strong className="text-slate-800">{data.workPeriod || "-"}</strong></div>
          <div><span className="text-slate-500 block font-bold">PIC AAP:</span> <strong className="text-slate-800">{data.picAAP || "-"}</strong></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-3 border-b border-slate-200 text-[11px]">
          <div><span className="text-slate-500 block font-bold">Tgl Routing Internal:</span> <strong>{data.internalRoutingDate ? new Date(data.internalRoutingDate).toLocaleDateString("id-ID") : "-"}</strong></div>
          <div><span className="text-slate-500 block font-bold">Tgl BA Diajukan:</span> <strong>{data.baSubmittedDate ? new Date(data.baSubmittedDate).toLocaleDateString("id-ID") : "-"}</strong></div>
          <div><span className="text-slate-500 block font-bold">Tgl BA Dikirim:</span> <strong>{data.baSentDate ? new Date(data.baSentDate).toLocaleDateString("id-ID") : "-"}</strong></div>
          <div><span className="text-slate-500 block font-bold">Tgl TTD BA:</span> <strong>{data.baSignedDate ? new Date(data.baSignedDate).toLocaleDateString("id-ID") : "-"}</strong></div>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded-[4px]">
          <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Nominal Pekerjaan (Nilai Klaim BA)</span>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-xl font-black text-[#1A1612] font-mono">{formatIDR(data.workAmount || 0)}</span>
            {data.initialWorkAmount && data.adjustedWorkAmount && data.initialWorkAmount !== data.adjustedWorkAmount && (() => {
              const diffVal = data.adjustedWorkAmount - data.initialWorkAmount;
              const devPct = data.initialWorkAmount > 0 ? (Math.abs(diffVal) / data.initialWorkAmount) * 100 : 0;
              return (
                <span className={`text-xs font-mono font-bold ${diffVal >= 0 ? "text-[#A57C50]" : "text-rose-700"}`}>
                  ({diffVal >= 0 ? `+${formatIDR(diffVal)}` : `-${formatIDR(Math.abs(diffVal))}`} Survey {devPct > 3.0 ? `| ⚠️ Deviasi ${devPct.toFixed(1)}%` : ""})
                </span>
              );
            })()}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pb-2">
          <div><span className="text-slate-500 block font-bold">Lead Time Approval:</span> <strong className="text-[#A57C50] font-extrabold text-sm">{data.leadTimeDays || 0} Hari</strong></div>
          <div><span className="text-slate-500 block font-bold mb-1">Status BA:</span> {renderBAStatusBadge(data.statusBA, data.invoiceNoLinked, undefined, data, invoiceRows)}</div>
        </div>
        <div>
          <span className="text-slate-500 block font-bold">Bottleneck & Notes:</span>
          <p className="text-amber-800 font-bold mt-0.5">{data.notesBottleneck}</p>
          <p className="text-slate-600 text-xs mt-0.5">{data.notes}</p>
        </div>
      </div>

      {/* PDF PREVIEW CONTAINER SECTION */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h5 className="text-xs font-black uppercase text-[#1A1612] tracking-wider flex items-center gap-1.5">
            <FileText size={15} className="text-[#A57C50]" /> Pratinjau Dokumen PDF (Draft & Final BA)
          </h5>
        </div>

        {/* Draft BA Preview Card */}
        <div className="p-3 bg-[#1A1612] text-white rounded-[4px] space-y-2.5 shadow-xs border border-stone-800">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-amber-100 flex items-center gap-1.5">
              <Upload size={14} className="text-[#A57C50]" /> Draft BA PDF Document
            </span>
            {data.draftBAPath ? (
              <a
                href={resolveDocumentUrl(data.draftBAPath)}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] px-2.5 py-1 rounded-[3px] bg-[#A57C50] hover:bg-[#8e6941] text-white font-bold inline-flex items-center gap-1 transition shadow-xs"
              >
                <ExternalLink size={12} /> Buka PDF Tab Baru
              </a>
            ) : (
              <span className="text-[11px] text-stone-400 italic">Belum Diunggah</span>
            )}
          </div>
          {data.draftBAPath ? (
            <div className="p-3.5 bg-stone-900 rounded-[3px] border border-stone-800 flex items-center gap-3">
              <div className="p-2.5 bg-[#1A1612] border border-[#A57C50]/40 rounded-[3px] text-[#A57C50] shrink-0">
                <FileText size={22} />
              </div>
              <div className="min-w-0 flex-1 text-xs">
                <span className="font-mono font-bold text-stone-200 block truncate">
                  {data.draftBARefNo ? `Draft-${data.draftBARefNo.replace(/\//g, '_')}.pdf` : data.draftBAPath.split('/').pop() || "draft_berita_acara.pdf"}
                </span>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-400">
                  <span>Site: <strong className="text-[#A57C50]">{data.customerCode || "POS"}</strong></span>
                  <span>•</span>
                  <span>Routing: <strong className="text-stone-300">{data.internalRoutingDate || "Tercatat"}</strong></span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-stone-400 bg-stone-900 rounded-[3px] border border-dashed border-stone-800">
              Draft BA PDF belum diunggah saat entri baru.
            </div>
          )}
        </div>

        {/* Final BA Preview Card */}
        <div className="p-3 bg-[#1A1612] text-white rounded-[4px] space-y-2.5 shadow-xs border border-stone-800">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-amber-100 flex items-center gap-1.5">
              <CheckCircle size={14} className="text-[#A57C50]" /> Final Signed BA PDF Document
            </span>
            {data.finalBAPath ? (
              <a
                href={resolveDocumentUrl(data.finalBAPath)}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] px-2.5 py-1 rounded-[3px] bg-[#A57C50] hover:bg-[#8e6941] text-white font-bold inline-flex items-center gap-1 transition shadow-xs"
              >
                <ExternalLink size={12} /> Buka PDF Tab Baru
              </a>
            ) : (
              <span className="text-[11px] text-stone-400 italic">Belum Diunggah (Edit untuk upload)</span>
            )}
          </div>
          {data.finalBAPath ? (
            <div className="p-3.5 bg-stone-900 rounded-[3px] border border-stone-800 flex items-center gap-3">
              <div className="p-2.5 bg-[#1A1612] border border-[#A57C50]/40 rounded-[3px] text-[#A57C50] shrink-0">
                <CheckCircle size={22} />
              </div>
              <div className="min-w-0 flex-1 text-xs">
                <span className="font-mono font-bold text-stone-200 block truncate">
                  {data.signedBANumber ? `Signed-${data.signedBANumber.replace(/\//g, '_')}.pdf` : data.baNumber ? `BA-${data.baNumber.replace(/\//g, '_')}.pdf` : data.finalBAPath.split('/').pop() || "signed_berita_acara.pdf"}
                </span>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-400">
                  <span>TTD: <strong className="text-[#A57C50]">{data.baSignedDate || "Selesai"}</strong></span>
                  <span>•</span>
                  <span className="text-amber-200 font-bold">Terverifikasi & Sah ✓</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-stone-400 bg-stone-900 rounded-[3px] border border-dashed border-stone-800">
              Final BA Signed PDF dapat diunggah saat mengedit status BA ke Approved.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
