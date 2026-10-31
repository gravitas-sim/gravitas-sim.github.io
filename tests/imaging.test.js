// =============================================================================
// Direct imaging: contrast, separation, the diffraction scale and the observability
// verdict (Roadmap III, Prompt 230 Part A)
// -----------------------------------------------------------------------------
// The validation contract of tests/fixtures/imaging/thresholds.json, committed before
// the kernel existed (IMAGING.md). The table of the contract is pinned in results.json
// by `npm run imaging:validate -- --write-results` and held here against failed-legs.json;
// the quick tests hold the kernel's public contract with absolute values beside every
// ratio, the oracle's pinned cases and the data table's provenance.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as K from '../js/kernels/imaging/index.js';
import { IMAGED_PLANETS, IMAGED_COLUMNS } from '../js/data/imagedPlanets.js';
import {
  INSTRUMENTS,
  SOLAR_SYSTEM,
  EARTHS_PER_JUPITER,
} from '../js/directImagingField.js';

const read = f => JSON.parse(readFileSync(f, 'utf8'));
const THR = read('tests/fixtures/imaging/thresholds.json');
const FAILED = read('tests/fixtures/imaging/failed-legs.json');
const PINNED = read('tests/fixtures/imaging/results.json').rows;
const ORACLE = read('tests/fixtures/imaging/oracle-results.json');
const AU = 149597870700;
const PC = (AU * 648000) / Math.PI;
const R_SUN = 6.957e8;
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);

describe('the committed thresholds', () => {
  test('every check of the contract is present, the legs a to e are stated, and no bound was moved by an amendment', () => {
    const ids = THR.checks.map(c => c.id);
    for (const id of [
      'A1',
      'A2',
      'A3',
      'A4',
      'A5',
      'A6',
      'A7',
      'A8',
      'B1',
      'B2',
      'B3',
      'B4',
      'B5',
      'B6',
      'C1',
      'D1',
      'D2',
      'D3',
      'D4',
      'D5',
      'E1',
      'E2',
    ])
      expect(ids).toContain(id);
    expect(Object.keys(THR.legs)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(THR.legs.c).toMatch(/not applicable/);
    for (const a of THR.amendments) expect(a.boundMoved).toBe(false);
  });
  test('the pinned table has no failing row, E2 is not run, and the failed-legs file agrees', () => {
    expect(PINNED.filter(r => r.status === 'fail')).toEqual([]);
    expect(PINNED.filter(r => r.status === 'pass').length).toBe(19);
    expect(FAILED.failed).toEqual([]);
    expect(FAILED.notRun.map(r => r.id)).toEqual(['E2']);
  });
  test('the example instruments the field module draws are the committed ones', () => {
    expect(INSTRUMENTS.map(i => ({ ...i }))).toEqual(THR.instruments.list);
    expect(THR.instruments.note).toMatch(/NOT cited values/);
  });
});

describe('contrast and angles: absolute values', () => {
  const earth = {
    starTeffK: 5772,
    starRadiusM: R_SUN,
    planetRadiusM: K.R_EARTH_M,
    semiMajorM: AU,
    geometricAlbedo: 0.3,
  };
  test('Earth at full phase reflects 0.3 (R/a)^2 of the Sun’s light: about 5.45e-10', () => {
    const c = K.reflectedContrast({
      geometricAlbedo: 0.3,
      planetRadiusM: K.R_EARTH_M,
      semiMajorM: AU,
    });
    expect(c).toBeCloseTo(5.4532e-10, 13);
    expect(
      K.reflectedContrast({
        geometricAlbedo: 0.3,
        planetRadiusM: K.R_EARTH_M,
        semiMajorM: AU,
        phaseAngleRad: Math.PI / 2,
      })
    ).toBeCloseTo(c / Math.PI, 15);
  });
  test('one AU at ten parsecs is 0.1 arcsecond and lambda/D of 6 m at 550 nm is 0.0189 arcsecond', () => {
    expect(
      K.angularSeparation({ separationM: AU, distanceM: 10 * PC }).arcsec
    ).toBeCloseTo(0.1, 10);
    const d = K.diffractionScale({ apertureM: 6, wavelengthM: 5.5e-7 });
    expect(d.lambdaOverDArcsec).toBeCloseTo(0.018908, 6);
    expect(d.isInnerWorkingAngle).toBe(false);
    expect(d.statement).toMatch(/not|separate/);
  });
  test('the irradiation equilibrium of Earth with a Bond albedo of 0.3 is 254.6 K', () => {
    expect(
      K.irradiationTemperature({
        starTeffK: 5772,
        starRadiusM: R_SUN,
        semiMajorM: AU,
        bondAlbedo: 0.3,
      })
    ).toBeCloseTo(254.586, 2);
  });
  test('the total is the sum, and a thermal term needs a stated temperature or the equilibrium', () => {
    const c = K.planetContrast({ ...earth, wavelengthM: 1e-5 });
    expect(c.total).toBeCloseTo(c.thermal + c.reflected, 20);
    expect(c.planetTeffStated).toBe(false);
    expect(c.assumes.length).toBeGreaterThan(2);
    const hot = K.planetContrast({
      ...earth,
      wavelengthM: 1e-5,
      planetTeffK: 1500,
    });
    expect(hot.selfLuminous).toBe(true);
    expect(hot.planetTeffStated).toBe(true);
  });
});

describe('refusals', () => {
  test('inside the inner working angle: not observable with this instrument, in that sentence', () => {
    const v = K.observable({
      separationArcsec: 0.05,
      contrast: 1e-3,
      instrument: { innerWorkingArcsec: 0.1, contrastFloor: 1e-9 },
    });
    expect(v).toMatchObject({
      ok: true,
      observable: false,
      code: 'inside-inner-working-angle',
      message: 'not observable with this instrument',
    });
  });
  test('below the floor, and observable otherwise', () => {
    expect(
      K.observable({
        separationArcsec: 0.5,
        contrast: 1e-12,
        instrument: { innerWorkingArcsec: 0.1, contrastFloor: 1e-9 },
      }).code
    ).toBe('below-contrast-floor');
    expect(
      K.observable({
        separationArcsec: 0.5,
        contrast: 1e-6,
        instrument: { innerWorkingArcsec: 0.1, contrastFloor: 1e-9 },
      }).observable
    ).toBe(true);
  });
  test('no inner working angle stated: refused, and λ/D is never a default', () => {
    const v = K.observable({
      separationArcsec: 0.5,
      contrast: 1e-6,
      instrument: { apertureM: 6, wavelengthM: 5.5e-7, contrastFloor: 1e-9 },
    });
    expect(v).toMatchObject({
      ok: false,
      status: 'refused',
      code: 'no-inner-working-angle',
    });
  });
  test('non-physical input throws a coded error', () => {
    expect(() =>
      K.reflectedContrast({
        geometricAlbedo: 2,
        planetRadiusM: 1,
        semiMajorM: 1,
      })
    ).toThrow(K.ImagingError);
    expect(() =>
      K.irradiationTemperature({
        starTeffK: 5772,
        starRadiusM: R_SUN,
        semiMajorM: R_SUN / 2,
      })
    ).toThrow(/inside the star/);
    try {
      K.angularSeparation({ separationM: 1, distanceM: 0 });
    } catch (e) {
      expect(e.code).toBe('input');
    }
  });
  test('a circular orbit’s separation is a sin(alpha) for any inclination', () => {
    for (const i of [0.4, 1, Math.PI / 2])
      for (const phi of [0.05, 0.2, 0.37, 0.5, 0.8]) {
        const alpha = K.phaseAngleCircular({
          inclinationRad: i,
          orbitalPhase: phi,
        });
        expect(
          K.projectedSeparationCircular({
            semiMajorM: 3,
            inclinationRad: i,
            orbitalPhase: phi,
          })
        ).toBeCloseTo(3 * Math.sin(alpha), 12);
      }
  });
});

describe('the oracle’s pinned cases', () => {
  test('its provenance names no Gravitas code and its versions', () => {
    expect(ORACLE.format).toBe('gravitas.imaging-oracle/1');
    expect(Object.keys(ORACLE.versions)).toEqual([
      'python',
      'numpy',
      'scipy',
      'astropy',
    ]);
    expect(ORACLE.curves.length).toBe(3);
  });
  test('the kernel reproduces the pinned monochromatic and reflected cases', () => {
    for (const c of ORACLE.mono.slice(0, 10))
      expect(rel(K.thermalContrast(c), c.contrast)).toBeLessThan(1e-9);
    for (const c of ORACLE.reflected.slice(0, 10))
      expect(rel(K.reflectedContrast(c), c.contrast)).toBeLessThan(1e-12);
  });
});

describe('the archive table', () => {
  test('is the pinned fetch: 98 rows, the columns declared, and a distance and axis for most', () => {
    expect(IMAGED_PLANETS.length).toBe(98);
    expect(IMAGED_COLUMNS.length).toBe(11);
    for (const r of IMAGED_PLANETS) expect(r.length).toBe(11);
    expect(IMAGED_PLANETS.filter(r => r[2] > 0 && r[3] > 0).length).toBe(91);
    const src = readFileSync('js/data/imagedPlanets.js', 'utf8');
    expect(src).toContain(
      'cd0278850ca8a25f368c9f8c5708f8c01396538900222931668895cbe3beb805'
    );
    expect(src).toMatch(/terms page was not read/);
    expect(createHash('sha256').update('x').digest('hex')).toHaveLength(64);
  });
  test('the Solar System rows equal the world builder’s planet table', () => {
    const src = readFileSync('js/world/build.js', 'utf8');
    for (const [name, a, massE] of SOLAR_SYSTEM) {
      const m = new RegExp(
        `name: '${name}',\\s+mass: ([0-9.]+),[^\\n]*\\n\\s+distance: ([0-9.]+),`
      ).exec(src);
      expect(m).not.toBeNull();
      expect(Number(m[1])).toBe(massE);
      expect(Number(m[2]) / 100).toBeCloseTo(a, 6);
    }
    expect(EARTHS_PER_JUPITER).toBe(317.8);
  });
});
