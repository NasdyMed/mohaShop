import { randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const RANDOM_LENGTH = 10;
const ACCEPTABLE_BYTE_LIMIT = Math.floor(256 / ALPHABET.length) * ALPHABET.length;

export function generateOrderNumber(): string {
  let suffix = "";
  while (suffix.length < RANDOM_LENGTH) {
    for (const byte of randomBytes(RANDOM_LENGTH - suffix.length)) {
      if (byte < ACCEPTABLE_BYTE_LIMIT) suffix += ALPHABET[byte % ALPHABET.length];
    }
  }
  return `BOT-${suffix}`;
}
