import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Eye, RefreshCw } from "lucide-react";
import { Panel } from "../../components/Panel";
import { FinanceShell } from "./FinanceShell";
import { compactMoney } from "../../lib/api";
import { formatIDR, getBAInvoiceStatus, renderBAStatusBadge, renderInvoiceStatusBadge, indonesianMonths } from "./helpers";

const BA_STAGES = ["Submit", "Revisi", "Ready to Invoice", "Approved", "Arsip"];
const UNISSUED = new Set(["", "Draft", "Draft Invoice", "Pending", "Submitted", "Pending Approval", "Rejected"]);
const baValue = (ba: any) => Number(ba.adjustedWorkAmount || ba.workAmount || 0);
const monthKey = (d: any) => (d ? String(d).slice(0, 7) : "");
const validDate = (v: any) => String(v || "").slice(0, 10) > "1900";
const daysBetween = (a: any, b: any) => Math.round((Date.parse(String(b).slice(0, 10)) - Date.parse(String(a).slice(0, 10))) / 86400000);
const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const pct = (a: number, b: number) => (b ? (a / b) * 100 : 0);
const AGING = [
  { label: "Belum Jatuh Tempo", color: "bg-[#A57C50]", min: -Infinity, max: 0 },
  { label: "1-30 Hari", color: "bg-emerald-500", min: 1, max: 30 },
  { label: "31-60 Hari", color: "bg-amber-400", min: 31, max: 60 },
  { label: "61-90 Hari", color: "bg-orange-500", min: 61, max: 90 },
  { label: "> 90 Hari", color: "bg-rose-500", min: 91, max: Infinity },
];

export function ARDashboardPage(props: { query?: string; onNotice?: (msg: string) => void; user?: any }) {
  return <FinanceShell viewTitle="AR Dashboard" {...props} render={(c: any) => <ARDashboardView c={c} />} />;
}

// Dashboard AR: BA Tracker → Invoice → Payment Log.
export function ARDashboardView({ c }: { c: any }) {
  const { baRows = [], invoiceRows = [], paymentRows = [], loadData, setDetailViewItem } = c as Record<string, any>;
  const [customer, setCustomer] = useState("All");

  const customers = useMemo(
    () => Array.from(new Set([...baRows, ...invoiceRows].map((r: any) => r.customerCode).filter(Boolean))).sort() as string[],
    [baRows, invoiceRows]
  );
  const pick = (rows: any[]) => (customer === "All" ? rows : rows.filter((r) => r.customerCode === customer));
  const bas = pick(baRows), invoices = pick(invoiceRows), payments = pick(paymentRows);

  const d = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const issued = invoices.filter((i: any) => !UNISSUED.has(String(i.status || "").trim()));
    const sum = (rows: any[], f: (r: any) => number) => rows.reduce((s, r) => s + (f(r) || 0), 0);
    const uninvoicedBA = bas.filter((b: any) => (b.statusBA === "Ready to Invoice" || b.statusBA === "Approved") && !getBAInvoiceStatus(b, invoiceRows).isFullyInvoiced);
    const pastDue = (i: any) => (validDate(i.dueDate) ? daysBetween(i.dueDate, today) : 0);
    const open = issued.filter((i: any) => Number(i.outstanding) > 0);
    const overdue = open.filter((i: any) => pastDue(i) > 0);
    const validPayments = payments.filter((p: any) => p.verificationStatus !== "Rejected");
    const aging = AGING.map((b) => ({ ...b, value: sum(open.filter((i: any) => pastDue(i) >= b.min && pastDue(i) <= b.max), (i) => Number(i.outstanding)) }));
    const invoiceOf = (p: any) => invoiceRows.find((i: any) => (p.invoiceId && i.id === p.invoiceId) || i.invoiceNo === p.invoiceNo);
    const payDelays = validPayments
      .map((p: any) => { const inv = invoiceOf(p); return inv && validDate(inv.dueDate) && validDate(p.paymentDate) ? daysBetween(inv.dueDate, p.paymentDate) : null; })
      .filter((x: number | null): x is number => x !== null);

    const months = Array.from({ length: 6 }, (_, k) => {
      const dt = new Date();
      dt.setDate(1);
      dt.setMonth(dt.getMonth() - 5 + k);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      return {
        label: `${indonesianMonths[dt.getMonth()].slice(0, 3)} ${String(dt.getFullYear()).slice(2)}`,
        invoiced: sum(issued.filter((i: any) => monthKey(i.invoiceDate) === key), (i) => Number(i.totalInvoice)),
        collected: sum(validPayments.filter((p: any) => monthKey(p.paymentDate) === key), (p) => Number(p.amountPaid)),
      };
    });

    const byCustomer = customers
      .filter((code) => customer === "All" || code === customer)
      .map((code) => {
        const inv = issued.filter((i: any) => i.customerCode === code);
        const invoiced = sum(inv, (i) => Number(i.totalInvoice));
        const paid = sum(inv, (i) => Number(i.totalPaid));
        return {
          code,
          baCount: bas.filter((b: any) => b.customerCode === code).length,
          baValue: sum(bas.filter((b: any) => b.customerCode === code), baValue),
          invCount: inv.length,
          invoiced,
          paid,
          outstanding: sum(inv, (i) => Number(i.outstanding)),
          overdue: sum(overdue.filter((i: any) => i.customerCode === code), (i) => Number(i.outstanding)),
          rate: pct(paid, invoiced),
        };
      });

    const invoicedTotal = sum(issued, (i) => Number(i.totalInvoice));
    const outstandingTotal = sum(issued, (i) => Number(i.outstanding));
    const overdueTotal = sum(overdue, (i) => Number(i.outstanding));
    const uninvoicedTotal = sum(uninvoicedBA, baValue);
    const pendingPayments = payments.filter((p: any) => p.verificationStatus === "Pending").length;
    const collectionRate = pct(sum(issued, (i) => Number(i.totalPaid)), invoicedTotal);

    return {
      issued, uninvoicedBA, overdue, months, byCustomer, aging,
      baTotal: sum(bas, baValue),
      invoicedTotal, outstandingTotal, overdueTotal, uninvoicedTotal, pendingPayments,
      collectedTotal: sum(validPayments, (p) => Number(p.amountPaid)),
      cycle: [
        { label: "Collection Rate", value: `${collectionRate.toFixed(1)}%`, bad: collectionRate < 80 },
        { label: "Avg Lead Time BA", value: avg(bas.map((b: any) => Number(b.leadTimeDays)).filter((x: number) => x > 0)), limit: 14 },
        { label: "Avg BA ke Invoice", value: avg(bas.map((b: any) => Number(b.lagBAToInvoiceDays)).filter((x: number) => x > 0)), limit: 7 },
        { label: "Avg Telat Bayar", value: avg(payDelays), limit: 0 },
      ].map((m: any) => typeof m.value === "string" ? m : { ...m, bad: m.value !== null && m.value > m.limit, value: m.value === null ? "-" : `${Math.round(m.value)} hari` }),
      draftInvoices: invoices.filter((i: any) => UNISSUED.has(String(i.status || "").trim()) && i.status !== "Rejected").length,
      stages: BA_STAGES.map((s) => ({ stage: s, rows: bas.filter((b: any) => b.statusBA === s) })),
      recentPayments: [...payments].sort((a: any, b: any) => String(b.paymentDate).localeCompare(String(a.paymentDate))).slice(0, 8),
    };
  }, [bas, invoices, payments, invoiceRows, customers, customer]);

  const kpis = [
    { label: "Nilai BA", value: formatIDR(d.baTotal), note: `${bas.length} BA`, tone: "" },
    { label: "BA Belum Invoice", value: formatIDR(d.uninvoicedTotal), note: `${d.uninvoicedBA.length} BA`, tone: d.uninvoicedBA.length ? "warning" : "" },
    { label: "Invoice Terbit", value: formatIDR(d.invoicedTotal), note: `${d.issued.length} invoice · ${d.draftInvoices} draft`, tone: "" },
    { label: "Pembayaran Diterima", value: formatIDR(d.collectedTotal), note: `${d.pendingPayments} pending verifikasi`, tone: d.pendingPayments ? "warning" : "" },
    { label: "Outstanding AR", value: formatIDR(d.outstandingTotal), note: `Overdue ${formatIDR(d.overdueTotal)} (${d.overdue.length})`, tone: d.overdue.length ? "critical" : "" },
  ];
  const toneStyle: Record<string, string> = {
    "": "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    critical: "bg-rose-50 text-rose-700 border-rose-200",
  };
  const th = "p-2.5";
  const theadRow = "bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-[4px] border border-slate-200 shadow-xs">
        <span className="font-bold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-1.5">
          <BarChart3 size={15} className="text-[#A57C50]" /> AR Dashboard
        </span>
        <div className="flex items-center gap-2">
          <select value={customer} onChange={(e) => setCustomer(e.target.value)} className="text-xs border border-slate-200 rounded-[4px] px-2 py-1.5 bg-white font-semibold text-slate-700">
            <option value="All">Semua Customer</option>
            {customers.map((code) => <option key={code}>{code}</option>)}
          </select>
          <button type="button" onClick={() => loadData(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition shadow-xs">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="p-3.5 rounded-[4px] border border-slate-200 bg-white shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{k.label}</span>
            <span className="my-2 text-lg sm:text-xl font-bold text-slate-900 tracking-tight tabular-nums block truncate" title={k.value}>{k.value}</span>
            <div className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-[3px] border w-fit font-bold ${toneStyle[k.tone]}`}>{k.note}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {d.cycle.map((m: any) => (
          <div key={m.label} className="px-3.5 py-2.5 rounded-[4px] border border-slate-200 bg-white shadow-xs flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{m.label}</span>
            <span className={`text-base font-bold tabular-nums ${m.bad ? "text-rose-700" : "text-slate-900"}`}>{m.value}</span>
          </div>
        ))}
      </div>

      <div className="p-4 bg-white border border-slate-200 rounded-[4px] shadow-xs space-y-2.5">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <BarChart3 size={15} className="text-[#A57C50]" /> Aging Piutang
          </span>
          <span className="text-slate-600 font-bold tabular-nums">Total: {formatIDR(d.outstandingTotal)}</span>
        </div>
        <div className="h-2.5 w-full bg-slate-100 rounded-[2px] overflow-hidden flex gap-0.5">
          {d.aging.map((b) => (
            <div key={b.label} style={{ width: `${pct(b.value, d.outstandingTotal)}%` }} className={`${b.color} h-full transition-all`} title={`${b.label}: ${formatIDR(b.value)}`} />
          ))}
        </div>
        <div className="flex flex-wrap gap-4 text-xs font-semibold pt-1">
          {d.aging.map((b) => (
            <div key={b.label} className="flex items-center gap-1.5 text-slate-700">
              <span className={`w-2.5 h-2.5 rounded-full inline-block ${b.color}`} /> {b.label} ({formatIDR(b.value)} · {pct(b.value, d.outstandingTotal).toFixed(1)}%)
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Panel title="Invoice vs Pembayaran (6 Bulan)">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={d.months}>
                <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => compactMoney(Number(v))} width={60} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatIDR(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="invoiced" name="Invoice" fill="#A57C50" radius={[3, 3, 0, 0]} />
                <Bar dataKey="collected" name="Pembayaran" fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </div>
        <Panel title="Status BA">
          <div className="space-y-2.5">
            {d.stages.map(({ stage, rows }) => (
              <div key={stage} className="p-3 rounded-[4px] bg-slate-50/70 border border-slate-200 shadow-xs hover:border-slate-300 transition">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 text-xs">{stage}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-[3px] font-bold bg-slate-200/80 text-slate-700">{rows.length} BA</span>
                </div>
                <div className="text-xs text-slate-600 flex justify-between pt-1 font-medium">
                  <span>Nilai</span>
                  <span className="font-bold text-slate-800 tabular-nums">{formatIDR(rows.reduce((s: number, b: any) => s + baValue(b), 0))}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="AR per Customer">
        <div className="table-wrapper overflow-x-auto rounded-[4px] border border-slate-200 shadow-xs">
          <table className="data-table w-full text-xs text-left border-collapse font-sans">
            <thead>
              <tr className={theadRow}>
                <th className={th}>Customer</th>
                <th className={`${th} text-center`}>BA</th>
                <th className={`${th} text-right`}>Nilai BA</th>
                <th className={`${th} text-center`}>Invoice</th>
                <th className={`${th} text-right`}>Nilai Invoice</th>
                <th className={`${th} text-right`}>Dibayar</th>
                <th className={`${th} text-right`}>Outstanding</th>
                <th className={`${th} text-right`}>Overdue</th>
                <th className={`${th} text-right`}>Collection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-800 font-medium">
              {d.byCustomer.map((r) => (
                <tr key={r.code} className="hover:bg-slate-50/80 transition">
                  <td className={`${th} font-bold text-slate-900`}>{r.code}</td>
                  <td className={`${th} text-center tabular-nums`}>{r.baCount}</td>
                  <td className={`${th} text-right tabular-nums`}>{formatIDR(r.baValue)}</td>
                  <td className={`${th} text-center tabular-nums`}>{r.invCount}</td>
                  <td className={`${th} text-right tabular-nums`}>{formatIDR(r.invoiced)}</td>
                  <td className={`${th} text-right tabular-nums text-emerald-700 font-semibold`}>{formatIDR(r.paid)}</td>
                  <td className={`${th} text-right tabular-nums font-bold`}>{formatIDR(r.outstanding)}</td>
                  <td className={`${th} text-right tabular-nums font-bold ${r.overdue > 0 ? "text-rose-700" : "text-slate-400"}`}>{r.overdue ? formatIDR(r.overdue) : "-"}</td>
                  <td className={`${th} text-right tabular-nums font-bold ${r.rate < 80 ? "text-amber-700" : "text-emerald-700"}`}>{r.rate.toFixed(1)}%</td>
                </tr>
              ))}
              {d.byCustomer.length === 0 && (
                <tr><td colSpan={9} className="p-6 text-center text-slate-500 font-medium">Tidak ada data.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="BA Belum Ditagih">
          <div className="table-wrapper overflow-x-auto rounded-[4px] border border-slate-200 shadow-xs">
            <table className="data-table w-full text-xs text-left border-collapse font-sans">
              <thead>
                <tr className={theadRow}>
                  <th className={th}>No. BA</th>
                  <th className={th}>Customer</th>
                  <th className={th}>Periode</th>
                  <th className={`${th} text-right`}>Nilai</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-800 font-medium">
                {d.uninvoicedBA.slice(0, 8).map((b: any) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition">
                    <td className={`${th} font-bold text-slate-900`}>{b.baNumber}</td>
                    <td className={th}>{b.customerCode}</td>
                    <td className={`${th} text-slate-600`}>{b.workPeriod}</td>
                    <td className={`${th} text-right tabular-nums font-bold`}>{formatIDR(baValue(b))}</td>
                    <td className={th}>{renderBAStatusBadge(b.statusBA, b.invoiceNoLinked, false, b, invoiceRows)}</td>
                  </tr>
                ))}
                {d.uninvoicedBA.length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-slate-500 font-medium">Tidak ada data.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Invoice Overdue">
          <div className="table-wrapper overflow-x-auto rounded-[4px] border border-slate-200 shadow-xs">
            <table className="data-table w-full text-xs text-left border-collapse font-sans">
              <thead>
                <tr className={theadRow}>
                  <th className={th}>No. Invoice</th>
                  <th className={th}>Customer</th>
                  <th className={th}>Jatuh Tempo</th>
                  <th className={`${th} text-right`}>Outstanding</th>
                  <th className={`${th} text-right`}>Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-800 font-medium">
                {[...d.overdue].sort((a: any, b: any) => String(a.dueDate).localeCompare(String(b.dueDate))).slice(0, 8).map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                    <td className={`${th} font-bold text-slate-900`}>{inv.invoiceNo}</td>
                    <td className={th}>{inv.customerCode}</td>
                    <td className={`${th} tabular-nums text-amber-700 font-semibold`}>{String(inv.dueDate).slice(0, 10)} · {daysBetween(inv.dueDate, new Date().toISOString())} hari</td>
                    <td className={`${th} text-right tabular-nums font-bold text-rose-700`}>{formatIDR(inv.outstanding)}</td>
                    <td className={`${th} text-right`}>
                      <button className="p-1 rounded-[3px] border border-slate-200 bg-white text-slate-600 hover:text-[#A57C50] hover:border-[#A57C50]/40 transition cursor-pointer" onClick={() => setDetailViewItem({ type: "invoice", data: inv })} title="Lihat Detail">
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {d.overdue.length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-slate-500 font-medium">Tidak ada data.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel title="Pembayaran Terbaru">
        <div className="table-wrapper overflow-x-auto rounded-[4px] border border-slate-200 shadow-xs">
          <table className="data-table w-full text-xs text-left border-collapse font-sans">
            <thead>
              <tr className={theadRow}>
                <th className={th}>Tanggal</th>
                <th className={th}>No. Invoice</th>
                <th className={th}>Customer</th>
                <th className={th}>Bank</th>
                <th className={th}>Ref</th>
                <th className={`${th} text-right`}>Jumlah</th>
                <th className={th}>Verifikasi</th>
                <th className={th}>Status Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-800 font-medium">
              {d.recentPayments.map((p: any) => {
                const inv = invoiceRows.find((i: any) => (p.invoiceId && i.id === p.invoiceId) || i.invoiceNo === p.invoiceNo);
                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className={`${th} tabular-nums`}>{String(p.paymentDate).slice(0, 10)}</td>
                    <td className={`${th} font-bold text-slate-900`}>{p.invoiceNo}</td>
                    <td className={th}>{p.customerCode}</td>
                    <td className={th}>{p.receivingBank || "-"}</td>
                    <td className={`${th} text-slate-600`}>{p.refNo || "-"}</td>
                    <td className={`${th} text-right tabular-nums font-bold text-emerald-700`}>{formatIDR(p.amountPaid)}</td>
                    <td className={th}>
                      <span className={`px-2 py-0.5 rounded-[3px] text-[10px] font-bold border ${p.verificationStatus === "Verified" ? toneStyle[""] : p.verificationStatus === "Rejected" ? toneStyle.critical : toneStyle.warning}`}>
                        {p.verificationStatus || "Pending"}
                      </span>
                    </td>
                    <td className={th}>{inv ? renderInvoiceStatusBadge(inv.status) : "-"}</td>
                  </tr>
                );
              })}
              {d.recentPayments.length === 0 && (
                <tr><td colSpan={8} className="p-6 text-center text-slate-500 font-medium">Tidak ada data.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
