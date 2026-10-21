import React from "react";

interface InvoiceDetailTableSBSProps {
  activeItems: any[];
  cCalc: any;
}

// Format angka mengikuti preview cetak (tanpa "Rp")
const num = (v: number) => Math.round(v || 0).toLocaleString("id-ID");
const vol = (v: number) => (v || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 });

const th = "p-2 border border-slate-900 bg-slate-100 text-slate-900 font-extrabold text-[11px] uppercase";
const td = "p-2 border border-slate-400";
const secHdr = "bg-slate-200 font-extrabold";
const netRow = "bg-slate-100 font-black text-xs";

export const InvoiceDetailTableSBS: React.FC<InvoiceDetailTableSBSProps> = ({
  activeItems,
  cCalc
}) => {
  const secA = activeItems.filter((i: any) => i.section === "A");
  const secB = activeItems.filter((i: any) => i.section === "B");
  const secP = activeItems.filter((i: any) => i.section === "P");
  const rateOf = (i: any) => i.unitRateIDR || (i.volume > 0 ? Math.round((i.amount || 0) / i.volume) : 0);
  const amountOf = (i: any) => i.amount ? i.amount : Math.round((i.volume || 0) * rateOf(i));

  return (
    <div className="space-y-3 overflow-x-auto">
      <table className="w-full text-[11px] text-left border-collapse border-[1.5px] border-slate-900 bg-white text-slate-900">
        <thead>
          <tr>
            <th className={th}>DESCRIPTION</th>
            <th className={`${th} text-center w-28`}>JARAK (M)</th>
            <th className={`${th} text-center w-36`}>CLAIMED UNIT</th>
            <th className={`${th} text-right w-36`}>UNIT RATE (IDR)</th>
            <th className={`${th} text-right w-44`}>AMOUNT (IDR)</th>
          </tr>
        </thead>
        <tbody>
          <tr className={secHdr}>
            <td className={td}>OB REMOVAL (Per Area Kerja)</td>
            <td className={`${td} text-center`}>-</td>
            <td className={`${td} text-center`}>{vol(secA.reduce((s: number, i: any) => s + (i.volume || 0), 0))} BCM</td>
            <td className={td}></td>
            <td className={`${td} text-right font-black`}>{num(cCalc.subtotalA)}</td>
          </tr>
          {secA.map((i: any) => {
            const dist = i.distanceM ?? i.overhaulMtr;
            return (
              <tr key={i.id}>
                <td className={`${td} pl-5`}>{i.description}</td>
                <td className={`${td} text-center font-bold`}>{dist ? `${Number(dist).toLocaleString("id-ID")} m` : "-"}</td>
                <td className={`${td} text-center`}>{vol(i.volume)} {i.unit || "BCM"}</td>
                <td className={`${td} text-right`}>{num(rateOf(i))}</td>
                <td className={`${td} text-right`}>{num(amountOf(i))}</td>
              </tr>
            );
          })}

          <tr className={secHdr}>
            <td className={td}>JASA PENUNJANG PRODUKSI (Rental Alat)</td>
            <td className={`${td} text-center`}>-</td>
            <td className={`${td} text-center`}>{vol(secB.reduce((s: number, i: any) => s + (i.volume || 0), 0))} Hours</td>
            <td className={td}></td>
            <td className={`${td} text-right font-black`}>{num(cCalc.subtotalB)}</td>
          </tr>
          {secB.map((i: any) => (
            <tr key={i.id}>
              <td className={`${td} pl-5`}>{i.description}</td>
              <td className={`${td} text-center`}>-</td>
              <td className={`${td} text-center`}>{vol(i.volume)} {i.unit || "Hours"}</td>
              <td className={`${td} text-right`}>{num(rateOf(i))}</td>
              <td className={`${td} text-right`}>{num(amountOf(i))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="font-bold">
          <tr>
            <td colSpan={4} className={td}>TOTAL (NILAI PEKERJAAN BRUTO)</td>
            <td className={`${td} text-right`}>{num(cCalc.totalGross)}</td>
          </tr>
          <tr>
            <td colSpan={4} className={td}>DPP PPN 11/12</td>
            <td className={`${td} text-right`}>{num(cCalc.dpp11_12)}</td>
          </tr>
          <tr>
            <td colSpan={4} className={td}>VAT ( 12% ) (+)</td>
            <td className={`${td} text-right`}>{num(cCalc.vat12)}</td>
          </tr>
          <tr>
            <td colSpan={4} className={td}>WITH HOLDING TAX ART 23 (2%) (-)</td>
            <td className={`${td} text-right`}>({num(cCalc.pph23)})</td>
          </tr>
          <tr className={netRow}>
            <td colSpan={4} className="p-2 border border-slate-900">TOTAL INVOICE</td>
            <td className="p-2 border border-slate-900 text-right text-sm underline">{num(cCalc.totalInvoice)}</td>
          </tr>
        </tfoot>
      </table>

      <table className="w-full text-[11px] text-left border-collapse border-[1.5px] border-slate-900 bg-white text-slate-900">
        <thead>
          <tr>
            <th className={th}>PENGURANG PEMBAYARAN</th>
            <th className={`${th} text-center w-36`}>CLAIMED UNIT</th>
            <th className={`${th} text-right w-36`}>UNIT RATE (IDR)</th>
            <th className={`${th} text-right w-44`}>AMOUNT (IDR)</th>
          </tr>
        </thead>
        <tbody>
          {secP.map((p: any) => (
            <tr key={p.id}>
              <td className={`${td} pl-4`}>{p.description}</td>
              <td className={`${td} text-center`}>{p.unit || "-"}</td>
              <td className={`${td} text-right`}>-</td>
              <td className={`${td} text-right font-bold`}>{p.amount ? `(${num(Math.abs(p.amount))})` : "-"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="font-bold">
          <tr>
            <td colSpan={3} className={td}>TOTAL PENGURANG PEMBAYARAN</td>
            <td className={`${td} text-right`}>({num(Math.abs(cCalc.subtotalP))})</td>
          </tr>
          <tr className={netRow}>
            <td colSpan={3} className="p-2 border border-slate-900">TOTAL DIBAYAR</td>
            <td className="p-2 border border-slate-900 text-right text-sm underline">{num(cCalc.totalDibayar)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};
