import React, { useState } from "react";
import { Plus, ChevronDown, Pickaxe, Layers, Fuel, TrendingUp, Percent, Wrench } from "lucide-react";

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
  const cust = (formData.customerCode || "POS").toUpperCase();
  const curPeriod = formData.workPeriod || "Agustus 2026";
  const isCustomerBGG = cust === "BGG" || cust === "PT BGG";
  const isCustomerSBS = cust === "SBS";
  const isCustomerPTRO = cust === "PTRO" || cust === "DBK";

  const handleAddSectionRow = (sectionType: string) => {
    setShowDropdown(false);
    const ts = Date.now();

    switch (sectionType) {
      case "A_OB":
        setBaOperatingItems([
          ...baOperatingItems,
          {
            id: `ba_ob_${ts}`,
            section: "A",
            category: "Operating & Mining",
            area: isCustomerBGG ? "Pit KKL" : isCustomerPTRO ? "Pit Sapan" : "WM1",
            material: isCustomerBGG ? "OVER BURDEN REMOVAL" : "Overburden Removal",
            period: curPeriod,
            unit: "BCM",
            initialVolume: 0,
            adjustedVolume: 0,
            rate: isCustomerBGG ? 29500 : 0,
            subtotalInitial: 0,
            subtotalAdjusted: 0,
          },
        ]);
        break;

      case "B_COAL":
        setBaOperatingItems([
          ...baOperatingItems,
          {
            id: `ba_coal_${ts}`,
            section: "B",
            category: "Operating & Mining",
            area: isCustomerBGG ? "Pit KKL" : isCustomerPTRO ? "Pit Sapan" : "WM1",
            material: isCustomerBGG ? "Coal Winning" : "Coal Mining",
            period: curPeriod,
            unit: "Ton",
            initialVolume: 0,
            adjustedVolume: 0,
            rate: isCustomerBGG ? 17500 : 0,
            subtotalInitial: 0,
            subtotalAdjusted: 0,
          },
        ]);
        break;

      case "C_OVERDISTANCE":
        setBaOperatingItems([
          ...baOperatingItems,
          {
            id: `ba_dist_${ts}`,
            section: "C",
            category: "Over Distance",
            area: isCustomerBGG ? "Pit KKL" : isCustomerPTRO ? "Pit Sapan" : "WM1",
            material: isCustomerBGG ? "Over Distance For OB Removal" : "Over Distance Hauling",
            period: curPeriod,
            unit: isCustomerBGG ? "BCM" : "BCM",
            distanceBasis: 1000,
            distanceWeightAvg: 1000,
            initialVolume: 0,
            adjustedVolume: 0,
            rate: isCustomerBGG ? 1550 : 0,
            isDistanceVar: true,
            subtotalInitial: 0,
            subtotalAdjusted: 0,
          },
        ]);
        break;

      case "D_RF":
        setBaOperatingItems([
          ...baOperatingItems,
          {
            id: `ba_rf_${ts}`,
            section: "D",
            category: "Raise & Fall",
            area: "",
            material: "Eskalasi Nilai Kontrak / Penyesuaian Harga BBM",
            period: curPeriod,
            notes: "Formula Eskalasi Raise & Fall",
            unit: "Lot",
            initialVolume: 1,
            adjustedVolume: 1,
            rate: 0,
            subtotalInitial: 0,
            subtotalAdjusted: 0,
          },
        ]);
        break;

      case "E_DISCOUNT":
        setBaOperatingItems([
          ...baOperatingItems,
          {
            id: `ba_disc_${ts}`,
            section: "E",
            category: "Discount",
            area: "",
            material: "Potongan / Diskon Kontrak",
            period: curPeriod,
            notes: "Potongan Khusus Kesepakatan Kontrak",
            unit: "Lot",
            initialVolume: 1,
            adjustedVolume: 1,
            rate: 0,
            isDeduction: true,
            subtotalInitial: 0,
            subtotalAdjusted: 0,
          },
        ]);
        break;

      case "F_DP_FUEL":
        setBaOperatingItems([
          ...baOperatingItems,
          {
            id: `ba_dp_fuel_${ts}`,
            section: isCustomerSBS ? "P" : "F",
            category: "DP Fuel",
            area: "",
            material: isCustomerBGG ? "DP Fuel & Transport (Pengurang Solar BGG)" : "Potongan Solar / Pemakaian BBM",
            period: curPeriod,
            notes: "Uang Muka / Budget Solar Pengurang Tagihan",
            unit: "Lot",
            initialVolume: 1,
            adjustedVolume: 1,
            rate: 0,
            isDeduction: true,
            subtotalInitial: 0,
            subtotalAdjusted: 0,
          },
        ]);
        break;

      case "CUSTOM_SOW":
      default:
        setBaOperatingItems([
          ...baOperatingItems,
          {
            id: `ba_custom_${ts}`,
            section: "A",
            category: "Operating & Mining",
            area: isCustomerBGG ? "Pit KKL" : "WM1",
            material: "",
            period: curPeriod,
            unit: "BCM",
            initialVolume: 0,
            adjustedVolume: 0,
            rate: 0,
            subtotalInitial: 0,
            subtotalAdjusted: 0,
          },
        ]);
        break;
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className="text-xs font-bold text-white bg-[#A57C50] hover:bg-[#8e6941] px-3 py-1.5 rounded-[3px] flex items-center gap-1.5 transition cursor-pointer shadow-xs"
      >
        <Plus size={13} />
        <span>Tambah Baris</span>
        <ChevronDown size={12} className={`transition-transform duration-200 ${showDropdown ? "rotate-180" : ""}`} />
      </button>

      {showDropdown && (
        <div
          className="absolute right-0 mt-1.5 w-64 bg-white rounded-[4px] shadow-xl border border-slate-300 z-50 py-1 divide-y divide-slate-100"
          onMouseLeave={() => setShowDropdown(false)}
        >
          {/* Seksi A: OB */}
          <button
            type="button"
            onClick={() => handleAddSectionRow("A_OB")}
            className="w-full text-left px-3.5 py-2 text-xs text-slate-800 hover:bg-slate-50 font-bold flex items-center gap-2.5 transition cursor-pointer"
          >
            <div className="w-6 h-6 rounded-[3px] bg-slate-100 flex items-center justify-center text-[#A57C50] shrink-0">
              <Pickaxe size={13} />
            </div>
            <div>
              <div className="font-bold text-slate-900">Seksi A: OB Removal</div>
              <div className="text-[10px] text-slate-500 font-normal">Volume Produksi Overburden (Bcm)</div>
            </div>
          </button>

          {/* Seksi B: Coal */}
          <button
            type="button"
            onClick={() => handleAddSectionRow("B_COAL")}
            className="w-full text-left px-3.5 py-2 text-xs text-slate-800 hover:bg-slate-50 font-bold flex items-center gap-2.5 transition cursor-pointer"
          >
            <div className="w-6 h-6 rounded-[3px] bg-slate-100 flex items-center justify-center text-slate-800 shrink-0">
              <Layers size={13} />
            </div>
            <div>
              <div className="font-bold text-slate-900">Seksi B: Coal Winning</div>
              <div className="text-[10px] text-slate-500 font-normal">Volume Produksi Batubara (Ton)</div>
            </div>
          </button>

          {/* Seksi C: Over Distance */}
          <button
            type="button"
            onClick={() => handleAddSectionRow("C_OVERDISTANCE")}
            className="w-full text-left px-3.5 py-2 text-xs text-slate-800 hover:bg-slate-50 font-bold flex items-center gap-2.5 transition cursor-pointer"
          >
            <div className="w-6 h-6 rounded-[3px] bg-amber-50 flex items-center justify-center text-[#A57C50] shrink-0">
              <Layers size={13} />
            </div>
            <div>
              <div className="font-bold text-slate-900">Seksi C: Over Distance</div>
              <div className="text-[10px] text-slate-500 font-normal">Jarak Hauling & Overhaul (Mtr)</div>
            </div>
          </button>

          {/* Seksi D: Raise & Fall Factor */}
          <button
            type="button"
            onClick={() => handleAddSectionRow("D_RF")}
            className="w-full text-left px-3.5 py-2 text-xs text-slate-800 hover:bg-slate-50 font-bold flex items-center gap-2.5 transition cursor-pointer"
          >
            <div className="w-6 h-6 rounded-[3px] bg-amber-50 flex items-center justify-center text-amber-700 shrink-0">
              <TrendingUp size={13} />
            </div>
            <div>
              <div className="font-bold text-slate-900">Seksi D: Raise & Fall / Eskalasi</div>
              <div className="text-[10px] text-slate-500 font-normal">Eskalasi ICP / BBM / Parameter Kontrak</div>
            </div>
          </button>

          {/* Seksi E: Discount on Overdistance / Potongan */}
          <button
            type="button"
            onClick={() => handleAddSectionRow("E_DISCOUNT")}
            className="w-full text-left px-3.5 py-2 text-xs text-slate-800 hover:bg-slate-50 font-bold flex items-center gap-2.5 transition cursor-pointer"
          >
            <div className="w-6 h-6 rounded-[3px] bg-rose-50 flex items-center justify-center text-rose-700 shrink-0">
              <Percent size={13} />
            </div>
            <div>
              <div className="font-bold text-slate-900">Seksi E: Discount / Potongan Kontrak</div>
              <div className="text-[10px] text-slate-500 font-normal">Deduction OD 25% / Potongan Khusus</div>
            </div>
          </button>

          {/* Seksi F: DP Fuel & Transport */}
          <button
            type="button"
            onClick={() => handleAddSectionRow("F_DP_FUEL")}
            className="w-full text-left px-3.5 py-2 text-xs text-slate-800 hover:bg-slate-50 font-bold flex items-center gap-2.5 transition cursor-pointer"
          >
            <div className="w-6 h-6 rounded-[3px] bg-rose-50 flex items-center justify-center text-rose-700 shrink-0">
              <Fuel size={13} />
            </div>
            <div>
              <div className="font-bold text-slate-900">Seksi F: DP Fuel & Pengurang BBM</div>
              <div className="text-[10px] text-slate-500 font-normal">Uang Muka / Budget Solar Pengurang</div>
            </div>
          </button>

          {/* Custom Variabel SOW */}
          <button
            type="button"
            onClick={() => handleAddSectionRow("CUSTOM_SOW")}
            className="w-full text-left px-3.5 py-2 text-xs text-slate-800 hover:bg-slate-50 font-bold flex items-center gap-2.5 transition cursor-pointer"
          >
            <div className="w-6 h-6 rounded-[3px] bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <Wrench size={13} />
            </div>
            <div>
              <div className="font-bold text-slate-900">+ Variabel Kustom Lainnya</div>
              <div className="text-[10px] text-slate-500 font-normal">Sewa Alat, Daywork, Penunjang Produksi</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

