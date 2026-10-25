// The checks every function of the kernel makes at its head, once (Prompt 154,
// STATISTICS.md): a refusal is a record { status: 'refused', code, why } with a
// code a caller can switch on, never a number computed from a list that is not
// what it claims to be, and nothing is dropped silently.
const { Number } = globalThis;

/** A refusal record. */
export const refused = (code, why) => ({ status: 'refused', code, why });

/** Every entry of a list is a finite number (no NaN, no Infinity). */
export function allFinite(list) {
  for (let i = 0; i < list.length; i++)
    if (!Number.isFinite(list[i])) return false;
  return true;
}

/** A whole number of at least `min`. */
export const isCount = (n, min = 0) => Number.isInteger(n) && n >= min;
