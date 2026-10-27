// Two scale-model systems for the rings and tides displays (Prompt 204 part 2):
// one `published-system` rule each, Newtonian gravity only (TIDAL_TORQUE_GATE.md).
// Draws come from the seeded generator in the order written. Design, bounds and
// failed legs: D-R10-88, tests/fixtures/tides/display-thresholds.json.
import {
  CERES_MASS_UNIT,
  EARTH_MASS_UNIT,
  JUPITER_MASS_UNIT,
} from '../physics.js';

/**
 * A Saturn-like ringed planet (true mass), lengths scaled so the resonant moon
 * orbits at 100 with G carrying the distance. 200 massless particles between 52 and
 * 76 put the moon's 2:1 resonance (63) inside the ring; a shepherd at 72 clears a
 * lane. Both moons are exaggerated in mass and the scenario says so. Draws: moon
 * phases, then one per particle. Contact radius 0.004, so collisions do not make a gap.
 */
export function* ringGapSystem(G, published) {
  const M = 95.16 * EARTH_MASS_UNIT;
  const circle = (a, m, extra) => {
    const th = Math.random() * 2 * Math.PI;
    const v = Math.sqrt((G * (M + m)) / a);
    return {
      pos: { x: a * Math.cos(th), y: a * Math.sin(th) },
      vel: { x: -v * Math.sin(th), y: v * Math.cos(th) },
      ...extra,
    };
  };
  yield published({
    kind: 'gasGiant',
    name: 'Ringed planet',
    mass: M,
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    radius: 32.5,
    color: '#e3cf9e',
  });
  for (const [name, a, ratio, radius, color] of [
    ['Resonant moon', 100, 1e-3, 3, '#cfd2d6'],
    ['Shepherd moon', 72, 3e-5, 2, '#b9a38a'],
  ])
    yield published({
      kind: 'planet',
      name,
      mass: ratio * M,
      radius,
      color,
      ...circle(a, ratio * M),
    });
  const N = 200;
  const m = 1e-9 * M;
  for (let i = 0; i < N; i++) {
    const r = 52 + 24 * ((i + 0.5) / N);
    const th = Math.random() * 2 * Math.PI;
    const v = Math.sqrt((G * M) / r);
    yield {
      type: 'Asteroid',
      ctor: 1,
      pos: { x: r * Math.cos(th), y: r * Math.sin(th) },
      vel: { x: -v * Math.sin(th), y: v * Math.cos(th) },
      assign: {
        name: `Ring particle ${i + 1}`,
        mass: m,
        massInCeres: m / CERES_MASS_UNIT,
        radius: 0.004,
        baseColor: '#c8b89a',
        persistent: true,
      },
    };
  }
}

/**
 * Shoemaker-Levy 9 at Jupiter: a 15-unit planet and a 60-particle clump (a thousandth
 * of its mass, 2 units across, 2.37 times less dense) on an e = 0.9 orbit whose
 * periapsis is `periapsisRadii` radii out (1.3; the tests' control uses 1.5 times
 * the fluid limit), inside both Roche limits (1.68 and 3.26 radii). The clump starts
 * near virial balance. Contact radius 0.01, so collisions do not heat it.
 */
export function* rochePassSystem(G, published, periapsisRadii = 1.3) {
  const Mp = JUPITER_MASS_UNIT;
  const Rp = 15;
  const mc = 1e-3 * Mp;
  const Rc = 2;
  const N = 60;
  const q = periapsisRadii * Rp;
  const e = 0.9;
  const a = q / (1 - e);
  const r0 = 4 * q;
  const vt = Math.sqrt(G * Mp * q * (1 + e)) / r0;
  const vr = -Math.sqrt(Math.max(0, G * Mp * (2 / r0 - 1 / a) - vt * vt));
  yield published({
    kind: 'gasGiant',
    name: 'Planet',
    mass: Mp,
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    radius: Rp,
    color: '#d9b98a',
  });
  // Random motion at 0.35 G m / R per axis (below balance, so it holds), no net drift.
  const sigma = Math.sqrt((0.35 * G * mc) / Rc);
  const gauss = () =>
    Math.sqrt(-2 * Math.log(1 - Math.random())) *
    Math.cos(2 * Math.PI * Math.random());
  const phase = Math.random() * 2 * Math.PI;
  const rows = [];
  for (let i = 0; i < N; i++) {
    const r = Rc * Math.sqrt((i + 0.5) / N);
    const th = phase + i * 2.399963229728653;
    rows.push({
      x: r * Math.cos(th),
      y: r * Math.sin(th),
      u: sigma * gauss(),
      w: sigma * gauss(),
    });
  }
  const mu = rows.reduce((t, b) => t + b.u / N, 0);
  const mw = rows.reduce((t, b) => t + b.w / N, 0);
  for (let i = 0; i < N; i++) {
    const b = rows[i];
    yield {
      type: 'Asteroid',
      ctor: 1,
      pos: { x: r0 + b.x, y: b.y },
      vel: { x: vr + b.u - mu, y: vt + b.w - mw },
      assign: {
        name: `Rubble ${i + 1}`,
        mass: mc / N,
        massInCeres: mc / N / CERES_MASS_UNIT,
        radius: 0.01,
        baseColor: '#b8a58a',
        persistent: true,
      },
    };
  }
}

/** The two geometry-table entries. */
export const TIDAL_GEOMETRY = {
  // prettier-ignore
  'ring-gap': { recenter: true, steps: [{ rule: { name: 'published-system', params: { system: 'ring-gap' } } }] },
  // prettier-ignore
  'roche-pass': { recenter: true, steps: [{ rule: { name: 'published-system', params: { system: 'roche-pass' } } }] },
};

/** The generator for a tidal system, or null. */
export function tidalSystem(system, G, published, periapsisRadii) {
  if (system === 'ring-gap') return ringGapSystem(G, published);
  if (system === 'roche-pass')
    return rochePassSystem(G, published, periapsisRadii);
  return null;
}
