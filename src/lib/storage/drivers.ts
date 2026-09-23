// Storage drivers. No "server-only" here so CLI scripts can use them too.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectsCommand, GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export interface StorageDriver {
  readonly name: "local" | "s3";
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  /** The file's bytes, or null if it doesn't exist. */
  get(key: string): Promise<Buffer | null>;
  delete(keys: string[]): Promise<void>;
}

/** Keys are relative paths like "leads/2026-09/abc.png": no leading slash, no "..". */
export function assertSafeKey(key: string) {
  if (!key || key.startsWith("/") || key.includes("\\") || key.split("/").some((p) => p === ".." || p === "." || p === "")) {
    throw new Error(`Invalid storage key: ${key}`);
  }
}

// ─── Local disk ─────────────────────────────────────────────────────────────
// Good for development and single-server hosting with a persistent disk.

export function localDriver(root = path.join(process.cwd(), "storage")): StorageDriver & { resolve(key: string): string } {
  const resolve = (key: string) => {
    assertSafeKey(key);
    const target = path.resolve(root, key);
    if (!target.startsWith(root + path.sep)) throw new Error(`Invalid storage key: ${key}`);
    return target;
  };
  return {
    name: "local",
    resolve,
    async put(key, data) {
      const target = resolve(key);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, data, { flag: "wx" });
    },
    async get(key) {
      try {
        return await readFile(resolve(key));
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw e;
      }
    },
    async delete(keys) {
      await Promise.allSettled(keys.map((k) => rm(resolve(k), { force: true })));
    },
  };
}

// ─── S3-compatible (AWS S3, Cloudflare R2, MinIO) ───────────────────────────
// Required on serverless hosts, where the local disk doesn't persist between requests.

export type S3Config = {
  bucket: string;
  region?: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
};

export function s3Driver(cfg: S3Config): StorageDriver {
  const client = new S3Client({
    region: cfg.region || "auto",
    endpoint: cfg.endpoint || undefined,
    forcePathStyle: cfg.forcePathStyle,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
  });
  return {
    name: "s3",
    async put(key, data, contentType) {
      assertSafeKey(key);
      // Objects stay private; the app streams them through routes that check access.
      await client.send(new PutObjectCommand({ Bucket: cfg.bucket, Key: key, Body: data, ContentType: contentType }));
    },
    async get(key) {
      assertSafeKey(key);
      try {
        const res = await client.send(new GetObjectCommand({ Bucket: cfg.bucket, Key: key }));
        return res.Body ? Buffer.from(await res.Body.transformToByteArray()) : null;
      } catch (e) {
        if (e instanceof NoSuchKey || (e as { name?: string }).name === "NoSuchKey") return null;
        throw e;
      }
    },
    async delete(keys) {
      const valid = keys.filter((k) => {
        try {
          assertSafeKey(k);
          return true;
        } catch {
          return false;
        }
      });
      for (let i = 0; i < valid.length; i += 1000) {
        await client.send(
          new DeleteObjectsCommand({ Bucket: cfg.bucket, Delete: { Objects: valid.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true } }),
        );
      }
    },
  };
}

/** Picks the driver from environment variables. STORAGE_DRIVER=s3 needs the bucket and keys. */
export function driverFromEnv(env: Record<string, string | undefined> = process.env): StorageDriver {
  if ((env.STORAGE_DRIVER ?? "local") === "local") return localDriver();
  const missing = ["STORAGE_BUCKET", "STORAGE_ACCESS_KEY_ID", "STORAGE_SECRET_ACCESS_KEY"].filter((k) => !env[k]);
  if (missing.length) throw new Error(`STORAGE_DRIVER=s3 but ${missing.join(", ")} not set`);
  return s3Driver({
    bucket: env.STORAGE_BUCKET!,
    region: env.STORAGE_REGION,
    endpoint: env.STORAGE_ENDPOINT,
    accessKeyId: env.STORAGE_ACCESS_KEY_ID!,
    secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY!,
    forcePathStyle: env.STORAGE_FORCE_PATH_STYLE === "true",
  });
}
