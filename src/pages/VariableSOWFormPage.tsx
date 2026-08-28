import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";
import { api, getCompanies, type Company } from "../lib/api";
import { defaultSOWTemplate } from "./VariableSOWPage";

const formatIDR = (val: number) => {
  if (!val && val !== 0) return "Rp 0";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 2 }).format(val);
};

export function VariableSOWFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const contractGroup = location.state?.contractGroup;
  const mrateBi = location.state?.mrateBi || 17923.30;

  const [companyList, setCompanyList] = useState<Company[]>([]);

  const isEditing = !!contractGroup;

  const [headerForm, setHeaderForm] = useState<any>({
    companyName: contractGroup?.companyName || "",
    companyCode: contractGroup?.companyCode || "",
    contractNo: contractGroup?.contractNo || "",
    type: contractGroup?.type || "generic"
  });

  const [itemsGrid, setItemsGrid] = useState<any[]>(
    contractGroup?.items
      ? contractGroup.items.map((i: any) => ({ ...i }))
      : defaultSOWTemplate.map((i: any) => ({ ...i }))
  );

  useEffect(() => {
    getCompanies().then((c) => { if (Array.isArray(c)) setCompanyList(c); }).catch(() => {});
  }, []);

  // If creating a new grid and no company is chosen yet, select the first API
  // company so the header is never blank.
  useEffect(() => {
    if (isEditing || headerForm.companyCode) return;
    if (companyList.length === 0) return;
    const first = companyList[0];
    setHeaderForm((prev: any) => ({
      ...prev,
      companyName: first.name,
      companyCode: first.code,
      contractNo: ""
    }));
  }, [companyList, isEditing, headerForm.companyCode]);

  const handleRateChange = (idx: number, field: string, val: string) => {
    const num = parseFloat(val);
    const updated = [...itemsGrid];
    updated[idx] = { ...updated[idx], [field]: isNaN(num) ? 0 : num };
    setItemsGrid(updated);
  };

  const handleSaveGrid = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      for (const item of itemsGrid) {
        const payload = {
          category: item.category,
          itemName: item.itemName,
          rateUSD: item.rateUSD || 0,
          rateIDR: item.rateIDR || item.tier3Rate || 0,
          tier1Rate: item.tier1Rate || 0,
          tier2Rate: item.tier2Rate || 0,
          tier3Rate: item.tier3Rate || 0,
          splitPercentage: item.splitPercentage || 0,
          baseDistanceMeters: item.baseDistanceMeters || 0,
          unit: item.unit,
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
      navigate("/variable-sow", { state: { notice: `✅ Grid Tarif Variable SOW untuk ${headerForm.companyName} (${headerForm.contractNo}) berhasil disimpan!` } });
    } catch (err: any) {
      console.error(err?.message || "Gagal menyimpan Grid Variable SOW");
    }
  };

  const isCoalClient = headerForm.type === "coal";

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 mt-6">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 w-full shadow-sm space-y-6">
        <div className="flex items-start gap-4 border-b border-slate-100 pb-4">
          <button
            className="icon-btn shrink-0"
            onClick={() => navigate("/variable-sow")}
            title="Kembali"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-cyan-900 bg-cyan-50 px-3 py-1 rounded-full border border-cyan-200">
              <FileSpreadsheet size={14} /> Form Master Tariff Grid SOW
            </span>
            <h3 className="text-xl font-black text-slate-900 mt-1.5">
              {isEditing ? `Tariff Grid SOW — ${headerForm.companyName}` : "Input Tariff Grid SOW Baru"}
            </h3>
          </div>
        </div>

        {/* HEADER SELECTION FORM */}
        <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-black uppercase text-slate-700 mb-1">
              Nama Perusahaan <span className="text-rose-600">*</span>
            </label>
            <select
              className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-extrabold focus:border-cyan-700 outline-none"
              value={headerForm.companyCode}
              onChange={(e) => {
                const code = e.target.value;
                const opt = companyList.find((o) => o.code === code);
                setHeaderForm({
                  companyName: opt?.name || code,
                  companyCode: code,
                  contractNo: headerForm.contractNo,
                  type: "generic"
                });
                setItemsGrid(defaultSOWTemplate.map(i => ({ ...i })));
              }}
            >
              {companyList.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.name} ({opt.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-700 mb-1">
              Kode Perusahaan
            </label>
            <input
              type="text"
              className="w-full bg-slate-100 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-black font-mono"
              value={headerForm.companyCode}
              readOnly
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-700 mb-1">
              Nomor Kontrak <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-bold focus:border-cyan-700 outline-none font-mono"
              value={headerForm.contractNo}
              onChange={(e) => setHeaderForm({ ...headerForm, contractNo: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-700 mb-1">
              Model Tarif SOW
            </label>
            <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-2.5 text-xs text-cyan-950 font-black">
              {isCoalClient ? "⚡ Matrix Multi-Tier Coal Index" : `${formatIDR(mrateBi)} / USD (M-Rate BI)`}
            </div>
          </div>
        </div>

        {/* FORM TABLE */}
        <form onSubmit={handleSaveGrid} className="space-y-4">
          {isCoalClient ? (
            <div className="overflow-x-auto rounded-2xl border-2 border-slate-200 shadow-sm">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-black uppercase text-[11px]">
                    <th className="p-3.5 pl-4 border-r border-slate-800">ITEM PEKERJAAN (SOW)</th>
                    <th className="p-3.5 border-r border-slate-800 text-center">SATUAN</th>
                    <th className="p-3.5 border-r border-slate-800 text-right bg-emerald-950 text-emerald-300">TIER 1 (&lt; $50)</th>
                    <th className="p-3.5 border-r border-slate-800 text-right bg-blue-950 text-blue-300">TIER 2 ($50 - $75)</th>
                    <th className="p-3.5 border-r border-slate-800 text-right bg-amber-950 text-amber-300">TIER 3 (&gt; $75)</th>
                    <th className="p-3.5 border-r border-slate-800 text-center">SPLIT %</th>
                    <th className="p-3.5 pr-4 text-center">BASE DIST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {itemsGrid.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 pl-4 font-black text-slate-900 border-r border-slate-200">{item.itemName}</td>
                      <td className="p-3 text-center font-mono font-bold text-slate-600 border-r border-slate-200">{item.unit}</td>
                      <td className="p-2 border-r border-slate-200 text-right">
                        <input type="number" className="w-full text-right p-2 rounded-xl bg-emerald-50/70 border border-emerald-300 font-mono font-bold text-xs" value={item.tier1Rate || ""} onChange={(e) => handleRateChange(idx, "tier1Rate", e.target.value)} />
                      </td>
                      <td className="p-2 border-r border-slate-200 text-right">
                        <input type="number" className="w-full text-right p-2 rounded-xl bg-blue-50/70 border border-blue-300 font-mono font-bold text-xs" value={item.tier2Rate || ""} onChange={(e) => handleRateChange(idx, "tier2Rate", e.target.value)} />
                      </td>
                      <td className="p-2 border-r border-slate-200 text-right">
                        <input type="number" className="w-full text-right p-2 rounded-xl bg-amber-50 border border-amber-400 font-mono font-black text-amber-950 text-xs" value={item.tier3Rate || ""} onChange={(e) => handleRateChange(idx, "tier3Rate", e.target.value)} />
                      </td>
                      <td className="p-2 border-r border-slate-200 text-center">
                        <input type="number" className="w-16 text-center p-2 rounded-xl bg-slate-50 border border-slate-300 font-mono font-bold text-xs" value={item.splitPercentage || 100} onChange={(e) => handleRateChange(idx, "splitPercentage", e.target.value)} /> %
                      </td>
                      <td className="p-2 pr-4 text-center">
                        <input type="number" className="w-20 text-center p-2 rounded-xl bg-slate-50 border border-slate-300 font-mono font-bold text-xs" value={item.baseDistanceMeters || 0} onChange={(e) => handleRateChange(idx, "baseDistanceMeters", e.target.value)} /> m
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border-2 border-slate-200 shadow-sm">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-black uppercase text-[11px]">
                    <th className="p-3.5 pl-4 border border-amber-900 bg-amber-800 w-1/2">ITEM SOW (USD RATE)</th>
                    <th className="p-3.5 border border-amber-900 bg-amber-600 text-slate-950 text-center w-1/6">Rate (USD)</th>
                    <th className="p-3.5 border border-amber-900 bg-amber-700 text-center w-1/6">Unit</th>
                    <th className="p-3.5 pr-4 border border-emerald-950 bg-emerald-800 text-right w-1/6">Konversi IDR (M-Rate)</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsGrid.map((item, idx) => {
                    const idrConverted = (item.rateUSD || 0) * mrateBi;
                    return (
                      <tr key={idx} className="hover:bg-amber-50/40 border-b border-slate-200 transition">
                        <td className="p-3 pl-4 font-bold text-slate-900 bg-white">{item.itemName}</td>
                        <td className="p-0 bg-yellow-200">
                          <input type="number" step="0.001" className="w-full text-right font-mono font-black text-slate-950 bg-yellow-200 px-3 py-2 outline-none text-xs border-none" value={item.rateUSD} onChange={(e) => handleRateChange(idx, "rateUSD", e.target.value)} required />
                        </td>
                        <td className="p-3 text-center font-mono font-extrabold text-slate-700 bg-slate-50">{item.unit}</td>
                        <td className="p-3 pr-4 text-right font-mono font-black text-emerald-800 bg-emerald-50/40">{formatIDR(idrConverted)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500 font-medium">
              {isCoalClient ? "* Tarif bertingkat akan otomatis terhubung ke sistem kalkulasi invoice saat Coal Index diinput." : `* Tarif otomatis dikonversi dengan kurs M-Rate BI (${formatIDR(mrateBi)}).`}
            </span>
            <div className="flex gap-2.5">
              <button type="button" className="px-5 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer" onClick={() => navigate("/variable-sow")}>
                Batal
              </button>
              <button type="submit" className="px-6 py-2.5 rounded-2xl bg-cyan-800 hover:bg-cyan-900 text-white font-black text-xs shadow-md transition active:scale-95 cursor-pointer">
                Simpan Tariff Grid SOW
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
