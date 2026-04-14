import { roundTHB2 } from "./money";

export type AddInventoryFormValues = {
  purchaseDate: string;
  category: string;
  brand: string;
  variation: string;
  quantity: string;
  pricePerUnitTHB: string;
  alertThreshold: string;
  /** "" = random on save */
  gardenTreeType: string;
  /** "" = random on save */
  gardenFruitType: string;
  /** Set when user picks a custom uploaded tree; clears built-in selection */
  gardenTreeCustomId: string;
  gardenFruitCustomId: string;
};

export type AddInventoryFieldErrors = Partial<Record<keyof AddInventoryFormValues, string>>;

export function validateAddInventoryForm(v: AddInventoryFormValues): AddInventoryFieldErrors {
  const errors: AddInventoryFieldErrors = {};

  if (!v.purchaseDate.trim()) {
    errors.purchaseDate = "Date is required.";
  }

  if (!v.category.trim()) {
    errors.category = "Category is required.";
  }

  if (!v.quantity.trim()) {
    errors.quantity = "Quantity is required.";
  } else {
    const qty = Math.round(Number(v.quantity));
    if (!Number.isFinite(qty) || qty < 0) {
      errors.quantity = "Enter a whole number ≥ 0.";
    }
  }

  if (v.pricePerUnitTHB.trim()) {
    const p = Number.parseFloat(v.pricePerUnitTHB);
    if (!Number.isFinite(p) || p < 0) {
      errors.pricePerUnitTHB = "Enter a valid price (≥ 0) or leave blank.";
    }
  }

  if (v.alertThreshold.trim()) {
    const t = Math.round(Number(v.alertThreshold));
    if (!Number.isFinite(t) || t < 0) {
      errors.alertThreshold = "Enter a whole number ≥ 0 or leave blank.";
    }
  }

  if (v.gardenTreeType.trim()) {
    const t = Math.round(Number(v.gardenTreeType));
    if (!Number.isFinite(t) || t < 0 || t > 4) {
      errors.gardenTreeType = "Pick a tree type or leave blank for random.";
    }
  }

  if (v.gardenFruitType.trim()) {
    const t = Math.round(Number(v.gardenFruitType));
    if (!Number.isFinite(t) || t < 0 || t > 4) {
      errors.gardenFruitType = "Pick a fruit type or leave blank for random.";
    }
  }

  return errors;
}

export function parseAddInventoryForm(v: AddInventoryFormValues) {
  const priceRaw = v.pricePerUnitTHB.trim();
  const thresholdRaw = v.alertThreshold.trim();

  const treeRaw = v.gardenTreeType.trim();
  const fruitRaw = v.gardenFruitType.trim();

  return {
    purchaseDate: v.purchaseDate,
    categoryName: v.category.trim(),
    brand: v.brand.trim(),
    variation: v.variation.trim(),
    quantity: Math.max(0, Math.round(Number(v.quantity))),
    pricePerUnitTHB: priceRaw ? roundTHB2(Number.parseFloat(priceRaw)) : undefined,
    alertThreshold: thresholdRaw ? Math.max(0, Math.round(Number(thresholdRaw))) : undefined,
    gardenTreeType: treeRaw ? Math.max(0, Math.min(4, Math.round(Number(treeRaw)))) : undefined,
    gardenFruitType: fruitRaw ? Math.max(0, Math.min(4, Math.round(Number(fruitRaw)))) : undefined,
  };
}
