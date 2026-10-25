import React from "react";
import { Building2, Trash2 } from "lucide-react";
import { formatIDR, FormattedNumberInput } from "../helpers";
import { SOWSelectDropdown } from "./SOWSelectDropdown";
import { BAAddRowDropdown } from "./BAAddRowDropdown";
import { isDistanceItem, isLandClearingItem, removeBAItem, getBAEffectiveVolume, isOBMaterial, getItemDistanceM, getBaseDistance, calcIDR, calcItemsAmount, calcItemLines } from "../ba_calculations";
import type { BACalc } from "../../../types";

interface BAPOSMDOTableProps {
  formData: any;
  baMDOItems: any[];
  setBaMDOItems: React.Dispatch<React.SetStateAction<any[]>>;
  isInlineEditingBA: boolean;
  activeSOWCatalog: any[];
  mRate: number;
  allBAItems?: any[];
  calc?: BACalc;
  getSowMasterRate?: (customer: string, itemName: string, fallbackRate: number, isUSD?: boolean, period?: string) => number;
}

export function BAPOSMDOTable({
  formData,
  baMDOItems,
  setBaMDOItems,
  isInlineEditingBA,
  activeSOWCatalog,
  mRate,
  allBAItems = [],
  calc,
  getSowMasterRate,
}: BAPOSMDOTableProps) {
  // Group into Production, Over Distance and Land Clearing
  const dedItems = baMDOItems.filter((it) => it.isDeduction);
  const prodItems = baMDOItems.filter((it) => !isDistanceItem(it) && !isLandClearingItem(it) && !it.isDeduction);
  const distItems = baMDOItems.filter((it) => isDistanceItem(it) && !it.isDeduction);
  const lcItems = baMDOItems.filter((it) => isLandClearingItem(it) && !it.isDeduction);

  const mdo = calc?.byCategory["MDO"];
  const rfRows = (calc?.lines || []).filter((l) => l.section === "D" && l.category === "MDO");
  const subtotalA = calcItemsAmount(calc, prodItems);
  const subtotalB = calcItemsAmount(calc, distItems);
  const subtotalC = calcItemsAmount(calc, lcItems);
  const subtotalD = calc ? rfRows.reduce((a, l) => a + l.amount, 0) : undefined;
  const subtotalE = calcItemsAmount(calc, dedItems);
  const paren = (v: number | undefined) => (v !== undefined && v < 0 ? `(${formatIDR(-v)})` : calcIDR(v));

  const renderMDORow = (item: any, idx: number) => {
    const isDist = isDistanceItem(item);
    const effVol = isDist
      ? getBAEffectiveVolume(item, allBAItems.length > 0 ? allBAItems : baMDOItems, false)
      : Number(item.initialVolume || 0);
    const actualDist = getItemDistanceM(item);
    const baseDist = getBaseDistance(item, formData.customerCode);
    const deltaDist = actualDist - baseDist;
    const rowSubtotal = calcItemsAmount(calc, [item]);

    return (
      <tr key={item.id || idx} className={`hover:bg-slate-50/80 transition ${isDist ? "bg-amber-50/20" : ""}`}>
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
                  {actualDist.toLocaleString("id-ID")} mtr - {baseDist.toLocaleString("id-ID")} mtr ={" "}
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
                      updated[targetIdx].isUSD = Number(sow.rateUSD) > 0;
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
                  {actualDist.toLocaleString("id-ID")} mtr - {baseDist.toLocaleString("id-ID")} mtr ={" "}
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
                maxDecimals={15}
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
            <span className="pt-1 block">{calcIDR(calcItemLines(calc, [item])[0]?.rate)}</span>
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
          <div className={`pt-1 ${(rowSubtotal || 0) < 0 ? "text-rose-700 font-black" : "text-[#1A1612]"}`}>
            {paren(rowSubtotal)}
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
          <BAAddRowDropdown
            formData={formData}
            baOperatingItems={baMDOItems}
            setBaOperatingItems={setBaMDOItems}
            baMDOItems={baMDOItems}
            setBaMDOItems={setBaMDOItems}
            mRate={mRate}
            getSowMasterRate={getSowMasterRate}
            activeSOWCatalog={activeSOWCatalog}
            targetSection="mdo"
          />
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
                {calcIDR(subtotalA)}
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
                {paren(subtotalB)}
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
                    {calcIDR(subtotalC)}
                  </td>
                </tr>
                {lcItems.map((item, idx) => renderMDORow(item, idx))}
              </>
            )}

            {/* SEKSI D: RAISE & FALL'S FACTOR (READ-ONLY AUTO COMPUTED) */}
            <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
              {isInlineEditingBA && <td className="p-2 text-center text-slate-400">#</td>}
              <td colSpan={6} className="p-2 uppercase font-extrabold tracking-wider">
                D. RAISE & FALL'S FACTOR (RF: {calc ? calc.rfIndex.toFixed(3) : "-"}x)
              </td>
              <td className="p-2 text-right font-mono text-slate-900 font-extrabold">
                {paren(subtotalD)}
              </td>
            </tr>
            {rfRows.map((item, i) => (
              <tr key={i} className="hover:bg-slate-50/80 transition bg-slate-50/30">
                {isInlineEditingBA && <td className="p-2 text-center text-slate-300 font-mono text-[10px]">{item.code}</td>}
                <td className="p-2 font-bold text-slate-800 align-top">{item.subSection || "Site POS"}</td>
                <td className="p-2 font-medium text-slate-900 align-top">
                  <span className="font-bold text-slate-900">{item.description}</span>
                </td>
                <td className="p-2 text-center align-top font-mono text-slate-600 font-bold">{item.unit}</td>
                <td className="p-2 text-right font-mono align-top font-bold">
                  {item.volume > 0 ? Number(item.volume).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}
                </td>
                <td className="p-2 text-right font-mono align-top bg-slate-50/50 border-x border-slate-100 text-slate-600 font-mono">-</td>
                <td className="p-2 text-right font-mono align-top font-bold text-slate-900">
                  {formatIDR(item.rate)}
                </td>
                <td className="p-2 text-right font-mono font-extrabold align-top text-slate-900">
                  {paren(item.amount)}
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

            {/* SEKSI E: PENGURANG (DP FUEL / DEDUCTION) */}
            {dedItems.length > 0 && (
              <>
                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                  {isInlineEditingBA && <td className="p-2 text-center text-slate-400">#</td>}
                  <td colSpan={6} className="p-2 uppercase font-extrabold tracking-wider">
                    E. PENGURANG / DEDUCTION
                  </td>
                  <td className="p-2 text-right font-mono text-rose-700 font-extrabold">
                    {paren(subtotalE)}
                  </td>
                </tr>
                {dedItems.map((item, idx) => renderMDORow(item, idx))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Rekapitulasi Tagihan Kategori 2: MDO (Persis AUG MDO) */}
      <div className="overflow-x-auto rounded-[4px] border border-slate-300 shadow-xs bg-slate-50/60 mt-2">
        <table className="w-full text-xs font-mono border-collapse">
          <tbody>
            {!!subtotalE && mdo && (
              <>
                <tr className="border-b border-slate-200 hover:bg-slate-100/60 font-bold">
                  <td className="p-2 text-slate-800 uppercase tracking-wider pl-3">TOTAL GROSS</td>
                  <td className="p-2 text-right font-extrabold text-slate-950 w-48 sm:w-56 pr-3">{calcIDR(mdo.gross - subtotalE)}</td>
                </tr>
                <tr className="border-b border-slate-200 hover:bg-slate-100/60 font-bold text-rose-700">
                  <td className="p-2 uppercase tracking-wider pl-3">POTONGAN / DEDUCTION</td>
                  <td className="p-2 text-right font-extrabold w-48 sm:w-56 pr-3">{paren(subtotalE)}</td>
                </tr>
              </>
            )}
            <tr className="border-b border-slate-200 hover:bg-slate-100/60 font-bold">
              <td className="p-2 text-slate-800 uppercase tracking-wider pl-3">
                {subtotalE ? "TOTAL NETTO" : "TOTAL"}
              </td>
              <td className="p-2 text-right font-extrabold text-slate-950 w-48 sm:w-56 pr-3">
                {calcIDR(mdo?.gross)}
              </td>
            </tr>
            <tr className="border-b border-slate-200 hover:bg-slate-100/60">
              <td className="p-2 text-slate-700 uppercase tracking-wider pl-3">
                DPP PPN 11/12
              </td>
              <td className="p-2 text-right font-semibold text-slate-800 w-48 sm:w-56 pr-3">
                {calcIDR(mdo?.dpp11_12)}
              </td>
            </tr>
            <tr className="border-b border-slate-200 hover:bg-slate-100/60">
              <td className="p-2 text-slate-700 uppercase tracking-wider pl-3">
                VAT (12%)
              </td>
              <td className="p-2 text-right font-semibold text-slate-800 w-48 sm:w-56 pr-3">
                {calcIDR(mdo?.vat12)}
              </td>
            </tr>
            <tr className="border-b border-slate-200 hover:bg-slate-100/60">
              <td className="p-2 text-slate-700 uppercase tracking-wider pl-3">
                WITH HOLDING TAX ART 23 (2%)
              </td>
              <td className="p-2 text-right font-semibold text-rose-700 w-48 sm:w-56 pr-3">
                ({calcIDR(mdo?.pph23)})
              </td>
            </tr>
            <tr className="bg-[#1A1612] text-white font-black">
              <td className="p-2.5 uppercase tracking-wider text-xs pl-3 text-amber-200">
                TOTAL INVOICE MDO
              </td>
              <td className="p-2.5 text-right font-black text-white w-48 sm:w-56 pr-3 text-sm">
                {calcIDR(mdo?.totalInvoice)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
