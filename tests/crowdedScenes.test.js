// =============================================================================
// What each quality tier builds, and what the scene says about it
// -----------------------------------------------------------------------------
// The quality tier changes the world that is BUILT for generated populations
// (populationCaps, js/quality.js) and nothing in the integrator. This builds
// the two crowded scenes at the low, full and ultra tiers from one seed and
// records the body counts, then every scenario at low and full to hold the
// readout's "n of N" to the number of bodies the full build actually makes.
// The browser half (200 steps drawn at two tiers leave the same bodies in the
// same places) is e2e/crowdedScene.spec.js.
// =============================================================================

import { beforeAll, describe, expect, test } from '@jest/globals';

let world;
let physics;
let state;
let info;
let quality;

beforeAll(async () => {
  // world.js pulls in the renderer, which wants its canvases at import time.
  const find = globalThis.document.getElementById.bind(globalThis.document);
  globalThis.document.getElementById = id => {
    let el = find(id);
    if (!el) {
      el = globalThis.document.createElement(
        /canvas/i.test(id) ? 'canvas' : 'div'
      );
      el.id = id;
      globalThis.document.body.appendChild(el);
    }
    return el;
  };
  const ctx = new Proxy(
    {},
    {
      get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })),
      set: (t, k, v) => ((t[k] = v), true),
    }
  );
  globalThis.HTMLCanvasElement.prototype.getContext = () => ctx;
  world = await import('../js/world.js');
  physics = await import('../js/physics.js');
  state = await import('../js/appState.js');
  info = await import('../js/data/scenarioInfo.js');
  quality = await import('../js/quality.js');
  await import('../js/bodyEffects.js');
});

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
];

const alive = () =>
  LISTS.flatMap(x => physics[x] || []).filter(b => b && b.alive !== false);

/** Build one scenario at a tier from a fixed seed: its counts and its note. */
const build = (key, tier, seed = 'crowded-scene') => {
  quality.setTier(tier);
  state.SETTINGS.quality_tier = tier;
  state.SETTINGS.preset_scenario = key;
  world.initialize_simulation({ seed });
  const counts = Object.fromEntries(LISTS.map(l => [l, physics[l].length]));
  return {
    total: alive().length,
    counts,
    note: quality.builtPopulation(),
  };
};

describe('the two crowded scenes at each tier', () => {
  const table = {};
  beforeAll(() => {
    for (const key of ['star-cluster', 'kuiper-belt'])
      for (const tier of ['low', 'full', 'ultra'])
        (table[key] ??= {})[tier] = build(key, tier);
    quality.setTier('full');
  });

  test('full and ultra build the same world, and say nothing about it', () => {
    for (const key of Object.keys(table)) {
      expect(table[key].ultra.counts).toEqual(table[key].full.counts);
      expect(table[key].full.note).toBeNull();
      expect(table[key].ultra.note).toBeNull();
    }
  });

  test('the cluster builds 255 bodies at full and fewer at low', () => {
    expect(table['star-cluster'].full.total).toBe(255);
    expect(table['star-cluster'].low.total).toBeLessThan(255);
    // Eighty planets (the stars of the cluster) to twelve, fifteen giants to
    // four, 150 asteroids to forty; the two neutron stars and eight white
    // dwarfs are not generic populations and stay.
    expect(table['star-cluster'].low.counts).toMatchObject({
      planets: 12,
      gas_giants: 4,
      asteroids: 40,
      neutron_stars: 2,
      white_dwarfs: 8,
    });
  });

  test('the belt is the same at every tier except its asteroids', () => {
    const { low, full } = table['kuiper-belt'];
    expect(full.total).toBe(309);
    expect(low.counts.planets).toBe(full.counts.planets);
    expect(low.counts.asteroids).toBeLessThan(full.counts.asteroids);
  });

  test('the note says n of N, and N is what the full tier builds', () => {
    for (const key of Object.keys(table)) {
      const { low, full } = table[key];
      expect(low.note).toEqual({ built: low.total, wanted: full.total });
    }
  });
});

describe('every scenario', () => {
  const keys = () => Object.keys(info.scenarioInfo ?? info.SCENARIO_INFO ?? {});
  const rows = [];

  beforeAll(() => {
    const names = keys();
    for (const key of names) {
      const full = build(key, 'full', 'sweep');
      const low = build(key, 'low', 'sweep');
      rows.push({ key, full, low });
    }
    quality.setTier('full');
  });

  test('a note appears exactly where the low tier built fewer bodies, and n of N is exact', () => {
    expect(rows.length).toBeGreaterThan(50);
    const bad = [];
    for (const { key, full, low } of rows) {
      const fewer = low.total < full.total;
      if (fewer !== (low.note !== null)) bad.push(`${key}: note/fewer differ`);
      else if (
        low.note &&
        (low.note.built !== low.total || low.note.wanted !== full.total)
      )
        bad.push(
          `${key}: note ${low.note.built} of ${low.note.wanted}, built ${low.total} of ${full.total}`
        );
      if (full.note !== null) bad.push(`${key}: a note at the full tier`);
    }
    expect(bad).toEqual([]);
  });

  test('the number of scenarios the low tier builds smaller is recorded', () => {
    const smaller = rows.filter(r => r.low.total < r.full.total);
    // Planning probes measured 24 of 61.
    expect([smaller.length, rows.length]).toEqual([24, 61]);
  });
});
