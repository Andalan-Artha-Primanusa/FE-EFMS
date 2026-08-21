import { FinanceShell } from "./finance/FinanceShell";
import { DashboardView } from "./finance/DashboardView";

// Halaman: Finance & AR Dashboard
// Data & modal bersama di FinanceShell; konten spesifik di DashboardView.
export function FinanceDashboardPage(props: { viewTitle?: string; query?: string; onNotice?: (msg: string) => void; user?: any }) {
  return (
    <FinanceShell
      viewTitle="Finance & AR Dashboard"
      query={props.query ?? ""}
      onNotice={props.onNotice}
      user={props.user}
      render={(c: any) => <DashboardView c={c} />}
    />
  );
}

