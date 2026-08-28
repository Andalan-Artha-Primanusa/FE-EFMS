import React, { ReactNode } from "react";
import * as LucideIcons from "lucide-react";

export type TabVariant = "line" | "segmented";

export interface TabItem {
  id: string;
  label: ReactNode;
  icon?: string | ReactNode;
  badge?: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  variant?: TabVariant;
  className?: string;
}

const renderIcon = (icon: string | ReactNode, size: number) => {
  if (!icon) return null;
  if (typeof icon !== "string") return icon;
  
  const pascalName = icon
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("") as keyof typeof LucideIcons;
  
  const IconComponent = (LucideIcons[pascalName] || LucideIcons.Layers) as React.ComponentType<{ size?: number; className?: string }>;
  return <IconComponent size={size} />;
};

export const Tabs: React.FC<TabsProps> = ({
  items,
  value,
  onChange,
  variant = "line",
  className = ""
}) => {
  if (variant === "segmented") {
    return (
      <div className={`inline-flex items-center p-1 bg-ink-100/80 rounded-[4px] border border-ink-200 gap-1 ${className}`.trim()}>
        {items.map((item) => {
          const isActive = value === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-[3px] text-xs font-semibold uppercase tracking-wider transition-all duration-140 select-none cursor-pointer ${
                isActive
                  ? "bg-white text-aap-700 shadow-sm border border-ink-200/60"
                  : "text-ink-600 hover:text-ink-900 hover:bg-white/40 border border-transparent"
              }`}
            >
              {item.icon && renderIcon(item.icon, 14)}
              <span>{item.label}</span>
              {item.badge && (
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${isActive ? "bg-aap-100 text-aap-800" : "bg-ink-200 text-ink-700"}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`flex items-center border-b border-ink-200 gap-6 ${className}`.trim()}>
      {items.map((item) => {
        const isActive = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`relative pb-3 pt-1 text-sm font-semibold tracking-wide transition-colors duration-140 inline-flex items-center gap-2 select-none cursor-pointer ${
              isActive
                ? "text-aap-700 font-bold"
                : "text-ink-500 hover:text-ink-800"
            }`}
          >
            {item.icon && renderIcon(item.icon, 15)}
            <span>{item.label}</span>
            {item.badge && (
              <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded-full ${isActive ? "bg-aap-100 text-aap-800" : "bg-ink-100 text-ink-600"}`}>
                {item.badge}
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-aap-500 rounded-t-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};
