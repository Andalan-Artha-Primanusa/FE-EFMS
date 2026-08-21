import type { ReactNode } from "react";

export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="form-section">
      <div className="form-section-head">
        <h3>{title}</h3>
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>
      <div className="form-grid">{children}</div>
    </section>
  );
}

export function FormField({
  label,
  required,
  error,
  hint,
  full,
  children
}: {
  label: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`form-field ${full ? "form-field-full" : ""}`}>
      <span className="form-label">
        {label}
        {required && <b className="text-red-500"> *</b>}
      </span>
      {children}
      {error ? (
        <span className="form-error">{error}</span>
      ) : hint ? (
        <span className="form-hint">{hint}</span>
      ) : null}
    </label>
  );
}

export function FormRow({ children }: { children: ReactNode }) {
  return <div className="form-row-2col">{children}</div>;
}

export function FormActions({
  left,
  children,
  sticky
}: {
  left?: ReactNode;
  children: ReactNode;
  sticky?: boolean;
}) {
  return (
    <div className={`form-actions ${sticky ? "form-actions-sticky" : ""}`}>
      <div>{left}</div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}
