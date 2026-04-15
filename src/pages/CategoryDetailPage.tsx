import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CustomGardenThumb } from "../components/CustomGardenThumb";
import { db } from "../db";
import { estimateDaysUntilRestock } from "../lib/restockEstimate";
import { formatTHB } from "../lib/money";
import { GARDEN_FRUIT_PRESETS, normalizeGardenFruitType } from "../lib/gardenFruit";
import { GARDEN_TREE_PRESETS, normalizeGardenTreeType } from "../lib/gardenTree";
import { homeHref, homeViewShellClass } from "../lib/homeViewPreference";
import { breakdownForCategory, type BreakdownRow } from "../services/inventory";
import {
  deleteCategoryCompletely,
  setCategoryAlertThreshold,
  setCategoryGardenFruitCustomId,
  setCategoryGardenFruitType,
  setCategoryGardenTreeCustomId,
  setCategoryGardenTreeType,
} from "../services/categories";
import {
  isoToDatetimeLocalInput,
  updateAddLedgerEntry,
  updateConsumeLedgerOccurrence,
} from "../services/ledgerEdit";
import { ReviewsTab } from "../components/ReviewsTab";
import type { Category, InventoryLedgerEntry } from "../types";

async function loadCategory(id: string): Promise<Category | null> {
  const c = await db.categories.get(id);
  return c ?? null;
}

async function loadTotal(id: string): Promise<number> {
  const lots = await db.stockLots.where("categoryId").equals(id).toArray();
  return lots.reduce((s, l) => s + Math.max(0, l.quantityRemaining), 0);
}

async function loadBreakdown(id: string): Promise<BreakdownRow[]> {
  return breakdownForCategory(id);
}

async function loadLedger(id: string): Promise<InventoryLedgerEntry[]> {
  const rows = await db.ledger.where("categoryId").equals(id).sortBy("occurredAt");
  return rows;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function ledgerHeaderLine(e: InventoryLedgerEntry): string {
  if (e.kind === "add") {
    return `Added · +${e.quantityDelta} unopened`;
  }
  return `Used · ${e.quantityDelta} (used)`;
}

export function CategoryDetailPage() {
  const { categoryId } = useParams();
  const id = categoryId ?? "";
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [thresholdModalOpen, setThresholdModalOpen] = useState(false);
  const [thresholdDraft, setThresholdDraft] = useState("");
  const [thresholdSaving, setThresholdSaving] = useState(false);
  const [thresholdError, setThresholdError] = useState<string | null>(null);
  const [ledgerEditEntry, setLedgerEditEntry] = useState<InventoryLedgerEntry | null>(null);
  const [ledgerEditOccurredAt, setLedgerEditOccurredAt] = useState("");
  const [ledgerEditPurchaseDate, setLedgerEditPurchaseDate] = useState("");
  const [ledgerEditBrand, setLedgerEditBrand] = useState("");
  const [ledgerEditVariation, setLedgerEditVariation] = useState("");
  const [ledgerEditQuantity, setLedgerEditQuantity] = useState("");
  const [ledgerEditPrice, setLedgerEditPrice] = useState("");
  const [ledgerEditError, setLedgerEditError] = useState<string | null>(null);
  const [ledgerEditSaving, setLedgerEditSaving] = useState(false);
  const tabParam = searchParams.get("tab");
  const tab =
    tabParam === "history" ? "history" : tabParam === "reviews" ? "reviews" : "overview";

  const category = useLiveQuery(() => (id ? loadCategory(id) : undefined), [id]);
  const total = useLiveQuery(() => (id ? loadTotal(id) : Promise.resolve(0)), [id]);
  const breakdown = useLiveQuery(() => (id ? loadBreakdown(id) : Promise.resolve([])), [id]);
  const ledgerAsc = useLiveQuery(() => (id ? loadLedger(id) : Promise.resolve([])), [id]);
  const customGardenTrees = useLiveQuery(() => db.customGardenTrees.orderBy("name").toArray(), []);
  const customGardenFruits = useLiveQuery(() => db.customGardenFruits.orderBy("name").toArray(), []);

  const gardenCustomReturn = `/categories/${encodeURIComponent(id)}?tab=overview`;

  const daysLeft =
    total !== undefined && ledgerAsc !== undefined
      ? estimateDaysUntilRestock(total, ledgerAsc)
      : null;

  if (!id) return null;

  if (
    category === undefined ||
    total === undefined ||
    breakdown === undefined ||
    ledgerAsc === undefined
  ) {
    return (
      <div className={`${homeViewShellClass()} flex items-center justify-center`}>
        <p className="text-emerald-800">Loading…</p>
      </div>
    );
  }

  if (category === null) {
    return (
      <div className={`${homeViewShellClass()} p-8 text-center`}>
        <p className="text-emerald-900">Category not found.</p>
        <Link to={homeHref()} className="mt-4 inline-block text-emerald-700 underline">
          Home
        </Link>
      </div>
    );
  }

  return (
    <div className={`${homeViewShellClass()} pb-12`}>
      <div className="sticky top-0 z-30 border-b border-emerald-200/50 bg-[#e8f5ec]/95 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-sm">
        <header>
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <Link to={homeHref()} className="text-sm font-medium text-emerald-800 hover:underline">
              ← Home
            </Link>
          </div>
          <div className="mx-auto mt-2 max-w-lg">
            <h1 className="font-serif text-2xl font-bold tracking-tight text-emerald-900">
              {category.name}
            </h1>
          </div>
        </header>

        <div className="mx-auto mt-3 grid max-w-lg grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => setSearchParams({ tab: "overview" })}
            className={`rounded-lg py-2 text-sm font-medium ${
              tab === "overview"
                ? "bg-emerald-800 text-white shadow-sm"
                : "bg-white text-emerald-800 ring-1 ring-emerald-200/80 hover:bg-emerald-50/70"
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setSearchParams({ tab: "history" })}
            className={`rounded-lg py-2 text-sm font-medium ${
              tab === "history"
                ? "bg-emerald-800 text-white shadow-sm"
                : "bg-white text-emerald-800 ring-1 ring-emerald-200/80 hover:bg-emerald-50/70"
            }`}
          >
            History
          </button>
          <button
            type="button"
            onClick={() => setSearchParams({ tab: "reviews" })}
            className={`rounded-lg py-2 text-sm font-medium ${
              tab === "reviews"
                ? "bg-emerald-800 text-white shadow-sm"
                : "bg-white text-emerald-800 ring-1 ring-emerald-200/80 hover:bg-emerald-50/70"
            }`}
          >
            Reviews
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-lg px-4 py-5">
        {tab === "overview" ? (
          <div className="space-y-5">
            <section className="rounded-2xl border border-emerald-100 bg-white/95 p-4 shadow-sm">
              <h2 className="text-sm font-semibold tracking-wide text-emerald-800/80">
                Quantity
              </h2>
              <p className="mt-2 text-2xl font-semibold text-emerald-950">{total}</p>
              <p className="text-sm text-emerald-700">unopened units in this category</p>
            </section>

            <section className="rounded-2xl border border-emerald-100 bg-white/95 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-sm font-semibold tracking-wide text-emerald-800/80">
                  Threshold
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setThresholdError(null);
                    setThresholdDraft(
                      category.alertThreshold !== undefined
                        ? String(category.alertThreshold)
                        : "",
                    );
                    setThresholdModalOpen(true);
                  }}
                  className="shrink-0 rounded-lg p-1.5 text-emerald-700 transition hover:bg-emerald-100/90 hover:text-emerald-900"
                  aria-label="Edit threshold"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-5 w-5"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                    />
                  </svg>
                </button>
              </div>
              {category.alertThreshold !== undefined ? (
                <p className="mt-2 text-sm text-emerald-800">
                  Alert when fewer than{" "}
                  <span className="font-semibold text-emerald-950">{category.alertThreshold}</span>{" "}
                  unopened.
                </p>
              ) : (
                <p className="mt-2 text-sm text-emerald-700">No alert threshold set.</p>
              )}
              <p className="mt-2 text-xs text-emerald-600">
                Low stock when total unopened is strictly below this number (e.g. threshold 1 means
                alert at 0 unopened).
              </p>
            </section>

            <section className="rounded-2xl border border-emerald-100 bg-white/95 p-4 shadow-sm">
              <h2 className="text-sm font-semibold tracking-wide text-emerald-800/80">
                Breakdown
              </h2>
              {breakdown.length === 0 ? (
                <p className="mt-2 text-sm text-emerald-700">No stock on hand.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {breakdown.map((row, i) => (
                    <li
                      key={`${row.brand}-${row.variation}-${i}`}
                      className="flex justify-between rounded-xl bg-emerald-50/80 px-3 py-2 text-sm"
                    >
                      <span className="text-emerald-900">
                        {row.brand}
                        {row.variation ? ` · ${row.variation}` : ""}
                      </span>
                      <span className="font-semibold text-emerald-950">{row.quantity}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-emerald-100 bg-white/95 p-4 shadow-sm">
              <h2 className="text-sm font-semibold tracking-wide text-emerald-800/80">
                Estimated Time Until Restock
              </h2>
              <p className="mt-2 text-sm text-emerald-800">
                {daysLeft != null ? (
                  <>
                    About <span className="font-semibold text-emerald-950">{daysLeft} day(s)</span>{" "}
                    at your recent usage rate (very rough).
                  </>
                ) : (
                  <>
                    <span className="font-medium text-emerald-950">Not enough data</span> — we need
                    at least two separate “use” events over time to estimate.
                  </>
                )}
              </p>
            </section>

            <section className="rounded-2xl border border-emerald-100 bg-white/95 p-4 shadow-sm">
              <h2 className="text-sm font-semibold tracking-wide text-emerald-800/80">
                Garden Tree Type
              </h2>
              <p className="mt-1 text-xs text-emerald-700">
                Shown on the home garden graphic. Thumbnails use the healthy artwork you upload.
              </p>
              <p className="mt-2">
                <Link
                  to={
                    category.gardenTreeCustomId
                      ? `/garden/tree-slots?custom=${encodeURIComponent(category.gardenTreeCustomId)}&return=${encodeURIComponent(gardenCustomReturn)}`
                      : `/garden/tree-slots?builtin=${normalizeGardenTreeType(category.gardenTreeType)}&return=${encodeURIComponent(gardenCustomReturn)}`
                  }
                  className="text-sm font-medium text-emerald-700 underline"
                >
                  Edit Fruit Positions
                </Link>
                <span className="text-sm text-emerald-600"> — optional</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {GARDEN_TREE_PRESETS.map((p) => {
                  const selected =
                    !category.gardenTreeCustomId &&
                    normalizeGardenTreeType(category.gardenTreeType) === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => void setCategoryGardenTreeType(category.id, p.id)}
                      className={`flex min-w-[4.5rem] flex-col items-center gap-1 rounded-xl border px-2 py-2 text-xs font-medium transition ${
                        selected
                          ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400/40"
                          : "border-emerald-100 bg-white hover:bg-emerald-50/80"
                      }`}
                    >
                      <img src={p.healthySrc} alt="" className="h-10 w-10 object-contain" />
                      {p.label}
                    </button>
                  );
                })}
                {(customGardenTrees ?? []).map((c) => {
                  const selected = category.gardenTreeCustomId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => void setCategoryGardenTreeCustomId(category.id, c.id)}
                      className={`flex min-w-[4.5rem] max-w-[6rem] flex-col items-center gap-1 rounded-xl border px-2 py-2 text-xs font-medium transition ${
                        selected
                          ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400/40"
                          : "border-emerald-100 bg-white hover:bg-emerald-50/80"
                      }`}
                    >
                      <CustomGardenThumb assetId={c.id} blob={c.imageBlob} />
                      <span className="line-clamp-2 text-center">{c.name}</span>
                    </button>
                  );
                })}
                <Link
                  to={`/garden/custom/tree?return=${encodeURIComponent(gardenCustomReturn)}`}
                  className="flex min-h-[5.5rem] min-w-[4.5rem] flex-col items-center justify-center rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 text-lg font-semibold text-emerald-700 hover:bg-emerald-100/80"
                  title="Add custom tree icon"
                >
                  +
                </Link>
              </div>
            </section>

            <section className="rounded-2xl border border-emerald-100 bg-white/95 p-4 shadow-sm">
              <h2 className="text-sm font-semibold tracking-wide text-emerald-800/80">
                Garden Fruit Type
              </h2>
              <p className="mt-1 text-xs text-emerald-700">
                Shown on the home garden graphic. Pick one fruit per category; thumbnails use the
                healthy artwork.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {GARDEN_FRUIT_PRESETS.map((p) => {
                  const selected =
                    !category.gardenFruitCustomId &&
                    normalizeGardenFruitType(category.gardenFruitType) === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => void setCategoryGardenFruitType(category.id, p.id)}
                      className={`flex min-w-[4.5rem] flex-col items-center gap-1 rounded-xl border px-2 py-2 text-xs font-medium transition ${
                        selected
                          ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400/40"
                          : "border-emerald-100 bg-white hover:bg-emerald-50/80"
                      }`}
                    >
                      <img src={p.healthySrc} alt="" className="h-10 w-10 object-contain" />
                      {p.label}
                    </button>
                  );
                })}
                {(customGardenFruits ?? []).map((c) => {
                  const selected = category.gardenFruitCustomId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => void setCategoryGardenFruitCustomId(category.id, c.id)}
                      className={`flex min-w-[4.5rem] max-w-[6rem] flex-col items-center gap-1 rounded-xl border px-2 py-2 text-xs font-medium transition ${
                        selected
                          ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400/40"
                          : "border-emerald-100 bg-white hover:bg-emerald-50/80"
                      }`}
                    >
                      <CustomGardenThumb assetId={c.id} blob={c.imageBlob} />
                      <span className="line-clamp-2 text-center">{c.name}</span>
                    </button>
                  );
                })}
                <Link
                  to={`/garden/custom/fruit?return=${encodeURIComponent(gardenCustomReturn)}`}
                  className="flex min-h-[5.5rem] min-w-[4.5rem] flex-col items-center justify-center rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 text-lg font-semibold text-emerald-700 hover:bg-emerald-100/80"
                  title="Add custom fruit icon"
                >
                  +
                </Link>
              </div>
            </section>

            <div className="space-y-3">
              <Link
                to={`/add?categoryId=${encodeURIComponent(id)}`}
                className="block w-full rounded-xl bg-emerald-600 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                Add Inventory
              </Link>
              <Link
                to={`/categories/${id}/consume`}
                className="block w-full rounded-xl border border-emerald-300 bg-white py-3 text-center text-sm font-semibold text-emerald-900 shadow-sm hover:bg-emerald-50"
              >
                Record Use (−units)
              </Link>
            </div>
          </div>
        ) : tab === "history" ? (
          <div>
            {ledgerAsc.length === 0 ? (
              <p className="text-sm text-emerald-700">No history yet.</p>
            ) : (
              <ol className="space-y-2">
                {[...ledgerAsc].reverse().map((e) => (
                  <li
                    key={e.id}
                    className="relative rounded-xl border border-emerald-100 bg-white/90 py-3 pl-4 pr-12 text-sm text-emerald-900"
                  >
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-100/90"
                      aria-label="Edit entry"
                      title="Edit"
                      onClick={() => {
                        setLedgerEditEntry(e);
                        setLedgerEditOccurredAt(isoToDatetimeLocalInput(e.occurredAt));
                        setLedgerEditError(null);
                        if (e.kind === "add") {
                          setLedgerEditPurchaseDate(e.purchaseDate ?? "");
                          setLedgerEditBrand(e.brand ?? "");
                          setLedgerEditVariation(e.variation ?? "");
                          setLedgerEditQuantity(String(e.quantityDelta));
                          setLedgerEditPrice(e.pricePerUnitTHB != null ? String(e.pricePerUnitTHB) : "");
                        }
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        className="h-5 w-5"
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                        />
                      </svg>
                    </button>
                    <div className="font-medium">{ledgerHeaderLine(e)}</div>
                    <div className="mt-1 text-xs text-emerald-600">{formatWhen(e.occurredAt)}</div>
                    {e.kind === "add" && e.purchaseDate ? (
                      <div className="mt-1 text-xs text-emerald-600">Purchase Date: {e.purchaseDate}</div>
                    ) : null}
                    {e.kind === "add" && e.brand ? (
                      <div className="mt-1 text-xs text-emerald-600">Brand: {e.brand}</div>
                    ) : null}
                    {e.kind === "add" && e.variation ? (
                      <div className="mt-1 text-xs text-emerald-600">Variation: {e.variation}</div>
                    ) : null}
                    {e.kind === "add" && e.pricePerUnitTHB != null ? (
                      <div className="mt-1 text-xs text-emerald-600">
                        Price: {formatTHB(e.pricePerUnitTHB)}/unit
                      </div>
                    ) : null}
                    {e.kind === "consume" && e.consumeFifoSummary ? (
                      <div className="mt-1 text-xs text-emerald-600">FIFO: {e.consumeFifoSummary}</div>
                    ) : null}
                    {e.kind === "consume" && !e.consumeFifoSummary && e.brand ? (
                      <div className="mt-1 text-xs text-emerald-600">Brand: {e.brand}</div>
                    ) : null}
                    {e.kind === "consume" && !e.consumeFifoSummary && e.variation ? (
                      <div className="mt-1 text-xs text-emerald-600">Variation: {e.variation}</div>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : (
          <ReviewsTab categoryId={id} />
        )}

        <div className="mt-10 border-t border-emerald-200/80 pt-8">
          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="w-full rounded-xl border border-red-200 bg-red-50 py-3 text-center text-sm font-semibold text-red-700 shadow-sm hover:bg-red-100"
          >
            Delete Category
          </button>
        </div>
      </main>

      {thresholdModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="threshold-edit-title"
          onClick={() => {
            if (!thresholdSaving) setThresholdModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-emerald-100 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="threshold-edit-title" className="text-lg font-semibold text-emerald-950">
              Edit Threshold
            </h2>
            <p className="mt-2 text-sm text-emerald-800">
              Alert when unopened units are strictly below this number. Leave blank for no alert.
            </p>
            <label className="mt-4 block">
              <span className="text-sm font-medium text-emerald-900">Threshold (unopened units)</span>
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                className="input mt-1.5 w-full"
                value={thresholdDraft}
                onChange={(e) => {
                  setThresholdDraft(e.target.value);
                  setThresholdError(null);
                }}
                placeholder="e.g. 3"
              />
            </label>
            {thresholdError ? <p className="mt-2 text-sm text-red-600">{thresholdError}</p> : null}
            <button
              type="button"
              className="mt-3 text-sm font-medium text-emerald-700 underline disabled:opacity-50"
              disabled={thresholdSaving}
              onClick={() => {
                setThresholdDraft("");
                setThresholdError(null);
              }}
            >
              Clear Threshold
            </button>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={thresholdSaving}
                onClick={() => setThresholdModalOpen(false)}
                className="rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={thresholdSaving}
                onClick={() => {
                  const trimmed = thresholdDraft.trim();
                  if (trimmed === "") {
                    setThresholdSaving(true);
                    setThresholdError(null);
                    void setCategoryAlertThreshold(id, undefined)
                      .then(() => setThresholdModalOpen(false))
                      .catch((e) =>
                        setThresholdError(e instanceof Error ? e.message : "Could not save."),
                      )
                      .finally(() => setThresholdSaving(false));
                    return;
                  }
                  const n = Math.round(Number(trimmed));
                  if (!Number.isFinite(n) || n < 0) {
                    setThresholdError("Enter a whole number ≥ 0, or leave blank to clear.");
                    return;
                  }
                  setThresholdSaving(true);
                  setThresholdError(null);
                  void setCategoryAlertThreshold(id, n)
                    .then(() => setThresholdModalOpen(false))
                    .catch((e) =>
                      setThresholdError(e instanceof Error ? e.message : "Could not save."),
                    )
                    .finally(() => setThresholdSaving(false));
                }}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {thresholdSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {ledgerEditEntry ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ledger-edit-title"
          onClick={() => {
            if (!ledgerEditSaving) setLedgerEditEntry(null);
          }}
        >
          <div
            className="max-h-[min(90dvh,40rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-emerald-100 bg-white p-5 shadow-xl"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h2 id="ledger-edit-title" className="text-lg font-semibold text-emerald-950">
              Edit history entry
            </h2>
            {ledgerEditEntry.kind === "consume" ? (
              <p className="mt-2 text-sm text-emerald-800">
                For &ldquo;used&rdquo; lines, only the date and time of the event can be changed
                (FIFO details stay as recorded).
              </p>
            ) : (
              <p className="mt-2 text-sm text-emerald-800">
                Changes apply to this add and its stock batch. You can&apos;t reduce quantity below
                what&apos;s already been consumed from this batch.
              </p>
            )}

            <label className="mt-4 block">
              <span className="text-sm font-medium text-emerald-900">Date &amp; time</span>
              <input
                type="datetime-local"
                className="input mt-1.5 w-full"
                value={ledgerEditOccurredAt}
                onChange={(ev) => setLedgerEditOccurredAt(ev.target.value)}
              />
            </label>

            {ledgerEditEntry.kind === "add" ? (
              <>
                <label className="mt-3 block">
                  <span className="text-sm font-medium text-emerald-900">Purchase date</span>
                  <input
                    type="date"
                    className="input mt-1.5 w-full"
                    value={ledgerEditPurchaseDate}
                    onChange={(ev) => setLedgerEditPurchaseDate(ev.target.value)}
                  />
                </label>
                <label className="mt-3 block">
                  <span className="text-sm font-medium text-emerald-900">Brand</span>
                  <input
                    type="text"
                    className="input mt-1.5 w-full"
                    value={ledgerEditBrand}
                    onChange={(ev) => setLedgerEditBrand(ev.target.value)}
                    placeholder="Optional"
                  />
                </label>
                <label className="mt-3 block">
                  <span className="text-sm font-medium text-emerald-900">Variation</span>
                  <input
                    type="text"
                    className="input mt-1.5 w-full"
                    value={ledgerEditVariation}
                    onChange={(ev) => setLedgerEditVariation(ev.target.value)}
                    placeholder="Optional"
                  />
                </label>
                <label className="mt-3 block">
                  <span className="text-sm font-medium text-emerald-900">Quantity added</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    className="input mt-1.5 w-full"
                    value={ledgerEditQuantity}
                    onChange={(ev) => setLedgerEditQuantity(ev.target.value)}
                  />
                </label>
                <label className="mt-3 block">
                  <span className="text-sm font-medium text-emerald-900">Price per unit (THB)</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    className="input mt-1.5 w-full"
                    value={ledgerEditPrice}
                    onChange={(ev) => setLedgerEditPrice(ev.target.value)}
                    placeholder="Optional"
                  />
                </label>
              </>
            ) : null}

            {ledgerEditError ? <p className="mt-3 text-sm text-red-600">{ledgerEditError}</p> : null}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={ledgerEditSaving}
                onClick={() => setLedgerEditEntry(null)}
                className="rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={ledgerEditSaving}
                onClick={() => {
                  if (!ledgerEditEntry) return;
                  setLedgerEditError(null);
                  const dt = new Date(ledgerEditOccurredAt);
                  if (!ledgerEditOccurredAt.trim() || Number.isNaN(dt.getTime())) {
                    setLedgerEditError("Enter a valid date and time.");
                    return;
                  }
                  const occurredAtIso = dt.toISOString();
                  if (ledgerEditEntry.kind === "consume") {
                    setLedgerEditSaving(true);
                    void updateConsumeLedgerOccurrence(ledgerEditEntry.id, occurredAtIso)
                      .then(() => setLedgerEditEntry(null))
                      .catch((err) =>
                        setLedgerEditError(err instanceof Error ? err.message : "Could not save."),
                      )
                      .finally(() => setLedgerEditSaving(false));
                    return;
                  }
                  const qty = Math.round(Number(ledgerEditQuantity));
                  if (!Number.isFinite(qty) || qty < 1) {
                    setLedgerEditError("Enter a whole quantity ≥ 1.");
                    return;
                  }
                  const priceRaw = ledgerEditPrice.trim();
                  let pricePerUnitTHB: number | undefined;
                  if (priceRaw !== "") {
                    const p = Number.parseFloat(priceRaw);
                    if (!Number.isFinite(p) || p < 0) {
                      setLedgerEditError("Enter a valid price ≥ 0 or leave blank.");
                      return;
                    }
                    pricePerUnitTHB = p;
                  }
                  setLedgerEditSaving(true);
                  void updateAddLedgerEntry(ledgerEditEntry.id, {
                    occurredAt: occurredAtIso,
                    purchaseDate: ledgerEditPurchaseDate,
                    brand: ledgerEditBrand,
                    variation: ledgerEditVariation,
                    quantity: qty,
                    pricePerUnitTHB,
                  })
                    .then(() => setLedgerEditEntry(null))
                    .catch((err) =>
                      setLedgerEditError(err instanceof Error ? err.message : "Could not save."),
                    )
                    .finally(() => setLedgerEditSaving(false));
                }}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {ledgerEditSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-category-title"
          onClick={() => {
            if (!deleteBusy) setDeleteModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-emerald-100 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-category-title" className="text-lg font-semibold text-emerald-950">
              Delete this category?
            </h2>
            <p className="mt-2 text-sm text-emerald-800">
              This will remove all inventory, history, and reviews for{" "}
              <span className="font-medium">{category.name}</span>. This cannot be undone.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={deleteBusy}
                onClick={() => setDeleteModalOpen(false)}
                className="rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 disabled:opacity-50"
              >
                No, keep it
              </button>
              <button
                type="button"
                disabled={deleteBusy}
                onClick={() => {
                  setDeleteBusy(true);
                  void deleteCategoryCompletely(id)
                    .then(() => {
                      setDeleteModalOpen(false);
                      navigate(homeHref());
                    })
                    .finally(() => setDeleteBusy(false));
                }}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteBusy ? "Deleting…" : "Yes, delete everything"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
