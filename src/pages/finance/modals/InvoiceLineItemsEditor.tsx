import React, { useState } from "react";
import { Layers } from "lucide-react";
import { RupiahInput } from "../helpers";
import { InvoiceTableSBS } from "./InvoiceTableSBS";
import { InvoiceTableBGG } from "./InvoiceTableBGG";
import { InvoiceTablePTRO } from "./InvoiceTablePTRO";
import { InvoiceTablePOS } from "./InvoiceTablePOS";
import { InvoiceTaxSummary } from "./InvoiceTaxSummary";

interface InvoiceLineItemsEditorProps {
  formData: any;
  invLineItems: any[];
  setInvLineItems: React.Dispatch<React.SetStateAction<any[]>>;
  updateInvItemVolume: (id: string, val: any) => void;
  updateInvItemOverhaul: (id: string, val: any) => void;
  updateInvItemRateIDR: (id: string, val: any) => void;
  updateInvItemRateUSD: (id: string, val: any) => void;
  updateInvItemKurs: (id: string, val: any) => void;
  updateInvItemAmount: (id: string, val: any) => void;
  removeInvLineItem: (id: string) => void;
  moveInvRow: (id: string, dir: "up" | "down") => void;
  handleUpdateInvItemField: (id: string, field: string, val: any) => void;
  handleReorderInvLineItems: (from: number, to: number) => void;
  getItemEffectiveVolume: (item: any) => number;
  getItemEffectiveOverhaulMtr: (item: any) => number;
  calculateItemRateAndAmount: (item: any, cust: string) => any;
  getCustomerCalculations: (items: any[], cust: string) => any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export function InvoiceLineItemsEditor({
  formData,
  invLineItems,
  setInvLineItems,
  updateInvItemVolume,
  updateInvItemOverhaul,
  updateInvItemRateIDR,
  updateInvItemRateUSD,
  updateInvItemKurs,
  updateInvItemAmount,
  removeInvLineItem,
  moveInvRow,
  handleUpdateInvItemField,
  handleReorderInvLineItems,
  getItemEffectiveVolume,
  getItemEffectiveOverhaulMtr,
  calculateItemRateAndAmount,
  getCustomerCalculations,
  setFormData,
}: InvoiceLineItemsEditorProps) {
  const currentCust = (formData.customerCode || "POS").toUpperCase();
  const cCalc = getCustomerCalculations(invLineItems, currentCust);

  const [draggedInvId, setDraggedInvId] = useState<string | null>(null);
  const [dragOverInvId, setDragOverInvId] = useState<string | null>(null);

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
    <div className="rounded-xl border border-slate-300 shadow-sm bg-white overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-100 border-b border-slate-300 text-xs font-bold text-slate-700">
        <span className="flex items-center gap-1.5 text-slate-800">
          <Layers size={14} className="text-cyan-600" />
          <span>Rincian Item Pembayaran ({currentCust})</span>
          <span className="hidden sm:inline-block text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-normal">
            Drag ikon ⋮⋮ atau gunakan panah ↑↓ untuk pindah posisi baris
          </span>
        </span>
        <div className="w-60">
          <RupiahInput
            label="Deduction Backcharge"
            value={formData.otherDeduction || 0}
            onChange={(val) => setFormData((prev: any) => ({ ...prev, otherDeduction: val }))}
          />
        </div>
      </div>

      {currentCust === "SBS" ? (
        <InvoiceTableSBS
          invLineItems={invLineItems}
          setInvLineItems={setInvLineItems}
          updateInvItemVolume={updateInvItemVolume}
          updateInvItemRateIDR={updateInvItemRateIDR}
          updateInvItemAmount={updateInvItemAmount}
          removeInvLineItem={removeInvLineItem}
          moveInvRow={moveInvRow}
          handleUpdateInvItemField={handleUpdateInvItemField}
          draggedInvId={draggedInvId}
          setDraggedInvId={setDraggedInvId}
          dragOverInvId={dragOverInvId}
          setDragOverInvId={setDragOverInvId}
          handleReorderInvLineItems={handleReorderInvLineItems}
          cCalc={cCalc}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider">
                <th className="p-2.5 text-center w-24">AKSI</th>
                <th className="p-2.5">DESCRIPTION</th>
                <th className="p-2.5 text-center">CLAIMED VOLUME / DISTANCE</th>
                {currentCust === "PTRO" || currentCust === "DBK" ? (
                  <>
                    <th className="p-2.5 text-right">UNIT RATE (USD)</th>
                    <th className="p-2.5 text-right">KURS (USD to IDR)</th>
                  </>
                ) : (
                  <th className="p-2.5 text-right">UNIT RATE (IDR)</th>
                )}
                <th className="p-2.5 text-right font-extrabold">AMOUNT (IDR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {currentCust === "BGG" && (
                <InvoiceTableBGG
                  invLineItems={invLineItems}
                  updateInvItemVolume={updateInvItemVolume}
                  updateInvItemOverhaul={updateInvItemOverhaul}
                  updateInvItemRateIDR={updateInvItemRateIDR}
                  updateInvItemAmount={updateInvItemAmount}
                  removeInvLineItem={removeInvLineItem}
                  moveInvRow={moveInvRow}
                  handleUpdateInvItemField={handleUpdateInvItemField}
                  getRowDragProps={getRowDragProps}
                  cCalc={cCalc}
                />
              )}
              {(currentCust === "PTRO" || currentCust === "DBK") && (
                <InvoiceTablePTRO
                  invLineItems={invLineItems}
                  updateInvItemVolume={updateInvItemVolume}
                  updateInvItemOverhaul={updateInvItemOverhaul}
                  updateInvItemRateUSD={updateInvItemRateUSD}
                  updateInvItemKurs={updateInvItemKurs}
                  removeInvLineItem={removeInvLineItem}
                  moveInvRow={moveInvRow}
                  handleUpdateInvItemField={handleUpdateInvItemField}
                  getItemEffectiveVolume={getItemEffectiveVolume}
                  getItemEffectiveOverhaulMtr={getItemEffectiveOverhaulMtr}
                  calculateItemRateAndAmount={calculateItemRateAndAmount}
                  getRowDragProps={getRowDragProps}
                  cCalc={cCalc}
                />
              )}
              {currentCust === "POS" && (
                <InvoiceTablePOS
                  invLineItems={invLineItems}
                  formData={formData}
                  updateInvItemVolume={updateInvItemVolume}
                  updateInvItemOverhaul={updateInvItemOverhaul}
                  removeInvLineItem={removeInvLineItem}
                  moveInvRow={moveInvRow}
                  handleUpdateInvItemField={handleUpdateInvItemField}
                  calculateItemRateAndAmount={calculateItemRateAndAmount}
                  getRowDragProps={getRowDragProps}
                  cCalc={cCalc}
                />
              )}
            </tbody>
            <InvoiceTaxSummary currentCust={currentCust} cCalc={cCalc} />
          </table>
        </div>
      )}
    </div>
  );
}
