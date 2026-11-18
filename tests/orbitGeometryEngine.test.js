// The orbit geometry overlay against the real engine: the source rule
// twoBodyModel encodes agrees with what the step does, the source list is
// valid while paused before the first step, (d)'s engine radius over one
// period, and (e) built with the engine's own settings (G = 1 set on the world).
import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import * as P from '../js/physics.js';
import { twoBodySettings } from '../js/engine/forces.js';
import { makeLab, makeStar } from '../js/validation/harness.js';
import { orbitGeometry } from '../js/orbitGeometry.js';
import { twoBodyModel } from '../js/orbital.js';

const TOL = JSON.parse(
  readFileSync(
    new URL('./fixtures/orbit-geometry-tolerances.json', import.meta.url),
    'utf8'
  )
);

const lab = makeLab(P);

/** A body of a given kind, at rest, that the engine will keep. */
function make(kind, x, mass) {
  const pos = { x, y: 0 };
  const vel = { x: 0, y: 0 };
  let b;
  switch (kind) {
    case 'StarObject':
      return makeStar(P, pos, vel, mass);
    case 'Planet':
      b = new P.Planet(pos, vel, 1);
      break;
    case 'GasGiant':
      b = new P.GasGiant(pos, vel, 1);
      break;
    case 'Asteroid':
      b = new P.Asteroid(pos, vel, 1);
      break;
    case 'Comet':
      b = new P.Comet(pos, vel, 1);
      break;
    default:
      throw new Error(kind);
  }
  b.mass = mass;
  b.persistent = true;
  return b;
}

const LIST = {
  StarObject: 'stars',
  Planet: 'planets',
  GasGiant: 'gas_giants',
  Asteroid: 'asteroids',
  Comet: 'comets',
};

describe('the source rule against the step', () => {
  const kinds = ['StarObject', 'GasGiant', 'Planet', 'Asteroid', 'Comet'];
  for (const mutual of [false, true])
    for (const starOnly of [false, true])
      test(`mutual ${mutual}, star-only ${starOnly}: each pair's class is what one step does`, () => {
        for (const pk of kinds)
          for (const bk of kinds) {
            lab.reset({
              mutual_gravity: mutual,
              star_only_gravity: starOnly,
              min_interaction_distance: 5,
            });
            const primary = make(pk, 0, 1);
            const body = make(bk, 100, 0.5);
            P[LIST[pk]].push(primary);
            P[LIST[bk]].push(body);
            lab.commit();
            // Paused, before any step: the list must already be this world's.
            P.barycenterBodies();
            const listed = P.gravitySourcesFor(body).includes(primary);
            const m = twoBodyModel(body, primary, twoBodySettings());
            expect(m.primaryPulls).toBe(listed);
            lab.step(0.1, 1);
            const bodyMoved = body.vel.x !== 0;
            const primaryMoved = primary.vel.x !== 0;
            expect([pk, bk, m.primaryPulls]).toEqual([pk, bk, bodyMoved]);
            expect([pk, bk, m.bodyPulls]).toEqual([pk, bk, primaryMoved]);
          }
      });

  test('a world built paused is seen before its first step, not the last one', () => {
    lab.reset({ mutual_gravity: false });
    const old = make('StarObject', 0, 1);
    P.stars.push(old);
    lab.commit();
    lab.step(0.1, 1);
    // A new world, never stepped.
    lab.reset({ mutual_gravity: false });
    const star = make('StarObject', 0, 1);
    const planet = make('Planet', 100, 0.1);
    planet.vel.y = 0.1;
    P.stars.push(star);
    P.planets.push(planet);
    lab.commit();
    P.barycenterBodies();
    const sources = P.gravitySourcesFor(planet);
    expect(sources).toEqual([star]);
    expect(orbitGeometry(planet, sources, twoBodySettings()).primary).toBe(
      star
    );
  });
});

describe('(d) the one-way circle on the engine', () => {
  test('G = 1 on the world; the overlay reads a = 100, e = 0; the radius holds over a period', () => {
    lab.reset({
      gravitational_constant: 1,
      mutual_gravity: false,
      integrator: 'Velocity Verlet',
      min_interaction_distance: 5,
    });
    const star = make('StarObject', 0, 1);
    const planet = make('Planet', 100, 0.1);
    planet.vel.y = 0.1;
    P.stars.push(star);
    P.planets.push(planet);
    lab.commit();
    P.barycenterBodies();
    const settings = twoBodySettings();
    expect(settings.gravitational_constant).toBe(1);
    const g = orbitGeometry(planet, P.gravitySourcesFor(planet), settings);
    expect(g.ok).toBe(true);
    expect(Math.abs(g.a - 100) / 100).toBeLessThanOrEqual(
      TOL.d.overlayRelativeToA
    );
    expect(g.e).toBeLessThanOrEqual(TOL.d.overlayRelativeToA);

    const dt = TOL.d.engine.step;
    const T = 2 * Math.PI * Math.sqrt(100 ** 3 / 1);
    const omega = (2 * Math.PI) / T;
    const bound = 2 * (omega * dt) ** 2;
    expect(bound).toBeCloseTo(TOL.d.engine.boundValue, 12);
    let worst = 0;
    const steps = Math.ceil(T / dt);
    lab.step(dt, steps, () => {
      const r = Math.hypot(
        planet.pos.x - star.pos.x,
        planet.pos.y - star.pos.y
      );
      worst = Math.max(worst, Math.abs(r - 100) / 100);
    });
    // The star is never pulled: one-way.
    expect(star.pos.x).toBe(0);
    console.log(
      `orbit geometry (d): ${steps} steps, max |r - 100|/100 = ${worst.toExponential(3)} (bound ${bound.toExponential(1)})`
    );
    expect(worst).toBeLessThanOrEqual(bound);
  });
});

describe('(e) on the engine: the settings decide, not the overlay', () => {
  test('reciprocal stars inside a softening length of 5, and a MOND world', () => {
    lab.reset({ gravitational_constant: 1, min_interaction_distance: 5 });
    const a = make('StarObject', 0, 1);
    const b = make('StarObject', 1, 0.1);
    b.vel.y = 1;
    P.stars.push(a, b);
    lab.commit();
    P.barycenterBodies();
    const s = twoBodySettings();
    expect(s.softening).toBe(5);
    expect(s.gravitational_constant).toBe(1);
    expect(orbitGeometry(b, P.gravitySourcesFor(b), s).reason).toBe('softened');
    b.pos.x = 10;
    b.vel.y = Math.sqrt(2.2) / 10;
    expect(orbitGeometry(b, P.gravitySourcesFor(b), s).reason).toBe('softened');

    lab.reset({
      gravitational_constant: 1,
      galaxy_gravity: 'mond',
      galaxy_kpc_per_unit: 0.1,
      galaxy_msun_per_unit: 1e6,
    });
    const c = make('StarObject', 0, 1);
    const d = make('StarObject', 100, 0.1);
    d.vel.y = 0.1;
    P.stars.push(c, d);
    lab.commit();
    P.barycenterBodies();
    const m = twoBodySettings();
    expect(m.mondA0).toBeGreaterThan(0);
    expect(orbitGeometry(d, P.gravitySourcesFor(d), m).reason).toBe('mond');
    lab.reset();
  });
});
