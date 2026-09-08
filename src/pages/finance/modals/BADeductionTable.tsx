import React from "react";
import { TrendingDown, Plus, Trash2 } from "lucide-react";
import { formatIDR, FormattedNumberInput } from "../helpers";
import { SOWSelectDropdown } from "./SOWSelectDropdown";

interface BADeductionTableProps {
  formData: any;
  baDeductionItems: any[];
  setBaDeductionItems: React.Dispatch<React.SetStateAction<any[]>>;
  isInlineEditingBA: boolean;
  activeSOWCatalog: any[];
}

export function BADeductionTable({
  formData,
  baDeductionItems,
  setBaDeductionItems,
  isInlineEditingBA,
  activeSOWCatalog,
}: BADeductionTableProps) {
  const isCustomerSBS = formData.customerCode === "SBS";
  if (!isCustomerSBS) return null;

  return (
    <div className="space-y-2 mt-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase text-rose-900 flex items-center gap-1.5">
          <TrendingDown size={14} className="text-rose-700" /> Kategori 3: Pengurang Biaya (Denda & BBM SBS)
        </span>
        {isInlineEditingBA && (
          <button
            type="button"
            onClick={() => {
              const newDed = {
                id: `sbs_ded_${Date.now()}`,
                category: "Pengurang Biaya",
                area: "Pit E",
                material: "",
                unit: "Lot",
                initialVolume: 1,
                adjustedVolume: 1,
                rate: 0,
                isDeduction: true,
                subtotalInitial: 0,
                subtotalAdjusted: 0,
                notes: "",
                keterangan: "",
                period: formData.workPeriod || "Agustus 2026",
              };
              setBaDeductionItems([...(baDeductionItems || []), newDed]);
            }}
            className="text-[11px] font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer border border-rose-200"
          >
            <Plus size={12} />
            <span>Tambah Pengurang Biaya</span>
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-rose-200 bg-white shadow-2xs">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-rose-100/70 text-rose-900 text-[10px] font-black uppercase tracking-wider border-b border-rose-200">
              <th className="p-2 text-center w-10">No</th>
              <th className="p-2 min-w-[220px]">Deskripsi Pengurang Biaya (Master SOW)</th>
              <th className="p-2 min-w-[160px]">Keterangan</th>
              <th className="p-2 text-right w-36">Nilai Potongan (Rp)</th>
              <th className="p-2 text-right w-36">Subtotal (Rp)</th>
              {isInlineEditingBA && <th className="p-2 text-center w-10">#</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-rose-100">
            {(baDeductionItems || []).map((item: any, idx: number) => (
              <tr key={item.id || idx} className="hover:bg-rose-50/40 transition">
                <td className="p-2 text-center font-mono text-slate-500 font-bold">{idx + 1}</td>
                <td className="p-2">
                  {!isInlineEditingBA ? (
                    <span className="font-bold text-slate-900">{item.material}</span>
                  ) : (
                    <div className="space-y-1">
                      <SOWSelectDropdown
                        value={item.isCustom ? "Lainnya" : (item.material || "")}
                        customerCode="SBS"
                        activeSOWCatalog={activeSOWCatalog}
                        categoryFilter="Pengurang Biaya"
                        className="w-full bg-rose-50/60 hover:bg-rose-50 focus:bg-white border border-rose-300 focus:border-rose-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 outline-none transition cursor-pointer"
                        onChange={(val) => {
                          const updated = [...(baDeductionItems || [])];
                          if (val === "Lainnya") {
                            updated[idx].isCustom = true;
                          }
                          setBaDeductionItems(updated);
                        }}
                        onSelectSow={(sow) => {
                          const updated = [...(baDeductionItems || [])];
                          if (sow.name === "Lainnya") {
                            updated[idx].isCustom = true;
                            updated[idx].customName = updated[idx].customName || "";
                            updated[idx].material = updated[idx].customName || "Lainnya";
                          } else {
                            updated[idx].isCustom = false;
                            updated[idx].material = sow.name;
                            updated[idx].unit = sow.unit || "Lot";
                          }
                          setBaDeductionItems(updated);
                        }}
                      />
                      {(item.isCustom || item.material === "Lainnya") && (
                        <input
                          className="w-full bg-amber-50 border border-amber-300 focus:border-amber-600 rounded px-2 py-1 text-xs font-bold text-slate-900 outline-none placeholder:text-amber-700/60 placeholder:italic"
                          placeholder="Ketik jenis denda/potongan lainnya..."
                          value={item.customName !== undefined ? item.customName : (item.material !== "Lainnya" ? item.material : "")}
                          onChange={(e) => {
                            const updated = [...(baDeductionItems || [])];
                            updated[idx].customName = e.target.value;
                            updated[idx].material = e.target.value || "Lainnya";
                            setBaDeductionItems(updated);
                          }}
                        />
                      )}
                    </div>
                  )}
                </td>
                <td className="p-2">
                  {!isInlineEditingBA ? (
                    <span className="text-slate-600 font-medium">{item.keterangan || item.notes || "-"}</span>
                  ) : (
                    <input
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 text-xs font-medium focus:border-rose-600 outline-none"
                      placeholder="Catatan..."
                      value={item.keterangan || item.notes || ""}
                      onChange={(e) => {
                        const updated = [...(baDeductionItems || [])];
                        updated[idx].keterangan = e.target.value;
                        updated[idx].notes = e.target.value;
                        setBaDeductionItems(updated);
                      }}
                    />
                  )}
                </td>
                <td className="p-2 text-right font-mono">
                  {!isInlineEditingBA ? (
                    <span className="font-extrabold text-rose-700">({formatIDR(Math.abs(item.rate || 0))})</span>
                  ) : (
                    <FormattedNumberInput
                      allowDecimals
                      maxDecimals={3}
                      className="w-32 bg-white border border-rose-300 rounded px-2 py-1 text-right font-mono font-bold text-xs text-rose-900 focus:border-rose-700 outline-none"
                      value={item.rate === 0 ? "" : Math.abs(item.rate ?? 0)}
                      placeholder="00.00"
                      onChange={(r) => {
                        const updated = [...(baDeductionItems || [])];
                        const absVal = Math.abs(r);
                        updated[idx].rate = absVal;
                        updated[idx].initialVolume = 1;
                        updated[idx].adjustedVolume = 1;
                        updated[idx].subtotalInitial = -absVal;
                        updated[idx].subtotalAdjusted = -absVal;
                        setBaDeductionItems(updated);
                      }}
                    />
                  )}
                </td>
                <td className="p-2 text-right font-mono font-extrabold text-rose-700">
                  ({formatIDR(Math.abs(Number(item.rate) || 0))})
                </td>
                {isInlineEditingBA && (
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => setBaDeductionItems(baDeductionItems.filter((_: any, i: number) => i !== idx))}
                      className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {(!baDeductionItems || baDeductionItems.length === 0) && (
              <tr>
                <td colSpan={isInlineEditingBA ? 7 : 6} className="p-4 text-center text-slate-400 bg-rose-50/20 italic">
                  Tidak ada pengurang pembayaran / denda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
