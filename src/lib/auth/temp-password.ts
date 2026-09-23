import { randomInt } from "node:crypto";

// Easy to read aloud or type from a note: no 0/O, 1/l/i. About 59 bits of randomness.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function generateTempPassword() {
  const group = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `${group()}-${group()}-${group()}`;
}
