// =============================================================================
// The leading-order inspiral, checked against numbers it does not contain
// -----------------------------------------------------------------------------
// A test that recomputes the implementation's own formula and compares the two
// proves that multiplication works. Everything below is either an independently
// published value, an exact analytic limit, or a scaling law that follows from
// the equations without evaluating them - which is the only kind of check that
// would notice a transcription error in an exponent.
//
// The anchors, and where they come from:
//
//   134 Hz          f_gw one second before coalescence for a 1.21 Msun chirp
//                   mass. The number quoted in the standard references for a
//                   1.4 + 1.4 Msun binary.
//   4397 Hz         the Schwarzschild ISCO gravitational-wave frequency for
//                   one solar mass.
//   1/sqrt(6)       the orbital velocity parameter at that ISCO, exactly.
//   3 Rs            the separation there, exactly - the ISCO sits at 6 GM/c^2.
//   (8/5) f tau     the cycles remaining, an identity that follows from the
//                   phase and frequency solutions independently of either.
//   ~3700 cycles    a GW170817-like binary from 24 Hz, against the ~3000
//                   usually quoted for the real event.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import {
  C,
  T_SUN,
  L_SUN,
  MPC,
  chirpMass,
  symmetricMassRatio,
  iscoFrequency,
  velocityParameter,
  timeToCoalescence,
  frequencyAt,
  phaseAt,
  cyclesRemaining,
  strainAmplitude,
  inclinationFactors,
  effectiveDistance,
  separationMetres,
  separationInSchwarzschildRadii,
  fidelityBand,
} from '../js/gw/waveform.js';

const close = (a, b, rel) => Math.abs(a - b) / Math.abs(b) < rel;

describe('constants are the published ones', () => {
  test('a solar mass in seconds is 4.9255 microseconds', () => {
    expect(T_SUN).toBeCloseTo(4.925490947e-6, 15);
  });

  test('a solar mass in metres follows from it and c', () => {
    expect(L_SUN).toBeCloseTo(1476.625, 3);
  });

  test('a megaparsec is the IAU parsec times a million', () => {
    expect(MPC / 1e6).toBeCloseTo(3.085677581491367e16, 6);
  });

  test('c is exact', () => {
    expect(C).toBe(299792458);
  });
});

describe('chirp mass', () => {
  test('equals the component mass for an equal-mass binary times 2^(-1/5)', () => {
    // Mc = m (2^(2/5)) / (2^(1/5)) ... written the other way round from the
    // implementation: for m1 = m2 = m, Mc = m / 2^(1/5) * 2^(... )
    const m = 10;
    const expected = Math.pow(m * m, 0.6) / Math.pow(2 * m, 0.2);
    expect(chirpMass(m, m)).toBeCloseTo(expected, 12);
    // And the standard shorthand: Mc = eta^(3/5) M.
    const eta = symmetricMassRatio(m, m);
    expect(chirpMass(m, m)).toBeCloseTo(Math.pow(eta, 0.6) * 2 * m, 9);
  });

  test('1.4 + 1.4 solar masses gives the quoted 1.219', () => {
    expect(chirpMass(1.4, 1.4)).toBeCloseTo(1.2188, 3);
  });

  test('is symmetric in its arguments', () => {
    expect(chirpMass(36, 29)).toBeCloseTo(chirpMass(29, 36), 12);
  });

  test('is 0.25 in symmetric mass ratio only for equal masses', () => {
    expect(symmetricMassRatio(5, 5)).toBeCloseTo(0.25, 12);
    expect(symmetricMassRatio(1.4, 10)).toBeLessThan(0.25);
  });

  test('rejects a non-positive mass rather than returning a number', () => {
    expect(Number.isNaN(chirpMass(0, 10))).toBe(true);
    expect(Number.isNaN(chirpMass(-1, 10))).toBe(true);
  });
});

describe('the frequency evolution against published anchors', () => {
  test('134 Hz one second before coalescence at Mc = 1.21', () => {
    expect(close(frequencyAt(1, 1.21), 134, 0.005)).toBe(true);
  });

  test('the published scaling in Mc and tau reproduces the same curve', () => {
    // f = 134 Hz (1.21/Mc)^(5/8) (1/tau)^(3/8), evaluated independently.
    const quoted = (mc, tau) =>
      134 * Math.pow(1.21 / mc, 5 / 8) * Math.pow(1 / tau, 3 / 8);
    for (const [mc, tau] of [
      [1.21, 0.1],
      [1.21, 10],
      [28.1, 0.5],
      [3, 20],
    ]) {
      expect(close(frequencyAt(tau, mc), quoted(mc, tau), 0.005)).toBe(true);
    }
  });

  test('frequency and time to coalescence invert each other', () => {
    for (const f of [15, 40, 120, 400]) {
      const tau = timeToCoalescence(f, 5);
      expect(frequencyAt(tau, 5)).toBeCloseTo(f, 8);
    }
  });

  test('doubling the chirp mass shortens the time in band by 2^(-5/3)', () => {
    const a = timeToCoalescence(30, 5);
    const b = timeToCoalescence(30, 10);
    expect(a / b).toBeCloseTo(Math.pow(2, 5 / 3), 6);
  });

  test('the frequency evolution obeys df/dt proportional to f^(11/3)', () => {
    // A finite difference of f(tau) against the differential equation, at two
    // frequencies an octave apart. The ratio of the two rates must be 2^(11/3).
    const mc = 8;
    const rate = f => {
      const tau = timeToCoalescence(f, mc);
      const h = tau * 1e-6;
      return (frequencyAt(tau - h, mc) - frequencyAt(tau + h, mc)) / (2 * h);
    };
    expect(rate(80) / rate(40)).toBeCloseTo(Math.pow(2, 11 / 3), 4);
  });
});

describe('the innermost stable circular orbit is where the model stops', () => {
  test('is 4397 Hz for one solar mass', () => {
    expect(close(iscoFrequency(1), 4397, 0.001)).toBe(true);
  });

  test('scales inversely with total mass', () => {
    expect(iscoFrequency(65)).toBeCloseTo(iscoFrequency(1) / 65, 9);
  });

  test('the velocity parameter there is exactly 1/sqrt(6)', () => {
    for (const m of [2.8, 11.4, 65, 500]) {
      expect(velocityParameter(iscoFrequency(m), m)).toBeCloseTo(
        1 / Math.sqrt(6),
        10
      );
    }
  });

  test('the separation there is exactly three Schwarzschild radii', () => {
    for (const m of [2.8, 65]) {
      expect(separationInSchwarzschildRadii(iscoFrequency(m), m)).toBeCloseTo(
        3,
        9
      );
    }
  });

  test('a 65 solar mass binary reaches it at 68 Hz, which is the point', () => {
    // Recorded as a test because it is the fact the lesson is built on: an
    // inspiral-only model covers almost none of the LIGO band for a heavy
    // binary. If this ever silently becomes 250 Hz, the model has been
    // extrapolated past its own boundary.
    expect(iscoFrequency(65)).toBeGreaterThan(60);
    expect(iscoFrequency(65)).toBeLessThan(75);
  });
});

describe('separation follows Kepler', () => {
  test('the Keplerian separation obeys the third law in the wave frequency', () => {
    // a proportional to f^(-2/3) at fixed mass, independently of the constant.
    const a1 = separationMetres(50, 20);
    const a2 = separationMetres(200, 20);
    expect(a1 / a2).toBeCloseTo(Math.pow(4, 2 / 3), 9);
  });

  test('a is proportional to the cube root of the total mass at fixed frequency', () => {
    expect(separationMetres(60, 80) / separationMetres(60, 10)).toBeCloseTo(
      2,
      9
    );
  });

  test('the two separation forms agree', () => {
    const m = 30;
    const f = 45;
    const rs = 2 * m * L_SUN;
    expect(separationMetres(f, m) / rs).toBeCloseTo(
      separationInSchwarzschildRadii(f, m),
      9
    );
  });
});

describe('the phase solution', () => {
  test('is zero at coalescence and negative before it', () => {
    expect(phaseAt(0, 5)).toBe(-0);
    expect(phaseAt(1, 5)).toBeLessThan(0);
    expect(phaseAt(10, 5)).toBeLessThan(phaseAt(1, 5));
  });

  test('its derivative is 2 pi f', () => {
    const mc = 4;
    for (const tau of [0.01, 1, 30]) {
      const h = tau * 1e-6;
      const dPhiDt = -(phaseAt(tau + h, mc) - phaseAt(tau - h, mc)) / (2 * h);
      expect(close(dPhiDt, 2 * Math.PI * frequencyAt(tau, mc), 1e-6)).toBe(
        true
      );
    }
  });

  test('cycles remaining is the phase difference over two pi', () => {
    const mc = 1.22;
    for (const f of [24, 60, 300]) {
      const tau = timeToCoalescence(f, mc);
      const fromPhase =
        Math.abs(phaseAt(tau, mc) - phaseAt(0, mc)) / (2 * Math.PI);
      expect(close(cyclesRemaining(f, mc), fromPhase, 1e-9)).toBe(true);
    }
  });

  test('a GW170817-like binary has thousands of cycles from 24 Hz', () => {
    const n = cyclesRemaining(24, chirpMass(1.4, 1.4));
    expect(n).toBeGreaterThan(3000);
    expect(n).toBeLessThan(4500);
  });

  test('a heavy binary black hole has a few dozen from 20 Hz', () => {
    const n = cyclesRemaining(20, chirpMass(36, 29));
    expect(n).toBeGreaterThan(20);
    expect(n).toBeLessThan(35);
  });
});

describe('amplitude', () => {
  test('is exactly inversely proportional to distance', () => {
    const a = strainAmplitude(100, 30, 400);
    const b = strainAmplitude(100, 30, 800);
    expect(a / b).toBeCloseTo(2, 12);
  });

  test('goes as f^(2/3) at fixed masses and distance', () => {
    const a = strainAmplitude(100, 30, 400);
    const b = strainAmplitude(800, 30, 400);
    expect(b / a).toBeCloseTo(Math.pow(8, 2 / 3), 9);
  });

  test('goes as Mc^(5/3) at fixed frequency and distance', () => {
    const a = strainAmplitude(100, 10, 400);
    const b = strainAmplitude(100, 20, 400);
    expect(b / a).toBeCloseTo(Math.pow(2, 5 / 3), 9);
  });

  test('reaches about 1e-21 for a GW150914-like source, as observed', () => {
    // Order of magnitude against the published peak strain of roughly 1e-21.
    const h = strainAmplitude(150, 30.8, 410);
    expect(h).toBeGreaterThan(5e-22);
    expect(h).toBeLessThan(5e-21);
  });

  test('is dimensionless: metres over metres', () => {
    // A change of the distance unit alone must leave nothing else moving.
    const inMpc = strainAmplitude(100, 30, 1);
    expect(inMpc * MPC).toBeCloseTo(
      4 * Math.pow(30 * L_SUN, 5 / 3) * Math.pow((Math.PI * 100) / C, 2 / 3),
      30
    );
  });
});

describe('inclination and the distance degeneracy', () => {
  test('face-on gives one for both polarizations', () => {
    const f = inclinationFactors(0);
    expect(f.plus).toBeCloseTo(1, 12);
    expect(f.cross).toBeCloseTo(1, 12);
  });

  test('edge-on halves the plus polarization and removes the cross', () => {
    const f = inclinationFactors(Math.PI / 2);
    expect(f.plus).toBeCloseTo(0.5, 12);
    expect(f.cross).toBeCloseTo(0, 12);
  });

  test('the factors are finite everywhere, including both boundaries', () => {
    for (let deg = 0; deg <= 180; deg += 5) {
      const f = inclinationFactors((deg * Math.PI) / 180);
      expect(Number.isFinite(f.plus)).toBe(true);
      expect(Number.isFinite(f.cross)).toBe(true);
      expect(f.plus).toBeGreaterThanOrEqual(0.5 - 1e-12);
      expect(f.plus).toBeLessThanOrEqual(1 + 1e-12);
    }
  });

  test('a face-on source twice as far matches an edge-on one nearby', () => {
    // The whole of step 16: the same effective distance, so the same strain.
    const faceOn = effectiveDistance(200, 0);
    const edgeOn = effectiveDistance(100, Math.PI / 2);
    expect(faceOn).toBeCloseTo(edgeOn, 9);
    expect(strainAmplitude(100, 20, faceOn)).toBeCloseTo(
      strainAmplitude(100, 20, edgeOn),
      30
    );
  });
});

describe('the fidelity band says how much has been dropped', () => {
  test('a pair of neutron stars is in the good band for most of the audio range', () => {
    expect(fidelityBand(velocityParameter(50, 2.8))).toBe('good');
    expect(fidelityBand(velocityParameter(150, 2.8))).toBe('good');
    expect(fidelityBand(velocityParameter(400, 2.8))).toBe('fair');
  });

  test('a heavy binary black hole is never in the good band inside LIGO band', () => {
    // v/c is already 0.27 at 20 Hz for 65 solar masses. This is not a defect
    // in the band thresholds - it is the reason the lesson does not let a
    // student read a heavy binary's last cycles off this model, and the reason
    // the merger comes from a published reconstruction instead.
    expect(velocityParameter(20, 65)).toBeGreaterThan(0.2);
    expect(fidelityBand(velocityParameter(20, 65))).toBe('fair');
    expect(fidelityBand(velocityParameter(iscoFrequency(65), 65))).toBe('poor');
  });

  test('the band boundaries are where the documentation says', () => {
    expect(fidelityBand(0.199)).toBe('good');
    expect(fidelityBand(0.201)).toBe('fair');
    expect(fidelityBand(0.299)).toBe('fair');
    expect(fidelityBand(0.301)).toBe('poor');
  });

  test('reports unknown rather than a band for nonsense', () => {
    expect(fidelityBand(NaN)).toBe('unknown');
    expect(fidelityBand(0)).toBe('unknown');
    expect(fidelityBand(-1)).toBe('unknown');
  });
});
