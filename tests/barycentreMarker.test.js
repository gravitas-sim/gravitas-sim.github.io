// The barycenter marker, the barycentric frame and the scene statement,
// against the bounds committed first in tests/fixtures/barycentre-tolerances.json
// (SANDBOX_INSTRUMENTS.md, "Barycenter, frame and what pulls on what"). Both
// scenes are built through the page's builder under seed 1 and stepped as the
// page steps them; both set the world's gravitational constant to 1, their own
// value (the app's default world is 2, the integrator's bare default 1).
import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'node:fs';
import * as physics from '../js/physics.js';
import { physicsSettings, updatePhysicsSettings } from '../js/engine/state.js';
import { LIST_KIND, sourceLists, isSourceKind } from '../js/engine/sources.js';
import { buildScene } from './barycentreRuns.js';
import {
  markerPoint,
  sourcesStatement,
  frameLine,
} from '../js/sceneStatement.js';
import {
  setFrame,
  resetFrame,
  resolveFrameOrigin,
  BARYCENTER,
} from '../js/referenceFrame.js';
import { engine } from '../js/random/streams.js';
import { setLocale } from '../js/i18n/index.js';

const TOL = JSON.parse(
  readFileSync(
    new URL('./fixtures/barycentre-tolerances.json', import.meta.url),
    'utf8'
  )
);
// Bound once: free globals are slow in Jest's vm context.
const { Math } = globalThis;

/** An independent mass-weighted mean: plain sums, not barycenterOf. */
function mean(bodies) {
  let m = 0;
  let x = 0;
  let y = 0;
  for (const b of bodies) {
    m += b.mass;
    x += b.mass * b.pos.x;
    y += b.mass * b.pos.y;
  }
  return { x: x / m, y: y / m, m };
}
const sep = (a, b) => Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y);

/** The pair's relative-orbit period from its current separation and masses. */
function pairPeriod([a, b]) {
  const r = sep(a, b);
  return (
    2 *
    Math.PI *
    Math.sqrt(
      r ** 3 / (physicsSettings.gravitational_constant * (a.mass + b.mass))
    )
  );
}

/**
 * Build a scene and call `at` at the start and every quarter period, five
 * times, stepping as the page steps at the given rate between them.
 */
function atFiveTimes(key, rate, at) {
  const { plan } = buildScene(key, TOL.a.seed, rate);
  const pair = physics.stars.slice(0, 2);
  const T = pairPeriod(pair);
  const t0 = physics.getSimulationTime();
  engine(TOL.a.seed, () => {
    for (let k = 0; k <= 4; k++) {
      while (physics.getSimulationTime() - t0 < (k * T) / 4)
        for (let i = 0; i < plan.substeps; i++)
          physics.updatePhysics(plan.step);
      at(k, pair);
    }
  });
  return T;
}

beforeAll(() => setLocale('en', { persist: false }));

describe.each(TOL.a.scenes)('%s', key => {
  test('(a) the marker equals an independent mean, pair and system, to 1e-9 of the separation', () => {
    let worst = 0;
    atFiveTimes(key, TOL.a.rate, (k, pair) => {
      const s = sep(pair[0], pair[1]);
      // The pair: a star and the source that pulls hardest on it.
      const p = markerPoint('pair', pair[0]);
      expect(p.members.map(b => b.id).sort()).toEqual(
        pair.map(b => b.id).sort()
      );
      const mp = mean(pair);
      worst = Math.max(
        worst,
        Math.hypot(p.center.x - mp.x, p.center.y - mp.y) / s
      );
      // The system: the bodies the barycentric frame averages.
      const q = markerPoint('system');
      expect(q.members.length).toBe(physics.barycenterBodies().length);
      const ms = mean(q.members);
      worst = Math.max(
        worst,
        Math.hypot(q.center.x - ms.x, q.center.y - ms.y) / s
      );
    });
    console.log(
      `barycentre (a) ${key}: worst ${worst.toExponential(3)} of the separation (bound ${TOL.a.relativeToSeparation})`
    );
    expect(worst).toBeLessThanOrEqual(TOL.a.relativeToSeparation);
  });

  test('(c) the barycentric frame puts sum m r prime at zero to 1e-9 of the separation', () => {
    let worst = 0;
    try {
      atFiveTimes(key, TOL.a.rate, (k, pair) => {
        // A new world resets the frame, so it is chosen after the build.
        setFrame(BARYCENTER);
        const bodies = physics.barycenterBodies();
        const origin = resolveFrameOrigin(bodies).now;
        let m = 0;
        let x = 0;
        let y = 0;
        for (const b of bodies) {
          m += b.mass;
          x += b.mass * (b.pos.x - origin.x);
          y += b.mass * (b.pos.y - origin.y);
        }
        worst = Math.max(worst, Math.hypot(x, y) / m / sep(pair[0], pair[1]));
      });
      expect(frameLine(physics.barycenterBodies())).toBe(
        'Frame: Barycenter. Trails drawn in this frame'
      );
    } finally {
      resetFrame();
    }
    console.log(
      `barycentre (c) ${key}: worst ${worst.toExponential(3)} of the separation (bound ${TOL.c.relativeToSeparation})`
    );
    expect(worst).toBeLessThanOrEqual(TOL.c.relativeToSeparation);
    expect(frameLine(physics.barycenterBodies())).toBe('Frame: World');
  });
});

/** (b): the stars' centre of mass over ten periods at one rate. */
function drift(rate) {
  const { plan } = buildScene(TOL.b.scenario, TOL.b.seed, rate);
  const pair = physics.stars.slice(0, 2);
  const a0 = sep(pair[0], pair[1]);
  const T = pairPeriod(pair);
  const c0 = mean(pair);
  const t0 = physics.getSimulationTime();
  let worst = 0;
  let steps = 0;
  engine(TOL.b.seed, () => {
    while (physics.getSimulationTime() - t0 < TOL.b.orbits * T)
      for (let i = 0; i < plan.substeps; i++) {
        physics.updatePhysics(plan.step);
        steps++;
        const c = mean(pair);
        worst = Math.max(worst, Math.hypot(c.x - c0.x, c.y - c0.y) / a0);
      }
  });
  return { worst, steps, step: plan.step, T, a0 };
}

describe('(b) binary-pair holds its centre of mass over ten orbits', () => {
  test('60 frames a second: under 1e-6 of the separation (a stop condition)', () => {
    const r = drift(TOL.b.rate);
    console.log(
      `barycentre (b) @60: a0 ${r.a0.toPrecision(6)}, T ${r.T.toPrecision(6)}, ${r.steps} steps of ${r.step.toPrecision(6)}, worst ${r.worst.toExponential(3)} of a0 (bound ${TOL.b.relativeToInitialSeparation})`
    );
    expect(r.worst).toBeLessThan(TOL.b.relativeToInitialSeparation);
  });

  test('the other rates, reported and not judged', () => {
    for (const rate of TOL.b.reportedOnly) {
      const r = drift(rate);
      console.log(
        `barycentre (b) @${rate} (reported): ${r.steps} steps, worst ${r.worst.toExponential(3)} of a0`
      );
      expect(Number.isFinite(r.worst)).toBe(true);
    }
  });
});

describe('the statement says what the engine sums', () => {
  // One plain body of every kind in every list, so every class is present.
  const LISTS = Object.keys(LIST_KIND);
  let saved;
  beforeAll(() => {
    buildScene('binary-pair', 1, '60');
    saved = { ...physicsSettings };
    for (const list of LISTS) {
      physics[list].length = 0;
      physics[list].push({
        id: 900000 + LISTS.indexOf(list),
        kind: LIST_KIND[list],
        mass: 1,
        pos: { x: 0, y: 0 },
      });
    }
  });

  const combos = [
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ];
  test.each(combos)(
    'mutual_gravity %s, star_only_gravity %s',
    (mutual, starOnly) => {
      updatePhysicsSettings({
        mutual_gravity: mutual,
        star_only_gravity: starOnly,
      });
      physics.barycenterBodies(); // rebuilds the engine's caches
      const engineKinds = new Set(
        physics.gravitySourcesFor({ id: -1 }).map(b => b.kind)
      );
      const said = new Set(sourceLists(physicsSettings).map(l => LIST_KIND[l]));
      expect([...said].sort()).toEqual([...engineKinds].sort());
      for (const list of LISTS)
        expect(isSourceKind(LIST_KIND[list], physicsSettings)).toBe(
          engineKinds.has(LIST_KIND[list])
        );
      // And the words: every present class is in exactly one half.
      const text = sourcesStatement(physicsSettings);
      const [pulling, feeling = ''] = text.split(
        '. Feeling gravity, not pulling: '
      );
      expect(pulling.startsWith('Pulling on others: ')).toBe(true);
      expect(pulling).toContain('stars (1)');
      expect(pulling).toContain('black holes (1)');
      expect(pulling).toContain('galaxies (1)');
      for (const [list, word] of [
        ['planets', 'planets (1)'],
        ['gas_giants', 'gas giants (1)'],
        ['white_dwarfs', 'white dwarfs (1)'],
        ['neutron_stars', 'neutron stars (1)'],
        ['asteroids', 'asteroids (1)'],
      ]) {
        const pulls = engineKinds.has(LIST_KIND[list]);
        expect(pulling.includes(word)).toBe(pulls);
        expect(feeling.includes(word)).toBe(!pulls);
      }
      expect(feeling).toContain('comets (1)');
      expect(feeling).toContain('debris (1)');
    }
  );

  test('the example: two stars and a planet, the default settings', async () => {
    for (const list of LISTS) physics[list].length = 0;
    physics.stars.push(
      { id: 1, kind: 'StarObject', mass: 1, pos: { x: 0, y: 0 } },
      { id: 2, kind: 'StarObject', mass: 1, pos: { x: 1, y: 0 } }
    );
    physics.planets.push({
      id: 3,
      kind: 'Planet',
      mass: 1,
      pos: { x: 2, y: 0 },
    });
    expect(
      sourcesStatement({ mutual_gravity: false, star_only_gravity: false })
    ).toBe(
      'Pulling on others: stars (2). Feeling gravity, not pulling: planets (1).'
    );
    await setLocale('es', { persist: false });
    expect(
      sourcesStatement({ mutual_gravity: false, star_only_gravity: false })
    ).toBe(
      'Atraen a los demás: estrellas (2). Sienten la gravedad sin atraer: planetas (1).'
    );
    await setLocale('en', { persist: false });
    updatePhysicsSettings(saved);
  });
});
