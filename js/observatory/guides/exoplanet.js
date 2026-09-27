// =============================================================================
// The Exoplanet Observatory: from photons to a planet
// -----------------------------------------------------------------------------
// Five guided investigations, done in the Observatory with real TESS light
// curves and the workspace's own tools (EXOPLANET_OBSERVATORY.md):
//
//   exo-star      what the light is, and whose: quality flags, the aperture,
//                 and a companion star's light
//   exo-find      finding the transit: a box search, a period and an epoch
//   exo-fit       fitting it: the radius ratio, what the data cannot separate,
//                 and the planet's radius from the star's
//   exo-dilution  Kepler-13, where a second star's light hides half the
//                 transit, and the light curve alone cannot say whose it is
//   exo-planet    is it a planet? odd and even transits, a secondary eclipse,
//                 the simulation's version, and what a transit cannot weigh
//
// Every number a step checks is one the reader measured with the workspace's
// tools, or one js/observatory/guides/science.js computes from the light
// curve on screen, by the algorithm it states. The few from the literature
// are ADOPTED below, each with its source, and a step that uses one says so.
// No radial velocities of a transiting star ship with Gravitas, so the suite
// stops at the planet's radius: its mass and density are what the last
// investigation says a transit cannot give.
//
// A step is `path: 'both'` (the introductory path and the advanced one) or
// `'advanced'`: one set of steps, one set of answers, and the advanced path
// only adds to it. A step's words are `gd.<guide>.<step>` in
// js/i18n/{en,es}.guides.js, a choice's options `...opt.<option>`, and a
// check's feedback `...ok` and `...no`. The runner is
// js/observatory/guidePanel.js; tests/exoplanetGuides.test.js checks every
// step against these rules and every answer against the data.
// =============================================================================

import {
  bestEpoch,
  boxDepth,
  lightFraction,
  oddEven,
  secondary,
} from './science.js';

/** What the guides open, and where each comes from. */
export const TARGETS = {
  hd209458: {
    observation: 'pack:tess-hd209458-s56-lc@1.0.0',
    fixture: 'tess-light-curve',
  },
  'hd209458-aperture': {
    observation: 'pack:tess-hd209458-s56-aperture@1.0.0',
    fixture: 'tess-aperture',
  },
  // Installed from the catalog (catalog/catalog.json) the first time a guide
  // opens one, and kept in the browser for offline use.
  'kepler13-sap': {
    observation: 'installed:kepler-13-tess-s14-sap@1.0.0',
    install: 'community.kepler-13-tess-s14-sap',
  },
  'kepler13-pdcsap': {
    observation: 'installed:kepler-13-tess-s14-pdcsap@1.0.0',
    install: 'community.kepler-13-tess-s14-pdcsap',
  },
};

/**
 * The literature's values a guide adopts or sets beside a measurement, never
 * its data. tests/exoplanetGuides.test.js ties the header value to the pinned
 * raw file's header and the simulation's to js/data/exoplanetSystems.js.
 */
export const ADOPTED = {
  hd209458: {
    // The same raw file's header: the pack does not carry it.
    crowdsap: {
      value: 0.99778908,
      ref: 'SPOC, the header of the pinned sector 56 light curve (CROWDSAP)',
    },
    period: {
      value: 3.52474859,
      sigma: 3.8e-7,
      unit: 'd',
      ref: 'Stassun et al. 2017, AJ 153, 136',
    },
    stellarRadius: {
      value: 1.19,
      sigma: 0.02,
      unit: 'Rsun',
      ref: 'Stassun et al. 2017, AJ 153, 136',
    },
    planetRadius: {
      value: 1.39,
      sigma: 0.02,
      unit: 'RJup',
      ref: 'Stassun et al. 2017, AJ 153, 136',
    },
    radiusRatio: { value: 0.12086, ref: 'Torres et al. 2008, ApJ 677, 1324' },
    stellarRadiusTorres: {
      value: 1.155,
      unit: 'Rsun',
      ref: 'Torres et al. 2008, ApJ 677, 1324',
    },
    planetMass: {
      value: 0.73,
      sigma: 0.04,
      unit: 'MJup',
      ref: 'Stassun et al. 2017, AJ 153, 136, from radial velocities',
    },
  },
  kepler13: {
    tessMagA: {
      value: 10.2306,
      ref: 'TESS Input Catalog v8 (Stassun et al. 2019, AJ 158, 138), TIC 158324245',
    },
    tessMagB: {
      value: 10.4852,
      ref: 'TESS Input Catalog v8 (Stassun et al. 2019, AJ 158, 138), TIC 1717079066',
    },
    period: {
      value: 1.763588,
      unit: 'd',
      ref: 'Esteves et al. 2015, ApJ 804, 150',
    },
    stellarRadius: {
      value: 1.74,
      sigma: 0.04,
      unit: 'Rsun',
      ref: 'Esteves et al. 2015, ApJ 804, 150',
    },
    // What the literature has made of one planet (NASA Exoplanet Archive,
    // Planetary Systems table, retrieved 2026-09-26): the ratio depends on
    // whose light was taken out, and the radius on the star's radius too.
    published: [
      {
        ref: 'Shporer et al. 2014, ApJ 788, 92',
        radiusRatio: 0.0845,
        stellarRadius: 1.71,
        planetRadius: 1.406,
      },
      {
        ref: 'Esteves et al. 2015, ApJ 804, 150',
        radiusRatio: 0.087373,
        stellarRadius: 1.74,
        planetRadius: 1.512,
      },
      {
        ref: 'Kepler Q1-Q17 DR25 KOI table (Thompson et al. 2018, ApJS 235, 38)',
        radiusRatio: 0.064717,
        stellarRadius: 3.031,
        planetRadius: 1.911,
      },
      {
        ref: 'Kepler Q1-Q17 DR24 KOI table (Coughlin et al. 2016, ApJS 224, 12)',
        radiusRatio: 0.077938,
        stellarRadius: 3.031,
        planetRadius: 2.302,
      },
    ],
  },
  // The simulation's own HD 209458 (js/data/exoplanetSystems.js), which the
  // Transit Lab and the transit lesson are built on.
  simulation: {
    stellarRadius: 1.155,
    planetRadius: 1.38,
    period: 3.5247,
    lesson: 'transit-photometry',
  },
};

// R_sun / R_Jup (IAU 2015 nominal), as js/inference/models.js has it.
export const RSUN_PER_RJUP = 695700 / 71492;
// Longer than either transit (HD 209458 b's lasts 3.1 hours, Kepler-13Ab's
// 3.3), for science.js's boxes.
export const DURATION = 0.14;
// A difference smaller than this many of its standard errors is not one.
export const SIGNIFICANT = 3;

/**
 * What science.js makes of a target's light curve, at a period: the epoch of
 * its deepest box, and the depths there. `c.series(target)` is the light
 * curve, or null when the target has not been opened yet.
 */
export function transitOf(c, target, period) {
  const s = c.series(target);
  if (!s) return null;
  const epoch = bestEpoch(s, { period, duration: DURATION });
  if (epoch === null) return null;
  const at = { period, epoch, duration: DURATION };
  return {
    epoch,
    period,
    depth: boxDepth(s, at),
    oddEven: oddEven(s, at),
    secondary: secondary(s, at),
  };
}

/** The period a target's transit is looked for at: the adopted one. */
export const periodOf = target =>
  target.startsWith('kepler13')
    ? ADOPTED.kepler13.period.value
    : ADOPTED.hd209458.period.value;

/**
 * The expected answer to an `answer` step, from the runner's context:
 *
 *   c.quantity(stepId, name)  a quantity of the measurement or fit that
 *                             passed that step's check (a fitted parameter
 *                             or a derived one), or null
 *   c.evidence(stepId)        that measurement node or fit document
 *   c.pack(target)            the target's pack record (masks, crowding)
 *   c.series(target)          its light curve, as science.js reads one
 *
 * Null means it cannot be worked out yet, and the step says what is missing.
 */
export const ANSWERS = {
  qualityDropped: c =>
    c.pack('hd209458')?.masks.find(m => m.column === 'QUALITY')?.dropped ??
    null,
  targetShare: () =>
    lightFraction(
      ADOPTED.kepler13.tessMagB.value - ADOPTED.kepler13.tessMagA.value
    ),
  crowdsap: c => c.pack('kepler13-sap')?.crowding?.crowdsap ?? null,
  boxPeriod: c => c.quantity('search', 'period'),
  periodMinutesOff: c => {
    const p = c.quantity('search', 'period');
    return p === null
      ? null
      : Math.abs(p - ADOPTED.hd209458.period.value) * 1440;
  },
  radiusRatio: c => c.quantity('fit', 'k'),
  beta: c => c.evidence('fit')?.results?.fit?.redNoise?.beta ?? null,
  planetRadius: c => c.quantity('radius', 'Rp'),
  radiusIfTorres: c => {
    const k = c.quantity('fit', 'k');
    return k === null
      ? null
      : k * ADOPTED.hd209458.stellarRadiusTorres.value * RSUN_PER_RJUP;
  },
  depthRatio: c => {
    const P = periodOf('kepler13');
    const sap = transitOf(c, 'kepler13-sap', P)?.depth;
    const pdc = transitOf(c, 'kepler13-pdcsap', P)?.depth;
    return sap && pdc ? sap.depth / pdc.depth : null;
  },
  rawRatio: c => c.quantity('fit-raw', 'k'),
  dilution: c => {
    const f = c.pack('kepler13-sap')?.crowding?.crowdsap;
    return f ? 1 - f : null;
  },
  // Were the planet B's, its transit would be diluted by all the light that
  // is not B's: at most 1 - CROWDSAP of the aperture's is (some of the rest
  // is other, fainter stars'), so this is the smallest planet B could hold.
  // Without limb darkening, as the depth is read here: a rough ratio.
  radiusRatioIfB: c => {
    const sap = transitOf(c, 'kepler13-sap', periodOf('kepler13'))?.depth;
    const f = c.pack('kepler13-sap')?.crowding?.crowdsap;
    return sap && f ? Math.sqrt(sap.depth / (1 - f)) : null;
  },
  // The deepest dip every other catalogued star in HD 209458's aperture could
  // make, were all its light to vanish: 1 - CROWDSAP, from the header.
  blendLimit: () => 1 - ADOPTED.hd209458.crowdsap.value,
  simulationRadiusRatio: () =>
    ADOPTED.simulation.planetRadius /
    ADOPTED.simulation.stellarRadius /
    RSUN_PER_RJUP,
};

/** The option a data-dependent choice accepts, from the same context. */
export const CORRECT = {
  // Of the pairs offered, the one the reader's own fit correlates most.
  strongestPair: (c, step) => {
    const fit = c.evidence(step.from)?.results?.fit;
    if (!fit?.correlation) return null;
    let best = null;
    for (const pair of step.options) {
      const [a, b] = pair.split('-').map(n => fit.free.indexOf(n));
      if (a < 0 || b < 0) continue;
      const r = Math.abs(fit.correlation[a][b]);
      if (!best || r > best.r) best = { pair, r };
    }
    return best?.pair ?? null;
  },
  oddEven: (c, step) => {
    const oe = transitOf(c, step.target, periodOf(step.target))?.oddEven;
    if (!oe || oe.sigmas === null) return null;
    return oe.sigmas < SIGNIFICANT ? 'equal' : 'different';
  },
  secondary: (c, step) => {
    const d = transitOf(c, step.target, periodOf(step.target))?.secondary;
    if (!d) return null;
    return d.depth < SIGNIFICANT * d.error ? 'none' : 'dip';
  },
};

/**
 * The five guides. A `do` step's `check` says what the workspace must hold;
 * an `answer` step's `expect` names an ANSWERS function and how close a typed
 * answer must be; a `choose` step's `correct` is an option, a CORRECT
 * function (`{answer}`), or null for a prediction, which is recorded and
 * answered by a later step. `show` is a panel of data the runner draws.
 */
export const GUIDES = [
  {
    id: 'exo-star',
    minutes: { intro: 15, advanced: 20 },
    steps: [
      { id: 'intro', kind: 'read', path: 'both' },
      {
        id: 'open',
        kind: 'do',
        path: 'both',
        go: { open: 'hd209458' },
        check: { kind: 'opened', target: 'hd209458' },
      },
      {
        id: 'quality',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'qualityDropped', tolerance: 0 },
      },
      {
        id: 'aperture',
        kind: 'do',
        path: 'both',
        go: { open: 'hd209458-aperture', panel: 'measure' },
        check: {
          kind: 'measured',
          target: 'hd209458-aperture',
          tool: 'aperture',
          params: { mode: 'bits', bit: 2 },
          quantity: 'count',
          within: [23, 23],
        },
      },
      {
        id: 'predict-share',
        kind: 'choose',
        path: 'both',
        options: ['all', 'most', 'half', 'quarter'],
        correct: null,
      },
      {
        id: 'share',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'targetShare', tolerance: 0.01 },
      },
      {
        id: 'open-k13',
        kind: 'do',
        path: 'both',
        go: { open: 'kepler13-sap' },
        check: { kind: 'opened', target: 'kepler13-sap' },
      },
      {
        id: 'crowdsap',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'crowdsap', tolerance: 0.005 },
      },
      {
        id: 'why-not-equal',
        kind: 'choose',
        path: 'advanced',
        options: ['aperture', 'noise', 'wrong'],
        correct: 'aperture',
      },
      { id: 'wrap', kind: 'read', path: 'both', show: 'crowding' },
    ],
  },
  {
    id: 'exo-find',
    minutes: { intro: 15, advanced: 25 },
    steps: [
      { id: 'intro', kind: 'read', path: 'both' },
      {
        id: 'predict-count',
        kind: 'choose',
        path: 'both',
        options: ['one', 'three', 'seven', 'twenty'],
        correct: null,
      },
      {
        id: 'search',
        kind: 'do',
        path: 'both',
        go: { open: 'hd209458', panel: 'measure' },
        check: {
          kind: 'measured',
          target: 'hd209458',
          tool: 'box',
          quantity: 'period',
          within: [3.51, 3.54],
        },
      },
      {
        id: 'period',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'boxPeriod', tolerance: 0.0005 },
      },
      {
        id: 'minutes-off',
        kind: 'answer',
        path: 'advanced',
        expect: { answer: 'periodMinutesOff', tolerance: 0.1 },
      },
      {
        id: 'fold',
        kind: 'do',
        path: 'both',
        check: { kind: 'folded', target: 'hd209458', period: [3.51, 3.54] },
      },
      {
        id: 'no-error',
        kind: 'choose',
        path: 'advanced',
        options: ['grid', 'fit', 'none'],
        correct: 'fit',
      },
      { id: 'wrap', kind: 'read', path: 'both', show: 'count' },
    ],
  },
  {
    id: 'exo-fit',
    minutes: { intro: 20, advanced: 35 },
    steps: [
      { id: 'intro', kind: 'read', path: 'both' },
      {
        id: 'fit',
        kind: 'do',
        path: 'both',
        go: { open: 'hd209458', panel: 'fit' },
        check: {
          kind: 'fitted',
          target: 'hd209458',
          parameter: 'k',
          within: [0.11, 0.13],
          settings: { dilution: [0, 0] },
        },
      },
      {
        id: 'ratio',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'radiusRatio', tolerance: 0.001 },
      },
      {
        id: 'pair',
        kind: 'choose',
        path: 'advanced',
        from: 'fit',
        options: ['b-aRs', 'k-t0', 'P-t0', 'q1-P'],
        correct: { answer: 'strongestPair' },
      },
      {
        id: 'residuals',
        kind: 'answer',
        path: 'advanced',
        expect: { answer: 'beta', tolerance: 0.05 },
      },
      {
        id: 'radius',
        kind: 'do',
        path: 'both',
        go: { panel: 'fit' },
        show: 'stellarRadius',
        check: {
          kind: 'fitted',
          target: 'hd209458',
          parameter: 'Rp',
          within: [1.2, 1.6],
          settings: {
            stellarRadius: [1.19, 1.19],
            stellarRadiusSigma: [0.02, 0.02],
          },
        },
      },
      {
        id: 'planet-radius',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'planetRadius', tolerance: 0.01 },
      },
      {
        id: 'torres',
        kind: 'answer',
        path: 'advanced',
        expect: { answer: 'radiusIfTorres', tolerance: 0.01 },
      },
      { id: 'wrap', kind: 'read', path: 'both' },
    ],
  },
  {
    id: 'exo-dilution',
    minutes: { intro: 20, advanced: 35 },
    steps: [
      { id: 'intro', kind: 'read', path: 'both' },
      {
        id: 'open-sap',
        kind: 'do',
        path: 'both',
        go: { open: 'kepler13-sap' },
        check: { kind: 'opened', target: 'kepler13-sap' },
      },
      {
        id: 'open-pdcsap',
        kind: 'do',
        path: 'both',
        go: { open: 'kepler13-pdcsap' },
        check: { kind: 'opened', target: 'kepler13-pdcsap' },
      },
      {
        id: 'predict-ratio',
        kind: 'choose',
        path: 'both',
        options: ['same', 'crowdsap', 'double'],
        correct: null,
      },
      {
        id: 'ratio',
        kind: 'answer',
        path: 'both',
        show: 'depths',
        expect: { answer: 'depthRatio', tolerance: 0.01 },
      },
      {
        id: 'fit-raw',
        kind: 'do',
        path: 'both',
        go: { open: 'kepler13-sap', panel: 'fit' },
        check: {
          kind: 'fitted',
          target: 'kepler13-sap',
          parameter: 'k',
          within: [0.05, 0.08],
          settings: { dilution: [0, 0] },
        },
      },
      {
        id: 'raw-ratio',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'rawRatio', tolerance: 0.001 },
      },
      {
        id: 'dilute',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'dilution', tolerance: 0.005 },
      },
      {
        id: 'fit-diluted',
        kind: 'do',
        path: 'both',
        go: { panel: 'fit' },
        check: {
          kind: 'fitted',
          target: 'kepler13-sap',
          parameter: 'k',
          within: [0.075, 0.1],
          settings: { dilution: [0.445, 0.455] },
        },
      },
      {
        id: 'if-b',
        kind: 'answer',
        path: 'advanced',
        show: 'depths',
        expect: { answer: 'radiusRatioIfB', tolerance: 0.002 },
      },
      {
        id: 'which-star',
        kind: 'choose',
        path: 'both',
        show: 'published',
        options: ['a', 'b', 'cannot'],
        correct: 'cannot',
      },
      { id: 'wrap', kind: 'read', path: 'both' },
    ],
  },
  {
    id: 'exo-planet',
    minutes: { intro: 20, advanced: 25 },
    steps: [
      { id: 'intro', kind: 'read', path: 'both' },
      {
        id: 'predict-binary',
        kind: 'choose',
        path: 'both',
        options: ['secondary', 'alternate', 'vshape', 'all'],
        correct: null,
      },
      {
        id: 'open',
        kind: 'do',
        path: 'both',
        go: { open: 'hd209458' },
        check: { kind: 'opened', target: 'hd209458' },
      },
      {
        id: 'odd-even',
        kind: 'choose',
        path: 'both',
        show: 'oddEven',
        target: 'hd209458',
        options: ['equal', 'different'],
        correct: { answer: 'oddEven' },
      },
      {
        id: 'secondary',
        kind: 'choose',
        path: 'both',
        show: 'secondary',
        target: 'hd209458',
        options: ['none', 'dip'],
        correct: { answer: 'secondary' },
      },
      {
        id: 'blend',
        kind: 'answer',
        path: 'advanced',
        expect: { answer: 'blendLimit', tolerance: 0.0002 },
      },
      {
        id: 'simulation',
        kind: 'answer',
        path: 'both',
        show: 'simulation',
        expect: { answer: 'simulationRadiusRatio', tolerance: 0.001 },
      },
      {
        id: 'mass',
        kind: 'choose',
        path: 'both',
        options: ['transit', 'rv', 'depth'],
        correct: 'rv',
      },
      { id: 'wrap', kind: 'read', path: 'both' },
    ],
  },
];

export const PATHS = ['intro', 'advanced'];

/** A guide's steps on one path. */
export function stepsOn(guide, path) {
  return guide.steps.filter(s => s.path === 'both' || s.path === path);
}
