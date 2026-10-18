import React from "react";
import { Building2, Plus, Trash2 } from "lucide-react";
import { formatIDR, FormattedNumberInput } from "../helpers";
import { SOWSelectDropdown } from "./SOWSelectDropdown";
import { isDistanceItem, getBAEffectiveVolume, getBAItemSubtotal, customerKind, removeBAItem } from "../ba_calculations";
import { BAPOSMDOTable } from "./BAPOSMDOTable";

interface BAMDOTableProps {
  formData: any;
  baMDOItems: any[];
  setBaMDOItems: React.Dispatch<React.SetStateAction<any[]>>;
  isInlineEditingBA: boolean;
  activeSOWCatalog: any[];
  mRate: number;
  allBAItems?: any[];
  rfIndexCalculated?: number;
  getSowMasterRate?: (customer: string, itemName: string, fallbackRate: number, isUSD?: boolean, tier?: string) => number;
}

export function BAMDOTable({
  formData,
  baMDOItems,
  setBaMDOItems,
  isInlineEditingBA,
  activeSOWCatalog,
  mRate,
  allBAItems = [],
  rfIndexCalculated = 1.0,
  getSowMasterRate,
}: BAMDOTableProps) {
  const isCustomerSBS = customerKind(formData.customerCode) === "SBS";
  const isCustomerPOS = customerKind(formData.customerCode) === "POS";

  if (!isCustomerPOS && !isCustomerSBS) return null;

  if (isCustomerPOS) {
    return (
      <BAPOSMDOTable
        formData={formData}
        baMDOItems={baMDOItems}
        setBaMDOItems={setBaMDOItems}
        isInlineEditingBA={isInlineEditingBA}
        activeSOWCatalog={activeSOWCatalog}
        mRate={mRate}
        allBAItems={allBAItems}
        rfIndexCalculated={rfIndexCalculated}
        getSowMasterRate={getSowMasterRate}
      />
    );
  }

  const totalMDO = baMDOItems.reduce((acc, it) => {
    const isDist = isDistanceItem(it);
    const effVol = isDist ? getBAEffectiveVolume(it, allBAItems.length > 0 ? allBAItems : baMDOItems, false) : Number(it.initialVolume || 0);
    const sub = isDist
      ? getBAItemSubtotal(it, effVol, false, formData.customerCode)
      : Math.round(effVol * Number(it.rate || 0));
    return acc + sub;
  }, 0);

  return (
    <div className="space-y-2 pt-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase text-[#1A1612] flex items-center gap-1.5">
          <Building2 size={14} className="text-[#A57C50]" />
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
            className="text-xs font-bold text-white bg-[#A57C50] hover:bg-[#8e6941] px-2.5 py-1 rounded-[3px] flex items-center gap-1 transition cursor-pointer shadow-xs"
          >
            <Plus size={13} /> {isCustomerSBS ? "Tambah Baris Alat" : "Tambah Baris MDO"}
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-[4px] border border-slate-200 shadow-xs bg-white">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px]">
            <tr>
              {isInlineEditingBA && <th className="p-2 w-16 text-center">Aksi</th>}
              <th className="p-2 w-24">Area / Lokasi</th>
              <th className="p-2 min-w-[180px]">
                {isCustomerSBS ? "Peralatan / Unit (Master SOW)" : "Material / Pekerjaan MDO (Master SOW)"}
              </th>
              <th className="p-2 text-center w-16">Satuan</th>
              <th className="p-2 text-right w-24">{isCustomerSBS ? "Volume (Jam)" : "Volume"}</th>
              {isCustomerPOS && <th className="p-2 text-right w-20">Jarak (M)</th>}
              <th className="p-2 text-right w-28">SOW Rate (Rp)</th>
              <th className="p-2 text-right w-32">Subtotal (Rp)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {baMDOItems.map((item, idx) => {
              const isDist = isDistanceItem(item);
              const effVol = isDist ? getBAEffectiveVolume(item, allBAItems.length > 0 ? allBAItems : baMDOItems, false) : Number(item.initialVolume || 0);
              const rowSubtotal = isDist
                ? getBAItemSubtotal(item, effVol, false, formData.customerCode)
                : Math.round(Number(item.initialVolume || 0) * Number(item.rate || 0));

              return (
              <tr key={item.id || idx} className="hover:bg-slate-50/80 transition">
                {isInlineEditingBA && (
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => setBaMDOItems(removeBAItem(baMDOItems, item))}
                      className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-[3px] transition cursor-pointer"
                      title="Hapus baris"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                )}
                <td className="p-2 font-bold text-slate-800">
                  {!isInlineEditingBA ? (
                    item.area || (isCustomerSBS ? "Pit E" : "Site POS")
                  ) : (
                    <input
                      className="w-20 bg-slate-50 border border-slate-300 rounded-[3px] px-1.5 py-1 text-xs font-bold focus:border-[#A57C50] outline-none"
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
                        className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-[#A57C50] rounded-[3px] px-2 py-1 text-xs font-bold text-slate-900 outline-none transition cursor-pointer"
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
                            if (sow.isDistanceVar) {
                              updated[idx].isDistanceVar = true;
                              updated[idx].distanceBasis = updated[idx].distanceBasis || 1000;
                              updated[idx].distanceWeightAvg = updated[idx].distanceWeightAvg || 1000;
                            }
                            if (sow.parentMaterial) {
                              updated[idx].parentMaterial = sow.parentMaterial;
                            }
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
                          className="w-full bg-amber-50/50 border border-amber-300 focus:border-[#A57C50] rounded-[3px] px-2 py-1 text-xs font-bold text-slate-900 outline-none placeholder:text-amber-700/60 placeholder:italic"
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
                    <span className="font-bold text-slate-700">
                      {item.unit || (isCustomerSBS ? "Hours" : "USD/BCM")}
                    </span>
                  ) : (
                    <select
                      className="w-20 sm:w-24 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-[#A57C50] rounded-[3px] px-1 py-1 text-xs font-bold text-slate-900 outline-none transition cursor-pointer text-center font-mono"
                      value={item.unit || (isCustomerSBS ? "Hours" : "USD/BCM")}
                      onChange={(e) => {
                        const updated = [...baMDOItems];
                        updated[idx].unit = e.target.value;
                        setBaMDOItems(updated);
                      }}
                    >
                      {["USD/BCM", "USD/1KM", "USD/m2", "Hours", "Month", "Ha", "BCM", "Ton", "Lot", "Unit", "Trip", "m2", "M3", "M'"]
                        .concat(item.unit && !["USD/BCM", "USD/1KM", "USD/m2", "Hours", "Month", "Ha", "BCM", "Ton", "Lot", "Unit", "Trip", "m2", "M3", "M'"].includes(item.unit) ? [item.unit] : [])
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
                      {isDist
                        ? (effVol > 0 ? Number(effVol).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0")
                        : (item.initialVolume ? Number(item.initialVolume).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0")}
                    </span>
                  ) : isDist ? (
                    <div className="pt-0.5">
                      <span className="font-mono font-extrabold text-[#1A1612] text-xs block">
                        {effVol > 0 ? Number(effVol).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0"}
                      </span>
                      <span className="text-[9px] text-[#A57C50] font-bold block leading-none">
                        (Auto-sync)
                      </span>
                    </div>
                  ) : (
                    <FormattedNumberInput
                      allowDecimals
                      maxDecimals={2}
                      className="w-20 sm:w-24 bg-slate-50 border border-slate-300 rounded-[3px] px-1.5 py-1 text-right font-mono font-bold text-xs focus:border-[#A57C50] outline-none"
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
                {isCustomerPOS && (
                  <td className="p-2 text-right font-mono align-top">
                    {isDist ? (
                      !isInlineEditingBA ? (
                        <span className="pt-1 block font-bold">
                          {item.distanceWeightAvg ? Number(item.distanceWeightAvg).toLocaleString("id-ID") : "1.000"}
                        </span>
                      ) : (
                        <FormattedNumberInput
                          allowDecimals
                          maxDecimals={2}
                          className="w-16 sm:w-20 bg-slate-50 border border-slate-300 rounded-[3px] p-1 text-right font-mono font-bold text-xs focus:border-[#A57C50] outline-none"
                          placeholder="1000"
                          value={item.distanceWeightAvg || item.distance || ""}
                          onChange={(val) => {
                            const updated = [...baMDOItems];
                            updated[idx].distanceWeightAvg = Number(val || 0);
                            updated[idx].distance = Number(val || 0);
                            setBaMDOItems(updated);
                          }}
                        />
                      )
                    ) : (
                      <span className="pt-1 block text-slate-400 font-bold text-center">-</span>
                    )}
                  </td>
                )}
                <td className="p-2 text-right font-mono">
                  {!isInlineEditingBA ? (
                    <span className="font-bold">{formatIDR(item.rate || 0)}</span>
                  ) : (
                    <FormattedNumberInput
                      allowDecimals
                      maxDecimals={0}
                      className={`w-20 sm:w-24 border rounded-[3px] px-1.5 py-1 text-right font-mono font-bold text-xs focus:border-[#A57C50] outline-none ${item.isCustom && (!item.rate || item.rate === 0) ? "bg-amber-50 border-amber-400 text-amber-900" : "bg-slate-50 hover:bg-white border-slate-300"}`}
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
                <td className="p-2 text-right font-mono font-extrabold text-slate-900">
                  {formatIDR(rowSubtotal)}
                </td>
              </tr>
              );
            })}
            {baMDOItems.length === 0 && (
              <tr>
                <td colSpan={isInlineEditingBA ? (isCustomerPOS ? 8 : 7) : (isCustomerPOS ? 7 : 6)} className="p-4 text-center text-slate-400 bg-slate-50 italic">
                  Belum ada data alat berat / jasa penunjang.
                </td>
              </tr>
            )}
          </tbody>
          {baMDOItems.length > 0 && (
            <tfoot>
              <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                {isInlineEditingBA && <td className="p-2 text-center text-slate-400">#</td>}
                <td colSpan={isCustomerPOS ? 6 : 5} className="p-2 uppercase font-extrabold tracking-wider">
                  {isCustomerSBS ? "Subtotal Jasa Penunjang (Rental Alat)" : "Subtotal MDO"}
                </td>
                <td className="p-2 text-right font-mono font-extrabold text-slate-950">
                  {formatIDR(totalMDO)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
