import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export type Breadcrumb = {
  label: string;
  path?: string;
};

export function PageHeader({
  title,
  description,
  breadcrumbs,
  meta,
  children
}: {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  meta?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="page-header mb-6 pb-4 border-b border-slate-200">
      <div className="flex flex-col gap-1.5">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center gap-1.5">
                {crumb.path ? (
                  <Link to={crumb.path} className="hover:text-finance-blue transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-slate-700">{crumb.label}</span>
                )}
                {index < breadcrumbs.length - 1 && <ChevronRight size={14} className="opacity-50" />}
              </div>
            ))}
          </nav>
        ) : (
          <p className="eyebrow text-[11px] font-bold text-aap-700 uppercase tracking-[0.14em] mb-1">FEAST · FATB Division</p>
        )}
        
        <div className="flex items-start justify-between w-full">
          <div>
            <h1 className="text-2xl font-bold text-ink-900 tracking-tight">{title}</h1>
            {description && <p className="text-sm text-ink-500 mt-1">{description}</p>}
          </div>
          <div className="page-header-side flex items-center gap-3">
            {meta}
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
