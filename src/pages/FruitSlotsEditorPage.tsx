import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { db } from "../db";
import { GARDEN_FRUIT_PRESETS } from "../lib/gardenFruit";
import { GARDEN_TREE_PRESETS, normalizeGardenTreeType, type GardenFruitSlotPosition } from "../lib/gardenTree";
import { homeHref, homeViewShellClass } from "../lib/homeViewPreference";
import {
  defaultBuiltinSlots,
  defaultCustomTreeSlots,
  getBuiltinSlotOverride,
  setBuiltinSlotOverride,
  setCustomGardenTreeFruitSlots,
} from "../services/gardenSlots";
import { useBlobObjectUrl } from "../lib/blobObjectUrl";
import type { CustomGardenTreeAsset } from "../types";

function parsePctString(s: string): number {
  const n = parseFloat(String(s).trim().replace(/%$/, ""));
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
}

function slotsToNums(slots: readonly GardenFruitSlotPosition[]): { left: number; top: number }[] {
  return slots.map((p) => ({
    left: parsePctString(p.left),
    top: parsePctString(p.top),
  }));
}

function numsToSlots(nums: { left: number; top: number }[]): GardenFruitSlotPosition[] {
  return nums.map((n) => ({
    left: `${Math.round(n.left * 100) / 100}%`,
    top: `${Math.round(n.top * 100) / 100}%`,
  }));
}

export function FruitSlotsEditorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const returnTo = searchParams.get("return")?.trim() || "";
  const builtinRaw = searchParams.get("builtin");
  const customId = searchParams.get("custom")?.trim() || "";

  const mode = useMemo(() => {
    const hasBuiltin = builtinRaw !== null && builtinRaw !== "";
    const hasCustom = customId !== "";
    if (hasBuiltin === hasCustom) return null;
    if (hasBuiltin) {
      const n = Number.parseInt(builtinRaw ?? "", 10);
      if (!Number.isFinite(n) || n < 0 || n > 4) return null;
      return { kind: "builtin" as const, treeType: n };
    }
    return { kind: "custom" as const, assetId: customId };
  }, [builtinRaw, customId]);

  const customRow = useLiveQuery(
    async (): Promise<CustomGardenTreeAsset | null> => {
      if (mode?.kind !== "custom") return null;
      const row = await db.customGardenTrees.get(mode.assetId);
      return row ?? null;
    },
    [mode],
  );

  const treeType = mode?.kind === "builtin" ? mode.treeType : 0;
  const builtinPreset = GARDEN_TREE_PRESETS[normalizeGardenTreeType(treeType)]!;

  const customBlobForPreview =
    mode?.kind === "custom" && customRow ? customRow.imageBlob : undefined;
  const customTreePreviewKey =
    mode?.kind === "custom" && customRow ? customRow.id : undefined;
  const customTreeUrl = useBlobObjectUrl(customBlobForPreview, customTreePreviewKey);
  const treeImageSrc =
    mode?.kind === "builtin" ? builtinPreset.healthySrc : customTreeUrl;

  const [positions, setPositions] = useState<{ left: number; top: number }[] | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const fruitPreviewSrc = GARDEN_FRUIT_PRESETS[0]!.healthySrc;

  useEffect(() => {
    if (!mode) return;
    let cancelled = false;
    void (async () => {
      if (mode.kind === "builtin") {
        const ov = await getBuiltinSlotOverride(mode.treeType);
        const base = ov?.slots ?? [...defaultBuiltinSlots(mode.treeType)];
        if (!cancelled) setPositions(slotsToNums(base));
        return;
      }
      if (customRow === undefined) return;
      if (customRow === null) {
        if (!cancelled) setPositions(null);
        return;
      }
      const base = customRow.fruitSlotPositions ?? [...defaultCustomTreeSlots()];
      if (!cancelled) setPositions(slotsToNums(base));
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, customRow]);

  useEffect(() => {
    if (dragIndex === null) return;
    const onMove = (e: PointerEvent) => {
      const el = stageRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const left = Math.max(0, Math.min(100, x));
      const top = Math.max(0, Math.min(100, y));
      setPositions((prev) => {
        if (!prev) return prev;
        const next = [...prev];
        next[dragIndex] = { left, top };
        return next;
      });
    };
    const end = () => setDragIndex(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [dragIndex]);

  const goBack = useCallback(() => {
    navigate(returnTo || homeHref(), { replace: true });
  }, [navigate, returnTo]);

  const handleSave = () => {
    if (!mode || !positions) return;
    setError(null);
    setSaving(true);
    const slots = numsToSlots(positions);
    void (async () => {
      try {
        if (mode.kind === "builtin") {
          await setBuiltinSlotOverride(mode.treeType, slots);
        } else {
          await setCustomGardenTreeFruitSlots(mode.assetId, slots);
        }
        goBack();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save.");
      } finally {
        setSaving(false);
      }
    })();
  };

  const handleReset = () => {
    if (!mode) return;
    setError(null);
    setSaving(true);
    void (async () => {
      try {
        if (mode.kind === "builtin") {
          await setBuiltinSlotOverride(mode.treeType, null);
        } else {
          await setCustomGardenTreeFruitSlots(mode.assetId, null);
        }
        if (mode.kind === "builtin") {
          setPositions(slotsToNums([...defaultBuiltinSlots(mode.treeType)]));
        } else {
          setPositions(slotsToNums([...defaultCustomTreeSlots()]));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not reset.");
      } finally {
        setSaving(false);
      }
    })();
  };

  if (!mode) {
    return (
      <div className={`${homeViewShellClass()} p-8 text-center`}>
        <p className="text-emerald-900">Invalid link. Use ?builtin=0–4 or ?custom=&lt;tree id&gt;.</p>
        <Link to={homeHref()} className="mt-4 inline-block text-emerald-700 underline">
          Home
        </Link>
      </div>
    );
  }

  if (mode.kind === "custom" && customRow === undefined) {
    return (
      <div className={`${homeViewShellClass()} flex items-center justify-center`}>
        <p className="text-emerald-800">Loading…</p>
      </div>
    );
  }

  if (mode.kind === "custom" && customRow === null) {
    return (
      <div className={`${homeViewShellClass()} p-8 text-center`}>
        <p className="text-emerald-900">Custom tree not found.</p>
        <Link to={returnTo || homeHref()} className="mt-4 inline-block text-emerald-700 underline">
          Back
        </Link>
      </div>
    );
  }

  if (!positions || !treeImageSrc) {
    return (
      <div className={`${homeViewShellClass()} flex items-center justify-center`}>
        <p className="text-emerald-800">Loading…</p>
      </div>
    );
  }

  const customAsset = mode.kind === "custom" && customRow ? customRow : null;
  const title =
    mode.kind === "builtin"
      ? `Fruit positions — ${builtinPreset.label}`
      : `Fruit positions — ${customAsset!.name}`;

  return (
    <div
      className={`${homeViewShellClass()} pb-10`}
    >
      <header className="border-b border-emerald-200/50 bg-[#e8f5ec]/95 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2">
          <button
            type="button"
            onClick={goBack}
            className="text-sm font-medium text-emerald-800 hover:underline"
          >
            Cancel
          </button>
          <h1 className="min-w-0 flex-1 text-center font-serif text-lg font-bold leading-tight tracking-tight text-emerald-900">
            {title}
          </h1>
          <span className="w-14 shrink-0" />
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 px-4 py-5">
        <p className="text-sm text-emerald-800">
          Drag the five fruit markers. The preview uses the same width as one home garden tile so
          positions match the graphic view. Save applies for{" "}
          {mode.kind === "builtin" ? "every category using this tree type" : "this custom tree"}.
        </p>

        {/*
          Match GardenGraphicView: grid-cols-3 gap-2 sm:gap-3 + garden-category-tile p-2.
          Stage width = (mainContent - 2*gap) / 3 - tileHorizontalPadding
        */}
        <div className="w-full">
          <div
            className="mx-auto w-[calc((100%-1rem)/3-1rem)] touch-none sm:w-[calc((100%-1.5rem)/3-1rem)]"
          >
            <div
              ref={stageRef}
              className="relative mx-auto w-full min-h-[130px] sm:min-h-[144px]"
            >
              <img
                src={treeImageSrc}
                alt=""
                className="pointer-events-none absolute bottom-[4%] left-0 right-0 z-0 mx-auto h-auto max-h-[92%] w-full select-none object-contain object-bottom"
              />
              {positions.map((pos, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Fruit slot ${i + 1}`}
                  className={`absolute z-20 h-5 w-5 cursor-grab touch-none active:cursor-grabbing sm:h-6 sm:w-6 ${
                    dragIndex === i ? "z-30" : ""
                  }`}
                  style={{
                    left: `${pos.left}%`,
                    top: `${pos.top}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setDragIndex(i);
                  }}
                >
                  <img
                    src={fruitPreviewSrc}
                    alt=""
                    className="h-full w-full object-contain drop-shadow-md"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-between">
          <button
            type="button"
            disabled={saving}
            onClick={handleReset}
            className="rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 disabled:opacity-50"
          >
            Reset To Defaults
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </main>
    </div>
  );
}
