import "server-only";
import { randomBytes } from "node:crypto";

/** 32 bytes of entropy, URL-safe. Used for public /quote/[token] links. */
export function createQuoteToken() {
  return randomBytes(32).toString("base64url");
}
