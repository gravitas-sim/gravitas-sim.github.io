#!/usr/bin/env node
// SPIKE (never merged): the baseline and run-everything legs of the
// step-policy gate (STEP_POLICY_GATE.md).
//
//   node tools/step-policy-spike.mjs b2 --out f.json        slice B2 membership (S0, 600 frames at 60 fps)
//   node tools/step-policy-spike.mjs t8 --out f.json        every scenario, 600 frames, four rates, policies
//   node tools/step-policy-spike.mjs plans                  capped scenarios keep substepPlan under every candidate
//
// Each leg runs in a process of its own, as tools/reference-cases.mjs does.

import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const mode = argv[0];
const arg = n => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : undefined);
const RATES = {
  120: 1 / 120,
  60: 1 / 60,
  30: 1 / 30,
  clamp: 0.2,
};
const LISTS = [
  'bh_list',
  'stars',
  'planets',
  'gas_giants',
  'asteroids',
  'comets',
  'neutron_stars',
  'white_dwarfs',
  'galaxies',
  'debris',
];

async function load() {
  const physics = await import('../js/physics.js');
  const { build } = await import('./tides-scenarios.mjs');
  const { engine } = await import('../js/random/streams.js');
  const ts = await import('../js/timestep.js');
  const { setTier } = await import('../js/quality.js');
  const { SCENARIO_IDS } = await import('../js/scenarios.js');
  setTier('full');
  return { physics, build, engine, ts, SCENARIO_IDS };
}

function bodies(physics) {
  const out = [];
  for (const l of LISTS) for (const b of physics[l] ?? []) out.push(b);
  return out;
}

async function legB2(spec) {
  const { physics, build, engine, ts } = await load();
  const settings = build(spec.id, 1);
  const floor = physics.minInteractionDistance();
  const dtSim = ts.frameAdvance(1 / 60, settings.sim_speed, physics.DT);
  let minSep = Infinity;
  let frames = 0;
  engine(1, () => {
    for (let f = 0; f < 600; f++) {
      const p = ts.substepPlan(dtSim, settings.max_timestep);
      for (let i = 0; i < p.substeps; i++) physics.updatePhysics(p.step);
      frames++;
      const bs = bodies(physics);
      for (let i = 0; i < bs.length; i++) {
        const a = bs[i];
        for (let j = i + 1; j < bs.length; j++) {
          const b = bs[j];
          const dx = a.pos.x - b.pos.x;
          const dy = a.pos.y - b.pos.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < minSep) minSep = d2;
        }
      }
    }
  });
  minSep = Math.sqrt(minSep);
  return {
    spec,
    floor,
    minSep,
    ratio: minSep / floor,
    enters: minSep < floor,
    frames,
    max_timestep: settings.max_timestep,
  };
}

async function legT8(spec) {
  const { physics, build, engine, ts } = await load();
  const settings = build(spec.id, 1);
  const dtSim = ts.frameAdvance(RATES[spec.rate], settings.sim_speed, physics.DT);
  const state = { carry: 0, sign: 0, frames: 0, bound: 0, maxCarryOverH: 0 };
  let badFrame = null;
  let error = null;
  let steps = 0;
  const t0 = Date.now();
  try {
    engine(1, () => {
      for (let f = 0; f < 600 && badFrame === null; f++) {
        const p = ts.planFrame(dtSim, settings.max_timestep, spec.policy, state);
        for (let i = 0; i < p.substeps; i++) {
          physics.updatePhysics(p.step);
          steps++;
        }
        for (const b of bodies(physics)) {
          if (
            !Number.isFinite(b.pos.x) ||
            !Number.isFinite(b.pos.y) ||
            !Number.isFinite(b.vel.x) ||
            !Number.isFinite(b.vel.y)
          ) {
            badFrame = f;
            break;
          }
        }
      }
    });
  } catch (e) {
    error = String(e?.stack ?? e).slice(0, 400);
  }
  return {
    spec,
    steps,
    nan: badFrame !== null,
    badFrame,
    error,
    bound: state.bound,
    maxCarryOverH: state.maxCarryOverH,
    simTime: physics.getSimulationTime(),
    ms: Date.now() - t0,
  };
}

function runChild(spec) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [fileURLToPath(import.meta.url), 'leg', JSON.stringify(spec)],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );
    let out = '';
    let err = '';
    child.stdout.on('data', d => (out += d));
    child.stderr.on('data', d => (err += d));
    child.on('close', code => {
      const line = out.split('\n').find(l => l.startsWith('LEG '));
      if (code !== 0 || !line)
        return reject(new Error(`${JSON.stringify(spec)} exited ${code}: ${err.slice(-300)}`));
      resolve(JSON.parse(line.slice(4)));
    });
  });
}

async function pool(specs, jobs) {
  const queue = [...specs];
  const results = [];
  const worker = async () => {
    while (queue.length) {
      const spec = queue.shift();
      try {
        results.push(await runChild(spec));
      } catch (e) {
        results.push({ spec, error: String(e.message) });
      }
    }
  };
  await Promise.all(Array.from({ length: jobs }, worker));
  return results;
}

async function main() {
  const { build, SCENARIO_IDS, ts, physics } = await load();
  const jobs = Number(arg('--jobs') ?? 2);
  const settingsOf = id => build(id, 1);
  const info = SCENARIO_IDS.map(id => {
    const s = settingsOf(id);
    return { id, max: s.max_timestep ?? 0 };
  });
  const uncapped = info.filter(x => !(x.max > 0)).map(x => x.id);
  const all = info.map(x => x.id);
  if (mode === 'plans') {
    // Every capped scenario keeps substepPlan under every candidate.
    let checked = 0;
    let mismatches = 0;
    for (const x of info.filter(x => x.max > 0)) {
      const s = settingsOf(x.id);
      for (const [r, sec] of Object.entries(RATES)) {
        const dt = ts.frameAdvance(sec, s.sim_speed, physics.DT);
        for (const p of ['S1', 'S2', 'S3', 'S4']) {
          const a = ts.planFrame(dt, x.max, p, { carry: 0, sign: 0, frames: 0, bound: 0, maxCarryOverH: 0 });
          const b = ts.substepPlan(dt, x.max);
          checked++;
          if (a.substeps !== b.substeps || a.step !== b.step) mismatches++;
          void r;
        }
      }
    }
    console.log(JSON.stringify({ capped: info.filter(x => x.max > 0).length, checked, mismatches }));
    return;
  }
  let specs;
  if (mode === 'b2') specs = uncapped.map(id => ({ kind: 'b2', id }));
  else if (mode === 't8') {
    specs = [];
    for (const id of all)
      for (const rate of Object.keys(RATES)) specs.push({ kind: 't8', id, rate, policy: 'S0' });
    for (const id of uncapped)
      for (const policy of ['S1', 'S2', 'S3', 'S4'])
        for (const rate of Object.keys(RATES)) specs.push({ kind: 't8', id, rate, policy });
  } else throw new Error('mode');
  const results = await pool(specs, jobs);
  const o = arg('--out');
  if (o) writeFileSync(o, `${JSON.stringify({ uncapped, results }, null, 1)}\n`);
  const bad = results.filter(r => r.error || r.nan);
  console.log(`${results.length} legs, ${bad.length} with an error or a NaN`);
  for (const r of bad.slice(0, 10)) console.log(JSON.stringify(r).slice(0, 300));
}

if (mode === 'leg') {
  const spec = JSON.parse(argv[1]);
  const run = spec.kind === 'b2' ? legB2 : legT8;
  run(spec).then(
    out => process.stdout.write(`LEG ${JSON.stringify(out)}\n`, () => process.exit(0)),
    e => {
      console.error(e);
      process.exit(2);
    }
  );
} else
  main().then(() => process.stdout.write('', () => process.exit(0)));
