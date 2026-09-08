import React from "react";
import { FileCheck } from "lucide-react";
import { formatIDR, MonthPickerInput, generateInvoiceNumber } from "../helpers";

interface InvoiceHeaderFormProps {
  formData: any;
  setFormData: (data: any) => void;
  baRows: any[];
  invoiceRows: any[];
  handleBASelect: (baNumber: string) => void;
  handleCompanySelect: (code: string) => void;
}

export function InvoiceHeaderForm({
  formData,
  setFormData,
  baRows,
  invoiceRows,
  handleBASelect,
  handleCompanySelect,
}: InvoiceHeaderFormProps) {
  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5">
      {/* ZONA 1: PROMINENT BA REFERENCE BAR */}
      <div className="bg-cyan-50/70 border border-cyan-200 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <label className="text-xs font-black text-cyan-950 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
          <FileCheck size={16} className="text-cyan-800" /> Referensi Berita Acara (BA):
        </label>
        <select
          className="bg-white border border-cyan-300 font-bold text-slate-900 text-xs px-3 py-2 rounded-lg focus:border-cyan-700 outline-none flex-1 w-full shadow-2xs cursor-pointer"
          value={formData.baNoReference || ""}
          onChange={(e) => handleBASelect(e.target.value)}
        >
          <option value="">-- Tanpa Referensi BA (Input Manual) --</option>
          {baRows.map((ba: any) => (
            <option key={ba.id} value={ba.baNumber}>
              {ba.baNumber} — Client: {ba.customerCode} — Periode: {ba.workPeriod || "-"} (
              {formatIDR(ba.workAmount || 0)}) [{ba.statusBA || "Submit"}]
            </option>
          ))}
        </select>
      </div>

      {/* ZONA 2: 2-Column Info Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs bg-white p-3.5 rounded-xl border border-slate-200">
        {/* Left Column */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-3">
            <span className="w-28 text-slate-600 font-bold shrink-0">Site / Customer:</span>
            <select
              className="bg-slate-50 hover:bg-white border border-slate-300 font-black text-slate-900 text-xs px-2.5 py-1.5 rounded-lg focus:border-cyan-700 outline-none flex-1 w-full transition cursor-pointer"
              value={formData.customerCode || "POS"}
              onChange={(e) => handleCompanySelect(e.target.value)}
            >
              <option value="BGG">BGG — PT Budi Gema Gempita</option>
              <option value="POS">POS — PT Position</option>
              <option value="SBS">SBS — PT Satria Bahana Sarana</option>
              <option value="PTRO">PTRO — PT Petrosea</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="w-28 text-slate-600 font-bold shrink-0">Kontraktor:</span>
            <span className="font-extrabold text-slate-800 px-2.5 py-1 bg-slate-100/80 rounded-lg border border-slate-200 flex-1">
              PT. ANDALAN ARTHA PRIMANUSA
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="w-28 text-slate-600 font-bold shrink-0">Project Site:</span>
            <input
              className="bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 font-bold text-slate-800 text-xs px-2.5 py-1.5 rounded-lg outline-none flex-1 w-full transition"
              value={formData.projectSite || ""}
              onChange={(e) => setFormData({ ...formData, projectSite: e.target.value })}
              placeholder="Otomatis terisi dari Master Customer / BA"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="w-28 text-slate-600 font-bold shrink-0">Period Covered:</span>
            <div className="flex-1 w-full">
              <MonthPickerInput
                value={formData.workPeriod || ""}
                onChange={(newPeriod: string) => {
                  const newInvNo = generateInvoiceNumber(
                    formData.customerCode || "POS",
                    newPeriod,
                    invoiceRows.length
                  );
                  setFormData({
                    ...formData,
                    workPeriod: newPeriod,
                    invoiceNo: newInvNo,
                  });
                }}
                format="short"
                className="bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 font-bold text-slate-900 text-xs px-2.5 py-1.5 rounded-lg focus:border-cyan-700 outline-none w-full transition"
              />
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-3">
            <span className="w-28 text-slate-600 font-bold shrink-0">Invoice No.:</span>
            <input
              className="bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 font-mono font-black text-slate-900 text-xs px-2.5 py-1.5 rounded-lg focus:border-cyan-700 outline-none flex-1 w-full transition"
              placeholder="003/POS-AAP/RF/VI/2026"
              value={formData.invoiceNo || ""}
              onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
              required
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="w-28 text-slate-600 font-bold shrink-0">Activity Group:</span>
            <input
              className="bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 font-bold text-slate-900 text-xs px-2.5 py-1.5 rounded-lg focus:border-cyan-700 outline-none flex-1 w-full transition"
              value={formData.activityGroup || "OPERATION & MINING"}
              onChange={(e) => setFormData({ ...formData, activityGroup: e.target.value })}
              placeholder="OPERATION & MINING"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="w-28 text-slate-600 font-bold shrink-0">PO Number:</span>
            <input
              className="bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 font-bold text-slate-900 text-xs px-2.5 py-1.5 rounded-lg focus:border-cyan-700 outline-none flex-1 w-full transition font-mono"
              placeholder="PO-POS-2026-001"
              value={formData.noPO || formData.poNumber || ""}
              onChange={(e) =>
                setFormData({ ...formData, noPO: e.target.value, poNumber: e.target.value })
              }
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="w-28 text-slate-600 font-bold shrink-0">Contract No:</span>
            <input
              className="bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 font-bold text-slate-800 text-xs px-2.5 py-1.5 rounded-lg outline-none flex-1 w-full transition font-mono"
              placeholder="Otomatis terisi dari Master Customer / BA"
              value={formData.contractNo || ""}
              onChange={(e) => setFormData({ ...formData, contractNo: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
