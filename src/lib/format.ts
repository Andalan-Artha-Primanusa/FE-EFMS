import { money } from "./api";

export function humanize(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/_/g, " ").replace(/^./, (char) => char.toUpperCase());
}

export function formatCell(value: unknown) {
  if (value === null || value === undefined) return "-";
  if (Array.isArray(value)) return value.map(formatCell).join(", ");
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return entries.length
      ? entries.map(([key, item]) => `${humanize(key)}: ${formatCell(item)}`).join(", ")
      : "-";
  }
  if (typeof value === "number" && value > 1000000) return money(value);
  return String(value);
}
