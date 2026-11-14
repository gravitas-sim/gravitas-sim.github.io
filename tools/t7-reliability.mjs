// SPIKE (never merged): does the reliability check still halve the REAL step under each candidate?
import * as ts from '../js/timestep.js';
import { stepPlan } from '../js/experiments/reliability.js';
import { build } from './tides-scenarios.mjs';
import * as physics from '../js/physics.js';
import { SCENARIO_IDS } from '../js/scenarios.js';

const out = [];
for (const policy of ['S0', 'S1', 'S2', 'S3', 'S4']) {
  let ok = 0, refused = 0, bad = [];
  for (const id of SCENARIO_IDS) {
    const s = build(id, 1);
    const dtSim = ts.frameAdvance(1 / 60, s.sim_speed, physics.DT);
    const live = ts.livePlan(dtSim, s.max_timestep, policy);
    const plan = stepPlan({ dtSim, substeps: live.substeps, step: live.step, maxSubsteps: ts.MAX_SUBSTEPS });
    if (!plan.ok) { refused++; continue; }
    // what the engine really does under the coarse and the fine cap the check sets
    const coarse = ts.substepPlan(dtSim, plan.coarse.maxTimestep);
    const fine = ts.substepPlan(dtSim, plan.fine.maxTimestep);
    const halves = Math.abs(fine.step / coarse.step - 0.5) < 1e-9;
    // the coarse run reproduces the live step (within one rounding of the piece count)
    const reproduces = Math.abs(coarse.step / live.step - 1) < 0.5;
    if (halves && reproduces) ok++; else bad.push({ id, live: live.step, coarse: coarse.step, fine: fine.step });
  }
  out.push({ policy, ok, refused, bad: bad.slice(0, 5), nbad: bad.length });
}
console.log(JSON.stringify(out));

// The check driving the policy's own step (what a policy-aware consumer does):
// coarse h, fine h/2, the same number of frames; the pieces actually taken.
const rows = [];
for (const policy of ['S1', 'S2', 'S3', 'S4']) {
  const h0 = { S1: 1 / 24, S2: 1 / 24, S3: 1 / 48, S4: 1 / 96 }[policy];
  let worstStep = 0, worstDur = 0, n = 0;
  for (const id of SCENARIO_IDS) {
    const s = build(id, 1);
    if (s.max_timestep > 0) continue;
    const dtSim = ts.frameAdvance(1 / 60, s.sim_speed, physics.DT);
    const frames = Math.max(2, Math.ceil(10 / dtSim));
    const dur = {};
    for (const [label, h] of [['coarse', h0], ['fine', h0 / 2]]) {
      const st = { carry: 0, sign: 0, frames: 0, bound: 0, maxCarryOverH: 0 };
      let t = 0;
      for (let f = 0; f < frames; f++) {
        const p = ts.planFrame(dtSim, 0, policy === 'S1' ? 'S2' : policy, st, h);
        for (let i = 0; i < p.substeps; i++) { worstStep = Math.max(worstStep, Math.abs(p.step / h - 1)); t += p.step; }
      }
      dur[label] = t;
    }
    worstDur = Math.max(worstDur, Math.abs(dur.coarse - dur.fine) / Math.max(dur.coarse, dur.fine));
    n++;
  }
  rows.push({ policy, scenarios: n, worstStepError: worstStep, worstDurationMismatch: worstDur });
}
console.log(JSON.stringify(rows));
