#!/usr/bin/env node
// =============================================================================
// What each quality tier builds: the body-count table
// -----------------------------------------------------------------------------
// The low quality tier caps the generic populations a scenario asks for
// (populationCaps in js/quality.js, applied once per build in
// js/world/build.js). This builds every scene a lesson sets up, and then every
// built-in scenario the sandbox loads, at the full tier and at the low tier,
// from the same seed, in plain Node, and writes the counts side by side to
// docs/tier-invariance.md.
//
//   node tools/tier-table.mjs           # write docs/tier-invariance.md
//   node tools/tier-table.mjs --check   # fail if the committed table is stale
//
// For each build it records the bodies of each kind and whether the bodies the
// two tiers have in common sit in the same places with the same masses (a cap
// draws fewer random numbers, which could move a body built after it).
//
// A scene whose counts differ needs a sentence saying which numbers a student
// can read depend on the capped count. Those sentences are written by hand in
// READABLE below, after reading the scenario and the lessons that use it; the
// check fails when a scene differs and has none, so a new cap or a new
// population cannot slip into the table without someone looking.
//
// The build path is the one tools/seeded-step.mjs uses: buildWorld with a
// headless context, under the engine's seeded stream. A lesson's setup is the
// shared-link payload js/investigations.js makes of it (payloadFromSetup): its
// scenario, its seed (the scenario's name when it states none) and its
// settings, which the builder applies after the preset as it does for a link.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as physics from '../js/physics.js';
import {
  applyPreset,
  resetPresetMemory,
  scenarioId,
  SCENARIO_IDS,
} from '../js/scenarios.js';
import { buildWorld } from '../js/world/build.js';
import { DEFAULT_SETTINGS, setScenarioName } from '../js/appState.js';
import { engine } from '../js/random/streams.js';
import { normalizeSeed } from '../js/rng.js';
import {
  builtPopulation,
  populationCaps,
  setTier,
  COMPUTE_TIERS,
} from '../js/quality.js';
import { SCENARIO_INFO } from '../js/data/scenarioInfo.js';
import { INVESTIGATIONS } from '../js/data/investigations.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'docs/tier-invariance.md');
const CATALOGUE_SEED = 'tier-table';

const KINDS = [
  ['bh_list', 'BH'],
  ['stars', 'star'],
  ['planets', 'planet'],
  ['gas_giants', 'giant'],
  ['asteroids', 'asteroid'],
  ['comets', 'comet'],
  ['neutron_stars', 'NS'],
  ['white_dwarfs', 'WD'],
  ['galaxies', 'galaxy'],
];

// -----------------------------------------------------------------------------
// Which student-readable numbers depend on a capped count, by scenario id.
// Written by hand; see the header. Keys are only needed for scenes that differ.
// -----------------------------------------------------------------------------
//
// COMMON holds for every scene whose counts differ; READABLE adds what is
// particular to one scenario, chiefly its gallery card (the summary in
// js/i18n/en.js, scenario.<id>.summary), which is the only place a built-in
// scenario states a count.
const COMMON = [
  'the canvas line "Reduced population on this device: n of N bodies" (crowdNotes in js/bodyDrawSky.js), which states the cut',
  'the canvas summary read to a screen reader, "{total} bodies: ..." (js/canvasSummary.js), and the shared-link announcement "{n} objects" (js/share.js), which count the world as built',
  'the conservation lines (energy and angular-momentum drift, summed over every massive body) and the whole-system barycenter, which describe a different system',
  "any body's inspector values where the Uncut kinds column says *orbit* or *mass*: those bodies start from a different draw of the seeded stream",
];
const NO_COUNT = 'Its card states no count.';
const READABLE = {
  'alien-dyson-swarm-collapse': NO_COUNT,
  'black-hole-billiards': NO_COUNT,
  'exoplanet-lab':
    'Its card says "120+ exoplanets"; the low tier builds 12 planets and 4 gas giants.',
  'galactic-center':
    'Its card gives the black hole as 4000 solar masses, which the tier does not change (the hole is uncut and keeps its mass); it states no count.',
  'galactic-collision':
    'Its card says "hundreds of stars" (300 planets and 30 gas giants stand for them); the low tier builds 12 and 4. The two black holes keep their stated masses.',
  'hungry-hungry-holes':
    'Its card says "Four black holes": all four are built at both tiers with the same masses; their starting places differ between the tiers.',
  'intermediate-mass-bh':
    'Its card gives 400 solar masses for the hole, which the tier does not change; it states no count.',
  'kessler-cascade':
    'Its card says "Hundreds of micro-stars"; the low tier builds 60 (num_micro_stars 300 capped to 60).',
  'kuiper-belt':
    'Its card names Pluto, Eris, Haumea, Makemake, Quaoar, Sedna, Orcus, Varuna, Ixion, Huya and 2002 AW197: all are kept (the eight dwarf planets are planets, uncut; the twelve named small bodies are the first twelve of the forty asteroids the low tier keeps), and their distance and speed from the Sun agree to 3e-5, only their starting phase differs. The 288 unnamed belt objects cut carry no number the card or an instrument quotes.',
  'micro-bh-swarm':
    'Its card gives the holes as 0.6 to 1.8 solar masses, which the tier does not change (the twelve holes are uncut; their orbits differ).',
  'quasar-cannon': NO_COUNT,
  'sagittarius-a':
    'Its card gives 4000 solar masses for the hole, which the tier does not change; it states no count.',
  slingshot:
    'Its card gives the holes as 60 and 3 solar masses, which the tier does not change; it states no count.',
  'slingshot-gauntlet': NO_COUNT,
  'star-cluster': NO_COUNT,
  'star-frisbee': NO_COUNT,
  'stellar-graveyard':
    'Its card counts "3 black holes, 5 neutron stars, and 8 white dwarfs", all uncut, so it holds; the 200 asteroids of its "extensive debris fields" become 40.',
  'stellar-nursery': NO_COUNT,
  'supermassive-bh':
    'Its card says "50 planets, 5 gas giants, and 100 asteroids"; the low tier builds 12, 4 and 40. This is the one card whose stated numbers the low tier contradicts outright.',
  'supernova-remnant': NO_COUNT,
  'the-pinwheel-galaxy-core': NO_COUNT,
  'tidal-arm-tango': NO_COUNT,
  'triple-bh-system':
    'Its card gives the holes as 20, 15 and 10 solar masses, which the tier does not change (the holes keep their masses; only their phase differs).',
  'white-dwarf-binary':
    'Its card states no count; the two white dwarfs keep their masses and orbit (only their phase differs).',
};

const noop = () => {};

/** Build one world; its counts and a digest of every body, by kind. */
function build(id, tier, seed, overrides) {
  setTier(tier);
  resetPresetMemory();
  const settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  settings.preset_scenario = id;
  settings.quality_tier = tier;
  const state = { zoom: 1, pan: { x: 0, y: 0 }, paused: true, frame_count: 0 };
  physics.setStateReference(state);
  let tick = 0;
  const now = Date.now;
  const perf = performance.now;
  Date.now = () => 1.7e12 + tick++;
  performance.now = () => 5000 + tick++;
  const warn = console.warn;
  console.warn = noop;
  try {
    engine(normalizeSeed(seed), () =>
      buildWorld({
        settings,
        state,
        applyPreset: () => applyPreset(settings, DEFAULT_SETTINGS, state),
        takePendingSettings: () => (overrides ? { ...overrides } : null),
        setScenarioName,
        hideObjectInspector: noop,
        showScenarioInfo: noop,
        updateObjectTypeButton: noop,
        computeAreaSweep: noop,
        isAreaSweepSuppressed: () => true,
        regenerateStarfield: noop,
      })
    );
  } finally {
    Date.now = now;
    performance.now = perf;
    console.warn = warn;
  }
  // Positions and velocities are taken from the heaviest body in the world, so
  // an orbit that is the same about its primary reads the same even when the
  // builder recentres the world on a barycentre the cut bodies shifted.
  const all = KINDS.flatMap(([l]) => physics[l]);
  const primary = all.reduce((m, b) => (!m || b.mass > m.mass ? b : m), null);
  // The primary itself is measured from the origin, against the size of the
  // world (the farthest body from it), so a recentring shows at its true size.
  const size = Math.max(
    1e-300,
    ...all.map(b =>
      Math.hypot(b.pos.x - primary.pos.x, b.pos.y - primary.pos.y)
    )
  );
  const counts = {};
  const bodies = {};
  for (const [list] of KINDS) {
    counts[list] = physics[list].length;
    bodies[list] = physics[list].map(b => {
      const ref =
        b === primary ? { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 } } : primary;
      return {
        x: b.pos.x - ref.pos.x,
        y: b.pos.y - ref.pos.y,
        vx: b.vel.x - ref.vel.x,
        vy: b.vel.y - ref.vel.y,
        mass: b.mass,
        name: b.name ?? '',
        size: b === primary ? size : 0,
      };
    });
  }
  return { counts, bodies, note: builtPopulation() };
}

/** Both tiers of one scene, compared. */
function compare(id, seed, overrides) {
  const full = build(id, 'full', seed, overrides);
  const low = build(id, 'low', seed, overrides);
  setTier('full');
  const differs = KINDS.some(([l]) => full.counts[l] !== low.counts[l]);
  // The kinds the cap did not cut: are their bodies the same bodies, in the
  // same places? A cap draws fewer random numbers, which can change a body that
  // is built or placed after it. Each such kind is labelled by the largest
  // change found in it: its mass; its distance or speed from the primary
  // ("orbit", with the largest fractional change); only where it is on that
  // orbit ("phase"); or only its name.
  const rel = (a, b) =>
    Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-300);
  const r = (x, y) => Math.hypot(x, y);
  const how = (a, b) => {
    if (rel(a.mass, b.mass) > 1e-12) return [3, rel(a.mass, b.mass)];
    const d = a.size
      ? r(a.x - b.x, a.y - b.y) / a.size
      : Math.max(
          rel(r(a.x, a.y), r(b.x, b.y)),
          rel(r(a.vx, a.vy), r(b.vx, b.vy))
        );
    if (d > 1e-9) return [2, d];
    if (a.x !== b.x || a.y !== b.y || a.vx !== b.vx || a.vy !== b.vy)
      return [1, 0];
    return [a.name !== b.name ? 0 : -1, 0];
  };
  const LABEL = ['name', 'phase', 'orbit', 'mass'];
  const moved = [];
  for (const [l, short] of KINDS) {
    if (full.counts[l] !== low.counts[l]) continue;
    let worst = [-1, 0];
    full.bodies[l].forEach((a, i) => {
      const h = how(a, low.bodies[l][i]);
      if (h[0] > worst[0] || (h[0] === worst[0] && h[1] > worst[1])) worst = h;
    });
    if (worst[0] >= 0)
      moved.push(
        `${short} (${LABEL[worst[0]]}${
          worst[0] >= 2 ? ` ${worst[1].toPrecision(1)}` : ''
        })`
      );
  }
  const same = moved.length === 0;
  return { full, low, differs, same, moved };
}

const countText = counts =>
  KINDS.filter(([l]) => counts[l])
    .map(([l, short]) => `${counts[l]} ${short}`)
    .join(', ') || 'none';

const total = counts => KINDS.reduce((n, [l]) => n + counts[l], 0);

/** The kinds whose count changed, as "asteroid 150 to 40". */
const cut = r =>
  KINDS.filter(([l]) => r.full.counts[l] !== r.low.counts[l])
    .map(([l, short]) => `${short} ${r.full.counts[l]} to ${r.low.counts[l]}`)
    .join('; ');

// -----------------------------------------------------------------------------
// The lessons' scenes
// -----------------------------------------------------------------------------

/** Every setup ({scenario, seed?, settings?}) a lesson states, anywhere in it. */
function lessonSetups() {
  const out = new Map();
  const walk = (v, lesson, seen) => {
    if (!v || typeof v !== 'object' || seen.has(v)) return;
    seen.add(v);
    if (typeof v.scenario === 'string' && scenarioId(v.scenario)) {
      const seed = v.seed ?? v.scenario;
      const settings = v.settings ? { ...v.settings } : null;
      const key = JSON.stringify([scenarioId(v.scenario), seed, settings]);
      if (!out.has(key))
        out.set(key, {
          id: scenarioId(v.scenario),
          name: v.scenario,
          seed,
          settings,
          lessons: new Set(),
        });
      out.get(key).lessons.add(lesson);
    }
    for (const x of Object.values(v)) walk(x, lesson, seen);
  };
  for (const inv of INVESTIGATIONS) walk(inv, inv.id, new Set());
  return [...out.values()];
}

function render() {
  const caps = (() => {
    setTier('low');
    const c = populationCaps();
    setTier('full');
    return c;
  })();
  const setups = lessonSetups();
  const byScenario = new Map();
  for (const s of setups) {
    if (!byScenario.has(s.id)) byScenario.set(s.id, []);
    byScenario.get(s.id).push(s);
  }
  const lessonRows = [];
  const missing = [];
  for (const [id, list] of [...byScenario].sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    for (const s of list) {
      const r = compare(id, s.seed, s.settings);
      if (r.differs && !READABLE[id]) missing.push(id);
      lessonRows.push({ id, s, r });
    }
  }
  const catRows = [];
  for (const id of SCENARIO_IDS) {
    const r = compare(id, CATALOGUE_SEED, null);
    if (r.differs && !READABLE[id]) missing.push(id);
    catRows.push({ id, r, gallery: Object.hasOwn(SCENARIO_INFO, id) });
  }

  const lines = [];
  const p = s => lines.push(s);
  p('# Body counts at the full and low quality tiers');
  p('');
  p(
    '<!-- Generated by tools/tier-table.mjs; do not edit. `node tools/tier-table.mjs --check` fails when this is stale. -->'
  );
  p('');
  p(
    'The low quality tier caps the generic populations a scenario asks for (`populationCaps` in `js/quality.js`): ' +
      Object.entries(caps)
        .map(([k, v]) => `${k} ${v}`)
        .join(', ') +
      ". The cap is skipped when a scenario's placement is `Empty` (every body placed by hand): the Solar System, every resonance system, TRAPPIST-1 and the galaxy discs are spared by that test, not by a list."
  );
  p('');
  p(
    'Each scene below is built in Node at both tiers from the same seed. "Uncut kinds" says whether the bodies of every kind the cap did not cut are identical at both tiers (position, velocity, mass and name, slot by slot). If not, it names each kind that changed and the largest change in it: *mass* (with the largest fractional change); *orbit* (its distance or speed from the heaviest body changed, with the largest fractional change; the heaviest body itself is measured by how far it moved, as a fraction of the distance to the farthest body); *phase* (same distance and speed, another point on the orbit; for the heaviest body, a shift below a billionth of that distance); or *name* only. A cap draws fewer random numbers, so bodies generated or placed after a capped population are drawn from a different point in the seeded stream. A lesson scene is built as its setup states it (scenario, seed, settings), the way `payloadFromSetup` in `js/investigations.js` hands it to the builder.'
  );
  p('');
  const lessonCount = new Set(lessonRows.map(x => x.id)).size;
  const lessonDiff = lessonRows.filter(x => x.r.differs);
  const catDiff = catRows.filter(x => x.r.differs);
  p('## Summary');
  p('');
  p(
    `- Lesson scenes: ${lessonRows.length} setups over ${lessonCount} scenarios in ${INVESTIGATIONS.length} lessons; ${lessonDiff.length} differ between tiers` +
      (lessonDiff.length
        ? ` (${[...new Set(lessonDiff.map(x => x.id))].join(', ')}).`
        : '.')
  );
  p(
    `- Built-in scenarios: ${catRows.length}; ${catDiff.length} differ between tiers.`
  );
  p(
    `- Scenes where a kind the cap did not cut still changed: ${
      [
        ...new Set(
          [...lessonRows, ...catRows].filter(x => !x.r.same).map(x => x.id)
        ),
      ].join(', ') || 'none'
    }.`
  );
  p('');
  p('## Lesson scenes');
  p('');
  p(
    '| Scenario | Lessons | Seed | Settings | Full tier | Low tier | Differs | Uncut kinds |'
  );
  p('|---|---|---|---|---|---|---|---|');
  for (const { id, s, r } of lessonRows) {
    p(
      `| ${id} | ${[...s.lessons].sort().join(', ')} | ${s.seed} | ${
        s.settings
          ? Object.entries(s.settings)
              .map(([k, v]) => `${k}=${v}`)
              .join(', ')
          : '-'
      } | ${countText(r.full.counts)} (${total(r.full.counts)}) | ${countText(
        r.low.counts
      )} (${total(r.low.counts)}) | ${r.differs ? `yes: ${cut(r)}` : 'no'} | ${
        r.same ? 'identical' : `changed: ${r.moved.join(', ')}`
      } |`
    );
  }
  p('');
  p('## Built-in scenarios');
  p('');
  p(
    `Seed \`${CATALOGUE_SEED}\`, no settings beyond the scenario's own. "Gallery" marks the scenarios the sandbox gallery lists (\`SCENARIO_INFO\`).`
  );
  p('');
  p(
    '| Scenario | Gallery | Lessons | Full tier | Low tier | Differs | Uncut kinds |'
  );
  p('|---|---|---|---|---|---|---|');
  for (const { id, r, gallery } of catRows) {
    const used = byScenario.get(id);
    p(
      `| ${id} | ${gallery ? 'yes' : 'no'} | ${
        used
          ? [...new Set(used.flatMap(s => [...s.lessons]))].sort().join(', ')
          : '-'
      } | ${countText(r.full.counts)} (${total(r.full.counts)}) | ${countText(
        r.low.counts
      )} (${total(r.low.counts)}) | ${r.differs ? `yes: ${cut(r)}` : 'no'} | ${
        r.same ? 'identical' : `changed: ${r.moved.join(', ')}`
      } |`
    );
  }
  p('');
  p('## What a student can read that depends on a capped count');
  p('');
  const differing = [
    ...new Set([...lessonDiff, ...catDiff].map(x => x.id)),
  ].sort();
  if (!differing.length) p('No scene differs.');
  else {
    p('For every scene below, at the low tier a student reads a different:');
    p('');
    for (const c of COMMON) p(`- ${c};`);
    p('');
    p(
      'and, scene by scene, what its own card or instruments say. No lesson, activity, course pack or Experiment Bench experiment loads any of these scenarios (see the lesson table above; the activities, teaching routes, course packs and js/experiments name only scenarios in it).'
    );
    p('');
  }
  for (const id of differing)
    p(`- **${id}**: ${READABLE[id] ?? 'NOT YET READ'}`);
  p('');
  p('## Computation sizes by tier');
  p('');
  p(
    '`COMPUTE_TIERS` in `js/quality.js` (held equal to `tools/perf-thresholds.json`):'
  );
  p('');
  p('| Key | Full | Low |');
  p('|---|---|---|');
  for (const k of Object.keys(COMPUTE_TIERS.full))
    p(`| ${k} | ${COMPUTE_TIERS.full[k]} | ${COMPUTE_TIERS.low[k]} |`);
  p('');
  return { text: lines.join('\n'), missing: [...new Set(missing)] };
}

const { text, missing } = render();
if (process.argv.includes('--check')) {
  let committed = '';
  try {
    committed = readFileSync(OUT, 'utf8');
  } catch {
    // reported below
  }
  const problems = [];
  if (committed !== text)
    problems.push(
      'docs/tier-invariance.md is not what tools/tier-table.mjs writes; run it and commit the result.'
    );
  if (missing.length)
    problems.push(
      `Scenes differ between tiers with no READABLE entry: ${missing.join(', ')}.`
    );
  if (problems.length) {
    for (const m of problems) console.error(m);
    process.exit(1);
  }
  console.log('tier table: current');
} else {
  writeFileSync(OUT, text);
  console.log(`wrote ${OUT}`);
  if (missing.length)
    console.warn(`no READABLE entry for: ${missing.join(', ')}`);
}
