import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { GardenGraphicView } from "../components/GardenGraphicView";
import { ListCategoryIcon } from "../components/ListCategoryIcon";
import { getPreferredHomeView, setPreferredHomeView } from "../lib/homeViewPreference";
import { homeListClicksBlocked, remainingBlockMs } from "../lib/afterAddNavigation";
import { listCategorySummaries, type CategorySummary } from "../services/categories";

async function loadSummaries(): Promise<CategorySummary[]> {
  return listCategorySummaries();
}

export function HomePage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlView = searchParams.get("view");
  const view: "list" | "graphic" =
    urlView === "graphic"
      ? "graphic"
      : urlView === "list"
        ? "list"
        : getPreferredHomeView();
  const [blockListClicks, setBlockListClicks] = useState(() => homeListClicksBlocked());
  const rows = useLiveQuery(() => loadSummaries(), []);

  function setView(next: "list" | "graphic") {
    setPreferredHomeView(next);
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (next === "list") p.delete("view");
        else p.set("view", "graphic");
        return p;
      },
      { replace: true },
    );
  }

  useEffect(() => {
    setPreferredHomeView(view);
  }, [view]);

  useEffect(() => {
    if (!homeListClicksBlocked()) {
      setBlockListClicks(false);
      return;
    }
    setBlockListClicks(true);
    const ms = remainingBlockMs();
    const t = window.setTimeout(() => {
      setBlockListClicks(false);
    }, ms);
    return () => window.clearTimeout(t);
  }, [location.key]);

  return (
    <div
      className={
        view === "list"
          ? "min-h-dvh pb-24"
          : "min-h-dvh bg-gradient-to-b from-transparent to-amber-50/25 pb-24"
      }
    >
      <header
        className={`sticky top-0 z-30 border-b px-4 py-4 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-sm ${
          view === "list"
            ? "border-emerald-200/50 bg-[#e8f5ec]/95"
            : "border-emerald-200/50 bg-[#e8f5ec]/95"
        }`}
      >
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1
              className="font-serif text-2xl font-bold tracking-tight text-emerald-900"
            >
              Growceries
            </h1>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={view === "graphic"}
            aria-label={
              view === "list"
                ? "List view — tap to switch to graphic view"
                : "Graphic view — tap to switch to list view"
            }
            onClick={() => setView(view === "list" ? "graphic" : "list")}
            className={`relative h-[26px] w-[46px] shrink-0 rounded-full p-[2px] shadow-inner transition-colors duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
              view === "graphic"
                ? "bg-emerald-500"
                : "bg-[#e5e5ea]"
            }`}
          >
            <span
              className={`pointer-events-none block h-[22px] w-[22px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                view === "graphic" ? "translate-x-[20px]" : "translate-x-0"
              }`}
            />
          </button>
          <Link
            to="/add"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-2xl font-light leading-none text-white shadow-md shadow-emerald-900/20 transition hover:bg-emerald-900 active:scale-95"
            aria-label="Add Inventory"
          >
            +
          </Link>
        </div>
      </header>

      <main
        className="mx-auto max-w-lg px-4 py-4"
        style={{ pointerEvents: blockListClicks ? "none" : "auto" }}
      >
        {view === "graphic" ? (
          rows ? (
            <GardenGraphicView summaries={rows} />
          ) : (
            <p className="text-center text-sm text-emerald-700">Loading…</p>
          )
        ) : !rows || rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-emerald-200/80 bg-white p-8 text-center text-emerald-800 shadow-[0_4px_14px_-4px_rgba(15,80,50,0.08)]">
            <p className="font-medium">No Categories Yet</p>
            <p className="mt-2 text-sm text-emerald-700/90">
              Tap <span className="font-semibold">+</span> to add your first stock.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map(({ category, totalUnopened, status }) => {
              const low = status === "low stock";
              return (
                <li key={category.id}>
                  <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[0_4px_14px_-4px_rgba(15,80,50,0.12)] ring-1 ring-emerald-100/70">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#efe8dc] shadow-inner ring-1 ring-stone-200/40">
                      <ListCategoryIcon category={category} />
                    </div>
                    <Link
                      to={`/categories/${category.id}`}
                      className="min-w-0 flex-1 py-0.5"
                    >
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <h2 className="min-w-0 break-words text-base font-bold leading-snug text-emerald-900">
                          {category.name}
                        </h2>
                        <span
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            low
                              ? "bg-amber-100 text-amber-900"
                              : "bg-emerald-100 text-emerald-900"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                              low ? "bg-amber-500" : "bg-emerald-600"
                            }`}
                            aria-hidden
                          />
                          {low ? "Low" : "Okay"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-neutral-600">
                        Unopened units:{" "}
                        <span className="font-semibold text-neutral-800">{totalUnopened}</span>
                      </p>
                      {category.alertThreshold !== undefined ? (
                        <p className="mt-0.5 text-xs text-neutral-500">
                          Alert when fewer than {category.alertThreshold} unopened.
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs text-neutral-500">No alert threshold set.</p>
                      )}
                    </Link>
                    <div className="flex h-11 min-w-[5.5rem] shrink-0 overflow-hidden rounded-full border border-emerald-100/90 bg-white shadow-sm ring-1 ring-emerald-900/[0.04]">
                      <Link
                        to={`/add?categoryId=${encodeURIComponent(category.id)}`}
                        className="flex flex-1 items-center justify-center text-lg font-semibold leading-none text-emerald-600 transition hover:bg-emerald-50/90"
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Add Inventory in ${category.name}`}
                      >
                        +
                      </Link>
                      <div className="w-px shrink-0 self-stretch bg-emerald-100" aria-hidden />
                      <Link
                        to={`/categories/${category.id}/consume`}
                        className="flex flex-1 items-center justify-center text-lg font-semibold leading-none text-red-500 transition hover:bg-red-50/80"
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Record Use in ${category.name}`}
                      >
                        −
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
