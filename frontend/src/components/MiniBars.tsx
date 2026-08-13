import { useMemo } from "react";
import { compactMoney } from "../lib/api";

export function MiniBars({ data }: { data: Array<Record<string, number | string>> }) {
  const max = useMemo(() => Math.max(1, ...data.map((item) => Number(item.value) || 0)), [data]);
  return <div className="mini-bars">{data.map((item) => {
    const value = Number(item.value) || 0;
    return <div key={String(item.label)}><span>{item.label}</span><div><b style={{ width: `${(value / max) * 100}%` }} /></div><strong>{compactMoney(value * 1_000_000)}</strong></div>;
  })}</div>;
}
