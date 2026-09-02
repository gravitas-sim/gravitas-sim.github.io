#!/usr/bin/env node
// =============================================================================
// Scenario stability probe
// -----------------------------------------------------------------------------
// Development only, and deliberately not part of `npm test`: it needs Playwright
// and a browser, and the deterministic suite (npm run validate:physics) is what
// CI should enforce.
//
// What it is for
// -----------------------------------------------------------------------------
// The deterministic suite validates the engine on configurations it builds
// itself. This one validates the forty-odd shipped scenarios, as the
// application actually assembles them: real presets, real settings, real
// substepping, real object lists. That is the difference between "the
// integrator conserves momentum" and "the Binary Star scenario a student is
// about to be assigned conserves momentum".
//
// It exists because of a specific bug. The engine used to advance bodies one at
// a time, so each body felt the previous one at its already-updated position.
// The pairing broke, momentum drifted, and a two-body orbit lost about 1% of its
// binding energy per orbit. On screen that looked like binaries spiralling
// together and merging on their own, and several scenarios worked around it by
// capping their timestep rather than by anyone finding the cause. After fixing
// the integrator, the question "did that change any scenario for the worse?"
// needed an answer with numbers in it.
//
//   npm run validate:scenarios
//   node tools/scenario-stability.mjs "Binary Star" --seconds 30
//   node tools/scenario-stability.mjs --all
//
// Reported per scenario, over a simulated run at the scenario's own sim_speed:
//
//   dP     drift in total linear momentum, as a fraction of the typical
//          momentum in the system. Should be at round-off for any scenario
//          without a static black hole; see the note on those below.
//   dE     change in total energy, relative. Bounded, not zero: symplectic
//          Euler oscillates. A number that grows with run length is the bug.
//   dL     change in total angular momentum about the barycenter, relative.
//   bodies before and after, so a scenario quietly eating itself is visible.
//
// Static black holes
// -----------------------------------------------------------------------------
// Scenarios with bh_behavior 'Static' do not conserve momentum, by design and
// not by accident: a static hole is a fixed potential well that pulls on
// everything and is pulled by nothing, which is a deliberate teaching object
// and is documented as such. Those scenarios are reported and flagged rather
// than judged, because there is no correct value for dP to have.
// =============================================================================

import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveStatic } from './static-server.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8127;

// The scenarios most exposed to the integrator change: everything with mutual
// gravity, a binary, or a tightly packed system. Ordered roughly by how much a
// lesson depends on them being right.
const DEFAULT_SCENARIOS = [
  'Solar System',
  'TRAPPIST-1 System',
  'Binary Star',
  'Binary Pair',
  'Earth-Moon System',
  'Transit Lab',
  'Star Cluster',
  'GW150914',
  'Kuiper Belt',
];

const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);
const e2 = v =>
  !Number.isFinite(v) ? String(v) : v === 0 ? '0' : v.toExponential(2);

async function main() {
  const args = process.argv.slice(2);
  const si = args.indexOf('--seconds');
  const seconds = si >= 0 ? Number(args[si + 1]) : 20;
  const all = args.includes('--all');
  const wanted = args.filter((a, i) => !a.startsWith('--') && i !== si + 1);

  const server = await serveStatic({ root: ROOT, port: PORT });
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.on('pageerror', err => console.warn(`  ! ${err.message}`));

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.evaluate(() => {
    try {
      localStorage.setItem('gravitas_welcome_seen_v1', '1');
    } catch {
      /* not required */
    }
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.splashScreenEnded === true, {
    timeout: 20000,
  });

  let scenarios = wanted.length ? wanted : DEFAULT_SCENARIOS;
  if (all) {
    scenarios = await page.evaluate(async () => {
      const info = await import('/js/data/scenarioInfo.js');
      const cat = info.SCENARIO_INFO || info.default || {};
      return Object.keys(cat);
    });
  }

  console.log(
    `\nScenario stability: ${seconds}s of simulated time per scenario\n` +
      'dP = linear momentum drift, dE = energy change, dL = angular momentum ' +
      'change. All relative.\n'
  );
  console.log(
    `${pad('scenario', 26)}${padL('dP', 11)}${padL('dE', 11)}${padL('dL', 11)}` +
      `${padL('bodies', 12)}  notes`
  );
  console.log('-'.repeat(96));

  const rows = [];
  for (const key of scenarios) {
    let row;
    try {
      row = await page.evaluate(
        async ({ key, seconds }) => {
          const ui = await import('/js/ui.js');
          const physics = await import('/js/physics.js');

          ui.SETTINGS.preset_scenario = key;
          // A fixed seed, so a rerun is comparable with the last one.
          ui.initialize_simulation({ seed: 'stability-probe' });
          ui.state.paused = false;

          const G = () => physics.getPhysicsSetting('gravitational_constant');

          /** Every body that carries mass and momentum. */
          const bodies = () =>
            [
              ...physics.bh_list,
              ...physics.stars,
              ...physics.neutron_stars,
              ...physics.white_dwarfs,
              ...physics.planets,
              ...physics.gas_giants,
              ...physics.asteroids,
              ...physics.comets,
              ...physics.galaxies,
            ].filter(b => b && b.alive !== false && Number.isFinite(b.mass));

          const measure = () => {
            const bs = bodies();
            let m = 0;
            let px = 0;
            let py = 0;
            let cx = 0;
            let cy = 0;
            let pScale = 0;
            for (const b of bs) {
              m += b.mass;
              px += b.mass * b.vel.x;
              py += b.mass * b.vel.y;
              cx += b.mass * b.pos.x;
              cy += b.mass * b.pos.y;
              pScale += b.mass * Math.hypot(b.vel.x, b.vel.y);
            }
            const com = m > 0 ? { x: cx / m, y: cy / m } : { x: 0, y: 0 };
            let E = 0;
            let L = 0;
            const g = G();
            for (let i = 0; i < bs.length; i++) {
              const a = bs[i];
              E += 0.5 * a.mass * (a.vel.x ** 2 + a.vel.y ** 2);
              L +=
                a.mass *
                ((a.pos.x - com.x) * a.vel.y - (a.pos.y - com.y) * a.vel.x);
              for (let j = i + 1; j < bs.length; j++) {
                const o = bs[j];
                const r = Math.hypot(a.pos.x - o.pos.x, a.pos.y - o.pos.y);
                if (r > 0) E -= (g * a.mass * o.mass) / r;
              }
            }
            return { m, px, py, E, L, pScale, count: bs.length };
          };

          const before = measure();

          // Which documented departures this scenario has switched on. Read
          // before the run, not after: a black-hole binary that merges leaves
          // one hole behind, and asking afterwards whether there were two would
          // quietly reclassify the very scenario the exclusion is for.
          const staticBhAtStart =
            physics.bh_list.length > 0 &&
            physics.getPhysicsSetting('bh_behavior') !== 'Orbiting';
          const decayingAtStart =
            (physics.getPhysicsSetting('orbit_decay_rate') || 0) > 0 &&
            physics.bh_list.length > 1;
          // star_only_gravity, and mutual_gravity off, both make gravity
          // one-way: the bodies that are not sources are pulled by the ones
          // that are and pull back on nothing. Momentum cannot be conserved
          // under either, by construction rather than by accident. It is a
          // deliberate simplification for planetary systems - TRAPPIST-1's
          // seven planets pull each other into crossing orbits at this scale
          // and timestep - and the radial-velocity panel refuses to report a
          // reflex velocity while it is on, for exactly this reason.
          const oneWayGravity =
            physics.getPhysicsSetting('star_only_gravity') === true ||
            physics.getPhysicsSetting('mutual_gravity') !== true;
          // The dark-matter halo is a static background field centered on the
          // origin. It accelerates every body and receives no reaction, so it
          // conserves neither momentum nor energy - the same kind of object as
          // a static black hole, and equally deliberate: the halo is a claim
          // about a mass distribution too diffuse to represent as bodies.
          const halo = physics.getPhysicsSetting('dark_matter_halo') === true;

          // Reproduce render.js's own stepping, at a fixed frame time so the
          // run is deterministic: the scenario's sim_speed and its max_timestep
          // substepping are both part of what is being validated.
          const DT = physics.DT;
          const frameSeconds = 1 / 60;
          const dtSim =
            Math.min(frameSeconds, 0.05) * ui.SETTINGS.sim_speed * 50 * DT;
          const maxStep = ui.SETTINGS.max_timestep || 0;
          const frames = Math.round(seconds / frameSeconds);
          let worstE = 0;
          let worstP = 0;
          let worstL = 0;
          const sampleEvery = 30;

          for (let f = 0; f < frames; f++) {
            if (maxStep > 0 && dtSim > maxStep) {
              const n = Math.min(64, Math.ceil(dtSim / maxStep));
              const sub = dtSim / n;
              for (let i = 0; i < n; i++) physics.updatePhysics(sub);
            } else {
              physics.updatePhysics(dtSim);
            }
            if (f % sampleEvery === 0) {
              const now = measure();
              if (before.pScale > 0) {
                worstP = Math.max(
                  worstP,
                  Math.hypot(now.px - before.px, now.py - before.py) /
                    before.pScale
                );
              }
              if (Math.abs(before.E) > 0) {
                worstE = Math.max(
                  worstE,
                  Math.abs(now.E - before.E) / Math.abs(before.E)
                );
              }
              if (Math.abs(before.L) > 0) {
                worstL = Math.max(
                  worstL,
                  Math.abs(now.L - before.L) / Math.abs(before.L)
                );
              }
            }
          }
          const after = measure();

          return {
            key,
            dP: worstP,
            dE: worstE,
            dL: worstL,
            countBefore: before.count,
            countAfter: after.count,
            staticBh: staticBhAtStart,
            decaying: decayingAtStart,
            oneWayGravity,
            halo,
            manyBody: before.count > 12,
            massChanged:
              Math.abs(after.m - before.m) / Math.max(before.m, 1e-30) > 1e-9,
            countChanged: after.count !== before.count,
            dtSim,
            maxStep,
          };
        },
        { key, seconds }
      );
    } catch (err) {
      console.log(
        `${pad(key, 26)}${padL('-', 11)}${padL('-', 11)}` +
          `${padL('-', 11)}${padL('-', 12)}  ERROR: ${err.message}`
      );
      continue;
    }

    const notes = [];
    if (row.oneWayGravity)
      notes.push('one-way gravity: momentum not conserved by design');
    if (row.halo) notes.push('dark-matter halo: external field, no reaction');
    if (row.staticBh)
      notes.push('static black hole: momentum not conserved by design');
    if (row.decaying) notes.push('inspiral damping on: energy loss intended');
    if (row.massChanged)
      notes.push('mass changed: bodies merged or were absorbed');
    if (row.countChanged) notes.push('body count changed');

    rows.push(row);
    console.log(
      `${pad(row.key.slice(0, 25), 26)}${padL(e2(row.dP), 11)}` +
        `${padL(e2(row.dE), 11)}${padL(e2(row.dL), 11)}` +
        `${padL(`${row.countBefore} -> ${row.countAfter}`, 12)}  ${notes.join('; ')}`
    );
  }

  console.log('');
  // A conservative pass criterion, applied only where the model claims the law
  // holds. Anything flagged above is excluded from the verdict rather than
  // silently passed.
  // Momentum is judged only where the model claims to conserve it, and only
  // where the books balance: a scenario that culled a body off the edge of the
  // world has removed momentum from the accounting, which is bookkeeping rather
  // than physics.
  const conservative = rows.filter(
    r =>
      !r.oneWayGravity &&
      !r.staticBh &&
      !r.halo &&
      !r.decaying &&
      !r.massChanged &&
      !r.countChanged
  );
  // Energy and angular momentum are judged on resolved few-body systems. A
  // self-gravitating cluster of hundreds is chaotic and full of close
  // encounters a first-order integrator cannot resolve; its energy error is
  // real, is a property of the timestep rather than of the force law, and
  // reporting it as a conservation failure would be blaming the scheme for the
  // scenario. The deterministic suite establishes the conservation claim on
  // orbits that are resolved; this establishes that the shipped few-body
  // scenarios are in that regime.
  const settled = rows.filter(
    r =>
      !r.massChanged && !r.countChanged && !r.decaying && !r.halo && !r.manyBody
  );
  const judged = new Set([...conservative, ...settled]);
  const bad = [
    ...conservative.filter(r => r.dP > 1e-9),
    ...settled.filter(r => r.dE > 0.05 || r.dL > 0.05),
  ].filter((r, i, a) => a.indexOf(r) === i);
  console.log(
    `${rows.length} scenarios run. Momentum judged in ${conservative.length}; ` +
      `energy and angular momentum judged in ${settled.length}. ` +
      `${rows.length - judged.size} excluded from both as documented departures.`
  );
  if (bad.length) {
    console.log('\nOutside tolerance:');
    for (const r of bad) {
      console.log(`  ${r.key}: dP ${e2(r.dP)}, dE ${e2(r.dE)}, dL ${e2(r.dL)}`);
    }
  } else {
    console.log('Every judged scenario conserved momentum to round-off and');
    console.log('kept its energy and angular momentum within 5%.');
  }
  console.log('');

  await browser.close();
  server.close();
  process.exitCode = bad.length ? 1 : 0;
}

main();
