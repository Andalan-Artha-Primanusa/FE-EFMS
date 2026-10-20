export interface TreasuryVendor {
  id: number;
  name: string;
  email?: string;
  bankName?: string;
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
  npwp?: string;
  defaultTop: number;
  site?: string;
  accurateVendorNo?: string | null;
  // Bank change waiting for a second user to verify (maker-checker). Export is blocked meanwhile.
  pendingBankName?: string;
  pendingAccountNumber?: string;
  pendingAccountName?: string;
  bankChangeRequestedBy?: number;
  bankVerifiedBy?: number;
  bankVerifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TreasuryInvoice {
  id: number;
  vendorId: number;
  vendor?: TreasuryVendor;
  site: string;
  invoiceNo: string;
  poNo: string;
  grNo?: string;
  taxInvoiceNo?: string;
  invoiceDate: string;
  receivedDate?: string;
  topDays: number;
  dueDate: string;
  priorityTag: "BLOCK_SUPPLY" | "SOLAR" | "LEASING" | "REGULAR";
  itemDescription?: string;
  department?: string;
  coaCode?: string;
  coaName?: string;
  category?: string;
  subtotalAmount: string;
  vatAmount: string;
  pphAmount: string;
  dpAmount: string;
  totalAmount: string;
  paidAmount: string;
  pendingAmount: string;
  remainingBalance: string;
  status: "unpaid" | "partially_paid" | "pending_paid" | "paid";
  planMonth?: string;
  planWeek?: number;
  voucherNo?: string;
  voucherDate?: string;
  lastPaymentDate?: string;
  accurateId?: number | null;
  accurateSyncedAt?: string | null;
  accurateDeleted?: boolean;
  vendorBillNo?: string;
  isDownPayment?: boolean;
  possibleDuplicate?: boolean;
  // PO already paid via Tunai PO but this invoice consumed no DP; create-plan refuses it.
  dpNotDeducted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TreasuryCompanyBank {
  id: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  currency: string;
  accurateBankNo?: string;
}

export interface PaymentPlanItem {
  id: number;
  paymentPlanId: number;
  invoiceId?: number;
  invoice?: TreasuryInvoice;
  tunaiPoRequestId?: number;
  tunaiPoRequest?: TunaiPORequest;
  vendorId: number;
  vendor?: TreasuryVendor;
  amountPaid: string;
  isFullPayment: boolean;
  remarks?: string;
  accuratePaymentNo?: string | null;
  createdAt: string;
}

export interface PaymentPlan {
  id: number;
  voucherSeq: number;
  voucherNo: string;
  voucherDate: string;
  planMonth?: string;
  planWeek?: number;
  companyBankId: number;
  companyBank?: TreasuryCompanyBank;
  category: "AP" | "TUNAI_PO" | "TUNAI_NON_PO" | "LEASING" | "SOLAR" | "PETTY_CASH";
  totalAmount: string;
  status: "draft" | "printed_for_signature" | "approved" | "rejected" | "exported" | "reconciled" | "posted" | "void";
  justification?: string;
  makerName?: string;
  plannerName?: string;
  approverName?: string;
  approvalDate?: string;
  exportedAt?: string;
  reconciledAt?: string;
  makerUserId?: number;
  approverUserId?: number;
  exportedBy?: number;
  postedAt?: string | null;
  kopraFileSha256?: string;
  kopraExportedCount?: number;
  needsReview?: boolean;
  reviewNote?: string;
  paymentProofName?: string;
  paidAt?: string | null;
  items?: PaymentPlanItem[];
  createdAt: string;
  updatedAt: string;
}

export interface BankStatementTransaction {
  id: number;
  companyBankId: number;
  companyBank?: TreasuryCompanyBank;
  transactionDate: string;
  valueDate?: string;
  description: string;
  referenceNo?: string;
  txType: "DB" | "CR";
  amount: string;
  balance: string;
  matchedPlanId?: number;
  matchedPlan?: PaymentPlan;
  isReconciled: boolean;
  createdAt: string;
}

// Subset of the /api/tunai-po request DTO used by the voucher flow.
export interface TunaiPORequest {
  id: number;
  poNo: string;
  vendorId: number;
  vendor?: TreasuryVendor;
  site: string;
  proformaNo: string;
  description: string;
  totalAmount: string;
  payAmount: string;
  status: string;
}

export interface AgingSummary {
  totalOutstanding: string;
  totalOverdue: string;
  totalInvoices: number;
  category1NotDue: string;
  category2_1to30: string;
  category3_31to60: string;
  category4_61to90: string;
  category5_91to120: string;
  category6_Gt120: string;
  criticalCount: number;
  solarCount: number;
  leasingCount: number;
}

export interface TreasuryPurchaseOrder {
  id: number;
  accurateId: number;
  poNo: string;
  vendorId: number;
  site: string;
  totalAmount: string;
  status: string;
  syncedAt: string;
}

export interface SyncResult {
  inserted: number;
  updated: number;
  unchanged: number;
  paid: number;
  deleted: number;
  flaggedPlans: number;
  purchaseOrders: number;
  startedAt: string;
  endedAt: string;
}

export interface AccurateSyncState {
  running: boolean;
  startedAt?: string | null;
  last?: SyncResult | null;
  lastError?: string;
}
