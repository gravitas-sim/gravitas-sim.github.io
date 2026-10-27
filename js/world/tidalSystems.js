// =============================================================================
// Two scale-model systems for the rings and tides displays (Prompt 204 part 2)
// -----------------------------------------------------------------------------
// Each is one `published-system` rule of the geometry table (ENGINE_GEOMETRY in
// js/world/build.js) and nothing else: the pull is the engine's own Newtonian
// gravity, no extra force (verdict B of TIDAL_TORQUE_GATE.md). Both are
// generators of bodies for the world builder; `published` is its constructor of
// one named body, and every random draw is from the seeded generator, in the order
// written, so a seed reproduces the world. The legs they are judged against are in
// tests/fixtures/tides/display-thresholds.json, run by tools/tides-scenarios.mjs.
// =============================================================================
import {
  CERES_MASS_UNIT,
  EARTH_MASS_UNIT,
  JUPITER_MASS_UNIT,
} from '../physics.js';

/**
 * A ringed planet at the scale of Saturn and Mimas. The planet's mass is true
 * (95.16 Earth masses) and every length is a scale model, 100 units to the
 * resonant moon's orbit, with G carrying the exaggeration of distance as the
 * Earth-Moon System's does (js/data/tidePresets.js). The ring is 200 particles of
 * negligible mass, evenly spaced in radius between 0.52 and 0.76 of that orbit and
 * at random phases, so the moon's 2:1 resonance (0.63 of it, where the Cassini
 * Division lies) is inside it. The resonant moon (0.1 percent of the planet, about
 * 15,000 times Mimas's true ratio, so that twenty orbits can show the effect) and
 * the shepherd inside the ring at 72 (3e-5, a moonlet that clears a lane about its
 * orbit as Pan does in the Encke Gap) are exaggerated, and the scenario says so.
 * Draws: the moons' phases, then one for each particle. A particle's contact
 * radius is four thousandths of a unit: the engine's collisions are inelastic
 * bounces that heat a ring by themselves, and a gap made by them would teach the
 * wrong thing.
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
 * The planet-and-clump geometry of Shoemaker-Levy 9 at Jupiter: a planet of one
 * Jupiter mass drawn 15 units across, and a clump of 60 particles (one thousandth
 * of the planet's mass, 2 units across, so 2.37 times less dense than the planet)
 * on a bound ellipse whose periapsis is `periapsisRadii` planet radii from the
 * planet's centre (1.3 by default; the tests' control uses 1.5 times the fluid
 * limit): inside the rigid Roche limit (2^(1/3) 2.37^(1/3) = 1.68 radii) and the
 * fluid one (2.44 x 2.37^(1/3) = 3.26). The clump starts near virial balance (a
 * disc of equal masses, random motion at the speed its own gravity sets), so what
 * happens after periapsis is the planet's tide. G is large, so a pass takes about
 * ten time units. A rubble particle's contact radius is a hundredth of a unit, so
 * the engine's collisions do not heat the clump.
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
  // Virial random motion (a uniform disc's 0.35 G m / R per axis, below the
  // 0.42 of a full balance, so the clump holds for the pass), drawn from the
  // seeded generator, with no net drift inside the clump.
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
