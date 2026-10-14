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
  // Rentang dengan batas bawah terbesar <= jarak (250,5 m -> 0-250; di atas rentang terakhir -> tarif tertinggi).
  const matched = sbsDistanceTiers().filter((t) => t.min <= dist).pop();
  return matched ? { rate: matched.rate, tier: matched } : { rate: 0, tier: null };
}
