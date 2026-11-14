/**
 * @jest-environment jsdom
 */
// =============================================================================
// The Sun investigations and instruments (Roadmap III, Prompt 194 part 2)
// -----------------------------------------------------------------------------
// Every number a step of "The Turning Sun" and "The Sun's Power" states is
// recomputed here from the kernel (js/kernels/sun/) and the committed sequence
// (frames/sun-2024-05.json, whose pictures' SHA-256 this checks): each validator
// accepts the kernel's value and refuses a wrong one, the predictions point at
// their answer, the pack says what it is (browse pictures, fill rows, no NOAA
// counts) and the instruments read out through the same words in English and
// Spanish. The failed legs of the authentic tier are held by tests/sun.test.js.
// =============================================================================

/* global document */
import { describe, test, expect, beforeAll } from '@jest/globals';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { withAllDepths } from '../js/investigations/depthAll.js';
import * as K from '../js/kernels/sun/index.js';
import { EN_SUN } from '../js/i18n/en.sun.js';
import { ES_SUN } from '../js/i18n/es.sun.js';
import ES_LESSONS from '../js/data/investigations/es/atmosphere-sequence.js';
import ES_DEEP from '../js/data/investigations/depth/es/atmosphere-sequence.js';
import { LAZY_FAMILIES } from '../js/widgets.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const SIDE = JSON.parse(
  readFileSync(path.join(ROOT, 'frames/sun-2024-05.json'), 'utf8')
);
const IDS = ['the-turning-sun', 'the-suns-power'];
const lesson = id => withAllDepths(INVESTIGATIONS.find(l => l.id === id));
const step = (id, sid) => lesson(id).steps.find(s => s.sid === sid);

/** The validator accepts `good` and refuses `bad`, both with a message. */
function holds(id, sid, good, bad) {
  const s = step(id, sid);
  expect(s.validate(good).level).toBe('ok');
  const r = s.validate(bad);
  expect(r.level).toBe('error');
  expect(r.message.length).toBeGreaterThan(20);
  expect(s.validate({})).toBeNull();
}

const G1 = K.trackGroup(SIDE, 'G1');
const G3 = K.trackGroup(SIDE, 'G3');
const mark = (id, day) => K.groupPositions(SIDE, id).find(p => p.day === day);
const rows = K.measuredIrradiance(SIDE);
const power = K.summariseIrradiance(SIDE);

describe('the sequence is the committed one', () => {
  test('fourteen pictures, each the file its record names, with a disc, a distance and a count', () => {
    expect(SIDE.days).toHaveLength(14);
    for (const d of SIDE.days) {
      const bytes = readFileSync(path.join(ROOT, d.file));
      expect(bytes.length).toBe(d.bytes);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(d.sha256);
      expect(d.pImageDeg).toBe(0);
      expect(d.disc.radiusPx * d.distanceAu).toBeCloseTo(475, 0);
      expect(d.groupsRead).toBeGreaterThan(2);
    }
  });

  test('it says what it is: browse pictures, the ruling, no NOAA counts, fill rows left out', () => {
    expect(SIDE.displayOnly).toMatch(/BROWSE/);
    expect(SIDE.displayOnly).toMatch(/D-R10-92/);
    expect(SIDE.displayOnly).toMatch(/not astrometry/);
    expect(SIDE.sources.regionCounts).toMatch(/NOT retrieved/);
    expect(SIDE.sources.irradiance.note).toMatch(/fill values/);
    expect(rows).toHaveLength(6);
    expect(SIDE.irradiance.filter(r => r.fill)).toHaveLength(7);
    expect(SIDE.irradiance.some(r => r.fill && r.tsi1AuWm2 !== undefined)).toBe(
      false
    );
  });

  test('the lessons’ two groups are G1 and G3 and the numbers they state are the kernel’s', () => {
    expect(G1.nUsed).toBe(6);
    expect(G3.nUsed).toBe(9);
    expect(G1.synodic.rate).toBeCloseTo(13.17, 2);
    expect(G1.synodic.period).toBeCloseTo(27.33, 2);
    expect(G1.sidereal.rate).toBeCloseTo(14.134, 3);
    expect(G1.sidereal.period).toBeCloseTo(25.47, 2);
    expect(G3.sidereal.rate).toBeCloseTo(13.476, 3);
    expect(G3.sidereal.sigma).toBeCloseTo(0.056, 3);
    expect(G3.birge).toBeCloseTo(2.35, 2);
    expect(K.lawRate(G1.latitude.deg)).toBeCloseTo(14.292, 3);
    expect(K.lawRate(G3.latitude.deg)).toBeCloseTo(14.05, 2);
  });
});

describe('the lessons are registered whole', () => {
  test('both exist with three depths, and Spanish in step', () => {
    for (const id of IDS) {
      const l = INVESTIGATIONS.find(x => x.id === id);
      expect(l).toBeTruthy();
      expect(l.depths).toEqual(['core', 'quantitative', 'advanced']);
      const full = lesson(id);
      expect(full.steps.some(s => s.depth === 'quantitative')).toBe(true);
      expect(full.steps.some(s => s.depth === 'advanced')).toBe(true);
      expect(ES_LESSONS[id].steps).toHaveLength(l.steps.length);
      expect(ES_DEEP[id].steps).toHaveLength(
        full.steps.filter(s => s.depth).length
      );
    }
  });

  test('every step names a tool the sun family owns', () => {
    const owned = LAZY_FAMILIES.sun.ids;
    for (const id of IDS)
      for (const s of lesson(id).steps) expect(owned).toContain(s.tool.id);
  });

  test('every prediction reveals a step that exists in the lesson', () => {
    for (const id of IDS)
      for (const s of lesson(id).steps.filter(x => x.reveal))
        expect(lesson(id).steps.map(x => x.sid)).toContain(s.reveal);
  });

  test('the first step of The Turning Sun states the browse-picture caveat and the credit', () => {
    const body = step('the-turning-sun', 'fourteen-days').body;
    expect(body).toMatch(/browse pictures/);
    expect(body).toMatch(/not astrometry/);
    expect(body).toMatch(/SDO\/NASA/);
    expect(step('the-suns-power', 'a-flux-above-the-air').body).toMatch(/LASP/);
  });
});

describe('The Turning Sun: every stated number from the kernel', () => {
  test('a position: 7.14 degrees north and −7.29 from the central meridian', () => {
    const p = K.diskToHeliographic(452, 422, K.diskOfDay(SIDE, 0));
    expect(p.latDeg).toBeCloseTo(7.14, 1);
    expect(p.lonStonyDeg).toBeCloseTo(-7.29, 1);
    holds(
      'the-turning-sun',
      'read-a-position',
      { lat: 7.14, lon: -7.29 },
      { lat: 40, lon: 0 }
    );
  });

  test('three days: 32.44 degrees and 13.22 a day', () => {
    const a = mark('G1', 0);
    const b = mark('G1', 3);
    expect(b.lonStonyDeg).toBeCloseTo(32.44, 2);
    expect((b.lonStonyDeg - a.lonStonyDeg) / 3).toBeCloseTo(13.22, 2);
    holds(
      'the-turning-sun',
      'how-far-in-three-days',
      { lon4: 32.44, rate: 13.22 },
      { lon4: 10, rate: 5 }
    );
  });

  test('the track: 13.17 degrees a day and a 27.3 day period; the sidereal 14.13 and 25.5', () => {
    holds(
      'the-turning-sun',
      'track-the-group',
      { rate: G1.synodic.rate, period: G1.synodic.period },
      { rate: 14.13, period: 25.5 }
    );
    holds(
      'the-turning-sun',
      'the-sidereal-period',
      { rate: G1.sidereal.rate, period: G1.sidereal.period },
      { rate: 13.17, period: 27.3 }
    );
    expect(G1.sidereal.period).toBeLessThan(G1.synodic.period);
    expect(step('the-turning-sun', 'longer-or-shorter').answer).toBe(0);
  });

  test('a second group, the law at both latitudes and what two groups can say', () => {
    holds(
      'the-turning-sun',
      'a-southern-group',
      { rate: G3.sidereal.rate, sigma: G3.sidereal.sigma },
      { rate: 14.13, sigma: 0.5 }
    );
    holds(
      'the-turning-sun',
      'the-law-at-two-latitudes',
      { law1: G1.law.predicted, law3: G3.law.predicted },
      { law1: 13.2, law3: 13.2 }
    );
    const diff = G1.sidereal.rate - G3.sidereal.rate;
    const sd = Math.hypot(
      G1.sidereal.sigma,
      G3.sidereal.sigma,
      Math.SQRT2 * K.GROUP_SCATTER_FLOOR
    );
    expect(diff).toBeCloseTo(0.66, 2);
    expect(sd).toBeCloseTo(0.43, 2);
    expect(diff / sd).toBeGreaterThan(1.4);
    expect(diff / sd).toBeLessThan(1.6);
    expect(diff / G1.sidereal.sigma).toBeGreaterThan(10);
    expect(step('the-turning-sun', 'solid-or-not').answer).toBe(0);
  });

  test('a mark near the edge: mu 0.29, three times the longitude uncertainty, a warning and a rate that hardly moves', () => {
    const m = mark('G1', 6);
    expect(m.mu).toBeCloseTo(0.29, 2);
    expect(m.sigmaLonDeg).toBeCloseTo(0.64, 2);
    expect(m.sigmaLonDeg / mark('G1', 0).sigmaLonDeg).toBeGreaterThan(3);
    holds(
      'the-turning-sun',
      'near-the-limb',
      { mu: m.mu, sigma: m.sigmaLonDeg },
      { mu: 0.9, sigma: 0.1 }
    );
    const wide = K.trackGroup(SIDE, 'G1', { minMu: 0.25 });
    expect(wide.precise).toBe(false);
    expect(wide.warnings.map(w => w.code)).toContain('foreshortening');
    expect(Math.abs(wide.sidereal.rate - G1.sidereal.rate)).toBeLessThan(0.02);
  });

  test('the equatorial term alone: 13.96 ± 0.22, one degree of freedom, and three coefficients refused', () => {
    const tr = [G1, G3].map(t => ({
      latDeg: t.latitude.deg,
      rate: t.sidereal.rate,
      sigma: Math.hypot(t.sidereal.sigma, K.GROUP_SCATTER_FLOOR),
    }));
    const fit = K.fitRotationLaw(tr, { free: ['A'] });
    expect(fit.params.A.value).toBeCloseTo(13.96, 2);
    expect(fit.params.A.sigma).toBeCloseTo(0.216, 3);
    expect(fit.dof).toBe(1);
    expect(fit.chi2).toBeCloseTo(0.92, 2);
    holds(
      'the-turning-sun',
      'fit-the-equatorial-term',
      { a: fit.params.A.value, sigma: fit.params.A.sigma },
      { a: 14.33, sigma: 0.01 }
    );
    const three = K.fitRotationLaw(tr, { free: ['A', 'B', 'C'] });
    expect(three.status).toBe('refused');
    expect(three.code).toBe('under-determined');
    expect(step('the-turning-sun', 'three-from-two').answer).toBe(0);
  });

  test('G3 grows and does not lie on a line: chi-square per degree of freedom 2.35, 78 to 465 dark pixels', () => {
    holds(
      'the-turning-sun',
      'why-the-scatter',
      { chi: G3.chi2 / G3.dof },
      { chi: 1 }
    );
    const g = SIDE.marks.G3.marks;
    expect(g[0].pixels).toBe(78);
    expect(Math.max(...g.map(m => m.pixels))).toBe(465);
    const car = K.groupPositions(SIDE, 'G3').map(p => p.lonCarringtonDeg);
    expect(car[0] - Math.min(...car)).toBeGreaterThan(4);
  });
});

describe('The Sun’s Power: every stated number from the kernel and the series', () => {
  test('a flux at the Earth and at 1 AU on 4 May', () => {
    const r = rows[0];
    expect(r.fluxEarth).toBeCloseTo(1338.8984, 4);
    expect(r.fluxEarth * r.distanceAu ** 2).toBeCloseTo(1361.6, 1);
    holds(
      'the-suns-power',
      'flux-at-one-au',
      { earth: 1338.9, au: 1361.6 },
      { earth: 1361.6, au: 1338.9 }
    );
  });

  test('luminosity 3.828e26 W and 5772 K from six days; the prediction points at 4e26', () => {
    expect(power.n).toBe(6);
    expect(power.luminosityW / 1e26).toBeCloseTo(3.828, 3);
    expect(power.teffK).toBeCloseTo(5772, 0);
    holds(
      'the-suns-power',
      'luminosity',
      { lum: power.luminosityW / 1e26, teff: power.teffK },
      { lum: 4.5, teff: 6000 }
    );
    expect(step('the-suns-power', 'power-predict').answer).toBe(0);
  });

  test('leaving the correction out: 1.8 percent low, 5746 K', () => {
    const raw = K.summariseFluxSeries(
      rows.map(r => ({ fluxWm2: r.fluxEarth })),
      { instrument: 'x' }
    );
    expect(
      (100 * (power.luminosityW - raw.luminosityW)) / power.luminosityW
    ).toBeCloseTo(1.79, 2);
    expect(raw.teffK).toBeCloseTo(5746, 0);
    expect(step('the-suns-power', 'forget-the-au').answer).toBe(0);
  });

  test('the fall over the six days: 4.04 at the Earth, 0.86 at 1 AU', () => {
    const at1 = r => r.fluxEarth * r.distanceAu ** 2;
    const earth = rows[0].fluxEarth - rows[5].fluxEarth;
    const au = at1(rows[0]) - at1(rows[5]);
    expect(earth).toBeCloseTo(4.04, 2);
    expect(au).toBeCloseTo(0.86, 2);
    holds(
      'the-suns-power',
      'the-fall-and-its-cause',
      { earth, au },
      { earth: 0.86, au: 4.04 }
    );
  });

  test('the mean’s uncertainty 0.15 W/m2 and 4.2e22 W, and the quoted one about twice as large', () => {
    holds(
      'the-suns-power',
      'how-sure-is-the-mean',
      { se: power.standardError, sl: power.sigmaLuminosityW / 1e22 },
      { se: 1, sl: 40 }
    );
    const quoted = rows.reduce((a, r) => a + r.sigma, 0) / rows.length;
    expect(quoted / power.standardError).toBeGreaterThan(1.8);
    expect(quoted / power.standardError).toBeLessThan(2.2);
    expect(step('the-suns-power', 'the-quoted-uncertainty').answer).toBe(0);
  });

  test('zeros are fill values, and the nominal agreement is to a thousandth of a percent', () => {
    expect(step('the-suns-power', 'zeros-are-not-data').answer).toBe(0);
    const diff = (100 * (power.luminosityW - 3.828e26)) / 3.828e26;
    expect(Math.abs(diff)).toBeLessThan(0.001);
    holds(
      'the-suns-power',
      'compare-with-the-nominal',
      { diff, dt: power.teffK - 5772 },
      { diff: 2, dt: 30 }
    );
  });
});

describe('the instruments', () => {
  let W;
  beforeAll(async () => {
    W = await import('../js/sunWidgets.js');
    W.provideSidecar(SIDE);
  });

  test('the same keys in English and Spanish, with the same placeholders', () => {
    expect(Object.keys(ES_SUN).sort()).toEqual(Object.keys(EN_SUN).sort());
    for (const k of Object.keys(EN_SUN)) {
      const placeholders = s =>
        (s.match(/\{[a-zA-Z0-9]+\}/g) ?? []).sort().join();
      expect(placeholders(ES_SUN[k])).toBe(placeholders(EN_SUN[k]));
    }
  });

  test('three instruments with the ids the family names', () => {
    expect(W.SUN_WIDGETS.map(w => w.id)).toEqual([
      'sun-frames',
      'sun-rotation',
      'sun-power',
    ]);
  });

  test('the two plotting instruments draw through the plot component and read out', () => {
    for (const w of W.SUN_WIDGETS.slice(1)) {
      const canvas = document.createElement('canvas');
      document.body.append(canvas);
      const spec = w.draw(canvas, {});
      expect(spec.series.length).toBeGreaterThanOrEqual(2);
      expect(spec.xTitle).toBeTruthy();
      expect(spec.yTitle).toBeTruthy();
      expect(canvas.style.display).toBe('none');
      const out = w.readout({});
      expect(out.length).toBeGreaterThan(5);
      for (const r of out) expect(String(r.value)).not.toMatch(/NaN|undefined/);
    }
  });

  test('the frames instrument: a position, the author’s marks, a limb warning, off-disc and the alternative text', () => {
    const frames = W.SUN_WIDGETS[0];
    const out = frames.readout({ day: 1, x: 452, y: 422 });
    expect(out.find(r => /Crosshair/.test(r.label)).value).toMatch(
      /latitude \+7\.1°/
    );
    expect(out.find(r => /Author’s mark of G1/.test(r.label)).value).toMatch(
      /longitude −7\.2°/
    );
    const alt = out[0].value;
    expect(alt).toMatch(/4 May 2024/);
    expect(alt).toMatch(new RegExp(`${SIDE.days[0].groupsRead} separate`));
    expect(alt).toMatch(/not NOAA/);
    expect(
      frames
        .readout({ day: 7, x: 957, y: 444 })
        .some(r => /Foreshortening/.test(r.value))
    ).toBe(true);
    expect(
      frames
        .readout({ day: 1, x: 5, y: 5 })
        .some(r => /Not on the Sun/.test(r.value))
    ).toBe(true);
  });

  test('the rotation instrument: the track, the equatorial fit and the refusal', () => {
    const rot = W.SUN_WIDGETS[1];
    const track = rot.readout({ group: 0, first: 1, last: 9, mode: 0 });
    expect(track.find(r => /Synodic rate/.test(r.label)).value).toMatch(
      /13\.17 ± 0\.06/
    );
    expect(track.find(r => /Sidereal period/.test(r.label)).value).toMatch(
      /25\.5 days/
    );
    const fit = rot.readout({ mode: 1 });
    expect(fit.find(r => /Equatorial term/.test(r.label)).value).toMatch(
      /13\.96 ± 0\.22/
    );
    const three = rot.readout({ mode: 2 });
    expect(three.some(r => /Refused/.test(r.value))).toBe(true);
    const limb = rot.readout({ group: 0, first: 1, last: 9, limb: 1 });
    expect(limb.some(r => /limb/.test(r.value))).toBe(true);
    const few = rot.readout({ group: 0, first: 1, last: 2 });
    expect(few.some(r => /No rate/.test(r.value))).toBe(true);
  });

  test('the power instrument: the chain, what the correction costs and the fill rows', () => {
    const pw = W.SUN_WIDGETS[2];
    const out = pw.readout({ days: 6, correct: 1 });
    expect(out.find(r => /luminosity/.test(r.label)).value).toMatch(
      /3\.828 × 10²⁶ W, ± 4\.2 × 10²² W/
    );
    expect(out.find(r => /fill|After/.test(r.label)).value).toMatch(
      /7 more rows/
    );
    const raw = pw.readout({ days: 6, correct: 0 });
    expect(raw.find(r => /costs/.test(r.label)).value).toMatch(/1\.8 percent/);
    const one = pw.readout({ days: 1, correct: 1 });
    expect(one.find(r => /luminosity/.test(r.label)).value).toMatch(/3\.829/);
  });

  test('before the sidecar arrives the instruments say so, never a number', () => {
    W.provideSidecar(null);
    for (const w of W.SUN_WIDGETS) {
      const out = w.readout({});
      expect(out).toHaveLength(1);
      expect(out[0].value).toMatch(/loading|could not be loaded/);
    }
    W.provideSidecar(SIDE);
  });
});
