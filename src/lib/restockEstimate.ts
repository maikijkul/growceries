import type { InventoryLedgerEntry } from "../types";

/**
 * Estimates days until stockout from past consume rate (calendar days between first/last consume).
 * Returns null if not enough data.
 */
export function estimateDaysUntilRestock(
  totalUnopened: number,
  ledger: readonly InventoryLedgerEntry[],
): number | null {
  const consumes = [...ledger]
    .filter((e) => e.kind === "consume")
    .map((e) => ({ t: new Date(e.occurredAt).getTime(), q: Math.abs(e.quantityDelta) }))
    .filter((x) => Number.isFinite(x.t) && x.q > 0)
    .sort((a, b) => a.t - b.t);

  if (consumes.length < 2 || totalUnopened <= 0) return null;

  const first = consumes[0]!.t;
  const last = consumes[consumes.length - 1]!.t;
  const spanDays = (last - first) / (1000 * 60 * 60 * 24);
  if (spanDays < 1 / 24) return null;

  const totalUnits = consumes.reduce((s, c) => s + c.q, 0);
  const unitsPerDay = totalUnits / spanDays;
  if (unitsPerDay <= 0) return null;

  return Math.ceil(totalUnopened / unitsPerDay);
}
