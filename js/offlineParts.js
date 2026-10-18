// =============================================================================
// Parts: data a reader asks to keep offline, fetched whole, verified, recoverable
// -----------------------------------------------------------------------------
// The first-visit install and the idle install (sw.js) hold what the pages
// themselves need. Anything larger that only some readers want (a survey, a
// light-curve archive, a course's media) is a PART: a file a pack declares,
// fetched when a reader chooses "make available offline", never at install.
//
//   { id, url, sha256, bytes }
//
// The rules, which tests/offlineParts.test.js holds:
//   - The URL is immutable and versioned: it carries the first 16 hex digits
//     of the digest, and has no query. A changed part is a different URL, so
//     an old worker never serves new bytes under an old name, and a new worker
//     keeps the parts an older one cached.
//   - A part is cached only after its SHA-256 matches. A short or corrupted
//     download is never stored, so a part is whole or absent.
//   - What a reader asked for is remembered beside the parts (a small entry in
//     the same cache, no new stored record), and `recover` finishes it on the
//     next open. A part already verified is not fetched again.
//   - The reader sees the size and the room left before anything is fetched.
//   - Parts live in their own cache, which the worker's activation keeps
//     (sw.js): a version update replaces the pages, not the reader's parts.
//
// Parts are copies of public data. They are evictable, never student work
// (STORAGE.md's matrix), and `remove` is the reader's say.
// =============================================================================

import { sha256Hex } from './archive/net.js';

export const PARTS_CACHE = 'gravitas-parts';
const WANTED = '/__wanted/';

/** @param {object} part @returns {string[]} What is wrong with a declaration */
export function partProblems(part) {
  const bad = [];
  if (!part || typeof part.id !== 'string' || !part.id)
    return ['a part needs an id'];
  if (!/^[0-9a-f]{64}$/.test(part.sha256 ?? ''))
    bad.push(`${part.id}: sha256 must be 64 lowercase hex digits`);
  if (!Number.isInteger(part.bytes) || part.bytes <= 0)
    bad.push(`${part.id}: bytes must be a positive integer`);
  const url = String(part.url ?? '');
  if (!url || /[?#]/.test(url) || /^[a-z]+:/i.test(url))
    bad.push(`${part.id}: url must be a same-origin path with no query`);
  else if (part.sha256 && !url.includes(part.sha256.slice(0, 16)))
    bad.push(
      `${part.id}: url must carry the digest prefix, so it is immutable`
    );
  return bad;
}

const open = caches => caches.open(PARTS_CACHE);
const key = url => new URL(url, globalThis.location?.href ?? 'http://x/').href;

/** Whether a part is cached (verified when it was stored). */
async function has(cache, part) {
  return Boolean(await cache.match(key(part.url)));
}

/**
 * What asking for these parts would cost, before anything is fetched.
 * @param {object[]} parts
 * @param {{caches?: CacheStorage, storage?: {estimate: Function}}} [env]
 * @returns {Promise<{bytes: number, missing: number, quota: ?number, usage: ?number, fits: ?boolean}>}
 */
export async function estimate(
  parts,
  { caches = globalThis.caches, storage = globalThis.navigator?.storage } = {}
) {
  const cache = caches ? await open(caches) : null;
  let bytes = 0;
  let missing = 0;
  for (const p of parts) {
    if (cache && (await has(cache, p))) continue;
    bytes += p.bytes;
    missing++;
  }
  let quota = null;
  let usage = null;
  try {
    ({ quota = null, usage = null } = (await storage?.estimate?.()) ?? {});
  } catch {
    /* an unreadable estimate is an unknown, not a refusal */
  }
  return {
    bytes,
    missing,
    quota,
    usage,
    fits: quota == null || usage == null ? null : usage + bytes <= quota,
  };
}

/**
 * Fetch, verify and store one part. Never stores unverified bytes.
 * @returns {Promise<'cached'|'fetched'>} Throws on a failed or mismatched fetch
 */
export async function ensurePart(
  part,
  { caches = globalThis.caches, fetch = globalThis.fetch } = {}
) {
  const problems = partProblems(part);
  if (problems.length) throw new Error(problems.join('; '));
  const cache = await open(caches);
  if (await has(cache, part)) return 'cached';
  const response = await fetch(key(part.url), { cache: 'reload' });
  if (!response.ok) throw new Error(`${part.id}: ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length !== part.bytes)
    throw new Error(
      `${part.id}: ${bytes.length} bytes, expected ${part.bytes}`
    );
  if ((await sha256Hex(bytes)) !== part.sha256)
    throw new Error(`${part.id}: the digest does not match`);
  await cache.put(key(part.url), new Response(bytes));
  return 'fetched';
}

/**
 * The reader's "make available offline": remember the request, then fetch each
 * part, one at a time (a failure does not stop the rest).
 * @param {string} id - The dataset or investigation
 * @param {object[]} parts
 * @returns {Promise<{id: string, done: string[], failed: Array<{id: string, error: string}>}>}
 */
export async function makeAvailableOffline(id, parts, env = {}) {
  const caches = env.caches ?? globalThis.caches;
  const cache = await open(caches);
  await cache.put(
    key(`${WANTED}${encodeURIComponent(id)}`),
    new Response(JSON.stringify({ id, parts: parts.map(p => p.id) }))
  );
  const done = [];
  const failed = [];
  for (const p of parts) {
    try {
      await ensurePart(p, { ...env, caches });
      done.push(p.id);
    } catch (e) {
      failed.push({ id: p.id, error: e.message });
    }
  }
  return { id, done, failed };
}

/**
 * On open: finish what an earlier open began. `declared` maps a dataset id to
 * its current parts; a request whose dataset no longer exists is dropped.
 * @param {(id: string) => ?object[]} declared
 */
export async function recover(declared, env = {}) {
  const caches = env.caches ?? globalThis.caches;
  const cache = await open(caches);
  const out = [];
  for (const req of await cache.keys()) {
    if (!new URL(req.url).pathname.startsWith(WANTED)) continue;
    const { id } = await (await cache.match(req)).json();
    const parts = declared(id);
    if (!parts) {
      await cache.delete(req);
      continue;
    }
    out.push(await makeAvailableOffline(id, parts, { ...env, caches }));
  }
  return out;
}

/** The reader's say: forget a dataset's offline copy. Parts other sets share stay. */
export async function remove(id, parts, shared = [], env = {}) {
  const cache = await open(env.caches ?? globalThis.caches);
  const keep = new Set(shared.map(p => p.url));
  for (const p of parts) if (!keep.has(p.url)) await cache.delete(key(p.url));
  await cache.delete(key(`${WANTED}${encodeURIComponent(id)}`));
}
