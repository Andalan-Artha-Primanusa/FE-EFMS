import { BarChart3, RefreshCw, TrendingUp, WalletCards } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DataTable } from "../components/DataTable";
import { api, compactMoney, money, type Dashboard, type Transaction } from "../lib/api";
import { useMemo, useState } from "react";

type ChartRow = Record<string, number | string>;

const chartNumber = (row: ChartRow | undefined, key: string) => {
  const value = row?.[key];
  return typeof value === "number" ? value : 0;
};

const shortValue = (value: number) => {
  if (Math.abs(value) >= 1_000_000) return compactMoney(value);
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value);
};

export function DashboardPage({
  dashboard,
  transactions,
  query,
  onRefresh,
  onCreate,
  onNotice
}: {
  dashboard: Dashboard | null;
  transactions: Transaction[];
  query: string;
  onRefresh: () => Promise<void>;
  onCreate: () => void;
  onNotice: (message: string) => void;
}) {
  const [statusFilter, setStatusFilter] = useState("All");
  const kpis = dashboard?.kpis ?? [];
  const monthlyFinance = dashboard?.monthlyFinance ?? [];
  const cashFlow = dashboard?.cashFlow ?? [];
  const agingReceivable = dashboard?.agingReceivable ?? [];
  const agingPayable = dashboard?.agingPayable ?? [];
  const cashPosition = dashboard?.cashPosition ?? [];
  const baseTransactions = Array.isArray(dashboard?.pendingApprovals) && dashboard.pendingApprovals.length ? dashboard.pendingApprovals : transactions;
  const statuses = Array.from(new Set(baseTransactions.map((item) => item.status).filter(Boolean)));
  const visibleTransactions = baseTransactions.filter((item) => {
    const matchesQuery = JSON.stringify(item).toLowerCase().includes(query.trim().toLowerCase());
    const matchesStatus = statusFilter === "All" || item.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const summaryDate = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(new Date());
  const latestMonth = monthlyFinance.length ? monthlyFinance[monthlyFinance.length - 1] : undefined;
  const revenue = chartNumber(latestMonth, "revenue");
  const expense = chartNumber(latestMonth, "expense");
  const ebitda = revenue - expense;
  const waterfall = useMemo(() => {
    const rows = kpis.slice(0, 10).map((item) => ({ label: item.label, value: item.delta || item.value }));
    if (rows.length) return rows;
    return monthlyFinance.slice(-8).map((item) => ({
      label: String(item.label ?? ""),
      value: chartNumber(item, "revenue") - chartNumber(item, "expense")
    }));
  }, [kpis, monthlyFinance]);
  const trendEbitda = monthlyFinance.map((item) => ({
    label: String(item.label ?? ""),
    value: chartNumber(item, "revenue") - chartNumber(item, "expense"),
    revenue: chartNumber(item, "revenue"),
    expense: chartNumber(item, "expense")
  }));
  const frTrend = cashFlow.map((item) => {
    const inflow = chartNumber(item, "inflow");
    const outflow = chartNumber(item, "outflow");
    return {
      label: String(item.label ?? ""),
      actual: outflow ? Number((inflow / outflow).toFixed(2)) : inflow,
      allowance: 1,
      budget: 1.05
    };
  });
  const costProfile = [
    { label: "Revenue", value: revenue },
    { label: "Expense", value: -expense },
    { label: "EBITDA", value: ebitda },
    ...kpis.slice(0, 4).map((item) => ({ label: item.label, value: item.delta }))
  ].filter((item) => item.label);
  const controlRadar = kpis.slice(0, 7).map((item) => ({ label: item.label, value: Math.min(130, Math.max(0, 100 + item.delta)) }));
  const areaRows = monthlyFinance.slice(-3);
  const volumeRows = [
    ...cashPosition.slice(0, 3).map((item) => ({ label: String(item.label ?? "Cash"), plan: chartNumber(item, "value"), actual: chartNumber(item, "value"), next: chartNumber(item, "value") })),
    ...agingReceivable.slice(0, 2).map((item) => ({ label: String(item.label ?? "AR"), plan: chartNumber(item, "value"), actual: chartNumber(item, "value"), next: chartNumber(item, "value") }))
  ];

  return <section className="daily-finance">
    <header className="daily-hero">
      <div className="daily-mark"><WalletCards size={34} /></div>
      <div>
        <p>Finance Command Center</p>
        <h1>Summary Daily Financial [{summaryDate}]</h1>
      </div>
      <button className="daily-refresh" onClick={onRefresh}><RefreshCw size={16} /> Refresh</button>
    </header>

    <div className="daily-board">
      <section className="daily-left">
        <article className="daily-card waterfall-card">
          <div className="daily-card-title">
            <h2>EBITDA Bridge</h2>
            <span>{ebitda ? money(ebitda) : "Data API"}</span>
          </div>
          {waterfall.length ? <ResponsiveContainer width="100%" height={160}>
            <BarChart data={waterfall}>
              <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#dbe5ee" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} height={52} />
              <YAxis hide />
              <Tooltip formatter={(value) => shortValue(Number(value))} />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {waterfall.map((entry) => <Cell key={entry.label} fill={entry.value >= 0 ? "#00a979" : "#f97316"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer> : <div className="daily-empty">Data bridge belum tersedia dari API.</div>}
        </article>

        <div className="area-strip">
          {areaRows.length ? areaRows.map((item) => <article key={String(item.label)} className="area-card">
            <strong>{String(item.label)}</strong>
            <div><span>Revenue</span><b>{shortValue(chartNumber(item, "revenue"))}</b></div>
            <div><span>Expense</span><b>{shortValue(chartNumber(item, "expense"))}</b></div>
            <div><span>EBITDA</span><b>{shortValue(chartNumber(item, "revenue") - chartNumber(item, "expense"))}</b></div>
          </article>) : <div className="daily-empty">Area summary belum tersedia dari API.</div>}
        </div>

        <article className="daily-card">
          <div className="daily-card-title">
            <h2>Volume / Position</h2>
            <span>Plan vs Actual</span>
          </div>
          {volumeRows.length ? <div className="daily-table-wrap">
            <table className="daily-table compact-table">
              <thead><tr><th>Parameter</th><th>Plan</th><th>Actual</th><th>Next</th></tr></thead>
              <tbody>{volumeRows.map((row) => <tr key={row.label}>
                <td>{row.label}</td>
                <td>{shortValue(row.plan)}</td>
                <td>{shortValue(row.actual)}</td>
                <td>{shortValue(row.next)}</td>
              </tr>)}</tbody>
            </table>
          </div> : <div className="daily-empty">Data volume belum tersedia dari API.</div>}
        </article>

        <article className="daily-card trend-card">
          <div className="daily-card-title">
            <h2>Trend EBITDA</h2>
            <span>{monthlyFinance.length} periode</span>
          </div>
          {trendEbitda.length ? <ResponsiveContainer width="100%" height={210}>
            <ComposedChart data={trendEbitda}>
              <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#dbe5ee" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(value) => shortValue(Number(value))} width={70} />
              <Tooltip formatter={(value) => shortValue(Number(value))} />
              <Bar dataKey="value" name="EBITDA" fill="#bfe8ea" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="value" name="Trend" stroke="#15899a" strokeWidth={3} dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer> : <div className="daily-empty">Trend EBITDA belum tersedia dari API.</div>}
        </article>

        <article className="daily-card trend-card">
          <div className="daily-card-title">
            <h2>Trend FR OB</h2>
            <span>Actual vs allowance</span>
          </div>
          {frTrend.length ? <ResponsiveContainer width="100%" height={180}>
            <LineChart data={frTrend}>
              <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#dbe5ee" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis width={52} />
              <Tooltip />
              <Line type="monotone" dataKey="actual" stroke="#238aa5" strokeWidth={3} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="allowance" stroke="#00a979" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="budget" stroke="#6ab0a8" strokeDasharray="5 5" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer> : <div className="daily-empty">Trend FR belum tersedia dari API.</div>}
        </article>
      </section>

      <section className="daily-right">
        <article className="daily-card cost-card">
          <div className="daily-card-title">
            <h2>Cost Profile</h2>
            <span>MTD / YTD</span>
          </div>
          {costProfile.length ? <ResponsiveContainer width="100%" height={155}>
            <BarChart data={costProfile}>
              <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#dbe5ee" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} height={42} />
              <YAxis hide />
              <Tooltip formatter={(value) => shortValue(Number(value))} />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {costProfile.map((entry) => <Cell key={entry.label} fill={entry.value >= 0 ? "#00a979" : "#f97316"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer> : <div className="daily-empty">Cost profile belum tersedia dari API.</div>}
          <div className="cost-matrix">
            {kpis.slice(0, 4).map((item) => <div key={item.label}>
              <span>{item.label}</span><b>{shortValue(item.value)}</b><em>{item.delta >= 0 ? "+" : ""}{item.delta}%</em>
            </div>)}
          </div>
        </article>

        <article className="daily-card parameter-card">
          <div className="daily-logo-line"><strong>EFMS</strong><span>Enterprise Finance Management System</span></div>
          <table className="daily-table compact-table">
            <tbody>
              <tr><td>Revenue</td><td>{shortValue(revenue)}</td><td>Actual</td></tr>
              <tr><td>Expense</td><td>{shortValue(expense)}</td><td>Actual</td></tr>
              <tr><td>EBITDA</td><td>{shortValue(ebitda)}</td><td>{ebitda >= 0 ? "Positive" : "Negative"}</td></tr>
              <tr><td>Pending Approval</td><td>{visibleTransactions.length}</td><td>Items</td></tr>
            </tbody>
          </table>
        </article>

        <article className="daily-card control-table-card">
          <div className="daily-card-title">
            <h2>Control Milestone Performance</h2>
            <button className="daily-mini-button" onClick={onCreate}>New Request</button>
          </div>
          <div className="filter-row daily-filter">
            <label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option>All</option>
              {statuses.map((status) => <option key={status}>{status}</option>)}
            </select></label>
            <button className="ghost" onClick={() => setStatusFilter("All")}>Reset</button>
          </div>
          <DataTable rows={visibleTransactions.slice(0, 5)} onApprove={async (id) => {
            await api(`/api/approvals/${id}/action`, { method: "POST", body: JSON.stringify({ action: "approve", note: "Approved from dashboard" }) });
            onNotice("Transaksi berhasil di-approve.");
            await onRefresh();
          }} />
        </article>

        <div className="daily-bottom-grid">
          <article className="daily-card radar-card">
            <div className="daily-card-title"><h2>Control Chart</h2><BarChart3 size={16} /></div>
            {controlRadar.length ? <ResponsiveContainer width="100%" height={190}>
              <RadarChart data={controlRadar}>
                <PolarGrid stroke="#dbe5ee" />
                <PolarAngleAxis dataKey="label" tick={{ fontSize: 9 }} />
                <Radar dataKey="value" stroke="#f97316" fill="#f97316" fillOpacity={0.14} strokeWidth={2} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer> : <div className="daily-empty">Control chart belum tersedia.</div>}
          </article>

          <article className="daily-card highlight-card">
            <div className="daily-card-title"><h2>Highlight Daily EBITDA</h2><TrendingUp size={16} /></div>
            <ul>
              <li>Revenue aktual {shortValue(revenue)} dengan expense {shortValue(expense)}.</li>
              <li>EBITDA berjalan {shortValue(ebitda)} berdasarkan data finance terakhir dari API.</li>
              <li>{visibleTransactions.length} transaksi berada di daftar approval/filter aktif.</li>
            </ul>
          </article>
        </div>
      </section>
    </div>
  </section>;
}
