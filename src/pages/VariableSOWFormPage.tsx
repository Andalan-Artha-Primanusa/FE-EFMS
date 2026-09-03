import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, FileSpreadsheet, Plus, Trash2, RefreshCw, Sparkles, DollarSign, Layers } from "lucide-react";
import { api } from "../lib/api";
import {
  defaultSOWTemplate,
  defaultBGGSOWTemplate,
  defaultSBSSOWTemplate,
  defaultPTROSOWTemplate,
  SOW_OPERATIONAL_SITES
} from "./VariableSOWPage";
import { FormattedNumberInput, formatIDR } from "./finance/helpers";

export function VariableSOWFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const contractGroup = location.state?.contractGroup;
  const mrateBi = location.state?.mrateBi || 17923.30;

  const isEditing = !!contractGroup;

  const getTemplateForCode = (code: string) => {
    const c = (code || "").toUpperCase();
    if (c === "BGG" || c === "PT BGG") return defaultBGGSOWTemplate;
    if (c === "SBS") return defaultSBSSOWTemplate;
    if (c === "PTRO" || c === "DBK") return defaultPTROSOWTemplate;
    return defaultSOWTemplate;
  };

  const initialCode = contractGroup?.companyCode || "POS";
  const initialSite = SOW_OPERATIONAL_SITES.find(s => s.code === initialCode) || SOW_OPERATIONAL_SITES[0];

  const [headerForm, setHeaderForm] = useState<any>({
    companyName: contractGroup?.companyName || initialSite.name,
    companyCode: initialCode,
    contractNo: contractGroup?.contractNo || initialSite.contractNo,
    type: contractGroup?.type || (initialCode === "BGG" ? "coal" : "generic")
  });

  const [itemsGrid, setItemsGrid] = useState<any[]>(
    contractGroup?.items
      ? contractGroup.items.map((i: any) => ({ ...i }))
      : getTemplateForCode(initialCode).map((i: any) => ({ ...i }))
  );

  const handleFieldChange = (idx: number, field: string, val: any) => {
    const updated = [...itemsGrid];
    updated[idx] = { ...updated[idx], [field]: val };
    setItemsGrid(updated);
  };

  const handleAddRow = () => {
    const isSBS = headerForm.companyCode === "SBS";
    const isBGG = headerForm.companyCode === "BGG";
    const newRow = {
      category: isSBS ? "OB Removal" : isBGG ? "OB Removal" : "Operation & Mining",
      itemName: "",
      unit: isSBS ? "BCM" : isBGG ? "Bcm" : "USD/BCM",
      rateUSD: 0,
      rateIDR: 0,
      tier1Rate: 0,
      tier2Rate: 0,
      tier3Rate: 0,
      splitPercentage: 100,
      baseDistanceMeters: 0
    };
    setItemsGrid([...itemsGrid, newRow]);
  };

  const handleRemoveRow = (idx: number) => {
    setItemsGrid(itemsGrid.filter((_, i) => i !== idx));
  };

  const handleResetToTemplate = () => {
    const tpl = getTemplateForCode(headerForm.companyCode);
    setItemsGrid(tpl.map(i => ({ ...i })));
  };

  const handleSaveGrid = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      for (const item of itemsGrid) {
        if (!item.itemName) continue;
        const payload = {
          category: item.category || "General",
          itemName: item.itemName,
          rateUSD: Number(item.rateUSD || 0),
          rateIDR: Number(item.rateIDR || item.tier3Rate || 0),
          tier1Rate: Number(item.tier1Rate || 0),
          tier2Rate: Number(item.tier2Rate || 0),
          tier3Rate: Number(item.tier3Rate || 0),
          splitPercentage: Number(item.splitPercentage || 100),
          baseDistanceMeters: Number(item.baseDistanceMeters || 0),
          unit: item.unit || "BCM",
          customer: headerForm.companyCode,
          customerCode: headerForm.companyCode,
          contractNo: headerForm.contractNo,
          description: `Contract ${headerForm.contractNo}`,
          status: "Active"
        };
        if (item.id) {
          await api(`/api/master-data/variable-sow/${item.id}`, { method: "PUT", body: JSON.stringify(payload) }).catch(() => {});
        } else {
          await api("/api/master-data/variable-sow", { method: "POST", body: JSON.stringify(payload) }).catch(() => {});
        }
      }
      navigate("/variable-sow", { state: { notice: `Tariff Grid Variable SOW untuk ${headerForm.companyName} (${headerForm.contractNo || "Aktif"}) berhasil disimpan.` } });
    } catch (err: any) {
      console.error(err?.message || "Gagal menyimpan Grid Variable SOW");
    }
  };

  const isBGG = headerForm.companyCode === "BGG" || headerForm.companyCode === "PT BGG";
  const isSBS = headerForm.companyCode === "SBS";
  const isPTRO = headerForm.companyCode === "PTRO" || headerForm.companyCode === "DBK";

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 mt-4">
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 w-full shadow-2xs space-y-5">
        <div className="flex items-start gap-3 border-b border-slate-100 pb-3.5">
          <button
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition shadow-2xs cursor-pointer"
            onClick={() => navigate("/variable-sow")}
            title="Kembali"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-cyan-900 bg-cyan-50 px-2.5 py-0.5 rounded border border-cyan-200">
              <FileSpreadsheet size={12} /> Form Master Tariff Grid SOW
            </span>
            <h3 className="text-lg font-black text-slate-900 mt-1">
              {isEditing ? `Tariff Grid SOW — ${headerForm.companyName}` : "Input Tariff Grid SOW Baru"}
            </h3>
          </div>
        </div>

        {/* HEADER SELECTION FORM */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nama Site / Perusahaan <span className="text-rose-600">*</span>
            </label>
            <select
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-bold focus:border-cyan-700 outline-none"
              value={headerForm.companyCode}
              onChange={(e) => {
                const code = e.target.value.toUpperCase();
                const opt = SOW_OPERATIONAL_SITES.find((o) => o.code === code);
                const tpl = getTemplateForCode(code);
                setHeaderForm({
                  companyName: opt?.name || code,
                  companyCode: code,
                  contractNo: opt?.contractNo || headerForm.contractNo,
                  type: code === "BGG" ? "coal" : "generic"
                });
                setItemsGrid(tpl.map(i => ({ ...i })));
              }}
            >
              {SOW_OPERATIONAL_SITES.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.fullName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Kode Site
            </label>
            <input
              type="text"
              className="w-full bg-slate-100 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-bold font-mono"
              value={headerForm.companyCode}
              readOnly
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nomor Kontrak / SPK
            </label>
            <input
              type="text"
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-bold focus:border-cyan-700 outline-none font-mono"
              value={headerForm.contractNo}
              placeholder="cth: 001/SBS-AAP/2026"
              onChange={(e) => setHeaderForm({ ...headerForm, contractNo: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Model Tarif SOW
            </label>
            <div className="bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 font-bold flex items-center gap-1.5 shadow-2xs">
              {isBGG ? (
                <>Multi-Tier Coal Index (PT BGG)</>
              ) : isSBS ? (
                <>IDR Tetap (OB, Rental Alat & Denda)</>
              ) : isPTRO ? (
                <>Multi-Currency USD & IDR (PT Petrosea / PTRO)</>
              ) : (
                <>{formatIDR(mrateBi)} / USD (M-Rate BI)</>
              )}
            </div>
          </div>
        </div>

        {/* FORM TABLE */}
        <form onSubmit={handleSaveGrid} className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              Rincian Item Pekerjaan & Parameter Tarif ({itemsGrid.length} Baris)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetToTemplate}
                className="px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                title="Reset ke daftar default site"
              >
                <RefreshCw size={12} />
                <span>Reset Template</span>
              </button>
              <button
                type="button"
                onClick={handleAddRow}
                className="px-2.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <Plus size={13} />
                <span>+ Tambah Baris</span>
              </button>
            </div>
          </div>

          {/* TABLE RENDERING BASED ON SITE TYPE */}
          {isBGG ? (
            /* BGG MULTI-TIER TABLE */
            <div className="overflow-x-auto rounded-2xl border-2 border-slate-200 shadow-xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-black uppercase text-[11px]">
                    <th className="p-3 pl-4 border-r border-slate-800">ITEM PEKERJAAN (SOW)</th>
                    <th className="p-3 border-r border-slate-800 text-center w-20">SATUAN</th>
                    <th className="p-3 border-r border-slate-800 text-right bg-emerald-950 text-emerald-300 w-32">TIER 1 (&lt; $50)</th>
                    <th className="p-3 border-r border-slate-800 text-right bg-blue-950 text-blue-300 w-32">TIER 2 ($50 - $75)</th>
                    <th className="p-3 border-r border-slate-800 text-right bg-amber-950 text-amber-300 w-32">TIER 3 (&gt; $75)</th>
                    <th className="p-3 border-r border-slate-800 text-center w-24">SPLIT %</th>
                    <th className="p-3 border-r border-slate-800 text-center w-28">BASE DIST</th>
                    <th className="p-3 pr-4 text-center w-12">#</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {itemsGrid.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 pl-4 border-r border-slate-200">
                        <input
                          type="text"
                          className="w-full font-bold text-slate-900 bg-transparent px-2 py-1 outline-none border border-transparent focus:border-cyan-500 rounded"
                          value={item.itemName}
                          onChange={(e) => handleFieldChange(idx, "itemName", e.target.value)}
                          placeholder="Nama item..."
                        />
                      </td>
                      <td className="p-2 text-center border-r border-slate-200">
                        <input
                          type="text"
                          className="w-full text-center font-mono font-bold text-slate-600 bg-transparent px-1 py-1 outline-none border border-transparent focus:border-cyan-500 rounded"
                          value={item.unit}
                          onChange={(e) => handleFieldChange(idx, "unit", e.target.value)}
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200 text-right">
                        <FormattedNumberInput
                          allowDecimals
                          maxDecimals={2}
                          className="w-full text-right p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-300 font-mono font-bold text-xs outline-none"
                          value={item.tier1Rate || ""}
                          onChange={(val) => handleFieldChange(idx, "tier1Rate", val)}
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200 text-right">
                        <FormattedNumberInput
                          allowDecimals
                          maxDecimals={2}
                          className="w-full text-right p-1.5 rounded-lg bg-blue-50/70 border border-blue-300 font-mono font-bold text-xs outline-none"
                          value={item.tier2Rate || ""}
                          onChange={(val) => handleFieldChange(idx, "tier2Rate", val)}
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200 text-right">
                        <FormattedNumberInput
                          allowDecimals
                          maxDecimals={2}
                          className="w-full text-right p-1.5 rounded-lg bg-amber-50 border border-amber-400 font-mono font-black text-amber-950 text-xs outline-none"
                          value={item.tier3Rate || ""}
                          onChange={(val) => {
                            handleFieldChange(idx, "tier3Rate", val);
                            handleFieldChange(idx, "rateIDR", val);
                          }}
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200 text-center">
                        <input
                          type="number"
                          className="w-16 text-center p-1.5 rounded-lg bg-slate-50 border border-slate-300 font-mono font-bold text-xs outline-none"
                          value={item.splitPercentage || 100}
                          onChange={(e) => handleFieldChange(idx, "splitPercentage", parseFloat(e.target.value) || 0)}
                        /> %
                      </td>
                      <td className="p-2 border-r border-slate-200 text-center">
                        <input
                          type="number"
                          className="w-20 text-center p-1.5 rounded-lg bg-slate-50 border border-slate-300 font-mono font-bold text-xs outline-none"
                          value={item.baseDistanceMeters || 0}
                          onChange={(e) => handleFieldChange(idx, "baseDistanceMeters", parseFloat(e.target.value) || 0)}
                        /> m
                      </td>
                      <td className="p-2 pr-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : isSBS ? (
            /* SBS IDR RATES TABLE (OB, RENTAL ALAT, PENGURANG BIAYA) */
            <div className="overflow-x-auto rounded-2xl border-2 border-slate-200 shadow-xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-black uppercase text-[11px]">
                    <th className="p-3 pl-4 border-r border-slate-800 w-44">KATEGORI</th>
                    <th className="p-3 border-r border-slate-800">ITEM PEKERJAAN (SOW SBS)</th>
                    <th className="p-3 border-r border-slate-800 text-center w-28">SATUAN</th>
                    <th className="p-3 border-r border-slate-800 text-right w-48 bg-cyan-950 text-cyan-300">TARIF DASAR (RP)</th>
                    <th className="p-3 pr-4 text-center w-12">#</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {itemsGrid.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 pl-4 border-r border-slate-200">
                        <select
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-xs font-bold text-slate-800 outline-none"
                          value={item.category || "OB Removal"}
                          onChange={(e) => {
                            const cat = e.target.value;
                            handleFieldChange(idx, "category", cat);
                            if (cat === "Jasa Penunjang Produksi" && (!item.unit || item.unit === "BCM" || item.unit === "Lot")) {
                              handleFieldChange(idx, "unit", "Hours");
                            } else if (cat === "Pengurang Pembayaran" && (!item.unit || item.unit === "BCM")) {
                              handleFieldChange(idx, "unit", "Lot");
                            } else if (cat === "OB Removal" && (!item.unit || item.unit === "Hours" || item.unit === "Lot")) {
                              handleFieldChange(idx, "unit", "BCM");
                            }
                          }}
                        >
                          <option value="OB Removal">OB Removal (Per Area Kerja)</option>
                          <option value="Jasa Penunjang Produksi">Jasa Penunjang Produksi (Rental Alat)</option>
                          <option value="Pengurang Pembayaran">Pengurang Pembayaran (Denda & BBM)</option>
                          {item.category === "Operating & Mining" && <option value="Operating & Mining">Operating & Mining (OB)</option>}
                          {item.category === "Penunjang" && <option value="Penunjang">Penunjang (Rental Alat)</option>}
                          {item.category === "Pengurang Biaya" && <option value="Pengurang Biaya">Pengurang Biaya (Denda & BBM)</option>}
                        </select>
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <input
                          type="text"
                          className="w-full font-bold text-slate-900 bg-transparent px-2 py-1 outline-none border border-transparent focus:border-cyan-500 rounded"
                          value={item.itemName}
                          onChange={(e) => handleFieldChange(idx, "itemName", e.target.value)}
                          placeholder="Nama item / Unit..."
                          required
                        />
                      </td>
                      <td className="p-2 text-center border-r border-slate-200">
                        <input
                          type="text"
                          className="w-full text-center font-mono font-bold text-slate-600 bg-transparent px-1 py-1 outline-none border border-transparent focus:border-cyan-500 rounded"
                          value={item.unit}
                          onChange={(e) => handleFieldChange(idx, "unit", e.target.value)}
                          placeholder="BCM / Hours / Lot"
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200 text-right font-mono font-bold">
                        <FormattedNumberInput
                          className="w-full text-right p-1.5 rounded-lg bg-cyan-50 border border-cyan-300 font-mono font-extrabold text-cyan-950 text-xs outline-none"
                          value={item.rateIDR === 0 ? "" : (item.rateIDR ?? "")}
                          placeholder="0"
                          onChange={(val) => handleFieldChange(idx, "rateIDR", val)}
                        />
                      </td>
                      <td className="p-2 pr-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : isPTRO ? (
            /* PTRO MULTI-CURRENCY TABLE */
            <div className="overflow-x-auto rounded-2xl border-2 border-slate-200 shadow-xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-black uppercase text-[11px]">
                    <th className="p-3 pl-4 border-r border-slate-800 w-44">KATEGORI</th>
                    <th className="p-3 border-r border-slate-800">ITEM PEKERJAAN (PTRO)</th>
                    <th className="p-3 border-r border-slate-800 text-center w-24">SATUAN</th>
                    <th className="p-3 border-r border-slate-800 text-right w-36 bg-amber-950 text-amber-300">RATE USD ($)</th>
                    <th className="p-3 border-r border-slate-800 text-right w-36 bg-cyan-950 text-cyan-300">RATE IDR (RP)</th>
                    <th className="p-3 border-r border-slate-800 text-center w-28">BASE DIST</th>
                    <th className="p-3 pr-4 text-center w-12">#</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {itemsGrid.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 pl-4 border-r border-slate-200">
                        <select
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-xs font-bold text-slate-800 outline-none"
                          value={item.category || "Operating & Mining"}
                          onChange={(e) => handleFieldChange(idx, "category", e.target.value)}
                        >
                          <option value="Operating & Mining">Operating & Mining</option>
                          <option value="Over Distance">Over Distance</option>
                        </select>
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <input
                          type="text"
                          className="w-full font-bold text-slate-900 bg-transparent px-2 py-1 outline-none border border-transparent focus:border-cyan-500 rounded"
                          value={item.itemName}
                          onChange={(e) => handleFieldChange(idx, "itemName", e.target.value)}
                        />
                      </td>
                      <td className="p-2 text-center border-r border-slate-200">
                        <input
                          type="text"
                          className="w-full text-center font-mono font-bold text-slate-600 bg-transparent px-1 py-1 outline-none border border-transparent focus:border-cyan-500 rounded"
                          value={item.unit}
                          onChange={(e) => handleFieldChange(idx, "unit", e.target.value)}
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200 text-right font-mono">
                        <input
                          type="number"
                          step="0.001"
                          className="w-full text-right p-1.5 rounded-lg bg-amber-50 border border-amber-300 font-mono font-bold text-xs outline-none"
                          value={item.rateUSD || ""}
                          placeholder="0.000"
                          onChange={(e) => handleFieldChange(idx, "rateUSD", parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200 text-right font-mono">
                        <FormattedNumberInput
                          className="w-full text-right p-1.5 rounded-lg bg-cyan-50 border border-cyan-300 font-mono font-bold text-xs outline-none"
                          value={item.rateIDR === 0 ? "" : (item.rateIDR ?? "")}
                          placeholder="0"
                          onChange={(val) => handleFieldChange(idx, "rateIDR", val)}
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200 text-center">
                        <input
                          type="number"
                          className="w-20 text-center p-1.5 rounded-lg bg-slate-50 border border-slate-300 font-mono font-bold text-xs outline-none"
                          value={item.baseDistanceMeters || 0}
                          onChange={(e) => handleFieldChange(idx, "baseDistanceMeters", parseFloat(e.target.value) || 0)}
                        /> m
                      </td>
                      <td className="p-2 pr-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* POS / GENERIC USD TABLE */
            <div className="overflow-x-auto rounded-2xl border-2 border-slate-200 shadow-xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-black uppercase text-[11px]">
                    <th className="p-3 pl-4 border-r border-slate-800 w-44">KATEGORI</th>
                    <th className="p-3 border-r border-slate-800">ITEM SOW (USD RATE)</th>
                    <th className="p-3 border-r border-slate-800 text-center w-28">SATUAN</th>
                    <th className="p-3 border-r border-slate-800 text-right bg-amber-950 text-amber-300 w-40">RATE (USD)</th>
                    <th className="p-3 border-r border-slate-800 text-right bg-emerald-950 text-emerald-300 w-48">KONVERSI IDR (M-RATE)</th>
                    <th className="p-3 pr-4 text-center w-12">#</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {itemsGrid.map((item, idx) => {
                    const idrConverted = (Number(item.rateUSD) || 0) * mrateBi;
                    return (
                      <tr key={idx} className="hover:bg-amber-50/30 transition">
                        <td className="p-2 pl-4 border-r border-slate-200">
                          <input
                            type="text"
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 font-bold text-slate-800 outline-none"
                            value={item.category || "Operation & Mining"}
                            onChange={(e) => handleFieldChange(idx, "category", e.target.value)}
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <input
                            type="text"
                            className="w-full font-bold text-slate-900 bg-transparent px-2 py-1 outline-none border border-transparent focus:border-cyan-500 rounded"
                            value={item.itemName}
                            onChange={(e) => handleFieldChange(idx, "itemName", e.target.value)}
                            placeholder="Nama item..."
                            required
                          />
                        </td>
                        <td className="p-2 text-center font-mono font-bold text-slate-700 border-r border-slate-200">
                          <input
                            type="text"
                            className="w-full text-center font-mono font-bold text-slate-600 bg-transparent px-1 py-1 outline-none border border-transparent focus:border-cyan-500 rounded"
                            value={item.unit}
                            onChange={(e) => handleFieldChange(idx, "unit", e.target.value)}
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200 text-right">
                          <input
                            type="number"
                            step="0.001"
                            className="w-full text-right font-mono font-black text-slate-950 bg-amber-50 border border-amber-300 rounded px-2 py-1 outline-none text-xs"
                            value={item.rateUSD ?? ""}
                            onChange={(e) => handleFieldChange(idx, "rateUSD", parseFloat(e.target.value) || 0)}
                            required
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200 text-right font-mono font-black text-emerald-800 bg-emerald-50/20">
                          {formatIDR(idrConverted)}
                        </td>
                        <td className="p-2 pr-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
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
          )}

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500 font-medium">
              {isBGG
                ? "* Tarif bertingkat akan otomatis terhubung ke sistem kalkulasi invoice saat Coal Index diinput."
                : isSBS
                ? "* Tarif IDR SBS otomatis terhubung ke Berita Acara & Invoice Section P."
                : `* Tarif otomatis dikonversi dengan kurs M-Rate BI (${formatIDR(mrateBi)}).`}
            </span>
            <div className="flex gap-2.5">
              <button
                type="button"
                className="px-5 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                onClick={() => navigate("/variable-sow")}
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-2xl bg-cyan-800 hover:bg-cyan-900 text-white font-black text-xs shadow-md transition active:scale-95 cursor-pointer"
              >
                Simpan Tariff Grid SOW
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

