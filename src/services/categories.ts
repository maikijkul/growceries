import { db } from "../db";
import { normalizeCategoryKey } from "../lib/categoryKey";
import { roundTHB2 } from "../lib/money";
import type { Category, InventoryLedgerEntry, StockLot } from "../types";

function newId(): string {
  return crypto.randomUUID();
}

export type CategorySummary = {
  category: Category;
  totalUnopened: number;
  status: "okay" | "low stock";
};

async function totalUnopenedForCategory(categoryId: string): Promise<number> {
  const lots = await db.stockLots.where("categoryId").equals(categoryId).toArray();
  return lots.reduce((sum, l) => sum + Math.max(0, l.quantityRemaining), 0);
}

function statusFor(total: number, threshold: number | undefined): "okay" | "low stock" {
  if (threshold === undefined) return "okay";
  return total < threshold ? "low stock" : "okay";
}

export async function listCategorySummaries(): Promise<CategorySummary[]> {
  const categories = await db.categories.orderBy("name").toArray();
  const out: CategorySummary[] = [];
  for (const category of categories) {
    const totalUnopened = await totalUnopenedForCategory(category.id);
    out.push({
      category,
      totalUnopened,
      status: statusFor(totalUnopened, category.alertThreshold),
    });
  }
  out.sort((a, b) => {
    const aLow = a.status === "low stock" ? 0 : 1;
    const bLow = b.status === "low stock" ? 0 : 1;
    if (aLow !== bLow) return aLow - bLow;
    if (a.status === "low stock" && b.status === "low stock") {
      return a.totalUnopened - b.totalUnopened;
    }
    return a.category.name.localeCompare(b.category.name, undefined, { sensitivity: "base" });
  });
  return out;
}

export async function getCategory(categoryId: string): Promise<Category | undefined> {
  return db.categories.get(categoryId);
}

export async function setCategoryGardenFruitType(
  categoryId: string,
  gardenFruitType: number,
): Promise<void> {
  const n = Math.max(0, Math.min(4, Math.round(gardenFruitType)));
  await db.categories.update(categoryId, { gardenFruitType: n, gardenFruitCustomId: undefined });
}

export async function setCategoryGardenTreeType(
  categoryId: string,
  gardenTreeType: number,
): Promise<void> {
  const n = Math.max(0, Math.min(4, Math.round(gardenTreeType)));
  await db.categories.update(categoryId, { gardenTreeType: n, gardenTreeCustomId: undefined });
}

export async function setCategoryGardenTreeCustomId(
  categoryId: string,
  customAssetId: string,
): Promise<void> {
  await db.categories.update(categoryId, {
    gardenTreeCustomId: customAssetId,
    gardenTreeType: undefined,
  });
}

export async function setCategoryGardenFruitCustomId(
  categoryId: string,
  customAssetId: string,
): Promise<void> {
  await db.categories.update(categoryId, {
    gardenFruitCustomId: customAssetId,
    gardenFruitType: undefined,
  });
}

/** Set or clear the low-stock alert threshold (low stock when unopened count is strictly less than this). */
export async function setCategoryAlertThreshold(
  categoryId: string,
  threshold: number | undefined,
): Promise<void> {
  const cat = await db.categories.get(categoryId);
  if (!cat) throw new Error("Category not found.");
  if (threshold === undefined) {
    const next: Category = { ...cat };
    delete next.alertThreshold;
    await db.categories.put(next);
    return;
  }
  const n = Math.max(0, Math.round(threshold));
  if (!Number.isFinite(n)) throw new Error("Invalid threshold.");
  await db.categories.update(categoryId, { alertThreshold: n });
}

function randomGardenPresetIndex(): number {
  return Math.floor(Math.random() * 5);
}

export type AddInventoryInput = {
  purchaseDate: string;
  categoryName: string;
  brand: string;
  variation: string;
  quantity: number;
  pricePerUnitTHB?: number;
  alertThreshold?: number;
  /** 0–4; if omitted, a random preset is chosen. */
  gardenTreeType?: number;
  /** 0–4; if omitted, a random preset is chosen. */
  gardenFruitType?: number;
  gardenTreeCustomId?: string;
  gardenFruitCustomId?: string;
};

export async function addInventory(input: AddInventoryInput): Promise<void> {
  const name = input.categoryName.trim();
  const normalized = normalizeCategoryKey(name);
  if (!normalized) throw new Error("Category is required.");

  const qty = Math.max(0, Math.round(input.quantity));
  const threshold =
    input.alertThreshold === undefined
      ? undefined
      : Math.max(0, Math.round(input.alertThreshold));

  const price =
    input.pricePerUnitTHB === undefined ? undefined : roundTHB2(input.pricePerUnitTHB);

  const now = new Date().toISOString();

  await db.transaction(
    "rw",
    [db.categories, db.stockLots, db.ledger, db.customGardenTrees, db.customGardenFruits],
    async () => {
    let category = await db.categories.where("normalized").equals(normalized).first();

    if (!category) {
      category = {
        id: newId(),
        name,
        normalized,
        createdAt: now,
      };
      await db.categories.add(category);
    }

    let updates: Partial<Category> = {};

    if (input.gardenTreeCustomId?.trim()) {
      const treeId = input.gardenTreeCustomId.trim();
      const asset = await db.customGardenTrees.get(treeId);
      if (!asset) throw new Error("Custom tree not found.");
      updates.gardenTreeCustomId = treeId;
      updates.gardenTreeType = undefined;
    } else {
      const treePreset =
        input.gardenTreeType !== undefined && Number.isFinite(input.gardenTreeType)
          ? Math.max(0, Math.min(4, Math.round(input.gardenTreeType)))
          : randomGardenPresetIndex();
      updates.gardenTreeType = treePreset;
      updates.gardenTreeCustomId = undefined;
    }

    if (input.gardenFruitCustomId?.trim()) {
      const fruitId = input.gardenFruitCustomId.trim();
      const asset = await db.customGardenFruits.get(fruitId);
      if (!asset) throw new Error("Custom fruit not found.");
      updates.gardenFruitCustomId = fruitId;
      updates.gardenFruitType = undefined;
    } else {
      const fruitPreset =
        input.gardenFruitType !== undefined && Number.isFinite(input.gardenFruitType)
          ? Math.max(0, Math.min(4, Math.round(input.gardenFruitType)))
          : randomGardenPresetIndex();
      updates.gardenFruitType = fruitPreset;
      updates.gardenFruitCustomId = undefined;
    }
    if (threshold !== undefined) {
      updates.alertThreshold = threshold;
    }
    await db.categories.update(category.id, updates);

    const lot: StockLot = {
      id: newId(),
      categoryId: category.id,
      purchaseDate: input.purchaseDate,
      brand: input.brand.trim(),
      variation: input.variation.trim(),
      quantityRemaining: qty,
      pricePerUnitTHB: price,
      createdAt: now,
    };
    await db.stockLots.add(lot);

    const entry: InventoryLedgerEntry = {
      id: newId(),
      categoryId: category.id,
      occurredAt: now,
      kind: "add",
      quantityDelta: qty,
      purchaseDate: input.purchaseDate,
      brand: input.brand.trim() || undefined,
      variation: input.variation.trim() || undefined,
      pricePerUnitTHB: price,
    };
    await db.ledger.add(entry);
    },
  );
}

export async function deleteCategoryCompletely(categoryId: string): Promise<void> {
  await db.transaction("rw", db.categories, db.stockLots, db.ledger, db.reviews, async () => {
    await db.stockLots.where("categoryId").equals(categoryId).delete();
    await db.ledger.where("categoryId").equals(categoryId).delete();
    await db.reviews.where("categoryId").equals(categoryId).delete();
    await db.categories.delete(categoryId);
  });
}
