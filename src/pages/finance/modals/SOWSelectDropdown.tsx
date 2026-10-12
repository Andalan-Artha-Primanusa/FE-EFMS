import React, { useMemo } from "react";

export function getSiteSOWList(
  customerCode: string,
  activeSOWCatalog: any[] = [],
  mRate?: number,
  categoryFilter?: "Operating & Mining" | "Penunjang" | "MDO" | "Pengurang Biaya" | "Over Distance" | "All",
  isDistanceOnly: boolean = false,
  parentItems: any[] = []
) {
  // Daftar item hanya dari katalog Master Variable SOW (BE); tidak ada tarif bawaan.
  const code = (customerCode || "").toUpperCase();
  
  const matchedFromCatalog = (activeSOWCatalog || []).filter(s => {
    if (!s) return false;
    const c = (s.customer || s.customerCode || "").toUpperCase();
    return !c || c === code || (code === "POS" && (!c || c === "POS"));
  });

  const merged: Array<{ name: string; unit: string; defaultRate: number; category?: string; isDistanceVar?: boolean; isDeduction?: boolean; parentMaterial?: string; baseDistanceMeters?: number; tier1Rate?: number; tier2Rate?: number; tier3Rate?: number; splitPercentage?: number }> = [];
  const seen = new Set<string>();

  // 1. Process real-time master data catalog FIRST
  matchedFromCatalog.forEach(c => {
    const name = c.name || c.itemName;
    const key = (name || "").toLowerCase().trim();
    if (code === "SBS" && (key === "dozer cat d10" || key === "excavator cat 395")) {
      return;
    }
    if (key && !seen.has(key)) {
      seen.add(key);
      const isMDO = (c.category || "").toLowerCase().includes("mdo");
      const isDist = key.includes("overhaul") || key.includes("underhaul") || key.includes("distance") || (c.category || "").toLowerCase().includes("distance");
      const isDed = (c.category || "").toLowerCase().includes("pengurang") || (name || "").toLowerCase().includes("denda") || (name || "").toLowerCase().includes("kelebihan") || Boolean(c.isDeduction);
      merged.push({
        name: name,
        unit: c.unit || "BCM",
        defaultRate: c.defaultRate || c.rateIDR || (c.rateUSD ? Number((c.rateUSD * (mRate || 0)).toFixed(3)) : 0),
        category: isMDO ? "MDO" : (isDed ? "Pengurang Biaya" : isDist ? "Over Distance" : (c.category || "Operating & Mining")),
        isDistanceVar: isDist,
        isDeduction: isDed,
        baseDistanceMeters: c.baseDistanceMeters,
        tier1Rate: c.tier1Rate,
        tier2Rate: c.tier2Rate,
        tier3Rate: c.tier3Rate,
        splitPercentage: c.splitPercentage,
        parentMaterial: c.parentMaterial,
      });
    }
  });

  // Dynamic custom distance options derived from active parent items
  if (isDistanceOnly || categoryFilter === "Over Distance") {
    (parentItems || []).forEach(p => {
      const pMat = (p.material || "").trim();
      if (!pMat || pMat === "Lainnya" || p.isDistanceVar || (p.category || "").includes("Distance")) return;
      const isCoal = pMat.toLowerCase().includes("coal") || pMat.toLowerCase().includes("batubara");
      const distName = pMat.toLowerCase().startsWith("over") ? pMat : (code === "BGG" ? (isCoal ? "Over Distance For Coal Winning" : "Over Distance For OB Removal") : `Over/Underhaul For ${pMat}`);
      const distKey = distName.toLowerCase();
      if (!seen.has(distKey)) {
        seen.add(distKey);
        const defDistRate = code === "PTRO" || code === "DBK" 
          ? (isCoal ? 230 : 500) 
          : code === "BGG" 
            ? (isCoal ? 500 : 600) 
            : 8608;
        merged.push({
          name: distName,
          unit: p.unit || (isCoal ? "Ton" : "BCM"),
          defaultRate: defDistRate,
          category: "Over Distance",
          isDistanceVar: true,
          isDeduction: false,
          parentMaterial: pMat
        });
      }
    });
  }

  const filtered = merged.filter(item => {
    if (isDistanceOnly) return Boolean(item.isDistanceVar);
    if (categoryFilter === "All") {
      return true;
    }
    if (categoryFilter === "Pengurang Biaya") {
      return item.isDeduction || (item.category || "").toLowerCase().includes("pengurang") || (item.name || "").toLowerCase().includes("denda") || (item.name || "").toLowerCase().includes("kelebihan");
    }
    if (categoryFilter === "Penunjang") {
      return (item.category || "").toLowerCase().includes("penunjang") || item.unit === "Hours";
    }
    if (categoryFilter === "MDO") {
      return (item.category || "").toLowerCase().includes("mdo");
    }
    if (categoryFilter === "Operating & Mining") {
      return !item.isDeduction && !(item.category || "").toLowerCase().includes("pengurang") && !(item.category || "").toLowerCase().includes("mdo") && !(item.category || "").toLowerCase().includes("penunjang") && item.unit !== "Hours";
    }
    if (categoryFilter === "Over Distance") {
      return Boolean(item.isDistanceVar);
    }
    return true;
  });

  // Always append "Lainnya" at the end for custom user entries
  filtered.push({
    name: "Lainnya",
    unit: categoryFilter === "Penunjang" ? "Hours" : categoryFilter === "Pengurang Biaya" ? "Lot" : "BCM",
    defaultRate: 0,
    category: categoryFilter === "Pengurang Biaya" ? "Pengurang Biaya" : categoryFilter === "Penunjang" ? "Penunjang" : isDistanceOnly || categoryFilter === "Over Distance" ? "Over Distance" : "Operating & Mining",
    isDistanceVar: isDistanceOnly || categoryFilter === "Over Distance",
    isDeduction: categoryFilter === "Pengurang Biaya"
  });

  return filtered;
}

export function SOWSelectDropdown({
  value,
  onChange,
  onSelectSow,
  customerCode,
  activeSOWCatalog = [],
  mRate,
  categoryFilter,
  isDistanceOnly = false,
  parentItems = [],
  className = ""
}: {
  value: string;
  onChange: (val: string) => void;
  onSelectSow: (sow: { name: string; unit: string; defaultRate: number; isDistanceVar?: boolean; category?: string; isDeduction?: boolean; parentMaterial?: string; baseDistanceMeters?: number; tier1Rate?: number; tier2Rate?: number; tier3Rate?: number }) => void;
  customerCode: string;
  activeSOWCatalog?: any[];
  mRate?: number;
  categoryFilter?: "Operating & Mining" | "Penunjang" | "MDO" | "Pengurang Biaya" | "Over Distance" | "All";
  isDistanceOnly?: boolean;
  parentItems?: any[];
  className?: string;
}) {
  const options = useMemo(() => {
    return getSiteSOWList(customerCode, activeSOWCatalog, mRate, categoryFilter, isDistanceOnly, parentItems);
  }, [customerCode, activeSOWCatalog, mRate, categoryFilter, isDistanceOnly, parentItems]);

  const handleChange = (selectedName: string) => {
    onChange(selectedName);
    const found = options.find(o => o.name === selectedName);
    if (found) {
      onSelectSow(found);
    }
  };

  return (
    <select
      className={className || "w-full bg-cyan-50/60 hover:bg-cyan-50 focus:bg-white border border-cyan-300 focus:border-cyan-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 outline-none transition cursor-pointer shadow-2xs"}
      value={value || ""}
      onChange={(e) => handleChange(e.target.value)}
    >
      <option value="" disabled>-- Pilih {isDistanceOnly ? "Variabel Jarak / Overhaul" : categoryFilter === "Penunjang" ? "Alat Berat / Unit" : categoryFilter === "Pengurang Biaya" ? "Pengurang Biaya / Denda" : "Master SOW"} --</option>
      {options.map((opt, idx) => (
        <option key={idx} value={opt.name}>
          {opt.name}
        </option>
      ))}
      {value && !options.some(o => o.name === value) && (
        <option value={value}>{value}</option>
      )}
    </select>
  );
}
