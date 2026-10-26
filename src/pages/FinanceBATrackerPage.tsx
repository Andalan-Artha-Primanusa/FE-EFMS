import { FinanceShell } from "./finance/FinanceShell";
import { BATrackerView } from "./finance/BATrackerView";

// Halaman: Berita Acara (BA) Tracker
// Data & modal bersama di FinanceShell; konten spesifik di BATrackerView.
export function FinanceBATrackerPage(props: { viewTitle?: string; query?: string; onNotice?: (msg: string) => void; user?: any }) {
  return (
    <FinanceShell
      viewTitle="Berita Acara (BA) Tracker"
      query={props.query ?? ""}
      onNotice={props.onNotice}
      user={props.user}
      render={(c: any) => <BATrackerView c={c} archive={props.viewTitle === "Arsip BA"} />}
    />
  );
}

