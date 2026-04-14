const STORAGE_KEY = "growceries.preferredHomeView";

export type HomeViewMode = "list" | "graphic";

export function getPreferredHomeView(): HomeViewMode {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "graphic" ? "graphic" : "list";
  } catch {
    return "list";
  }
}

export function setPreferredHomeView(mode: HomeViewMode): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

/** Use for Link `to` / `navigate` so returning home respects list vs graphic preference. */
export function homeHref(): string {
  return getPreferredHomeView() === "graphic" ? "/?view=graphic" : "/";
}

/** Page shell matching Home: list = emerald gradient (no meadow); graphic = transparent top so meadow shows. */
export function homeViewShellClass(): string {
  return getPreferredHomeView() === "list"
    ? "min-h-dvh bg-[#e8f5ec]"
    : "min-h-dvh bg-gradient-to-b from-transparent to-amber-50/25";
}
