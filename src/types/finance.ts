// Finance TypeScript types — shared across all finance sub-pages
// Using 'any' for data fields since backend shapes are fluid; only structural types are strict

import type { User } from "../lib/api";

export interface FinancePageProps {
  viewTitle: string;
  query: string;
  onNotice: (msg: string) => void;
  user?: User;
}

export interface BARow {
  id: number;
  baNumber?: string;
  draftBARefNo?: string;
  customerCode: string;
  workPeriod: string;
  workAmount?: number;
  initialWorkAmount?: number;
  adjustedWorkAmount?: number;
  statusBA: string;
  invoiceNoLinked?: string;
  baTrackerId?: number;
  picAAP?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  items?: InvoiceLineItem[];
  [key: string]: any;
}

export interface InvoiceRow {
  id: number;
  invoiceNo: string;
  customerCode: string;
  workPeriod?: string;
  invoiceDate?: string;
  totalInvoice?: number;
  totalReceipt?: number;
  totalPaid?: number;
  outstanding?: number;
  status?: string;
  baNoReference?: string;
  baTrackerId?: number;
  items?: InvoiceLineItem[];
  [key: string]: any;
}

export interface PaymentRow {
  id: number;
  invoiceNo: string;
  customerCode: string;
  amountPaid: number;
  paymentDate: string;
  receivingBank?: string;
  refNo?: string;
  notes?: string;
  [key: string]: any;
}

export interface CustomerRow {
  id: number;
  code: string;
  fullName: string;
  terminDays?: number;
  contractValue?: number;
  contractNo?: string;
  projectSite?: string;
  billingContact?: string;
  [key: string]: any;
}

export interface InvoiceLineItem {
  id: string;
  section: string;
  code?: string;
  description?: string;
  volume?: number;
  unit?: string;
  baseRateUSD?: number;
  unitRateIDR?: number;
  unitRateUSD?: number;
  kursBI?: number;
  overhaulMtr?: number;
  baseMtr?: number;
  amount?: number;
  isDeduction?: boolean;
  type?: string;
  subSection?: string;
  period?: string;
  [key: string]: any;
}

export interface MasterDataState {
  mRate: number;
  fuelPriceUSD: number;
  laborPriceIDR: number;
  dynamicSowOptions: any[];
  bankAccountOptions: any[];
}

export type ModalType = "none" | "ba" | "invoice" | "payment" | "customer" | "pending_volume";
export type DetailViewType = "ba" | "invoice" | "payment" | "customer";

export interface DetailViewItem {
  type: DetailViewType;
  data: any;
}
