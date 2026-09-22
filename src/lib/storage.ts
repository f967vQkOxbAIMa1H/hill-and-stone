import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

// Local-disk storage for development. Files live outside /public and are never
// served directly; the admin (Phase 5) streams them through an authenticated route.
// TODO(Phase 5/deploy): add an S3/R2 driver behind the same interface using STORAGE_* env vars.
const ROOT = path.join(process.cwd(), "storage");

export type StoredFile = { storageKey: string; sizeBytes: number };

export async function putFile(prefix: string, ext: string, data: Buffer): Promise<StoredFile> {
  const storageKey = `${prefix}/${randomBytes(12).toString("hex")}.${ext}`;
  const target = resolveKey(storageKey);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, data, { flag: "wx" });
  return { storageKey, sizeBytes: data.length };
}

export async function deleteFiles(keys: string[]) {
  await Promise.allSettled(keys.map((k) => rm(resolveKey(k), { force: true })));
}

export function resolveKey(storageKey: string) {
  const target = path.resolve(ROOT, storageKey);
  if (!target.startsWith(ROOT + path.sep)) throw new Error("Invalid storage key");
  return target;
}

/** Identify an image by its bytes, not its claimed MIME type or extension. */
export function sniffImage(buf: Buffer): { mime: "image/jpeg" | "image/png" | "image/webp"; ext: string } | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return { mime: "image/png", ext: "png" };
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP")
    return { mime: "image/webp", ext: "webp" };
  return null;
}
