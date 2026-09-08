import React, { useState } from "react";
import { Pickaxe, Trash2, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { formatIDR, FormattedNumberInput } from "../helpers";
import { getSBSTarifByDistance } from "../calculations";
import { SOWSelectDropdown } from "./SOWSelectDropdown";
import { BAAddRowDropdown } from "./BAAddRowDropdown";

interface BAOperatingTableProps {
  formData: any;
  baOperatingItems: any[];
  setBaOperatingItems: React.Dispatch<React.SetStateAction<any[]>>;
  baMDOItems?: any[];
  setBaMDOItems?: React.Dispatch<React.SetStateAction<any[]>>;
  baDeductionItems?: any[];
  setBaDeductionItems?: React.Dispatch<React.SetStateAction<any[]>>;
  isInlineEditingBA: boolean;
  activeSOWCatalog: any[];
  mRate: number;
  allBAItems: any[];
  isDistanceItem: (item: any) => boolean;
  getBAEffectiveVolume: (item: any, allItems: any[], isSurvey: boolean) => number;
  getBAItemSubtotal: (item: any, volume: number) => number;
  reorderBAItems?: (startIndex: number, endIndex: number, listType?: "operating" | "mdo" | "deduction") => void;
  moveBAItem?: (id: string, dir: "up" | "down", listType?: "operating" | "mdo" | "deduction") => void;
  getSowMasterRate?: (cust: string, name: string, fb: number, isUSD?: boolean, tier?: string) => number;
}

export function BAOperatingTable({
  formData,
  baOperatingItems,
  setBaOperatingItems,
  baMDOItems,
  setBaMDOItems,
  baDeductionItems,
  setBaDeductionItems,
  isInlineEditingBA,
  activeSOWCatalog,
  mRate,
  allBAItems,
  isDistanceItem,
  getBAEffectiveVolume,
  getBAItemSubtotal,
  reorderBAItems,
  moveBAItem,
  getSowMasterRate,
}: BAOperatingTableProps) {
  const isCustomerBGG = formData.customerCode === "BGG" || formData.customerCode === "PT BGG";
  const isCustomerSBS = formData.customerCode === "SBS";

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleMoveRow = (id: string, dir: "up" | "down") => {
    if (moveBAItem) {
      moveBAItem(id, dir, "operating");
    } else {
      const idx = baOperatingItems.findIndex((it) => it.id === id);
      if (idx === -1) return;
      const targetIdx = dir === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= baOperatingItems.length) return;
      const updated = [...baOperatingItems];
      const [moved] = updated.splice(idx, 1);
      updated.splice(targetIdx, 0, moved);
      setBaOperatingItems(updated);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("text/plain") || draggedId;
    if (sourceId && sourceId !== targetId) {
      const fromIdx = baOperatingItems.findIndex((it) => it.id === sourceId);
      const toIdx = baOperatingItems.findIndex((it) => it.id === targetId);
      if (fromIdx !== -1 && toIdx !== -1) {
        if (reorderBAItems) {
          reorderBAItems(fromIdx, toIdx, "operating");
        } else {
          const updated = [...baOperatingItems];
          const [moved] = updated.splice(fromIdx, 1);
          updated.splice(toIdx, 0, moved);
          setBaOperatingItems(updated);
        }
      }
    }
    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase text-[#1A1612] flex items-center gap-1.5">
          <Pickaxe size={14} className="text-[#A57C50]" />
          {isCustomerBGG
            ? "Kategori: Penambangan Batubara, OB Removal & Variabel (BGG)"
            : isCustomerSBS
            ? "Kategori 1: Operating & Mining (OB Removal)"
            : "Kategori 1: Operating & Mining"}
        </span>
        <div className="flex items-center gap-2">
          {isInlineEditingBA && (
            <BAAddRowDropdown
              formData={formData}
              baOperatingItems={baOperatingItems}
              setBaOperatingItems={setBaOperatingItems}
              baMDOItems={baMDOItems}
              setBaMDOItems={setBaMDOItems}
              baDeductionItems={baDeductionItems}
              setBaDeductionItems={setBaDeductionItems}
              mRate={mRate}
              getSowMasterRate={getSowMasterRate}
              activeSOWCatalog={activeSOWCatalog}
            />
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-[4px] border border-slate-200 shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px]">
            <tr>
              {isInlineEditingBA && <th className="p-2 w-16 text-center">Aksi</th>}
              <th className="p-2 w-16 sm:w-20">Area / Lokasi</th>
              <th className="p-2 min-w-[140px]">Material / Pekerjaan (Master SOW)</th>
              {isCustomerBGG && <th className="p-2 w-20 text-center">Bulan</th>}
              <th className="p-2 text-center w-12">Satuan</th>
              <th className="p-2 text-right w-20 sm:w-24">Volume TC</th>
              <th className="p-2 text-right w-20 sm:w-24 text-slate-700 bg-slate-50 border-x border-slate-200">Jarak (M)</th>
              <th className="p-2 text-right w-20 sm:w-24">SOW Rate (Rp)</th>
              <th className="p-2 text-right w-24 sm:w-28">Subtotal (Rp)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {baOperatingItems.map((item, idx) => {
              const isDistance = isDistanceItem(item);
              const isDPFuel = item.category === "DP Fuel" || item.isDeduction || (item.material || "").toLowerCase().includes("dp fuel") || item.section === "F" || item.section === "E" || item.section === "P";
              const effVol = getBAEffectiveVolume(item, allBAItems, false);
              const subtotal = getBAItemSubtotal(item, effVol);

              return (
                <tr
                  key={item.id || idx}
                  draggable={isInlineEditingBA}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", item.id);
                    setDraggedId(item.id);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverId !== item.id) setDragOverId(item.id);
                  }}
                  onDragLeave={() => {
                    if (dragOverId === item.id) setDragOverId(null);
                  }}
                  onDrop={(e) => handleDrop(e, item.id)}
                  className={`hover:bg-slate-50/80 transition ${
                    dragOverId === item.id ? "border-t-2 border-[#A57C50] bg-amber-50/50" : ""
                  } ${isDPFuel ? "bg-rose-50/30" : isDistance ? "bg-amber-50/20" : ""}`}
                >
                  {isInlineEditingBA && (
                    <td className="p-1.5 text-center align-middle">
                      <div className="flex items-center justify-center gap-0.5">
                        <div
                          className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition"
                          title="Drag untuk memindahkan urutan baris"
                        >
                          <GripVertical size={13} />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleMoveRow(item.id, "up")}
                          disabled={idx === 0}
                          className="p-1 text-slate-400 hover:text-[#A57C50] hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent rounded-[3px] transition cursor-pointer"
                          title="Pindah ke atas"
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveRow(item.id, "down")}
                          disabled={idx === baOperatingItems.length - 1}
                          className="p-1 text-slate-400 hover:text-[#A57C50] hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent rounded-[3px] transition cursor-pointer"
                          title="Pindah ke bawah"
                        >
                          <ChevronDown size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setBaOperatingItems(baOperatingItems.filter((_, i) => i !== idx))}
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-[3px] transition cursor-pointer ml-0.5"
                          title="Hapus baris"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  )}
                  <td className="p-2 font-bold text-slate-800 align-top">
                    {!isInlineEditingBA ? (
                      <span className="pt-1 block">{item.area || (isCustomerBGG ? "Pit KKL" : "WM1")}</span>
                    ) : (
                      <input
                        className="w-16 sm:w-20 bg-slate-50 border border-slate-300 rounded-[3px] px-1.5 py-1 text-xs font-bold focus:border-[#A57C50] outline-none"
                        value={item.area || ""}
                        placeholder={isCustomerBGG ? "Pit KKL" : "WM1"}
                        onChange={(e) => {
                          const updated = [...baOperatingItems];
                          updated[idx].area = e.target.value;
                          setBaOperatingItems(updated);
                        }}
                      />
                    )}
                  </td>
                  <td className="p-2 font-medium text-slate-900 align-top">
                    {!isInlineEditingBA ? (
                      <div>
                        <span className="font-bold text-slate-900">{item.material}</span>
                        {(item.keterangan || item.notes) && (
                          <span className="ml-2 text-[10px] text-slate-500 italic">({item.keterangan || item.notes})</span>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="w-full">
                          <SOWSelectDropdown
                              className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-[#A57C50] rounded-[3px] px-2 py-1 text-xs font-bold text-slate-900 outline-none transition cursor-pointer"
                              value={item.isCustom ? "Lainnya" : (item.material || "")}
                              customerCode={formData.customerCode || ""}
                              activeSOWCatalog={activeSOWCatalog}
                              mRate={mRate}
                              categoryFilter="Operating & Mining"
                              isDistanceOnly={isDistance}
                              parentItems={baOperatingItems}
                              onChange={(val) => {
                                const updated = [...baOperatingItems];
                                if (val === "Lainnya") {
                                  updated[idx].isCustom = true;
                                }
                                setBaOperatingItems(updated);
                              }}
                              onSelectSow={(sow) => {
                                const updated = [...baOperatingItems];
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
                                  if (sow.parentMaterial) {
                                    updated[idx].parentMaterial = sow.parentMaterial;
                                  }
                                }
                                setBaOperatingItems(updated);
                              }}
                            />
                          </div>
                        {(item.isCustom || item.material === "Lainnya" || !item.material) && (
                          <input
                            className="w-full bg-amber-50/50 border border-amber-300 focus:border-[#A57C50] rounded-[3px] px-2 py-1 text-xs font-bold text-slate-900 outline-none placeholder:text-amber-700/60 placeholder:italic"
                            placeholder="Ketik rincian variabel lainnya..."
                            value={item.customName !== undefined ? item.customName : (item.material !== "Lainnya" ? item.material : "")}
                            onChange={(e) => {
                              const updated = [...baOperatingItems];
                              updated[idx].customName = e.target.value;
                              updated[idx].material = e.target.value || "Lainnya";
                              setBaOperatingItems(updated);
                            }}
                          />
                        )}
                      </div>
                    )}
                  </td>
                  {isCustomerBGG && (
                    <td className="p-2 text-center align-top font-bold text-slate-700">
                      {item.period || formData.workPeriod || "-"}
                    </td>
                  )}
                  <td className="p-2 text-center align-top font-mono text-slate-600">
                    {!isInlineEditingBA ? (
                      <span className="pt-1 block font-bold text-slate-700">{item.unit || "BCM"}</span>
                    ) : (
                      <select
                        className="w-16 sm:w-20 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-[#A57C50] rounded-[3px] px-1 py-1 text-xs font-bold text-slate-900 outline-none transition cursor-pointer text-center font-mono"
                        value={item.unit || "BCM"}
                        onChange={(e) => {
                          const updated = [...baOperatingItems];
                          updated[idx].unit = e.target.value;
                          setBaOperatingItems(updated);
                        }}
                      >
                        {["BCM", "Ton", "Hours", "Ha", "Mtr", "Km", "Lot", "Unit", "Liter", "Trip", "m2"]
                          .concat(item.unit && !["BCM", "Ton", "Hours", "Ha", "Mtr", "Km", "Lot", "Unit", "Liter", "Trip", "m2"].includes(item.unit) ? [item.unit] : [])
                          .map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                      </select>
                    )}
                  </td>
                  <td className="p-2 text-right font-mono align-top">
                    {!isInlineEditingBA ? (
                      <span className="pt-1 block font-bold">
                        {effVol > 0 ? Number(effVol).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 3 }) : "00.00"}
                      </span>
                    ) : isDistance ? (
                      <div className="pt-0.5">
                        <span className="font-mono font-extrabold text-[#1A1612] text-xs block">
                          {effVol > 0 ? Number(effVol).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 3 }) : "00.00"}
                        </span>
                        <span className="text-[9px] text-[#A57C50] font-bold block leading-none">
                          (Auto-sync)
                        </span>
                      </div>
                    ) : (
                      <FormattedNumberInput
                        allowDecimals
                        maxDecimals={3}
                        className="w-20 sm:w-24 bg-slate-50 border border-slate-300 rounded-[3px] px-1.5 py-1 text-right font-mono font-bold text-xs focus:border-[#A57C50] outline-none"
                        value={item.initialVolume === 0 ? "" : (item.initialVolume ?? "")}
                        placeholder="00.00"
                        onChange={(val) => {
                          const updated = [...baOperatingItems];
                          updated[idx].initialVolume = val;
                          setBaOperatingItems(updated);
                        }}
                      />
                    )}
                  </td>
                  <td className="p-2 text-right font-mono align-top bg-slate-50/50 border-x border-slate-100">
                    {isDistance || isCustomerSBS ? (
                      !isInlineEditingBA ? (
                        <span className="pt-1 block font-bold text-slate-800">
                          {Number(item.distanceWeightAvg ?? item.distance ?? 0) > 0 ? `${Number(item.distanceWeightAvg ?? item.distance).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 3 })}m` : "00.00"}
                        </span>
                      ) : (
                        <FormattedNumberInput
                          allowDecimals
                          maxDecimals={3}
                          className="w-16 sm:w-20 bg-white border border-slate-300 rounded-[3px] px-1.5 py-1 text-right font-mono font-bold text-xs focus:border-[#A57C50] outline-none"
                          value={Number(item.distanceWeightAvg ?? item.distance ?? 0) === 0 ? "" : (item.distanceWeightAvg ?? item.distance)}
                          placeholder="00.00"
                          onChange={(val) => {
                            const updated = [...baOperatingItems];
                            updated[idx].distanceWeightAvg = val;
                            updated[idx].distance = val;
                            if (isCustomerSBS) {
                              const distNum = Number(val || 0);
                              const lookup = getSBSTarifByDistance(distNum);
                              updated[idx].rate = lookup.rate;
                            }
                            setBaOperatingItems(updated);
                          }}
                        />
                      )
                    ) : (
                      <span className="text-slate-400 block pt-1">-</span>
                    )}
                  </td>
                  <td className="p-2 text-right font-mono align-top">
                    {!isInlineEditingBA ? (
                      <span className="pt-1 block font-mono font-bold">{Number(item.rate || 0) > 0 ? formatIDR(item.rate) : "00.00"}</span>
                    ) : (
                      <FormattedNumberInput
                        allowDecimals
                        maxDecimals={3}
                        className={`w-20 sm:w-24 border rounded-[3px] px-1.5 py-1 text-right font-mono font-bold text-xs focus:border-[#A57C50] outline-none ${item.isCustom && (!item.rate || item.rate === 0) ? "bg-amber-50 border-amber-400 text-amber-900" : "bg-slate-50 border-slate-300"}`}
                        value={item.rate === 0 ? "" : (item.rate ?? "")}
                        placeholder="00.00"
                        onChange={(val) => {
                          const updated = [...baOperatingItems];
                          updated[idx].rate = val;
                          setBaOperatingItems(updated);
                        }}
                      />
                    )}
                  </td>
                  <td className="p-2 text-right font-mono font-extrabold align-top">
                    <div className={`pt-1 ${subtotal < 0 ? "text-rose-700 font-black" : "text-[#1A1612]"}`}>{subtotal !== 0 ? formatIDR(subtotal) : "00.00"}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
