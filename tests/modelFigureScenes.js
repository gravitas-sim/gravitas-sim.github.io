// What the model-figure tests compare a figure with: scenes run on the real
// integrator, the state recorded from them, and the numbers derived from that
// state by paths that share no code with js/lesson/figures.js (vis-viva, the
// angular momentum and the eccentricity vector for an orbit; the vector
// projection on the observer's two sky axes for a transit). The bounds are in
// tests/fixtures/model-figure-tolerances.json, committed before the figure.
import { readFileSync } from 'node:fs';
import * as P from '../js/physics.js';
import { twoBodySettings } from '../js/twoBodySettings.js';
import { makeLab, makeStar } from '../js/validation/harness.js';

export const TOL = JSON.parse(
  readFileSync(
    new URL('./fixtures/model-figure-tolerances.json', import.meta.url),
    'utf8'
  )
);

const lab = makeLab(P);
const DEG = Math.PI / 180;

/** The world's G, read the way twoBodySettings() reads it. */
export const worldG = () => twoBodySettings().gravitational_constant;

/**
 * An orbit on the engine, stepped for a fraction of its period, and the state
 * recorded from the bodies themselves.
 * @param {object} c - {a, e, omegaDeg, sense, fraction, dt}
 * @returns {{state: object, wp: number}} The recorded state (the declaration's
 *   form) and the angular rate at periapsis
 */
export function orbitScene({ a, e, omegaDeg = 0, sense = 1, fraction, dt }) {
  lab.reset({
    mutual_gravity: false,
    integrator: 'Velocity Verlet',
    min_interaction_distance: 5,
  });
  const G = worldG();
  const star = makeStar(P, { x: 0, y: 0 }, { x: 0, y: 0 }, 1);
  const rp = a * (1 - e);
  const vp = Math.sqrt((G * (1 + e)) / rp);
  const w = omegaDeg * DEG;
  const planet = new P.Planet(
    { x: rp * Math.cos(w), y: rp * Math.sin(w) },
    { x: -sense * vp * Math.sin(w), y: sense * vp * Math.cos(w) },
    1
  );
  planet.mass = 0.1;
  planet.persistent = true;
  P.stars.push(star);
  P.planets.push(planet);
  lab.commit();
  P.barycenterBodies();
  const period = 2 * Math.PI * Math.sqrt(a ** 3 / G);
  lab.step(dt, Math.round((period * fraction) / dt));
  return {
    state: {
      G,
      primary: {
        x: star.pos.x,
        y: star.pos.y,
        vx: star.vel.x,
        vy: star.vel.y,
        m: star.mass,
      },
      body: {
        x: planet.pos.x,
        y: planet.pos.y,
        vx: planet.vel.x,
        vy: planet.vel.y,
        m: planet.mass,
      },
    },
    wp: vp / rp,
  };
}

/**
 * The orbit of a recorded state, derived from the state alone.
 * @param {object} s - {G, primary, body, mutual}
 * @returns {object} a, e, apsis distances, focal separation and the world
 *   position of each apsis and of the empty focus
 */
export function deriveOrbit(s) {
  const rx = s.body.x - s.primary.x;
  const ry = s.body.y - s.primary.y;
  const vx = s.body.vx - s.primary.vx;
  const vy = s.body.vy - s.primary.vy;
  const mu = s.G * (s.primary.m + (s.mutual ? s.body.m : 0));
  const r = Math.hypot(rx, ry);
  const a = 1 / (2 / r - (vx * vx + vy * vy) / mu);
  const h = rx * vy - ry * vx;
  const ex = (vy * h) / mu - rx / r;
  const ey = (-vx * h) / mu - ry / r;
  const e = Math.hypot(ex, ey);
  const ux = ex / e;
  const uy = ey / e;
  const at = (d, sgn) => ({
    x: s.primary.x + sgn * d * ux,
    y: s.primary.y + sgn * d * uy,
  });
  return {
    a,
    e,
    periapsis: a * (1 - e),
    apoapsis: a * (1 + e),
    focalSeparation: 2 * a * e,
    periapsisAt: at(a * (1 - e), 1),
    apoapsisAt: at(a * (1 + e), -1),
    emptyFocusAt: at(2 * a * e, -1),
  };
}

/**
 * A transit on the engine: a star and a planet on a circular orbit, the
 * observer at a position angle and an inclination chosen so the planet's
 * centre passes b stellar radii from the star's centre. Stepped through the
 * transit, recording the step of least sky separation in front of the star
 * and the path the planet's centre takes between first and last contact.
 * @param {object} c - {starRadius, planetRadius, b, phiDeg, orbitRadius, dt}
 * @returns {object} {state, track} the recorded state at mid-transit and the
 *   measured contact length in stellar radii
 */
export function transitScene({
  starRadius: Rs,
  planetRadius: Rp,
  b,
  phiDeg,
  orbitRadius: d,
  dt,
}) {
  lab.reset({
    mutual_gravity: false,
    integrator: 'Velocity Verlet',
    min_interaction_distance: 5,
  });
  const G = worldG();
  const incDeg = Math.acos((b * Rs) / d) / DEG;
  const star = makeStar(P, { x: 0, y: 0 }, { x: 0, y: 0 }, 1);
  star.radius = Rs;
  const phi = phiDeg * DEG;
  const th0 = phi - 0.4;
  const v = Math.sqrt(G / d);
  const planet = new P.Planet(
    { x: d * Math.cos(th0), y: d * Math.sin(th0) },
    { x: -v * Math.sin(th0), y: v * Math.cos(th0) },
    1
  );
  planet.mass = 1e-6;
  planet.radius = Rp;
  planet.persistent = true;
  P.stars.push(star);
  P.planets.push(planet);
  lab.commit();
  P.barycenterBodies();

  const inc = incDeg * DEG;
  const n = [
    Math.sin(inc) * Math.cos(phi),
    Math.sin(inc) * Math.sin(phi),
    Math.cos(inc),
  ];
  const e1 = [-Math.sin(phi), Math.cos(phi), 0];
  const cross = (p, q) => [
    p[1] * q[2] - p[2] * q[1],
    p[2] * q[0] - p[0] * q[2],
    p[0] * q[1] - p[1] * q[0],
  ];
  const e2 = cross(n, e1);
  const dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
  const omega = Math.sqrt(G / d ** 3);
  let best = null;
  let path = 0;
  let prev = null;
  const steps = Math.round(0.9 / omega / dt);
  for (let i = 0; i < steps; i++) {
    P.updatePhysics(dt);
    const rel = [planet.pos.x - star.pos.x, planet.pos.y - star.pos.y, 0];
    const sky = [dot(rel, e1), dot(rel, e2)];
    const sep = Math.hypot(sky[0], sky[1]);
    if (dot(rel, n) <= 0) continue;
    if (!best || sep < best.sep) {
      best = {
        sep,
        state: {
          star: { x: star.pos.x, y: star.pos.y, r: star.radius },
          planet: { x: planet.pos.x, y: planet.pos.y, r: planet.radius },
          observer: { phiDeg, incDeg },
        },
      };
    }
    if (sep <= Rs + Rp) {
      if (prev) path += Math.hypot(sky[0] - prev[0], sky[1] - prev[1]);
      prev = sky;
    }
  }
  return { state: best.state, track: { contactLength: path / Rs }, v, dt };
}

/**
 * The transit geometry of a recorded state, from vectors: the planet's offset
 * on the observer's two sky axes (the cross product of the line of sight with
 * the first axis for the second), and the bodies' radii.
 * @param {object} s - {star, planet, observer}
 * @returns {object} k, b, contactLength, innerLength (null at a graze)
 */
export function deriveTransit(s) {
  const phi = s.observer.phiDeg * DEG;
  const inc = s.observer.incDeg * DEG;
  const n = [
    Math.sin(inc) * Math.cos(phi),
    Math.sin(inc) * Math.sin(phi),
    Math.cos(inc),
  ];
  const e1 = [-Math.sin(phi), Math.cos(phi), 0];
  const e2 = [
    n[1] * e1[2] - n[2] * e1[1],
    n[2] * e1[0] - n[0] * e1[2],
    n[0] * e1[1] - n[1] * e1[0],
  ];
  const rel = [s.planet.x - s.star.x, s.planet.y - s.star.y, 0];
  const sx = rel[0] * e1[0] + rel[1] * e1[1];
  const sy = rel[0] * e2[0] + rel[1] * e2[1];
  const k = s.planet.r / s.star.r;
  const b = Math.hypot(sx, sy) / s.star.r;
  const half = q => (q > 0 ? 2 * Math.sqrt(q) : null);
  return {
    k,
    b,
    contactLength: half((1 + k) ** 2 - b * b),
    innerLength: half((1 - k) ** 2 - b * b),
  };
}
