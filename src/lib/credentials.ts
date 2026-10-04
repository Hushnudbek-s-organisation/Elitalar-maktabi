const ID_ALPHABET = "0123456789";
const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";

function secureRandomIndex(length: number): number {
  const values = new Uint32Array(1);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(values);
    return values[0] % length;
  }
  // Server-side fallbacks are only used in tests and non-browser tooling.
  return Math.floor(Math.random() * length);
}

export function generateAccountId(prefix: "S" | "T"): string {
  const digits = Array.from({ length: 6 }, () => ID_ALPHABET[secureRandomIndex(ID_ALPHABET.length)]).join("");
  return `${prefix}-${digits}`;
}

export function generateOneTimePassword(length = 10): string {
  return Array.from({ length }, () => PASSWORD_ALPHABET[secureRandomIndex(PASSWORD_ALPHABET.length)]).join("");
}
