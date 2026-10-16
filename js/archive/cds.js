// =============================================================================
// The two CDS services the archive import may use, and nothing else
// -----------------------------------------------------------------------------
// VO_ARCHIVE_GATE.md accepted a narrow slice. The only data center of eleven
// archive endpoints probed that answers a page on another origin is CDS
// (Strasbourg), so these are the two services:
//
//   Sesame       a name to a position (it asks SIMBAD, NED and VizieR)
//   VizieR TAP   ADQL, synchronous, answered as a TABLEDATA VOTable
//
// and ONE curated table, Gaia DR3 epoch photometry (./gaiaEpochs.js). The
// reader's typed text reaches only Sesame, URL-encoded. Every ADQL query is
// built from numbers Sesame returned or a source id that is digits, so
// nothing the reader typed can reach ADQL.
//
// Every limit is here, in one place:
//
//   Sesame   64 KB, text/plain or XML (it answers text/plain, which a strict
//            XML check would refuse)
//   TAP      512 KB, a VOTable content type, MAXREC on every query. DOMParser
//            runs on the main thread; 512 KB parses in about 160 ms on a
//            low-end device, 2 MB in about 700 ms (the gate's measurement)
//   both     20 s, no cookies, no referrer, redirects checked against ALLOW
// =============================================================================

import { cachedFetch } from './cache.js';
import { fetchLimited, sha256Hex } from './net.js';
import { parseVotable } from './votable.js';

export const SESAME = 'https://cds.unistra.fr/cgi-bin/nph-sesame/-oxp/SNV';
export const VIZIER_TAP = 'https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync';

/**
 * Every origin the import may reach, redirects included. The Observatory's
 * meta Content-Security-Policy names the same two; tests/archive.test.js
 * holds them equal.
 */
export const ALLOW = Object.freeze([
  'https://cds.unistra.fr',
  'https://tapvizier.cds.unistra.fr',
]);

export const LIMITS = Object.freeze({
  sesameBytes: 64_000,
  tapBytes: 512_000,
  timeoutMs: 20_000,
  coneRows: 5,
  coneArcsec: 2,
  epochRows: 2000,
});

/**
 * One request, through the reader's cache when there is one. Every step of
 * the import goes through here, so a star imported before can be opened
 * again offline, marked stale when it is older than a week.
 * @returns {Promise<{got: {bytes: Uint8Array, url: string},
 *   retrievedMs: number, cache: object}>}
 */
async function fetchThrough(url, fetchOpts, { store, now, identify }) {
  const load = () => fetchLimited(url, { allow: ALLOW, ...fetchOpts });
  if (!store) {
    const got = await load();
    return {
      got,
      retrievedMs: now(),
      cache: {
        from: 'network',
        stale: false,
        ageMs: 0,
        changed: false,
        previous: null,
        error: null,
      },
    };
  }
  const got = await cachedFetch(url, load, { store, now, identify });
  return {
    got,
    retrievedMs: got.retrievedMs,
    cache: {
      from: got.from,
      stale: got.stale,
      ageMs: got.ageMs,
      changed: got.changed,
      previous: got.previous ?? null,
      error: got.error ?? null,
    },
  };
}

/** What Sesame's answer says, or null: position, type and resolver. */
function readSesame(bytes) {
  const doc = new DOMParser().parseFromString(
    new TextDecoder().decode(bytes),
    'application/xml'
  );
  const first = tag => doc.getElementsByTagName(tag)[0]?.textContent ?? null;
  const ra = Number(first('jradeg'));
  const dec = Number(first('jdedeg'));
  if (
    doc.getElementsByTagName('parsererror').length ||
    first('jradeg') === null ||
    !(ra >= 0 && ra < 360 && Math.abs(dec) <= 90)
  )
    return null;
  return {
    ra,
    dec,
    otype: first('otype'),
    resolver:
      doc.getElementsByTagName('Resolver')[0]?.getAttribute('name') ?? null,
  };
}

/**
 * A name to a position, or null when Sesame knows no such object.
 * @param {string} name
 * @param {{store?: object, now?: () => number}} [opts] - and fetchLimited's
 *   (a test's fetchImpl, the reader's cancel signal)
 * @returns {Promise<{name: string, ra: number, dec: number,
 *   otype: string|null, resolver: string|null, url: string,
 *   cache: object}|null>}
 */
export async function resolveName(
  name,
  { store, now = Date.now, ...opts } = {}
) {
  const url = `${SESAME}?${encodeURIComponent(name)}`;
  const { got, cache } = await fetchThrough(
    url,
    {
      maxBytes: LIMITS.sesameBytes,
      timeoutMs: LIMITS.timeoutMs,
      accept: /xml|text\/plain/,
      ...opts,
    },
    {
      store,
      now,
      // Sesame's answer carries the time each resolver took, so its bytes
      // differ every time; what it says is the position.
      identify: async bytes => JSON.stringify(readSesame(bytes)),
    }
  );
  const said = readSesame(got.bytes);
  return said && { name, ...said, url: got.url, cache };
}

/**
 * The SHA-256 of what a table says, not of the bytes it came in. VizieR
 * writes the request's time and a fresh result name into every answer, so
 * the same rows asked for twice come back with two byte checksums. The
 * bytes' checksum records a retrieval; this is the data's identity. It was
 * the same in Chromium, Firefox, WebKit and jsdom for the same answer.
 */
export async function tableDigest(table) {
  const canonical = JSON.stringify({
    fields: table.fields.map(f => [
      f.name,
      f.datatype,
      f.unit,
      f.ucd,
      f.arraysize,
    ]),
    rows: table.rows,
  });
  return sha256Hex(new TextEncoder().encode(canonical));
}

/**
 * The query URL for a synchronous ADQL request.
 * @param {string} adql
 * @param {number} maxrec
 */
export function tapUrl(adql, maxrec) {
  const params = new URLSearchParams({
    REQUEST: 'doQuery',
    LANG: 'ADQL',
    FORMAT: 'votable',
    MAXREC: String(maxrec),
    QUERY: adql,
  });
  return `${VIZIER_TAP}?${params}`;
}

/**
 * Bytes, as a TAP answer: the parsed table, both checksums, and when.
 * Kept apart from the request so a cached answer is read the same way.
 */
export async function readAnswer(got, { url, retrieved }) {
  const table = parseVotable(new TextDecoder().decode(got.bytes));
  return {
    table,
    url,
    finalUrl: got.url,
    bytes: got.bytes.length,
    sha256: await sha256Hex(got.bytes),
    contentSha256: await tableDigest(table),
    retrieved,
  };
}

/**
 * A synchronous ADQL query, bounded, through the cache when there is one.
 * The answer's `retrieved` is when its bytes came from CDS, which for a
 * cached answer is not now.
 * @param {string} adql
 * @param {{maxrec: number, store?: object, now?: () => number}} opts - and
 *   fetchLimited's
 * @returns {Promise<{answer: object, cache: object}>}
 */
export async function tapQuery(
  adql,
  { maxrec, store, now = Date.now, ...opts }
) {
  const url = tapUrl(adql, maxrec);
  const { got, retrievedMs, cache } = await fetchThrough(
    url,
    {
      maxBytes: LIMITS.tapBytes,
      timeoutMs: LIMITS.timeoutMs,
      accept: /votable|xml/,
      ...opts,
    },
    {
      store,
      now,
      identify: async bytes =>
        tableDigest(parseVotable(new TextDecoder().decode(bytes))),
    }
  );
  const answer = await readAnswer(got, {
    url,
    retrieved: new Date(retrievedMs).toISOString(),
  });
  return { answer, cache };
}

/** ADQL for the Gaia DR3 sources within the cone of a position. */
export function coneQuery({ ra, dec }) {
  if (!(Number.isFinite(ra) && Number.isFinite(dec)))
    throw new TypeError('a position is two numbers');
  const r = LIMITS.coneArcsec / 3600;
  return (
    `SELECT TOP ${LIMITS.coneRows} Source, RA_ICRS, DE_ICRS, Gmag, VarFlag FROM "I/355/gaiadr3" ` +
    `WHERE 1=CONTAINS(POINT('ICRS', RA_ICRS, DE_ICRS), CIRCLE('ICRS', ${ra}, ${dec}, ${r}))`
  );
}

/** ADQL for one source's epoch photometry. */
export function epochQuery(source) {
  if (!/^\d{1,20}$/.test(String(source)))
    throw new TypeError('a Gaia source id is digits');
  return `SELECT TimeG, FG, e_FG, Gmag, TimeBP, BPmag, TimeRP, RPmag FROM "I/355/epphot" WHERE Source = ${source}`;
}

/**
 * The Gaia DR3 sources near a position, brightest first.
 * @returns {Promise<{sources: Array<{source: string, ra: number, dec: number,
 *   gmag: number|null, variable: boolean}>, answer: object, cache: object}>}
 */
export async function gaiaSourcesAt(position, opts = {}) {
  const { answer, cache } = await tapQuery(coneQuery(position), {
    ...opts,
    maxrec: LIMITS.coneRows,
  });
  const col = name => answer.table.fields.findIndex(f => f.name === name);
  const [s, ra, de, g, v] = [
    'Source',
    'RA_ICRS',
    'DE_ICRS',
    'Gmag',
    'VarFlag',
  ].map(col);
  if (s < 0 || ra < 0 || de < 0)
    throw new Error('the Gaia table has no Source, RA_ICRS or DE_ICRS');
  const sources = answer.table.rows
    .filter(r => r[s] !== null)
    .map(r => ({
      source: String(r[s]),
      ra: r[ra],
      dec: r[de],
      gmag: g < 0 ? null : r[g],
      variable: v >= 0 && String(r[v] ?? '').trim() === 'VARIABLE',
    }))
    .sort((a, b) => (a.gmag ?? 99) - (b.gmag ?? 99));
  return { sources, answer, cache };
}

/**
 * One source's epoch photometry.
 * @param {string} source - A Gaia DR3 source id
 * @param {{store?: object, now?: () => number}} [opts] - and fetchLimited's
 * @returns {Promise<{answer: object, cache: object}>}
 */
export function gaiaEpochs(source, opts = {}) {
  return tapQuery(epochQuery(source), { ...opts, maxrec: LIMITS.epochRows });
}
