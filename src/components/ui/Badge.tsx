import React, { HTMLAttributes, ReactNode } from "react";
import * as LucideIcons from "lucide-react";

export type BadgeTone = "go" | "caution" | "stop" | "info" | "idle" | "brand";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  dot?: boolean;
  icon?: string | ReactNode;
  children: ReactNode;
}

const renderIcon = (icon: string | ReactNode, size: number) => {
  if (!icon) return null;
  if (typeof icon !== "string") return icon;
  
  const pascalName = icon
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("") as keyof typeof LucideIcons;
  
  const IconComponent = (LucideIcons[pascalName] || LucideIcons.Info) as React.ComponentType<{ size?: number; className?: string }>;
  return <IconComponent size={size} />;
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  tone = "idle",
  dot = false,
  icon,
  className = "",
  ...props
}) => {
  const toneStyles: Record<BadgeTone, { bg: string; text: string; dot: string }> = {
    go: { bg: "bg-[#E4F1E9]", text: "text-[#2E7D53]", dot: "bg-[#2E7D53]" },
    caution: { bg: "bg-[#FBF0D9]", text: "text-[#C98A12]", dot: "bg-[#C98A12]" },
    stop: { bg: "bg-[#F8E6E3]", text: "text-[#B3352B]", dot: "bg-[#B3352B]" },
    info: { bg: "bg-[#E3EDF3]", text: "text-[#2C5F80]", dot: "bg-[#2C5F80]" },
    idle: { bg: "bg-ink-100", text: "text-ink-700", dot: "bg-ink-500" },
    brand: { bg: "bg-aap-100", text: "text-aap-800", dot: "bg-aap-600" }
  };

  const current = toneStyles[tone] || toneStyles.idle;

  return (
    <span
      className={`inline-flex items-center gap-1.5 min-h-[22px] px-2.5 rounded-full text-[11px] font-bold uppercase tracking-[0.06em] whitespace-nowrap select-none ${current.bg} ${current.text} ${className}`.trim()}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${current.dot}`} />}
      {icon && renderIcon(icon, 12)}
      <span>{children}</span>
    </span>
  );
};

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "default" | "brand" | "dark";
  children: ReactNode;
}

export const Tag: React.FC<TagProps> = ({
  children,
  tone = "default",
  className = "",
  ...props
}) => {
  const toneStyles = tone === "brand"
    ? "bg-aap-50 border-aap-300 text-aap-800"
    : tone === "dark"
    ? "bg-ink-900 border-ink-800 text-ink-100"
    : "bg-white border-ink-200 text-ink-700";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-[3px] border text-[11px] font-mono font-medium tabular-nums ${toneStyles} ${className}`.trim()}
      {...props}
    >
      {children}
    </span>
  );
};
