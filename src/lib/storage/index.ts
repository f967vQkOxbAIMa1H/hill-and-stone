import "server-only";
import { randomBytes } from "node:crypto";
import { driverFromEnv, localDriver, type StorageDriver } from "./drivers";

// One driver per server process, chosen by STORAGE_DRIVER (local disk by default, or S3/R2).
let driver: StorageDriver | null = null;
const storage = () => (driver ??= driverFromEnv());

export type StoredFile = { storageKey: string; sizeBytes: number };

/** Stores a file under a random name: user-supplied filenames never reach the storage path. */
export async function putFile(prefix: string, ext: string, data: Buffer, contentType: string): Promise<StoredFile> {
  const storageKey = `${prefix}/${randomBytes(12).toString("hex")}.${ext}`;
  await storage().put(storageKey, data, contentType);
  return { storageKey, sizeBytes: data.length };
}

export const readStoredFile = (key: string) => storage().get(key);

export async function deleteFiles(keys: string[]) {
  if (keys.length) await storage().delete(keys).catch((e) => console.error("deleteFiles failed", e));
}

/** Local-disk path for a key (throws on unsafe keys). Used by tests and local tooling. */
export const resolveKey = (key: string) => localDriver().resolve(key);

/** Identify an image by its bytes, not its claimed MIME type or extension. */
export function sniffImage(buf: Buffer): { mime: "image/jpeg" | "image/png" | "image/webp"; ext: string } | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return { mime: "image/png", ext: "png" };
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP")
    return { mime: "image/webp", ext: "webp" };
  return null;
}
