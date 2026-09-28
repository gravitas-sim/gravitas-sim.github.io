// =============================================================================
// A run of the 3-D kernel: limits, samples, events, residuals
// -----------------------------------------------------------------------------
// createRun() takes a validated system (./state.js) and what to measure, and
// advances it in slices: advance(budgetMs) runs for about that long and
// returns, so the Worker holding it (./worker.js) can read a cancel message
// between slices. A run ends in one status:
//
//   ok          the span was integrated
//   canceled    cancel() was called
//   evalLimit   the force-evaluation budget ran out (a cost ceiling)
//   timeLimit   the wall-clock budget ran out
//   notFinite   a position or velocity stopped being a number
//   empty       every body with mass has merged into one: nothing to follow
//
// What it records, each a pure function of the system and the options:
//
//   samples     t, the energy, angular momentum and momentum errors, and
//               positions, at `samples` evenly spaced times
//   events      mergers (with the kinetic energy lost), close approaches
//               (a pair's separation reaching a minimum below `closeWithin`),
//               escapes (a body unbound from the rest and beyond
//               `escapeBeyond`) and plane crossings (z through 0 in the
//               barycentric frame, for the bodies asked)
//   residuals   the largest relative energy error, the largest relative
//               change of the angular momentum vector, and the largest total
//               momentum's change relative to the largest body momentum at
//               the start
//   warnings    a fixed step too coarse for a close approach it met (the
//               gate's R7), and a non-symplectic scheme run for long
//
// Refusals come before a run, never during: an invalid system, a span or
// sample count out of bounds, or a request for a frame that does not exist.
// =============================================================================

import {
  EVALS_PER_STEP,
  SCHEMES,
  angularMomentum,
  dopri5,
  energy,
  makeState,
  mergeContacts,
  momentum,
} from './kernel.js';
import { bodiesOf, gravityOf, validateSystem } from './state.js';

export const LIMITS = Object.freeze({
  maxEvals: 4e8,
  maxWallMs: 10 * 60 * 1000,
  maxSamples: 5000,
  maxEvents: 2000,
});
/** What `limits` may raise them to, whoever asks. */
export const CEILINGS = Object.freeze({
  maxEvals: 2e9,
  maxWallMs: 60 * 60 * 1000,
  maxSamples: 100000,
  maxEvents: 20000,
});
const limitsOf = options => {
  const out = { ...LIMITS };
  for (const [k, v] of Object.entries(options?.limits || {}))
    if (Object.hasOwn(CEILINGS, k) && Number.isFinite(v) && v > 0)
      out[k] = Math.min(v, CEILINGS[k]);
  return out;
};
export const STATUS = Object.freeze({
  OK: 'ok',
  CANCELED: 'canceled',
  EVAL_LIMIT: 'evalLimit',
  TIME_LIMIT: 'timeLimit',
  NOT_FINITE: 'notFinite',
  EMPTY: 'empty',
});

const norm3 = a => Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);

/** Why a run cannot start, as {path, code}, or an empty list. */
export function runProblems(system, options = {}) {
  const out = validateSystem(system).map(e => ({
    path: `system.${e.path}`,
    code: e.code,
    vars: e.vars,
  }));
  if (out.length) return out;
  const {
    span,
    samples = 200,
    crossings = [],
    closeWithin,
    escapeBeyond,
  } = options;
  const limits = limitsOf(options);
  if (!(Number.isFinite(span) && span > 0))
    out.push({ path: 'span', code: 'span' });
  if (!(
    Number.isInteger(samples) &&
    samples >= 1 &&
    samples <= limits.maxSamples
  ))
    out.push({
      path: 'samples',
      code: 'samples',
      vars: { max: limits.maxSamples },
    });
  const ids = new Set(system.bodies.map(b => b.id));
  for (const id of crossings)
    if (!ids.has(id))
      out.push({ path: 'crossings', code: 'body', vars: { id } });
  if (closeWithin !== undefined && !(closeWithin > 0))
    out.push({ path: 'closeWithin', code: 'distance' });
  if (escapeBeyond !== undefined && !(escapeBeyond > 0))
    out.push({ path: 'escapeBeyond', code: 'distance' });
  return out;
}

/**
 * @param {object} system - A validated gravitas.system3d/1
 * @param {object} options - span, samples, closeWithin, escapeBeyond,
 *   crossings (body ids), positions and velocities (record them in samples),
 *   limits,
 *   now (a clock in ms)
 */
export function createRun(system, options) {
  const problems = runProblems(system, options);
  if (problems.length) throw Object.assign(new Error('refused'), { problems });
  const {
    span,
    samples = 200,
    closeWithin,
    escapeBeyond,
    crossings = [],
    positions = true,
    velocities = false,
    now = () => performance.now(),
  } = options;
  const limits = limitsOf(options);
  const s = makeState(bodiesOf(system), { G: gravityOf(system) });
  s.t = system.t || 0;
  const t0 = s.t;
  const it = system.integrator;
  const index = new Map(system.bodies.map((b, i) => [b.id, i]));
  const watchZ = crossings.map(id => index.get(id));
  const E0 = energy(s);
  const L0 = angularMomentum(s);
  const L0n = norm3(L0);
  const P0 = momentum(s);
  let pScale = 0;
  for (let i = 0; i < s.n; i++)
    pScale = Math.max(
      pScale,
      s.m[i] * norm3([s.v[3 * i], s.v[3 * i + 1], s.v[3 * i + 2]])
    );
  const a = new Float64Array(3 * s.n);
  const out = {
    samples: [],
    events: [],
    residuals: { energy: 0, angularMomentum: 0, momentum: 0 },
    warnings: [],
    stats: { evals: 0, steps: 0, rejected: 0, wallMs: 0 },
    status: null,
  };
  const warned = new Set();
  const warn = (code, vars = {}) => {
    // One warning of each kind: the first pair is the one named.
    if (warned.has(code)) return;
    warned.add(code);
    out.warnings.push({ code, ...vars });
  };
  const event = e => {
    if (out.events.length < limits.maxEvents) out.events.push(e);
  };
  if (it.scheme === 'rk4' || it.scheme === 'dopri5')
    warn('nonSymplectic', { scheme: it.scheme });

  // --- Event state
  const pairs = [];
  if (closeWithin !== undefined)
    for (let i = 0; i < s.n; i++)
      for (let j = i + 1; j < s.n; j++) pairs.push([i, j, 0]);
  const zPrev = watchZ.map(i => s.x[3 * i + 2]);
  const escaped = new Set();
  const radialRate = (i, j) => {
    let dd = 0;
    let dv = 0;
    for (let k = 0; k < 3; k++) {
      const d = s.x[3 * j + k] - s.x[3 * i + k];
      dd += d * d;
      dv += d * (s.v[3 * j + k] - s.v[3 * i + k]);
    }
    return { d2: dd, rate: dv };
  };
  for (const p of pairs) p[2] = radialRate(p[0], p[1]).rate;

  /**
   * Whether a fixed step moved some pair by more than a tenth of their
   * separation: the encounter is not resolved (the gate's R7). Squared
   * lengths, and only while no warning has been given, so it costs a
   * fraction of one force evaluation.
   */
  const fixedStep = it.scheme !== 'dopri5';
  const checkResolution = h => {
    for (let i = 0; i < s.n; i++) {
      if (!s.alive[i]) continue;
      for (let j = i + 1; j < s.n; j++) {
        if (!s.alive[j] || (s.m[i] === 0 && s.m[j] === 0)) continue;
        let d2 = 0;
        let u2 = 0;
        for (let k = 0; k < 3; k++) {
          const d = s.x[3 * j + k] - s.x[3 * i + k];
          const u = s.v[3 * j + k] - s.v[3 * i + k];
          d2 += d * d;
          u2 += u * u;
        }
        if (u2 * h * h * 100 > d2) {
          warn('unresolvedEncounter', {
            bodies: [system.bodies[i].id, system.bodies[j].id],
          });
          return;
        }
      }
    }
  };

  /** After every step: mergers, close approaches, crossings, and whether to go on. */
  const afterStep = h => {
    out.stats.steps++;
    if (fixedStep && !warned.has('unresolvedEncounter')) checkResolution(h);
    for (const m of mergeContacts(s))
      event({
        kind: 'merger',
        t: s.t,
        bodies: [system.bodies[m.into].id, system.bodies[m.from].id],
        keLost: m.keLost,
        momentumChange: m.momentumChange,
        mass: m.mass,
      });
    for (const p of pairs) {
      const [i, j, before] = p;
      if (!s.alive[i] || !s.alive[j]) continue;
      const { d2, rate } = radialRate(i, j);
      if (before < 0 && rate >= 0 && d2 < closeWithin * closeWithin) {
        const d = Math.sqrt(d2);
        event({
          kind: 'closeApproach',
          t: s.t,
          bodies: [system.bodies[i].id, system.bodies[j].id],
          distance: d,
        });
      }
      p[2] = rate;
    }
    watchZ.forEach((i, w) => {
      const z = s.x[3 * i + 2];
      if (s.alive[i] && ((zPrev[w] < 0 && z >= 0) || (zPrev[w] > 0 && z <= 0)))
        event({
          kind: 'crossing',
          t: s.t,
          bodies: [system.bodies[i].id],
          direction: z >= 0 ? 'ascending' : 'descending',
        });
      zPrev[w] = z;
    });
    return true;
  };

  const measure = () => {
    const E = energy(s);
    const L = angularMomentum(s);
    const P = momentum(s);
    const dE = Math.abs((E - E0) / E0);
    const dL =
      L0n > 0 ? norm3([L[0] - L0[0], L[1] - L0[1], L[2] - L0[2]]) / L0n : 0;
    const dP =
      pScale > 0
        ? norm3([P[0] - P0[0], P[1] - P0[1], P[2] - P0[2]]) / pScale
        : 0;
    const r = out.residuals;
    r.energy = Math.max(r.energy, dE);
    r.angularMomentum = Math.max(r.angularMomentum, dL);
    r.momentum = Math.max(r.momentum, dP);
    const sample = { t: s.t, energy: dE, angularMomentum: dL, momentum: dP };
    if (positions) sample.x = Array.from(s.x);
    if (velocities) sample.v = Array.from(s.v);
    out.samples.push(sample);
    if (escapeBeyond !== undefined) checkEscapes();
  };

  const checkEscapes = () => {
    for (let i = 0; i < s.n; i++) {
      if (!s.alive[i] || escaped.has(i)) continue;
      // The body against the barycenter of everything else.
      let M = 0;
      const c = [0, 0, 0];
      const w = [0, 0, 0];
      for (let j = 0; j < s.n; j++) {
        if (j === i || !s.alive[j]) continue;
        M += s.m[j];
        for (let k = 0; k < 3; k++) {
          c[k] += s.m[j] * s.x[3 * j + k];
          w[k] += s.m[j] * s.v[3 * j + k];
        }
      }
      if (!(M > 0)) continue;
      const d = [0, 1, 2].map(k => s.x[3 * i + k] - c[k] / M);
      const u = [0, 1, 2].map(k => s.v[3 * i + k] - w[k] / M);
      const r = norm3(d);
      const e =
        0.5 * (u[0] * u[0] + u[1] * u[1] + u[2] * u[2]) -
        (s.G * (M + s.m[i])) / r;
      if (r > escapeBeyond && e > 0) {
        escaped.add(i);
        event({
          kind: 'escape',
          t: s.t,
          bodies: [system.bodies[i].id],
          distance: r,
        });
      }
    }
  };

  const finite = () => {
    for (let k = 0; k < s.x.length; k++)
      if (!Number.isFinite(s.x[k]) || !Number.isFinite(s.v[k])) return false;
    return true;
  };
  const massiveLeft = () => {
    let n = 0;
    for (let i = 0; i < s.n; i++) if (s.alive[i] && s.m[i] > 0) n++;
    return n;
  };

  measure();
  let sampleIndex = 0;
  let canceled = false;
  let hAdaptive =
    it.scheme === 'dopri5' ? Math.min(span / samples, span * 1e-3) : null;
  const started = now();
  const interval = span / samples;

  /** One sample interval. Returns false when the run must stop. */
  const oneInterval = () => {
    const target = t0 + (sampleIndex + 1) * interval;
    if (it.scheme === 'dopri5') {
      const r = dopri5(s, target - s.t, {
        tol: it.tol,
        h0: hAdaptive,
        onStep: afterStep,
      });
      hAdaptive = r.h;
      out.stats.evals += 6 * (r.accepted + r.rejected);
      out.stats.rejected += r.rejected;
    } else {
      // Whole steps that land exactly on the sample time, none longer than h.
      const steps = Math.max(1, Math.ceil((target - s.t) / it.h - 1e-9));
      const h = (target - s.t) / steps;
      const step = SCHEMES[it.scheme];
      for (let k = 0; k < steps; k++) {
        step(s, h, a);
        afterStep(h);
      }
      s.t = target;
      out.stats.evals += steps * EVALS_PER_STEP[it.scheme];
    }
    sampleIndex++;
    if (!finite()) return STATUS.NOT_FINITE;
    measure();
    if (massiveLeft() < 1) return STATUS.EMPTY;
    if (out.stats.evals > limits.maxEvals) return STATUS.EVAL_LIMIT;
    return null;
  };

  return {
    state: s,
    /** Run for about `budgetMs`; returns whether the run has finished. */
    advance(budgetMs = 50) {
      if (out.status) return true;
      const sliceStart = now();
      while (sampleIndex < samples) {
        if (canceled) {
          out.status = STATUS.CANCELED;
          break;
        }
        const stop = oneInterval();
        if (stop) {
          out.status = stop;
          break;
        }
        if (now() - started > limits.maxWallMs) {
          out.status = STATUS.TIME_LIMIT;
          break;
        }
        if (now() - sliceStart >= budgetMs) break;
      }
      if (!out.status && sampleIndex >= samples) out.status = STATUS.OK;
      out.stats.wallMs = now() - started;
      return Boolean(out.status);
    },
    cancel() {
      canceled = true;
    },
    get fraction() {
      return sampleIndex / samples;
    },
    result() {
      return out;
    },
  };
}

/** Run to the end in one go: for Node, tests and tools. */
export function runToEnd(system, options) {
  const run = createRun(system, options);
  while (!run.advance(Infinity));
  return run.result();
}
