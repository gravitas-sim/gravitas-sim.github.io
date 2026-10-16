// =============================================================================
// Stars and their populations: from a spectrum to a cluster's age
// -----------------------------------------------------------------------------
// The second suite of guided investigations, done in the Observatory with
// real SDSS spectra and photometry, SEGUE's spectroscopic parameters, MIST's
// isochrones and a TESS light curve, and the workspace's own tools
// (STELLAR_POPULATIONS.md):
//
//   pop-spectra    what a spectrum says: hydrogen lines, a molecular band,
//                  and a star whose type does not say how luminous it is
//   pop-cmd        a cluster's color-magnitude diagram, and what the survey
//                  left out of it: the crowded core, the saturated giants,
//                  the stars in front of and behind it
//   pop-members    who belongs: a velocity cut, the field stars it cannot
//                  remove, and three metallicities for one cluster
//   pop-age        ages from models: isochrones against the members, and how
//                  metallicity, reddening and distance trade against age
//   pop-variable   a star that varies: an RR Lyrae star's period, its light
//                  curve's shape, its distance, and a period search fooled
//
// As in the exoplanet suite (./exoplanet.js), every number a step checks is
// one the reader measured with the workspace's tools, or one this module
// computes from the data on screen by the rule it states; the literature's
// are ADOPTED below with their sources, and a step that uses one says so.
// The isochrones are a MODEL: the guides compare them with the stars and
// never treat them as a measurement.
//
// Steps are `path: 'both'` or `'advanced'`, their words `gd.<guide>.<step>`
// in js/i18n/{en,es}.populations.js; js/observatory/guides/core.js is what a
// step is and how it is checked. tests/populationsGuides.test.js checks every
// step against those rules and every answer against the data.
// =============================================================================

import {
  LINES,
  measureLine,
  presetWindows,
} from '../../measure/spectrumLine.js';
import { describeColumn } from '../../measure/describe.js';
import { filterRows, separationDeg } from '../../measure/tableOps.js';

/** What the guides open, and where each comes from. */
export const TARGETS = {
  'sdss-a': { observation: 'builtin:sdss-dr18-a', fixture: 'sdss-a' },
  'sdss-g': { observation: 'builtin:sdss-dr18-g', fixture: 'sdss-g' },
  'sdss-k': { observation: 'builtin:sdss-dr18-k', fixture: 'sdss-k' },
  'sdss-m': { observation: 'builtin:sdss-dr18-m', fixture: 'sdss-m' },
  photometry: {
    observation: 'pack:sdss-dr18-ngc2420-photometry@1.0.0',
    fixture: 'ngc2420-photometry',
  },
  segue: {
    observation: 'pack:sdss-dr18-ngc2420-segue@1.0.0',
    fixture: 'ngc2420-segue',
  },
  isochrones: {
    observation: 'pack:mist-sdss-isochrones@1.0.0',
    fixture: 'mist-isochrones',
  },
  // Installed from the catalog (catalog/catalog.json) the first time a guide
  // opens it, and kept in the browser for offline use.
  'su-dra': {
    observation: 'installed:su-dra-tess-s15@1.0.0',
    install: 'community.su-dra-tess-s15',
  },
  'hd209458-lc': {
    observation: 'pack:tess-hd209458-s56-lc@1.0.0',
    fixture: 'tess-light-curve',
  },
};

/**
 * The literature's values a guide adopts or sets beside a measurement, never
 * its data. tests/populationsGuides.test.js ties the pipeline's to the
 * spectra's own record (js/data/spectra/, which no page imports), the center
 * to the pack's, and HD 209458's period to the exoplanet suite's.
 */
export const ADOPTED = {
  // SDSS DR18's SpecObj table: the parameters of the ELODIE library star
  // whose spectrum matches best. A nearest template, not a measurement.
  pipeline: {
    ref: 'SDSS DR18 SpecObj (Almeida et al. 2023, ApJS 267, 44): the best-matching ELODIE template (elodieSpType, elodieTEff, elodieLogG, elodieFeH)',
    stars: {
      a: { type: 'A1V', teff: 7852, logg: 3.18, feh: -1.67 },
      g: { type: 'G5', teff: 5625, logg: 4.2, feh: -0.21 },
      k: { type: 'K3V', teff: 4775, logg: 4.409, feh: -0.12 },
      m: { type: 'M2Vvar', teff: 3980, logg: 4.958, feh: -0.04 },
    },
  },
  // The Sun's surface gravity, log g in cgs units, from its nominal GM and
  // radius: a dwarf's, for comparison.
  sunGravity: {
    value: 4.438,
    ref: 'IAU 2015 Resolution B3: GM 1.3271244e20 m³/s², R 6.957e8 m',
  },
  ngc2420: {
    center: { ra: 114.602, dec: 21.575 },
    r50: 0.053,
    members: 393,
    logAge: 9.24,
    dm: 12.06,
    distance: 2587,
    av: 0.04,
    ref: 'Cantat-Gaudin et al. 2020, A&A 640, A1 (Gaia DR2 members; ages from PARSEC isochrones)',
  },
  lee2008: {
    rv: 74.8,
    rvSigma: 6.2,
    members: 130,
    feh: -0.46,
    ref: 'Lee et al. 2008b, AJ 136, 2050, Table 2 (the SEGUE pipeline on DR6 spectra)',
  },
  webda: {
    dm: 12.54,
    ebv: 0.03,
    age: 2.2,
    feh: -0.44,
    ref: 'Lee et al. 2008b, AJ 136, 2050, Table 1 (from WEBDA; [Fe/H] from Gratton 2000, high-resolution spectra)',
  },
  apogee: {
    feh: -0.16,
    sigma: 0.04,
    ref: 'Souto et al. 2016, ApJ 830, 35 (APOGEE spectra of 12 red giants)',
  },
  // Schlegel, Finkbeiner & Davis 1998's map toward the cluster, as Lee et al.
  // quote it, and E(g - r) from it by Schlafly & Finkbeiner 2011's Table 6:
  // (3.303 - 2.285) E(B - V).
  dustMap: {
    ebv: 0.041,
    egr: 0.042,
    ref: 'Schlegel et al. 1998 via Lee et al. 2008b; E(g - r) by Schlafly & Finkbeiner 2011, ApJ 737, 103, Table 6',
  },
  suDra: {
    v: 9.78,
    feh: -1.8,
    av: 0.03,
    parallax: 1.42,
    parallaxSigma: 0.16,
    ref: 'Benedict et al. 2011, AJ 142, 187, Tables 1 and 8 (HST parallax)',
    period: 0.66042001,
    periodRef: 'Monson et al. 2017, AJ 153, 96',
  },
  // M_V = slope ([Fe/H] - pivot) + zero, calibrated on five RR Lyrae stars'
  // HST parallaxes, SU Dra's among them.
  rrLyrae: {
    slope: 0.214,
    pivot: -1.5,
    zero: 0.45,
    ref: 'Benedict et al. 2011, AJ 142, 187, eq. 14 (slope from Gratton et al. 2004)',
  },
  hd209458: {
    period: 3.52474859,
    ref: 'Stassun et al. 2017, AJ 153, 136',
  },
};

// The rings the photometry is counted in (arcmin): a circle about the core,
// an annulus clear of the cluster, and the magnitude both are counted to.
export const RINGS = { inner: [3, 8], outer: [10, 14.14], faint: 20 };
// The radius a step counts within, arcmin.
export const CORE = 3;
// A red giant, for counting: a surface gravity below this.
export const GIANT = 3.5;
// A dust-free RR Lyrae star against one behind this much of it (V, mag).
export const DUSTY = 0.3;

// --- The rules the answers follow ---------------------------------------------

const column = (o, id) => o?.columns.find(c => c.id === id)?.values ?? null;

/** The median of the finite values, as the column summary gives it. */
export function median(values) {
  try {
    return describeColumn(values).median;
  } catch {
    return null;
  }
}

/** Each row's distance from a center on the sky, arcmin. */
export function radii(o, center) {
  const ra = column(o, 'ra');
  const dec = column(o, 'dec');
  if (!ra || !dec) return null;
  return Array.from(ra, (a, i) =>
    Number.isFinite(a) && Number.isFinite(dec[i])
      ? separationDeg(a, dec[i], center.ra, center.dec) * 60
      : NaN
  );
}

/** Where the reader centered the distance column, or the adopted center. */
const centerOf = (c, step = 'radius') => {
  const s = c.evidence(step)?.separation;
  return s ? { ra: s.center[0], dec: s.center[1] } : ADOPTED.ngc2420.center;
};

/**
 * The stars in each ring, brighter than `faint` in g, and how many there are
 * per square arcminute. Where the cluster's stars are spread over a field of
 * stars in front of it and behind it, the outer ring measures the field.
 */
export function ringCounts(o, center, rings = RINGS) {
  const r = radii(o, center);
  const g = column(o, 'g');
  if (!r || !g) return null;
  const ring = ([lo, hi]) => {
    let n = 0;
    r.forEach((x, i) => {
      if (x >= lo && x < hi && g[i] < rings.faint) n++;
    });
    const area = Math.PI * (hi * hi - lo * lo);
    return { n, area, density: n / area };
  };
  const inner = ring(rings.inner);
  const outer = ring(rings.outer);
  return { inner, outer, fieldShare: outer.density / inner.density };
}

/**
 * The rows of a table whose value in one column passes two tests, as the
 * filter tool keeps them: a crop is `>=` and `<=`.
 */
function rowsWhere(o, id, [lo, loOp], [hi, hiOp]) {
  const c = o?.columns.find(k => k.id === id);
  if (!c || !Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  const unit = c.unit ?? null;
  return filterRows(o, [
    { column: id, op: loOp, value: lo, unit },
    { column: id, op: hiOp, value: hi, unit },
  ]).keep;
}
const cropped = (o, id, min, max) => rowsWhere(o, id, [min, '>='], [max, '<=']);

/** The members a step's velocity crop kept, as row numbers. */
const membersOf = (c, step = 'crop') =>
  cropped(
    c.observation('segue'),
    'rv',
    c.quantity(step, 'min'),
    c.quantity(step, 'max')
  );

/**
 * The field stars expected among the members: the stars in the window's
 * width either side of it, averaged. It assumes the field's velocities
 * change slowly across the window, and counts the cluster's own stars that
 * spill past its ends, so it is an upper estimate.
 */
export function fieldInWindow(o, min, max) {
  const w = max - min;
  const below = rowsWhere(o, 'rv', [min - w, '>='], [min, '<'])?.length;
  const above = rowsWhere(o, 'rv', [max, '>'], [max + w, '<='])?.length;
  return below === undefined || above === undefined
    ? null
    : (below + above) / 2;
}

/** M_V of an RR Lyrae star of this [Fe/H], by the adopted relation. */
export const rrLyraeMv = (feh, r = ADOPTED.rrLyrae) =>
  r.slope * (feh - r.pivot) + r.zero;

/** A distance from an apparent and an absolute magnitude, and extinction. */
export const distanceOf = (m, M, A) => 10 ** ((m - A - M) / 5 + 1);

/** The Balmer H-alpha line's windows for a spectrum, as the panel offers. */
export function halphaOf(o) {
  const L = LINES.find(l => l.id === 'ha');
  const w = presetWindows(
    L,
    o.spectral?.medium ?? 'vacuum',
    o.spectral?.redshift ?? 0
  );
  const x = column(o, o.axes.x);
  const y = column(o, o.axes.y);
  return measureLine(
    { x, y, dy: null },
    { line: w.line, blue: w.blue, red: w.red, rest: w.rest }
  );
}

/** The spread of a folded light curve: half its 1st to 99th percentile. */
export function halfRange(values) {
  const v = [...values].filter(Number.isFinite).sort((a, b) => a - b);
  if (v.length < 100) return null;
  const at = f => v[Math.floor(f * (v.length - 1))];
  return (at(0.99) - at(0.01)) / 2;
}

/**
 * The expected answer to an `answer` step (core.js answerContext says what
 * `c` holds). Null means it cannot be worked out yet.
 */
export const ANSWERS = {
  halphaEw: c => c.quantity('halpha', 'ew'),
  tio5: c => c.quantity('tio5', 'index'),
  halphaVelocity: c => c.quantity('halpha', 'velocity'),
  coreCount: c => {
    const r = radii(c.observation('photometry'), centerOf(c));
    return r ? r.filter(x => x < CORE).length : null;
  },
  fieldShare: c =>
    ringCounts(c.observation('photometry'), centerOf(c))?.fieldShare ?? null,
  brightest: c => {
    const g = column(c.observation('photometry'), 'g');
    return g ? Math.min(...Array.from(g).filter(Number.isFinite)) : null;
  },
  faintDropped: c =>
    c.pack('photometry')?.masks.find(m => m.column === 'psfMag_g')?.dropped ??
    null,
  memberCount: c => membersOf(c)?.length ?? null,
  memberRv: c => {
    const rows = membersOf(c);
    const rv = column(c.observation('segue'), 'rv');
    return rows && rv ? median(rows.map(i => rv[i])) : null;
  },
  memberFeh: c => {
    const rows = membersOf(c);
    const feh = column(c.observation('segue'), 'feh');
    return rows && feh ? median(rows.map(i => feh[i])) : null;
  },
  fieldInWindow: c =>
    fieldInWindow(
      c.observation('segue'),
      c.quantity('crop', 'min'),
      c.quantity('crop', 'max')
    ),
  memberGiants: c => {
    const rows = membersOf(c);
    const logg = column(c.observation('segue'), 'logg');
    return rows && logg ? rows.filter(i => logg[i] < GIANT).length : null;
  },
  ageMid: c => c.quantity('fit-mid', 'age'),
  dmMid: c => c.quantity('fit-mid', 'dm'),
  dmSolar: c => c.quantity('fit-solar', 'dm'),
  ageMap: c => c.quantity('fit-map', 'age'),
  distanceSolar: c => c.quantity('fit-solar', 'distance'),
  period: c => c.quantity('period', 'period'),
  amplitude: c => c.quantity('period', 'amplitude'),
  candleDistance: () => {
    const s = ADOPTED.suDra;
    return distanceOf(s.v, rrLyraeMv(s.feh), s.av);
  },
  dustyDistance: () => {
    const s = ADOPTED.suDra;
    return distanceOf(s.v, rrLyraeMv(s.feh), s.av + DUSTY);
  },
};

/** The option a data-dependent choice accepts, from the same context. */
export const CORRECT = {
  // Of the two fits, the one with the smaller statistic.
  betterFit: c => {
    const mid = c.quantity('fit-mid', 'statistic');
    const solar = c.quantity('fit-solar', 'statistic');
    if (mid === null || solar === null) return null;
    return mid <= solar ? 'metal-poor' : 'solar';
  },
  // The candle's distance within two standard errors of the parallax's
  // (the error of 1 / parallax, to first order).
  parallax: () => {
    const s = ADOPTED.suDra;
    const d = 1000 / s.parallax;
    const sigma = (1000 * s.parallaxSigma) / s.parallax ** 2;
    return Math.abs(ANSWERS.candleDistance() - d) <= 2 * sigma
      ? 'agree'
      : 'disagree';
  },
};

/**
 * The five guides. A `do` step's `check` says what the workspace must hold;
 * an `answer` step's `expect` names an ANSWERS function and how close a typed
 * answer must be; a `choose` step's `correct` is an option, a CORRECT
 * function (`{answer}`), or null for a prediction. `show` is a panel of
 * numbers the runner draws, and `uses` the measurement tools a step sends the
 * reader to without checking their result (its answer is checked instead),
 * for the instructors' curriculum map.
 */
export const GUIDES = [
  {
    id: 'pop-spectra',
    minutes: { intro: 15, advanced: 20 },
    level: 'intro',
    tags: ['observing', 'stars'],
    steps: [
      { id: 'intro', kind: 'read', path: 'both' },
      {
        id: 'predict-lines',
        kind: 'choose',
        path: 'both',
        options: ['a', 'g', 'k', 'm'],
        correct: null,
      },
      {
        id: 'open-a',
        kind: 'do',
        path: 'both',
        go: { open: 'sdss-a' },
        check: { kind: 'opened', target: 'sdss-a' },
      },
      {
        id: 'halpha',
        kind: 'do',
        path: 'both',
        go: { panel: 'measure' },
        check: {
          kind: 'measured',
          target: 'sdss-a',
          tool: 'line',
          params: { rest: 6564.61 },
          quantity: 'ew',
          within: [4, 10],
        },
      },
      {
        id: 'ew',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'halphaEw', tolerance: 0.1 },
      },
      {
        id: 'rank',
        kind: 'choose',
        path: 'both',
        show: 'halpha',
        options: ['temperature', 'composition', 'distance'],
        correct: 'temperature',
      },
      {
        id: 'open-m',
        kind: 'do',
        path: 'both',
        go: { open: 'sdss-m' },
        check: { kind: 'opened', target: 'sdss-m' },
      },
      {
        id: 'tio5',
        kind: 'do',
        path: 'both',
        go: { panel: 'measure' },
        check: {
          kind: 'measured',
          target: 'sdss-m',
          tool: 'band',
          params: { 'band.0': 7126, 'band.1': 7135 },
          quantity: 'index',
          within: [0.5, 0.8],
        },
      },
      {
        id: 'tio5-value',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'tio5', tolerance: 0.005 },
      },
      {
        id: 'velocity',
        kind: 'answer',
        path: 'advanced',
        expect: { answer: 'halphaVelocity', tolerance: 5 },
      },
      {
        id: 'gravity',
        kind: 'choose',
        path: 'both',
        show: 'pipeline',
        options: ['dwarf', 'larger', 'cannot'],
        correct: 'larger',
      },
      {
        id: 'halo',
        kind: 'choose',
        path: 'advanced',
        options: ['disk', 'halo', 'cannot'],
        correct: 'halo',
      },
      { id: 'wrap', kind: 'read', path: 'both' },
    ],
  },
  {
    id: 'pop-cmd',
    minutes: { intro: 20, advanced: 30 },
    level: 'intro',
    tags: ['stars', 'stellar-evolution'],
    steps: [
      { id: 'intro', kind: 'read', path: 'both' },
      {
        id: 'open',
        kind: 'do',
        path: 'both',
        go: { open: 'photometry' },
        check: { kind: 'opened', target: 'photometry' },
      },
      {
        id: 'color',
        kind: 'do',
        path: 'both',
        check: {
          kind: 'changed',
          target: 'photometry',
          op: 'derive',
          terms: [
            ['g', 1],
            ['r', -1],
          ],
        },
      },
      {
        id: 'predict-core',
        kind: 'choose',
        path: 'both',
        options: ['most', 'even', 'fewest'],
        correct: null,
      },
      {
        id: 'radius',
        kind: 'do',
        path: 'both',
        check: {
          kind: 'changed',
          target: 'photometry',
          op: 'derive',
          separation: true,
        },
      },
      {
        id: 'core',
        kind: 'answer',
        uses: ['filter'],
        path: 'both',
        expect: { answer: 'coreCount', tolerance: 0 },
      },
      {
        id: 'why-core',
        kind: 'choose',
        path: 'both',
        show: 'core',
        options: ['none', 'crowding', 'dust'],
        correct: 'crowding',
      },
      {
        id: 'field',
        kind: 'answer',
        path: 'both',
        show: 'rings',
        expect: { answer: 'fieldShare', tolerance: 0.02 },
      },
      {
        id: 'bright',
        kind: 'answer',
        uses: ['describe'],
        path: 'both',
        expect: { answer: 'brightest', tolerance: 0.01 },
      },
      {
        id: 'why-bright',
        kind: 'choose',
        path: 'both',
        options: ['none', 'saturated', 'far'],
        correct: 'saturated',
      },
      {
        id: 'faint',
        kind: 'answer',
        path: 'advanced',
        expect: { answer: 'faintDropped', tolerance: 0 },
      },
      { id: 'wrap', kind: 'read', path: 'both' },
    ],
  },
  {
    id: 'pop-members',
    minutes: { intro: 20, advanced: 30 },
    level: 'intro',
    tags: ['observing', 'stars'],
    steps: [
      { id: 'intro', kind: 'read', path: 'both' },
      {
        id: 'open',
        kind: 'do',
        path: 'both',
        go: { open: 'segue' },
        check: { kind: 'opened', target: 'segue' },
      },
      {
        id: 'predict-rv',
        kind: 'choose',
        path: 'both',
        options: ['one', 'spread', 'two'],
        correct: null,
      },
      {
        id: 'crop',
        kind: 'do',
        path: 'both',
        check: {
          kind: 'changed',
          target: 'segue',
          op: 'crop',
          column: 'rv',
          min: [55, 72],
          max: [78, 95],
        },
      },
      {
        id: 'members',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'memberCount', tolerance: 0 },
      },
      {
        id: 'rv',
        kind: 'answer',
        uses: ['describe'],
        path: 'both',
        show: 'rv',
        expect: { answer: 'memberRv', tolerance: 0.1 },
      },
      {
        id: 'field',
        kind: 'answer',
        path: 'advanced',
        show: 'neighbors',
        expect: { answer: 'fieldInWindow', tolerance: 0.5 },
      },
      {
        id: 'feh',
        kind: 'answer',
        uses: ['describe'],
        path: 'both',
        expect: { answer: 'memberFeh', tolerance: 0.01 },
      },
      {
        id: 'feh-why',
        kind: 'choose',
        path: 'both',
        show: 'feh',
        options: ['segue', 'apogee', 'systematics'],
        correct: 'systematics',
      },
      {
        id: 'giants',
        kind: 'answer',
        uses: ['filter'],
        path: 'advanced',
        expect: { answer: 'memberGiants', tolerance: 0 },
      },
      { id: 'wrap', kind: 'read', path: 'both' },
    ],
  },
  {
    id: 'pop-age',
    minutes: { intro: 25, advanced: 40 },
    level: 'intro',
    tags: ['stars', 'stellar-evolution'],
    steps: [
      { id: 'intro', kind: 'read', path: 'both' },
      {
        id: 'open-model',
        kind: 'do',
        path: 'both',
        go: { open: 'isochrones' },
        check: { kind: 'opened', target: 'isochrones' },
      },
      {
        id: 'model',
        kind: 'choose',
        path: 'both',
        options: ['observed', 'model'],
        correct: 'model',
      },
      {
        id: 'open',
        kind: 'do',
        path: 'both',
        go: { open: 'segue' },
        check: { kind: 'opened', target: 'segue' },
      },
      {
        id: 'crop',
        kind: 'do',
        path: 'both',
        check: {
          kind: 'changed',
          target: 'segue',
          op: 'crop',
          column: 'rv',
          min: [55, 72],
          max: [78, 95],
        },
      },
      {
        id: 'color',
        kind: 'do',
        path: 'both',
        check: {
          kind: 'changed',
          target: 'segue',
          op: 'derive',
          terms: [
            ['g', 1],
            ['r', -1],
          ],
        },
      },
      {
        id: 'fit-mid',
        kind: 'do',
        path: 'both',
        go: { panel: 'measure' },
        check: {
          kind: 'measured',
          target: 'segue',
          tool: 'curve',
          params: { 'model.where.feh': -0.25, y: 'g', 'E.0': 0 },
          quantity: 'logAge',
          within: [9, 9.6],
        },
      },
      {
        id: 'age-mid',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'ageMid', tolerance: 0.05 },
      },
      {
        id: 'dm-mid',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'dmMid', tolerance: 0.01 },
      },
      {
        id: 'fit-solar',
        kind: 'do',
        path: 'both',
        go: { panel: 'measure' },
        check: {
          kind: 'measured',
          target: 'segue',
          tool: 'curve',
          params: { 'model.where.feh': 0, y: 'g', 'E.0': 0 },
          quantity: 'logAge',
          within: [9, 9.6],
        },
      },
      {
        id: 'dm-solar',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'dmSolar', tolerance: 0.01 },
      },
      {
        id: 'better',
        kind: 'choose',
        path: 'both',
        show: 'fits',
        options: ['metal-poor', 'solar'],
        correct: { answer: 'betterFit' },
      },
      {
        id: 'fit-map',
        kind: 'do',
        path: 'advanced',
        go: { panel: 'measure' },
        show: 'dustMap',
        check: {
          kind: 'measured',
          target: 'segue',
          tool: 'curve',
          params: {
            'model.where.feh': -0.25,
            y: 'g',
            'E.0': 0.042,
            'E.1': 0.042,
          },
          quantity: 'logAge',
          within: [9, 9.6],
        },
      },
      {
        id: 'age-map',
        kind: 'answer',
        path: 'advanced',
        expect: { answer: 'ageMap', tolerance: 0.05 },
      },
      {
        id: 'decided',
        kind: 'choose',
        path: 'both',
        show: 'literature',
        options: ['yes', 'model', 'no'],
        correct: 'model',
      },
      {
        id: 'distance',
        kind: 'answer',
        path: 'advanced',
        expect: { answer: 'distanceSolar', tolerance: 10 },
      },
      { id: 'wrap', kind: 'read', path: 'both' },
    ],
  },
  {
    id: 'pop-variable',
    minutes: { intro: 15, advanced: 25 },
    level: 'intro',
    tags: ['observing', 'stars'],
    steps: [
      { id: 'intro', kind: 'read', path: 'both' },
      {
        id: 'predict',
        kind: 'choose',
        path: 'both',
        options: ['hours', 'days', 'months'],
        correct: null,
      },
      {
        id: 'open',
        kind: 'do',
        path: 'both',
        go: { open: 'su-dra' },
        check: { kind: 'opened', target: 'su-dra' },
      },
      {
        id: 'period',
        kind: 'do',
        path: 'both',
        go: { panel: 'measure' },
        check: {
          kind: 'measured',
          target: 'su-dra',
          tool: 'period',
          quantity: 'period',
          within: [0.655, 0.665],
        },
      },
      {
        id: 'period-value',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'period', tolerance: 0.0005 },
      },
      {
        id: 'fold',
        kind: 'do',
        path: 'both',
        check: { kind: 'folded', target: 'su-dra', period: [0.655, 0.665] },
      },
      {
        id: 'amplitude',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'amplitude', tolerance: 0.005 },
      },
      {
        id: 'shape',
        kind: 'choose',
        path: 'advanced',
        show: 'shape',
        target: 'su-dra',
        options: ['sine', 'sawtooth'],
        correct: 'sawtooth',
      },
      {
        id: 'candle',
        kind: 'answer',
        path: 'both',
        show: 'candle',
        expect: { answer: 'candleDistance', tolerance: 10 },
      },
      {
        id: 'parallax',
        kind: 'choose',
        path: 'both',
        show: 'parallax',
        options: ['agree', 'disagree'],
        correct: { answer: 'parallax' },
      },
      {
        id: 'dust',
        kind: 'answer',
        path: 'advanced',
        expect: { answer: 'dustyDistance', tolerance: 10 },
      },
      {
        id: 'transit',
        kind: 'do',
        path: 'advanced',
        go: { open: 'hd209458-lc', panel: 'measure' },
        check: {
          kind: 'measured',
          target: 'hd209458-lc',
          tool: 'period',
          quantity: 'period',
          within: [1.7, 1.82],
        },
      },
      {
        id: 'harmonic',
        kind: 'choose',
        path: 'advanced',
        show: 'harmonic',
        options: ['two', 'harmonic', 'noise'],
        correct: 'harmonic',
      },
      { id: 'wrap', kind: 'read', path: 'both' },
    ],
  },
];

/** The targets each answer reads, beyond the step's own. */
export const NEEDS = {
  coreCount: ['photometry'],
  fieldShare: ['photometry'],
  brightest: ['photometry'],
  faintDropped: ['photometry'],
  memberCount: ['segue'],
  memberRv: ['segue'],
  memberFeh: ['segue'],
  fieldInWindow: ['segue'],
  memberGiants: ['segue'],
};

const SPECTRA = ['a', 'g', 'k', 'm'];

/** A quantity of a measurement, with its unit, or a dash. */
const withUnit = (h, v, unit) =>
  Number.isFinite(v) ? `${h.fmt(v)}${unit ? ` ${unit}` : ''}` : '—';

/**
 * The panels of numbers a step shows (`show`), each computed from the data or
 * adopted and named, as in ./exoplanet.js: `needs` are the targets it reads,
 * `rows` its label and value pairs.
 */
export const SHOWS = {
  halpha: {
    needs: SPECTRA.map(x => `sdss-${x}`),
    rows: (c, step, h) =>
      SPECTRA.map(x => {
        const o = c.observation(`sdss-${x}`);
        if (!o) return [h.target(`sdss-${x}`), h.t('gd.show.notOpened')];
        const r = halphaOf(o);
        return [
          h.target(`sdss-${x}`),
          h.t('gd.show.ew', { value: h.fmt(r.ew), error: h.fmt(r.ewError) }),
        ];
      }),
  },
  pipeline: {
    rows: (c, step, h) =>
      SPECTRA.map(x => {
        const s = ADOPTED.pipeline.stars[x];
        return [
          h.target(`sdss-${x}`),
          h.t('gd.show.pipelineStar', {
            type: s.type,
            teff: s.teff,
            logg: h.fmt(s.logg),
            feh: h.fmt(s.feh),
          }),
        ];
      }).concat([
        [
          h.t('gd.show.sunGravity'),
          `${h.fmt(ADOPTED.sunGravity.value)} (${ADOPTED.sunGravity.ref})`,
        ],
      ]),
  },
  core: {
    needs: ['photometry'],
    rows: (c, step, h) => {
      const r = radii(c.observation('photometry'), centerOf(c));
      const within = a => (r ? String(r.filter(x => x < a).length) : '—');
      const n = ADOPTED.ngc2420;
      return [
        [h.t('gd.show.within', { r: 1 }), within(1)],
        [h.t('gd.show.within', { r: 2 }), within(2)],
        [h.t('gd.show.within', { r: 3 }), within(3)],
        [h.t('gd.show.within', { r: 5 }), within(5)],
        [
          h.t('gd.show.halfRadius'),
          h.t('gd.show.halfRadiusValue', {
            r: h.fmt(n.r50 * 60),
            n: n.members,
            ref: n.ref,
          }),
        ],
      ];
    },
  },
  rings: {
    needs: ['photometry'],
    rows: (c, step, h) => {
      const k = ringCounts(c.observation('photometry'), centerOf(c));
      if (!k) return [[h.target('photometry'), h.t('gd.show.notOpened')]];
      const ring = (x, [lo, hi]) =>
        h.t('gd.show.ring', {
          n: x.n,
          lo,
          hi,
          density: h.fmt(x.density),
        });
      return [
        [h.t('gd.show.inner'), ring(k.inner, RINGS.inner)],
        [h.t('gd.show.outer'), ring(k.outer, RINGS.outer)],
        [h.t('gd.show.faintLimit'), `g < ${RINGS.faint}`],
      ];
    },
  },
  rv: {
    rows: (c, step, h) => {
      const L = ADOPTED.lee2008;
      return [
        [
          h.t('gd.show.leeRv'),
          h.t('gd.show.leeRvValue', {
            rv: h.fmt(L.rv),
            sd: h.fmt(L.rvSigma),
            n: L.members,
            ref: L.ref,
          }),
        ],
      ];
    },
  },
  neighbors: {
    needs: ['segue'],
    rows: (c, step, h) => {
      const o = c.observation('segue');
      const min = c.quantity('crop', 'min');
      const max = c.quantity('crop', 'max');
      if (!o || min === null || max === null)
        return [[h.target('segue'), h.t('gd.show.notOpened')]];
      const w = max - min;
      // The window, and one as wide on either side of it, as fieldInWindow
      // counts them.
      const n = (lo, hi) => String(rowsWhere(o, 'rv', lo, hi)?.length ?? '—');
      return [
        [
          h.t('gd.show.window', { lo: h.fmt(min), hi: h.fmt(max) }),
          n([min, '>='], [max, '<=']),
        ],
        [
          h.t('gd.show.window', { lo: h.fmt(min - w), hi: h.fmt(min) }),
          n([min - w, '>='], [min, '<']),
        ],
        [
          h.t('gd.show.window', { lo: h.fmt(max), hi: h.fmt(max + w) }),
          n([max, '>'], [max + w, '<=']),
        ],
      ];
    },
  },
  feh: {
    needs: ['segue'],
    rows: (c, step, h) => [
      [h.t('gd.show.fehMembers'), withUnit(h, ANSWERS.memberFeh(c), 'dex')],
      [
        h.t('gd.show.fehLee'),
        `${h.fmt(ADOPTED.lee2008.feh)} dex (${ADOPTED.lee2008.ref})`,
      ],
      [
        h.t('gd.show.fehHigh'),
        `${h.fmt(ADOPTED.webda.feh)} dex (${ADOPTED.webda.ref})`,
      ],
      [
        h.t('gd.show.fehApogee'),
        `${h.fmt(ADOPTED.apogee.feh)} ± ${h.fmt(ADOPTED.apogee.sigma)} dex (${ADOPTED.apogee.ref})`,
      ],
    ],
  },
  fits: {
    rows: (c, step, h) =>
      [
        ['fit-mid', -0.25, h.t('gd.show.fit.mid', { feh: h.fmt(-0.25) })],
        ['fit-solar', 0, h.t('gd.show.fit.solar', { feh: h.fmt(0) })],
        ['fit-map', -0.25, h.t('gd.show.fit.map', { feh: h.fmt(-0.25) })],
      ]
        .filter(([id]) => c.quantity(id, 'logAge') !== null)
        .map(([id, , label]) => [
          label,
          h.t('gd.show.fitValue', {
            age: h.fmt(c.quantity(id, 'age')),
            dm: h.fmt(c.quantity(id, 'dm')),
            e: h.fmt(c.quantity(id, 'reddening')),
            s: h.fmt(c.quantity(id, 'statistic')),
          }),
        ]),
  },
  dustMap: {
    rows: (c, step, h) => [
      [
        h.t('gd.show.dustMap'),
        `E(B − V) ${h.fmt(ADOPTED.dustMap.ebv)}, E(g − r) ${h.fmt(ADOPTED.dustMap.egr)} (${ADOPTED.dustMap.ref})`,
      ],
    ],
  },
  literature: {
    rows: (c, step, h) => {
      const n = ADOPTED.ngc2420;
      const w = ADOPTED.webda;
      return [
        [
          n.ref,
          h.t('gd.show.litGaia', {
            age: h.fmt(10 ** (n.logAge - 9)),
            dm: h.fmt(n.dm),
            av: h.fmt(n.av),
          }),
        ],
        [
          w.ref,
          h.t('gd.show.litWebda', {
            age: h.fmt(w.age),
            dm: h.fmt(w.dm),
            ebv: h.fmt(w.ebv),
            feh: h.fmt(w.feh),
          }),
        ],
        [
          ADOPTED.apogee.ref,
          `[Fe/H] ${h.fmt(ADOPTED.apogee.feh)} ± ${h.fmt(ADOPTED.apogee.sigma)}`,
        ],
      ];
    },
  },
  shape: {
    needs: step => [step.target],
    rows: (c, step, h) => {
      const s = c.series(step.target);
      return [
        [
          h.t('gd.show.halfRange'),
          s ? h.fmt(halfRange(s.y)) : h.t('gd.show.notOpened'),
        ],
        [h.t('gd.show.sineAmplitude'), withUnit(h, ANSWERS.amplitude(c), '')],
      ];
    },
  },
  candle: {
    rows: (c, step, h) => {
      const s = ADOPTED.suDra;
      const r = ADOPTED.rrLyrae;
      return [
        [h.t('gd.show.meanV'), `${h.fmt(s.v)} (${s.ref})`],
        [h.t('gd.show.av'), `${h.fmt(s.av)} (${s.ref})`],
        [h.t('gd.show.suFeh'), `${h.fmt(s.feh)} (${s.ref})`],
        [
          h.t('gd.show.relation'),
          `M_V = ${r.slope} ([Fe/H] + ${-r.pivot}) + ${r.zero} (${r.ref})`,
        ],
        [h.t('gd.show.mv'), h.fmt(rrLyraeMv(s.feh))],
      ];
    },
  },
  parallax: {
    rows: (c, step, h) => {
      const s = ADOPTED.suDra;
      return [
        [
          h.t('gd.show.parallax'),
          `${h.fmt(s.parallax)} ± ${h.fmt(s.parallaxSigma)} mas (${s.ref})`,
        ],
        [
          h.t('gd.show.parallaxDistance'),
          h.t('gd.show.parallaxRange', {
            d: h.fmt(1000 / s.parallax),
            lo: h.fmt(1000 / (s.parallax + s.parallaxSigma)),
            hi: h.fmt(1000 / (s.parallax - s.parallaxSigma)),
          }),
        ],
        [
          h.t('gd.show.candleDistance'),
          `${h.fmt(ANSWERS.candleDistance())} pc`,
        ],
      ];
    },
  },
  harmonic: {
    rows: (c, step, h) => {
      const found = c.quantity('transit', 'period');
      const P = ADOPTED.hd209458;
      return [
        [h.t('gd.show.transitPeriod'), `${h.fmt(P.period)} d (${P.ref})`],
        [h.t('gd.show.foundPeriod'), withUnit(h, found, 'd')],
        [h.t('gd.show.periodRatio'), found ? h.fmt(P.period / found) : '—'],
      ];
    },
  },
};

export { PATHS, stepsOn } from './core.js';

/** The suite, as js/observatory/guides/suites.js loads it. */
export const SUITE = {
  id: 'populations',
  GUIDES,
  TARGETS,
  ANSWERS,
  CORRECT,
  NEEDS,
  SHOWS,
  messages: async () => {
    const [en, es] = await Promise.all([
      import('../../i18n/en.populations.js'),
      import('../../i18n/es.populations.js'),
    ]);
    return { en: en.EN_POPULATIONS, es: es.ES_POPULATIONS };
  },
};
