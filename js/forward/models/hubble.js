// A synthetic Hubble diagram: type Ia supernovae at the redshifts a survey
// finds them, their distance moduli from a flat or open Lambda-CDM universe
// (js/kernels/cosmology), an offset the observer does not know (the
// supernovae's absolute magnitude), and Gaussian noise. The state is
// { cosmology: { H0, Om, OL }, offset? }; the observer is the catalogue
// instrument with the survey's own description in `instrument.survey`:
// { count, zMin, zMax, sigmaMag }. The same kernel the Hubble-diagram
// instruments draw and the same model the supernova fit searches, so a fit of
// this observation recovers Omega_m by name; H0 it cannot recover with the
// offset free, and the truth manifest says so.
import { syntheticObservation, valueColumns } from '../observation.js';
import { requireSetup } from './common.js';
import { syntheticHubbleDiagram } from '../../kernels/cosmology/index.js';

export const ID = 'hubble-diagram';
export const VERSION = '1.0.0';

export function run(state, rawSetup, opts = {}) {
  const cosmology = state.cosmology;
  if (!cosmology)
    throw new Error('the Hubble-diagram model needs state.cosmology');
  const setup = requireSetup(rawSetup, ['catalogue']);
  const sv = setup.instrument.survey ?? {};
  const count = sv.count ?? 300;
  if (!(Number.isInteger(count) && count >= 5 && count <= 20000))
    throw new Error('the Hubble-diagram survey needs 5 to 20000 supernovae');
  const zMax = sv.zMax ?? 1;
  const zMin = sv.zMin ?? 0.01;
  if (!(zMin > 0 && zMax > zMin && zMax <= 5))
    throw new Error('the redshift range must satisfy 0 < zMin < zMax <= 5');
  const sigma = sv.sigmaMag ?? 0.15;
  const offset = state.offset ?? 0;
  const d = syntheticHubbleDiagram({
    n: count,
    zMin,
    zMax,
    sigma,
    cosmology,
    offset,
    seed: setup.seed,
  });
  const columns = [
    { id: 'z', name: 'Redshift', unit: '', role: 'x', values: d.z },
    ...valueColumns('mu', 'Distance modulus', 'mag', d.mu, d.sigma),
  ];
  return syntheticObservation({
    model: ID,
    version: VERSION,
    setup,
    kind: 'table',
    title: opts.title ?? 'Synthetic supernova Hubble diagram',
    columns,
    axes: { x: 'z', y: 'mu' },
    truth: {
      parameters: [
        {
          id: 'Om',
          name: 'matter density, Omega_m',
          value: cosmology.Om,
          unit: '',
          fit: 'Om',
        },
        {
          id: 'OL',
          name: 'cosmological constant, Omega_L',
          value: cosmology.OL,
          unit: '',
        },
        {
          id: 'H0',
          name: 'Hubble constant',
          value: cosmology.H0,
          unit: 'km/s/Mpc',
        },
        {
          id: 'offset',
          name: 'offset of the absolute magnitude',
          value: offset,
          unit: 'mag',
        },
      ],
      injected: null,
      notes: [
        'Distance moduli of a flat or open Lambda-CDM universe, radiation neglected; redshifts are drawn thick at low z, as a survey draws them.',
        'The offset and H0 are the same change to every distance modulus: a fit can recover Omega_m, and cannot separate H0 from the offset.',
        'Independent Gaussian errors of the stated size; no selection effects, no peculiar velocities, no lensing.',
      ],
    },
  });
}
