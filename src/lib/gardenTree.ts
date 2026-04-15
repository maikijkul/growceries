/** Anchor for a fruit icon as % of the tree graphic box (same as before: translate -50% -50%). */
export type GardenFruitSlotPosition = { left: string; top: string };

export type GardenTreePreset = {
  id: number;
  label: string;
  healthySrc: string;
  unhealthySrc: string;
  /** Exactly five slots; UI uses `slice(0, fruitCount)` (max 5 fruits). */
  fruitSlotPositions: readonly GardenFruitSlotPosition[];
};

/**
 * Five preset tree silhouettes for the garden graphic.
 * Each tree has its own fruit layout so slots match canopy shape when you replace art.
 */
export const GARDEN_TREE_PRESETS: readonly GardenTreePreset[] = [
  {
    id: 0,
    label: "Oak",
    healthySrc: "/garden/tree-0-healthy.png",
    unhealthySrc: "/garden/tree-0-unhealthy.png",
    fruitSlotPositions: [
      { left: "29.44%", top: "45.49%" },
      { left: "66.36%", top: "66.67%" },
      { left: "78.04%", top: "51.74%" },
      { left: "27.57%", top: "66.32%" },
      { left: "54.68%", top: "37.5%" },
    ],
  },
  {
    id: 1,
    label: "Maple",
    healthySrc: "/garden/tree-1-healthy.png",
    unhealthySrc: "/garden/tree-1-unhealthy.png",
    fruitSlotPositions: [
      { left: "79.45%", top: "73.96%" },
      { left: "33.18%", top: "55.21%" },
      { left: "57.01%", top: "44.79%" },
      { left: "23.83%", top: "75.35%" },
      { left: "77.58%", top: "57.64%" },
    ],
  },
  {
    id: 2,
    label: "Poplar",
    healthySrc: "/garden/tree-2-healthy.png",
    unhealthySrc: "/garden/tree-2-unhealthy.png",
    fruitSlotPositions: [
      { left: "65.43%", top: "47.57%" },
      { left: "50.94%", top: "31.25%" },
      { left: "67.76%", top: "68.4%" },
      { left: "43.46%", top: "47.92%" },
      { left: "39.72%", top: "67.01%" },
    ],
  },
  {
    id: 3,
    label: "Fir",
    healthySrc: "/garden/tree-3-healthy.png",
    unhealthySrc: "/garden/tree-3-unhealthy.png",
    fruitSlotPositions: [
      { left: "40.66%", top: "54.51%" },
      { left: "50%", top: "36.11%" },
      { left: "63.56%", top: "47.22%" },
      { left: "65.89%", top: "67.36%" },
      { left: "38.32%", top: "73.26%" },
    ],
  },
  {
    id: 4,
    label: "Elm",
    healthySrc: "/garden/tree-4-healthy.png",
    unhealthySrc: "/garden/tree-4-unhealthy.png",
    fruitSlotPositions: [
      { left: "35.05%", top: "28.13%" },
      { left: "28.51%", top: "56.25%" },
      { left: "70.57%", top: "32.29%" },
      { left: "74.3%", top: "52.08%" },
      { left: "45.33%", top: "44.1%" },
    ],
  },
];

export function normalizeGardenTreeType(raw: number | undefined): number {
  if (raw === undefined || !Number.isFinite(raw)) return 0;
  const n = Math.round(raw);
  if (n < 0 || n > 4) return 0;
  return n;
}
