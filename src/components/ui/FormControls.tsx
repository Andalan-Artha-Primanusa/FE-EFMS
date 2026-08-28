import React, { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode, forwardRef } from "react";
import * as LucideIcons from "lucide-react";

// ================= Field Wrapper =================
export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
}

export const Field: React.FC<FieldProps> = ({
  label,
  hint,
  error,
  required = false,
  htmlFor,
  children,
  className = "",
  ...props
}) => {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`.trim()} {...props}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-600 select-none flex items-center gap-1"
        >
          <span>{label}</span>
          {required && <span className="text-[#B3352B] font-bold">*</span>}
        </label>
      )}
      {children}
      {(error || hint) && (
        <span className={`text-xs ${error ? "text-[#B3352B] font-semibold" : "text-ink-500"}`}>
          {error || hint}
        </span>
      )}
    </div>
  );
};

// ================= Input Control =================
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  sizeVariant?: "sm" | "md" | "lg";
  icon?: string | ReactNode;
  invalid?: boolean;
  block?: boolean;
}

const renderIcon = (icon: string | ReactNode, size: number) => {
  if (!icon) return null;
  if (typeof icon !== "string") return icon;
  
  const pascalName = icon
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("") as keyof typeof LucideIcons;
  
  const IconComponent = (LucideIcons[pascalName] || LucideIcons.Search) as React.ComponentType<{ size?: number; className?: string }>;
  return <IconComponent size={size} />;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  sizeVariant = "md",
  icon,
  invalid = false,
  disabled = false,
  block = true,
  className = "",
  ...props
}, ref) => {
  const sizeStyles = {
    sm: "h-8 text-xs px-2.5",
    md: "h-9 text-sm px-3",
    lg: "h-11 text-base px-4"
  };

  const iconSize = sizeVariant === "lg" ? 18 : sizeVariant === "sm" ? 14 : 15;

  return (
    <div
      className={`relative inline-flex items-center rounded-[3px] border transition-all duration-140 bg-white ${
        disabled ? "bg-ink-100 opacity-60 cursor-not-allowed" : ""
      } ${
        invalid
          ? "border-[#B3352B] focus-within:ring-2 focus-within:ring-[#B3352B]/20"
          : "border-ink-300 focus-within:border-aap-500 focus-within:ring-2 focus-within:ring-aap-500/20"
      } ${block ? "w-full" : ""}`}
    >
      {icon && (
        <div className="pl-3 pr-1 text-ink-400 shrink-0 pointer-events-none">
          {renderIcon(icon, iconSize)}
        </div>
      )}
      <input
        ref={ref}
        disabled={disabled}
        className={`w-full bg-transparent border-0 outline-none text-ink-900 placeholder:text-ink-400 font-sans ${sizeStyles[sizeVariant]} ${className}`.trim()}
        {...props}
      />
    </div>
  );
});
Input.displayName = "Input";

// ================= Select Control =================
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  sizeVariant?: "sm" | "md" | "lg";
  options?: Array<string | { label: string; value: string | number }>;
  invalid?: boolean;
  block?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  sizeVariant = "md",
  options,
  children,
  invalid = false,
  disabled = false,
  block = true,
  className = "",
  ...props
}, ref) => {
  const sizeStyles = {
    sm: "h-8 text-xs pl-2.5 pr-7",
    md: "h-9 text-sm pl-3 pr-8",
    lg: "h-11 text-base pl-4 pr-9"
  };

  return (
    <div className={`relative inline-flex items-center ${block ? "w-full" : ""}`}>
      <select
        ref={ref}
        disabled={disabled}
        className={`w-full appearance-none rounded-[3px] border bg-white text-ink-900 transition-all duration-140 font-sans outline-none cursor-pointer ${
          disabled ? "bg-ink-100 opacity-60 cursor-not-allowed" : ""
        } ${
          invalid
            ? "border-[#B3352B] focus:ring-2 focus:ring-[#B3352B]/20"
            : "border-ink-300 focus:border-aap-500 focus:ring-2 focus:ring-aap-500/20"
        } ${sizeStyles[sizeVariant]} ${className}`.trim()}
        {...props}
      >
        {options
          ? options.map((opt) => {
              if (typeof opt === "string") {
                return <option key={opt} value={opt}>{opt}</option>;
              }
              return <option key={opt.value} value={opt.value}>{opt.label}</option>;
            })
          : children}
      </select>
      <div className="absolute right-2.5 pointer-events-none text-ink-500">
        <LucideIcons.ChevronDown size={14} />
      </div>
    </div>
  );
});
Select.displayName = "Select";

// ================= Textarea Control =================
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  block?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  invalid = false,
  disabled = false,
  block = true,
  className = "",
  rows = 3,
  ...props
}, ref) => {
  return (
    <textarea
      ref={ref}
      rows={rows}
      disabled={disabled}
      className={`rounded-[3px] border p-3 bg-white text-sm text-ink-900 transition-all duration-140 font-sans outline-none placeholder:text-ink-400 ${
        disabled ? "bg-ink-100 opacity-60 cursor-not-allowed" : ""
      } ${
        invalid
          ? "border-[#B3352B] focus:ring-2 focus:ring-[#B3352B]/20"
          : "border-ink-300 focus:border-aap-500 focus:ring-2 focus:ring-aap-500/20"
      } ${block ? "w-full" : ""} ${className}`.trim()}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

// ================= Checkbox Control =================
export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked = false,
  disabled = false,
  className = "",
  onChange,
  ...props
}) => {
  return (
    <label className={`inline-flex items-center gap-2.5 text-sm select-none ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="sr-only peer"
        {...props}
      />
      <span className="w-4 h-4 rounded-[2px] border border-ink-400 bg-white flex items-center justify-center transition-all duration-140 peer-checked:bg-aap-500 peer-checked:border-aap-500 peer-focus-visible:ring-2 peer-focus-visible:ring-aap-500/30">
        <LucideIcons.Check size={12} className="text-white opacity-0 peer-checked:opacity-100 stroke-[3]" />
      </span>
      {label && <span className="text-ink-800 font-medium">{label}</span>}
    </label>
  );
};

// ================= Radio Control =================
export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
}

export const Radio: React.FC<RadioProps> = ({
  label,
  checked = false,
  disabled = false,
  name,
  value,
  onChange,
  className = "",
  ...props
}) => {
  return (
    <label className={`inline-flex items-center gap-2.5 text-sm select-none ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="sr-only peer"
        {...props}
      />
      <span className="w-4 h-4 rounded-full border border-ink-400 bg-white flex items-center justify-center transition-all duration-140 peer-checked:border-aap-500 peer-focus-visible:ring-2 peer-focus-visible:ring-aap-500/30">
        <span className="w-2 h-2 rounded-full bg-aap-500 opacity-0 peer-checked:opacity-100 transition-opacity duration-100" />
      </span>
      {label && <span className="text-ink-800 font-medium">{label}</span>}
    </label>
  );
};

// ================= Switch Control =================
export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
}

export const Switch: React.FC<SwitchProps> = ({
  label,
  checked = false,
  disabled = false,
  onChange,
  className = "",
  ...props
}) => {
  return (
    <label className={`inline-flex items-center gap-3 text-sm select-none ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="sr-only peer"
        {...props}
      />
      <span className="w-9 h-5 rounded-full bg-ink-300 relative inline-flex items-center transition-colors duration-140 peer-checked:bg-aap-500 peer-focus-visible:ring-2 peer-focus-visible:ring-aap-500/30">
        <span className="w-3.5 h-3.5 rounded-full bg-white transition-transform duration-140 translate-x-0.5 peer-checked:translate-x-4.5 shadow-sm" />
      </span>
      {label && <span className="text-ink-800 font-medium">{label}</span>}
    </label>
  );
};
