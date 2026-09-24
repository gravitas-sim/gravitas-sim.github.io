// =============================================================================
// A raw product, fetched once and pinned
// -----------------------------------------------------------------------------
// The four dataset builders that came before this each carry their own copy of
// fetch-cache-hash, and they do not agree on when the hash is checked: two
// compare it on every read, one only when the file was already cached, and one
// records whatever it read. OBSERVATION_DATA_PACK_GATE.md has the audit. Every
// data pack goes through this one instead, and the rule is the same for all of
// them: the bytes are compared with the pin whether they came from the cache
// or the network a moment ago, and bytes that do not match are never used.
//
// A source that is not byte-stable is pinned over a canonical form of itself.
// A VizieR response carries the date it was requested in its header, so the
// SHA-256 of the file as served changes on every fetch; its data rows do not.
// =============================================================================

import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

/** The canonical forms a pin may be taken over, by name. */
export const CANONICAL = {
  // Every line that is not a # comment, in order, joined by \n.
  'data-lines': bytes =>
    Buffer.from(
      Buffer.from(bytes)
        .toString('utf8')
        .split('\n')
        .filter(l => l && !l.startsWith('#'))
        .join('\n')
    ),
};

/**
 * What the pinned bytes of a raw product are, if these are they.
 * @param {Uint8Array} bytes - The file
 * @param {{file: string, bytes?: number, sha256: string, canonical?: string}} pin
 * @returns {string|null} Why they are not, or null
 */
export function pinProblem(bytes, pin) {
  if (pin.canonical) {
    const form = CANONICAL[pin.canonical];
    if (!form) return `${pin.file}: no canonical form "${pin.canonical}"`;
    const digest = sha256(form(bytes));
    return digest === pin.sha256
      ? null
      : `${pin.file}: its ${pin.canonical} are ${digest}, not the pinned ${pin.sha256}`;
  }
  if (pin.bytes !== undefined && bytes.length !== pin.bytes) {
    return `${pin.file} is ${bytes.length} bytes, not the pinned ${pin.bytes}`;
  }
  const digest = sha256(bytes);
  return digest === pin.sha256
    ? null
    : `${pin.file} is ${digest}, not the pinned ${pin.sha256}`;
}

/**
 * The raw product's bytes: from the cache, or fetched into it when allowed,
 * and in either case checked against the pin before anything reads them.
 *
 * @param {{file: string, url: string, bytes?: number, sha256: string, canonical?: string}} pin
 * @param {{cache: string, offline?: boolean, fetchImpl?: typeof fetch}} opts
 * @returns {Promise<Uint8Array>}
 */
export async function pinnedBytes(
  pin,
  { cache, offline = true, fetchImpl = globalThis.fetch }
) {
  const at = path.join(cache, pin.file);
  let bytes;
  if (existsSync(at)) {
    bytes = readFileSync(at);
  } else if (offline) {
    throw new Error(
      `${pin.file} is not in ${cache}. Run \`npm run packs:data\` once to fetch it from ${pin.url}.`
    );
  } else {
    const res = await fetchImpl(pin.url, {
      signal: globalThis.AbortSignal.timeout(120_000),
    });
    if (!res.ok) throw new Error(`${pin.url}: HTTP ${res.status}`);
    bytes = Buffer.from(await res.arrayBuffer());
    // Checked before it is cached: a truncated or substituted download never
    // reaches the cache, so the next offline run cannot read it either.
    const problem = pinProblem(bytes, pin);
    if (problem)
      throw new Error(`the archive served different bytes. ${problem}`);
    mkdirSync(cache, { recursive: true });
    writeFileSync(at, bytes);
  }
  const problem = pinProblem(bytes, pin);
  if (problem) {
    throw new Error(
      `${problem}\nDelete it and let \`npm run packs:data\` fetch it again, or re-pin deliberately if the archive has republished.`
    );
  }
  return new Uint8Array(bytes);
}
