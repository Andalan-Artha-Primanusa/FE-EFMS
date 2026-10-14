import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileSpreadsheet, Plus, Trash2, RefreshCw, Sparkles, DollarSign, Layers, Loader2, AlertCircle } from "lucide-react";
import { api } from "../lib/api";
import { latestPeriodMRate, loadSOWCustomerSites, normalizeSOWSiteCode, sowModel, SOW_MODEL_LABELS } from "./VariableSOWPage";
import { FormattedNumberInput, formatIDR } from "./finance/helpers";
import { routes } from "../router/routes";

// Nama item dicocokkan seperti BE (sowFor): huruf/angka saja, persis lalu saling memuat.
const normName = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const sameItemName = (a: string, b: string) => {
  const x = normName(a), y = normName(b);
  return x === y || (x.length > 3 && y.length > 3 && (x.includes(y) || y.includes(x)));
};
const BGG_REQUIRED_ITEMS = ["Coal Winning", "Over Distance For OB Removal", "Over Distance For Coal Winning"];
// Nama lookup tarif PTRO (ptroContractRates); wajib persis agar "COAL GETTING" tidak tertukar dengan "OVERHAUL COAL GETTING".
const PTRO_REQUIRED_ITEMS = ["OVER BURDEN", "COAL GETTING", "OVERHAUL OB", "OVERHAUL COAL GETTING"];

export function VariableSOWFormPage() {
  const navigate = useNavigate();
  const { id: routeCode } = useParams();
  const isEditing = !!routeCode;

  const [sites, setSites] = useState<any[]>([]);
  // Saran nama item = item Variable SOW yang sudah tersimpan di DB (semua customer).
  const [sowCatalog, setSowCatalog] = useState<any[]>([]);
  const [mrateBi, setMrateBi] = useState(0);
  useEffect(() => {
    loadSOWCustomerSites().then(setSites);
    api<any[]>("/api/master-data/daily-exchange-rates").then((r) => setMrateBi(latestPeriodMRate(r).rate)).catch(() => {});
  }, []);

  const [headerForm, setHeaderForm] = useState<any>({
    companyName: "",
    companyCode: (routeCode || "").toUpperCase(),
    contractNo: "",
  });

  // Mode edit (/variable-sow/:kode/edit): nama & nomor kontrak dari Master Customer.
  useEffect(() => {
    const site = sites.find((s) => s.code === headerForm.companyCode);
    if (site) setHeaderForm((h: any) => ({ ...h, companyName: h.companyName || site.name, contractNo: h.contractNo || site.contractNo }));
  }, [sites]);

  const [itemsGrid, setItemsGrid] = useState<any[]>([]);
  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Grid = item tersimpan milik customer terpilih; respons customer sebelumnya diabaikan.
  useEffect(() => {
    let cancelled = false;
    const cCode = normalizeSOWSiteCode(headerForm.companyCode);
    setItemsGrid([]);
    setDeletedIds([]);
    api<any[]>("/api/master-data/variable-sow")
      .then((res) => {
        if (cancelled || !Array.isArray(res)) return;
        setSowCatalog(res);
        setItemsGrid(cCode ? res.filter((it) => normalizeSOWSiteCode(it.customerCode || it.customer || "") === cCode).map((it) => ({ ...it })) : []);
      })
      .catch((err) => console.error("Failed to fetch fresh SOW list:", err));
    return () => { cancelled = true; };
  }, [headerForm.companyCode]);

  const handleFieldChange = (idx: number, field: string, val: any) => {
    setItemsGrid(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: val };
      return updated;
    });
  };

  const handleMultiFieldChange = (idx: number, fields: Record<string, any>) => {
    setItemsGrid(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], ...fields };
      return updated;
    });
  };

  const handleAddRow = () => {
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
      baseDistanceMeters: 0,
      maxDistanceMeters: 0,
      status: "Active"
    };
    setItemsGrid(prev => [...prev, newRow]);
  };

  const handleRemoveRow = (idx: number) => {
    const target = itemsGrid[idx];
    if (target?.id) {
      setDeletedIds(prev => [...prev, target.id]);
    }
    setItemsGrid(itemsGrid.filter((_, i) => i !== idx));
  };

  // Model tarif dari Master Customer (kosong = default per kode) menentukan tabel & relasi kalkulasi.
  const model = sowModel(headerForm.companyCode, sites.find((s) => s.code === headerForm.companyCode)?.sowModel);
  const isBGG = model === "coal";
  const isSBS = model === "idr";
  const isPTRO = model === "multi";

  // Relasi kalkulasi BGG (BE): item dicari per nama, OB 1/OB 2 = item ber-split 0-100% tanpa kata coal/distance.
  const activeItems = itemsGrid.filter((i) => i.status !== "Inactive" && (i.itemName || "").trim());
  const sowWarnings = isBGG ? [
    ...BGG_REQUIRED_ITEMS.filter((n) => !activeItems.some((i) => sameItemName(i.itemName, n)))
      .map((n) => `Item "${n}" belum ada/aktif — tarifnya akan 0 di kalkulasi invoice.`),
    ...(activeItems.filter((i) => Number(i.splitPercentage) > 0 && Number(i.splitPercentage) < 100 && !/distance|coal/i.test(i.itemName)).length < 2
      ? ["Butuh 2 item OB Removal aktif dengan Split % di bawah 100 (mis. 75% & 25%) dan nama tanpa kata \"coal\"/\"distance\" — tanpa itu tarif OB 1/OB 2 jadi 0."]
      : []),
  ] : isPTRO ? PTRO_REQUIRED_ITEMS.filter((n) => !activeItems.some((i) => normName(i.itemName) === normName(n)))
    .map((n) => `Item "${n}" belum ada/aktif dengan nama persis — tarif BA & invoice PTRO untuk item ini bisa 0 atau salah ambil.`)
    : [];

  const handleSaveGrid = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    try {
      if (itemsGrid.some((item) => item.id && !(item.itemName || "").trim())) {
        throw new Error("Nama item SOW yang sudah tersimpan tidak boleh dikosongkan. Hapus barisnya bila tidak dipakai.");
      }
      const validItems = itemsGrid.filter(item => item.itemName && item.itemName.trim() !== "");
      if (validItems.length === 0 && deletedIds.length === 0) {
        throw new Error("Mohon masukkan minimal 1 item material/layanan SOW dengan nama yang valid.");
      }

      const items = validItems.map((item) => ({
        id: item.id,
        category: item.category || "General",
        itemName: item.itemName.trim(),
        rateUSD: Number(item.rateUSD || 0),
        rateIDR: Number(item.rateIDR || 0),
        // Tarif tier hanya untuk BGG (Coal Index); site lain tidak punya kolom tier sehingga dikosongkan.
        tier1Rate: isBGG ? Number(item.tier1Rate || 0) : 0,
        tier2Rate: isBGG ? Number(item.tier2Rate || 0) : 0,
        tier3Rate: isBGG ? Number(item.tier3Rate || 0) : 0,
        splitPercentage: Number(item.splitPercentage || 100),
        baseDistanceMeters: Number(item.baseDistanceMeters || 0),
        maxDistanceMeters: Number(item.maxDistanceMeters || 0),
        unit: item.unit || "BCM",
        customer: headerForm.companyCode,
        customerCode: headerForm.companyCode,
        contractNo: headerForm.contractNo,
        description: `Contract ${headerForm.contractNo}`,
        status: item.status || "Active",
        createdAt: item.createdAt
      }));
      // Satu request atomik: BE menolak semuanya bila ada item terhapus yang masih dipakai BA/invoice.
      await api("/api/master-data/variable-sow/grid", { method: "POST", body: JSON.stringify({ items, deleteIds: deletedIds }) });
      navigate(routes.variableSOW.list, { state: { notice: `Tariff Grid Variable SOW untuk ${headerForm.companyName} (${headerForm.contractNo || "Aktif"}) berhasil disimpan.` } });
    } catch (err: any) {
      console.error("Gagal menyimpan Grid Variable SOW:", err);
      setSaveError(err?.message || "Gagal menyimpan Tariff Grid SOW ke server. Pastikan koneksi backend aktif.");
    } finally {
      setIsSaving(false);
    }
  };

  // Aksi baris: aktif/nonaktifkan (item yang dipakai BA/invoice tidak bisa dihapus) & hapus.
  const rowActions = (idx: number) => {
    const inactive = itemsGrid[idx]?.status === "Inactive";
    return (
      <div className="flex items-center justify-center gap-1">
        <button
          type="button"
          onClick={() => handleFieldChange(idx, "status", inactive ? "Active" : "Inactive")}
          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${inactive ? "bg-slate-100 text-slate-500 border-slate-300" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}
          title={inactive ? "Aktifkan kembali" : "Nonaktifkan (tidak dipakai kalkulasi BA/Invoice)"}
        >
          {inactive ? "Nonaktif" : "Aktif"}
        </button>
        <button
          type="button"
          onClick={() => handleRemoveRow(idx)}
          className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
        >
          <Trash2 size={14} />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 mt-4">
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 w-full shadow-2xs space-y-5">
        <div className="flex items-start gap-3 border-b border-slate-100 pb-3.5">
          <button
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition shadow-2xs cursor-pointer"
            onClick={() => navigate(routes.variableSOW.list)}
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
                const opt = sites.find((o) => o.code === code);
                setHeaderForm({
                  companyName: opt?.name || code,
                  companyCode: code,
                  contractNo: opt?.contractNo || ""
                });
              }}
            >
              <option value="" disabled>— Pilih customer (Master Customer) —</option>
              {sites.map((opt) => (
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
            {/* Sumber tunggal: Master Customer (yang juga ditampilkan di daftar Variable SOW). */}
            <input
              type="text"
              className="w-full bg-slate-100 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-bold font-mono"
              value={headerForm.contractNo}
              placeholder="Atur di Master Customer"
              title="Ubah nomor kontrak di Master Customer"
              readOnly
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Model Tarif SOW
            </label>
            <div className="bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 font-bold flex items-center gap-1.5 shadow-2xs">
              {model === "usd" ? <>{formatIDR(mrateBi)} / USD (M-Rate BI)</> : SOW_MODEL_LABELS[model]}
            </div>
          </div>
        </div>

        {/* FORM TABLE */}
        <form onSubmit={handleSaveGrid} className="space-y-4">
          {saveError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-[3px] text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}
          {sowWarnings.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-[3px] text-amber-900 text-xs font-bold space-y-1">
              {sowWarnings.map((w) => (
                <div key={w} className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-amber-600 shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              Rincian Item Pekerjaan & Parameter Tarif ({itemsGrid.length} Baris)
            </span>
            <div className="flex items-center gap-2">
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
            <div className="overflow-x-auto rounded-[4px] border border-slate-200 shadow-xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-black uppercase text-[11px]">
                    <th className="p-3 pl-4 border-r border-slate-800">ITEM PEKERJAAN (SOW)</th>
                    <th className="p-3 border-r border-slate-800 text-center w-20">SATUAN</th>
                    <th className="p-3 border-r border-slate-800 text-right bg-emerald-950 text-emerald-300 w-32">TIER 1 (R3 &le; $50)</th>
                    <th className="p-3 border-r border-slate-800 text-right bg-blue-950 text-blue-300 w-32">TIER 2 ($50 - $75)</th>
                    <th className="p-3 border-r border-slate-800 text-right bg-amber-950 text-amber-300 w-32">TIER 3 (R3 &gt; $75)</th>
                    <th className="p-3 border-r border-slate-800 text-center w-24">SPLIT %</th>
                    <th className="p-3 border-r border-slate-800 text-center w-28">BASE DIST</th>
                    <th className="p-3 pr-4 text-center w-28">STATUS</th>
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
                          value={item.tier3Rate ?? ""}
                          onChange={(val) => {
                            handleFieldChange(idx, "tier3Rate", val);
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
                        {rowActions(idx)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : isSBS ? (
            /* SBS IDR RATES TABLE (OB, RENTAL ALAT, PENGURANG BIAYA) */
            <div className="overflow-x-auto rounded-[4px] border border-slate-200 shadow-xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-black uppercase text-[11px]">
                    <th className="p-3 pl-4 border-r border-slate-800 w-44">KATEGORI</th>
                    <th className="p-3 border-r border-slate-800">ITEM PEKERJAAN (SOW SBS)</th>
                    <th className="p-3 border-r border-slate-800 text-center w-28">SATUAN</th>
                    <th className="p-3 border-r border-slate-800 text-right w-48 bg-cyan-950 text-cyan-300">TARIF DASAR (RP)</th>
                    <th className="p-3 border-r border-slate-800 text-center w-44">RENTANG JARAK (M)</th>
                    <th className="p-3 pr-4 text-center w-28">STATUS</th>
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
                          <option value="Tarif Jarak Angkut">Tarif Jarak Angkut (OB per rentang jarak)</option>
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
                      <td className="p-2 border-r border-slate-200 text-center whitespace-nowrap" title="Isi untuk tarif OB per rentang jarak angkut (kategori Tarif Jarak Angkut)">
                        <input type="number" className="w-16 text-center p-1 rounded bg-slate-50 border border-slate-300 font-mono text-xs outline-none"
                          value={item.baseDistanceMeters || ""} placeholder="min"
                          onChange={(e) => handleFieldChange(idx, "baseDistanceMeters", parseFloat(e.target.value) || 0)} />
                        {" – "}
                        <input type="number" className="w-16 text-center p-1 rounded bg-slate-50 border border-slate-300 font-mono text-xs outline-none"
                          value={item.maxDistanceMeters || ""} placeholder="maks"
                          onChange={(e) => handleFieldChange(idx, "maxDistanceMeters", parseFloat(e.target.value) || 0)} />
                      </td>
                      <td className="p-2 pr-4 text-center">
                        {rowActions(idx)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : isPTRO ? (
            /* PTRO MULTI-CURRENCY TABLE */
            <div className="overflow-x-auto rounded-[4px] border border-slate-200 shadow-xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-black uppercase text-[11px]">
                    <th className="p-3 pl-4 border-r border-slate-800 w-44">KATEGORI</th>
                    <th className="p-3 border-r border-slate-800">ITEM PEKERJAAN (PTRO)</th>
                    <th className="p-3 border-r border-slate-800 text-center w-24">SATUAN</th>
                    <th className="p-3 border-r border-slate-800 text-right w-36 bg-amber-950 text-amber-300">RATE USD ($)</th>
                    <th className="p-3 border-r border-slate-800 text-right w-36 bg-cyan-950 text-cyan-300">RATE IDR (RP)</th>
                    <th className="p-3 border-r border-slate-800 text-center w-28">BASE DIST</th>
                    <th className="p-3 pr-4 text-center w-28">STATUS</th>
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
                        {rowActions(idx)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* POS / GENERIC USD TABLE */
            <div className="overflow-x-auto rounded-[4px] border border-slate-200 shadow-xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-black uppercase text-[11px]">
                    <th className="p-3 pl-4 border-r border-slate-800 w-44">KATEGORI</th>
                    <th className="p-3 border-r border-slate-800">ITEM SOW (USD RATE)</th>
                    <th className="p-3 border-r border-slate-800 text-center w-28">SATUAN</th>
                    <th className="p-3 border-r border-slate-800 text-right bg-amber-950 text-amber-300 w-40">RATE (USD)</th>
                    <th className="p-3 border-r border-slate-800 text-right bg-emerald-950 text-emerald-300 w-48">KONVERSI IDR (M-RATE)</th>
                    <th className="p-3 pr-4 text-center w-28">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {itemsGrid.map((item, idx) => {
                    const idrConverted = (Number(item.rateUSD) || 0) * mrateBi;
                    return (
                      <tr key={idx} className="hover:bg-amber-50/30 transition">
                        <td className="p-2 pl-4 border-r border-slate-200">
                          <select
                            className="w-full bg-slate-50 border border-slate-300 rounded-[3px] p-1.5 text-xs font-bold text-slate-800 outline-none focus:border-[#A57C50]"
                            value={item.category || "Operation & Mining"}
                            onChange={(e) => {
                              const newCat = e.target.value;
                              handleFieldChange(idx, "category", newCat);
                            }}
                          >
                            <option value="Operation & Mining">Operation & Mining</option>
                            <option value="Rehabilitation">Rehabilitation</option>
                            <option value="Mine Development (MDO)">Mine Development (MDO)</option>
                            {item.category && !["Operation & Mining", "Rehabilitation", "Mine Development (MDO)"].includes(item.category) && (
                              <option value={item.category}>{item.category}</option>
                            )}
                          </select>
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          {(() => {
                            const curCat = (item.category || "Operation & Mining").toLowerCase();
                            const categoryOptions = sowCatalog
                              .filter((tpl: any) => (tpl.category || "").toLowerCase() === curCat && tpl.itemName)
                              .filter((tpl: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.itemName === tpl.itemName) === i);
                            const isPredefined = categoryOptions.some((t: any) => t.itemName === item.itemName);
                            return (
                              <div className="space-y-1">
                                <select
                                  className="w-full bg-white border border-slate-300 rounded-[3px] p-1.5 text-xs font-bold text-slate-900 outline-none focus:border-[#A57C50] shadow-2xs"
                                  value={item.isCustom ? "Lainnya" : (item.itemName || "")}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === "Lainnya") {
                                      handleMultiFieldChange(idx, { isCustom: true, itemName: "" });
                                    } else {
                                      const found: any = categoryOptions.find((tpl: any) => tpl.itemName === val);
                                      if (found) {
                                        handleMultiFieldChange(idx, {
                                          itemName: found.itemName,
                                          unit: found.unit,
                                          rateUSD: Number(found.rateUSD || 0),
                                          category: found.category,
                                          isCustom: false
                                        });
                                      } else {
                                        handleFieldChange(idx, "itemName", val);
                                      }
                                    }
                                  }}
                                >
                                  <option value="" disabled>-- Pilih Item SOW ({item.category || "POS"}) --</option>
                                  {categoryOptions.map((opt: any, oIdx: number) => (
                                    <option key={oIdx} value={opt.itemName}>
                                      {opt.itemName} ({opt.unit})
                                    </option>
                                  ))}
                                  {item.itemName && !categoryOptions.some((o: any) => o.itemName === item.itemName) && !item.isCustom && (
                                    <option value={item.itemName}>{item.itemName}</option>
                                  )}
                                  <option value="Lainnya">+ Custom / Item Lainnya...</option>
                                </select>
                                {(item.isCustom || (!isPredefined && item.itemName)) && (
                                  <input
                                    type="text"
                                    className="w-full font-bold text-slate-900 bg-amber-50/60 border border-amber-300 focus:border-[#A57C50] rounded-[3px] px-2 py-1 outline-none text-xs placeholder:text-slate-400"
                                    value={item.itemName || ""}
                                    onChange={(e) => handleFieldChange(idx, "itemName", e.target.value)}
                                    placeholder="Ketik rincian item custom..."
                                    required
                                  />
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="p-2 text-center font-mono font-bold text-slate-700 border-r border-slate-200">
                          <input
                            type="text"
                            className="w-full text-center font-mono font-bold text-slate-700 bg-transparent px-1 py-1 outline-none border border-transparent focus:border-cyan-500 rounded"
                            value={item.unit || ""}
                            onChange={(e) => handleFieldChange(idx, "unit", e.target.value)}
                            placeholder="USD/BCM"
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
                          {rowActions(idx)}
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
                className="px-5 py-2 rounded-[3px] border border-slate-300 bg-white text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                onClick={() => navigate(routes.variableSOW.list)}
                disabled={isSaving}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 rounded-[3px] bg-[#A57C50] hover:bg-[#8e6941] text-white font-black text-xs shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving && <Loader2 size={14} className="animate-spin" />}
                <span>{isSaving ? "Menyimpan..." : "Simpan Tariff Grid SOW"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

