import React, { useState } from "react";
import { Plus, ChevronDown, Pickaxe, Layers, Fuel } from "lucide-react";

interface BAAddRowDropdownProps {
  formData: any;
  baOperatingItems: any[];
  setBaOperatingItems: React.Dispatch<React.SetStateAction<any[]>>;
}

export function BAAddRowDropdown({
  formData,
  baOperatingItems,
  setBaOperatingItems,
}: BAAddRowDropdownProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const isCustomerBGG = formData.customerCode === "BGG" || formData.customerCode === "PT BGG";

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className="text-[11px] font-bold text-cyan-800 bg-cyan-100 hover:bg-cyan-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer border border-cyan-300 shadow-2xs"
      >
        <Plus size={13} />
        <span>Tambah Baris</span>
        <ChevronDown size={12} className={`transition-transform duration-200 ${showDropdown ? "rotate-180" : ""}`} />
      </button>

      {showDropdown && (
        <div
          className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-1 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100"
          onMouseLeave={() => setShowDropdown(false)}
        >
          <button
            type="button"
            onClick={() => {
              setBaOperatingItems([
                ...baOperatingItems,
                {
                  id: `op_${Date.now()}`,
                  category: "Operating & Mining",
                  area: isCustomerBGG ? "Pit KKL" : "WM1",
                  material: "",
                  unit: "BCM",
                  initialVolume: 0,
                  adjustedVolume: 0,
                  rate: 0,
                  subtotalInitial: 0,
                  subtotalAdjusted: 0,
                },
              ]);
              setShowDropdown(false);
            }}
            className="w-full text-left px-3.5 py-2.5 text-xs text-slate-800 hover:bg-cyan-50 hover:text-cyan-950 font-bold flex items-center gap-2.5 transition cursor-pointer"
          >
            <div className="w-6 h-6 rounded-lg bg-cyan-100 flex items-center justify-center text-cyan-800 shrink-0">
              <Pickaxe size={13} />
            </div>
            <div>
              <div className="font-bold">Variabel Material</div>
              <div className="text-[10px] text-slate-500 font-normal">Volume Produksi Batubara / OB / Tanah</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setBaOperatingItems([
                ...baOperatingItems,
                {
                  id: `dist_${Date.now()}`,
                  category: "Over Distance",
                  area: isCustomerBGG ? "Pit KKL" : "WM1",
                  material: "",
                  unit: isCustomerBGG ? "Bcm.Hm" : "BCM",
                  parentMaterial: "",
                  distanceWeightAvg: isCustomerBGG ? 0 : 1000,
                  initialVolume: 0,
                  adjustedVolume: 0,
                  rate: 0,
                  isDistanceVar: true,
                  subtotalInitial: 0,
                  subtotalAdjusted: 0,
                },
              ]);
              setShowDropdown(false);
            }}
            className="w-full text-left px-3.5 py-2.5 text-xs text-slate-800 hover:bg-amber-50 hover:text-amber-950 font-bold flex items-center gap-2.5 transition cursor-pointer"
          >
            <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
              <Layers size={13} />
            </div>
            <div>
              <div className="font-bold">Variabel Distance</div>
              <div className="text-[10px] text-slate-500 font-normal">Jarak Hauling & Over/Underhaul</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              const curPer = formData.workPeriod || "Agustus 2026";
              setBaOperatingItems([
                ...baOperatingItems,
                {
                  id: `dp_fuel_${Date.now()}`,
                  category: "DP Fuel",
                  area: "",
                  material: "DP Fuel & Transport (Pengurang Solar BGG)",
                  period: curPer,
                  notes: "Uang Muka / Budget Solar BGG",
                  unit: "Lot",
                  initialVolume: 1,
                  adjustedVolume: 1,
                  rate: 0,
                  isDeduction: true,
                  subtotalInitial: 0,
                  subtotalAdjusted: 0,
                },
              ]);
              setShowDropdown(false);
            }}
            className="w-full text-left px-3.5 py-2.5 text-xs text-slate-800 hover:bg-rose-50 hover:text-rose-950 font-bold flex items-center gap-2.5 transition cursor-pointer"
          >
            <div className="w-6 h-6 rounded-lg bg-rose-100 flex items-center justify-center text-rose-800 shrink-0">
              <Fuel size={13} />
            </div>
            <div>
              <div className="font-bold text-rose-900">+ DP Fuel & Transport (Potongan Solar)</div>
              <div className="text-[10px] text-slate-500 font-normal">Input budget / uang solar BGG (Pengurang)</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
