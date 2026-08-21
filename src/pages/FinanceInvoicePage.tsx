import { FinanceShell } from "./finance/FinanceShell";
import { InvoiceView } from "./finance/InvoiceView";

// Halaman: Invoice Management
// Data & modal bersama di FinanceShell; konten spesifik di InvoiceView.
export function FinanceInvoicePage(props: { viewTitle?: string; query?: string; onNotice?: (msg: string) => void; user?: any }) {
  return (
    <FinanceShell
      viewTitle="Invoice Management"
      query={props.query ?? ""}
      onNotice={props.onNotice}
      user={props.user}
      render={(c: any) => <InvoiceView c={c} />}
    />
  );
}

