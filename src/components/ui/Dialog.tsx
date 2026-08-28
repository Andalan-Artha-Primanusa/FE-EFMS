import React, { ReactNode, useEffect } from "react";
import { X } from "lucide-react";
import { IconButton } from "./Button";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  eyebrow?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl";
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  maxWidth = "lg"
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const maxWidthStyles: Record<string, string> = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "4xl": "max-w-4xl"
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Scrim with 42% ink opacity + 2px blur */}
      <div
        className="fixed inset-0 bg-ink-900/40 backdrop-blur-[2px] transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Dialog Panel: 6px radius, warm border, 3px top brand rule */}
      <div
        className={`relative z-10 w-full ${maxWidthStyles[maxWidth]} rounded-[6px] border border-ink-200 border-t-[3px] border-t-aap-500 bg-white shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in`}
      >
        {(title || eyebrow) && (
          <header className="flex items-start justify-between p-5 pb-3 border-b border-ink-200 bg-white">
            <div>
              {eyebrow && (
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-aap-700 mb-0.5">
                  {eyebrow}
                </div>
              )}
              {title && (
                <h3 className="text-base sm:text-lg font-bold text-ink-900 leading-snug">
                  {title}
                </h3>
              )}
            </div>
            <IconButton icon={<X size={17} />} size="sm" onClick={onClose} label="Tutup" />
          </header>
        )}

        <div className="p-5 overflow-y-auto flex-1 text-sm text-ink-800">
          {children}
        </div>

        {footer && (
          <footer className="flex items-center justify-end gap-3 p-4 bg-ink-50 border-t border-ink-200">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
};
