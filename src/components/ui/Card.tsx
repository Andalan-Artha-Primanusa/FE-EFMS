import React, { HTMLAttributes, ReactNode } from "react";

export type CardTone = "default" | "soft" | "dark";
export type CardPadding = "default" | "compact" | "none";

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  tone?: CardTone;
  padding?: CardPadding;
  accent?: boolean; // 3px top brand rule
  children?: ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  eyebrow,
  actions,
  tone = "default",
  padding = "default",
  accent = false,
  className = "",
  ...props
}) => {
  const toneStyles: Record<CardTone, string> = {
    default: "bg-white border-ink-200 text-ink-800 shadow-sm",
    soft: "bg-aap-50/70 border-aap-200 text-ink-800",
    dark: "bg-ink-900 border-ink-800 text-ink-50"
  };

  const paddingStyles: Record<CardPadding, string> = {
    default: "p-6",
    compact: "p-4",
    none: "p-0"
  };

  const accentStyles = accent ? "border-t-[3px] border-t-aap-500" : "";

  return (
    <section
      className={`rounded-[4px] border transition-shadow duration-140 ${toneStyles[tone]} ${paddingStyles[padding]} ${accentStyles} ${className}`.trim()}
      {...props}
    >
      {(title || eyebrow || actions) && (
        <header className={`flex items-start justify-between gap-4 ${padding === "none" ? "p-5 pb-3 border-b border-ink-200" : "mb-5"}`}>
          <div>
            {eyebrow && (
              <div className={`text-[11px] font-bold uppercase tracking-[0.14em] mb-1 ${tone === "dark" ? "text-aap-300" : "text-aap-700"}`}>
                {eyebrow}
              </div>
            )}
            {title && (
              <h3 className={`text-base sm:text-lg font-bold leading-snug ${tone === "dark" ? "text-white" : "text-ink-900"}`}>
                {title}
              </h3>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
};
