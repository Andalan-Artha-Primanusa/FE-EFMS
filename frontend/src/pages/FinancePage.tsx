import { useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Edit2, FileSpreadsheet, FileText, Filter, Plus, Trash2, X, DollarSign, Calendar, Info, Layers, UserCheck, ShieldAlert, ArrowUpRight, CheckCircle, BarChart3, Eye, User, FileCheck, History, Upload, FileCode, ExternalLink, Calculator, Pickaxe, RefreshCw, Printer, ChevronDown } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { api } from "../lib/api";

const formatIDR = (val: number) => {
  if (!val && val !== 0) return "Rp 0";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
};

const parseNumber = (str: any): number => {
  if (typeof str === "number") return str;
  if (!str) return 0;
  const clean = String(str).replace(/[^0-9]/g, "");
  return parseInt(clean, 10) || 0;
};

const formatThousand = (val: any): string => {
  if (val === undefined || val === null || val === "") return "";
  const num = parseNumber(val);
  if (num === 0) return "0";
  return new Intl.NumberFormat("id-ID").format(num);
};

const formatDateInput = (dateStr: any) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
};

// Component helper input Rupiah dengan Auto Thousand Separator (.)
function RupiahInput({
  label,
  value,
  onChange,
  required,
  placeholder,
  helperText
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
}) {
  const [displayVal, setDisplayVal] = useState(formatThousand(value));

  useEffect(() => {
    setDisplayVal(formatThousand(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = parseNumber(raw);
    setDisplayVal(raw === "" ? "" : formatThousand(num));
    onChange(num);
  };

  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
        {label} {required && <span className="text-rose-600">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-extrabold text-slate-400 text-xs">Rp</span>
        <input
          type="text"
          className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-slate-900 font-extrabold focus:border-cyan-700 focus:bg-white focus:ring-2 focus:ring-cyan-600/20 outline-none transition"
          value={displayVal}
          onChange={handleChange}
          required={required}
          placeholder={placeholder || "0"}
        />
      </div>
      {helperText && <span className="text-[11px] text-slate-500 mt-1 block font-medium">{helperText}</span>}
    </div>
  );
}

// Generator Timeline Audit Log untuk Modal Detail View 2 Kolom
const generateAuditTimeline = (type: string, item: any) => {
  if (type === "ba") {
    return [
      { step: 1, title: "BA Dibuat (Draft)", user: item.picAAP || "Site Operations AAP", role: "Field Engineer", time: item.workEndDate ? new Date(item.workEndDate).toLocaleDateString("id-ID") : "31/01/2026", status: "completed", desc: `Draft Berita Acara #${item.baNumber} dibuat beserta Upload Draft BA PDF.` },
      { step: 2, title: "Diajukan ke Customer", user: "Bambang Sujipto", role: "Finance AR Specialist", time: item.baSubmittedDate ? new Date(item.baSubmittedDate).toLocaleDateString("id-ID") : "04/02/2026", status: item.baSubmittedDate ? "completed" : "pending", desc: `Dokumen Draft BA dikirim resmi ke divisi Finance perwakilan ${item.customerCode}.` },
      { step: 3, title: "Approval & Final BA (Signed)", user: `Manager Verifikasi ${item.customerCode}`, role: "Customer Approval", time: item.baSignedDate ? new Date(item.baSignedDate).toLocaleDateString("id-ID") : "Menunggu TTD", status: item.statusBA === "Approved" ? "completed" : item.statusBA === "Rejected" ? "rejected" : "pending", desc: item.statusBA === "Approved" ? "Berita Acara disetujui, Final BA Signed PDF diunggah ke sistem." : "Dalam proses verifikasi & tanda tangan oleh customer." },
      { step: 4, title: "Relasi Invoice Penagihan", user: "Senior Accountant", role: "Billing Finance", time: item.invoiceIssuedDate ? new Date(item.invoiceIssuedDate).toLocaleDateString("id-ID") : "Belum Terbit", status: item.invoiceNoLinked ? "completed" : "pending", desc: item.invoiceNoLinked ? `Terhubung ke Invoice Penagihan #${item.invoiceNoLinked}` : "Invoice penagihan belum diterbitkan." }
    ];
  }
  if (type === "invoice") {
    return [
      { step: 1, title: "Invoice Diterbitkan", user: "Clarissa Putri", role: "Billing Specialist", time: item.invoiceDate ? new Date(item.invoiceDate).toLocaleDateString("id-ID") : "18/05/2026", status: "completed", desc: `Master Invoice ${item.invoiceNo} dibuat berdasarkan Ref BA ${item.baNoReference || "-"}.` },
      { step: 2, title: "Verifikasi Pajak & DPP", user: "Hendra Wijaya", role: "Tax & Compliance Manager", time: item.invoiceDate ? new Date(item.invoiceDate).toLocaleDateString("id-ID") : "18/05/2026", status: "completed", desc: `Faktur Pajak PPN 11% (${formatIDR(item.ppn11)}) & PPh 23 (${formatIDR(item.pph23)}) tervalidasi.` },
      { step: 3, title: "Penerimaan Pembayaran", user: "AR Treasury Dept", role: "Finance AAP", time: item.totalPaid > 0 ? "11/06/2026" : "Belum Ada Bayar", status: item.totalPaid > 0 ? "completed" : "pending", desc: item.totalPaid > 0 ? `Pembayaran dana diterima sebesar ${formatIDR(item.totalPaid)}.` : "Belum ada pembayaran masuk dari customer." },
      { step: 4, title: "Status Pelunasan Saat Ini", user: "System Settlement Engine", role: "System Automation", time: "Real-time", status: item.status === "Paid" ? "completed" : item.status === "Overdue" ? "rejected" : "warning", desc: `Status saat ini: ${item.status} dengan sisa Outstanding ${formatIDR(item.outstanding)}.` }
    ];
  }
  if (type === "payment") {
    return [
      { step: 1, title: "Uang Masuk Dicatat", user: "Rina Setyowati", role: "Treasury Admin", time: item.paymentDate ? new Date(item.paymentDate).toLocaleDateString("id-ID") : "11/03/2026", status: "completed", desc: `Menerima dana ${formatIDR(item.amountPaid)} melalui ${item.receivingBank}.` },
      { step: 2, title: "Rekonsiliasi Bank", user: "Deni Arisandi", role: "Bank Reconciliation", time: item.paymentDate ? new Date(item.paymentDate).toLocaleDateString("id-ID") : "11/03/2026", status: "completed", desc: `Nomor referensi transfer ${item.refNo} terkonfirmasi di mutasi bank.` },
      { step: 3, title: "Credit Matching ke Invoice", user: "System Engine", role: "Auto Settlement", time: item.paymentDate ? new Date(item.paymentDate).toLocaleDateString("id-ID") : "11/03/2026", status: "completed", desc: `Kredit otomatis dialokasikan ke Invoice ${item.invoiceNo} (${item.customerCode}).` }
    ];
  }
  return [
    { step: 1, title: "Registrasi Customer", user: "Legal Commercial AAP", role: "Commercial Dept", time: "01/01/2024", status: "completed", desc: `Pendaftaran entitas pelanggan ${item.fullName} (${item.code}).` },
    { step: 2, title: "Approval Credit Terms", user: "Chief Financial Officer (CFO)", role: "Board Executive", time: "05/01/2024", status: "completed", desc: `Persetujuan termin pembayaran ${item.terminDays} Hari.` },
    { step: 3, title: "Kontrak Kerjasama Aktif", user: "Legal Compliance Manager", role: "Legal Dept", time: "15/01/2024", status: "completed", desc: `Kontrak #${item.contractNo} nilai ${formatIDR(item.contractValue)} berjalan.` }
  ];
};

export function FinancePage({
  viewTitle,
  query,
  onNotice
}: {
  viewTitle: string;
  query: string;
  onNotice: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [baRows, setBaRows] = useState<any[]>([]);
  const [invoiceRows, setInvoiceRows] = useState<any[]>([]);
  const [paymentRows, setPaymentRows] = useState<any[]>([]);
  const [customerRows, setCustomerRows] = useState<any[]>([]);
  const [baFilter, setBaFilter] = useState("All");
  const [periodFilter, setPeriodFilter] = useState("Jul-26");
  const [invStatusFilter, setInvStatusFilter] = useState("All");

  // State Kalkulator POS Mining & Raise & Fall (RF) Escalation
  const [mRate, setMRate] = useState(17923.30);
  const [fuelPriceUSD, setFuelPriceUSD] = useState(1.422);
  const [laborPriceIDR, setLaborPriceIDR] = useState(3721423);

  // Real-time RF Index Calculation Constants & Value
  const baseFuelPrice = 10699.97;
  const baseLaborPrice = 3594536;
  const baseForexRate = 15388.75;
  const weightA = 0.34;
  const weightB = 0.25;
  const weightC = 0.41;
  const obBaseRateUSD = 3.327;

  const fuelTerm = (obBaseRateUSD * weightA * (fuelPriceUSD * mRate)) / baseFuelPrice;
  const laborTerm = (obBaseRateUSD * weightB * (laborPriceIDR * mRate)) / (baseLaborPrice * baseForexRate);
  const fixedTerm = obBaseRateUSD * weightC;
  const rfIndexCalculated = (fuelTerm + laborTerm + fixedTerm) / obBaseRateUSD;

  // Master Data Variable SOW Options
  const masterVariableOptions = [
    { code: "OB", name: "OVER BURDEN REMOVAL", category: "Operation & Mining", unit: "Bcm", baseRateUSD: 3.327 },
    { code: "TOPSOIL", name: "TOP SOIL REMOVAL", category: "Operation & Mining", unit: "Bcm", baseRateUSD: 3.380 },
    { code: "LIMONITE", name: "LIMONITE ORE", category: "Operation & Mining", unit: "Bcm", baseRateUSD: 3.363 },
    { code: "SAPROLITE", name: "SAPROLITE ORE", category: "Operation & Mining", unit: "Bcm", baseRateUSD: 3.472 },
    { code: "OVERHAUL_OB", name: "Over/Underhaul For OB Removal", category: "Operation & Mining", unit: "Bcm", overhaulMtr: 450, baseRateUSD: 0.538 },
    { code: "OVERHAUL_TOP", name: "Over/Underhaul For Top Soil Removal", category: "Operation & Mining", unit: "Bcm", overhaulMtr: 1200, baseRateUSD: 0.538 },
    { code: "OVERHAUL_LIM", name: "Over/Underhaul For Limonite", category: "Operation & Mining", unit: "Bcm", overhaulMtr: 1000, baseRateUSD: 0.526 },
    { code: "OVERHAUL_SAP", name: "Over/Underhaul For Saprolite", category: "Operation & Mining", unit: "Bcm", overhaulMtr: 500, baseRateUSD: 0.526 },
    { code: "LAND_CLEARING", name: "Land Clearing", category: "Rehabilitation", unit: "m2", baseRateUSD: 0.381 },
    { code: "RECLAIM", name: "Reclaim & Revegetation", category: "Rehabilitation", unit: "m2", baseRateUSD: 0.450 },
    { code: "MDO", name: "Mine Development (MDO Cut & Fill)", category: "Mine Development (MDO)", unit: "Bcm", baseRateUSD: 4.100 },
    { code: "GEOTEXTILE", name: "Geotextile Installation", category: "Mine Development (MDO)", unit: "m2", baseRateUSD: 1.250 },
  ];

  // Template Kosong untuk Input Invoice Baru (Blank State)
  const blankInvoiceItems = [
    { id: "A1", section: "A", code: "A1", description: "OVER BURDEN REMOVAL", volume: 0, unit: "Bcm", baseRateUSD: 3.327 },
    { id: "A2", section: "A", code: "A2", description: "TOP SOIL REMOVAL", volume: 0, unit: "Bcm", baseRateUSD: 3.380 },
    { id: "A3", section: "A", code: "A3", description: "LIMONITE", volume: 0, unit: "Bcm", baseRateUSD: 3.363 },
    { id: "A4", section: "A", code: "A4", description: "SAPROLITE", volume: 0, unit: "Bcm", baseRateUSD: 3.472 },

    { id: "B1", section: "B", code: "B1", description: "B1. Over/Underhaul For OB Removal", overhaulMtr: 1000, volume: 0, unit: "Bcm", baseRateUSD: 0.538 },
    { id: "B2", section: "B", code: "B2", description: "B2. Over/Underhaul For Top Soil Removal", overhaulMtr: 1000, volume: 0, unit: "Bcm", baseRateUSD: 0.538 },
    { id: "B3", section: "B", code: "B3", description: "B3. Over/Underhaul For Limonite", overhaulMtr: 1000, volume: 0, unit: "Bcm", baseRateUSD: 0.526 },
    { id: "B4", section: "B", code: "B4", description: "B4. Over/Underhaul For Saprolite", overhaulMtr: 1000, volume: 0, unit: "Bcm", baseRateUSD: 0.526 },

    { id: "C1", section: "C", code: "C1", description: "C1. Land Clearing", volume: 0, unit: "m2", baseRateUSD: 0.381 },

    { id: "D1", section: "D", code: "D1", description: "D1. OB Removal (RF Factor)", volume: 0, unit: "Bcm", baseRateUSD: 3.327, type: "production" },
    { id: "D2", section: "D", code: "D2", description: "D2. Over/Underhaul For OB Removal (RF)", overhaulMtr: 1000, volume: 0, unit: "Bcm", baseRateUSD: 0.538, type: "overhaul" },
    { id: "D3", section: "D", code: "D3", description: "D3. Top Soil Removal (RF Factor)", volume: 0, unit: "Bcm", baseRateUSD: 3.380, type: "production" },
    { id: "D4", section: "D", code: "D4", description: "D4. Over/Underhaul For Top Soil Removal (RF)", overhaulMtr: 1000, volume: 0, unit: "Bcm", baseRateUSD: 0.538, type: "overhaul" },
    { id: "D5", section: "D", code: "D5", description: "D5. Limonite (RF Factor)", volume: 0, unit: "Bcm", baseRateUSD: 3.363, type: "production" },
    { id: "D6", section: "D", code: "D6", description: "D6. Over/Underhaul For Limonite (RF)", overhaulMtr: 1000, volume: 0, unit: "Bcm", baseRateUSD: 0.526, type: "overhaul" },
    { id: "D7", section: "D", code: "D7", description: "D7. Land Clearing (RF Factor)", volume: 0, unit: "m2", baseRateUSD: 0.381, type: "land_clearing" },
    { id: "D8", section: "D", code: "D8", description: "D8. Saprolite (RF Factor)", volume: 0, unit: "Bcm", baseRateUSD: 3.472, type: "production" },
    { id: "D9", section: "D", code: "D9", description: "D9. Over/Underhaul For Saprolite (RF)", overhaulMtr: 1000, volume: 0, unit: "Bcm", baseRateUSD: 0.526, type: "overhaul" },
  ];

  const demoInvoiceItems = [
    { id: "A1", section: "A", code: "A1", description: "OVER BURDEN REMOVAL", volume: 35918.75, unit: "Bcm", baseRateUSD: 3.327 },
    { id: "A2", section: "A", code: "A2", description: "TOP SOIL REMOVAL", volume: 6527.38, unit: "Bcm", baseRateUSD: 3.380 },
    { id: "A3", section: "A", code: "A3", description: "LIMONITE", volume: 9307.14, unit: "Bcm", baseRateUSD: 3.363 },
    { id: "A4", section: "A", code: "A4", description: "SAPROLITE", volume: 1102.09, unit: "Bcm", baseRateUSD: 3.472 },

    { id: "B1", section: "B", code: "B1", description: "B1. Over/Underhaul For OB Removal", overhaulMtr: 450, volume: 35918.75, unit: "Bcm", baseRateUSD: 0.538 },
    { id: "B2", section: "B", code: "B2", description: "B2. Over/Underhaul For Top Soil Removal", overhaulMtr: 1200, volume: 6527.38, unit: "Bcm", baseRateUSD: 0.538 },
    { id: "B3", section: "B", code: "B3", description: "B3. Over/Underhaul For Limonite", overhaulMtr: 1000, volume: 9307.14, unit: "Bcm", baseRateUSD: 0.526 },
    { id: "B4", section: "B", code: "B4", description: "B4. Over/Underhaul For Saprolite", overhaulMtr: 500, volume: 1102.09, unit: "Bcm", baseRateUSD: 0.526 },

    { id: "C1", section: "C", code: "C1", description: "C1. Land Clearing", volume: 20769.27, unit: "m2", baseRateUSD: 0.381 },

    { id: "D1", section: "D", code: "D1", description: "D1. OB Removal (RF Factor)", volume: 35918.75, unit: "Bcm", baseRateUSD: 3.327, type: "production" },
    { id: "D2", section: "D", code: "D2", description: "D2. Over/Underhaul For OB Removal (RF)", overhaulMtr: 450, volume: 35918.75, unit: "Bcm", baseRateUSD: 0.538, type: "overhaul" },
    { id: "D3", section: "D", code: "D3", description: "D3. Top Soil Removal (RF Factor)", volume: 6527.38, unit: "Bcm", baseRateUSD: 3.380, type: "production" },
    { id: "D4", section: "D", code: "D4", description: "D4. Over/Underhaul For Top Soil Removal (RF)", overhaulMtr: 1200, volume: 6527.38, unit: "Bcm", baseRateUSD: 0.538, type: "overhaul" },
    { id: "D5", section: "D", code: "D5", description: "D5. Limonite (RF Factor)", volume: 9307.14, unit: "Bcm", baseRateUSD: 3.363, type: "production" },
    { id: "D6", section: "D", code: "D6", description: "D6. Over/Underhaul For Limonite (RF)", overhaulMtr: 1000, volume: 9307.14, unit: "Bcm", baseRateUSD: 0.526, type: "overhaul" },
    { id: "D7", section: "D", code: "D7", description: "D7. Land Clearing (RF Factor)", volume: 20769.27, unit: "m2", baseRateUSD: 0.381, type: "land_clearing" },
    { id: "D8", section: "D", code: "D8", description: "D8. Saprolite (RF Factor)", volume: 1102.09, unit: "Bcm", baseRateUSD: 3.472, type: "production" },
    { id: "D9", section: "D", code: "D9", description: "D9. Over/Underhaul For Saprolite (RF)", overhaulMtr: 500, volume: 1102.09, unit: "Bcm", baseRateUSD: 0.526, type: "overhaul" },
  ];

  const [invLineItems, setInvLineItems] = useState<any[]>(blankInvoiceItems);
  const [selectedVarA, setSelectedVarA] = useState("");
  const [selectedVarB, setSelectedVarB] = useState("");
  const [selectedVarC, setSelectedVarC] = useState("");
  const [selectedVarD, setSelectedVarD] = useState("");

  const addVariableToSection = (section: string, code: string) => {
    if (!code) return;
    const opt = masterVariableOptions.find(o => o.code === code);
    if (!opt) return;

    const newItem = {
      id: `SOW_${Date.now()}`,
      section,
      code: opt.code,
      description: `${section}.${invLineItems.filter(i => i.section === section).length + 1} ${opt.name}`,
      volume: 0,
      unit: opt.unit,
      baseRateUSD: opt.baseRateUSD,
      overhaulMtr: opt.overhaulMtr || 1000,
      type: section === "D" && opt.code.includes("OVERHAUL") ? "overhaul" : section === "D" && opt.code.includes("CLEARING") ? "land_clearing" : "production"
    };

    setInvLineItems(prev => [...prev, newItem]);
    if (section === "A") setSelectedVarA("");
    if (section === "B") setSelectedVarB("");
    if (section === "C") setSelectedVarC("");
    if (section === "D") setSelectedVarD("");
  };

  const customerContractMap: Record<string, { project: string; contract: string }> = {
    SBS: {
      project: "PT Satria Bahana Sarana Site",
      contract: "230/AAP-SBS/EXT/XII/24 + Addendum II 258/AAPS"
    },
    POS: {
      project: "POS PROJECT",
      contract: "002/POS-AAP/2025"
    },
    BGG: {
      project: "PT Budi Gema Gempita Site",
      contract: "001/BGG-AAP/2025"
    },
    DBK: {
      project: "PT Daya Bumindo Karunia Site",
      contract: "004/DBK-AAP/2025"
    },
    ABN: {
      project: "PT Andalan Bhumi Nusantara Site",
      contract: "005/ABN-AAP/2025"
    }
  };

  const handleCompanySelect = (code: string) => {
    const mapMatch = customerContractMap[code];
    const cust = customerRows.find((c: any) => c.code === code);

    setFormData((prev: any) => ({
      ...prev,
      customerCode: code,
      projectSite: mapMatch?.project || cust?.projectSite || (cust ? `${cust.fullName} Site` : ""),
      contractNo: mapMatch?.contract || cust?.contractNo || (cust ? `001/${cust.code}-AAP/2026` : "")
    }));
  };

  const loadDemoPOSData = () => {
    setFormData({
      customerCode: "POS",
      invoiceNo: "003/POS-AAP/RF/VI/2026",
      workPeriod: "Juni 2026",
      projectSite: "POS PROJECT",
      contractNo: "002/POS-AAP/2025"
    });
    setInvLineItems(demoInvoiceItems);
    onNotice("Sampel data POS Mining (Juni 2026) berhasil dimuat!");
  };

  const removeInvLineItem = (idToRemove: string) => {
    setInvLineItems(prev => prev.filter(item => item.id !== idToRemove));
  };

  const updateInvItemVolume = (id: string, vol: number) => {
    setInvLineItems(prev => prev.map(item => item.id === id ? { ...item, volume: vol } : item));
  };

  const updateInvItemOverhaul = (id: string, mtr: number) => {
    setInvLineItems(prev => prev.map(item => item.id === id ? { ...item, overhaulMtr: mtr } : item));
  };

  const getItemEffectiveVolume = (item: any) => {
    if (!item) return 0;
    if (item.section === "B") {
      if (item.code === "B1" || item.description.includes("OB Removal")) {
        const itemA = invLineItems.find(i => i.section === "A" && (i.code === "A1" || i.description.includes("OVER BURDEN")));
        if (itemA) return itemA.volume || 0;
      }
      if (item.code === "B2" || item.description.includes("Top Soil")) {
        const itemA = invLineItems.find(i => i.section === "A" && (i.code === "A2" || i.description.includes("TOP SOIL")));
        if (itemA) return itemA.volume || 0;
      }
      if (item.code === "B3" || item.description.includes("Limonite")) {
        const itemA = invLineItems.find(i => i.section === "A" && (i.code === "A3" || i.description.includes("LIMONITE")));
        if (itemA) return itemA.volume || 0;
      }
      if (item.code === "B4" || item.description.includes("Saprolite")) {
        const itemA = invLineItems.find(i => i.section === "A" && (i.code === "A4" || i.description.includes("SAPROLITE")));
        if (itemA) return itemA.volume || 0;
      }
    }
    if (item.section === "D") {
      if (item.code === "D1" || item.description.startsWith("D1.")) return (invLineItems.find(i => i.code === "A1")?.volume || 0);
      if (item.code === "D2" || item.description.startsWith("D2.")) return (invLineItems.find(i => i.code === "A1")?.volume || 0);
      if (item.code === "D3" || item.description.startsWith("D3.")) return (invLineItems.find(i => i.code === "A2")?.volume || 0);
      if (item.code === "D4" || item.description.startsWith("D4.")) return (invLineItems.find(i => i.code === "A2")?.volume || 0);
      if (item.code === "D5" || item.description.startsWith("D5.")) return (invLineItems.find(i => i.code === "A3")?.volume || 0);
      if (item.code === "D6" || item.description.startsWith("D6.")) return (invLineItems.find(i => i.code === "A3")?.volume || 0);
      if (item.code === "D7" || item.description.startsWith("D7.")) return (invLineItems.find(i => i.section === "C")?.volume || item.volume || 0);
      if (item.code === "D8" || item.description.startsWith("D8.")) return (invLineItems.find(i => i.code === "A4")?.volume || 0);
      if (item.code === "D9" || item.description.startsWith("D9.")) return (invLineItems.find(i => i.code === "A4")?.volume || 0);
    }
    return item.volume || 0;
  };

  const getItemEffectiveOverhaulMtr = (item: any) => {
    if (!item) return 1000;
    if (item.section === "D") {
      if (item.code === "D2" || item.description.startsWith("D2.")) return (invLineItems.find(i => i.code === "B1")?.overhaulMtr ?? 1000);
      if (item.code === "D4" || item.description.startsWith("D4.")) return (invLineItems.find(i => i.code === "B2")?.overhaulMtr ?? 1000);
      if (item.code === "D6" || item.description.startsWith("D6.")) return (invLineItems.find(i => i.code === "B3")?.overhaulMtr ?? 1000);
      if (item.code === "D9" || item.description.startsWith("D9.")) return (invLineItems.find(i => i.code === "B4")?.overhaulMtr ?? 1000);
    }
    return item.overhaulMtr ?? 1000;
  };

  const calculateItemRateAndAmount = (item: any) => {
    const rfFactor = rfIndexCalculated - 1;
    const vol = getItemEffectiveVolume(item);
    const mtr = getItemEffectiveOverhaulMtr(item);

    let unitRate = 0;
    let amount = 0;

    if (item.section === "A") {
      unitRate = Math.round(item.baseRateUSD * mRate);
      amount = Math.round(vol * unitRate);
    } else if (item.section === "B") {
      const effMtr = (mtr - 1000) / 1000;
      unitRate = Math.round(effMtr * item.baseRateUSD * mRate);
      amount = Math.round(vol * unitRate);
    } else if (item.section === "C") {
      unitRate = Math.round(item.baseRateUSD * mRate);
      amount = Math.round(vol * unitRate);
    } else if (item.section === "D") {
      if (item.type === "overhaul" || item.description.toLowerCase().includes("overhaul")) {
        const effMtr = (mtr - 1000) / 1000;
        const baseRateIDR = Math.round(effMtr * item.baseRateUSD * mRate);
        unitRate = Math.round(baseRateIDR * rfFactor);
        amount = Math.round(vol * unitRate);
      } else {
        const baseRateIDR = Math.round(item.baseRateUSD * mRate);
        unitRate = Math.round(baseRateIDR * rfFactor);
        amount = Math.round(vol * unitRate);
      }
    }

    return { unitRate, amount };
  };

  const subtotalA = invLineItems.filter(i => i.section === "A").reduce((sum, i) => sum + calculateItemRateAndAmount(i).amount, 0);
  const subtotalB = invLineItems.filter(i => i.section === "B").reduce((sum, i) => sum + calculateItemRateAndAmount(i).amount, 0);
  const subtotalC = invLineItems.filter(i => i.section === "C").reduce((sum, i) => sum + calculateItemRateAndAmount(i).amount, 0);
  const subtotalD = invLineItems.filter(i => i.section === "D").reduce((sum, i) => sum + calculateItemRateAndAmount(i).amount, 0);

  const totalGrossCalc = subtotalA + subtotalB + subtotalC + subtotalD;
  const dpp11_12Calc = Math.round(totalGrossCalc * 11 / 12);
  const vat12Calc = Math.round(dpp11_12Calc * 0.12);
  const pph23Calc = Math.round(totalGrossCalc * 0.02);
  const netTotalInvoiceCalc = dpp11_12Calc + vat12Calc - pph23Calc;

  const exportPaymentDetailPDF = (itemData: any) => {
    const printWin = window.open("", "_blank", "width=1000,height=800");
    if (!printWin) return;

    const formattedDate = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
    const logoUrl = `${window.location.origin}/andalan-logo.png`;
    const subtotalAVal = invLineItems.filter(i => i.section === "A").reduce((sum, i) => sum + calculateItemRateAndAmount(i).amount, 0);
    const subtotalBVal = invLineItems.filter(i => i.section === "B").reduce((sum, i) => sum + calculateItemRateAndAmount(i).amount, 0);
    const subtotalCVal = invLineItems.filter(i => i.section === "C").reduce((sum, i) => sum + calculateItemRateAndAmount(i).amount, 0);
    const subtotalDVal = invLineItems.filter(i => i.section === "D").reduce((sum, i) => sum + calculateItemRateAndAmount(i).amount, 0);
    const totalGross = subtotalAVal + subtotalBVal + subtotalCVal + subtotalDVal;
    const dppVal = Math.round(totalGross * 11 / 12);
    const vatVal = Math.round(dppVal * 0.12);
    const pphVal = Math.round(totalGross * 0.02);
    const totalNet = dppVal + vatVal - pphVal;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>PAYMENT DETAIL - ${itemData?.invoiceNo || "Invoice"}</title>
        <style>
          @page { size: A4 portrait; margin: 8mm 10mm; }
          * { box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 5px; font-size: 9.5px; line-height: 1.15; }
          .logo-header { text-align: center; margin-bottom: 6px; }
          .logo-img { height: 42px; width: auto; object-fit: contain; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; font-family: monospace; font-size: 10px; }
          .info-table td { padding: 1.5px 0; vertical-align: top; }
          .title-box { text-align: center; margin-bottom: 6px; }
          .title-box h2 { font-size: 13.5px; font-weight: 900; text-transform: uppercase; text-decoration: underline; margin: 0; letter-spacing: 1px; }
          .main-table { width: 100%; border-collapse: collapse; border: 1.5px solid #0f172a; margin-bottom: 6px; page-break-inside: avoid; }
          .main-table th { background: #f1f5f9; color: #0f172a; border: 1px solid #0f172a; padding: 4px 5px; font-size: 9px; font-weight: 900; text-transform: uppercase; }
          .main-table td { border: 1px solid #cbd5e1; padding: 3px 5px; font-size: 9.5px; }
          .sec-hdr { background: #f8fafc; font-weight: 900; text-decoration: underline; }
          .tot-row { background: #f8fafc; font-weight: 800; }
          .net-row { background: #0f172a; color: #ffffff; font-weight: 900; font-size: 10.5px; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-mono { font-family: monospace; }
          .note-box { font-family: monospace; font-size: 9px; margin-bottom: 6px; }
          .footer-box { border: 1.5px solid #0f172a; display: table; width: 100%; box-sizing: border-box; page-break-inside: avoid; }
          .footer-cell { display: table-cell; width: 50%; padding: 6px 10px; vertical-align: top; font-size: 9.5px; }
          .footer-left { border-right: 1px solid #0f172a; }
          .sig-space { height: 40px; border-bottom: 1px dashed #cbd5e1; margin: 4px 0; }
          .btn-print { background: #0e7490; color: white; border: none; padding: 6px 14px; font-weight: bold; border-radius: 4px; cursor: pointer; margin-bottom: 10px; font-size: 11px; }
          @media print { .btn-print { display: none; } }
        </style>
      </head>
      <body>
        <button class="btn-print" onclick="window.print()">🖨️ Cetak / Simpan PDF Dokumen Official (1 Halaman A4)</button>

        <div class="logo-header">
          <img src="${logoUrl}" alt="ANDALAN Logo" class="logo-img" />
        </div>

        <table class="info-table">
          <tr>
            <td width="13%"><strong>Company</strong></td>
            <td width="37%">: <strong>${itemData?.customerCode || "PT. POSITION"}</strong></td>
            <td width="16%"><strong>Invoice No.</strong></td>
            <td width="34%">: <strong>${itemData?.invoiceNo || "005/AAP-POS/VI/2026"}</strong></td>
          </tr>
          <tr>
            <td><strong>Contractor</strong></td>
            <td>: <strong>PT. ANDALAN ARTHA PRIMANUSA</strong></td>
            <td><strong>Activity Group</strong></td>
            <td>: <strong>${(itemData?.activityGroup || itemData?.jobType || "OPERATION & MINING").toUpperCase()}</strong></td>
          </tr>
          <tr>
            <td><strong>Project</strong></td>
            <td>: <strong>${itemData?.projectSite || "POS PROJECT"}</strong></td>
            <td><strong>Period Covered</strong></td>
            <td>: <strong>${itemData?.workPeriod || "Juni 2026"}</strong></td>
          </tr>
        </table>

        <div class="title-box">
          <h2>PAYMENT DETAIL</h2>
        </div>

        <table class="main-table">
          <thead>
            <tr>
              <th width="44%">DESCRIPTION</th>
              <th width="22%">CLAIMED VOLUME</th>
              <th width="14%">UNIT RATE</th>
              <th width="20%">AMOUNT (IDR)</th>
            </tr>
          </thead>
          <tbody>
            <tr class="sec-hdr">
              <td>A. PRODUCTION</td>
              <td class="text-center font-mono">${invLineItems.filter(i => i.section === "A").reduce((sum, i) => sum + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} Bcm</td>
              <td></td>
              <td class="text-right font-mono">${subtotalAVal.toLocaleString("id-ID")}</td>
            </tr>
            ${invLineItems.filter(i => i.section === "A").map(item => {
              const { unitRate, amount } = calculateItemRateAndAmount(item);
              return `<tr>
                <td style="padding-left: 15px;">${item.description}</td>
                <td class="text-center font-mono">${(item.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} ${item.unit}</td>
                <td class="text-right font-mono">${unitRate.toLocaleString("id-ID")}</td>
                <td class="text-right font-mono"><strong>${amount.toLocaleString("id-ID")}</strong></td>
              </tr>`;
            }).join("")}

            <tr class="sec-hdr">
              <td>B. OVER / UNDER DISTANCE</td>
              <td></td>
              <td></td>
              <td class="text-right font-mono">(${Math.abs(subtotalBVal).toLocaleString("id-ID")})</td>
            </tr>
            ${invLineItems.filter(i => i.section === "B").map(item => {
              const effVol = getItemEffectiveVolume(item);
              const effMtr = getItemEffectiveOverhaulMtr(item);
              const { unitRate, amount } = calculateItemRateAndAmount(item);
              const diffMtr = effMtr - 1000;
              return `<tr>
                <td style="padding-left: 15px;">
                  <div>${item.description}</div>
                  <div style="font-size: 8.5px; color: #64748b;">${effMtr} mtr - 1000 mtr = (${diffMtr}) mtr</div>
                </td>
                <td class="text-center font-mono">${effVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })} ${item.unit}</td>
                <td class="text-right font-mono">${unitRate.toLocaleString("id-ID")}</td>
                <td class="text-right font-mono"><strong>${amount < 0 ? `(${Math.abs(amount).toLocaleString("id-ID")})` : amount.toLocaleString("id-ID")}</strong></td>
              </tr>`;
            }).join("")}

            <tr class="sec-hdr">
              <td>C. LAND CLEARING</td>
              <td></td>
              <td></td>
              <td class="text-right font-mono">${subtotalCVal.toLocaleString("id-ID")}</td>
            </tr>
            ${invLineItems.filter(i => i.section === "C").map(item => {
              const { unitRate, amount } = calculateItemRateAndAmount(item);
              return `<tr>
                <td style="padding-left: 15px;">${item.description}</td>
                <td class="text-center font-mono">${(item.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} ${item.unit}</td>
                <td class="text-right font-mono">${unitRate.toLocaleString("id-ID")}</td>
                <td class="text-right font-mono"><strong>${amount.toLocaleString("id-ID")}</strong></td>
              </tr>`;
            }).join("")}

            <tr class="sec-hdr">
              <td>D. RAISE & FALL'S FACTOR</td>
              <td></td>
              <td></td>
              <td class="text-right font-mono">${subtotalDVal.toLocaleString("id-ID")}</td>
            </tr>
            ${invLineItems.filter(i => i.section === "D").map(item => {
              const effVol = getItemEffectiveVolume(item);
              const { unitRate, amount } = calculateItemRateAndAmount(item);
              return `<tr>
                <td style="padding-left: 15px;">${item.description}</td>
                <td class="text-center font-mono">${effVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })} ${item.unit}</td>
                <td class="text-right font-mono">${unitRate.toLocaleString("id-ID")}</td>
                <td class="text-right font-mono"><strong>${amount < 0 ? `(${Math.abs(amount).toLocaleString("id-ID")})` : amount.toLocaleString("id-ID")}</strong></td>
              </tr>`;
            }).join("")}
          </tbody>
          <tfoot>
            <tr class="tot-row">
              <td colSpan="3"><strong>TOTAL</strong></td>
              <td class="text-right font-mono"><strong>${totalGross.toLocaleString("id-ID")}</strong></td>
            </tr>
            <tr class="tot-row">
              <td colSpan="3">DPP PPN 11/12</td>
              <td class="text-right font-mono">${dppVal.toLocaleString("id-ID")}</td>
            </tr>
            <tr class="tot-row">
              <td colSpan="3">VAT ( 12% )</td>
              <td class="text-right font-mono">${vatVal.toLocaleString("id-ID")}</td>
            </tr>
            <tr class="tot-row">
              <td colSpan="3">WITH HOLDING TAX ART 23</td>
              <td class="text-right font-mono">(${pphVal.toLocaleString("id-ID")})</td>
            </tr>
            <tr class="net-row">
              <td colSpan="3"><strong>TOTAL INVOICE</strong></td>
              <td class="text-right font-mono"><strong>${totalNet.toLocaleString("id-ID")}</strong></td>
            </tr>
          </tfoot>
        </table>

        <div class="note-box">
          Note:<br/>
          1. Raise & Fall's Factor: <strong>${rfIndexCalculated.toFixed(3)}</strong>
        </div>

        <div class="footer-box">
          <div class="footer-cell footer-left">
            <strong style="text-transform: uppercase;">PLEASE MAKE PAYMENT TO THIS ACCOUNT:</strong><br/><br/>
            <table style="width: 100%; font-size: 9.5px;">
              <tr><td width="85">Bank Name</td><td>: <strong>Bank BNI</strong></td></tr>
              <tr><td>A/C Name</td><td>: <strong>PT Andalan Artha Primanusa</strong></td></tr>
              <tr><td>A/C No</td><td>: <strong>8188788882</strong></td></tr>
              <tr><td>Branch</td><td>: <strong>Harmoni Jakarta</strong></td></tr>
            </table>
          </div>
          <div class="footer-cell" style="text-align: center;">
            <div style="text-align: right; font-size: 9px; font-weight: bold; margin-bottom: 4px;">Jakarta ${formattedDate}</div>
            <strong style="font-size: 9.5px;">SUBMITTED BY,</strong><br/>
            <strong style="font-size: 10px;">PT ANDALAN ARTHA PRIMANUSA</strong>
            <div class="sig-space"></div>
            <strong style="text-decoration: underline; font-size: 10px;">GAHARI CHRISTINE</strong><br/>
            <span style="font-size: 9px;">DIRECTOR</span>
          </div>
        </div>
      </body>
      </html>
    `;

    printWin.document.write(htmlContent);
    printWin.document.close();
  };

  // Modal Input & Edit State
  const [modalType, setModalType] = useState<"none" | "ba" | "invoice" | "payment" | "customer">("none");
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [showActivityGroupDropdown, setShowActivityGroupDropdown] = useState(false);

  // Modal Detail View 2 Kolom State
  const [detailViewItem, setDetailViewItem] = useState<{ type: "ba" | "invoice" | "payment" | "customer"; data: any } | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      if (viewTitle === "Finance & AR Dashboard") {
        const res = await api<any>("/api/finance/dashboard");
        setDashboardData(res);
      } else if (viewTitle === "Berita Acara (BA) Tracker") {
        const res = await api<any[]>("/api/finance/ba-trackers");
        setBaRows(Array.isArray(res) ? res : []);
      } else if (viewTitle === "Invoice Management") {
        const res = await api<any[]>("/api/finance/invoices");
        setInvoiceRows(Array.isArray(res) ? res : []);
      } else if (viewTitle === "Payment & Receipt Log") {
        const res = await api<any[]>("/api/finance/payments");
        setPaymentRows(Array.isArray(res) ? res : []);
      } else if (viewTitle === "Customer & Credit Terms") {
        const res = await api<any[]>("/api/finance/customers");
        setCustomerRows(Array.isArray(res) ? res : []);
      }
    } catch (err: any) {
      onNotice(err?.message || "Gagal memuat data finance");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    if (customerRows.length === 0) {
      api<any[]>("/api/finance/customers").then(res => {
        if (Array.isArray(res)) setCustomerRows(res);
      }).catch(() => {});
    }
  }, [viewTitle]);

  const openCreateModal = (type: "ba" | "invoice" | "payment" | "customer", initialData: any = {}) => {
    setEditItem(null);
    setFormData({
      activityGroup: "OPERATION & MINING",
      ...initialData,
    });
    if (type === "invoice") {
      setInvLineItems(blankInvoiceItems);
    }
    setModalType(type);
  };

  const openEditModal = (type: "ba" | "invoice" | "payment" | "customer", item: any) => {
    setEditItem(item);
    setFormData({
      ...item,
      workEndDate: formatDateInput(item.workEndDate),
      baSubmittedDate: formatDateInput(item.baSubmittedDate),
      baSignedDate: formatDateInput(item.baSignedDate),
      invoiceIssuedDate: formatDateInput(item.invoiceIssuedDate),
      baDate: formatDateInput(item.baDate),
      invoiceDate: formatDateInput(item.invoiceDate),
      paymentDate: formatDateInput(item.paymentDate),
    });
    setModalType(type);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileUrl = URL.createObjectURL(file);
      setFormData((prev: any) => ({
        ...prev,
        [fieldName]: fileUrl,
        [`${fieldName}Name`]: file.name
      }));
      onNotice(`File PDF "${file.name}" berhasil diunggah!`);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let endpoint = "";
      if (modalType === "ba") endpoint = "/api/finance/ba-trackers";
      else if (modalType === "invoice") endpoint = "/api/finance/invoices";
      else if (modalType === "payment") endpoint = "/api/finance/payments";
      else if (modalType === "customer") endpoint = "/api/finance/customers";

      let payload = { ...formData };
      if (modalType === "invoice") {
        payload = {
          ...formData,
          invoiceNo: formData.invoiceNo || "003/POS-AAP/RF/VI/2026",
          customerCode: formData.customerCode || "POS",
          projectSite: formData.projectSite || "POS PROJECT",
          contractNo: formData.contractNo || "002/POS-AAP/2025",
          workPeriod: formData.workPeriod || "Juni 2026",
          jobType: "Mining Production & Overhaul Billing",
          volumeUnit: "BCM",
          revenueGross: totalGrossCalc,
          subTotalDPP: dpp11_12Calc,
          ppn11: vat12Calc,
          pph23: pph23Calc,
          totalInvoice: netTotalInvoiceCalc,
          invoiceDate: formData.invoiceDate ? new Date(formData.invoiceDate).toISOString() : new Date().toISOString(),
          notes: `PAYMENT DETAIL (RF Index: ${rfIndexCalculated.toFixed(3)})`
        };
      }

      if (payload.workEndDate) payload.workEndDate = new Date(payload.workEndDate).toISOString();
      if (payload.baSubmittedDate) payload.baSubmittedDate = new Date(payload.baSubmittedDate).toISOString();
      if (payload.baSignedDate) payload.baSignedDate = new Date(payload.baSignedDate).toISOString();
      if (payload.invoiceIssuedDate) payload.invoiceIssuedDate = new Date(payload.invoiceIssuedDate).toISOString();
      if (payload.baDate) payload.baDate = new Date(payload.baDate).toISOString();
      if (payload.invoiceDate) payload.invoiceDate = new Date(payload.invoiceDate).toISOString();
      if (payload.paymentDate) payload.paymentDate = new Date(payload.paymentDate).toISOString();

      if (editItem?.id) {
        endpoint += `/${editItem.id}`;
        await api(endpoint, { method: "PUT", body: JSON.stringify(payload) });
        onNotice("Data berhasil diperbarui!");
      } else {
        await api(endpoint, { method: "POST", body: JSON.stringify(payload) });
        onNotice("Data baru berhasil ditambahkan!");
      }

      setModalType("none");
      await loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal menyimpan data");
    }
  };

  const handleDelete = async (type: "ba" | "invoice" | "payment" | "customer", id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data ini?")) return;
    try {
      let endpoint = "";
      if (type === "ba") endpoint = `/api/finance/ba-trackers/${id}`;
      else if (type === "invoice") endpoint = `/api/finance/invoices/${id}`;
      else if (type === "payment") endpoint = `/api/finance/payments/${id}`;
      else if (type === "customer") endpoint = `/api/finance/customers/${id}`;

      await api(endpoint, { method: "DELETE" });
      onNotice("Data berhasil dihapus!");
      await loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal menghapus data");
    }
  };

  if (loading) {
    return (
      <div className="workspace-body">
        <PageHeader title={viewTitle} description="Memuat data keuangan dan penagihan..." />
        <div className="panel flex items-center justify-center p-12 text-slate-500 bg-white border border-slate-200 rounded-xl shadow-sm">
          <Clock className="animate-spin mr-2 text-cyan-600" size={20} /> Memuat data...
        </div>
      </div>
    );
  }

  // Kalkulasi Live Preview untuk Modal Invoice Standard
  const volPreview = Number(formData.volume || 0);
  const ratePreview = Number(formData.rate || 0);
  const grossPreview = volPreview * ratePreview;
  const solarPreview = Number(formData.solarDeduction || 0);
  const subtotalDPPPreview = grossPreview - solarPreview;
  const ppn11Preview = subtotalDPPPreview * 0.11;
  const pph23Preview = subtotalDPPPreview * 0.02;
  const totalNetInvoicePreview = subtotalDPPPreview + ppn11Preview - pph23Preview;
  // Total Rekapitulasi Aging Matrix untuk Footer Dashboard Table
  const totalAgingMatrix = (dashboardData?.agingMatrix ?? []).reduce(
    (acc: any, row: any) => ({
      notDue: acc.notDue + (row.notDue || 0),
      bucket1_30: acc.bucket1_30 + (row.bucket1_30 || 0),
      bucket31_60: acc.bucket31_60 + (row.bucket31_60 || 0),
      bucket61_90: acc.bucket61_90 + (row.bucket61_90 || 0),
      bucketOver90: acc.bucketOver90 + (row.bucketOver90 || 0),
      total: acc.total + (row.total || 0),
      invoiceCount: acc.invoiceCount + (row.invoiceCount || 0),
    }),
    { notDue: 0, bucket1_30: 0, bucket31_60: 0, bucket61_90: 0, bucketOver90: 0, total: 0, invoiceCount: 0 }
  );

  return (
    <div className="workspace-body space-y-6">
      {/* EXECUTIVE DASHBOARD VIEW */}
      {viewTitle === "Finance & AR Dashboard" && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <PageHeader
              title="Finance & AR Monitoring Dashboard"
              description="Executive summary posisi piutang (AR), umur piutang (Aging), invoice overdue, dan bottleneck Berita Acara (BA)."
            />
            <div className="flex gap-2 shrink-0">
              <button
                className="primary flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white shadow-sm transition"
                onClick={() => openCreateModal("invoice")}
              >
                <Plus size={15} /> + Invoice
              </button>
              <button
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition"
                onClick={() => openCreateModal("payment")}
              >
                <Plus size={15} /> + Uang Masuk
              </button>
            </div>
          </div>

          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {(dashboardData?.kpis ?? []).map((kpi: any, idx: number) => {
              const isMoney = kpi.Label.includes("TOTAL AR");
              const isPct = kpi.Label.includes("%");
              const isDays = kpi.Label.includes("DSO");
              let valStr = String(kpi.Value);
              if (isMoney) valStr = formatIDR(kpi.Value);
              else if (isPct) valStr = `${kpi.Value.toFixed(1)}%`;
              else if (isDays) valStr = `${Math.round(kpi.Value)} Hari`;

              let toneBg = "border-l-4 border-l-emerald-600 bg-white";
              let badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-300";
              if (kpi.Tone === "critical") {
                toneBg = "border-l-4 border-l-rose-600 bg-white";
                badgeStyle = "bg-rose-100 text-rose-800 border-rose-300";
              } else if (kpi.Tone === "warning") {
                toneBg = "border-l-4 border-l-amber-500 bg-white";
                badgeStyle = "bg-amber-100 text-amber-900 border-amber-300";
              }

              return (
                <div key={idx} className={`p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between ${toneBg}`}>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{kpi.Label}</span>
                  <div className="my-2">
                    <span className="text-2xl font-black text-slate-900 tracking-tight">{valStr}</span>
                  </div>
                  <div className={`inline-flex items-center text-xs px-2.5 py-0.5 rounded-full border w-fit font-bold ${badgeStyle}`}>
                    {kpi.Tone === "critical" ? "High Risk" : kpi.Tone === "warning" ? "Attention" : "Healthy"}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Visual Aging Bucket Distribution Bar */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 size={16} className="text-cyan-700" /> Distribusi Umur Piutang (Aging Share)
              </span>
              <span className="text-slate-500 font-bold">Total AR: {formatIDR(totalAgingMatrix.total)}</span>
            </div>
            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${totalAgingMatrix.total ? (totalAgingMatrix.bucket1_30 / totalAgingMatrix.total) * 100 : 0}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`1-30 Hari: ${formatIDR(totalAgingMatrix.bucket1_30)}`}
              />
              <div
                style={{ width: `${totalAgingMatrix.total ? (totalAgingMatrix.bucket31_60 / totalAgingMatrix.total) * 100 : 0}%` }}
                className="bg-amber-500 h-full transition-all"
                title={`31-60 Hari: ${formatIDR(totalAgingMatrix.bucket31_60)}`}
              />
              <div
                style={{ width: `${totalAgingMatrix.total ? (totalAgingMatrix.bucket61_90 / totalAgingMatrix.total) * 100 : 0}%` }}
                className="bg-orange-500 h-full transition-all"
                title={`61-90 Hari: ${formatIDR(totalAgingMatrix.bucket61_90)}`}
              />
              <div
                style={{ width: `${totalAgingMatrix.total ? (totalAgingMatrix.bucketOver90 / totalAgingMatrix.total) * 100 : 0}%` }}
                className="bg-rose-600 h-full transition-all"
                title={`>90 Hari: ${formatIDR(totalAgingMatrix.bucketOver90)}`}
              />
            </div>
            <div className="flex flex-wrap gap-4 text-xs font-bold pt-1">
              <div className="flex items-center gap-1.5 text-emerald-800"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> 1-30 Hari ({formatIDR(totalAgingMatrix.bucket1_30)})</div>
              <div className="flex items-center gap-1.5 text-amber-800"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> 31-60 Hari ({formatIDR(totalAgingMatrix.bucket31_60)})</div>
              <div className="flex items-center gap-1.5 text-orange-800"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span> 61-90 Hari ({formatIDR(totalAgingMatrix.bucket61_90)})</div>
              <div className="flex items-center gap-1.5 text-rose-800"><span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block"></span> &gt;90 Hari ({formatIDR(totalAgingMatrix.bucketOver90)})</div>
            </div>
          </div>

          {/* Aging Matrix Table dengan Summary Total Footer Row */}
          <Panel title="📊 Aging Analysis — Posisi Piutang Saat Ini per Customer">
            <div className="table-wrapper overflow-x-auto rounded-lg border border-slate-200">
              <table className="data-table w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white font-bold text-xs uppercase tracking-wider">
                    <th className="p-3">Customer</th>
                    <th className="p-3 text-right">Not Due</th>
                    <th className="p-3 text-right">1 - 30 Hari</th>
                    <th className="p-3 text-right">31 - 60 Hari</th>
                    <th className="p-3 text-right">61 - 90 Hari</th>
                    <th className="p-3 text-right">&gt; 90 Hari</th>
                    <th className="p-3 text-right font-black">Total Outstanding</th>
                    <th className="p-3 text-center">Inv Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-slate-900 font-medium">
                  {(dashboardData?.agingMatrix ?? []).map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-extrabold text-cyan-800">{row.customer}</td>
                      <td className="p-3 text-right">{row.notDue ? formatIDR(row.notDue) : "-"}</td>
                      <td className="p-3 text-right text-emerald-700 font-semibold">{row.bucket1_30 ? formatIDR(row.bucket1_30) : "-"}</td>
                      <td className="p-3 text-right text-amber-700 font-semibold">{row.bucket31_60 ? formatIDR(row.bucket31_60) : "-"}</td>
                      <td className="p-3 text-right text-orange-700 font-semibold">{row.bucket61_90 ? formatIDR(row.bucket61_90) : "-"}</td>
                      <td className="p-3 text-right text-rose-700 font-semibold">{row.bucketOver90 ? formatIDR(row.bucketOver90) : "-"}</td>
                      <td className="p-3 text-right font-black text-slate-900">{formatIDR(row.total)}</td>
                      <td className="p-3 text-center font-mono font-bold text-slate-700">{row.invoiceCount}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-black text-xs uppercase">
                    <td className="p-3 font-black text-cyan-400">TOTAL SUMMARY AR</td>
                    <td className="p-3 text-right">{formatIDR(totalAgingMatrix.notDue)}</td>
                    <td className="p-3 text-right text-emerald-400">{formatIDR(totalAgingMatrix.bucket1_30)}</td>
                    <td className="p-3 text-right text-amber-400">{formatIDR(totalAgingMatrix.bucket31_60)}</td>
                    <td className="p-3 text-right text-orange-400">{formatIDR(totalAgingMatrix.bucket61_90)}</td>
                    <td className="p-3 text-right text-rose-400">{formatIDR(totalAgingMatrix.bucketOver90)}</td>
                    <td className="p-3 text-right text-lg font-black text-white">{formatIDR(totalAgingMatrix.total)}</td>
                    <td className="p-3 text-center text-cyan-300 font-mono">{totalAgingMatrix.invoiceCount} Inv</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Panel>

          {/* Top Overdue & BA Bottlenecks */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Panel title="⚠️ Top Invoice Overdue — Prioritas Collection Action">
                <div className="table-wrapper overflow-x-auto rounded-lg border border-slate-200">
                  <table className="data-table w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white font-bold text-xs uppercase tracking-wider">
                        <th className="p-3">Invoice No</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Periode</th>
                        <th className="p-3 text-right">Outstanding</th>
                        <th className="p-3 text-center">Aging Days</th>
                        <th className="p-3 text-center">Bucket</th>
                        <th className="p-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white text-slate-900 font-medium">
                      {(dashboardData?.topOverdueInvoices ?? []).map((inv: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50 transition">
                          <td className="p-3 font-mono font-bold text-cyan-800">{inv.invoiceNo}</td>
                          <td className="p-3 font-extrabold text-slate-900">{inv.customerCode}</td>
                          <td className="p-3 text-slate-600">{inv.workPeriod}</td>
                          <td className="p-3 text-right font-black text-rose-700">{formatIDR(inv.outstanding)}</td>
                          <td className="p-3 text-center font-bold text-amber-700">{inv.agingDays} hari</td>
                          <td className="p-3 text-center">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              {inv.agingBucket}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              className="p-1.5 rounded border border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 transition"
                              onClick={() => setDetailViewItem({ type: "invoice", data: inv })}
                              title="Lihat Detail & Tracking Log"
                            >
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </div>

            <div>
              <Panel title="🐢 Internal BA Bottleneck Summary">
                <div className="space-y-3">
                  {(dashboardData?.baBottlenecks ?? []).map((b: any, idx: number) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 shadow-sm space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-cyan-900 text-base">{b.customer}</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-200 text-slate-700">{b.baCount} BA</span>
                      </div>
                      <div className="text-xs text-slate-600 flex justify-between pt-1 font-medium">
                        <span>Avg Lead Time BA:</span>
                        <span className="font-bold text-amber-700">{b.avgLeadTimeBA ? `${b.avgLeadTimeBA} hari` : "-"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        </>
      )}
      {viewTitle === "Invoice Management" && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <PageHeader
              title="Invoice Management (Master Penagihan)"
              description="Pengelolaan master invoice penagihan, perhitungan DPP, PPN 11%/12%, PPh 23 (2%), dan Payment Detail Generator."
            />
            <div className="relative">
              <button
                className="primary flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white shadow-sm transition shrink-0"
                onClick={() => setShowActivityGroupDropdown((prev) => !prev)}
              >
                <Plus size={15} /> Buat Invoice Baru
                <ChevronDown size={14} className="ml-0.5 opacity-80" />
              </button>

              {showActivityGroupDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Pilih Activity Group Invoice
                  </div>
                  <button
                    className="w-full text-left px-3 py-2.5 text-xs font-bold text-slate-800 hover:bg-cyan-50 hover:text-cyan-900 rounded-lg flex items-center gap-2.5 transition border border-transparent hover:border-cyan-200"
                    onClick={() => {
                      setShowActivityGroupDropdown(false);
                      openCreateModal("invoice", { activityGroup: "OPERATION & MINING" });
                    }}
                  >
                    <span className="p-1.5 rounded-md bg-amber-100 text-amber-800 text-xs shrink-0">⛏️</span>
                    <div>
                      <div className="font-black text-slate-900">Operations & Mining</div>
                      <div className="text-[10px] font-medium text-slate-500">Klaim Operasi & Penambangan Utama</div>
                    </div>
                  </button>
                  <button
                    className="w-full text-left px-3 py-2.5 text-xs font-bold text-slate-800 hover:bg-cyan-50 hover:text-cyan-900 rounded-lg flex items-center gap-2.5 transition border border-transparent hover:border-cyan-200"
                    onClick={() => {
                      setShowActivityGroupDropdown(false);
                      openCreateModal("invoice", { activityGroup: "MINE DEVELOPMENT (MDO)" });
                    }}
                  >
                    <span className="p-1.5 rounded-md bg-cyan-100 text-cyan-800 text-xs shrink-0">🚜</span>
                    <div>
                      <div className="font-black text-slate-900">Mine Development (MDO)</div>
                      <div className="text-[10px] font-medium text-slate-500">Pengembangan Jalan & Konstruksi Tambang</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                  <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Net Invoice Value</span>
                  <div className="text-xl font-black text-slate-900 mt-1">
                    {formatIDR(invoiceRows.reduce((acc, r) => acc + (r.totalInvoice || 0), 0))}
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                  <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Outstanding</span>
                  <div className="text-xl font-black text-rose-700 mt-1">
                    {formatIDR(invoiceRows.reduce((acc, r) => acc + (r.outstanding || 0), 0))}
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
                  <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Filter Status</span>
                  <select
                    className="bg-slate-50 text-slate-900 text-xs font-bold p-2 rounded-lg border border-slate-300 focus:outline-none"
                    value={invStatusFilter}
                    onChange={(e) => setInvStatusFilter(e.target.value)}
                  >
                    <option value="All">Semua Status</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Paid">Paid (Lunas)</option>
                    <option value="Partial">Partial</option>
                    <option value="Open">Open</option>
                  </select>
                </div>
              </div>

              <Panel title="Daftar Master Invoice Penagihan">
                <div className="table-wrapper overflow-x-auto rounded-lg border border-slate-200">
                  <table className="data-table w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white font-bold text-xs uppercase tracking-wider">
                        <th className="p-3">Invoice No</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">No. Ref BA</th>
                        <th className="p-3 text-right">Subtotal DPP</th>
                        <th className="p-3 text-right">PPN 11%/12%</th>
                        <th className="p-3 text-right">PPh 23</th>
                        <th className="p-3 text-right font-black">Total Invoice</th>
                        <th className="p-3 text-right text-emerald-300 font-bold">Total Paid</th>
                        <th className="p-3 text-right text-rose-300 font-black">Outstanding</th>
                        <th className="p-3">Due Date</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white text-slate-900 font-medium">
                      {invoiceRows
                        .filter((row) => {
                          const matchQ = JSON.stringify(row).toLowerCase().includes(query.toLowerCase());
                          if (!matchQ) return false;
                          if (invStatusFilter !== "All" && row.status !== invStatusFilter) return false;
                          return true;
                        })
                        .map((row: any) => (
                          <tr key={row.id} className="hover:bg-slate-50 transition">
                            <td className="p-3 font-mono font-bold text-cyan-800">{row.invoiceNo}</td>
                            <td className="p-3 font-extrabold text-slate-900">{row.customerCode}</td>
                            <td className="p-3 text-slate-600 font-mono text-xs">{row.baNoReference || "-"}</td>
                            <td className="p-3 text-right font-semibold">{formatIDR(row.subTotalDPP)}</td>
                            <td className="p-3 text-right text-slate-600">{formatIDR(row.ppn11)}</td>
                            <td className="p-3 text-right text-slate-600">{formatIDR(row.pph23)}</td>
                            <td className="p-3 text-right font-black text-slate-900">{formatIDR(row.totalInvoice)}</td>
                            <td className="p-3 text-right text-emerald-700 font-extrabold">{formatIDR(row.totalPaid)}</td>
                            <td className="p-3 text-right text-rose-700 font-black">{formatIDR(row.outstanding)}</td>
                            <td className="p-3 text-slate-700">{row.dueDate ? new Date(row.dueDate).toLocaleDateString("id-ID") : "-"}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${row.status === "Paid" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : row.status === "Overdue" ? "bg-rose-100 text-rose-800 border border-rose-300" : "bg-amber-100 text-amber-900 border border-amber-300"}`}>
                                {row.status}
                              </span>
                            </td>
                            <td className="p-3 text-right space-x-1.5">
                              <button className="p-1.5 rounded border border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 transition" onClick={() => setDetailViewItem({ type: "invoice", data: row })} title="Lihat Detail & Tracking Log">
                                <Eye size={14} />
                              </button>
                              <button className="p-1.5 rounded border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition" onClick={() => openEditModal("invoice", row)} title="Edit Invoice">
                                <Edit2 size={14} />
                              </button>
                              <button className="p-1.5 rounded border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition" onClick={() => handleDelete("invoice", row.id)} title="Hapus Invoice">
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </div>
        </>
      )}

      {/* BA TRACKER VIEW WITH PERIOD FILTER & STAT CARDS */}
      {viewTitle === "Berita Acara (BA) Tracker" && (() => {
        const availablePeriods = Array.from(new Set(baRows.map((r) => r.workPeriod).filter(Boolean)));
        if (!availablePeriods.includes("Jul-26")) availablePeriods.unshift("Jul-26");
        if (!availablePeriods.includes("Jun-26")) availablePeriods.unshift("Jun-26");

        const periodRows = periodFilter === "All" ? baRows : baRows.filter((r) => r.workPeriod === periodFilter);
        const nominalApprovedPeriod = periodRows.filter((r) => r.statusBA === "Approved").reduce((acc, r) => acc + (r.workAmount || 0), 0);
        const pendingVolumePeriod = periodRows.filter((r) => r.statusBA === "Draft" || r.statusBA === "Pending").reduce((acc, r) => acc + (r.workAmount || 0), 0);
        const estTotalRevPeriod = nominalApprovedPeriod + pendingVolumePeriod;

        const filteredBARows = baRows.filter((r) => {
          const matchQ = JSON.stringify(r).toLowerCase().includes(query.toLowerCase());
          if (!matchQ) return false;
          if (baFilter === "Pending BAI") return r.statusBA === "Draft" || !r.invoiceNoLinked;
          if (baFilter === "Approved") return r.statusBA === "Approved";
          if (periodFilter !== "All" && r.workPeriod !== periodFilter) return false;
          return true;
        });

        return (
          <>
            {/* Stat Cards & Filter Periode Bar (Clean Integrated Header) */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-200 pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-800 shrink-0">
                    <Calendar size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Ringkasan Proyeksi Pendapatan BA ({periodFilter === "All" ? "Semua Periode" : `Periode ${periodFilter}`})
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Monitoring persetujuan Berita Acara & proyeksi revenue terikat periode yang dipilih.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
                  <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 pl-1">
                      Periode:
                    </span>
                    <select
                      className="bg-white text-slate-900 font-extrabold text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:border-cyan-700 focus:outline-none cursor-pointer shadow-xs"
                      value={periodFilter}
                      onChange={(e) => setPeriodFilter(e.target.value)}
                    >
                      <option value="All">Semua Periode</option>
                      {availablePeriods.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>

                    <div className="flex gap-1 pl-1.5 border-l border-slate-200">
                      {["All", "Pending BAI", "Approved"].map((st) => (
                        <button
                          key={st}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${baFilter === st ? "bg-cyan-800 text-white shadow-xs" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"}`}
                          onClick={() => setBaFilter(st)}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    className="primary flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white shadow-sm transition shrink-0"
                    onClick={() => openCreateModal("ba")}
                  >
                    <Plus size={16} /> Tambah BA Baru
                  </button>
                </div>
              </div>

              {/* 3 STAT CARDS (Clean White & Subtle Accent Palette) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
                <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 text-center">
                  <span className="text-xs font-sans font-extrabold uppercase tracking-wider text-slate-500 block">
                    Nominal ({periodFilter === "All" ? "Total" : periodFilter})
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 mt-1.5 block">
                    {formatIDR(nominalApprovedPeriod)}
                  </span>
                  <span className="text-[11px] font-sans text-slate-500 font-medium block mt-1">
                    Total BA Disetujui (Approved)
                  </span>
                </div>

                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-center">
                  <span className="text-xs font-sans font-extrabold uppercase tracking-wider text-amber-800 block">
                    Pending Volume ({periodFilter === "All" ? "Total" : periodFilter})
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-amber-700 mt-1.5 block">
                    {formatIDR(pendingVolumePeriod)}
                  </span>
                  <span className="text-[11px] font-sans text-amber-700/80 font-medium block mt-1">
                    Estimasi Joint Survey Pending
                  </span>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 text-center">
                  <span className="text-xs font-sans font-extrabold uppercase tracking-wider text-emerald-800 block">
                    Est Total Rev ({periodFilter === "All" ? "Total" : periodFilter})
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1.5 block">
                    {formatIDR(estTotalRevPeriod)}
                  </span>
                  <span className="text-[11px] font-sans text-emerald-700/80 font-medium block mt-1">
                    Proyeksi Total Pendapatan Kotor
                  </span>
                </div>
              </div>
            </div>

            <Panel title={`Daftar Berita Acara Pekerjaan & Klaim Operasional (Periode: ${periodFilter})`}>
              <div className="table-wrapper overflow-x-auto rounded-lg border border-slate-200">
                <table className="data-table w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white font-bold text-xs uppercase tracking-wider">
                      <th className="p-3">No. BA</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Periode</th>
                      <th className="p-3 text-right">Nominal Pekerjaan (Rp)</th>
                      <th className="p-3">Tgl TTD BA</th>
                      <th className="p-3 text-center">Lead Time BA</th>
                      <th className="p-3 text-center">Status BA</th>
                      <th className="p-3">Dokumen PDF</th>
                      <th className="p-3">Bottleneck & Notes</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white text-slate-900 font-medium">
                    {filteredBARows.map((row: any) => (
                      <tr key={row.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-mono font-bold text-cyan-800">{row.baNumber}</td>
                        <td className="p-3 font-extrabold text-slate-900">{row.customerCode}</td>
                        <td className="p-3 text-slate-600 font-semibold">{row.workPeriod}</td>
                        <td className="p-3 text-right font-mono font-black text-emerald-700 text-sm">
                          {formatIDR(row.workAmount || 0)}
                        </td>
                        <td className="p-3 text-slate-700">{row.baSignedDate ? new Date(row.baSignedDate).toLocaleDateString("id-ID") : "-"}</td>
                        <td className="p-3 text-center font-bold text-amber-700">{row.leadTimeDays ? `${row.leadTimeDays} hari` : "-"}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${row.statusBA === "Approved" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-amber-100 text-amber-900 border border-amber-300"}`}>
                            {row.statusBA}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1 text-[11px]">
                            {row.draftBAPath && (
                              <span className="inline-flex items-center gap-1 text-cyan-700 font-bold">
                                <FileText size={12} /> Draft PDF
                              </span>
                            )}
                            {row.finalBAPath && (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                                <CheckCircle size={12} /> Final PDF
                              </span>
                            )}
                            {!row.draftBAPath && !row.finalBAPath && <span className="text-slate-400 italic">Belum terlampir</span>}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-[11px]">
                            <span className="font-bold text-slate-800 block">{row.notesBottleneck}</span>
                            <span className="text-slate-500">{row.notes || "-"}</span>
                          </div>
                        </td>
                        <td className="p-3 text-right space-x-1.5 shrink-0">
                          <button
                            className="p-1.5 rounded border border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 transition"
                            onClick={() => setDetailViewItem({ type: "ba", data: row })}
                            title="View Detail 2 Kolom & Audit Trail"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            className="p-1.5 rounded border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition"
                            onClick={() => openEditModal("ba", row)}
                            title="Edit BA"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="p-1.5 rounded border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition"
                            onClick={() => handleDelete("ba", row.id)}
                            title="Hapus BA"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredBARows.length === 0 && (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-slate-500 font-medium">
                          Tidak ada data Berita Acara untuk filter periode yang dipilih ({periodFilter}).
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        );
      })()}

      {/* PAYMENT & RECEIPT LOG VIEW */}
      {viewTitle === "Payment & Receipt Log" && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <PageHeader
              title="Payment & Receipt Log"
              description="Log penerimaan pembayaran dari bank escrow/operational bank, matching ke invoice, dan pelacakan performa ketepatan bayar."
            />
            <button
              className="primary flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white shadow-sm transition shrink-0"
              onClick={() => openCreateModal("payment")}
            >
              <Plus size={16} /> Record Payment Received
            </button>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex justify-between items-center">
            <div>
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Recorded Receipt</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {formatIDR(paymentRows.reduce((sum, r) => sum + (r.amountPaid || 0), 0))}
              </div>
            </div>
          </div>

          <Panel title="Log Mutasi Pembayaran Masuk (Receiving Cash/Bank)">
            <div className="table-wrapper overflow-x-auto rounded-lg border border-slate-200">
              <table className="data-table w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white font-bold text-xs uppercase tracking-wider">
                    <th className="p-3">Target Invoice</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3 text-right">Nominal Bayar (Rp)</th>
                    <th className="p-3">Tgl Penerimaan</th>
                    <th className="p-3">Receiving Bank</th>
                    <th className="p-3">Ref No</th>
                    <th className="p-3 text-center">Ketepatan Bayar</th>
                    <th className="p-3">Catatan</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-slate-900 font-medium">
                  {paymentRows
                    .filter((r) => JSON.stringify(r).toLowerCase().includes(query.toLowerCase()))
                    .map((row: any) => (
                      <tr key={row.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-mono font-bold text-cyan-800">{row.invoiceNo}</td>
                        <td className="p-3 font-extrabold text-slate-900">{row.customerCode}</td>
                        <td className="p-3 text-right font-black text-emerald-700">{formatIDR(row.amountPaid)}</td>
                        <td className="p-3 text-slate-700">{row.paymentDate ? new Date(row.paymentDate).toLocaleDateString("id-ID") : "-"}</td>
                        <td className="p-3 font-semibold text-slate-800">{row.receivingBank}</td>
                        <td className="p-3 text-xs font-mono text-slate-600">{row.refNo}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${row.daysLateOrEarly > 0 ? "bg-amber-100 text-amber-900 border border-amber-300" : "bg-emerald-100 text-emerald-800 border border-emerald-300"}`}>
                            {row.daysLateOrEarly > 0 ? `Telat ${row.daysLateOrEarly} Hari` : `On-Time / Awal`}
                          </span>
                        </td>
                        <td className="p-3 text-xs text-slate-600">{row.notes}</td>
                        <td className="p-3 text-right space-x-1.5">
                          <button className="p-1.5 rounded border border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 transition" onClick={() => setDetailViewItem({ type: "payment", data: row })} title="Lihat Detail & Tracking Log">
                            <Eye size={14} />
                          </button>
                          <button className="p-1.5 rounded border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition" onClick={() => openEditModal("payment", row)} title="Edit Payment">
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="p-1.5 rounded border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition"
                            onClick={() => handleDelete("payment", row.id)}
                            title="Hapus Payment"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}

      {/* CUSTOMER MASTER VIEW */}
      {viewTitle === "Customer & Credit Terms" && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <PageHeader
              title="Customer Master & Credit Terms"
              description="Direktori pelanggan, grup induk entitas (Petrindo, PTBA, Harum Energy), default termin pembayaran, dan performa pembayaran historis."
            />
            <button
              className="primary flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white shadow-sm transition shrink-0"
              onClick={() => openCreateModal("customer")}
            >
              <Plus size={16} /> Tambah Customer
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customerRows
              .filter((r) => JSON.stringify(r).toLowerCase().includes(query.toLowerCase()))
              .map((c: any) => (
                <div key={c.id} className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3 relative hover:shadow-md transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-mono font-bold text-cyan-800 bg-cyan-50 border border-cyan-200 px-2.5 py-0.5 rounded-md">
                        {c.code}
                      </span>
                      <h3 className="text-lg font-black text-slate-900 mt-1">{c.fullName}</h3>
                      <p className="text-xs text-slate-500 font-medium">Grup: <span className="text-slate-800 font-bold">{c.groupParent}</span></p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Termin Hari</span>
                      <div className="text-lg font-black text-amber-700">{c.terminDays} Hari</div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 text-xs text-slate-700 space-y-1.5 font-medium">
                    <div><span className="text-slate-500 font-bold">No. Kontrak:</span> {c.contractNo}</div>
                    <div><span className="text-slate-500 font-bold">Nilai Kontrak:</span> <span className="font-extrabold text-slate-900">{formatIDR(c.contractValue)}</span></div>
                    <div><span className="text-slate-500 font-bold">Kontak AR:</span> {c.contactAR} ({c.emailAR})</div>
                    <div><span className="text-slate-500 font-bold">Catatan:</span> {c.notes}</div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button className="text-xs font-bold text-cyan-800 hover:text-cyan-900 flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-50 border border-cyan-200" onClick={() => setDetailViewItem({ type: "customer", data: c })}>
                      <Eye size={13} /> View Audit
                    </button>
                    <button className="text-xs font-bold text-slate-700 hover:text-cyan-800 flex items-center gap-1 px-2.5 py-1 rounded bg-slate-50 border border-slate-200" onClick={() => openEditModal("customer", c)}>
                      <Edit2 size={13} /> Edit
                    </button>
                    <button className="text-xs font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1 px-2.5 py-1 rounded bg-rose-50 border border-rose-200" onClick={() => handleDelete("customer", c.id)}>
                      <Trash2 size={13} /> Hapus
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </>
      )}

      {/* ================= MODAL DETAIL VIEW & AUDIT TIMELINE WITH PDF PREVIEW (2 KOLOM) ================= */}
      {detailViewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className={`bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 w-full ${detailViewItem.type === "invoice" ? "max-w-[95vw]" : "max-w-5xl"} shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto transition-all`}>
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-cyan-800 bg-cyan-50 px-2.5 py-1 rounded-md border border-cyan-200">
                  <FileText size={14} /> Detail View & Audit Log Tracking
                </span>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  {detailViewItem.type === "ba" ? `Berita Acara: ${detailViewItem.data.baNumber}` : detailViewItem.type === "invoice" ? `Invoice Master: ${detailViewItem.data.invoiceNo}` : detailViewItem.type === "payment" ? `Payment Log: ${detailViewItem.data.invoiceNo}` : `Customer: ${detailViewItem.data.fullName}`}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {detailViewItem.type === "invoice" && (
                  <button
                    type="button"
                    onClick={() => exportPaymentDetailPDF(detailViewItem.data)}
                    className="px-3.5 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white font-extrabold text-xs transition flex items-center gap-1.5 shadow-sm"
                    title="Export / Cetak Dokumen Official PAYMENT DETAIL PDF"
                  >
                    <FileText size={15} /> 📄 Export PDF Payment Detail
                  </button>
                )}
                <button className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition" onClick={() => setDetailViewItem(null)}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* 2-COLUMN LAYOUT (WIDE DISPLAY FOR PAYMENT DETAIL) */}
            <div className={`grid grid-cols-1 ${detailViewItem.type === "invoice" ? "md:grid-cols-12" : "md:grid-cols-5"} gap-6`}>
              {/* LEFT COLUMN (WIDE FOR INVOICE): Structured Record Summary & PDF Preview */}
              <div className={`${detailViewItem.type === "invoice" ? "md:col-span-8" : "md:col-span-3"} space-y-5 border-b md:border-b-0 md:border-r border-slate-200 pb-6 md:pb-0 md:pr-6`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Rincian Dokumen & Nilai Transaksi</h4>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      ID: #{detailViewItem.data.id}
                    </span>
                  </div>
                  {detailViewItem.type === "invoice" && (
                    <button
                      type="button"
                      onClick={() => exportPaymentDetailPDF(detailViewItem.data)}
                      className="px-3 py-1 rounded bg-cyan-700 hover:bg-cyan-800 text-white font-extrabold text-xs transition flex items-center gap-1 shadow-xs"
                    >
                      <FileText size={13} /> 🖨️ Cetak / Simpan PDF
                    </button>
                  )}
                </div>

                {/* BA Detail Summary */}
                {detailViewItem.type === "ba" && (
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs text-slate-800">
                      <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
                        <div><span className="text-slate-500 block font-bold">No. BA:</span> <strong className="text-sm font-mono text-cyan-800">{detailViewItem.data.baNumber}</strong></div>
                        <div><span className="text-slate-500 block font-bold">Customer Code:</span> <strong className="text-sm text-slate-900">{detailViewItem.data.customerCode}</strong></div>
                        <div><span className="text-slate-500 block font-bold">Periode Pekerjaan:</span> <strong className="text-slate-800">{detailViewItem.data.workPeriod || "-"}</strong></div>
                        <div><span className="text-slate-500 block font-bold">PIC AAP:</span> <strong className="text-slate-800">{detailViewItem.data.picAAP || "-"}</strong></div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pb-3 border-b border-slate-200 text-[11px]">
                        <div><span className="text-slate-500 block">Tgl Selesai:</span> <strong>{detailViewItem.data.workEndDate ? new Date(detailViewItem.data.workEndDate).toLocaleDateString("id-ID") : "-"}</strong></div>
                        <div><span className="text-slate-500 block">Tgl Diajukan:</span> <strong>{detailViewItem.data.baSubmittedDate ? new Date(detailViewItem.data.baSubmittedDate).toLocaleDateString("id-ID") : "-"}</strong></div>
                        <div><span className="text-slate-500 block">Tgl TTD BA:</span> <strong>{detailViewItem.data.baSignedDate ? new Date(detailViewItem.data.baSignedDate).toLocaleDateString("id-ID") : "-"}</strong></div>
                      </div>
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <span className="text-xs text-emerald-800 font-bold block uppercase font-bold tracking-wider">Nominal Pekerjaan (Nilai Klaim BA)</span>
                        <span className="text-xl font-black text-emerald-900 font-mono">{formatIDR(detailViewItem.data.workAmount || 0)}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pb-2">
                        <div><span className="text-slate-500 block font-bold">Lead Time Approval:</span> <strong className="text-amber-700 font-extrabold text-sm">{detailViewItem.data.leadTimeDays} Hari</strong></div>
                        <div><span className="text-slate-500 block font-bold">Status BA:</span> <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${detailViewItem.data.statusBA === "Approved" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{detailViewItem.data.statusBA}</span></div>
                      </div>
                      <div>
                        <span className="text-slate-500 block font-bold">Bottleneck & Notes:</span>
                        <p className="text-amber-800 font-bold mt-0.5">{detailViewItem.data.notesBottleneck}</p>
                        <p className="text-slate-600 text-xs mt-0.5">{detailViewItem.data.notes}</p>
                      </div>
                    </div>

                    {/* PDF PREVIEW CONTAINER SECTION */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h5 className="text-xs font-black uppercase text-cyan-800 tracking-wider flex items-center gap-1.5">
                          <FileText size={15} /> Pratinjau Dokumen PDF (Draft & Final BA)
                        </h5>
                      </div>

                      {/* Draft BA Preview Card */}
                      <div className="p-3 bg-slate-900 text-white rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                            <Upload size={14} /> Draft BA PDF Document
                          </span>
                          {detailViewItem.data.draftBAPath ? (
                            <a
                              href={detailViewItem.data.draftBAPath}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] px-2.5 py-1 rounded bg-cyan-700 hover:bg-cyan-600 text-white font-bold inline-flex items-center gap-1"
                            >
                              <ExternalLink size={12} /> Buka PDF Tab Baru
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Belum Diunggah</span>
                          )}
                        </div>
                        {detailViewItem.data.draftBAPath ? (
                          <div className="w-full h-44 rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
                            <iframe src={detailViewItem.data.draftBAPath} className="w-full h-full" title="Draft BA PDF Preview" />
                          </div>
                        ) : (
                          <div className="p-4 text-center text-xs text-slate-400 bg-slate-800/50 rounded-lg border border-dashed border-slate-700">
                            Draft BA PDF belum diunggah saat entri baru.
                          </div>
                        )}
                      </div>

                      {/* Final BA Preview Card */}
                      <div className="p-3 bg-slate-900 text-white rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle size={14} /> Final Signed BA PDF Document
                          </span>
                          {detailViewItem.data.finalBAPath ? (
                            <a
                              href={detailViewItem.data.finalBAPath}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold inline-flex items-center gap-1"
                            >
                              <ExternalLink size={12} /> Buka PDF Tab Baru
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Belum Diunggah (Edit untuk upload)</span>
                          )}
                        </div>
                        {detailViewItem.data.finalBAPath ? (
                          <div className="w-full h-44 rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
                            <iframe src={detailViewItem.data.finalBAPath} className="w-full h-full" title="Final BA PDF Preview" />
                          </div>
                        ) : (
                          <div className="p-4 text-center text-xs text-slate-400 bg-slate-800/50 rounded-lg border border-dashed border-slate-700">
                            Final BA Signed PDF dapat diunggah saat mengedit status BA ke Approved.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Invoice Detail Summary — Official PAYMENT DETAIL Document Sheet (No Yellow Color) */}
                {detailViewItem.type === "invoice" && (
                  <div className="p-4 bg-white border border-slate-300 rounded-xl space-y-4 shadow-sm text-xs text-slate-800">
                    {/* Official ANDALAN Logo Header */}
                    <div className="text-center pb-2 border-b border-slate-200">
                      <img src="/andalan-logo.png" alt="ANDALAN Logo" className="h-10 w-auto object-contain mx-auto" />
                    </div>

                    {/* Header Info Block */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-slate-200 font-mono text-[11px]">
                      <div className="space-y-1">
                        <div className="flex"><span className="w-24 font-bold text-slate-500">Company</span><span className="font-extrabold text-slate-900">: {detailViewItem.data.customerCode || "PT. POSITION"}</span></div>
                        <div className="flex"><span className="w-24 font-bold text-slate-500">Contractor</span><span className="font-extrabold text-slate-900">: PT. ANDALAN ARTHA PRIMANUSA</span></div>
                        <div className="flex"><span className="w-24 font-bold text-slate-500">Project</span><span className="font-extrabold text-slate-900">: {detailViewItem.data.projectSite || "POS PROJECT"}</span></div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex"><span className="w-32 font-bold text-slate-500">Invoice No.</span><span className="font-extrabold text-slate-900">: {detailViewItem.data.invoiceNo}</span></div>
                        <div className="flex"><span className="w-32 font-bold text-slate-500">Activity Group</span><span className="font-extrabold text-cyan-900">: {(detailViewItem.data.activityGroup || detailViewItem.data.jobType || "OPERATION & MINING").toUpperCase()}</span></div>
                        <div className="flex"><span className="w-32 font-bold text-slate-500">Period Covered</span><span className="font-extrabold text-slate-900">: {detailViewItem.data.workPeriod || "Juni 2026"}</span></div>
                        <div className="flex"><span className="w-32 font-bold text-slate-500">Contract Number</span><span className="font-extrabold text-slate-900">: {detailViewItem.data.contractNo || "002/POS-AAP/2025"}</span></div>
                      </div>
                    </div>

                    <div className="text-center py-1 border-b border-slate-200">
                      <h4 className="text-base font-black text-slate-900 uppercase tracking-widest underline decoration-2 underline-offset-4">
                        PAYMENT DETAIL
                      </h4>
                    </div>

                    {/* Official PAYMENT DETAIL Table (Clean White & Slate, No Yellow Highlight) */}
                    <div className="overflow-x-auto rounded-lg border border-slate-300">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-900 font-black text-[11px] uppercase border-b border-slate-300">
                            <th className="p-2 border-r border-slate-300">DESCRIPTION</th>
                            <th className="p-2 text-center border-r border-slate-300">CLAIMED VOLUME</th>
                            <th className="p-2 text-right border-r border-slate-300">UNIT RATE</th>
                            <th className="p-2 text-right font-extrabold">AMOUNT (IDR)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-[11px] font-medium text-slate-900">
                          {/* Section A */}
                          <tr className="bg-slate-50 font-extrabold text-slate-900">
                            <td className="p-2 underline border-r border-slate-200">A. PRODUCTION</td>
                            <td className="p-2 text-center font-mono border-r border-slate-200 font-black">
                              {invLineItems.filter(i => i.section === "A").reduce((sum, i) => sum + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} Bcm
                            </td>
                            <td className="p-2 text-right border-r border-slate-200"></td>
                            <td className="p-2 text-right font-mono font-black">{formatIDR(subtotalA)}</td>
                          </tr>
                          {invLineItems.filter(i => i.section === "A").map((item) => {
                            const { unitRate, amount } = calculateItemRateAndAmount(item);
                            return (
                              <tr key={item.id} className="hover:bg-slate-50">
                                <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">{item.description}</td>
                                <td className="p-2 text-center font-mono font-bold border-r border-slate-200">
                                  {(item.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} <span className="text-[10px] text-slate-500 font-normal">{item.unit}</span>
                                </td>
                                <td className="p-2 text-right font-mono border-r border-slate-200">{unitRate.toLocaleString("id-ID")}</td>
                                <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
                              </tr>
                            );
                          })}

                          {/* Section B */}
                          <tr className="bg-slate-50 font-extrabold text-slate-900 border-t border-slate-300">
                            <td className="p-2 underline border-r border-slate-200">B. OVER DISTANCE</td>
                            <td className="p-2 text-center border-r border-slate-200"></td>
                            <td className="p-2 text-right border-r border-slate-200"></td>
                            <td className="p-2 text-right font-mono font-black">{formatIDR(subtotalB)}</td>
                          </tr>
                          {invLineItems.filter(i => i.section === "B").map((item) => {
                            const effVol = getItemEffectiveVolume(item);
                            const effMtr = getItemEffectiveOverhaulMtr(item);
                            const { unitRate, amount } = calculateItemRateAndAmount(item);
                            const diffMtr = effMtr - 1000;
                            return (
                              <tr key={item.id} className="hover:bg-slate-50">
                                <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">
                                  <div>{item.description}</div>
                                  <div className="text-[10px] text-slate-500 font-mono font-normal">
                                    {effMtr} mtr - 1000 mtr = ({diffMtr}) mtr
                                  </div>
                                </td>
                                <td className="p-2 text-center font-mono font-bold border-r border-slate-200">
                                  {effVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })} <span className="text-[10px] text-slate-500 font-normal">{item.unit}</span>
                                </td>
                                <td className="p-2 text-right font-mono border-r border-slate-200">{unitRate.toLocaleString("id-ID")}</td>
                                <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
                              </tr>
                            );
                          })}

                          {/* Section C */}
                          <tr className="bg-slate-50 font-extrabold text-slate-900 border-t border-slate-300">
                            <td className="p-2 underline border-r border-slate-200">C. LAND CLEARING</td>
                            <td className="p-2 text-center border-r border-slate-200"></td>
                            <td className="p-2 text-right border-r border-slate-200"></td>
                            <td className="p-2 text-right font-mono font-black">{formatIDR(subtotalC)}</td>
                          </tr>
                          {invLineItems.filter(i => i.section === "C").map((item) => {
                            const { unitRate, amount } = calculateItemRateAndAmount(item);
                            return (
                              <tr key={item.id} className="hover:bg-slate-50">
                                <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">{item.description}</td>
                                <td className="p-2 text-center font-mono font-bold border-r border-slate-200">
                                  {(item.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} <span className="text-[10px] text-slate-500 font-normal">{item.unit}</span>
                                </td>
                                <td className="p-2 text-right font-mono border-r border-slate-200">{unitRate.toLocaleString("id-ID")}</td>
                                <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
                              </tr>
                            );
                          })}

                          {/* Section D */}
                          <tr className="bg-slate-50 font-extrabold text-slate-900 border-t border-slate-300">
                            <td className="p-2 underline border-r border-slate-200">D. RAISE & FALL'S FACTOR</td>
                            <td className="p-2 text-center border-r border-slate-200"></td>
                            <td className="p-2 text-right border-r border-slate-200"></td>
                            <td className="p-2 text-right font-mono font-black">{formatIDR(subtotalD)}</td>
                          </tr>
                          {invLineItems.filter(i => i.section === "D").map((item) => {
                            const effVol = getItemEffectiveVolume(item);
                            const effMtr = getItemEffectiveOverhaulMtr(item);
                            const { unitRate, amount } = calculateItemRateAndAmount(item);
                            return (
                              <tr key={item.id} className="hover:bg-slate-50">
                                <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">{item.description}</td>
                                <td className="p-2 text-center font-mono font-bold border-r border-slate-200">
                                  {effVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })} <span className="text-[10px] text-slate-500 font-normal">{item.unit}</span>
                                </td>
                                <td className="p-2 text-right font-mono border-r border-slate-200">{unitRate.toLocaleString("id-ID")}</td>
                                <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
                              </tr>
                            );
                          })}
                        </tbody>

                        {/* TOTALS FOOTER */}
                        <tfoot className="border-t-2 border-slate-900 bg-slate-50 font-bold text-[11px]">
                          <tr className="border-b border-slate-200">
                            <td colSpan={3} className="p-2 text-left font-extrabold uppercase text-slate-900">TOTAL (REVENUE GROSS):</td>
                            <td className="p-2 text-right font-mono font-black text-slate-900">{formatIDR(totalGrossCalc)}</td>
                          </tr>
                          <tr className="border-b border-slate-200">
                            <td colSpan={3} className="p-2 text-left uppercase text-slate-800">DPP PPN 11/12:</td>
                            <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(dpp11_12Calc)}</td>
                          </tr>
                          <tr className="border-b border-slate-200">
                            <td colSpan={3} className="p-2 text-left uppercase text-slate-800">VAT ( 12% ) (+):</td>
                            <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(vat12Calc)}</td>
                          </tr>
                          <tr className="border-b border-slate-200">
                            <td colSpan={3} className="p-2 text-left uppercase text-slate-800">WITH HOLDING TAX ART 23 (-):</td>
                            <td className="p-2 text-right font-mono font-extrabold text-slate-900">({formatIDR(pph23Calc)})</td>
                          </tr>
                          <tr className="bg-slate-900 text-white font-black text-xs">
                            <td colSpan={3} className="p-2.5 text-left uppercase tracking-wider text-cyan-300">TOTAL INVOICE (NET):</td>
                            <td className="p-2.5 text-right font-mono text-sm text-emerald-400">{formatIDR(netTotalInvoiceCalc)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Notes Footer */}
                    <div className="pt-2 text-[10px] font-mono text-slate-600 space-y-0.5">
                      <p className="font-bold text-slate-800">Note:</p>
                      <p>1. Raise & Fall's Factor: <strong className="text-slate-900">{rfIndexCalculated.toFixed(3)}</strong></p>
                    </div>

                    {/* Bottom Info Grid: Bank Account from Master Data & Blank Signature Area */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t-2 border-slate-900 text-[11px] font-mono">
                      {/* Left: Bank Account Info from Master Data */}
                      <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg space-y-1">
                        <p className="font-extrabold uppercase text-slate-900 tracking-wider">PLEASE MAKE PAYMENT TO THIS ACCOUNT:</p>
                        <div className="pt-1 text-[11px] space-y-1">
                          <div className="flex"><span className="w-24 font-bold text-slate-500">Bank Name</span><span className="font-extrabold text-slate-900">: Bank BNI</span></div>
                          <div className="flex"><span className="w-24 font-bold text-slate-500">A/C Name</span><span className="font-extrabold text-slate-900">: PT Andalan Artha Primanusa</span></div>
                          <div className="flex"><span className="w-24 font-bold text-slate-500">A/C No</span><span className="font-extrabold font-mono text-cyan-900">: 8188788882</span></div>
                          <div className="flex"><span className="w-24 font-bold text-slate-500">Branch</span><span className="font-extrabold text-slate-900">: Harmoni, Jakarta</span></div>
                        </div>
                      </div>

                      {/* Right: Signature Area (Blank as requested) */}
                      <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg flex flex-col justify-between text-center">
                        <div className="text-right text-[10px] text-slate-600 font-bold">
                          Jakarta, {new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                        </div>
                        <div className="pt-1">
                          <p className="text-[10px] font-extrabold uppercase text-slate-700">SUBMITTED BY,</p>
                          <p className="text-[11px] font-black text-slate-900">PT ANDALAN ARTHA PRIMANUSA</p>
                        </div>

                        {/* Blank signature space (no stamp/signature) */}
                        <div className="h-14 border-b border-dashed border-slate-400 my-2 flex items-center justify-center text-[10px] text-slate-400 italic">
                          ( Area Tanda Tangan & Stempel — Kosong )
                        </div>

                        <div>
                          <p className="text-[11px] font-black underline text-slate-900">GAHARI CHRISTINE</p>
                          <p className="text-[10px] font-bold text-slate-600">DIRECTOR</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Detail Summary */}
                {detailViewItem.type === "payment" && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs text-slate-800">
                    <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
                      <div><span className="text-slate-500 block font-bold">Target Invoice:</span> <strong className="text-sm font-mono text-cyan-800">{detailViewItem.data.invoiceNo}</strong></div>
                      <div><span className="text-slate-500 block font-bold">Customer:</span> <strong className="text-sm text-slate-900">{detailViewItem.data.customerCode}</strong></div>
                    </div>
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <span className="text-xs text-emerald-800 font-bold block uppercase">Jumlah Uang Masuk Received</span>
                      <span className="text-2xl font-black text-emerald-900">{formatIDR(detailViewItem.data.amountPaid)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-slate-500 block">Bank Receiving:</span> <strong>{detailViewItem.data.receivingBank}</strong></div>
                      <div><span className="text-slate-500 block">No. Ref Transfer:</span> <strong className="font-mono">{detailViewItem.data.refNo}</strong></div>
                    </div>
                    <div><span className="text-slate-500 block">Ketepatan Bayar:</span> <span className="font-bold text-amber-700">{detailViewItem.data.daysLateOrEarly > 0 ? `Telat ${detailViewItem.data.daysLateOrEarly} Hari` : "On-Time / Tepat Waktu"}</span></div>
                    <div><span className="text-slate-500 block">Catatan:</span> <p className="text-slate-700 font-medium">{detailViewItem.data.notes}</p></div>
                  </div>
                )}

                {/* Customer Detail Summary */}
                {detailViewItem.type === "customer" && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs text-slate-800">
                    <div><span className="text-slate-500 block font-bold">Nama Customer:</span> <strong className="text-base text-slate-900">{detailViewItem.data.fullName} ({detailViewItem.data.code})</strong></div>
                    <div><span className="text-slate-500 block font-bold">Induk Perusahaan:</span> <strong className="text-slate-800">{detailViewItem.data.groupParent}</strong></div>
                    <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-200">
                      <div><span className="text-slate-500 block">Termin Hari:</span> <strong className="text-amber-700 font-extrabold text-sm">{detailViewItem.data.terminDays} Hari</strong></div>
                      <div><span className="text-slate-500 block">Nilai Kontrak:</span> <strong className="text-slate-900 font-black">{formatIDR(detailViewItem.data.contractValue)}</strong></div>
                    </div>
                    <div><span className="text-slate-500 block font-bold">No. Kontrak:</span> <strong className="text-slate-800">{detailViewItem.data.contractNo}</strong></div>
                    <div><span className="text-slate-500 block font-bold">Kontak Penagihan AR:</span> <p className="text-slate-700 font-medium">{detailViewItem.data.contactAR} ({detailViewItem.data.emailAR} | {detailViewItem.data.phone})</p></div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN (DYNAMIC SPAN FOR INVOICE): Vertical Audit Trail Timeline */}
              <div className={`${detailViewItem.type === "invoice" ? "md:col-span-4" : "md:col-span-2"} space-y-4`}>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-cyan-800 flex items-center gap-1.5">
                    <History size={16} /> Audit Trail & Flow Tracking
                  </h4>
                  <span className="text-[11px] text-slate-400 font-bold">Jejak Aktivitas User</span>
                </div>

                {/* Vertical Stepper Timeline */}
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {generateAuditTimeline(detailViewItem.type, detailViewItem.data).map((log: any, idx: number) => {
                    let circleColor = "bg-emerald-600 text-white shadow-sm ring-4 ring-emerald-100";
                    if (log.status === "pending") circleColor = "bg-slate-300 text-slate-600";
                    else if (log.status === "warning") circleColor = "bg-amber-500 text-white ring-4 ring-amber-100";
                    else if (log.status === "rejected") circleColor = "bg-rose-600 text-white ring-4 ring-rose-100";

                    return (
                      <div key={idx} className="relative group">
                        {/* Circle Node */}
                        <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${circleColor}`}>
                          {idx + 1}
                        </div>

                        {/* Log Content Card */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-xs space-y-1">
                          <div className="flex justify-between items-start">
                            <h5 className="font-extrabold text-slate-900 text-xs">{log.title}</h5>
                            <span className="text-[10px] font-mono text-slate-500 font-bold">{log.time}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-700">
                            <User size={12} className="text-cyan-700" />
                            <span className="font-bold text-slate-900">{log.user}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">{log.role}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 pt-0.5 font-medium leading-relaxed">{log.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-4 border-t border-slate-200">
              <button
                className="px-6 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold transition shadow-sm"
                onClick={() => setDetailViewItem(null)}
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODERN BEGINNER-FRIENDLY MODAL FORMS */}
      {modalType !== "none" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className={`bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 w-full ${modalType === "invoice" ? "max-w-5xl" : "max-w-2xl"} shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto transition-all`}>
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-cyan-800 bg-cyan-50 px-2.5 py-1 rounded-md border border-cyan-200">
                  <Layers size={14} /> Form Entri Keuangan
                </span>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  {editItem ? "Edit Data" : "Tambah Data Baru"} — {modalType === "ba" ? "Berita Acara (BA)" : modalType === "invoice" ? "Invoice Master (PAYMENT DETAIL)" : modalType === "payment" ? "Payment Receipt" : "Customer Master"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Isi bidang kuning di bawah ini. Angka nominal & perhitungan akan terformat dan terkalkulasi otomatis.</p>
              </div>
              <button className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition" onClick={() => setModalType("none")}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6 text-sm font-medium text-slate-800">

              {/* ================= MODAL INVOICE MASTER (PAYMENT DETAIL GENERATOR) ================= */}
              {modalType === "invoice" && (
                <div className="space-y-5 text-xs">
                  {/* Header Info Card */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-2">
                      <h4 className="text-sm font-black text-slate-900 tracking-wider uppercase flex items-center gap-1.5">
                        <FileText size={16} className="text-cyan-800" /> PAYMENT DETAIL — INVOICE GENERATOR
                      </h4>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={loadDemoPOSData}
                          className="px-2.5 py-1 text-xs font-extrabold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded transition flex items-center gap-1"
                          title="Isi otomatis dengan data demo POS Mining Juni 2026"
                        >
                          <Pickaxe size={14} /> ⚡ Load Demo POS Mining
                        </button>
                        <span className="text-xs font-bold text-cyan-800 bg-cyan-50 px-2.5 py-1 rounded border border-cyan-200">
                          Calculated RF Index: <strong className="text-amber-700 font-mono font-black">{rfIndexCalculated.toFixed(3)}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="w-24 text-slate-500 font-bold">Company:</span>
                          <select
                            className="bg-yellow-200/90 hover:bg-yellow-100 border border-yellow-400 font-black text-slate-900 text-xs px-2 py-1 rounded focus:bg-yellow-50 outline-none flex-1"
                            value={formData.customerCode || ""}
                            onChange={(e) => handleCompanySelect(e.target.value)}
                          >
                            <option value="">-- Pilih Customer --</option>
                            {customerRows.map((c: any) => (
                              <option key={c.id || c.code} value={c.code}>
                                {c.code} — {c.fullName}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-24 text-slate-500 font-bold">Contractor:</span>
                          <span className="font-extrabold text-slate-800">PT. ANDALAN ARTHA PRIMANUSA</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-24 text-slate-500 font-bold">Project:</span>
                          <input
                            className="bg-slate-100 border border-slate-300 font-extrabold text-slate-800 text-xs px-2 py-1 rounded outline-none flex-1"
                            value={formData.projectSite || ""}
                            onChange={(e) => setFormData({ ...formData, projectSite: e.target.value })}
                            placeholder="Otomatis terisi dari Master Customer"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="w-32 text-slate-500 font-bold">Invoice No.:</span>
                          <input
                            className="bg-yellow-200/90 hover:bg-yellow-100 border border-yellow-400 font-mono font-black text-slate-900 text-xs px-2 py-1 rounded focus:bg-yellow-50 outline-none flex-1"
                            placeholder="003/POS-AAP/RF/VI/2026"
                            value={formData.invoiceNo || ""}
                            onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                            required
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-32 text-slate-500 font-bold">Activity Group:</span>
                          <select
                            className="bg-yellow-200/90 border border-yellow-400 font-black text-slate-900 text-xs px-2 py-1 rounded focus:bg-yellow-100 outline-none flex-1"
                            value={formData.activityGroup || "OPERATION & MINING"}
                            onChange={(e) => setFormData({ ...formData, activityGroup: e.target.value })}
                          >
                            <option value="OPERATION & MINING">OPERATION & MINING</option>
                            <option value="MINE DEVELOPMENT (MDO)">MINE DEVELOPMENT (MDO)</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-32 text-slate-500 font-bold">Period Covered:</span>
                          <input
                            className="bg-yellow-200/90 hover:bg-yellow-100 border border-yellow-400 font-black text-slate-900 text-xs px-2 py-1 rounded focus:bg-yellow-50 outline-none flex-1"
                            placeholder="Juni 2026"
                            value={formData.workPeriod || ""}
                            onChange={(e) => setFormData({ ...formData, workPeriod: e.target.value })}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-32 text-slate-500 font-bold">Contract Number:</span>
                          <input
                            className="bg-slate-100 border border-slate-300 font-extrabold text-slate-800 text-xs px-2 py-1 rounded outline-none flex-1"
                            placeholder="Otomatis terisi dari Master Customer"
                            value={formData.contractNo || ""}
                            onChange={(e) => setFormData({ ...formData, contractNo: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-500">M-Rate (Kurs Tengah BI)</label>
                        <div className="relative mt-0.5">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">Rp</span>
                          <input type="number" step="0.01" className="w-full bg-yellow-200/90 border border-yellow-400 rounded pl-7 pr-2 py-1 text-xs font-black text-slate-900 focus:bg-yellow-100 outline-none" value={mRate} onChange={(e) => setMRate(Number(e.target.value))} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-500">Fuel Price ($F_n$ USD/L)</label>
                        <div className="relative mt-0.5">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">$</span>
                          <input type="number" step="0.001" className="w-full bg-yellow-200/90 border border-yellow-400 rounded pl-6 pr-2 py-1 text-xs font-black text-slate-900 focus:bg-yellow-100 outline-none" value={fuelPriceUSD} onChange={(e) => setFuelPriceUSD(Number(e.target.value))} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-500">Labor Price ($L_n$ IDR)</label>
                        <div className="relative mt-0.5">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">Rp</span>
                          <input type="number" className="w-full bg-yellow-200/90 border border-yellow-400 rounded pl-7 pr-2 py-1 text-xs font-black text-slate-900 focus:bg-yellow-100 outline-none" value={laborPriceIDR} onChange={(e) => setLaborPriceIDR(Number(e.target.value))} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PAYMENT DETAIL TABLE */}
                  <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-sm bg-white">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider">
                          <th className="p-2.5 text-center w-10">Del</th>
                          <th className="p-2.5">DESCRIPTION</th>
                          <th className="p-2.5 text-center">CLAIMED VOLUME / DISTANCE</th>
                          <th className="p-2.5 text-right">UNIT RATE (IDR)</th>
                          <th className="p-2.5 text-right">AMOUNT (IDR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-medium">

                        {/* SECTION A. PRODUCTION */}
                        <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
                          <td className="p-2 text-center text-slate-400">#</td>
                          <td className="p-2 underline">A. PRODUCTION</td>
                          <td className="p-2 text-center font-mono text-cyan-900">
                            {invLineItems.filter(i => i.section === "A").reduce((sum, i) => sum + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} Bcm
                          </td>
                          <td className="p-2 text-right"></td>
                          <td className="p-2 text-right font-mono text-slate-900">{formatIDR(subtotalA)}</td>
                        </tr>
                        {invLineItems.filter(i => i.section === "A").map((item) => {
                          const { unitRate, amount } = calculateItemRateAndAmount(item);
                          return (
                            <tr key={item.id} className="hover:bg-slate-50 transition">
                              <td className="p-2 text-center">
                                <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded" title="Hapus Variable Ini">
                                  <X size={14} />
                                </button>
                              </td>
                              <td className="p-2 font-bold text-slate-800">{item.description}</td>
                              <td className="p-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <input
                                    type="number"
                                    step="0.01"
                                    className="w-28 bg-yellow-200/90 hover:bg-yellow-100 border border-yellow-400 font-mono font-black text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-yellow-50 outline-none"
                                    value={item.volume || 0}
                                    onChange={(e) => updateInvItemVolume(item.id, Number(e.target.value))}
                                  />
                                  <span className="text-[11px] text-slate-600 font-bold">{item.unit}</span>
                                </div>
                              </td>
                              <td className="p-2 text-right font-mono text-slate-700">{formatIDR(unitRate)}</td>
                              <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
                            </tr>
                          );
                        })}
                        {/* Inline Add Variable Row for Section A */}
                        <tr className="bg-slate-50/90 text-xs border-t border-slate-200">
                          <td className="p-1.5 text-center text-slate-400 font-bold">+</td>
                          <td colSpan={4} className="p-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                className="bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-800 font-bold text-xs focus:border-cyan-700 outline-none"
                                value={selectedVarA}
                                onChange={(e) => setSelectedVarA(e.target.value)}
                              >
                                <option value="">-- Pilih Variabel SOW Master Data --</option>
                                {masterVariableOptions.map((opt) => (
                                  <option key={opt.code} value={opt.code}>
                                    {opt.name} ({opt.category}) - ${opt.baseRateUSD}/{opt.unit}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => addVariableToSection("A", selectedVarA)}
                                disabled={!selectedVarA}
                                className="px-3 py-1 rounded bg-cyan-700 hover:bg-cyan-800 disabled:opacity-50 text-white font-bold text-xs transition flex items-center gap-1 shadow-xs"
                              >
                                <Plus size={13} /> Tambah Ke Section A
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* SECTION B. OVER DISTANCE */}
                        <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                          <td className="p-2 text-center text-slate-400">#</td>
                          <td className="p-2 underline">B. OVER DISTANCE</td>
                          <td className="p-2 text-center"></td>
                          <td className="p-2 text-right"></td>
                          <td className="p-2 text-right font-mono text-slate-900">{formatIDR(subtotalB)}</td>
                        </tr>
                        {invLineItems.filter(i => i.section === "B").map((item) => {
                          const effVol = getItemEffectiveVolume(item);
                          const effMtr = getItemEffectiveOverhaulMtr(item);
                          const { unitRate, amount } = calculateItemRateAndAmount(item);
                          const diffMtr = effMtr - 1000;

                          return (
                            <tr key={item.id} className="hover:bg-slate-50 transition">
                              <td className="p-2 text-center">
                                <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded" title="Hapus Variable Ini">
                                  <X size={14} />
                                </button>
                              </td>
                              <td className="p-2 font-bold text-slate-800">
                                {item.description}
                                <div className="flex items-center gap-1.5 mt-1">
                                  <input
                                    type="number"
                                    className="w-20 bg-yellow-200/90 hover:bg-yellow-100 border border-yellow-400 font-mono font-black text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-yellow-50 outline-none"
                                    value={item.overhaulMtr || 1000}
                                    onChange={(e) => updateInvItemOverhaul(item.id, Number(e.target.value))}
                                  />
                                  <span className="text-[11px] text-slate-600 font-bold">mtr - 1000 mtr = ({diffMtr}) mtr</span>
                                </div>
                              </td>
                              <td className="p-2 text-center">
                                <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-100/80 border border-yellow-400 rounded font-mono font-black text-slate-900 text-xs shadow-xs">
                                  <span>{effVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</span>
                                  <span className="text-[11px] text-slate-600 font-bold">{item.unit}</span>
                                </div>
                                <span className="block text-[10px] text-cyan-800 font-bold mt-0.5">(Auto dari Section A)</span>
                              </td>
                              <td className="p-2 text-right font-mono text-slate-700">{formatIDR(unitRate)}</td>
                              <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
                            </tr>
                          );
                        })}
                        {/* Inline Add Variable Row for Section B */}
                        <tr className="bg-slate-50/90 text-xs border-t border-slate-200">
                          <td className="p-1.5 text-center text-slate-400 font-bold">+</td>
                          <td colSpan={4} className="p-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                className="bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-800 font-bold text-xs focus:border-cyan-700 outline-none"
                                value={selectedVarB}
                                onChange={(e) => setSelectedVarB(e.target.value)}
                              >
                                <option value="">-- Pilih Variabel SOW Master Data --</option>
                                {masterVariableOptions.map((opt) => (
                                  <option key={opt.code} value={opt.code}>
                                    {opt.name} ({opt.category}) - ${opt.baseRateUSD}/{opt.unit}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => addVariableToSection("B", selectedVarB)}
                                disabled={!selectedVarB}
                                className="px-3 py-1 rounded bg-cyan-700 hover:bg-cyan-800 disabled:opacity-50 text-white font-bold text-xs transition flex items-center gap-1 shadow-xs"
                              >
                                <Plus size={13} /> Tambah Ke Section B
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* SECTION C. LAND CLEARING */}
                        <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                          <td className="p-2 text-center text-slate-400">#</td>
                          <td className="p-2 underline">C. LAND CLEARING</td>
                          <td className="p-2 text-center"></td>
                          <td className="p-2 text-right"></td>
                          <td className="p-2 text-right font-mono text-slate-900">{formatIDR(subtotalC)}</td>
                        </tr>
                        {invLineItems.filter(i => i.section === "C").map((item) => {
                          const { unitRate, amount } = calculateItemRateAndAmount(item);
                          return (
                            <tr key={item.id} className="hover:bg-slate-50 transition">
                              <td className="p-2 text-center">
                                <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded" title="Hapus Variable Ini">
                                  <X size={14} />
                                </button>
                              </td>
                              <td className="p-2 font-bold text-slate-800">{item.description}</td>
                              <td className="p-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <input
                                    type="number"
                                    step="0.01"
                                    className="w-28 bg-yellow-200/90 hover:bg-yellow-100 border border-yellow-400 font-mono font-black text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-yellow-50 outline-none"
                                    value={item.volume || 0}
                                    onChange={(e) => updateInvItemVolume(item.id, Number(e.target.value))}
                                  />
                                  <span className="text-[11px] text-slate-600 font-bold">{item.unit}</span>
                                </div>
                              </td>
                              <td className="p-2 text-right font-mono text-slate-700">{formatIDR(unitRate)}</td>
                              <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
                            </tr>
                          );
                        })}
                        {/* Inline Add Variable Row for Section C */}
                        <tr className="bg-slate-50/90 text-xs border-t border-slate-200">
                          <td className="p-1.5 text-center text-slate-400 font-bold">+</td>
                          <td colSpan={4} className="p-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                className="bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-800 font-bold text-xs focus:border-cyan-700 outline-none"
                                value={selectedVarC}
                                onChange={(e) => setSelectedVarC(e.target.value)}
                              >
                                <option value="">-- Pilih Variabel SOW Master Data --</option>
                                {masterVariableOptions.map((opt) => (
                                  <option key={opt.code} value={opt.code}>
                                    {opt.name} ({opt.category}) - ${opt.baseRateUSD}/{opt.unit}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => addVariableToSection("C", selectedVarC)}
                                disabled={!selectedVarC}
                                className="px-3 py-1 rounded bg-cyan-700 hover:bg-cyan-800 disabled:opacity-50 text-white font-bold text-xs transition flex items-center gap-1 shadow-xs"
                              >
                                <Plus size={13} /> Tambah Ke Section C
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* SECTION D. RAISE & FALL'S FACTOR */}
                        <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                          <td className="p-2 text-center text-slate-400">#</td>
                          <td className="p-2 underline font-extrabold">D. RAISE & FALL'S FACTOR</td>
                          <td className="p-2 text-center"></td>
                          <td className="p-2 text-right"></td>
                          <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(subtotalD)}</td>
                        </tr>
                        {invLineItems.filter(i => i.section === "D").map((item) => {
                          const effVol = getItemEffectiveVolume(item);
                          const effMtr = getItemEffectiveOverhaulMtr(item);
                          const { unitRate, amount } = calculateItemRateAndAmount(item);
                          const isOverhaul = item.type === "overhaul" || item.description.toLowerCase().includes("overhaul");
                          const diffMtr = effMtr - 1000;

                          return (
                            <tr key={item.id} className="hover:bg-slate-50 transition">
                              <td className="p-2 text-center">
                                <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded" title="Hapus Variable Ini">
                                  <X size={14} />
                                </button>
                              </td>
                              <td className="p-2 font-bold text-slate-800">
                                {item.description}
                                {isOverhaul && (
                                  <div className="text-[10px] text-slate-500 font-normal">
                                    {effMtr} mtr - 1000 mtr = ({diffMtr}) mtr overhaul
                                  </div>
                                )}
                              </td>
                              <td className="p-2 text-center">
                                <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-100/80 border border-yellow-400 rounded font-mono font-black text-slate-900 text-xs shadow-xs">
                                  <span>{effVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</span>
                                  <span className="text-[11px] text-slate-600 font-bold">{item.unit}</span>
                                </div>
                              </td>
                              <td className="p-2 text-right font-mono text-slate-700">{formatIDR(unitRate)}</td>
                              <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
                            </tr>
                          );
                        })}
                        {/* Inline Add Variable Row for Section D */}
                        <tr className="bg-slate-50/90 text-xs border-t border-slate-200">
                          <td className="p-1.5 text-center text-slate-400 font-bold">+</td>
                          <td colSpan={4} className="p-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                className="bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-800 font-bold text-xs focus:border-cyan-700 outline-none"
                                value={selectedVarD}
                                onChange={(e) => setSelectedVarD(e.target.value)}
                              >
                                <option value="">-- Pilih Variabel SOW Master Data --</option>
                                {masterVariableOptions.map((opt) => (
                                  <option key={opt.code} value={opt.code}>
                                    {opt.name} ({opt.category}) - ${opt.baseRateUSD}/{opt.unit}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => addVariableToSection("D", selectedVarD)}
                                disabled={!selectedVarD}
                                className="px-3 py-1 rounded bg-cyan-700 hover:bg-cyan-800 disabled:opacity-50 text-white font-bold text-xs transition flex items-center gap-1 shadow-xs"
                              >
                                <Plus size={13} /> Tambah Ke Section D
                              </button>
                            </div>
                          </td>
                        </tr>
                      </tbody>

                      {/* SUMMARY TOTALS & TAX BREAKDOWN */}
                      <tfoot className="border-t-2 border-slate-800 bg-slate-50 font-bold text-xs">
                        <tr>
                          <td colSpan={3} className="p-2.5 text-right font-extrabold uppercase text-slate-800">TOTAL (REVENUE GROSS):</td>
                          <td colSpan={2} className="p-2.5 text-right font-mono text-base font-black text-slate-900">{formatIDR(totalGrossCalc)}</td>
                        </tr>
                        <tr>
                          <td colSpan={3} className="p-2.5 text-right uppercase text-slate-700">DPP PPN 11/12:</td>
                          <td colSpan={2} className="p-2.5 text-right font-mono font-extrabold text-slate-900">{formatIDR(dpp11_12Calc)}</td>
                        </tr>
                        <tr>
                          <td colSpan={3} className="p-2.5 text-right uppercase text-emerald-800">VAT ( 12% ) (+):</td>
                          <td colSpan={2} className="p-2.5 text-right font-mono font-extrabold text-emerald-700">{formatIDR(vat12Calc)}</td>
                        </tr>
                        <tr>
                          <td colSpan={3} className="p-2.5 text-right uppercase text-rose-800">WITH HOLDING TAX ART 23 (-):</td>
                          <td colSpan={2} className="p-2.5 text-right font-mono font-extrabold text-rose-700">({formatIDR(pph23Calc)})</td>
                        </tr>
                        <tr className="bg-slate-900 text-white font-black text-sm border-t-2 border-slate-900">
                          <td colSpan={3} className="p-3 text-right uppercase tracking-wider text-cyan-300">TOTAL INVOICE (NET):</td>
                          <td colSpan={2} className="p-3 text-right font-mono text-lg text-emerald-400">{formatIDR(netTotalInvoiceCalc)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Helper legend footer */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-1">
                    <span className="text-[11px] text-slate-500 font-medium">
                      * Warna kuning = Field Input Editable. Ikon silang merah = Hapus Variabel SOW. Baris bawah setiap section = Tambah Variabel SOW Master.
                    </span>
                  </div>
                </div>
              )}

              {/* ================= MODAL BA TRACKER (INPUT & EDIT PDF UPLOAD) ================= */}
              {modalType === "ba" && (
                <>
                  {/* Section 1: Identitas BA */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                      <span className="text-xs font-black uppercase text-cyan-800 tracking-wider">📌 1. Identitas BA & Customer</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">No. BA <span className="text-rose-600">*</span></label>
                        <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:border-cyan-700 focus:bg-white outline-none" placeholder="20/BAP-AAP-KKLII/26" value={formData.baNumber || ""} onChange={(e) => setFormData({ ...formData, baNumber: e.target.value })} required />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Customer Code <span className="text-rose-600">*</span></label>
                        <select className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:border-cyan-700 focus:bg-white outline-none" value={formData.customerCode || "BGG"} onChange={(e) => setFormData({ ...formData, customerCode: e.target.value })}>
                          <option value="BGG">BGG - PT Budi Gema Gempita</option>
                          <option value="SBS">SBS - PT Satria Bahana Sarana</option>
                          <option value="DBK">DBK - PT Daya Bumindo Karunia</option>
                          <option value="POS">POS - PT Position</option>
                          <option value="ABN">ABN - PT Andalan Bhumi Nusantara</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Periode Pekerjaan</label>
                        <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" placeholder="Jan-26" value={formData.workPeriod || ""} onChange={(e) => setFormData({ ...formData, workPeriod: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">PIC AAP (Operasional Site)</label>
                        <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" placeholder="Operations / Site Engineer" value={formData.picAAP || ""} onChange={(e) => setFormData({ ...formData, picAAP: e.target.value })} />
                      </div>
                    </div>

                    <RupiahInput
                      label="Nominal Pekerjaan (Rp)"
                      value={formData.workAmount || 0}
                      onChange={(val) => setFormData({ ...formData, workAmount: val })}
                      helperText="Estimasi / Nilai Klaim BA (Auto Format Rp per 3 digit)"
                    />
                  </div>

                  {/* Section 2: Tanggal Approval & Status */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                      <span className="text-xs font-black uppercase text-cyan-800 tracking-wider">⏱️ 2. Tanggal Selesai & Status Approval</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Tgl Selesai Pekerjaan</label>
                        <input type="date" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" value={formData.workEndDate || ""} onChange={(e) => setFormData({ ...formData, workEndDate: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Tgl BA Diajukan</label>
                        <input type="date" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" value={formData.baSubmittedDate || ""} onChange={(e) => setFormData({ ...formData, baSubmittedDate: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Tgl BA Ditandatangani</label>
                        <input type="date" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" value={formData.baSignedDate || ""} onChange={(e) => setFormData({ ...formData, baSignedDate: e.target.value })} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Status BA <span className="text-rose-600">*</span></label>
                      <select className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:border-cyan-700 focus:bg-white outline-none" value={formData.statusBA || "Draft"} onChange={(e) => setFormData({ ...formData, statusBA: e.target.value })}>
                        <option value="Draft">Draft (Belum TTD Customer)</option>
                        <option value="Approved">Approved (Selesai TTD)</option>
                        <option value="Rejected">Rejected (Di-reject / Perlu Revisi)</option>
                      </select>
                    </div>
                  </div>

                  {/* Section 3: Document PDF Upload (Draft BA vs Final BA) */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                      <span className="text-xs font-black uppercase text-cyan-800 tracking-wider">📄 3. Upload Berkas Dokumen PDF</span>
                    </div>

                    {!editItem ? (
                      /* Input Modal: Upload Draft BA */
                      <div className="p-4 bg-cyan-50/70 border border-cyan-200 rounded-xl space-y-2">
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-cyan-900">
                          Upload Draft BA (PDF)
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="file"
                            accept="application/pdf"
                            className="text-xs text-slate-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-cyan-700 file:text-white hover:file:bg-cyan-800 cursor-pointer"
                            onChange={(e) => handleFileUpload(e, "draftBAPath")}
                          />
                        </div>
                        <span className="text-[11px] text-slate-500 block font-medium">
                          Unggah draf awal dokumen Berita Acara yang akan diajukan ke customer (format .pdf).
                        </span>
                        {formData.draftBAPath && (
                          <div className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 p-2 rounded-lg flex items-center gap-1.5">
                            <CheckCircle size={14} /> Berkas Draft BA terlampir: {formData.draftBAPathName || "Draft_BA_Document.pdf"}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Edit Modal: Upload Final BA */
                      <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-emerald-900">
                          Upload Final BA (Signed PDF)
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="file"
                            accept="application/pdf"
                            className="text-xs text-slate-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-700 file:text-white hover:file:bg-emerald-800 cursor-pointer"
                            onChange={(e) => handleFileUpload(e, "finalBAPath")}
                          />
                        </div>
                        <span className="text-[11px] text-slate-500 block font-medium">
                          Unggah dokumen Berita Acara resmi yang telah disetujui dan ditandatangani basah oleh customer (format .pdf).
                        </span>
                        {formData.finalBAPath && (
                          <div className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 p-2 rounded-lg flex items-center gap-1.5">
                            <CheckCircle size={14} /> Berkas Final BA Signed terlampir: {formData.finalBAPathName || "Final_Signed_BA_Document.pdf"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Section 4: Catatan Operasional & Bottleneck */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                      <span className="text-xs font-black uppercase text-cyan-800 tracking-wider">📝 4. Catatan Operasional & Bottleneck</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Catatan Operasional / Bottleneck</label>
                      <textarea className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" rows={2} placeholder="Keterangan bottleneck atau penyebab keterlambatan..." value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                    </div>
                  </div>
                </>
              )}

              {/* ================= MODAL PAYMENT RECEIPT ================= */}
              {modalType === "payment" && (
                <>
                  {/* Section 1: Target Invoice */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                      <span className="text-xs font-black uppercase text-cyan-800 tracking-wider">📌 1. Target Invoice Pembayaran</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">No. Invoice Target <span className="text-rose-600">*</span></label>
                        <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono font-bold focus:border-cyan-700 focus:bg-white outline-none" placeholder="088/BGG-AAP/II/2026" value={formData.invoiceNo || ""} onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })} required />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Customer Code <span className="text-rose-600">*</span></label>
                        <select className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:border-cyan-700 focus:bg-white outline-none" value={formData.customerCode || "BGG"} onChange={(e) => setFormData({ ...formData, customerCode: e.target.value })}>
                          <option value="BGG">BGG</option>
                          <option value="SBS">SBS</option>
                          <option value="DBK">DBK</option>
                          <option value="POS">POS</option>
                          <option value="ABN">ABN</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Nominal & Rekening Bank */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                      <span className="text-xs font-black uppercase text-cyan-800 tracking-wider">💰 2. Nominal Uang Masuk & Rekening Bank</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <RupiahInput
                        label="Jumlah Uang Masuk Received (Rp)"
                        value={formData.amountPaid || 0}
                        onChange={(val) => setFormData({ ...formData, amountPaid: val })}
                        required={true}
                        helperText="Otomatis mengurangi sisa Outstanding & update status Lunas/Partial"
                      />
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Tanggal Pembayaran <span className="text-rose-600">*</span></label>
                        <input type="date" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" value={formData.paymentDate || ""} onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })} required />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Bank Receiving (Tujuan Transaksi)</label>
                        <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" placeholder="Contoh: BRI Escrow / Mandiri 0000 OP" value={formData.receivingBank || ""} onChange={(e) => setFormData({ ...formData, receivingBank: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">No. Referensi Bank / Transfer</label>
                        <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono focus:border-cyan-700 focus:bg-white outline-none" placeholder="TRF-BRI-00129" value={formData.refNo || ""} onChange={(e) => setFormData({ ...formData, refNo: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Catatan Pembayaran */}
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Catatan Pembayaran</label>
                      <textarea className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" rows={2} placeholder="Keterangan cicilan 1 / pelunasan BGG..." value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                    </div>
                  </div>
                </>
              )}

              {/* ================= MODAL CUSTOMER MASTER ================= */}
              {modalType === "customer" && (
                <>
                  {/* Section 1: Identitas Customer */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                      <span className="text-xs font-black uppercase text-cyan-800 tracking-wider">📌 1. Profil Perusahaan & Credit Terms</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Kode Customer <span className="text-rose-600">*</span></label>
                        <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold uppercase focus:border-cyan-700 focus:bg-white outline-none" placeholder="BGG" value={formData.code || ""} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Termin Hari (Credit Terms) <span className="text-rose-600">*</span></label>
                        <input type="number" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:border-cyan-700 focus:bg-white outline-none" value={formData.terminDays || 30} onChange={(e) => setFormData({ ...formData, terminDays: Number(e.target.value) })} required />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Nama Lengkap Perusahaan <span className="text-rose-600">*</span></label>
                      <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:border-cyan-700 focus:bg-white outline-none" placeholder="PT Budi Gema Gempita" value={formData.fullName || ""} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} required />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Induk Perusahaan (Group Parent)</label>
                      <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" placeholder="Petrindo Jaya Kreasi Tbk / PTBA" value={formData.groupParent || ""} onChange={(e) => setFormData({ ...formData, groupParent: e.target.value })} />
                    </div>
                  </div>

                  {/* Section 2: Kontak AR */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                      <span className="text-xs font-black uppercase text-cyan-800 tracking-wider">📞 2. Contact Person & Penagihan AR</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Contact Person AR</label>
                        <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" placeholder="Finance AR BGG" value={formData.contactAR || ""} onChange={(e) => setFormData({ ...formData, contactAR: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Email AR</label>
                        <input type="email" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" placeholder="ar@bgg.co.id" value={formData.emailAR || ""} onChange={(e) => setFormData({ ...formData, emailAR: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Telepon</label>
                        <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" placeholder="+62 21 555 0192" value={formData.phone || ""} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Kontrak & Nilai Kerjasama */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                      <span className="text-xs font-black uppercase text-cyan-800 tracking-wider">📄 3. Kontrak & Nilai Kerjasama</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">No. Kontrak</label>
                        <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" placeholder="09/BGG-AAP/VIII/2018" value={formData.contractNo || ""} onChange={(e) => setFormData({ ...formData, contractNo: e.target.value })} />
                      </div>
                      <RupiahInput
                        label="Nilai Kontrak (Rp)"
                        value={formData.contractValue || 0}
                        onChange={(val) => setFormData({ ...formData, contractValue: val })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Catatan Kontrak / Syarat</label>
                      <textarea className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" rows={2} placeholder="Termin per pekerjaan, 7 tahun..." value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                    </div>
                  </div>
                </>
              )}

              {/* Form Action Buttons */}
              <div className="flex justify-end gap-3 pt-5 border-t border-slate-200">
                <button type="button" className="px-5 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold transition shadow-sm" onClick={() => setModalType("none")}>
                  Batal
                </button>
                <button type="submit" className="primary px-6 py-2.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white font-bold shadow-md transition">
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
