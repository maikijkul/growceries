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
      { left: "30%", top: "20%" },
      { left: "50%", top: "14%" },
      { left: "70%", top: "22%" },
      { left: "38%", top: "32%" },
      { left: "58%", top: "30%" },
    ],
  },
  {
    id: 1,
    label: "Maple",
    healthySrc: "/garden/tree-1-healthy.png",
    unhealthySrc: "/garden/tree-1-unhealthy.png",
    fruitSlotPositions: [
      { left: "50%", top: "8%" },
      { left: "38%", top: "22%" },
      { left: "62%", top: "22%" },
      { left: "44%", top: "36%" },
      { left: "56%", top: "36%" },
    ],
  },
  {
    id: 2,
    label: "Poplar",
    healthySrc: "/garden/tree-2-healthy.png",
    unhealthySrc: "/garden/tree-2-unhealthy.png",
    fruitSlotPositions: [
      { left: "25%", top: "18%" },
      { left: "50%", top: "12%" },
      { left: "75%", top: "18%" },
      { left: "32%", top: "30%" },
      { left: "68%", top: "30%" },
    ],
  },
  {
    id: 3,
    label: "Fir",
    healthySrc: "/garden/tree-3-healthy.png",
    unhealthySrc: "/garden/tree-3-unhealthy.png",
    fruitSlotPositions: [
      { left: "22%", top: "28%" },
      { left: "40%", top: "22%" },
      { left: "60%", top: "22%" },
      { left: "78%", top: "28%" },
      { left: "50%", top: "38%" },
    ],
  },
  {
    id: 4,
    label: "Elm",
    healthySrc: "/garden/tree-4-healthy.png",
    unhealthySrc: "/garden/tree-4-unhealthy.png",
    fruitSlotPositions: [
      { left: "50%", top: "10%" },
      { left: "42%", top: "24%" },
      { left: "58%", top: "24%" },
      { left: "50%", top: "38%" },
      { left: "50%", top: "52%" },
    ],
  },
];

export function normalizeGardenTreeType(raw: number | undefined): number {
  if (raw === undefined || !Number.isFinite(raw)) return 0;
  const n = Math.round(raw);
  if (n < 0 || n > 4) return 0;
  return n;
}
