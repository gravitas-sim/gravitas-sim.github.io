// =============================================================================
// The views of the survey panels (Prompt 215, SURVEY_DESIGN.md)
// -----------------------------------------------------------------------------
// Pure functions of the panels' control values, shared by js/surveyWidgets.js,
// js/surveyPlan.js (the plan step's verdict) and tests/surveyLessons.test.js (which
// recomputes every number a lesson states from them). Nothing is calculated in the
// widgets: the depth, the area, the counts, the false positives and the verdict are
// js/kernels/survey/, over the facility's cited table (js/instruments/survey.js).
// The patch a plan "would produce" is SYNTHETIC: sources drawn from the class's counts
// in a small patch of sky, each marked found or missed by the completeness, with the
// plan's false positives among them; the truth is the class and the plan.
//
// Pure: no DOM, no clock.
// =============================================================================

import {
  CLASSES,
  assess,
  compareSetups,
  completeness,
  cumulative,
  evaluate,
  magnitudeAtSnr,
  optimumExposure,
  snrOfMagnitude,
  tradeoff,
  falseRate,
  elementsPerDeg2,
  normalizeSetup,
} from './kernels/survey/index.js';
import { surveySetupOf, SURVEY_SETUPS } from './instruments/survey.js';
import { stream } from './random/streams.js';

const { Math } = globalThis;

/** The slew and settle a frame costs beyond the library's cycle time, seconds: supplied, the same for every facility. */
export const SLEW = 5;

/** The facilities of the panels, by index. */
export const FACILITIES = Object.freeze(SURVEY_SETUPS.map(s => s.id));
/** The classes of the panels, by index: the teaching models (SURVEY_DESIGN.md). */
export const CLASS_IDS = Object.freeze([
  'uniform-euclidean',
  'flattened',
  'steep',
]);

const idx = (v, n) => Math.max(0, Math.min(n - 1, Math.round(v ?? 0)));
const cache = new Map();
/** The cited setup of a facility index, with where each number came from. */
export function setupAt(i) {
  const id = FACILITIES[idx(i, FACILITIES.length)];
  if (!cache.has(id)) cache.set(id, surveySetupOf(id, { slew: SLEW }));
  return cache.get(id);
}
export const classAt = i => CLASSES[CLASS_IDS[idx(i, CLASS_IDS.length)]];

/** The plan a set of control values means. */
export function planOf(v = {}) {
  return {
    exposure: v.exposure ?? 300,
    visits: Math.max(1, Math.round(v.visits ?? 1)),
    nights: v.nights ?? 10,
    threshold: v.threshold ?? 5,
  };
}

/** The whole sky, square degrees: a region cannot be larger, and time beyond it only repeats it. */
export const SKY_DEG2 = 41253;
export const inSky = (plan, setup) => ({
  ...plan,
  fields: Math.ceil(SKY_DEG2 / setup.fovDeg2),
});

/** The exposure of a log slider: 10^x seconds. */
export const exposureOf = x => 10 ** x;

/** The trade-off at fixed time: the curve over exposures, the chosen plan, the analytic optimum. */
export function tradeoffView(v = {}) {
  const setup = setupAt(v.facility).setup;
  const cls = classAt(v.cls);
  const base = planOf({ ...v, exposure: exposureOf(v.logExposure ?? 2) });
  const grid = Array.from({ length: 41 }, (_, i) => 10 ** (0.5 + (i * 3) / 40));
  const pts = tradeoff({
    setup,
    plan: inSky({ ...base, visits: 1 }, setup),
    cls,
    exposures: grid,
  })
    .filter(
      p => p.result.ok && p.result.status === 'ok' && p.result.pointings >= 1
    )
    .map(p => ({
      exposure: p.exposure,
      depth: p.result.depth,
      area: p.result.areaDeg2,
      detected: p.result.counts.detected,
    }));
  const chosen = evaluate({
    setup,
    plan: inSky({ ...base, visits: 1 }, setup),
    cls,
  });
  let best = null;
  for (const p of pts) if (!best || p.detected > best.detected) best = p;
  return {
    setup,
    cls,
    plan: { ...base, visits: 1 },
    chosen,
    curve: pts,
    best,
    optimum: optimumExposure(cls.alpha, setup.overhead),
    alpha: cls.alpha,
    beta: 1.25 * cls.alpha,
    exposure: base.exposure,
  };
}

/** The goal a set of control values means. */
export const goalOf = (v = {}) => ({
  depth: v.goalDepth ?? 23,
  areaDeg2: 10 ** (v.logGoalArea ?? 1),
});

/** A plan: its evaluation, its verdict against the goal and a synthetic patch of what it would find. */
export function planView(v = {}) {
  const s = setupAt(v.facility);
  const cls = classAt(v.cls);
  const plan = planOf({ ...v, exposure: exposureOf(v.logExposure ?? 2.5) });
  const result = evaluate({ setup: s.setup, plan: inSky(plan, s.setup), cls });
  const goal = goalOf(v);
  const verdict = assess(result, goal);
  return {
    setup: s.setup,
    from: s.from,
    cls,
    plan,
    result,
    goal,
    verdict,
    patch: patchOf(s.setup, plan, cls, result, v.seed ?? 1),
  };
}

/**
 * A square patch of sky holding about 300 detections: its sources drawn from the class's counts down to the
 * plan's faint limit, each marked found by the completeness (a seeded draw), and the false positives the
 * threshold lets through. Truth: the class, the plan and the seed.
 */
export function patchOf(setup, plan, cls, result, seed = 1) {
  if (!result?.ok || !result.counts) return null;
  const ns = normalizeSetup(setup).setup;
  const m = result.counts.magnitudes;
  const dens = result.counts.perDeg2.detected;
  const area = Math.min(0.01, 300 / Math.max(dens, 1e-9));
  const rng = stream('forward', `survey-patch:${seed}`);
  const total = cumulative(cls, m.faint) * area;
  const n = Math.min(2000, Math.round(total));
  const sources = [];
  for (let i = 0; i < n; i++) {
    // inverse transform of the cumulative power law between the bright end and the faint limit
    const lo = cumulative(cls, m.bright - 8);
    const hi = cumulative(cls, m.faint);
    const u = lo + rng() * (hi - lo);
    const mag = cls.m0 + Math.log10(u / cls.n0) / cls.alpha;
    const s = snrOfMagnitude(ns, plan.exposure, plan.visits, mag);
    const found = rng() < completeness(s, plan.threshold);
    sources.push({ x: rng(), y: rng(), m: mag, found });
  }
  const falseCount = Math.round(
    falseRate(plan.threshold) * elementsPerDeg2(ns) * area
  );
  const falseSources = Array.from(
    { length: Math.min(falseCount, 500) },
    () => ({
      x: rng(),
      y: rng(),
    })
  );
  const scale = Math.min(1, n / Math.max(total, 1));
  return {
    areaDeg2: area,
    sources,
    falseSources,
    found: sources.filter(s => s.found).length,
    scale,
    sharpMag: magnitudeAtSnr(ns, plan.exposure, plan.visits, plan.threshold),
  };
}

/** Two facilities, one goal: the time each needs (per pointing, in hours, in nights) and the ratio. */
export function compareView(v = {}) {
  const a = setupAt(v.facilityA).setup;
  const b = setupAt(v.facilityB ?? 1).setup;
  const goal = goalOf(v);
  const exposure = exposureOf(v.logExposure ?? 2);
  const r = compareSetups({
    a,
    b,
    goal,
    exposureA: exposure,
    exposureB: exposure,
    threshold: v.threshold ?? 5,
  });
  return { a, b, goal, exposure, result: r };
}

export { assess };
