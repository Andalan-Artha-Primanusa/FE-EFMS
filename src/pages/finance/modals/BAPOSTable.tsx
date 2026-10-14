import React, { useState, useMemo } from "react";
import { Pickaxe, Trash2, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { formatIDR, FormattedNumberInput } from "../helpers";
import { SOWSelectDropdown } from "./SOWSelectDropdown";
import { BAAddRowDropdown } from "./BAAddRowDropdown";
import { isOBMaterial } from "../ba_calculations";

interface BAPOSTableProps {
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
  rfIndexCalculated?: number;
}

export function BAPOSTable({
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
  rfIndexCalculated = 1.0,
}: BAPOSTableProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const effectiveRF = Number(rfIndexCalculated || formData.posData?.posRfIndex || formData.rfIndexCalculated || 1.0);
  const rfFactor = effectiveRF - 1.0;

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

  // Helper for DP fuel / deduction
  const isDPFuelItem = (it: any) => {
    const mat = (it.material || it.itemName || "").toLowerCase();
    const cat = (it.category || "").toLowerCase();
    const sec = (it.section || "").toUpperCase();
    return (
      it.isDeduction ||
      sec === "E" ||
      sec === "F" ||
      cat === "dp fuel" ||
      cat === "deduction" ||
      mat.includes("dp fuel") ||
      mat.includes("pengurang solar") ||
      mat.includes("potongan solar") ||
      mat.includes("fuel refill")
    );
  };

  // Group items by POS Excel AUG OP structure
  const prodItems = baOperatingItems.filter(
    (it) => !isDistanceItem(it) && !(it.material || "").toLowerCase().includes("clearing") && !isDPFuelItem(it)
  );
  const distItems = baOperatingItems.filter((it) => isDistanceItem(it) && !isDPFuelItem(it));
  const lcItems = baOperatingItems.filter(
    (it) => !isDistanceItem(it) && (it.material || "").toLowerCase().includes("clearing") && !isDPFuelItem(it)
  );
  const dpFuelItems = baOperatingItems.filter((it) => isDPFuelItem(it));

  const getDynamicItemBaseIDR = (it: any, isDistance: boolean = false) => {
    let usdRate = Number(it.rateUSD ?? it.baseRateUSD ?? 0);
    if (usdRate === 0 && getSowMasterRate) {
      usdRate = getSowMasterRate("POS", it.material, 0, true);
    }
    // Sama dengan BE RecalculateBA: USD x kurs periode bila keduanya ada, selain itu tarif IDR baris.
    const currentMRate = Number(mRate || formData?.posData?.actualMRateXn || 0);
    if (usdRate > 0 && currentMRate > 0) {
      return usdRate * currentMRate;
    }
    return Number(it.rate || 0);
  };

  const subtotalA = prodItems.reduce((acc, it) => {
    const vol = getBAEffectiveVolume(it, allBAItems, false);
    const r = getDynamicItemBaseIDR(it, false);
    return acc + Math.round(vol * r);
  }, 0);

  const subtotalB = distItems.reduce((acc, it) => {
    const vol = getBAEffectiveVolume(it, allBAItems, false);
    const rawDist = Number(it.distanceWeightAvg ?? it.distance ?? 1000);
    const actualDist = (rawDist > 0 && rawDist < 50) ? Math.round(rawDist * 1000) : rawDist;
    const deltaDist = actualDist - 1000;
    const r = getDynamicItemBaseIDR(it, true);
    return acc + Math.round((vol * r * deltaDist) / 1000);
  }, 0);

  const subtotalC = lcItems.reduce((acc, it) => {
    const vol = getBAEffectiveVolume(it, allBAItems, false);
    const r = getDynamicItemBaseIDR(it, false);
    return acc + Math.round(vol * r);
  }, 0);

  // Auto-calculated Section D (Raise & Fall's Factor) rows
  const rfRows = useMemo(() => {
    const rows: any[] = [];
    let counter = 1;

    // Production items RF
    prodItems.forEach((it) => {
      const vol = getBAEffectiveVolume(it, allBAItems, false);
      const rawBaseIDR = getDynamicItemBaseIDR(it, false);
      const rawRfRate = rfFactor * rawBaseIDR;
      const rfRate = rawRfRate;
      const subtotal = Math.round(vol * rfRate);

      rows.push({
        id: `rf_op_prod_${it.id}`,
        code: `D${counter++}.`,
        area: it.area || "WM1",
        name: it.material,
        unit: it.unit || "Bcm",
        volume: vol,
        distance: null,
        deltaDist: null,
        rawRfRate,
        rfRate,
        subtotal,
      });

      // Matching overhaul item for this specific production item (match by area + material)
      const mLow = (it.material || "").toLowerCase();
      const itArea = (it.area || "").trim().toLowerCase();

      const matchedDist = distItems.find((d) => {
        const dArea = (d.area || "").trim().toLowerCase();
        if (itArea && dArea && itArea !== dArea) {
          return false;
        }

        const dLow = (d.material || "").toLowerCase();
        const pLow = (d.parentMaterial || "").toLowerCase();

        if (pLow && pLow === mLow) return true;

        if (isOBMaterial(mLow) || mLow.includes("waste") || mLow.includes("overburden")) {
          return isOBMaterial(dLow) || dLow.includes("waste") || dLow.includes("overburden");
        }
        if (mLow.includes("topsoil") || mLow.includes("top soil")) {
          return dLow.includes("topsoil") || dLow.includes("top soil");
        }
        if (mLow.includes("limonite")) return dLow.includes("limonite");
        if (mLow.includes("saprolite")) return dLow.includes("saprolite");
        return false;
      });

      if (matchedDist) {
        const dVol = getBAEffectiveVolume(matchedDist, allBAItems, false);
        const actualDist = Number(matchedDist.distanceWeightAvg ?? matchedDist.distance ?? 1000);
        const deltaDist = actualDist - 1000;
        const dBaseIDR = getDynamicItemBaseIDR(matchedDist, true);
        const rawDRfRate = rfFactor * dBaseIDR;
        const dRfRate = rawDRfRate;
        const dSubtotal = Math.round((dVol * dRfRate * deltaDist) / 1000);

        rows.push({
          id: `rf_op_dist_${matchedDist.id}`,
          code: `D${counter++}.`,
          area: matchedDist.area || it.area || "WM1",
          name: `Over/Underhaul For ${it.material}`,
          unit: matchedDist.unit || "Bcm",
          volume: dVol,
          distance: actualDist,
          deltaDist,
          rawRfRate: rawDRfRate,
          rfRate: dRfRate,
          subtotal: dSubtotal,
        });
      }
    });

    // Land Clearing RF
    lcItems.forEach((it) => {
      const vol = getBAEffectiveVolume(it, allBAItems, false);
      const lcBaseIDR = getDynamicItemBaseIDR(it, false);
      const rawRfRate = rfFactor * lcBaseIDR;
      const rfRate = rawRfRate;
      const subtotal = Math.round(vol * rfRate);

      rows.push({
        id: `rf_op_lc_${it.id}`,
        code: `D${counter++}.`,
        area: it.area || "-",
        name: it.material,
        unit: it.unit || "m2",
        volume: vol,
        distance: null,
        deltaDist: null,
        rawRfRate,
        rfRate,
        subtotal,
      });
    });

    return rows;
  }, [prodItems, distItems, lcItems, allBAItems, rfFactor, mRate, formData?.posData?.mRate]);

  const subtotalD = rfRows.reduce((acc, r) => acc + r.subtotal, 0);

  // Seksi E: DP Fuel & Transport Subtotal
  // Seksi E non-BGG: hanya baris manual (Tambah Baris), nominal final — tidak ditarik dari refill survey.
  const subtotalDP = dpFuelItems.reduce(
    (acc, it) => acc + Math.abs(Number(it.rate || it.subtotalInitial || it.subtotalAdjusted || it.amount || 0)),
    0
  );

  // Kategori 1 Rekapitulasi Pajak
  const totalGrossOpBeforeDP = subtotalA + subtotalB + subtotalC + subtotalD;
  const totalGrossOp = Math.max(0, totalGrossOpBeforeDP - subtotalDP);
  const dppOp = Math.round((totalGrossOp * 11) / 12);
  const vatOp = Math.round(dppOp * 0.12);
  const whtOp = Math.round(totalGrossOp * 0.02);
  const netTotalInvoiceOp = totalGrossOp + vatOp - whtOp;

  const renderItemRow = (item: any, idx: number) => {
    const isDist = isDistanceItem(item);
    const effVol = getBAEffectiveVolume(item, allBAItems, false);
    const rawDist = Number(item.distanceWeightAvg ?? item.distance ?? 1000);
    const actualDist = (rawDist > 0 && rawDist < 50) ? Math.round(rawDist * 1000) : rawDist;
    const deltaDist = actualDist - 1000;
    const effRate = getDynamicItemBaseIDR(item, isDist);
    const subtotal = isDPFuelItem(item)
      ? -Math.abs(Math.round(effVol * effRate))
      : isDist
      ? Math.round((effVol * effRate * deltaDist) / 1000)
      : Math.round(effVol * effRate);

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
        } ${isDist ? "bg-amber-50/20" : ""}`}
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
            <span className="pt-1 block">{item.area || "WM1"}</span>
          ) : (
            <input
              className="w-16 sm:w-20 bg-slate-50 border border-slate-300 rounded-[3px] px-1.5 py-1 text-xs font-bold focus:border-[#A57C50] outline-none"
              value={item.area || ""}
              placeholder="WM1"
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
              {isDist && actualDist > 0 && (
                <div className="text-[10px] text-slate-500 font-mono">
                  {actualDist.toLocaleString("id-ID")} mtr - 1000 mtr ={" "}
                  <span className={deltaDist < 0 ? "text-rose-600 font-bold" : "text-emerald-700 font-bold"}>
                    {deltaDist < 0 ? `(${Math.abs(deltaDist).toLocaleString("id-ID")})` : deltaDist.toLocaleString("id-ID")} mtr
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <SOWSelectDropdown
                className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-[#A57C50] rounded-[3px] px-2 py-1 text-xs font-bold text-slate-900 outline-none transition cursor-pointer"
                value={item.isCustom ? "Lainnya" : (item.material || "")}
                customerCode="POS"
                activeSOWCatalog={activeSOWCatalog}
                mRate={mRate}
                categoryFilter={isDist ? "Over Distance" : "All"}
                isDistanceOnly={false}
                parentItems={baOperatingItems}
                onChange={(val) => {
                  const updated = [...baOperatingItems];
                  const targetIdx = updated.findIndex((it) => it.id === item.id);
                  if (targetIdx !== -1 && val === "Lainnya") {
                    updated[targetIdx].isCustom = true;
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
                    } else {
                      updated[targetIdx].isCustom = false;
                      updated[targetIdx].material = sow.name;
                      updated[targetIdx].rateUSD = sow.rateUSD || 0;
                      updated[targetIdx].unit = sow.unit || updated[targetIdx].unit;
                      const dynamicRate = getSowMasterRate ? getSowMasterRate("POS", sow.name, sow.defaultRate || 0, false) : (sow.defaultRate || updated[targetIdx].rate);
                      updated[targetIdx].rate = dynamicRate > 0 ? dynamicRate : (sow.defaultRate || updated[targetIdx].rate);
                      if (sow.isDistanceVar) {
                        updated[targetIdx].isDistanceVar = true;
                        updated[targetIdx].category = "Over Distance";
                        if (sow.baseDistanceMeters) updated[targetIdx].distanceBasis = sow.baseDistanceMeters;
                      }
                      if (sow.parentMaterial) {
                        updated[targetIdx].parentMaterial = sow.parentMaterial;
                      }
                    }
                    setBaOperatingItems(updated);
                  }
                }}
              />
              {isDist && actualDist > 0 && (
                <div className="text-[10px] text-slate-500 font-mono">
                  {actualDist.toLocaleString("id-ID")} mtr - 1000 mtr ={" "}
                  <span className={deltaDist < 0 ? "text-rose-600 font-bold" : "text-emerald-700 font-bold"}>
                    {deltaDist < 0 ? `(${Math.abs(deltaDist).toLocaleString("id-ID")})` : deltaDist.toLocaleString("id-ID")} mtr
                  </span>
                </div>
              )}
            </div>
          )}
        </td>
        <td className="p-2 text-center align-top font-mono text-slate-600">
          <span className="pt-1 block font-bold text-slate-700">{item.unit || "BCM"}</span>
        </td>
        <td className="p-2 text-right font-mono align-top">
          {!isInlineEditingBA ? (
            <span className="pt-1 block font-bold">
              {effVol > 0 ? Number(effVol).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}
            </span>
          ) : (
            <FormattedNumberInput
              allowDecimals
              maxDecimals={2}
              className="w-20 sm:w-24 bg-slate-50 border border-slate-300 rounded-[3px] px-1.5 py-1 text-right font-mono font-bold text-xs focus:border-[#A57C50] outline-none"
              value={isDist ? (item.initialVolume ? item.initialVolume : "") : (item.initialVolume === 0 ? "" : (item.initialVolume ?? ""))}
              placeholder={effVol > 0 ? Number(effVol).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0,00"}
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
          {isDist ? (
            !isInlineEditingBA ? (
              <span className="pt-1 block font-bold text-slate-800">
                {actualDist > 0 ? `${Number(actualDist).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 3 })}m` : "-"}
              </span>
            ) : (
              <FormattedNumberInput
                allowDecimals={true}
                maxDecimals={3}
                className="w-16 sm:w-20 bg-white border border-slate-300 rounded-[3px] px-1.5 py-1 text-right font-mono font-bold text-xs focus:border-[#A57C50] outline-none"
                value={actualDist === 0 ? "" : actualDist}
                placeholder="1000"
                onChange={(val) => {
                  const updated = [...baOperatingItems];
                  const targetIdx = updated.findIndex((it) => it.id === item.id);
                  if (targetIdx !== -1) {
                    let numVal = Number(val || 0);
                    if (numVal > 0 && numVal < 50) numVal = numVal * 1000;
                    updated[targetIdx].distanceWeightAvg = numVal;
                    updated[targetIdx].distance = numVal;
                    updated[targetIdx].distanceM = numVal;
                    setBaOperatingItems(updated);
                  }
                }}
              />
            )
          ) : (
            <span className="pt-1 block text-slate-400 font-bold text-center">-</span>
          )}
        </td>
        <td className="p-2 text-right font-mono align-top font-bold text-slate-800">
          {!isInlineEditingBA ? (
            <span className="pt-1 block">
              {formatIDR(Math.round(effRate))}
            </span>
          ) : (
            <FormattedNumberInput
              allowDecimals
              maxDecimals={0}
              className="w-20 sm:w-24 border rounded-[3px] px-1.5 py-1 text-right font-mono font-bold text-xs bg-slate-50 border-slate-300 focus:border-[#A57C50] outline-none"
              value={effRate || ""}
              placeholder={Math.round(effRate).toLocaleString("id-ID")}
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
          <div className={`pt-1 ${subtotal < 0 ? "text-rose-700 font-black" : "text-[#1A1612]"}`}>
            {subtotal < 0 ? `(${formatIDR(Math.abs(subtotal))})` : formatIDR(subtotal)}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase text-[#1A1612] flex items-center gap-1.5">
          <Pickaxe size={14} className="text-[#A57C50]" />
          Kategori 1: Operating & Mining (Seksi A s.d. E & Total Invoice)
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

      {!(Number(mRate || formData?.posData?.actualMRateXn || 0) > 0) && baOperatingItems.some((it) => Number(it.rateUSD || 0) > 0) && (
        <div className="px-3 py-2 rounded-[3px] border border-amber-300 bg-amber-50 text-[11px] font-semibold text-amber-900">
          Kurs BI periode {formData.workPeriod || "-"} belum ada di Master Kurs BI. Tarif USD belum bisa dikonversi; perhitungan memakai SOW Rate (Rp) yang diisi di baris.
        </div>
      )}

      <div className="overflow-x-auto rounded-[4px] border border-slate-200 shadow-xs bg-white">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px]">
            <tr>
              {isInlineEditingBA && <th className="p-2 w-16 text-center">Aksi</th>}
              <th className="p-2 w-16 sm:w-20">Area / Lokasi</th>
              <th className="p-2 min-w-[140px]">Material / Pekerjaan (Master SOW)</th>
              <th className="p-2 text-center w-12">Satuan</th>
              <th className="p-2 text-right w-20 sm:w-24">Volume TC</th>
              <th className="p-2 text-right w-20 sm:w-24 text-slate-700 bg-slate-50 border-x border-slate-200">Jarak (M)</th>
              <th className="p-2 text-right w-20 sm:w-24">SOW Rate (Rp)</th>
              <th className="p-2 text-right w-24 sm:w-28">Subtotal (Rp)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {/* SEKSI A: PRODUCTION */}
            <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
              {isInlineEditingBA && <td className="p-2 text-center text-slate-400">#</td>}
              <td colSpan={6} className="p-2 uppercase font-extrabold tracking-wider">
                A. PRODUCTION
              </td>
              <td className="p-2 text-right font-mono text-slate-900 font-extrabold">
                {formatIDR(subtotalA)}
              </td>
            </tr>
            {prodItems.map((item, idx) => renderItemRow(item, idx))}

            {/* SEKSI B: OVER DISTANCE */}
            <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
              {isInlineEditingBA && <td className="p-2 text-center text-slate-400">#</td>}
              <td colSpan={6} className="p-2 uppercase font-extrabold tracking-wider">
                B. OVER DISTANCE
              </td>
              <td className="p-2 text-right font-mono font-extrabold text-slate-900">
                {subtotalB < 0 ? `(${formatIDR(Math.abs(subtotalB))})` : formatIDR(subtotalB)}
              </td>
            </tr>
            {distItems.map((item, idx) => renderItemRow(item, idx))}

            {/* SEKSI C: LAND CLEARING */}
            {lcItems.length > 0 && (
              <>
                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                  {isInlineEditingBA && <td className="p-2 text-center text-slate-400">#</td>}
                  <td colSpan={6} className="p-2 uppercase font-extrabold tracking-wider">
                    C. LAND CLEARING
                  </td>
                  <td className="p-2 text-right font-mono text-slate-900 font-extrabold">
                    {formatIDR(subtotalC)}
                  </td>
                </tr>
                {lcItems.map((item, idx) => renderItemRow(item, idx))}
              </>
            )}

            {/* SEKSI D: RAISE & FALL'S FACTOR (READ-ONLY AUTO COMPUTED) */}
            <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
              {isInlineEditingBA && <td className="p-2 text-center text-slate-400">#</td>}
              <td colSpan={6} className="p-2 uppercase font-extrabold tracking-wider">
                D. RAISE & FALL'S FACTOR (RF: {effectiveRF.toFixed(3)}x)
              </td>
              <td className="p-2 text-right font-mono text-slate-900 font-extrabold">
                {formatIDR(subtotalD)}
              </td>
            </tr>
            {rfRows.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/80 transition bg-slate-50/30">
                {isInlineEditingBA && <td className="p-2 text-center text-slate-300 font-mono text-[10px]">{item.code}</td>}
                <td className="p-2 font-bold text-slate-800 align-top">{item.area || "-"}</td>
                <td className="p-2 font-medium text-slate-900 align-top">
                  <div>
                    <span className="font-bold text-slate-900">{item.name}</span>
                    {item.deltaDist !== null && (
                      <span className="text-[10px] text-slate-500 font-mono ml-2">
                        ({item.deltaDist < 0 ? `(${Math.abs(item.deltaDist)}m)` : `+${item.deltaDist}m`})
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-2 text-center align-top font-mono text-slate-600 font-bold">{item.unit}</td>
                <td className="p-2 text-right font-mono align-top font-bold">
                  {item.volume > 0 ? Number(item.volume).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}
                </td>
                <td className="p-2 text-right font-mono align-top bg-slate-50/50 border-x border-slate-100 text-slate-600 font-mono">
                  {item.distance ? `${item.distance}m` : "-"}
                </td>
                <td className="p-2 text-right font-mono align-top font-bold text-slate-900">
                  {formatIDR(item.rfRate)}
                </td>
                <td className="p-2 text-right font-mono font-extrabold align-top text-slate-900">
                  {item.subtotal < 0 ? `(${formatIDR(Math.abs(item.subtotal))})` : formatIDR(item.subtotal)}
                </td>
              </tr>
            ))}
            {rfRows.length === 0 && (
              <tr>
                <td colSpan={isInlineEditingBA ? 8 : 7} className="p-2.5 text-center text-slate-400 italic">
                  Eskalasi Raise & Fall otomatis aktif saat Index RF &gt; 1.000
                </td>
              </tr>
            )}
            {/* SEKSI E: DP FUEL & TRANSPORT (PENGURANG SOLAR) */}
            <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
              {isInlineEditingBA && <td className="p-2 text-center text-slate-400">#</td>}
              <td colSpan={6} className="p-2 uppercase font-extrabold tracking-wider">
                <div className="flex items-center justify-between">
                  <span>E. DP FUEL &amp; TRANSPORT (Pengurang Solar)</span>
                </div>
              </td>
              <td className="p-2 text-right font-mono text-rose-700 font-extrabold">
                {subtotalDP > 0 ? `(${formatIDR(subtotalDP)})` : formatIDR(0)}
              </td>
            </tr>
            {dpFuelItems.map((item, idx) => renderItemRow(item, idx))}
            {dpFuelItems.length === 0 && (
              <tr>
                <td colSpan={isInlineEditingBA ? 8 : 7} className="p-2.5 text-center text-slate-400 italic">
                  Tidak ada pengurang DP Fuel &amp; Transport. Tambahkan manual lewat <b>Tambah Baris</b> bila ada (nominal final).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Rekapitulasi Tagihan Kategori 1: Operating & Mining (Persis AUG OP) */}
      <div className="overflow-x-auto rounded-[4px] border border-slate-300 shadow-xs bg-slate-50/60 mt-2">
        <table className="w-full text-xs font-mono border-collapse">
          <tbody>
            <tr className="border-b border-slate-200 hover:bg-slate-100/60 font-bold">
              <td className="p-2 text-slate-800 uppercase tracking-wider pl-3">
                TOTAL GROSS (SEKSI A + B + C + D)
              </td>
              <td className="p-2 text-right font-extrabold text-slate-950 w-48 sm:w-56 pr-3">
                {formatIDR(totalGrossOpBeforeDP)}
              </td>
            </tr>
            {subtotalDP > 0 && (
              <tr className="border-b border-slate-200 hover:bg-slate-100/60 font-bold text-rose-700">
                <td className="p-2 uppercase tracking-wider pl-3 flex items-center justify-between">
                  <span>POTONGAN DP FUEL &amp; TRANSPORT (SEKSI E)</span>
                </td>
                <td className="p-2 text-right font-extrabold text-rose-700 w-48 sm:w-56 pr-3">
                  ({formatIDR(subtotalDP)})
                </td>
              </tr>
            )}
            <tr className="border-b border-slate-200 hover:bg-slate-100/60 font-bold bg-amber-50/40">
              <td className="p-2 text-slate-900 uppercase tracking-wider pl-3">
                TOTAL NETTO (SEKSI A + B + C + D - E)
              </td>
              <td className="p-2 text-right font-extrabold text-slate-950 w-48 sm:w-56 pr-3">
                {formatIDR(totalGrossOp)}
              </td>
            </tr>
            <tr className="border-b border-slate-200 hover:bg-slate-100/60">
              <td className="p-2 text-slate-700 uppercase tracking-wider pl-3">
                DPP PPN 11/12
              </td>
              <td className="p-2 text-right font-semibold text-slate-800 w-48 sm:w-56 pr-3">
                {formatIDR(dppOp)}
              </td>
            </tr>
            <tr className="border-b border-slate-200 hover:bg-slate-100/60">
              <td className="p-2 text-slate-700 uppercase tracking-wider pl-3">
                VAT (12%)
              </td>
              <td className="p-2 text-right font-semibold text-slate-800 w-48 sm:w-56 pr-3">
                {formatIDR(vatOp)}
              </td>
            </tr>
            <tr className="border-b border-slate-200 hover:bg-slate-100/60">
              <td className="p-2 text-slate-700 uppercase tracking-wider pl-3">
                WITH HOLDING TAX ART 23 (2%)
              </td>
              <td className="p-2 text-right font-semibold text-rose-700 w-48 sm:w-56 pr-3">
                ({formatIDR(whtOp)})
              </td>
            </tr>
            <tr className="bg-[#1A1612] text-white font-black">
              <td className="p-2.5 uppercase tracking-wider text-xs pl-3 text-amber-200">
                TOTAL INVOICE OPERATING & MINING
              </td>
              <td className="p-2.5 text-right font-black text-white w-48 sm:w-56 pr-3 text-sm">
                {formatIDR(netTotalInvoiceOp)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
