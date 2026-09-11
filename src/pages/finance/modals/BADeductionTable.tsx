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

  const totalDeduction = (baDeductionItems || []).reduce((acc: number, it: any) => {
    return acc + Math.abs(Number(it.rate || it.subtotalInitial || 0));
  }, 0);

  return (
    <div className="space-y-2 pt-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase text-[#1A1612] flex items-center gap-1.5">
          <TrendingDown size={14} className="text-rose-700" />
          Pengurang Pembayaran (Section P / Denda Operasional SBS)
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
                unit: "Hours",
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
            className="text-xs font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-[3px] flex items-center gap-1 transition cursor-pointer shadow-xs"
          >
            <Plus size={12} />
            <span>Tambah Pengurang Pembayaran</span>
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-[4px] border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase tracking-wider border-b border-slate-200">
              {isInlineEditingBA && <th className="p-2 text-center w-16">Aksi</th>}
              <th className="p-2 text-center w-10">No</th>
              <th className="p-2 min-w-[240px]">Pengurang Pembayaran</th>
              <th className="p-2 min-w-[140px]">Keterangan</th>
              <th className="p-2 text-center w-24">Claimed Unit</th>
              <th className="p-2 text-right w-36">Unit Rate (IDR)</th>
              <th className="p-2 text-right w-36">Amount (IDR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(baDeductionItems || []).map((item: any, idx: number) => (
              <tr key={item.id || idx} className="hover:bg-rose-50/20 transition">
                {isInlineEditingBA && (
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => setBaDeductionItems(baDeductionItems.filter((_: any, i: number) => i !== idx))}
                      className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-[3px] transition cursor-pointer"
                      title="Hapus baris"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                )}
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
                        className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-[#A57C50] rounded-[3px] px-2 py-1 text-xs font-bold text-slate-900 outline-none transition cursor-pointer"
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
                            updated[idx].unit = sow.unit || "Hours";
                          }
                          setBaDeductionItems(updated);
                        }}
                      />
                      {(item.isCustom || item.material === "Lainnya") && (
                        <input
                          className="w-full bg-amber-50/50 border border-amber-300 focus:border-[#A57C50] rounded-[3px] px-2 py-1 text-xs font-bold text-slate-900 outline-none placeholder:text-amber-700/60 placeholder:italic"
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
                      className="w-full bg-slate-50 border border-slate-300 rounded-[3px] px-2 py-1 text-slate-900 text-xs font-medium focus:border-[#A57C50] outline-none"
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
                <td className="p-2 text-center text-slate-700 font-bold">
                  {item.unit || "Hours"}
                </td>
                <td className="p-2 text-right font-mono">
                  {!isInlineEditingBA ? (
                    <span className="font-extrabold text-rose-700">({formatIDR(Math.abs(item.rate || 0))})</span>
                  ) : (
                    <FormattedNumberInput
                      allowDecimals
                      maxDecimals={3}
                      className="w-28 sm:w-32 bg-white border border-rose-300 focus:border-rose-500 rounded-[3px] px-1.5 py-1 text-right font-mono font-bold text-xs text-rose-700 outline-none"
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
              </tr>
            ))}
            {(!baDeductionItems || baDeductionItems.length === 0) && (
              <tr>
                <td colSpan={isInlineEditingBA ? 7 : 6} className="p-4 text-center text-slate-400 bg-slate-50 italic">
                  Tidak ada pengurang pembayaran / denda.
                </td>
              </tr>
            )}
          </tbody>
          {baDeductionItems && baDeductionItems.length > 0 && (
            <tfoot>
              <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                {isInlineEditingBA && <td className="p-2 text-center text-slate-400">#</td>}
                <td colSpan={5} className="p-2 uppercase font-extrabold tracking-wider">
                  Total Pengurang Pembayaran
                </td>
                <td className="p-2 text-right font-mono font-extrabold text-rose-700">
                  ({formatIDR(totalDeduction)})
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
