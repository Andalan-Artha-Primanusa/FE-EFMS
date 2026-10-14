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
  targetSection?: "operating" | "mdo" | "deduction";
}

export function BAAddRowDropdown({
  formData,
  baOperatingItems,
  setBaOperatingItems,
  baMDOItems,
  setBaMDOItems,
  baDeductionItems,
  setBaDeductionItems,
  mRate = 0,
  getSowMasterRate,
  activeSOWCatalog,
  targetSection = "operating",
}: BAAddRowDropdownProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const rawCust = (formData.customerCode || "POS").toUpperCase();
  const curPeriod = formData.workPeriod || "";
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

  // Variabel tambahan = seluruh item Master Variable SOW customer (MDO / Penunjang masuk tabel MDO).
  const siteSowItems = (activeSOWCatalog || []).filter((s) => {
    if (!s) return false;
    const c = (s.customer || s.customerCode || "").toUpperCase();
    return !c || c === rawCust || ((rawCust === "POS" || rawCust === "IBP" || rawCust === "BBA") && (!c || c === "POS"));
  });

  const handleAddDynamicSOW = (sow: any) => {
    setShowDropdown(false);
    const ts = Date.now();
    const nameLow = (sow.name || sow.itemName || "").toLowerCase();
    const isDist = Boolean(sow.isDistanceVar) || (sow.category || "").toLowerCase().includes("distance") || nameLow.includes("distance") || nameLow.includes("overhaul") || nameLow.includes("underhaul");
    const isClearing = nameLow.includes("clearing") || nameLow.includes("clear & grub") || nameLow.includes("land clearing");
    const isCoal = nameLow.includes("coal") || nameLow.includes("batubara");
    const isDed = Boolean(sow.isDeduction) || (sow.category || "").toLowerCase().includes("pengurang") || nameLow.includes("denda") || nameLow.includes("kelebihan");
    const catLow = (sow.category || "").toLowerCase();
    const isPenunjang = /penunjang|rental/.test(catLow) || /^(hours|jam)$/i.test(sow.unit || "");
    const isMDO = isPenunjang || /mdo|development/.test(catLow);

    let calculatedRate = sow.defaultRate || sow.rateIDR || (sow.rateUSD ? sow.rateUSD * (mRate || 0) : 0);
    if (getSowMasterRate) {
      const dynRate = getSowMasterRate(rawCust, sow.name || sow.itemName, calculatedRate, false);
      if (dynRate > 0) calculatedRate = dynRate;
    }

    const newItem = {
      id: `sow_dyn_${ts}`,
      section: isDist ? "B" : isClearing ? "C" : (isCoal ? "B" : "A"),
      category: isDist ? "Over Distance" : isClearing ? "Land Clearing" : (rawCust === "SBS" && nameLow.includes("penunjang")) ? "Penunjang" : "Operating & Mining",
      area: isCustomerBGG ? "Pit KKL" : (isCustomerPTRO ? "Pit Sapan" : (isCustomerSBS ? "Pit E" : (rawCust === "POS" ? "WM1" : "-"))),
      material: sow.name || sow.itemName,
      period: curPeriod,
      notes: "",
      keterangan: "",
      unit: sow.unit || (isCoal ? "Ton" : "BCM"),
      distanceBasis: sow.baseDistanceMeters || 1000,
      distanceWeightAvg: sow.baseDistanceMeters || 1000,
      initialVolume: 0,
      adjustedVolume: 0,
      rate: calculatedRate,
      rateUSD: Number(sow.rateUSD || 0),
      isUSD: Number(sow.rateUSD || 0) > 0,
      isDistanceVar: isDist,
      isDeduction: isDed,
      subtotalInitial: 0,
      subtotalAdjusted: 0,
    };

    if (targetSection === "deduction" && setBaDeductionItems) {
      setBaDeductionItems((prev) => [...prev, { ...newItem, initialVolume: 1, adjustedVolume: 1 }]);
    } else if ((targetSection === "mdo" || isMDO) && setBaMDOItems) {
      setBaMDOItems((prev) => [...prev, { ...newItem, category: isPenunjang ? "Penunjang" : "MDO" }]);
    } else {
      setBaOperatingItems((prev) => [...prev, newItem]);
    }
  };

  const handleAddSectionRow = (sectionType: string) => {
    setShowDropdown(false);
    const ts = Date.now();

    switch (sectionType) {
      // ================= BGG SITE PRESETS =================
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
            notes: "Formula Eskalasi Raise & Fall (3-Faktor DLF)",
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

      case "POS_DP_FUEL":
        const posCurRefill = Number(
          formData?.posData?.fuelPeriods?.[curPeriod]?.actualFuelCost ||
          formData?.posData?.actualFuelCost ||
          formData?.posData?.posTotalCost ||
          0
        );
        setBaOperatingItems((prev) => [
          ...prev,
          {
            id: `pos_dpfuel_${ts}`,
            section: "E",
            category: "DP Fuel",
            area: "",
            material: "DP Fuel & Transport (Pengurang Solar)",
            period: curPeriod,
            notes: "Uang Muka BBM Solar & Transportasi POS",
            keterangan: "",
            unit: "Lot",
            initialVolume: 1,
            adjustedVolume: 1,
            rate: posCurRefill,
            isDeduction: true,
            subtotalInitial: posCurRefill,
            subtotalAdjusted: posCurRefill,
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

          {/* Dynamic Master SOW Items from Master Data */}
          {siteSowItems.length > 0 && (
            <div className="py-1 max-h-56 overflow-y-auto divide-y divide-slate-50">
              <div className="px-3.5 py-1 text-[10px] font-extrabold text-[#A57C50] uppercase tracking-wider bg-amber-50/50 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10 border-b border-amber-100/50">
                <span>Variabel SOW Master ({rawCust})</span>
                <span className="text-[9px] text-slate-400 font-normal">{siteSowItems.length} Item</span>
              </div>
              {siteSowItems.map((sow: any, idx: number) => {
                const sName = sow.name || sow.itemName;
                const nameLow = (sName || "").toLowerCase();
                const isDist = Boolean(sow.isDistanceVar) || nameLow.includes("distance") || nameLow.includes("overhaul");
                const isCoal = nameLow.includes("coal") || nameLow.includes("batubara");
                return (
                  <button
                    key={sow.id || idx}
                    type="button"
                    onClick={() => handleAddDynamicSOW(sow)}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-800 hover:bg-amber-50/70 font-bold flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-[3px] bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                      {isDist ? <Truck size={12} className="text-amber-700" /> : isCoal ? <Layers size={12} className="text-slate-800" /> : <Pickaxe size={12} className="text-[#A57C50]" />}
                    </div>
                    <div className="truncate flex-1">
                      <div className="font-bold text-slate-900 truncate">{sName}</div>
                      <div className="text-[10px] text-slate-500 font-normal">
                        {sow.unit || "BCM"} &bull; Rp {Number(sow.defaultRate || sow.rateIDR || 0).toLocaleString("id-ID")}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ================= BGG SPECIAL ADJUSTMENT OPTIONS ================= */}
          {isCustomerBGG && (
            <div className="py-1">
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
                onClick={() => handleAddSectionRow("POS_RF")}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-800 hover:bg-slate-50 font-bold flex items-center gap-2.5 transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-[3px] bg-blue-50 flex items-center justify-center text-blue-700 shrink-0">
                  <TrendingUp size={13} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Raise & Fall (3-Faktor DLF)</div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    Eskalasi Nilai Kontrak / Penyesuaian Harga BBM (Lot)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleAddSectionRow("POS_DP_FUEL")}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-800 hover:bg-slate-50 font-bold flex items-center gap-2.5 transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-[3px] bg-rose-50 flex items-center justify-center text-rose-700 shrink-0">
                  <Fuel size={13} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">DP Fuel &amp; Transport (Solar)</div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    Uang Muka BBM Solar POS (Seksi E, Pengurang)
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


