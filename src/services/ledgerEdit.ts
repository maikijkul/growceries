import { db } from "../db";
import { roundTHB2 } from "../lib/money";
import type { InventoryLedgerEntry, StockLot } from "../types";

/** For `<input type="datetime-local" />` value (local wall time). */
export function isoToDatetimeLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Matches add-inventory rows: lot was created in the same transaction as the ledger line. */
export async function findStockLotForAddEntry(entry: InventoryLedgerEntry): Promise<StockLot | undefined> {
  if (entry.kind !== "add") return undefined;
  const lots = await db.stockLots.where("categoryId").equals(entry.categoryId).toArray();
  return lots.find((l) => l.createdAt === entry.occurredAt);
}

export type UpdateAddLedgerInput = {
  occurredAt: string;
  purchaseDate: string;
  brand: string;
  variation: string;
  quantity: number;
  pricePerUnitTHB?: number;
};

export async function updateAddLedgerEntry(entryId: string, input: UpdateAddLedgerInput): Promise<void> {
  const qty = Math.max(0, Math.round(input.quantity));
  if (qty < 1) throw new Error("Quantity must be at least 1.");
  if (!input.purchaseDate.trim()) throw new Error("Purchase date is required.");

  const price =
    input.pricePerUnitTHB === undefined || input.pricePerUnitTHB === null
      ? undefined
      : roundTHB2(input.pricePerUnitTHB);

  await db.transaction("rw", db.ledger, db.stockLots, async () => {
    const entry = await db.ledger.get(entryId);
    if (!entry) throw new Error("Entry not found.");
    if (entry.kind !== "add") throw new Error("Not an add entry.");

    const lot = await findStockLotForAddEntry(entry);
    if (!lot) {
      throw new Error(
        "Could not find the stock batch for this entry. Editing may not be supported for this line.",
      );
    }

    const oldQty = entry.quantityDelta;
    const newRemaining = lot.quantityRemaining + (qty - oldQty);
    if (newRemaining < 0) {
      throw new Error(
        "That change would remove more units than remain in this batch (some may already have been used).",
      );
    }

    await db.stockLots.update(lot.id, {
      createdAt: input.occurredAt,
      purchaseDate: input.purchaseDate.trim(),
      brand: input.brand.trim(),
      variation: input.variation.trim(),
      quantityRemaining: newRemaining,
      pricePerUnitTHB: price,
    });

    await db.ledger.update(entryId, {
      occurredAt: input.occurredAt,
      quantityDelta: qty,
      purchaseDate: input.purchaseDate.trim(),
      brand: input.brand.trim() || undefined,
      variation: input.variation.trim() || undefined,
      pricePerUnitTHB: price,
    });
  });
}

export async function updateConsumeLedgerOccurrence(entryId: string, occurredAt: string): Promise<void> {
  await db.transaction("rw", db.ledger, async () => {
    const entry = await db.ledger.get(entryId);
    if (!entry) throw new Error("Entry not found.");
    if (entry.kind !== "consume") throw new Error("Not a use entry.");
    await db.ledger.update(entryId, { occurredAt });
  });
}
