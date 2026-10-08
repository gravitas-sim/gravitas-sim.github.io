// =============================================================================
// The evidence ledger
// -----------------------------------------------------------------------------
// The notebook is the ledger: an ordered list of entries, each holding a frozen
// snapshot, and (since this module) each snapshot holds the result as a
// gravitas.artifact/1 envelope (js/platform/artifact.js) beside the numbers it
// was always kept as. The envelope is what a report, a submission token and the
// review page read. Everything here is a projection of the entries; nothing is
// stored by this module, and nothing is rendered in a language until it is read.
//
//   deriveEnvelope()  an envelope for an entry the way its producer made it:
//                     a simulation reading, a measurement on real data, a
//                     guide's answers. Used when an entry is built, and again
//                     for an entry kept before envelopes were written, so an
//                     old notebook reads as a new one without being rewritten
//                     (rewriting would move its checksum).
//   envelopeOf()      the envelope an entry holds, or the derived one.
//   evidenceRows()    one row per quantity, in the reader's words, from the
//                     envelope; every row says what made it, from what, and
//                     where in the student's work it was kept.
//   ledgerRecord()    the compact record a submission token carries, and the
//                     digest of it that the review page recomputes.
//
// Entries are immutable but for the student's own words: the snapshot is frozen
// (./entry.js), annotate() shares it, and the fingerprint covers the envelope.
//
// Pure: no DOM, no storage. A lazy module, with the notebook.
// =============================================================================

import { artifact } from '../platform/artifact.js';
import { symbolOf, unitIdOf } from '../units/registry.js';

/** What a ledger record says it is. */
export const LEDGER_FORMAT = 'gravitas.ledger';
export const LEDGER_VERSION = 1;

const HEX = /^[0-9a-f]{8,64}$/;

/**
 * A unit as the registry names it, and the factor a value takes into it: a
 * column in `1e-3 d` holds thousandths of a day. Null is not stated.
 * @param {?string} unit - As a producer wrote it
 * @returns {{id: ?string, scale: number}}
 */
export function unitOf(unit) {
  if (unit === null || unit === undefined) return { id: null, scale: 1 };
  if (unit === '') return { id: '', scale: 1 };
  // As js/observatory/units.js unitId() writes a scaled unit: a number, a
  // space, the id ("0.001 d", "1e-17 erg/s/cm2/Angstrom"), or as data do,
  // "10^-3 d". A spelling with a space in it ("solar masses") is not a number
  // first, and stays whole.
  const m = /^(\S+)\s+(.+)$/.exec(unit);
  const scale = m ? Number(m[1].replace(/^10\^/, '1e')) : NaN;
  if (m && Number.isFinite(scale) && scale > 0)
    return { id: unitIdOf(m[2]) ?? null, scale };
  return { id: unitIdOf(unit) ?? null, scale: 1 };
}

/**
 * The id each quantity of a snapshot carries in its envelope: the id of the
 * message that named it where there is one, else its place. Unique.
 * @param {Array<object>} quantities - A snapshot's
 * @returns {Array<string>}
 */
export function quantityIds(quantities) {
  const seen = new Set();
  return quantities.map((q, i) => {
    let id = q.qid ?? q.lid ?? `q${i + 1}`;
    while (seen.has(id)) id += '+';
    seen.add(id);
    return id;
  });
}

/** Origin of an entry quantity's kind. */
const ORIGIN = { measured: 'measured', analytic: 'analytic', truth: 'truth' };

/** What the live world was doing, as the settings a methods summary names. */
function settingsOf(p) {
  const out = {};
  const put = (k, v) => {
    if (v !== null && v !== undefined && v !== '') out[k] = v;
  };
  put('scenario', p.scenario);
  put('seed', p.seed);
  put('integrator', p.numerical?.integrator);
  put('step', p.numerical?.maxTimestep);
  put('speed', p.numerical?.simSpeed);
  put('frame', p.referenceFrame);
  put('schedule', p.scheduleFingerprint);
  if (p.observer) put('observer', p.observer);
  return out;
}

/**
 * An envelope for an entry, from what the entry holds.
 *
 * Three producers' shapes, one result. A reading off a simulation is source
 * kind `simulation` and keeps its conditions as settings; a measurement on real
 * data is a `pipeline` result citing the observation by digest; an Observatory
 * guide's answers are a `guide`. A quantity's unit is the registry's id, or
 * null (and a `unit:` warning) when its text names none.
 *
 * @param {{id: string, source?: string, quantities: object[],
 *   provenance?: ?object, observed?: ?object, capturedAt?: number,
 *   context?: ?object}} a - The entry's parts
 * @returns {object} gravitas.artifact/1
 */
export function deriveEnvelope({
  id,
  source = '',
  quantities,
  provenance = null,
  observed = null,
  capturedAt = 0,
  context = null,
}) {
  const p = provenance || {};
  const warnings = [...(p.flags || [])].filter(f => f !== 'observed');
  const ids = quantityIds(quantities);
  const list = [];
  quantities.forEach((q, i) => {
    if (!Number.isFinite(q.value)) {
      warnings.push(`novalue:${ids[i]}`);
      return;
    }
    const { id: unit, scale } = unitOf(q.unit);
    if (unit === null && q.unit) warnings.push(`unit:${ids[i]}:${q.unit}`);
    const sigma = Number.isFinite(q.uncertainty) ? q.uncertainty * scale : null;
    list.push({
      id: ids[i],
      value: q.value * scale,
      unit,
      uncertainty:
        sigma === null
          ? { kind: 'none' }
          : { kind: 'sigma', sigma, basis: q.ub || 'data' },
      origin: q.og || ORIGIN[q.kind] || 'measured',
      ...(q.label ? { label: q.label } : {}),
    });
  });
  for (const a of observed?.assumptions || []) {
    if (!Number.isFinite(a.value)) continue;
    const { id: unit, scale } = unitOf(a.unit);
    list.push({
      id: `assumed:${a.id}`,
      value: a.value * scale,
      unit,
      uncertainty: { kind: 'none' },
      origin: 'assumed',
    });
  }

  let src;
  const settings = settingsOf(p);
  const meta = {};
  if (observed) {
    const o = observed.observation || {};
    const tool = String(observed.tool?.id ?? '');
    const guide = tool.startsWith('guide:');
    src = {
      kind: guide ? 'guide' : 'pipeline',
      id: guide ? tool.slice(6) : tool || 'observatory',
      ...(observed.tool?.version !== undefined
        ? { version: String(observed.tool.version) }
        : {}),
      ...(HEX.test(o.digest ?? '') ? { digest: o.digest } : {}),
    };
    meta.observation = { id: o.id, title: o.title, source: o.source ?? null };
    if (observed.tool?.params) settings.params = observed.tool.params;
    meta.credit = o.credit ?? undefined;
    if (o.license) meta.license = { status: String(o.license) };
    if (o.retrieved) meta.retrieved = o.retrieved;
    if (o.citations?.length) meta.citations = o.citations.map(c => c.text);
    if (observed.changes?.length) meta.reductions = observed.changes;
  } else {
    src = {
      kind: 'simulation',
      id: String(p.scenario || source || 'simulation'),
      ...(p.revision ? { version: String(p.revision) } : {}),
      ...(HEX.test(p.initialStateHash ?? '')
        ? { digest: p.initialStateHash }
        : {}),
    };
  }

  const provenanceBlock = {
    ...(meta.credit ? { credit: meta.credit } : {}),
    ...(meta.license ? { license: meta.license } : {}),
    ...(meta.citations ? { citations: meta.citations } : {}),
    ...(meta.retrieved ? { retrieved: meta.retrieved } : {}),
    ...(meta.reductions ? { reductions: meta.reductions } : {}),
    ...(meta.observation ? { observation: meta.observation } : {}),
    ...(Object.keys(settings).length ? { settings } : {}),
    ...(context ? { context } : {}),
  };
  return artifact({
    id: String(id),
    source: src,
    quantities: list,
    provenance: Object.keys(provenanceBlock).length
      ? provenanceBlock
      : undefined,
    warnings: [...new Set(warnings)],
    made: {
      ...(p.revision ? { platform: String(p.revision) } : {}),
      ...(capturedAt
        ? { at: new Date(capturedAt).toISOString().slice(0, 19) + 'Z' }
        : {}),
    },
  });
}

/**
 * The envelope an entry holds: the one written with it, or the one its parts
 * give. The same function either way, so an entry kept before envelopes were
 * written reads as one made after.
 * @param {object} entry - A notebook entry
 * @returns {object} gravitas.artifact/1
 */
export function envelopeOf(entry) {
  const s = entry.snapshot;
  return (
    s.artifact ??
    deriveEnvelope({
      id: entry.id,
      source: entry.source,
      quantities: s.quantities,
      provenance: s.provenance,
      observed: s.observed ?? null,
      capturedAt: s.capturedAt,
      context: s.context ?? null,
    })
  );
}

/** The origin word a reader sees, from the envelope's origins. */
const ORIGIN_WORD = {
  measured: 'nb.kind.measured',
  derived: 'led.origin.derived',
  assumed: 'led.origin.assumed',
  fitted: 'led.origin.fitted',
  fixed: 'led.origin.fixed',
  truth: 'nb.kind.truth',
  analytic: 'nb.kind.analytic',
  synthetic: 'led.origin.synthetic',
};

/** A message in the reader's language, or null when the catalog has none. */
function said(t, id, vars) {
  if (!id) return null;
  const s = t(id, vars);
  return s === id ? null : s;
}

/**
 * Every quantity the entries hold, one row each, in the reader's words.
 *
 * Values, units and uncertainties are numbers and registry ids, read from the
 * envelope; only the label, the unit's symbol and the origin word depend on the
 * locale. The label of a number made in another language is the message that
 * named it, said now; an entry whose producer kept only text keeps its text.
 *
 * @param {Array<object>} entries - The notebook, in order
 * @param {(id: string, vars?: object) => string} t - The translator
 * @param {string} [locale] - For unit symbols
 * @returns {Array<object>} Rows
 */
export function evidenceRows(entries, t, locale = 'en') {
  const rows = [];
  entries.forEach((entry, n) => {
    const env = envelopeOf(entry);
    const snap = entry.snapshot;
    const ids = quantityIds(snap.quantities);
    const byId = new Map(ids.map((id, i) => [id, snap.quantities[i]]));
    const ctx = env.provenance?.context ?? null;
    env.quantities.forEach((q, j) => {
      const sq = byId.get(q.id) ?? snap.quantities[j] ?? {};
      const unit = q.unit === null ? (sq.unit ?? '') : symbolOf(q.unit, locale);
      const u = q.uncertainty;
      const half =
        u.kind === 'sigma'
          ? u.sigma
          : u.kind === 'interval'
            ? (u.hi - u.lo) / 2
            : null;
      rows.push({
        n: n + 1,
        entry: entry.id,
        envelope: env.id,
        title: entry.title,
        id: q.id,
        label:
          said(t, sq.lid ?? q.id, sq.lv) ??
          said(t, `obs.ms.q.${q.id}`) ??
          q.label ??
          q.id,
        value: q.value,
        unitId: q.unit,
        unit,
        uncertainty: u,
        half,
        origin: q.origin,
        kind: t(ORIGIN_WORD[q.origin] ?? 'nb.kind.measured'),
        note: said(t, sq.nid, sq.nv) ?? sq.note ?? '',
        source: env.source,
        context: ctx,
        warnings: env.warnings ?? [],
      });
    });
  });
  return rows;
}

/**
 * The compact record of a ledger: the envelopes by id with their sources and
 * every row of the evidence table as numbers. A submission token carries it,
 * so the review page can show the table and check it against its digest.
 *
 * Numbers, registry ids and short codes only: nothing in it is a sentence.
 * @param {Array<object>} entries - The notebook, in order
 * @returns {{ids: string[], rows: Array<Array<*>>, total: number}}
 */
export function ledgerRecord(entries) {
  const ids = [];
  const rows = [];
  for (const entry of entries) {
    const env = envelopeOf(entry);
    ids.push(env.id);
    const s = env.source;
    for (const q of env.quantities) {
      const u = q.uncertainty;
      rows.push([
        env.id,
        q.id,
        q.value,
        q.unit,
        u.kind === 'sigma'
          ? u.sigma
          : u.kind === 'interval'
            ? (u.hi - u.lo) / 2
            : null,
        q.origin,
        s.kind,
        s.id,
        s.digest ? s.digest.slice(0, 16) : null,
      ]);
    }
  }
  return { ids, rows, total: rows.length };
}

export { ledgerDigest } from '../submission/ledgerDigest.js';

/**
 * The words of a context, for a reader: where in the student's work it was
 * kept. Empty when nothing was recorded.
 * @param {?object} c - provenance.context
 * @param {(id: string, vars?: object) => string} t
 * @returns {string}
 */
export function contextText(c, t) {
  if (!c) return '';
  if (c.lesson)
    return t('led.ctx.lesson', {
      lesson: c.lesson,
      step: c.step ?? '-',
      assignment: c.assignment ? ` (${c.assignment})` : '',
    });
  if (c.guide) return t('led.ctx.guide', { guide: c.guide });
  return c.page ? t(`led.ctx.${c.page}`) : '';
}

/** Sources whose entries are an envelope made elsewhere (./artifactEntry.js). */
export const ARTIFACT_SOURCES = [
  'inference-fit',
  'sweep-analysis',
  'experiment-result',
];

/**
 * What an Observatory entry says of the data and what was done to them, as
 * label and value rows in the reader's words, from the fields the entry holds
 * and not from words written when it was captured. An entry kept before those
 * were retired, which has no tool to read, is read from its own rows.
 * @param {object} o - snapshot.observed
 * @param {(id: string, vars?: object) => string} t - The translator
 * @returns {Array<[string, string]>}
 */
export function observedRows(o, t) {
  if (!o.tool && o.rows) return o.rows;
  const ob = o.observation || {};
  const none = t('nb.report.notRecorded');
  const word = (id, fallback) => said(t, id) ?? fallback;
  const pairs = obj =>
    Object.entries(obj || {})
      .map(([k, v]) => `${k} ${Array.isArray(v) ? v.join('-') : v}`)
      .join(', ');
  const rows = [
    [t('led.obs.observation'), `${ob.title ?? ''} (${ob.id ?? ''})`],
    [
      t('led.obs.source'),
      [ob.source?.kind, ob.source?.id, ob.source?.version]
        .filter(Boolean)
        .join(' ') || none,
    ],
    [t('led.obs.digest'), ob.digest ?? none],
    [
      t('led.obs.license'),
      [ob.license, ob.credit].filter(Boolean).join('; ') || none,
    ],
    [
      t('led.obs.tool'),
      `${word(`obs.ms.tool.${o.tool.id}`, o.tool.id)}, ${o.tool.version}`,
    ],
    [t('led.obs.params'), pairs(o.tool.params) || none],
    [
      t('led.obs.changes'),
      o.changes?.length ? o.changes.join('; ') : t('led.obs.noChanges'),
    ],
  ];
  if (o.assumptions?.length)
    rows.push([
      t('led.obs.assumed'),
      o.assumptions
        .map(
          a =>
            `${a.id} ${a.value}${a.unit ? ` ${a.unit}` : ''}${a.cite ? ` (${a.cite})` : ''}`
        )
        .join('; '),
    ]);
  if (o.warnings?.length)
    rows.push([
      t('led.obs.warnings'),
      o.warnings.map(w => said(t, `obs.ms.w.${w.code}`, w) ?? w.code).join(' '),
    ]);
  if (o.steps?.length)
    rows.push([
      t('led.obs.steps'),
      o.steps.map(([id, state]) => `${id}: ${state}`).join('; '),
    ]);
  return rows;
}
