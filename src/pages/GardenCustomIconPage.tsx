import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  addCustomGardenFruit,
  addCustomGardenTree,
  CUSTOM_GARDEN_ACCEPT,
  CUSTOM_GARDEN_MAX_BYTES,
} from "../services/gardenCustomAssets";
import { homeHref, homeViewShellClass } from "../lib/homeViewPreference";

export function GardenCustomIconPage() {
  const { kind } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const returnTo = searchParams.get("return")?.trim() || "";

  const isTree = kind === "tree";
  const isFruit = kind === "fruit";
  const title = isTree ? "Custom Tree Icon" : isFruit ? "Custom Fruit Icon" : null;

  const [name, setName] = useState("");
  const [treeHealthyFile, setTreeHealthyFile] = useState<File | null>(null);
  const [treeUnhealthyFile, setTreeUnhealthyFile] = useState<File | null>(null);
  const [fruitHealthyFile, setFruitHealthyFile] = useState<File | null>(null);
  const [fruitUnhealthyFile, setFruitUnhealthyFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!title) {
    return (
      <div className={`${homeViewShellClass()} p-8 text-center`}>
        <p className="text-emerald-900">Invalid link.</p>
        <Link to={homeHref()} className="mt-4 inline-block text-emerald-700 underline">
          Home
        </Link>
      </div>
    );
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    setError(null);
    if (isTree) {
      if (!treeHealthyFile) {
        setError("Choose a healthy (in-stock) tree image.");
        return;
      }
    } else {
      if (!fruitHealthyFile) {
        setError("Choose a healthy (in-stock) fruit image.");
        return;
      }
    }
    setSaving(true);
    try {
      if (isTree) {
        await addCustomGardenTree(name, treeHealthyFile!, treeUnhealthyFile);
      } else {
        await addCustomGardenFruit(name, fruitHealthyFile!, fruitUnhealthyFile);
      }
      navigate(returnTo || homeHref(), { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  const maxKb = Math.round(CUSTOM_GARDEN_MAX_BYTES / 1024);

  return (
    <div
      className={`${homeViewShellClass()} pb-10 pt-[max(0.75rem,env(safe-area-inset-top))]`}
    >
      <header className="border-b border-emerald-100/90 bg-emerald-50/95 px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <Link
            to={returnTo || homeHref()}
            className="text-sm font-medium text-emerald-800 hover:underline"
          >
            Cancel
          </Link>
          <h1 className="text-lg font-semibold text-emerald-900">{title}</h1>
          <span className="w-14" />
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-5 px-4 py-5">
        <section className="rounded-2xl border border-emerald-100 bg-white/95 p-4 text-sm text-emerald-900 shadow-sm">
          <h2 className="font-semibold text-emerald-950">Before you upload</h2>
          <ul className="mt-2 list-inside list-disc space-y-1 text-emerald-800">
            <li>
              <strong>File types:</strong> PNG, JPEG, WebP, or SVG.
            </li>
            <li>
              <strong>Size limit:</strong> up to {maxKb} KB per file (keeps local storage reasonable).
            </li>
            <li>
              <strong>Tree art:</strong> design for a wide portrait frame (roughly{" "}
              <strong>220×200 px</strong> or larger @2×); keep the canopy in the upper half so fruit
              slots line up. Use a <strong>transparent background</strong> if possible. Upload a{" "}
              <strong>healthy</strong> tree (required) and optionally a <strong>low-stock</strong>{" "}
              version; if you skip the second, the app greys out the healthy tree when stock is low.
            </li>
            <li>
              <strong>Fruit art:</strong> small square icons work well (e.g.{" "}
              <strong>64×64 px</strong> or <strong>96×96 px</strong>). Upload a{" "}
              <strong>healthy</strong> version (required) and optionally a separate{" "}
              <strong>low-stock</strong> version; if you skip the second, the app greys out the
              healthy icon when stock is low.
            </li>
            <li>
              After saving, pick this icon from <strong>Garden Tree Type</strong> or{" "}
              <strong>Garden Fruit Type</strong> on the category screen (or when adding inventory).
            </li>
          </ul>
        </section>

        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-emerald-900">Name</span>
            <span className="mt-0.5 block text-xs text-emerald-700">
              Shown in the picker next to built-in presets (e.g. “Grandma’s apple”).
            </span>
            <input
              className="input mt-1.5"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My custom icon"
              required
              maxLength={80}
            />
          </label>

          {isTree ? (
            <>
              <label className="block">
                <span className="text-sm font-medium text-emerald-900">Healthy tree image</span>
                <span className="mt-0.5 block text-xs text-emerald-700">Shown when stock is okay (required).</span>
                <input
                  type="file"
                  accept={CUSTOM_GARDEN_ACCEPT}
                  required
                  className="mt-1.5 block w-full text-sm text-emerald-800 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                  onChange={(e) => setTreeHealthyFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-emerald-900">Low-stock tree image</span>
                <span className="mt-0.5 block text-xs text-emerald-700">
                  Optional. If omitted, the healthy image is shown in greyscale when stock is low.
                </span>
                <input
                  type="file"
                  accept={CUSTOM_GARDEN_ACCEPT}
                  className="mt-1.5 block w-full text-sm text-emerald-800 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                  onChange={(e) => setTreeUnhealthyFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </>
          ) : (
            <>
              <label className="block">
                <span className="text-sm font-medium text-emerald-900">Healthy fruit image</span>
                <span className="mt-0.5 block text-xs text-emerald-700">Shown when stock is okay (required).</span>
                <input
                  type="file"
                  accept={CUSTOM_GARDEN_ACCEPT}
                  required
                  className="mt-1.5 block w-full text-sm text-emerald-800 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                  onChange={(e) => setFruitHealthyFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-emerald-900">Low-stock fruit image</span>
                <span className="mt-0.5 block text-xs text-emerald-700">
                  Optional. If omitted, the healthy image is shown in greyscale when stock is low.
                </span>
                <input
                  type="file"
                  accept={CUSTOM_GARDEN_ACCEPT}
                  className="mt-1.5 block w-full text-sm text-emerald-800 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                  onChange={(e) => setFruitUnhealthyFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </>
          )}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save icon"}
          </button>
        </form>
      </main>
    </div>
  );
}
