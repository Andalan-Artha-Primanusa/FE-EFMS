import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  meta,
  children
}: {
  title: string;
  description?: string;
  meta?: ReactNode;
  children?: ReactNode;
}) {
  return <section className="page-header">
    <div>
      <p className="eyebrow">FEAST Workspace</p>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
    <div className="page-header-side">
      {meta}
      {children}
    </div>
  </section>;
}
