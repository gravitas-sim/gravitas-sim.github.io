// =============================================================================
// The mission core's Worker: its message handling (./worker.js)
// -----------------------------------------------------------------------------
// Separate from the Worker's global scope so that one implementation serves
// the Worker and the tests. The protocol, versioned by ./api.js MISSION_API:
//
//   page -> worker   {type: 'hello'}
//                    {type: 'solve', id, problem: {kind, ...}}
//                    {type: 'window', id, options, limits?: {maxWallMs}}
//                    {type: 'validate', id, cases?: [ids]}
//                    {type: 'cancel', id}
//   worker -> page   {type: 'hello', api}
//                    {type: 'progress', id, fraction}
//                    {type: 'result', id, result}
//                    {type: 'refused', id, problems}
//                    {type: 'error', id, message}
//
// Every solve runs here, so the page never computes an orbit. A window runs
// in slices of about 30 ms and yields between them, so a cancel is read
// within a slice; it also stops at `maxWallMs` (default two minutes, at most
// ten) with status 'timeLimit', and its size is bounded before it starts
// (./window.js MAX_CELLS). Terminating the Worker ends anything at once,
// which is what the client does when asked to.
// =============================================================================

import { MISSION_API } from './api.js';
import { BODIES, CENTRAL, PLANETS } from './bodies.js';
import { lambert } from './lambert.js';
import {
  biElliptic,
  biEllipticLimit,
  hohmann,
  hohmannPlaneChange,
  optimalSplit,
  phasing,
  rendezvous,
} from './transfers.js';
import { flyby, interplanetaryHohmann, sphereOfInfluence } from './patched.js';
import { createWindow, windowProblems } from './window.js';
import { CASES, runCase } from './references.js';

export const WALL = Object.freeze({
  maxWallMs: 2 * 60 * 1000,
  ceiling: 10 * 60 * 1000,
});
const running = new Map();
const tick = () => new Promise(ok => setTimeout(ok, 0));

/** Why a problem cannot be solved, as {path, code}; empty if it can be. */
export function solveProblems(p) {
  if (!p || typeof p !== 'object') return [{ path: 'problem', code: 'input' }];
  const kinds = [
    'hohmann',
    'biElliptic',
    'planeChange',
    'rendezvous',
    'phasing',
    'lambert',
    'interplanetary',
    'flyby',
  ];
  if (!kinds.includes(p.kind)) return [{ path: 'kind', code: 'kind' }];
  if (p.kind === 'interplanetary')
    return ['from', 'to']
      .filter(k => !PLANETS.includes(p[k]))
      .map(k => ({ path: k, code: 'planet' }));
  const allowed = p.kind === 'flyby' ? PLANETS : CENTRAL;
  if (!allowed.includes(p.body)) return [{ path: 'body', code: 'body' }];
  return [];
}

/** Solve one problem: the solver's own answer, ok or refused with its code. */
export function solve(p) {
  const mu = BODIES[p.body]?.GM;
  switch (p.kind) {
    case 'hohmann':
      return hohmann(mu, p.r1, p.r2);
    case 'biElliptic': {
      const b = biElliptic(mu, p.r1, p.r2, p.rb);
      const h = hohmann(mu, p.r1, p.r2);
      const limit = biEllipticLimit(mu, p.r1, p.r2);
      return b.ok
        ? {
            ...b,
            hohmann: h.ok ? h.total : null,
            limit: limit.ok ? limit.total : null,
          }
        : b;
    }
    case 'planeChange':
      return p.split === 'optimal'
        ? optimalSplit(mu, p.r1, p.r2, p.di)
        : hohmannPlaneChange(mu, p.r1, p.r2, p.di, p.split);
    case 'rendezvous':
      return rendezvous(mu, p.r1, p.r2, p.phase);
    case 'phasing':
      return phasing(mu, p.r, p.ahead, p.laps, BODIES[p.body].radius);
    case 'lambert': {
      const s = lambert({
        mu,
        r1: p.r1,
        r2: p.r2,
        tof: p.tof,
        direction: p.direction,
      });
      return s.ok ? { ...s, tof: p.tof } : s;
    }
    case 'interplanetary':
      return interplanetaryHohmann(
        { id: p.from, altitude: p.fromAltitude },
        { id: p.to, altitude: p.toAltitude }
      );
    case 'flyby': {
      const f = flyby({
        id: p.body,
        vinfIn: [p.vinf, 0, 0],
        rp: p.rp,
        side: p.side ?? 1,
      });
      return f.ok ? { ...f, soi: sphereOfInfluence(p.body) } : f;
    }
  }
  return { ok: false, status: 'input' };
}

const errorOf = (id, err) => ({
  type: 'error',
  id,
  message: String(err?.message || err).slice(0, 500),
});

async function runWindow({ id, options, limits }, post, now) {
  const problems = windowProblems(options);
  if (problems.length) return post({ type: 'refused', id, problems });
  const wall = Math.min(
    Number.isFinite(limits?.maxWallMs) && limits.maxWallMs > 0
      ? limits.maxWallMs
      : WALL.maxWallMs,
    WALL.ceiling
  );
  try {
    const w = createWindow(options, { now });
    running.set(id, w);
    const t0 = now();
    let last = -1;
    let timedOut = false;
    while (!w.advance(30)) {
      if (now() - t0 > wall) {
        timedOut = true;
        w.cancel();
        break;
      }
      if (w.fraction - last >= 0.02) {
        last = w.fraction;
        post({ type: 'progress', id, fraction: w.fraction });
      }
      await tick();
    }
    running.delete(id);
    const result = w.result();
    if (timedOut) result.status = 'timeLimit';
    post({ type: 'result', id, result }, [
      result.c3.buffer,
      result.vinf.buffer,
      result.total.buffer,
      result.cellStatus.buffer,
    ]);
  } catch (err) {
    running.delete(id);
    post(errorOf(id, err));
  }
}

async function runValidation({ id, cases }, post) {
  const list = Array.isArray(cases)
    ? CASES.filter(c => cases.includes(c.id))
    : CASES;
  let canceled = false;
  running.set(id, { cancel: () => (canceled = true) });
  const out = [];
  for (const [i, c] of list.entries()) {
    if (canceled) break;
    out.push({ id: c.id, kind: c.kind, measures: runCase(c) });
    post({ type: 'progress', id, fraction: (i + 1) / list.length });
    await tick();
  }
  running.delete(id);
  post({
    type: 'result',
    id,
    result: { status: canceled ? 'canceled' : 'ok', cases: out },
  });
}

/**
 * Handle one message; `post` sends an answer. The Worker is this with
 * post = self.postMessage, and the tests drive it directly.
 */
export async function handle(msg, post, now = () => performance.now()) {
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'hello') return post({ type: 'hello', api: MISSION_API });
  if (msg.type === 'cancel') return running.get(msg.id)?.cancel();
  if (msg.type === 'window') return runWindow(msg, post, now);
  if (msg.type === 'validate') return runValidation(msg, post);
  if (msg.type !== 'solve')
    return post({
      type: 'error',
      id: msg.id ?? null,
      message: `unknown message ${msg.type}`,
    });
  const problems = solveProblems(msg.problem);
  if (problems.length) return post({ type: 'refused', id: msg.id, problems });
  try {
    return post({ type: 'result', id: msg.id, result: solve(msg.problem) });
  } catch (err) {
    return post(errorOf(msg.id, err));
  }
}
