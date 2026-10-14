import React from "react";
import { Receipt } from "lucide-react";
import { formatIDR, FormattedNumberInput } from "../helpers";
import { getSBSTarifByDistance } from "../calculations";
import { InvoiceActionCell, InvoiceDescriptionCell } from "./InvoiceRowActions";
import { SBSPengurangTable } from "./SBSPengurangTable";

interface InvoiceTableSBSProps {
  invLineItems: any[];
  setInvLineItems: React.Dispatch<React.SetStateAction<any[]>>;
  updateInvItemVolume: (id: string, val: any) => void;
  updateInvItemRateIDR: (id: string, val: any) => void;
  updateInvItemAmount: (id: string, val: any) => void;
  removeInvLineItem: (id: string) => void;
  moveInvRow: (id: string, dir: "up" | "down") => void;
  handleUpdateInvItemField: (id: string, field: string, val: any) => void;
  draggedInvId: string | null;
  setDraggedInvId: (id: string | null) => void;
  dragOverInvId: string | null;
  setDragOverInvId: (id: string | null) => void;
  handleReorderInvLineItems: (from: number, to: number) => void;
  cCalc: any;
}

export function InvoiceTableSBS({
  invLineItems,
  setInvLineItems,
  updateInvItemVolume,
  updateInvItemRateIDR,
  updateInvItemAmount,
  removeInvLineItem,
  moveInvRow,
  handleUpdateInvItemField,
  draggedInvId,
  setDraggedInvId,
  dragOverInvId,
  setDragOverInvId,
  handleReorderInvLineItems,
  cCalc,
}: InvoiceTableSBSProps) {
  const getRowDragProps = (item: any) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData("text/plain", item.id);
      setDraggedInvId(item.id);
    },
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      if (dragOverInvId !== item.id) setDragOverInvId(item.id);
    },
    onDragLeave: () => {
      if (dragOverInvId === item.id) setDragOverInvId(null);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const sourceId = e.dataTransfer.getData("text/plain") || draggedInvId;
      if (sourceId && sourceId !== item.id) {
        const fromIdx = (invLineItems || []).findIndex((i: any) => i.id === sourceId);
        const toIdx = (invLineItems || []).findIndex((i: any) => i.id === item.id);
        if (fromIdx !== -1 && toIdx !== -1) {
          handleReorderInvLineItems(fromIdx, toIdx);
        }
      }
      setDraggedInvId(null);
      setDragOverInvId(null);
    },
    className: `hover:bg-slate-50 transition ${dragOverInvId === item.id ? "border-t-2 border-cyan-500 bg-cyan-50/50" : ""}`,
  });

  return (
    <div className="space-y-4">
      {/* TABEL UTAMA INVOICE PEKERJAAN (NILAI JKP) */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Receipt size={14} className="text-cyan-700" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Tabel Utama Invoice Pekerjaan (Nilai JKP)
            </h4>
          </div>
          <span className="text-[11px] text-slate-600 font-medium">
            OB Removal & Jasa Penunjang Produksi
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider">
                <th className="p-2.5 text-center w-24">AKSI</th>
                <th className="p-2.5">DESCRIPTION</th>
                <th className="p-2.5 text-center w-28">JARAK (M)</th>
                <th className="p-2.5 text-center w-36">CLAIMED UNIT</th>
                <th className="p-2.5 text-right w-36">UNIT RATE (IDR)</th>
                <th className="p-2.5 text-right w-44 font-extrabold">AMOUNT (IDR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {/* Seksi A: OB REMOVAL */}
              <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
                <td className="p-2 text-center text-slate-400">#</td>
                <td className="p-2 underline font-extrabold">OB REMOVAL (Per Area Kerja)</td>
                <td className="p-2 text-center text-slate-400 font-mono">-</td>
                <td className="p-2 text-center font-mono text-cyan-900 font-black">
                  {invLineItems.filter((i) => i.section === "A").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} BCM
                </td>
                <td className="p-2 text-right"></td>
                <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalA)}</td>
              </tr>
              {invLineItems.filter((i) => i.section === "A").map((item) => {
                const currentDist = item.distanceM ?? item.overhaulMtr ?? "";
                const tier = getSBSTarifByDistance(Number(currentDist)).tier;
                return (
                  <tr key={item.id} {...getRowDragProps(item)} className="hover:bg-slate-50/80">
                    <InvoiceActionCell
                      itemId={item.id}
                      onMoveUp={() => moveInvRow(item.id, "up")}
                      onMoveDown={() => moveInvRow(item.id, "down")}
                      onRemove={() => removeInvLineItem(item.id)}
                    />
                    <InvoiceDescriptionCell item={item} onUpdateField={handleUpdateInvItemField} />
                    <td className="p-2 text-center">
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <FormattedNumberInput
                          allowDecimals
                          maxDecimals={3}
                          className="w-20 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-1.5 py-0.5 rounded text-center focus:bg-white focus:border-cyan-700 outline-none"
                          placeholder="00.00"
                          value={currentDist === 0 ? "" : currentDist}
                          onChange={(val) => {
                            const dist = Number(val) || 0;
                            const { rate } = getSBSTarifByDistance(dist);
                            setInvLineItems((prev) => prev.map((it) => {
                              if (it.id !== item.id) return it;
                              return {
                                ...it,
                                distanceM: dist,
                                overhaulMtr: dist,
                                unitRateIDR: rate,
                              };
                            }));
                          }}
                        />
                        {tier && (
                          <span className="text-[9px] text-cyan-800 font-mono font-bold leading-none">
                            {tier.rangeLabel}m
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <FormattedNumberInput
                          allowDecimals
                          maxDecimals={2}
                          className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                          placeholder="00.00"
                          value={item.volume === 0 ? "" : (item.volume ?? "")}
                          onChange={(val) => updateInvItemVolume(item.id, val)}
                        />
                        <span className="text-[11px] text-slate-600 font-bold">{item.unit || "BCM"}</span>
                      </div>
                    </td>
                    <td className="p-2 text-right">
                      <FormattedNumberInput
                        allowDecimals
                        maxDecimals={0}
                        className="w-28 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                        placeholder="00.00"
                        value={item.unitRateIDR === 0 ? "" : (item.unitRateIDR ?? "")}
                        onChange={(val) => updateInvItemRateIDR(item.id, val)}
                      />
                    </td>
                    <td className="p-2 text-right font-mono font-extrabold text-slate-900">
                      {formatIDR(Math.round((item.volume || 0) * (item.unitRateIDR || 0)))}
                    </td>
                  </tr>
                );
              })}

              {/* Seksi B: JASA PENUNJANG PRODUKSI */}
              <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                <td className="p-2 text-center text-slate-400">#</td>
                <td className="p-2 underline font-extrabold">JASA PENUNJANG PRODUKSI (Rental Alat)</td>
                <td className="p-2 text-center text-slate-400 font-mono">-</td>
                <td className="p-2 text-center font-mono text-cyan-900 font-black">
                  {invLineItems.filter((i) => i.section === "B").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} Hours
                </td>
                <td className="p-2 text-right"></td>
                <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalB)}</td>
              </tr>
              {invLineItems.filter((i) => i.section === "B").map((item) => (
                <tr key={item.id} {...getRowDragProps(item)} className="hover:bg-slate-50/80">
                  <InvoiceActionCell
                    itemId={item.id}
                    onMoveUp={() => moveInvRow(item.id, "up")}
                    onMoveDown={() => moveInvRow(item.id, "down")}
                    onRemove={() => removeInvLineItem(item.id)}
                  />
                  <InvoiceDescriptionCell item={item} onUpdateField={handleUpdateInvItemField} />
                  <td className="p-2 text-center text-slate-400 font-mono">-</td>
                  <td className="p-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <FormattedNumberInput
                        allowDecimals
                        maxDecimals={2}
                        className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                        placeholder="00.00"
                        value={item.volume === 0 ? "" : (item.volume ?? "")}
                        onChange={(val) => updateInvItemVolume(item.id, val)}
                      />
                      <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Hours"}</span>
                    </div>
                  </td>
                  <td className="p-2 text-right">
                    <FormattedNumberInput
                      allowDecimals
                      maxDecimals={0}
                      className="w-28 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                      placeholder="00.00"
                      value={item.unitRateIDR === 0 ? "" : (item.unitRateIDR ?? "")}
                      onChange={(val) => updateInvItemRateIDR(item.id, val)}
                    />
                  </td>
                  <td className="p-2 text-right font-mono font-extrabold text-slate-900">
                    {formatIDR(Math.round((item.volume || 0) * (item.unitRateIDR || 0)))}
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Footer Tabel Utama */}
            <tfoot className="border-t-2 border-slate-900 bg-slate-50 font-bold text-xs">
              <tr>
                <td colSpan={4} className="p-2.5 text-right font-black uppercase text-slate-700">TOTAL (NILAI PEKERJAAN BRUTO):</td>
                <td colSpan={2} className="p-2.5 text-right font-mono text-sm font-black text-slate-900">{formatIDR(cCalc.totalGross)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="p-2.5 text-right uppercase text-slate-600 font-bold">DPP PPN 11/12:</td>
                <td colSpan={2} className="p-2.5 text-right font-mono font-bold text-slate-800">{formatIDR(cCalc.dpp11_12)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="p-2.5 text-right uppercase text-emerald-800 font-extrabold">VAT ( 12% ) (+):</td>
                <td colSpan={2} className="p-2.5 text-right font-mono font-extrabold text-emerald-700">{formatIDR(cCalc.vat12)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="p-2.5 text-right uppercase text-rose-800 font-extrabold">WITH HOLDING TAX ART 23 (2%) (-):</td>
                <td colSpan={2} className="p-2.5 text-right font-mono font-extrabold text-rose-700">({formatIDR(cCalc.pph23)})</td>
              </tr>
              <tr className="bg-slate-900 text-white font-black text-sm border-t-2 border-slate-900">
                <td colSpan={4} className="p-3 text-right uppercase tracking-wider text-cyan-300 font-black">TOTAL INVOICE:</td>
                <td colSpan={2} className="p-3 text-right font-mono text-base font-black text-emerald-400">{formatIDR(cCalc.totalInvoice)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Pengurang Pembayaran Sub-Table */}
      <SBSPengurangTable
        invLineItems={invLineItems}
        updateInvItemAmount={updateInvItemAmount}
        removeInvLineItem={removeInvLineItem}
        moveInvRow={moveInvRow}
        getRowDragProps={getRowDragProps}
        cCalc={cCalc}
      />
    </div>
  );
}
