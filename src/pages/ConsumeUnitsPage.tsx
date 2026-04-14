import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { homeHref, homeViewShellClass } from "../lib/homeViewPreference";
import { db } from "../db";
import {
  availableUnitsMatching,
  buildBrandDropdownOptions,
  buildVariationDropdownOptions,
  breakdownForCategory,
  consumeUnits,
} from "../services/inventory";

const NAV_DELAY_MS = 280;

async function totalUnopenedFor(categoryId: string): Promise<number> {
  const lots = await db.stockLots.where("categoryId").equals(categoryId).toArray();
  return lots.reduce((s, l) => s + Math.max(0, l.quantityRemaining), 0);
}

export function ConsumeUnitsPage() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const id = categoryId ?? "";

  const category = useLiveQuery(async () => {
    if (!id) return null;
    const c = await db.categories.get(id);
    return c ?? null;
  }, [id]);
  const total = useLiveQuery(async () => (id ? totalUnopenedFor(id) : 0), [id]);
  const lots = useLiveQuery(async () => {
    if (!id) return [];
    return await db.stockLots.where("categoryId").equals(id).toArray();
  }, [id]);
  const breakdown = useLiveQuery(async () => (id ? breakdownForCategory(id) : []), [id]);

  const [qty, setQty] = useState("1");
  const [brand, setBrand] = useState("");
  const [variation, setVariation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const brandOptions = useMemo(
    () =>
      lots && lots.length > 0
        ? buildBrandDropdownOptions(lots)
        : [{ value: "", label: "Any (oldest first)" }],
    [lots],
  );
  const variationOptions = useMemo(
    () =>
      lots && lots.length > 0
        ? buildVariationDropdownOptions(lots, brand)
        : [{ value: "", label: "Any (oldest first)" }],
    [lots, brand],
  );

  const availableForSelection = useMemo(() => {
    if (!lots || lots.length === 0) return 0;
    return availableUnitsMatching(lots, brand, variation);
  }, [lots, brand, variation]);

  const maxQty = total ?? 0;
  const parsedQty = useMemo(() => {
    const t = qty.trim();
    if (t === "") return null;
    const n = Math.round(Number(t));
    if (!Number.isFinite(n)) return null;
    return n;
  }, [qty]);
  /** Valid quantity for submit (≥ 1); `null` if empty or invalid. */
  const qtyForSubmit = parsedQty !== null && parsedQty >= 1 ? parsedQty : null;

  const maxForInputs = useMemo(() => {
    if (!lots?.length) return maxQty;
    if (brand === "" && variation === "") return maxQty;
    return availableForSelection;
  }, [lots, brand, variation, maxQty, availableForSelection]);

  useEffect(() => {
    if (!variationOptions.some((o) => o.value === variation)) {
      setVariation("");
    }
  }, [brand, variationOptions, variation]);

  useEffect(() => {
    if (maxForInputs < 1) return;
    setQty((q) => {
      const t = q.trim();
      if (t === "") return q;
      const n = Math.round(Number(t));
      if (!Number.isFinite(n) || n < 1) return q;
      return String(Math.min(n, maxForInputs));
    });
  }, [maxForInputs, brand, variation]);

  async function handleConfirm(ev: MouseEvent<HTMLButtonElement>) {
    ev.preventDefault();
    ev.stopPropagation();
    setError(null);
    if (!id) return;
    if (qtyForSubmit === null) {
      setError("Enter at least 1 unit (0 is not allowed).");
      return;
    }
    if (qtyForSubmit > maxForInputs) {
      setError(
        `Insufficient quantity. Only ${maxForInputs} unit(s) available for the brand/variation you chose.`,
      );
      return;
    }
    setSaving(true);
    try {
      await consumeUnits({
        categoryId: id,
        quantity: qtyForSubmit,
        brandSpec: brand,
        variationSpec: variation,
      });
      await new Promise((r) => setTimeout(r, NAV_DELAY_MS));
      navigate(homeHref(), { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update stock.");
    } finally {
      setSaving(false);
    }
  }

  if (!id) return null;

  if (category === undefined || total === undefined || breakdown === undefined) {
    return (
      <div className={`${homeViewShellClass()} flex items-center justify-center`}>
        <p className="text-emerald-800">Loading…</p>
      </div>
    );
  }

  if (category === null) {
    return (
      <div className="p-6 text-center">
        <p className="text-emerald-900">Category not found.</p>
        <Link to={homeHref()} className="mt-4 inline-block text-emerald-700 underline">
          Home
        </Link>
      </div>
    );
  }

  if (maxQty <= 0) {
    return (
      <div className={`${homeViewShellClass()} px-4 py-8`}>
        <p className="text-center text-emerald-900">No unopened units left in this category.</p>
        <div className="mt-4 text-center">
          <Link to={`/categories/${id}`} className="text-emerald-700 underline">
            Back to Category
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${homeViewShellClass()} pb-10 pt-[max(0.75rem,env(safe-area-inset-top))]`}
    >
      <header className="border-b border-emerald-100/90 bg-emerald-50/95 px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <Link
            to={homeHref()}
            className="text-sm font-medium text-emerald-800 hover:underline"
          >
            Cancel
          </Link>
          <h1 className="text-lg font-semibold text-emerald-900">Use Stock</h1>
          <span className="w-14" />
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 px-4 py-5">
        <p className="text-sm text-emerald-800">
          <span className="font-semibold text-emerald-950">{category.name}</span> —{" "}
          <span className="font-medium">{maxQty}</span> unopened in category ·{" "}
          <span className="font-medium">{availableForSelection}</span> match your brand/variation
          selection.
        </p>

        <section className="rounded-2xl border border-emerald-100 bg-white/95 p-4 shadow-sm">
          <h2 className="text-sm font-semibold tracking-wide text-emerald-800/80">
            Breakdown
          </h2>
          {!breakdown || breakdown.length === 0 ? (
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

        <p className="rounded-xl bg-white/90 p-3 text-xs text-emerald-800 ring-1 ring-emerald-100">
          Choose <strong>Any (oldest first)</strong> for both to use oldest lots across the category.
          If you pick a specific brand or variation, units are taken{" "}
          <strong>only</strong> from matching stock (quantities are shown in each menu). You cannot
          take more than what matches.
        </p>

        <label className="block">
          <span className="text-sm font-medium text-emerald-900">Brand</span>
          <span className="mt-0.5 block text-xs text-emerald-700">
            Counts = unopened units in stock for that brand.
          </span>
          <select
            className="input mt-1.5"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          >
            {brandOptions.map((o) => (
              <option key={`b-${o.value || "any"}`} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-emerald-900">Variation</span>
          <span className="mt-0.5 block text-xs text-emerald-700">
            Counts for each variation given your brand choice.
          </span>
          <select
            className="input mt-1.5"
            value={variation}
            onChange={(e) => setVariation(e.target.value)}
          >
            {variationOptions.map((o) => (
              <option key={`v-${o.value || "any"}`} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-emerald-900">How many units?</span>
          <span className="mt-0.5 block text-xs text-emerald-700">
            Max {maxForInputs} for the current brand/variation selection.
          </span>
          <input
            type="number"
            min={1}
            max={maxForInputs}
            step={1}
            inputMode="numeric"
            className="input mt-1.5"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="button"
          disabled={saving}
          onClick={(e) => void handleConfirm(e)}
          className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Confirm"}
        </button>
      </main>
    </div>
  );
}
