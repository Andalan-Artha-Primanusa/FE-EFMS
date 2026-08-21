import { FinanceShell } from "./finance/FinanceShell";
import { CustomerView } from "./finance/CustomerView";

// Halaman: Customer Master & Credit Terms
// Data & modal bersama di FinanceShell; konten spesifik di CustomerView.
export function FinanceCustomerPage(props: { viewTitle?: string; query?: string; onNotice?: (msg: string) => void; user?: any }) {
  return (
    <FinanceShell
      viewTitle="Customer & Credit Terms"
      query={props.query ?? ""}
      onNotice={props.onNotice}
      user={props.user}
      render={(c: any) => <CustomerView c={c} />}
    />
  );
}

