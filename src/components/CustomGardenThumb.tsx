import { useBlobObjectUrl } from "../lib/blobObjectUrl";

/** Preview for a stored Blob (revokes object URL on change/unmount). */
export function CustomGardenThumb(props: { assetId: string; blob: Blob; className?: string }) {
  const url = useBlobObjectUrl(props.blob, props.assetId);
  if (!url) {
    return (
      <div
        className={`rounded-md bg-emerald-100/80 ${props.className ?? "h-10 w-10"}`}
        aria-hidden
      />
    );
  }
  return (
    <img src={url} alt="" className={props.className ?? "h-10 w-10 object-contain"} />
  );
}
