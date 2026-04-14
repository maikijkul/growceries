/** Whole baht only (avoids float display issues like 198.99 vs 199). */
export function roundTHB2(n: number): number {
  return Math.round(n + Number.EPSILON);
}

export function formatTHB(n: number): string {
  const x = roundTHB2(n);
  return new Intl.NumberFormat("en-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(x);
}
