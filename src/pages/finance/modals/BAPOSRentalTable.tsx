import React from "react";
import { ArrowRight, Fuel, Plus, Trash2, Truck } from "lucide-react";
import { formatIDR, FormattedNumberInput } from "../helpers";
import { calcIDR, calcItemsAmount } from "../ba_calculations";
import type { BACalc } from "../../../types";
import { masterRegistry, customerKind, isRentalAlatSOW } from "../masterRegistry";
import { BADeductionTable } from "./BADeductionTable";

interface BAPOSRentalTableProps {
  formData: any;
  setFormData: (data: any) => void;
  baOperatingItems: any[];
  setBaOperatingItems: React.Dispatch<React.SetStateAction<any[]>>;
  baDeductionItems: any[];
  setBaDeductionItems: React.Dispatch<React.SetStateAction<any[]>>;
  isInlineEditingBA: boolean;
  activeSOWCatalog: any[];
  setActiveBAStep: (step: number) => void;
  calc?: BACalc;
}

const FUEL = "_fuel";
const isFuelRow = (it: any) => String(it.id || "").endsWith(FUEL);
const num = (v: number, d = 2) => (v || 0).toLocaleString("id-ID", { maximumFractionDigits: d });
const cell = "w-full bg-white border border-slate-300 focus:border-[#A57C50] rounded-[3px] px-1.5 py-1 text-xs font-bold text-slate-900 outline-none";

// BA Rental POS (Daywork): baris sewa (A, Hrs) + pasangan BBM `<id>_fuel` (B, Ltr) + potongan (C).
export function BAPOSRentalTable({
  formData,
  setFormData,
  baOperatingItems,
  setBaOperatingItems,
  baDeductionItems,
  setBaDeductionItems,
  isInlineEditingBA,
  activeSOWCatalog,
  setActiveBAStep,
  calc,
}: BAPOSRentalTableProps) {
  const rental = formData.posData?.rental || { avgFuelPrice: 0, fuelLogs: [] };
  const logs: any[] = rental.fuelLogs || [];
  const sows = masterRegistry.sows.filter((s) => customerKind(s.customerCode || s.customer) === "POS" && isRentalAlatSOW(s));
  const sowOf = (material: string) => sows.find((s) => (s.itemName || s.name) === material);

  // Rata-rata tertimbang DO SKA (presisi penuh), sama dengan BE; tanpa DO pakai input manual.
  const avgOf = (r: any) => {
    const l = (r.fuelLogs || []).reduce((a: number, x: any) => a + Number(x.liters || 0), 0);
    return l > 0 ? (r.fuelLogs || []).reduce((a: number, x: any) => a + Number(x.liters || 0) * Number(x.pricePerLiter || 0), 0) / l : Number(r.avgFuelPrice || 0);
  };
  const avg = avgOf(rental);
  const setRental = (patch: any) => {
    const next = { ...rental, ...patch };
    next.avgFuelPrice = avgOf(next);
    setFormData({ ...formData, posData: { ...(formData.posData || {}), rental: next } });
    setBaOperatingItems((prev) => prev.map((it) => (isFuelRow(it) ? { ...it, rate: next.avgFuelPrice } : it)));
  };
  const setLog = (idx: number, patch: any) => setRental({ fuelLogs: logs.map((l, i) => (i === idx ? { ...l, ...patch } : l)) });

  const units = baOperatingItems.filter((it) => it.category === "Rental" && !isFuelRow(it));
  const fuelOf = (u: any) => baOperatingItems.find((it) => it.id === `${u.id}${FUEL}`);
  const ratioOf = (u: any) => {
    const r = Number(sowOf(u.material)?.fuelLtrPerHour || 0);
    const hrs = Number(u.initialVolume || 0);
    return r > 0 ? r : hrs > 0 ? Number(fuelOf(u)?.initialVolume || 0) / hrs : 0;
  };
  const fuelRow = (u: any, ratio: number) => {
    const ltr = Number(u.initialVolume || 0) * ratio;
    return { ...(fuelOf(u) || {}), id: `${u.id}${FUEL}`, category: "Rental", section: "B", area: u.area, material: u.material, unit: "Ltr", period: u.period, initialVolume: ltr, adjustedVolume: ltr, rate: avg };
  };
  const update = (u: any, patch: any) => {
    const next = { ...u, ...patch };
    if (patch.material !== undefined) next.rate = Number(sowOf(patch.material)?.rateIDR || 0);
    next.adjustedVolume = next.initialVolume;
    const fuel = fuelRow(next, Number(sowOf(next.material)?.fuelLtrPerHour || 0) || ratioOf(u));
    setBaOperatingItems((prev) => {
      const rows = prev.map((it) => (it.id === u.id ? next : it.id === fuel.id ? fuel : it));
      return rows.some((it) => it.id === fuel.id) ? rows : [...rows, fuel];
    });
  };
  const addUnit = () => {
    const u = { id: `rental_${Date.now()}`, category: "Rental", section: "A", area: "", material: "", unit: "Hrs", period: formData.workPeriod || "", notes: "", keterangan: "", initialVolume: 0, adjustedVolume: 0, rate: 0, subtotalInitial: 0, subtotalAdjusted: 0 };
    setBaOperatingItems((prev) => [...prev, u, fuelRow(u, 0)]);
  };
  const removeUnit = (u: any) => setBaOperatingItems((prev) => prev.filter((it) => it.id !== u.id && it.id !== `${u.id}${FUEL}`));

  const sub = (it: any) => calcItemsAmount(calc, it ? [it] : []);
  const totalA = calcItemsAmount(calc, units);
  const totalB = calcItemsAmount(calc, units.map(fuelOf).filter(Boolean));
  const totalC = calcItemsAmount(calc, baDeductionItems || []);
  const hrsTotal = units.reduce((a, u) => a + Number(u.initialVolume || 0), 0);
  const ltrTotal = units.reduce((a, u) => a + Number(fuelOf(u)?.initialVolume || 0), 0);
  const logsTotal = logs.reduce((a, l) => a + Number(l.liters || 0) * Number(l.pricePerLiter || 0), 0);

  const th = "p-2 text-[10px] font-extrabold uppercase tracking-wider";
  return (
    <div className="space-y-4">
      {/* Harga Solar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase text-[#1A1612] flex items-center gap-1.5">
            <Fuel size={14} className="text-[#A57C50]" /> Harga Solar
          </span>
          {isInlineEditingBA && (
            <button type="button" onClick={() => setRental({ fuelLogs: [...logs, { supplier: "SKA", liters: 0, pricePerLiter: 0 }] })} className="text-xs font-bold text-[#A57C50] bg-[#FBF6F0] hover:bg-amber-50 border border-[#E7D3BC] px-2.5 py-1 rounded-[3px] flex items-center gap-1 cursor-pointer">
              <Plus size={12} /> DO
            </button>
          )}
        </div>
        <div className="overflow-x-auto rounded-[4px] border border-slate-200 bg-white">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                {isInlineEditingBA && <th className={`${th} w-10`} />}
                <th className={th}>Supplier</th>
                <th className={`${th} text-right`}>Liter</th>
                <th className={`${th} text-right`}>Harga (Rp/Ltr)</th>
                <th className={`${th} text-right`}>Jumlah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((l, idx) => (
                <tr key={idx}>
                  {isInlineEditingBA && (
                    <td className="p-2 text-center">
                      <button type="button" onClick={() => setRental({ fuelLogs: logs.filter((_, i) => i !== idx) })} className="p-1 text-rose-500 hover:bg-rose-100 rounded-[3px] cursor-pointer"><Trash2 size={12} /></button>
                    </td>
                  )}
                  <td className="p-2">{isInlineEditingBA ? <input className={cell} value={l.supplier || ""} onChange={(e) => setLog(idx, { supplier: e.target.value })} /> : l.supplier}</td>
                  <td className="p-2 text-right font-mono">{isInlineEditingBA ? <FormattedNumberInput className={`${cell} text-right font-mono`} value={l.liters} onChange={(v) => setLog(idx, { liters: v })} /> : num(l.liters, 3)}</td>
                  <td className="p-2 text-right font-mono">{isInlineEditingBA ? <FormattedNumberInput className={`${cell} text-right font-mono`} value={l.pricePerLiter} onChange={(v) => setLog(idx, { pricePerLiter: v })} /> : num(l.pricePerLiter)}</td>
                  <td className="p-2 text-right font-mono font-bold">{formatIDR(Number(l.liters || 0) * Number(l.pricePerLiter || 0))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                {isInlineEditingBA && <td />}
                <td className="p-2 uppercase">Rata-rata</td>
                <td className="p-2 text-right font-mono">{num(logs.reduce((a, l) => a + Number(l.liters || 0), 0), 3)}</td>
                <td className="p-2 text-right font-mono">
                  {isInlineEditingBA && !logs.some((l) => Number(l.liters) > 0)
                    ? <FormattedNumberInput className={`${cell} text-right font-mono`} maxDecimals={6} value={rental.avgFuelPrice} onChange={(v) => setRental({ avgFuelPrice: v })} />
                    : num(avg, 6)}
                </td>
                <td className="p-2 text-right font-mono">{formatIDR(logsTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Unit Rental */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase text-[#1A1612] flex items-center gap-1.5">
            <Truck size={14} className="text-[#A57C50]" /> Rental Alat (Daywork)
          </span>
          {isInlineEditingBA && (
            <button type="button" onClick={addUnit} className="text-xs font-bold text-[#A57C50] bg-[#FBF6F0] hover:bg-amber-50 border border-[#E7D3BC] px-2.5 py-1 rounded-[3px] flex items-center gap-1 cursor-pointer">
              <Plus size={12} /> Unit
            </button>
          )}
        </div>
        <div className="overflow-x-auto rounded-[4px] border border-slate-200 bg-white">
          <table className="w-full min-w-[1000px] text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                {isInlineEditingBA && <th className={`${th} w-10`} />}
                <th className={`${th} w-32`}>No. Lambung</th>
                <th className={`${th} min-w-[220px]`}>Tipe Alat</th>
                <th className={`${th} text-right w-28`}>Jam</th>
                <th className={`${th} text-right`}>Tarif/Jam</th>
                <th className={`${th} text-right`}>Subtotal Sewa</th>
                <th className={`${th} text-right`}>Ltr/Jam</th>
                <th className={`${th} text-right`}>Liter</th>
                <th className={`${th} text-right`}>Subtotal BBM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {units.map((u) => {
                const fuel = fuelOf(u);
                return (
                  <tr key={u.id} className="hover:bg-slate-50">
                    {isInlineEditingBA && (
                      <td className="p-2 text-center">
                        <button type="button" onClick={() => removeUnit(u)} className="p-1 text-rose-500 hover:bg-rose-100 rounded-[3px] cursor-pointer"><Trash2 size={12} /></button>
                      </td>
                    )}
                    <td className="p-2">{isInlineEditingBA ? <input className={cell} placeholder="AE-2009" value={u.area || ""} onChange={(e) => update(u, { area: e.target.value })} /> : <span className="font-bold">{u.area}</span>}</td>
                    <td className="p-2">
                      {isInlineEditingBA ? (
                        <select className={`${cell} cursor-pointer`} value={u.material || ""} onChange={(e) => update(u, { material: e.target.value })}>
                          <option value="" disabled>-- Pilih --</option>
                          {sows.map((s) => <option key={s.id ?? s.itemName} value={s.itemName || s.name}>{s.itemName || s.name}</option>)}
                          {u.material && !sowOf(u.material) && <option value={u.material}>{u.material}</option>}
                        </select>
                      ) : u.material}
                    </td>
                    <td className="p-2 text-right font-mono">{isInlineEditingBA ? <FormattedNumberInput className={`${cell} text-right font-mono`} value={u.initialVolume} onChange={(v) => update(u, { initialVolume: v })} /> : num(u.initialVolume)}</td>
                    <td className="p-2 text-right font-mono">{formatIDR(u.rate)}</td>
                    <td className="p-2 text-right font-mono font-bold">{calcIDR(sub(u))}</td>
                    <td className="p-2 text-right font-mono">{num(ratioOf(u))}</td>
                    <td className="p-2 text-right font-mono">{num(fuel?.initialVolume, 3)}</td>
                    <td className="p-2 text-right font-mono font-bold">{calcIDR(sub(fuel))}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                {isInlineEditingBA && <td />}
                <td className="p-2 uppercase" colSpan={2}>Total</td>
                <td className="p-2 text-right font-mono">{num(hrsTotal)} Hrs</td>
                <td />
                <td className="p-2 text-right font-mono">{calcIDR(totalA)}</td>
                <td />
                <td className="p-2 text-right font-mono">{num(ltrTotal, 3)} Ltr</td>
                <td className="p-2 text-right font-mono">{calcIDR(totalB)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <BADeductionTable
        formData={formData}
        baDeductionItems={baDeductionItems}
        setBaDeductionItems={setBaDeductionItems}
        isInlineEditingBA={isInlineEditingBA}
        activeSOWCatalog={activeSOWCatalog}
        calc={calc}
      />

      {/* Rekap */}
      <div className="overflow-x-auto rounded-[4px] border border-slate-200 bg-white">
        <table className="w-full text-xs font-mono border-collapse">
          <tbody className="divide-y divide-slate-200">
            {([
              ["A. Sewa", totalA],
              ["B. BBM", totalB],
              ["C. Potongan", totalC],
              ["Total", calc?.total.gross],
              ["DPP PPN 11/12", calc?.total.dpp11_12],
              ["VAT (12%)", calc?.total.vat12],
              ["PPh 23 (2%)", calc && -calc.total.pph23],
            ] as [string, number | undefined][]).map(([label, v]) => (
              <tr key={label}>
                <td className="p-2 font-bold uppercase text-slate-700 tracking-wider">{label}</td>
                <td className="p-2 text-right font-bold text-slate-900 w-44 sm:w-56">{v !== undefined && v < 0 ? `(${formatIDR(-v)})` : calcIDR(v)}</td>
              </tr>
            ))}
            <tr className="bg-slate-100/80">
              <td className="p-2 font-black uppercase text-slate-900 tracking-wider">Total Invoice</td>
              <td className="p-2 text-right font-black text-slate-950 w-44 sm:w-56 text-sm">{calcIDR(calc?.total.totalInvoice)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {!formData.pendingMode && (
        <div className="flex justify-end pt-2">
          <button type="button" onClick={() => setActiveBAStep(3)} className="px-4 py-2 bg-[#A57C50] hover:bg-[#8e6941] text-white font-bold rounded-[3px] flex items-center gap-1.5 transition text-xs shadow-xs cursor-pointer">
            <span>Lanjut</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
