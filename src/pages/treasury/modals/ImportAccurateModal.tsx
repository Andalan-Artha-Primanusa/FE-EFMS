import React, { useState } from "react";
import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, RefreshCw, Upload, X } from "lucide-react";
import type { useTreasuryController } from "../useTreasuryController";

import { api } from "../../../lib/api";

type Props = {
  c: ReturnType<typeof useTreasuryController>;
};

export function ImportAccurateModal({ c }: Props) {
  const { showImportAccurateModal, setShowImportAccurateModal, refreshAll } = c;
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!showImportAccurateModal) return null;

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatusMsg(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setStatusMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await api<{ success: boolean; importedCount: number; message: string }>(
        "/api/treasury/invoices/import-accurate",
        {
          method: "POST",
          body: formData,
        }
      );

      setStatusMsg({
        type: "success",
        text: res.message || `Berhasil mengganti data dengan ${res.importedCount} tagihan baru`,
      });
      refreshAll();
      setTimeout(() => {
        setShowImportAccurateModal(false);
        setFile(null);
        setStatusMsg(null);
      }, 1500);
    } catch (e: any) {
      setStatusMsg({
        type: "error",
        text: e.message || "Terjadi kesalahan saat upload",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="max-h-[90dvh] overflow-y-auto bg-white rounded-[4px] shadow-2xl border border-amber-900/30 w-full max-w-lg flex flex-col">
        {/* Enterprise AAP Brand Ink Header */}
        <div className="bg-[#1A1612] px-5 py-3.5 border-b border-amber-900/30 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-2.5 tracking-wide uppercase">
            <FileSpreadsheet className="w-4 h-4 text-[#A57C50]" />
            <span>Import &amp; Replace Tagihan Accurate (.xlsx)</span>
          </h3>
          <button
            onClick={() => setShowImportAccurateModal(false)}
            className="text-stone-400 hover:text-white rounded-[3px] p-1 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Notice: Clean Replace */}
          <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-[3px] text-amber-900 flex items-start gap-2.5 leading-relaxed">
            <RefreshCw className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Mode Clean Replace:</span> Setiap import file baru akan <strong>menghapus data tagihan sebelumnya</strong> dan menggantikannya secara menyeluruh dengan data tagihan terbaru dari file Excel ini.
            </div>
          </div>

          <p className="text-slate-600 leading-relaxed">
            Format yang didukung: File ekspor <strong>Rincian Faktur Pembelian</strong> Accurate ERP atau workbook <strong>AP Aging Plan Payment</strong> (sheet <code>IMPORT ACCURATE</code>). Sistem otomatis mengagregasikan rincian item ke nomor invoice, memetakan site &amp; rekening vendor, dan menghitung aging jatuh tempo.
          </p>

          <div className="border-2 border-dashed border-slate-300 rounded-[4px] p-6 text-center hover:border-[#A57C50] transition cursor-pointer relative bg-slate-50/60 group">
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={onFileChange}
              disabled={uploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <Upload className="w-8 h-8 text-[#A57C50] mx-auto mb-2 group-hover:scale-110 transition-transform" />
            {file ? (
              <div>
                <div className="font-bold text-slate-800 text-sm">{file.name}</div>
                <div className="text-emerald-700 text-[11px] mt-0.5 font-medium">File siap diimpor (klik tombol &quot;Mulai Import &amp; Replace&quot;)</div>
              </div>
            ) : (
              <div>
                <div className="font-semibold text-slate-700">Klik atau seret (drag &amp; drop) file Excel ke sini</div>
                <div className="text-slate-400 text-[11px] mt-0.5">Format file .xlsx atau .xls</div>
              </div>
            )}
          </div>

          {statusMsg && (
            <div
              className={`p-3 rounded-[3px] text-xs flex items-center gap-2 ${
                statusMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {statusMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-medium">{statusMsg.text}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              onClick={() => setShowImportAccurateModal(false)}
              disabled={uploading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-[3px] transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              disabled={!file || uploading}
              onClick={handleUpload}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-[3px] shadow-sm transition ${
                file && !uploading
                  ? "bg-[#A57C50] hover:bg-[#8e6941] cursor-pointer"
                  : "bg-slate-300 cursor-not-allowed text-slate-500"
              }`}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" /> Mengimpor &amp; Menimpa Data...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Mulai Import &amp; Replace
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
