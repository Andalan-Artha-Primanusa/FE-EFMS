import React from "react";
import { buildInvoiceHTML } from "../exporters";

interface InvoiceDetailSheetProps {
  data: any;
  baRows: any[];
  buildInvoiceItemsFromBA: (ba: any, custCode: string, cat?: string) => any[];
  customerContractMap: Record<string, any>;
  getItemEffectiveVolume: (item: any, currentList?: any[]) => number;
  getItemEffectiveOverhaulMtr: (item: any) => number;
  calculateItemRateAndAmount: (item: any, custCode: string, currentList?: any[]) => { unitRate: number; amount: number };
  getCustomerCalculations: (items: any[], custCode: string) => any;
  rfIndexCalculated: number;
}

// Preview memakai HTML yang sama dengan cetak, jadi format/warna/garis selalu identik.
export const InvoiceDetailSheet: React.FC<InvoiceDetailSheetProps> = ({ data, ...ctx }) => (
  <iframe
    title="Preview Invoice"
    srcDoc={buildInvoiceHTML(ctx, data, true)}
    className="w-full bg-white border-0"
    onLoad={(e) => {
      const f = e.currentTarget;
      f.style.height = `${f.contentDocument?.documentElement.scrollHeight || 0}px`;
    }}
  />
);
