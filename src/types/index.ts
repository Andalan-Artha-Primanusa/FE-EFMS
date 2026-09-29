// ============================================================
// FEAST â€” Centralized TypeScript Types
// Source of truth: BE-FEMS internal/app/models.go + HTTP handlers
// ============================================================

// â”€â”€â”€ Auth & Users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  companyId?: number | null;
  companyCode?: string;
  companyName?: string;
  isHeadOffice?: boolean;
  companyScope?: string[] | "ALL";
  twoFactorEnabled?: boolean;
  lastLoginAt?: string | null;
}

export interface LoginResult {
  token: string;
  user: User;
}

export interface UserInput {
  name: string;
  email: string;
  password?: string;
  role: string;
  status: string;
  companyId?: number | null;
  companyCode?: string;
  companyName?: string;
  companyScope?: string[] | "ALL";
  isHeadOffice?: boolean;
}

// â”€â”€â”€ RBAC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface Permission {
  module: string;
  action: string;
  description: string;
}

export interface RoleAccess {
  role: string;
  permissions: Permission[];
  tcodes: TCode[];
  scopes: string[];
}

export interface RoleInput {
  name: string;
  description?: string;
  permissions: string[];
  tcodes?: string[];
}

// â”€â”€â”€ Company â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface Company {
  id: number;
  code: string;
  name: string;
  isHo: boolean;
  createdAt: string;
}

// â”€â”€â”€ Master Data (generic) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface MasterRecord {
  id: number;
  type: string;
  code: string;
  name: string;
  status: string;
  metadata: string;
  createdAt: string;
}

export interface MasterRecordInput {
  type: string;
  code: string;
  name: string;
  status: string;
  metadata: string;
}

// â”€â”€â”€ Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface KPI {
  label: string;
  value: number;
  delta: number;
  tone: string;
}

export interface ChartPoint {
  label: string;
  revenue?: number;
  expense?: number;
  inflow?: number;
  outflow?: number;
  value?: number;
}

export interface Dashboard {
  kpis: KPI[];
  monthlyFinance: ChartPoint[];
  cashFlow: ChartPoint[];
  agingReceivable: ChartPoint[];
  agingPayable: ChartPoint[];
  pendingApprovals: Transaction[];
  cashPosition: ChartPoint[];
}

// â”€â”€â”€ Transactions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface Transaction {
  id: number;
  number: string;
  type: string;
  requester: string;
  company: string;
  companyId: number;
  companyCode: string;
  description: string;
  amount: number;
  status: string;
  budgetStatus: string;
  createdAt: string;
}

export interface TransactionInput {
  type: string;
  companyId: number;
  description: string;
  amount: number;
}

export interface ApprovalAction {
  action: "approve" | "reject" | "revision" | "hold";
  note: string;
}

// â”€â”€â”€ Audit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface AuditLog {
  id: number;
  user: string;
  module: string;
  action: string;
  referenceType: string;
  referenceId: string;
  ipAddress: string;
  device: string;
  createdAt: string;
}

// â”€â”€â”€ Finance â€” Bank Accounts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface BankAccount {
  id: number;
  bankCode: string;
  bankName: string;
  accountNo: string;
  accountHolder: string;
  branch: string;
  coaAccountId: number;
  currency: string;
  status: string;
  createdAt: string;
}

// â”€â”€â”€ Finance â€” Customer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface Customer {
  id: number;
  code: string;
  fullName: string;
  groupParent: string;
  projectSite: string;
  terminDays: number;
  contactAR: string;
  emailAR: string;
  phone: string;
  contractNo: string;
  contractValue: number;
  avgPaymentDays: number;
  notes: string;
  createdAt: string;
}

// â”€â”€â”€ Finance â€” BA Tracker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface BAItem {
  id: string;
  category: string;
  area: string;
  material: string;
  unit: string;
  distanceWeightAvg: number;
  initialVolume: number;
  adjustedVolume: number;
  rate: number;
  subtotalInitial: number;
  subtotalAdjusted: number;
}

export interface BGGRouteRow {
  routeNo: number;
  distanceMeters: number;
  invoiceDistance: number;
  volume: number;
  volXDistance: number;
  loadingPoint: string;
  dumpingPoint: string;
}

export interface BGGDailySeamEntry {
  date: string;
  ritation: number;
  seam7Ton: number;
  seam8Ton: number;
  seam9Ton: number;
  seam10Ton: number;
  totalTon: number;
  notes: string;
}

export interface BGGPendingOBEntry {
  period: string;
  invoiceVolumeCG: number;
  pendingOBVolume: number;
  cummPendingOB: number;
  status: string;
}

export interface BGGSignOff {
  surveyorBGG: string;
  surveyorAAP: string;
  kabagEngBGG: string;
  kabagProdBGG: string;
  kabagAAP: string;
  kttBGG: string;
  pjoAAP: string;
}

export interface BGGJointSurveyData {
  locationPit: string;
  originalTopoDate: string;
  surveyTopoDate: string;
  volumeBGG: number;
  volumeAAP: number;
  volumeDifference: number;
  diffPercentage: number;
  tolerancePass: boolean;
  agreedSurveyVolume: number;
  coalVolumeBCM: number;
  coalVolumeTon: number;
  nettOBVolume: number;
  strippingRatio: number;
  obRoutes: BGGRouteRow[];
  obActualAvgDist: number;
  obInvoiceAvgDist: number;
  obOverDistanceHm: number;
  coalRoutes: BGGRouteRow[];
  coalAvgDist: number;
  coalOverDistanceM: number;
  dailySeamData: BGGDailySeamEntry[];
  pendingOBData: BGGPendingOBEntry[];
  inventoryCoalAwal: number;
  inventorySeam: string;
  bggFuelP1?: number;
  bggTransportP1?: number;
  bggFuelP2?: number;
  bggTransportP2?: number;
  bggAvgFn?: number;
  bggRfIndex?: number;
  signOff: BGGSignOff;
}

export interface BATracker {
  id: number;
  baNumber: string;
  draftBARefNo?: string;
  signedBANumber?: string;
  customerCode: string;
  customerId?: number;
  workPeriod: string;
  workAmount: number;
  initialWorkAmount: number;
  adjustedWorkAmount: number;
  step1Locked: boolean;
  items?: BAItem[];
  bggData?: BGGJointSurveyData;
  workEndDate?: string | null;
  baSubmittedDate?: string | null;
  baSentDate?: string | null;
  internalRoutingDate?: string | null;
  baSignedDate?: string | null;
  leadTimeDays: number;
  statusBA: string;
  picAAP: string;
  invoiceNoLinked: string;
  invoiceId?: number;
  invoiceIssuedDate?: string | null;
  lagBAToInvoiceDays: number;
  notesBottleneck: string;
  notes: string;
  draftBAPath: string;
  finalBAPath: string;
  verifiedBy?: string;
  verifiedAt?: string | null;
  approvedBy?: string;
  approvedAt?: string | null;
  createdAt: string;
}

// â”€â”€â”€ Finance â€” Invoice â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface Invoice {
  id: number;
  invoiceNo: string;
  invoiceCategory?: string;
  customerCode: string;
  customerId?: number;
  projectSite: string;
  contractNo: string;
  contractor: string;
  activityGroup: string;
  baNoReference: string;
  baId?: number;
  baDate?: string | null;
  workPeriod: string;
  jobType: string;
  volumeUnit: string;
  volume: number;
  rate: number;
  revenueGross: number;
  solarDeduction: number;
  subTotalDPP: number;
  ppn11: number;
  ppnRate?: number;
  pph23: number;
  pphRate?: number;
  totalInvoice: number;
  otherDeduction: number;
  totalReceipt: number;
  invoiceDate: string;
  terminDays: number;
  dueDate: string;
  totalPaid: number;
  outstanding: number;
  status: string;
  agingDays: number;
  agingBucket: string;
  bankAccountId?: number;
  bankName: string;
  bankAccountName: string;
  bankAccountNo: string;
  bankBranch: string;
  notes: string;
  verifiedBy?: string;
  verifiedAt?: string | null;
  approvedManagerBy?: string;
  approvedManagerAt?: string | null;
  approvedDirectorBy?: string;
  approvedDirectorAt?: string | null;
  createdAt: string;
}

// â”€â”€â”€ Finance â€” Payment â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface Payment {
  id: number;
  invoiceNo: string;
  invoiceId?: number;
  customerCode: string;
  customerId?: number;
  amountPaid: number;
  paymentDate: string;
  bankAccountId?: number;
  receivingBank: string;
  refNo: string;
  paymentPeriod: string;
  notes: string;
  daysLateOrEarly: number;
  createdBy: string;
  verificationStatus: string;
  verifiedBy: string;
  verifiedAt?: string | null;
  proofDocumentPath: string;
  createdAt: string;
}

// â”€â”€â”€ Finance â€” Templates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface FinanceTemplate {
  id: number;
  templateKey: string;
  customerCode?: string;
  section?: string;
  label?: string;
  sortOrder: number;
  payload: any;
}

// â”€â”€â”€ Finance â€” Pending Volume â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface PendingVolume {
  id: number;
  customerCode: string;
  workPeriod: string;
  volumeType: string;
  initialVolume: number;
  adjustedVolume: number;
  rate: number;
  status: string;
  notes: string;
  createdAt: string;
}

// â”€â”€â”€ Finance â€” Form Data Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type BAFormData = {
  baNoReference: string;
  customerCode: string;
  projectSite: string;
  workPeriod: string;
  invoiceNo: string;
  activityGroup: string;
  noPO: string;
  poNumber: string;
  contractNo: string;
  statusBA: string;
  invoiceNoLinked: string;
  workEndDate: string;
  baSubmittedDate: string;
  baSentDate: string;
  internalRoutingDate: string;
  baSignedDate: string;
  notesBottleneck: string;
  notes: string;
  draftBAPath: string;
  finalBAPath: string;
  signedBANumber: string;
  draftBARefNo: string;
};

export type InvoiceFormData = {
  invoiceNo: string;
  invoiceCategory: string;
  customerCode: string;
  customerId: number;
  projectSite: string;
  contractNo: string;
  contractor: string;
  activityGroup: string;
  baNoReference: string;
  baId: number;
  workPeriod: string;
  jobType: string;
  volumeUnit: string;
  volume: number;
  rate: number;
  revenueGross: number;
  solarDeduction: number;
  subTotalDPP: number;
  ppn11: number;
  ppnRate: number;
  pph23: number;
  pphRate: number;
  totalInvoice: number;
  otherDeduction: number;
  totalReceipt: number;
  invoiceDate: string;
  terminDays: number;
  dueDate: string;
  bankAccountId: number;
  bankName: string;
  bankAccountName: string;
  bankAccountNo: string;
  bankBranch: string;
  notes: string;
};

export type PaymentFormData = {
  invoiceNo: string;
  invoiceId: number;
  customerCode: string;
  customerId: number;
  amountPaid: number;
  paymentDate: string;
  bankAccountId: number;
  receivingBank: string;
  refNo: string;
  paymentPeriod: string;
  notes: string;
};

export type CustomerFormData = {
  code: string;
  fullName: string;
  groupParent: string;
  projectSite: string;
  terminDays: number;
  contactAR: string;
  emailAR: string;
  phone: string;
  contractNo: string;
  contractValue: number;
  avgPaymentDays: number;
  notes: string;
};

// â”€â”€â”€ Finance â€” Coal Index â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface CoalIndex {
  id: number;
  period: string;
  hbaPrice: number;
  hrgPrice: number;
 mpiPrice: number;
  nargsPrice: number;
  lockStatus: string;
  createdAt: string;
}

// â”€â”€â”€ Finance â€” Variable SOW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface VariableSOW {
  id: number;
  category: string;
  itemName: string;
  rateUSD: number;
  rateIDR: number;
  tier1Rate?: number;
  tier2Rate?: number;
  tier3Rate?: number;
  splitPercentage?: number;
  baseDistanceMeters?: number;
  unit: string;
  customer: string;
  customerCode: string;
  createdAt: string;
}

// â”€â”€â”€ Finance â€” Raise & Fall â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface RaiseFall {
  id: number;
  period: string;
  customerCode: string;
  projectSite: string;
  contractNo: string;
  category: string;
  rateChangePercent: number;
  status: string;
  createdAt: string;
}

export interface DailyExchangeRate {
  id: number;
  date: string;
  currencyPair: string;
  rate: number;
  source: string;
  createdAt: string;
}

// â”€â”€â”€ Accounting â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface JournalLine {
  id?: number;
  journalId?: number;
  projectCode?: string;
  accountCode: string;
  accountName: string;
  subAccountCode?: string;
  description: string;
  debit: number;
  credit: number;
  lineOrder?: number;
}

export interface JournalEntry {
  id: number;
  journalNumber: string;
  journalDate: string;
  sourceModule?: string;
  sourceReference?: string;
  customerCode?: string;
  description: string;
  totalDebit: number;
  totalCredit: number;
  isBalanced?: boolean;
  status: string; // "Draft" | "Verified" | "Approved" | "Posted to GL" | "Reversed"
  createdBy?: string;
  verifiedBy?: string;
  approvedBy?: string;
  postedBy?: string;
  createdAt?: string;
  lines: JournalLine[];
}

export interface COAAccount {
  code: string;
  name: string;
  parentCode?: string;
  posSaldo: string; // "Db" | "Kr" | "-"
  posLaporan: string; // "NRC" | "LR" | "-"
  level?: number;
  openingBalanceDb?: number;
  openingBalanceKr?: number;
  isActive: boolean;
}

export interface SubLedgerCode {
  code: string;
  name: string;
  parentAccountCode: string;
  category: string;
  openingBalance: number;
  isActive: boolean;
}
export type SubLedger = SubLedgerCode;

export interface GeneralLedgerRow {
  date: string;
  buktiNo: string;
  projectCode: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  journalId?: number;
}

export interface GeneralLedgerView {
  accountCode: string;
  accountName: string;
  posSaldo: string;
  openingBalance: number;
  endingBalance: number;
  totalDebit: number;
  totalCredit: number;
  rows: GeneralLedgerRow[];
}

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  posSaldo: string;
  posLaporan: string;
  neracaSaldoDebit: number;
  neracaSaldoKredit: number;
  labaRugiDebit: number;
  labaRugiKredit: number;
  neracaDebit: number;
  neracaKredit: number;
}

export interface ProfitLossProductionMetric {
  metricName: string;
  unit: string;
  actual: number;
  budget: number;
}

export interface ProfitLossItem {
  accountCode: string;
  accountName: string;
  actual: number;
  budget: number;
  percentage: number;
}

export interface ProfitLossData {
  period?: string;
  projectCode?: string;
  productionMetrics?: ProfitLossProductionMetric[];
  revenueItems?: ProfitLossItem[];
  totalRevenue?: number;
  cogsItems?: ProfitLossItem[];
  totalCOGS?: number;
  grossProfit?: number;
  opexItems?: ProfitLossItem[];
  totalOPEX?: number;
  netIncome?: number;
  // Legacy / fallback fields
  revenue?: Array<{ accountCode: string; accountName: string; amount: number }>;
  expenses?: Array<{ accountCode: string; accountName: string; amount: number }>;
  netProfit?: number;
}

export interface BalanceSheetItem {
  accountCode: string;
  accountName: string;
  amount: number;
}

export interface BalanceSheetData {
  period?: string;
  projectCode?: string;
  currentAssets?: BalanceSheetItem[];
  totalCurrentAsset?: number;
  fixedAssets?: BalanceSheetItem[];
  totalFixedAsset?: number;
  totalAsset?: number;
  currentLiabilities?: BalanceSheetItem[];
  totalCurrentLiab?: number;
  longTermLiabilities?: BalanceSheetItem[];
  totalLongTermLiab?: number;
  totalLiabilities?: number;
  equityItems?: BalanceSheetItem[];
  netIncomeYTD?: number;
  totalEquity?: number;
  totalLiabAndEquity?: number;
  isBalanced?: boolean;
  // Legacy / fallback fields
  assets?: Array<{ accountCode: string; accountName: string; amount: number }>;
  liabilities?: Array<{ accountCode: string; accountName: string; amount: number }>;
  equity?: Array<{ accountCode: string; accountName: string; amount: number }>;
}

// â”€â”€â”€ Accounting â€” Runs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface AccountingRun {
  id: number;
  runNumber: string;
  sourceModule: string;
  sourceReference: string;
  journalNumber: string;
  status: string;
  createdAt: string;
}

// â”€â”€â”€ Reconciliation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface ReconciliationJob {
  id: number;
  type: string;
  period: string;
  matchedCount: number;
  unmatchedCount: number;
  status: string;
  createdAt: string;
}

// â”€â”€â”€ Closing Period â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface ClosingPeriod {
  id: number;
  period: string;
  step: string;
  progress: number;
  status: string;
  lockedAt?: string | null;
  createdAt: string;
}

// â”€â”€â”€ Reports â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface ReportCatalogItem {
  code: string;
  name: string;
  category: string;
  exports: string[];
  filters: string[];
  description: string;
}

export interface ManagementIndicator {
  code: string;
  label: string;
  value: number;
  unit: string;
  status: string;
}

// â”€â”€â”€ System â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface TCode {
  id: number;
  code: string;
  description: string;
  route: string;
  module: string;
  action: string;
}

export interface SystemSetting {
  id: number;
  group: string;
  key: string;
  value: string;
  description: string;
}

export interface ImportResult {
  type: string;
  inserted: number;
  skipped: number;
  errors: string[];
}

export interface DocumentUploadResult {
  fileName: string;
  storedName: string;
  url: string;
  sizeBytes: number;
}

// â”€â”€â”€ Flat Journal Row (for GeneralJournalPage) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface FlatJournalRow {
  lineId: number;
  journalId: number;
  journalNumber: string;
  journalDate: string;
  monthIndex: number;
  sourceModule: string;
  sourceReference: string;
  projectCode: string;
  description: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  status: string;
  [key: string]: any;
}

export interface TunaiPOTracking {
  id: number;
  voucherNo: string;
  site: string;
  vendor: string;
  invoiceQty: number;
  totalAmount: number;
  justification: string;
  hasOriginalInvoice: boolean;
  originalInvoiceUrl?: string;
  hasTaxInvoice: boolean;
  taxInvoiceUrl?: string;
  hasPo: boolean;
  poUrl?: string;
  hasGr: boolean;
  grUrl?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}
