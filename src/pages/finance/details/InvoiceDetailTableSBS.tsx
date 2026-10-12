import React from "react";
import { formatIDR } from "../helpers";

interface InvoiceDetailTableSBSProps {
  activeItems: any[];
  cCalc: any;
}

export const InvoiceDetailTableSBS: React.FC<InvoiceDetailTableSBSProps> = ({
  activeItems,
  cCalc
}) => {
  return (
    <div className="space-y-3">
      {/* TABEL UTAMA INVOICE PEKERJAAN (NILAI JKP) */}
      <div className="rounded-none border border-slate-900 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-extrabold text-[11px] uppercase border-b border-slate-900">
                <th className="p-2.5 border-r border-slate-300">DESCRIPTION</th>
                <th className="p-2.5 text-center w-28 border-r border-slate-300">JARAK (M)</th>
                <th className="p-2.5 text-center w-36 border-r border-slate-300">CLAIMED UNIT</th>
                <th className="p-2.5 text-right w-36 border-r border-slate-300">UNIT RATE (IDR)</th>
                <th className="p-2.5 text-right w-44 font-extrabold">AMOUNT (IDR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-[11px] font-medium text-slate-900">
              {/* Seksi A: OB Removal */}
              <tr className="bg-slate-100/80 font-extrabold text-slate-900 border-t border-b border-slate-300">
                <td className="p-2 underline font-extrabold border-r border-slate-200">OB REMOVAL (Per Area Kerja)</td>
                <td className="p-2 text-center text-slate-400 font-mono border-r border-slate-200">-</td>
                <td className="p-2 text-center font-mono text-slate-900 font-black border-r border-slate-200">
                  {activeItems.filter((i: any) => i.section === "A").reduce((s: number, i: any) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} BCM
                </td>
                <td className="p-2 text-right border-r border-slate-200"></td>
                <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalA)}</td>
              </tr>
              {activeItems.filter((i: any) => i.section === "A").map((i: any) => {
                const dist = i.distanceM ?? i.overhaulMtr;
                const unitRate = i.unitRateIDR || (i.volume > 0 ? Math.round((i.amount || 0) / i.volume) : 0);
                const amount = i.amount !== undefined && i.amount !== null && i.amount !== 0 ? i.amount : Math.round((i.volume || 0) * unitRate);
                return (
                  <tr key={i.id} className="hover:bg-slate-50/80 border-b border-slate-200">
                    <td className="p-2 pl-4 font-bold text-slate-800 border-r border-slate-200">{i.description}</td>
                    <td className="p-2 text-center font-mono font-bold text-slate-700 border-r border-slate-200">
                      {dist ? `${Number(dist).toLocaleString("id-ID")} m` : "-"}
                    </td>
                    <td className="p-2 text-center font-mono font-bold text-slate-800 border-r border-slate-200">
                      {(i.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} {i.unit || "BCM"}
                    </td>
                    <td className="p-2 text-right font-mono text-slate-700 border-r border-slate-200">
                      {unitRate.toLocaleString("id-ID")}
                    </td>
                    <td className="p-2 text-right font-mono font-extrabold text-slate-900">
                      {formatIDR(amount)}
                    </td>
                  </tr>
                );
              })}

              {/* Seksi B: Jasa Penunjang Produksi */}
              <tr className="bg-slate-100/80 font-extrabold text-slate-900 border-t border-b border-slate-300">
                <td className="p-2 underline font-extrabold border-r border-slate-200">JASA PENUNJANG PRODUKSI (Rental Alat)</td>
                <td className="p-2 text-center text-slate-400 font-mono border-r border-slate-200">-</td>
                <td className="p-2 text-center font-mono text-slate-900 font-black border-r border-slate-200">
                  {activeItems.filter((i: any) => i.section === "B").reduce((s: number, i: any) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} Hours
                </td>
                <td className="p-2 text-right border-r border-slate-200"></td>
                <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalB)}</td>
              </tr>
              {activeItems.filter((i: any) => i.section === "B").map((i: any) => {
                const unitRate = i.unitRateIDR || (i.volume > 0 ? Math.round((i.amount || 0) / i.volume) : 0);
                const amount = i.amount !== undefined && i.amount !== null && i.amount !== 0 ? i.amount : Math.round((i.volume || 0) * unitRate);
                return (
                  <tr key={i.id} className="hover:bg-slate-50/80 border-b border-slate-200">
                    <td className="p-2 pl-4 font-bold text-slate-800 border-r border-slate-200">{i.description}</td>
                    <td className="p-2 text-center text-slate-400 font-mono border-r border-slate-200">-</td>
                    <td className="p-2 text-center font-mono font-bold text-slate-800 border-r border-slate-200">
                      {(i.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} {i.unit || "Hours"}
                    </td>
                    <td className="p-2 text-right font-mono text-slate-700 border-r border-slate-200">
                      {unitRate.toLocaleString("id-ID")}
                    </td>
                    <td className="p-2 text-right font-mono font-extrabold text-slate-900">
                      {formatIDR(amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Footer Tabel Utama: Kalkulasi Pajak Bruto */}
            <tfoot className="border-t-2 border-slate-900 bg-slate-50 font-bold text-xs">
              <tr className="border-b border-slate-200">
                <td colSpan={3} className="p-2.5 text-right font-black uppercase text-slate-700 border-r border-slate-200">TOTAL (NILAI PEKERJAAN BRUTO):</td>
                <td colSpan={2} className="p-2.5 text-right font-mono text-sm font-black text-slate-900">{formatIDR(cCalc.totalGross)}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td colSpan={3} className="p-2.5 text-right uppercase text-slate-600 font-bold border-r border-slate-200">DPP PPN 11/12:</td>
                <td colSpan={2} className="p-2.5 text-right font-mono font-bold text-slate-800">{formatIDR(cCalc.dpp11_12)}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td colSpan={3} className="p-2.5 text-right uppercase text-slate-800 font-bold border-r border-slate-200">VAT ( 12% ) (+):</td>
                <td colSpan={2} className="p-2.5 text-right font-mono font-bold text-slate-900">{formatIDR(cCalc.vat12)}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td colSpan={3} className="p-2.5 text-right uppercase text-slate-800 font-bold border-r border-slate-200">WITH HOLDING TAX ART 23 (2%) (-):</td>
                <td colSpan={2} className="p-2.5 text-right font-mono font-bold text-slate-900">({formatIDR(cCalc.pph23)})</td>
              </tr>
              <tr className="bg-slate-100 text-slate-950 font-black text-xs sm:text-sm border-t-2 border-b-2 border-slate-900">
                <td colSpan={3} className="p-3 text-right uppercase tracking-wider text-slate-950 font-black border-r border-slate-300">TOTAL INVOICE:</td>
                <td colSpan={2} className="p-3 text-right font-mono text-base font-black text-slate-950 underline">{formatIDR(cCalc.totalInvoice)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* TABEL KHUSUS PENGURANG PEMBAYARAN */}
      <div className="rounded-none border border-slate-900 bg-white overflow-hidden">
        <div className="bg-slate-100 border-b border-slate-900 px-3 py-2 flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
            BLOK 2: TABEL KHUSUS PENGURANG PEMBAYARAN (DENDA & BBM)
          </h4>
          <span className="text-[10px] text-slate-500 font-medium">
            Sesuai kontrak customer
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-900 font-extrabold text-[11px] uppercase border-b border-slate-300">
                <th className="p-2 border-r border-slate-200">PENGURANG PEMBAYARAN</th>
                <th className="p-2 text-center w-36 border-r border-slate-200">CLAIMED UNIT</th>
                <th className="p-2 text-right w-36 border-r border-slate-200">UNIT RATE (IDR)</th>
                <th className="p-2 text-right w-44 font-extrabold">AMOUNT (IDR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-[11px] font-medium text-slate-900">
              {activeItems.filter((i: any) => i.section === "P").map((p: any) => (
                <tr key={p.id} className="hover:bg-slate-50/70 border-b border-slate-200">
                  <td className="p-2 pl-4 font-semibold text-slate-800 border-r border-slate-200">{p.description}</td>
                  <td className="p-2 text-center font-bold text-slate-600 border-r border-slate-200">{p.unit || "-"}</td>
                  <td className="p-2 text-right font-mono text-slate-400 border-r border-slate-200">-</td>
                  <td className="p-2 text-right font-mono font-bold text-slate-900">
                    {p.amount ? `(${formatIDR(Math.abs(p.amount))})` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-900 bg-slate-50 font-bold text-xs">
              <tr>
                <td colSpan={3} className="p-2.5 text-right font-black uppercase text-slate-800 border-r border-slate-200">TOTAL PENGURANG PEMBAYARAN:</td>
                <td className="p-2.5 text-right font-mono text-sm font-black text-slate-900">({formatIDR(Math.abs(cCalc.subtotalP))})</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* TOTAL DIBAYAR (SETTLEMENT BERSIH) */}
      <div className="rounded-none border-2 border-slate-900 bg-slate-50 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-900">
        <div>
          <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">
            BLOK 3: TOTAL DIBAYAR (KAS BERSIH DITERIMA)
          </h4>
          <p className="text-[10px] text-slate-600 mt-0.5">
            TOTAL INVOICE ({formatIDR(cCalc.totalInvoice)}) - PENGURANG PEMBAYARAN ({formatIDR(Math.abs(cCalc.subtotalP))})
          </p>
        </div>
        <div className="text-right">
          <span className="font-mono text-lg font-black text-slate-950">{formatIDR(cCalc.totalDibayar)}</span>
        </div>
      </div>
    </div>
  );
};
