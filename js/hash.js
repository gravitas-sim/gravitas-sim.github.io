// =============================================================================
// The hashes and canonical forms Gravitas writes, in one place
// -----------------------------------------------------------------------------
// FNV-1a was written out seven times and canonical JSON twice, and most of
// what they produce is kept: an experiment's storage key, a world's seed, an
// assignment link, a notebook entry's fingerprint, a lesson's completion code.
// A copy that drifted by one character would re-roll a world or orphan a
// student's saved work, so each form here is the one a copy already writes,
// and tests/sharedHelpers.test.js proves every copy equal to it on a corpus
// before any copy is replaced by an import.
//
// Pure: no DOM, no imports. Browser, Worker and Node alike.
// =============================================================================

/**
 * FNV-1a over a string's UTF-16 code units: the unsigned 32-bit hash every
 * copy computes (offset basis 0x811c9dc5, prime 0x01000193).
 * @param {string} text
 * @returns {number}
 */
export function fnv1a32(text) {
  const s = String(text ?? '');
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** As eight lowercase hex digits: the form links, keys and digests use. */
export const fnvHex8 = text => fnv1a32(text).toString(16).padStart(8, '0');

/** As upper-case base 36, padded: the form a notebook fingerprint uses. */
export const fnvBase36 = (text, pad = 7) =>
  fnv1a32(text).toString(36).toUpperCase().padStart(pad, '0');

/**
 * Canonical JSON with numbers to twelve significant figures: sorted keys,
 * undefined values dropped, -0 as 0, a non-finite number as null. The form an
 * initial state and an experiment are hashed in (js/experiments/
 * canonicalState.js), where a float that has been through text may come back
 * differing in the last bit.
 * @param {*} value
 * @returns {string}
 */
export function canonicalJson(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 'null';
    const rounded = Number(value.toPrecision(12));
    return Object.is(rounded, -0) ? '0' : String(rounded);
  }
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const keys = Object.keys(value)
    .filter(k => value[k] !== undefined)
    .sort();
  return `{${keys
    .map(k => `${JSON.stringify(k)}:${canonicalJson(value[k])}`)
    .join(',')}}`;
}

/**
 * Canonical JSON with every value exactly as JSON.stringify writes it, and
 * nothing dropped: the form a notebook snapshot is fingerprinted in, where an
 * edited value is exactly what the fingerprint exists to catch.
 * @param {*} value
 * @returns {string}
 */
export function canonicalJsonExact(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${value.map(canonicalJsonExact).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys
    .map(k => `${JSON.stringify(k)}:${canonicalJsonExact(value[k])}`)
    .join(',')}}`;
}

/**
 * SHA-256 as lowercase hex, over bytes or over a string's UTF-8.
 * @param {ArrayBuffer|ArrayBufferView|string} input
 * @returns {Promise<string>}
 */
export async function sha256Hex(input) {
  const bytes =
    typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), b =>
    b.toString(16).padStart(2, '0')
  ).join('');
}
