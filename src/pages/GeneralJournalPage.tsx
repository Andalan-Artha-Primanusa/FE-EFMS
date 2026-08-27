import React, { lazy, Suspense, useState, useEffect, useMemo, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import "@fortune-sheet/react/dist/index.css";
import type { Sheet as FortuneSheet } from "@fortune-sheet/core";
import { 
  FileSpreadsheet, 
  Plus, 
  RefreshCw, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  BookOpen, 
  FolderTree, 
  TableProperties, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  RotateCcw, 
  Building2, 
  Trash2,
  Copy,
  ArrowRight,
  Filter,
  Layers,
  Sparkles,
  Users,
  Radio
} from "lucide-react";
import { 
  api, 
  User, 
  getJournals, 
  getCOAAccounts, 
  getSubLedgers, 
  getTrialBalance, 
  getGeneralLedger 
} from "../lib/api";
import { useCollaboration } from "../lib/useCollaboration";
import { ConfirmDialog } from "../components/ConfirmDialog";

const FortuneWorkbook = lazy(() => import("@fortune-sheet/react").then(({ Workbook }) => ({ default: Workbook })));

const formatIDR = (val: number) => {
  if (!val && val !== 0) return "Rp 0";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
};

export interface FlatJournalRow {
  journalId: number;
  lineId: number;
  journalNumber: string;
  journalDate: string;
  monthIndex: number;
  sourceModule: string;
  sourceReference: string;
  projectCode: string;
  customerCode: string;
  accountCode: string;
  accountName: string;
  subAccountCode: string;
  description: string;
  debit: number;
  credit: number;
  status: string;
  createdBy: string;
  verifiedBy?: string;
  approvedBy?: string;
  postedBy?: string;
  isBalanced: boolean;
}

export const masterCOA = [
  { code: "1101.001", name: "Kas HO AAP", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 108701964 },
  { code: "1101.002", name: "Kas - Site BGG", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 33186297 },
  { code: "1101.003", name: "Kas - Purchasing HO", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 2454960 },
  { code: "1101.004", name: "Kas Besar", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 52030067 },
  { code: "1101.005", name: "Kas - Site SBS", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 309000 },
  { code: "1101.006", name: "Kas - HO DBK", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 98254196 },
  { code: "1101.007", name: "Kas - Site DBK", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 58864491 },
  { code: "1101.008", name: "Kas - Site POS", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 0 },
  { code: "1102.001", name: "Bank BCA - 6020", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 183609708 },
  { code: "1102.002", name: "Bank Mandiri", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 10456021576 },
  { code: "1102.003", name: "Bank Mandiri Escow", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 3189779800 },
  { code: "1102.004", name: "Bank BCA - 2229", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 8096 },
  { code: "1102.005", name: "Bank BNI - 0880", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 5000000 },
  { code: "1102.006", name: "Bank BNI - 8883", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 1040124 },
  { code: "1102.007", name: "Bank Mandiri - 8086", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 3253191593 },
  { code: "1102.008", name: "Bank Mandiri - 8085", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 7179989 },
  { code: "1102.009", name: "Bank BRI - 8300", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 1254701383 },
  { code: "1102.010", name: "Bank Universal - 5940", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 460156 },
  { code: "1102.011", name: "Bank BNI 819", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 501856053 },
  { code: "1102.012", name: "Bank BRI Escrow", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 1599722673 },
  { code: "1102.013", name: "Bank Mandiri ABN", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 935168960 },
  { code: "1102.014", name: "Bank BRI ABN - 8302", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 0 },
  { code: "1102.015", name: "Bank BNI Escrow - 882", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 0 },
  { code: "1102.016", name: "Bank BRI - ABC", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 0 },
  { code: "1103.101", name: "Piutang Usaha", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 103143603345 },
  { code: "1103.102", name: "Piutang Lain - lain (AAP - ABN)", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 10661736431 },
  { code: "1103.103", name: "Piutang Pemegang Saham ABN", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 15000000000 },
  { code: "1103.104", name: "Piutang Backcharge", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 0 },
  { code: "1104.100", name: "Uang Muka Pembelian", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 7 },
  { code: "1104.200", name: "Uang Muka Pembelian Solar", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 1894897600 },
  { code: "1104.300", name: "Uang Muka Lain-lain", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 8223058502 },
  { code: "1104.400", name: "Reimbursement Account - ABN", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 0 },
  { code: "1104.500", name: "Uang Muka Bunga Pinjaman", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 3827777778 },
  { code: "1104.600", name: "Reimbursement Account - ABC", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 1540899694 },
  { code: "1105.001", name: "Stock Solar", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 834085208 },
  { code: "1105.002", name: "Stock Sparepart", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 6547735060 },
  { code: "1106.001", name: "Sewa Dibayar Dimuka", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 993648985 },
  { code: "1106.002", name: "Asuransi Dibayar Dimuka", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 2657969240 },
  { code: "1106.003", name: "Angsuran Leasing BGG Dibayar Dimuka", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 0 },
  { code: "1106.004", name: "Biaya Dibayar Dimuka", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 1186588145 },
  { code: "1107.001", name: "PPN Masukan", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 8066505011 },
  { code: "1107.002", name: "Uang Muka PPh 23", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 0 },
  { code: "1107.003", name: "Uang Muka PPh 25", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 0 },
  { code: "1107.004", name: "Uang Muka PPh 22", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 0 },
  { code: "1108.001", name: "Pinjaman Karyawan", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 215379274 },
  { code: "1108.002", name: "PPh 23 Dibayar Dimuka", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 0 },
  { code: "1109.100", name: "Ayat Silang", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 76 },
  { code: "1109.1", name: "Ayat Silang", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 76 },
  { code: "1110.100", name: "Piutang Interco", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 0 },
  { code: "1201.001", name: "Alat Berat", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 185600000000 },
  { code: "1202.001", name: "Kendaraan Operasional", posSaldo: "Db", posLaporan: "NRC", openingBalanceDb: 12500000000 },
  { code: "1203.001", name: "Akumulasi Penyusutan Alat Berat", posSaldo: "Kr", posLaporan: "NRC", openingBalanceKr: 45200000000 },
  { code: "2101.100", name: "Hutang Usaha", posSaldo: "Kr", posLaporan: "NRC", openingBalanceKr: 24500000000 },
  { code: "2101.1", name: "Hutang Usaha", posSaldo: "Kr", posLaporan: "NRC", openingBalanceKr: 24500000000 },
  { code: "2102.100", name: "Hutang PPN Keluaran", posSaldo: "Kr", posLaporan: "NRC", openingBalanceKr: 5600000000 },
  { code: "2102.200", name: "Hutang PPh 21", posSaldo: "Kr", posLaporan: "NRC", openingBalanceKr: 211639480 },
  { code: "2102.300", name: "Hutang PPh 23", posSaldo: "Kr", posLaporan: "NRC", openingBalanceKr: 93983514 },
  { code: "2105.100", name: "Hutang Modal Kerja", posSaldo: "Kr", posLaporan: "NRC", openingBalanceKr: 31731221739 },
  { code: "2201.100", name: "Hutang Jangka Panjang / Leasing", posSaldo: "Kr", posLaporan: "NRC", openingBalanceKr: 86450000000 },
  { code: "3101.001", name: "Modal Saham", posSaldo: "Kr", posLaporan: "NRC", openingBalanceKr: 50000000000 },
  { code: "3102.001", name: "Laba Ditahan", posSaldo: "Kr", posLaporan: "NRC", openingBalanceKr: 72400000000 },
  { code: "3103.001", name: "Laba Tahun Berjalan", posSaldo: "Kr", posLaporan: "NRC", openingBalanceKr: 0 },
  { code: "4101.000", name: "Pendapatan Over Burden (OB)", posSaldo: "Kr", posLaporan: "LR" },
  { code: "4101", name: "Pendapatan Over Burden (OB)", posSaldo: "Kr", posLaporan: "LR" },
  { code: "4102.000", name: "Pendapatan Coal Winning", posSaldo: "Kr", posLaporan: "LR" },
  { code: "4102", name: "Pendapatan Coal Winning", posSaldo: "Kr", posLaporan: "LR" },
  { code: "4103.000", name: "Pendapatan Rehandling", posSaldo: "Kr", posLaporan: "LR" },
  { code: "4104.000", name: "Pendapatan Rental", posSaldo: "Kr", posLaporan: "LR" },
  { code: "4105.000", name: "Pendapatan Under/Over Distance OB", posSaldo: "Kr", posLaporan: "LR" },
  { code: "4106.000", name: "Pendapatan Under/Over Distance CG", posSaldo: "Kr", posLaporan: "LR" },
  { code: "4107.000", name: "Pendapatan Limonite", posSaldo: "Kr", posLaporan: "LR" },
  { code: "4108.000", name: "Pendapatan Saprolite", posSaldo: "Kr", posLaporan: "LR" },
  { code: "4109.000", name: "Pendapatan Top Soil", posSaldo: "Kr", posLaporan: "LR" },
  { code: "5101.001", name: "Solar Industri Site", posSaldo: "Db", posLaporan: "LR" },
  { code: "5101.002", name: "Oli / Pelumas", posSaldo: "Db", posLaporan: "LR" },
  { code: "5101.003", name: "Sparepart / Ban", posSaldo: "Db", posLaporan: "LR" },
  { code: "5101.004", name: "Sewa Alat / Subkon", posSaldo: "Db", posLaporan: "LR" },
  { code: "5101.005", name: "Upah Operator / Mekanik", posSaldo: "Db", posLaporan: "LR" },
  { code: "5101.006", name: "Depresiasi Fixed Asset", posSaldo: "Db", posLaporan: "LR" },
  { code: "5104.000", name: "Gaji Staff", posSaldo: "Db", posLaporan: "LR" },
  { code: "5104", name: "Gaji Staff", posSaldo: "Db", posLaporan: "LR" },
  { code: "6101.000", name: "Administrasi dan Provisi", posSaldo: "Db", posLaporan: "LR" },
  { code: "6101", name: "Administrasi dan Provisi", posSaldo: "Db", posLaporan: "LR" },
  { code: "6113.000", name: "Biaya Bunga Modal Kerja", posSaldo: "Db", posLaporan: "LR" },
  { code: "6114.000", name: "Biaya Bunga Leasing", posSaldo: "Db", posLaporan: "LR" }
];

export const projectList = ["HO", "BGG", "SBS", "POS", "DBK", "IBP"];

interface SheetTab {
  id: string;
  name: string;
  group: "report" | "master" | "aux" | "leasing";
}

const allSheetTabs: SheetTab[] = [
  // 🟢 Laporan Keuangan Utama
  { id: "jurnal", name: "Jurnal", group: "report" },
  { id: "buku-besar", name: "Buku Besar", group: "report" },
  { id: "bb-pembantu", name: "BB Pembantu", group: "report" },
  { id: "neraca-lajur", name: "Neraca Lajur", group: "report" },
  { id: "pl-coy", name: "PL CoY", group: "report" },
  { id: "pl-bgg", name: "PL BGG", group: "report" },
  { id: "pl-sbs", name: "PL SBS", group: "report" },
  { id: "pl-pos", name: "PL POS", group: "report" },
  { id: "pl-ibp", name: "PL IBP", group: "report" },
  { id: "pl-dbk", name: "PL DBK", group: "report" },
  { id: "pl-ho", name: "PL HO", group: "report" },
  { id: "bs-coy", name: "BS CoY", group: "report" },
  { id: "bs-bgg", name: "BS BGG", group: "report" },
  { id: "bs-sbs", name: "BS SBS", group: "report" },
  { id: "bs-pos", name: "BS POS", group: "report" },
  { id: "bs-dbk", name: "BS DBK", group: "report" },
  { id: "bs-ho", name: "BS HO", group: "report" },
  { id: "neraca-ringkas", name: "Neraca", group: "report" },

  // 🔵 Master Data (188 COA & 534 Sub-Ledgers)
  { id: "akun", name: "Akun (COA)", group: "master" },
  { id: "kode", name: "Kode (Sub-Ledger)", group: "master" },

  // ⚪ Buku Pembantu, Stok & Rekap
  { id: "piutang-usaha", name: "Piutang Usaha", group: "aux" },
  { id: "piutang-backcharge", name: "Piutang Backcharge", group: "aux" },
  { id: "stock-solar-bgg", name: "Stock Solar BGG", group: "aux" },
  { id: "stock-solar-pos", name: "Stock Solar POS", group: "aux" },
  { id: "fixed-assets", name: "FA (Fixed Assets)", group: "aux" },
  { id: "sparepart", name: "Sparepart", group: "aux" },
  { id: "asuransi", name: "Asuransi", group: "aux" },
  { id: "sewa-dibayar-dimuka", name: "Sewa dibayar dimuka", group: "aux" },
  { id: "biaya-dibayar-dimuka", name: "Biaya dibayar dimuka", group: "aux" },
  { id: "uang-muka-pembelian", name: "Uang Muka Pembelian", group: "aux" },
  { id: "uang-muka-lain", name: "Uang Muka lain-lain", group: "aux" },
  { id: "uang-muka-bunga", name: "Uang Muka Bunga Pinjaman", group: "aux" },
  { id: "uang-muka-solar", name: "Uang Muka Solar", group: "aux" },
  { id: "hutang-modal-kerja", name: "Hutang Modal Kerja", group: "aux" },
  { id: "hutang-jangka-panjang", name: "Hutang Jangka Panjang", group: "aux" },
  { id: "hutang-pph", name: "Hutang PPH 23", group: "aux" },
  { id: "hutang-pph21", name: "Hutang PPH 21", group: "aux" },
  { id: "hutang-pph4", name: "Hutang PPH 4(3)", group: "aux" },
  { id: "ap-bt-abn", name: "AP BT ABN", group: "aux" },
  { id: "ap-abn", name: "AP ABN", group: "aux" },
  { id: "rekon-leasing", name: "Rekon Leasing", group: "aux" },

  // 🟡 Jadwal Cicilan Leasing (30+ Vendor Leasing Lengkap)
  { id: "leasing-clipan", name: "CLIPAN", group: "leasing" },
  { id: "leasing-hexa", name: "HEXA", group: "leasing" },
  { id: "leasing-mtf", name: "Leasing MTF", group: "leasing" },
  { id: "leasing-mandiri", name: "Mandiri Grup", group: "leasing" },
  { id: "leasing-cfi", name: "CFI", group: "leasing" },
  { id: "leasing-smfl", name: "Leasing SMFL", group: "leasing" },
  { id: "leasing-adira", name: "ADIRA", group: "leasing" },
  { id: "leasing-orix", name: "Orix Finance", group: "leasing" },
  { id: "leasing-buana", name: "Buana Finance", group: "leasing" },
  { id: "leasing-radana", name: "Radana", group: "leasing" },
  { id: "leasing-csul2", name: "Leasing CSUL 2", group: "leasing" },
  { id: "leasing-mitsui", name: "Mitsui", group: "leasing" },
  { id: "leasing-bri", name: "BRI", group: "leasing" },
  { id: "leasing-bpr", name: "BPR", group: "leasing" },
  { id: "leasing-intidana", name: "INTIDANA", group: "leasing" },
  { id: "leasing-mestika", name: "MESTIKA", group: "leasing" }
];

export function GeneralJournalPage({ 
  viewTitle = "Journal Entry", 
  query = "", 
  onNotice, 
  user 
}: { 
  viewTitle?: string; 
  query?: string; 
  onNotice?: (msg: string) => void; 
  user: User; 
}) {
  const getInitialTab = (title: string) => {
    if (title === "General Ledger") return "buku-besar";
    if (title === "Trial Balance") return "neraca-lajur";
    if (title === "Closing Period") return "neraca-ringkas";
    return "jurnal";
  };

  const [activeTab, setActiveTab] = useState<string>(() => getInitialTab(viewTitle));
  const [coaList, setCoaList] = useState<any[]>(masterCOA);
  const [subLedgers, setSubLedgers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>(query);
  const [filterProject, setFilterProject] = useState<string>("ALL");
  const [filterMonth, setFilterMonth] = useState<string>("ALL");
  const [selectedGLAccount, setSelectedGLAccount] = useState<string>("1103.101");
  const [glData, setGLData] = useState<any>(null);
  const [tbData, setTbData] = useState<any[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);

  // 🚀 Interactive Row-level State for Live Editing & Adding (with localStorage persistence)
  const [journalRows, setJournalRows] = useState<FlatJournalRow[]>(() => {
    try {
      const saved = localStorage.getItem("feast_accounting_journal_rows");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // fallback
    }
    return [];
  });

  // Lazy-load dataset Excel referensi (chunk terpisah, tidak masuk bundle utama)
  const [excelBundle, setExcelBundle] = useState<{
    flat: FlatJournalRow[];
    entries: unknown[];
    neraca: any[];
    tables: Record<string, any[][]>;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("../lib/excelDataBundle").then((m) => {
      if (cancelled) return;
      const flat = m.excelFlatJournalRows as FlatJournalRow[];
      setExcelBundle({ flat, entries: m.excelJournalEntries, neraca: m.excelNeracaLajur as any[], tables: m.excelSheetTables });
      setTbData((prev) => (prev.length > 0 ? prev : (m.excelNeracaLajur as any[])));
      setJournalRows((prev) => (prev.length > 0 ? prev : flat));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Track currently active edited row / cell
  const [activeEditingRowId, setActiveEditingRowId] = useState<number | null>(null);
  const [auxSheetPage, setAuxSheetPage] = useState<number>(1);
  const [auxSheetSearch, setAuxSheetSearch] = useState<string>("");

  const tabScrollRef = useRef<HTMLDivElement>(null);

  // Keyboard Shortcuts (Ctrl+S to save, Alt+N to add row)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSaveChanges();
      } else if (e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleAddNewRow();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [journalRows]);

  // Load Data from Backend (merges seamlessly)
  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [jData, cData, sData, tbRes, glRes] = await Promise.all([
        getJournals().catch(() => []),
        getCOAAccounts().catch(() => masterCOA),
        getSubLedgers().catch(() => []),
        getTrialBalance("Juni 2026").catch(() => []),
        getGeneralLedger(selectedGLAccount, "Juni 2026").catch(() => null)
      ]);

      if (cData && cData.length > 0) setCoaList(cData);
      if (sData && sData.length > 0) setSubLedgers(sData);
      if (tbRes && tbRes.length > 0) setTbData(tbRes);
      if (glRes) setGLData(glRes);

      if (jData && jData.length > 0) {
        const rowsFromBE: FlatJournalRow[] = [];
        jData.forEach((j: any) => {
          const dateObj = new Date(j.journalDate || Date.now());
          const mIdx = dateObj.getMonth() + 1;
          (j.lines || []).forEach((line: any) => {
            rowsFromBE.push({
              journalId: j.id,
              lineId: line.id,
              journalNumber: j.journalNumber,
              journalDate: j.journalDate ? new Date(j.journalDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-",
              monthIndex: mIdx,
              sourceModule: j.sourceModule || "MANUAL",
              sourceReference: j.sourceReference || "-",
              projectCode: line.projectCode || j.customerCode || "HO",
              customerCode: j.customerCode || "-",
              accountCode: line.accountCode,
              accountName: line.accountName || "-",
              subAccountCode: line.subAccountCode || "-",
              description: line.description || j.description || "-",
              debit: line.debit || 0,
              credit: line.credit || 0,
              status: j.status || "Posted to GL",
              createdBy: j.createdBy || "Finance Specialist AAP",
              verifiedBy: j.verifiedBy || "Accounting Specialist (HO)",
              approvedBy: j.approvedBy || "FATB Manager",
              postedBy: j.postedBy || "FATB Manager",
              isBalanced: j.isBalanced ?? true
            });
          });
        });
        if (rowsFromBE.length > 0 && !localStorage.getItem("feast_accounting_journal_rows")) {
          setJournalRows(rowsFromBE);
        }
      }
    } catch (err) {
      console.error("Failed to load accounting data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedGLAccount]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Filtered rows for grid display
  const displayedRows = useMemo(() => {
    return journalRows.filter((r) => {
      if (filterProject !== "ALL" && r.projectCode !== filterProject) return false;
      if (filterMonth !== "ALL" && String(r.monthIndex) !== filterMonth) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches = 
          r.accountCode?.toLowerCase().includes(q) ||
          r.accountName?.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.journalNumber?.toLowerCase().includes(q) ||
          r.sourceReference?.toLowerCase().includes(q) ||
          r.subAccountCode?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [journalRows, filterProject, filterMonth, searchQuery]);

  // Live calculation of General Ledger rows for any selected account
  const liveGLData = useMemo(() => {
    const acct = coaList.find(a => 
      a.code === selectedGLAccount || 
      a.code.replace(/\.000$/, "") === selectedGLAccount.replace(/\.000$/, "")
    ) || { code: selectedGLAccount, name: "Akun " + selectedGLAccount, posSaldo: "Db" };
    
    const isCredit = acct.posSaldo === "Kr";
    let runningBalance = (acct as any).openingBalanceDb || (isCredit ? (acct as any).openingBalanceKr || 0 : 0);
    const openingBalance = runningBalance;

    let totDebit = 0;
    let totCredit = 0;
    const rows: any[] = [];

    journalRows.forEach((r: any) => {
      const match = 
        r.accountCode === selectedGLAccount || 
        r.accountCode?.replace(/\.000$/, "") === selectedGLAccount.replace(/\.000$/, "") ||
        r.accountCode?.startsWith(selectedGLAccount) || 
        selectedGLAccount.startsWith(r.accountCode);

      if (match) {
        totDebit += r.debit;
        totCredit += r.credit;
        if (!isCredit) {
          runningBalance += (r.debit - r.credit);
        } else {
          runningBalance += (r.credit - r.debit);
        }
        rows.push({
          date: r.journalDate,
          buktiNo: r.sourceReference,
          projectCode: r.projectCode,
          description: r.description,
          debit: r.debit,
          credit: r.credit,
          balance: runningBalance
        });
      }
    });

    return {
      accountCode: acct.code,
      accountName: acct.name,
      posSaldo: acct.posSaldo || "Db",
      openingBalance,
      endingBalance: runningBalance,
      totalDebit: totDebit,
      totalCredit: totCredit,
      rows
    };
  }, [selectedGLAccount, journalRows, coaList]);

  // Totals for Balance Validator
  const totalDebit = useMemo(() => displayedRows.reduce((acc, r) => acc + r.debit, 0), [displayedRows]);
  const totalCredit = useMemo(() => displayedRows.reduce((acc, r) => acc + r.credit, 0), [displayedRows]);
  const balanceDiff = totalDebit - totalCredit;
  const isGlobalBalanced = Math.abs(balanceDiff) < 1;
  const fortuneSheetData = useMemo<FortuneSheet[]>(() => {
    const headers = [
      "No. Jurnal",
      "Tanggal",
      "Bulan",
      "No. Bukti",
      "Project",
      "Uraian",
      "Kode Akun",
      "Nama Akun",
      "Kode Bantu",
      "Debet",
      "Kredit",
      "Status"
    ];
    const rows = displayedRows.slice(0, 500).map((row) => [
      row.journalNumber,
      row.journalDate,
      row.monthIndex,
      row.sourceReference,
      row.projectCode,
      row.description,
      row.accountCode,
      row.accountName,
      row.subAccountCode,
      row.debit,
      row.credit,
      row.status
    ]);
    const data = [headers, ...rows].map((row, rowIndex) =>
      row.map((value) => ({
        v: value ?? "",
        m: value == null ? "" : String(value),
        bl: rowIndex === 0 ? 1 : 0,
        bg: rowIndex === 0 ? "#f3f4f6" : undefined,
        fc: rowIndex === 0 ? "#334155" : undefined
      }))
    );

    return [{
      id: "journal-posting-review",
      name: "Journal Posting",
      data,
      row: Math.max(data.length, 30),
      column: headers.length,
      config: {
        rowlen: { 0: 28 },
        columnlen: {
          0: 130,
          1: 110,
          2: 70,
          3: 150,
          4: 90,
          5: 260,
          6: 120,
          7: 220,
          8: 120,
          9: 130,
          10: 130,
          11: 120
        }
      }
    }];
  }, [displayedRows]);

  // Real-Time Collaboration Remote Event Handlers
  const handleRemoteCellEdit = useCallback((lineId: number, field: string, value: any, actor: string) => {
    setJournalRows((prev) => {
      return prev.map((r) => {
        if (r.lineId !== lineId) return r;
        const updated = { ...r, [field]: value };
        if (field === "accountCode") {
          const codeStr = String(value || "").trim();
          const match = coaList.find((a) => a.code === codeStr || a.code.replace(/\.000$/, "") === codeStr.replace(/\.000$/, ""));
          if (match) updated.accountName = match.name;
        }
        return updated;
      });
    });
    if (onNotice) onNotice(`👤 ${actor} memperbarui ${field} pada baris transaksi`);
  }, [coaList, onNotice]);

  const handleRemoteAddRow = useCallback((newRow: any, actor: string) => {
    setJournalRows((prev) => {
      if (prev.some(r => r.lineId === newRow.lineId)) return prev;
      return [newRow, ...prev];
    });
    if (onNotice) onNotice(`➕ ${actor} menambahkan baris transaksi baru`);
  }, [onNotice]);

  const handleRemoteDeleteRow = useCallback((lineId: number, actor: string) => {
    setJournalRows((prev) => prev.filter(r => r.lineId !== lineId));
    if (onNotice) onNotice(`🗑️ Baris transaksi dihapus oleh ${actor}`);
  }, [onNotice]);

  // Active Collaboration Hook
  const {
    activeUsers,
    remoteCursors,
    broadcastCursor,
    broadcastCellEdit,
    broadcastAddRow,
    broadcastDeleteRow
  } = useCollaboration({
    user,
    activeSheet: activeTab,
    onRemoteCellEdit: handleRemoteCellEdit,
    onRemoteAddRow: handleRemoteAddRow,
    onRemoteDeleteRow: handleRemoteDeleteRow
  });

  // 📝 Direct In-Cell Row Update Function with Live Broadcast
  const updateRowField = (lineId: number, field: keyof FlatJournalRow, value: any) => {
    setJournalRows((prev) => {
      return prev.map((r) => {
        if (r.lineId !== lineId) return r;
        const updated = { ...r, [field]: value };
        
        // Auto VLOOKUP Nama Akun when accountCode changes!
        if (field === "accountCode") {
          const codeStr = String(value || "").trim();
          const match = coaList.find((a) => a.code === codeStr || a.code.replace(/\.000$/, "") === codeStr.replace(/\.000$/, ""));
          if (match) {
            updated.accountName = match.name;
          }
        }
        return updated;
      });
    });
    setHasUnsavedChanges(true);
    broadcastCellEdit(lineId, field as string, value);
    broadcastCursor(lineId, field as string);
  };

  // ➕ Add New Row Handler with Live Broadcast
  const handleAddNewRow = useCallback(() => {
    const nextId = journalRows.length + 1;
    const now = new Date();
    const dateStr = now.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
    const currentM = now.getMonth() + 1;

    const newRow: FlatJournalRow = {
      journalId: nextId,
      lineId: Date.now() + Math.floor(Math.random() * 1000),
      journalNumber: "", // KOSONG
      journalDate: dateStr, // HANYA TANGGAL OTOMATIS
      monthIndex: currentM,
      sourceModule: "MANUAL",
      sourceReference: "", // KOSONG
      projectCode: "", // KOSONG
      customerCode: "",
      accountCode: "", // KOSONG
      accountName: "", // KOSONG
      subAccountCode: "", // KOSONG
      description: "", // KOSONG
      debit: 0,
      credit: 0,
      status: "Draft",
      createdBy: user?.name || "Accounting Specialist",
      verifiedBy: "",
      approvedBy: "",
      postedBy: "",
      isBalanced: true
    };

    setJournalRows((prev) => [newRow, ...prev]);
    setActiveEditingRowId(newRow.lineId);
    setHasUnsavedChanges(true);
    broadcastAddRow(newRow);
    if (onNotice) onNotice("Baris baru ditambahkan dengan tanggal otomatis. Kolom lain kosong dan siap diketik.");
  }, [journalRows.length, user, onNotice, broadcastAddRow]);

  // 🗑️ Delete Row Handler with Live Broadcast
  const handleDeleteRow = (lineId: number) => {
    setJournalRows((prev) => prev.filter((r) => r.lineId !== lineId));
    setHasUnsavedChanges(true);
    broadcastDeleteRow(lineId);
    if (onNotice) onNotice("Baris transaksi berhasil dihapus.");
  };

  // 📋 Duplicate Row Handler
  const handleDuplicateRow = (row: FlatJournalRow) => {
    const duplicated: FlatJournalRow = {
      ...row,
      lineId: Date.now() + Math.floor(Math.random() * 1000),
      status: "Draft"
    };
    setJournalRows((prev) => [duplicated, ...prev]);
    setHasUnsavedChanges(true);
    if (onNotice) onNotice("Baris transaksi berhasil diduplikasi.");
  };

  // 🔄 Reset back to original Excel data
  const handleResetToExcel = () => {
    setConfirmReset(true);
  };

  const runResetToExcel = async () => {
    try {
      localStorage.removeItem("feast_accounting_journal_rows");
    } catch (e) {
      // ignore
    }
    let bundle = excelBundle;
    if (!bundle) {
      const m = await import("../lib/excelDataBundle");
      bundle = { flat: m.excelFlatJournalRows as FlatJournalRow[], entries: m.excelJournalEntries as unknown[], neraca: m.excelNeracaLajur as any[], tables: m.excelSheetTables };
      setExcelBundle(bundle);
    }
    setJournalRows(bundle.flat);
    setHasUnsavedChanges(false);
    setConfirmReset(false);
    if (onNotice) onNotice("Data jurnal telah direset sesuai file referensi Excel asli.");
  };

  // 💾 Save / Persist Changes Toast
  const handleSaveChanges = () => {
    try {
      localStorage.setItem("feast_accounting_journal_rows", JSON.stringify(journalRows));
    } catch (e) {
      console.warn("LocalStorage full, retaining in memory state");
    }
    setHasUnsavedChanges(false);
    if (onNotice) {
      onNotice(`Tersimpan! Seluruh ${journalRows.length.toLocaleString("id-ID")} baris jurnal umum tersimpan permanen. Live balance: O4 - N4 = ${balanceDiff.toLocaleString("id-ID")}`);
    }
  };

  // 📥 Export Active Sheet to Real Excel File (.xlsx)
  const handleExportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    if (activeTab === "jurnal") {
      const exportData = journalRows.map((r) => ({
        "No. Jurnal": r.journalNumber,
        "Tanggal": r.journalDate,
        "Bulan": r.monthIndex,
        "No. Bukti": r.sourceReference,
        "Project": r.projectCode,
        "Uraian / Keterangan": r.description,
        "Kode Akun": r.accountCode,
        "Nama Akun": r.accountName,
        "Kode Bantu": r.subAccountCode,
        "Debet (IDR)": r.debit,
        "Kredit (IDR)": r.credit,
        "Status": r.status
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, "Jurnal");
      XLSX.writeFile(wb, "Jurnal_Umum_PT_AAP_2026.xlsx");
    } else if (activeTab === "neraca-lajur") {
      const ws = XLSX.utils.json_to_sheet(tbData);
      XLSX.utils.book_append_sheet(wb, ws, "Neraca Lajur");
      XLSX.writeFile(wb, "Neraca_Lajur_PT_AAP_2026.xlsx");
    } else if (currentSheetTable) {
      const ws = XLSX.utils.aoa_to_sheet(currentSheetTable);
      XLSX.utils.book_append_sheet(wb, ws, activeTab);
      XLSX.writeFile(wb, `${activeTab.toUpperCase()}_PT_AAP_2026.xlsx`);
    }

    if (onNotice) onNotice(`Sheet ${activeTab.toUpperCase()} berhasil diexport ke file Excel!`);
  };

  const scrollTabs = (direction: "left" | "right") => {
    if (tabScrollRef.current) {
      tabScrollRef.current.scrollBy({
        left: direction === "left" ? -240 : 240,
        behavior: "smooth"
      });
    }
  };

  // Active sheet table from Excel Bundle
  const currentSheetTable = useMemo(() => {
    if (activeTab === "jurnal") return null;

    const mapTabToSheet: Record<string, string> = {
      "buku-besar": "Buku Besar",
      "neraca-lajur": "Neraca Lajur",
      "akun": "Akun",
      "kode": "Kode",
      "pl-coy": "PL CoY",
      "pl-bgg": "PL BGG",
      "pl-sbs": "PL SBS",
      "pl-pos": "PL POS",
      "pl-ibp": "PL IBP",
      "pl-dbk": "PL DBK",
      "pl-ho": "PL HO",
      "bs-coy": "BS CoY",
      "bs-dbk": "BS DBK",
      "bs-pos": "BS POS",
      "bs-sbs": "BS SBS",
      "bs-bgg": "BS BGG",
      "bs-ho": "BS HO",
      "neraca-ringkas": "Neraca",
      "piutang-usaha": "Piutang Usaha",
      "piutang-backcharge": "Piutang Backcharge",
      "stock-solar-bgg": "Stock Solar BGG",
      "stock-solar-pos": "Stock Solar POS",
      "fixed-assets": "FA",
      "sparepart": "Sparepart",
      "asuransi": "Asuransi",
      "sewa-dibayar-dimuka": "Sewa dibayar dimuka",
      "biaya-dibayar-dimuka": "Biaya dibayar dimuka",
      "uang-muka-pembelian": "Uang Muka Pembelian",
      "uang-muka-lain": "Uang Muka lain-lain",
      "uang-muka-bunga": "Uang Muka Bunga Pinjaman",
      "uang-muka-solar": "Uang Muka Pembelian Solar",
      "hutang-modal-kerja": "Hutang Modal Kerja",
      "hutang-jangka-panjang": "Hutang Jangka Panjang",
      "hutang-pph": "Hutang PPH 23",
      "hutang-pph21": "Hutang PPH 21",
      "hutang-pph4": "Hutang PPH 4(3)",
      "ap-bt-abn": "AP BT ABN",
      "ap-abn": "AP ABN",
      "rekon-leasing": "Rekon Leasing",
      "leasing-clipan": "CLIPAN",
      "leasing-hexa": "HEXA",
      "leasing-mtf": "Leasing MTF",
      "leasing-mandiri": "Mandiri Grup",
      "leasing-cfi": "CFI",
      "leasing-smfl": "Leasing SMFL",
      "leasing-adira": "ADIRA",
      "leasing-orix": "Orix Finance",
      "leasing-buana": "Buana Finance",
      "leasing-radana": "Radana",
      "leasing-csul2": "Leasing CSUL 2",
      "leasing-mitsui": "Mitsui",
      "leasing-bri": "BRI",
      "leasing-bpr": "BPR",
      "leasing-intidana": "INTIDANA",
      "leasing-mestika": "MESTIKA",
      "bb-pembantu": "BB Pembantu"
    };

    const targetName = mapTabToSheet[activeTab] || activeTab;
    const sheetTables = excelBundle?.tables ?? {};
    if (sheetTables[targetName]) return sheetTables[targetName];

    // Generic lookup in all 81 sheets
    const matchedKey = Object.keys(sheetTables).find(k => 
      k.toLowerCase().replace(/[^a-z0-9]/g, "") === activeTab.toLowerCase().replace(/[^a-z0-9]/g, "") ||
      k.toLowerCase() === activeTab.toLowerCase()
    );
    return matchedKey ? sheetTables[matchedKey] : null;
  }, [activeTab, excelBundle]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-white text-slate-900 relative overflow-hidden font-sans border-t border-slate-200">
      {/* 🟢 TOP EXCEL RIBBON & BRANDING HEADER */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#107c41] text-white shrink-0 select-none shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded bg-white/20 text-white">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-tight">PT ANDALAN ARTHA PRIMANUSA</span>
            <span className="text-white/60 text-xs">—</span>
            <span className="text-xs font-mono font-medium text-emerald-100 bg-white/15 px-2 py-0.5 rounded">
              FS PT AAP JUNI 2026 IN HOUSE BY PERIOD R3.xlsx
            </span>
          </div>
        </div>

        {/* Global Toolbar Controls */}
        <div className="flex items-center gap-2.5">
          {/* Real-time Collaboration Presence Bar */}
          <div className="flex items-center gap-2 px-2.5 py-0.5 bg-white/15 rounded-full border border-white/25 text-xs shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <span className="text-[11px] font-semibold text-white">
              {activeUsers.length > 0 ? `${activeUsers.length + 1} User Online` : "Live Sync Aktif"}
            </span>

            {/* Active User Avatars */}
            <div className="flex items-center -space-x-1.5 ml-1">
              <div 
                className="w-5 h-5 rounded-full bg-emerald-700 border border-white text-[9px] font-bold flex items-center justify-center text-white" 
                title={`Anda (${user?.name || "Me"})`}
              >
                {user?.name ? user.name.slice(0, 2).toUpperCase() : "ME"}
              </div>

              {activeUsers.map((u) => (
                <div 
                  key={u.userId} 
                  className="w-5 h-5 rounded-full border border-white text-[9px] font-bold flex items-center justify-center text-white shadow-sm transition-transform hover:scale-110"
                  style={{ backgroundColor: u.color || "#3b82f6" }}
                  title={`${u.userName} (${u.userRole})`}
                >
                  {u.userName ? u.userName.slice(0, 2).toUpperCase() : "US"}
                </div>
              ))}
            </div>
          </div>

          {/* Quick Balance Status */}
          <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold border ${
            isGlobalBalanced 
              ? "bg-white/20 text-emerald-100 border-white/30" 
              : "bg-rose-600 text-white border-rose-400"
          }`}>
            {isGlobalBalanced ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            <span>O4 - N4 = {balanceDiff === 0 ? "0 (BALANCED)" : balanceDiff.toLocaleString("id-ID")}</span>
          </div>

          {/* Action Buttons */}
          <button
            onClick={handleExportToExcel}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-white text-[#107c41] hover:bg-emerald-50 transition shadow-sm"
            title="Download sheet ini ke file .xlsx asli"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={loadAllData}
            disabled={isLoading}
            className="p-1 text-white/80 hover:text-white rounded hover:bg-white/10 transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 🟢 EXCEL FORMULA & TOOLBAR ROW */}
      <div className="flex items-center px-3 py-1 bg-[#f3f4f6] border-b border-[#d1d5db] text-xs shrink-0 select-none gap-2 font-mono">
        <div className="flex items-center gap-1 px-2 py-0.5 bg-white border border-[#d1d5db] rounded text-[11px] font-bold text-slate-700 min-w-[70px] justify-center">
          {activeTab.toUpperCase().replace("-", " ")}
        </div>
        <span className="text-slate-400 font-serif italic text-xs font-bold">fx</span>
        <div className="flex-1 bg-white border border-[#d1d5db] rounded px-2.5 py-0.5 text-xs text-slate-700 truncate font-mono">
          {activeTab === "jurnal" ? "=SUM(O6:O52140) - SUM(N6:N52140) == 0 (Klik / Ketik langsung di sel untuk mengedit | Otomatis VLOOKUP Nama Akun | Live Multi-User Sync)" :
           activeTab === "neraca-lajur" ? "=VLOOKUP(KodeAkun, NeracaSaldo, Kolom, FALSE)" :
           activeTab.startsWith("pl-") ? "=SUM(Pendapatan) - SUM(COGS) - SUM(BiayaOperasional)" :
           activeTab.startsWith("bs-") ? "=TotalAset - (TotalKewajiban + TotalEkuitas) == 0" :
           `=DATA_TABLE('${activeTab.toUpperCase()}', RANGE_ALL)`}
        </div>

        {/* Unsaved Changes Indicator */}
        {hasUnsavedChanges && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
              Ada perubahan belum disimpan
            </span>
            <button
              onClick={handleSaveChanges}
              className="flex items-center gap-1 px-2 py-0.5 bg-emerald-600 text-white rounded text-[11px] font-bold hover:bg-emerald-700 transition"
            >
              <Save className="w-3 h-3" />
              Simpan
            </button>
            <button
              onClick={handleResetToExcel}
              className="flex items-center gap-1 px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[11px] font-bold hover:bg-slate-300 transition"
              title="Reset ke data Excel asli"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>
        )}
      </div>

      {/* MAIN WORKSPACE CONTENT CONTAINER */}
      <div className="flex-1 overflow-hidden relative bg-white">
        
        {/* ========================================================================= */}
        {/* TAB 1: JURNAL UMUM (NATIVE INTERACTIVE EXCEL WORKSHEET TABLE)             */}
        {/* ========================================================================= */}
        {activeTab === "jurnal" && (
          <div className="flex flex-col h-full bg-white">
            {/* Action & Filter Toolbar */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#f8fafc] border-b border-[#e2e8f0] text-xs gap-3">
              <div className="flex items-center gap-2.5 flex-1">
                {/* Add Row Button */}
                <button
                  onClick={handleAddNewRow}
                  className="flex items-center gap-1.5 px-3 py-1 bg-[#107c41] text-white rounded text-xs font-semibold hover:bg-emerald-700 transition shadow-sm"
                  title="Tambah baris transaksi jurnal baru (Hanya tanggal terisi, kolom lain kosong)"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Baris (Insert Row)</span>
                </button>

                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari akun, bukti, uraian transaksi..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1 bg-white border border-[#cbd5e1] rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 font-mono"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-slate-600 font-mono">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Cost Center:</span>
                  <select
                    value={filterProject}
                    onChange={(e) => setFilterProject(e.target.value)}
                    className="bg-white border border-[#cbd5e1] rounded px-2 py-0.5 text-slate-800 text-xs font-mono font-medium"
                  >
                    <option value="ALL">Semua Site (Konsolidasi)</option>
                    {projectList.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="text-slate-500">Baris: <strong className="text-slate-800">{displayedRows.length.toLocaleString("id-ID")}</strong></span>
                <span className="text-emerald-700">Σ Debet: <strong>{totalDebit.toLocaleString("id-ID")}</strong></span>
                <span className="text-blue-700">Σ Kredit: <strong>{totalCredit.toLocaleString("id-ID")}</strong></span>
              </div>
            </div>

            {viewTitle === "Journal Posting" ? (
              <div className="flex-1 min-h-0 bg-white">
                <Suspense fallback={<div className="grid h-full place-items-center text-sm font-bold text-slate-500">Memuat spreadsheet posting...</div>}>
                  <FortuneWorkbook
                    data={fortuneSheetData}
                    allowEdit={false}
                    showToolbar={false}
                    showFormulaBar={false}
                    showSheetTabs={false}
                    rowHeaderWidth={46}
                    columnHeaderHeight={28}
                    defaultRowHeight={26}
                    defaultColWidth={130}
                  />
                </Suspense>
              </div>
            ) : (
            <div className="flex-1 w-full overflow-auto bg-white">
              <table className="w-full text-xs text-left border-collapse font-mono select-text">
                <thead className="bg-[#f3f4f6] text-slate-700 uppercase text-[10px] sticky top-0 z-10 border-b border-[#cbd5e1] shadow-sm">
                  <tr>
                    <th className="p-1.5 border-r border-[#cbd5e1] w-10 text-center">No</th>
                    <th className="p-1.5 border-r border-[#cbd5e1] w-32">No. Jurnal (JV)</th>
                    <th className="p-1.5 border-r border-[#cbd5e1] w-28">Tanggal</th>
                    <th className="p-1.5 border-r border-[#cbd5e1] w-14 text-center">Bulan</th>
                    <th className="p-1.5 border-r border-[#cbd5e1] w-36">No. Bukti / Ref</th>
                    <th className="p-1.5 border-r border-[#cbd5e1] w-24">Project</th>
                    <th className="p-1.5 border-r border-[#cbd5e1] min-w-[260px]">Uraian / Keterangan Transaksi</th>
                    <th className="p-1.5 border-r border-[#cbd5e1] w-28">Kode Akun</th>
                    <th className="p-1.5 border-r border-[#cbd5e1] min-w-[200px]">Nama Akun</th>
                    <th className="p-1.5 border-r border-[#cbd5e1] w-28">Kode Bantu</th>
                    <th className="p-1.5 border-r border-[#cbd5e1] w-36 text-right">Debet (IDR)</th>
                    <th className="p-1.5 border-r border-[#cbd5e1] w-36 text-right">Kredit (IDR)</th>
                    <th className="p-1.5 border-r border-[#cbd5e1] w-28 text-center">Status</th>
                    <th className="p-1.5 w-16 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0] text-[11px]">
                  {displayedRows.map((r, idx) => {
                    const isNewRow = !r.accountCode && r.debit === 0 && r.credit === 0;
                    const remoteOnRow = Object.values(remoteCursors).filter(c => c.lineId === r.lineId);

                    return (
                      <tr 
                        key={r.lineId || idx} 
                        className={`hover:bg-emerald-50/40 transition group ${
                          remoteOnRow.length > 0 ? "ring-2 ring-indigo-400 bg-indigo-50/30" :
                          isNewRow ? "bg-amber-50/40" : idx % 2 === 0 ? "bg-white" : "bg-[#fcfcfd]"
                        }`}
                      >
                        {/* No */}
                        <td className="p-1 border-r border-[#e2e8f0] text-center text-slate-400 font-sans relative">
                          {idx + 1}
                          {remoteOnRow.length > 0 && (
                            <span 
                              className="absolute -top-2 left-1 z-20 px-1 py-0.2 rounded text-[8px] font-bold text-white shadow-sm flex items-center gap-0.5 whitespace-nowrap"
                              style={{ backgroundColor: remoteOnRow[0].color }}
                            >
                              <span className="w-1 h-1 rounded-full bg-white animate-ping"></span>
                              {remoteOnRow[0].userName}
                            </span>
                          )}
                        </td>

                        {/* No Jurnal */}
                        <td className="p-0 border-r border-[#e2e8f0]">
                          <input
                            type="text"
                            value={r.journalNumber || ""}
                            onChange={(e) => updateRowField(r.lineId, "journalNumber", e.target.value)}
                            placeholder="JV/2026/..."
                            className="w-full px-1.5 py-1 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 rounded text-slate-900 font-medium"
                          />
                        </td>

                        {/* Tanggal */}
                        <td className="p-0 border-r border-[#e2e8f0]">
                          <input
                            type="text"
                            value={r.journalDate || ""}
                            onChange={(e) => updateRowField(r.lineId, "journalDate", e.target.value)}
                            placeholder="YYYY-MM-DD"
                            className="w-full px-1.5 py-1 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 rounded text-slate-800"
                          />
                        </td>

                        {/* Bulan */}
                        <td className="p-0 border-r border-[#e2e8f0] text-center">
                          <input
                            type="number"
                            value={r.monthIndex || ""}
                            onChange={(e) => updateRowField(r.lineId, "monthIndex", Number(e.target.value) || 1)}
                            className="w-full px-1 py-1 text-center bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 rounded text-slate-700 font-medium"
                          />
                        </td>

                        {/* No Bukti */}
                        <td className="p-0 border-r border-[#e2e8f0]">
                          <input
                            type="text"
                            value={r.sourceReference || ""}
                            onChange={(e) => updateRowField(r.lineId, "sourceReference", e.target.value)}
                            placeholder="Ref..."
                            className="w-full px-1.5 py-1 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 rounded text-slate-700"
                          />
                        </td>

                        {/* Project */}
                        <td className="p-0 border-r border-[#e2e8f0]">
                          <input
                            type="text"
                            value={r.projectCode || ""}
                            onChange={(e) => updateRowField(r.lineId, "projectCode", e.target.value.toUpperCase())}
                            placeholder="HO/Site"
                            className="w-full px-1.5 py-1 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 rounded text-slate-800 font-bold"
                          />
                        </td>

                        {/* Keterangan */}
                        <td className="p-0 border-r border-[#e2e8f0]">
                          <input
                            type="text"
                            value={r.description || ""}
                            onChange={(e) => updateRowField(r.lineId, "description", e.target.value)}
                            placeholder="Uraian transaksi..."
                            className="w-full px-1.5 py-1 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 rounded text-slate-900"
                          />
                        </td>

                        {/* Kode Akun (Live VLOOKUP) */}
                        <td className="p-0 border-r border-[#e2e8f0]">
                          <input
                            type="text"
                            list="coa-account-list"
                            value={r.accountCode || ""}
                            onChange={(e) => updateRowField(r.lineId, "accountCode", e.target.value)}
                            placeholder="1101.001"
                            className="w-full px-1.5 py-1 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 rounded text-emerald-800 font-bold"
                          />
                        </td>

                        {/* Nama Akun */}
                        <td className="p-0 border-r border-[#e2e8f0]">
                          <input
                            type="text"
                            value={r.accountName || ""}
                            onChange={(e) => updateRowField(r.lineId, "accountName", e.target.value)}
                            placeholder="Nama Akun..."
                            className="w-full px-1.5 py-1 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 rounded text-slate-800"
                          />
                        </td>

                        {/* Kode Bantu */}
                        <td className="p-0 border-r border-[#e2e8f0]">
                          <input
                            type="text"
                            value={r.subAccountCode || ""}
                            onChange={(e) => updateRowField(r.lineId, "subAccountCode", e.target.value)}
                            placeholder="Sub..."
                            className="w-full px-1.5 py-1 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 rounded text-slate-700"
                          />
                        </td>

                        {/* Debet */}
                        <td className="p-0 border-r border-[#e2e8f0] text-right">
                          <input
                            type="number"
                            value={r.debit || ""}
                            onChange={(e) => updateRowField(r.lineId, "debit", parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className="w-full px-1.5 py-1 text-right bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 rounded text-emerald-800 font-bold"
                          />
                        </td>

                        {/* Kredit */}
                        <td className="p-0 border-r border-[#e2e8f0] text-right">
                          <input
                            type="number"
                            value={r.credit || ""}
                            onChange={(e) => updateRowField(r.lineId, "credit", parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className="w-full px-1.5 py-1 text-right bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 rounded text-blue-800 font-bold"
                          />
                        </td>

                        {/* Status */}
                        <td className="p-1 border-r border-[#e2e8f0] text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            r.status === "Posted to GL" ? "bg-emerald-100 text-emerald-800" :
                            r.status === "Approved" ? "bg-blue-100 text-blue-800" :
                            "bg-amber-100 text-amber-800"
                          }`}>
                            {r.status || "Draft"}
                          </span>
                        </td>

                        {/* Aksi */}
                        <td className="p-1 text-center">
                          <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition">
                            <button
                              onClick={() => handleDuplicateRow(r)}
                              className="p-1 text-slate-500 hover:text-emerald-700 rounded hover:bg-emerald-50 transition"
                              title="Duplikasi baris ini"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRow(r.lineId)}
                              className="p-1 text-slate-500 hover:text-rose-600 rounded hover:bg-rose-50 transition"
                              title="Hapus baris ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: BUKU BESAR (GENERAL LEDGER RUNNING BALANCE)                       */}
        {/* ========================================================================= */}
        {activeTab === "buku-besar" && (
          <div className="flex flex-col h-full p-3 overflow-auto space-y-3 bg-[#f8fafc] font-mono">
            {/* Account Selector Card */}
            {(() => {
              const activeGL = (glData?.rows && glData.rows.length > 0) ? glData : liveGLData;
              return (
                <>
                  <div className="flex items-center justify-between bg-white p-3 rounded border border-[#e2e8f0] shadow-sm">
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-5 h-5 text-[#107c41]" />
                      <div>
                        <label className="text-[11px] text-slate-500 font-semibold uppercase block">Pilih Akun Buku Besar:</label>
                        <select
                          value={selectedGLAccount}
                          onChange={(e) => setSelectedGLAccount(e.target.value)}
                          className="bg-white border border-[#cbd5e1] rounded px-3 py-1 text-xs text-slate-900 font-bold mt-0.5 focus:outline-none focus:border-emerald-600"
                        >
                          {coaList.map((a: any) => (
                            <option key={a.code} value={a.code}>
                              {a.code} — {a.name} ({a.posSaldo || "Db"})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {activeGL && (
                      <div className="flex items-center gap-6 text-xs font-mono">
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase">Saldo Awal:</span>
                          <strong className="text-slate-900 text-xs">{formatIDR(activeGL.openingBalance)}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase">Total Debet:</span>
                          <strong className="text-emerald-700 text-xs">{formatIDR(activeGL.totalDebit)}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase">Total Kredit:</span>
                          <strong className="text-blue-700 text-xs">{formatIDR(activeGL.totalCredit)}</strong>
                        </div>
                        <div className="px-3 py-1 rounded bg-emerald-50 border border-emerald-200">
                          <span className="text-emerald-800 block text-[10px] uppercase font-bold">Saldo Berjalan:</span>
                          <strong className="text-emerald-900 text-xs">{formatIDR(activeGL.endingBalance)}</strong>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mutasi Table */}
                  <div className="bg-white rounded border border-[#e2e8f0] overflow-hidden shadow-sm">
                    <table className="w-full text-xs text-left border-collapse font-mono">
                      <thead className="bg-[#f3f4f6] text-slate-700 uppercase text-[11px] border-b border-[#cbd5e1]">
                        <tr>
                          <th className="p-2 border-r border-[#e2e8f0]">No</th>
                          <th className="p-2 border-r border-[#e2e8f0]">Tanggal</th>
                          <th className="p-2 border-r border-[#e2e8f0]">Bukti</th>
                          <th className="p-2 border-r border-[#e2e8f0]">Project</th>
                          <th className="p-2 border-r border-[#e2e8f0]">Keterangan Transaksi</th>
                          <th className="p-2 border-r border-[#e2e8f0] text-right">Debet (Rp)</th>
                          <th className="p-2 border-r border-[#e2e8f0] text-right">Kredit (Rp)</th>
                          <th className="p-2 text-right bg-emerald-50/50">Saldo (Rp)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e2e8f0] text-[11px]">
                        {activeGL?.rows?.length > 0 ? (
                          activeGL.rows.map((r: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-2 border-r border-[#e2e8f0] text-slate-400">{idx + 1}</td>
                              <td className="p-2 border-r border-[#e2e8f0] text-slate-700">{r.date}</td>
                              <td className="p-2 border-r border-[#e2e8f0] text-slate-600 font-medium">{r.buktiNo}</td>
                              <td className="p-2 border-r border-[#e2e8f0]"><span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">{r.projectCode}</span></td>
                              <td className="p-2 border-r border-[#e2e8f0] text-slate-900">{r.description}</td>
                              <td className="p-2 border-r border-[#e2e8f0] text-right text-emerald-700 font-medium">{r.debit > 0 ? r.debit.toLocaleString("id-ID") : "-"}</td>
                              <td className="p-2 border-r border-[#e2e8f0] text-right text-blue-700 font-medium">{r.credit > 0 ? r.credit.toLocaleString("id-ID") : "-"}</td>
                              <td className="p-2 text-right font-bold text-slate-900 bg-emerald-50/30">{r.balance.toLocaleString("id-ID")}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-500 font-sans">
                              Tidak ada mutasi transaksi untuk akun <strong>{selectedGLAccount}</strong>. Saldo awal akun ini: <strong>{formatIDR(activeGL.openingBalance)}</strong>.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: NERACA LAJUR (EXACT 10-COLUMN EXCEL WORKSHEET)                     */}
        {/* ========================================================================= */}
        {activeTab === "neraca-lajur" && (
          <div className="flex flex-col h-full p-3 overflow-auto space-y-2 font-mono bg-[#f8fafc]">
            <div className="flex items-center justify-between bg-white p-2.5 rounded border border-[#e2e8f0] text-xs shadow-sm">
              <div className="flex items-center gap-2">
                <TableProperties className="w-4 h-4 text-[#107c41]" />
                <span className="font-bold text-slate-900">NERACA LAJUR 10-KOLOM (JUNI 2026)</span>
              </div>
              <span className="text-slate-500 font-sans">Total Akun: {tbData.length} baris</span>
            </div>

            <div className="bg-white rounded border border-[#cbd5e1] overflow-x-auto shadow-sm">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#f3f4f6] text-slate-700 uppercase text-[10px] border-b border-[#cbd5e1]">
                  <tr>
                    <th rowSpan={2} className="p-2 border-r border-[#cbd5e1]">Kode</th>
                    <th rowSpan={2} className="p-2 border-r border-[#cbd5e1]">Nama Akun</th>
                    <th rowSpan={2} className="p-2 border-r border-[#cbd5e1] text-center">Pos</th>
                    <th colSpan={2} className="p-1.5 border-r border-[#cbd5e1] text-center bg-emerald-100 text-emerald-900 font-bold">Neraca Saldo</th>
                    <th rowSpan={2} className="p-2 border-r border-[#cbd5e1] text-center">Pos Lap</th>
                    <th colSpan={2} className="p-1.5 border-r border-[#cbd5e1] text-center bg-amber-100 text-amber-900 font-bold">Laba Rugi</th>
                    <th colSpan={2} className="p-1.5 text-center bg-blue-100 text-blue-900 font-bold">Neraca Akhir</th>
                  </tr>
                  <tr className="border-t border-[#cbd5e1] text-[9px]">
                    <th className="p-1.5 text-right border-r border-[#cbd5e1] bg-emerald-50">Debet</th>
                    <th className="p-1.5 text-right border-r border-[#cbd5e1] bg-emerald-50">Kredit</th>
                    <th className="p-1.5 text-right border-r border-[#cbd5e1] bg-amber-50">Debet</th>
                    <th className="p-1.5 text-right border-r border-[#cbd5e1] bg-amber-50">Kredit</th>
                    <th className="p-1.5 text-right border-r border-[#cbd5e1] bg-blue-50">Debet</th>
                    <th className="p-1.5 text-right bg-blue-50">Kredit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0] text-[11px]">
                  {tbData.map((r: any, idx: number) => {
                    const isHeader = !r.posLaporan || r.posLaporan === "-" || r.posLaporan === "Laporan";
                    return (
                      <tr key={idx} className={isHeader ? "bg-[#f8fafc] font-bold text-slate-800" : "hover:bg-slate-50"}>
                        <td className="p-1.5 border-r border-[#e2e8f0] font-semibold text-slate-900">{r.accountCode}</td>
                        <td className="p-1.5 border-r border-[#e2e8f0] text-slate-800 truncate max-w-xs">{r.accountName}</td>
                        <td className="p-1.5 border-r border-[#e2e8f0] text-center text-slate-600">{r.posSaldo || "-"}</td>
                        <td className="p-1.5 border-r border-[#e2e8f0] text-right text-emerald-800">{r.neracaSaldoDebit > 0 ? r.neracaSaldoDebit.toLocaleString("id-ID") : "-"}</td>
                        <td className="p-1.5 border-r border-[#e2e8f0] text-right text-emerald-800">{r.neracaSaldoKredit > 0 ? r.neracaSaldoKredit.toLocaleString("id-ID") : "-"}</td>
                        <td className="p-1.5 border-r border-[#e2e8f0] text-center font-bold text-slate-700">{r.posLaporan || "-"}</td>
                        <td className="p-1.5 border-r border-[#e2e8f0] text-right text-amber-800">{r.labaRugiDebit > 0 ? r.labaRugiDebit.toLocaleString("id-ID") : "-"}</td>
                        <td className="p-1.5 border-r border-[#e2e8f0] text-right text-amber-800">{r.labaRugiKredit > 0 ? r.labaRugiKredit.toLocaleString("id-ID") : "-"}</td>
                        <td className="p-1.5 border-r border-[#e2e8f0] text-right text-blue-800 font-medium">{r.neracaDebit > 0 ? r.neracaDebit.toLocaleString("id-ID") : "-"}</td>
                        <td className="p-1.5 text-right text-blue-800 font-medium">{r.neracaKredit > 0 ? r.neracaKredit.toLocaleString("id-ID") : "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: MASTER AKUN (COA 188 AKUN STANDAR)                                 */}
        {/* ========================================================================= */}
        {activeTab === "akun" && (
          <div className="flex flex-col h-full p-3 overflow-auto space-y-2 font-mono bg-[#f8fafc]">
            <div className="flex items-center justify-between bg-white p-2.5 rounded border border-[#e2e8f0] text-xs shadow-sm">
              <div className="flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-[#107c41]" />
                <span className="font-bold text-slate-900">MASTER CHART OF ACCOUNTS (188 AKUN PT AAP)</span>
              </div>
              <span className="text-slate-500 font-sans">Total: {coaList.length} Akun</span>
            </div>

            <div className="bg-white rounded border border-[#cbd5e1] overflow-hidden shadow-sm">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#f3f4f6] text-slate-700 uppercase text-[10px] border-b border-[#cbd5e1]">
                  <tr>
                    <th className="p-2 border-r border-[#e2e8f0]">Kode Akun</th>
                    <th className="p-2 border-r border-[#e2e8f0]">Nama Akun</th>
                    <th className="p-2 border-r border-[#e2e8f0] text-center">Pos Saldo</th>
                    <th className="p-2 border-r border-[#e2e8f0] text-center">Pos Laporan</th>
                    <th className="p-2 border-r border-[#e2e8f0] text-right">Saldo Awal Debet (Rp)</th>
                    <th className="p-2 text-right">Saldo Awal Kredit (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0] text-[11px]">
                  {coaList.map((a: any, idx: number) => (
                    <tr key={idx} className={a.level === 0 || a.level === 1 ? "bg-[#f8fafc] font-bold text-slate-900" : "hover:bg-slate-50"}>
                      <td className="p-2 border-r border-[#e2e8f0] font-bold text-emerald-800">{a.code}</td>
                      <td className="p-2 border-r border-[#e2e8f0] text-slate-900 font-medium">{a.name}</td>
                      <td className="p-2 border-r border-[#e2e8f0] text-center text-slate-700">{a.posSaldo}</td>
                      <td className="p-2 border-r border-[#e2e8f0] text-center font-bold text-slate-800">{a.posLaporan}</td>
                      <td className="p-2 border-r border-[#e2e8f0] text-right text-slate-700">{a.openingBalanceDb ? a.openingBalanceDb.toLocaleString("id-ID") : "-"}</td>
                      <td className="p-2 text-right text-slate-700">{a.openingBalanceKr ? a.openingBalanceKr.toLocaleString("id-ID") : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ALL OTHER TABS: DIRECT EXCEL SHEET TABLES (PL, BS, PIUTANG, LEASING, ETC) */}
        {/* ========================================================================= */}
        {currentSheetTable && (() => {
          const PAGE_SIZE = 100;
          const filteredRows = auxSheetSearch.trim()
            ? currentSheetTable.filter((row, idx) => idx < 5 || row.some(cell => String(cell || "").toLowerCase().includes(auxSheetSearch.toLowerCase())))
            : currentSheetTable;

          const totalPages = Math.max(1, Math.ceil((filteredRows.length - 5) / PAGE_SIZE));
          const currentPage = Math.min(auxSheetPage, totalPages);
          const headerRows = filteredRows.slice(0, 5);
          const dataRows = filteredRows.slice(5 + (currentPage - 1) * PAGE_SIZE, 5 + currentPage * PAGE_SIZE);
          const visibleRows = [...headerRows, ...dataRows];

          return (
            <div className="flex flex-col h-full p-3 overflow-hidden space-y-2 font-mono bg-[#f8fafc]">
              <div className="flex items-center justify-between bg-white p-2.5 rounded border border-[#e2e8f0] text-xs shadow-sm">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-4 h-4 text-[#107c41]" />
                  <span className="font-bold text-slate-900 uppercase">SHEET: {activeTab.toUpperCase().replace("-", " ")}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-sans font-medium">
                    {currentSheetTable.length.toLocaleString("id-ID")} Baris Data
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Search inside Sheet */}
                  <div className="relative">
                    <Search className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
                    <input
                      type="text"
                      value={auxSheetSearch}
                      onChange={(e) => { setAuxSheetSearch(e.target.value); setAuxSheetPage(1); }}
                      placeholder="Cari di sheet ini..."
                      className="pl-7 pr-2 py-1 bg-white border border-[#cbd5e1] rounded text-[11px] font-mono focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5 text-[11px] font-sans">
                      <button
                        onClick={() => setAuxSheetPage(p => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-200"
                      >
                        « Prev
                      </button>
                      <span className="text-slate-600 font-mono">
                        Hal <strong>{currentPage}</strong> / {totalPages}
                      </span>
                      <button
                        onClick={() => setAuxSheetPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-200"
                      >
                        Next »
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Direct Tabular Representation of Excel Sheet */}
              <div className="flex-1 bg-white rounded border border-[#cbd5e1] overflow-auto shadow-sm">
                <table className="w-full text-xs text-left border-collapse font-mono">
                  <tbody className="divide-y divide-[#e2e8f0] text-[11px]">
                    {visibleRows.map((row: any[], rIdx: number) => {
                      const isHeaderRow = rIdx < 5;
                      return (
                        <tr key={rIdx} className={isHeaderRow ? "bg-[#f3f4f6] font-bold text-slate-800 sticky top-0 z-10" : "hover:bg-slate-50"}>
                          {row.map((cell: any, cIdx: number) => {
                            const isNumber = typeof cell === "number" || (!isNaN(Number(cell)) && cell !== "");
                            return (
                              <td 
                                key={cIdx} 
                                className={`p-1.5 border-r border-[#e2e8f0] whitespace-nowrap ${
                                  isNumber && typeof cell === "number" ? "text-right text-slate-900" : "text-slate-800"
                                }`}
                              >
                                {typeof cell === "number" ? cell.toLocaleString("id-ID") : String(cell || "")}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* 📚 Master COA Datalist for Instant In-Cell Autocomplete */}
        <datalist id="coa-account-list">
          {coaList.map((a: any) => (
            <option key={a.code} value={a.code}>
              {a.code} - {a.name} ({a.posSaldo || "Db"})
            </option>
          ))}
        </datalist>

      </div>

      {/* ========================================================================= */}
      {/* 🟢 STICKY BOTTOM EXCEL-STYLE SHEET TAB BAR                                */}
      {/* ========================================================================= */}
      <div className="shrink-0 h-9 bg-[#e5e7eb] border-t border-[#cbd5e1] flex items-center px-1 select-none z-20 shadow-inner">
        {/* Left Scroll Button */}
        <button
          onClick={() => scrollTabs("left")}
          className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition mr-0.5"
          title="Scroll sheet ke kiri"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Scrollable Sheet Tabs */}
        <div
          ref={tabScrollRef}
          className="flex-1 flex items-center gap-0.5 overflow-x-auto no-scrollbar scroll-smooth h-full pt-1"
        >
          {allSheetTabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 h-full text-xs font-mono whitespace-nowrap rounded-t border-t-2 transition ${
                  isActive
                    ? "bg-white text-slate-900 font-bold border-[#107c41] shadow-sm border-x border-[#cbd5e1]"
                    : "bg-[#e5e7eb] text-slate-600 hover:bg-[#d1d5db] hover:text-slate-900 border-transparent"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${
                  tab.group === "report" ? "bg-emerald-600" :
                  tab.group === "master" ? "bg-blue-600" :
                  tab.group === "aux" ? "bg-slate-500" : "bg-amber-500"
                }`} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right Scroll Button */}
        <button
          onClick={() => scrollTabs("right")}
          className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition ml-0.5"
          title="Scroll sheet ke kanan"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      {confirmReset && (
        <ConfirmDialog
          title="Reset Data Jurnal"
          message="Seluruh data tabel akan dikembalikan ke data awal file Excel referensi. Perubahan yang belum disimpan akan hilang."
          confirmLabel="Reset Data"
          danger
          onCancel={() => setConfirmReset(false)}
          onConfirm={runResetToExcel}
        />
      )}
    </div>
  );
}
