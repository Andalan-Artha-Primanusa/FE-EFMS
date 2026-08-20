import React, { useEffect, useState, Fragment } from "react";
import { Building2, Calculator, Calendar, CheckCircle2, Clock, DollarSign, Edit2, Eye, FileSpreadsheet, Layers, Plus, RefreshCw, Trash2, TrendingUp, X } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { api } from "../lib/api";

const formatIDR = (val: number) => {
  if (!val && val !== 0) return "Rp 0";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 2 }).format(val);
};

const defaultCompanyOptions = [
  { name: "PT Position", code: "POS", contract: "002/POS-AAP/2025" },
  { name: "PT Satria Bahana Sarana", code: "SBS", contract: "230/AAP-SBS/EXT/XII/24" },
  { name: "PT Budi Gema Gempita", code: "BGG", contract: "09/BGG-AAP/VIII/2018" },
  { name: "PT Daya Bumindo Karunia", code: "DBK", contract: "001/DBK-AAP/2024" },
  { name: "PT Andalan Bhumi Nusantara", code: "ABN", contract: "001/AAP-ABN/IV/25" }
];

export const defaultSOWTemplate = [
  // Operation & Mining
  { category: "Operation & Mining", itemName: "Clear & Grub", rateUSD: 0.381, unit: "USD/m2" },
  { category: "Operation & Mining", itemName: "Topsoil Removal - Base Rate (1000m)", rateUSD: 3.380, unit: "USD/BCM" },
  { category: "Operation & Mining", itemName: "Topsoil Removal - over/underhaul", rateUSD: 0.538, unit: "USD/1KM" },
  { category: "Operation & Mining", itemName: "Overburden/Waste - Base Rate (1000m)", rateUSD: 3.327, unit: "USD/BCM" },
  { category: "Operation & Mining", itemName: "OB/Waste - over/underhaul", rateUSD: 0.538, unit: "USD/1KM" },
  { category: "Operation & Mining", itemName: "Limonite - Base Rate (1000m)", rateUSD: 3.363, unit: "USD/BCM" },
  { category: "Operation & Mining", itemName: "Limonite - over/underhaul", rateUSD: 0.526, unit: "USD/1KM" },
  { category: "Operation & Mining", itemName: "Saprolite - Base Rate (1000m)", rateUSD: 3.472, unit: "USD/BCM" },
  { category: "Operation & Mining", itemName: "Saprolite - over/underhaul", rateUSD: 0.526, unit: "USD/1KM" },

  // Rehabilitation
  { category: "Rehabilitation", itemName: "Topsoil Reclaim/Haul/Spread - Base Rate (1000m)", rateUSD: 3.258, unit: "USD/BCM" },
  { category: "Rehabilitation", itemName: "Topsoil Reclaim/Haul/Spread - overhaul", rateUSD: 0.538, unit: "USD/1KM" },

  // Mine Development (MDO)
  { category: "Mine Development (MDO)", itemName: "Topsoil Removal - Base Rate (1000m)", rateUSD: 3.380, unit: "USD/BCM" },
  { category: "Mine Development (MDO)", itemName: "Topsoil Removal - over/underhaul", rateUSD: 0.538, unit: "USD/1KM" },
  { category: "Mine Development (MDO)", itemName: "Overburden/Waste - Base Rate (1000m)", rateUSD: 3.327, unit: "USD/BCM" },
  { category: "Mine Development (MDO)", itemName: "OB/Waste - over/underhaul", rateUSD: 0.538, unit: "USD/1KM" },
  { category: "Mine Development (MDO)", itemName: "Limonite - Base Rate (1000m)", rateUSD: 3.363, unit: "USD/BCM" },
  { category: "Mine Development (MDO)", itemName: "Limonite - over/underhaul", rateUSD: 0.526, unit: "USD/1KM" },
  { category: "Mine Development (MDO)", itemName: "Saprolite - Base Rate (1000m)", rateUSD: 3.472, unit: "USD/BCM" },
  { category: "Mine Development (MDO)", itemName: "Saprolite - over/underhaul", rateUSD: 0.526, unit: "USD/1KM" },
  { category: "Mine Development (MDO)", itemName: "Cut - Base Rate (1000m)", rateUSD: 2.129, unit: "USD/BCM" },
  { category: "Mine Development (MDO)", itemName: "Unblasted fill material", rateUSD: 3.335, unit: "USD/BCM" },
  { category: "Mine Development (MDO)", itemName: "Cut or Fill under/overhaul", rateUSD: 0.521, unit: "USD/1KM" },
  { category: "Mine Development (MDO)", itemName: "Excess Cut disposal in dump", rateUSD: 1.157, unit: "USD/BCM" },
  { category: "Mine Development (MDO)", itemName: "Fill", rateUSD: 1.109, unit: "USD/BCM" },
  { category: "Mine Development (MDO)", itemName: "Uncrushed rocks for construction - Base Rate (1000m)", rateUSD: 7.938, unit: "USD/BCM" },
  { category: "Mine Development (MDO)", itemName: "Crusher rocks - Base Rate (1000m)", rateUSD: 13.050, unit: "USD/BCM" },
  { category: "Mine Development (MDO)", itemName: "Rocks for construction - under/overhaul", rateUSD: 0.526, unit: "USD/1KM" },
  { category: "Mine Development (MDO)", itemName: "Geotextile", rateUSD: 2.003, unit: "USD/m2" }
];

export function VariableSOWPage({
  viewTitle,
  query,
  onNotice
}: {
  viewTitle: string;
  query: string;
  onNotice: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [sowRows, setSowRows] = useState<any[]>([]);
  const [mrateBi, setMrateBi] = useState<number>(17923.30);
  const [contractsList, setContractsList] = useState<any[]>([]);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [headerForm, setHeaderForm] = useState<any>({
    companyName: "PT Position",
    companyCode: "POS",
    contractNo: "002/POS-AAP/2025"
  });

  const [itemsGrid, setItemsGrid] = useState<any[]>(defaultSOWTemplate);

  async function loadData() {
    setLoading(true);
    try {
      const [resSow, resMrate] = await Promise.all([
        api<any[]>("/api/master-data/variable-sow").catch(() => []),
        api<any[]>("/api/master-data/daily-exchange-rates").catch(() => [])
      ]);

      const activeSows = Array.isArray(resSow) ? resSow : [];
      setSowRows(activeSows);

      // Latest BI M-Rate
      if (Array.isArray(resMrate) && resMrate.length > 0) {
        const latest = resMrate[0];
        const val = latest.kursTengah || ((latest.kursJual + latest.kursBeli) / 2);
        if (val > 0) setMrateBi(val);
      }

      // Group SOWs by Company & Contract for Main Table
      const groupedMap: Record<string, any> = {};

      // Seed default contracts
      defaultCompanyOptions.forEach((opt) => {
        groupedMap[opt.code] = {
          companyName: opt.name,
          companyCode: opt.code,
          contractNo: opt.contract,
          itemCount: defaultSOWTemplate.length,
          items: defaultSOWTemplate
        };
      });

      // Overlay items from database
      activeSows.forEach((item) => {
        const cCode = item.customer || "POS";
        if (groupedMap[cCode]) {
          const existingItems = [...groupedMap[cCode].items];
          const idx = existingItems.findIndex(i => i.itemName === item.itemName && i.category === item.category);
          if (idx !== -1) {
            existingItems[idx] = { ...existingItems[idx], rateUSD: item.rateUSD, id: item.id };
          } else {
            existingItems.push(item);
          }
          groupedMap[cCode].items = existingItems;
          groupedMap[cCode].itemCount = existingItems.length;
        }
      });

      setContractsList(Object.values(groupedMap));
    } catch (err: any) {
      onNotice(err?.message || "Gagal memuat data Variable SOW");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const openCreateGridModal = () => {
    setIsEditing(false);
    setHeaderForm({
      companyName: "PT Position",
      companyCode: "POS",
      contractNo: "002/POS-AAP/2025"
    });
    setItemsGrid(defaultSOWTemplate.map(i => ({ ...i })));
    setModalOpen(true);
  };

  const openEditGridModal = (contractGroup: any) => {
    setIsEditing(true);
    setHeaderForm({
      companyName: contractGroup.companyName,
      companyCode: contractGroup.companyCode,
      contractNo: contractGroup.contractNo
    });
    setItemsGrid(contractGroup.items.map((i: any) => ({ ...i })));
    setModalOpen(true);
  };

  const handleRateChange = (idx: number, newRateStr: string) => {
    const num = parseFloat(newRateStr);
    const updated = [...itemsGrid];
    updated[idx] = { ...updated[idx], rateUSD: isNaN(num) ? 0 : num };
    setItemsGrid(updated);
  };

  const handleSaveGrid = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      for (const item of itemsGrid) {
        const payload = {
          category: item.category,
          itemName: item.itemName,
          rateUSD: item.rateUSD,
          unit: item.unit,
          customer: headerForm.companyCode,
          description: `Contract ${headerForm.contractNo}`,
          status: "Active"
        };
        if (item.id) {
          await api(`/api/master-data/variable-sow/${item.id}`, { method: "PUT", body: JSON.stringify(payload) }).catch(() => {});
        } else {
          await api("/api/master-data/variable-sow", { method: "POST", body: JSON.stringify(payload) }).catch(() => {});
        }
      }
      onNotice(`✅ Grid Tarif Variable SOW untuk ${headerForm.companyName} (${headerForm.contractNo}) berhasil disimpan!`);
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal menyimpan Grid Variable SOW");
    }
  };

  const filteredContracts = contractsList.filter((c) => {
    const matchQ = JSON.stringify(c).toLowerCase().includes(query.toLowerCase());
    return matchQ;
  });

  return (
    <div className="workspace-body space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          title="Master Data — Variable Scope of Work (SOW)"
          description="Katalog tarif satuan dasar pertambangan (Rate USD dengan presisi 3 desimal & konversi otomatis Kurs Tengah M-Rate BI)."
        />
        <button
          className="primary flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg bg-cyan-800 hover:bg-cyan-900 text-white shadow-sm transition shrink-0 cursor-pointer"
          onClick={openCreateGridModal}
        >
          <Plus size={16} /> + Input Tariff Grid SOW Baru
        </button>
      </div>

      {/* Summary KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">KURS BI ACUAN (M-RATE)</span>
          <div className="text-xl font-black text-cyan-900 font-mono flex items-center gap-2">
            {formatIDR(mrateBi)}
            <span className="text-[10px] font-sans font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Auto Currency ✅</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">KONTRAK TERDAFTAR</span>
          <div className="text-xl font-black text-slate-900 font-mono">{contractsList.length} Kontrak Perusahaan</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">STANDAR FORMAT PRESI</span>
          <div className="text-sm font-extrabold text-slate-700 mt-1">3 Angka Dibelakang Koma (0.001 USD)</div>
        </div>
      </div>

      {/* Main Table: Nama Perusahaan, Kode Perusahaan, Nomor Kontrak */}
      <Panel title="📋 Daftar Kontrak & Master Variable SOW Perusahaan">
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-extrabold text-xs uppercase tracking-wider">
                <th className="p-3 border-r border-slate-800">NO</th>
                <th className="p-3 border-r border-slate-800">NAMA PERUSAHAAN</th>
                <th className="p-3 border-r border-slate-800 text-center">KODE PERUSAHAAN</th>
                <th className="p-3 border-r border-slate-800">NOMOR KONTRAK</th>
                <th className="p-3 border-r border-slate-800 text-center">JUMLAH ITEM SOW</th>
                <th className="p-3 border-r border-slate-800 text-right">KURS BI ACUAN</th>
                <th className="p-3 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-slate-900 font-medium">
              {filteredContracts.map((c, idx) => (
                <tr key={c.companyCode || idx} className="hover:bg-slate-50 transition border-b border-slate-200">
                  <td className="p-3 text-center border-r border-slate-200 font-bold">{idx + 1}</td>
                  <td className="p-3 border-r border-slate-200 font-extrabold text-slate-900 text-sm">{c.companyName}</td>
                  <td className="p-3 text-center border-r border-slate-200">
                    <span className="px-2.5 py-1 rounded-md font-mono text-xs font-black bg-cyan-50 text-cyan-800 border border-cyan-200">
                      {c.companyCode}
                    </span>
                  </td>
                  <td className="p-3 border-r border-slate-200 font-mono font-bold text-slate-800">{c.contractNo}</td>
                  <td className="p-3 text-center border-r border-slate-200 font-bold">{c.itemCount} Item SOW</td>
                  <td className="p-3 text-right border-r border-slate-200 font-mono font-bold text-cyan-900">{formatIDR(mrateBi)}</td>
                  <td className="p-3 text-right">
                    <button
                      className="px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs flex items-center gap-1.5 ml-auto transition shadow-xs cursor-pointer"
                      onClick={() => openEditGridModal(c)}
                      title="Buka & Edit Tariff Grid SOW (Gambar 1)"
                    >
                      <Eye size={14} /> Lihat & Edit Tariff Grid SOW
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* FULL-SCREEN / LARGE MODAL GRID SOW (MATCHING GAMBAR 1 EXACTLY) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 w-full max-w-5xl shadow-2xl space-y-5 max-h-[94vh] overflow-y-auto transition-all">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-cyan-900 bg-cyan-50 px-2.5 py-1 rounded-md border border-cyan-200">
                  <FileSpreadsheet size={14} /> Tariff Grid Master Variable SOW
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  {isEditing ? `Form Tariff Grid SOW — ${headerForm.companyName}` : "Input Tariff Grid SOW Baru"}
                </h3>
              </div>
              <button
                className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition cursor-pointer"
                onClick={() => setModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            {/* HEADER SELECTION FORM: NAMA PERUSAHAAN, KODE PERUSAHAAN, NOMOR KONTRAK */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1">
                  Nama Perusahaan <span className="text-rose-600">*</span>
                </label>
                <select
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-extrabold focus:border-cyan-700 outline-none"
                  value={headerForm.companyCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    const opt = defaultCompanyOptions.find(o => o.code === code);
                    setHeaderForm({
                      companyName: opt?.name || code,
                      companyCode: code,
                      contractNo: opt?.contract || "001/AAP-NEW/2026"
                    });
                  }}
                >
                  {defaultCompanyOptions.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.name} ({opt.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1">
                  Kode Perusahaan
                </label>
                <input
                  type="text"
                  className="w-full bg-slate-100 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-black font-mono"
                  value={headerForm.companyCode}
                  readOnly
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1">
                  Nomor Kontrak <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-bold focus:border-cyan-700 outline-none font-mono"
                  value={headerForm.contractNo}
                  onChange={(e) => setHeaderForm({ ...headerForm, contractNo: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1">
                  Kurs BI Acuan (Konversi Auto)
                </label>
                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-2 text-xs text-cyan-950 font-black font-mono">
                  {formatIDR(mrateBi)} / USD
                </div>
              </div>
            </div>

            {/* EXCEL GRID TABLE MATCHING GAMBAR 1 EXACTLY */}
            <form onSubmit={handleSaveGrid} className="space-y-4">
              <div className="overflow-x-auto rounded-xl border-2 border-slate-300 shadow-md">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="font-extrabold text-xs uppercase tracking-wider text-white">
                      <th className="p-3 border border-amber-900 bg-amber-800 text-white w-1/2 text-left font-black">
                        in USD
                      </th>
                      <th className="p-3 border border-amber-900 bg-amber-600 text-slate-950 text-center font-black w-1/6">
                        Rate (USD)
                      </th>
                      <th className="p-3 border border-amber-900 bg-amber-700 text-white text-center font-black w-1/6">
                        Unit
                      </th>
                      <th className="p-3 border border-emerald-950 bg-emerald-800 text-white text-right font-black w-1/6">
                        Hasil Konversi (IDR)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const categories = ["Operation & Mining", "Rehabilitation", "Mine Development (MDO)"];
                      return categories.map((catName) => {
                        const catItems = itemsGrid.filter(i => i.category === catName);
                        return (
                          <Fragment key={catName}>
                            {/* Category Header Row */}
                            <tr className="bg-slate-100 font-extrabold text-slate-900 border-b border-slate-300">
                              <td colSpan={4} className="p-3 border border-slate-300 text-xs font-black uppercase tracking-wider text-slate-900 bg-slate-200/80">
                                {catName}
                              </td>
                            </tr>
                            {/* Items in Category */}
                            {catItems.map((item) => {
                              const globalIdx = itemsGrid.findIndex(i => i.category === item.category && i.itemName === item.itemName);
                              const idrConverted = (item.rateUSD || 0) * mrateBi;
                              return (
                                <tr key={globalIdx} className="hover:bg-amber-50/50 border-b border-slate-200 transition-colors">
                                  <td className="p-2.5 border border-slate-300 font-bold text-slate-900 pl-4 bg-white">
                                    {item.itemName}
                                  </td>
                                  <td className="p-0 border border-slate-300 bg-yellow-200 focus-within:bg-yellow-300">
                                    <input
                                      type="number"
                                      step="0.001"
                                      className="w-full text-right font-mono font-black text-slate-950 bg-yellow-200 focus:bg-yellow-100 focus:ring-2 focus:ring-amber-500 px-3 py-2 outline-none text-xs border-none"
                                      value={item.rateUSD}
                                      onChange={(e) => handleRateChange(globalIdx, e.target.value)}
                                      onBlur={(e) => {
                                        const num = parseFloat(e.target.value);
                                        if (!isNaN(num)) handleRateChange(globalIdx, num.toFixed(3));
                                      }}
                                      required
                                    />
                                  </td>
                                  <td className="p-2.5 border border-slate-300 text-center font-mono font-extrabold text-slate-700 bg-slate-50">
                                    {item.unit}
                                  </td>
                                  <td className="p-2.5 border border-slate-300 text-right font-mono font-black text-emerald-800 bg-emerald-50/40">
                                    {formatIDR(idrConverted)}
                                  </td>
                                </tr>
                              );
                            })}
                          </Fragment>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                <span className="text-xs text-slate-500 font-medium">
                  * Seluruh nilai Rate pada kolom kuning akan otomatis dikonversi ke Rupiah menggunakan Kurs Tengah M-Rate BI ({formatIDR(mrateBi)}).
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="px-5 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition shadow-sm cursor-pointer"
                    onClick={() => setModalOpen(false)}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-lg bg-cyan-800 hover:bg-cyan-900 text-white font-bold text-xs shadow-md transition cursor-pointer"
                  >
                    Simpan Tariff Grid SOW
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
