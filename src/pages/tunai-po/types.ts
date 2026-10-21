import type { TreasuryPurchaseOrder, TreasuryVendor } from "../treasury/types";

export type TPOStatus = "draft" | "submitted" | "rejected" | "verified" | "in_voucher" | "paid" | "posted";
export type TPODocType = "PO" | "PI_SOFT" | "PI_ASLI" | "FAKTUR_PAJAK" | "BAST" | "GR";
// Fuel uses the Tunai PO flow with its own voucher type.
export type TPOKind = "TUNAI_PO" | "FUEL";

export interface TPODocument {
  id: number;
  requestId: number;
  docType: TPODocType;
  checked: boolean;
  checkedBy?: number;
  checkedAt?: string | null;
  note?: string;
  filePath?: string;
  fileName?: string;
}

// Amounts arrive as decimal strings (shopspring/decimal), like the treasury types.
export interface TPORequest {
  id: number;
  purchaseOrderId: number;
  kind: TPOKind;
  poNo: string;
  vendorId: number;
  vendor?: TreasuryVendor;
  site: string;
  proformaNo: string;
  description: string;
  isPkp: boolean;
  accSubtotal: string;
  accVat: string;
  subtotalAmount: string;
  vatAmount: string;
  totalAmount: string;
  pphType?: string;
  pphAmount: string;
  payAmount: string;
  dpType?: string;
  status: TPOStatus;
  rejectCategory?: string;
  rejectReason?: string;
  rejectCount: number;
  submittedBy?: number;
  submittedAt?: string | null;
  verifiedBy?: number;
  verifiedAt?: string | null;
  paymentPlanId?: number | null;
  paidAt?: string | null;
  accurateDpNo?: string | null;
  documents?: TPODocument[];
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  purchaseOrder?: TreasuryPurchaseOrder;
  voucherNo?: string;
  docsDueAt?: string | null;
  docsOverdue?: boolean;
  docsComplete?: boolean;
  missingDocs?: TPODocType[];
}

export type TPOPurchaseOrder = TreasuryPurchaseOrder & {
  transDate?: string | null;
  subtotalAmount: string;
  vatAmount: string;
  description?: string;
  currencyCode?: string;
  closed?: boolean;
  vendor?: TreasuryVendor;
};

export interface TPOLookup {
  purchaseOrder: TPOPurchaseOrder;
  vendor?: TreasuryVendor;
  requestedTotal: string;
  remaining: string;
  suggestedPkp: boolean;
  requests: TPORequest[];
}

export interface AccountMapping {
  id: number;
  kind: string;
  code: string;
  name: string;
  accurateAccountNo: string;
}

export interface AuditLogRow {
  id: number;
  user: string;
  action: string;
  createdAt: string;
  before?: any;
  after?: any;
}

export interface POSyncStatus {
  running: boolean;
  startedAt?: string | null;
  last?: { inserted: number; updated: number; closed: number; startedAt: string; endedAt: string } | null;
  lastError?: string;
}
