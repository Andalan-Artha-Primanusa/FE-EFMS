import type { ReactNode } from "react";
import { FinanceShell } from "./finance/FinanceShell";
import { DashboardView } from "./finance/DashboardView";
import { InvoiceView } from "./finance/InvoiceView";
import { BATrackerView } from "./finance/BATrackerView";
import { PaymentView } from "./finance/PaymentView";
import { CustomerView } from "./finance/CustomerView";

type Props = { viewTitle: string; query: string; onNotice: (msg: string) => void; user?: any };

const VIEW_MAP: Array<{ match: string[]; render: (c: any) => ReactNode }> = [
  { match: ["Finance & AR Dashboard", "Finance AR Dashboard", "Dashboard"], render: (c) => <DashboardView c={c} /> },
  { match: ["Invoice Management"], render: (c) => <InvoiceView c={c} /> },
  { match: ["Berita Acara (BA) Tracker"], render: (c) => <BATrackerView c={c} /> },
  { match: ["Payment & Receipt Log"], render: (c) => <PaymentView c={c} /> },
  { match: ["Customer & Credit Terms", "Customer Master & Credit Terms"], render: (c) => <CustomerView c={c} /> },
];

// Kompatibilitas: rute lama yang masih melewatkan viewTitle.
export function FinancePage(props: Props) {
  const entry = VIEW_MAP.find((v) => v.match.includes(props.viewTitle));
  return <FinanceShell {...props} render={(c: any) => (entry ? entry.render(c) : null)} />;
}
