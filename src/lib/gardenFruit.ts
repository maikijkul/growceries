/** Five preset fruit types for the garden graphic (healthy assets used in category picker). */
export const GARDEN_FRUIT_PRESETS = [
  { id: 0, label: "Apple", healthySrc: "/garden/fruit-0-healthy.svg", unhealthySrc: "/garden/fruit-0-unhealthy.svg" },
  { id: 1, label: "Orange", healthySrc: "/garden/fruit-1-healthy.svg", unhealthySrc: "/garden/fruit-1-unhealthy.svg" },
  { id: 2, label: "Grape", healthySrc: "/garden/fruit-2-healthy.svg", unhealthySrc: "/garden/fruit-2-unhealthy.svg" },
  { id: 3, label: "Lemon", healthySrc: "/garden/fruit-3-healthy.svg", unhealthySrc: "/garden/fruit-3-unhealthy.svg" },
  { id: 4, label: "Cherry", healthySrc: "/garden/fruit-4-healthy.svg", unhealthySrc: "/garden/fruit-4-unhealthy.svg" },
] as const;

export function normalizeGardenFruitType(raw: number | undefined): number {
  if (raw === undefined || !Number.isFinite(raw)) return 0;
  const n = Math.round(raw);
  if (n < 0 || n > 4) return 0;
  return n;
}
