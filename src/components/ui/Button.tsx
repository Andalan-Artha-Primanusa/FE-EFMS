import React, { ButtonHTMLAttributes, ReactNode } from "react";
import * as LucideIcons from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "dark" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string | ReactNode;
  iconAfter?: string | ReactNode;
  block?: boolean;
  loading?: boolean;
}

const renderIcon = (icon: string | ReactNode, size: number) => {
  if (!icon) return null;
  if (typeof icon !== "string") return icon;
  
  // Convert kebab-case or PascalCase string to Lucide Icon component
  const pascalName = icon
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("") as keyof typeof LucideIcons;
  
  const IconComponent = (LucideIcons[pascalName] || LucideIcons.Sparkles) as React.ComponentType<{ size?: number; className?: string }>;
  return <IconComponent size={size} />;
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconAfter,
  block = false,
  loading = false,
  disabled = false,
  className = "",
  type = "button",
  ...props
}) => {
  const isDisabled = disabled || loading;

  const baseStyles = "inline-flex items-center justify-center font-semibold tracking-wider uppercase transition-colors duration-140 select-none cursor-pointer";
  
  const sizeStyles: Record<ButtonSize, string> = {
    sm: "h-8 px-3 text-[11px] gap-1.5 rounded-[3px]",
    md: "h-9 px-4 text-xs gap-2 rounded-[3px]",
    lg: "h-11 px-6 text-sm gap-2.5 rounded-[3px]"
  };

  const variantStyles: Record<ButtonVariant, string> = {
    primary: "bg-aap-500 hover:bg-aap-600 active:bg-aap-700 text-white border border-aap-500 shadow-sm",
    secondary: "bg-transparent hover:bg-aap-50 active:bg-aap-100 text-aap-700 border border-ink-300",
    ghost: "bg-transparent hover:bg-ink-100 active:bg-ink-200 text-ink-700 border border-transparent",
    dark: "bg-ink-900 hover:bg-ink-800 active:bg-ink-700 text-ink-50 border border-ink-900 shadow-sm",
    danger: "bg-[#B3352B] hover:bg-[#9C2D24] active:bg-[#87271F] text-white border border-[#B3352B] shadow-sm"
  };

  const disabledStyles = isDisabled ? "opacity-45 cursor-not-allowed pointer-events-none" : "";
  const blockStyles = block ? "w-full flex" : "";
  const iconSize = size === "lg" ? 18 : size === "sm" ? 14 : 16;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${disabledStyles} ${blockStyles} ${className}`.trim()}
      {...props}
    >
      {loading ? (
        <LucideIcons.Loader2 size={iconSize} className="animate-spin" />
      ) : (
        icon && renderIcon(icon, iconSize)
      )}
      {children && <span>{children}</span>}
      {!loading && iconAfter && renderIcon(iconAfter, iconSize)}
    </button>
  );
};

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string | ReactNode;
  variant?: ButtonVariant | "outline";
  size?: ButtonSize;
  label?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  variant = "ghost",
  size = "md",
  label,
  disabled = false,
  className = "",
  type = "button",
  ...props
}) => {
  const sizeStyles: Record<ButtonSize, string> = {
    sm: "w-8 h-8 rounded-[3px]",
    md: "w-9 h-9 rounded-[3px]",
    lg: "w-11 h-11 rounded-[3px]"
  };

  const variantStyles = variant === "outline" 
    ? "bg-white hover:bg-aap-50 active:bg-aap-100 text-ink-700 border border-ink-200"
    : variant === "primary"
    ? "bg-aap-500 hover:bg-aap-600 active:bg-aap-700 text-white border border-aap-500"
    : variant === "dark"
    ? "bg-ink-900 hover:bg-ink-800 text-white border border-ink-900"
    : variant === "danger"
    ? "bg-[#B3352B] hover:bg-[#9C2D24] text-white border border-[#B3352B]"
    : "bg-transparent hover:bg-ink-100 active:bg-ink-200 text-ink-700 border border-transparent";

  const iconSize = size === "lg" ? 18 : size === "sm" ? 15 : 16;

  return (
    <button
      type={type}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center transition-colors duration-140 ${sizeStyles[size]} ${variantStyles} ${disabled ? "opacity-45 cursor-not-allowed" : "cursor-pointer"} ${className}`.trim()}
      {...props}
    >
      {renderIcon(icon, iconSize)}
    </button>
  );
};
