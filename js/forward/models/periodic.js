// A light curve from a periodic model: a variable star as a Fourier series, or
// a circular eclipsing binary of two uniform disks.
//
// Eclipsing binary, in units of the separation a: radii r1 and r2, surface
// brightness ratio J = S2 / S1, inclination i. The sky separation of the disks
// at orbital angle theta is z = sqrt(sin^2 theta + cos^2 i cos^2 theta); at
// theta = 0 star 2 is in front of star 1 (primary eclipse). The flux is the
// luminosity-weighted visible fraction of each disk (L1 = r1^2, L2 = J r2^2),
// from the exact overlap area of two circles.
import { epochsInDays, requireSetup, timeSeries } from './common.js';
import { overExposure } from '../setup.js';

export const ID = 'periodic';
export const VERSION = '1.0.0';

/** The area where two circles of radii r1, r2, centres z apart, overlap. */
export function overlapArea(z, r1, r2) {
  if (z >= r1 + r2) return 0;
  if (z <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2;
  const a1 = Math.acos((z * z + r1 * r1 - r2 * r2) / (2 * z * r1));
  const a2 = Math.acos((z * z + r2 * r2 - r1 * r1) / (2 * z * r2));
  return (
    r1 * r1 * (a1 - Math.sin(2 * a1) / 2) +
    r2 * r2 * (a2 - Math.sin(2 * a2) / 2)
  );
}

/** Relative flux of the eclipsing binary at time t. */
export function eclipsingFlux(p, t) {
  const theta = (2 * Math.PI * (t - p.t0)) / p.periodDays;
  const cosI = Math.cos(((p.inclinationDeg ?? 90) * Math.PI) / 180);
  const z = Math.hypot(Math.sin(theta), cosI * Math.cos(theta));
  const L1 = p.r1 * p.r1;
  const L2 = (p.surfaceBrightnessRatio ?? 1) * p.r2 * p.r2;
  const lens = overlapArea(z, p.r1, p.r2);
  const front2 = Math.cos(theta) > 0;
  const v1 = front2 ? 1 - lens / (Math.PI * p.r1 * p.r1) : 1;
  const v2 = front2 ? 1 : 1 - lens / (Math.PI * p.r2 * p.r2);
  return (L1 * v1 + L2 * v2) / (L1 + L2);
}

/** Relative flux of the harmonic variable at time t. */
export function harmonicFlux(p, t) {
  let f = p.mean ?? 1;
  (p.harmonics ?? []).forEach((h, k) => {
    f +=
      h.amplitude *
      Math.sin(
        (2 * Math.PI * (k + 1) * (t - p.t0)) / p.periodDays +
          ((h.phaseDeg ?? 0) * Math.PI) / 180
      );
  });
  return f;
}

export function run(state, rawSetup, opts = {}) {
  const p = state.periodic;
  if (!p || !(p.periodDays > 0))
    throw new Error('the periodic model needs state.periodic with a period');
  if (!['harmonic', 'eclipsing'].includes(p.kind))
    throw new Error('periodic.kind is harmonic or eclipsing');
  if (p.kind === 'eclipsing' && !(p.r1 > 0 && p.r2 > 0 && p.r1 + p.r2 < 1))
    throw new Error(
      'the eclipsing model needs radii in units of the separation, summing to less than 1'
    );
  const setup = requireSetup(rawSetup, ['photometer']);
  const plan = epochsInDays(setup);
  const f = p.kind === 'eclipsing' ? eclipsingFlux : harmonicFlux;
  const clean = Float64Array.from(plan.times, t =>
    overExposure(
      tt => f(p, tt),
      t,
      setup.exposure.time,
      setup.exposure.supersample
    )
  );
  const parameters =
    p.kind === 'eclipsing'
      ? [
          { id: 'P', name: 'period', value: p.periodDays, unit: 'd' },
          { id: 't0', name: 'primary mid-eclipse', value: p.t0, unit: 'd' },
          {
            id: 'r1',
            name: 'radius of star 1 over separation',
            value: p.r1,
            unit: '',
          },
          {
            id: 'r2',
            name: 'radius of star 2 over separation',
            value: p.r2,
            unit: '',
          },
          {
            id: 'J',
            name: 'surface brightness ratio',
            value: p.surfaceBrightnessRatio ?? 1,
            unit: '',
          },
          {
            id: 'inclination',
            name: 'inclination',
            value: p.inclinationDeg ?? 90,
            unit: 'deg',
          },
        ]
      : [
          { id: 'P', name: 'period', value: p.periodDays, unit: 'd' },
          { id: 'mean', name: 'mean flux', value: p.mean ?? 1, unit: '' },
          ...(p.harmonics ?? []).flatMap((h, k) => [
            {
              id: `A${k + 1}`,
              name: `amplitude of harmonic ${k + 1}`,
              value: h.amplitude,
              unit: '',
            },
            {
              id: `phase${k + 1}`,
              name: `phase of harmonic ${k + 1}`,
              value: h.phaseDeg ?? 0,
              unit: 'deg',
            },
          ]),
        ];
  return timeSeries({
    model: ID,
    version: VERSION,
    setup,
    plan,
    clean,
    title:
      opts.title ??
      (p.kind === 'eclipsing'
        ? 'Synthetic eclipsing-binary light curve'
        : 'Synthetic variable-star light curve'),
    quantity: 'Relative flux',
    unit: '',
    truth: { parameters },
    notes:
      p.kind === 'eclipsing'
        ? [
            'Circular orbit, uniform disks (no limb darkening, no ellipsoidal or reflection effects).',
          ]
        : ['A sum of sinusoids at multiples of one period.'],
  });
}
