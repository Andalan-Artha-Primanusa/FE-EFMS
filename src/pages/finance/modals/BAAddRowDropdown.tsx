import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  ChevronDown,
  Pickaxe,
  Layers,
  Fuel,
  TrendingUp,
  Percent,
  Wrench,
  Clock,
  ShieldAlert,
  Truck,
  MapPin,
  Building2,
} from "lucide-react";

interface BAAddRowDropdownProps {
  formData: any;
  baOperatingItems: any[];
  setBaOperatingItems: React.Dispatch<React.SetStateAction<any[]>>;
  baMDOItems?: any[];
  setBaMDOItems?: React.Dispatch<React.SetStateAction<any[]>>;
  baDeductionItems?: any[];
  setBaDeductionItems?: React.Dispatch<React.SetStateAction<any[]>>;
  mRate?: number;
  getSowMasterRate?: (customer: string, itemName: string, fallbackRate: number, isUSD?: boolean, tier?: string) => number;
  activeSOWCatalog?: any[];
}

export function BAAddRowDropdown({
  formData,
  baOperatingItems,
  setBaOperatingItems,
  baMDOItems,
  setBaMDOItems,
  baDeductionItems,
  setBaDeductionItems,
  mRate = 16200,
  getSowMasterRate,
  activeSOWCatalog,
}: BAAddRowDropdownProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const rawCust = (formData.customerCode || "POS").toUpperCase();
  const curPeriod = formData.workPeriod || "Agustus 2026";
  const isCustomerBGG = rawCust === "BGG" || rawCust === "PT BGG";
  const isCustomerSBS = rawCust === "SBS";
  const isCustomerPTRO = rawCust === "PTRO" || rawCust === "DBK" || rawCust === "PT PETROSEA";

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  const handleAddSectionRow = (sectionType: string) => {
    setShowDropdown(false);
    const ts = Date.now();

    switch (sectionType) {
      // ================= BGG SITE PRESETS =================
      case "BGG_OB":
        const bggObRate = getSowMasterRate ? getSowMasterRate("BGG", "OVER BURDEN REMOVAL 1 (75%)", 29500) : 29500;
        setBaOperatingItems((prev) => [
          ...prev,
          {
            id: `bgg_ob_${ts}`,
            section: "A",
            category: "Operating & Mining",
            area: "Pit KKL",
            material: "OVER BURDEN REMOVAL 1 (75%)",
            period: curPeriod,
            notes: "",
            keterangan: "",
            unit: "BCM",
            initialVolume: 0,
            adjustedVolume: 0,
            rate: bggObRate,
            subtotalInitial: 0,
            subtotalAdjusted: 0,
          },
        ]);
        break;

      case "BGG_COAL":
        const bggCoalRate = getSowMasterRate ? getSowMasterRate("BGG", "Coal Winning Pit Kungkilan", 17500) : 17500;
        setBaOperatingItems((prev) => [
          ...prev,
          {
            id: `bgg_coal_${ts}`,
            section: "B",
            category: "Operating & Mining",
            area: "Pit KKL",
            material: "Coal Winning",
            period: curPeriod,
            notes: "",
            keterangan: "",
            unit: "Ton",
            initialVolume: 0,
            adjustedVolume: 0,
            rate: bggCoalRate,
            subtotalInitial: 0,
            subtotalAdjusted: 0,
          },
        ]);
        break;

      case "BGG_OD":
        const bggOdRate = getSowMasterRate ? getSowMasterRate("BGG", "Over Distance For OB Removal", 1550) : 1550;
        setBaOperatingItems((prev) => [
          ...prev,
          {
            id: `bgg_dist_${ts}`,
            section: "C",
            category: "Over Distance",
            area: "Pit KKL",
            material: "Over Distance For OB Removal",
            period: curPeriod,
            notes: "",
            keterangan: "",
            unit: "BCM",
            distanceBasis: 1000,
            distanceWeightAvg: 1000,
            initialVolume: 0,
            adjustedVolume: 0,
            rate: bggOdRate,
            isDistanceVar: true,
            subtotalInitial: 0,
            subtotalAdjusted: 0,
          },
        ]);
        break;

      case "BGG_RF":
        setBaOperatingItems((prev) => [
          ...prev,
          {
            id: `bgg_rf_${ts}`,
            section: "D",
            category: "Raise & Fall",
            area: "",
            material: "Eskalasi Nilai Kontrak / Penyesuaian Harga BBM",
            period: curPeriod,
            notes: "Formula Eskalasi Raise & Fall",
            keterangan: "",
            unit: "Lot",
            initialVolume: 1,
            adjustedVolume: 1,
            rate: 0,
            subtotalInitial: 0,
            subtotalAdjusted: 0,
          },
        ]);
        break;

      case "BGG_DISC":
        setBaOperatingItems((prev) => [
          ...prev,
          {
            id: `bgg_disc_${ts}`,
            section: "E",
            category: "Discount",
            area: "",
            material: "Discount on Over Distance 25%",
            period: curPeriod,
            notes: "Potongan Khusus Over Distance 25%",
            keterangan: "",
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

      case "BGG_DP_FUEL":
        setBaOperatingItems((prev) => [
          ...prev,
          {
            id: `bgg_dp_fuel_${ts}`,
            section: "F",
            category: "DP Fuel",
            area: "",
            material: "DP Fuel & Transport (Pengurang Solar BGG)",
            period: curPeriod,
            notes: "Uang Muka / Budget Solar Pengurang Tagihan",
            keterangan: "",
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

      // ================= SBS SITE PRESETS =================
      case "SBS_OB":
        const sbsObRate = getSowMasterRate ? getSowMasterRate("SBS", "PIT E - DISPOSAL SEKATAN", 22654) : 22654;
        setBaOperatingItems((prev) => [
          ...prev,
          {
            id: `sbs_ob_${ts}`,
            section: "A",
            category: "Operating & Mining",
            area: "Pit E",
            material: "PIT E - DISPOSAL SEKATAN",
            period: curPeriod,
            notes: "",
            keterangan: "",
            unit: "BCM",
            initialVolume: 0,
            adjustedVolume: 0,
            rate: sbsObRate,
            subtotalInitial: 0,
            subtotalAdjusted: 0,
          },
        ]);
        break;

      case "SBS_RENTAL":
        const sbsRentRate = getSowMasterRate ? getSowMasterRate("SBS", "Bulldozer DZ709", 1980000) : 1980000;
        if (setBaMDOItems) {
          setBaMDOItems((prev) => [
            ...prev,
            {
              id: `sbs_rent_${ts}`,
              category: "Penunjang",
              area: "Pit E",
              material: "Bulldozer DZ709",
              period: curPeriod,
              notes: "Rental Unit Alat Berat",
              keterangan: "",
              unit: "Hours",
              initialVolume: 0,
              adjustedVolume: 0,
              rate: sbsRentRate,
              subtotalInitial: 0,
              subtotalAdjusted: 0,
            },
          ]);
        } else {
          setBaOperatingItems((prev) => [
            ...prev,
            {
              id: `sbs_rent_${ts}`,
              section: "B",
              category: "Penunjang",
              area: "Pit E",
              material: "Bulldozer DZ709",
              period: curPeriod,
              notes: "Rental Unit Alat Berat",
              keterangan: "",
              unit: "Hours",
              initialVolume: 0,
              adjustedVolume: 0,
              rate: sbsRentRate,
              subtotalInitial: 0,
              subtotalAdjusted: 0,
            },
          ]);
        }
        break;

      case "SBS_DEDUCTION":
        if (setBaDeductionItems) {
          setBaDeductionItems((prev) => [
            ...prev,
            {
              id: `sbs_ded_${ts}`,
              category: "Pengurang Biaya",
              area: "Pit E",
              material: "Denda ketidakcapaian Volume",
              period: curPeriod,
              notes: "Sanksi Operasional / Denda Pengurang",
              keterangan: "",
              unit: "Lot",
              initialVolume: 1,
              adjustedVolume: 1,
              rate: 0,
              isDeduction: true,
              subtotalInitial: 0,
              subtotalAdjusted: 0,
            },
          ]);
        } else {
          setBaOperatingItems((prev) => [
            ...prev,
            {
              id: `sbs_ded_${ts}`,
              section: "P",
              category: "Pengurang Biaya",
              area: "Pit E",
              material: "Denda ketidakcapaian Volume",
              period: curPeriod,
              notes: "Sanksi Operasional / Denda Pengurang",
              keterangan: "",
              unit: "Lot",
              initialVolume: 1,
              adjustedVolume: 1,
              rate: 0,
              isDeduction: true,
              subtotalInitial: 0,
              subtotalAdjusted: 0,
            },
          ]);
        }
        break;

      // ================= PTRO / DBK SITE PRESETS =================
      case "PTRO_OB":
        const ptroObUsd = getSowMasterRate ? getSowMasterRate("PTRO", "OVER BURDEN REMOVAL", 1.49, true) : 1.49;
        setBaOperatingItems((prev) => [
          ...prev,
          {
            id: `ptro_ob_${ts}`,
            section: "A",
            category: "Operating & Mining",
            area: "Pit Sapan",
            material: "OVER BURDEN REMOVAL",
            period: curPeriod,
            notes: `USD ${ptroObUsd.toFixed(3)} / BCM`,
            keterangan: "",
            unit: "BCM",
            isUSD: true,
            rateUSD: ptroObUsd,
            distanceBasis: 0,
            isDistanceVar: false,
            rate: Math.round(ptroObUsd * mRate),
            initialVolume: 0,
            adjustedVolume: 0,
            subtotalInitial: 0,
            subtotalAdjusted: 0,
          },
        ]);
        break;

      case "PTRO_COAL":
        const ptroCgUsd = getSowMasterRate ? getSowMasterRate("PTRO", "COAL GETTING", 0.84, true) : 0.84;
        setBaOperatingItems((prev) => [
          ...prev,
          {
            id: `ptro_coal_${ts}`,
            section: "B",
            category: "Operating & Mining",
            area: "Pit Sapan",
            material: "COAL GETTING",
            period: curPeriod,
            notes: `USD ${ptroCgUsd.toFixed(3)} / Ton`,
            keterangan: "",
            unit: "MT",
            isUSD: true,
            rateUSD: ptroCgUsd,
            distanceBasis: 0,
            isDistanceVar: false,
            rate: Math.round(ptroCgUsd * mRate),
            initialVolume: 0,
            adjustedVolume: 0,
            subtotalInitial: 0,
            subtotalAdjusted: 0,
          },
        ]);
        break;

      case "PTRO_OD_OB":
        const ptroOdObUsd = getSowMasterRate ? getSowMasterRate("PTRO", "Overhaul OB", 0.028, true) : 0.028;
        setBaOperatingItems((prev) => [
          ...prev,
          {
            id: `ptro_odob_${ts}`,
            section: "C",
            category: "Over Distance",
            area: "Pit Sapan",
            material: "Overhaul OB",
            period: curPeriod,
            notes: `USD ${ptroOdObUsd.toFixed(3)} / BCM / 100m`,
            keterangan: "",
            unit: "BCM",
            isUSD: true,
            rateUSD: ptroOdObUsd,
            distanceBasis: 1000,
            distanceWeightAvg: 1000,
            isDistanceVar: true,
            rate: Math.round(ptroOdObUsd * mRate),
            initialVolume: 0,
            adjustedVolume: 0,
            subtotalInitial: 0,
            subtotalAdjusted: 0,
          },
        ]);
        break;

      case "PTRO_OD_COAL":
        const ptroOdCgIdr = getSowMasterRate ? getSowMasterRate("PTRO", "Overhaul Coal Getting", 230, false) : 230;
        setBaOperatingItems((prev) => [
          ...prev,
          {
            id: `ptro_odcoal_${ts}`,
            section: "C",
            category: "Over Distance",
            area: "Pit Sapan",
            material: "Overhaul Coal Getting",
            period: curPeriod,
            notes: `IDR ${ptroOdCgIdr} / Ton / 100m`,
            keterangan: "",
            unit: "TON",
            isUSD: false,
            rateIDR: ptroOdCgIdr,
            distanceBasis: 3000,
            distanceWeightAvg: 3000,
            isDistanceVar: true,
            rate: ptroOdCgIdr,
            initialVolume: 0,
            adjustedVolume: 0,
            subtotalInitial: 0,
            subtotalAdjusted: 0,
          },
        ]);
        break;

      case "PTRO_DAYWORK":
        setBaOperatingItems((prev) => [
          ...prev,
          {
            id: `ptro_dw_${ts}`,
            section: "D",
            category: "Daywork",
            area: "Pit Sapan",
            material: "Daywork Equipment Support",
            period: curPeriod,
            notes: "Pekerjaan Harian / Sewa Unit",
            keterangan: "",
            unit: "Hours",
            rate: 0,
            initialVolume: 0,
            adjustedVolume: 0,
            subtotalInitial: 0,
            subtotalAdjusted: 0,
          },
        ]);
        break;

      // ================= POS & DEFAULT SITE PRESETS =================
      case "POS_OB":
        const posObRate = getSowMasterRate ? getSowMasterRate("POS", "Overburden/Waste", 59500) : 59500;
        setBaOperatingItems((prev) => [
          ...prev,
          {
            id: `pos_ob_${ts}`,
            section: "A",
            category: "Operating & Mining",
            area: "WM1",
            material: "Overburden Removal",
            period: curPeriod,
            notes: "",
            keterangan: "",
            unit: "BCM",
            initialVolume: 0,
            adjustedVolume: 0,
            rate: posObRate,
            subtotalInitial: 0,
            subtotalAdjusted: 0,
          },
        ]);
        break;

      case "POS_COAL":
        const posTopRate = getSowMasterRate ? getSowMasterRate("POS", "Top Soil", 60500) : 60500;
        setBaOperatingItems((prev) => [
          ...prev,
          {
            id: `pos_coal_${ts}`,
            section: "B",
            category: "Operating & Mining",
            area: "WM1",
            material: "Top Soil Removal",
            period: curPeriod,
            notes: "",
            keterangan: "",
            unit: "BCM",
            initialVolume: 0,
            adjustedVolume: 0,
            rate: posTopRate,
            subtotalInitial: 0,
            subtotalAdjusted: 0,
          },
        ]);
        break;

      case "POS_OD":
        const posOdRate = getSowMasterRate ? getSowMasterRate("POS", "Over/Underhaul For OB Removal", 8608) : 8608;
        setBaOperatingItems((prev) => [
          ...prev,
          {
            id: `pos_od_${ts}`,
            section: "C",
            category: "Over Distance",
            area: "WM1",
            material: "Over Distance Hauling",
            period: curPeriod,
            notes: "",
            keterangan: "",
            unit: "BCM",
            distanceBasis: 1000,
            distanceWeightAvg: 1000,
            isDistanceVar: true,
            initialVolume: 0,
            adjustedVolume: 0,
            rate: posOdRate,
            subtotalInitial: 0,
            subtotalAdjusted: 0,
          },
        ]);
        break;

      case "POS_MDO":
        const posMdoRate = getSowMasterRate ? getSowMasterRate("POS", "Mine Development (MDO Cut & Fill)", 15500000) : 15500000;
        if (setBaMDOItems) {
          setBaMDOItems((prev) => [
            ...prev,
            {
              id: `pos_mdo_${ts}`,
              category: "MDO",
              area: "Site POS",
              material: "Land Clearing & Mine Development",
              period: curPeriod,
              notes: "Pembersihan Lahan & Top Soil",
              keterangan: "",
              unit: "Ha",
              initialVolume: 0,
              adjustedVolume: 0,
              rate: posMdoRate,
              subtotalInitial: 0,
              subtotalAdjusted: 0,
            },
          ]);
        } else {
          setBaOperatingItems((prev) => [
            ...prev,
            {
              id: `pos_mdo_${ts}`,
              section: "D",
              category: "MDO",
              area: "Site POS",
              material: "Land Clearing & Mine Development",
              period: curPeriod,
              notes: "Pembersihan Lahan & Top Soil",
              keterangan: "",
              unit: "Ha",
              initialVolume: 0,
              adjustedVolume: 0,
              rate: posMdoRate,
              subtotalInitial: 0,
              subtotalAdjusted: 0,
            },
          ]);
        }
        break;

      case "POS_RF":
        setBaOperatingItems((prev) => [
          ...prev,
          {
            id: `pos_rf_${ts}`,
            section: "E",
            category: "Raise & Fall",
            area: "",
            material: "Eskalasi Nilai Kontrak / Penyesuaian Harga BBM",
            period: curPeriod,
            notes: "Formula Eskalasi Raise & Fall",
            keterangan: "",
            unit: "Lot",
            initialVolume: 1,
            adjustedVolume: 1,
            rate: 0,
            subtotalInitial: 0,
            subtotalAdjusted: 0,
          },
        ]);
        break;

      case "POS_DEDUCTION":
        setBaOperatingItems((prev) => [
          ...prev,
          {
            id: `pos_ded_${ts}`,
            section: "F",
            category: "Discount",
            area: "",
            material: "Potongan / Deduction Kontrak",
            period: curPeriod,
            notes: "Potongan Khusus Kesepakatan Kontrak",
            keterangan: "",
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

      // ================= CUSTOM VARIABLE =================
      case "CUSTOM_SOW":
      default:
        setBaOperatingItems((prev) => [
          ...prev,
          {
            id: `ba_custom_${ts}`,
            section: "A",
            category: "Operating & Mining",
            area: isCustomerBGG ? "Pit KKL" : isCustomerSBS ? "Pit E" : isCustomerPTRO ? "Pit Sapan" : "WM1",
            material: "",
            period: curPeriod,
            notes: "",
            keterangan: "",
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

  const getSiteTitle = () => {
    if (isCustomerBGG) return "Site BGG (PT Baramega Gawi Gawi)";
    if (isCustomerSBS) return "Site SBS (PT Sarolangun Bara Prima)";
    if (isCustomerPTRO) return "Site PTRO / DBK (Petrosea Dayaborneo)";
    return `Site ${rawCust} (PT Paramitha Cipta Sarana)`;
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className="text-xs font-bold text-white bg-[#A57C50] hover:bg-[#8e6941] px-3 py-1.5 rounded-[3px] flex items-center gap-1.5 transition cursor-pointer shadow-xs"
      >
        <Plus size={13} />
        <span>Tambah Baris</span>
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 ${showDropdown ? "rotate-180" : ""}`}
        />
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-1.5 w-72 sm:w-80 bg-white rounded-[4px] shadow-2xl border border-slate-300 z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100">
          {/* Site Badge Header */}
          <div className="px-3 py-1.5 bg-slate-50 flex items-center justify-between text-[11px] font-bold text-slate-700">
            <span className="flex items-center gap-1.5 truncate">
              <MapPin size={12} className="text-[#A57C50] shrink-0" />
              <span className="truncate">{getSiteTitle()}</span>
            </span>
            <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-extrabold uppercase text-[9px] shrink-0">
              {rawCust}
            </span>
          </div>

          {/* ================= BGG DROPDOWN OPTIONS ================= */}
          {isCustomerBGG && (
            <div className="py-1">
              <button
                type="button"
                onClick={() => handleAddSectionRow("BGG_OB")}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-800 hover:bg-slate-50 font-bold flex items-center gap-2.5 transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-[3px] bg-amber-50 flex items-center justify-center text-[#A57C50] shrink-0">
                  <Pickaxe size={13} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">OB Removal</div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    Pit KKL (BCM - OB1 Rp 29.500 / OB2 Rp 28.750)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleAddSectionRow("BGG_COAL")}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-800 hover:bg-slate-50 font-bold flex items-center gap-2.5 transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-[3px] bg-slate-100 flex items-center justify-center text-slate-800 shrink-0">
                  <Layers size={13} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Coal Winning</div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    Pit KKL (Ton - Rp 17.500)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleAddSectionRow("BGG_OD")}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-800 hover:bg-slate-50 font-bold flex items-center gap-2.5 transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-[3px] bg-amber-50 flex items-center justify-center text-amber-700 shrink-0">
                  <Truck size={13} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Over Distance</div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    Pit KKL &gt;1000m (BCM - Rp 1.550)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleAddSectionRow("BGG_RF")}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-800 hover:bg-slate-50 font-bold flex items-center gap-2.5 transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-[3px] bg-blue-50 flex items-center justify-center text-blue-700 shrink-0">
                  <TrendingUp size={13} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Raise & Fall / Eskalasi</div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    Penyesuaian Harga BBM Solar (Lot)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleAddSectionRow("BGG_DISC")}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-800 hover:bg-slate-50 font-bold flex items-center gap-2.5 transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-[3px] bg-rose-50 flex items-center justify-center text-rose-700 shrink-0">
                  <Percent size={13} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Discount Overdistance 25%</div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    Potongan Khusus Over Distance (Lot, Pengurang)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleAddSectionRow("BGG_DP_FUEL")}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-800 hover:bg-slate-50 font-bold flex items-center gap-2.5 transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-[3px] bg-rose-50 flex items-center justify-center text-rose-700 shrink-0">
                  <Fuel size={13} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">DP Fuel & Transport</div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    Uang Muka BBM Solar BGG (Lot, Pengurang)
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* ================= SBS DROPDOWN OPTIONS ================= */}
          {isCustomerSBS && (
            <div className="py-1">
              <button
                type="button"
                onClick={() => handleAddSectionRow("SBS_OB")}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-800 hover:bg-slate-50 font-bold flex items-center gap-2.5 transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-[3px] bg-amber-50 flex items-center justify-center text-[#A57C50] shrink-0">
                  <Pickaxe size={13} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">OB Removal</div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    Pit E Disposal, Jalan Barito, Sekatan (BCM)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleAddSectionRow("SBS_RENTAL")}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-800 hover:bg-slate-50 font-bold flex items-center gap-2.5 transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-[3px] bg-cyan-50 flex items-center justify-center text-cyan-700 shrink-0">
                  <Clock size={13} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Jasa Penunjang (Rental Alat)</div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    Bulldozer D10, Excavator 395, DT (Hours) → Tabel 2 MDO
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleAddSectionRow("SBS_DEDUCTION")}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-800 hover:bg-slate-50 font-bold flex items-center gap-2.5 transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-[3px] bg-rose-50 flex items-center justify-center text-rose-700 shrink-0">
                  <ShieldAlert size={13} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Pengurang Pembayaran</div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    Denda Volume, Safety K3, BBM SBS (Rp) → Tabel 3 Pengurang
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* ================= PTRO / DBK DROPDOWN OPTIONS ================= */}
          {isCustomerPTRO && (
            <div className="py-1">
              <button
                type="button"
                onClick={() => handleAddSectionRow("PTRO_OB")}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-800 hover:bg-slate-50 font-bold flex items-center gap-2.5 transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-[3px] bg-amber-50 flex items-center justify-center text-[#A57C50] shrink-0">
                  <Pickaxe size={13} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">OB Removal Pit Sapan</div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    Overburden Sapan (BCM - USD 1.490)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleAddSectionRow("PTRO_COAL")}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-800 hover:bg-slate-50 font-bold flex items-center gap-2.5 transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-[3px] bg-slate-100 flex items-center justify-center text-slate-800 shrink-0">
                  <Layers size={13} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Coal Getting Pit Sapan</div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    Coal Getting Sapan (MT - USD 0.840)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleAddSectionRow("PTRO_OD_OB")}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-800 hover:bg-slate-50 font-bold flex items-center gap-2.5 transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-[3px] bg-amber-50 flex items-center justify-center text-amber-700 shrink-0">
                  <Truck size={13} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Overhaul OB</div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    Jarak OB &gt;2.5 Km (BCM - USD 0.028 / 100m)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleAddSectionRow("PTRO_OD_COAL")}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-800 hover:bg-slate-50 font-bold flex items-center gap-2.5 transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-[3px] bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0">
                  <Truck size={13} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Overhaul Coal Getting</div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    Jarak Batubara &gt;22 Km (TON - IDR 230 / 100m)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleAddSectionRow("PTRO_DAYWORK")}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-800 hover:bg-slate-50 font-bold flex items-center gap-2.5 transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-[3px] bg-indigo-50 flex items-center justify-center text-indigo-700 shrink-0">
                  <Clock size={13} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Daywork Support</div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    Rental Unit / Daywork Equipment (Hours)
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* ================= POS & DEFAULT DROPDOWN OPTIONS ================= */}
          {!isCustomerBGG && !isCustomerSBS && !isCustomerPTRO && (
            <div className="py-1">
              <button
                type="button"
                onClick={() => handleAddSectionRow("POS_OB")}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-800 hover:bg-slate-50 font-bold flex items-center gap-2.5 transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-[3px] bg-amber-50 flex items-center justify-center text-[#A57C50] shrink-0">
                  <Pickaxe size={13} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Production & Mining</div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    Volume Produksi Overburden (BCM)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleAddSectionRow("POS_COAL")}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-800 hover:bg-slate-50 font-bold flex items-center gap-2.5 transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-[3px] bg-slate-100 flex items-center justify-center text-slate-800 shrink-0">
                  <Layers size={13} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Coal Mining</div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    Volume Penambangan Batubara (Ton)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleAddSectionRow("POS_OD")}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-800 hover:bg-slate-50 font-bold flex items-center gap-2.5 transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-[3px] bg-amber-50 flex items-center justify-center text-amber-700 shrink-0">
                  <Truck size={13} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Over Distance</div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    Jarak Hauling & Overhaul (BCM)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleAddSectionRow("POS_MDO")}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-800 hover:bg-slate-50 font-bold flex items-center gap-2.5 transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-[3px] bg-cyan-50 flex items-center justify-center text-cyan-700 shrink-0">
                  <Building2 size={13} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Land Clearing & MDO</div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    Pembersihan Lahan & Top Soil (Ha) → Tabel 2 MDO
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleAddSectionRow("POS_RF")}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-800 hover:bg-slate-50 font-bold flex items-center gap-2.5 transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-[3px] bg-blue-50 flex items-center justify-center text-blue-700 shrink-0">
                  <TrendingUp size={13} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Raise & Fall / Eskalasi</div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    Eskalasi ICP / BBM / Parameter Kontrak (Lot)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleAddSectionRow("POS_DEDUCTION")}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-800 hover:bg-slate-50 font-bold flex items-center gap-2.5 transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-[3px] bg-rose-50 flex items-center justify-center text-rose-700 shrink-0">
                  <Percent size={13} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Potongan / Deduction</div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    Potongan Khusus Kesepakatan Kontrak (Lot, Pengurang)
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* ================= COMMON: CUSTOM SOW ROW ================= */}
          <div className="py-1">
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
                <div className="text-[10px] text-slate-500 font-normal">
                  Sewa Alat, Daywork, Tambahan SOW Bebas
                </div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


