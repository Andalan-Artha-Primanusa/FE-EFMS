import React from "react";
import { formatIDR, formatThousand, FormattedNumberInput } from "../helpers";
import { ptroBaseMtr } from "../calculations";
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

const PIT = "PIT SAPAN";
const inputCls =
  "bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none";
const num = (v: number, d: number) => v.toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });
const isCoal = (item: any) => /coal|batubara/i.test(item.description || item.sowDescription || "");

// Format invoice Excel PTRO: A. OB Removal / B. Coal Winning / C. Over Distance (C1 OB, C2 Coal).
export function InvoiceTablePTRO({
  invLineItems,
  updateInvItemVolume,
  updateInvItemOverhaul,
  updateInvItemRateUSD,
  updateInvItemKurs,
  removeInvLineItem,
  moveInvRow,
  handleUpdateInvItemField,
  getItemEffectiveOverhaulMtr,
  calculateItemRateAndAmount,
  getRowDragProps,
  cCalc,
}: InvoiceTablePTROProps) {
  const actionCell = (item: any) => (
    <InvoiceActionCell
      itemId={item.id}
      onMoveUp={() => moveInvRow(item.id, "up")}
      onMoveDown={() => moveInvRow(item.id, "down")}
      onRemove={() => removeInvLineItem(item.id)}
    />
  );

  const kursCell = (item: any, isUSD = true) => (
    <td className="p-2 text-right">
      {isUSD ? (
        <FormattedNumberInput
          allowDecimals
          maxDecimals={2}
          className={`w-24 ${inputCls}`}
          placeholder="00.00"
          value={item.kursBI === 0 ? "" : (item.kursBI ?? "")}
          onChange={(val) => updateInvItemKurs(item.id, val)}
        />
      ) : (
        <span className="text-slate-400">-</span>
      )}
    </td>
  );

  const volumeInput = (item: any, unit: string) => (
    <div className="flex items-center justify-center gap-1">
      <FormattedNumberInput
        allowDecimals
        maxDecimals={3}
        className={`w-24 ${inputCls}`}
        placeholder="00.00"
        value={item.volume === 0 ? "" : (item.volume ?? "")}
        onChange={(val) => updateInvItemVolume(item.id, val)}
      />
      <span className="text-[11px] text-slate-600 font-bold">{item.unit || unit}</span>
    </div>
  );

  const totalVolume = (section: string) => invLineItems.filter((i) => i.section === section).reduce((s, i) => s + (i.volume || 0), 0);

  const sectionHeader = (title: string, total: number, volumeText = "") => (
    <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
      <td className="p-2 text-center text-slate-400">#</td>
      <td className="p-2 underline font-extrabold">{title}</td>
      <td className="p-2 text-center font-mono text-cyan-900">{volumeText}</td>
      <td className="p-2" />
      <td className="p-2" />
      <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(total)}</td>
    </tr>
  );

  const pitRow = (label: string) => (
    <tr>
      <td className="p-1" />
      <td colSpan={5} className="px-2 pt-2 pb-0 font-extrabold text-slate-900">{label}</td>
    </tr>
  );

  // A & B: volume x rate USD x kurs
  const renderMiningSection = (section: "A" | "B", title: string, unit: string, total: number) => (
    <>
      {sectionHeader(title, total, `${num(totalVolume(section), 3)} ${unit}`)}
      {pitRow(`${section}1. ${PIT}`)}
      {invLineItems.filter((i) => i.section === section).map((item) => (
        <tr key={item.id} {...getRowDragProps(item)}>
          {actionCell(item)}
          <InvoiceDescriptionCell item={item} onUpdateField={handleUpdateInvItemField} />
          <td className="p-2 text-center">{volumeInput(item, unit)}</td>
          <td className="p-2 text-right">
            <FormattedNumberInput
              allowDecimals
              maxDecimals={3}
              className={`w-20 ${inputCls}`}
              placeholder="00.00"
              value={item.unitRateUSD === 0 ? "" : (item.unitRateUSD ?? "")}
              onChange={(val) => updateInvItemRateUSD(item.id, val)}
            />
          </td>
          {kursCell(item)}
          <td className="p-2 text-right font-mono font-extrabold text-slate-900">
            {formatIDR(Math.round((item.volume || 0) * (item.unitRateUSD || 0) * (item.kursBI || 0)))}
          </td>
        </tr>
      ))}
    </>
  );

  // C: C1 OB (USD) & C2 Coal (IDR) — volume x (jarak - basis)/100 x rate
  const odItems = invLineItems.filter((i) => i.section === "C").sort((a, b) => Number(isCoal(a)) - Number(isCoal(b)));

  return (
    <>
      {renderMiningSection("A", "A. OB REMOVAL", "BCM", cCalc.subtotalA)}
      {renderMiningSection("B", "B. COAL WINNING", "Ton", cCalc.subtotalB)}

      {sectionHeader("C. OVER DISTANCE", cCalc.subtotalC)}
      {odItems.map((item) => {
        const coal = isCoal(item);
        const mtr = getItemEffectiveOverhaulMtr(item);
        const baseMtr = ptroBaseMtr(item);
        const diff = mtr - baseMtr;
        const eqVolume = ((item.volume || 0) * Math.max(0, diff)) / 100;
        const { amount } = calculateItemRateAndAmount(item, "PTRO");
        const isUSD = item.unitRateUSD > 0;
        const title = item.subSection || (coal ? "C2. Over Distance For Coal Winning" : "C1. Over Distance For OB Removal");

        return (
          <tr key={item.id} {...getRowDragProps(item)}>
            {actionCell(item)}
            <td className="p-2 text-slate-800">
              <div className="font-extrabold text-slate-900">{title}</div>
              <div className="font-extrabold pl-4 mt-0.5">{PIT}</div>
              <div className="flex items-center gap-1.5 mt-1 pl-4">
                <FormattedNumberInput
                  allowDecimals
                  maxDecimals={3}
                  className={`w-24 ${inputCls}`}
                  placeholder="00.00"
                  value={item.overhaulMtr === 0 ? "" : (item.overhaulMtr ?? "")}
                  onChange={(val) => updateInvItemOverhaul(item.id, val)}
                />
                <span className="text-[11px] text-slate-600 font-bold font-mono">
                  mtr - {formatThousand(baseMtr)} mtr = {diff < 0 ? `(${num(-diff, 2)})` : num(diff, 2)} mtr
                </span>
              </div>
            </td>
            <td className="p-2 text-center">
              {volumeInput(item, coal ? "Ton" : "BCM")}
              {eqVolume > 0 && <div className="mt-1 text-[11px] font-mono font-bold text-slate-500">= {num(eqVolume, 3)}</div>}
            </td>
            <td className="p-2 text-right font-mono text-xs font-bold text-slate-700">
              {isUSD
                ? `$${formatThousand(item.unitRateUSD, 3)}`
                : `Rp ${num(Number(item.unitRateIDR ?? item.rate ?? 0), 2)}`}
            </td>
            {kursCell(item, isUSD)}
            <td className="p-2 text-right font-mono font-extrabold text-slate-900">{amount ? formatIDR(amount) : "-"}</td>
          </tr>
        );
      })}
    </>
  );
}
