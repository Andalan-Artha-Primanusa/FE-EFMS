import React from "react";
import { formatIDR, FormattedNumberInput } from "../helpers";
import { InvoiceActionCell, InvoiceDescriptionCell } from "./InvoiceRowActions";

interface InvoiceTableBGGProps {
  invLineItems: any[];
  updateInvItemVolume: (id: string, val: any) => void;
  updateInvItemOverhaul: (id: string, val: any) => void;
  updateInvItemRateIDR: (id: string, val: any) => void;
  updateInvItemAmount: (id: string, val: any) => void;
  removeInvLineItem: (id: string) => void;
  moveInvRow: (id: string, dir: "up" | "down") => void;
  handleUpdateInvItemField: (id: string, field: string, val: any) => void;
  getRowDragProps: (item: any) => any;
  cCalc: any;
}

export function InvoiceTableBGG({
  invLineItems,
  updateInvItemVolume,
  updateInvItemOverhaul,
  updateInvItemRateIDR,
  updateInvItemAmount,
  removeInvLineItem,
  moveInvRow,
  handleUpdateInvItemField,
  getRowDragProps,
  cCalc,
}: InvoiceTableBGGProps) {
  return (
    <>
      {/* Section A: OB Removal */}
      <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
        <td className="p-2 text-center text-slate-400">#</td>
        <td className="p-2 underline font-extrabold">A. OB REMOVAL (Pit Kungkilan)</td>
        <td className="p-2 text-center font-mono text-cyan-900">
          {invLineItems.filter((i) => i.section === "A").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} Bcm
        </td>
        <td className="p-2 text-right"></td>
        <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalA)}</td>
      </tr>
      {invLineItems.filter((i) => i.section === "A").map((item) => (
        <tr key={item.id} {...getRowDragProps(item)}>
          <InvoiceActionCell
            itemId={item.id}
            onMoveUp={() => moveInvRow(item.id, "up")}
            onMoveDown={() => moveInvRow(item.id, "down")}
            onRemove={() => removeInvLineItem(item.id)}
          />
          <InvoiceDescriptionCell item={item} onUpdateField={handleUpdateInvItemField} />
          <td className="p-2 text-center">
            <div className="flex items-center justify-center gap-1">
              <FormattedNumberInput
                allowDecimals
                maxDecimals={3}
                className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                placeholder="00.00"
                value={item.volume === 0 ? "" : (item.volume ?? "")}
                onChange={(val) => updateInvItemVolume(item.id, val)}
              />
              <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Bcm"}</span>
            </div>
          </td>
          <td className="p-2 text-right">
            <FormattedNumberInput
              className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
              placeholder="00.00"
              value={item.unitRateIDR === 0 ? "" : (item.unitRateIDR ?? "")}
              onChange={(val) => updateInvItemRateIDR(item.id, val)}
            />
          </td>
          <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(Math.round((item.volume || 0) * (item.unitRateIDR || 0)))}</td>
        </tr>
      ))}

      {/* Section B: Coal Winning */}
      <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
        <td className="p-2 text-center text-slate-400">#</td>
        <td className="p-2 underline font-extrabold">B. COAL WINNING (Pit Kungkilan)</td>
        <td className="p-2 text-center font-mono text-cyan-900">
          {invLineItems.filter((i) => i.section === "B").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} Ton
        </td>
        <td className="p-2 text-right"></td>
        <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalB)}</td>
      </tr>
      {invLineItems.filter((i) => i.section === "B").map((item) => (
        <tr key={item.id} {...getRowDragProps(item)}>
          <InvoiceActionCell
            itemId={item.id}
            onMoveUp={() => moveInvRow(item.id, "up")}
            onMoveDown={() => moveInvRow(item.id, "down")}
            onRemove={() => removeInvLineItem(item.id)}
          />
          <InvoiceDescriptionCell item={item} onUpdateField={handleUpdateInvItemField} />
          <td className="p-2 text-center">
            <div className="flex items-center justify-center gap-1">
              <FormattedNumberInput
                allowDecimals
                maxDecimals={3}
                className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                placeholder="00.00"
                value={item.volume === 0 ? "" : (item.volume ?? "")}
                onChange={(val) => updateInvItemVolume(item.id, val)}
              />
              <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Ton"}</span>
            </div>
          </td>
          <td className="p-2 text-right">
            <FormattedNumberInput
              className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
              placeholder="00.00"
              value={item.unitRateIDR === 0 ? "" : (item.unitRateIDR ?? "")}
              onChange={(val) => updateInvItemRateIDR(item.id, val)}
            />
          </td>
          <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(Math.round((item.volume || 0) * (item.unitRateIDR || 0)))}</td>
        </tr>
      ))}

      {/* Section C: Over Distance */}
      <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
        <td className="p-2 text-center text-slate-400">#</td>
        <td className="p-2 underline font-extrabold">C. OVER DISTANCE</td>
        <td className="p-2 text-center"></td>
        <td className="p-2 text-right"></td>
        <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalC)}</td>
      </tr>
      {invLineItems.filter((i) => i.section === "C").map((item) => (
        <tr key={item.id} {...getRowDragProps(item)}>
          <InvoiceActionCell
            itemId={item.id}
            onMoveUp={() => moveInvRow(item.id, "up")}
            onMoveDown={() => moveInvRow(item.id, "down")}
            onRemove={() => removeInvLineItem(item.id)}
          />
          <td className="p-2 font-bold text-slate-800">
            <div>{item.description}</div>
            {item.notes && (
              <div className="text-[10px] text-[#A57C50] font-mono font-bold mt-0.5">
                {item.notes}
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-1">
              <FormattedNumberInput
                className="w-20 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-[#A57C50] outline-none"
                placeholder="00.00"
                value={item.overhaulMtr === 0 ? "" : (item.overhaulMtr ?? "")}
                onChange={(val) => updateInvItemOverhaul(item.id, val)}
              />
              <span className="text-[11px] text-slate-600 font-bold">Mtr Jarak Riil</span>
            </div>
          </td>
          <td className="p-2 text-center">
            <div className="flex items-center justify-center gap-1">
              <FormattedNumberInput
                allowDecimals
                maxDecimals={3}
                className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                placeholder="00.00"
                value={item.volume === 0 ? "" : (item.volume ?? "")}
                onChange={(val) => updateInvItemVolume(item.id, val)}
              />
              <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Bcm"}</span>
            </div>
          </td>
          <td className="p-2 text-right">
            <FormattedNumberInput
              className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
              placeholder="00.00"
              value={item.unitRateIDR === 0 ? "" : (item.unitRateIDR ?? "")}
              onChange={(val) => updateInvItemRateIDR(item.id, val)}
            />
          </td>
          <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(Math.round((item.volume || 0) * (item.unitRateIDR || 0)))}</td>
        </tr>
      ))}

      {/* Section D: Raise & Fall */}
      <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
        <td className="p-2 text-center text-slate-400">#</td>
        <td className="p-2 underline font-extrabold">D. RAISE & FALL'S FACTOR</td>
        <td className="p-2 text-center"></td>
        <td className="p-2 text-right"></td>
        <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalD)}</td>
      </tr>
      {invLineItems.filter((i) => i.section === "D").map((item) => (
        <tr key={item.id} {...getRowDragProps(item)}>
          <InvoiceActionCell
            itemId={item.id}
            onMoveUp={() => moveInvRow(item.id, "up")}
            onMoveDown={() => moveInvRow(item.id, "down")}
            onRemove={() => removeInvLineItem(item.id)}
          />
          <InvoiceDescriptionCell item={item} onUpdateField={handleUpdateInvItemField} />
          <td className="p-2 text-center">
            <div className="flex items-center justify-center gap-1">
              <FormattedNumberInput
                allowDecimals
                maxDecimals={3}
                className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                placeholder="00.00"
                value={item.volume === 0 ? "" : (item.volume ?? "")}
                onChange={(val) => updateInvItemVolume(item.id, val)}
              />
              <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Bcm"}</span>
            </div>
          </td>
          <td className="p-2 text-right">
            <FormattedNumberInput
              className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
              placeholder="00.00"
              value={item.unitRateIDR === 0 ? "" : (item.unitRateIDR ?? "")}
              onChange={(val) => updateInvItemRateIDR(item.id, val)}
            />
          </td>
          <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(Math.round((item.volume || 0) * (item.unitRateIDR || 0)))}</td>
        </tr>
      ))}

      {/* Section E: Discount Over Distance */}
      <tr className="bg-rose-50 font-extrabold text-rose-900 border-t-2 border-rose-300">
        <td className="p-2 text-center text-rose-400">#</td>
        <td colSpan={3} className="p-2 underline font-extrabold">E. DISCOUNT ON OVERDISTANCE (Deduction 25%)</td>
        <td className="p-2 text-right font-mono text-rose-900 font-extrabold">({formatIDR(Math.abs(cCalc.subtotalE))})</td>
      </tr>
      {invLineItems.filter((i) => i.section === "E").map((item) => (
        <tr key={item.id} {...getRowDragProps(item)}>
          <InvoiceActionCell
            itemId={item.id}
            onMoveUp={() => moveInvRow(item.id, "up")}
            onMoveDown={() => moveInvRow(item.id, "down")}
            onRemove={() => removeInvLineItem(item.id)}
          />
          <td colSpan={3} className="p-2 font-medium text-slate-700">{item.description}</td>
          <td className="p-2 text-right font-mono">
            <FormattedNumberInput
              className="w-36 bg-slate-50 border border-rose-300 font-mono font-extrabold text-rose-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white outline-none"
              placeholder="00.00"
              value={item.amount === 0 ? "" : Math.abs(item.amount)}
              onChange={(val) => updateInvItemAmount(item.id, -Math.abs(val))}
            />
          </td>
        </tr>
      ))}

      {/* Section F: DP Fuel & Transport */}
      <tr className="bg-rose-50 font-extrabold text-rose-900 border-t-2 border-rose-300">
        <td className="p-2 text-center text-rose-400">#</td>
        <td colSpan={3} className="p-2 underline font-extrabold">F. DP FUEL & TRANSPORT (Deduction)</td>
        <td className="p-2 text-right font-mono text-rose-900 font-extrabold">({formatIDR(Math.abs(cCalc.subtotalF))})</td>
      </tr>
      {invLineItems.filter((i) => i.section === "F").map((item) => (
        <tr key={item.id} {...getRowDragProps(item)}>
          <InvoiceActionCell
            itemId={item.id}
            onMoveUp={() => moveInvRow(item.id, "up")}
            onMoveDown={() => moveInvRow(item.id, "down")}
            onRemove={() => removeInvLineItem(item.id)}
          />
          <td colSpan={3} className="p-2 font-medium text-slate-700">{item.description}</td>
          <td className="p-2 text-right font-mono">
            <FormattedNumberInput
              className="w-36 bg-slate-50 border border-rose-300 font-mono font-extrabold text-rose-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white outline-none"
              placeholder="00.00"
              value={item.amount === 0 ? "" : Math.abs(item.amount)}
              onChange={(val) => updateInvItemAmount(item.id, -Math.abs(val))}
            />
          </td>
        </tr>
      ))}
    </>
  );
}
