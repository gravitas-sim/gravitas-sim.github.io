// =============================================================================
// Labelled synthetic data for the multi-messenger kernel
// -----------------------------------------------------------------------------
// Everything this module returns is SYNTHETIC: drawn from a seeded stream around
// a stated truth, which is returned beside it (the truth manifest). The merger is
// an invented one (not GW170817), the delay, the lags and the host are random
// draws, and the kilonova photometry is the illustrative expanding-blackbody
// model with noise. A lesson built on it says so; nothing here stands in for a
// measurement. The galaxy-field generator is the very model the host rule
// (hosts.js) assumes, which is what lets check C1 hold the rule's weights to
// calibration.
// =============================================================================

import { gaussian, stream } from '../../random/streams.js';
import { finite, refuse } from './constants.js';
import { fromT72, toT72 } from './timescales.js';
import {
  ILLUSTRATIVE_PARAMETERS,
  kilonovaAbMag,
  kilonovaState,
} from './kilonova.js';

export const SYNTHETIC_LABEL =
  'SYNTHETIC: drawn from a seeded model around the truth listed beside it; not an observation of any event';

/** The defaults of one synthetic galaxy field (the generative model of check C1). */
export const FIELD_DEFAULTS = Object.freeze({
  galaxies: 25,
  radiusDeg: 8,
  distanceRangeMpc: Object.freeze([10, 100]),
  log10MassSigma: 0.5,
  sigmaDistanceMpc: 8,
  sigmaSkyDeg: 2,
});

/**
 * One field: galaxies with distances uniform in volume, positions uniform on a disc of the tangent plane and
 * lognormal masses; the host is one galaxy chosen with probability proportional to its mass; the measured distance
 * and position are the host's plus Gaussian errors. Offsets are returned from the MEASURED position, as a
 * localisation centre would give them.
 * @param {{seed: string|number, label?: string} & Partial<typeof FIELD_DEFAULTS>} p
 */
export function syntheticGalaxyField({ seed, label = 'field', ...options }) {
  const o = { ...FIELD_DEFAULTS, ...options };
  const u = stream('forward', seed, label);
  const normal = gaussian(u);
  const [lo, hi] = o.distanceRangeMpc;
  const galaxies = [];
  for (let i = 0; i < o.galaxies; i++) {
    const r = o.radiusDeg * Math.sqrt(u());
    const th = 2 * Math.PI * u();
    galaxies.push({
      id: `g${i}`,
      x: r * Math.cos(th),
      y: r * Math.sin(th),
      distanceMpc: (lo ** 3 + u() * (hi ** 3 - lo ** 3)) ** (1 / 3),
      mass: 10 ** (o.log10MassSigma * normal()),
    });
  }
  const total = galaxies.reduce((s, g) => s + g.mass, 0);
  let pick = u() * total;
  let host = galaxies[galaxies.length - 1];
  for (const g of galaxies) {
    pick -= g.mass;
    if (pick < 0) {
      host = g;
      break;
    }
  }
  const xHat = host.x + o.sigmaSkyDeg * normal();
  const yHat = host.y + o.sigmaSkyDeg * normal();
  const distanceHatMpc = host.distanceMpc + o.sigmaDistanceMpc * normal();
  return {
    label: SYNTHETIC_LABEL,
    candidates: galaxies.map(g => ({ ...g, x: g.x - xHat, y: g.y - yHat })),
    measurement: {
      distanceHatMpc,
      sigmaDistanceMpc: o.sigmaDistanceMpc,
      sigmaSkyDeg: o.sigmaSkyDeg,
    },
    truth: { hostId: host.id, hostDistanceMpc: host.distanceMpc, model: o },
  };
}

/**
 * A synthetic event: times in three systems from a hidden truth.
 * @param {{seed: string|number, leapTable: object, mergerUtc?: string}} p
 * @returns {{label: string, truth: object, stamps: object}} stamps: the GW time in GPS (the catalogue merger time),
 *   the burst's trigger in Fermi MET, the optical first detection in MJD(UTC)
 */
export function syntheticScene({
  seed,
  leapTable,
  mergerUtc = '2012-03-04T05:06:07.400',
}) {
  if (!leapTable) refuse('bad-leap-table', 'a leap-second table is required');
  const u = stream('forward', seed, 'scene');
  const delayS = 0.5 + 2.5 * u();
  const opticalLagDays = 0.4 + 0.4 * u();
  const mergerT72 = toT72({ value: mergerUtc, system: 'UTC' }, leapTable);
  return {
    label: SYNTHETIC_LABEL,
    truth: { mergerUtc, delayS, opticalLagDays, distanceMpc: 20 + 60 * u() },
    stamps: {
      gw: {
        value: fromT72(mergerT72, 'GPS', leapTable),
        system: 'GPS',
        definition: 'merger-catalogue',
      },
      grb: {
        value: fromT72(mergerT72 + delayS, 'FERMI_MET', leapTable),
        system: 'FERMI_MET',
        definition: 'instrument-trigger',
      },
      optical: {
        value: fromT72(
          mergerT72 + opticalLagDays * 86400,
          'MJD_UTC',
          leapTable
        ),
        system: 'MJD_UTC',
        definition: 'first-detection',
      },
    },
  };
}

/**
 * Synthetic kilonova photometry: AB magnitudes in the given bands at the given epochs from the illustrative model,
 * with Gaussian magnitude noise.
 * @param {{seed: string|number, bands: Record<string, object>, tDays: number[], distanceMpc: number,
 *   sigmaMag?: number, params?: object}} p
 */
export function syntheticPhotometry({
  seed,
  bands,
  tDays,
  distanceMpc,
  sigmaMag = 0.05,
  params = ILLUSTRATIVE_PARAMETERS,
}) {
  finite(distanceMpc, 'distanceMpc');
  const normal = gaussian(stream('forward', seed, 'photometry'));
  const rows = [];
  for (const t of tDays) {
    const state = kilonovaState(params, t);
    for (const [name, band] of Object.entries(bands)) {
      const truth = kilonovaAbMag(band, state, distanceMpc);
      rows.push({
        tDays: t,
        band: name,
        truthMag: truth,
        mag: truth + sigmaMag * normal(),
        sigmaMag,
      });
    }
  }
  return { label: SYNTHETIC_LABEL, params, rows };
}
