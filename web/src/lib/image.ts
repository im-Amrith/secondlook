// Screenshots: the on-device model accepts only JPEG and PNG, so anything else (WebP, HEIC that
// the browser can decode, GIF) is re-encoded to PNG on the device. Large images are scaled down.
import type { ImageInput } from "@secondlook/shared";

export const ACCEPTED = ["image/jpeg", "image/png"] as const;
const MAX_SIDE = 1600;

export function isAccepted(mime: string): mime is ImageInput["mimeType"] {
  return (ACCEPTED as readonly string[]).includes(mime);
}

export function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export function splitDataUrl(url: string): { mime: string; data: string } {
  const m = /^data:([^;,]+);base64,(.*)$/.exec(url);
  if (!m) throw new Error("Not a base64 data URL");
  return { mime: m[1]!, data: m[2]! };
}

/** Returns a JPEG/PNG ImageInput plus a preview URL. */
export async function prepareImage(file: File): Promise<{ input: ImageInput; previewUrl: string }> {
  const url = await readAsDataUrl(file);
  const { mime, data } = splitDataUrl(url);
  if (isAccepted(mime) && file.size < 3_000_000) return { input: { data, mimeType: mime }, previewUrl: url };
  // Re-encode via canvas (also shrinks big screenshots).
  const img = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const out = canvas.toDataURL("image/png");
  return { input: { data: splitDataUrl(out).data, mimeType: "image/png" }, previewUrl: out };
}
