/**
 * @jest-environment jsdom
 */
import { describeSlope, formatExponent } from '../js/rotationCurve.js';

// The panel module reaches into physics.js and the DOM for everything else, so
// what is unit-testable here is the part that turns a number into a claim.
// The physics itself is covered by tests/darkMatter.test.js, and the live
// behaviour of the panel against real scenarios is verified in the browser.

describe('describeSlope', () => {
  test('the Solar System reads as Keplerian', () => {
    // Measured on the running app: the Solar System returns exactly -0.500.
    expect(describeSlope(-0.5).label).toBe('Keplerian');
  });

  test('a galaxy built on visible mass alone also reads as Keplerian', () => {
    // The Spiral Galaxy scenario measures -0.447. It is not -0.5 because the
    // disc carries mass of its own, and the band has to be wide enough to call
    // that what it is, or the lesson's first measurement contradicts its own
    // prediction step.
    expect(describeSlope(-0.447).label).toBe('Keplerian');
  });

  test('the observed galaxy reads as Flat', () => {
    // Milky Way Rotation measures +0.018.
    expect(describeSlope(0.018).label).toBe('Flat');
    expect(describeSlope(0).label).toBe('Flat');
  });

  test('the bands meet without a gap and without overlapping', () => {
    // A slope must always get exactly one verdict: a gap would leave the panel
    // with nothing to say, and an overlap would make the verdict depend on the
    // order the branches happen to be written in.
    let previous = null;
    const seen = [];
    for (let e = -1.2; e <= 1.2; e += 0.005) {
      const label = describeSlope(e).label;
      expect(label).not.toBe('—');
      if (label !== previous) {
        // Each label may begin exactly once, or the bands are not contiguous.
        expect(seen).not.toContain(label);
        seen.push(label);
        previous = label;
      }
    }
    expect(seen).toEqual(['Keplerian', 'Falling', 'Flat', 'Rising']);
  });

  test('no fit at all is reported as no fit, not as flat', () => {
    // Zero bodies and a genuinely flat curve are different findings, and
    // rendering the first as the second would invent a measurement.
    for (const v of [null, undefined, NaN, Infinity]) {
      expect(describeSlope(v).label).toBe('—');
    }
  });

  test('every verdict carries a reason a student can act on', () => {
    for (const e of [-0.5, -0.25, 0, 0.5, null]) {
      const d = describeSlope(e);
      expect(d.detail.length).toBeGreaterThan(30);
    }
  });

  test('the detail for a flat curve says mass is still being added', () => {
    // This is the inference the whole lesson turns on, so it is worth pinning:
    // an edit that softened this into "the curve is flat" would drop the point.
    expect(describeSlope(0).detail).toMatch(/mass/i);
    expect(describeSlope(0).detail).toMatch(/further out/i);
  });
});

describe('formatExponent', () => {
  test('reads a Keplerian slope back as it is spoken', () => {
    expect(formatExponent(-0.5)).toBe('⁻0.50');
    expect(formatExponent(-0.447)).toBe('⁻0.45');
  });

  test('a near-zero exponent is 0.00, not scientific notation', () => {
    // -7.36e-4 used to render as "r to the minus 7.36 x 10^-4", which is the
    // worst possible way to present "this curve is flat".
    expect(formatExponent(-0.000736)).toBe('⁺0.00');
    expect(formatExponent(0.0002)).toBe('⁺0.00');
    expect(formatExponent(0)).toBe('⁺0.00');
  });

  test('never prints a negative zero', () => {
    expect(formatExponent(-1e-9)).not.toContain('⁻');
  });

  test('always two decimals, so the readout does not jitter in width', () => {
    for (const v of [-0.5, -0.45, 0.018, 0.2, 1]) {
      expect(formatExponent(v)).toMatch(/^[⁺⁻]\d+\.\d{2}$/);
    }
  });
});
