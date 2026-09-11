import React, { useState } from "react";
import { Pickaxe, Trash2, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { formatIDR, FormattedNumberInput, MonthPickerInput } from "../helpers";
import { getSBSTarifByDistance } from "../calculations";
import { getBGGComputedInvoiceLines } from "../ba_calculations";
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
  getBAItemSubtotal: (item: any, volume: number, isCustomerDBK?: boolean, customerCode?: string) => number;
  reorderBAItems?: (startIndex: number, endIndex: number, listType?: "operating" | "mdo" | "deduction") => void;
  moveBAItem?: (id: string, dir: "up" | "down", listType?: "operating" | "mdo" | "deduction") => void;
  getSowMasterRate?: (cust: string, name: string, fb: number, isUSD?: boolean, tier?: string) => number;
  getBGGActiveCoalTier?: (period?: string) => string;
  rfIndexCalculated?: number;
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
  getBGGActiveCoalTier,
  rfIndexCalculated = 1.0,
}: BAOperatingTableProps) {
  const isCustomerBGG = formData.customerCode === "BGG" || formData.customerCode === "PT BGG";
  const isCustomerSBS = formData.customerCode === "SBS";
  const isCustomerDBK = formData.customerCode === "PTRO" || formData.customerCode === "DBK";

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const effectiveRF = Number(rfIndexCalculated || formData.bggData?.bggRfIndex || formData.rfIndexCalculated || 1.0);
  const computedLines = isCustomerBGG
    ? getBGGComputedInvoiceLines(allBAItems, effectiveRF, false, formData.bggData?.fuelPeriods)
    : { sectionDItems: [], sectionEItems: [], subtotalD: 0, subtotalE: 0 };

  const subtotalNonBGG = baOperatingItems.reduce((acc, it) => {
    const vol = getBAEffectiveVolume(it, baOperatingItems, false);
    return acc + getBAItemSubtotal(it, vol, isCustomerDBK, formData.customerCode);
  }, 0);

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

  // Group items for BGG
  const obItems = baOperatingItems.filter((it) => {
    if (isDistanceItem(it)) return false;
    const m = (it.material || it.sowDescription || "").toLowerCase();
    return m.includes("ob") || m.includes("overburden") || m.includes("waste") || m.includes("over burden");
  });
  const coalItems = baOperatingItems.filter((it) => {
    if (isDistanceItem(it)) return false;
    const m = (it.material || it.sowDescription || "").toLowerCase();
    return m.includes("coal") || m.includes("batubara");
  });
  const distanceItems = baOperatingItems.filter((it) => isDistanceItem(it));
  const dpFuelItems = baOperatingItems.filter((it) => {
    const m = (it.material || "").toLowerCase();
    const cat = (it.category || "").toLowerCase();
    return cat === "dp fuel" || m.includes("dp fuel") || m.includes("pengurang solar");
  });
  const otherItems = baOperatingItems.filter(
    (it) => {
      const m = (it.material || "").toLowerCase();
      const cat = (it.category || "").toLowerCase();
      if (obItems.includes(it) || coalItems.includes(it) || distanceItems.includes(it) || dpFuelItems.includes(it)) return false;
      if (cat === "discount" || cat === "raise & fall" || m.includes("discount on over distance") || m.includes("eskalasi nilai kontrak")) return false;
      return true;
    }
  );

  const subtotalA = obItems.reduce((acc, it) => acc + getBAItemSubtotal(it, getBAEffectiveVolume(it, allBAItems, false)), 0);
  const subtotalB = coalItems.reduce((acc, it) => acc + getBAItemSubtotal(it, getBAEffectiveVolume(it, allBAItems, false)), 0);
  const subtotalC = distanceItems.reduce((acc, it) => acc + getBAItemSubtotal(it, getBAEffectiveVolume(it, allBAItems, false)), 0);
  const subtotalF = dpFuelItems.reduce((acc, it) => acc + getBAItemSubtotal(it, 1), 0);

  const renderItemRow = (item: any, idx: number) => {
    const isDistance = isDistanceItem(item);
    const isDPFuel = item.category === "DP Fuel" || item.isDeduction || (item.material || "").toLowerCase().includes("dp fuel");
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
                onClick={() => setBaOperatingItems(baOperatingItems.filter((it) => it.id !== item.id))}
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
                const targetIdx = updated.findIndex((it) => it.id === item.id);
                if (targetIdx !== -1) {
                  updated[targetIdx].area = e.target.value;
                  setBaOperatingItems(updated);
                }
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
                  categoryFilter={isDistance ? "Over Distance" : "Operating & Mining"}
                  isDistanceOnly={isDistance}
                  parentItems={baOperatingItems}
                  onChange={(val) => {
                    const updated = [...baOperatingItems];
                    const targetIdx = updated.findIndex((it) => it.id === item.id);
                    if (targetIdx !== -1) {
                      if (val === "Lainnya") {
                        updated[targetIdx].isCustom = true;
                      }
                      setBaOperatingItems(updated);
                    }
                  }}
                  onSelectSow={(sow) => {
                    const updated = [...baOperatingItems];
                    const targetIdx = updated.findIndex((it) => it.id === item.id);
                    if (targetIdx !== -1) {
                      if (sow.name === "Lainnya") {
                        updated[targetIdx].isCustom = true;
                        updated[targetIdx].customName = updated[targetIdx].customName || "";
                        updated[targetIdx].material = updated[targetIdx].customName || "Lainnya";
                        updated[targetIdx].rate = updated[targetIdx].rate || 0;
                      } else {
                        updated[targetIdx].isCustom = false;
                        updated[targetIdx].material = sow.name;
                        updated[targetIdx].unit = sow.unit || updated[targetIdx].unit;
                        const cust = formData.customerCode || "BGG";
                        const period = updated[targetIdx].period || formData.workPeriod;
                        const tier = getBGGActiveCoalTier ? getBGGActiveCoalTier(period) : undefined;
                        const dynamicRate = getSowMasterRate ? getSowMasterRate(cust, sow.name, sow.defaultRate || 0, false, tier) : (sow.defaultRate || updated[targetIdx].rate);
                        updated[targetIdx].rate = dynamicRate > 0 ? dynamicRate : (sow.defaultRate || updated[targetIdx].rate);
                        if (sow.parentMaterial) {
                          updated[targetIdx].parentMaterial = sow.parentMaterial;
                        }
                      }
                      setBaOperatingItems(updated);
                    }
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
                    const targetIdx = updated.findIndex((it) => it.id === item.id);
                    if (targetIdx !== -1) {
                      updated[targetIdx].customName = e.target.value;
                      updated[targetIdx].material = e.target.value || "Lainnya";
                      setBaOperatingItems(updated);
                    }
                  }}
                />
              )}
            </div>
          )}
        </td>
        {isCustomerBGG && (
          <td className="p-1.5 text-center align-top font-bold text-slate-700">
            {!isInlineEditingBA ? (
              <span className="pt-1 block text-xs">{item.period || formData.workPeriod || "-"}</span>
            ) : (
              <MonthPickerInput
                value={item.period || formData.workPeriod || ""}
                onChange={(val) => {
                  const updated = [...baOperatingItems];
                  const targetIdx = updated.findIndex((it) => it.id === item.id);
                  if (targetIdx !== -1) {
                    updated[targetIdx].period = val;
                    const cust = formData.customerCode || "BGG";
                    const tier = getBGGActiveCoalTier ? getBGGActiveCoalTier(val) : undefined;
                    if (getSowMasterRate && updated[targetIdx].material && !updated[targetIdx].isCustom) {
                      const newRate = getSowMasterRate(cust, updated[targetIdx].material, updated[targetIdx].rate || 0, false, tier);
                      if (newRate > 0) updated[targetIdx].rate = newRate;
                    }
                    setBaOperatingItems(updated);
                  }
                }}
                format="long"
                className="w-28 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-[#A57C50] rounded-[3px] px-1.5 py-1 text-xs font-bold text-slate-900 outline-none transition cursor-pointer text-center"
              />
            )}
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
                const targetIdx = updated.findIndex((it) => it.id === item.id);
                if (targetIdx !== -1) {
                  updated[targetIdx].unit = e.target.value;
                  setBaOperatingItems(updated);
                }
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
              {effVol > 0 ? Number(effVol).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 4 }) : "00.00"}
            </span>
          ) : isDistance ? (
            <div className="pt-0.5">
              <span className="font-mono font-extrabold text-[#1A1612] text-xs block">
                {effVol > 0 ? Number(effVol).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 4 }) : "00.00"}
              </span>
              <span className="text-[9px] text-[#A57C50] font-bold block leading-none">
                (Auto-sync)
              </span>
            </div>
          ) : (
            <FormattedNumberInput
              allowDecimals
              maxDecimals={5}
              className="w-20 sm:w-24 bg-slate-50 border border-slate-300 rounded-[3px] px-1.5 py-1 text-right font-mono font-bold text-xs focus:border-[#A57C50] outline-none"
              value={item.initialVolume === 0 ? "" : (item.initialVolume ?? "")}
              placeholder="00.00"
              onChange={(val) => {
                const updated = [...baOperatingItems];
                const targetIdx = updated.findIndex((it) => it.id === item.id);
                if (targetIdx !== -1) {
                  updated[targetIdx].initialVolume = val;
                  setBaOperatingItems(updated);
                }
              }}
            />
          )}
        </td>
        <td className="p-2 text-right font-mono align-top bg-slate-50/50 border-x border-slate-100">
          {isDistance || isCustomerSBS ? (
            !isInlineEditingBA ? (
              <span className="pt-1 block font-bold text-slate-800">
                {Number(item.distanceWeightAvg ?? item.distance ?? 0) > 0 ? `${Number(item.distanceWeightAvg ?? item.distance).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 4 })}m` : "00.00"}
              </span>
            ) : (
              <FormattedNumberInput
                allowDecimals
                maxDecimals={5}
                className="w-16 sm:w-20 bg-white border border-slate-300 rounded-[3px] px-1.5 py-1 text-right font-mono font-bold text-xs focus:border-[#A57C50] outline-none"
                value={Number(item.distanceWeightAvg ?? item.distance ?? 0) === 0 ? "" : (item.distanceWeightAvg ?? item.distance)}
                placeholder="00.00"
                onChange={(val) => {
                  const updated = [...baOperatingItems];
                  const targetIdx = updated.findIndex((it) => it.id === item.id);
                  if (targetIdx !== -1) {
                    updated[targetIdx].distanceWeightAvg = val;
                    updated[targetIdx].distance = val;
                    if (isCustomerSBS) {
                      const distNum = Number(val || 0);
                      const lookup = getSBSTarifByDistance(distNum);
                      updated[targetIdx].rate = lookup.rate;
                    }
                    setBaOperatingItems(updated);
                  }
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
                const targetIdx = updated.findIndex((it) => it.id === item.id);
                if (targetIdx !== -1) {
                  updated[targetIdx].rate = val;
                  setBaOperatingItems(updated);
                }
              }}
            />
          )}
        </td>
        <td className="p-2 text-right font-mono font-extrabold align-top">
          <div className={`pt-1 ${subtotal < 0 ? "text-rose-700 font-black" : "text-[#1A1612]"}`}>{subtotal !== 0 ? formatIDR(subtotal) : "00.00"}</div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase text-[#1A1612] flex items-center gap-1.5">
          <Pickaxe size={14} className="text-[#A57C50]" />
          {isCustomerBGG
            ? "Rincian Tagihan Berita Acara (Seksi A s.d. F)"
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
              {isCustomerBGG && <th className="p-2 w-28 sm:w-32 text-center">Bulan</th>}
              <th className="p-2 text-center w-12">Satuan</th>
              <th className="p-2 text-right w-20 sm:w-24">Volume TC</th>
              <th className="p-2 text-right w-20 sm:w-24 text-slate-700 bg-slate-50 border-x border-slate-200">Jarak (M)</th>
              <th className="p-2 text-right w-20 sm:w-24">SOW Rate (Rp)</th>
              <th className="p-2 text-right w-24 sm:w-28">Subtotal (Rp)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isCustomerBGG ? (
              <>
                {/* SEKSI A: OB REMOVAL */}
                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                  {isInlineEditingBA && <td className="p-2 text-center text-slate-400">#</td>}
                  <td colSpan={7} className="p-2 uppercase font-extrabold tracking-wider">
                    A. OB REMOVAL (Pit Kungkilan)
                  </td>
                  <td className="p-2 text-right font-mono text-slate-900 font-extrabold">
                    {formatIDR(subtotalA)}
                  </td>
                </tr>
                {obItems.map((item, idx) => renderItemRow(item, idx))}

                {/* SEKSI B: COAL WINNING */}
                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                  {isInlineEditingBA && <td className="p-2 text-center text-slate-400">#</td>}
                  <td colSpan={7} className="p-2 uppercase font-extrabold tracking-wider">
                    B. COAL WINNING (Pit Kungkilan)
                  </td>
                  <td className="p-2 text-right font-mono text-slate-900 font-extrabold">
                    {formatIDR(subtotalB)}
                  </td>
                </tr>
                {coalItems.map((item, idx) => renderItemRow(item, idx))}

                {/* SEKSI C: OVER DISTANCE */}
                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                  {isInlineEditingBA && <td className="p-2 text-center text-slate-400">#</td>}
                  <td colSpan={7} className="p-2 uppercase font-extrabold tracking-wider">
                    C. OVER DISTANCE
                  </td>
                  <td className="p-2 text-right font-mono text-slate-900 font-extrabold">
                    {formatIDR(subtotalC)}
                  </td>
                </tr>
                {distanceItems.map((item, idx) => renderItemRow(item, idx))}

                {/* SEKSI D: RAISE & FALL'S FACTOR (READ-ONLY AUTO COMPUTED) */}
                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                  {isInlineEditingBA && <td className="p-2 text-center text-slate-400">#</td>}
                  <td colSpan={7} className="p-2 uppercase font-extrabold tracking-wider">
                    D. RAISE & FALL'S FACTOR (Eskalasi Index: {effectiveRF.toFixed(3)}x)
                  </td>
                  <td className="p-2 text-right font-mono text-slate-900 font-extrabold">
                    {formatIDR(computedLines.subtotalD)}
                  </td>
                </tr>
                {computedLines.sectionDItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition bg-slate-50/20">
                    {isInlineEditingBA && <td className="p-2 text-center text-slate-300">-</td>}
                    <td className="p-2 font-bold text-slate-800 align-top">Pit KKL</td>
                    <td className="p-2 font-medium text-slate-900 align-top">
                      <div>
                        <span className="font-bold text-slate-900">{item.description}</span>
                        {item.notes && <span className="ml-2 text-[10px] text-slate-500 italic">({item.notes})</span>}
                      </div>
                    </td>
                    <td className="p-2 text-center align-top font-bold text-slate-700">-</td>
                    <td className="p-2 text-center align-top font-mono text-slate-600 font-bold">{item.unit}</td>
                    <td className="p-2 text-right font-mono align-top font-bold">
                      {Number(item.volume).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                    </td>
                    <td className="p-2 text-right font-mono align-top bg-slate-50/50 border-x border-slate-100 text-slate-400">-</td>
                    <td className="p-2 text-right font-mono align-top font-mono font-bold text-slate-900">
                      {formatIDR(item.rate)}
                    </td>
                    <td className="p-2 text-right font-mono font-extrabold align-top text-slate-900">
                      {formatIDR(item.subtotal)}
                    </td>
                  </tr>
                ))}

                {/* SEKSI E: DISCOUNT ON OVERDISTANCE (READ-ONLY AUTO COMPUTED) */}
                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                  {isInlineEditingBA && <td className="p-2 text-center text-slate-400">#</td>}
                  <td colSpan={7} className="p-2 uppercase font-extrabold tracking-wider">
                    E. DISCOUNT ON OVERDISTANCE (Potongan 25%)
                  </td>
                  <td className="p-2 text-right font-mono text-rose-700 font-extrabold">
                    {formatIDR(computedLines.subtotalE)}
                  </td>
                </tr>
                {computedLines.sectionEItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition bg-slate-50/20">
                    {isInlineEditingBA && <td className="p-2 text-center text-slate-300">-</td>}
                    <td className="p-2 font-bold text-slate-800 align-top">Pit KKL</td>
                    <td colSpan={4} className="p-2 font-medium text-slate-900 align-top">
                      <span className="font-bold text-slate-800">{item.description}</span>
                    </td>
                    <td className="p-2 text-right font-mono align-top bg-slate-50/50 border-x border-slate-100 text-slate-400">-</td>
                    <td className="p-2 text-right font-mono align-top font-mono font-bold text-rose-700">
                      -25%
                    </td>
                    <td className="p-2 text-right font-mono font-extrabold align-top text-rose-700">
                      {formatIDR(item.subtotal)}
                    </td>
                  </tr>
                ))}

                {/* SEKSI F: DP FUEL & TRANSPORT (EDITABLE INPUT) */}
                {dpFuelItems.length > 0 && (
                  <>
                    <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                      {isInlineEditingBA && <td className="p-2 text-center text-slate-400">#</td>}
                      <td colSpan={7} className="p-2 uppercase font-extrabold tracking-wider">
                        F. DP FUEL & TRANSPORT (Pengurang Solar BGG)
                      </td>
                      <td className="p-2 text-right font-mono text-rose-700 font-extrabold">
                        {formatIDR(-Math.abs(subtotalF))}
                      </td>
                    </tr>
                    {dpFuelItems.map((item, idx) => {
                      const currentVal = Math.abs(item.rate !== undefined && item.rate !== 0 ? item.rate : (item.subtotalInitial ? Number(item.subtotalInitial) : 0));
                      return (
                        <tr key={item.id || idx} className="hover:bg-slate-50/80 transition bg-rose-50/20">
                          {isInlineEditingBA && (
                            <td className="p-1.5 text-center align-middle">
                              <button
                                type="button"
                                onClick={() => setBaOperatingItems(baOperatingItems.filter((it) => it.id !== item.id))}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-[3px] transition cursor-pointer"
                                title="Hapus baris DP Fuel"
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          )}
                          <td className="p-2 font-bold text-slate-800 align-top">{item.area || "Pit KKL"}</td>
                          <td className="p-2 font-medium text-slate-900 align-top">
                            <span className="font-bold text-slate-800">{item.material || "DP Fuel & Transport (Pengurang Solar BGG)"}</span>
                          </td>
                          <td className="p-2 text-center align-top font-bold text-slate-700">-</td>
                          <td className="p-2 text-center align-top font-mono text-slate-600 font-bold">{item.unit || "Lot"}</td>
                          <td className="p-2 text-right font-mono align-top text-slate-500 font-bold">1</td>
                          <td className="p-2 text-right font-mono align-top bg-slate-50/50 border-x border-slate-100 text-slate-400">-</td>
                          <td className="p-2 text-right font-mono align-top">
                            {!isInlineEditingBA ? (
                              <span className="pt-1 block font-bold text-slate-600 font-mono">Flat</span>
                            ) : (
                              <FormattedNumberInput
                                allowDecimals={false}
                                className="w-24 sm:w-28 bg-white border border-rose-300 focus:border-rose-500 rounded-[3px] px-1.5 py-1 text-right font-mono font-bold text-xs text-rose-700 outline-none"
                                value={currentVal === 0 ? "" : currentVal}
                                placeholder="0"
                                onChange={(val) => {
                                  const updated = [...baOperatingItems];
                                  const targetIdx = updated.findIndex((it) => it.id === item.id);
                                  if (targetIdx !== -1) {
                                    const numVal = Math.abs(Number(val) || 0);
                                    updated[targetIdx].rate = numVal;
                                    updated[targetIdx].subtotalInitial = -numVal;
                                    updated[targetIdx].subtotalAdjusted = -numVal;
                                    setBaOperatingItems(updated);
                                  }
                                }}
                              />
                            )}
                          </td>
                          <td className="p-2 text-right font-mono font-extrabold align-top text-rose-700">
                            {formatIDR(-Math.abs(currentVal))}
                          </td>
                        </tr>
                      );
                    })}
                  </>
                )}

                {/* Other remaining items */}
                {otherItems.map((item, idx) => renderItemRow(item, idx))}
              </>
            ) : (
              baOperatingItems.map((item, idx) => renderItemRow(item, idx))
            )}
          </tbody>
          {!isCustomerBGG && baOperatingItems.length > 0 && (
            <tfoot>
              <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                {isInlineEditingBA && <td className="p-2 text-center text-slate-400">#</td>}
                <td colSpan={6} className="p-2 uppercase font-extrabold tracking-wider">
                  {isCustomerSBS ? "Subtotal Kategori 1: Operating & Mining (OB)" : "Subtotal Kategori 1: Operating & Mining"}
                </td>
                <td className="p-2 text-right font-mono font-extrabold text-slate-950">
                  {formatIDR(subtotalNonBGG)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
