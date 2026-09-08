import React from "react";
import { formatIDR, formatThousand, FormattedNumberInput } from "../helpers";
import { InvoiceActionCell } from "./InvoiceRowActions";

interface InvoiceTablePOSProps {
  invLineItems: any[];
  formData: any;
  updateInvItemVolume: (id: string, val: any) => void;
  updateInvItemOverhaul: (id: string, val: any) => void;
  removeInvLineItem: (id: string) => void;
  moveInvRow: (id: string, dir: "up" | "down") => void;
  handleUpdateInvItemField: (id: string, field: string, val: any) => void;
  calculateItemRateAndAmount: (item: any, cust: string) => any;
  getRowDragProps: (item: any) => any;
  cCalc: any;
}

export function InvoiceTablePOS({
  invLineItems,
  formData,
  updateInvItemVolume,
  updateInvItemOverhaul,
  removeInvLineItem,
  moveInvRow,
  handleUpdateInvItemField,
  calculateItemRateAndAmount,
  getRowDragProps,
  cCalc,
}: InvoiceTablePOSProps) {
  const isMDO = formData.customerCode === "POS" && (formData.invoiceCategory === "MDO" || formData.activityGroup?.includes("MDO"));

  return (
    <>
      {/* SECTION A. PRODUCTION / MDO */}
      {invLineItems.filter((i) => i.section === "A").length > 0 && (
        <>
          <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
            <td className="p-2 text-center text-slate-400">#</td>
            <td className="p-2 underline font-extrabold">
              {isMDO ? "A. MINE DEVELOPMENT (MDO)" : "A. PRODUCTION"}
            </td>
            <td className="p-2 text-center font-mono text-cyan-900">
              {isMDO
                ? ""
                : `${invLineItems.filter((i) => i.section === "A").reduce((sum, i) => sum + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} Bcm`
              }
            </td>
            <td className="p-2 text-right"></td>
            <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalA)}</td>
          </tr>
          {invLineItems.filter((i) => i.section === "A").map((item, idx) => {
            const { unitRate, amount } = calculateItemRateAndAmount(item, "POS");
            const cleanDesc = (item.description || "").replace(/^[A-Z][0-9]*[\.\s\-]+\s*/i, "").trim();
            return (
              <tr key={item.id} {...getRowDragProps(item)}>
                <InvoiceActionCell
                  itemId={item.id}
                  onMoveUp={() => moveInvRow(item.id, "up")}
                  onMoveDown={() => moveInvRow(item.id, "down")}
                  onRemove={() => removeInvLineItem(item.id)}
                />
                <td className="p-2 font-bold text-slate-800">
                  {item.isCustom ? (
                    <input
                      type="text"
                      className="w-full bg-cyan-50/50 border border-cyan-300 rounded px-2 py-0.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-cyan-600 outline-none"
                      value={item.description}
                      placeholder="Deskripsi produksi kustom..."
                      onChange={(e) => handleUpdateInvItemField(item.id, "description", e.target.value)}
                    />
                  ) : (
                    <>
                      <span className="text-cyan-900 font-mono mr-1.5 font-black">{`A${idx + 1}.`}</span>
                      <span>{cleanDesc}</span>
                    </>
                  )}
                </td>
                <td className="p-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <FormattedNumberInput
                      allowDecimals
                      maxDecimals={3}
                      className="w-28 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                      placeholder="00.00"
                      value={item.volume === 0 ? "" : (item.volume ?? "")}
                      onChange={(val) => updateInvItemVolume(item.id, val)}
                    />
                    <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Bcm"}</span>
                  </div>
                </td>
                <td className="p-2 text-right font-mono text-slate-700">{formatIDR(unitRate)}</td>
                <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
              </tr>
            );
          })}
        </>
      )}

      {/* SECTION B. OVER DISTANCE */}
      {invLineItems.filter((i) => i.section === "B").length > 0 && (
        <>
          <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
            <td className="p-2 text-center text-slate-400">#</td>
            <td className="p-2 underline font-extrabold">B. OVER DISTANCE</td>
            <td className="p-2 text-center"></td>
            <td className="p-2 text-right"></td>
            <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalB)}</td>
          </tr>
          {invLineItems.filter((i) => i.section === "B").map((item, idx) => {
            const effMtr = item.overhaulMtr ?? 1000;
            const { unitRate, amount } = calculateItemRateAndAmount(item, "POS");
            const diffMtr = effMtr - 1000;
            const cleanDesc = (item.description || "").replace(/^[A-Z][0-9]*[\.\s\-]+\s*/i, "").trim();

            return (
              <tr key={item.id} {...getRowDragProps(item)}>
                <InvoiceActionCell
                  itemId={item.id}
                  onMoveUp={() => moveInvRow(item.id, "up")}
                  onMoveDown={() => moveInvRow(item.id, "down")}
                  onRemove={() => removeInvLineItem(item.id)}
                />
                <td className="p-2 font-bold text-slate-800">
                  {item.isCustom ? (
                    <div className="mb-1">
                      <input
                        type="text"
                        className="w-full bg-cyan-50/50 border border-cyan-300 rounded px-2 py-0.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-cyan-600 outline-none"
                        value={item.description}
                        placeholder="Deskripsi overhaul kustom..."
                        onChange={(e) => handleUpdateInvItemField(item.id, "description", e.target.value)}
                      />
                    </div>
                  ) : (
                    <div>
                      <span className="text-cyan-900 font-mono mr-1.5 font-black">{`B${idx + 1}.`}</span>
                      <span>{cleanDesc}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 mt-1">
                    <FormattedNumberInput
                      allowDecimals
                      maxDecimals={3}
                      className="w-20 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                      placeholder="00.00"
                      value={item.overhaulMtr === 0 ? "" : (item.overhaulMtr ?? "")}
                      onChange={(val) => updateInvItemOverhaul(item.id, val)}
                    />
                    <span className="text-[11px] text-slate-600 font-bold">
                      mtr - 1.000 mtr = ({diffMtr > 0 ? `+${formatThousand(diffMtr)}` : formatThousand(diffMtr)}) mtr
                    </span>
                  </div>
                </td>
                <td className="p-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <FormattedNumberInput
                      allowDecimals
                      maxDecimals={3}
                      className="w-28 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                      placeholder="00.00"
                      value={item.volume === 0 ? "" : (item.volume ?? "")}
                      onChange={(val) => updateInvItemVolume(item.id, val)}
                    />
                    <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Bcm"}</span>
                  </div>
                </td>
                <td className="p-2 text-right font-mono text-slate-700">{formatIDR(unitRate)}</td>
                <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
              </tr>
            );
          })}
        </>
      )}

      {/* SECTION C. LAND CLEARING */}
      {invLineItems.filter((i) => i.section === "C").length > 0 && (
        <>
          <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
            <td className="p-2 text-center text-slate-400">#</td>
            <td className="p-2 underline font-extrabold">C. LAND CLEARING</td>
            <td className="p-2 text-center"></td>
            <td className="p-2 text-right"></td>
            <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalC)}</td>
          </tr>
          {invLineItems.filter((i) => i.section === "C").map((item, idx) => {
            const { unitRate, amount } = calculateItemRateAndAmount(item, "POS");
            const cleanDesc = (item.description || "").replace(/^[A-Z][0-9]*[\.\s\-]+\s*/i, "").trim();
            return (
              <tr key={item.id} {...getRowDragProps(item)}>
                <InvoiceActionCell
                  itemId={item.id}
                  onMoveUp={() => moveInvRow(item.id, "up")}
                  onMoveDown={() => moveInvRow(item.id, "down")}
                  onRemove={() => removeInvLineItem(item.id)}
                />
                <td className="p-2 font-bold text-slate-800">
                  {item.isCustom ? (
                    <input
                      type="text"
                      className="w-full bg-cyan-50/50 border border-cyan-300 rounded px-2 py-0.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-cyan-600 outline-none"
                      value={item.description}
                      placeholder="Deskripsi land clearing kustom..."
                      onChange={(e) => handleUpdateInvItemField(item.id, "description", e.target.value)}
                    />
                  ) : (
                    <>
                      <span className="text-cyan-900 font-mono mr-1.5 font-black">{`C${idx + 1}.`}</span>
                      <span>{cleanDesc}</span>
                    </>
                  )}
                </td>
                <td className="p-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <FormattedNumberInput
                      allowDecimals
                      maxDecimals={3}
                      className="w-28 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                      placeholder="00.00"
                      value={item.volume === 0 ? "" : (item.volume ?? "")}
                      onChange={(val) => updateInvItemVolume(item.id, val)}
                    />
                    <span className="text-[11px] text-slate-600 font-bold">{item.unit || "m2"}</span>
                  </div>
                </td>
                <td className="p-2 text-right font-mono text-slate-700">{formatIDR(unitRate)}</td>
                <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
              </tr>
            );
          })}
        </>
      )}

      {/* SECTION D. RAISE & FALL'S FACTOR */}
      {invLineItems.filter((i) => i.section === "D").length > 0 && (
        <>
          <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
            <td className="p-2 text-center text-slate-400">#</td>
            <td className="p-2 underline font-extrabold">D. RAISE & FALL'S FACTOR</td>
            <td className="p-2 text-center"></td>
            <td className="p-2 text-right"></td>
            <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalD)}</td>
          </tr>
          {invLineItems.filter((i) => i.section === "D").map((item, idx) => {
            const { unitRate, amount } = calculateItemRateAndAmount(item, "POS");
            const cleanDesc = (item.description || "").replace(/^[A-Z][0-9]*[\.\s\-]+\s*/i, "").trim();
            return (
              <tr key={item.id} {...getRowDragProps(item)}>
                <InvoiceActionCell
                  itemId={item.id}
                  onMoveUp={() => moveInvRow(item.id, "up")}
                  onMoveDown={() => moveInvRow(item.id, "down")}
                  onRemove={() => removeInvLineItem(item.id)}
                />
                <td className="p-2 font-bold text-slate-800">
                  {item.isCustom ? (
                    <input
                      type="text"
                      className="w-full bg-cyan-50/50 border border-cyan-300 rounded px-2 py-0.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-cyan-600 outline-none"
                      value={item.description}
                      placeholder="Deskripsi penyesuaian..."
                      onChange={(e) => handleUpdateInvItemField(item.id, "description", e.target.value)}
                    />
                  ) : (
                    <>
                      <span className="text-cyan-900 font-mono mr-1.5 font-black">{`D${idx + 1}.`}</span>
                      <span>{cleanDesc}</span>
                    </>
                  )}
                </td>
                <td className="p-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <FormattedNumberInput
                      allowDecimals
                      maxDecimals={3}
                      className="w-28 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                      placeholder="00.00"
                      value={item.volume === 0 ? "" : (item.volume ?? "")}
                      onChange={(val) => updateInvItemVolume(item.id, val)}
                    />
                    <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Bcm"}</span>
                  </div>
                </td>
                <td className="p-2 text-right font-mono text-slate-700">{formatIDR(unitRate)}</td>
                <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
              </tr>
            );
          })}
        </>
      )}
    </>
  );
}
