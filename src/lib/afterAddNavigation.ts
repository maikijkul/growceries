/** Blocks taps on the home list (e.g. stray “−1”) right after returning from Add inventory. */
const KEY = "growceries.blockHomeClicksUntil";
const DURATION_MS = 900;

export function armBlockHomeListClicks(): void {
  sessionStorage.setItem(KEY, String(Date.now() + DURATION_MS));
}

export function homeListClicksBlocked(): boolean {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return false;
  if (Date.now() >= Number(raw)) {
    sessionStorage.removeItem(KEY);
    return false;
  }
  return true;
}

export function remainingBlockMs(): number {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return 0;
  return Math.max(0, Number(raw) - Date.now());
}
