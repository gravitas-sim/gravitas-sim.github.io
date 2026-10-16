// =============================================================================
// Base-versus-head fuzz of every scenario's world (Roadmap II Prompt 108)
// -----------------------------------------------------------------------------
// Builds every built-in scenario under many share-link-style settings and
// writes one hash per world, so a refactor of how a scenario's bodies are made
// can be compared with the code before it. Slices 2 and 4 each found a
// behavior difference this way that no hand-picked case showed (the tidal
// disruption's placement residue, a planet about a missing star).
//
//   node tools/geometry-fuzz.mjs out.json            # build the worlds here
//   node tools/geometry-fuzz.mjs --compare a.json b.json
//
// Run the first command in a checkout of the base and in the head, then
// compare the two files. Each world is the scenario under a seed with the
// settings a link would carry: every population count at 0 and 3, every
// layout, three seeds, the low quality tier, and random combinations of
// counts, layout, masses and settings (a seeded generator, so both checkouts
// draw the same cases; the nine scenarios that place by hand get more). The
// hash covers every own property of every body, the settings the build leaves
// behind, the camera and the seeded generator's next number, so a body made
// one draw earlier or later changes it. Date.now is frozen because a body
// records its creation time.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);

if (args[0] === '--compare') {
  const a = JSON.parse(readFileSync(args[1], 'utf8'));
  const b = JSON.parse(readFileSync(args[2], 'utf8'));
  const ids = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  const differ = ids.filter(id => a[id] !== b[id]);
  console.log(
    `${ids.length} worlds, ${new Set(Object.values(a)).size} distinct, ` +
      `${differ.length} differ`
  );
  for (const id of differ.slice(0, 20))
    console.log(`  ${id}\n    ${a[id]}\n    ${b[id]}`);
  process.exit(differ.length ? 1 : 0);
}

const out = args[0];
if (!out) {
  console.error('usage: geometry-fuzz.mjs <out.json> | --compare <a> <b>');
  process.exit(2);
}
const root = path.resolve(import.meta.dirname, '..');
const load = p => import(pathToFileURL(path.join(root, p)).href);

Date.now = () => 1.7e12;
performance.now = () => 1000;
const { digest, fnv } = await load('tests/scenarioDigest.js');
const { SCENARIO_PRESETS } = await load('js/scenarios.js');
const { setTier } = await load('js/quality.js');

const COUNTS = [
  'num_stars',
  'num_planets',
  'num_gas_giants',
  'num_asteroids',
  'num_comets',
  'num_black_holes',
  'num_neutron_stars',
  'num_white_dwarfs',
  'num_micro_stars',
];
const LAYOUTS = ['Circular', 'Multi-Ring', 'Random', 'Grid', 'Empty'];
// Scenarios that place their own bodies by hand get the most random cases.
const HAND_PLACED = [
  'binary-bh',
  'slingshot',
  'triple-bh-system',
  'neutron-star-collision',
  'white-dwarf-binary',
  'solar-system',
  'sagittarius-a',
  'galactic-center',
  'pulsar-system',
];

let s = 12345;
const rnd = () => {
  s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
  return s / 4294967296;
};
const pick = a => a[Math.floor(rnd() * a.length)];

const cases = [];
for (const k of Object.keys(SCENARIO_PRESETS)) {
  for (const seed of [1, 2, 3]) cases.push([k, seed, null, false]);
  for (const c of COUNTS)
    for (const n of [0, 3]) cases.push([k, 1, { [c]: n }, false]);
  for (const placement of LAYOUTS) cases.push([k, 1, { placement }, false]);
  cases.push([k, 1, { placement: 'Random', num_asteroids: 50 }, true]);
  const n = HAND_PLACED.includes(k) ? 160 : 24;
  for (let i = 0; i < n; i++) {
    const o = {};
    for (const c of COUNTS)
      if (rnd() < 0.35) o[c] = pick([0, 1, 2, 3, 5, 12, 40]);
    if (rnd() < 0.6) o.placement = pick(LAYOUTS);
    if (rnd() < 0.2) o.gravitational_constant = pick([1, 2, 3]);
    if (rnd() < 0.2) o.enable_asteroids = false;
    if (rnd() < 0.15) o.use_individual_bh_masses = false;
    if (rnd() < 0.15) o.bh_mass = pick([20, 100, 5000]);
    if (rnd() < 0.15)
      o.bh_masses = [pick([5, 30, 80]), pick([5, 30]), pick([5, 30])];
    if (rnd() < 0.15) o.ns_masses = [pick([1.4, 2]), pick([1.4, 2.1]), 1.5];
    if (rnd() < 0.1) o.mutual_gravity = false;
    if (rnd() < 0.1) o.test_star_slingshot = true;
    if (rnd() < 0.1) o.init_velocity = pick([0, 10, 60]);
    if (rnd() < 0.1) o.sim_size = pick(['Small', 'Medium', 'Large', 'Huge']);
    cases.push([k, pick([1, 2, 3, 4]), o, rnd() < 0.08]);
  }
}

const result = {};
for (const [k, seed, o, low] of cases) {
  const id = `${low ? 'low:' : ''}${k}@${seed}@${JSON.stringify(o)}`;
  try {
    if (low) setTier('low');
    const d = digest(k, seed, o);
    result[id] = fnv(d.rows.join('\n') + d.settings + d.zoom + d.pan + d.tail);
  } catch (e) {
    result[id] = 'ERR ' + String(e.message).slice(0, 80);
  } finally {
    if (low) setTier('full');
  }
}
writeFileSync(out, JSON.stringify(result));
const errors = Object.values(result).filter(v => v.startsWith('ERR')).length;
console.log(
  `${Object.keys(result).length} worlds, ` +
    `${new Set(Object.values(result)).size} distinct, ${errors} errors`
);
