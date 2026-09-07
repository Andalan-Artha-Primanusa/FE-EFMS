import type { ReactNode } from "react";
import { useFinanceController } from "./useFinanceController";
import { DetailModal } from "./DetailModal";
import { FormModals } from "./FormModals";
import { PendingVolumeModal } from "./PendingVolumeModal";

type ShellProps = {
  viewTitle: string;
  query?: string;
  onNotice?: (msg: string) => void;
  user?: any;
  render?: (c: any) => ReactNode;
};

// Kerangka bersama semua halaman finance: data + modal global.
// Konten spesifik tiap halaman disuntikkan lewat prop render.
export function FinanceShell({ viewTitle, query = "", onNotice = (_m: string) => {}, user, render }: ShellProps) {
  const c = useFinanceController({ viewTitle, query, onNotice, user });
  return (
    <div className="workspace-body space-y-3.5">
      {render ? render(c) : null}
      <DetailModal c={c} />
      <FormModals c={c} />
      <PendingVolumeModal c={c} />
    </div>
  );
}
