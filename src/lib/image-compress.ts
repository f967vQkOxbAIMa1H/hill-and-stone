// Shrinks photos in the browser before upload. Phone photos are often 3–10 MB, but serverless hosts
// (Netlify, Vercel) reject request bodies over about 4.5 MB, so every photo is resized and re-encoded as
// JPEG to fit a per-photo budget. Re-encoding also drops EXIF metadata, including GPS location.
// Browser-only: uses createImageBitmap and canvas.

export type CompressOptions = {
  /** Largest acceptable file, in bytes. */
  targetBytes: number;
  /** Longest edge for the first attempt; later attempts step down. */
  maxEdge: number;
};

/** Customer quote photos: 10 of these stay under ~3.5 MB, leaving room for the form fields. */
export const QUOTE_PHOTO: CompressOptions = { targetBytes: 350 * 1024, maxEdge: 2000 };
/** Portfolio photos: larger and sharper, uploaded one per request. */
export const PORTFOLIO_PHOTO: CompressOptions = { targetBytes: 1200 * 1024, maxEdge: 2400 };

/** Attempts in order: shrink the size, then the quality, until the photo fits. */
export function compressionSteps(maxEdge: number) {
  return [
    { edge: maxEdge, quality: 0.82 },
    { edge: Math.round(maxEdge * 0.8), quality: 0.78 },
    { edge: Math.round(maxEdge * 0.64), quality: 0.72 },
    { edge: Math.round(maxEdge * 0.5), quality: 0.66 },
  ];
}

/** Scale (w, h) down so the longer side is at most `edge`. Never scales up. */
export function fitWithin(width: number, height: number, edge: number) {
  const scale = Math.min(1, edge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

const jpegName = (name: string) => `${name.replace(/\.[^.]+$/, "") || "photo"}.jpg`;

/**
 * Returns a JPEG that fits `targetBytes`, or the original file if the browser can't decode it (the
 * server still validates it). Respects EXIF orientation, and paints transparency onto white.
 */
export async function compressImage(file: File, { targetBytes, maxEdge }: CompressOptions): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }
  try {
    let best: Blob | null = null;
    for (const step of compressionSteps(maxEdge)) {
      const { width, height } = fitWithin(bitmap.width, bitmap.height, step.edge);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", step.quality));
      if (!blob) return file;
      best = blob;
      if (blob.size <= targetBytes) break;
    }
    return best ? new File([best], jpegName(file.name), { type: "image/jpeg", lastModified: file.lastModified }) : file;
  } finally {
    bitmap.close();
  }
}
