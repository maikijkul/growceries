import { db } from "../db";
import type { InventoryLedgerEntry, StockLot } from "../types";

function newId(): string {
  return crypto.randomUUID();
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/** Dropdown value: only match lots with an empty brand label */
export const CONSUME_NO_BRAND = "__growceries_no_brand__";
/** Dropdown value: only match lots with an empty variation label */
export const CONSUME_NO_VARIATION = "__growceries_no_variation__";

function normalizeBrandSpec(raw: string): string {
  return raw === CONSUME_NO_BRAND ? CONSUME_NO_BRAND : raw.trim();
}

function normalizeVariationSpec(raw: string): string {
  return raw === CONSUME_NO_VARIATION ? CONSUME_NO_VARIATION : raw.trim();
}

function lotMatchesFilter(lot: StockLot, brandSpec: string, variationSpec: string): boolean {
  if (brandSpec === CONSUME_NO_BRAND) {
    if (norm(lot.brand) !== "") return false;
  } else if (brandSpec !== "") {
    if (norm(lot.brand) !== norm(brandSpec)) return false;
  }

  if (variationSpec === CONSUME_NO_VARIATION) {
    if (norm(lot.variation) !== "") return false;
  } else if (variationSpec !== "") {
    if (norm(lot.variation) !== norm(variationSpec)) return false;
  }

  return true;
}

function sortLotsOldestFirst(lots: StockLot[]): StockLot[] {
  return [...lots].sort((a, b) => {
    const da = a.purchaseDate.localeCompare(b.purchaseDate);
    if (da !== 0) return da;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

type LotWork = StockLot & { workRemaining: number };

function toWork(lots: StockLot[]): LotWork[] {
  return lots
    .filter((l) => l.quantityRemaining > 0)
    .map((l) => ({ ...l, workRemaining: l.quantityRemaining }));
}

function planTakes(work: LotWork[], need: number): { lotId: string; take: number }[] {
  let remaining = need;
  const out: { lotId: string; take: number }[] = [];
  for (const lot of work) {
    if (remaining <= 0) break;
    if (lot.workRemaining <= 0) continue;
    const take = Math.min(remaining, lot.workRemaining);
    if (take <= 0) continue;
    out.push({ lotId: lot.id, take });
    lot.workRemaining -= take;
    remaining -= take;
  }
  return out;
}

function formatFifoConsumeSummary(
  plan: { lotId: string; take: number }[],
  lotsById: Map<string, StockLot>,
): string {
  const parts: string[] = [];
  for (const { lotId, take } of plan) {
    const lot = lotsById.get(lotId);
    if (!lot) continue;
    const b = lot.brand.trim() || "(no brand)";
    const v = lot.variation.trim() || "(no variation)";
    parts.push(`${b} · ${v} (×${take})`);
  }
  return parts.join("; ");
}

export type ConsumeInput = {
  categoryId: string;
  quantity: number;
  brandSpec: string;
  variationSpec: string;
};

/** Sum of remaining units in lots that match the brand/variation filters (“” = any). */
export function availableUnitsMatching(
  lots: StockLot[],
  brandSpecRaw: string,
  variationSpecRaw: string,
): number {
  const brandSpec = normalizeBrandSpec(brandSpecRaw);
  const variationSpec = normalizeVariationSpec(variationSpecRaw);
  return lots
    .filter((l) => l.quantityRemaining > 0)
    .filter((l) => lotMatchesFilter(l, brandSpec, variationSpec))
    .reduce((s, l) => s + l.quantityRemaining, 0);
}

/**
 * Decrement stock FIFO. If either brand or variation is narrowed (not “any”), only
 * matching lots are used — no pulling from other brands/variations.
 */
export async function consumeUnits(input: ConsumeInput): Promise<void> {
  const qty = Math.round(input.quantity);
  if (!Number.isFinite(qty) || qty < 1) {
    throw new Error("Quantity must be at least 1.");
  }
  const brandSpec = normalizeBrandSpec(input.brandSpec);
  const variationSpec = normalizeVariationSpec(input.variationSpec);
  const now = new Date().toISOString();

  await db.transaction("rw", db.stockLots, db.ledger, async () => {
    const all = await db.stockLots.where("categoryId").equals(input.categoryId).toArray();
    const workAll = toWork(all);
    const totalAvail = workAll.reduce((s, l) => s + l.workRemaining, 0);

    const strictSelection = brandSpec !== "" || variationSpec !== "";

    const plan: { lotId: string; take: number }[] = [];

    if (strictSelection) {
      const matched = workAll.filter((l) => lotMatchesFilter(l, brandSpec, variationSpec));
      const matchedAvail = matched.reduce((s, l) => s + l.workRemaining, 0);
      if (qty > matchedAvail) {
        throw new Error(
          `Insufficient quantity for this selection. Only ${matchedAvail} unit(s) available for the brand/variation you chose.`,
        );
      }
      plan.push(...planTakes(sortLotsOldestFirst(matched) as LotWork[], qty));
    } else {
      if (totalAvail < qty) {
        throw new Error(`Only ${totalAvail} unit(s) available.`);
      }
      plan.push(...planTakes(sortLotsOldestFirst(workAll) as LotWork[], qty));
    }

    const lotsById = new Map(all.map((l) => [l.id, l]));

    for (const { lotId, take } of plan) {
      const row = await db.stockLots.get(lotId);
      if (!row) continue;
      const next = Math.max(0, row.quantityRemaining - take);
      await db.stockLots.update(lotId, { quantityRemaining: next });
    }

    const entry: InventoryLedgerEntry = {
      id: newId(),
      categoryId: input.categoryId,
      occurredAt: now,
      kind: "consume",
      quantityDelta: -qty,
      brand:
        brandSpec === ""
          ? undefined
          : brandSpec === CONSUME_NO_BRAND
            ? "(no brand)"
            : brandSpec,
      variation:
        variationSpec === ""
          ? undefined
          : variationSpec === CONSUME_NO_VARIATION
            ? "(no variation)"
            : variationSpec,
      consumeFifoSummary: !strictSelection
        ? formatFifoConsumeSummary(plan, lotsById)
        : undefined,
    };
    await db.ledger.add(entry);
  });
}

export type ConsumeDropdownOption = { value: string; label: string };

function unitLabel(n: number): string {
  return `${n} ${n === 1 ? "unit" : "units"}`;
}

/** Distinct brands from lots with stock; labels include remaining quantities. */
export function buildBrandDropdownOptions(lots: StockLot[]): ConsumeDropdownOption[] {
  const positive = lots.filter((l) => l.quantityRemaining > 0);
  const total = positive.reduce((s, l) => s + l.quantityRemaining, 0);
  const counts = new Map<string, number>();
  for (const l of positive) {
    const raw = l.brand.trim();
    const value = raw === "" ? CONSUME_NO_BRAND : raw;
    counts.set(value, (counts.get(value) ?? 0) + l.quantityRemaining);
  }
  const rest = [...counts.entries()]
    .map(([value, n]) => {
      const base = value === CONSUME_NO_BRAND ? "(no brand)" : value;
      return { value, label: `${base} (${unitLabel(n)})` };
    })
    .sort((a, b) => {
      const al = a.value === CONSUME_NO_BRAND ? "(no brand)" : a.value;
      const bl = b.value === CONSUME_NO_BRAND ? "(no brand)" : b.value;
      return al.localeCompare(bl, undefined, { sensitivity: "base" });
    });
  return [
    { value: "", label: `Any (oldest first) — ${unitLabel(total)} in category` },
    ...rest,
  ];
}

/** Variations for lots with stock, filtered by brand; labels include quantities. */
export function buildVariationDropdownOptions(
  lots: StockLot[],
  brandValue: string,
): ConsumeDropdownOption[] {
  const positive = lots.filter((l) => l.quantityRemaining > 0);
  const subset = positive.filter((l) => {
    if (!brandValue) return true;
    if (brandValue === CONSUME_NO_BRAND) return l.brand.trim() === "";
    return l.brand.trim() === brandValue;
  });
  const subtotal = subset.reduce((s, l) => s + l.quantityRemaining, 0);
  const counts = new Map<string, number>();
  for (const l of subset) {
    const raw = l.variation.trim();
    const value = raw === "" ? CONSUME_NO_VARIATION : raw;
    counts.set(value, (counts.get(value) ?? 0) + l.quantityRemaining);
  }
  const rest = [...counts.entries()]
    .map(([value, n]) => {
      const base = value === CONSUME_NO_VARIATION ? "(no variation)" : value;
      return { value, label: `${base} (${unitLabel(n)})` };
    })
    .sort((a, b) => {
      const al = a.value === CONSUME_NO_VARIATION ? "(no variation)" : a.value;
      const bl = b.value === CONSUME_NO_VARIATION ? "(no variation)" : b.value;
      return al.localeCompare(bl, undefined, { sensitivity: "base" });
    });
  const scope = brandValue ? "for this brand" : "in category";
  return [
    { value: "", label: `Any (oldest first) — ${unitLabel(subtotal)} ${scope}` },
    ...rest,
  ];
}

export type BreakdownRow = {
  brand: string;
  variation: string;
  quantity: number;
};

export async function breakdownForCategory(categoryId: string): Promise<BreakdownRow[]> {
  const lots = await db.stockLots.where("categoryId").equals(categoryId).toArray();
  const map = new Map<string, { brand: string; variation: string; quantity: number }>();
  for (const l of lots) {
    const q = Math.max(0, l.quantityRemaining);
    if (q === 0) continue;
    const brand = l.brand.trim() || "(no brand)";
    const variation = l.variation.trim() || "(no variation)";
    const key = `${brand.toLowerCase()}\0${variation.toLowerCase()}`;
    const cur = map.get(key);
    if (cur) cur.quantity += q;
    else map.set(key, { brand, variation, quantity: q });
  }
  return [...map.values()].sort((a, b) => b.quantity - a.quantity);
}
