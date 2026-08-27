import { FinanceShell } from "./finance/FinanceShell";
import { CustomerView } from "./finance/CustomerView";

// Halaman: Client Setup (Terpadu Profil Klien, SOW & Aturan Penagihan)
// Data & modal bersama di FinanceShell; konten spesifik di CustomerView.
export function FinanceCustomerPage(props: { viewTitle?: string; query?: string; onNotice?: (msg: string) => void; user?: any }) {
  return (
    <FinanceShell
      viewTitle={props.viewTitle ?? "Client Setup"}
      query={props.query ?? ""}
      onNotice={props.onNotice}
      user={props.user}
      render={(c: any) => <CustomerView c={c} />}
    />
  );
}

