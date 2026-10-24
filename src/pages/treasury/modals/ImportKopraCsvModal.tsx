import React, { useState } from "react";
import { AlertCircle, CheckCircle2, FileText, Upload, X } from "lucide-react";
import type { useTreasuryController } from "../useTreasuryController";

import { api } from "../../../lib/api";

type Props = {
  c: ReturnType<typeof useTreasuryController>;
};

export function ImportKopraCsvModal({ c }: Props) {
  const { showImportKopraCsvModal, setShowImportKopraCsvModal, companyBanks, refreshAll } = c;

  const [companyBankId, setCompanyBankId] = useState<number>(companyBanks[0]?.id || 1);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!showImportKopraCsvModal) return null;

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
      formData.append("companyBankId", String(companyBankId));

      const res = await api<{ success: boolean; importedCount: number; message: string }>(
        "/api/treasury/reconciliation/import-csv",
        {
          method: "POST",
          body: formData,
        }
      );

      setStatusMsg({
        type: "success",
        text: res.message || `Berhasil mengimpor ${res.importedCount} baris mutasi bank`,
      });
      refreshAll();
      setTimeout(() => {
        setShowImportKopraCsvModal(false);
        setFile(null);
        setStatusMsg(null);
      }, 1500);
    } catch (e: any) {
      setStatusMsg({
        type: "error",
        text: e.message || "Terjadi kesalahan saat upload CSV",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="max-h-[90dvh] overflow-y-auto bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-lg">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" /> Import Mutasi Rekening CSV Kopra Mandiri
          </h3>
          <button
            onClick={() => setShowImportKopraCsvModal(false)}
            className="text-slate-400 hover:text-slate-600 rounded p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Pilih Rekening Bank Perusahaan Sumber Mutasi:
            </label>
            <select
              value={companyBankId}
              onChange={(e) => setCompanyBankId(Number(e.target.value))}
              className="w-full p-2 border border-slate-300 rounded font-semibold text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              {companyBanks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.bankName} - {b.accountNumber}
                </option>
              ))}
            </select>
          </div>

          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-emerald-500 transition cursor-pointer relative bg-slate-50">
            <input
              type="file"
              accept=".csv, .txt"
              onChange={onFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Upload className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            {file ? (
              <div className="font-semibold text-slate-800 text-sm">{file.name}</div>
            ) : (
              <div>
                <div className="font-semibold text-slate-700">Klik atau drag &amp; drop file CSV mutasi ke sini</div>
                <div className="text-slate-400 text-[11px] mt-0.5">Format .csv dari Kopra Mandiri</div>
              </div>
            )}
          </div>

          {statusMsg && (
            <div
              className={`p-3 rounded text-xs flex items-center gap-2 ${
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
              <span>{statusMsg.text}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              onClick={() => setShowImportKopraCsvModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded"
            >
              Batal
            </button>
            <button
              disabled={!file || uploading}
              onClick={handleUpload}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded shadow-md transition ${
                file && !uploading
                  ? "bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                  : "bg-slate-300 cursor-not-allowed"
              }`}
            >
              <Upload className="w-4 h-4" /> {uploading ? "Mengunggah Mutasi..." : "Import Mutasi"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
