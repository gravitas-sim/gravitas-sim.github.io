// A microlensing light curve from a lens and a source: a point lens crossing
// the line of sight to a star (Paczynski), with the source's finite size and
// the blended light of other stars as stated parameters. The state is either
// the event's own parameters { t0, u0, tE } (days since the start of the run,
// Einstein radii, days) or the geometry that makes them, { lens: { massSun,
// dlKpc, dsKpc, vKms } }, from which tE follows (js/kernels/lensing). The
// same kernel the lensing instruments draw, and the same point-lens model
// the lensing fit searches, so a fit of this observation recovers the truth
// parameters by name. Observed with a photometer; flux relative to the
// baseline (source plus blend).
import { SOLAR_MASS_KG, PARSEC_M } from '../../constants.js';
import {
  einsteinAngle,
  microlensingFlux,
  peakFlux,
  timescale,
} from '../../kernels/lensing/index.js';
import { epochsInDays, requireSetup, timeSeries } from './common.js';

export const ID = 'microlensing';
export const VERSION = '1.0.0';

/** The event's parameters from a state (own parameters, or the lens geometry's tE). */
export function eventParameters(state) {
  const e = state.event ?? {};
  const lens = state.lens;
  let tE = e.tE;
  let thetaEMas = null;
  if (lens) {
    const m = lens.massSun * SOLAR_MASS_KG;
    const dl = lens.dlKpc * 1000 * PARSEC_M;
    const ds = lens.dsKpc * 1000 * PARSEC_M;
    thetaEMas = (einsteinAngle(m, dl, ds) * 180 * 3600 * 1000) / Math.PI;
    tE = timescale(m, dl, ds, lens.vKms * 1000);
  }
  if (!(tE > 0))
    throw new Error('the microlensing model needs event.tE or a lens');
  if (!(e.u0 >= 0)) throw new Error('the microlensing model needs event.u0');
  if (!Number.isFinite(e.t0))
    throw new Error('the microlensing model needs event.t0');
  return {
    t0: e.t0,
    u0: e.u0,
    tE,
    fs: e.fs ?? 1,
    rho: e.rho ?? 0,
    thetaEMas,
  };
}

export function run(state, rawSetup, opts = {}) {
  const setup = requireSetup(rawSetup, ['photometer']);
  const plan = epochsInDays(setup);
  const p = eventParameters(state);
  const base = state.baselineFlux ?? 1;
  const clean = Float64Array.from(
    microlensingFlux(plan.times, p),
    f => f * base
  );
  const parameters = [
    {
      id: 't0',
      name: 'time of closest approach',
      value: p.t0,
      unit: 'd',
      fit: 't0',
    },
    {
      id: 'u0',
      name: 'impact parameter (Einstein radii)',
      value: p.u0,
      unit: '',
      fit: 'u0',
    },
    {
      id: 'tE',
      name: 'Einstein-radius crossing time',
      value: p.tE,
      unit: 'd',
      fit: 'tE',
    },
    {
      id: 'fs',
      name: 'source share of the baseline flux',
      value: p.fs,
      unit: '',
    },
    {
      id: 'rho',
      name: 'source radius in Einstein radii',
      value: p.rho,
      unit: '',
    },
    {
      id: 'peak',
      name: 'peak flux over baseline',
      value: peakFlux(p),
      unit: '',
    },
  ];
  if (p.thetaEMas !== null)
    parameters.push({
      id: 'thetaE',
      name: 'angular Einstein radius',
      value: p.thetaEMas,
      unit: 'mas',
    });
  return timeSeries({
    model: ID,
    version: VERSION,
    setup,
    plan,
    clean,
    title: opts.title ?? 'Synthetic microlensing light curve',
    quantity: 'Flux',
    unit: '',
    truth: { parameters },
    notes: [
      'A single point lens and a single source in straight, constant-speed relative motion.',
      'A uniform source disk; no limb darkening, parallax, orbital motion or second source.',
      'The light curve fixes tE, not the lens mass, distance or speed separately.',
    ],
  });
}
