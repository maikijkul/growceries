import { useEffect, useState } from "react";

/**
 * Stable object URL for Blobs loaded from IndexedDB. Dexie often yields a new Blob
 * reference on each read; depending on `blob` alone would revoke/recreate URLs every
 * render and break `<img src>` previews.
 */
export function useBlobObjectUrl(blob: Blob | undefined, stableKey: string | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  const ready = Boolean(blob) && Boolean(stableKey);
  useEffect(() => {
    if (!blob || !stableKey) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [stableKey, ready]);
  return url;
}
