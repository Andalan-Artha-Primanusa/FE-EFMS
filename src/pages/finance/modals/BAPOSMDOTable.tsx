import React, { useMemo } from "react";
import { Building2, Trash2, Plus } from "lucide-react";
import { formatIDR, FormattedNumberInput } from "../helpers";
import { SOWSelectDropdown } from "./SOWSelectDropdown";
import { isDistanceItem, isDistanceParent, isLandClearingItem, getBAEffectiveVolume, getBAItemSubtotal, isOBMaterial, invoiceTaxes } from "../ba_calculations";

interface BAPOSMDOTableProps {
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

export function BAPOSMDOTable({
  formData,
  baMDOItems,
  setBaMDOItems,
  isInlineEditingBA,
  activeSOWCatalog,
  mRate,
  allBAItems = [],
  rfIndexCalculated = 1.0,
  getSowMasterRate,
}: BAPOSMDOTableProps) {
  const effectiveRF = Number(rfIndexCalculated || formData.posData?.posRfIndex || formData.rfIndexCalculated || 1.0);
  const rfFactor = effectiveRF - 1.0;

  const getDynamicMDOItemBaseIDR = (it: any, isDistance: boolean = false) => {
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

  // Group into Production, Over Distance and Land Clearing
  const prodItems = baMDOItems.filter((it) => !isDistanceItem(it) && !isLandClearingItem(it));
  const distItems = baMDOItems.filter((it) => isDistanceItem(it));
  const lcItems = baMDOItems.filter((it) => isLandClearingItem(it));

  const subtotalA = prodItems.reduce((acc, it) => {
    const vol = Number(it.initialVolume || 0);
    const r = getDynamicMDOItemBaseIDR(it, false);
    return acc + vol * r;
  }, 0);

  const subtotalB = distItems.reduce((acc, it) => {
    const effVol = getBAEffectiveVolume(it, allBAItems.length > 0 ? allBAItems : baMDOItems, false);
    const rawDist = Number(it.distanceWeightAvg ?? it.distance ?? 1000);
    const actualDist = (rawDist > 0 && rawDist < 50) ? Math.round(rawDist * 1000) : rawDist;
    const deltaDist = actualDist - 1000;
    const r = getDynamicMDOItemBaseIDR(it, true);
    return acc + Math.round((effVol * r * deltaDist) / 1000);
  }, 0);

  const subtotalC = lcItems.reduce((acc, it) => acc + Number(it.initialVolume || 0) * getDynamicMDOItemBaseIDR(it, false), 0);

  // Auto-calculated Section D (Raise & Fall's Factor) rows for MDO
  const rfRows = useMemo(() => {
    const rows: any[] = [];
    let counter = 1;
    // Satu baris over/underhaul hanya dipasangkan ke satu baris produksi (cegah RF dobel).
    const usedDist = new Set<string>();

    prodItems.forEach((it) => {
      const vol = Number(it.initialVolume || 0);
      const rawBaseIDR = getDynamicMDOItemBaseIDR(it, false);
      const rawRfRate = rfFactor * rawBaseIDR;
      const rfRate = rawRfRate;
      const subtotal = vol * rfRate;

      rows.push({
        id: `rf_mdo_prod_${it.id}`,
        code: `D${counter++}.`,
        area: it.area || "Site POS",
        name: it.material,
        unit: it.unit || "Bcm",
        volume: vol,
        distance: null,
        deltaDist: null,
        rawRfRate,
        rfRate,
        subtotal,
      });

      // Match overhaul item (matcher yang sama dengan sumber volume Seksi B)
      const matchedDist = distItems.find((d) => !usedDist.has(d.id) && isDistanceParent(d, it));

      if (matchedDist) {
        usedDist.add(matchedDist.id);
        const dVol = getBAEffectiveVolume(matchedDist, allBAItems.length > 0 ? allBAItems : baMDOItems, false);
        const rawDist = Number(matchedDist.distanceWeightAvg ?? matchedDist.distance ?? 1000);
        const actualDist = (rawDist > 0 && rawDist < 50) ? Math.round(rawDist * 1000) : rawDist;
        const deltaDist = actualDist - 1000;
        const dBaseIDR = getDynamicMDOItemBaseIDR(matchedDist, true);
        const rawDRfRate = rfFactor * dBaseIDR;
        const dRfRate = rawDRfRate;
        const dSubtotal = Math.round((dVol * dRfRate * deltaDist) / 1000);

        rows.push({
          id: `rf_mdo_dist_${matchedDist.id}`,
          code: `D${counter++}.`,
          area: matchedDist.area || it.area || "Site POS",
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

    lcItems.forEach((it) => {
      const vol = Number(it.initialVolume || 0);
      const rfRate = rfFactor * getDynamicMDOItemBaseIDR(it, false);
      rows.push({
        id: `rf_mdo_lc_${it.id}`,
        code: `D${counter++}.`,
        area: it.area || "Site POS",
        name: it.material,
        unit: it.unit || "Ha",
        volume: vol,
        distance: null,
        deltaDist: null,
        rawRfRate: rfRate,
        rfRate,
        subtotal: vol * rfRate,
      });
    });

    return rows;
  }, [prodItems, distItems, lcItems, allBAItems, baMDOItems, rfFactor, mRate, formData?.posData?.mRate]);

  const subtotalD = rfRows.reduce((acc, r) => acc + r.subtotal, 0);

  // Kategori 2 Rekapitulasi Pajak
  const totalGrossMDO = subtotalA + subtotalB + subtotalC + subtotalD;
  const { dpp11_12: dppMDO, vat12: vatMDO, pph23: whtMDO, total: netTotalInvoiceMDO } = invoiceTaxes(totalGrossMDO);

  const renderMDORow = (item: any, idx: number) => {
    const isDist = isDistanceItem(item);
    const effVol = isDist
      ? getBAEffectiveVolume(item, allBAItems.length > 0 ? allBAItems : baMDOItems, false)
      : Number(item.initialVolume || 0);
    const rawDist = Number(item.distanceWeightAvg ?? item.distance ?? 1000);
    const actualDist = (rawDist > 0 && rawDist < 50) ? Math.round(rawDist * 1000) : rawDist;
    const deltaDist = actualDist - 1000;
    const dynamicRate = getDynamicMDOItemBaseIDR(item, isDist);
    const rowSubtotal = isDist
      ? Math.round((effVol * dynamicRate * deltaDist) / 1000)
      : effVol * dynamicRate;

    return (
      <tr key={item.id || idx} className={`hover:bg-slate-50/80 transition ${isDist ? "bg-amber-50/20" : ""}`}>
        {isInlineEditingBA && (
          <td className="p-2 text-center">
            <button
              type="button"
              onClick={() => setBaMDOItems(baMDOItems.filter((it) => it.id !== item.id))}
              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-[3px] transition cursor-pointer"
              title="Hapus baris"
            >
              <Trash2 size={12} />
            </button>
          </td>
        )}
        <td className="p-2 font-bold text-slate-800 align-top">
          {!isInlineEditingBA ? (
            item.area || "Site POS"
          ) : (
            <input
              className="w-20 bg-slate-50 border border-slate-300 rounded-[3px] px-1.5 py-1 text-xs font-bold focus:border-[#A57C50] outline-none"
              value={item.area || ""}
              placeholder="Site POS"
              onChange={(e) => {
                const updated = [...baMDOItems];
                const targetIdx = updated.findIndex((it) => it.id === item.id);
                if (targetIdx !== -1) {
                  updated[targetIdx].area = e.target.value;
                  setBaMDOItems(updated);
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
                parentItems={baMDOItems}
                onChange={(val) => {
                  const updated = [...baMDOItems];
                  const targetIdx = updated.findIndex((it) => it.id === item.id);
                  if (targetIdx !== -1 && val === "Lainnya") {
                    updated[targetIdx].isCustom = true;
                    setBaMDOItems(updated);
                  }
                }}
                onSelectSow={(sow) => {
                  const updated = [...baMDOItems];
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
                      updated[targetIdx].rateUSD = sow.rateUSD || 0;
                      updated[targetIdx].unit = sow.unit || updated[targetIdx].unit;
                      updated[targetIdx].rate = sow.defaultRate || updated[targetIdx].rate;
                      if (!sow.isDistanceVar) {
                        updated[targetIdx].isDistanceVar = false;
                        if (updated[targetIdx].category === "Over Distance") updated[targetIdx].category = "MDO";
                      }
                      if (sow.isDistanceVar) {
                        updated[targetIdx].isDistanceVar = true;
                        updated[targetIdx].distanceBasis = updated[targetIdx].distanceBasis || 1000;
                        updated[targetIdx].distanceWeightAvg = updated[targetIdx].distanceWeightAvg || 1000;
                      }
                      if (sow.parentMaterial) {
                        updated[targetIdx].parentMaterial = sow.parentMaterial;
                      }
                    }
                    setBaMDOItems(updated);
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
        <td className="p-2 text-center font-mono font-bold text-slate-800 align-top">
          <span className="pt-1 block font-bold text-slate-700">{item.unit || "USD/BCM"}</span>
        </td>
        <td className="p-2 text-right font-mono align-top">
          {!isInlineEditingBA ? (
            <span className="pt-1 block font-bold text-slate-900">
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
                const updated = [...baMDOItems];
                const targetIdx = updated.findIndex((it) => it.id === item.id);
                if (targetIdx !== -1) {
                  updated[targetIdx].initialVolume = val;
                  updated[targetIdx].adjustedVolume = val;
                  setBaMDOItems(updated);
                }
              }}
            />
          )}
        </td>
        <td className="p-2 text-right font-mono align-top bg-slate-50/50 border-x border-slate-100">
          {isDist ? (
            !isInlineEditingBA ? (
              <span className="pt-1 block font-bold">
                {actualDist > 0 ? `${Number(actualDist).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 3 })}m` : "-"}
              </span>
            ) : (
              <FormattedNumberInput
                allowDecimals={true}
                maxDecimals={3}
                className="w-16 sm:w-20 bg-white border border-slate-300 rounded-[3px] p-1 text-right font-mono font-bold text-xs focus:border-[#A57C50] outline-none"
                placeholder="1000"
                value={actualDist === 0 ? "" : actualDist}
                onChange={(val) => {
                  const updated = [...baMDOItems];
                  const targetIdx = updated.findIndex((it) => it.id === item.id);
                  if (targetIdx !== -1) {
                    let numVal = Number(val || 0);
                    if (numVal > 0 && numVal < 50) numVal = numVal * 1000;
                    updated[targetIdx].distanceWeightAvg = numVal;
                    updated[targetIdx].distance = numVal;
                    updated[targetIdx].distanceM = numVal;
                    setBaMDOItems(updated);
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
            <span className="pt-1 block">{formatIDR(dynamicRate || item.rate || 0)}</span>
          ) : (
            <FormattedNumberInput
              allowDecimals
              maxDecimals={0}
              className="w-20 sm:w-24 border rounded-[3px] px-1.5 py-1 text-right font-mono font-bold text-xs bg-slate-50 border-slate-300 focus:border-[#A57C50] outline-none"
              value={item.rate === 0 ? "" : (item.rate ?? "")}
              placeholder="0"
              onChange={(r) => {
                const updated = [...baMDOItems];
                const targetIdx = updated.findIndex((it) => it.id === item.id);
                if (targetIdx !== -1) {
                  updated[targetIdx].rate = r;
                  setBaMDOItems(updated);
                }
              }}
            />
          )}
        </td>
        <td className="p-2 text-right font-mono font-extrabold align-top text-slate-900">
          <div className={`pt-1 ${rowSubtotal < 0 ? "text-rose-700 font-black" : "text-[#1A1612]"}`}>
            {rowSubtotal < 0 ? `(${formatIDR(Math.abs(rowSubtotal))})` : formatIDR(rowSubtotal)}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-2 pt-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase text-[#1A1612] flex items-center gap-1.5">
          <Building2 size={14} className="text-[#A57C50]" />
          Kategori 2: Mine Development Operation (MDO)
        </span>
        {isInlineEditingBA && (
          <button
            type="button"
            onClick={() => {
              const defItem = activeSOWCatalog.find((s) => s.category === "MDO") || activeSOWCatalog[activeSOWCatalog.length - 1];
              setBaMDOItems([
                ...baMDOItems,
                {
                  id: `mdo_${Date.now()}`,
                  category: "MDO",
                  area: "Site POS",
                  material: defItem?.name || "",
                  unit: defItem?.unit || "USD/BCM",
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
            <Plus size={13} /> Tambah Baris MDO
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-[4px] border border-slate-200 shadow-xs bg-white">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px]">
            <tr>
              {isInlineEditingBA && <th className="p-2 w-16 text-center">Aksi</th>}
              <th className="p-2 w-24">Area / Lokasi</th>
              <th className="p-2 min-w-[180px]">Material / Pekerjaan MDO (Master SOW)</th>
              <th className="p-2 text-center w-16">Satuan</th>
              <th className="p-2 text-right w-24">Volume</th>
              <th className="p-2 text-right w-20 text-slate-700 bg-slate-50 border-x border-slate-200">Jarak (M)</th>
              <th className="p-2 text-right w-28">SOW Rate (Rp)</th>
              <th className="p-2 text-right w-32">Subtotal (Rp)</th>
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
            {prodItems.map((item, idx) => renderMDORow(item, idx))}

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
            {distItems.map((item, idx) => renderMDORow(item, idx))}

            {/* SEKSI C: LAND CLEARING / CLEAR & GRUB */}
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
                {lcItems.map((item, idx) => renderMDORow(item, idx))}
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
            {rfRows.map((item, i) => (
              <tr key={`${item.id}_${i}`} className="hover:bg-slate-50/80 transition bg-slate-50/30">
                {isInlineEditingBA && <td className="p-2 text-center text-slate-300 font-mono text-[10px]">{item.code}</td>}
                <td className="p-2 font-bold text-slate-800 align-top">{item.area || "Site POS"}</td>
                <td className="p-2 font-medium text-slate-900 align-top">
                  <div>
                    <span className="font-bold text-slate-900">{item.name}</span>
                    {item.deltaDist !== null && (
                      <span className="text-[10px] text-slate-500 font-mono ml-2">
                        {item.deltaDist < 0 ? `(${Math.abs(item.deltaDist)}m)` : `+${item.deltaDist}m`}
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
          </tbody>
        </table>
      </div>

      {/* Rekapitulasi Tagihan Kategori 2: MDO (Persis AUG MDO) */}
      <div className="overflow-x-auto rounded-[4px] border border-slate-300 shadow-xs bg-slate-50/60 mt-2">
        <table className="w-full text-xs font-mono border-collapse">
          <tbody>
            <tr className="border-b border-slate-200 hover:bg-slate-100/60 font-bold">
              <td className="p-2 text-slate-800 uppercase tracking-wider pl-3">
                TOTAL
              </td>
              <td className="p-2 text-right font-extrabold text-slate-950 w-48 sm:w-56 pr-3">
                {formatIDR(totalGrossMDO)}
              </td>
            </tr>
            <tr className="border-b border-slate-200 hover:bg-slate-100/60">
              <td className="p-2 text-slate-700 uppercase tracking-wider pl-3">
                DPP PPN 11/12
              </td>
              <td className="p-2 text-right font-semibold text-slate-800 w-48 sm:w-56 pr-3">
                {formatIDR(dppMDO)}
              </td>
            </tr>
            <tr className="border-b border-slate-200 hover:bg-slate-100/60">
              <td className="p-2 text-slate-700 uppercase tracking-wider pl-3">
                VAT (12%)
              </td>
              <td className="p-2 text-right font-semibold text-slate-800 w-48 sm:w-56 pr-3">
                {formatIDR(vatMDO)}
              </td>
            </tr>
            <tr className="border-b border-slate-200 hover:bg-slate-100/60">
              <td className="p-2 text-slate-700 uppercase tracking-wider pl-3">
                WITH HOLDING TAX ART 23 (2%)
              </td>
              <td className="p-2 text-right font-semibold text-rose-700 w-48 sm:w-56 pr-3">
                ({formatIDR(whtMDO)})
              </td>
            </tr>
            <tr className="bg-[#1A1612] text-white font-black">
              <td className="p-2.5 uppercase tracking-wider text-xs pl-3 text-amber-200">
                TOTAL INVOICE MDO
              </td>
              <td className="p-2.5 text-right font-black text-white w-48 sm:w-56 pr-3 text-sm">
                {formatIDR(netTotalInvoiceMDO)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
