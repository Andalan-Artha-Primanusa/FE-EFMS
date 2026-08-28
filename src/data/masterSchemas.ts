import type { MasterRecord } from "../lib/api";

export type MasterField = {
  key: string;
  label: string;
  type?: "text" | "select";
  options?: string[];
  required?: boolean;
};

export type MasterSchema = {
  title: string;
  fields: MasterField[];
  tableColumns: string[];
};

const commonFields: MasterField[] = [
  { key: "code", label: "Code", required: true },
  { key: "name", label: "Name", required: true },
  { key: "status", label: "Status", type: "select", options: ["active", "inactive"], required: true }
];

export const masterSchemas: Record<string, MasterSchema> = {
  chart_of_accounts: {
    title: "Chart of Accounts",
    fields: [
      ...commonFields,
      { key: "accountType", label: "Account Type", type: "select", options: ["asset", "liability", "equity", "revenue", "expense"], required: true },
      { key: "normalBalance", label: "Normal Balance", type: "select", options: ["debit", "credit"], required: true },
      { key: "reportMapping", label: "Report Mapping" },
      { key: "parentCode", label: "Parent Account" },
      { key: "currency", label: "Currency" }
    ],
    tableColumns: ["code", "name", "accountType", "normalBalance", "reportMapping", "currency", "status"]
  },
  vendor: {
    title: "Vendor",
    fields: [
      ...commonFields,
      { key: "email", label: "Email (Notifikasi Kopra Kolom L)" },
      { key: "bankName", label: "Nama Bank (ex: MANDIRI, BCA)" },
      { key: "bankCode", label: "Bank Code / BIC (ex: BMRIIDJA)" },
      { key: "accountNumber", label: "Nomor Rekening" },
      { key: "accountName", label: "Nama Pemilik Rekening" },
      { key: "defaultTop", label: "Default TOP (Hari)" },
      { key: "bpGroup", label: "BP Group" },
      { key: "taxId", label: "NPWP / Tax ID" },
      { key: "paymentTerm", label: "Payment Term" },
      { key: "currency", label: "Currency" },
      { key: "reconciliationAccount", label: "Recon Account" },
      { key: "contactPerson", label: "Contact Person" },
      { key: "phone", label: "Phone" },
      { key: "address", label: "Address" }
    ],
    tableColumns: ["code", "name", "bankName", "accountNumber", "accountName", "email", "defaultTop", "taxId", "status"]
  },
  customer: {
    title: "Customer",
    fields: [
      ...commonFields,
      { key: "bpGroup", label: "BP Group" },
      { key: "taxId", label: "NPWP / Tax ID" },
      { key: "paymentTerm", label: "Payment Term" },
      { key: "currency", label: "Currency" },
      { key: "reconciliationAccount", label: "Recon Account" },
      { key: "creditLimit", label: "Credit Limit" },
      { key: "salesArea", label: "Sales Area" },
      { key: "address", label: "Address" }
    ],
    tableColumns: ["code", "name", "bpGroup", "taxId", "paymentTerm", "currency", "creditLimit", "status"]
  },
  employee: {
    title: "Employee",
    fields: [
      ...commonFields,
      { key: "employeeNo", label: "Employee No" },
      { key: "department", label: "Department" },
      { key: "position", label: "Position" },
      { key: "costCenter", label: "Cost Center" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" }
    ],
    tableColumns: ["code", "name", "employeeNo", "department", "position", "costCenter", "status"]
  },
  cost_center_department: {
    title: "Cost Center / Department",
    fields: [
      ...commonFields,
      { key: "companyCode", label: "Company Code" },
      { key: "department", label: "Department" },
      { key: "manager", label: "Manager" },
      { key: "profitCenter", label: "Profit Center" },
      { key: "validFrom", label: "Valid From" },
      { key: "validTo", label: "Valid To" }
    ],
    tableColumns: ["code", "name", "companyCode", "department", "manager", "profitCenter", "status"]
  },
  project_site: {
    title: "Project / Site",
    fields: [
      ...commonFields,
      { key: "companyCode", label: "Company Code" },
      { key: "siteType", label: "Site Type" },
      { key: "projectManager", label: "Project Manager" },
      { key: "location", label: "Location" },
      { key: "startDate", label: "Start Date" },
      { key: "endDate", label: "End Date" }
    ],
    tableColumns: ["code", "name", "companyCode", "siteType", "projectManager", "location", "status"]
  },
  bank_account: {
    title: "Bank Account",
    fields: [
      ...commonFields,
      { key: "bankName", label: "Bank Name" },
      { key: "accountNumber", label: "Account Number" },
      { key: "accountHolder", label: "Account Holder" },
      { key: "currency", label: "Currency" },
      { key: "glAccount", label: "GL Account" },
      { key: "branch", label: "Branch" }
    ],
    tableColumns: ["code", "name", "bankName", "accountNumber", "currency", "glAccount", "status"]
  },
  tax_term_payment: {
    title: "Tax & Term of Payment",
    fields: [
      ...commonFields,
      { key: "taxType", label: "Tax Type" },
      { key: "taxRate", label: "Tax Rate" },
      { key: "withholdingCode", label: "Withholding Code" },
      { key: "paymentTerm", label: "Payment Term" },
      { key: "dueDays", label: "Due Days" },
      { key: "glAccount", label: "GL Account" }
    ],
    tableColumns: ["code", "name", "taxType", "taxRate", "paymentTerm", "dueDays", "status"]
  },
  other_master_data: {
    title: "Other Master Data",
    fields: [
      ...commonFields,
      { key: "category", label: "Category" },
      { key: "companyCode", label: "Company Code" },
      { key: "currency", label: "Currency" },
      { key: "description", label: "Description" }
    ],
    tableColumns: ["code", "name", "category", "companyCode", "currency", "status"]
  }
};

export function schemaFor(type?: string) {
  return masterSchemas[type || "other_master_data"] ?? masterSchemas.other_master_data;
}

export function metadataOf(record?: Partial<MasterRecord> | null) {
  if (!record?.metadata || record.metadata === "null") return {};
  try {
    return JSON.parse(record.metadata) as Record<string, string>;
  } catch {
    return {};
  }
}

export function expandMasterRecord(record: MasterRecord) {
  return {
    ...record,
    ...metadataOf(record)
  };
}
