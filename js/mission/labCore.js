// =============================================================================
// The mission lab's Worker: its message handling (./labWorker.js)
// -----------------------------------------------------------------------------
// The protocol is the core's (./workerCore.js, ./api.js), so the same client
// speaks to it, with the lab's meanings:
//
//   {type: 'solve', id, problem: {kind: 'mission', plan}}  a whole mission
//                   (./solar.js computeMission) on the ephemeris pack
//   {type: 'window', id, options, limits?}  a transfer window on the pack's
//                   positions, in three dimensions (./window.js), refused
//                   when it reaches outside the pack's dates
//   {type: 'validate', id, cases?}  the lab's reference cases
//                   (./labReferences.js)
//   {type: 'cancel', id}
//
// The pack is decoded once per Worker, which a client makes per request.
// =============================================================================

import { MISSION_API } from './api.js';
import { PACK, DATA } from '../data/ephemeris/solarSystem2025.js';
import { JD_J2000, createEphemeris } from './ephemeris.js';
import { computeMission, statesFrom } from './solar.js';
import { createWindow, windowProblems } from './window.js';
import { LAB_CASES } from './labReferences.js';
import { runCase } from './references.js';
import { WALL } from './workerCore.js';

const running = new Map();
const tick = () => new Promise(ok => setTimeout(ok, 0));
let eph = null;
const ephemeris = () => (eph ??= createEphemeris(PACK, DATA));

const errorOf = (id, err) => ({
  type: 'error',
  id,
  message: String(err?.message || err).slice(0, 500),
});

/** A window's problems, including dates the pack does not hold. */
export function labWindowProblems(o) {
  const out = windowProblems(o);
  if (out.length) return out;
  const { startJd, stopJd } = ephemeris().range;
  const first = JD_J2000 + o.departStart;
  const last = first + o.departSpan + o.tofMax;
  if (!(first >= startJd && last <= stopJd))
    out.push({ path: 'departStart', code: 'outOfRange' });
  return out;
}

async function runWindow({ id, options, limits }, post, now) {
  const problems = labWindowProblems(options);
  if (problems.length) return post({ type: 'refused', id, problems });
  const wall = Math.min(
    Number.isFinite(limits?.maxWallMs) && limits.maxWallMs > 0
      ? limits.maxWallMs
      : WALL.maxWallMs,
    WALL.ceiling
  );
  try {
    const w = createWindow(options, { now, states: statesFrom(ephemeris()) });
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
    ? LAB_CASES.filter(c => cases.includes(c.id))
    : LAB_CASES;
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

/** Handle one message; `post` sends an answer. */
export async function handle(msg, post, now = () => performance.now()) {
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'hello') return post({ type: 'hello', api: MISSION_API });
  if (msg.type === 'cancel') return running.get(msg.id)?.cancel();
  if (msg.type === 'window') return runWindow(msg, post, now);
  if (msg.type === 'validate') return runValidation(msg, post);
  if (msg.type !== 'solve' || msg.problem?.kind !== 'mission')
    return post({
      type: 'error',
      id: msg.id ?? null,
      message: `unknown message ${msg.type}`,
    });
  try {
    const result = computeMission(ephemeris(), msg.problem.plan);
    if (!result.ok && result.problems)
      return post({ type: 'refused', id: msg.id, problems: result.problems });
    return post({ type: 'result', id: msg.id, result });
  } catch (err) {
    return post(errorOf(msg.id, err));
  }
}
