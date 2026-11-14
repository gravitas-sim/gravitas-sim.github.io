// =============================================================================
// The stellar closeout investigations (Roadmap III, Prompt 224)
// -----------------------------------------------------------------------------
// Every number a step states is recomputed from what the lesson points at: the
// cluster-fit panel's field (in a child process, because Jest's VM runs the fits
// about thirteen times slower), the bundled MIST tracks, the remnant panel's
// field, and the SDSS spectrum pack's own grid, catalog temperatures and band
// depths. Each answer is fed to the step's own grader, a wrong one is refused,
// and the Spanish carries the same structure, step for step.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  READING_THE_HR_DIAGRAM as HR,
  READING_THE_HR_DIAGRAM_ES as HR_ES,
  READING_THE_HR_DIAGRAM_DEEPER as HR_DEEP,
  READING_THE_HR_DIAGRAM_DEEPER_ES as HR_DEEP_ES,
  A_STARS_LIFE_IN_NUMBERS as LIFE,
  A_STARS_LIFE_IN_NUMBERS_ES as LIFE_ES,
  A_STARS_LIFE_IN_NUMBERS_DEEPER as LIFE_DEEP,
  A_STARS_LIFE_IN_NUMBERS_DEEPER_ES as LIFE_DEEP_ES,
  WHEN_A_STAR_EXPLODES as BOOM,
  WHEN_A_STAR_EXPLODES_ES as BOOM_ES,
  WHEN_A_STAR_EXPLODES_DEEPER as BOOM_DEEP,
  WHEN_A_STAR_EXPLODES_DEEPER_ES as BOOM_DEEP_ES,
  POPULATIONS_I_AND_II as POP,
  POPULATIONS_I_AND_II_ES as POP_ES,
  POPULATIONS_I_AND_II_DEEPER as POP_DEEP,
  POPULATIONS_I_AND_II_DEEPER_ES as POP_DEEP_ES,
  SPECTRA_TELL_TEMPERATURE_AND_GRAVITY as SPEC,
  SPECTRA_TELL_TEMPERATURE_AND_GRAVITY_ES as SPEC_ES,
  SPECTRA_TELL_TEMPERATURE_AND_GRAVITY_DEEPER as SPEC_DEEP,
  SPECTRA_TELL_TEMPERATURE_AND_GRAVITY_DEEPER_ES as SPEC_DEEP_ES,
  INSTRUCTOR,
  SHADOWS,
  DEPTH,
  DEPTH_ES,
} from '../js/data/investigations/stellar-sequence.js';
import { trackBounds, stateAtEep } from '../js/stellar/tracks.js';
import { outcomeView } from '../js/remnantsField.js';
import '../js/kernels/remnants/index.js';
import { SPECTRAL_FEATURES, bandDepth } from '../js/stellar/spectrumIndex.js';
import {
  GRID,
  SPECTRA,
  SPECTRUM_IDS,
  decodeSpectrum,
} from '../js/data/spectra/sdssSpectra.js';
import { radiusFromLuminosityAndTemperature } from '../js/stellar/geometry.js';
import { nuclearTimescaleYr } from '../js/kernels/stellar/homology.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const LESSONS = [
  [HR, HR_ES, HR_DEEP, HR_DEEP_ES],
  [LIFE, LIFE_ES, LIFE_DEEP, LIFE_DEEP_ES],
  [BOOM, BOOM_ES, BOOM_DEEP, BOOM_DEEP_ES],
  [POP, POP_ES, POP_DEEP, POP_DEEP_ES],
  [SPEC, SPEC_ES, SPEC_DEEP, SPEC_DEEP_ES],
];
const all = LESSONS.flatMap(([l, , d]) => [...l.steps, ...d.steps]);
const step = sid => all.find(s => s.sid === sid);
const near = (x, y, tol) => Math.abs(x - y) <= tol;

// The cluster fits, in a child process.
const SCRIPT = `
import { clusterView, gyr } from ${JSON.stringify(path.join(ROOT, 'js/clusterFitField.js'))};
const out = {};
for (const [name, v] of Object.entries({
  A: { cluster: 0 }, B: { cluster: 1 },
  Am: { cluster: 0, feh: -0.5 }, A0: { cluster: 0, feh: 0 },
  Ab: { cluster: 0, binaries: 1 },
})) {
  const f = clusterView(v).fit;
  out[name] = { age: gyr(f.best.logAge), dm: f.best.dm };
}
console.log(JSON.stringify(out));
`;
const fits = JSON.parse(
  execFileSync(process.execPath, ['--input-type=module', '-e', SCRIPT], {
    encoding: 'utf8',
    timeout: 120000,
  })
);

const ms = id =>
  trackBounds(id).segments.find(s => s.key === 'main-sequence').durationYr;
const power = (a, b, ma, mb) => Math.log(ms(a) / ms(b)) / Math.log(mb / ma);

describe('Reading the HR Diagram: the numbers the steps state', () => {
  test('the white dwarf of 25,000 K and 0.01 solar luminosities is 0.0053 solar radii', () => {
    const r = radiusFromLuminosityAndTemperature(0.01, 25000);
    const s = step('the-size-of-a-white-dwarf');
    expect(near(r, s.answer, s.tolerance)).toBe(true);
    expect(near(r, 0.00533, 0.00002)).toBe(true);
    // about 350 times the Sun's surface flux, and the area a hundredth over that
    expect(near((25000 / 5772) ** 4, 352, 1)).toBe(true);
  });
  test('cluster A: a distance modulus of 12.10, 2630 parsecs; the grader refuses 12.5', () => {
    expect(near(fits.A.dm, 12.1, 0.01)).toBe(true);
    const s = step('distance-puts-it-there');
    expect(s.validate({ dm: fits.A.dm }).level).toBe('ok');
    expect(s.validate({ dm: 12.5 }).level).toBe('error');
    const d = 10 ** ((fits.A.dm + 5) / 5);
    const n = step('the-distance-in-parsecs');
    expect(near(d, n.answer, n.tolerance)).toBe(true);
    expect(Number(d.toPrecision(3))).toBe(n.answer);
  });
  test('binaries pull the fitted distance in by 2.6 percent and push the age to 2.06 Gyr', () => {
    const pct = 100 * (1 - 10 ** ((fits.Ab.dm - fits.A.dm) / 5));
    const n = step('what-binaries-do-to-the-fit');
    expect(near(pct, n.answer, n.tolerance)).toBe(true);
    expect(Number(pct.toPrecision(2))).toBe(n.answer);
    expect(near(fits.Ab.age, 2.06, 0.01)).toBe(true);
    expect(near(fits.A.age, 2.02, 0.01)).toBe(true);
  });
});

describe('A Star’s Life in Numbers: the numbers the steps state', () => {
  test('the main sequence is 9.88 Gyr for 1 solar mass and 8.65 Myr for 20; the graders accept the readout and refuse a Gyr for a Myr', () => {
    expect(near(ms('m100') / 1e9, 9.878, 0.001)).toBe(true);
    expect(near(ms('m2000') / 1e6, 8.652, 0.001)).toBe(true);
    expect(step('a-sun-like-life').validate({ sun: 9.9 }).level).toBe('ok');
    expect(step('a-sun-like-life').validate({ sun: 41.9 }).level).toBe('error');
    expect(step('a-heavy-life').validate({ heavy: 8.7 }).level).toBe('ok');
    expect(step('a-heavy-life').validate({ heavy: 8700 }).level).toBe('error');
  });
  test('the ratio is 1140, a power of 2.3 of 20', () => {
    const r = ms('m100') / ms('m2000');
    const n = step('the-ratio');
    expect(near(r, n.answer, n.tolerance)).toBe(true);
    expect(Number(r.toPrecision(3))).toBe(n.answer);
    expect(near(Math.log(r) / Math.log(20), 2.35, 0.01)).toBe(true);
  });
  test('the power is 3.23 between 1 and 2 solar masses, 2.08 from 5 to 10 and 1.44 from 10 to 20', () => {
    const k = power('m100', 'm200', 1, 2);
    const n = step('the-slope-changes');
    expect(near(k, n.answer, n.tolerance)).toBe(true);
    expect(Number(k.toPrecision(3))).toBe(n.answer);
    expect(near(power('m500', 'm1000', 5, 10), 2.08, 0.005)).toBe(true);
    expect(near(power('m1000', 'm2000', 10, 20), 1.44, 0.005)).toBe(true);
  });
  test('cluster A, 2.02 Gyr, has a turnoff of 1.63 solar masses and B, 3.16 Gyr, 1.42', () => {
    const k = power('m100', 'm200', 1, 2);
    const turnoff = t => (ms('m100') / 1e9 / t) ** (1 / k);
    const n = step('the-turnoff-as-a-clock');
    expect(near(turnoff(fits.A.age), n.answer, n.tolerance)).toBe(true);
    expect(Number(turnoff(fits.A.age).toPrecision(3))).toBe(n.answer);
    expect(near(turnoff(fits.B.age), 1.42, 0.01)).toBe(true);
  });
  test('the 20 solar-mass star is 57,000 times as luminous as the 1 solar-mass star at the start of its main sequence', () => {
    const lum = id => stateAtEep(id, 'zams').luminositySun;
    expect(near(lum('m2000') / lum('m100'), 57000, 1500)).toBe(true);
    expect(near(lum('m2000'), 43000, 500)).toBe(true);
  });
});

describe('When a Star Explodes: the numbers the steps state', () => {
  test('the panel gives a white dwarf at 5, 0.2 and 0.8 at 9, a neutron star at 15', () => {
    const p = mi => outcomeView({ mi, relation: 0, view: 1 }).outcome;
    expect(p(5).probabilities.whiteDwarf).toBe(1);
    expect(near(p(9).probabilities.whiteDwarf, 0.2, 1e-9)).toBe(true);
    expect(near(p(9).probabilities.neutronStar, 0.8, 1e-9)).toBe(true);
    expect(p(9).verdict).toBe('uncertain');
    expect(p(15).probabilities.neutronStar).toBe(1);
    expect(
      outcomeView({ mi: 9 }).thresholds.whiteDwarfToNeutronStar
    ).toMatchObject({
      lo: 7,
      hi: 9.5,
    });
  });
  test('the binding energy is 2.6e46 J and the blast is 0.39 percent of it; the grader refuses 39', () => {
    const E = (0.6 * 6.674e-11 * (1.4 * 1.989e30) ** 2) / 12e3;
    const n = step('compute-the-bound');
    expect(near(E / 1e46, n.answer, n.tolerance)).toBe(true);
    expect(Number((E / 1e46).toPrecision(2))).toBe(n.answer);
    const share = (100 * 1e44) / 2.6e46;
    const s = step('the-share-in-the-blast');
    expect(s.validate({ share }).level).toBe('ok');
    expect(s.validate({ share: 39 }).level).toBe('error');
    expect(near((100 * 1e44) / E, 0.39, 0.005)).toBe(true);
  });
  test('the energy of the Sun’s main sequence is 1.25e44 J, 207 times smaller', () => {
    const E = 0.0007 * 1.989e30 * 2.998e8 ** 2;
    const bound = (0.6 * 6.674e-11 * (1.4 * 1.989e30) ** 2) / 12e3;
    const n = step('compared-with-a-sun');
    expect(near(bound / E, n.answer, n.tolerance)).toBe(true);
    expect(Number((bound / E).toPrecision(3))).toBe(n.answer);
    // the same energy from the kernel: efficiency 0.007, a tenth of the mass
    const kernel = nuclearTimescaleYr(1, 1) * 3.156e7 * 3.828e26;
    expect(near(kernel / E, 1, 0.01)).toBe(true);
  });
});

describe('Populations I and II: the numbers the steps state', () => {
  test('[Fe/H] of -0.5 is 32 percent of the Sun’s ratio', () => {
    expect(Number((100 * 10 ** -0.5).toPrecision(2))).toBe(32);
  });
  test('cluster A is 3.35 Gyr at -0.5 and 1.47 at 0, a ratio of 2.29; the grader refuses the order reversed', () => {
    const s = step('the-same-stars-three-ways');
    expect(s.validate({ poor: fits.Am.age, rich: fits.A0.age }).level).toBe(
      'ok'
    );
    expect(s.validate({ poor: fits.A0.age, rich: fits.Am.age }).level).toBe(
      'error'
    );
    const n = step('the-age-ratio');
    expect(near(fits.Am.age / fits.A0.age, n.answer, n.tolerance)).toBe(true);
    expect(Number((fits.Am.age / fits.A0.age).toPrecision(3))).toBe(n.answer);
  });
  test('the distance modulus moves from 11.86 to 12.43: 29.6 percent', () => {
    expect(near(fits.Am.dm, 11.86, 0.01)).toBe(true);
    expect(near(fits.A0.dm, 12.43, 0.01)).toBe(true);
    const pct = 100 * (10 ** ((fits.A0.dm - fits.Am.dm) / 5) - 1);
    const n = step('the-distance-moves-too');
    expect(near(pct, n.answer, n.tolerance)).toBe(true);
    expect(Number(pct.toPrecision(3))).toBe(n.answer);
  });
  test('a 12 Gyr population has a turnoff of 0.94 solar masses on these tracks', () => {
    const k = power('m050', 'm100', 0.5, 1);
    const M = (ms('m100') / 1e9 / 12) ** (1 / k);
    const n = step('the-turnoff-of-an-old-population');
    expect(near(M, n.answer, n.tolerance)).toBe(true);
    expect(Number(M.toPrecision(2))).toBe(n.answer);
    expect(near(k, 3.28, 0.01)).toBe(true);
  });
});

describe('Spectra Tell Temperature and Gravity: the numbers the steps state', () => {
  const depth = (id, f) =>
    100 *
    bandDepth(
      decodeSpectrum(id),
      SPECTRAL_FEATURES.find(x => x.id === f)
    );
  test('H-beta is deepest in the A star (36.6 percent) and 4.8 in the M star; the sodium doublet is deepest in the M star', () => {
    expect(near(depth('a', 'hbeta'), 36.6, 0.05)).toBe(true);
    expect(near(depth('m', 'hbeta'), 4.8, 0.05)).toBe(true);
    const order = f =>
      [...SPECTRUM_IDS].sort((x, y) => depth(y, f) - depth(x, f))[0];
    expect(order('hbeta')).toBe('a');
    expect(order('nad')).toBe('m');
    expect(near(depth('m', 'nad'), 52.6, 0.1)).toBe(true);
    const s = step('read-the-depths');
    expect(s.validate({ a: 36.6, m: 4.8 }).level).toBe('ok');
    expect(s.validate({ a: 4.8, m: 36.6 }).level).toBe('error');
  });
  test('the A star peaks at 369 nm, bluer than the first sample of the pack', () => {
    const peak = 2.897771955e6 / SPECTRA.a.elodieTEff;
    const n = step('the-peak-of-the-a-star');
    expect(near(peak, n.answer, n.tolerance)).toBe(true);
    expect(Number(peak.toPrecision(3))).toBe(n.answer);
    expect(peak).toBeLessThan(GRID.firstA / 10);
    expect(SPECTRA.a.elodieTEff).toBe(7852);
  });
  test('the doublet spans 1.47 samples of the pack and 1.82 resolution elements at R of 1800', () => {
    const lambda = 5894.57;
    const step_ = lambda * Math.LN10 * GRID.logStep;
    const sep = 5897.558 - 5891.583;
    const a = step('samples-across-the-doublet');
    expect(near(sep / step_, a.answer, a.tolerance)).toBe(true);
    expect(Number((sep / step_).toPrecision(3))).toBe(a.answer);
    const b = step('resolved-or-not');
    expect(near(sep / (lambda / 1800), b.answer, b.tolerance)).toBe(true);
    expect(Number((sep / (lambda / 1800)).toPrecision(3))).toBe(b.answer);
  });
  test('surface gravity falls 4.6 dex from the start of the main sequence to the tip of the giant branch', () => {
    const a = stateAtEep('m100', 'zams');
    const b = stateAtEep('m100', 'rgb-tip');
    const dex = Math.log10(
      a.currentMassSun /
        a.radiusSun ** 2 /
        (b.currentMassSun / b.radiusSun ** 2)
    );
    const n = step('gravity-in-numbers');
    expect(near(dex, n.answer, n.tolerance)).toBe(true);
    expect(Number(dex.toPrecision(2))).toBe(n.answer);
    expect(near(a.radiusSun, 0.884, 0.001)).toBe(true);
    expect(near(b.radiusSun, 173, 0.5)).toBe(true);
    expect(near(b.currentMassSun, 0.954, 0.001)).toBe(true);
  });
});

describe('the structure, the Spanish and the instructor content', () => {
  test('every numeric answer is graded by its own tolerance and refuses a value ten times off', () => {
    for (const s of all.filter(x => x.kind === 'numeric')) {
      expect(Number.isFinite(s.answer)).toBe(true);
      expect(s.tolerance).toBeGreaterThan(0);
      expect(Math.abs(s.answer * 10 - s.answer)).toBeGreaterThan(s.tolerance);
      expect(s.hints.length).toBeGreaterThan(0);
      expect(Object.keys(s.feedback).sort()).toEqual(
        ['close', 'off', 'wrong-order-of-magnitude'].sort()
      );
    }
  });
  test('every lesson has the Spanish structure of its English, core and deeper', () => {
    for (const [l, es, d, desEs] of LESSONS) {
      expect(es.steps).toHaveLength(l.steps.length);
      expect(desEs.steps).toHaveLength(d.steps.length);
      expect(es.objectives).toHaveLength(l.objectives.length);
      for (const [en, sp] of [
        [l.steps, es.steps],
        [d.steps, desEs.steps],
      ])
        en.forEach((s, i) => {
          if (s.options) expect(sp[i].options).toHaveLength(s.options.length);
          if (s.fields) expect(sp[i].fields).toHaveLength(s.fields.length);
          if (s.hints) expect(sp[i].hints).toHaveLength(s.hints.length);
          if (s.misconceptions)
            expect(sp[i].misconceptions).toHaveLength(s.misconceptions.length);
        });
    }
  });
  test('every step has a unique sid, and a deeper step follows a step of its own lesson', () => {
    for (const [l, , d] of LESSONS) {
      const sids = [...l.steps, ...d.steps].map(s => s.sid);
      expect(new Set(sids).size).toBe(sids.length);
      const core = new Set(l.steps.map(s => s.sid));
      const deeper = new Set(d.steps.map(s => s.sid));
      for (const s of d.steps)
        expect(core.has(s.after) || deeper.has(s.after)).toBe(true);
      expect(l.steps[l.steps.length - 1].type).toBe('read');
    }
  });
  test('the instructor content names real steps and every lesson has its guide, shadow and deeper steps', () => {
    for (const [l] of LESSONS) {
      expect(INSTRUCTOR.content[l.id]).toBeTruthy();
      expect(SHADOWS[l.id]).toBeTruthy();
      expect(DEPTH[l.id]).toBeTruthy();
      expect(DEPTH_ES[l.id]).toBeTruthy();
      const sids = new Set(l.steps.map(s => s.sid));
      for (const f of INSTRUCTOR.flow[l.id]) {
        expect(sids.has(f.from)).toBe(true);
        expect(sids.has(f.to)).toBe(true);
      }
      for (const sid of Object.keys(INSTRUCTOR.expectations[l.id]))
        expect(sids.has(sid)).toBe(true);
      expect(Object.keys(INSTRUCTOR.bands[l.id])).toEqual(l.depths);
    }
  });
  test('the loop of each lesson opens on a held prediction where it has one', () => {
    for (const [l] of LESSONS)
      for (const s of l.steps)
        if (s.type === 'predict')
          expect(l.steps.some(x => x.sid === s.reveal)).toBe(true);
  });
});
