/**
 * The inspector's orbit and radius rows against the state they claim to read.
 *
 * Tolerances, written before the rows were changed: period, relative speed,
 * semi-major axis within 1e-6 (relative), and eccentricity within 1e-6
 * (absolute: these orbits start circular, e near 1e-16), of a computation
 * written here from positions, velocities, masses and the scene's gravity
 * settings (not orbitalElements); mass in kg exact. The primary is the one a
 * student would name: Earth and Mercury about Sol, Star A about Star B,
 * Luna about Earth, Io about Jupiter, TRAPPIST-1 b about its star.
 */
import { describe, test, expect, beforeAll } from '@jest/globals';

let world;
let physics;
let state;
let readout;
let info;
let format;

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
  readout = await import('../js/inspectorOrbit.js');
  info = await import('../js/inspectorInfo.js');
  format = await import('../js/format.js');
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
const build = key => {
  state.SETTINGS.preset_scenario = key;
  world.initialize_simulation({ seed: 7 });
  return LISTS.flatMap(l => physics[l] || []).filter(b => b.alive !== false);
};
const named = (bodies, re) => {
  const hit = bodies.filter(b => re.test(b.name || ''));
  expect(hit).toHaveLength(1);
  return hit[0];
};

/** Vis-viva, written out: the test's own computation from the state. */
function independent(body, primary, mutual) {
  const G = physics.physicsSettings.gravitational_constant;
  const mu = G * (primary.mass + (mutual ? body.mass : 0));
  const rx = body.pos.x - primary.pos.x;
  const ry = body.pos.y - primary.pos.y;
  const vx = body.vel.x - primary.vel.x;
  const vy = body.vel.y - primary.vel.y;
  const r = Math.sqrt(rx * rx + ry * ry);
  const v2 = vx * vx + vy * vy;
  const a = 1 / (2 / r - v2 / mu);
  const h = rx * vy - ry * vx;
  const e = Math.sqrt(Math.max(0, 1 - (h * h) / (mu * a)));
  return {
    v: Math.sqrt(v2),
    a,
    e,
    period: 2 * Math.PI * Math.sqrt(a ** 3 / mu),
  };
}

const close = (got, want) =>
  expect(Math.abs(got - want) / Math.abs(want)).toBeLessThan(1e-6);

/** A planet pulls back only with mutual gravity on and star-only gravity off. */
const planetPulls = () =>
  physics.physicsSettings.mutual_gravity &&
  !physics.physicsSettings.star_only_gravity;

const CASES = [
  ['solar-system', /^Earth$/, /^Sol$/, () => planetPulls()],
  ['solar-system', /^Mercury$/, /^Sol$/, () => planetPulls()],
  ['binary-pair', /Star A/, /Star B/, () => true],
  ['earth-moon-system', /^(Luna|Moon)$/, /^Earth$/, () => planetPulls()],
  ['trappist-1-system', /^TRAPPIST-1b$/, /^TRAPPIST-1$/, () => planetPulls()],
];

describe('orbit rows match an independent computation to 1e-6', () => {
  test.each(CASES)('%s: %s', (key, bodyRe, primaryRe, mutual) => {
    const bodies = build(key);
    const body = named(bodies, bodyRe);
    const primary = named(bodies, primaryRe);
    const r = readout.orbitReadout(body);
    expect(r.primary).toBe(primary);
    expect(r.state).toBe('bound');
    const want = independent(body, primary, mutual());
    close(r.el.v, want.v);
    close(r.el.a, want.a);
    expect(Math.abs(r.el.e - want.e)).toBeLessThan(1e-6);
    close(r.el.period, want.period);
  });
});

describe('the primary a student would name', () => {
  test('Io about Jupiter, Luna about Earth, Earth about Sol', () => {
    let bodies = build('galilean-resonance');
    expect(readout.orbitReadout(named(bodies, /^Io$/)).primary?.name).toMatch(
      /^Jupiter$/
    );
    bodies = build('earth-moon-system');
    expect(
      readout.orbitReadout(named(bodies, /^(Luna|Moon)$/)).primary?.name
    ).toBe('Earth');
    // Nothing here outweighs the Earth: no primary, not a made-up one.
    expect(readout.orbitReadout(named(bodies, /^Earth$/)).state).toBe(
      'no-primary'
    );
    bodies = build('solar-system');
    expect(readout.orbitReadout(named(bodies, /^Earth$/)).primary?.name).toBe(
      'Sol'
    );
  });
});

describe('radius rows', () => {
  const rows = card => Object.fromEntries(card.stats.map(s => [s.label, s]));

  test('a measured radius gives the surface rows; mass in kg is exact', () => {
    const b = named(build('trappist-1-system'), /^TRAPPIST-1b$/);
    expect(b.radiusInEarths).toBeGreaterThan(0);
    const card = rows(info.getPlanetInfo(b));
    const radius = Object.values(card).find(
      s => s.tooltipKey === 'radiusPhysical'
    );
    expect(radius.value).toContain('R⊕');
    expect(Object.keys(card).some(l => /density/i.test(l))).toBe(true);
    const massKg =
      (b.massInEarths ?? b.mass / physics.EARTH_MASS_UNIT) * 5.972e24;
    expect(card.Mass.value).toContain(format.withUnit(massKg, 'kg'));
  });

  test('a model radius is never called physical and derives nothing', () => {
    const bodies = build('earth-moon-system');
    const earth = named(bodies, /^Earth$/);
    if (Number.isFinite(earth.radiusInEarths)) return;
    const stats = info.getPlanetInfo(earth).stats;
    expect(stats.some(s => s.tooltipKey === 'radiusPhysical')).toBe(false);
    expect(stats.some(s => s.tooltipKey === 'radius')).toBe(true);
    expect(stats.some(s => /density|gravity|escape/i.test(s.label))).toBe(
      false
    );
  });

  test('the mass ladder is labelled as one', () => {
    const earth = named(build('earth-moon-system'), /^Earth$/);
    const type = info
      .getPlanetInfo(earth)
      .stats.find(s => /type/i.test(s.label));
    expect(type.value).toMatch(/by mass/);
  });
});

describe('no row claims a two-body orbit inside the softening length', () => {
  test('r = 10, softening 5, point-mass periapsis 1.111', () => {
    const settings = {
      gravitational_constant: 1,
      mutual_gravity: true,
      star_only_gravity: false,
      bh_behavior: 'orbit',
      softening: 5,
      mondA0: 0,
      haloAt: null,
    };
    const star = {
      kind: 'StarObject',
      name: 'S',
      mass: 1,
      pos: { x: 0, y: 0 },
      vel: { x: 0, y: 0 },
    };
    // a = 5.5555..., e = 0.8: periapsis 1.111, apoapsis 10.
    const mu = 1 + 1e-9;
    const v = Math.sqrt(mu * (2 / 10 - 1 / (10 / 1.8)));
    const body = {
      kind: 'Planet',
      name: 'P',
      mass: 1e-9,
      pos: { x: 10, y: 0 },
      vel: { x: 0, y: v },
    };
    const r = readout.orbitReadout(body, settings, {
      stars: [star],
      planets: [body],
    });
    expect(r.el.periapsis).toBeCloseTo(1.111, 3);
    expect(r.state).toBe('softened');
    const rows = readout.orbitRows(body, r);
    expect(rows.some(s => /semi-major/i.test(s.label))).toBe(false);
  });
});
