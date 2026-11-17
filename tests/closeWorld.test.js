// =============================================================================
// A world seen close: light, terminator and phase
// -----------------------------------------------------------------------------
// The tolerances are tests/fixtures/light-phase-tolerances.json, fixed before
// the drawing (DESIGN_SYSTEM.md, "A world seen close"). Here: the light a body
// is given and how it holds, the phase on a fixture world built by the
// Orbital System Builder (js/systemSpec.js), what the night side's path
// encloses, what each tier draws at 10 px and more, and that every body drawn
// below 10 px makes the same canvas calls it made before this change
// (tests/fixtures/close-world-small.json, recorded on the tree before it).
// The lit fraction and orientation in pixels are e2e/closeWorld.spec.js.
// =============================================================================

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { URL } from 'node:url';
import {
  Planet,
  GasGiant,
  StarObject,
  stars,
  planets,
  gas_giants,
  setStateReference,
  JUPITER_MASS_UNIT,
  GAS_GIANT_TO_STAR_THRESHOLD,
} from '../js/physics.js';
import { setCloseLook, lightingNotes } from '../js/bodyDraw.js';
import { lightingFor, setBloomLayer } from '../js/bodyDrawSky.js';
import { setTier } from '../js/quality.js';
import {
  clearVisualCaches,
  dominantLight,
  phaseCos,
  nightPath,
  LIGHT_HOLD,
} from '../js/bodyVisuals.js';
import { validateSystem, buildSystem } from '../js/systemSpec.js';
import { smallCases, drawAt as drawSmall } from './closeWorldSmall.js';

const TOL = JSON.parse(
  readFileSync(
    new URL('./fixtures/light-phase-tolerances.json', import.meta.url),
    'utf8'
  )
);
const SMALL = new URL('./fixtures/close-world-small.json', import.meta.url);

const view = { paused: true, zoom: 1, pan: { x: 0, y: 0 }, frame_count: 0 };

const reset = () => {
  stars.length = 0;
  planets.length = 0;
  gas_giants.length = 0;
  clearVisualCaches();
  setTier('full');
  setCloseLook('markings');
};

beforeEach(() => {
  setStateReference(view);
  view.zoom = 1;
  view.frame_count = 0;
  setBloomLayer(null);
  reset();
});
afterEach(reset);

const drawAt = (body, px) => drawSmall(view, body, px);

const sun = (x = -4000, y = 0, suns = 1) => {
  const s = new StarObject({ x, y }, { x: 0, y: 0 }, suns);
  stars.push(s);
  return s;
};

describe('below 10 px nothing changes', () => {
  test('every small body makes the calls it made before', () => {
    const cases = smallCases(view);
    if (process.env.CLOSE_WORLD_RECORD) {
      writeFileSync(SMALL, JSON.stringify(cases, null, 2) + '\n');
    }
    const before = JSON.parse(readFileSync(SMALL, 'utf8'));
    expect(Object.keys(cases).length).toBe(Object.keys(before).length);
    const changed = Object.keys(before).filter(k => cases[k] !== before[k]);
    expect(changed).toEqual([]);
  });
});

// --- The light ---------------------------------------------------------------

describe('the light', () => {
  test('a Star-class body below the star mass limit lights nothing', () => {
    const jupiter = new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 0.001);
    jupiter.mass = 1 * JUPITER_MASS_UNIT;
    stars.push(jupiter);
    const io = new Planet({ x: 40, y: 0 }, { x: 0, y: 0 }, 0.015);
    planets.push(io);
    expect(lightingFor(io).source).toBeNull();
    jupiter.mass = GAS_GIANT_TO_STAR_THRESHOLD * JUPITER_MASS_UNIT;
    view.frame_count++;
    expect(lightingFor(io).source?.star).toBe(jupiter);
  });

  test('holds at the equal-flux locus of two equal stars', () => {
    const tol = TOL.equalFluxSteps;
    let held = null;
    let heldChanges = -1;
    let exactChanges = -1;
    let exact = null;
    for (let i = 0; i < tol; i++) {
      // Two equal stars turning about a centre, and a body moving along the
      // line where their fluxes are equal: the numbers differ by rounding.
      const t = 0.37 + i * 0.0613;
      const c = { x: 1234.567, y: -987.654 };
      const u = { x: Math.cos(t), y: Math.sin(t) };
      const s1 = { pos: { x: c.x + 311.1 * u.x, y: c.y + 311.1 * u.y } };
      const s2 = { pos: { x: c.x - 311.1 * u.x, y: c.y - 311.1 * u.y } };
      s1.luminosity = s2.luminosity = 1.7;
      const k = 50 + 17 * i;
      const at = { x: c.x - k * u.y, y: c.y + k * u.x };
      const sources = [s1, s2].map((s, j) => ({ ...s, star: `star${j}` }));
      const h = dominantLight(at, sources, held)?.star;
      const e = dominantLight(at, sources)?.star;
      if (h !== held) heldChanges++;
      if (e !== exact) exactChanges++;
      held = h;
      exact = e;
    }
    expect(heldChanges).toBe(0);
    // Without the hold the same walk does flicker, which is why it is there.
    expect(exactChanges).toBeGreaterThan(0);
  });

  test('changes once another star is clearly brighter', () => {
    const a = { pos: { x: -100, y: 0 }, luminosity: 1, star: 'a' };
    const b = { pos: { x: 100, y: 0 }, luminosity: 1, star: 'b' };
    // Held by a, b takes over where (100 + x) / (100 - x) passes the square
    // root of 1 + LIGHT_HOLD: x = 1.22 for five per cent.
    const edge =
      (100 * (Math.sqrt(1 + LIGHT_HOLD) - 1)) / (Math.sqrt(1 + LIGHT_HOLD) + 1);
    expect(dominantLight({ x: 0.5, y: 0 }, [a, b], 'a').star).toBe('a');
    expect(dominantLight({ x: edge - 0.01, y: 0 }, [a, b], 'a').star).toBe('a');
    expect(dominantLight({ x: edge + 0.01, y: 0 }, [a, b], 'a').star).toBe('b');
    // Unheld, the nearer star simply wins.
    expect(dominantLight({ x: 0.5, y: 0 }, [a, b]).star).toBe('b');
  });
});

// --- The phase, on a fixture world --------------------------------------------

/** A star, a planet and a moon from the Orbital System Builder. */
function fixtureWorld(moonPhaseDeg) {
  const checked = validateSystem({
    bodies: [
      { name: 'Star', type: 'Star', mass: 1 },
      { name: 'World', type: 'Planet', mass: 1, primary: 0, a: 1, phase: 0 },
      {
        name: 'Moon',
        type: 'Planet',
        mass: 0.0123,
        primary: 1,
        a: 0.0026,
        phase: moonPhaseDeg,
      },
    ],
  });
  expect(checked.ok).toBe(true);
  const built = buildSystem(checked.bodies, { G: 1 });
  const [s, w, m] = built.bodies;
  const star = new StarObject({ ...s.pos }, { x: 0, y: 0 }, 1);
  const world = new Planet({ ...w.pos }, { x: 0, y: 0 }, 1);
  const moon = new Planet({ ...m.pos }, { x: 0, y: 0 }, 0.0123);
  world.name = 'World';
  stars.push(star);
  planets.push(world, moon);
  // The light sources are cached for a frame; this is a new world.
  view.frame_count++;
  return { star, world, moon };
}

/** The angle at the moon between the star and the world, by atan2 alone. */
const angleAt = (m, s, w) => {
  const a1 = Math.atan2(s.pos.y - m.pos.y, s.pos.x - m.pos.x);
  const a2 = Math.atan2(w.pos.y - m.pos.y, w.pos.x - m.pos.x);
  let d = Math.abs(a1 - a2) % (2 * Math.PI);
  if (d > Math.PI) d = 2 * Math.PI - d;
  return d;
};

describe('the phase on a fixture world', () => {
  for (const phase of [0, 45, 90, 135, 180, 270]) {
    test(`a moon at phase ${phase} degrees is seen from its planet`, () => {
      const { star, world, moon } = fixtureWorld(phase);
      const got = lightingFor(moon);
      expect(got.source.star).toBe(star);
      expect(got.observer).toBe(world);
      expect(got.cosA).toBeCloseTo(Math.cos(angleAt(moon, star, world)), 12);
      // The planet itself goes round a star: no observer, the half-lit disc.
      const planet = lightingFor(world);
      expect(planet.observer).toBeNull();
      expect(planet.cosA).toBe(0);
    });
  }

  test('the night path encloses 1 - (1 + cos a) / 2 of the disc', () => {
    // Shoelace over the path's own points: arc and ellipse sampled finely.
    const area = (cosA, th) => {
      const pts = [];
      const ctx = {
        beginPath() {},
        closePath() {},
        arc(x, y, r, a0, a1) {
          for (let i = 0; i <= 2000; i++) {
            const a = a0 + ((a1 - a0) * i) / 2000;
            pts.push([x + r * Math.cos(a), y + r * Math.sin(a)]);
          }
        },
        ellipse(x, y, rx, ry, rot, a0, a1, ccw) {
          let span = a1 - a0;
          if (ccw && span > 0) span -= 2 * Math.PI;
          if (!ccw && span < 0) span += 2 * Math.PI;
          for (let i = 0; i <= 2000; i++) {
            const a = a0 + (span * i) / 2000;
            const ex = rx * Math.cos(a);
            const ey = ry * Math.sin(a);
            pts.push([
              x + ex * Math.cos(rot) - ey * Math.sin(rot),
              y + ex * Math.sin(rot) + ey * Math.cos(rot),
            ]);
          }
        },
      };
      nightPath(
        ctx,
        { x: 3, y: -2 },
        1,
        { x: Math.cos(th), y: Math.sin(th) },
        cosA
      );
      let s = 0;
      for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[(i + 1) % pts.length];
        s += x1 * y2 - x2 * y1;
      }
      return Math.abs(s) / 2 / Math.PI;
    };
    for (const deg of TOL.angles) {
      const c = Math.cos((deg * Math.PI) / 180);
      for (const th of [0, 1, 2.5, -2]) {
        expect(area(c, th)).toBeCloseTo(1 - (1 + c) / 2, 4);
      }
    }
  });

  test('phaseCos is the cosine of the angle at the body', () => {
    expect(phaseCos({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 5, y: 0 })).toBe(1);
    expect(phaseCos({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -5, y: 0 })).toBe(-1);
    expect(phaseCos({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 3 })).toBe(0);
    expect(phaseCos({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 })).toBeNull();
  });
});

// --- At 10 px and more ---------------------------------------------------------

const NIGHT = 'rgba(2,4,12,0.82)';
const nightFills = calls =>
  calls.filter(c => c.startsWith(`fill|${NIGHT}|`)).length;
const paints = (calls, color) =>
  calls.filter(c => c.startsWith(`fill|${color}|`)).length;

describe('at 10 px and more', () => {
  test('the low tier draws the terminator and no markings', () => {
    sun();
    const earth = new Planet({ x: 0, y: 0 }, { x: 0, y: 0 }, 1);
    earth.isEarth = true;
    planets.push(earth);
    setTier('low');
    const low = drawAt(earth, 20);
    expect(nightFills(low)).toBe(1);
    expect(paints(low, '#3c6b3a')).toBe(0);
    setTier('full');
    const full = drawAt(earth, 20);
    expect(nightFills(full)).toBe(1);
    expect(paints(full, '#3c6b3a')).toBe(6);
  });

  test('every family gets a night side from a star, and none without', () => {
    const make = () => {
      const p = new Planet({ x: 0, y: 0 }, { x: 0, y: 0 }, 1);
      const m = new Planet({ x: 0, y: 0 }, { x: 0, y: 0 }, 0.0123);
      m.isMoon = true;
      const g = new GasGiant({ x: 0, y: 0 }, { x: 0, y: 0 }, 1);
      g.hasRings = true;
      planets.push(p, m);
      gas_giants.push(g);
      return [p, m, g];
    };
    for (const body of make()) expect(nightFills(drawAt(body, 12))).toBe(0);
    reset();
    sun();
    for (const body of make()) expect(nightFills(drawAt(body, 12))).toBe(1);
  });

  test('markings come from the body, not from chance', () => {
    sun();
    const moon = new Planet({ x: 0, y: 0 }, { x: 0, y: 0 }, 0.0123);
    moon.isMoon = true;
    planets.push(moon);
    const a = drawAt(moon, 40);
    const b = drawAt(moon, 40);
    expect(a).toEqual(b);
  });

  test('the comparison looks: no markings, and limb darkening', () => {
    sun();
    const earth = new Planet({ x: 0, y: 0 }, { x: 0, y: 0 }, 1);
    earth.isEarth = true;
    planets.push(earth);
    setCloseLook('terminator');
    expect(paints(drawAt(earth, 30), '#3c6b3a')).toBe(0);
    setCloseLook('limb');
    const limb = drawAt(earth, 30);
    expect(paints(limb, '#3c6b3a')).toBe(6);
    expect(limb.filter(c => c.startsWith('fillRect|g')).length).toBe(1);
  });
});

// --- What the label says ------------------------------------------------------

describe('the label', () => {
  test('says what is modeled and what is illustration', () => {
    const lone = new Planet({ x: 0, y: 0 }, { x: 0, y: 0 }, 1);
    planets.push(lone);
    expect(lightingNotes(lone)).toEqual([
      'No star in this scene: shading is illustration.',
      'Surface markings, when it is large on screen: illustration.',
    ]);
    reset();
    const { star, world, moon } = fixtureWorld(90);
    star.name = 'Sol';
    expect(lightingNotes(world)).toEqual([
      'Lit by Sol, the star that sends it the most light (modeled).',
      'Day and night halves as seen from above the orbit (modeled).',
      'Surface markings, when it is large on screen: illustration.',
    ]);
    expect(lightingNotes(moon)[1]).toBe('Phase as seen from World (modeled).');
    const giant = new GasGiant({ x: 1, y: 1 }, { x: 0, y: 0 }, 1);
    gas_giants.push(giant);
    expect(lightingNotes(giant)[2]).toBe(
      'Bands and flattening, when it is large on screen: illustration.'
    );
  });
});
