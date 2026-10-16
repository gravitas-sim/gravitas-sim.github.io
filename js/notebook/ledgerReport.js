// =============================================================================
// The ledger's part of a report
// -----------------------------------------------------------------------------
// The evidence table, the methods, the figures with their data, the limitations
// and the sources, written into a pdf.js document, and the loader a lab report
// and its submission token share. Deliberately free of js/pdf.js: the lab report
// that prints these is in the lesson engine's chunk with the writer, and a
// module that imported the writer as well would split it into a chunk of its
// own and cost every lesson a request. It is handed the document.
// =============================================================================

import { t, getLocale } from '../i18n/index.js';
import { formatNumber, roundSig, withUncertainty } from '../format.js';
import { ensureDeferredMessages } from '../i18n/deferredMessages.js';
import { load } from './store.js';
import { canonicalJsonExact, sha256Hex } from '../hash.js';
import {
  contextText,
  envelopeOf,
  evidenceRows,
  ledgerDigest,
  ledgerRecord,
} from './ledger.js';

/**
 * A translated string, or a fallback when the id is not in the catalog.
 *
 * t() returns the id and warns once when a message is missing, which is right
 * for a hard-coded id and wrong for a dynamic one: a notebook restored from a
 * file written by a newer build can carry a flag this build has no name for,
 * and printing `nb.flag.something-new` in a report a student hands in would be
 * worse than printing the raw flag. The generated ids are all covered by the
 * catalog and asserted by tests/notebook.test.js; this is for the ones that
 * arrive from a file.
 *
 * @param {string} id - Message id
 * @param {string} fallback - What to print when there is no message
 * @returns {string} Text
 */
export const orRaw = (id, fallback) => {
  const text = t(id);
  return text === id ? fallback : text;
};

/** A number for reading: significant figures, not fixed decimals. */
export function valueText(value, unit) {
  if (value === null || value === undefined) return t('nb.report.noValue');
  const abs = Math.abs(value);
  const digits =
    abs === 0
      ? '0'
      : abs < 1e-4 || abs >= 1e6
        ? value.toExponential(3)
        : String(roundSig(value, 6));
  return unit ? `${digits} ${unit}` : String(digits);
}

/**
 * A recorded scenario as a reader says it: an id's title, or the English name
 * an entry made before scenarios had ids recorded, as it was written.
 */
export const scenarioName = key => {
  const id = `scenario.${key}.title`;
  const title = t(id);
  return title === id ? key : title;
};

/** A value with its uncertainty at the uncertainty's precision, no unit. */
export function rowValue(r, locale = getLocale()) {
  return r.half > 0
    ? withUncertainty(r.value, r.half, { locale })
    : formatNumber(r.value, { sig: 6, locale });
}

/** The settings of every distinct way the entries were made, as sentences. */
function methodLines(entries, t, locale) {
  const seen = new Set();
  const lines = [];
  for (const e of entries) {
    const env = envelopeOf(e);
    const s = env.provenance?.settings;
    if (!s) continue;
    const parts = [
      s.scenario && `${t('nb.prov.scenario')}: ${scenarioName(s.scenario)}`,
      s.integrator && `${t('led.m.integrator')}: ${s.integrator}`,
      Number.isFinite(s.step) &&
        `${t('led.m.step')}: ${formatNumber(s.step, { sig: 4, locale })}`,
      s.frame && `${t('nb.prov.frame')}: ${s.frame}`,
      s.seed && `${t('nb.prov.seed')}: ${s.seed}`,
      s.observer &&
        `${t('nb.prov.geometry')}: ${t('nb.prov.geometryValue', {
          pa: valueText(s.observer.positionAngleDeg, ''),
          inc: valueText(s.observer.inclinationDeg, ''),
        })}`,
      s.schedule && `${t('led.m.schedule')}: ${s.schedule}`,
      s.params &&
        `${t('led.obs.params')}: ${Object.entries(s.params)
          .map(([k, v]) => `${k} ${Array.isArray(v) ? v.join('-') : v}`)
          .join(', ')}`,
    ].filter(Boolean);
    const line = `${env.source.kind} ${env.source.id}: ${parts.join('; ')}`;
    if (parts.length && !seen.has(line)) {
      seen.add(line);
      lines.push(line);
    }
  }
  return lines;
}

/**
 * The part of a report that is made from the ledger: the evidence table, the
 * methods the numbers were made by, the figures with their data, the
 * limitations and the provenance of every source. Said in the reader's
 * language, now; the numbers are the envelopes' own.
 *
 * @param {object} doc - A pdf.js document
 * @param {Array<object>} entries - The notebook, in the student's order
 * @param {{locale?: string, digest?: string}} [opts] - `digest` is the
 *   ledger's (./ledger.js ledgerDigest()), which the submission token states
 */
export function evidenceSections(
  doc,
  entries,
  { locale = getLocale(), digest = '' } = {}
) {
  if (!entries.length) return;
  const rows = evidenceRows(entries, t, locale);
  doc.heading(t('led.evidence'), { size: 14 });
  doc.paragraph(
    t('led.evidenceNote', { n: rows.length, entries: entries.length }),
    {
      size: 9,
      color: '0.35 0.35 0.42',
    }
  );
  doc.table({
    columns: [
      t('nb.report.colQuantity'),
      t('nb.report.colValue'),
      t('led.col.unit'),
      t('nb.report.colKind'),
      t('led.col.origin'),
    ],
    widths: [0.28, 0.2, 0.1, 0.12, 0.3],
    rows: rows.map(r => [
      `${r.n}. ${r.label}`,
      rowValue(r, locale),
      r.unit,
      r.kind,
      `${r.source.kind} ${r.source.id}${
        r.source.digest ? ` ${r.source.digest.slice(0, 12)}` : ''
      }`,
    ]),
  });
  if (digest) doc.row(t('led.digest'), digest);
  doc.row(t('led.ids'), ledgerRecord(entries).ids.join(', '));

  const lines = methodLines(entries, t, locale);
  if (lines.length) {
    doc.heading(t('led.methods'), { size: 12, spaceBefore: 10 });
    doc.bullets(lines, { size: 9 });
  }

  const figures = entries.filter(e => e.snapshot.figure?.series?.length);
  if (figures.length) {
    doc.heading(t('led.figures'), { size: 12, spaceBefore: 10 });
    for (const e of figures) {
      const f = e.snapshot.figure;
      const say = (id, vars, text) =>
        id && orRaw(id, '') ? t(id, vars) : text;
      doc.heading(say(f.tid, f.tv, f.title) || t('nb.report.figure'), {
        size: 10,
        spaceBefore: 8,
      });
      doc.figure({
        series: f.series,
        xLabel: say(f.xid, f.xv, f.xLabel),
        yLabel: say(f.yid, f.yv, f.yLabel),
        logX: f.logX,
      });
      // The data under the figure: what a reader who cannot see it is given.
      const first = f.series[0];
      doc.table({
        columns: [say(f.xid, f.xv, f.xLabel), say(f.yid, f.yv, f.yLabel)],
        rows: first.points
          .filter((_, i) => i % Math.ceil(first.points.length / 12) === 0)
          .map(([x, y]) => [
            formatNumber(x, { sig: 5, locale }),
            formatNumber(y, { sig: 5, locale }),
          ]),
      });
    }
  }

  const limits = [];
  for (const e of entries) {
    const env = envelopeOf(e);
    for (const w of env.warnings ?? []) {
      if (/^(truncated|novalue|unit):/.test(w)) continue;
      limits.push(`${entries.indexOf(e) + 1}. ${orRaw(`nb.flag.${w}`, w)}`);
    }
    if (e.prose.limitations)
      limits.push(
        `${entries.indexOf(e) + 1}. ${e.prose.limitations.replace(/\s+/g, ' ')}`
      );
  }
  if (limits.length) {
    doc.heading(t('led.limits'), { size: 12, spaceBefore: 10 });
    doc.bullets([...new Set(limits)], { size: 9 });
  }

  const cites = [];
  const seen = new Set();
  for (const e of entries) {
    const env = envelopeOf(e);
    const p = env.provenance ?? {};
    const key = `${env.source.kind}|${env.source.id}|${env.source.digest}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const where = contextText(p.context, t);
    cites.push(
      [
        `${env.source.kind} ${env.source.id}${env.source.version ? ` ${env.source.version}` : ''}`,
        env.source.digest && `${t('nb.cite.digest')}: ${env.source.digest}`,
        p.license && `${t('led.obs.license')}: ${p.license.status}`,
        p.credit,
        p.retrieved && `${t('led.retrieved')}: ${p.retrieved}`,
        ...(p.citations ?? []),
        where && `${t('led.kept')}: ${where}`,
      ]
        .filter(Boolean)
        .join('. ')
    );
  }
  doc.heading(t('led.sources'), { size: 12, spaceBefore: 10 });
  doc.bullets(cites, { size: 9 });
}

/**
 * One record as a report and a submission token carry it: the name, the seed,
 * the scenario it came from, the build, the engine fingerprint, a digest, and
 * the link when it is short enough to travel in a token. A longer link is
 * handed in as a file.
 * @param {object} r - A record
 * @returns {Promise<object>} Short keys: k kind, n name, s seed, p identity
 *   [id, version], a build, f engine fingerprint, h digest, l link, e entries
 */
async function tokenForm(r, entryNumbers, linkMax) {
  const sc = r.scenario;
  const link = sc && sc.link.length <= linkMax ? sc.link : null;
  const basis = sc ? sc.link : r.experiment.hash;
  return {
    k: r.kind === 'scenario' ? 'sc' : 'ex',
    n: r.name.slice(0, 80),
    s: sc ? sc.seed.slice(0, 40) : null,
    p: sc?.derivedFrom ? [sc.derivedFrom.id, sc.derivedFrom.version] : null,
    a: r.app,
    f: r.experiment?.engine?.fingerprint ?? null,
    h: (await sha256Hex(canonicalJsonExact(basis))).slice(0, 16),
    l: link,
    e: entryNumbers,
  };
}

/** The scenarios and experiments attached to the evidence, printed. */
function systemSections(doc, systems) {
  if (!systems.length) return;
  doc.heading(t('led.systems'), { size: 12, spaceBefore: 10 });
  doc.paragraph(t('led.systemsNote'), { size: 9, color: '0.35 0.35 0.42' });
  const none = t('led.obs.noChanges');
  doc.table({
    columns: ['name', 'kind', 'seed', 'from', 'build', 'entries'].map(c =>
      t(`led.sys.col.${c}`)
    ),
    widths: [0.22, 0.1, 0.12, 0.22, 0.22, 0.12],
    rows: systems.map(x => [
      x.n,
      t(`led.sys.kind.${x.k}`),
      x.s || none,
      x.p ? `${x.p[0]} ${x.p[1]}` : none,
      [x.a, x.f && `${t('nb.cite.engine')} ${x.f}`]
        .filter(Boolean)
        .join(', ') || none,
      x.e.join(', '),
    ]),
  });
  for (const x of systems)
    doc.row(
      `${x.n} (${x.h})`,
      x.l ? new URL(`/#${x.l}`, location.origin).href : t('led.sys.file')
    );
}

/**
 * The ledger a lab report and its submission token are made from: the kept
 * entries, their record and digest, the rows for the title block, and the
 * function that prints the evidence sections. Null when nothing is kept.
 * Loads the words it is said in.
 * @returns {Promise<?{record: object, digest: string, meta: Array<[string,
 *   string]>, print: (doc: object) => void}>}
 */
export async function ledgerForReport() {
  const loaded = load();
  const entries = loaded.ok ? loaded.entries : [];
  if (!entries.length) return null;
  await ensureDeferredMessages().catch(() => {});
  const record = ledgerRecord(entries);
  const digest = await ledgerDigest(record);
  // Scenarios and experiments attached to these entries (js/myWork/made.js).
  const made = await import('../myWork/made.js');
  const systems = await Promise.all(
    made
      .attachedTo(entries.map(e => e.id))
      .slice(0, made.TOKEN_MADE)
      .map(r =>
        tokenForm(
          r,
          entries.flatMap((e, i) =>
            r.attachedTo.includes(e.id) ? [i + 1] : []
          ),
          made.TOKEN_LINK_MAX
        )
      )
  );
  if (systems.length) record.sy = systems;
  const meta = document.querySelector('meta[name="gravitas-revision"]');
  const engines = [
    ...new Set(
      entries.map(e => envelopeOf(e).made?.engineFingerprint).filter(Boolean)
    ),
  ];
  return {
    record,
    digest,
    meta: [
      [t('led.app'), `Gravitas ${meta?.content || t('nb.report.notRecorded')}`],
      [t('led.formats'), 'artifact/1, report/2, token/2'],
      ...(engines.length ? [[t('nb.cite.engine'), engines.join(', ')]] : []),
    ],
    print: doc => {
      evidenceSections(doc, entries, { digest });
      systemSections(doc, systems);
    },
  };
}
