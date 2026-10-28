// =============================================================================
// The habitable-zone kernel (Prompt 205, part A)
// -----------------------------------------------------------------------------
// tests/fixtures/habitable-zone-ii/thresholds.json fixed every bound before
// js/kernels/habitablezone/ had been run. tools/habitable-zone-validate.mjs
// judges the kernel against them; this file holds every row, and adds what a
// row cannot say: the kernel refuses where js/habitability.js clamps, calls the
// tides kernel for the locking time instead of repeating it, says what it
// leaves out, and imports nothing that reads a page. The oracle fixtures are the
// ones their provenance record describes.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import {
  runValidation,
  THRESHOLDS,
} from '../tools/habitable-zone-validate.mjs';
import * as K from '../js/kernels/habitablezone/index.js';
import {
  AGE_NOTE,
  zoneAtAge,
  zonesAtAges,
} from '../js/kernels/habitablezone/age.js';
import { lockingTime } from '../js/kernels/tides/tides.js';
import * as H from '../js/habitability.js';
import {
  AU_METERS,
  EARTH_MASS_KG,
  EARTH_RADIUS_M,
  SOLAR_MASS_KG,
} from '../js/constants.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = p => readFileSync(path.join(ROOT, p));

describe('the committed thresholds hold for the production module', () => {
  const rows = runValidation();

  test('every committed row passes', () => {
    const failing = rows.filter(r => r.pass === false);
    expect(
      failing.map(
        r => `${r.id}: ${r.measured} against ${JSON.stringify(r.bound)}`
      )
    ).toEqual([]);
    expect(rows.length).toBeGreaterThan(55);
  });

  test('tier c and the escape row are stated as not applicable, and nothing else is skipped', () => {
    expect(rows.filter(r => r.pass === null).map(r => r.id)).toEqual([
      'b5.escape',
      'c.ensemble',
    ]);
  });

  test('every check in the fixture has at least one row', () => {
    const ids = new Set(rows.map(r => r.id));
    const tiers = new Set(rows.map(r => r.id.split('.')[0]));
    for (const id of Object.keys(THRESHOLDS.checks)) {
      expect(tiers.has(id.split('.')[0])).toBe(true);
    }
    for (const id of ['b3.zams', 'b3.model-star', 'b3.movement']) {
      expect(ids.has(id)).toBe(true);
    }
    expect([...ids].some(id => id.startsWith('b3.ratio.'))).toBe(true);
  });

  test('no failed legs are recorded, because none failed', () => {
    expect(rows.filter(r => r.pass === false)).toEqual([]);
  });
});

describe('the oracle fixtures are the ones the provenance record describes', () => {
  const prov = JSON.parse(
    read('tests/fixtures/habitable-zone-ii/oracle-provenance.json')
  );
  test.each(Object.entries(prov.files))('%s', (file, sha) => {
    expect(createHash('sha256').update(read(file)).digest('hex')).toBe(sha);
  });
});

describe('the domain is enforced, not clamped', () => {
  test('TRAPPIST-1 (2566 K) is refused by the kernel and clamped, flagged, by the module the ring reads', () => {
    expect(() =>
      K.zoneLimits({ luminositySolar: 0.000553, teffK: 2566 })
    ).toThrow(K.HabitableZoneError);
    const old = H.habitableZoneBounds({
      luminositySolar: 0.000553,
      teffK: 2566,
    });
    expect(old.extrapolated).toBe(true);
  });

  test('a refusal carries a code and the numbers to say it with', () => {
    try {
      K.zoneLimits({ luminositySolar: 1, teffK: 8000 });
      throw new Error('returned');
    } catch (e) {
      expect(e).toBeInstanceOf(K.HabitableZoneError);
      expect(e.code).toBe('teff-domain');
      expect(e.detail).toEqual({ teffK: 8000, min: 2600, max: 7200 });
    }
  });

  test('the domain is the one the thresholds file states', () => {
    expect([K.HZ_TEFF_DOMAIN.min, K.HZ_TEFF_DOMAIN.max]).toEqual(
      THRESHOLDS.domain.teffK
    );
  });

  test('every code a refusal uses is in the committed list', () => {
    const allowed = new Set([
      ...THRESHOLDS.domain.refusalCodes,
      ...THRESHOLDS.domain.reusedFromTides,
    ]);
    const used = runValidation().filter(r => r.id === 'd.refusals.hostile');
    expect(used[0].pass).toBe(true);
    for (const code of ['teff-domain', 'band', 'age-domain', 'q-range']) {
      expect(allowed.has(code)).toBe(true);
    }
  });
});

describe('what the kernel says it leaves out', () => {
  test('a zone names its model, the parameterisation and what it does not model', () => {
    const z = K.zoneLimits({ luminositySolar: 1, teffK: 5780 });
    expect(z.model).toMatch(/limits/);
    expect(z.assumes.join(' ')).toMatch(/no clouds/);
    expect(z.parameterisation.citation).toMatch(/Kopparapu/);
    expect(Object.keys(z.limits)).toEqual(K.LIMIT_KEYS);
    expect(z.limits.runawayGreenhouse.kind).toBe('model');
    expect(z.limits.recentVenus.kind).toBe('empirical');
    expect(z.limits.earlyMars.kind).toBe('empirical');
    expect(z.limits.maximumGreenhouse.kind).toBe('model');
  });

  test('the flux stays in view: every limit carries its flux in Earth units and in watts per square metre', () => {
    const z = K.zoneLimits({ luminositySolar: 1, teffK: 5780 });
    expect(z.limits.runawayGreenhouse.flux).toBeCloseTo(1.0385, 12);
    expect(z.limits.runawayGreenhouse.fluxWm2).toBeCloseTo(1.0385 * 1361, 9);
  });

  test('a zone read along a track says it is a model star', () => {
    const r = zoneAtAge({ trackId: 'm100', ageYr: 4.57e9 });
    expect(r.note).toBe(AGE_NOTE);
    expect(r.note).toMatch(/not a named star/);
    expect(r.star.luminositySolar).toBeGreaterThan(1.05);
    // Earth at 1 AU is inside the model star's runaway-greenhouse edge, which
    // is why the note exists
    expect(r.zone.limits.runawayGreenhouse.distanceAU).toBeGreaterThan(1);
  });

  test('a locking radius names its model and its caveats, and a range brackets it', () => {
    const r = K.lockingRadius({ starMassSun: 1, ageYr: 4.5e9 });
    expect(r.model).toMatch(/constant-Q/);
    expect(r.assumes.join(' ')).toMatch(/Mercury/);
    const rg = K.lockingRadiusRange({ starMassSun: 1, ageYr: 4.5e9 });
    expect(rg.lowAU).toBeLessThan(r.radiusAU);
    expect(rg.highAU).toBeGreaterThan(r.radiusAU);
  });
});

describe('what the kernel reuses', () => {
  test('the locking time at the returned radius is the tides kernel lockingTime, not a copy', () => {
    const p = { starMassSun: 0.5, ageYr: 3e9, k2: 0.2, Q: 60 };
    const r = K.lockingRadius(p);
    const t = lockingTime({
      perturberMass: 0.5 * SOLAR_MASS_KG,
      satelliteMass: EARTH_MASS_KG,
      satelliteRadius: EARTH_RADIUS_M,
      semiMajorAxis: r.radiusAU * AU_METERS,
      k2: 0.2,
      Q: 60,
      spin: (2 * Math.PI) / (10 * 3600),
    }).years;
    expect(Math.abs(t - 3e9) / 3e9).toBeLessThan(1e-12);
  });

  test('a tides refusal comes through under the tides code', () => {
    expect(() => K.lockingRadius({ starMassSun: 1, ageYr: 1e9, Q: 1 })).toThrow(
      expect.objectContaining({ code: 'q-range' })
    );
  });

  test('the kernel agrees with the panel module at every temperature of the domain, to the last bit', () => {
    for (let t = 2600; t <= 7200; t += 50) {
      for (const key of K.LIMIT_KEYS) {
        expect(K.limitFlux(key, t)).toBe(H.effectiveFluxAt(key, t));
      }
    }
  });

  test('the zone at an age is the limits applied to the track state', () => {
    const [a, b, c] = zonesAtAges({
      trackId: 'm100',
      agesYr: THRESHOLDS.ages.years,
    });
    for (const r of [a, b, c]) {
      const again = K.zoneLimits({
        luminositySolar: r.star.luminositySolar,
        teffK: r.star.teffK,
      });
      expect(r.zone.conservative).toEqual(again.conservative);
    }
  });
});

describe('the physics a reader can check by hand', () => {
  test('the Sun, today: 0.98 to 1.69 AU conservative, 0.75 to 1.77 optimistic', () => {
    const z = K.zoneLimits({ luminositySolar: 1, teffK: 5780 });
    expect(z.conservative.innerAU).toBeCloseTo(0.9813, 3);
    expect(z.conservative.outerAU).toBeCloseTo(1.6886, 3);
    expect(z.optimistic.innerAU).toBeCloseTo(0.7503, 3);
    expect(z.optimistic.outerAU).toBeCloseTo(1.7658, 3);
  });

  test('a planet at the runaway edge receives the runaway flux (the inverse-square law both ways)', () => {
    const z = K.zoneLimits({ luminositySolar: 0.04, teffK: 3800 });
    expect(
      K.fluxAtDistance(0.04, z.limits.runawayGreenhouse.distanceAU)
    ).toBeCloseTo(z.limits.runawayGreenhouse.flux, 12);
  });

  test('an eccentric orbit receives more than a circle of the same a, by 1/sqrt(1 - e^2)', () => {
    const r = K.orbitFluxes({
      luminositySolar: 1,
      semiMajorAU: 1,
      eccentricity: 0.6,
    });
    expect(r.meanFlux / r.circularFlux).toBeCloseTo(
      1 / Math.sqrt(1 - 0.36),
      12
    );
    expect(r.fluxRatio).toBeCloseTo(((1 + 0.6) / (1 - 0.6)) ** 2, 12);
  });

  test('time, not arc: an eccentric planet spends most of its year beyond a, so the band inside a holds less than half', () => {
    const f = K.fractionOfYearInBand({
      semiMajorAU: 1,
      eccentricity: 0.5,
      innerAU: 0,
      outerAU: 1,
    });
    // Kepler: M at r = a is E = pi/2, M = pi/2 - e, so the fraction is that over pi
    expect(f).toBeCloseTo((Math.PI / 2 - 0.5) / Math.PI, 12);
    expect(f).toBeLessThan(0.5);
  });

  test('the locking radius is larger for a heavier star, an older system and a more dissipative planet', () => {
    const base = { starMassSun: 0.5, ageYr: 2e9 };
    const r = K.lockingRadius(base).radiusAU;
    expect(
      K.lockingRadius({ ...base, starMassSun: 1 }).radiusAU
    ).toBeGreaterThan(r);
    expect(K.lockingRadius({ ...base, ageYr: 8e9 }).radiusAU).toBeGreaterThan(
      r
    );
    expect(K.lockingRadius({ ...base, Q: 20 }).radiusAU).toBeGreaterThan(r);
  });

  test('a planet exactly on a locking radius is not inside it', () => {
    const p = { starMassSun: 1, ageYr: 4.5e9 };
    expect(K.lockedWithinAge(p, K.lockingRadius(p).radiusAU * 0.99)).toBe(true);
    expect(K.lockedWithinAge(p, K.lockingRadius(p).radiusAU * 1.01)).toBe(
      false
    );
  });
});

describe('the kernel is a kernel', () => {
  const dir = path.join(ROOT, 'js/kernels/habitablezone');
  const files = readdirSync(dir);

  test.each(files)(
    '%s imports nothing that reads a page, a catalogue or a clock',
    f => {
      const src = readFileSync(path.join(dir, f), 'utf8');
      const imports = [...src.matchAll(/from '([^']+)'/g)].map(m => m[1]);
      for (const i of imports) {
        expect(i).not.toMatch(/i18n|document|widget|render|ui\.js|format\.js/);
      }
      expect(src).not.toMatch(
        /\b(document|window|Date\.now|performance\.now|Math\.random)\b/
      );
    }
  );

  test('only age.js reaches the track data', () => {
    const reach = files.filter(f =>
      /stellar\/tracks/.test(readFileSync(path.join(dir, f), 'utf8'))
    );
    expect(reach).toEqual(['age.js']);
  });

  test('the kernel is never precached: nothing installs it before a page imports it', () => {
    const src = read('tools/build-service-worker.mjs').toString();
    expect(src).toMatch(/\^js\\\/kernels\\\/habitablezone\\\//);
  });
});
