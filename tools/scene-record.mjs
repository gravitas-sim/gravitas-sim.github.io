#!/usr/bin/env node
// =============================================================================
// The scene record: one sandbox view, pinned so that it can be photographed
// again after a change
// -----------------------------------------------------------------------------
// `gravitas.scene-record/1` names everything that decides what the sandbox
// canvas shows at one moment, so a before-and-after pair differs only in what
// the change did. tools/scene-capture.mjs loads a record in a browser and
// captures it at its exact simulated time; tools/perf-probe.mjs --scene runs
// the same state for frame time.
//
//   node tools/scene-record.mjs --check                       validate every committed record
//   node tools/scene-record.mjs --from-sidecars <file> --out <dir>
//        convert a planning capture's sidecars.json (outside any checkout) into
//        records; only the sandbox captures convert, and no image is copied
//
// What a record holds, and why:
//   scenario, load, seed       the world: how it was built (preset_scenario then
//                              initialize_simulation({seed}), the call the e2e
//                              fixtures use) and from which stream
//   clock                      the physics clock to stop at (engine/state.js
//                              simulationTime), and the fixed frame step the
//                              capture drives the loop with (setFixedStep)
//   camera                     zoom, pan (screen pixels), frameOffset, and the
//                              world point at the canvas centre, derived with
//                              the same arithmetic as screenToWorld (js/utils.js)
//   theme, viewport, pixelRatio, qualityTier   the page around the canvas
//   settings                   the view's show_* switches, trail length, style
//                              and colour mode, follow mode: applied after the build
//   physics                    sim_speed, max_timestep and the integrator as the
//                              scenario sets them: observed, asserted, not applied
//   paused, cardOpen           whether the clock is stopped and the scenario
//                              card is up
//   commit                     the tree the record was made on
// =============================================================================

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, basename } from 'node:path';

export const SCHEMA = 'gravitas.scene-record/1';
export const RECORDS_DIR = 'tests/fixtures/scene-records';
export const FIXED_FRAME_SECONDS = 1 / 60;
/** The clock must equal the target to this many simulation time units. */
export const CLOCK_TOLERANCE = 1e-9;

/** The view settings a record applies after the build (SETTINGS keys). */
export const VIEW_KEYS = [
  'follow_mode',
  'show_trails',
  'trail_length',
  'trail_style',
  'trail_color_mode',
  'show_velocity_vectors',
  'show_acceleration_vectors',
  'show_potential_well',
  'show_scale_bar',
  'show_elapsed_time',
  'show_conservation_diagnostics',
  'show_bh_glow',
  'show_accretion_disk',
  'show_bh_jets',
  'show_dynamic_overlays',
  'show_ambient_lighting',
  'show_gravitational_waves',
  'show_object_lensing',
];
export const PHYSICS_KEYS = ['integrator', 'sim_speed', 'max_timestep'];
const THEMES = ['midnight', 'daylight'];
const TIERS = ['low', 'full', 'ultra'];

/**
 * The world point at the middle of the canvas, as screenToWorld
 * (js/utils.js) gives it for the canvas centre: the pan is in screen pixels and
 * the frame offset is added back.
 */
export function worldCentre(camera) {
  const off = camera.frameOffset ?? { x: 0, y: 0 };
  return {
    x: -camera.pan.x / camera.zoom + off.x,
    y: camera.pan.y / camera.zoom + off.y,
  };
}

const isNum = v => typeof v === 'number' && Number.isFinite(v);

/** Problems with a record, as strings; an empty list means it is a record. */
export function problems(r) {
  const out = [];
  const need = (ok, what) => {
    if (!ok) out.push(what);
  };
  need(r && r.format === SCHEMA, `format is ${SCHEMA}`);
  if (!r || r.format !== SCHEMA) return out;
  need(/^[a-z0-9][a-z0-9-]*$/.test(r.id ?? ''), 'id is a lower-case slug');
  need(typeof r.scenario === 'string' && r.scenario, 'scenario is named');
  need(r.load?.how === 'preset_scenario+initialize_simulation', 'load.how');
  need(typeof r.load?.seed === 'string' || isNum(r.load?.seed), 'load.seed');
  need(isNum(r.load?.seedNumber), 'load.seedNumber');
  need(
    isNum(r.clock?.targetSimTime) && r.clock.targetSimTime > 0,
    'clock.targetSimTime'
  );
  need(
    isNum(r.clock?.fixedFrameSeconds) && r.clock.fixedFrameSeconds > 0,
    'clock.fixedFrameSeconds'
  );
  need(r.clock?.tolerance === CLOCK_TOLERANCE, 'clock.tolerance');
  const c = r.camera;
  need(c && isNum(c.zoom) && c.zoom > 0, 'camera.zoom');
  need(isNum(c?.pan?.x) && isNum(c?.pan?.y), 'camera.pan');
  need(
    isNum(c?.frameOffset?.x) && isNum(c?.frameOffset?.y),
    'camera.frameOffset'
  );
  if (c && isNum(c.zoom) && isNum(c.pan?.x) && isNum(c.frameOffset?.x)) {
    const w = worldCentre(c);
    need(
      Math.abs(w.x - c.worldCentre?.x) <= 1e-9 * (1 + Math.abs(w.x)) &&
        Math.abs(w.y - c.worldCentre?.y) <= 1e-9 * (1 + Math.abs(w.y)),
      'camera.worldCentre is the canvas centre in world coordinates'
    );
  }
  need(typeof c?.followMode === 'string', 'camera.followMode');
  need(c?.frame === 'world', 'camera.frame is world (the only frame /1 pins)');
  need(THEMES.includes(r.theme), 'theme');
  need(isNum(r.viewport?.width) && isNum(r.viewport?.height), 'viewport');
  need(isNum(r.pixelRatio) && r.pixelRatio > 0, 'pixelRatio');
  need(TIERS.includes(r.qualityTier), 'qualityTier is pinned');
  for (const k of VIEW_KEYS) need(k in (r.settings ?? {}), `settings.${k}`);
  for (const k of PHYSICS_KEYS) need(k in (r.physics ?? {}), `physics.${k}`);
  need(r.paused === true, 'paused');
  need(typeof r.cardOpen === 'boolean', 'cardOpen');
  need(typeof r.commit === 'string' && r.commit, 'commit');
  return out;
}

export function loadRecord(path) {
  const r = JSON.parse(readFileSync(path, 'utf8'));
  const p = problems(r);
  if (p.length) throw new Error(`${path}: ${p.join('; ')}`);
  return r;
}

export function loadAll(dir = RECORDS_DIR) {
  return readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .map(f => ({ file: f, record: loadRecord(join(dir, f)) }));
}

// -----------------------------------------------------------------------------
// Conversion from the planning captures' sidecars
// -----------------------------------------------------------------------------

const SLUG = {
  'a-solar-system': 'solar-system',
  'b-circumbinary': 'circumbinary-planet-lab',
  'c-galilean-zoomed-body': 'galilean-resonance-zoomed',
  'c-galilean': 'galilean-resonance',
  'd-star-cluster': 'star-cluster',
  'e-black-hole-lab': 'black-hole-lab',
};

function viewport(s) {
  const [w, h] = s.viewport.split('x').map(Number);
  return { width: w, height: h };
}

/**
 * One sandbox sidecar as a scene record. `base` is the sidecar of the
 * unzoomed capture the zoomed-body sidecar followed on the same page.
 */
export function fromSidecar(s, base) {
  const zoomed = s.camera !== undefined;
  const ref = zoomed ? base : s;
  const { flags } = ref;
  const settings = {};
  for (const k of VIEW_KEYS) settings[k] = k in flags ? flags[k] : undefined;
  const physics = {};
  for (const k of PHYSICS_KEYS) physics[k] = flags[k];
  const cam = zoomed
    ? { zoom: s.camera.zoom, pan: s.camera.pan }
    : { zoom: s.zoom, pan: s.pan };
  const frameOffset = ref.frameOffset ?? { x: 0, y: 0 };
  const camera = {
    zoom: cam.zoom,
    pan: { x: cam.pan.x, y: cam.pan.y },
    frameOffset: { x: frameOffset.x, y: frameOffset.y },
    followMode: flags.follow_mode,
    frame: 'world',
  };
  camera.worldCentre = worldCentre(camera);
  if (zoomed)
    camera.centredOn = {
      body: s.camera.body.name,
      at: 'the planning capture centred the pan on this body at the simulated time the sidecar names; the record pins that time',
    };
  const name = basename(s.file).replace(/-canvas\.png$/, '');
  const m = /^(.*?)-(daylight-)?(1366|375)$/.exec(name);
  const slug = SLUG[m[1]];
  const theme = (zoomed ? ref.theme : s.theme) ?? 'midnight';
  const target = zoomed ? s.simTimeAtCapture : s.targetSimTime;
  return {
    format: SCHEMA,
    id: `${slug}-${theme}-${m[3]}`,
    scenario: s.scenarioId,
    load: {
      how: 'preset_scenario+initialize_simulation',
      seed: s.seedGiven,
      seedNumber: ref.seed,
    },
    clock: {
      targetSimTime: target,
      tolerance: CLOCK_TOLERANCE,
      fixedFrameSeconds: FIXED_FRAME_SECONDS,
    },
    camera,
    theme,
    viewport: viewport(s),
    pixelRatio: s.deviceScaleFactor,
    qualityTier: ref.tierInForce,
    settings,
    physics,
    paused: ref.paused,
    cardOpen: ref.infoBoxVisible === true,
    animation:
      "reduced motion is emulated so the starfield does not twinkle; the capture drives the frames on a fake clock and seeds the run's random draws from the record, so two captures of a record are the same image",
    commit: ref.commit,
    source: {
      capture: s.file,
      simTimeReached: zoomed ? s.simTimeAtCapture : s.simTime,
      note: zoomed
        ? 'zoom and pan as set after the unzoomed capture; the target is the time that capture reached'
        : 'the planning capture paused up to 11 percent past its target (the step followed the frame rate); this record stops at the target',
    },
  };
}

export function convertSidecars(sidecars) {
  const sandbox = sidecars.filter(
    s => s.scenarioId && !s.file.startsWith('lesson-')
  );
  const baseOf = z =>
    sandbox.find(
      s =>
        !s.camera &&
        s.scenarioId === z.scenarioId &&
        s.viewport === z.viewport &&
        s.file.startsWith('c-galilean-') &&
        !s.file.includes('zoomed')
    );
  return sandbox.map(s => fromSidecar(s, s.camera ? baseOf(s) : s));
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--check')) {
    const all = loadAll();
    console.log(`${all.length} scene records valid`);
    return;
  }
  const i = argv.indexOf('--from-sidecars');
  if (i >= 0) {
    const out = argv[argv.indexOf('--out') + 1] ?? RECORDS_DIR;
    const records = convertSidecars(
      JSON.parse(readFileSync(argv[i + 1], 'utf8'))
    );
    mkdirSync(out, { recursive: true });
    for (const r of records) {
      const p = problems(r);
      if (p.length) throw new Error(`${r.id}: ${p.join('; ')}`);
      writeFileSync(
        join(out, `${r.id}.json`),
        `${JSON.stringify(r, null, 2)}\n`
      );
    }
    console.log(`${records.length} records written to ${out}`);
    return;
  }
  console.error(
    'usage: scene-record.mjs --check | --from-sidecars <file> --out <dir>'
  );
  process.exitCode = 2;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  main();
