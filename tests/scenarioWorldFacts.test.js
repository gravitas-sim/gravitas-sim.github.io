import { describe, test, expect, beforeAll } from '@jest/globals';

// =============================================================================
// Two facts about the worlds the scenario catalog builds (Prompt 292)
// -----------------------------------------------------------------------------
// e2e/robustness.spec.js used to prove these in a browser, one page.evaluate
// per scenario. Neither is about the browser: both read the bodies that
// initialize_simulation leaves in js/physics.js after it builds a scenario from
// a fixed seed, and that is the same function and the same arithmetic in Node.
// So the sweep lives here, at a few seconds instead of about half a minute of a
// shard (docs/DUPLICATE_COVERAGE.md, D-R10-292-03). The browser file keeps what
// is about a browser: the sweep that steps every scenario in a page, the
// Worker that fails, the camera and the clock.
//
//   1. No scenario places two bodies at exactly the same point. The contact
//      test in js/physics.js skips a pair whose separation is zero, so nothing
//      ever pushes them apart: they stay superimposed and draw as one body.
//      Multi-Ring collapsed its inner rings onto one circle and Grid centered
//      itself on the body pinned at the origin; four scenarios carried twenty
//      superimposed pairs each.
//   2. A scenario that promises a population builds one. Kessler Cascade's card
//      promised hundreds of micro-stars and built one black hole in an empty
//      sky; Slingshot Gauntlet promised a fast star and placed every body at
//      rest.
// =============================================================================

let world;
let physics;
let state;
let info;

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

/** The bodies in the world, alive, as the page's sweep read them. */
const alive = lists =>
  lists.flatMap(x => physics[x] || []).filter(b => b && b.alive !== false);

/** Build one scenario from a fixed seed, as the page does. */
const build = (key, seed) => {
  state.SETTINGS.preset_scenario = key;
  world.initialize_simulation({ seed });
};

/** Exact equality, not proximity: a crowded scenario may start with bodies touching. */
function coincident(bodies) {
  const seen = new Map();
  const dups = [];
  for (const b of bodies) {
    const at = `${b.pos.x},${b.pos.y}`;
    if (seen.has(at)) dups.push(`${seen.get(at)} == ${b.name}`);
    else seen.set(at, b.name);
  }
  return dups;
}

describe('the placement check itself', () => {
  test('finds two bodies at one point, and not two at neighbouring points', () => {
    const at = (name, x, y) => ({ name, pos: { x, y } });
    expect(coincident([at('a', 1, 2), at('b', 1, 2.0000001)])).toEqual([]);
    expect(coincident([at('a', 1, 2), at('b', 3, 4), at('c', 1, 2)])).toEqual([
      'a == c',
    ]);
  });
});

describe('every scenario in the catalog', () => {
  test('places no two bodies at exactly the same point', () => {
    const keys = Object.keys(info.SCENARIO_INFO);
    // The catalog is large; a sweep over a handful would prove nothing.
    expect(keys.length).toBeGreaterThan(30);
    const offenders = [];
    let examined = 0;
    for (const key of keys) {
      build(key, 'coincident-sweep');
      const bodies = alive(LISTS);
      examined += bodies.length;
      const found = coincident(bodies).slice(0, 3);
      if (found.length) offenders.push(`${key}: ${found.join('; ')}`);
    }
    expect(examined).toBeGreaterThan(keys.length);
    expect(offenders).toEqual([]);
  });

  test('a scenario that promises a population builds one', () => {
    const read = key => {
      build(key, 'promise-check');
      const bodies = alive([
        'bh_list',
        'stars',
        'planets',
        'gas_giants',
        'asteroids',
      ]);
      const movers = bodies.filter(b => !physics.bh_list.includes(b));
      return {
        bodies: bodies.length,
        fastest: Math.max(0, ...movers.map(b => Math.hypot(b.vel.x, b.vel.y))),
      };
    };
    const kessler = read('kessler-cascade');
    const slingshot = read('slingshot-gauntlet');
    // Hundreds, as advertised - not one black hole.
    expect(kessler.bodies).toBeGreaterThan(200);
    expect(kessler.fastest).toBeGreaterThan(0);
    // Something is actually fired.
    expect(slingshot.fastest).toBeGreaterThan(1);
  });
});
