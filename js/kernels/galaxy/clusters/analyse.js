// =============================================================================
// One cluster from one table: the whole analysis of rules R3 to R14 (Prompt 250)
// -----------------------------------------------------------------------------
// galaxies {ra, dec (degrees), z, zErr?, mag?, magErr?, k?, A?, morph?}; a centre and a physical aperture
// radius in Mpc (converted with D_A at the caller's redshift guess, then once more at the first pass's
// cluster redshift); a flat cosmology; the projection factor K with its source. The answer carries the
// membership (with the pass count), the dispersion with its method and uncertainty, the radius, the mass
// with its three terms, the flags, and, when asked, the light and mass-to-light ratio, the morphology
// fractions and the baryon budget. Fewer than MIN_MEMBERS members is 'not-constrained', never a number.
// A flag (non-gaussian, contaminated) blocks the claim and changes no number.
// =============================================================================

import {
  levelOfSigma,
  percentileInterval,
  sigmaOfLevel,
} from '../../statistics/index.js';
import {
  C_KMS,
  DRAWS,
  KAPPA,
  MAX_PASSES,
  MIN_MEMBERS,
  notConstrained,
  refused,
} from './constants.js';
import {
  biweight,
  contamination,
  dispersion,
  excessKurtosis,
  mean,
} from './dispersion.js';
import {
  cosmologyOf,
  pairMatrix,
  projectedRadius,
  separation,
} from './geometry.js';
import { clusterLight, massToLight } from './light.js';
import {
  biasFlagThreshold,
  clusterRedshiftSigma,
  distanceRelSigma,
  expectedBias,
  overdensityTest,
} from './followup.js';
import { baryonBudget, checkFactor, virialMass } from './mass.js';
import { localDensities, morphologyDensity } from './morphology.js';
import { median, restVelocity, sigmaClip } from './velocity.js';

const finitePos = z => typeof z === 'number' && Number.isFinite(z) && z > 0;

/**
 * @param {object} o - see the header; unknown fields are ignored
 * @returns {object} {status, ...}
 */
export function analyseCluster(o) {
  const {
    galaxies,
    centre,
    aperture,
    zGuess,
    factor,
    method = 'plain',
    biweight: tuning = null,
    kappa = KAPPA,
    maxPasses = MAX_PASSES,
    truncationCorrection = true,
    uncertainty = 'analytic',
    draws = DRAWS,
    seed = 'clusters',
    levels = [levelOfSigma(1)],
    radiusKind = 'half-number',
    redshiftWindow = null,
    velocityExtentKms = null,
    contaminationRule = 'share',
    requireOverdensity = false,
  } = o;

  const cosmo = cosmologyOf(o.cosmology);
  if (cosmo.status === 'refused') return cosmo;
  if (!(aperture && aperture.radiusMpc > 0))
    return refused('bad-aperture', 'the aperture radius must be positive');
  if (!(kappa > Math.sqrt(3)))
    return refused('bad-clip-level', 'the clip level must exceed sqrt(3)');
  if (radiusKind !== 'half-number' && radiusKind !== 'harmonic')
    return refused(
      'bad-radius-kind',
      'the radius kind is half-number or harmonic'
    );
  const bad = checkFactor(factor, radiusKind);
  if (bad) return bad;
  if (!finitePos(zGuess))
    return refused(
      'bad-redshift-guess',
      'a positive redshift guess is required'
    );
  if (!centre || !Number.isFinite(centre.ra) || !Number.isFinite(centre.dec))
    return refused('bad-centre', 'the centre needs ra and dec in degrees');
  if (contaminationRule !== 'share' && contaminationRule !== 'bias')
    return refused('bad-contamination-rule', "the rule is 'share' or 'bias'");
  if (method === 'biweight') {
    if (
      !tuning ||
      !(tuning.cLocation > 0) ||
      !(tuning.cScale > 0) ||
      !tuning.source
    )
      return refused(
        'missing-tuning',
        'the biweight needs cLocation, cScale and a source'
      );
    if ((galaxies ?? []).some(g => g.zErr !== undefined))
      return refused(
        'errors-with-biweight',
        'velocity errors are defined for the plain estimator only'
      );
  } else if (method !== 'plain')
    return refused('bad-method', 'plain or biweight');
  if (o.light && !(o.light.solarAbsMag && o.light.solarAbsMag.source))
    return refused(
      'missing-solar-source',
      'the solar absolute magnitude needs a source'
    );
  if (
    o.morphology &&
    !(Number.isInteger(o.morphology.neighbours) && o.morphology.neighbours >= 1)
  )
    return refused(
      'bad-neighbours',
      'the neighbour count must be a positive integer'
    );

  const clean = [];
  let dropped = 0;
  (galaxies ?? []).forEach((g, i) => {
    if (finitePos(g.z) && Number.isFinite(g.ra) && Number.isFinite(g.dec))
      clean.push({ ...g, _i: i });
    else dropped++;
  });

  let zUse = zGuess;
  let zFirst = null;
  let select = null;
  let clip = null;
  let members = null;
  let zc = null;
  let da = null;
  let z0 = null;
  let uCentre = null;
  for (let pass = 1; pass <= 2; pass++) {
    da = cosmo.angularDiameterDistance(zUse);
    const angle = aperture.radiusMpc / da;
    select = clean.filter(
      g =>
        separation(g.ra, g.dec, centre.ra, centre.dec) <= angle &&
        (!redshiftWindow ||
          (g.z >= redshiftWindow[0] && g.z <= redshiftWindow[1]))
    );
    if (select.length < MIN_MEMBERS)
      return notConstrained(
        'too-few-members',
        `${select.length} galaxies in the aperture; at least ${MIN_MEMBERS} are needed`,
        { count: select.length, dropped }
      );
    z0 = median(select.map(g => g.z));
    if (velocityExtentKms > 0)
      select = select.filter(
        g => Math.abs(restVelocity(g.z, z0)) <= velocityExtentKms
      );
    if (select.length < MIN_MEMBERS)
      return notConstrained(
        'too-few-members',
        `${select.length} galaxies in the velocity extent; at least ${MIN_MEMBERS} are needed`,
        { count: select.length, dropped }
      );
    const u = select.map(g => (C_KMS * (g.z - z0)) / (1 + z0));
    clip = sigmaClip(u, { kappa, maxPasses });
    if (clip.status !== 'ok') return { ...clip, count: select.length, dropped };
    members = clip.kept.map(i => select[i]);
    if (members.length < MIN_MEMBERS)
      return notConstrained(
        'too-few-members',
        `${members.length} members after the clip; at least ${MIN_MEMBERS} are needed`,
        { count: members.length, dropped }
      );
    const uk = clip.kept.map(i => u[i]);
    uCentre = mean(uk);
    const zs = members.map(g => g.z);
    zc = method === 'biweight' ? biweight(zs, tuning).location : mean(zs);
    if (!Number.isFinite(zc))
      return notConstrained('zero-scatter', 'the members have no scatter');
    if (pass === 1) zFirst = zc;
    zUse = zc;
  }
  da = cosmo.angularDiameterDistance(zc);
  const v = members.map(g => restVelocity(g.z, zc));
  const errorsKms =
    method === 'plain' &&
    members.every(g => Number.isFinite(g.zErr) && g.zErr >= 0)
      ? members.map(g => (C_KMS * g.zErr) / (1 + zc))
      : null;
  const disp = dispersion(v, {
    method,
    kappa,
    truncationCorrection,
    errorsKms,
    biweightTuning: tuning,
    uncertainty: method === 'biweight' ? 'bootstrap' : uncertainty,
    draws,
    seed: `${seed}:dispersion`,
  });
  if (disp.status !== 'ok') return disp;
  const dispIntervals = levels.map(level => {
    if (disp.uncertainty === 'analytic') {
      const z = sigmaOfLevel(level);
      return {
        level,
        lo: disp.kms - z * disp.sigmaKms,
        hi: disp.kms + z * disp.sigmaKms,
      };
    }
    const ci = percentileInterval(disp.samples, { level });
    return ci.status === 'ok'
      ? { level, lo: ci.lo, hi: ci.hi }
      : { level, lo: NaN, hi: NaN };
  });

  const flags = [];
  const kurt = excessKurtosis(v);
  if (kurt.status === 'ok' && kurt.flag) flags.push('non-gaussian');
  const sUsed = Math.sqrt(
    v.reduce((s, x) => s + (x - mean(v)) ** 2, 0) / (v.length - 1)
  );
  const cont = contamination({
    uKms: select.map(g => (C_KMS * (g.z - z0)) / (1 + z0)),
    centre: uCentre,
    halfWidth: kappa * sUsed,
    extentKms: velocityExtentKms ?? 0,
    members: members.length,
  });
  const nMembers = members.length;
  const biasEstimate =
    cont.status === 'ok'
      ? {
          expectedBias: expectedBias(cont.expectedInside, nMembers, kappa),
          threshold: biasFlagThreshold(nMembers),
        }
      : null;
  if (biasEstimate)
    biasEstimate.flag = biasEstimate.expectedBias > biasEstimate.threshold;
  if (contaminationRule === 'bias') {
    if (biasEstimate?.flag) flags.push('contaminated-bias');
  } else if (cont.status === 'ok' && cont.flag) flags.push('contaminated');
  const overdensity = overdensityTest({
    nIn: nMembers,
    nPre: select.length,
    halfWidthKms: kappa * sUsed,
    extentKms: velocityExtentKms,
  });
  if (requireOverdensity && overdensity.status === 'ok' && overdensity.refuse)
    return notConstrained(
      'no-overdensity',
      'the window is no fuller than a field uniform in velocity would make it',
      { overdensity, count: nMembers, dropped }
    );

  const sky = members.map(g => ({ ra: g.ra, dec: g.dec }));
  const radius = projectedRadius({
    sky,
    centre,
    daMpc: da,
    kind: radiusKind,
    draws,
    seed: `${seed}:radius`,
  });
  if (radius.status !== 'ok') return radius;

  const mass = virialMass({
    sigmaKms: disp.kms,
    sigmaSigmaKms: disp.sigmaKms,
    radiusMpc: radius.mpc,
    sigmaRadiusMpc: radius.sigmaMpc,
    factor,
    levels,
  });
  if (mass.status !== 'ok') return mass;

  const out = {
    status: 'ok',
    members: {
      n: members.length,
      ids: members.map(g => g._i),
      passes: clip.passes,
      converged: clip.converged,
      preselected: select.length,
      dropped,
      kappa,
    },
    redshift: { zc, zGuess, zFirstPass: zFirst, angularDiameterMpc: da },
    dispersion: {
      ...disp,
      samples: undefined,
      intervals: dispIntervals,
      kappa,
    },
    diagnostics: {
      gaussianity: kurt,
      contamination: cont,
      contaminationBias: biasEstimate,
      overdensity,
    },
    flags,
    claimable: flags.length === 0,
    radius,
    mass,
  };
  if (o.light) {
    const members2 = members.map(g => ({ ...g }));
    const light = clusterLight({
      members: members2,
      dm: cosmo.distanceModulus(zc),
      solarAbsMag: o.light.solarAbsMag,
      limitMag: o.light.limitMag,
      missing: o.light.missing ?? null,
      distanceRelSigma: o.light.distanceTerm
        ? distanceRelSigma(
            cosmo,
            zc,
            clusterRedshiftSigma(members.map(g => g.z))
          )
        : 0,
      levels,
    });
    out.light = light;
    if (light.status === 'ok')
      out.massToLight = massToLight({
        massKg: mass.kg,
        massRelSigma: mass.relSigma,
        light,
        levels,
      });
  }
  if (o.morphology) {
    const rows = pairMatrix(sky, da);
    const density = localDensities(rows, o.morphology.neighbours);
    out.morphology = morphologyDensity({
      density,
      isClass: members.map(g => (o.morphology.classes ?? []).includes(g.morph)),
      edgesLog10: o.morphology.edgesLog10,
      level: levels[0],
    });
    out.morphology.densities = Array.from(density);
  }
  if (o.gas) {
    out.baryons = baryonBudget({
      mass: { value: mass.solar, relSigma: mass.relSigma },
      gas: o.gas,
      stars: o.stellarMass ?? null,
    });
  }
  return out;
}
