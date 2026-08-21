import React, { useState, useEffect } from "react";
import {
  FileText, Pickaxe, FileCheck, Receipt, X, CheckCircle2,
  Plus, Trash2, Building2, ExternalLink
} from "lucide-react";
import { formatIDR, formatDateInput } from "../../../utils/finance/formatters";
import { generateInvoiceNumber } from "../../../utils/finance/numberGenerators";
import { getCustomerCalculations, calculateItemRateAndAmount } from "../../../utils/finance/invoiceCalculations";
import {
  getBlankInvoiceItems,
  demoPOSItems,
  demoBGGItems,
  demoDBKItems,
  demoSBSItems
} from "./InvoiceLineItemTemplates";
import { useFinanceMasterData, useRFIndex } from "../../../hooks/useFinanceMasterData";
import { masterBankAccounts, customerContractMap } from "../../../utils/finance/sowCatalog";
import { API_BASE, type User as UserType } from "../../../lib/api";

interface InvoiceModalFormProps {
  isOpen: boolean;
  editItem: any | null;
  baRows?: any[];
  invoiceRows?: any[];
  customerRows?: any[];
  initialCustomerCode?: string;
  initialActivityGroup?: string;
  initialInvoiceCategory?: string;
  onClose: () => void;
  onSaved: () => void;
  onNotice: (msg: string) => void;
  user?: UserType;
}

export function InvoiceModalForm({
  isOpen,
  editItem,
  baRows = [],
  invoiceRows = [],
  customerRows = [],
  initialCustomerCode = "POS",
  initialActivityGroup = "OPERATION & MINING",
  initialInvoiceCategory = "Operation & Mining",
  onClose,
  onSaved,
  onNotice,
  user
}: InvoiceModalFormProps) {
  if (!isOpen) return null;

  const masterData = useFinanceMasterData();
  const rfIndexCalculated = useRFIndex(masterData);

  const [formData, setFormData] = useState<any>({
    customerCode: initialCustomerCode,
    workPeriod: "Juni 2026",
    invoiceNo: "",
    activityGroup: initialActivityGroup,
    invoiceCategory: initialInvoiceCategory,
    contractNo: "",
    projectSite: "Paramitha Coal Project",
    bankName: "Bank BNI",
    bankAccountName: "PT Andalan Artha Primanusa",
    bankAccountNo: "8188788882",
    bankBranch: "Harmoni, Jakarta",
    directorName: "GAHARI CHRISTINE",
    directorTitle: "DIREKTUR UTAMA",
    baNoReference: ""
  });

  const [invLineItems, setInvLineItems] = useState<any[]>([]);
  const [mRate, setMRate] = useState(masterData.mRate || 16200);
  const [fuelPriceUSD, setFuelPriceUSD] = useState(0.85);
  const [laborPriceIDR, setLaborPriceIDR] = useState(5500000);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editItem) {
      setFormData({
        ...editItem,
        invoiceDate: formatDateInput(editItem.invoiceDate),
        dueDate: formatDateInput(editItem.dueDate),
      });
      if (editItem.items && Array.isArray(editItem.items) && editItem.items.length > 0) {
        setInvLineItems(editItem.items);
      } else {
        setInvLineItems(getBlankInvoiceItems(editItem.customerCode || "POS", masterData.dynamicSowOptions, masterData.mRate));
      }
    } else {
      const invNo = generateInvoiceNumber(initialCustomerCode, "Juni 2026", invoiceRows.length);
      const contractInfo = customerContractMap[initialCustomerCode] || {};
      setFormData({
        customerCode: initialCustomerCode,
        workPeriod: "Juni 2026",
        invoiceNo: invNo,
        activityGroup: initialActivityGroup,
        invoiceCategory: initialInvoiceCategory,
        contractNo: contractInfo.contract || "",
        projectSite: contractInfo.project || "Site Project",
        bankName: "Bank BNI",
        bankAccountName: "PT Andalan Artha Primanusa",
        bankAccountNo: "8188788882",
        bankBranch: "Harmoni, Jakarta",
        directorName: "GAHARI CHRISTINE",
        directorTitle: "DIREKTUR UTAMA",
        baNoReference: ""
      });
      setInvLineItems(getBlankInvoiceItems(initialCustomerCode, masterData.dynamicSowOptions, masterData.mRate));
    }
  }, [editItem, initialCustomerCode]);

  const handleCompanySelect = (code: string) => {
    const invNo = generateInvoiceNumber(code, formData.workPeriod || "Juni 2026", invoiceRows.length);
    const contractInfo = customerContractMap[code] || {};
    setFormData((prev: any) => ({
      ...prev,
      customerCode: code,
      invoiceNo: invNo,
      contractNo: contractInfo.contract || prev.contractNo,
      projectSite: contractInfo.project || prev.projectSite,
    }));
    setInvLineItems(getBlankInvoiceItems(code, masterData.dynamicSowOptions, masterData.mRate));
  };

  const handleBASelect = (baNum: string) => {
    if (!baNum) {
      setFormData((prev: any) => ({ ...prev, baNoReference: "" }));
      return;
    }
    const matchedBA = baRows.find((b: any) => b.baNumber === baNum);
    if (!matchedBA) return;

    const code = matchedBA.customerCode || "POS";
    const contractInfo = customerContractMap[code] || {};

    setFormData((prev: any) => ({
      ...prev,
      baNoReference: matchedBA.baNumber,
      customerCode: code,
      workPeriod: matchedBA.workPeriod || prev.workPeriod,
      contractNo: contractInfo.contract || prev.contractNo,
      projectSite: contractInfo.project || prev.projectSite,
      invoiceNo: generateInvoiceNumber(code, matchedBA.workPeriod || prev.workPeriod, invoiceRows.length)
    }));

    if (matchedBA.items && Array.isArray(matchedBA.items) && matchedBA.items.length > 0) {
      setInvLineItems(matchedBA.items);
    } else {
      setInvLineItems(getBlankInvoiceItems(code, masterData.dynamicSowOptions, masterData.mRate));
    }
    onNotice(`⚡ Auto-fill data invoice dari BA ${matchedBA.baNumber} (${code})`);
  };

  const removeInvLineItem = (idToRemove: string) => {
    setInvLineItems(prev => prev.filter(item => item.id !== idToRemove));
  };

  const updateInvItemVolume = (id: string, vol: number) => {
    setInvLineItems(prev => prev.map(item => item.id === id ? { ...item, volume: vol } : item));
  };

  const updateInvItemOverhaul = (id: string, mtr: number) => {
    setInvLineItems(prev => prev.map(item => item.id === id ? { ...item, overhaulMtr: mtr } : item));
  };

  const updateInvItemRateIDR = (id: string, rate: number) => {
    setInvLineItems(prev => prev.map(item => item.id === id ? { ...item, unitRateIDR: rate } : item));
  };

  const updateInvItemRateUSD = (id: string, rate: number) => {
    setInvLineItems(prev => prev.map(item => item.id === id ? { ...item, unitRateUSD: rate } : item));
  };

  const updateInvItemKurs = (id: string, kurs: number) => {
    setInvLineItems(prev => prev.map(item => item.id === id ? { ...item, kursBI: kurs } : item));
  };

  const updateInvItemAmount = (id: string, amt: number) => {
    setInvLineItems(prev => prev.map(item => item.id === id ? { ...item, amount: amt } : item));
  };

  const currentCust = (formData.customerCode || "POS").toUpperCase();
  const cCalc = getCustomerCalculations(invLineItems, currentCust, mRate, rfIndexCalculated);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.invoiceNo) {
      onNotice("Nomor invoice wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        items: invLineItems,
        totalInvoice: cCalc.totalInvoice,
        totalGross: cCalc.totalGross,
        vat12: cCalc.vat12,
        pph23: cCalc.pph23,
        outstanding: cCalc.totalInvoice
      };

      const url = editItem ? `/api/finance/invoices/${editItem.id}` : "/api/finance/invoices";
      const method = editItem ? "PUT" : "POST";

      const res = await fetch(url.startsWith("http") ? url : `${API_BASE}${url}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Gagal menyimpan Invoice");

      onNotice(editItem ? "✅ Data Invoice berhasil diperbarui." : "✅ Invoice baru berhasil diterbitkan.");
      onSaved();
      onClose();
    } catch (err: any) {
      onNotice(err?.message || "Gagal menyimpan invoice");
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
              <Receipt size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                <span>{editItem ? `Edit Invoice: ${formData.invoiceNo}` : "Invoice Generator — Penagihan Resmi"}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#a57c50] text-white font-mono">
                  {currentCust}
                </span>
              </h3>
              <p className="text-[11px] text-[#e5d7c2]">
                Kalkulasi otomatis DPP, PPN 12%, PPh 23 (2%), dan parameter SOW kontrak
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
          
          {/* Header Info & Fast Fill Strip */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-2">
              <h4 className="text-xs font-black text-slate-900 tracking-wider uppercase flex items-center gap-1.5">
                <FileText size={15} className="text-cyan-800" /> Profil Faktur Penagihan
              </h4>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    handleCompanySelect("POS");
                    setInvLineItems(demoPOSItems);
                    onNotice("⚡ Sampel data POS Mining dimuat!");
                  }}
                  className="px-2 py-1 text-[11px] font-extrabold text-cyan-900 bg-cyan-100 hover:bg-cyan-200 border border-cyan-300 rounded transition flex items-center gap-1"
                >
                  <Pickaxe size={12} /> ⚡ Demo POS
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleCompanySelect("BGG");
                    setInvLineItems(demoBGGItems);
                    onNotice("⚡ Sampel data BGG Mining dimuat!");
                  }}
                  className="px-2 py-1 text-[11px] font-extrabold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded transition flex items-center gap-1"
                >
                  <Pickaxe size={12} /> ⚡ Demo BGG
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleCompanySelect("DBK");
                    setInvLineItems(demoDBKItems);
                    onNotice("⚡ Sampel data DBK Petrosea dimuat!");
                  }}
                  className="px-2 py-1 text-[11px] font-extrabold text-blue-900 bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded transition flex items-center gap-1"
                >
                  <Pickaxe size={12} /> ⚡ Demo DBK
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleCompanySelect("SBS");
                    setInvLineItems(demoSBSItems);
                    onNotice("⚡ Sampel data SBS Mining dimuat!");
                  }}
                  className="px-2 py-1 text-[11px] font-extrabold text-purple-900 bg-purple-100 hover:bg-purple-200 border border-purple-300 rounded transition flex items-center gap-1"
                >
                  <Pickaxe size={12} /> ⚡ Demo SBS
                </button>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-300">
                  RF Index: <strong className="text-amber-700 font-mono font-black">{rfIndexCalculated.toFixed(3)}</strong>
                </span>
              </div>
            </div>

            {/* BA Selector Dropdown */}
            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-2.5 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <label className="text-xs font-extrabold text-cyan-950 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
                <FileCheck size={15} className="text-cyan-800" /> Referensi No. BA:
              </label>
              <select
                className="bg-white border border-cyan-300 font-bold text-cyan-950 text-xs px-3 py-1.5 rounded-lg focus:border-cyan-600 outline-none flex-1 w-full shadow-xs"
                value={formData.baNoReference || ""}
                onChange={(e) => handleBASelect(e.target.value)}
              >
                <option value="">-- Tanpa BA Reference (Input Manual) --</option>
                {baRows.map((ba: any) => (
                  <option key={ba.id} value={ba.baNumber}>
                    {ba.baNumber} — Client: {ba.customerCode} — Periode: {ba.workPeriod || "-"} ({formatIDR(ba.workAmount || 0)}) [{ba.statusBA || "Submit"}]
                  </option>
                ))}
              </select>
            </div>

            {/* 2-Column Info Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <span className="w-28 text-slate-500 font-bold shrink-0">Company:</span>
                  <select
                    className="bg-white border border-slate-300 font-extrabold text-slate-900 text-xs px-2.5 py-1.5 rounded-lg focus:border-cyan-600 outline-none flex-1 w-full"
                    value={formData.customerCode || ""}
                    onChange={(e) => handleCompanySelect(e.target.value)}
                  >
                    <option value="POS">POS — PT Position</option>
                    <option value="BGG">BGG — PT Budi Gema Gempita</option>
                    <option value="DBK">DBK — PT Dayabumi Kencana</option>
                    <option value="SBS">SBS — PT Sumber Bara Sejahtera</option>
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <span className="w-28 text-slate-500 font-bold shrink-0">Project Site:</span>
                  <input
                    className="bg-white border border-slate-300 font-extrabold text-slate-800 text-xs px-2.5 py-1.5 rounded-lg outline-none flex-1 w-full"
                    value={formData.projectSite || ""}
                    onChange={(e) => setFormData({ ...formData, projectSite: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <span className="w-28 text-slate-500 font-bold shrink-0">Period Covered:</span>
                  <input
                    className="bg-white border border-slate-300 font-extrabold text-slate-900 text-xs px-2.5 py-1.5 rounded-lg focus:border-cyan-600 outline-none flex-1 w-full"
                    value={formData.workPeriod || ""}
                    onChange={(e) => setFormData({ ...formData, workPeriod: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <span className="w-28 text-slate-500 font-bold shrink-0">Invoice No.:</span>
                  <input
                    className="bg-white border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2.5 py-1.5 rounded-lg focus:border-cyan-600 outline-none flex-1 w-full"
                    value={formData.invoiceNo || ""}
                    onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                    required
                  />
                </div>

                <div className="flex items-center gap-3">
                  <span className="w-28 text-slate-500 font-bold shrink-0">Activity Group:</span>
                  <input
                    className="bg-white border border-slate-300 font-extrabold text-slate-900 text-xs px-2.5 py-1.5 rounded-lg focus:border-cyan-600 outline-none flex-1 w-full"
                    value={formData.activityGroup || "OPERATION & MINING"}
                    onChange={(e) => setFormData({ ...formData, activityGroup: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <span className="w-28 text-slate-500 font-bold shrink-0">Contract Number:</span>
                  <input
                    className="bg-white border border-slate-300 font-extrabold text-slate-800 text-xs px-2.5 py-1.5 rounded-lg outline-none flex-1 w-full"
                    value={formData.contractNo || ""}
                    onChange={(e) => setFormData({ ...formData, contractNo: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Master Bank Account Selector */}
            <div className="bg-slate-50 border border-slate-300 rounded-xl p-3 space-y-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <label className="text-xs font-black uppercase text-cyan-900 tracking-wider flex items-center gap-1.5 shrink-0">
                  <Receipt size={15} className="text-cyan-800" /> Rekening Pembayaran (Master Bank Account):
                </label>
                <select
                  className="bg-white border border-slate-300 font-extrabold text-slate-900 text-xs px-3 py-1.5 rounded-lg focus:border-cyan-600 outline-none shadow-xs"
                  value={formData.bankName || "Bank BNI"}
                  onChange={(e) => {
                    const selectedBank = masterBankAccounts.find(b => b.bankName === e.target.value) || masterBankAccounts[0];
                    setFormData((prev: any) => ({
                      ...prev,
                      bankName: selectedBank.bankName,
                      bankAccountName: selectedBank.bankAccountName,
                      bankAccountNo: selectedBank.bankAccountNo,
                      bankBranch: selectedBank.bankBranch,
                    }));
                  }}
                >
                  {masterBankAccounts.map((b) => (
                    <option key={b.id} value={b.bankName}>
                      {b.bankName} — A/C {b.bankAccountNo} ({b.bankBranch})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* DYNAMIC LINE ITEMS TABLE PER CUSTOMER */}
          <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-xs bg-white">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider">
                  <th className="p-2.5 text-center w-10">Del</th>
                  <th className="p-2.5">DESCRIPTION</th>
                  <th className="p-2.5 text-center">{currentCust === "SBS" ? "CLAIMED UNIT" : "CLAIMED VOLUME / DISTANCE"}</th>
                  {currentCust === "DBK" ? (
                    <>
                      <th className="p-2.5 text-right">UNIT RATE (USD)</th>
                      <th className="p-2.5 text-right">KURS (USD to IDR)</th>
                    </>
                  ) : (
                    <th className="p-2.5 text-right">UNIT RATE (IDR)</th>
                  )}
                  <th className="p-2.5 text-right font-extrabold">AMOUNT (IDR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {invLineItems.map((item, idx) => {
                  const vol = Number(item.volume || 0);
                  const rateIDR = Number(item.unitRateIDR || 0);
                  const rateUSD = Number(item.unitRateUSD || 0);
                  const kurs = Number(item.kursBI || 16200);
                  const amt = currentCust === "DBK" ? vol * rateUSD * kurs : (item.amount !== undefined && item.amount !== 0 ? item.amount : vol * rateIDR);

                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-50">
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeInvLineItem(item.id)}
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                        >
                          <X size={14} />
                        </button>
                      </td>
                      <td className="p-2 font-bold text-slate-800">
                        {item.description} &nbsp; &nbsp; <span className="text-[10px] text-slate-400 font-mono">({item.period || item.section})</span>
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            step="0.01"
                            className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right"
                            value={item.volume === 0 ? "" : (item.volume ?? "")}
                            onChange={(e) => updateInvItemVolume(item.id, parseFloat(e.target.value) || 0)}
                          />
                          <span className="text-[11px] text-slate-600 font-bold">{item.unit || "BCM"}</span>
                        </div>
                      </td>
                      {currentCust === "DBK" ? (
                        <>
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              step="0.001"
                              className="w-20 bg-slate-50 border border-slate-300 font-mono text-xs px-2 py-0.5 rounded text-right"
                              value={item.unitRateUSD === 0 ? "" : (item.unitRateUSD ?? "")}
                              onChange={(e) => updateInvItemRateUSD(item.id, parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              className="w-24 bg-slate-50 border border-slate-300 font-mono text-xs px-2 py-0.5 rounded text-right"
                              value={item.kursBI === 0 ? "" : (item.kursBI ?? 16200)}
                              onChange={(e) => updateInvItemKurs(item.id, parseFloat(e.target.value) || 0)}
                            />
                          </td>
                        </>
                      ) : (
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            className="w-24 bg-slate-50 border border-slate-300 font-mono text-xs px-2 py-0.5 rounded text-right"
                            value={item.unitRateIDR === 0 ? "" : (item.unitRateIDR ?? "")}
                            onChange={(e) => updateInvItemRateIDR(item.id, parseFloat(e.target.value) || 0)}
                          />
                        </td>
                      )}
                      <td className="p-2 text-right font-mono font-black text-slate-900">
                        {formatIDR(amt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Summary Totals Footer */}
              <tfoot className="border-t-2 border-slate-800 bg-slate-50 font-bold text-xs">
                <tr>
                  <td colSpan={currentCust === "DBK" ? 4 : 3} className="p-2.5 text-right uppercase text-slate-800">TOTAL GROSS:</td>
                  <td className="p-2.5 text-right font-mono text-base font-black text-slate-900">{formatIDR(cCalc.totalGross)}</td>
                </tr>
                <tr>
                  <td colSpan={currentCust === "DBK" ? 4 : 3} className="p-2.5 text-right uppercase text-slate-700">DPP PPN 11/12:</td>
                  <td className="p-2.5 text-right font-mono font-extrabold text-slate-900">{formatIDR(cCalc.dpp11_12)}</td>
                </tr>
                <tr>
                  <td colSpan={currentCust === "DBK" ? 4 : 3} className="p-2.5 text-right uppercase text-emerald-800">VAT ( 12% ) (+):</td>
                  <td className="p-2.5 text-right font-mono font-extrabold text-emerald-700">{formatIDR(cCalc.vat12)}</td>
                </tr>
                <tr>
                  <td colSpan={currentCust === "DBK" ? 4 : 3} className="p-2.5 text-right uppercase text-rose-800">WITHHOLDING TAX ART 23 (-):</td>
                  <td className="p-2.5 text-right font-mono font-extrabold text-rose-700">({formatIDR(cCalc.pph23)})</td>
                </tr>
                <tr className="bg-slate-900 text-white font-black text-sm">
                  <td colSpan={currentCust === "DBK" ? 4 : 3} className="p-3 text-right uppercase tracking-wider text-cyan-300">TOTAL INVOICE (NET):</td>
                  <td className="p-3 text-right font-mono text-lg text-emerald-400">{formatIDR(cCalc.totalInvoice)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Sticky Bottom Actions */}
          <div className="sticky bottom-0 bg-white pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
              onClick={onClose}
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 rounded-lg bg-cyan-800 hover:bg-cyan-900 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
            >
              <CheckCircle2 size={15} />
              <span>{isSubmitting ? "Menyimpan..." : "Simpan Dokumen Invoice"}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
