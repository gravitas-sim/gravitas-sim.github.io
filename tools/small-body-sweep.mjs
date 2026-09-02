#!/usr/bin/env node
// =============================================================================
// Small-body scenario sweep
// -----------------------------------------------------------------------------
// Development only, like tools/scenario-stability.mjs, and built for one
// question: correcting the Asteroid, Comet and Debris masses changes every
// interaction those bodies take part in, so which of the thirty-one scenarios
// that contain them behave differently afterwards, and how?
//
//   node tools/small-body-sweep.mjs --baseline out.json      # record
//   node tools/small-body-sweep.mjs --compare out.json       # record and diff
//   node tools/small-body-sweep.mjs "Kuiper Belt" --seconds 40
//
// Per scenario, over a seeded run at the scenario's own sim_speed:
//
//   counts    bodies of each kind at the start and at the end, so a scenario
//             quietly eating its own asteroid belt is visible
//   impacts   collision events by type and the simulated time of the first one,
//             which is where a change in collision timing shows up
//   debris    peak debris count, the fragmentation signal
//   escaped   surviving small bodies beyond the cull box, the ejection signal
//   da        median fractional change in the semi-major axis of the small
//             bodies that survive, about the most massive body: orbit stability
//   massfrac  the small bodies' share of the total mass, which is what decides
//             whether their gravity mattered at all
// =============================================================================

import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { serveStatic } from './static-server.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8131;

/** Every shipped scenario that builds asteroids or comets. */
const SMALL_BODY_SCENARIOS = [
  'Solar System',
  'Binary BH',
  'Triple BH System',
  'Supermassive BH',
  'Star Cluster',
  'Kuiper Belt',
  'Sagittarius A*',
  'Binary Star System',
  'Slingshot',
  'Rogue Encounter',
  'Neutron Star Collision',
  'Pulsar System',
  'White Dwarf Binary',
  'Stellar Graveyard',
  'Galactic Center',
  'Supernova Remnant',
  'Compact Object Zoo',
  'Millisecond Pulsar',
  'Intermediate Mass BH',
  'Galactic Collision',
  'Micro BH Swarm',
  'Exoplanet Lab',
  'Quasar Cannon',
  'The Pinwheel Galaxy Core',
  'Star Frisbee',
  'Alien Dyson Swarm Collapse',
  'Tidal Arm Tango',
  'Hungry Hungry Holes',
  'Slingshot Gauntlet',
  'Black Hole Billiards',
  'Stellar Nursery',
];

const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);
const num = (v, d = 3) =>
  !Number.isFinite(v)
    ? '-'
    : Math.abs(v) >= 1e4
      ? v.toExponential(1)
      : v.toFixed(d);

/**
 * Run one scenario in the page and return its measurements.
 * @param {import('playwright').Page} page - The open application
 * @param {string} key - Scenario name
 * @param {number} seconds - Simulated seconds to run
 * @returns {Promise<object>} Measurements
 */
async function probe(page, key, seconds) {
  return page.evaluate(
    async ({ key, seconds }) => {
      const ui = await import('/js/ui.js');
      const physics = await import('/js/physics.js');

      const impacts = [];
      const onImpact = e => {
        impacts.push({ t: window.__sweepTime, type: e.detail.impactType });
      };
      window.addEventListener('gravitasCollision', onImpact);
      window.__sweepTime = 0;

      ui.SETTINGS.preset_scenario = key;
      ui.initialize_simulation({ seed: 'small-body-sweep' });
      ui.state.paused = false;

      const smallLists = () => [physics.asteroids, physics.comets];
      const counts = () => ({
        asteroids: physics.asteroids.filter(o => o.alive).length,
        comets: physics.comets.filter(o => o.alive).length,
        debris: physics.debris.filter(o => o.alive).length,
        planets: physics.planets.filter(o => o.alive).length,
        gas_giants: physics.gas_giants.filter(o => o.alive).length,
        stars: physics.stars.filter(o => o.alive).length,
        neutron_stars: physics.neutron_stars.filter(o => o.alive).length,
        white_dwarfs: physics.white_dwarfs.filter(o => o.alive).length,
        bh: physics.bh_list.length,
      });

      const heavies = () =>
        [
          ...physics.bh_list,
          ...physics.stars,
          ...physics.neutron_stars,
          ...physics.white_dwarfs,
          ...physics.galaxies,
        ].filter(b => b && b.alive !== false);

      /** The body the small ones are treated as orbiting. */
      const primary = () => {
        let best = null;
        for (const b of heavies()) if (!best || b.mass > best.mass) best = b;
        return best;
      };

      /** Semi-major axis of `b` about `p`, or NaN if unbound. */
      const semiMajor = (b, p, G) => {
        if (!p) return NaN;
        const dx = b.pos.x - p.pos.x;
        const dy = b.pos.y - p.pos.y;
        const r = Math.hypot(dx, dy);
        const vx = b.vel.x - p.vel.x;
        const vy = b.vel.y - p.vel.y;
        const mu = G * (p.mass + b.mass);
        const energy = 0.5 * (vx * vx + vy * vy) - mu / r;
        if (!(energy < 0)) return NaN;
        return -mu / (2 * energy);
      };

      const G = physics.getPhysicsSetting('gravitational_constant');
      const p0 = primary();
      const a0 = new Map();
      for (const list of smallLists()) {
        for (const b of list) a0.set(b.id, semiMajor(b, p0, G));
      }

      const massTotals = () => {
        let small = 0;
        let all = 0;
        for (const b of [
          ...physics.bh_list,
          ...physics.stars,
          ...physics.neutron_stars,
          ...physics.white_dwarfs,
          ...physics.planets,
          ...physics.gas_giants,
          ...physics.galaxies,
        ])
          all += b.mass || 0;
        for (const list of smallLists())
          for (const b of list) if (b.alive) small += b.mass || 0;
        return { small, all: all + small };
      };

      const before = counts();
      const massBefore = massTotals();

      const DT = physics.DT;
      const frameSeconds = 1 / 60;
      const dtSim =
        Math.min(frameSeconds, 0.05) * ui.SETTINGS.sim_speed * 50 * DT;
      const maxStep = ui.SETTINGS.max_timestep || 0;
      const frames = Math.round(seconds / frameSeconds);
      let peakDebris = before.debris;

      for (let f = 0; f < frames; f++) {
        window.__sweepTime = (f * frameSeconds).toFixed(2);
        if (maxStep > 0 && dtSim > maxStep) {
          const n = Math.min(64, Math.ceil(dtSim / maxStep));
          const sub = dtSim / n;
          for (let i = 0; i < n; i++) physics.updatePhysics(sub);
        } else {
          physics.updatePhysics(dtSim);
        }
        if (f % 30 === 0) {
          const d = physics.debris.filter(o => o.alive).length;
          if (d > peakDebris) peakDebris = d;
        }
      }

      window.removeEventListener('gravitasCollision', onImpact);

      const after = counts();
      const massAfter = massTotals();
      const p1 = primary();

      // Orbit stability: how much the surviving small bodies' semi-major axes
      // moved, as a fraction. The median, because a handful of close encounters
      // would otherwise dominate a mean and say nothing about the belt.
      const das = [];
      let escaped = 0;
      const box = 4000;
      for (const list of smallLists()) {
        for (const b of list) {
          if (!b.alive) continue;
          if (Math.hypot(b.pos.x, b.pos.y) > box) escaped++;
          const start = a0.get(b.id);
          const now = semiMajor(b, p1, G);
          if (Number.isFinite(start) && Number.isFinite(now) && start !== 0) {
            das.push(Math.abs(now - start) / Math.abs(start));
          }
        }
      }
      das.sort((x, y) => x - y);
      const medianDa = das.length ? das[Math.floor(das.length / 2)] : NaN;

      const byType = {};
      for (const im of impacts) byType[im.type] = (byType[im.type] || 0) + 1;

      return {
        key,
        before,
        after,
        peakDebris,
        escaped,
        medianDa,
        impacts: impacts.length,
        impactTypes: byType,
        firstImpactAt: impacts.length ? Number(impacts[0].t) : null,
        smallMassFractionBefore:
          massBefore.all > 0 ? massBefore.small / massBefore.all : 0,
        smallMassFractionAfter:
          massAfter.all > 0 ? massAfter.small / massAfter.all : 0,
      };
    },
    { key, seconds }
  );
}

async function main() {
  const args = process.argv.slice(2);
  const si = args.indexOf('--seconds');
  const seconds = si >= 0 ? Number(args[si + 1]) : 30;
  const bi = args.indexOf('--baseline');
  const ci = args.indexOf('--compare');
  const baselineOut = bi >= 0 ? args[bi + 1] : null;
  const compareWith = ci >= 0 ? args[ci + 1] : null;
  const wanted = args.filter(
    (a, i) =>
      !a.startsWith('--') && i !== si + 1 && i !== bi + 1 && i !== ci + 1
  );
  const scenarios = wanted.length ? wanted : SMALL_BODY_SCENARIOS;

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

  console.log(
    `\nSmall-body sweep: ${seconds}s of simulated time per scenario, ` +
      `${scenarios.length} scenarios\n`
  );
  console.log(
    `${pad('scenario', 28)}${padL('ast', 10)}${padL('com', 8)}` +
      `${padL('debris^', 9)}${padL('impacts', 9)}${padL('t1st', 8)}` +
      `${padL('esc', 6)}${padL('med da', 9)}${padL('m_small', 10)}`
  );
  console.log('-'.repeat(97));

  const results = {};
  for (const key of scenarios) {
    let r;
    try {
      r = await probe(page, key, seconds);
    } catch (err) {
      console.log(`${pad(key, 28)}  ERROR: ${err.message}`);
      continue;
    }
    results[key] = r;
    console.log(
      pad(key, 28) +
        padL(`${r.before.asteroids}->${r.after.asteroids}`, 10) +
        padL(`${r.before.comets}->${r.after.comets}`, 8) +
        padL(r.peakDebris, 9) +
        padL(r.impacts, 9) +
        padL(r.firstImpactAt == null ? '-' : r.firstImpactAt, 8) +
        padL(r.escaped, 6) +
        padL(num(r.medianDa, 4), 9) +
        padL(num(r.smallMassFractionBefore, 5), 10)
    );
  }

  if (baselineOut) {
    writeFileSync(baselineOut, JSON.stringify({ seconds, results }, null, 2));
    console.log(`\nBaseline written to ${baselineOut}`);
  }

  if (compareWith && existsSync(compareWith)) {
    const base = JSON.parse(readFileSync(compareWith, 'utf8')).results;
    console.log('\nChanges against baseline (blank = identical)\n');
    console.log(
      `${pad('scenario', 28)}${padL('ast end', 14)}${padL('debris^', 14)}` +
        `${padL('impacts', 14)}${padL('t1st', 14)}${padL('med da', 18)}`
    );
    console.log('-'.repeat(85));
    for (const key of Object.keys(results)) {
      const a = base[key];
      const b = results[key];
      if (!a) continue;
      const d = (x, y) => (x === y ? '' : `${x}->${y}`);
      const dn = (x, y) =>
        (x == null && y == null) || num(x, 4) === num(y, 4)
          ? ''
          : `${num(x, 4)}->${num(y, 4)}`;
      const cells = [
        d(a.after.asteroids, b.after.asteroids),
        d(a.peakDebris, b.peakDebris),
        d(a.impacts, b.impacts),
        d(a.firstImpactAt, b.firstImpactAt),
        dn(a.medianDa, b.medianDa),
      ];
      if (cells.every(c => c === '')) continue;
      console.log(
        pad(key, 28) +
          padL(cells[0], 14) +
          padL(cells[1], 14) +
          padL(cells[2], 14) +
          padL(cells[3], 14) +
          padL(cells[4], 18)
      );
    }
  }

  await browser.close();
  await server.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
