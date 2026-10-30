// =============================================================================
// The views of the variables-II panels (Prompt 223, VARIABLES_II.md)
// -----------------------------------------------------------------------------
// Pure functions of the panels' control values and the loaded data, shared by
// js/variablesIIWidgets.js and tests/variablesIILessons.test.js (which recomputes
// every number a lesson states from them). Nothing is calculated here that the
// kernel does not: the features and their errors are
// js/kernels/variables/features.js, the metallicity term and the ladder with it
// are plz.js, the vote with a refusal is classify.js.
//
// The hosts' [O/H] and the coefficient are cited values (plzCited.js), not
// measurements made here. Pure: no DOM, no clock; results are cached by input.
// =============================================================================

import {
  lightCurveFeatures,
  findPeriod,
  refinePeriod,
  harmonicFit,
  ladderDistance,
  ladderWithMetallicity,
  fitLeavitt,
  classifyWithAmbiguity,
  confusion,
  FEATURE_SETS,
  CLASSES,
} from './kernels/variables/index.js';
import { CITED_PLZ } from './kernels/variables/plzCited.js';
import { ANCHORS } from './variablesData.js';

const { Math, Map } = globalThis;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const caches = new Map();
const memo = (key, make) => {
  if (!caches.has(key)) caches.set(key, make());
  return caches.get(key);
};

// ---- the period-luminosity panel ---------------------------------------------------

export const PLZ_HOSTS = Object.freeze(['n4258', 'm101']);
export const PLZ_DZ = Object.freeze({ min: -0.6, max: 0.4, step: 0.05 });

/** Hosts above or below the LMC, the three ways the panel sets that difference. */
export function plzView(v, data) {
  const key = PLZ_HOSTS[clamp(Math.round(v.host ?? 0), 0, 1)];
  const term = Math.round(v.term ?? 1) === 1;
  const source = clamp(Math.round(v.metal ?? 0), 0, 2);
  const dzIn = clamp(v.dz ?? 0, PLZ_DZ.min, PLZ_DZ.max);
  const g = CITED_PLZ.riess2022;
  const zA = CITED_PLZ.hosts.lmc;
  const zCited = CITED_PLZ.hosts[key];
  const zHost =
    source === 0 ? zCited.value : source === 1 ? zA.value : zA.value + dzIn;
  const sigmaHost = source === 0 ? zCited.sigma : 0;
  const anchor = data.cepheids.lmc;
  const host = data.cepheids[key];
  const meta = {
    gamma: g.gamma,
    sigmaGamma: g.sigma,
    host: zHost,
    anchor: zA.value,
    sigmaHost,
    sigmaAnchor: zA.sigma,
    range: CITED_PLZ.range,
  };
  const withTerm = memo(`z:${key}:${source}:${source === 2 ? dzIn : ''}`, () =>
    ladderWithMetallicity(host, anchor, ANCHORS.lmc, meta, {})
  );
  const without = memo(`n:${key}`, () =>
    ladderDistance(host, anchor, ANCHORS.lmc, {})
  );
  const shown = term ? withTerm : without;
  const cal = memo('cal', () => fitLeavitt(anchor.periods, anchor.mags));
  const dZ = zHost - zA.value;
  const curve = [];
  for (let d = PLZ_DZ.min; d <= PLZ_DZ.max + 1e-9; d += PLZ_DZ.step)
    curve.push({
      dZ: d,
      shift: -g.gamma * d,
      lo: -g.gamma * d - Math.abs(d) * g.sigma,
      hi: -g.gamma * d + Math.abs(d) * g.sigma,
    });
  const budget = Object.fromEntries(shown.budget.map(b => [b.id, b.sigma]));
  return {
    key,
    term,
    source,
    gamma: g.gamma,
    sigmaGamma: g.sigma,
    zHost,
    zAnchor: zA.value,
    dZ,
    mu: shown.mu,
    sigma: shown.sigma,
    distanceMpc: shown.distanceMpc,
    distanceErrorMpc: shown.distanceErrorMpc,
    muWithout: without.mu,
    sigmaWithout: without.sigma,
    distanceWithoutMpc: without.distanceMpc,
    muWith: withTerm.mu,
    shift: withTerm.metallicity.shift,
    factor: withTerm.metallicity.factor,
    status: term ? withTerm.metallicity.status : 'left-out',
    budget,
    hostN: shown.hostN,
    anchorN: shown.anchorN,
    calibration: cal,
    anchorPoints: anchor,
    hostPoints: host,
    effect: curve,
    maser: key === 'n4258' ? ANCHORS.n4258 : null,
    citedRange: CITED_PLZ.range,
  };
}

// ---- the features panel ------------------------------------------------------------

export const FEATURE_STARS = Object.freeze([
  { id: 'suDra', source: 'suDra', range: [0.15, 5] },
  { id: 'etaAql', source: 'etaAql', range: [1, 20] },
]);

/** The star's period from its whole run, once: the short runs below are folded on it. */
export function starPeriod(index, data) {
  const star = FEATURE_STARS[clamp(index, 0, FEATURE_STARS.length - 1)];
  return memo(`P:${star.id}`, () => {
    const lc = data[star.source];
    const found = findPeriod(lc.t, lc.mag, {
      minPeriod: star.range[0],
      maxPeriod: star.range[1],
      oversample: 8,
    });
    return refinePeriod(lc.t, lc.mag, found.period, 3, 0.5 * found.width)
      .period;
  });
}

/** The first `days` days of a star's run, its features at the whole-run period, and the curve to draw. */
export function featuresView(v, data) {
  const i = clamp(Math.round(v.star ?? 0), 0, FEATURE_STARS.length - 1);
  const star = FEATURE_STARS[i];
  const lc = data[star.source];
  const P = starPeriod(i, data);
  const span = lc.t[lc.t.length - 1] - lc.t[0];
  const days = clamp(Math.round(v.days ?? span), 1, Math.ceil(span));
  const rows = [];
  for (let j = 0; j < lc.t.length; j++)
    if (lc.t[j] - lc.t[0] <= days) rows.push(j);
  const t = Float64Array.from(rows, j => lc.t[j]);
  const mag = Float64Array.from(rows, j => lc.mag[j]);
  const key = `f:${star.id}:${days}`;
  const f = memo(key, () =>
    lightCurveFeatures(t, mag, P, { K: 3, t0: lc.t[0] })
  );
  const fit = memo(`fit:${key}`, () =>
    t.length > 8 ? harmonicFit(t, mag, P, 3, { t0: lc.t[0] }) : null
  );
  const phase = Float64Array.from(t, x => {
    const p = (x - lc.t[0]) / P;
    return p - Math.floor(p);
  });
  return {
    star: star.id,
    period: P,
    days,
    span,
    n: t.length,
    features: f,
    phase,
    mag,
    fit,
  };
}

// ---- the classification exercise with a refusal --------------------------------------

export const AMBIGUITY_SETS = Object.freeze([
  'period',
  'periodAmplitude',
  'shape',
]);

/** The synthetic exercise's vote with the refusal: who is called, who is left open. */
export function ambiguityView(v, data) {
  const set = clamp(Math.round(v.features ?? 1), 0, 2);
  const minVotes = clamp(Math.round(v.votes ?? 4), 3, 5);
  return memo(`a:${set}:${minVotes}`, () => {
    const rows = data.sample;
    const verdicts = classifyWithAmbiguity(
      rows,
      FEATURE_SETS[AMBIGUITY_SETS[set]],
      { k: 5, minVotes }
    );
    const called = verdicts
      .map((a, j) => ({ a, j }))
      .filter(x => x.a.cls !== null);
    const calledOk = called.filter(x => x.a.cls === rows[x.j].cls).length;
    const everyone = confusion(
      rows,
      verdicts.map(a => a.candidates[0])
    );
    const open = verdicts
      .map((a, j) => ({ a, j }))
      .filter(x => x.a.cls === null);
    const byClass = Object.fromEntries(CLASSES.map(c => [c.id, 0]));
    for (const x of open) byClass[rows[x.j].cls]++;
    const missedInOpen = open.filter(
      x => x.a.candidates[0] !== rows[x.j].cls
    ).length;
    return {
      set,
      minVotes,
      n: rows.length,
      called: called.length,
      open: open.length,
      calledAccuracy: called.length ? calledOk / called.length : NaN,
      accuracyEveryone: everyone.accuracy,
      openByClass: byClass,
      openWrongLeader: missedInOpen,
      rows,
      verdicts,
    };
  });
}
