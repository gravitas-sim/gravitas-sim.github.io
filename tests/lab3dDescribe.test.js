// =============================================================================
// "Describe the view" in the 3-D lab (Prompt 281)
// -----------------------------------------------------------------------------
// The description reads the numbers the tables read and says them. Checked
// here without a browser: a Sun with two planets whose orbits are tilted by
// known angles gives those angles back; the list is bounded however many
// bodies there are; a held guide step takes the orbit numbers out; both
// catalogs hold the same ids and no sentence interprets.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { fromElements } from '../js/lab3d/elements.js';
import {
  MAX_NAMES,
  MAX_ORBITS,
  MAX_PAIRS,
  sentences,
  translator,
  loadLanguage,
} from '../js/lab3d/view/describe.js';
import { EN_LAB3DDESCRIBE } from '../js/i18n/en.lab3dDescribe.js';
import { ES_LAB3DDESCRIBE } from '../js/i18n/es.lab3dDescribe.js';

const RAD = Math.PI / 180;
const tr = translator('en');

/** A star and planets of the given {a, e, i (deg)}, each about the star, G = 1. */
function system(orbits) {
  const m = [1, ...orbits.map(() => 1e-6)];
  const x = [0, 0, 0];
  const v = [0, 0, 0];
  for (const o of orbits) {
    const s = fromElements(
      { a: o.a, e: o.e, i: o.i * RAD, Omega: 0, omega: 0, M: 0.5 },
      1 + 1e-6
    );
    x.push(...s.x);
    v.push(...s.v);
  }
  return {
    t: 12.5,
    m: Float64Array.from(m),
    x: Float64Array.from(x),
    v: Float64Array.from(v),
    alive: Uint8Array.from(m.map(() => 1)),
  };
}

const base = (frame, names) => ({
  frame,
  names,
  G: 1,
  solar: true,
  mode: { mode: 'nbody', integrator: { scheme: 'rk4', h: 0.01 }, interval: 2 },
  labels: {
    frame: 'Barycentric',
    plane: 'System axes',
    projection: 'Perspective',
  },
  camera: { above: 30.4, around: 45, size: 2.6 },
  held: false,
});

describe('describe the view', () => {
  const f = system([
    { a: 1, e: 0.1, i: 0 },
    { a: 2, e: 0.2, i: 20 },
  ]);
  const text = sentences(base(f, ['Star', 'Inner', 'Outer']), tr).join(' ');

  test('says the run mode with its numbers, the setup and the camera', () => {
    expect(text).toContain('N-body, rk4, step 0.0100');
    expect(text).toContain('one tick is 2.00 d');
    expect(text).toContain('Frame: Barycentric. Reference plane: System axes');
    expect(text).toContain('30° above the reference plane, 45° around it');
    expect(text).toContain('2.6 times as tall');
    expect(text).toContain('3 live bodies: Star, Inner, Outer.');
  });

  test('gives each orbit and the mutual inclination of two orbits that share a primary', () => {
    expect(text).toContain(
      'Outer about Star: a = 2.00 AU, e = 0.200, i = 20.0°'
    );
    expect(text).toContain('Inner about Star: a = 1.00 AU, e = 0.100, i = 0°');
    expect(text).toContain('Mutual inclination of Inner and Outer: 20.0°');
  });

  test('says which body is farthest from the centre of mass', () => {
    expect(text).toMatch(/farthest body from the centre of mass is Outer/);
  });

  test('does not interpret', () => {
    for (const w of ['because', 'means', 'shows that', 'therefore', 'stable'])
      expect(text).not.toContain(w);
  });

  test('the Kepler-only and precomputed modes say what they are', () => {
    const k = sentences(
      { ...base(f, ['S', 'A', 'B']), mode: { mode: 'kepler', interval: 3 } },
      tr
    )[0];
    expect(k).toMatch(/Kepler-only.*no orbit changes.*3.00 d/);
    const p = sentences(
      {
        ...base(f, ['S', 'A', 'B']),
        mode: {
          mode: 'precomputed',
          interval: 3,
          provenance: { source: 'DE441' },
        },
      },
      tr
    )[0];
    expect(p).toContain('precomputed run played back (DE441)');
  });
});

describe('the description is bounded', () => {
  const many = Array.from({ length: 14 }, (_, k) => ({
    a: 1 + k,
    e: 0.05,
    i: k,
  }));
  const f = system(many);
  const names = ['Star', ...many.map((_, k) => `P${k + 1}`)];
  const out = sentences(base(f, names), tr);

  test('names at most MAX_NAMES bodies and says how many more', () => {
    const line = out.find(s => s.includes('live bodies'));
    expect(line).toContain('15 live bodies');
    expect(line.split(',').length).toBeLessThanOrEqual(MAX_NAMES + 1);
    expect(line).toContain(`and ${15 - MAX_NAMES} more`);
  });

  test('gives at most MAX_ORBITS orbits and MAX_PAIRS pairs, then points to the table', () => {
    expect(out.filter(s => / about Star: /.test(s)).length).toBe(MAX_ORBITS);
    expect(out.filter(s => s.startsWith('Mutual')).length).toBe(MAX_PAIRS);
    expect(out.join(' ')).toContain(
      `And ${14 - MAX_ORBITS} more orbits are in the orbits table`
    );
  });

  test('is the same twice', () => {
    expect(sentences(base(f, names), tr)).toEqual(out);
  });
});

describe('a held guide step', () => {
  test('takes the orbit numbers and the inclinations out and says so', () => {
    const f = system([
      { a: 1, e: 0.1, i: 0 },
      { a: 2, e: 0.2, i: 20 },
    ]);
    const out = sentences({ ...base(f, ['S', 'A', 'B']), held: true }, tr);
    const text = out.join(' ');
    expect(text).toContain('orbit numbers are left out');
    expect(text).not.toMatch(/a = |Mutual|e = /);
    expect(text).toContain('3 live bodies');
  });
});

describe('both languages', () => {
  test('the catalogs hold the same ids', () => {
    expect(Object.keys(ES_LAB3DDESCRIBE).sort()).toEqual(
      Object.keys(EN_LAB3DDESCRIBE).sort()
    );
  });

  test('every placeholder in English is in the Spanish', () => {
    const holes = s => (s.match(/\{\w+\}/g) || []).sort().join();
    for (const k of Object.keys(EN_LAB3DDESCRIBE))
      expect([k, holes(ES_LAB3DDESCRIBE[k])]).toEqual([
        k,
        holes(EN_LAB3DDESCRIBE[k]),
      ]);
  });

  test('Spanish loads on request and says the same numbers', async () => {
    await loadLanguage('es');
    const f = system([{ a: 1, e: 0.1, i: 5 }]);
    const out = sentences(base(f, ['S', 'A']), translator('es')).join(' ');
    expect(out).toContain('A alrededor de S: a = 1.00 UA');
    expect(out).toContain('i = 5.00°');
  });

  test('no body means nothing to describe', () => {
    expect(sentences({ ...base(null, []) }, tr)).toEqual([
      'There is no system to describe yet.',
    ]);
  });
});
