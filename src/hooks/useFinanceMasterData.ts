// Custom hook: centralized fetch for finance master data
// Source: replaces repeated fetch logic from FinancePage.tsx L755–L794
// Used by: BATrackerPage, InvoiceManagementPage, FinanceARDashboardPage

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { calculateRFIndex } from "../utils/finance/sowCatalog";
import type { MasterDataState } from "../types/finance";

export function useFinanceMasterData(): MasterDataState {
  const [mRate, setMRate] = useState(17923.30);
  const [fuelPriceUSD, setFuelPriceUSD] = useState(1.422);
  const [laborPriceIDR, setLaborPriceIDR] = useState(3721423);
  const [dynamicSowOptions, setDynamicSowOptions] = useState<any[]>([]);
  const [bankAccountOptions, setBankAccountOptions] = useState<any[]>([]);

  useEffect(() => {
    api<any[]>("/api/master-data/raise-fall")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const activeRf = data[0];
          if (activeRf.actualMRateXn > 0) setMRate(activeRf.actualMRateXn);
          if (activeRf.actualFuelFn > 0) setFuelPriceUSD(activeRf.actualFuelFn);
          if (activeRf.actualLaborLn > 0) setLaborPriceIDR(activeRf.actualLaborLn);
        }
      })
      .catch(() => {});

    api<any[]>("/api/master-data/variable-sow")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setDynamicSowOptions(
            data.map((d) => ({
              id: d.id,
              code: d.itemName ? d.itemName.toUpperCase().replace(/[^A-Z0-9]/g, "_") : `SOW_${d.id}`,
              name: d.itemName,
              itemName: d.itemName,
              category: d.category,
              unit: d.unit,
              customer: d.customer || d.customerCode || "POS",
              customerCode: d.customerCode || d.customer || "POS",
              baseRateUSD: d.rateUSD || 0,
              rateUSD: d.rateUSD || 0,
              rateIDR: d.rateIDR || (d.rateUSD ? Math.round(d.rateUSD * 17923.30) : 0)
            }))
          );
        }
      })
      .catch(() => {});

    api<any[]>("/api/master-data/bank-accounts")
      .then((data) => {
        if (Array.isArray(data)) setBankAccountOptions(data);
      })
      .catch(() => {});
  }, []);

  return { mRate, fuelPriceUSD, laborPriceIDR, dynamicSowOptions, bankAccountOptions };
}

/** Compute the RF escalation index from current master data values */
export function useRFIndex(masterData: MasterDataState): number {
  return calculateRFIndex(masterData.mRate, masterData.fuelPriceUSD, masterData.laborPriceIDR);
}
