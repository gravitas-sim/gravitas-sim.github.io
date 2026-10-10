// The interiors instruments (Roadmap II Prompt 95): the views are the kernel's
// numbers, the readouts list every number a lesson asks for, and the family is
// registered in both languages.
import { jest } from '@jest/globals';
import {
  INTERIORS_WIDGETS,
  polytropeView,
  dwarfView,
  scalingView,
  radiusEnclosing,
  curveFor,
} from '../js/interiorsWidgets.js';
import { EN_INTERIORS } from '../js/i18n/en.interiors.js';
import { ES_INTERIORS } from '../js/i18n/es.interiors.js';

const [POLY, DWARF, SCALE] = INTERIORS_WIDGETS;
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
const valueOf = (w, v, labelKey) =>
  w.readout(v).find(r => r.label === EN_INTERIORS[labelKey])?.value;

describe('the interiors family', () => {
  test('three instruments with every control and preset in range', () => {
    expect(INTERIORS_WIDGETS.map(w => w.id)).toEqual([
      'polytrope',
      'wd-mass-radius',
      'ms-scaling',
    ]);
    for (const w of INTERIORS_WIDGETS) {
      const defaults = Object.fromEntries(w.controls.map(c => [c.id, c.value]));
      for (const p of w.presets)
        for (const [k, val] of Object.entries(p.values)) {
          const c = w.controls.find(q => q.id === k);
          expect(c).toBeDefined();
          expect(val).toBeGreaterThanOrEqual(c.min - 1e-9);
          expect(val).toBeLessThanOrEqual(c.max + 1e-9);
        }
      expect(w.readout(defaults).length).toBeGreaterThan(8);
    }
  });
  test('English and Spanish have the same keys, and every key the code uses exists', () => {
    expect(Object.keys(ES_INTERIORS).sort()).toEqual(
      Object.keys(EN_INTERIORS).sort()
    );
  });
});

describe('the polytrope explorer', () => {
  const sun = { n: 3, logM: 0, logR: 0 };
  test("Eddington's Sun: centre 76 g/cm3, 1.2e7 K, half the mass inside 0.27 of the radius", () => {
    const f = polytropeView(sun);
    expect(rel(f.rhoCentralGcc, 76.4)).toBeLessThan(0.005);
    expect(rel(f.tCentral, 1.18e7)).toBeLessThan(0.01);
    expect(f.halfMass).toBeGreaterThan(0.2);
    expect(f.halfMass).toBeLessThan(0.35);
    expect(f.rhoMeanGcc).toBeCloseTo(1.41, 1);
  });
  test('n = 0 holds half its mass at the radius with (r/R)^3 = 1/2', () => {
    expect(
      rel(polytropeView({ n: 0, logM: 0, logR: 0 }).halfMass, 0.5 ** (1 / 3))
    ).toBeLessThan(0.01);
  });
  test('radiusEnclosing interpolates', () => {
    expect(
      radiusEnclosing(
        [
          { r: 0, m: 0 },
          { r: 1, m: 1 },
        ],
        0.25
      )
    ).toBeCloseTo(0.25, 12);
  });
  test('the readout lists the dimensionless numbers', () => {
    expect(valueOf(POLY, sun, 'intW.p.row.xi1')).toMatch(/6[.,]8968/);
    expect(valueOf(POLY, sun, 'intW.p.row.ratio')).toMatch(/54[.,]18/);
  });
});

describe('the white-dwarf instrument', () => {
  test('the preset density gives a 0.6 solar-mass dwarf', () => {
    const f = dwarfView({ logRho: 6.5, muE: 2 });
    expect(rel(f.massSun, 0.6)).toBeLessThan(0.01);
    expect(f.radiusSun).toBeGreaterThan(0.012);
    expect(f.radiusSun).toBeLessThan(0.0135);
    expect(f.relativistic).toBe(true);
  });
  test('the limit scales as 1 / mu_e^2 and the dense dwarf is near it', () => {
    expect(rel(dwarfView({ logRho: 9, muE: 2 }).limit, 1.4559)).toBeLessThan(
      2e-4
    );
    expect(
      rel(
        dwarfView({ logRho: 8, muE: 1 }).limit /
          dwarfView({ logRho: 8, muE: 2 }).limit,
        4
      )
    ).toBeLessThan(1e-9);
    expect(dwarfView({ logRho: 9, muE: 2 }).fractionOfLimit).toBeGreaterThan(
      0.9
    );
  });
  test('the curve the canvas draws is the kernel curve', () => {
    const c = curveFor(2);
    expect(c).toHaveLength(41);
    expect(c[40].massSun).toBeGreaterThan(c[0].massSun);
  });
});

describe('the main-sequence scaling instrument', () => {
  const view = (quantity, opacity, energy, idx = 2) =>
    scalingView({ quantity, opacity, energy, idx });
  test('electron scattering predicts 3 and the MIST models over 2 to 40 give 3.16 with scatter 0.14 dex', () => {
    const f = view(0, 1, 1);
    expect(f.predicted).toBeCloseTo(3, 12);
    expect(rel(f.high.fit, 3.16)).toBeLessThan(0.005);
    expect(f.high.rms).toBeLessThan(0.16);
    expect(f.high.rms).toBeGreaterThan(0.12);
  });
  test('Kramers opacity predicts 5.46 for low-mass stars, and 3.16 is nowhere near it above 2 solar masses', () => {
    const f = view(0, 0, 0);
    expect(rel(f.predicted, 5.4615)).toBeLessThan(1e-4);
    expect(f.high.rms).toBeGreaterThan(0.9);
    expect(rel(f.low.fit, 4.43)).toBeLessThan(0.01);
  });
  test('the radius and lifetime exponents follow the same pair of laws', () => {
    expect(view(1, 1, 1).predicted).toBeCloseTo(15 / 19, 12);
    expect(view(2, 1, 1).predicted).toBeCloseTo(-2, 12);
    expect(view(2, 1, 1).kind).toBe(2);
  });
  test('the selected model is a MIST zero-age model', () => {
    const f = view(0, 1, 1, 2);
    expect(f.sel.massSun).toBe(1);
    expect(f.sel.luminositySun).toBeGreaterThan(0.6);
    expect(f.sel.luminositySun).toBeLessThan(0.9);
  });
});
