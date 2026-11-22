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
  "a kept body's speed in its inspector, by the shift the Kept bodies column gives (its place, mass and name are the full tier's)",
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
    'Its card says "Four black holes": all four are built at both tiers, in the same places with the same masses.',
  'intermediate-mass-bh':
    'Its card gives 400 solar masses for the hole, which the tier does not change; it states no count.',
  'kessler-cascade':
    'Its card says "Hundreds of micro-stars"; the low tier builds 60 (num_micro_stars 300 capped to 60).',
  'kuiper-belt':
    'Its card names Pluto, Eris, Haumea, Makemake, Quaoar, Sedna, Orcus, Varuna, Ixion, Huya and 2002 AW197: all are kept (the eight dwarf planets are planets, uncut; the twelve named small bodies are the first twelve of the forty asteroids the low tier keeps), in the same places at both tiers. The 288 unnamed belt objects cut carry no number the card or an instrument quotes.',
  'micro-bh-swarm':
    'Its card gives the holes as 0.6 to 1.8 solar masses, which the tier does not change (the twelve holes are uncut).',
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
    'Its card gives the holes as 20, 15 and 10 solar masses, which the tier does not change.',
  'white-dwarf-binary':
    'Its card states no count; the two white dwarfs are uncut.',
};

const noop = () => {};

/** Build one world; its counts and a digest of every body, by kind. */
function build(id, tier, seed, overrides, frames = 0) {
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
    engine(normalizeSeed(seed), () => {
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
      });
      // The page does this after every build (js/world.js): without it the
      // step keeps its cached body lists from the last world of the same shape.
      physics.bumpWorldGeneration();
      // A fixed step, so a run is the same calculation whatever the machine.
      for (let f = 0; f < frames; f++) physics.updatePhysics(0.01);
    });
  } finally {
    Date.now = now;
    performance.now = perf;
    console.warn = warn;
  }
  const counts = {};
  const bodies = new Map();
  for (const [list, short] of KINDS) {
    counts[list] = physics[list].length;
    for (const b of physics[list])
      bodies.set(b.id, {
        kind: short,
        x: b.pos.x,
        y: b.pos.y,
        vx: b.vel.x,
        vy: b.vel.y,
        mass: b.mass,
        name: b.name ?? '',
      });
  }
  return { counts, bodies, note: builtPopulation() };
}

const pct = f =>
  100 * f < 0.001 ? 'under 0.001%' : `${(100 * f).toPrecision(2)}%`;

/**
 * Both tiers of one scene, compared body by body. The builder makes the whole
 * population at both tiers and drops what is past a cap last, so every body the
 * low tier keeps should be the full tier's body of the same id, in the same
 * place with the same mass and name. Its velocity may differ by one shift
 * common to every body: the builder sets the world's total momentum to zero
 * after the cut, and the cut bodies carried some of it.
 */
function compare(id, seed, overrides) {
  const full = build(id, 'full', seed, overrides);
  const low = build(id, 'low', seed, overrides);
  setTier('full');
  const differs = KINDS.some(([l]) => full.counts[l] !== low.counts[l]);
  const moved = [];
  const dv = [];
  for (const [bid, b] of low.bodies) {
    const a = full.bodies.get(bid);
    if (
      !a ||
      a.kind !== b.kind ||
      a.x !== b.x ||
      a.y !== b.y ||
      a.mass !== b.mass ||
      a.name !== b.name
    )
      moved.push(bid);
    else dv.push([a.vx - b.vx, a.vy - b.vy, Math.hypot(a.vx, a.vy)]);
  }
  const mean = i => dv.reduce((n, d) => n + d[i], 0) / (dv.length || 1);
  const shift = [mean(0), mean(1)];
  const speeds = dv.map(d => d[2]).sort((x, y) => x - y);
  const median = speeds[Math.floor(speeds.length / 2)] || 0;
  // One shift for all: no body's difference strays from the mean by more than
  // rounding (1e-9 of the median speed).
  const common = dv.every(
    d =>
      Math.hypot(d[0] - shift[0], d[1] - shift[1]) <=
      1e-9 * Math.max(median, 1e-300)
  );
  const size = Math.hypot(...shift);
  const same = moved.length === 0 && common;
  const kept = !same
    ? `changed: ${moved.length} bodies moved${common ? '' : ', velocities differ unevenly'}`
    : size === 0
      ? 'identical'
      : `same places and masses; every velocity shifted by ${size.toPrecision(2)} (${pct(size / median)} of the median speed)`;
  return { full, low, differs, same, kept, shift: size, median };
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
    "Each scene below is built in Node at both tiers from the same seed. The builder makes the whole population at both tiers and drops what is past a cap last (`js/world/build.js`), so the low tier keeps the full tier's own bodies. \"Kept bodies\" compares every body the low tier keeps with the full tier's body of the same id: *identical* (position, velocity, mass and name); *same places and masses* with every velocity shifted by one common amount, given with its size as a share of the median speed (the builder sets the world's total momentum to zero after the cut, and the cut bodies carried some of it); or *changed*, which the check refuses. A lesson scene is built as its setup states it (scenario, seed, settings), the way `payloadFromSetup` in `js/investigations.js` hands it to the builder."
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
    `- Scenes where a kept body changed: ${
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
    '| Scenario | Lessons | Seed | Settings | Full tier | Low tier | Differs | Kept bodies |'
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
        r.kept
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
    '| Scenario | Gallery | Lessons | Full tier | Low tier | Differs | Kept bodies |'
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
        r.kept
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
  const changed = [
    ...new Set(
      [...lessonRows, ...catRows].filter(x => !x.r.same).map(x => x.id)
    ),
  ];
  return {
    text: lines.join('\n'),
    missing: [...new Set(missing)],
    changed,
    lessonRows,
    catRows,
  };
}

export { render, compare, build, OUT };

const main =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const { text, missing, changed } = main ? render() : {};
if (!main) {
  // imported (tests/tierInvariance.test.js)
} else if (process.argv.includes('--check')) {
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
  if (changed.length)
    problems.push(
      `A body the low tier keeps is not the full tier's: ${changed.join(', ')}.`
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
