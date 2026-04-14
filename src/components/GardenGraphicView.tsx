import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { db } from "../db";
import type { CategorySummary } from "../services/categories";
import { useBlobObjectUrl } from "../lib/blobObjectUrl";
import { GARDEN_FRUIT_PRESETS, normalizeGardenFruitType } from "../lib/gardenFruit";
import {
  GARDEN_TREE_PRESETS,
  normalizeGardenTreeType,
  type GardenFruitSlotPosition,
} from "../lib/gardenTree";

const SIGN_BG = "/garden/wooden-sign.png";
const WATERING_CAN = "/garden/watering-can.png";
const SHEARS = "/garden/shears.png";

function chunkRows<T>(items: T[], perRow: number): (T | null)[][] {
  const rows: (T | null)[][] = [];
  for (let i = 0; i < items.length; i += perRow) {
    const row: (T | null)[] = items.slice(i, i + perRow);
    while (row.length < perRow) row.push(null);
    rows.push(row);
  }
  return rows;
}

function GardenTree(props: { summary: CategorySummary }) {
  const { category, status, totalUnopened } = props.summary;
  const stockHealthy = status === "okay";
  const fruitType = normalizeGardenFruitType(category.gardenFruitType);
  const treeType = normalizeGardenTreeType(category.gardenTreeType);
  const fruitPreset = GARDEN_FRUIT_PRESETS[fruitType]!;
  const treePreset = GARDEN_TREE_PRESETS[treeType]!;
  const healthySrc = fruitPreset.healthySrc;
  const unhealthySrc = fruitPreset.unhealthySrc;
  const builtinTreeSrc = stockHealthy ? treePreset.healthySrc : treePreset.unhealthySrc;

  const customTreeRow = useLiveQuery(
    async () => {
      if (!category.gardenTreeCustomId) return undefined;
      return db.customGardenTrees.get(category.gardenTreeCustomId);
    },
    [category.gardenTreeCustomId],
  );
  const customFruitRow = useLiveQuery(
    async () => {
      if (!category.gardenFruitCustomId) return undefined;
      return db.customGardenFruits.get(category.gardenFruitCustomId);
    },
    [category.gardenFruitCustomId],
  );

  const builtinSlotOverride = useLiveQuery(
    async () => {
      if (category.gardenTreeCustomId) return undefined;
      return db.gardenBuiltinSlotOverrides.get(treeType);
    },
    [category.gardenTreeCustomId, treeType],
  );

  const customTreeHealthyUrl = useBlobObjectUrl(customTreeRow?.imageBlob, customTreeRow?.id);
  const customTreeUnhealthyUrl = useBlobObjectUrl(
    customTreeRow?.unhealthyImageBlob,
    customTreeRow && customTreeRow.unhealthyImageBlob ? `${customTreeRow.id}:tree-u` : undefined,
  );
  const customFruitHealthyUrl = useBlobObjectUrl(customFruitRow?.imageBlob, customFruitRow?.id);
  const customFruitUnhealthyUrl = useBlobObjectUrl(
    customFruitRow?.unhealthyImageBlob,
    customFruitRow && customFruitRow.unhealthyImageBlob ? `${customFruitRow.id}:fruit-u` : undefined,
  );

  let treeSrc: string;
  let treeImgExtraClass = "";
  if (category.gardenTreeCustomId) {
    if (customTreeHealthyUrl) {
      if (stockHealthy) {
        treeSrc = customTreeHealthyUrl;
      } else if (customTreeUnhealthyUrl) {
        treeSrc = customTreeUnhealthyUrl;
      } else {
        treeSrc = customTreeHealthyUrl;
        treeImgExtraClass = "grayscale brightness-[0.92] contrast-[0.95]";
      }
    } else {
      treeSrc = builtinTreeSrc;
    }
  } else {
    treeSrc = builtinTreeSrc;
  }

  const builtinFruitSrc = stockHealthy ? healthySrc : unhealthySrc;
  let fruitSrc: string;
  let fruitImgExtraClass = "";
  if (category.gardenFruitCustomId) {
    if (customFruitHealthyUrl) {
      if (stockHealthy) {
        fruitSrc = customFruitHealthyUrl;
      } else if (customFruitUnhealthyUrl) {
        fruitSrc = customFruitUnhealthyUrl;
      } else {
        fruitSrc = customFruitHealthyUrl;
        fruitImgExtraClass = "grayscale brightness-[0.92] contrast-[0.95]";
      }
    } else {
      fruitSrc = builtinFruitSrc;
    }
  } else {
    fruitSrc = builtinFruitSrc;
  }

  const fruitCount = Math.min(Math.max(0, totalUnopened), 5);

  const fruitSlotPositions: readonly GardenFruitSlotPosition[] = category.gardenTreeCustomId
    ? (customTreeRow?.fruitSlotPositions ?? GARDEN_TREE_PRESETS[0]!.fruitSlotPositions)
    : (builtinSlotOverride?.slots ?? GARDEN_TREE_PRESETS[treeType]!.fruitSlotPositions);

  const positions = fruitSlotPositions.slice(0, fruitCount);

  return (
    <div className="garden-category-tile garden-category-tile--healthy flex min-h-[216px] flex-col sm:min-h-[230px]">
      <Link
        to={`/categories/${category.id}`}
        aria-label={`Open ${category.name}`}
        className="flex min-h-0 flex-1 flex-col gap-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
      >
        <div className="relative mx-auto w-full min-h-[130px] shrink-0 sm:min-h-[144px]">
          <img
            src={treeSrc}
            alt=""
            className={`pointer-events-none absolute bottom-[4%] left-0 right-0 z-0 mx-auto h-auto max-h-[92%] w-full select-none object-contain object-bottom ${treeImgExtraClass}`}
          />
          {positions.map((pos, i) => (
            <img
              key={i}
              src={fruitSrc}
              alt=""
              className={`pointer-events-none absolute z-20 h-5 w-5 object-contain drop-shadow-md sm:h-6 sm:w-6 ${fruitImgExtraClass}`}
              style={{
                left: pos.left,
                top: pos.top,
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}
        </div>

        <div className="pointer-events-none relative z-10 -mt-1 w-full max-w-[min(100%,11rem)] shrink-0 self-center">
          <img src={SIGN_BG} alt="" className="h-11 w-full object-stretch select-none" />
          <div className="absolute inset-0 flex items-center justify-center px-1.5 pb-1 pt-0.5">
            <span className="-translate-y-1 line-clamp-2 text-center text-[10px] font-semibold leading-tight text-amber-950 sm:text-xs">
              {category.name}{" "}
              <span className="whitespace-nowrap font-medium text-amber-900/95">
                ({totalUnopened})
              </span>
            </span>
          </div>
        </div>
      </Link>

      <div className="mt-auto flex justify-center gap-2 px-0.5 pt-0.5">
        <Link
          to={`/add?categoryId=${encodeURIComponent(category.id)}`}
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-transparent"
          aria-label={`Grow — Add Inventory in ${category.name}`}
          title="Grow (add)"
          onClick={(e) => e.stopPropagation()}
        >
          <img src={WATERING_CAN} alt="" className="h-12 w-12 object-contain" />
        </Link>
        <Link
          to={`/categories/${category.id}/consume`}
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-transparent"
          aria-label={`Harvest — Record Use in ${category.name}`}
          title="Harvest (use)"
          onClick={(e) => e.stopPropagation()}
        >
          <img src={SHEARS} alt="" className="h-12 w-12 object-contain" />
        </Link>
      </div>
    </div>
  );
}

type Props = {
  summaries: CategorySummary[];
};

export function GardenGraphicView(props: Props) {
  const rows = chunkRows(props.summaries, 3);

  if (props.summaries.length === 0) {
    return (
      <div className="garden-category-tile garden-category-tile--healthy p-8 text-center text-emerald-800">
        <p className="font-medium">No Categories Yet</p>
        <p className="mt-2 text-sm text-emerald-700/90">
          Tap <span className="font-semibold">+</span> to plant your first category.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((row, ri) => (
        <div key={ri} className="grid grid-cols-3 gap-2 sm:gap-3">
          {row.map((cell, ci) =>
            cell ? (
              <GardenTree key={cell.category.id} summary={cell} />
            ) : (
              <div key={`empty-${ri}-${ci}`} className="min-h-0" aria-hidden />
            ),
          )}
        </div>
      ))}
    </div>
  );
}
