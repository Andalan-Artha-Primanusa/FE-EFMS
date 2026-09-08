import React from "react";
import { formatIDR, formatThousand, FormattedNumberInput } from "../helpers";
import { InvoiceActionCell, InvoiceDescriptionCell } from "./InvoiceRowActions";

interface InvoiceTablePTROProps {
  invLineItems: any[];
  updateInvItemVolume: (id: string, val: any) => void;
  updateInvItemOverhaul: (id: string, val: any) => void;
  updateInvItemRateUSD: (id: string, val: any) => void;
  updateInvItemKurs: (id: string, val: any) => void;
  removeInvLineItem: (id: string) => void;
  moveInvRow: (id: string, dir: "up" | "down") => void;
  handleUpdateInvItemField: (id: string, field: string, val: any) => void;
  getItemEffectiveVolume: (item: any) => number;
  getItemEffectiveOverhaulMtr: (item: any) => number;
  calculateItemRateAndAmount: (item: any, cust: string) => any;
  getRowDragProps: (item: any) => any;
  cCalc: any;
}

export function InvoiceTablePTRO({
  invLineItems,
  updateInvItemVolume,
  updateInvItemOverhaul,
  updateInvItemRateUSD,
  updateInvItemKurs,
  removeInvLineItem,
  moveInvRow,
  handleUpdateInvItemField,
  getItemEffectiveVolume,
  getItemEffectiveOverhaulMtr,
  calculateItemRateAndAmount,
  getRowDragProps,
  cCalc,
}: InvoiceTablePTROProps) {
  return (
    <>
      {/* Section A: OB Removal */}
      <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
        <td className="p-2 text-center text-slate-400">#</td>
        <td className="p-2 underline font-extrabold">A. OB REMOVAL (Pit Sapan)</td>
        <td className="p-2 text-center font-mono text-cyan-900">
          {invLineItems.filter((i) => i.section === "A").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} BCM
        </td>
        <td className="p-2 text-right"></td>
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
              <span className="text-[11px] text-slate-600 font-bold">{item.unit || "BCM"}</span>
            </div>
          </td>
          <td className="p-2 text-right">
            <FormattedNumberInput
              allowDecimals
              maxDecimals={3}
              className="w-20 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
              placeholder="00.00"
              value={item.unitRateUSD === 0 ? "" : (item.unitRateUSD ?? "")}
              onChange={(val) => updateInvItemRateUSD(item.id, val)}
            />
          </td>
          <td className="p-2 text-right">
            <FormattedNumberInput
              allowDecimals
              maxDecimals={2}
              className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
              placeholder="00.00"
              value={item.kursBI === 0 ? "" : (item.kursBI ?? "")}
              onChange={(val) => updateInvItemKurs(item.id, val)}
            />
          </td>
          <td className="p-2 text-right font-mono font-extrabold text-slate-900">
            {formatIDR(Math.round((item.volume || 0) * (item.unitRateUSD || 0) * (item.kursBI || 17923.30)))}
          </td>
        </tr>
      ))}

      {/* Section B: Coal Winning */}
      <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
        <td className="p-2 text-center text-slate-400">#</td>
        <td className="p-2 underline font-extrabold">B. COAL WINNING (Pit Sapan)</td>
        <td className="p-2 text-center font-mono text-cyan-900">
          {invLineItems.filter((i) => i.section === "B").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} Ton
        </td>
        <td className="p-2 text-right"></td>
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
              allowDecimals
              maxDecimals={3}
              className="w-20 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
              placeholder="00.00"
              value={item.unitRateUSD === 0 ? "" : (item.unitRateUSD ?? "")}
              onChange={(val) => updateInvItemRateUSD(item.id, val)}
            />
          </td>
          <td className="p-2 text-right">
            <FormattedNumberInput
              allowDecimals
              maxDecimals={2}
              className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
              placeholder="00.00"
              value={item.kursBI === 0 ? "" : (item.kursBI ?? "")}
              onChange={(val) => updateInvItemKurs(item.id, val)}
            />
          </td>
          <td className="p-2 text-right font-mono font-extrabold text-slate-900">
            {formatIDR(Math.round((item.volume || 0) * (item.unitRateUSD || 0) * (item.kursBI || 17923.30)))}
          </td>
        </tr>
      ))}

      {/* Section C: Over Distance */}
      <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
        <td className="p-2 text-center text-slate-400">#</td>
        <td className="p-2 underline font-extrabold">C. OVER DISTANCE</td>
        <td className="p-2 text-center"></td>
        <td className="p-2 text-right"></td>
        <td className="p-2 text-right"></td>
        <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalC)}</td>
      </tr>
      {invLineItems.filter((i) => i.section === "C").map((item) => {
        const effMtr = getItemEffectiveOverhaulMtr ? getItemEffectiveOverhaulMtr(item) : (item.overhaulMtr || 0);
        const baseMtr = item.baseMtr || (item.unit === "Ton" ? 3000 : 1000);
        const diff = Math.max(0, effMtr - baseMtr);
        const calculated = calculateItemRateAndAmount ? calculateItemRateAndAmount(item, "PTRO") : { unitRate: 0, amount: 0 };

        return (
          <tr key={item.id} {...getRowDragProps(item)}>
            <InvoiceActionCell
              itemId={item.id}
              onMoveUp={() => moveInvRow(item.id, "up")}
              onMoveDown={() => moveInvRow(item.id, "down")}
              onRemove={() => removeInvLineItem(item.id)}
            />
            <td className="p-2 font-bold text-slate-800">
              <div>{item.description}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <FormattedNumberInput
                  className="w-20 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                  placeholder="00.00"
                  value={item.overhaulMtr === 0 ? "" : (item.overhaulMtr ?? "")}
                  onChange={(val) => updateInvItemOverhaul(item.id, val)}
                />
                <span className="text-[11px] text-slate-600 font-bold">
                  mtr - {formatThousand(baseMtr)} mtr = ({diff > 0 ? `+${formatThousand(diff)}` : 0}) mtr
                </span>
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
                <span className="text-[11px] text-slate-600 font-bold">{item.unit || "BCM"}</span>
              </div>
            </td>
            <td className="p-2 text-right">
              <span className="font-mono text-xs font-bold text-slate-700">
                {calculated.usdDisplay ? `$${calculated.usdDisplay}` : (item.rateUSD ? `$${item.rateUSD}` : "-")}
              </span>
            </td>
            <td className="p-2 text-right">
              <FormattedNumberInput
                allowDecimals
                maxDecimals={2}
                className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                placeholder="00.00"
                value={item.kursBI === 0 ? "" : (item.kursBI ?? "")}
                onChange={(val) => updateInvItemKurs(item.id, val)}
              />
            </td>
            <td className="p-2 text-right font-mono font-extrabold text-slate-900">
              {formatIDR(calculated.amount || 0)}
            </td>
          </tr>
        );
      })}
    </>
  );
}
