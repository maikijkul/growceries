import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { db } from "../db";
import { GARDEN_FRUIT_PRESETS } from "../lib/gardenFruit";
import { GARDEN_TREE_PRESETS, normalizeGardenTreeType } from "../lib/gardenTree";
import { homeHref, homeViewShellClass } from "../lib/homeViewPreference";
import { armBlockHomeListClicks } from "../lib/afterAddNavigation";
import { normalizeCategoryKey } from "../lib/categoryKey";
import {
  parseAddInventoryForm,
  validateAddInventoryForm,
  type AddInventoryFieldErrors,
  type AddInventoryFormValues,
} from "../lib/addInventoryValidation";
import { CustomGardenThumb } from "../components/CustomGardenThumb";
import { addInventory } from "../services/categories";

const CATEGORY_LIST_ID = "growceries-categories";
const BRAND_LIST_ID = "growceries-add-brands";
const VARIATION_LIST_ID = "growceries-add-variations";
const NAV_DELAY_MS = 420;

function emptyForm(): AddInventoryFormValues {
  return {
    purchaseDate: new Date().toISOString().slice(0, 10),
    category: "",
    brand: "",
    variation: "",
    quantity: "",
    pricePerUnitTHB: "",
    alertThreshold: "",
    gardenTreeType: "",
    gardenFruitType: "",
    gardenTreeCustomId: "",
    gardenFruitCustomId: "",
  };
}

export function AddInventoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [values, setValues] = useState<AddInventoryFormValues>(emptyForm);
  const [errors, setErrors] = useState<AddInventoryFieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [thresholdTouched, setThresholdTouched] = useState(false);
  const prevCategoryNorm = useRef("");
  const lastAppliedThresholdNorm = useRef("");
  const categoryPrefillAppliedRef = useRef<string | null>(null);

  const categories = useLiveQuery(() => db.categories.orderBy("name").toArray(), []);
  const customGardenTrees = useLiveQuery(() => db.customGardenTrees.orderBy("name").toArray(), []);
  const customGardenFruits = useLiveQuery(() => db.customGardenFruits.orderBy("name").toArray(), []);

  const addPageReturnUrl = `/add${location.search}`;

  const matchedCategory = useMemo(
    () => categories?.find((c) => normalizeCategoryKey(values.category) === c.normalized),
    [categories, values.category],
  );

  const categoryLots = useLiveQuery(
    () =>
      matchedCategory
        ? db.stockLots.where("categoryId").equals(matchedCategory.id).toArray()
        : Promise.resolve([]),
    [matchedCategory?.id],
  );

  const brandSuggestions = useMemo(() => {
    const s = new Set<string>();
    for (const l of categoryLots ?? []) {
      const b = l.brand.trim();
      if (b) s.add(b);
    }
    return [...s].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [categoryLots]);

  const variationSuggestions = useMemo(() => {
    const s = new Set<string>();
    const want = values.brand.trim().toLowerCase();
    for (const l of categoryLots ?? []) {
      if (want && l.brand.trim().toLowerCase() !== want) continue;
      const v = l.variation.trim();
      if (v) s.add(v);
    }
    return [...s].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [categoryLots, values.brand]);

  useEffect(() => {
    const n = normalizeCategoryKey(values.category);
    if (n !== prevCategoryNorm.current) {
      prevCategoryNorm.current = n;
      setThresholdTouched(false);
      lastAppliedThresholdNorm.current = "";
    }
  }, [values.category]);

  useEffect(() => {
    if (thresholdTouched || !categories) return;
    const n = normalizeCategoryKey(values.category);
    if (!n) return;
    const match = categories.find((c) => c.normalized === n);
    if (!match || lastAppliedThresholdNorm.current === n) return;
    lastAppliedThresholdNorm.current = n;
    setValues((v) => ({
      ...v,
      alertThreshold:
        match.alertThreshold !== undefined ? String(match.alertThreshold) : "",
    }));
  }, [values.category, categories, thresholdTouched]);

  const categoryIdPrefill = searchParams.get("categoryId");
  useEffect(() => {
    if (!categories?.length || !categoryIdPrefill) return;
    if (categoryPrefillAppliedRef.current === categoryIdPrefill) return;
    const match = categories.find((c) => c.id === categoryIdPrefill);
    if (!match) return;
    categoryPrefillAppliedRef.current = categoryIdPrefill;
    setValues((v) => ({ ...v, category: match.name }));
  }, [categories, categoryIdPrefill]);

  function update<K extends keyof AddInventoryFormValues>(
    key: K,
    value: AddInventoryFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleDone(ev: MouseEvent<HTMLButtonElement>) {
    ev.preventDefault();
    ev.stopPropagation();

    const next = validateAddInventoryForm(values);
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      const parsed = parseAddInventoryForm(values);
      const treeCustom = values.gardenTreeCustomId.trim();
      const fruitCustom = values.gardenFruitCustomId.trim();
      await addInventory({
        purchaseDate: parsed.purchaseDate,
        categoryName: parsed.categoryName,
        brand: parsed.brand,
        variation: parsed.variation,
        quantity: parsed.quantity,
        pricePerUnitTHB: parsed.pricePerUnitTHB,
        alertThreshold: parsed.alertThreshold,
        gardenTreeType: treeCustom ? undefined : parsed.gardenTreeType,
        gardenFruitType: fruitCustom ? undefined : parsed.gardenFruitType,
        gardenTreeCustomId: treeCustom || undefined,
        gardenFruitCustomId: fruitCustom || undefined,
      });
      armBlockHomeListClicks();
      await new Promise((r) => setTimeout(r, NAV_DELAY_MS));
      navigate(homeHref(), { replace: true });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={`${homeViewShellClass()} pb-10 pt-[max(0.75rem,env(safe-area-inset-top))]`}
    >
      <header className="sticky top-0 z-10 border-b border-emerald-100/90 bg-emerald-50/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto grid max-w-lg grid-cols-[1fr_auto_1fr] items-center gap-3">
          <Link
            to={homeHref()}
            className="justify-self-start rounded-lg px-2 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100/80"
          >
            Cancel
          </Link>
          <h1 className="text-center text-lg font-semibold text-emerald-900">Add Inventory</h1>
          <span className="justify-self-end" aria-hidden />
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 px-4 py-5">
        <Field
          label="Date"
          required
          error={errors.purchaseDate}
          input={
            <input
              type="date"
              className="input"
              value={values.purchaseDate}
              onChange={(e) => update("purchaseDate", e.target.value)}
            />
          }
        />
        <Field
          label="Category"
          required
          hint="Choose an existing category or type a new one (e.g. Shampoo, Toothpaste)."
          error={errors.category}
          input={
            <>
              <input
                className="input"
                list={CATEGORY_LIST_ID}
                value={values.category}
                onChange={(e) => update("category", e.target.value)}
                autoComplete="off"
              />
              <datalist id={CATEGORY_LIST_ID}>
                {(categories ?? []).map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </>
          }
        />
        <Field
          label="Brand"
          hint="Optional. Choose a previous value for this category or type a new one."
          input={
            <>
              <input
                className="input"
                list={BRAND_LIST_ID}
                value={values.brand}
                onChange={(e) => update("brand", e.target.value)}
                autoComplete="off"
                placeholder="Type or pick from list"
              />
              <datalist id={BRAND_LIST_ID}>
                {brandSuggestions.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </>
          }
        />
        <Field
          label="Variation"
          hint="Optional — size, scent, formula, etc. Suggestions follow the brand field when the category matches."
          input={
            <>
              <input
                className="input"
                list={VARIATION_LIST_ID}
                value={values.variation}
                onChange={(e) => update("variation", e.target.value)}
                autoComplete="off"
                placeholder="Type or pick from list"
              />
              <datalist id={VARIATION_LIST_ID}>
                {variationSuggestions.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </>
          }
        />
        <Field
          label="Quantity (Unopened Units)"
          required
          error={errors.quantity}
          input={
            <input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              className="input"
              value={values.quantity}
              onChange={(e) => update("quantity", e.target.value)}
            />
          }
        />
        <Field
          label="Price Per Unit (THB)"
          hint="Optional. Whole baht only (rounded when saved)."
          error={errors.pricePerUnitTHB}
          input={
            <input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              className="input"
              value={values.pricePerUnitTHB}
              onChange={(e) => update("pricePerUnitTHB", e.target.value)}
            />
          }
        />
        <Field
          label="Alert Threshold"
          hint="Optional — low stock when total unopened in this category is strictly below this number. There is only one alert threshold per category; saving updates it for the whole category. When you pick an existing category, this field defaults to the current threshold."
          error={errors.alertThreshold}
          input={
            <input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              className="input"
              value={values.alertThreshold}
              onChange={(e) => {
                setThresholdTouched(true);
                update("alertThreshold", e.target.value);
              }}
            />
          }
        />
        <Field
          label="Garden Tree Type"
          hint="Optional — used in the graphic garden view. Leave blank to assign a random tree when you save. Custom icons use the + button."
          error={errors.gardenTreeType}
          input={
            <>
            <div className="flex flex-wrap gap-2">
              {GARDEN_TREE_PRESETS.map((p) => {
                const selected =
                  !values.gardenTreeCustomId && values.gardenTreeType === String(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      update("gardenTreeCustomId", "");
                      update("gardenTreeType", selected ? "" : String(p.id));
                    }}
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
                const selected = values.gardenTreeCustomId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      update("gardenTreeType", "");
                      update("gardenTreeCustomId", selected ? "" : c.id);
                    }}
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
                to={`/garden/custom/tree?return=${encodeURIComponent(addPageReturnUrl)}`}
                className="flex min-h-[5.5rem] min-w-[4.5rem] flex-col items-center justify-center rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 text-lg font-semibold text-emerald-700 hover:bg-emerald-100/80"
                title="Add custom tree icon"
              >
                +
              </Link>
            </div>
            <p className="mt-3 text-sm">
              <Link
                to={
                  values.gardenTreeCustomId.trim()
                    ? `/garden/tree-slots?custom=${encodeURIComponent(values.gardenTreeCustomId.trim())}&return=${encodeURIComponent(addPageReturnUrl)}`
                    : `/garden/tree-slots?builtin=${normalizeGardenTreeType(
                        values.gardenTreeType.trim() === ""
                          ? undefined
                          : Number(values.gardenTreeType),
                      )}&return=${encodeURIComponent(addPageReturnUrl)}`
                }
                className="font-medium text-emerald-700 underline"
              >
                Edit Fruit Positions
              </Link>
              <span className="text-emerald-600"> — optional</span>
            </p>
            </>
          }
        />
        <Field
          label="Garden Fruit Type"
          hint="Optional — used in the graphic garden view. Leave blank to assign a random fruit when you save. Custom icons use the + button."
          error={errors.gardenFruitType}
          input={
            <div className="flex flex-wrap gap-2">
              {GARDEN_FRUIT_PRESETS.map((p) => {
                const selected =
                  !values.gardenFruitCustomId && values.gardenFruitType === String(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      update("gardenFruitCustomId", "");
                      update("gardenFruitType", selected ? "" : String(p.id));
                    }}
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
                const selected = values.gardenFruitCustomId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      update("gardenFruitType", "");
                      update("gardenFruitCustomId", selected ? "" : c.id);
                    }}
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
                to={`/garden/custom/fruit?return=${encodeURIComponent(addPageReturnUrl)}`}
                className="flex min-h-[5.5rem] min-w-[4.5rem] flex-col items-center justify-center rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 text-lg font-semibold text-emerald-700 hover:bg-emerald-100/80"
                title="Add custom fruit icon"
              >
                +
              </Link>
            </div>
          }
        />
        <div className="pt-4">
          <button
            type="button"
            disabled={saving}
            onClick={(e) => void handleDone(e)}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Done"}
          </button>
        </div>
      </main>
    </div>
  );
}

function Field(props: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  input: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-emerald-900">
        {props.label}
        {props.required ? <span className="text-red-600"> *</span> : null}
      </span>
      {props.hint ? (
        <span className="mt-0.5 block text-xs text-emerald-700/85">{props.hint}</span>
      ) : null}
      <div className="mt-1.5">{props.input}</div>
      {props.error ? <p className="mt-1 text-sm text-red-600">{props.error}</p> : null}
    </label>
  );
}
