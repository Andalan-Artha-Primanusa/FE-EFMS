import {
  Building2,
  ClipboardCheck,
  FileSpreadsheet,
  LayoutDashboard,
  Landmark,
  LineChart,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Coins,
  HandCoins,
  WalletCards
} from "lucide-react";

export const menu = [
  { group: "Dashboard", icon: LayoutDashboard, items: ["AR Dashboard", "Executive Dashboard", "Finance Dashboard"] },
  { group: "Master Data", icon: Building2, items: ["Chart of Accounts", "Company", "Site", "Department", "Cost Center", "Project", "Vendor", "Master Vendor", "Client Setup", "Employee", "Bank", "Tax", "Currency", "Coal Index", "Variable SOW", "RAISE & FALL"] },
  { group: "Budget Management", icon: WalletCards, items: ["Annual Budget", "Monthly Budget", "Budget Submission", "Budget Approval", "Budget Revision", "Budget Transfer", "Budget versus Actual"] },
  { group: "Transaction Request", icon: ClipboardCheck, items: ["Purchase Request", "Expense Request", "Cash Advance", "Reimbursement", "Payment Request"] },
  { group: "Finance", icon: Landmark, items: ["Finance & AR Dashboard", "Berita Acara (BA) Tracker", "Invoice Management", "Payment & Receipt Log", "FEASTKOP"] },
  { group: "Treasury Management", icon: Coins, items: ["Pivot Hutang", "Plan AP", "Tunai Non PO", "Asuransi", "Infrastruktur", "Voucher Payment"] },
  { group: "Tunai PO", icon: HandCoins, items: ["Pengajuan Tunai PO", "Fuel", "Tracking Tunai PO"] },
  { group: "Accounting", icon: FileSpreadsheet, items: ["Journal Entry", "Journal Approval", "Journal Posting", "General Ledger", "Trial Balance", "Closing Period"] },
  { group: "Reconciliation", icon: RefreshCw, items: ["Bank Reconciliation", "Vendor Reconciliation", "Customer Reconciliation", "Tax Reconciliation", "Intercompany Reconciliation"] },
  { group: "Period Closing", icon: LockKeyhole, items: ["Accrual and Adjustment Journal", "Depreciation Posting", "Review Trial Balance", "Financial Review and Approval", "Close Period Lock"] },
  { group: "Financial Reporting", icon: LineChart, items: ["Financial Statement", "AP and AR Aging", "Cash Flow Report", "Budget versus Actual Report", "Tax Report", "Project Profitability Report", "Management Reports"] },
  { group: "Governance", icon: ShieldCheck, items: ["Approval Center", "Notification Center", "Audit Trail", "RBAC Management", "Role and Permission", "System Settings"] }
];

// Hidden for every role, super admin included. The general ledger lives in Accurate Online (used fully by the
// accounting team), so FEAST's ledger screens stay off; Budget and Reconciliation are parked until developed.
export const hiddenMenuItems = new Set(
  menu
    .filter((g) => ["Accounting", "Period Closing", "Budget Management", "Reconciliation"].includes(g.group))
    .flatMap((g) => g.items)
);

// Treasury sub-menus are steps of one page; access follows the "Treasury Management" grant.
// Assign Voucher, Kopra Export, Rekonsiliasi Bank and Rekap AAP are off the sidebar (Kopra is a voucher button).
export const treasuryTabs = {
  "Pivot Hutang": "pivot",
  "Plan AP": "planning",
  "Tunai Non PO": "npo",
  "Asuransi": "asr",
  "Infrastruktur": "inf",
  "Voucher Payment": "voucher",
  "Assign Voucher": "assign",
  "Kopra Export": "kopra",
  "Rekonsiliasi Bank": "reconcile",
  "Rekap AAP": "rekap",
  "Master Vendor": "vendors",
} as const;
export type TreasuryTab = (typeof treasuryTabs)[keyof typeof treasuryTabs];

export type ViewConfig = {
  title: string;
  endpoint: string;
  menuCode?: string;
  menuPermissionModule?: string;
  importType?: "master_records" | "transactions" | "budgets" | "operational_transactions";
  masterType?: string;
};

const groupCodes: Record<string, string> = {
  Dashboard: "DSH",
  "Master Data": "MD",
  "Budget Management": "BUD",
  "Transaction Request": "TRX",
  Finance: "FIN",
  "Tunai PO": "TPO",
  Accounting: "ACC",
  Reconciliation: "REC",
  "Period Closing": "CLS",
  "Financial Reporting": "RPT",
  Governance: "GOV"
};

const menuCodes = Object.fromEntries(
  menu.flatMap((group) =>
    group.items.map((item) => [
      item,
      `FEAST-${groupCodes[group.group] ?? "MOD"}-${slugify(item).toUpperCase().replace(/-/g, "_")}`
    ])
  )
) as Record<string, string>;

export function menuCodeFor(item: string) {
  return menuCodes[item] ?? `FEAST-MOD-${slugify(item).toUpperCase().replace(/-/g, "_")}`;
}

export function menuPermissionModuleFor(item: string): string {
  const grants = menuPermissionMap[item];
  if (grants && grants.length) {
    return grants[0].split(":")[0];
  }
  const lower = slugify(item);
  if (lower.includes("budget")) return "budget";
  if (lower.includes("reconcil")) return "reconciliation";
  if (lower.includes("closing") || lower.includes("accrual") || lower.includes("depreci") || lower.includes("review") || lower.includes("close")) return "period_closing";
  if (lower.includes("journal") || lower.includes("ledger") || lower.includes("trial")) return "accounting";
  if (lower.includes("invoice")) return "invoice";
  if (lower.includes("ba")) return "ba_tracker";
  if (lower.includes("payment") || lower.includes("receipt")) return "payment";
  if (lower.includes("customer")) return "operational_transaction";
  if (lower.includes("report") || lower.includes("aging") || lower.includes("statement") || lower.includes("cash-flow")) return "financial_report";
  if (lower.includes("dashboard")) return "management_dashboard";
  if (lower.includes("approval")) return "approval";
  if (lower.includes("audit") || lower.includes("notification")) return "audit_trail";
  if (lower.includes("rbac") || lower.includes("role") || lower.includes("setting")) return "user_management";
  return "master_data";
}

export const viewMap: Record<string, ViewConfig> = {
  "AR Dashboard": { title: "AR Dashboard", endpoint: "/api/finance/invoices" },
  "Executive Dashboard": { title: "Executive Dashboard", endpoint: "/api/management-dashboard" },
  "Finance Dashboard": { title: "Finance Dashboard", endpoint: "/api/dashboard" },
  "Chart of Accounts": { title: "Chart of Accounts", endpoint: "/api/master-data?type=chart_of_accounts", importType: "master_records", masterType: "chart_of_accounts" },
  "Company": { title: "Company", endpoint: "/api/master-data?type=other_master_data", importType: "master_records", masterType: "other_master_data" },
  "Site": { title: "Site", endpoint: "/api/master-data?type=project_site", importType: "master_records", masterType: "project_site" },
  "Department": { title: "Department", endpoint: "/api/master-data?type=cost_center_department", importType: "master_records", masterType: "cost_center_department" },
  "Cost Center": { title: "Cost Center", endpoint: "/api/master-data?type=cost_center_department", importType: "master_records", masterType: "cost_center_department" },
  "Project": { title: "Project", endpoint: "/api/master-data?type=project_site", importType: "master_records", masterType: "project_site" },
  "Vendor": { title: "Vendor", endpoint: "/api/master-data?type=vendor", importType: "master_records", masterType: "vendor" },
  "Client Setup": { title: "Client Setup", endpoint: "/api/finance/customers", importType: "master_records", masterType: "customer" },
  "Customer Master & Credit Terms": { title: "Client Setup", endpoint: "/api/finance/customers", importType: "master_records", masterType: "customer" },
  "Employee": { title: "Employee", endpoint: "/api/master-data?type=employee", importType: "master_records", masterType: "employee" },
  "Bank": { title: "Bank", endpoint: "/api/master-data/bank-accounts", importType: "master_records", masterType: "bank_account" },
  "Tax": { title: "Tax", endpoint: "/api/master-data?type=tax_term_payment", importType: "master_records", masterType: "tax_term_payment" },
  "Currency": { title: "Currency", endpoint: "/api/master-data/daily-exchange-rates", importType: "master_records", masterType: "other_master_data" },
  "Coal Index": { title: "Coal Index", endpoint: "/api/master-data/coal-index", importType: "master_records", masterType: "coal_index" },
  "Variable SOW": { title: "Variable SOW", endpoint: "/api/master-data/variable-sow", importType: "master_records", masterType: "variable_sow" },
  "RAISE & FALL": { title: "RAISE & FALL", endpoint: "/api/master-data/raise-fall", importType: "master_records", masterType: "raise_fall" },
  "Annual Budget": { title: "Annual Budget", endpoint: "/api/budgets", importType: "budgets" },
  "Monthly Budget": { title: "Monthly Budget", endpoint: "/api/budgets", importType: "budgets" },
  "Budget Submission": { title: "Budget Submission", endpoint: "/api/budgets?status=Draft", importType: "budgets" },
  "Budget Approval": { title: "Budget Approval", endpoint: "/api/budgets?status=Waiting%20Approval" },
  "Budget Revision": { title: "Budget Revision", endpoint: "/api/budgets?status=Revised", importType: "budgets" },
  "Budget Transfer": { title: "Budget Transfer", endpoint: "/api/budgets?status=Published", importType: "budgets" },
  "Budget versus Actual": { title: "Budget versus Actual", endpoint: "/api/budgets/vs-actual" },
  "Purchase Request": { title: "Purchase Request", endpoint: "/api/transactions", importType: "transactions" },
  "Expense Request": { title: "Expense Request", endpoint: "/api/transactions", importType: "transactions" },
  "Cash Advance": { title: "Cash Advance", endpoint: "/api/transactions", importType: "transactions" },
  "Reimbursement": { title: "Reimbursement", endpoint: "/api/transactions", importType: "transactions" },
  "Payment Request": { title: "Payment Request", endpoint: "/api/transactions", importType: "transactions" },
  "Finance & AR Dashboard": { title: "Finance & AR Dashboard", endpoint: "/api/finance/dashboard" },
  "Berita Acara (BA) Tracker": { title: "Berita Acara (BA) Tracker", endpoint: "/api/finance/ba-trackers", importType: "operational_transactions" },
  "Invoice Management": { title: "Invoice Management", endpoint: "/api/finance/invoices", importType: "operational_transactions" },
  "Payment & Receipt Log": { title: "Payment & Receipt Log", endpoint: "/api/finance/payments", importType: "operational_transactions" },
  "Pengajuan Tunai PO": { title: "Pengajuan Tunai PO", endpoint: "/api/tunai-po/requests" },
  "Tracking Tunai PO": { title: "Tracking Tunai PO", endpoint: "/api/tunai-po/requests" },
  "Fuel": { title: "Fuel", endpoint: "/api/tunai-po/requests" },
  "Rekap Voucher": { title: "Rekap Voucher", endpoint: "/api/treasury/vouchers/rekap" },
  "Treasury Management": { title: "Treasury Management", endpoint: "/api/treasury/invoices" },
  ...Object.fromEntries(Object.keys(treasuryTabs).map((t) => [t, { title: t, endpoint: "/api/treasury/invoices" }])),
  "FEASTKOP": { title: "FEASTKOP", endpoint: "/kopra" },
  "Customer & Credit Terms": { title: "Customer & Credit Terms", endpoint: "/api/finance/customers", importType: "master_records" },
  "Purchase to Pay AP": { title: "Purchase to Pay AP", endpoint: "/api/operational-transactions?flow=purchase_to_pay_ap", importType: "operational_transactions" },
  "Order to Cash AR": { title: "Order to Cash AR", endpoint: "/api/operational-transactions?flow=order_to_cash_ar", importType: "operational_transactions" },
  "Cash and Bank Management": { title: "Cash and Bank Management", endpoint: "/api/operational-transactions?flow=cash_bank_management", importType: "operational_transactions" },
  "Asset Management": { title: "Asset Management", endpoint: "/api/operational-transactions?flow=asset_management", importType: "operational_transactions" },
  "Tax Management": { title: "Tax Management", endpoint: "/api/operational-transactions?flow=tax_management", importType: "operational_transactions" },
  "Journal Entry": { title: "Journal Entry", endpoint: "/api/accounting/runs" },
  "Journal Approval": { title: "Journal Approval", endpoint: "/api/accounting/runs" },
  "Journal Posting": { title: "Journal Posting", endpoint: "/api/accounting/runs" },
  "General Ledger": { title: "General Ledger", endpoint: "/api/accounting/runs" },
  "Trial Balance": { title: "Trial Balance", endpoint: "/api/reports/catalog" },
  "Closing Period": { title: "Closing Period", endpoint: "/api/closing-periods" },
  "Bank Reconciliation": { title: "Bank Reconciliation", endpoint: "/api/reconciliations" },
  "Vendor Reconciliation": { title: "Vendor Reconciliation", endpoint: "/api/reconciliations" },
  "Customer Reconciliation": { title: "Customer Reconciliation", endpoint: "/api/reconciliations" },
  "Tax Reconciliation": { title: "Tax Reconciliation", endpoint: "/api/reconciliations" },
  "Intercompany Reconciliation": { title: "Intercompany Reconciliation", endpoint: "/api/reconciliations" },
  "Accrual and Adjustment Journal": { title: "Accrual and Adjustment Journal", endpoint: "/api/closing-periods" },
  "Depreciation Posting": { title: "Depreciation Posting", endpoint: "/api/closing-periods" },
  "Review Trial Balance": { title: "Review Trial Balance", endpoint: "/api/closing-periods" },
  "Financial Review and Approval": { title: "Financial Review and Approval", endpoint: "/api/closing-periods" },
  "Close Period Lock": { title: "Close Period Lock", endpoint: "/api/closing-periods" },
  "Financial Statement": { title: "Financial Statement", endpoint: "/api/reports/financial-summary" },
  "AP and AR Aging": { title: "AP and AR Aging", endpoint: "/api/reports/financial-summary" },
  "Cash Flow Report": { title: "Cash Flow Report", endpoint: "/api/reports/financial-summary" },
  "Budget versus Actual Report": { title: "Budget versus Actual Report", endpoint: "/api/reports/catalog" },
  "Tax Report": { title: "Tax Report", endpoint: "/api/reports/catalog" },
  "Project Profitability Report": { title: "Project Profitability Report", endpoint: "/api/reports/catalog" },
  "Management Reports": { title: "Management Reports", endpoint: "/api/management-dashboard" },
  "Approval Center": { title: "Approval Center", endpoint: "/api/transactions?status=Waiting Approval" },
  "Notification Center": { title: "Notification Center", endpoint: "/api/audit-logs" },
  "Audit Trail": { title: "Audit Trail", endpoint: "/api/audit-logs" },
  "RBAC Management": { title: "RBAC Management", endpoint: "/api/roles" },
  "Role and Permission": { title: "Role and Permission", endpoint: "/api/roles" },
  "System Settings": { title: "System Settings", endpoint: "/api/finance-flow" }
};

export const menuPermissionMap: Record<string, string[]> = {
  "AR Dashboard": ["operational_transaction:read", "financial_report:read"],
  "Executive Dashboard": ["management_dashboard:read"],
  "Finance Dashboard": ["management_dashboard:read", "financial_report:read", "transaction_request:read"],
  "Chart of Accounts": ["master_data:read"],
  "Company": ["master_data:read"],
  "Site": ["master_data:read"],
  "Department": ["master_data:read"],
  "Cost Center": ["master_data:read"],
  "Project": ["master_data:read"],
  "Vendor": ["master_data:read"],
  "Client Setup": ["master_data:read"],
  "Customer Master & Credit Terms": ["master_data:read"],
  "Customer": ["master_data:read"],
  "Employee": ["master_data:read"],
  "Bank": ["master_data:read"],
  "Tax": ["master_data:read"],
  "Currency": ["master_data:read"],
  "Coal Index": ["master_data:read"],
  "Variable SOW": ["master_data:read"],
  "RAISE & FALL": ["raise_fall:read"],
  "Annual Budget": ["budget:read"],
  "Monthly Budget": ["budget:read"],
  "Budget Submission": ["budget:submit"],
  "Budget Approval": ["budget:approve"],
  "Budget Revision": ["budget:submit"],
  "Budget Transfer": ["budget:submit"],
  "Budget versus Actual": ["budget:read", "financial_report:read"],
  "Purchase Request": ["transaction_request:read"],
  "Expense Request": ["transaction_request:read"],
  "Cash Advance": ["transaction_request:read"],
  "Reimbursement": ["transaction_request:read"],
  "Payment Request": ["transaction_request:read"],
  "Finance & AR Dashboard": ["operational_transaction:read", "financial_report:read"],
  "Berita Acara (BA) Tracker": ["ba_tracker:read", "operational_transaction:read"],
  "Invoice Management": ["invoice:read", "operational_transaction:read"],
  "Payment & Receipt Log": ["payment:read", "operational_transaction:read"],
  "Pengajuan Tunai PO": ["tunai_po:read", "tunai_po:submit", "tunai_po:verify"],
  "Tracking Tunai PO": ["tunai_po:read", "tunai_po:submit", "tunai_po:verify"],
  "Fuel": ["tunai_po:read", "tunai_po:submit", "tunai_po:verify", "payment:write"],
  "Rekap Voucher": ["treasury:read"],
  "Purchase to Pay AP": ["operational_transaction:read"],
  "Order to Cash AR": ["operational_transaction:read"],
  "Cash and Bank Management": ["operational_transaction:read"],
  "Asset Management": ["operational_transaction:read"],
  "Tax Management": ["operational_transaction:read"],
  "Journal Entry": ["accounting:read"],
  "Journal Approval": ["accounting:approve"],
  "Journal Posting": ["accounting:post"],
  "General Ledger": ["accounting:read"],
  "Trial Balance": ["financial_report:read", "period_closing:review"],
  "Closing Period": ["period_closing:review", "period_closing:close"],
  "Bank Reconciliation": ["reconciliation:run"],
  "Vendor Reconciliation": ["reconciliation:run"],
  "Customer Reconciliation": ["reconciliation:run"],
  "Tax Reconciliation": ["reconciliation:run"],
  "Intercompany Reconciliation": ["reconciliation:run"],
  "Accrual and Adjustment Journal": ["period_closing:review"],
  "Depreciation Posting": ["period_closing:review"],
  "Review Trial Balance": ["period_closing:review"],
  "Financial Review and Approval": ["period_closing:review"],
  "Close Period Lock": ["period_closing:close"],
  "Financial Statement": ["financial_report:read"],
  "AP and AR Aging": ["financial_report:read"],
  "Cash Flow Report": ["financial_report:read"],
  "Budget versus Actual Report": ["financial_report:read"],
  "Tax Report": ["financial_report:read"],
  "Project Profitability Report": ["financial_report:read"],
  "Management Reports": ["management_dashboard:read"],
  "Treasury Management": ["treasury:read", "payment:read"],
  ...Object.fromEntries(Object.keys(treasuryTabs).map((t) => [t, ["treasury:read", "payment:read"]])),
  "FEASTKOP": ["payment:read"],
  "Customer & Credit Terms": ["master_data:read"],
  "Approval Center": ["approval:act"],
  "Notification Center": ["audit_trail:read"],
  "Audit Trail": ["audit_trail:read"],
  "RBAC Management": ["user_management:manage"],
  "Role and Permission": ["user_management:manage"],
  "System Settings": ["user_management:manage"],
  "Account Settings": []
};

export const ACCOUNT_SETTINGS_VIEW = "Account Settings";

export function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const slugToTitle = new Map<string, string>();
for (const title of [...Object.keys(viewMap), ACCOUNT_SETTINGS_VIEW]) {
  const slug = slugify(title);
  if (!slugToTitle.has(slug)) slugToTitle.set(slug, title);
}

export function titleFromSlug(slug: string | undefined): string | undefined {
  if (!slug) return undefined;
  return slugToTitle.get(slug);
}

export function viewPath(title: string): string {
  if (title === ACCOUNT_SETTINGS_VIEW) return "/account-settings";
  return `/${slugify(title)}`;
}
