import React, { useState } from "react";
import { Layers, Plus, ChevronDown } from "lucide-react";
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
  onAddInvLineItem?: (section: string) => void;
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
  onAddInvLineItem,
}: InvoiceLineItemsEditorProps) {
  const currentCust = (formData.customerCode || "POS").toUpperCase();
  const cCalc = getCustomerCalculations(invLineItems, currentCust);

  const [draggedInvId, setDraggedInvId] = useState<string | null>(null);
  const [dragOverInvId, setDragOverInvId] = useState<string | null>(null);
  const [isAddRowDropdownOpen, setIsAddRowDropdownOpen] = useState(false);

  const getCustomerCategories = (cust: string) => {
    switch (cust) {
      case "BGG":
        return [
          { section: "A", label: "A. OB Removal (Pit Kungkilan)", desc: "Overburden (Bcm)" },
          { section: "B", label: "B. Coal Winning", desc: "Batubara (Ton)" },
          { section: "C", label: "C. Over Distance", desc: "Jarak angkut lebih (Mtr)" },
          { section: "D", label: "D. Raise & Fall's Factor", desc: "Eskalasi ICP / Fuel" },
          { section: "E", label: "E. Discount on Overdistance", desc: "Deduction 25%" },
          { section: "F", label: "F. DP Fuel & Transport", desc: "Potongan DP BBM" },
        ];
      case "PTRO":
      case "DBK":
        return [
          { section: "A", label: "A. OB Removal (Pit Sapan)", desc: "OB Mining (USD/Bcm)" },
          { section: "B", label: "B. Coal Winning (Pit Sapan)", desc: "Coal Mining (USD/Ton)" },
          { section: "C", label: "C. Over Distance", desc: "Overhaul OB (USD) & Coal (IDR)" },
        ];
      case "SBS":
        return [
          { section: "A", label: "A. OB Removal", desc: "Per Area Kerja (BCM)" },
          { section: "B", label: "B. Jasa Penunjang Produksi", desc: "Rental Alat Berat (Hours)" },
          { section: "P", label: "P. Pengurang Pembayaran", desc: "Denda & Pemakaian BBM" },
        ];
      case "POS":
      default:
        return [
          { section: "A", label: "A. Production / MDO", desc: "OB / Coal Removal (Bcm)" },
          { section: "B", label: "B. Over Distance", desc: "Overhaul Jarak Angkut" },
          { section: "C", label: "C. Land Clearing", desc: "Pembersihan Lahan (Ha)" },
          { section: "D", label: "D. Raise & Fall's Factor", desc: "Eskalasi / Penyesuaian Harga" },
        ];
    }
  };

  const handleAddRow = (section: string) => {
    setIsAddRowDropdownOpen(false);
    if (onAddInvLineItem) {
      onAddInvLineItem(section);
    }
  };

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
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsAddRowDropdownOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-cyan-700 hover:bg-cyan-800 rounded-lg shadow-sm transition cursor-pointer"
          >
            <Plus size={13} />
            <span>Tambah Baris</span>
            <ChevronDown size={13} className={`transition-transform duration-200 ${isAddRowDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {isAddRowDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsAddRowDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Pilih Kategori Baris</span>
                  <span className="text-[10px] font-mono font-bold text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded">{currentCust}</span>
                </div>
                <div className="max-h-64 overflow-y-auto py-1 divide-y divide-slate-50">
                  {getCustomerCategories(currentCust).map((cat) => (
                    <button
                      key={cat.section}
                      type="button"
                      onClick={() => handleAddRow(cat.section)}
                      className="w-full text-left px-3 py-2 hover:bg-cyan-50 flex flex-col gap-0.5 transition cursor-pointer group"
                    >
                      <span className="text-xs font-bold text-slate-800 group-hover:text-cyan-800 flex items-center justify-between">
                        <span>{cat.label}</span>
                        <span className="text-[10px] bg-slate-100 group-hover:bg-cyan-100 text-slate-600 group-hover:text-cyan-800 px-1.5 py-0.5 rounded font-mono font-bold">
                          Seksi {cat.section}
                        </span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-normal">{cat.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
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
