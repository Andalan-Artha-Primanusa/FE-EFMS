// RupiahInput — Reusable IDR currency input with auto thousand-separator
// Source: extracted from FinancePage.tsx L391–L431

import { formatThousand, parseNumber } from "../../../utils/finance/formatters";

export function RupiahInput({
  label,
  value,
  onChange,
  required,
  placeholder,
  helperText
}: {
  label: string;
  value: number | string;
  onChange: (val: number) => void;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
}) {
  const displayVal = (value === 0 || value === "0" || !value) ? "" : formatThousand(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = parseNumber(e.target.value);
    onChange(rawVal);
  };

  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 mb-1">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-2.5 text-xs font-extrabold text-slate-400">Rp</span>
        <input
          type="text"
          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 pl-9 text-slate-900 font-mono font-bold focus:border-cyan-700 focus:bg-white outline-none text-xs"
          placeholder={placeholder || "0"}
          value={displayVal}
          onFocus={(e) => e.target.select()}
          onChange={handleChange}
          required={required}
        />
      </div>
      {helperText && <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{helperText}</p>}
    </div>
  );
}
