import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import type { BrandVariationReview } from "../types";
import { loadReviewCardsForCategory, upsertReview } from "../services/reviews";

type Props = {
  categoryId: string;
};

function StarsDisplay({ rating }: { rating: number }) {
  const unrated = rating <= 0;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className={`flex gap-0.5 text-lg leading-none ${
          unrated ? "text-emerald-200" : "text-amber-500"
        }`}
        aria-hidden
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={
              unrated ? "opacity-70" : n <= rating ? "opacity-100" : "opacity-25"
            }
          >
            ★
          </span>
        ))}
      </div>
      {unrated ? (
        <span className="text-xs font-medium text-emerald-500">Unrated</span>
      ) : null}
    </div>
  );
}

export function ReviewsTab(props: Props) {
  const [editing, setEditing] = useState<BrandVariationReview | null>(null);
  const cards = useLiveQuery(
    () =>
      props.categoryId
        ? loadReviewCardsForCategory(props.categoryId)
        : Promise.resolve([] as BrandVariationReview[]),
    [props.categoryId],
  );

  if (cards === undefined) {
    return <p className="text-sm text-emerald-700">Loading…</p>;
  }

  if (cards.length === 0) {
    return (
      <p className="text-sm text-emerald-700">
        No brand·variation pairs yet. Add Inventory in this category to review products here.
      </p>
    );
  }

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2">
        {cards.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => setEditing({ ...row })}
              className="w-full rounded-2xl border border-emerald-100 bg-white/95 p-4 text-left shadow-sm ring-emerald-400/30 transition hover:bg-emerald-50/80 hover:ring-2"
            >
              <p className="font-medium text-emerald-950">
                {row.brand}
                <span className="text-emerald-900"> · </span>
                <span className="font-normal text-emerald-900">{row.variation}</span>
              </p>
              <div className="mt-2">
                <StarsDisplay rating={row.rating} />
              </div>
              {row.remarks ? (
                <p className="mt-2 line-clamp-3 text-sm text-emerald-800">{row.remarks}</p>
              ) : (
                <p className="mt-2 text-sm italic text-emerald-600">No remarks</p>
              )}
            </button>
          </li>
        ))}
      </ul>

      {editing ? (
        <ReviewEditModal
          row={editing}
          onClose={() => setEditing(null)}
          onSave={async (next) => {
            await upsertReview(next);
            setEditing(null);
          }}
        />
      ) : null}
    </>
  );
}

function ReviewEditModal(props: {
  row: BrandVariationReview;
  onClose: () => void;
  onSave: (row: BrandVariationReview) => Promise<void>;
}) {
  const [rating, setRating] = useState(props.row.rating);
  const [remarks, setRemarks] = useState(props.row.remarks);
  const [saving, setSaving] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-edit-title"
      onClick={props.onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-emerald-100 bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="review-edit-title" className="text-lg font-semibold text-emerald-950">
          {props.row.brand} · {props.row.variation}
        </h2>

        <p className="mt-4 text-sm font-medium text-emerald-900">Rating</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="flex gap-1" role="group" aria-label="Stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`rounded px-1.5 py-1 text-2xl leading-none transition ${
                  n <= rating ? "text-amber-500" : "text-emerald-200"
                }`}
                onClick={() => setRating(n)}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
              >
                ★
              </button>
            ))}
          </div>
          <button
            type="button"
            className="text-sm font-medium text-emerald-700 underline"
            onClick={() => setRating(0)}
          >
            Clear Rating
          </button>
        </div>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-emerald-900">Remarks</span>
          <textarea
            className="input mt-1.5 min-h-[100px] w-full resize-y"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Optional notes…"
            rows={4}
          />
        </label>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            className="flex-1 rounded-xl border border-emerald-200 py-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-50"
            disabled={saving}
            onClick={props.onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            disabled={saving}
            onClick={() => {
              setSaving(true);
              void (async () => {
                try {
                  await props.onSave({
                    ...props.row,
                    rating,
                    remarks,
                  });
                } finally {
                  setSaving(false);
                }
              })();
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
