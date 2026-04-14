import { db } from "../db";
import type { BrandVariationReview } from "../types";

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/** Stable id for a brand·variation row within a category. */
export function reviewComboId(categoryId: string, brand: string, variation: string): string {
  return `${categoryId}\0${norm(brand)}\0${norm(variation)}`;
}

export type BrandVariationCombo = { brand: string; variation: string };

function labelBrand(raw: string): string {
  const t = raw.trim();
  return t ? t : "(no brand)";
}

function labelVariation(raw: string): string {
  const t = raw.trim();
  return t ? t : "(no variation)";
}

/**
 * Distinct brand·variation pairs seen in stock lots and add events for this category.
 */
async function combosFromInventory(categoryId: string): Promise<BrandVariationCombo[]> {
  const lots = await db.stockLots.where("categoryId").equals(categoryId).toArray();
  const ledger = await db.ledger.where("categoryId").equals(categoryId).toArray();
  const map = new Map<string, BrandVariationCombo>();

  function add(rawBrand: string | undefined, rawVariation: string | undefined) {
    const brand = labelBrand(rawBrand ?? "");
    const variation = labelVariation(rawVariation ?? "");
    const id = reviewComboId(categoryId, brand, variation);
    if (!map.has(id)) {
      map.set(id, { brand, variation });
    }
  }

  for (const l of lots) {
    add(l.brand, l.variation);
  }
  for (const e of ledger) {
    if (e.kind === "add") {
      add(e.brand, e.variation);
    }
  }

  return [...map.values()].sort((a, b) => {
    const c = a.brand.localeCompare(b.brand, undefined, { sensitivity: "base" });
    if (c !== 0) return c;
    return a.variation.localeCompare(b.variation, undefined, { sensitivity: "base" });
  });
}

/**
 * All review targets: inventory combos plus any saved reviews still on file (so rows aren’t lost if stock is gone).
 */
export async function listReviewTargets(categoryId: string): Promise<BrandVariationCombo[]> {
  const combos = await combosFromInventory(categoryId);
  const saved = await db.reviews.where("categoryId").equals(categoryId).toArray();
  const map = new Map<string, BrandVariationCombo>();

  for (const c of combos) {
    map.set(reviewComboId(categoryId, c.brand, c.variation), c);
  }
  for (const r of saved) {
    const id = r.id;
    if (!map.has(id)) {
      map.set(id, { brand: r.brand, variation: r.variation });
    }
  }

  return [...map.values()].sort((a, b) => {
    const c = a.brand.localeCompare(b.brand, undefined, { sensitivity: "base" });
    if (c !== 0) return c;
    return a.variation.localeCompare(b.variation, undefined, { sensitivity: "base" });
  });
}

export function defaultReviewRow(
  categoryId: string,
  combo: BrandVariationCombo,
): BrandVariationReview {
  const id = reviewComboId(categoryId, combo.brand, combo.variation);
  return {
    id,
    categoryId,
    brand: combo.brand,
    variation: combo.variation,
    rating: 0,
    remarks: "",
    updatedAt: new Date(0).toISOString(),
  };
}

export async function upsertReview(row: BrandVariationReview): Promise<void> {
  const rating = Math.max(0, Math.min(5, Math.round(row.rating)));
  const remarks = row.remarks.trim();
  if (rating === 0 && remarks === "") {
    await db.reviews.delete(row.id);
    return;
  }
  await db.reviews.put({
    ...row,
    rating,
    remarks,
    updatedAt: new Date().toISOString(),
  });
}

/** Merged rows for UI: saved review or defaults for each target combo. */
export async function loadReviewCardsForCategory(categoryId: string): Promise<BrandVariationReview[]> {
  const targets = await listReviewTargets(categoryId);
  const saved = await db.reviews.where("categoryId").equals(categoryId).toArray();
  const byId = new Map(saved.map((r) => [r.id, r]));
  return targets.map((combo) => {
    const rid = reviewComboId(categoryId, combo.brand, combo.variation);
    const existing = byId.get(rid);
    if (existing) return existing;
    return defaultReviewRow(categoryId, combo);
  });
}
