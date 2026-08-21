import React, { useState, useEffect } from "react";
import {
  Layers, Calculator, UserCheck, Pickaxe, Scale, Plus, Trash2, X,
  FileText, Upload, CheckCircle2, ChevronDown, Eye, Edit2, ShieldCheck,
  AlertTriangle, History, ExternalLink, User, DollarSign
} from "lucide-react";
import { formatIDR, formatDateInput } from "../../../utils/finance/formatters";
import { RupiahInput } from "../shared/RupiahInput";
import {
  isDistanceItem, getBAEffectiveVolume, getBAItemSubtotal, getSowMasterRate
} from "./BAInvoiceHelpers";
import {
  defaultPOSBAOperatingItems, defaultPOSBAMDOItems, defaultBGGBAItems
} from "../invoice/InvoiceLineItemTemplates";
import { useFinanceMasterData } from "../../../hooks/useFinanceMasterData";
import { AuditTimeline, generateAuditTimeline, generateUserActivityLogs } from "../shared/AuditTimeline";
import { uploadDocumentFile, API_BASE, type User as UserType } from "../../../lib/api";

const resolveDocumentUrl = (path: string | undefined | null) => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:")) {
    return path;
  }
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
};

interface BAModalFormProps {
  isOpen: boolean;
  editItem: any | null;
  initialEditMode?: boolean;
  onClose: () => void;
  onSaved: () => void;
  onNotice: (msg: string) => void;
  user?: UserType;
  realAuditLogs?: any[];
}

export function BAModalForm({
  isOpen,
  editItem,
  initialEditMode = true,
  onClose,
  onSaved,
  onNotice,
  user,
  realAuditLogs = []
}: BAModalFormProps) {
  if (!isOpen) return null;

  const [isInlineEditingBA, setIsInlineEditingBA] = useState(initialEditMode || !editItem);
  const [activeBAStep, setActiveBAStep] = useState<number>(1);
  const [baSidebarTab, setBaSidebarTab] = useState<"approval" | "activity">("approval");
  const [showAddRowDropdown, setShowAddRowDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const masterData = useFinanceMasterData();

  const [formData, setFormData] = useState<any>({
    customerCode: "POS",
    workPeriod: "Juni 2026",
    baNumber: "",
    statusBA: "Submit",
    picAAP: "Operations / Site Engineer",
    baSubmittedDate: new Date().toISOString().slice(0, 10),
    baSignedDate: "",
    notes: "",
    notesBottleneck: "",
    draftBAPath: "",
    finalBAPath: "",
  });

  const [baOperatingItems, setBaOperatingItems] = useState<any[]>([]);
  const [baMDOItems, setBaMDOItems] = useState<any[]>([]);

  useEffect(() => {
    if (editItem) {
      setFormData({
        ...editItem,
        workEndDate: formatDateInput(editItem.workEndDate),
        baSubmittedDate: formatDateInput(editItem.baSubmittedDate),
        baSignedDate: formatDateInput(editItem.baSignedDate),
      });

      const isBGG = editItem.customerCode === "BGG" || editItem.customerCode === "PT BGG";
      if (editItem.items && editItem.items.length > 0) {
        const ops = editItem.items.filter((i: any) => i.category === "Operating & Mining" || i.category === "Over Distance" || i.category === "Mining");
        const mdo = editItem.items.filter((i: any) => i.category === "MDO");
        setBaOperatingItems(ops.length > 0 ? ops : (isBGG ? defaultBGGBAItems : defaultPOSBAOperatingItems));
        setBaMDOItems(mdo.length > 0 ? mdo : (isBGG ? [] : defaultPOSBAMDOItems));
      } else {
        setBaOperatingItems(isBGG ? defaultBGGBAItems : defaultPOSBAOperatingItems);
        setBaMDOItems(isBGG ? [] : defaultPOSBAMDOItems);
      }
    } else {
      const todayStr = new Date().toISOString().slice(0, 10);
      setFormData({
        customerCode: "POS",
        statusBA: "Submit",
        baSubmittedDate: todayStr,
        workPeriod: "Juni 2026",
        picAAP: "Operations / Site Engineer",
        baNumber: `BA-POS-${Date.now().toString().slice(-4)}`,
        workAmount: 0
      });
      setBaOperatingItems(defaultPOSBAOperatingItems);
      setBaMDOItems(defaultPOSBAMDOItems);
    }
  }, [editItem]);

  const isCustomerBGG = (formData.customerCode === "BGG" || formData.customerCode === "PT BGG");
  const allBAItems = [...baOperatingItems, ...baMDOItems];
  const sumInitial = allBAItems.reduce((acc, it) => acc + getBAItemSubtotal(it, getBAEffectiveVolume(it, allBAItems, false)), 0);
  const sumAdjusted = allBAItems.reduce((acc, it) => acc + getBAItemSubtotal(it, getBAEffectiveVolume(it, allBAItems, true)), 0);
  const deltaAmount = sumAdjusted - sumInitial;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: "draftBAPath" | "finalBAPath") => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      onNotice(`Sedang mengunggah berkas ${file.name}...`);
      const res = await uploadDocumentFile(file, "ba");
      if (res && res.url) {
        setFormData((prev: any) => ({ ...prev, [fieldName]: res.url }));
        onNotice(`✅ Berkas ${file.name} berhasil diunggah.`);
      }
    } catch (err: any) {
      onNotice(err?.message || "Gagal mengunggah dokumen");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const finalItems = [...baOperatingItems, ...baMDOItems];
      const payload = {
        ...formData,
        items: finalItems,
        initialWorkAmount: sumInitial,
        adjustedWorkAmount: sumAdjusted,
        workAmount: sumAdjusted > 0 ? sumAdjusted : sumInitial
      };

      const url = editItem ? `/api/finance/ba-trackers/${editItem.id}` : "/api/finance/ba-trackers";
      const method = editItem ? "PUT" : "POST";

      const res = await fetch(url.startsWith("http") ? url : `${API_BASE}${url}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Gagal menyimpan Berita Acara");

      onNotice(editItem ? "✅ Data Berita Acara berhasil diperbarui." : "✅ Berita Acara baru berhasil dibuat.");
      onSaved();
      onClose();
    } catch (err: any) {
      onNotice(err?.message || "Gagal menyimpan BA");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-[98vw] 2xl:max-w-[1600px] shadow-2xl flex flex-col max-h-[94vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-4 bg-[#16203b] border-b border-[#1e2b4d] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#a57c50]/20 border border-[#a57c50]/40 flex items-center justify-center text-[#d5c0a4]">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                <span>{editItem ? (isInlineEditingBA ? `Edit Berita Acara: ${formData.baNumber}` : `Pratinjau Berita Acara: ${formData.baNumber}`) : "Buat Berita Acara Baru"}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#a57c50] text-white font-mono">
                  {formData.customerCode}
                </span>
              </h3>
              <p className="text-[11px] text-[#e5d7c2]">
                Siklus verifikasi volume produksi tambang & kelayakan invoice resmi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {editItem && !isInlineEditingBA && (
              <button
                type="button"
                onClick={() => setIsInlineEditingBA(true)}
                className="px-3 py-1.5 rounded-lg bg-[#a57c50] hover:bg-[#8e683e] text-white font-bold text-xs flex items-center gap-1.5 transition"
              >
                <Edit2 size={13} /> Edit Data
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            
            {/* KOLOM KIRI (xl:col-span-8 2xl:col-span-9): Stepper & Tables */}
            <div className="xl:col-span-8 2xl:col-span-9 space-y-4 border-b xl:border-b-0 xl:border-r border-slate-200 pb-6 xl:pb-0 xl:pr-6">
              
              {/* Stepper Navigation */}
              <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveBAStep(1)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg transition ${activeBAStep === 1 ? "bg-[#16203b] text-white shadow-xs font-black" : "text-slate-600 hover:bg-slate-200"}`}
                >
                  <Layers size={13} />
                  <span>1. SOW Operasi & Volume</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveBAStep(2)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg transition ${activeBAStep === 2 ? "bg-[#16203b] text-white shadow-xs font-black" : "text-slate-600 hover:bg-slate-200"}`}
                >
                  <Calculator size={13} />
                  <span>2. Survey & Delta BA</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveBAStep(3)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg transition ${activeBAStep === 3 ? "bg-[#16203b] text-white shadow-xs font-black" : "text-slate-600 hover:bg-slate-200"}`}
                >
                  <UserCheck size={13} />
                  <span>3. Tanda Tangan & Berkas</span>
                </button>
              </div>

              {/* Strip Info Customer */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                {isInlineEditingBA ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                        Customer / Project <span className="text-rose-600">*</span>
                      </label>
                      <select
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-bold focus:border-cyan-700 outline-none"
                        value={formData.customerCode || "POS"}
                        onChange={(e) => {
                          const code = e.target.value;
                          const isBGG = code === "BGG" || code === "PT BGG";
                          setFormData({ ...formData, customerCode: code });
                          if (isBGG) {
                            setBaOperatingItems(defaultBGGBAItems);
                            setBaMDOItems([]);
                          } else {
                            setBaOperatingItems(defaultPOSBAOperatingItems);
                            setBaMDOItems(defaultPOSBAMDOItems);
                          }
                        }}
                        required
                      >
                        <option value="POS">POS – PT Position / Paramitha</option>
                        <option value="SBS">SBS – PT Sumber Bara Sejahtera</option>
                        <option value="BGG">BGG – PT Budi Gema Gempita</option>
                        <option value="DBK">DBK – PT Dayabumi Kencana</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                        No. Berita Acara <span className="text-rose-600">*</span>
                      </label>
                      <input
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-mono font-bold focus:border-cyan-700 outline-none"
                        value={formData.baNumber || ""}
                        onChange={(e) => setFormData({ ...formData, baNumber: e.target.value })}
                        placeholder="BA-POS-2026-001"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                        Periode Pekerjaan <span className="text-rose-600">*</span>
                      </label>
                      <input
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 text-xs focus:border-cyan-700 outline-none"
                        value={formData.workPeriod || ""}
                        onChange={(e) => setFormData({ ...formData, workPeriod: e.target.value })}
                        placeholder="Juni 2026 / Jul-26"
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div><span className="text-slate-500 block font-bold text-[10px] uppercase">Customer</span> <strong className="text-slate-900 font-bold">{formData.customerCode || "POS"}</strong></div>
                    <div><span className="text-slate-500 block font-bold text-[10px] uppercase">No. BA</span> <strong className="text-cyan-900 font-mono font-bold">{formData.baNumber || "-"}</strong></div>
                    <div><span className="text-slate-500 block font-bold text-[10px] uppercase">Periode</span> <strong className="text-slate-800">{formData.workPeriod || "-"}</strong></div>
                    <div><span className="text-slate-500 block font-bold text-[10px] uppercase">PIC Site</span> <strong className="text-slate-800">{formData.picAAP || "-"}</strong></div>
                  </div>
                )}
              </div>

              {/* STEP 1: SOW Operasional & Volume */}
              {activeBAStep === 1 && (
                <div className="space-y-4">
                  <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-xs bg-white">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-900 text-white uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5">Deskripsi Item SOW</th>
                          <th className="p-2.5 text-center">Unit</th>
                          <th className="p-2.5 text-right">Volume Awal</th>
                          <th className="p-2.5 text-right">Tarif Satuan (Rp)</th>
                          <th className="p-2.5 text-right">Subtotal (Rp)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {baOperatingItems.map((item, idx) => {
                          const vol = Number(item.initialVolume || 0);
                          const rate = Number(item.rate || 0);
                          const subtotal = vol * rate;

                          return (
                            <tr key={item.id || idx} className="hover:bg-slate-50">
                              <td className="p-2.5 font-bold text-slate-800">
                                {isInlineEditingBA ? (
                                  <input
                                    className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs"
                                    value={item.material || item.description || ""}
                                    onChange={(e) => {
                                      const updated = [...baOperatingItems];
                                      updated[idx] = { ...updated[idx], material: e.target.value, description: e.target.value };
                                      setBaOperatingItems(updated);
                                    }}
                                  />
                                ) : (
                                  item.material || item.description
                                )}
                              </td>
                              <td className="p-2.5 text-center font-bold text-slate-600">{item.unit || "BCM"}</td>
                              <td className="p-2.5 text-right font-mono">
                                {isInlineEditingBA ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    className="w-24 bg-slate-50 border border-slate-300 rounded p-1 text-right font-bold text-xs"
                                    value={item.initialVolume === 0 ? "" : item.initialVolume}
                                    onChange={(e) => {
                                      const updated = [...baOperatingItems];
                                      updated[idx] = { ...updated[idx], initialVolume: parseFloat(e.target.value) || 0 };
                                      setBaOperatingItems(updated);
                                    }}
                                  />
                                ) : (
                                  vol.toLocaleString("id-ID")
                                )}
                              </td>
                              <td className="p-2.5 text-right font-mono">
                                {isInlineEditingBA ? (
                                  <input
                                    type="number"
                                    className="w-24 bg-slate-50 border border-slate-300 rounded p-1 text-right font-bold text-xs"
                                    value={item.rate === 0 ? "" : item.rate}
                                    onChange={(e) => {
                                      const updated = [...baOperatingItems];
                                      updated[idx] = { ...updated[idx], rate: parseFloat(e.target.value) || 0 };
                                      setBaOperatingItems(updated);
                                    }}
                                  />
                                ) : (
                                  formatIDR(rate)
                                )}
                              </td>
                              <td className="p-2.5 text-right font-mono font-black text-slate-900">
                                {formatIDR(subtotal)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300">
                        <tr>
                          <td colSpan={4} className="p-2.5 text-right uppercase text-slate-700">Total Nilai Klaim SOW:</td>
                          <td className="p-2.5 text-right font-mono text-emerald-700 font-black text-sm">{formatIDR(sumInitial)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* STEP 2: Survey & Delta BA */}
              {activeBAStep === 2 && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                    <strong>Hasil Joint Survey Lapangan:</strong> Masukkan penyesuaian volume hasil opname gabungan antara tim AAP dan Klien.
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-xs bg-white">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-900 text-white uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5">Item</th>
                          <th className="p-2.5 text-right">Vol Awal</th>
                          <th className="p-2.5 text-right">Vol Hasil Survey</th>
                          <th className="p-2.5 text-right">Selisih Vol</th>
                          <th className="p-2.5 text-right">Subtotal Survey (Rp)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {baOperatingItems.map((item, idx) => {
                          const volInit = Number(item.initialVolume || 0);
                          const volAdj = Number(item.adjustedVolume ?? item.initialVolume ?? 0);
                          const diff = volAdj - volInit;
                          const rate = Number(item.rate || 0);

                          return (
                            <tr key={item.id || idx} className="hover:bg-slate-50">
                              <td className="p-2.5 font-bold text-slate-800">{item.material || item.description}</td>
                              <td className="p-2.5 text-right font-mono text-slate-600">{volInit.toLocaleString("id-ID")}</td>
                              <td className="p-2.5 text-right font-mono">
                                {isInlineEditingBA ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    className="w-24 bg-amber-50 border border-amber-300 rounded p-1 text-right font-bold text-xs"
                                    value={item.adjustedVolume === 0 ? "" : (item.adjustedVolume ?? item.initialVolume ?? "")}
                                    onChange={(e) => {
                                      const updated = [...baOperatingItems];
                                      updated[idx] = { ...updated[idx], adjustedVolume: parseFloat(e.target.value) || 0 };
                                      setBaOperatingItems(updated);
                                    }}
                                  />
                                ) : (
                                  volAdj.toLocaleString("id-ID")
                                )}
                              </td>
                              <td className={`p-2.5 text-right font-mono font-bold ${diff >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                                {diff >= 0 ? `+${diff.toLocaleString("id-ID")}` : diff.toLocaleString("id-ID")}
                              </td>
                              <td className="p-2.5 text-right font-mono font-black text-slate-900">
                                {formatIDR(volAdj * rate)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300">
                        <tr>
                          <td colSpan={4} className="p-2.5 text-right uppercase text-slate-700">Total Setelah Survey:</td>
                          <td className="p-2.5 text-right font-mono text-emerald-700 font-black text-sm">{formatIDR(sumAdjusted)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* STEP 3: Tanda Tangan & Berkas PDF */}
              {activeBAStep === 3 && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <label className="font-bold text-slate-800 block flex items-center gap-1.5">
                        <FileText size={15} className="text-cyan-700" /> Berkas Draft BA (PDF)
                      </label>
                      {formData.draftBAPath ? (
                        <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                          <a href={resolveDocumentUrl(formData.draftBAPath)} target="_blank" rel="noreferrer" className="text-cyan-800 font-bold hover:underline truncate">
                            {formData.draftBAPath.split("/").pop()}
                          </a>
                          <span className="text-emerald-600 font-bold text-[10px]">Tersedia ✓</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic block">Belum ada dokumen draft diunggah.</span>
                      )}
                      {isInlineEditingBA && (
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          className="mt-2 text-xs"
                          onChange={(e) => handleFileUpload(e, "draftBAPath")}
                        />
                      )}
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <label className="font-bold text-slate-800 block flex items-center gap-1.5">
                        <CheckCircle2 size={15} className="text-emerald-700" /> Berkas Final Signed BA (PDF)
                      </label>
                      {formData.finalBAPath ? (
                        <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                          <a href={resolveDocumentUrl(formData.finalBAPath)} target="_blank" rel="noreferrer" className="text-emerald-800 font-bold hover:underline truncate">
                            {formData.finalBAPath.split("/").pop()}
                          </a>
                          <span className="text-emerald-600 font-bold text-[10px]">Ditandatangani ✓</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic block">Belum ada dokumen final TTD diunggah.</span>
                      )}
                      {isInlineEditingBA && (
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          className="mt-2 text-xs"
                          onChange={(e) => handleFileUpload(e, "finalBAPath")}
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Tanggal Diajukan Survey</label>
                      <input
                        type="date"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold"
                        value={formData.baSubmittedDate || ""}
                        onChange={(e) => setFormData({ ...formData, baSubmittedDate: e.target.value })}
                        disabled={!isInlineEditingBA}
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Tanggal Tanda Tangan Klien</label>
                      <input
                        type="date"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold"
                        value={formData.baSignedDate || ""}
                        onChange={(e) => setFormData({ ...formData, baSignedDate: e.target.value })}
                        disabled={!isInlineEditingBA}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Status Siklus BA</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-900"
                      value={formData.statusBA || "Submit"}
                      onChange={(e) => setFormData({ ...formData, statusBA: e.target.value })}
                      disabled={!isInlineEditingBA}
                    >
                      <option value="Submit">1. Submit / Draft Survey</option>
                      <option value="Pending Berita Acara">2. Pending Berita Acara (Verifikasi SPV)</option>
                      <option value="Verified">2b. Verified SPV</option>
                      <option value="Revisi">3. Revisi / Tertahan</option>
                      <option value="Ready to Invoice">4. Ready to Invoice (Disetujui)</option>
                      <option value="Invoiced">5. Invoiced / Arsip</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Catatan Bottleneck / Kendala</label>
                    <textarea
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900"
                      value={formData.notesBottleneck || ""}
                      onChange={(e) => setFormData({ ...formData, notesBottleneck: e.target.value })}
                      placeholder="Catatan kendala lapangan jika ada..."
                      disabled={!isInlineEditingBA}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* KOLOM KANAN (xl:col-span-4 2xl:col-span-3): Audit & Intelligence Drawer */}
            <div className="xl:col-span-4 2xl:col-span-3 space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    Ringkasan Nilai BA
                  </h4>
                  <span className="text-xs font-mono font-bold text-cyan-800">{formData.customerCode}</span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Estimasi Awal:</span>
                    <strong className="font-mono text-slate-800">{formatIDR(sumInitial)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Setelah Survey:</span>
                    <strong className="font-mono text-emerald-700">{formatIDR(sumAdjusted)}</strong>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-700 font-bold">Delta Opname:</span>
                    <strong className={`font-mono font-bold ${deltaAmount >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      {deltaAmount >= 0 ? `+${formatIDR(deltaAmount)}` : formatIDR(deltaAmount)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Sidebar Tabs */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-3">
                <div className="flex border-b border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setBaSidebarTab("approval")}
                    className={`flex-1 pb-2 font-bold text-center border-b-2 transition ${baSidebarTab === "approval" ? "border-cyan-700 text-cyan-900" : "border-transparent text-slate-500"}`}
                  >
                    Flow Dokumen
                  </button>
                  <button
                    type="button"
                    onClick={() => setBaSidebarTab("activity")}
                    className={`flex-1 pb-2 font-bold text-center border-b-2 transition ${baSidebarTab === "activity" ? "border-cyan-700 text-cyan-900" : "border-transparent text-slate-500"}`}
                  >
                    Audit Timeline
                  </button>
                </div>

                {baSidebarTab === "approval" ? (
                  <div className="space-y-2 text-xs">
                    <AuditTimeline steps={generateAuditTimeline("ba", formData)} />
                  </div>
                ) : (
                  <div className="space-y-2 text-xs max-h-60 overflow-y-auto">
                    {generateUserActivityLogs("ba", formData, realAuditLogs).map((log, i) => (
                      <div key={i} className="p-2 bg-slate-50 rounded border border-slate-200 space-y-0.5">
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                          <span>{log.actionType}</span>
                          <span>{log.timestamp}</span>
                        </div>
                        <div className="font-bold text-slate-800 text-[11px]">{log.action}</div>
                        <div className="text-[10px] text-slate-600">{log.user} ({log.role})</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Sticky Bottom Actions */}
          <div className="sticky bottom-0 bg-white pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
              onClick={onClose}
            >
              Tutup
            </button>

            {isInlineEditingBA && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 rounded-lg bg-cyan-800 hover:bg-cyan-900 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
              >
                <CheckCircle2 size={15} />
                <span>{isSubmitting ? "Menyimpan..." : "Simpan Berita Acara"}</span>
              </button>
            )}
          </div>
        </form>

      </div>
    </div>
  );
}
