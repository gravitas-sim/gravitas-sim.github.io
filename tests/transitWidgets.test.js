import { describe, test, expect } from '@jest/globals';
import {
  blockedFraction,
  separationAt,
  halfDuration,
} from '../js/transitWidgets.js';
import { getWidget, widgetDefaults } from '../js/widgets.js';

const WIDGET_IDS = [
  'depth-size',
  'geometry',
  'spectrum',
  'dilution',
  'resolve',
];

// The limb-darkening coefficients the module and the live light curve share.
// A planet on the center of the disk covers light this much brighter than the
// disk average, which is the whole point of the correction step in the lesson.
const CENTRE_BOOST = 1 / (1 - 0.4 / 3 - 0.26 / 6);

describe('blockedFraction', () => {
  test('nothing is blocked once the planet is off the disk', () => {
    expect(blockedFraction(1.2, 0.1)).toBe(0);
    expect(blockedFraction(5, 0.1)).toBe(0);
  });

  test('a central transit is deeper than the plain area ratio', () => {
    // This is the number the lesson asks students to divide out, so getting it
    // wrong would make the worked answer disagree with the simulation.
    const k = 0.12;
    expect(blockedFraction(0, k) / (k * k)).toBeCloseTo(CENTRE_BOOST, 1);
  });

  test('depth grows as the square of the radius ratio', () => {
    const small = blockedFraction(0, 0.05);
    const big = blockedFraction(0, 0.1);
    expect(big / small).toBeCloseTo(4, 0);
  });

  test('gets shallower as the planet moves towards the limb', () => {
    const k = 0.1;
    const center = blockedFraction(0, k);
    const mid = blockedFraction(0.5, k);
    const limb = blockedFraction(0.9, k);
    expect(center).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(limb);
  });

  test('a grazing planet blocks less than a fully overlapping one', () => {
    const k = 0.1;
    expect(blockedFraction(1.02, k)).toBeLessThan(blockedFraction(0.85, k));
    expect(blockedFraction(1.02, k)).toBeGreaterThan(0);
  });

  test('converges as the grid is refined', () => {
    const coarse = blockedFraction(0.3, 0.12, 20);
    const fine = blockedFraction(0.3, 0.12, 120);
    expect(Math.abs(coarse - fine) / fine).toBeLessThan(0.03);
  });
});

describe('separationAt', () => {
  test('equals the impact parameter at mid-transit', () => {
    expect(separationAt(0, 10, 0.4)).toBeCloseTo(0.4, 6);
    expect(separationAt(0, 10, 0)).toBeCloseTo(0, 6);
  });

  test('reaches the full orbit size a quarter of the way round', () => {
    expect(separationAt(Math.PI / 2, 12, 0.5)).toBeCloseTo(12, 6);
  });

  test('grows away from mid-transit', () => {
    const a = separationAt(0.01, 10, 0.2);
    const b = separationAt(0.05, 10, 0.2);
    expect(b).toBeGreaterThan(a);
  });
});

describe('halfDuration', () => {
  test('matches the standard expression for a central transit', () => {
    const A = 10;
    const k = 0.1;
    expect(halfDuration(A, 0, k)).toBeCloseTo(Math.asin((1 + k) / A), 6);
  });

  test('is zero when the planet misses the star', () => {
    expect(halfDuration(10, 1.5, 0.1)).toBe(0);
  });

  test('shortens as the impact parameter rises', () => {
    expect(halfDuration(10, 0.8, 0.1)).toBeLessThan(halfDuration(10, 0, 0.1));
  });

  test('a wider orbit gives a shorter transit as a fraction of the period', () => {
    expect(halfDuration(50, 0, 0.1)).toBeLessThan(halfDuration(10, 0, 0.1));
  });
});

describe('the widget registry', () => {
  test('every widget the lessons name exists and is complete', () => {
    for (const id of WIDGET_IDS) {
      const w = getWidget(id);
      expect(w).toBeTruthy();
      expect(typeof w.draw).toBe('function');
      expect(typeof w.readout).toBe('function');
      expect(w.controls.length).toBeGreaterThan(0);
      for (const c of w.controls) {
        expect(c.value).toBeGreaterThanOrEqual(c.min);
        expect(c.value).toBeLessThanOrEqual(c.max);
      }
    }
  });

  test('unknown ids return null rather than throwing', () => {
    expect(getWidget('not-a-widget')).toBeNull();
  });

  test('every preset only sets controls the widget has', () => {
    for (const id of WIDGET_IDS) {
      const w = getWidget(id);
      const known = new Set(w.controls.map(c => c.id));
      for (const pr of w.presets || []) {
        for (const key of Object.keys(pr.values))
          expect(known.has(key)).toBe(true);
      }
    }
  });

  test('every readout renders for every preset', () => {
    for (const id of WIDGET_IDS) {
      const w = getWidget(id);
      for (const pr of w.presets || []) {
        const values = widgetDefaults(w, pr.values);
        const rows = w.readout(values);
        expect(rows.length).toBeGreaterThan(0);
        for (const r of rows) {
          expect(typeof r.value).toBe('string');
          expect(r.value).not.toMatch(/NaN|undefined/);
        }
      }
    }
  });

  test('widgetDefaults applies overrides and ignores unknown keys', () => {
    const w = getWidget('dilution');
    const v = widgetDefaults(w, { dm: 3, nonsense: 9 });
    expect(v.dm).toBe(3);
    expect('nonsense' in v).toBe(false);
    expect(v.rp).toBe(w.controls.find(c => c.id === 'rp').value);
  });
});

describe('depth and size', () => {
  const w = getWidget('depth-size');

  test('an Earth in front of the Sun is about 84 parts per million', () => {
    const { depth } = w.compute({ rp: 1, rs: 1 });
    expect(depth * 1e6).toBeGreaterThan(75);
    expect(depth * 1e6).toBeLessThan(95);
  });

  test('a Jupiter in front of the Sun is about 1%', () => {
    const { depth } = w.compute({ rp: 11.2, rs: 1 });
    expect(depth).toBeGreaterThan(0.009);
    expect(depth).toBeLessThan(0.012);
  });

  test('the same planet in front of TRAPPIST-1 is far deeper', () => {
    const sun = w.compute({ rp: 1, rs: 1 }).depth;
    const dwarf = w.compute({ rp: 1, rs: 0.1192 }).depth;
    // Shrinking the star by 8.4 lifts the depth by its square.
    expect(dwarf / sun).toBeCloseTo(1 / 0.1192 ** 2, -1);
  });
});

describe('geometry', () => {
  const w = getWidget('geometry');

  test('an edge-on orbit is 90 degrees', () => {
    expect(w.compute({ b: 0, aOverR: 10, k: 0.1 }).inclination).toBeCloseTo(
      90,
      6
    );
  });

  test('transit probability is (1 + k) / (a / Rstar)', () => {
    const c = w.compute({ b: 0, aOverR: 215, k: 0.00916 });
    expect(1 / c.probability).toBeCloseTo(213, -1);
  });

  test('reports no transit once the planet clears the disk', () => {
    expect(w.compute({ b: 1.3, aOverR: 8.8, k: 0.12 }).transits).toBe(false);
    expect(w.compute({ b: 0, aOverR: 8.8, k: 0.12 }).transits).toBe(true);
  });

  test('flags the grazing case, where depth stops measuring the radius', () => {
    expect(w.compute({ b: 1.05, aOverR: 8.8, k: 0.12 }).grazing).toBe(true);
    expect(w.compute({ b: 0.5, aOverR: 8.8, k: 0.12 }).grazing).toBe(false);
  });
});

describe('transmission spectrum', () => {
  const w = getWidget('spectrum');

  test('a molecular band sits above the continuum', () => {
    const c = w.compute({ lambda: 1.4, clouds: 0, H: 560 });
    expect(c.here.depth).toBeGreaterThan(c.flat);
    expect(c.here.strongest.name).toBe('water');
  });

  test('names the absorber at the sodium line', () => {
    const c = w.compute({ lambda: 0.589, clouds: 0, H: 560 });
    expect(c.here.strongest.name).toBe('sodium');
  });

  test('clouds flatten the features', () => {
    const clear = w.compute({ lambda: 1.4, clouds: 0, H: 560 }).here.depth;
    const cloudy = w.compute({ lambda: 1.4, clouds: 1, H: 560 }).here.depth;
    const clearBase = w.compute({ lambda: 2.05, clouds: 0, H: 560 }).here.depth;
    const cloudyBase = w.compute({ lambda: 2.05, clouds: 1, H: 560 }).here
      .depth;
    expect(clear - clearBase).toBeGreaterThan(cloudy - cloudyBase);
  });

  test('a larger scale height makes the features bigger', () => {
    const small = w.compute({ lambda: 1.4, clouds: 0, H: 200 });
    const big = w.compute({ lambda: 1.4, clouds: 0, H: 800 });
    expect(big.here.depth - big.flat).toBeGreaterThan(
      small.here.depth - small.flat
    );
  });

  test('the feature is a few hundred ppm on a depth of order 1.5%', () => {
    const c = w.compute({ lambda: 1.4, clouds: 0, H: 560 });
    const excess = (c.here.depth - c.flat) * 1e6;
    expect(excess).toBeGreaterThan(100);
    expect(excess).toBeLessThan(3000);
  });
});

describe('resolving the pair', () => {
  const w = getWidget('resolve');

  test('a companion inside the seeing disk reads as one source', () => {
    const c = w.compute({ fwhm: 1.1, sep: 0.65, dm: 1.5 });
    expect(c.look).toBe('blended');
  });

  test('adaptive optics splits the same pair', () => {
    expect(w.compute({ fwhm: 0.15, sep: 0.65, dm: 1.5 }).look).toBe('split');
  });

  test('speckle imaging reaches closer still', () => {
    expect(w.compute({ fwhm: 0.15, sep: 0.1, dm: 1.5 }).look).toBe('blended');
    expect(w.compute({ fwhm: 0.04, sep: 0.1, dm: 1.5 }).look).toBe('split');
  });

  test('reports the same dilution correction as the dilution widget', () => {
    // Both are the same physics; a student moving between the two steps must
    // not be shown two different numbers for the same contrast.
    const a = w.compute({ fwhm: 0.15, sep: 0.5, dm: 0.5 });
    const b = getWidget('dilution').compute({ dm: 0.5, rp: 1 });
    expect(a.correction).toBeCloseTo(b.correction, 9);
    expect(a.companionLight).toBeCloseTo(b.companionLight, 9);
  });

  test('the frame is a small part of one TESS pixel', () => {
    const c = w.compute({ fwhm: 0.15, sep: 0.5, dm: 2 });
    expect(c.pixelFraction).toBeGreaterThan(0.01);
    expect(c.pixelFraction).toBeLessThan(0.03);
  });
});

describe('dilution by a companion', () => {
  const w = getWidget('dilution');

  test('an equal twin costs a factor of root two in radius', () => {
    const c = w.compute({ dm: 0, rp: 2 });
    expect(c.f).toBeCloseTo(1, 6);
    expect(c.correction).toBeCloseTo(Math.SQRT2, 6);
    expect(c.truePlanet).toBeCloseTo(2 * Math.SQRT2, 6);
  });

  test('half a magnitude matches the blended scenario', () => {
    // The Blended Binary scenario sets exactly this contrast, and the depth
    // ratio a student measures there has to come back to it.
    const c = w.compute({ dm: 0.5, rp: 1 });
    expect(c.f).toBeCloseTo(0.631, 3);
    expect(1 + c.f).toBeCloseTo(1.6309, 3);
    expect(c.correction).toBeCloseTo(1.2771, 3);
  });

  test('a faint companion barely matters', () => {
    expect(w.compute({ dm: 6, rp: 2 }).correction).toBeLessThan(1.003);
  });

  test('reports when a correction crosses the rocky boundary', () => {
    const rows = w.readout({ dm: 0.5, rp: 1.5 });
    const verdict = rows.find(r => r.label.includes('rocky'));
    expect(verdict.value).toMatch(/until you corrected/);
  });
});
