import { useEffect, useState, useRef } from "react";
import {
  Building2,
  Calculator,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Edit2,
  Filter,
  Flame,
  Info,
  Layers,
  Percent,
  Plus,
  RefreshCw,
  Search,
  Sliders,
  Trash2,
  TrendingUp,
  Upload,
  UserCheck,
  X
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { api, getCompanies, type Company } from "../lib/api";
import { MonthPickerInput } from "./finance/helpers";

const customerContractOptions = [
  { code: "ALL", name: "Semua Customer / Kontrak", project: "All Projects", contract: "Semua Kontrak Active" },
  { code: "POS", name: "PT Position (POS)", project: "POS PROJECT", contract: "002/POS-AAP/2025" },
  { code: "SBS", name: "PT Satria Bahana Sarana (SBS)", project: "PT Satria Bahana Sarana Site", contract: "230/AAP-SBS/EXT/XII/24" },
  { code: "BGG", name: "PT Budi Gema Gempita (BGG)", project: "PT Budi Gema Gempita Site", contract: "09/BGG-AAP/VIII/2018" },
  { code: "PTRO", name: "PT Petrosea (PTRO)", project: "PT Petrosea Site", contract: "001/PTRO-AAP/2024" },
  { code: "ABN", name: "PT Andalan Bhumi Nusantara (ABN)", project: "PT Andalan Bhumi Nusantara Site", contract: "001/AAP-ABN/IV/25" }
];

function IndoDecimalInput({
  value,
  onChange,
  placeholder,
  className
}: {
  value: number | undefined;
  onChange: (val: number) => void;
  placeholder?: string;
  className?: string;
}) {
  const formatDisplay = (val: number | undefined | null): string => {
    if (val === undefined || val === null || isNaN(val)) return "";
    const str = String(val);
    const [intPart, decPart] = str.split(".");
    const formattedInt = new Intl.NumberFormat("id-ID").format(Number(intPart) || 0);
    if (decPart !== undefined) {
      return `${formattedInt},${decPart.slice(0, 3)}`;
    }
    return formattedInt;
  };

  const parseVal = (str: string): number => {
    if (!str) return 0;
    const clean = str.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  const [text, setText] = useState<string>(() => formatDisplay(value));

  useEffect(() => {
    setText(formatDisplay(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^0-9.,]/g, "");
    const commaCount = (raw.match(/,/g) || []).length;
    if (commaCount > 1) {
      const firstIdx = raw.indexOf(",");
      raw = raw.slice(0, firstIdx + 1) + raw.slice(firstIdx + 1).replace(/,/g, "");
    }
    if (raw.includes(",")) {
      const [i, d] = raw.split(",");
      raw = `${i},${d.slice(0, 3)}`;
    }
    setText(raw);
    const num = parseVal(raw);
    onChange(num);
  };

  const handleBlur = () => {
    const num = parseVal(text);
    setText(formatDisplay(num));
    onChange(num);
  };

  return (
    <input
      type="text"
      className={className}
      placeholder={placeholder}
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}

export function MasterRaiseFallPage({
  viewTitle,
  query,
  onNotice,
  initialTab
}: {
  viewTitle: string;
  query: string;
  onNotice: (msg: string) => void;
  initialTab?: "monthly" | "base" | "umk" | "mrate" | "rates";
}) {
  const [activeTab, setActiveTab] = useState<"monthly" | "base" | "umk" | "mrate" | "rates">(
    initialTab || (viewTitle === "Currency" ? "mrate" : "monthly")
  );
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data states
  const [rfRows, setRfRows] = useState<any[]>([]);
  const [mrateRows, setMrateRows] = useState<any[]>([]);
  const [sowRows, setSowRows] = useState<any[]>([]);
  const [umkRows, setUmkRows] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState("ALL");
  const [companyList, setCompanyList] = useState<Company[]>([]);

  // Company options built from the backend API (/api/companies) — limited to active R&F contracts (BGG & POS).
  const customerContractOptions = [
    { code: "ALL", name: "Semua Customer R&F (BGG & POS)", project: "All Projects", contract: "Semua Kontrak Active" },
    ...companyList
      .filter((c) => c.code === "BGG" || c.code === "POS")
      .map((c) => ({
        code: c.code,
        name: `${c.name} (${c.code})`,
        project: c.code === "POS" ? "POS PROJECT" : "PT Budi Gema Gempita Site",
        contract: c.code === "POS" ? "002/POS-AAP/2025" : "09/BGG-AAP/VIII/2018"
      }))
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("period", activeRf?.period || "Juni 2026");

      const json = await api<any>("/api/master-data/import-bi-exchange-rates", {
        method: "POST",
        body: formData,
      });

      onNotice(json?.message || "Berhasil mengimpor data kurs harian dari BI Excel!");
      await loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal mengimpor file Excel BI");
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"rf" | "mrate" | "umk">("rf");
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteRfTarget, setDeleteRfTarget] = useState<{ id: number } | null>(null);
  const [deleteUmkTarget, setDeleteUmkTarget] = useState<{ id: number } | null>(null);

const defaultPosFuelRefills = [
  { id: "pos-rf-1", date: "2026-07-31", qty: 16000, unitPrice: 22961.30 },
  { id: "pos-rf-2", date: "2026-08-04", qty: 48000, unitPrice: 23918.92 },
  { id: "pos-rf-3", date: "2026-08-11", qty: 32000, unitPrice: 23918.92 },
  { id: "pos-rf-4", date: "2026-08-15", qty: 48000, unitPrice: 23918.92 },
  { id: "pos-rf-5", date: "2026-08-22", qty: 48000, unitPrice: 23918.92 },
  { id: "pos-rf-6", date: "2026-08-28", qty: 16000, unitPrice: 23918.92 },
];

  // Form states
  const [rfForm, setRfForm] = useState<any>({
    period: "August 2026",
    customerCode: "",
    projectSite: "",
    contractNo: "",
    formulaScheme: "TRIPLE_FACTOR_DLF",
    weightFuelA: 0.34,
    weightLaborB: 0.25,
    weightFixedC: 0.41,
    baseFuelFo: 10699.970229,
    baseLaborLo: 3594536,
    baseForexXo: 15388.75,
    actualFuelFn: 1.3359,
    actualLaborLn: 3721423,
    actualMRateXn: 17849.316,
    posFuelRefills: defaultPosFuelRefills.map((r) => ({ ...r })),
    notes: ""
  });

  const [umkForm, setUmkForm] = useState<any>({
    site: "POS PROJECT",
    year: 2026,
    amountIdr: 3721423,
    skNumber: "SK-GUB-SULTENG/2026/014",
    effectiveDate: "2026-01-01",
    notes: ""
  });

  const [mrateForm, setMrateForm] = useState<any>({
    period: "Juni 2026",
    dateStr: "",
    kursJual: 18000,
    kursBeli: 17800,
  });

  async function loadData() {
    setLoading(true);
    try {
      const [resRf, resMrate, resSow, resUmk] = await Promise.all([
        api<any[]>("/api/master-data/raise-fall"),
        api<any[]>("/api/master-data/daily-exchange-rates"),
        api<any[]>("/api/master-data/variable-sow"),
        api<any[]>("/api/master-data/min-wages").catch(() => []),
      ]);
      setRfRows(Array.isArray(resRf) ? resRf : []);
      setMrateRows(Array.isArray(resMrate) ? resMrate : []);
      setSowRows(Array.isArray(resSow) ? resSow : []);
      setUmkRows(Array.isArray(resUmk) ? resUmk : []);
    } catch (err: any) {
      onNotice(err?.message || "Gagal memuat data Master Raise & Fall");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Load company list from backend API (/api/companies) for the dropdown.
  useEffect(() => {
    getCompanies().then((c) => { if (Array.isArray(c)) setCompanyList(c); }).catch(() => {});
  }, []);

  // Calculated current active RF Index
  const filteredRfRows = rfRows.filter((r) => {
    if (selectedCustomer !== "ALL" && r.customerCode !== selectedCustomer) return false;
    return true;
  });

  const activeRf = filteredRfRows[0] || rfRows.find((r) => r.customerCode === selectedCustomer) || rfRows[0] || {
    period: "-",
    customerCode: selectedCustomer === "ALL" ? "" : selectedCustomer,
    projectSite: customerContractOptions.find((c) => c.code === selectedCustomer)?.project || "",
    contractNo: customerContractOptions.find((c) => c.code === selectedCustomer)?.contract || "",
    formulaScheme: "TRIPLE_FACTOR_DLF",
    weightFuelA: 0.34,
    weightLaborB: 0.25,
    weightFixedC: 0.41,
    baseFuelFo: 0,
    baseLaborLo: 0,
    baseForexXo: 0,
    actualFuelFn: 0,
    actualLaborLn: 0,
    actualMRateXn: 0,
    rfIndexResult: 0
  };

  // Average M-Rate calculation
  const avgMRateCalc = mrateRows.length > 0
    ? mrateRows.reduce((sum, r) => sum + (r.kursTengah || (r.kursJual + r.kursBeli) / 2), 0) / mrateRows.length
    : 0;

  // Real-time formula calculations
  const isBGGStyle = rfForm.formulaScheme === "SINGLE_FACTOR_FUEL" || rfForm.customerCode === "BGG";
  
  // BGG 1-Factor: Fn is the average of Periode I Total and Periode II Total (Gambar 2: Fuel + Transport)
  const bggTotalP1 = (Number(rfForm.bggFuelP1) || 0) + (Number(rfForm.bggTransportP1) || 0);
  const bggTotalP2 = (Number(rfForm.bggFuelP2) || 0) + (Number(rfForm.bggTransportP2) || 0);
  const bggAvgFn = (bggTotalP1 > 0 && bggTotalP2 > 0)
    ? (bggTotalP1 + bggTotalP2) / 2
    : (bggTotalP1 || bggTotalP2 || Number(rfForm.actualFuelFn) || 0);

  const bggBaseFo = 9000;
  // BGG 1-Factor: Index = 0.60 + 0.40 * (Fn / 9000)
  const calcBGGRF = bggAvgFn > 0 ? (0.60 + (0.40 * (bggAvgFn / bggBaseFo))) : 0;

  // POS 3-Factor: D + L + F as verified in Excel cell G20:
  // D = (a * Fn * Xn) / Fo
  // L = (b * Ln * Xn) / (Lo * Xo)
  const isPOSCalc = !isBGGStyle;
  const posBaseFo = isPOSCalc ? (Number(rfForm.baseFuelFo) > 100 ? Number(rfForm.baseFuelFo) : 10699.970229) : (Number(rfForm.baseFuelFo) || 9000);
  const posWeightA = isPOSCalc ? (Number(rfForm.weightFuelA) > 0 ? Number(rfForm.weightFuelA) : 0.34) : (Number(rfForm.weightFuelA) || 0.40);
  const posWeightB = isPOSCalc ? (Number(rfForm.weightLaborB) > 0 ? Number(rfForm.weightLaborB) : 0.25) : 0;
  const posWeightC = isPOSCalc ? (Number(rfForm.weightFixedC) > 0 ? Number(rfForm.weightFixedC) : 0.41) : 0.60;
  const posBaseLo = isPOSCalc ? (Number(rfForm.baseLaborLo) > 1000 ? Number(rfForm.baseLaborLo) : 3594536) : 3600000;
  const posBaseXo = isPOSCalc ? (Number(rfForm.baseForexXo) > 1000 ? Number(rfForm.baseForexXo) : 15388.75) : 15400;

  const posRefills: any[] = Array.isArray(rfForm.posFuelRefills) && rfForm.posFuelRefills.length > 0
    ? rfForm.posFuelRefills
    : (isPOSCalc ? defaultPosFuelRefills : []);

  let posTotalQty = 0;
  let posTotalCost = 0;
  posRefills.forEach((r) => {
    const q = Number(r.qty || 0);
    const p = Number(r.unitPrice || 0);
    if (q > 0) {
      posTotalQty += q;
      posTotalCost += q * p;
    }
  });
  const posAvgPriceIDR = posTotalQty > 0 ? (posTotalCost / posTotalQty) : 0;
  const posMrateXn = Number(rfForm.actualMRateXn || (avgMRateCalc > 0 ? avgMRateCalc : 17849.316));
  const posFnFromRefills = (posAvgPriceIDR > 0 && posMrateXn > 0)
    ? Number((posAvgPriceIDR / posMrateXn).toFixed(4))
    : 0;

  const effectivePosFn = posFnFromRefills > 0 ? posFnFromRefills : Number(rfForm.actualFuelFn || 0);

  const calcFuelD = posBaseFo > 0
    ? (posWeightA * (posAvgPriceIDR > 0 ? posAvgPriceIDR : (effectivePosFn * (effectivePosFn < 100 ? posMrateXn : 1)))) / posBaseFo
    : 0;

  const loXo = posBaseLo * posBaseXo;
  const calcLaborL = loXo > 0
    ? (posWeightB * Number(rfForm.actualLaborLn || 0) * posMrateXn) / loXo
    : 0;

  const calcFixedF = posWeightC;
  const calcTotalRF = isBGGStyle ? calcBGGRF : (calcFuelD + calcLaborL + calcFixedF);

  const handlePOSRefillChange = (index: number, field: "date" | "qty" | "unitPrice", val: any) => {
    setRfForm((prev: any) => {
      const currentRefills = Array.isArray(prev.posFuelRefills) && prev.posFuelRefills.length > 0
        ? prev.posFuelRefills.map((r: any) => ({ ...r }))
        : defaultPosFuelRefills.map((r: any) => ({ ...r }));

      if (!currentRefills[index]) return prev;
      currentRefills[index] = {
        ...currentRefills[index],
        [field]: field === "date" ? val : Math.max(0, Number(val || 0)),
      };

      let totQ = 0;
      let totC = 0;
      currentRefills.forEach((r) => {
        const q = Number(r.qty || 0);
        const p = Number(r.unitPrice || 0);
        if (q > 0) {
          totQ += q;
          totC += q * p;
        }
      });
      const avgIDR = totQ > 0 ? (totC / totQ) : 0;
      const xn = Number(prev.actualMRateXn || (avgMRateCalc > 0 ? avgMRateCalc : 17849.316));
      const fn = (avgIDR > 0 && xn > 0) ? Number((avgIDR / xn).toFixed(4)) : Number(prev.actualFuelFn || 0);

      return {
        ...prev,
        posFuelRefills: currentRefills,
        actualFuelFn: fn,
      };
    });
  };

  const handleAddPOSRefill = () => {
    setRfForm((prev: any) => {
      const currentRefills = Array.isArray(prev.posFuelRefills) && prev.posFuelRefills.length > 0
        ? prev.posFuelRefills.map((r: any) => ({ ...r }))
        : defaultPosFuelRefills.map((r: any) => ({ ...r }));

      const todayStr = new Date().toISOString().split("T")[0];
      currentRefills.push({
        id: `pos-rf-${Date.now()}-${currentRefills.length + 1}`,
        date: todayStr,
        qty: 0,
        unitPrice: 0,
      });

      return {
        ...prev,
        posFuelRefills: currentRefills,
      };
    });
  };

  const handleRemovePOSRefill = (index: number) => {
    setRfForm((prev: any) => {
      const currentRefills = Array.isArray(prev.posFuelRefills) && prev.posFuelRefills.length > 0
        ? prev.posFuelRefills.map((r: any) => ({ ...r }))
        : defaultPosFuelRefills.map((r: any) => ({ ...r }));

      if (currentRefills.length <= 1) return prev;
      currentRefills.splice(index, 1);

      let totQ = 0;
      let totC = 0;
      currentRefills.forEach((r) => {
        const q = Number(r.qty || 0);
        const p = Number(r.unitPrice || 0);
        if (q > 0) {
          totQ += q;
          totC += q * p;
        }
      });
      const avgIDR = totQ > 0 ? (totC / totQ) : 0;
      const xn = Number(prev.actualMRateXn || (avgMRateCalc > 0 ? avgMRateCalc : 17849.316));
      const fn = (avgIDR > 0 && xn > 0) ? Number((avgIDR / xn).toFixed(4)) : Number(prev.actualFuelFn || 0);

      return {
        ...prev,
        posFuelRefills: currentRefills,
        actualFuelFn: fn,
      };
    });
  };

  const handleSaveRf = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const matchedUmk = umkRows.find((u) => u.site.includes("Budi Gema Gempita") || u.site.includes("POS") || u.site === rfForm.projectSite);
      const autoLn = rfForm.actualLaborLn || (matchedUmk ? matchedUmk.amountIdr : (isBGGStyle ? 3565000 : 3721423));
      const autoXn = rfForm.actualMRateXn || Number(avgMRateCalc > 0 ? avgMRateCalc.toFixed(3) : 17849.316);

      const payload = {
        ...rfForm,
        actualLaborLn: Number(autoLn),
        actualMRateXn: Number(autoXn),
      };

      if (isBGGStyle) {
        payload.bggFuelP1 = Number(rfForm.bggFuelP1) || 0;
        payload.bggTransportP1 = Number(rfForm.bggTransportP1) || 0;
        payload.bggFuelP2 = Number(rfForm.bggFuelP2) || 0;
        payload.bggTransportP2 = Number(rfForm.bggTransportP2) || 0;
        payload.actualFuelFn = bggAvgFn;
        payload.baseFuelFo = 9000;
        payload.weightFuelA = 0.40;
        payload.weightLaborB = 0.0;
        payload.weightFixedC = 0.60;
        payload.formulaScheme = "SINGLE_FACTOR_FUEL";
        payload.customerCode = payload.customerCode || "BGG";
        payload.projectSite = payload.projectSite || "PT Budi Gema Gempita Site";
        payload.contractNo = payload.contractNo || "09/BGG-AAP/VIII/2018";
        payload.rfIndexResult = Number(calcBGGRF.toFixed(3));
      } else {
        payload.actualFuelFn = effectivePosFn;
        payload.baseFuelFo = posBaseFo;
        payload.baseLaborLo = posBaseLo;
        payload.baseForexXo = posBaseXo;
        payload.weightFuelA = posWeightA;
        payload.weightLaborB = posWeightB;
        payload.weightFixedC = posWeightC;
        payload.formulaScheme = "TRIPLE_FACTOR_DLF";
        payload.customerCode = payload.customerCode || "POS";
        payload.projectSite = payload.projectSite || "POS PROJECT";
        payload.posFuelRefills = posRefills;
        payload.rfIndexResult = Number(calcTotalRF.toFixed(3));
      }

      let endpoint = "/api/master-data/raise-fall";
      let saved: any = null;
      if (editItem?.id) {
        endpoint += `/${editItem.id}`;
        saved = await api(endpoint, { method: "PUT", body: JSON.stringify(payload) });
        // 🚀 Optimistic UI Update
        setRfRows((prev) => prev.map((r) => r.id === editItem.id ? (saved || { ...r, ...payload }) : r));
        onNotice("Master Raise & Fall berhasil diperbarui!");
      } else {
        saved = await api(endpoint, { method: "POST", body: JSON.stringify(payload) });
        // 🚀 Optimistic UI Update
        setRfRows((prev) => [saved || { id: Date.now(), ...payload } as any, ...prev]);
        onNotice("Periode Raise & Fall baru berhasil ditambahkan!");
      }
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal menyimpan data Raise & Fall");
    }
  };

  const handleSaveUmk = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let endpoint = "/api/master-data/min-wages";
      let saved: any = null;
      if (editItem?.id) {
        endpoint += `/${editItem.id}`;
        saved = await api(endpoint, { method: "PUT", body: JSON.stringify(umkForm) });
        // 🚀 Optimistic UI Update
        setUmkRows((prev) => prev.map((r) => r.id === editItem.id ? (saved || { ...r, ...umkForm }) : r));
        onNotice("Referensi UMK berhasil diperbarui!");
      } else {
        saved = await api(endpoint, { method: "POST", body: JSON.stringify(umkForm) });
        // 🚀 Optimistic UI Update
        setUmkRows((prev) => [saved || { id: Date.now(), ...umkForm } as any, ...prev]);
        onNotice("Referensi UMK baru berhasil ditambahkan!");
      }
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal menyimpan Referensi UMK");
    }
  };

  const handleDeleteUmk = async (id: number) => {
    setUmkRows((prev) => prev.filter((r) => r.id !== id));
    setDeleteUmkTarget(null);
    try {
      await api(`/api/master-data/min-wages/${id}`, { method: "DELETE" });
      onNotice("Referensi UMK berhasil dihapus");
      await loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal menghapus UMK");
      await loadData();
    }
  };

  const handleSaveMRate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let endpoint = "/api/master-data/daily-exchange-rates";
      let saved: any = null;
      if (editItem?.id) {
        endpoint += `/${editItem.id}`;
        saved = await api(endpoint, { method: "PUT", body: JSON.stringify(mrateForm) });
        // 🚀 Optimistic UI Update
        setMrateRows((prev) => prev.map((r) => r.id === editItem.id ? (saved || { ...r, ...mrateForm }) : r));
        onNotice("Kurs Harian M-Rate berhasil diperbarui!");
      } else {
        saved = await api(endpoint, { method: "POST", body: JSON.stringify(mrateForm) });
        // 🚀 Optimistic UI Update
        setMrateRows((prev) => [saved || { id: Date.now(), ...mrateForm } as any, ...prev]);
        onNotice("Kurs Harian M-Rate baru berhasil ditambahkan!");
      }
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal menyimpan Kurs Harian");
    }
  };

  const handleDeleteRf = async (id: number) => {
    setRfRows((prev) => prev.filter((r) => r.id !== id));
    setDeleteRfTarget(null);
    try {
      await api(`/api/master-data/raise-fall/${id}`, { method: "DELETE" });
      onNotice("Data Raise & Fall berhasil dihapus");
      await loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal menghapus data");
      await loadData();
    }
  };

  const openCreateRfModal = () => {
    setModalType("rf");
    setEditItem(null);
    const isBGG = selectedCustomer === "BGG";
    
    // Auto-lookup UMK for site
    const matchedUmk = umkRows.find((u) => u.site === (isBGG ? "PT Budi Gema Gempita Site" : "POS PROJECT") && u.year === 2026);
    const autoLn = matchedUmk ? matchedUmk.amountIdr : (isBGG ? 3565000 : 3721423);

    setRfForm({
      period: "August 2026",
      customerCode: selectedCustomer === "ALL" ? "" : selectedCustomer,
      projectSite: isBGG ? "PT Budi Gema Gempita Site" : "POS PROJECT",
      contractNo: isBGG ? "09/BGG-AAP/VIII/2018" : "002/POS-AAP/2025",
      addendumNo: isBGG ? "Addendum 02/ADDM-BGG-AAP/I/2022" : "Addendum 01/POS-AAP/VI/2025",
      effectiveFrom: isBGG ? "2022-01-01" : "2025-06-01",
      effectiveTo: "Open-ended",
      status: "Active",
      formulaScheme: isBGG ? "SINGLE_FACTOR_FUEL" : "TRIPLE_FACTOR_DLF",
      weightFuelA: isBGG ? 0.40 : 0.34,
      weightLaborB: isBGG ? 0.0 : 0.25,
      weightFixedC: isBGG ? 0.60 : 0.41,
      baseFuelFo: isBGG ? 9000 : 10699.970229,
      baseLaborLo: isBGG ? 0 : 3594536,
      baseForexXo: 15388.75,
      actualFuelFn: 0,
      actualLaborLn: autoLn,
      actualMRateXn: Number(avgMRateCalc > 0 ? avgMRateCalc.toFixed(3) : 17849.316),
      bggFuelP1: 0,
      bggTransportP1: 0,
      bggFuelP2: 0,
      bggTransportP2: 0,
      posFuelRefills: isBGG ? [] : defaultPosFuelRefills.map((r) => ({ ...r })),
      notes: isBGG ? "Kalkulasi RF BGG 1-Faktor BBM" : "Kalkulasi RF POS 3-Faktor DLF"
    });
    setModalOpen(true);
  };

  const openCreateUmkModal = () => {
    setModalType("umk");
    setEditItem(null);
    setUmkForm({
      site: "POS PROJECT",
      year: 2026,
      amountIdr: 0,
      skNumber: "",
      effectiveDate: "2026-01-01",
      notes: ""
    });
    setModalOpen(true);
  };

  const openEditRfModal = (item: any) => {
    setModalType("rf");
    setEditItem(item);
    const isBGG = item.customerCode === "BGG" || item.formulaScheme === "SINGLE_FACTOR_FUEL";
    const matchedUmk = umkRows.find((u) => u.site === (isBGG ? "PT Budi Gema Gempita Site" : (item.projectSite || "POS PROJECT")));
    const autoLn = item.actualLaborLn || (matchedUmk ? matchedUmk.amountIdr : (isBGG ? 3565000 : 3721423));
    const autoXn = item.actualMRateXn || Number(avgMRateCalc > 0 ? avgMRateCalc.toFixed(3) : 17849.316);
    const isPOS = item.customerCode === "POS" || item.formulaScheme === "TRIPLE_FACTOR_DLF";
    const baseFo = isBGG ? 9000 : (Number(item.baseFuelFo) > 100 ? Number(item.baseFuelFo) : 10699.970229);
    const baseLo = isPOS ? (Number(item.baseLaborLo) > 1000 ? Number(item.baseLaborLo) : 3594536) : (Number(item.baseLaborLo) || 3600000);
    const baseXo = isPOS ? (Number(item.baseForexXo) > 1000 ? Number(item.baseForexXo) : 15388.75) : (Number(item.baseForexXo) || 15400);
    const weightA = isPOS ? (Number(item.weightFuelA) > 0 ? Number(item.weightFuelA) : 0.34) : (Number(item.weightFuelA) || 0.40);
    const weightB = isPOS ? (Number(item.weightLaborB) > 0 ? Number(item.weightLaborB) : 0.25) : (Number(item.weightLaborB) || 0.0);
    const weightC = isPOS ? (Number(item.weightFixedC) > 0 ? Number(item.weightFixedC) : 0.41) : (Number(item.weightFixedC) || 0.60);
    const refills = (Array.isArray(item.posFuelRefills) && item.posFuelRefills.length > 0)
      ? item.posFuelRefills
      : (isPOS ? defaultPosFuelRefills.map((r) => ({ ...r })) : []);

    setRfForm({
      ...item,
      actualLaborLn: autoLn,
      actualMRateXn: autoXn,
      bggFuelP1: item.bggFuelP1 ?? 0,
      bggTransportP1: item.bggTransportP1 ?? 0,
      bggFuelP2: item.bggFuelP2 ?? 0,
      bggTransportP2: item.bggTransportP2 ?? 0,
      baseFuelFo: baseFo,
      baseLaborLo: baseLo,
      baseForexXo: baseXo,
      weightFuelA: weightA,
      weightLaborB: weightB,
      weightFixedC: weightC,
      posFuelRefills: refills,
    });
    setModalOpen(true);
  };

  const openCreateMRateModal = () => {
    setModalType("mrate");
    setEditItem(null);
    setMrateForm({
      period: "Juni 2026",
      dateStr: new Date().toLocaleDateString("id-ID"),
      kursJual: 18000,
      kursBeli: 17800,
    });
    setModalOpen(true);
  };

  const isCurrencyPage = viewTitle === "Currency";

  return (
    <div className="space-y-5 font-sans">
      <PageHeader
        title={isCurrencyPage ? "Master Data: Currency & Kurs Tengah M-Rate (Bank Indonesia)" : (viewTitle || "Master Data: Raise & Fall Index & Formula Rate")}
        description={isCurrencyPage ? "Kelola data Kurs Harian Bank Indonesia (M-Rate), impor file Excel resmi BI, dan pemantauan pergerakan Forex USD/IDR." : "Kelola parameter indeks dasar, indeks aktual (Fuel, Labor, Forex), dan formulasi penyesuaian harga Raise & Fall berdasarkan referensi Perhitungan POS Project."}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Data
          </button>
          {isCurrencyPage ? (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <Upload size={14} /> {uploading ? "Mengimpor..." : "Import Excel BI"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                onClick={openCreateMRateModal}
                className="bg-[#A57C50] hover:bg-[#8e6941] text-white font-bold px-3 py-1.5 rounded-[3px] text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Plus size={14} /> + Kurs M-Rate Manual
              </button>
            </>
          ) : (
            <button
              onClick={openCreateRfModal}
              className="bg-[#A57C50] hover:bg-[#8e6941] text-white font-bold px-3 py-1.5 rounded-[3px] text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Plus size={14} /> Hitung Periode RF Baru
            </button>
          )}
        </div>
      </PageHeader>

      {/* Customer & Contract Selection Bar (Only for Raise & Fall) */}
      {!isCurrencyPage && (
        <div className="bg-white p-3 rounded-[4px] border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-slate-100 text-slate-700 rounded-[3px] border border-slate-200">
              <Building2 size={15} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">Klien & Kontrak Aktif</span>
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                {customerContractOptions.find((c) => c.code === selectedCustomer)?.name || "Semua Customer"}
                <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-[3px] font-mono text-[11px]">
                  {customerContractOptions.find((c) => c.code === selectedCustomer)?.contract || "All"}
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Pilih Klien / Kontrak:</span>
            <select
              value={selectedCustomer}
              onChange={(e) => {
                const code = e.target.value;
                setSelectedCustomer(code);
                const opt = customerContractOptions.find((c) => c.code === code);
                if (opt && opt.code !== "ALL") {
                  setRfForm((prev: any) => ({
                    ...prev,
                    customerCode: opt.code,
                    projectSite: opt.project,
                    contractNo: opt.contract
                  }));
                }
              }}
              className="bg-slate-50 border border-slate-300 rounded-[3px] px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#A57C50] shadow-xs"
            >
              {customerContractOptions.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.name} — ({opt.contract})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Top Metric Cards Summary */}
      {isCurrencyPage ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-white p-3.5 rounded-[4px] border border-slate-200 shadow-xs space-y-1">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">M-Rate Average (Xn)</span>
              <TrendingUp size={14} className="text-[#A57C50]" />
            </div>
            <div className="text-xl font-bold text-slate-900 tabular-nums">
              Rp {avgMRateCalc.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100">
              <span>Sumber: Bank Indonesia (Excel/Manual)</span>
              <span className="text-emerald-700 font-bold">Kurs Resmi</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-[4px] border border-slate-200 shadow-xs space-y-1">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Log Kurs Harian BI</span>
              <Calendar size={14} className="text-slate-600" />
            </div>
            <div className="text-xl font-bold text-slate-900 tabular-nums">
              {mrateRows.length} Hari
            </div>
            <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100">
              <span>Status: Data siap digunakan</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-[4px] border border-slate-200 shadow-xs space-y-1">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Index Raise & Fall (RF)</span>
              <Calculator size={14} className="text-[#A57C50]" />
            </div>
            <div className="text-xl font-bold text-slate-900 tracking-tight tabular-nums">
              {activeRf.rfIndexResult ? activeRf.rfIndexResult.toFixed(3) : "1.521"}
            </div>
            <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100">
              <span>Periode: <strong>{activeRf.period || "Juni 2026"}</strong></span>
              <span className="text-emerald-700 font-bold">Terverifikasi</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-[4px] border border-slate-200 shadow-xs space-y-1">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Base Fuel (Fo)</span>
              <Flame size={14} className="text-amber-600" />
            </div>
            <div className="text-lg font-bold text-slate-900 tabular-nums">
              Rp {(activeRf.baseFuelFo || 10699.97).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100">
              <span>Bobot Fuel (a): 34.0%</span>
              <span>Fn: USD {(activeRf.actualFuelFn || 1.422).toFixed(3)}</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-[4px] border border-slate-200 shadow-xs space-y-1">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Base Labor (Lo)</span>
              <Percent size={14} className="text-slate-600" />
            </div>
            <div className="text-lg font-bold text-slate-900 tabular-nums">
              Rp {(activeRf.baseLaborLo || 3594536).toLocaleString("id-ID")}
            </div>
            <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100">
              <span>Bobot (b): 25.0%</span>
              <span>Fixed (c): 41.0%</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-[4px] border border-slate-200 shadow-xs space-y-1">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">M-Rate Average (Xn)</span>
              <TrendingUp size={14} className="text-[#A57C50]" />
            </div>
            <div className="text-lg font-bold text-slate-900 tabular-nums">
              Rp {avgMRateCalc.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100">
              <span>Base Forex (Xo): Rp 15.388,75</span>
              <span>Total Log: {mrateRows.length} Hari</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      {!isCurrencyPage && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab("monthly")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] text-xs font-bold border transition cursor-pointer ${
              activeTab === "monthly"
                ? "bg-[#A57C50] text-white border-[#A57C50] shadow-xs"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Calculator size={13} /> Log Kalkulasi RF ({rfRows.length})
          </button>

          <button
            onClick={() => setActiveTab("base")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] text-xs font-bold border transition cursor-pointer ${
              activeTab === "base"
                ? "bg-[#A57C50] text-white border-[#A57C50] shadow-xs"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Sliders size={13} /> Formulasi & Indeks Dasar
          </button>

          <button
            onClick={() => setActiveTab("umk")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] text-xs font-bold border transition cursor-pointer ${
              activeTab === "umk"
                ? "bg-[#A57C50] text-white border-[#A57C50] shadow-xs"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Building2 size={13} /> Referensi UMK Site ({umkRows.length})
          </button>
        </div>
      )}

      {/* Tab 1: Log Kalkulasi Periode RF */}
      {activeTab === "monthly" && (
        <Panel title="Daftar Perhitungan Indeks Raise & Fall Per Periode">
          <div className="overflow-x-auto rounded-[4px] border border-slate-200">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-800 font-bold text-[11px] uppercase border-b border-slate-200">
                  <th className="p-2.5 border-r border-slate-200">PERIODE</th>
                  <th className="p-2.5 border-r border-slate-200">KONTRAK & CUSTOMER</th>
                  <th className="p-2.5 border-r border-slate-200">SKEMA FORMULA</th>
                  <th className="p-2.5 text-right border-r border-slate-200">FUEL (Fn)</th>
                  <th className="p-2.5 text-right border-r border-slate-200">LABOR (Ln IDR)</th>
                  <th className="p-2.5 text-right border-r border-slate-200">M-RATE (Xn IDR)</th>
                  <th className="p-2.5 text-right border-r border-slate-200 font-bold text-slate-900">RF INDEX RESULT</th>
                  <th className="p-2.5 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-900 bg-white">
                {filteredRfRows.map((r) => {
                  const isSingle = r.formulaScheme === "SINGLE_FACTOR_FUEL" || r.customerCode === "BGG";
                  let d = 0, l = 0, f = 0, totalRf = 0;

                  if (isSingle) {
                    const fo = r.baseFuelFo || 9000;
                    const fn = r.actualFuelFn || fo;
                    totalRf = r.rfIndexResult || (0.60 + 0.40 * (fn / fo));
                  } else {
                    d = r.baseFuelFo > 0 ? (r.weightFuelA * r.actualFuelFn * (r.actualFuelFn < 100 ? r.actualMRateXn : 1)) / r.baseFuelFo : 0;
                    l = r.baseLaborLo > 0 ? (r.weightLaborB * r.actualLaborLn) / r.baseLaborLo : 0;
                    f = r.weightFixedC || 0.41;
                    totalRf = r.rfIndexResult || (d + l + f);
                  }

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 border-b border-slate-100">
                      <td className="p-2.5 font-bold text-slate-900 border-r border-slate-100">
                        {r.period}
                      </td>
                      <td className="p-2.5 border-r border-slate-100">
                        <div className="font-bold text-slate-900">{r.customerCode} — {r.projectSite}</div>
                        <div className="text-[10px] tabular-nums text-slate-500">{r.contractNo}</div>
                        {r.addendumNo && (
                          <div className="text-[10px] tabular-nums font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-1.5 py-0.5 rounded-[3px] mt-0.5 inline-block">
                            {r.addendumNo} {r.effectiveFrom ? `(${r.effectiveFrom} s/d ${r.effectiveTo || "Open"})` : ""}
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 border-r border-slate-100">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-[3px] text-[10px] font-bold ${
                            isSingle ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-800"
                          }`}>
                            {isSingle ? "1-Faktor BBM" : "3-Faktor (D+L+F)"}
                          </span>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-[3px] text-[9px] font-bold ${
                            r.status === "Archived" ? "bg-slate-100 text-slate-600 border border-slate-300" : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          }`}>
                            {r.status || "Active"}
                          </span>
                        </div>
                      </td>
                      <td className="p-2.5 text-right tabular-nums font-bold border-r border-slate-100">
                        {r.actualFuelFn > 100 ? `Rp ${r.actualFuelFn?.toLocaleString("id-ID")}` : `USD ${r.actualFuelFn?.toFixed(3)}`}
                      </td>
                      {/* LABOR (Ln IDR) - DYNAMIC MASTER DATA LOOKUP */}
                      <td className="p-2.5 text-right tabular-nums font-bold border-r border-slate-100">
                        {(() => {
                          const siteUmk = umkRows.find(
                            (u) =>
                              u.site === r.projectSite ||
                              (r.customerCode === "BGG" && u.site.toLowerCase().includes("budi gema gempita")) ||
                              (r.customerCode === "POS" && u.site.toLowerCase().includes("pos"))
                          );
                          const laborVal = (r.actualLaborLn && r.actualLaborLn > 0)
                            ? r.actualLaborLn
                            : (siteUmk?.amountIdr || (r.customerCode === "BGG" ? 3565000 : 3721423));
                          return `Rp ${Number(laborVal).toLocaleString("id-ID")}`;
                        })()}
                      </td>

                      {/* M-RATE (Xn IDR) - DYNAMIC MASTER DATA LOOKUP */}
                      <td className="p-2.5 text-right tabular-nums font-bold border-r border-slate-100">
                        {(() => {
                          const mRateVal = (r.actualMRateXn && r.actualMRateXn > 0)
                            ? r.actualMRateXn
                            : (avgMRateCalc > 0 ? avgMRateCalc : 17849.316);
                          return `Rp ${Number(mRateVal).toLocaleString("id-ID", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;
                        })()}
                      </td>
                      <td className="p-2.5 text-right tabular-nums font-bold text-sm text-slate-950 border-r border-slate-100 underline">
                        {totalRf.toFixed(3)}
                      </td>
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditRfModal(r)}
                            className="p-1 text-slate-600 hover:text-[#A57C50] rounded-[3px] transition-colors"
                            title="Edit Record"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteRfTarget({ id: r.id })}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded-[3px] transition-colors"
                            title="Hapus Record"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Tab 2: Formulasi & Indeks Dasar Kontrak */}
      {activeTab === "base" && (
        <Panel title="Parameter Formula & Indeks Dasar Kontrak (Multi-Scheme Engine)">
          <div className="space-y-4 text-xs text-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Skema 1: BGG 1-Faktor BBM */}
              <div className="p-4 bg-slate-900 text-white rounded-[4px] shadow-xs space-y-3 border border-slate-800 font-mono">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
                  <Flame size={15} /> SKEMA BGG: 1-FAKTOR FUEL (ESKALASI BBM MURNI)
                </div>
                <div className="p-2.5 bg-slate-800/90 rounded-[3px] border border-slate-700 text-slate-200 text-xs">
                  <code>Index = 0,60 + 0,40 × (Fn / Fo)</code>
                </div>
                <ul className="text-[11px] text-slate-300 space-y-1 font-sans">
                  <li>• <strong>Tanpa Komponen Upah/Labor</strong> & tanpa faktor kurs forex.</li>
                  <li>• <strong>Fo (Baseline Fuel):</strong> Rp 9.000 / Liter (Konvensi Kontrak BGG).</li>
                  <li>• <strong>Fn (Aktual Fuel):</strong> Harga solar industri aktual periode berjalan.</li>
                </ul>
              </div>

              {/* Skema 2: POS 3-Faktor DLF */}
              <div className="p-4 bg-slate-900 text-white rounded-[4px] shadow-xs space-y-3 border border-slate-800 font-mono">
                <div className="text-xs font-bold text-[#A57C50] uppercase tracking-widest flex items-center gap-2">
                  <Calculator size={15} /> SKEMA POS: 3-FAKTOR D + L + F (DIESEL, LABOR, FIXED)
                </div>
                <div className="p-2.5 bg-slate-800/90 rounded-[3px] border border-slate-700 text-slate-200 text-xs">
                  <code>Index = D + L + F</code>
                  <div className="text-[10px] text-teal-300 mt-1">
                    D = [a × Fn × Xn] / Fo | L = b × (Ln / Lo) (Rasio IDR Murni!) | F = c
                  </div>
                </div>
                <ul className="text-[11px] text-slate-300 space-y-1 font-sans">
                  <li>• <strong>Bobot:</strong> Fuel (a) 34%, Labor (b) 25%, Fixed (c) 41%.</li>
                  <li>• <strong>Ln (Upah Aktual):</strong> Auto-fill dari Referensi UMK Site Morowali.</li>
                  <li>• <strong>Labor Tanpa Forex:</strong> Menggunakan rasio murni Rupiah UMK (Ln / Lo).</li>
                </ul>
              </div>
            </div>

            {/* Grid Detail Base Index Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-[4px] space-y-2.5">
                <h4 className="font-bold uppercase text-slate-900 text-xs tracking-wider flex items-center gap-2">
                  <Percent size={14} className="text-[#A57C50]" /> Bobot Komponen Terbobot (POS Project):
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between p-2 bg-white rounded-[3px] border border-slate-200">
                    <span className="font-bold text-slate-600">a (Fuel Weighting)</span>
                    <strong className="text-slate-900 tabular-nums">34,0%</strong>
                  </div>
                  <div className="flex justify-between p-2 bg-white rounded-[3px] border border-slate-200">
                    <span className="font-bold text-slate-600">b (Labor Weighting)</span>
                    <strong className="text-slate-900 tabular-nums">25,0%</strong>
                  </div>
                  <div className="flex justify-between p-2 bg-white rounded-[3px] border border-slate-200">
                    <span className="font-bold text-slate-600">c (Fixed Weighting)</span>
                    <strong className="text-slate-900 tabular-nums">41,0%</strong>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-[4px] space-y-2.5">
                <h4 className="font-bold uppercase text-slate-900 text-xs tracking-wider flex items-center gap-2">
                  <Layers size={14} className="text-[#A57C50]" /> Nilai Indeks Dasar Kontrak (Base Index Values):
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between p-2 bg-white rounded-[3px] border border-slate-200">
                    <span className="font-bold text-slate-600 font-sans">Fo (Base Fuel POS)</span>
                    <strong className="text-slate-900 tabular-nums">Rp 10.699,97</strong>
                  </div>
                  <div className="flex justify-between p-2 bg-white rounded-[3px] border border-slate-200">
                    <span className="font-bold text-slate-600 font-sans">Lo (Base Labor POS)</span>
                    <strong className="text-slate-900 tabular-nums">Rp 3.594.536,00</strong>
                  </div>
                  <div className="flex justify-between p-2 bg-white rounded-[3px] border border-slate-200">
                    <span className="font-bold text-slate-600 font-sans">Xo (Base Forex POS)</span>
                    <strong className="text-slate-900 tabular-nums">Rp 15.388,75</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Panel>
      )}

      {/* Tab UMK: Referensi UMK Site (Master Data Baru per PRD §3.3) */}
      {activeTab === "umk" && (
        <Panel
          title="Master Data: Referensi UMK (Upah Minimum Kabupaten/Kota) Per Site"
          action={
            <button
              onClick={openCreateUmkModal}
              className="bg-[#A57C50] hover:bg-[#8e6941] text-white font-bold px-3 py-1.5 rounded-[3px] text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Plus size={14} /> + Tambah Nilai UMK Baru
            </button>
          }
        >
          <div className="overflow-x-auto rounded-[4px] border border-slate-200">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-800 font-bold text-[11px] uppercase border-b border-slate-200">
                  <th className="p-2.5 border-r border-slate-200">PROJECT SITE</th>
                  <th className="p-2.5 text-center border-r border-slate-200">TAHUN BERLAKU</th>
                  <th className="p-2.5 text-right border-r border-slate-200 font-bold text-slate-900">NILAI UMK (IDR)</th>
                  <th className="p-2.5 border-r border-slate-200">NO. SK / PERATURAN GUBERNUR</th>
                  <th className="p-2.5 text-center border-r border-slate-200">TANGGAL EFEKTIF</th>
                  <th className="p-2.5 border-r border-slate-200">CATATAN AUDIT</th>
                  <th className="p-2.5 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-900 bg-white">
                {umkRows.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 border-b border-slate-100">
                    <td className="p-2.5 font-bold text-slate-900 border-r border-slate-100">
                      {u.site}
                    </td>
                    <td className="p-2.5 text-center font-bold tabular-nums border-r border-slate-100">
                      {u.year}
                    </td>
                    <td className="p-2.5 text-right tabular-nums font-bold text-sm text-slate-900 border-r border-slate-100">
                      Rp {u.amountIdr?.toLocaleString("id-ID")}
                    </td>
                    <td className="p-2.5 tabular-nums text-[11px] text-slate-700 border-r border-slate-100">
                      {u.skNumber || "-"}
                    </td>
                    <td className="p-2.5 text-center tabular-nums text-[11px] border-r border-slate-100">
                      {u.effectiveDate || "-"}
                    </td>
                    <td className="p-2.5 text-slate-600 text-[11px] border-r border-slate-100">
                      {u.notes || "-"}
                    </td>
                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setModalType("umk");
                            setEditItem(u);
                            setUmkForm({ ...u });
                            setModalOpen(true);
                          }}
                          className="p-1 text-slate-600 hover:text-[#A57C50] rounded-[3px] transition-colors"
                          title="Edit UMK"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteUmkTarget({ id: u.id })}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded-[3px] transition-colors"
                          title="Hapus UMK"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Tab 3: Kurs M-Rate BI */}
      {activeTab === "mrate" && (
        <Panel
          title="Master Record Kurs Tengah M-Rate (Bank Indonesia)"
          action={
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx, .xls"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-[#A57C50] hover:bg-[#8e6941] text-white font-bold px-3 py-1.5 rounded-[3px] text-xs flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
              >
                <Upload size={13} className={uploading ? "animate-bounce" : ""} /> {uploading ? "Mengimpor..." : "Import Excel Kurs BI"}
              </button>
            </div>
          }
        >
          <div className="overflow-x-auto rounded-[4px] border border-slate-200">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-800 font-bold text-[11px] uppercase border-b border-slate-200">
                  <th className="p-2.5 border-r border-slate-200">NO</th>
                  <th className="p-2.5 border-r border-slate-200">TANGGAL KURS</th>
                  <th className="p-2.5 text-right border-r border-slate-200">KURS JUAL (IDR)</th>
                  <th className="p-2.5 text-right border-r border-slate-200">KURS BELI (IDR)</th>
                  <th className="p-2.5 text-right font-bold text-slate-900">KURS TENGAH (IDR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-900 tabular-nums bg-white">
                {mrateRows.map((m, idx) => (
                  <tr key={m.id || idx} className="hover:bg-slate-50/80 border-b border-slate-100">
                    <td className="p-2.5 text-center border-r border-slate-100 font-sans font-bold">{m.no || idx + 1}</td>
                    <td className="p-2.5 border-r border-slate-100 font-sans font-bold">{m.dateStr}</td>
                    <td className="p-2.5 text-right border-r border-slate-100">Rp {m.kursJual?.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
                    <td className="p-2.5 text-right border-r border-slate-100">Rp {m.kursBeli?.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
                    <td className="p-2.5 text-right font-bold text-slate-900">Rp {(m.kursTengah || (m.kursJual + m.kursBeli) / 2).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={4} className="p-2.5 text-left font-sans uppercase">RATA-RATA KURS TENGAH (M-RATE AVERAGE Xn):</td>
                  <td className="p-2.5 text-right tabular-nums text-sm font-black text-slate-950 underline">
                    Rp {avgMRateCalc.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Panel>
      )}

      {/* Tab 4: Master Contract Unit Rates USD */}
      {activeTab === "rates" && (
        <Panel title="Tarif Kontrak Unit Rate USD (Referensi Sheet Rate Excel)">
          <div className="overflow-x-auto rounded-[4px] border border-slate-200">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-800 font-bold text-[11px] uppercase border-b border-slate-200">
                  <th className="p-2.5 border-r border-slate-200">KATEGORI SOW</th>
                  <th className="p-2.5 border-r border-slate-200">ITEM PEKERJAAN</th>
                  <th className="p-2.5 text-center border-r border-slate-200">SATUAN</th>
                  <th className="p-2.5 text-right border-r border-slate-200 font-bold text-slate-900">BASE RATE (USD)</th>
                  <th className="p-2.5">DESKRIPSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-900 bg-white">
                {sowRows.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 border-b border-slate-100">
                    <td className="p-2.5 font-bold text-slate-900 border-r border-slate-100">{s.category}</td>
                    <td className="p-2.5 font-bold text-slate-900 border-r border-slate-100">{s.itemName}</td>
                    <td className="p-2.5 text-center tabular-nums border-r border-slate-100">{s.unit}</td>
                    <td className="p-2.5 text-right tabular-nums font-bold text-slate-900 border-r border-slate-100">
                      USD {s.rateUSD?.toFixed(3)}
                    </td>
                    <td className="p-2.5 text-slate-600 text-[11px]">{s.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Modal Popup (Calculated RF / MRate / UMK) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[4px] shadow-2xl max-w-2xl sm:max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-4 py-3 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                <Calculator size={15} className="text-[#A57C50]" />
                {modalType === "rf"
                  ? (editItem ? "Edit Rekam Kalkulasi Raise & Fall" : "Hitung / Input Periode Raise & Fall Baru")
                  : modalType === "umk"
                  ? (editItem ? "Edit Referensi UMK Site" : "Tambah Referensi UMK Baru")
                  : "Tambah Kurs Harian Bank Indonesia"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {modalType === "rf" && (
                <form onSubmit={handleSaveRf} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <MonthPickerInput
                      label="Periode Tagihan"
                      value={rfForm.period}
                      onChange={(val) => setRfForm({ ...rfForm, period: val })}
                      format="long"
                      className="w-full bg-white border border-slate-300 font-bold text-xs p-2 rounded-[3px] outline-none focus:border-[#A57C50]"
                      required
                    />
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Skema Formula</label>
                      <select
                        className="w-full bg-white border border-slate-300 font-bold text-xs p-2 rounded-[3px] outline-none focus:border-[#A57C50]"
                        value={rfForm.formulaScheme || (rfForm.customerCode === "BGG" ? "SINGLE_FACTOR_FUEL" : "TRIPLE_FACTOR_DLF")}
                        onChange={(e) => setRfForm({ ...rfForm, formulaScheme: e.target.value })}
                      >
                        <option value="SINGLE_FACTOR_FUEL">1-Faktor BBM: 0,60 + 0,40*(Fn/Fo) (BGG)</option>
                        <option value="TRIPLE_FACTOR_DLF">3-Faktor: D + L + F (POS)</option>
                      </select>
                    </div>
                  </div>

                  {/* Input parameters based on scheme */}
                  {isBGGStyle ? (
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-[4px] space-y-2.5">
                      <div className="flex justify-between items-center">
                        <h5 className="text-[11px] font-bold uppercase text-amber-900 tracking-wider flex items-center gap-1.5">
                          <Flame size={14} className="text-amber-600" />
                          Parameter 1-Faktor BBM (BGG)
                        </h5>
                        <span className="text-[10px] font-bold bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-[3px]">
                          Base Fuel (Fo): Rp 9.000 (Konstan Kontrak)
                        </span>
                      </div>

                      <div className="overflow-hidden rounded-[3px] border border-amber-200 bg-white shadow-xs">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-amber-100/70 text-amber-950 font-bold text-[10px] uppercase border-b border-amber-200">
                              <th className="p-2 text-left w-28 border-r border-amber-200">Periode</th>
                              <th className="p-2 text-right border-r border-amber-200">Fuel</th>
                              <th className="p-2 text-right border-r border-amber-200">Transport</th>
                              <th className="p-2 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-amber-100 font-medium">
                            <tr>
                              <td className="p-2 font-bold text-slate-900 border-r border-amber-100 bg-amber-50/30">
                                PERIODE I
                              </td>
                              <td className="p-1.5 border-r border-amber-100">
                                <IndoDecimalInput
                                  placeholder="19.800"
                                  className="w-full bg-white border border-slate-300 font-mono font-bold text-right p-1.5 rounded-[3px] outline-none focus:border-amber-600"
                                  value={rfForm.bggFuelP1}
                                  onChange={(val) => setRfForm((prev: any) => ({ ...prev, bggFuelP1: val }))}
                                />
                              </td>
                              <td className="p-1.5 border-r border-amber-100">
                                <IndoDecimalInput
                                  placeholder="1.800"
                                  className="w-full bg-white border border-slate-300 font-mono font-bold text-right p-1.5 rounded-[3px] outline-none focus:border-amber-600"
                                  value={rfForm.bggTransportP1}
                                  onChange={(val) => setRfForm((prev: any) => ({ ...prev, bggTransportP1: val }))}
                                />
                              </td>
                              <td className="p-2 text-right tabular-nums font-bold text-slate-900 bg-amber-50/30">
                                Rp {bggTotalP1.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                              </td>
                            </tr>
                            <tr>
                              <td className="p-2 font-bold text-slate-900 border-r border-amber-100 bg-amber-50/30">
                                PERIODE II
                              </td>
                              <td className="p-1.5 border-r border-amber-100">
                                <IndoDecimalInput
                                  placeholder="19.800"
                                  className="w-full bg-white border border-slate-300 font-mono font-bold text-right p-1.5 rounded-[3px] outline-none focus:border-amber-600"
                                  value={rfForm.bggFuelP2}
                                  onChange={(val) => setRfForm((prev: any) => ({ ...prev, bggFuelP2: val }))}
                                />
                              </td>
                              <td className="p-1.5 border-r border-amber-100">
                                <IndoDecimalInput
                                  placeholder="1.803,06"
                                  className="w-full bg-white border border-slate-300 font-mono font-bold text-right p-1.5 rounded-[3px] outline-none focus:border-amber-600"
                                  value={rfForm.bggTransportP2}
                                  onChange={(val) => setRfForm((prev: any) => ({ ...prev, bggTransportP2: val }))}
                                />
                              </td>
                              <td className="p-2 text-right tabular-nums font-bold text-slate-900 bg-amber-50/30">
                                Rp {bggTotalP2.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                              </td>
                            </tr>
                          </tbody>
                          <tfoot>
                            <tr className="bg-amber-100/90 font-bold border-t-2 border-amber-300 text-amber-950">
                              <td colSpan={2} className="p-2 text-left uppercase text-[10px] tracking-wider border-r border-amber-200">
                                RATA-RATA TOTAL AKTUAL FUEL (Fn)
                              </td>
                              <td className="p-2 text-right text-[10px] uppercase font-bold text-amber-900 border-r border-amber-200">
                                TOTAL (AVERAGE)
                              </td>
                              <td className="p-2 text-right tabular-nums font-black text-amber-950 text-xs">
                                Rp {bggAvgFn.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* Dynamic Labor & Currency Master Reference for BGG */}
                      <div className="grid grid-cols-2 gap-2.5 pt-1">
                        <div className="p-2.5 bg-white rounded-[3px] border border-amber-200 text-slate-800 shadow-2xs">
                          <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">Labor (Ln IDR) • Ref UMK Site</span>
                          <span className="font-mono font-bold text-xs text-slate-900 block mt-0.5">
                            Rp {(rfForm.actualLaborLn || (umkRows.find((u) => u.site.includes("Budi Gema Gempita"))?.amountIdr || 3565000)).toLocaleString("id-ID")}
                          </span>
                        </div>
                        <div className="p-2.5 bg-white rounded-[3px] border border-amber-200 text-slate-800 shadow-2xs">
                          <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">M-Rate (Xn IDR) • Ref Kurs BI</span>
                          <span className="font-mono font-bold text-xs text-slate-900 block mt-0.5">
                            Rp {(rfForm.actualMRateXn || (avgMRateCalc > 0 ? avgMRateCalc : 17849.316)).toLocaleString("id-ID", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-[4px] space-y-2.5">
                      <div className="flex justify-between items-center">
                        <h5 className="text-[11px] font-bold uppercase text-amber-900 tracking-wider flex items-center gap-1.5">
                          <Flame size={14} className="text-amber-600" />
                          Parameter 3-Faktor BBM & Forex (POS)
                        </h5>
                        <span className="text-[10px] font-bold bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-[3px]">
                          Base Fuel (Fo): Rp 10.699,97 (Konstan Kontrak)
                        </span>
                      </div>

                      <div className="overflow-x-auto rounded-[3px] border border-amber-200 bg-white shadow-xs">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-amber-100/70 text-amber-950 font-bold text-[10px] uppercase border-b border-amber-200">
                              <th className="p-2 text-left w-36 border-r border-amber-200">Periode</th>
                              <th className="p-2 text-right border-r border-amber-200 w-28">Qty</th>
                              <th className="p-2 text-right border-r border-amber-200 w-32">Unit Price/Harga</th>
                              <th className="p-2 text-right border-r border-amber-200 w-36">Total</th>
                              <th className="p-2 text-center w-12 border-b border-amber-200">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-amber-100 font-medium">
                            {posRefills.map((refill: any, idx: number) => {
                              const rowTotal = Number(refill.qty || 0) * Number(refill.unitPrice || 0);
                              return (
                                <tr key={refill.id || idx}>
                                  <td className="p-1.5 border-r border-amber-100 bg-amber-50/30">
                                    <input
                                      type="date"
                                      className="w-full bg-white border border-slate-300 font-bold text-slate-800 p-1 rounded-[3px] outline-none focus:border-amber-600 text-xs"
                                      value={refill.date || ""}
                                      onChange={(e) => handlePOSRefillChange(idx, "date", e.target.value)}
                                    />
                                  </td>
                                  <td className="p-1.5 border-r border-amber-100">
                                    <IndoDecimalInput
                                      placeholder="0"
                                      className="w-full bg-white border border-slate-300 font-mono font-bold text-right p-1.5 rounded-[3px] outline-none focus:border-amber-600"
                                      value={refill.qty}
                                      onChange={(val) => handlePOSRefillChange(idx, "qty", val)}
                                    />
                                  </td>
                                  <td className="p-1.5 border-r border-amber-100">
                                    <IndoDecimalInput
                                      placeholder="0,00"
                                      className="w-full bg-white border border-slate-300 font-mono font-bold text-right p-1.5 rounded-[3px] outline-none focus:border-amber-600"
                                      value={refill.unitPrice}
                                      onChange={(val) => handlePOSRefillChange(idx, "unitPrice", val)}
                                    />
                                  </td>
                                  <td className="p-2 text-right tabular-nums font-bold text-slate-900 bg-amber-50/30 border-r border-amber-100">
                                    Rp {rowTotal.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-1 text-center">
                                    {posRefills.length > 1 ? (
                                      <button
                                        type="button"
                                        onClick={() => handleRemovePOSRefill(idx)}
                                        title="Hapus baris pengisian"
                                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-[3px] transition cursor-pointer mx-auto flex items-center justify-center"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handlePOSRefillChange(0, "qty", 0);
                                          handlePOSRefillChange(0, "unitPrice", 0);
                                        }}
                                        title="Reset baris pengisian"
                                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-[3px] transition cursor-pointer mx-auto flex items-center justify-center"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="bg-amber-100/90 font-bold border-t-2 border-amber-300 text-amber-950">
                              <td className="p-2 text-left uppercase text-[10px] tracking-wider border-r border-amber-200">
                                RATA-RATA TOTAL AKTUAL FUEL (FN)
                              </td>
                              <td className="p-2 text-right tabular-nums font-bold border-r border-amber-200">
                                {posTotalQty.toLocaleString("id-ID")}
                              </td>
                              <td className="p-2 text-right text-[10px] uppercase font-bold text-amber-900 border-r border-amber-200">
                                TOTAL (AVERAGE)
                              </td>
                              <td className="p-2 text-right tabular-nums font-black text-amber-950 text-xs border-r border-amber-200">
                                Rp {posAvgPriceIDR.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="p-2 bg-amber-100/90"></td>
                            </tr>
                            <tr className="bg-amber-50 font-bold border-t border-amber-200 text-amber-950">
                              <td colSpan={2} className="p-2 text-left uppercase text-[10px] tracking-wider border-r border-amber-200">
                                KONVERSI KE USD (FN) = Avg Rp / Kurs BI ({posMrateXn.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                              </td>
                              <td colSpan={3} className="p-2 text-right tabular-nums font-black text-amber-950 text-xs">
                                $ {effectivePosFn.toLocaleString("id-ID", { minimumFractionDigits: 4, maximumFractionDigits: 4 })} USD
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* Tombol Tambah Baris Pengisian BBM */}
                      <div className="flex justify-start">
                        <button
                          type="button"
                          onClick={handleAddPOSRefill}
                          className="px-2.5 py-1 text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-[3px] border border-amber-300 flex items-center gap-1 transition cursor-pointer shadow-2xs"
                        >
                          <Plus size={12} />
                          <span>Tambah Baris Pengisian BBM</span>
                        </button>
                      </div>

                      {/* Dynamic Labor & Currency Master Reference for POS (EXACTLY LIKE BGG) */}
                      <div className="grid grid-cols-2 gap-2.5 pt-1">
                        <div className="p-2.5 bg-white rounded-[3px] border border-amber-200 text-slate-800 shadow-2xs">
                          <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">Labor (Ln IDR) • Ref UMK Site</span>
                          <span className="font-mono font-bold text-xs text-slate-900 block mt-0.5">
                            Rp {(rfForm.actualLaborLn || (umkRows.find((u) => u.site.includes("POS") || u.site === rfForm.projectSite)?.amountIdr || 3721423)).toLocaleString("id-ID")}
                          </span>
                        </div>
                        <div className="p-2.5 bg-white rounded-[3px] border border-amber-200 text-slate-800 shadow-2xs">
                          <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">M-Rate (Xn IDR) • Ref Kurs BI</span>
                          <span className="font-mono font-bold text-xs text-slate-900 block mt-0.5">
                            Rp {posMrateXn.toLocaleString("id-ID", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Real-time Calculation Breakdown Preview */}
                  <div className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-[4px] space-y-2 font-mono text-[11px] text-slate-800">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900">Live Calculation Preview:</div>
                    {isBGGStyle ? (
                      <div className="space-y-1 text-slate-700">
                        <div className="flex justify-between items-center">
                          <span>Formula: 0,60 + 0,40 × (Fn / Fo):</span>
                          <strong className="text-amber-950 tabular-nums font-bold">
                            0,60 + 0,40 × ({bggAvgFn.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / 9.000)
                          </strong>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-slate-700">
                          <span>D = ({((posWeightA || 0.34) * 100).toFixed(0)}% × {effectivePosFn.toFixed(4)} × {posMrateXn.toFixed(2)}) / {posBaseFo.toLocaleString("id-ID", { maximumFractionDigits: 2 })}:</span>
                          <strong className="text-amber-900 tabular-nums font-bold">{calcFuelD.toFixed(3)}</strong>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>L = ({((posWeightB || 0.25) * 100).toFixed(0)}% × {Number(rfForm.actualLaborLn).toLocaleString("id-ID")} × {posMrateXn.toFixed(2)}) / (Lo × Xo):</span>
                          <strong className="text-teal-800 tabular-nums font-bold">{calcLaborL.toFixed(3)}</strong>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>F = Fixed ({((posWeightC || 0.41) * 100).toFixed(0)}%):</span>
                          <strong className="text-slate-700 tabular-nums font-bold">{calcFixedF.toFixed(3)}</strong>
                        </div>
                      </>
                    )}
                    <div className="pt-2 border-t border-amber-200 flex justify-between text-xs font-bold text-amber-950 items-center">
                      <span className="uppercase text-[11px]">INDEX RF RESULT =</span>
                      <span className="text-sm font-black text-amber-950 bg-white px-2.5 py-0.5 rounded-[3px] border border-amber-300 shadow-2xs tabular-nums">
                        {calcTotalRF.toFixed(3)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setModalOpen(false)} className="px-3.5 py-1.5 bg-white border border-slate-300 font-bold text-xs rounded-[3px] text-slate-700 hover:bg-slate-50 cursor-pointer">
                      Batal
                    </button>
                    <button type="submit" className="px-4 py-1.5 bg-[#A57C50] hover:bg-[#8e6941] text-white font-bold text-xs rounded-[3px] shadow-xs cursor-pointer">
                      Simpan Master RF
                    </button>
                  </div>
                </form>
              )}

              {modalType === "umk" && (
                <form onSubmit={handleSaveUmk} className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Project Site Tambang</label>
                    <select
                      className="w-full bg-white border border-slate-300 font-bold text-xs p-2 rounded-[3px]"
                      value={umkForm.site}
                      onChange={(e) => setUmkForm({ ...umkForm, site: e.target.value })}
                      required
                    >
                      <option value="POS PROJECT">POS PROJECT (Morowali)</option>
                      <option value="PT Budi Gema Gempita Site">PT Budi Gema Gempita Site (Lahat)</option>
                      <option value="PT Satria Bahana Sarana Site">PT Satria Bahana Sarana Site (Muara Enim)</option>
                      <option value="PT Daya Bumindo Karunia Site">PT Daya Bumindo Karunia Site (Murung Raya)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Tahun Berlaku</label>
                      <input
                        type="number"
                        className="w-full bg-white border border-slate-300 font-mono font-bold text-xs p-2 rounded-[3px]"
                        value={umkForm.year}
                        onChange={(e) => setUmkForm({ ...umkForm, year: parseInt(e.target.value) || 2026 })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nilai UMK (IDR)</label>
                      <input
                        type="number"
                        className="w-full bg-white border border-slate-300 font-mono font-bold text-xs p-2 rounded-[3px]"
                        value={umkForm.amountIdr}
                        onChange={(e) => setUmkForm({ ...umkForm, amountIdr: parseFloat(e.target.value) || 0 })}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nomor SK / Peraturan</label>
                      <input
                        className="w-full bg-white border border-slate-300 text-xs p-2 rounded-[3px]"
                        value={umkForm.skNumber}
                        onChange={(e) => setUmkForm({ ...umkForm, skNumber: e.target.value })}
                        placeholder="e.g. SK-GUB-SULTENG/2026/014"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Tanggal Efektif</label>
                      <input
                        type="date"
                        className="w-full bg-white border border-slate-300 text-xs p-2 rounded-[3px]"
                        value={umkForm.effectiveDate}
                        onChange={(e) => setUmkForm({ ...umkForm, effectiveDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Catatan Audit</label>
                    <input
                      className="w-full bg-white border border-slate-300 text-xs p-2 rounded-[3px]"
                      value={umkForm.notes}
                      onChange={(e) => setUmkForm({ ...umkForm, notes: e.target.value })}
                      placeholder="e.g. UMK Kab. Morowali Penetapan Resmi 2026"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setModalOpen(false)} className="px-3.5 py-1.5 bg-white border border-slate-300 font-bold text-xs rounded-[3px] text-slate-700 hover:bg-slate-50 cursor-pointer">
                      Batal
                    </button>
                    <button type="submit" className="px-4 py-1.5 bg-[#A57C50] hover:bg-[#8e6941] text-white font-bold text-xs rounded-[3px] shadow-xs cursor-pointer">
                      Simpan Referensi UMK
                    </button>
                  </div>
                </form>
              )}

              {modalType === "mrate" && (
                <form onSubmit={handleSaveMRate} className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Tanggal Kurs</label>
                    <input
                      className="w-full bg-white border border-slate-300 font-bold text-xs p-2 rounded-[3px]"
                      value={mrateForm.dateStr}
                      onChange={(e) => setMrateForm({ ...mrateForm, dateStr: e.target.value })}
                      placeholder="e.g. 01/07/2026"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Kurs Jual (IDR)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full bg-white border border-slate-300 font-mono font-bold text-xs p-2 rounded-[3px]"
                        value={mrateForm.kursJual}
                        onChange={(e) => setMrateForm({ ...mrateForm, kursJual: parseFloat(e.target.value) || 0 })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Kurs Beli (IDR)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full bg-white border border-slate-300 font-mono font-bold text-xs p-2 rounded-[3px]"
                        value={mrateForm.kursBeli}
                        onChange={(e) => setMrateForm({ ...mrateForm, kursBeli: parseFloat(e.target.value) || 0 })}
                        required
                      />
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-[3px] text-xs flex justify-between font-mono">
                    <span className="text-slate-600">Kurs Tengah Hitung:</span>
                    <strong className="text-slate-900 font-bold tabular-nums">
                      Rp {((mrateForm.kursJual + mrateForm.kursBeli) / 2).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                    </strong>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setModalOpen(false)} className="px-3.5 py-1.5 bg-white border border-slate-300 font-bold text-xs rounded-[3px] text-slate-700 hover:bg-slate-50 cursor-pointer">
                      Batal
                    </button>
                    <button type="submit" className="px-4 py-1.5 bg-[#A57C50] hover:bg-[#8e6941] text-white font-bold text-xs rounded-[3px] shadow-xs cursor-pointer">
                      Simpan Kurs Harian
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
      {deleteRfTarget && (
        <ConfirmDialog
          title="Hapus Data Raise & Fall"
          message="Data Raise & Fall ini akan dihapus permanen. Tindakan ini tidak dapat dibatalkan."
          confirmLabel="Hapus"
          danger
          onCancel={() => setDeleteRfTarget(null)}
          onConfirm={() => handleDeleteRf(deleteRfTarget.id)}
        />
      )}
      {deleteUmkTarget && (
        <ConfirmDialog
          title="Hapus Referensi UMK Site"
          message="Nilai Referensi UMK site ini akan dihapus permanen. Lanjutkan?"
          confirmLabel="Hapus"
          danger
          onCancel={() => setDeleteUmkTarget(null)}
          onConfirm={() => handleDeleteUmk(deleteUmkTarget.id)}
        />
      )}
    </div>
  );
}
