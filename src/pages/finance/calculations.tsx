import { calculateBATracker } from "../../lib/api";

export { getSBSTarifByDistance, type SBSDistanceTier } from "./distance_tiers";

export async function fetchServerBACalculation(input: any) {
  try {
    return await calculateBATracker(input);
  } catch (error) {
    console.error("Gagal mengambil kalkulasi BA server", error);
    return null;
  }
}
