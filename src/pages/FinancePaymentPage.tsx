import { FinanceShell } from "./finance/FinanceShell";
import { PaymentView } from "./finance/PaymentView";

// Halaman: Payment & Receipt Log
// Data & modal bersama di FinanceShell; konten spesifik di PaymentView.
export function FinancePaymentPage(props: { viewTitle?: string; query?: string; onNotice?: (msg: string) => void; user?: any }) {
  return (
    <FinanceShell
      viewTitle="Payment & Receipt Log"
      query={props.query ?? ""}
      onNotice={props.onNotice}
      user={props.user}
      render={(c: any) => <PaymentView c={c} />}
    />
  );
}

