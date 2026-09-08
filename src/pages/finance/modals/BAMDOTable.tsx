import React from "react";
import { Building2, Plus, Trash2 } from "lucide-react";
import { formatIDR, FormattedNumberInput } from "../helpers";
import { SOWSelectDropdown } from "./SOWSelectDropdown";

interface BAMDOTableProps {
  formData: any;
  baMDOItems: any[];
  setBaMDOItems: React.Dispatch<React.SetStateAction<any[]>>;
  isInlineEditingBA: boolean;
  activeSOWCatalog: any[];
  mRate: number;
}

export function BAMDOTable({
  formData,
  baMDOItems,
  setBaMDOItems,
  isInlineEditingBA,
  activeSOWCatalog,
  mRate,
}: BAMDOTableProps) {
  const isCustomerSBS = formData.customerCode === "SBS";
  const isCustomerPOS = formData.customerCode === "POS" || formData.customerCode === "IBP" || formData.customerCode === "BBA" || !formData.customerCode;

  if (!isCustomerPOS && !isCustomerSBS) return null;

  return (
    <div className="space-y-2 pt-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase text-indigo-900 flex items-center gap-1.5">
          <Building2 size={14} className="text-indigo-700" />
          {isCustomerSBS
            ? "Kategori 2: Jasa Penunjang Produksi (Rental Alat)"
            : "Kategori 2: Mine Development Operation (MDO)"}
        </span>
        {isInlineEditingBA && (
          <button
            type="button"
            onClick={() => {
              const defItem = isCustomerSBS
                ? (activeSOWCatalog.find((s) => s.category === "Penunjang" || s.unit === "Hours") || { name: "Bulldozer DZ709", unit: "Hours", defaultRate: 1980000 })
                : (activeSOWCatalog.find((s) => s.category === "MDO") || activeSOWCatalog[activeSOWCatalog.length - 1]);
              setBaMDOItems([
                ...baMDOItems,
                {
                  id: `${isCustomerSBS ? "rent" : "mdo"}_${Date.now()}`,
                  category: isCustomerSBS ? "Penunjang" : "MDO",
                  area: isCustomerSBS ? "Pit E" : "Site POS",
                  material: defItem?.name || "",
                  unit: defItem?.unit || (isCustomerSBS ? "Hours" : "Ha"),
                  initialVolume: 0,
                  adjustedVolume: 0,
                  rate: defItem?.defaultRate || 0,
                  subtotalInitial: 0,
                  subtotalAdjusted: 0,
                },
              ]);
            }}
            className="text-[11px] font-bold text-cyan-800 bg-cyan-100 hover:bg-cyan-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer"
          >
            <Plus size={13} /> {isCustomerSBS ? "Tambah Baris Alat" : "Tambah Baris MDO"}
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px]">
            <tr>
              <th className="p-2">Area / Lokasi</th>
              <th className="p-2 min-w-[180px]">
                {isCustomerSBS ? "Peralatan / Unit (Master SOW)" : "Material / Pekerjaan MDO (Master SOW)"}
              </th>
              <th className="p-2 text-center">Satuan</th>
              <th className="p-2 text-right">{isCustomerSBS ? "Volume Awal (Jam)" : "Volume Awal"}</th>
              <th className="p-2 text-right">SOW Rate (Rp)</th>
              <th className="p-2 text-right">Subtotal (Rp)</th>
              {isInlineEditingBA && <th className="p-2 text-center">#</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {baMDOItems.map((item, idx) => (
              <tr key={item.id || idx} className="hover:bg-slate-50/80 transition">
                <td className="p-2 font-bold text-slate-800">
                  {!isInlineEditingBA ? (
                    item.area || (isCustomerSBS ? "Pit E" : "Site POS")
                  ) : (
                    <input
                      className="w-20 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-bold focus:border-cyan-700 outline-none"
                      value={item.area || ""}
                      placeholder={isCustomerSBS ? "Pit E" : "Site POS"}
                      onChange={(e) => {
                        const updated = [...baMDOItems];
                        updated[idx].area = e.target.value;
                        setBaMDOItems(updated);
                      }}
                    />
                  )}
                </td>
                <td className="p-2 font-medium text-slate-900">
                  {!isInlineEditingBA ? (
                    <span className="font-bold text-slate-900">{item.material}</span>
                  ) : (
                    <div className="space-y-1">
                      <SOWSelectDropdown
                        className="w-full bg-indigo-50/60 hover:bg-indigo-50 focus:bg-white border border-indigo-300 focus:border-indigo-700 rounded px-2 py-1 text-xs font-bold text-slate-900 outline-none transition cursor-pointer"
                        value={item.isCustom ? "Lainnya" : (item.material || "")}
                        customerCode={formData.customerCode || ""}
                        activeSOWCatalog={activeSOWCatalog}
                        mRate={mRate}
                        categoryFilter={isCustomerSBS ? "Penunjang" : "All"}
                        isDistanceOnly={false}
                        onChange={(val) => {
                          const updated = [...baMDOItems];
                          if (val === "Lainnya") {
                            updated[idx].isCustom = true;
                          }
                          setBaMDOItems(updated);
                        }}
                        onSelectSow={(sow) => {
                          const updated = [...baMDOItems];
                          if (sow.name === "Lainnya") {
                            updated[idx].isCustom = true;
                            updated[idx].customName = updated[idx].customName || "";
                            updated[idx].material = updated[idx].customName || "Lainnya";
                            updated[idx].rate = updated[idx].rate || 0;
                          } else {
                            updated[idx].isCustom = false;
                            updated[idx].material = sow.name;
                            updated[idx].unit = sow.unit || updated[idx].unit;
                            updated[idx].rate = sow.defaultRate || updated[idx].rate;
                          }
                          const vol = Number(updated[idx].initialVolume || 0);
                          const r = Number(updated[idx].rate || 0);
                          updated[idx].subtotalInitial = Math.round(vol * r);
                          updated[idx].subtotalAdjusted = Math.round(Number(updated[idx].adjustedVolume || vol) * r);
                          setBaMDOItems(updated);
                        }}
                      />
                      {(item.isCustom || item.material === "Lainnya") && (
                        <input
                          className="w-full bg-amber-50 border border-amber-300 focus:border-amber-600 rounded px-2 py-1 text-xs font-bold text-slate-900 outline-none placeholder:text-amber-700/60 placeholder:italic"
                          placeholder="Ketik nama pekerjaan / alat lainnya..."
                          value={item.customName !== undefined ? item.customName : (item.material !== "Lainnya" ? item.material : "")}
                          onChange={(e) => {
                            const updated = [...baMDOItems];
                            updated[idx].customName = e.target.value;
                            updated[idx].material = e.target.value || "Lainnya";
                            setBaMDOItems(updated);
                          }}
                        />
                      )}
                    </div>
                  )}
                </td>
                <td className="p-2 text-center font-mono font-bold text-slate-800">
                  {!isInlineEditingBA ? (
                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-xs inline-block text-center min-w-[45px]">
                      {item.unit || (isCustomerSBS ? "Hours" : "Ha")}
                    </span>
                  ) : (
                    <select
                      className="w-16 sm:w-20 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-indigo-600 rounded-[3px] px-1 py-1 text-xs font-bold text-slate-900 outline-none transition cursor-pointer text-center font-mono"
                      value={item.unit || (isCustomerSBS ? "Hours" : "Ha")}
                      onChange={(e) => {
                        const updated = [...baMDOItems];
                        updated[idx].unit = e.target.value;
                        setBaMDOItems(updated);
                      }}
                    >
                      {["Hours", "Ha", "BCM", "Ton", "Lot", "Unit", "Trip", "m2"]
                        .concat(item.unit && !["Hours", "Ha", "BCM", "Ton", "Lot", "Unit", "Trip", "m2"].includes(item.unit) ? [item.unit] : [])
                        .map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                    </select>
                  )}
                </td>
                <td className="p-2 text-right font-mono">
                  {!isInlineEditingBA ? (
                    <span className="font-bold text-slate-900">
                      {item.initialVolume ? Number(item.initialVolume).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 3 }) : "00.00"}
                    </span>
                  ) : (
                    <FormattedNumberInput
                      allowDecimals
                      maxDecimals={3}
                      className="w-24 bg-white border border-slate-300 rounded px-2 py-1 text-right font-mono font-bold text-xs focus:border-cyan-700 outline-none"
                      value={item.initialVolume ? item.initialVolume : ""}
                      placeholder="00.00"
                      onChange={(val) => {
                        const updated = [...baMDOItems];
                        updated[idx].initialVolume = val;
                        updated[idx].adjustedVolume = val;
                        const r = Number(updated[idx].rate || 0);
                        updated[idx].subtotalInitial = Math.round(val * r);
                        updated[idx].subtotalAdjusted = Math.round(val * r);
                        setBaMDOItems(updated);
                      }}
                    />
                  )}
                </td>
                <td className="p-2 text-right font-mono">
                  {!isInlineEditingBA ? (
                    <span>{formatIDR(item.rate || 0)}</span>
                  ) : (
                    <FormattedNumberInput
                      allowDecimals
                      maxDecimals={3}
                      className={`w-24 border rounded px-2 py-1 text-right font-mono font-bold text-xs focus:border-cyan-700 outline-none ${item.isCustom && (!item.rate || item.rate === 0) ? "bg-amber-50 border-amber-400 text-amber-900" : "bg-slate-50 hover:bg-white border-slate-300"}`}
                      value={item.rate === 0 ? "" : (item.rate ?? "")}
                      placeholder="00.00"
                      onChange={(r) => {
                        const updated = [...baMDOItems];
                        updated[idx].rate = r;
                        const vol = Number(updated[idx].initialVolume || 0);
                        updated[idx].subtotalInitial = Math.round(vol * r);
                        updated[idx].subtotalAdjusted = Math.round(Number(updated[idx].adjustedVolume || vol) * r);
                        setBaMDOItems(updated);
                      }}
                    />
                  )}
                </td>
                <td className="p-2 text-right font-mono font-extrabold text-emerald-800">
                  {formatIDR(Math.round((Number(item.initialVolume) || 0) * (Number(item.rate) || 0)))}
                </td>
                {isInlineEditingBA && (
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => setBaMDOItems(baMDOItems.filter((_, i) => i !== idx))}
                      className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {baMDOItems.length === 0 && (
              <tr>
                <td colSpan={isInlineEditingBA ? 7 : 6} className="p-4 text-center text-slate-400 bg-slate-50 italic">
                  Belum ada data alat berat / jasa penunjang.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
