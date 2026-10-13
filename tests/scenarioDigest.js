// =============================================================================
// Digest of a built world, for tests/scenarioGeometry.test.js
// -----------------------------------------------------------------------------
// Builds a scenario under a seed through the real world builder and reduces
// every body to its own data: each own property, nested values included, with
// numbers kept to 12 significant figures (the world golden's precision). A
// field added to a body later is therefore compared without anyone listing it,
// which is what a list of named fields could not promise (slice 1's review
// found two flags the list had never named).
//
// The same file made tests/fixtures/scenarioGeometryGolden.json from the code
// that placed the bodies by hand, before that code was deleted.
// =============================================================================

import * as physics from '../js/physics.js';
import { applyPreset } from '../js/scenarios.js';
import { buildWorld } from '../js/world/build.js';
import { DEFAULT_SETTINGS, setScenarioName } from '../js/appState.js';
import { withSeed } from '../js/rng.js';

export const LISTS = [
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

const noop = () => {};
const clone = o => JSON.parse(JSON.stringify(o));

/** A number to 12 significant figures; anything else as a string. */
export const num = v =>
  typeof v === 'number' && Number.isFinite(v)
    ? Number(v.toPrecision(12))
    : String(v);

/** A short, stable hash of a string. */
export const fnv = str => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
};

/** Every own data property of a value, in a form that compares and prints. */
function canon(v, depth, seen) {
  if (typeof v === 'number') return num(v);
  if (typeof v === 'function') return undefined;
  if (v === null || typeof v !== 'object')
    return v === undefined ? 'undefined' : v;
  if (seen.has(v)) return '[cycle]';
  if (depth > 5) return '[deep]';
  seen.add(v);
  let out;
  if (Array.isArray(v)) out = v.map(x => canon(x, depth + 1, seen) ?? null);
  else {
    out = {};
    for (const k of Object.keys(v).sort()) {
      const c = canon(v[k], depth + 1, seen);
      if (c !== undefined) out[k] = c;
    }
  }
  seen.delete(v);
  return out;
}

/** One body: its list, its place in it, its class and all of its own data. */
export function bodyRecord(list, i, b) {
  return `${list}|${i}|${b.kind}|${JSON.stringify(canon(b, 0, new Set()))}`;
}

/**
 * Build a scenario under a seed and digest it.
 * @param {string} key - A scenario's public id
 * @param {number} seed
 * @param {?object} [pending] - Settings a share link carries, laid over the
 *   scenario's own after its preset runs
 * @returns {{rows: string[], settings: string, zoom: *, pan: *[], tail: number}}
 */
export function digest(key, seed, pending = null) {
  const settings = clone(DEFAULT_SETTINGS);
  settings.preset_scenario = key;
  const state = { zoom: 1, pan: { x: 0, y: 0 }, paused: true, frame_count: 0 };
  let tail;
  withSeed(seed, () => {
    buildWorld({
      settings,
      state,
      applyPreset: () => applyPreset(settings, DEFAULT_SETTINGS, state),
      takePendingSettings: () => pending,
      setScenarioName,
      hideObjectInspector: noop,
      showScenarioInfo: noop,
      updateObjectTypeButton: noop,
      computeAreaSweep: noop,
      isAreaSweepSuppressed: () => true,
      regenerateStarfield: noop,
    });
    tail = Math.random();
  });
  const rows = [];
  for (const l of LISTS)
    physics[l].forEach((b, i) => rows.push(bodyRecord(l, i, b)));
  const sset = Object.keys(settings)
    .filter(k => k !== 'quality_tier')
    .sort()
    .map(k => `${k}=${JSON.stringify(settings[k])}`)
    .join('\n');
  return {
    rows,
    settings: fnv(sset),
    zoom: num(state.zoom),
    pan: [num(state.pan.x), num(state.pan.y)],
    tail,
  };
}
