import type { GardenFruitSlotPosition } from "./lib/gardenTree";

export type { GardenFruitSlotPosition };

export type Category = {
  id: string;
  /** Display name as entered */
  name: string;
  normalized: string;
  /** When set, low stock if total unopened is strictly below this number */
  alertThreshold?: number;
  /** Garden graphic: which of the 5 fruit presets (0–4). Omitted = 0 in UI. */
  gardenFruitType?: number;
  /** Garden graphic: which of the 5 tree presets (0–4). Omitted = 0 in UI. */
  gardenTreeType?: number;
  /** When set, built-in tree type is ignored; image from custom garden assets. */
  gardenTreeCustomId?: string;
  /** When set, built-in fruit type is ignored. */
  gardenFruitCustomId?: string;
  createdAt: string;
};

/** Optional override for built-in tree presets 0–4 (stored in IndexedDB). */
export type GardenBuiltinSlotOverride = {
  treeType: number;
  slots: GardenFruitSlotPosition[];
};

/** User-uploaded tree icon for the garden (stored in IndexedDB). */
export type CustomGardenTreeAsset = {
  id: string;
  name: string;
  /** Healthy / in-stock artwork (required). */
  imageBlob: Blob;
  mimeType: string;
  /** Optional low-stock artwork; if omitted, the garden uses a greyscale filter on the healthy image. */
  unhealthyImageBlob?: Blob;
  unhealthyMimeType?: string;
  createdAt: string;
  /** When set (exactly five), used for fruit positions on the garden graphic; else defaults apply. */
  fruitSlotPositions?: GardenFruitSlotPosition[];
};

/** User-uploaded fruit icon for the garden (stored in IndexedDB). */
export type CustomGardenFruitAsset = {
  id: string;
  name: string;
  /** Healthy / in-stock artwork (required). */
  imageBlob: Blob;
  mimeType: string;
  /** Optional low-stock artwork; if omitted, the garden uses a greyscale filter on the healthy image. */
  unhealthyImageBlob?: Blob;
  unhealthyMimeType?: string;
  createdAt: string;
};

/** One received batch / line under a category (brand + variation + remaining qty). */
export type StockLot = {
  id: string;
  categoryId: string;
  purchaseDate: string;
  brand: string;
  variation: string;
  quantityRemaining: number;
  /** THB, optional */
  pricePerUnitTHB?: number;
  createdAt: string;
};

export type LedgerKind = "add" | "consume";

/** Append-only log for category history (adds and uses). */
export type InventoryLedgerEntry = {
  id: string;
  categoryId: string;
  occurredAt: string;
  kind: LedgerKind;
  /** Positive for add, negative for consume */
  quantityDelta: number;
  purchaseDate?: string;
  brand?: string;
  variation?: string;
  /** When consume used “any” brand and “any” variation, FIFO breakdown actually taken. */
  consumeFifoSummary?: string;
  pricePerUnitTHB?: number;
};

/** Per category + brand + variation: optional rating and remarks for Reviews tab. */
export type BrandVariationReview = {
  id: string;
  categoryId: string;
  /** Display labels (same style as breakdown: “(no brand)” etc.) */
  brand: string;
  variation: string;
  /** 0 = unrated (no stars), 1–5 = filled stars */
  rating: number;
  remarks: string;
  updatedAt: string;
};
