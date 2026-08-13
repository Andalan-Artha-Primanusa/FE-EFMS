import type { ReactNode } from "react";

export function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return <section className="panel"><div className="panel-head"><h3>{title}</h3><span>{action}</span></div>{children}</section>;
}
