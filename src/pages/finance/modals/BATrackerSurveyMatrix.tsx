import React from "react";
import { Calculator } from "lucide-react";
import { formatIDR, formatThousand, FormattedNumberInput } from "../helpers";

interface BATrackerSurveyMatrixProps {
  allBAItems: any[];
  baOperatingItems: any[];
  setBaOperatingItems: React.Dispatch<React.SetStateAction<any[]>>;
  baMDOItems: any[];
  setBaMDOItems: React.Dispatch<React.SetStateAction<any[]>>;
  baDeductionItems: any[];
  setBaDeductionItems: React.Dispatch<React.SetStateAction<any[]>>;
  isInlineEditingBA: boolean;
  formData: any;
  isCustomerBGG: boolean;
  isDistanceItem: (item: any) => boolean;
  getBAEffectiveVolume: (item: any, allItems: any[], isSurvey: boolean) => number;
  getBAItemSubtotal: (item: any, volume: number) => number;
  setActiveBAStep: (step: number) => void;
}

export function BATrackerSurveyMatrix({
  allBAItems,
  baOperatingItems,
  setBaOperatingItems,
  baMDOItems,
  setBaMDOItems,
  baDeductionItems,
  setBaDeductionItems,
  isInlineEditingBA,
  formData,
  isCustomerBGG,
  isDistanceItem,
  getBAEffectiveVolume,
  getBAItemSubtotal,
  setActiveBAStep,
}: BATrackerSurveyMatrixProps) {
  return (
    <div className="space-y-4">
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-[4px] p-3 flex items-start gap-2.5 text-xs text-amber-950">
        <Calculator className="text-[#A57C50] shrink-0 mt-0.5" size={16} />
        <div>
          <strong>Step 2 — Penyesuaian Hasil Joint Survey Lapangan:</strong> Masukkan volume hasil joint visit / survey bersama client. Volume pada variabel distance otomatis tersinkronisasi dan sistem menghitung <strong>Delta Selisih</strong> (+/-) secara live.
        </div>
      </div>

      <div className="overflow-x-auto rounded-[4px] border border-slate-200 shadow-xs">
        <table className="w-full text-xs text-left min-w-[780px]">
          <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px]">
            <tr>
              <th className="p-2.5 min-w-[240px]">Material / Pekerjaan</th>
              <th className="p-2.5 text-center w-20">Satuan</th>
              <th className="p-2.5 text-right w-28">Volume TC</th>
              <th className="p-2.5 text-right w-32">Vol Hasil Survey</th>
              <th className="p-2.5 text-right w-28">Rate SOW (Rp)</th>
              <th className="p-2.5 text-right w-32">Subtotal Baru (Rp)</th>
              <th className="p-2.5 text-right w-32">Delta (+/- Rp)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {allBAItems.map((item, idx) => {
              const isDistance = isDistanceItem(item);
              const isDPFuel = item.category === "DP Fuel" || item.isDeduction || (item.material || "").toLowerCase().includes("dp fuel");
              const volAwal = getBAEffectiveVolume(item, allBAItems, false);
              const volAdj = getBAEffectiveVolume(item, allBAItems, true);
              const r = Number(item.rate || 0);
              const subAwal = getBAItemSubtotal(item, volAwal);
              const subAdj = getBAItemSubtotal(item, volAdj);
              const delta = subAdj - subAwal;
              const isOp = item.category === "Operating & Mining" || item.category === "Over Distance";

              return (
                <tr key={item.id || idx} className={`hover:bg-slate-50/80 transition ${isDPFuel ? "bg-slate-50/40" : isDistance ? "bg-amber-50/20" : ""}`}>
                  <td className="p-2.5 font-bold text-slate-900 align-top">
                    <div className="flex items-center gap-1.5">
                      <span>{item.material || "-"}</span>
                      {!isDPFuel && (item.keterangan || item.notes) && (
                        <span className="px-1.5 py-0.5 bg-[#A57C50]/10 text-[#A57C50] border border-[#A57C50]/30 rounded-[3px] text-[10px] font-bold">
                          {item.keterangan || item.notes}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                      {item.category} • {item.area || (isCustomerBGG ? "Pit KKL" : formData?.customerCode === "SBS" ? "Pit E" : (formData?.customerCode === "PTRO" || formData?.customerCode === "DBK") ? "Pit Sapan" : formData?.customerCode === "POS" ? "WM1" : "-")}
                      {isDistance && (
                        <span className="text-[#A57C50] font-mono ml-1 font-bold">
                          (Dist: {Math.round(Number(item.distanceM ?? item.distance ?? item.distanceWeightAvg ?? 0)).toLocaleString("id-ID")} {item.unit === "Bcm.Hm" ? "Hm" : "m"})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-2.5 text-center font-mono font-bold text-slate-700 align-top">
                    {isDPFuel ? (
                      <span className="text-slate-400 font-bold pt-1 block">-</span>
                    ) : (
                      <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-[3px] text-xs inline-block text-center min-w-[45px] mt-0.5">
                        {item.unit || "BCM"}
                      </span>
                    )}
                  </td>
                  <td className="p-2.5 text-right font-mono text-slate-600 align-top">
                    <span className="pt-1 block">{isDPFuel ? "-" : (volAwal > 0 ? volAwal.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0")}</span>
                  </td>
                  <td className="p-2.5 text-right font-mono align-top">
                    {isDPFuel ? (
                      <span className="pt-1 block text-slate-400 font-mono">-</span>
                    ) : !isInlineEditingBA ? (
                      <div className="flex flex-col items-end pt-0.5">
                        <span className="font-mono font-bold text-slate-900 block">
                          {volAdj > 0 ? volAdj.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0"}
                        </span>
                        {isDistance && (
                          <span className="text-[9px] text-[#A57C50] font-semibold italic mt-0.5 whitespace-nowrap">
                            Auto-sync survey
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-0.5 flex flex-col items-end">
                        <FormattedNumberInput
                          allowDecimals
                          maxDecimals={2}
                          className="w-24 bg-slate-50 border border-slate-300 rounded-[3px] px-2 py-1 text-right font-mono font-bold text-xs text-slate-900 focus:border-[#A57C50] outline-none"
                          value={isDistance ? (item.adjustedVolume ? item.adjustedVolume : "") : (item.adjustedVolume !== undefined && item.adjustedVolume !== 0 ? item.adjustedVolume : "")}
                          placeholder={volAdj > 0 ? volAdj.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0"}
                          onChange={(val) => {
                            if (item.isDeduction || item.category === "Pengurang Biaya") {
                              const deds = [...(baDeductionItems || [])];
                              const dIdx = deds.findIndex((d) => d.id === item.id);
                              if (dIdx >= 0) {
                                deds[dIdx].adjustedVolume = val;
                                setBaDeductionItems(deds);
                              }
                            } else if (isOp) {
                              const ops = [...baOperatingItems];
                              const opIdx = ops.findIndex((o) => o.id === item.id);
                              if (opIdx >= 0) {
                                ops[opIdx].adjustedVolume = val;
                                setBaOperatingItems(ops);
                              }
                            } else {
                              const mdos = [...baMDOItems];
                              const mIdx = mdos.findIndex((m) => m.id === item.id);
                              if (mIdx >= 0) {
                                mdos[mIdx].adjustedVolume = val;
                                setBaMDOItems(mdos);
                              }
                            }
                          }}
                        />
                        {isDistance && (
                          <span className="text-[9px] text-[#A57C50] font-semibold italic">
                            Auto-sync survey
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="p-2.5 text-right font-mono text-slate-700 align-top">
                    <span className="pt-1 block font-mono text-slate-800">{isDPFuel ? (r ? formatThousand(r) : "0") : formatIDR(r)}</span>
                  </td>
                  <td className="p-2.5 text-right font-mono font-bold text-slate-900 align-top">
                    <div className="pt-1">{formatIDR(subAdj)}</div>
                  </td>
                  <td className={`p-2.5 text-right font-mono font-black align-top ${delta >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                    <div className="pt-1">{delta >= 0 ? `+${formatIDR(delta)}` : `-${formatIDR(Math.abs(delta))}`}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Delta Summary Box */}
      {(() => {
        const sumOf = (survey: boolean) => allBAItems.reduce((acc, it) => acc + getBAItemSubtotal(it, getBAEffectiveVolume(it, allBAItems, survey)), 0);
        const dispInit = sumOf(false);
        const dispAdj = sumOf(true);
        const dispDelta = dispAdj - dispInit;

        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-white rounded-[4px] border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Total Awal (Site)
              </span>
              <span className="text-sm font-black font-mono text-slate-800">{formatIDR(dispInit)}</span>
            </div>
            <div className="p-3 bg-[#A57C50]/5 rounded-[4px] border border-[#A57C50]/30 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-[#A57C50] block">
                Total Survey Bersama
              </span>
              <span className="text-sm font-black font-mono text-[#1A1612]">{formatIDR(dispAdj)}</span>
            </div>
            <div className={`p-3 rounded-[4px] border shadow-xs ${dispDelta >= 0 ? "bg-emerald-50/50 border-emerald-300" : "bg-rose-50/50 border-rose-300"}`}>
              <span className={`text-[10px] font-bold uppercase block ${dispDelta >= 0 ? "text-emerald-800" : "text-rose-800"}`}>
                Delta Selisih Survey
              </span>
              <span className={`text-sm font-black font-mono ${dispDelta >= 0 ? "text-emerald-900" : "text-rose-900"}`}>
                {dispDelta >= 0 ? `+${formatIDR(dispDelta)}` : `-${formatIDR(Math.abs(dispDelta))}`}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Navigation Buttons */}
      <div className="flex justify-start items-center pt-2">
        <button
          type="button"
          onClick={() => setActiveBAStep(1)}
          className="px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold rounded-[3px] transition text-xs cursor-pointer"
        >
          Kembali ke Step 1
        </button>
      </div>
    </div>
  );
}
