// =============================================================================
// A raw product, fetched once and pinned
// -----------------------------------------------------------------------------
// The four dataset builders that came before this each carried their own copy
// of fetch-cache-hash, and they did not agree on when the hash is checked: two
// compared it on every read, one only when the file was already cached, and
// one recorded whatever it read. OBSERVATION_DATA_PACK_GATE.md has the audit.
// Every dataset goes through this one now, and the rule is the same for all of
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

/** HTTP statuses that mean "try again", not "this is not the file". */
const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);

/**
 * The raw product's bytes: from the cache, or fetched into it when allowed,
 * and in either case checked against the pin before anything reads them.
 *
 * Every dataset builder goes through this one function: the data packs, and
 * since Roadmap II Prompt 62 the four datasets that came before them (the
 * SDSS spectra, the GWOSC events, GW150914 and the MIST tracks), which each
 * used to carry a fetch-cache-hash copy of their own.
 *
 * @param {{file: string, url: string, bytes?: number, sha256: string, canonical?: string, range?: string}} pin
 * @param {object} opts
 * @param {string} opts.cache - The directory raw products are kept in
 * @param {boolean} [opts.offline] - Refuse the network (the default)
 * @param {typeof fetch} [opts.fetchImpl] - For the tests
 * @param {string} [opts.refetch] - The command that fills the cache, for the message
 * @param {boolean} [opts.offlineFlag] - The caller was told --offline, and the message says so
 * @param {object} [opts.headers] - Request headers, for an archive that asks to be told who is asking
 * @param {number} [opts.timeoutMs] - How long a download may take
 * @param {number} [opts.attempts] - How many times an archive that errs transiently is asked (default 3)
 * @param {number} [opts.retryDelayMs] - The wait before the second ask; the third waits twice as long
 * @returns {Promise<Uint8Array>}
 */
export async function pinnedBytes(
  pin,
  {
    cache,
    offline = true,
    fetchImpl = globalThis.fetch,
    refetch = 'npm run packs:data',
    offlineFlag = false,
    headers,
    timeoutMs = 120_000,
    attempts = 3,
    retryDelayMs = 5_000,
  }
) {
  const at = path.join(cache, pin.file);
  let bytes;
  if (existsSync(at)) {
    bytes = readFileSync(at);
  } else if (offline) {
    throw new Error(
      `${pin.file} is not in ${cache}${offlineFlag ? ' and --offline was given' : ''}. Run \`${refetch}\` once to fetch it from ${pin.url}.`
    );
  } else {
    // A pin may name a byte range of a large file (`range: "a-b"`, inclusive,
    // as an HTTP Range header says it), for a product of which a pack needs a
    // few kilobytes (a TESS target pixel file is 58 MB; one cadence is 2.9 KB).
    // The pin's bytes and digest are those of the range as served.
    const ask = {
      ...(headers ?? {}),
      ...(pin.range ? { Range: `bytes=${pin.range}` } : {}),
    };
    // Node's fetch reports every network failure as "fetch failed" and keeps
    // the reason (a refused connection, a name that does not resolve, a
    // timeout) on `cause`. Say which archive and why, so that a failed
    // scheduled run names its source without a second dry run.
    //
    // An archive that answers HTTP 500 or 503, or does not answer a connection
    // in time, is asked again a few times, a little later each time: the
    // scheduled run's archives (SDSS, GWOSC) did both within the same month.
    // Only the wait changes. Whatever is served is still held to the pin below,
    // so a retry can never admit a different file. An HTTP 4xx, a download that
    // runs past its own timeout, and a body that is not the pin fail at once.
    let res;
    for (let attempt = 1; ; attempt++) {
      let failure = null;
      let again = false;
      try {
        res = await fetchImpl(pin.url, {
          signal: globalThis.AbortSignal.timeout(timeoutMs),
          ...(Object.keys(ask).length ? { headers: ask } : {}),
        });
        if (res.ok) break;
        failure = new Error(`${pin.url}: HTTP ${res.status}`);
        again = RETRY_STATUS.has(res.status);
      } catch (err) {
        const why = err?.cause?.code ?? err?.cause?.message ?? err?.name;
        failure = new Error(
          `${pin.url}: ${err?.message ?? err}${why ? ` (${why})` : ''}`,
          { cause: err }
        );
        again = err?.name !== 'TimeoutError';
      }
      if (!again || attempt >= attempts) throw failure;
      await new Promise(done =>
        globalThis.setTimeout(done, retryDelayMs * attempt)
      );
    }
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
      `${problem}\nDelete it and let \`${refetch}\` fetch it again, or re-pin deliberately if the archive has republished.`
    );
  }
  return new Uint8Array(bytes);
}
