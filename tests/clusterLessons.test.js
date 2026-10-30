// =============================================================================
// Two Clusters, Two Ages, in two languages (Roadmap III, Prompt 219)
// -----------------------------------------------------------------------------
// Every number a step states is recomputed from the panel the lesson draws
// (js/clusterFitWidgets.js over js/clusterFitField.js and the kernel in
// js/kernels/clusters/), read in the form the validator takes and fed to the
// step's own validator. The fits run in a child process (Jest's VM runs them
// about thirteen times slower); the Spanish carries the same step structure.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TWO_CLUSTERS_TWO_AGES as LESSON,
  TWO_CLUSTERS_TWO_AGES_ES as LESSON_ES,
  TWO_CLUSTERS_TWO_AGES_DEEPER as DEEP,
  TWO_CLUSTERS_TWO_AGES_DEEPER_ES as DEEP_ES,
  INSTRUCTOR,
} from '../js/data/investigations/cluster-sequence.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const all = [...LESSON.steps, ...DEEP.steps];
const step = sid => all.find(s => s.sid === sid);

const SCRIPT = `
import { clusterView, gyr } from ${JSON.stringify(path.join(ROOT, 'js/clusterFitField.js'))};
const out = {};
for (const [name, v] of Object.entries({
  A: { cluster: 0 }, B: { cluster: 1 },
  Am: { cluster: 0, feh: -0.5 }, A0: { cluster: 0, feh: 0 },
  B0: { cluster: 1, feh: 0 }, Bm: { cluster: 1, feh: -0.5 },
  Ab: { cluster: 0, binaries: 1 },
})) {
  const m = clusterView(v);
  const f = m.fit;
  out[name] = {
    age: gyr(f.best.logAge), dm: f.best.dm,
    lo: f.intervals.logAge.lo === null ? null : gyr(f.intervals.logAge.lo),
    hi: f.intervals.logAge.hi === null ? null : gyr(f.intervals.logAge.hi),
    dmLo: f.intervals.dm.lo, dmHi: f.intervals.dm.hi,
    open: f.intervals.logAge.status !== 'ok', warnings: f.warnings,
    truthAge: gyr(m.spec.logAge), truthDm: m.spec.dm,
  };
}
process.stdout.write(JSON.stringify(out));
`;
const N = JSON.parse(
  execFileSync(process.execPath, ['--input-type=module', '-e', SCRIPT], {
    cwd: ROOT,
    maxBuffer: 1 << 24,
  }).toString()
);

describe('Two Clusters, Two Ages: the numbers the steps state', () => {
  test('cluster A and B at [Fe/H] -0.25: ages, distances, the difference', () => {
    expect(step('fit-a').validate({ a: N.A.age, d: N.A.dm }).level).toBe('ok');
    expect(step('fit-b').validate({ a: N.B.age, d: N.B.dm }).level).toBe('ok');
    expect(
      step('how-much-older').validate({ d: N.B.age - N.A.age }).level
    ).toBe('ok');
    expect(N.B.age).toBeGreaterThan(N.A.age);
    expect(step('fit-a').validate({ a: 3.2, d: 12.1 }).level).toBe('error');
    // the two truths: 2.00 and 3.16 Gyr at one distance modulus
    expect(N.A.truthAge).toBeCloseTo(2.0, 2);
    expect(N.B.truthAge).toBeCloseTo(3.16, 2);
    expect(N.A.truthDm).toBe(N.B.truthDm);
  });
  test('the interval of A is about 0.05 Gyr wide and just misses the drawn age (the third of one-sigma intervals that miss)', () => {
    expect(N.A.hi - N.A.lo).toBeGreaterThan(0.04);
    expect(N.A.hi - N.A.lo).toBeLessThan(0.07);
    expect(N.A.lo).toBeGreaterThan(N.A.truthAge);
    expect(N.A.lo - N.A.truthAge).toBeLessThan(0.01);
  });
  test('changing the metallicity: 3.35 and 1.47 Gyr, ten to twenty-four interval widths', () => {
    expect(
      step('change-the-metallicity').validate({ p: N.Am.age, s: N.A0.age })
        .level
    ).toBe('ok');
    const w = N.A.hi - N.A.lo;
    expect((N.Am.age - N.A.age) / w).toBeGreaterThan(20);
    expect((N.Am.age - N.A.age) / w).toBeLessThan(28);
    expect((N.A.age - N.A0.age) / w).toBeGreaterThan(9);
    expect((N.A.age - N.A0.age) / w).toBeLessThan(12);
    expect(N.Am.dm).toBeLessThan(N.A.dm);
    expect(N.A0.dm - N.Am.dm).toBeCloseTo(0.56, 1);
  });
  test('the difference holds: B older every time, 1.14 then 0.78 Gyr, open at -0.50', () => {
    expect(
      step('the-difference-holds').validate({
        b: N.B0.age,
        d: N.B0.age - N.A0.age,
      }).level
    ).toBe('ok');
    expect(N.B0.age).toBeGreaterThan(N.A0.age);
    expect(N.Bm.age).toBeGreaterThan(N.Am.age);
    expect(N.Bm.open).toBe(true);
    expect(N.Bm.warnings).toContain('ageAtOldEdge');
    expect(N.A.open).toBe(false);
  });
  test('30 percent binaries: the distance is 0.06 mag too small and the interval excludes the truth', () => {
    expect(
      step('add-binaries').validate({
        d: N.Ab.dm,
        e: N.Ab.truthDm - N.Ab.dm,
      }).level
    ).toBe('ok');
    expect(N.Ab.dmHi).toBeLessThan(N.Ab.truthDm);
    expect(
      (N.Ab.truthDm - N.Ab.dm) / ((N.Ab.dmHi - N.Ab.dmLo) / 2)
    ).toBeGreaterThan(5);
  });
});

describe('the lesson as data', () => {
  test('every step has a sid, a type, and a validator when it is a measure', () => {
    for (const s of all) {
      expect(s.sid).toMatch(/^[a-z0-9-]+$/);
      expect(s.type).toBeTruthy();
      if (s.type === 'measure') {
        expect(s.validate({})).toBeNull();
        expect(s.fields.length).toBeGreaterThan(0);
      }
      if (s.kind === 'choice') {
        expect(s.options.length).toBeGreaterThan(2);
        expect(s.answer).toBeGreaterThanOrEqual(0);
      }
    }
    expect(new Set(all.map(s => s.sid)).size).toBe(all.length);
  });
  test('the deeper steps hang on steps of the lesson or each other, at their own depth', () => {
    const sids = new Set(all.map(s => s.sid));
    for (const s of DEEP.steps) {
      expect(sids.has(s.after)).toBe(true);
      expect(['quantitative', 'advanced']).toContain(s.depth);
    }
  });
  test('only passed results are presented: the failed legs appear only as a limit', () => {
    const limit = step('a-real-cluster');
    expect(limit.type).toBe('read');
    expect(limit.body).toMatch(/does\s+not<\/strong> agree/);
    expect(limit.body).toMatch(/limit/);
    // no step asks for NGC 2420's fitted age as an answer
    expect(all.filter(s => s.fields && /2420/.test(s.body))).toHaveLength(0);
  });
  test('the instructor content names the lesson', () => {
    expect(Object.keys(INSTRUCTOR.content)).toEqual(['two-clusters-two-ages']);
    expect(INSTRUCTOR.expectations['two-clusters-two-ages']['fit-a']).toMatch(
      /2\.02/
    );
  });
});

describe('the two languages agree', () => {
  const same = (en, es) => {
    expect(es.steps).toHaveLength(en.steps.length);
    en.steps.forEach((s, i) => {
      const e = es.steps[i];
      expect(e.title).toBeTruthy();
      expect(Boolean(e.options)).toBe(Boolean(s.options));
      if (s.options) expect(e.options).toHaveLength(s.options.length);
      expect(e.fields?.length ?? 0).toBe(s.fields?.length ?? 0);
      expect((e.misconceptions ?? []).length).toBe(
        (s.misconceptions ?? []).length
      );
    });
  };
  test('the lesson and its deeper steps', () => {
    same(LESSON, LESSON_ES);
    same(DEEP, DEEP_ES);
  });
});
