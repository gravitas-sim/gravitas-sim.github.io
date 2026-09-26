// =============================================================================
// SPIKE (Prompt 18): one bounded workflow, from a name to an observation
// -----------------------------------------------------------------------------
//   1. resolve    a name to a sky position (CDS Sesame)
//   2. discover   the Gaia DR3 source there (VizieR TAP, a 2" cone)
//   3. inspect    its epoch photometry's metadata: fields, units, UCDs, rows
//   4. select     one band, bounded by MAXREC and a byte limit
//   5. convert    to gravitas.observation/1, with the query URL, the
//                 retrieval date, the response's SHA-256, the license and
//                 every transformation recorded
//
// Only CDS services: of the eleven archive endpoints probed, CDS's are the
// ones that answer a browser on another origin (VO_ARCHIVE_GATE.md, "CORS").
//
// The conversion is driven by a curated DESCRIPTOR per table, not by the
// VOTable's metadata alone, because the metadata is not enough: VizieR says
// TimeG is "JD-2455197.5" and gives FG no unit, where Gaia's data model says
// the time is barycentric, in TCB, and the flux is in e-/s. A descriptor
// carries what the service does not, each fact cited.
// =============================================================================

import { fetchLimited, sha256Hex, ArchiveFetchError } from './net.js';
import { parseVotable } from './votable.js';

export const SESAME = 'https://cds.unistra.fr/cgi-bin/nph-sesame/-oxp/SNV';
export const VIZIER_TAP = 'https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync';
/** Every origin this workflow may reach, redirects included. */
export const ALLOW = Object.freeze(['https://cds.unistra.fr', 'https://tapvizier.cds.unistra.fr']);

/** A name to a position, or null when Sesame knows no such object. */
export async function resolveName(name, opts = {}) {
  const got = await fetchLimited(`${SESAME}?${encodeURIComponent(name)}`, {
    maxBytes: 64_000,
    accept: /xml|text/,
    allow: ALLOW,
    ...opts,
  });
  const text = new TextDecoder().decode(got.bytes);
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const ra = Number(doc.getElementsByTagName('jradeg')[0]?.textContent);
  const dec = Number(doc.getElementsByTagName('jdedeg')[0]?.textContent);
  if (!Number.isFinite(ra) || !Number.isFinite(dec)) return null;
  return {
    name,
    ra,
    dec,
    otype: doc.getElementsByTagName('otype')[0]?.textContent ?? null,
    resolver: doc.getElementsByTagName('Resolver')[0]?.getAttribute('name') ?? null,
    url: got.url,
  };
}

/** A synchronous ADQL query, bounded, with what it returned and when. */
export async function tapQuery(adql, { maxrec = 2000, service = VIZIER_TAP, now = () => new Date(), ...opts } = {}) {
  const params = new URLSearchParams({
    REQUEST: 'doQuery',
    LANG: 'ADQL',
    FORMAT: 'votable',
    MAXREC: String(maxrec),
    QUERY: adql,
  });
  const url = `${service}?${params}`;
  const got = await fetchLimited(url, {
    maxBytes: 2_000_000,
    accept: /votable|xml/,
    allow: ALLOW,
    ...opts,
  });
  const table = parseVotable(new TextDecoder().decode(got.bytes));
  return {
    table,
    url,
    finalUrl: got.url,
    redirected: got.redirected,
    bytes: got.bytes.length,
    sha256: await sha256Hex(got.bytes),
    contentSha256: await tableDigest(table),
    retrieved: now().toISOString(),
  };
}

/**
 * The SHA-256 of what a table says, not of the bytes it came in. VizieR
 * writes the request's time and a fresh result name into every answer, so
 * the same 47 rows asked for twice, 1.5 s apart, came back with two different
 * byte checksums. The bytes' checksum records this retrieval; this one is the
 * data's identity, and the observation's id is built from it.
 */
export async function tableDigest(table) {
  const canonical = JSON.stringify({
    fields: table.fields.map(f => [f.name, f.datatype, f.unit, f.ucd, f.arraysize]),
    rows: table.rows,
  });
  return sha256Hex(new TextEncoder().encode(canonical));
}

/** The Gaia DR3 source nearest a position, within 2 arcseconds. */
export async function gaiaSourceAt({ ra, dec }, opts) {
  const r = 2 / 3600;
  const q = await tapQuery(
    `SELECT TOP 5 Source, RA_ICRS, DE_ICRS, Gmag, VarFlag FROM "I/355/gaiadr3" ` +
      `WHERE 1=CONTAINS(POINT('ICRS', RA_ICRS, DE_ICRS), CIRCLE('ICRS', ${ra}, ${dec}, ${r}))`,
    { maxrec: 5, ...opts }
  );
  const i = name => q.table.fields.findIndex(f => f.name === name);
  const rows = q.table.rows.map(row => ({
    source: String(row[i('Source')]),
    ra: row[i('RA_ICRS')],
    dec: row[i('DE_ICRS')],
    gmag: row[i('Gmag')],
    variable: String(row[i('VarFlag')] || '').trim() === 'VARIABLE',
  }));
  rows.sort((a, b) => (a.gmag ?? 99) - (b.gmag ?? 99));
  return { sources: rows, query: q };
}

/**
 * What VizieR's I/355/epphot does not say, from Gaia's own data model
 * (DR3 documentation, 20.4.1 epoch_photometry), for each band.
 */
export const DESCRIPTOR = Object.freeze({
  table: 'I/355/epphot',
  facility: 'Gaia (ESA), DR3 epoch photometry, via CDS VizieR',
  credit: 'ESA/Gaia/DPAC (Gaia DR3 epoch photometry), served by CDS VizieR',
  license: {
    status: 'CC BY-NC 3.0 IGO',
    statement:
      'Gaia data are distributed under CC BY-NC 3.0 IGO; credit ESA/Gaia/DPAC. https://www.cosmos.esa.int/web/gaia-users/license',
  },
  citations: [
    {
      text: 'Gaia Collaboration, Vallenari et al. 2023, A&A 674, A1 (Gaia DR3)',
      url: 'https://doi.org/10.1051/0004-6361/202243940',
    },
  ],
  // "Barycentric JD in TCB - 2 455 197.5 (day)"
  timeZero: 2455197.5,
  timeScale: 'TCB',
  bands: {
    G: { time: 'TimeG', value: 'Gmag', unit: 'mag', label: 'G magnitude' },
    BP: { time: 'TimeBP', value: 'BPmag', unit: 'mag', label: 'BP magnitude' },
    RP: { time: 'TimeRP', value: 'RPmag', unit: 'mag', label: 'RP magnitude' },
  },
});

/**
 * TCB to TDB: TDB = TCB - L_B (JD_TCB - T0) x 86400 s + TDB0, the IAU 2006
 * Resolution B3 definition. About 19 s in 2016: small beside a 0.66-day
 * pulsation, and a whole bin of a transit's ingress, so it is applied and
 * recorded, never left as "unknown".
 */
export function tcbToTdb(jdTcb) {
  const LB = 1.550519768e-8;
  const T0 = 2443144.5003725;
  const TDB0 = -6.55e-5; // s
  return jdTcb - LB * (jdTcb - T0) + TDB0 / 86400;
}

/** Epoch photometry for a Gaia DR3 source, as the table holds it. */
export async function gaiaEpochs(source, opts) {
  if (!/^\d{1,20}$/.test(source)) throw new Error('a Gaia source id is digits');
  return tapQuery(
    `SELECT TimeG, FG, e_FG, Gmag, TimeBP, BPmag, TimeRP, RPmag FROM "I/355/epphot" WHERE Source = ${source}`,
    { maxrec: 2000, ...opts }
  );
}

/**
 * One band of an epoch-photometry query, as a gravitas.observation/1.
 * @param {object} q - gaiaEpochs()'s result
 * @param {{source: string, band?: string, object?: object}} ctx
 */
export function toObservation(q, { source, band = 'G', object = null }) {
  const b = DESCRIPTOR.bands[band];
  const col = name => q.table.fields.findIndex(f => f.name === name);
  const ti = col(b.time);
  const vi = col(b.value);
  if (ti < 0 || vi < 0) throw new Error(`the table has no ${b.time} or ${b.value}`);
  // The service's own unit, where it states one, must agree with the
  // descriptor's; where it states none, the descriptor's is used and said.
  const stated = q.table.fields[vi].unit;
  if (stated && stated !== b.unit)
    throw new UnitError(`${b.value} is in ${stated}; the descriptor says ${b.unit}`);
  const tUnit = q.table.fields[ti].unit;
  if (tUnit && tUnit !== 'd') throw new UnitError(`${b.time} is in ${tUnit}; the descriptor says d`);
  if (band === 'G') {
    for (const name of ['FG', 'e_FG']) {
      const u = q.table.fields[col(name)]?.unit;
      if (u && !/^(e-|electron)\/s$/.test(u)) throw new UnitError(`${name} is in ${u}; the descriptor says e-/s`);
    }
  }
  const pairs = q.table.rows
    .map(r => [r[ti], r[vi]])
    .filter(([t, v]) => Number.isFinite(t) && Number.isFinite(v))
    .map(([t, v]) => [tcbToTdb(t + DESCRIPTOR.timeZero), v])
    .sort((a, c) => a[0] - c[0]);
  const dropped = q.table.rows.length - pairs.length;
  // G has flux errors to carry into magnitudes; BP and RP in this table do not.
  let err = null;
  if (band === 'G') {
    const fi = col('FG');
    const ei = col('e_FG');
    const byTime = new Map(
      q.table.rows
        .filter(r => Number.isFinite(r[ti]) && Number.isFinite(r[vi]))
        .map(r => [tcbToTdb(r[ti] + DESCRIPTOR.timeZero), (2.5 / Math.LN10) * (r[ei] / r[fi])])
    );
    err = pairs.map(([t]) => byTime.get(t));
  }
  return {
    format: 'gravitas.observation',
    formatVersion: 1,
    kind: 'time-series',
    id: `import:gaia-dr3-${source}-${band}@${q.contentSha256.slice(0, 12)}`,
    title: `Gaia DR3 ${source}: ${b.label}`,
    object: object && { frame: 'ICRS', ...object },
    facility: DESCRIPTOR.facility,
    origin: 'observed',
    // gravitas.observation/1 has no slot for a retrieval, and an export keeps
    // only the keys it knows (js/observatory/export.js OBSERVATION_KEYS) but
    // writes `source` whole: so the query, its answer's size and both
    // checksums ride in source.retrieval, and survive a save and a read-back.
    source: {
      kind: 'import',
      id: `vizier:${DESCRIPTOR.table}:${source}`,
      version: q.retrieved.slice(0, 10),
      retrieval: {
        url: q.url,
        finalUrl: q.finalUrl,
        bytes: q.bytes,
        sha256: q.sha256,
        contentSha256: q.contentSha256,
        rows: q.table.rows.length,
        overflow: q.table.overflow,
      },
    },
    credit: DESCRIPTOR.credit,
    license: DESCRIPTOR.license,
    retrieved: q.retrieved,
    citations: DESCRIPTOR.citations,
    reductions: [
      `Epoch photometry from ${DESCRIPTOR.table}, the ${band} band: ${pairs.length} of ${q.table.rows.length} rows kept (${dropped} without a time or a magnitude).`,
      `Times: the table's ${b.time} + 2455197.5, barycentric JD in TCB (Gaia DR3 data model), converted to TDB by IAU 2006 Resolution B3, about 19 s earlier.`,
      ...(band === 'G'
        ? ['Magnitude errors: 1.0857 x e_FG / FG, from the flux and its error in e-/s (a unit the service does not state; the data model does).']
        : [`No ${band} error: the table carries none.`]),
      q.table.overflow ? 'The service stopped at MAXREC: this is not every epoch.' : 'The service returned every row the query asked for.',
    ],
    columns: [
      { id: 'time', name: 'time', unit: 'd', role: 'x', values: pairs.map(p => p[0]) },
      { id: 'mag', name: b.label, unit: 'mag', role: 'value', values: pairs.map(p => p[1]) },
      ...(err
        ? [{ id: 'mag-error', name: `${b.label} error`, unit: 'mag', role: 'uncertainty', of: 'mag', values: err }]
        : []),
    ],
    axes: { x: 'time', y: 'mag' },
    time: { column: 'time', format: 'BJD', scale: 'TDB' },
    masks: [],
    annotations: [],
  };
}

/** The service states a unit the descriptor does not expect. */
export class UnitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnitError';
    this.code = 'units';
  }
}

export { ArchiveFetchError };
