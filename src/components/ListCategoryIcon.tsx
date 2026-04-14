import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { useBlobObjectUrl } from "../lib/blobObjectUrl";
import { GARDEN_FRUIT_PRESETS, normalizeGardenFruitType } from "../lib/gardenFruit";
import type { Category } from "../types";

/**
 * Small fruit thumbnail for list rows (healthy preset or custom fruit asset).
 */
export function ListCategoryIcon({ category }: { category: Category }) {
  const customId = category.gardenFruitCustomId;
  const customRow = useLiveQuery(
    async () => {
      if (!customId) return null;
      return (await db.customGardenFruits.get(customId)) ?? null;
    },
    [customId],
  );

  const fruitType = normalizeGardenFruitType(category.gardenFruitType);
  const preset = GARDEN_FRUIT_PRESETS[fruitType]!;
  const url = useBlobObjectUrl(customRow?.imageBlob ?? undefined, customRow?.id);

  if (customId && customRow === undefined) {
    return <div className="h-9 w-9 animate-pulse rounded-md bg-stone-300/50" aria-hidden />;
  }

  if (customId && customRow === null) {
    return <img src={preset.healthySrc} alt="" className="h-9 w-9 object-contain" />;
  }

  if (customId && customRow) {
    if (!url) {
      return <div className="h-9 w-9 animate-pulse rounded-md bg-stone-300/50" aria-hidden />;
    }
    return <img src={url} alt="" className="h-9 w-9 object-contain" />;
  }

  return <img src={preset.healthySrc} alt="" className="h-9 w-9 object-contain" />;
}
