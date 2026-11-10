// =============================================================================
// A report composed from marked entries (Prompt 275, part B)
// -----------------------------------------------------------------------------
// The evidence review (./evidenceView.js) lets a student mark entries of the
// ledger "for a report". This is that report: the marked entries of any number
// of investigations, as sections in the order the student chose, each with its
// numbers, a methods paragraph made from what its record says of how it was
// made, and the comparisons the student carried in with the covariance
// statement they were made under. The report of one investigation is another
// thing and is untouched (js/labReport.js, js/notebook/report.js).
//
// The report is a file, gravitas.composed-report/1: numbers, ids and the
// student's own words, no generated prose. Whoever reads it says it in their
// own language from the same record, so the page that made it and the review
// page print the same sentences, and the digest covers what is said and not
// how. Its digest is SHA-256 over its canonical JSON without the digest
// itself; a submission token states that digest (`cr`), and the review page
// recomputes it from the file it is handed. A match says the file is the one
// the digest was made from. It does not say who made it.
//
// What a methods paragraph may say: the instrument (the entry's kind and the
// envelope's source), the settings the record holds, and the seed. A field the
// record does not carry is not printed, except the seed of a simulation, whose
// absence is said, because a reading without one cannot be made again.
//
// Read by My work and by the review page; neither loads it before a report
// exists. No DOM and no storage; the words it needs are loaded by loadSay().
// =============================================================================

import { canonicalJsonExact, sha256Hex } from '../hash.js';
import { formatNumber, roundSig } from '../format.js';
import { toCsv } from '../csv.js';
import { KEY_MADE_PREFIX } from '../names.js';

export const COMPOSED_FORMAT = 'gravitas.composed-report';
export const COMPOSED_VERSION = 1;
/** The one composed report a browser keeps, among the things made. */
export const COMPOSED_ID = 'composed-report';
export const COMPOSED_KEY = `${KEY_MADE_PREFIX}${COMPOSED_ID}`;
export const MAX_SECTIONS = 60;
export const MAX_NUMBERS = 60;
export const MAX_COMPARISONS = 20;
/** The type its CSV is downloaded as. */
export const CSV_TYPE = 'text/csv;charset=utf-8';

const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v, max) =>
  v === null || v === undefined ? '' : String(v).slice(0, max);
const fin = v => (Number.isFinite(v) ? v : null);

/** The origin word of a number, by the envelope's origin (js/notebook/ledger.js). */
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

/**
 * The marked entries, in a report's order: those `order` names first, as it
 * names them, then the rest as the notebook holds them.
 * @param {Array<object>} entries - The notebook's entries
 * @param {string[]} [order] - Entry ids, as the student arranged them
 * @returns {Array<object>}
 */
export function reportOrder(entries, order = []) {
  const place = id => {
    const i = order.indexOf(id);
    return i < 0 ? order.length : i;
  };
  return entries
    .filter(e => e.marked === true)
    .map((e, i) => [e, place(e.id), i])
    .sort((a, b) => a[1] - b[1] || a[2] - b[2])
    .slice(0, MAX_SECTIONS)
    .map(x => x[0]);
}

/**
 * One entry as a section: what the record says, and nothing made up for it.
 * @param {object} entry - A notebook entry
 * @param {object} env - Its envelope (js/notebook/ledger.js envelopeOf)
 * @param {Array<object>} rows - Its rows (evidenceRows([entry], t, locale))
 * @returns {object}
 */
export function sectionOf(entry, env, rows) {
  const p = env.provenance ?? {};
  const s = isObj(p.settings) ? p.settings : {};
  const c = isObj(p.context) ? p.context : null;
  const o = isObj(s.observer) ? s.observer : null;
  const settings = {
    ...(s.scenario ? { scenario: text(s.scenario, 120) } : {}),
    ...(s.integrator ? { integrator: text(s.integrator, 80) } : {}),
    ...(Number.isFinite(s.step) ? { step: s.step } : {}),
    ...(s.frame ? { frame: text(s.frame, 80) } : {}),
    ...(s.seed !== undefined && s.seed !== null && s.seed !== ''
      ? { seed: text(s.seed, 80) }
      : {}),
    ...(o &&
    Number.isFinite(o.positionAngleDeg) &&
    Number.isFinite(o.inclinationDeg)
      ? { observer: [o.positionAngleDeg, o.inclinationDeg] }
      : {}),
    ...(s.schedule ? { schedule: text(s.schedule, 80) } : {}),
    ...(isObj(s.params)
      ? {
          params: Object.entries(s.params)
            .slice(0, 24)
            .map(([k, v]) => [
              text(k, 60),
              text(Array.isArray(v) ? v.join('-') : v, 80),
            ]),
        }
      : {}),
  };
  const at = Number(entry.snapshot?.capturedAt);
  return {
    id: String(entry.id),
    title: text(entry.title || entry.id, 120),
    kind: text(entry.source || env.source.kind, 60),
    ...(at > 0 ? { at: new Date(at).toISOString() } : {}),
    ...(entry.fingerprint ? { fingerprint: text(entry.fingerprint, 80) } : {}),
    ...(entry.tampered === true ? { tampered: true } : {}),
    source: {
      kind: text(env.source.kind, 40),
      id: text(env.source.id, 120),
      ...(env.source.version ? { version: text(env.source.version, 40) } : {}),
      ...(env.source.digest ? { digest: text(env.source.digest, 64) } : {}),
    },
    settings,
    ...(c
      ? {
          where: {
            ...(c.lesson ? { lesson: text(c.lesson, 80) } : {}),
            ...(c.step !== undefined && c.step !== null
              ? { step: text(c.step, 80) }
              : {}),
            ...(c.guide ? { guide: text(c.guide, 80) } : {}),
            ...(c.page ? { page: text(c.page, 40) } : {}),
          },
        }
      : {}),
    ...(env.made?.engineFingerprint
      ? { engine: text(env.made.engineFingerprint, 40) }
      : {}),
    ...(env.made?.platform ? { build: text(env.made.platform, 40) } : {}),
    cite: {
      ...(p.credit ? { credit: text(p.credit, 300) } : {}),
      ...(p.license?.status ? { license: text(p.license.status, 80) } : {}),
      ...(p.retrieved ? { retrieved: text(p.retrieved, 40) } : {}),
      ...(Array.isArray(p.citations) && p.citations.length
        ? { citations: p.citations.slice(0, 8).map(x => text(x, 400)) }
        : {}),
    },
    prose: {
      claim: text(entry.prose?.claim, 600),
      evidence: text(entry.prose?.evidence, 900),
      limitations: text(entry.prose?.limitations, 600),
    },
    warnings: (env.warnings ?? [])
      .filter(w => !/^(truncated|novalue|unit):/.test(w))
      .slice(0, 12)
      .map(w => text(w, 80)),
    numbers: rows.slice(0, MAX_NUMBERS).map(r => ({
      id: text(r.id, 120),
      label: text(r.label, 160),
      value: fin(r.value),
      unit: text(r.unit, 40),
      uncertainty: isObj(r.uncertainty) ? r.uncertainty : { kind: 'none' },
      origin: text(r.origin, 20),
      ...(r.note ? { note: text(r.note, 300) } : {}),
    })),
  };
}

/**
 * A comparison as the report carries it: the two numbers, what was known of
 * how they move together, and the result, all as numbers.
 * @param {object} r - compareEntries()'s result (./evidenceReview.js), ok
 * @param {{a: string, b: string, rho?: ?number, stated?: boolean}} spec - The
 *   two entry ids, the correlation the student gave, and whether the student
 *   said the two share data or calibration
 * @param {Array<object>} sections - The report's sections
 * @returns {object}
 */
export function comparisonOf(r, spec, sections) {
  const side = (entryId, id, q) => {
    const sec = sections.find(x => x.id === entryId);
    return {
      entry: entryId,
      id,
      title: sec?.title ?? entryId,
      label: sec?.numbers.find(n => n.id === id)?.label ?? id,
      value: fin(q.value),
      uncertainty: q.uncertainty,
    };
  };
  const unit = sections
    .find(x => x.id === spec.a)
    ?.numbers.find(n => n.id === r.idA)?.unit;
  return {
    a: side(spec.a, r.idA, r.a),
    b: side(spec.b, r.idB, r.b),
    unit: unit ?? '',
    difference: r.difference,
    sigma: r.sigma,
    nSigma: fin(r.nSigma),
    p: r.p,
    covariance: r.covariance,
    independent: r.independent === true,
    from: r.covarianceFrom ?? null,
    shared: r.shared ?? null,
    ...(Number.isFinite(spec.rho) ? { rho: spec.rho } : {}),
    ...(spec.stated ? { stated: true } : {}),
    assumptions: r.assumptions,
  };
}

/** A carried comparison as compareEstimates() returned it, for its sentence. */
export const resultOf = c => ({
  ok: true,
  difference: c.difference,
  sigma: c.sigma,
  nSigma: c.nSigma === null ? Infinity : c.nSigma,
  p: c.p,
  covariance: c.covariance,
  independent: c.independent,
  shared: c.shared,
  assumptions: c.assumptions,
});

/** The digest a report states: SHA-256 of everything in it but the digest. */
export function composedDigest(report) {
  const body = { ...report };
  delete body.digest;
  return sha256Hex(canonicalJsonExact(body));
}

/** Whether a report is what its digest says. */
export const checkComposed = async report =>
  (await composedDigest(report)) === report.digest;

/**
 * The report, with its digest.
 * @param {{title: string, at: string, app: ?string, sections: object[],
 *   comparisons?: object[]}} parts
 * @returns {Promise<object>} gravitas.composed-report/1
 */
export async function composeReport({
  title,
  at,
  app = null,
  sections,
  comparisons = [],
}) {
  // Through JSON once, so what is hashed is what a file of it holds.
  const body = JSON.parse(
    JSON.stringify({
      format: COMPOSED_FORMAT,
      formatVersion: COMPOSED_VERSION,
      title: text(title, 120),
      madeAt: text(at, 40),
      app: app ? text(app, 40) : null,
      sections: sections.slice(0, MAX_SECTIONS),
      comparisons: comparisons.slice(0, MAX_COMPARISONS),
    })
  );
  return { ...body, digest: await composedDigest(body) };
}

const numberOk = n =>
  isObj(n) &&
  typeof n.id === 'string' &&
  typeof n.label === 'string' &&
  (n.value === null || Number.isFinite(n.value)) &&
  typeof n.unit === 'string' &&
  isObj(n.uncertainty) &&
  typeof n.uncertainty.kind === 'string';

const sectionOk = s =>
  isObj(s) &&
  typeof s.id === 'string' &&
  typeof s.title === 'string' &&
  typeof s.kind === 'string' &&
  isObj(s.source) &&
  typeof s.source.kind === 'string' &&
  typeof s.source.id === 'string' &&
  isObj(s.settings) &&
  isObj(s.cite) &&
  isObj(s.prose) &&
  Array.isArray(s.warnings) &&
  Array.isArray(s.numbers) &&
  s.numbers.length <= MAX_NUMBERS &&
  s.numbers.every(numberOk);

const sideOk = x =>
  isObj(x) &&
  typeof x.entry === 'string' &&
  typeof x.id === 'string' &&
  typeof x.title === 'string' &&
  typeof x.label === 'string' &&
  Number.isFinite(x.value) &&
  isObj(x.uncertainty);

const comparisonOk = c =>
  isObj(c) &&
  sideOk(c.a) &&
  sideOk(c.b) &&
  typeof c.unit === 'string' &&
  Number.isFinite(c.difference) &&
  Number.isFinite(c.sigma) &&
  (c.nSigma === null || Number.isFinite(c.nSigma)) &&
  Number.isFinite(c.p) &&
  typeof c.independent === 'boolean' &&
  Array.isArray(c.assumptions) &&
  c.assumptions.every(a => typeof a === 'string');

/**
 * Whether a value is a composed report this build can read, with the reason
 * if not: `format` (not one), `newer` (written by a later build), `shape`.
 * @param {*} v - A parsed file
 * @returns {{ok: true, report: object}|{ok: false, reason: string}}
 */
export function readComposed(v) {
  if (!isObj(v) || v.format !== COMPOSED_FORMAT)
    return { ok: false, reason: 'format' };
  if (!Number.isInteger(v.formatVersion) || v.formatVersion < 1)
    return { ok: false, reason: 'format' };
  if (v.formatVersion > COMPOSED_VERSION) return { ok: false, reason: 'newer' };
  if (
    typeof v.title !== 'string' ||
    typeof v.madeAt !== 'string' ||
    !/^[0-9a-f]{64}$/.test(v.digest ?? '') ||
    !Array.isArray(v.sections) ||
    v.sections.length < 1 ||
    v.sections.length > MAX_SECTIONS ||
    !v.sections.every(sectionOk) ||
    !Array.isArray(v.comparisons) ||
    v.comparisons.length > MAX_COMPARISONS ||
    !v.comparisons.every(comparisonOk)
  )
    return { ok: false, reason: 'shape' };
  return { ok: true, report: v };
}

// --- Words -------------------------------------------------------------------
// English and Spanish in pairs, as My work's own strings are. The names of
// kinds, origins, flags and uncertainty methods are the catalog's (loadSay).

const WORDS = {
  en: {
    title: 'My evidence report',
    footer: 'Composed in Gravitas from the evidence notebook',
    subtitle: n =>
      n === 1
        ? 'A report composed from 1 entry of the evidence notebook.'
        : `A report composed from ${n} entries of the evidence notebook, in the order its author chose.`,
    made: 'Made',
    build: 'Build',
    sections: 'Sections',
    digest: 'Digest',
    notRecorded: 'not recorded',
    read: 'Every number is printed with its uncertainty and, in brackets, how that uncertainty was found. A number with no uncertainty stated is printed alone. The origin says whether a number was measured, fitted, derived, assumed, or revealed by the simulation.',
    kind: 'Kind',
    kept: 'Recorded',
    checksum: 'Checksum',
    tampered:
      'The checksum of this entry no longer matches its contents: it was changed after it was recorded.',
    claim: 'What this shows',
    numbers: 'Numbers',
    quantity: 'Quantity',
    value: 'Value and uncertainty',
    unitHead: 'Unit',
    origin: 'Origin',
    note: 'Note',
    noValue: 'no value',
    methods: 'Methods',
    sources: 'Sources',
    license: 'Licence',
    retrieved: 'Retrieved',
    evidence: 'What supports it',
    limits: 'What limits it',
    figure: 'Figure',
    comparisons: 'Comparisons',
    comparisonsNote:
      'Each comparison is the difference of two numbers of this report, with the uncertainty of the difference and what was assumed of how the two move together.',
    comparison: 'Comparison',
    first: 'First',
    second: 'Second',
    independence: 'Independence assumed.',
    covRecord: 'Covariance used, as the record states it.',
    covStudent: 'Covariance used, from the correlation the author gave.',
    with: (k, s) => `Made with ${k} (${s}).`,
    version: v => `, version ${v}`,
    scenario: v => `Scenario: ${v}.`,
    integrator: (i, st) =>
      i && st !== null
        ? `Integrator: ${i}; step ${st}.`
        : i
          ? `Integrator: ${i}.`
          : `Step: ${st}.`,
    frame: v => `Reference frame: ${v}.`,
    seed: v => `Seed: ${v}.`,
    noSeed: 'The record carries no seed.',
    observer: (pa, inc) =>
      `Viewing geometry: position angle ${pa} degrees, inclination ${inc} degrees.`,
    schedule: v => `Schedule: ${v}.`,
    params: v => `Settings: ${v}.`,
    data: v => `Digest of the data or the starting state: ${v}.`,
    engine: v => `Engine fingerprint: ${v}.`,
    madeBy: v => `Build: ${v}.`,
    keptIn: v => `Kept in ${v}.`,
    lesson: (l, s) => `investigation ${l}, step ${s}`,
    guide: g => `activity ${g}`,
    pages: {
      sandbox: 'the Sandbox',
      observatory: 'the Observatory',
      experiments: 'the experiment bench',
      lab3d: 'the 3-D lab',
      mission: 'the mission lab',
      compute: 'the compute page',
    },
    csv: [
      'section',
      'entry',
      'kind',
      'quantity_id',
      'quantity',
      'value',
      'unit',
      'uncertainty',
      'sigma',
      'lower',
      'upper',
      'level',
      'basis',
      'origin',
      'statement',
    ],
  },
  es: {
    title: 'Mi informe de evidencia',
    footer: 'Compuesto en Gravitas a partir del cuaderno de evidencia',
    subtitle: n =>
      n === 1
        ? 'Un informe compuesto con 1 entrada del cuaderno de evidencia.'
        : `Un informe compuesto con ${n} entradas del cuaderno de evidencia, en el orden que eligió su autor.`,
    made: 'Hecho',
    build: 'Versión',
    sections: 'Secciones',
    digest: 'Resumen',
    notRecorded: 'sin registrar',
    read: 'Cada número se imprime con su incertidumbre y, entre paréntesis, cómo se obtuvo esa incertidumbre. Un número sin incertidumbre declarada se imprime solo. El origen dice si un número fue medido, ajustado, derivado, supuesto o revelado por la simulación.',
    kind: 'Tipo',
    kept: 'Registrada',
    checksum: 'Suma de control',
    tampered:
      'La suma de control de esta entrada ya no coincide con su contenido: se cambió después de registrarla.',
    claim: 'Qué muestra',
    numbers: 'Números',
    quantity: 'Cantidad',
    value: 'Valor e incertidumbre',
    unitHead: 'Unidad',
    origin: 'Origen',
    note: 'Nota',
    noValue: 'sin valor',
    methods: 'Métodos',
    sources: 'Fuentes',
    license: 'Licencia',
    retrieved: 'Obtenido',
    evidence: 'Qué lo respalda',
    limits: 'Qué lo limita',
    figure: 'Figura',
    comparisons: 'Comparaciones',
    comparisonsNote:
      'Cada comparación es la diferencia de dos números de este informe, con la incertidumbre de la diferencia y lo que se supuso sobre cómo varían juntos.',
    comparison: 'Comparación',
    first: 'Primera',
    second: 'Segunda',
    independence: 'Independencia supuesta.',
    covRecord: 'Covarianza usada, tal como la declara el registro.',
    covStudent:
      'Covarianza usada, a partir de la correlación que dio el autor.',
    with: (k, s) => `Obtenido con ${k} (${s}).`,
    version: v => `, versión ${v}`,
    scenario: v => `Escenario: ${v}.`,
    integrator: (i, st) =>
      i && st !== null
        ? `Integrador: ${i}; paso ${st}.`
        : i
          ? `Integrador: ${i}.`
          : `Paso: ${st}.`,
    frame: v => `Sistema de referencia: ${v}.`,
    seed: v => `Semilla: ${v}.`,
    noSeed: 'El registro no lleva semilla.',
    observer: (pa, inc) =>
      `Geometría de observación: ángulo de posición ${pa} grados, inclinación ${inc} grados.`,
    schedule: v => `Calendario: ${v}.`,
    params: v => `Ajustes: ${v}.`,
    data: v => `Resumen de los datos o del estado inicial: ${v}.`,
    engine: v => `Huella del motor: ${v}.`,
    madeBy: v => `Versión: ${v}.`,
    keptIn: v => `Guardado en ${v}.`,
    lesson: (l, s) => `investigación ${l}, paso ${s}`,
    guide: g => `actividad ${g}`,
    pages: {
      sandbox: 'la simulación libre',
      observatory: 'el Observatorio',
      experiments: 'el banco de experimentos',
      lab3d: 'el laboratorio 3-D',
      mission: 'el laboratorio de misiones',
      compute: 'la página de cálculo',
    },
    csv: [
      'seccion',
      'entrada',
      'tipo',
      'id_cantidad',
      'cantidad',
      'valor',
      'unidad',
      'incertidumbre',
      'sigma',
      'inferior',
      'superior',
      'nivel',
      'base',
      'origen',
      'enunciado',
    ],
  },
};

/** The words of a language (English for any other). */
export const wordsOf = lang => WORDS[lang === 'es' ? 'es' : 'en'];

const identity = x => x;

/**
 * The methods paragraph of a section, from what its record carries: the
 * instrument, the settings and the seed. Deterministic: the same section gives
 * the same sentences, in either language.
 * @param {object} sec - A section
 * @param {string} lang - 'en' or 'es'
 * @param {{kindName?: Function, scenario?: Function}} [say] - The catalog's
 *   name of a kind and of a scenario; the ids themselves without them
 * @returns {string}
 */
export function methodsText(sec, lang, say = {}) {
  const w = wordsOf(lang);
  // A setting as it was set: six figures at most, no padding, and the decimal
  // mark of the language.
  const n = v => {
    const text = String(roundSig(v, 6));
    return lang === 'es' ? text.replace('.', ',') : text;
  };
  const s = sec.settings ?? {};
  const src = `${sec.source.kind} ${sec.source.id}${
    sec.source.version ? w.version(sec.source.version) : ''
  }`;
  const c = sec.where;
  const where = c?.lesson
    ? w.lesson(c.lesson, c.step ?? '-')
    : c?.guide
      ? w.guide(c.guide)
      : c?.page
        ? (w.pages[c.page] ?? c.page)
        : '';
  return [
    w.with((say.kindName ?? identity)(sec.kind), src),
    s.scenario && w.scenario((say.scenario ?? identity)(s.scenario)),
    (s.integrator || Number.isFinite(s.step)) &&
      w.integrator(
        s.integrator ?? '',
        Number.isFinite(s.step) ? n(s.step) : null
      ),
    s.frame && w.frame(s.frame),
    s.seed ? w.seed(s.seed) : sec.source.kind === 'simulation' ? w.noSeed : '',
    Array.isArray(s.observer) && w.observer(n(s.observer[0]), n(s.observer[1])),
    s.schedule && w.schedule(s.schedule),
    Array.isArray(s.params) &&
      s.params.length &&
      w.params(s.params.map(([k, v]) => `${k} ${v}`).join(', ')),
    sec.source.digest && w.data(String(sec.source.digest).slice(0, 16)),
    sec.engine && w.engine(sec.engine),
    sec.build && w.madeBy(sec.build),
    where && w.keptIn(where),
  ]
    .filter(Boolean)
    .join(' ');
}

/** What was assumed of how the two numbers of a comparison move together. */
export const covarianceFlag = (c, lang) => {
  const w = wordsOf(lang);
  return c.independent
    ? w.independence
    : c.from === 'record'
      ? w.covRecord
      : w.covStudent;
};

const dateText = iso => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? String(iso ?? '')
    : d.toISOString().slice(0, 16).replace('T', ' ');
};

/**
 * What a page needs to say a report in its language: the uncertainty statement
 * of a number (Prompt 151's one pattern), the catalog's names, and Prompt
 * 151's sentence of a comparison. Loads the words; `lang` is the page's.
 * @param {string} lang - 'en' or 'es'
 * @param {object} [extra] - More to say with (a `figure` reader)
 * @returns {Promise<object>}
 */
export async function loadSay(lang, extra = {}) {
  const es = lang === 'es';
  const [i18n, deferred, unc, est, cat, rep] = await Promise.all([
    import('../i18n/index.js'),
    import('../i18n/deferredMessages.js'),
    import('../platform/uncertain.js'),
    import('../compare/estimates.js'),
    es ? import('../i18n/es.compare.js') : import('../i18n/en.compare.js'),
    es ? import('../i18n/es.report.js') : import('../i18n/en.report.js'),
  ]);
  // My work says its own strings from the page's language and never set the
  // catalog's: the names below are the catalog's, so it is set here, for this
  // visit only (nothing is stored).
  if (i18n.getLocale() !== (es ? 'es' : 'en'))
    await i18n.setLocale(es ? 'es' : 'en', { persist: false });
  await deferred.ensureDeferredMessages();
  const { t } = i18n;
  const catalog = es ? cat.ES_COMPARE : cat.EN_COMPARE;
  // The ledger's words (the origins) are the lab report's catalog fragment.
  const ledger = es ? rep.ES_REPORT : rep.EN_REPORT;
  const tt = (id, vars = {}) =>
    String(catalog[id] ?? id).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  const or = (id, raw) => {
    if (!id) return raw;
    const s = t(id);
    return s === id ? raw : s;
  };
  const locale = es ? 'es' : 'en';
  return {
    lang: locale,
    line: q =>
      q.value === null && (q.uncertainty?.kind ?? 'none') === 'none'
        ? wordsOf(locale).noValue
        : !q.uncertainty || q.uncertainty.kind === 'none'
          ? formatNumber(q.value, { sig: 6, locale })
          : unc.describeUncertain(
              { value: q.value, uncertainty: q.uncertainty },
              t,
              { locale }
            ).line,
    kindName: k => or(`nb.source.${k}`, k),
    origin: o => ledger[ORIGIN_WORD[o]] ?? or(ORIGIN_WORD[o], o),
    flag: f => or(`nb.flag.${f}`, f),
    scenario: k => or(`scenario.${k}.title`, k),
    compare: c =>
      est.describeComparison(resultOf(c), tt, { locale, unit: c.unit }),
    ...extra,
  };
}

/**
 * Write a report into a document builder (js/pdf.js createDocument,
 * js/htmlReport.js createHtmlDocument, or fragment() below).
 * @param {object} doc - The builder
 * @param {object} report - gravitas.composed-report/1
 * @param {object} say - loadSay()'s
 * @returns {object} The builder
 */
export function fillReport(doc, report, say) {
  const w = wordsOf(say.lang);
  const muted = '0.35 0.35 0.42';
  const alarm = '0.72 0.28 0.14';
  doc.heading(report.title || w.title, { size: 19, spaceBefore: 0 });
  doc.paragraph(w.subtitle(report.sections.length), {
    size: 10.5,
    color: muted,
    gap: 6,
  });
  doc.rule({ gap: 8 });
  doc.row(w.made, dateText(report.madeAt));
  doc.row(w.build, report.app || w.notRecorded);
  doc.row(w.sections, String(report.sections.length));
  doc.row(w.digest, report.digest);
  doc.paragraph(w.read, { size: 9, color: muted });

  report.sections.forEach((sec, i) => {
    doc.heading(`${i + 1}. ${sec.title}`, { size: 14, spaceBefore: 20 });
    doc.row(w.kind, say.kindName(sec.kind));
    if (sec.at) doc.row(w.kept, dateText(sec.at));
    if (sec.fingerprint) doc.row(w.checksum, sec.fingerprint);
    if (sec.tampered) doc.paragraph(w.tampered, { size: 9, color: alarm });
    if (sec.prose.claim) {
      doc.heading(w.claim, { size: 10, spaceBefore: 10 });
      doc.paragraph(sec.prose.claim, { size: 10 });
    }
    if (sec.numbers.length) {
      doc.heading(w.numbers, { size: 10, spaceBefore: 8 });
      // A unit or a note column that would be empty is left out: five
      // columns do not fit a phone, and three usually do.
      const cols = [
        [w.quantity, q => q.label, 0.27, true],
        [w.value, q => say.line(q), 0.28, true],
        [w.unitHead, q => q.unit, 0.1, false],
        [w.origin, q => say.origin(q.origin), 0.12, true],
        [w.note, q => q.note ?? '', 0.23, false],
      ].filter(c => c[3] || sec.numbers.some(q => c[1](q)));
      const total = cols.reduce((sum, c) => sum + c[2], 0);
      doc.table({
        caption: `${w.numbers}: ${sec.title}`,
        columns: cols.map(c => c[0]),
        widths: cols.map(c => c[2] / total),
        rows: sec.numbers.map(q => cols.map(c => c[1](q))),
      });
    }
    doc.heading(w.methods, { size: 10, spaceBefore: 8 });
    doc.paragraph(methodsText(sec, say.lang, say), { size: 10 });
    const cites = [
      sec.cite.credit,
      sec.cite.license && `${w.license}: ${sec.cite.license}`,
      sec.cite.retrieved && `${w.retrieved}: ${sec.cite.retrieved}`,
      ...(sec.cite.citations ?? []),
    ].filter(Boolean);
    if (cites.length) {
      doc.heading(w.sources, { size: 10, spaceBefore: 8 });
      doc.bullets(cites, { size: 9 });
    }
    if (sec.prose.evidence) {
      doc.heading(w.evidence, { size: 10, spaceBefore: 8 });
      doc.paragraph(sec.prose.evidence, { size: 10 });
    }
    const limits = [
      ...sec.warnings.map(x => say.flag(x)),
      ...String(sec.prose.limitations ?? '')
        .split('\n')
        .map(x => x.trim())
        .filter(Boolean),
    ];
    if (limits.length) {
      doc.heading(w.limits, { size: 10, spaceBefore: 8 });
      doc.bullets([...new Set(limits)], { size: 9.5 });
    }
    // The figure is the notebook's, drawn by the page that holds the entry:
    // the report file carries numbers and words, not drawings.
    const f = say.figure?.(sec.id);
    if (f?.series?.length) {
      doc.heading(f.title || w.figure, { size: 10, spaceBefore: 8 });
      if (doc.figure)
        doc.figure({
          series: f.series,
          xLabel: f.xLabel,
          yLabel: f.yLabel,
          logX: f.logX,
        });
      // The numbers the figure draws: the HTML builder writes them itself,
      // under the drawing; a page of the PDF is given them here.
      const first = f.series[0];
      const every = Math.ceil(first.points.length / 12);
      if (Number.isFinite(doc.remaining?.()))
        doc.table({
          caption: `${f.title || w.figure}: ${sec.title}`,
          columns: [f.xLabel || 'x', f.yLabel || 'y'],
          rows: first.points
            .filter((_, k) => k % every === 0)
            .map(([x, y]) => [
              formatNumber(x, { sig: 5, locale: say.lang }),
              formatNumber(y, { sig: 5, locale: say.lang }),
            ]),
        });
    }
  });

  if (report.comparisons.length) {
    doc.heading(w.comparisons, { size: 14, spaceBefore: 20 });
    doc.paragraph(w.comparisonsNote, { size: 9, color: muted });
    report.comparisons.forEach((c, i) => {
      const u = c.unit ? ` ${c.unit}` : '';
      doc.heading(`${w.comparison} ${i + 1}`, { size: 10, spaceBefore: 8 });
      doc.row(w.first, `${c.a.title}. ${c.a.label}: ${say.line(c.a)}${u}`);
      doc.row(w.second, `${c.b.title}. ${c.b.label}: ${say.line(c.b)}${u}`);
      doc.paragraph(`${covarianceFlag(c, say.lang)} ${say.compare(c)}`, {
        size: 10,
      });
    });
  }
  return doc;
}

/**
 * The report's numbers as CSV: one row per number, then one per comparison.
 * Numbers are written as JavaScript writes them, whatever the language.
 * @param {object} report - gravitas.composed-report/1
 * @param {object} say - loadSay()'s
 * @returns {string}
 */
export function reportCsv(report, say) {
  const w = wordsOf(say.lang);
  const v = x => (Number.isFinite(x) ? x : '');
  const rows = [w.csv];
  report.sections.forEach((sec, i) => {
    for (const q of sec.numbers) {
      const u = q.uncertainty;
      rows.push([
        i + 1,
        sec.title,
        sec.kind,
        q.id,
        q.label,
        v(q.value),
        q.unit,
        u.kind,
        v(u.sigma),
        v(u.lo),
        v(u.hi),
        v(u.level),
        u.basis ?? '',
        q.origin,
        say.line(q),
      ]);
    }
  });
  report.comparisons.forEach((c, i) => {
    rows.push([
      `C${i + 1}`,
      `${c.a.title} - ${c.b.title}`,
      'comparison',
      `${c.a.id} - ${c.b.id}`,
      `${c.a.label} - ${c.b.label}`,
      c.difference,
      c.unit,
      'sigma',
      c.sigma,
      '',
      '',
      '',
      c.independent ? 'independence-assumed' : `covariance-${c.from}`,
      'derived',
      `${covarianceFlag(c, say.lang)} ${say.compare(c)}`,
    ]);
  });
  return toCsv(rows);
}

/**
 * A document builder that writes a fragment of a page: the interface of
 * js/pdf.js createDocument, for a reader that shows a report where it is.
 * @param {(s: string) => string} esc - The page's HTML escape
 * @param {number} [level] - The heading level of the report's title
 * @returns {object}
 */
export function fragment(esc, level = 3) {
  const out = [];
  let rows = [];
  const flush = () => {
    if (rows.length) out.push(`<dl>${rows.join('')}</dl>`);
    rows = [];
  };
  const add = html => {
    flush();
    out.push(html);
  };
  return {
    heading(s, { size = 14 } = {}) {
      const n = Math.min(6, level + (size >= 18 ? 0 : size >= 14 ? 1 : 2));
      add(`<h${n}>${esc(s)}</h${n}>`);
    },
    paragraph(s) {
      add(`<p>${esc(s)}</p>`);
    },
    row(label, value) {
      rows.push(`<dt>${esc(label)}</dt><dd>${esc(value)}</dd>`);
    },
    rule() {},
    bullets(items) {
      add(`<ul>${items.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`);
    },
    table({ columns, rows: body, caption = '' }) {
      add(
        `<div class="ui-table-wrap" tabindex="0" role="region" aria-label="${esc(caption)}"><table class="ui-table"><thead><tr>${columns
          .map(c => `<th scope="col">${esc(c)}</th>`)
          .join('')}</tr></thead><tbody>${body
          .map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table></div>`
      );
    },
    build() {
      flush();
      return out.join('');
    },
  };
}
