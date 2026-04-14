import { db } from "../db";
import { GARDEN_TREE_PRESETS, normalizeGardenTreeType, type GardenFruitSlotPosition } from "../lib/gardenTree";
import type { CustomGardenTreeAsset, GardenBuiltinSlotOverride } from "../types";

function parsePct(raw: string): number {
  const n = parseFloat(String(raw).trim().replace(/%$/, ""));
  return Number.isFinite(n) ? n : 0;
}

export function validateFruitSlots(slots: GardenFruitSlotPosition[]): void {
  if (!Array.isArray(slots) || slots.length !== 5) {
    throw new Error("Exactly five fruit slots are required.");
  }
  for (const s of slots) {
    const L = parsePct(s.left);
    const T = parsePct(s.top);
    if (L < 0 || L > 100 || T < 0 || T > 100) {
      throw new Error("Each slot must use percentages between 0% and 100%.");
    }
  }
}

export function slotsToPositions(slots: GardenFruitSlotPosition[]): GardenFruitSlotPosition[] {
  validateFruitSlots(slots);
  return slots.map((s) => ({
    left: `${Math.round(parsePct(s.left) * 100) / 100}%`,
    top: `${Math.round(parsePct(s.top) * 100) / 100}%`,
  }));
}

export function defaultBuiltinSlots(treeType: number): readonly GardenFruitSlotPosition[] {
  const t = normalizeGardenTreeType(treeType);
  return GARDEN_TREE_PRESETS[t]!.fruitSlotPositions;
}

export function defaultCustomTreeSlots(): readonly GardenFruitSlotPosition[] {
  return GARDEN_TREE_PRESETS[0]!.fruitSlotPositions;
}

export async function getBuiltinSlotOverride(
  treeType: number,
): Promise<GardenBuiltinSlotOverride | undefined> {
  const t = normalizeGardenTreeType(treeType);
  return db.gardenBuiltinSlotOverrides.get(t);
}

export async function setBuiltinSlotOverride(
  treeType: number,
  slots: GardenFruitSlotPosition[] | null,
): Promise<void> {
  const t = normalizeGardenTreeType(treeType);
  if (slots === null) {
    await db.gardenBuiltinSlotOverrides.delete(t);
    return;
  }
  await db.gardenBuiltinSlotOverrides.put({ treeType: t, slots: slotsToPositions(slots) });
}

export async function setCustomGardenTreeFruitSlots(
  assetId: string,
  slots: GardenFruitSlotPosition[] | null,
): Promise<void> {
  const row = await db.customGardenTrees.get(assetId);
  if (!row) throw new Error("Custom tree not found.");
  if (slots === null) {
    const next: CustomGardenTreeAsset = { ...row };
    delete next.fruitSlotPositions;
    await db.customGardenTrees.put(next);
    return;
  }
  await db.customGardenTrees.update(assetId, {
    fruitSlotPositions: slotsToPositions(slots),
  });
}
