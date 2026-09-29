import React, { useMemo } from "react";

export const SITE_SOW_DEFAULTS: Record<string, Array<{ name: string; unit: string; defaultRate: number; category?: string; isDistanceVar?: boolean; baseDistanceMeters?: number; parentMaterial?: string }>> = {
  BGG: [
    { name: "OVER BURDEN REMOVAL 1 (75%)", unit: "BCM", defaultRate: 27250, category: "Operating & Mining", isDistanceVar: false },
    { name: "OVER BURDEN REMOVAL 2 (25%)", unit: "BCM", defaultRate: 26500, category: "Operating & Mining", isDistanceVar: false },
    { name: "Coal Winning", unit: "Ton", defaultRate: 16500, category: "Operating & Mining", isDistanceVar: false },
    { name: "Over Distance For OB Removal", unit: "BCM", defaultRate: 600, category: "Over Distance", isDistanceVar: true },
    { name: "Over Distance For Coal Winning", unit: "Ton", defaultRate: 500, category: "Over Distance", isDistanceVar: true },
  ],
  POS: [
    // Operation & Mining - A. Production (Base Rates)
    { name: "Overburden/Waste - Base Rate (1000m)", unit: "USD/BCM", defaultRate: 59385, category: "Operating & Mining", isDistanceVar: false },
    { name: "Topsoil Removal - Base Rate (1000m)", unit: "USD/BCM", defaultRate: 60331, category: "Operating & Mining", isDistanceVar: false },
    { name: "Limonite - Base Rate (1000m)", unit: "USD/BCM", defaultRate: 60027, category: "Operating & Mining", isDistanceVar: false },
    { name: "Saprolite - Base Rate (1000m)", unit: "USD/BCM", defaultRate: 61973, category: "Operating & Mining", isDistanceVar: false },

    // Operation & Mining - B. Over Distance (Over/Underhaul)
    { name: "OB/Waste - over/underhaul", unit: "USD/1KM", defaultRate: 9603, category: "Over Distance", isDistanceVar: true },
    { name: "Topsoil Removal - over/underhaul", unit: "USD/1KM", defaultRate: 9603, category: "Over Distance", isDistanceVar: true },
    { name: "Limonite - over/underhaul", unit: "USD/1KM", defaultRate: 9389, category: "Over Distance", isDistanceVar: true },
    { name: "Saprolite - over/underhaul", unit: "USD/1KM", defaultRate: 9389, category: "Over Distance", isDistanceVar: true },

    // Operation & Mining - C. Land Clearing
    { name: "Land Clearing", unit: "USD/m2", defaultRate: 6801, category: "Operating & Mining", isDistanceVar: false },
    { name: "Clear & Grub", unit: "USD/m2", defaultRate: 6801, category: "Operating & Mining", isDistanceVar: false },

    // Rehabilitation
    { name: "Topsoil Reclaim/Haul/Spread - Base Rate (1000m)", unit: "USD/BCM", defaultRate: 58000, category: "Operating & Mining", isDistanceVar: false },
    { name: "Topsoil Reclaim/Haul/Spread - overhaul", unit: "USD/1KM", defaultRate: 9603, category: "Over Distance", isDistanceVar: true },

    // Mine Development (MDO) - Exact Aug MDO order
    { name: "Topsoil Removal - Base Rate (1000m) (MDO)", unit: "USD/BCM", defaultRate: 60331, category: "MDO", isDistanceVar: false },
    { name: "Fill", unit: "USD/BCM", defaultRate: 19795, category: "MDO", isDistanceVar: false },
    { name: "Saprolite - Base Rate (1000m) (MDO)", unit: "USD/BCM", defaultRate: 61973, category: "MDO", isDistanceVar: false },
    { name: "Topsoil Removal - over/underhaul (MDO)", unit: "USD/1KM", defaultRate: 9603, category: "MDO", isDistanceVar: true },
    { name: "Saprolite - over/underhaul (MDO)", unit: "USD/1KM", defaultRate: 9389, category: "MDO", isDistanceVar: true },
    { name: "Cut or Fill under/overhaul", unit: "USD/1KM", defaultRate: 9299, category: "MDO", isDistanceVar: true },

    // Mine Development (MDO) - Additional Contract Items
    { name: "Cut - Base Rate (1000m)", unit: "USD/BCM", defaultRate: 38001, category: "MDO", isDistanceVar: false },
    { name: "Overburden/Waste - Base Rate (1000m) (MDO)", unit: "USD/BCM", defaultRate: 59385, category: "MDO", isDistanceVar: false },
    { name: "OB/Waste - over/underhaul (MDO)", unit: "USD/1KM", defaultRate: 9603, category: "MDO", isDistanceVar: true },
    { name: "Limonite - Base Rate (1000m) (MDO)", unit: "USD/BCM", defaultRate: 60027, category: "MDO", isDistanceVar: false },
    { name: "Limonite - over/underhaul (MDO)", unit: "USD/1KM", defaultRate: 9389, category: "MDO", isDistanceVar: true },
    { name: "Unblasted fill material", unit: "USD/BCM", defaultRate: 59528, category: "MDO", isDistanceVar: false },
    { name: "Excess Cut disposal in dump", unit: "USD/BCM", defaultRate: 20652, category: "MDO", isDistanceVar: false },
    { name: "Uncrushed rocks for construction - Base Rate (1000m)", unit: "USD/BCM", defaultRate: 141688, category: "MDO", isDistanceVar: false },
    { name: "Crusher rocks - Base Rate (1000m)", unit: "USD/BCM", defaultRate: 232934, category: "MDO", isDistanceVar: false },
    { name: "Rocks for construction - under/overhaul", unit: "USD/1KM", defaultRate: 9389, category: "MDO", isDistanceVar: true },
    { name: "Geotextile", unit: "USD/m2", defaultRate: 35752, category: "MDO", isDistanceVar: false },
  ],
  PTRO: [
    { name: "OVER BURDEN REMOVAL", unit: "BCM", defaultRate: 26700, category: "Operating & Mining", isDistanceVar: false },
    { name: "COAL GETTING", unit: "TON", defaultRate: 15050, category: "Operating & Mining", isDistanceVar: false },
    { name: "Overhaul OB", unit: "BCM", defaultRate: 500, category: "Over Distance", isDistanceVar: true, baseDistanceMeters: 1000, parentMaterial: "OVER BURDEN REMOVAL" },
    { name: "Overhaul Coal Getting", unit: "TON", defaultRate: 230, category: "Over Distance", isDistanceVar: true, baseDistanceMeters: 3000, parentMaterial: "COAL GETTING" },
  ],
  DBK: [
    { name: "OVER BURDEN REMOVAL", unit: "BCM", defaultRate: 26700, category: "Operating & Mining", isDistanceVar: false },
    { name: "COAL GETTING", unit: "TON", defaultRate: 15050, category: "Operating & Mining", isDistanceVar: false },
    { name: "Overhaul OB", unit: "BCM", defaultRate: 500, category: "Over Distance", isDistanceVar: true, baseDistanceMeters: 1000, parentMaterial: "OVER BURDEN REMOVAL" },
    { name: "Overhaul Coal Getting", unit: "TON", defaultRate: 230, category: "Over Distance", isDistanceVar: true, baseDistanceMeters: 3000, parentMaterial: "COAL GETTING" },
  ],
  ABN: [
    { name: "Bulldozer D8R Rental", unit: "Hours", defaultRate: 2200000, category: "Operating & Mining", isDistanceVar: false },
    { name: "Bulldozer D85ESS Rental", unit: "Hours", defaultRate: 1950000, category: "Operating & Mining", isDistanceVar: false },
    { name: "Motor Grader 160K", unit: "Hours", defaultRate: 1720000, category: "Operating & Mining", isDistanceVar: false },
  ],
  SBS: [
    { name: "PIT E - DISPOSAL SEKATAN", unit: "BCM", defaultRate: 22654, category: "Operating & Mining", isDistanceVar: false },
    { name: "PIT E - RENCANA JALAN", unit: "BCM", defaultRate: 12638, category: "Operating & Mining", isDistanceVar: false },
    { name: "PIT E - RENCANA CSA", unit: "BCM", defaultRate: 8346, category: "Operating & Mining", isDistanceVar: false },
    { name: "PIT E - JALAN BARITO", unit: "BCM", defaultRate: 15500, category: "Operating & Mining", isDistanceVar: false },
    { name: "PIT E - SEKATAN", unit: "BCM", defaultRate: 16931, category: "Operating & Mining", isDistanceVar: false },
    { name: "PIT E - TS MAHONI", unit: "BCM", defaultRate: 22654, category: "Operating & Mining", isDistanceVar: false },
    { name: "PIT E - IPD WARWEFILL", unit: "BCM", defaultRate: 8346, category: "Operating & Mining", isDistanceVar: false },
    { name: "PIT E - SEKATAN (High Rate)", unit: "BCM", defaultRate: 19375, category: "Operating & Mining", isDistanceVar: false },
    { name: "Bulldozer DZ709", unit: "Hours", defaultRate: 1980000, category: "Penunjang", isDistanceVar: false },
    { name: "Bulldozer DZ716", unit: "Hours", defaultRate: 1980000, category: "Penunjang", isDistanceVar: false },
    { name: "Excavator EX815", unit: "Hours", defaultRate: 1425000, category: "Penunjang", isDistanceVar: false },
    { name: "Excavator EX816", unit: "Hours", defaultRate: 1425000, category: "Penunjang", isDistanceVar: false },
    { name: "Excavator EX817", unit: "Hours", defaultRate: 1425000, category: "Penunjang", isDistanceVar: false },
    { name: "Motor Grader MG607", unit: "Hours", defaultRate: 1250000, category: "Penunjang", isDistanceVar: false },
    { name: "Motor Grader MG608", unit: "Hours", defaultRate: 1250000, category: "Penunjang", isDistanceVar: false },
    { name: "Dozer CAT D10 - BDCT 1001", unit: "Hours", defaultRate: 1980000, category: "Penunjang", isDistanceVar: false },
    { name: "Dozer CAT D10 - BDCT 1002", unit: "Hours", defaultRate: 1980000, category: "Penunjang", isDistanceVar: false },
    { name: "Excavator CAT 395 - EXCT 3901", unit: "Hours", defaultRate: 1425000, category: "Penunjang", isDistanceVar: false },
    { name: "Excavator CAT 395 - EXCT 3902", unit: "Hours", defaultRate: 1425000, category: "Penunjang", isDistanceVar: false },
    { name: "Denda ketidaktercapaian MA", unit: "Lot", defaultRate: 0, category: "Pengurang Biaya", isDistanceVar: false },
    { name: "Kelebihan Pemakaian BBM Loader", unit: "Lot", defaultRate: 0, category: "Pengurang Biaya", isDistanceVar: false },
    { name: "Kelebihan Pemakaian BBM Hauler", unit: "Lot", defaultRate: 0, category: "Pengurang Biaya", isDistanceVar: false },
    { name: "Denda ketidakcapaian Volume", unit: "Lot", defaultRate: 0, category: "Pengurang Biaya", isDistanceVar: false },
  ]
};

export function getSiteSOWList(
  customerCode: string,
  activeSOWCatalog: any[] = [],
  mRate?: number,
  categoryFilter?: "Operating & Mining" | "Penunjang" | "MDO" | "Pengurang Biaya" | "Over Distance" | "All",
  isDistanceOnly: boolean = false,
  parentItems: any[] = []
) {
  const code = (customerCode || "POS").toUpperCase();
  const defs = SITE_SOW_DEFAULTS[code] || SITE_SOW_DEFAULTS["POS"] || [];
  
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
        defaultRate: c.defaultRate || c.rateIDR || (c.rateUSD ? Number((c.rateUSD * (mRate || 17923.30)).toFixed(3)) : 0),
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

  // 2. Only add static defaults if not already present from live catalog
  defs.forEach(d => {
    const key = (d.name || "").toLowerCase().trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      const isDed = (d.category || "").toLowerCase().includes("pengurang") || (d.name || "").toLowerCase().includes("denda") || (d.name || "").toLowerCase().includes("kelebihan");
      const dynRate = (d as any).rateUSD ? Number(((d as any).rateUSD * (mRate || 17923.30)).toFixed(3)) : d.defaultRate;
      merged.push({ ...d, defaultRate: dynRate, isDeduction: isDed });
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
