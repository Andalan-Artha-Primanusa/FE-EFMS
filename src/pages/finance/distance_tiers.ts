// =============================================================
// SBS DISTANCE TIERS RESOLVER
// Rentang & tarif jarak angkut SBS dibaca dari Master Variable SOW (kategori "Tarif Jarak Angkut").
// =============================================================

import { sbsDistanceTiers } from "./masterRegistry";

export interface SBSDistanceTier {
  min: number;
  max: number;
  rangeLabel: string;
  rate: number;
}

/** Daftar rentang tarif dari master (dibaca saat dipanggil agar selalu mengikuti data terbaru). */
export const getSBSDistanceTiers = (): SBSDistanceTier[] => sbsDistanceTiers();

export function getSBSTarifByDistance(distance: number): { rate: number; tier: SBSDistanceTier | null } {
  const dist = Number(distance);
  if (!(dist > 0)) return { rate: 0, tier: null };
  const tiers = sbsDistanceTiers();
  const matched = tiers.find((t) => dist >= t.min && dist <= t.max);
  if (matched) return { rate: matched.rate, tier: matched };
  const last = tiers[tiers.length - 1];
  if (last && dist > last.max) return { rate: last.rate, tier: last };
  return { rate: 0, tier: null };
}
