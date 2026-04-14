import Dexie, { type Table } from "dexie";
import type {
  BrandVariationReview,
  Category,
  CustomGardenFruitAsset,
  CustomGardenTreeAsset,
  GardenBuiltinSlotOverride,
  InventoryLedgerEntry,
  StockLot,
} from "./types";

export class GrowceriesDB extends Dexie {
  categories!: Table<Category, string>;
  stockLots!: Table<StockLot, string>;
  ledger!: Table<InventoryLedgerEntry, string>;
  reviews!: Table<BrandVariationReview, string>;
  customGardenTrees!: Table<CustomGardenTreeAsset, string>;
  customGardenFruits!: Table<CustomGardenFruitAsset, string>;
  gardenBuiltinSlotOverrides!: Table<GardenBuiltinSlotOverride, number>;

  constructor() {
    super("growceries_v1");
    this.version(1).stores({
      categories: "id, &normalized, name, createdAt",
      stockLots: "id, categoryId, purchaseDate, createdAt",
    });
    this.version(2)
      .stores({
        categories: "id, &normalized, name, createdAt",
        stockLots: "id, categoryId, purchaseDate, createdAt",
        ledger: "id, categoryId, occurredAt, kind",
      })
      .upgrade(async (tx) => {
        const lots = await tx.table<StockLot>("stockLots").toArray();
        const ledger = tx.table<InventoryLedgerEntry>("ledger");
        for (const lot of lots) {
          await ledger.add({
            id: crypto.randomUUID(),
            categoryId: lot.categoryId,
            occurredAt: lot.createdAt,
            kind: "add",
            quantityDelta: lot.quantityRemaining,
            purchaseDate: lot.purchaseDate,
            brand: lot.brand || undefined,
            variation: lot.variation || undefined,
            pricePerUnitTHB: lot.pricePerUnitTHB,
          });
        }
      });
    this.version(3).stores({
      categories: "id, &normalized, name, createdAt",
      stockLots: "id, categoryId, purchaseDate, createdAt",
      ledger: "id, categoryId, occurredAt, kind",
      reviews: "id, categoryId, updatedAt",
    });
    this.version(4).stores({
      categories: "id, &normalized, name, createdAt",
      stockLots: "id, categoryId, purchaseDate, createdAt",
      ledger: "id, categoryId, occurredAt, kind",
      reviews: "id, categoryId, updatedAt",
    });
    this.version(5).stores({
      categories: "id, &normalized, name, createdAt",
      stockLots: "id, categoryId, purchaseDate, createdAt",
      ledger: "id, categoryId, occurredAt, kind",
      reviews: "id, categoryId, updatedAt",
      customGardenTrees: "id, name, createdAt",
      customGardenFruits: "id, name, createdAt",
    });
    this.version(6).stores({
      categories: "id, &normalized, name, createdAt",
      stockLots: "id, categoryId, purchaseDate, createdAt",
      ledger: "id, categoryId, occurredAt, kind",
      reviews: "id, categoryId, updatedAt",
      customGardenTrees: "id, name, createdAt",
      customGardenFruits: "id, name, createdAt",
      gardenBuiltinSlotOverrides: "treeType",
    });
    this.version(7).stores({
      categories: "id, &normalized, name, createdAt",
      stockLots: "id, categoryId, purchaseDate, createdAt",
      ledger: "id, categoryId, occurredAt, kind",
      reviews: "id, categoryId, updatedAt",
      customGardenTrees: "id, name, createdAt",
      customGardenFruits: "id, name, createdAt",
      gardenBuiltinSlotOverrides: "treeType",
    });
    this.version(8).stores({
      categories: "id, &normalized, name, createdAt",
      stockLots: "id, categoryId, purchaseDate, createdAt",
      ledger: "id, categoryId, occurredAt, kind",
      reviews: "id, categoryId, updatedAt",
      customGardenTrees: "id, name, createdAt",
      customGardenFruits: "id, name, createdAt",
      gardenBuiltinSlotOverrides: "treeType",
    });
  }
}

export const db = new GrowceriesDB();
