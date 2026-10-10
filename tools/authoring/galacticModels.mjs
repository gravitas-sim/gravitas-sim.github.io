// =============================================================================
// The galactic investigations' expected values, from the galactic kernel
// -----------------------------------------------------------------------------
// Each is the value a lesson writes as a literal, recomputed from the model the
// instrument draws (js/galactic/model.js over js/kernels/galactic, and the
// three Gaia / rotation-curve packs), in the unit the step asks for.
// tools/authoring/modelChecked.mjs spreads GALACTIC_MODELS into MODELS;
// tests/galacticInvestigations.test.js also reads GALACTIC_VALUES. Node only.
// =============================================================================

import { galacticPack } from './galacticPacks.mjs';
import {
  solarStars,
  clusterRows,
  rotationPoints,
  solarFacts,
  oortFacts,
  massFacts,
  clusterFacts,
  memberMeans,
} from '../../js/galactic/model.js';
import { enclosedMass, curveAt } from '../../js/kernels/galactic/index.js';

const stars = solarStars(galacticPack('solar'));
const rows = clusterRows(galacticPack('cluster'));
const points = rotationPoints(galacticPack('rotation'));

const R0 = 8.3;
const members = () => {
  const f = clusterFacts(rows, 3, 0.5);
  return { f, m: memberMeans(rows, f.p, 0.5) };
};

/** The values behind the lessons' literals and validators. */
export const GALACTIC_VALUES = {
  sun100: frame => solarFacts(stars, { maxPc: 100, frame }),
  sun1000: () => solarFacts(stars, { maxPc: 1000 }),
  oort: () => oortFacts(stars, 'distance'),
  oortFlat: () => oortFacts(stars, 'none'),
  fitHalo: () => massFacts(points, null, 'halo'),
  fitStars: () => massFacts(points, null, 'stars'),
  atSun: model => curveAt(R0, model),
  cluster: (dims = 3, threshold = 0.5) => {
    const f = clusterFacts(rows, dims, threshold);
    return { ...f, means: memberMeans(rows, f.p, threshold) };
  },
};

export const GALACTIC_MODELS = {
  'the-suns-motion/speed-from-components': {
    via: 'js/galactic/model.js solarFacts at 100 pc against the stars’ mean: sqrt(U² + V² + W²)',
    value: () => GALACTIC_VALUES.sun100('stars').speed,
  },
  'the-suns-motion/lag-arithmetic': {
    via: 'js/kernels/galactic/motion.js lsrCorrection(sigma_U) at 100 pc: sigma_U² ÷ 80',
    value: () => GALACTIC_VALUES.sun100('stars').lag,
  },
  'the-suns-motion/error-of-the-mean': {
    via: 'js/galactic/model.js solarFacts at 1,000 pc: the error of the mean U',
    value: () => GALACTIC_VALUES.sun1000().errU,
  },
  'the-suns-motion/speed-two-frames': {
    via: 'js/galactic/model.js solarFacts at 100 pc: the Schönrich-frame speed less the Strömberg-frame speed',
    value: () =>
      GALACTIC_VALUES.sun100('schonrich').speed -
      GALACTIC_VALUES.sun100('stromberg').speed,
  },
  'the-rotating-disk/v0-by-hand': {
    via: 'js/galactic/model.js oortFacts (weighted): (A − B) × 8.3 kpc',
    value: () => R0 * GALACTIC_VALUES.oort().omega,
  },
  'the-rotating-disk/enclosed-mass': {
    via: 'js/kernels/galactic/rotation.js enclosedMass(8.3 kpc, 244 km/s), in 10^10 solar masses',
    value: () => enclosedMass(R0, 244) / 1e10,
  },
  'the-rotating-disk/halo-share': {
    via: 'js/kernels/galactic/rotation.js curveAt at 8.3 kpc for the halo fit: (halo ÷ total)², percent',
    value: () => {
      const a = GALACTIC_VALUES.atSun(GALACTIC_VALUES.fitHalo().model);
      return (a.halo / a.total) ** 2 * 100;
    },
  },
  'cluster-membership/distance-by-hand': {
    via: 'js/galactic/model.js memberMeans at threshold 0.5 (proper motion and parallax fit): 1 ÷ mean parallax, kpc',
    value: () => 1 / members().m.mean[2],
  },
  'cluster-membership/internal-velocity': {
    via: 'the fit’s cluster spread in proper motion × 4.74047 × the members’ distance, km/s',
    value: () => 4.74047 * members().f.sigmaPm * (1 / members().m.mean[2]),
  },
  'cluster-membership/expected-field': {
    via: 'js/kernels/galactic/membership.js: stars in the table less the expected members (sum of probabilities)',
    value: () => rows.length - members().f.expected,
  },
};
