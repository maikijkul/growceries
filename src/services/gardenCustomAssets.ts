import { db } from "../db";
import type { CustomGardenFruitAsset, CustomGardenTreeAsset } from "../types";

function newId(): string {
  return crypto.randomUUID();
}

/** ~800 KB — enough for PNG/WebP icons without filling IndexedDB. */
export const CUSTOM_GARDEN_MAX_BYTES = 800 * 1024;

export const CUSTOM_GARDEN_ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml";

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

function validateImageFile(file: File): void {
  if (!file.size || file.size > CUSTOM_GARDEN_MAX_BYTES) {
    throw new Error(`Image must be under ${Math.round(CUSTOM_GARDEN_MAX_BYTES / 1024)} KB.`);
  }
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error("Use PNG, JPEG, WebP, or SVG.");
  }
}

export async function listCustomGardenTrees(): Promise<CustomGardenTreeAsset[]> {
  return db.customGardenTrees.orderBy("name").toArray();
}

export async function listCustomGardenFruits(): Promise<CustomGardenFruitAsset[]> {
  return db.customGardenFruits.orderBy("name").toArray();
}

export async function addCustomGardenTree(
  name: string,
  healthyFile: File,
  unhealthyFile?: File | null,
): Promise<string> {
  const label = name.trim();
  if (!label) throw new Error("Name is required.");
  validateImageFile(healthyFile);
  if (unhealthyFile) validateImageFile(unhealthyFile);
  const id = newId();
  const row: CustomGardenTreeAsset = {
    id,
    name: label,
    imageBlob: healthyFile,
    mimeType: healthyFile.type,
    ...(unhealthyFile
      ? { unhealthyImageBlob: unhealthyFile, unhealthyMimeType: unhealthyFile.type }
      : {}),
    createdAt: new Date().toISOString(),
  };
  await db.customGardenTrees.add(row);
  return id;
}

export async function addCustomGardenFruit(
  name: string,
  healthyFile: File,
  unhealthyFile?: File | null,
): Promise<string> {
  const label = name.trim();
  if (!label) throw new Error("Name is required.");
  validateImageFile(healthyFile);
  if (unhealthyFile) validateImageFile(unhealthyFile);
  const id = newId();
  const row: CustomGardenFruitAsset = {
    id,
    name: label,
    imageBlob: healthyFile,
    mimeType: healthyFile.type,
    ...(unhealthyFile
      ? { unhealthyImageBlob: unhealthyFile, unhealthyMimeType: unhealthyFile.type }
      : {}),
    createdAt: new Date().toISOString(),
  };
  await db.customGardenFruits.add(row);
  return id;
}
