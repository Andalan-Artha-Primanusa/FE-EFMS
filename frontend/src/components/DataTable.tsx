import type { Transaction } from "../lib/api";
import { money } from "../lib/api";

export function DataTable({ rows, onApprove }: { rows: Transaction[]; onApprove: (id: number) => void }) {
  return <div className="table-wrap"><table><thead><tr><th>No</th><th>Tipe</th><th>Requester</th><th>Nilai</th><th>Status</th><th>Budget</th><th></th></tr></thead><tbody>
    {rows.slice(0, 8).map((row) => <tr key={row.id}>
      <td>{row.number}</td><td>{row.type}</td><td>{row.requester}</td><td>{money(row.amount)}</td>
      <td><span className={`badge ${statusClass(row.status)}`}>{row.status}</span></td>
      <td><span className={`badge ${statusClass(row.budgetStatus)}`}>{row.budgetStatus}</span></td>
      <td><button className="ghost" onClick={() => onApprove(row.id)}>Approve</button></td>
    </tr>)}
    {!rows.length && <tr><td colSpan={7} className="empty">Belum ada transaksi. Buat pengajuan pertama.</td></tr>}
  </tbody></table></div>;
}

export function statusClass(status: string) {
  if (["Approved", "Available", "Paid", "Posted"].includes(status)) return "ok";
  if (["Warning", "Waiting Approval", "Submitted"].includes(status)) return "wait";
  if (["Rejected", "Blocked", "Overdue"].includes(status)) return "bad";
  return "neutral";
}
