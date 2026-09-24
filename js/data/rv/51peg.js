// =============================================================================
// 51 Pegasi, as observed
// -----------------------------------------------------------------------------
// Forty-three radial velocities of 51 Pegasi (HD 217014) from HIRES on Keck I,
// published by Butler et al. (2017) and retrieved from VizieR. They are the
// second thing in this application that somebody else measured - the first is
// js/data/gw/gw150914.js, and this file follows its conventions deliberately.
//
// Why real velocities and not a recording from the simulation
// -----------------------------------------------------------------------------
// js/rvSurvey.js can produce a radial-velocity run with any period, amplitude
// and noise level wanted, and every lesson that has used the fitting stack so
// far has used one. Synthetic data is better for almost everything: the answer
// is known, the sampling is whatever the lesson needs, and the errors are
// exactly the errors the generator put in.
//
// That last property is the problem. A student who fits synthetic data and gets
// a confidence interval containing the generating value has learned that the
// arithmetic works. They have not met the thing that actually happens, which is
// that a formal uncertainty computed from the quoted error bars is smaller than
// the real one, because the quoted error bars describe photon noise and the
// star does not. On these points the reduced chi-square of the best fit is
// about 6.6, and the interval a Monte Carlo draws from the quoted sigmas does
// not contain the value the catalog's own authors published from the same
// velocities. Nothing synthetic teaches that without being built to, and data
// built to teach it is not evidence of anything.
//
// Reproduced, not reprocessed
// -----------------------------------------------------------------------------
// The velocities below are the published numbers to the published precision, in
// the published order. Nothing is binned, clipped, shifted, detrended or
// re-weighted. In particular the seven pairs of exposures taken within minutes
// of each other are left as separate rows, because that is how the catalog
// publishes them and because a student who notices them has noticed something
// true about how the observations were taken.
// =============================================================================

/** Where every number here came from, and what was done to it. */
export const PROVENANCE = {
  target: '51 Pegasi',
  designation: 'HD 217014',
  planet: '51 Pegasi b',
  instrument: 'HIRES on the Keck I telescope',
  survey: 'Lick-Carnegie Exoplanet Survey (LCES)',
  paper: 'Butler et al. (2017), Astronomical Journal 153, 208',
  doi: '10.3847/1538-3881/aa66ca',
  bibcode: '2017AJ....153..208B',
  archive: 'VizieR, Centre de Donnees astronomiques de Strasbourg',
  catalog: 'J/AJ/153/208',
  catalogDoi: '10.26093/cds/vizier.51530208',
  landingPage: 'https://cdsarc.cds.unistra.fr/viz-bin/cat/J/AJ/153/208',
  attribution:
    'This research has made use of the VizieR catalogue access tool, CDS, Strasbourg Astronomical Observatory, France (DOI: 10.26093/cds/vizier).',
  retrieved: '2026-09-20',
  // The exact request. A provenance block that names an archive but not the
  // query is not reproducible: the same catalog answers differently depending
  // on which columns and which row filter were asked for.
  query:
    'https://vizier.cds.unistra.fr/viz-bin/asu-tsv?-source=J/AJ/153/208/table1&Name=HD217014&-out=Name,BJD,RV,e_RV,S,H,Count,Exp&-out.max=unlimited',
  sourceBytes: 5763,
  sourceSha256:
    '944e5066c141c8950b68deee61fb56bc89e32e34813a5dfe4fee5e318261fe3d',
  rows: 43,
  timeAxis: 'Barycentric Julian Date, as published',
  velocityUnit: 'm/s, relative to an arbitrary zero point',
  processing: [
    'Parsed the published tab-separated table as-is.',
    'Kept the BJD, radial velocity, its 1-sigma uncertainty and the Ca II S-index, to the precision the catalog publishes them.',
    'Nothing else. No binning, clipping, detrending, offset removal or re-weighting.',
  ],
  notApplied: [
    'No nightly binning of the consecutive exposures.',
    'No stellar-jitter term added to the quoted uncertainties.',
    'No correction for the systematics reported by Tal-Or et al. (2019).',
    'No outlier rejection.',
  ],
  // Stated rather than silently applied, because two of them are things the
  // lesson asks a student to find.
  knownSystematics: [
    {
      code: 'internalErrors',
      what: 'The quoted uncertainties are internal errors from the reduction. They describe photon noise and the wavelength solution, not the star.',
      consequence:
        'A weighted fit returns a reduced chi-square well above 1, and any interval propagated from these sigmas alone is too narrow.',
    },
    {
      code: 'hiresOffset',
      what: 'Tal-Or et al. (2019), MNRAS 484, L8 report a small nightly zero-point drift in the HIRES velocities and a discontinuity at the 2004 detector upgrade.',
      reference: '2019MNRAS.484L...8T',
      consequence:
        'The correction is published as a separate catalog and is not applied here. Every epoch below is after the 2004 upgrade, so the discontinuity does not fall inside this run.',
    },
    {
      code: 'sampling',
      what: 'The run is 43 velocities over 2,749 days, with gaps of up to 408 days and seven pairs of exposures taken within minutes of one another.',
      consequence:
        'The window function is severe. The period is nevertheless unambiguous here, which is worth seeing: a bad window does not always mean an ambiguous answer.',
    },
  ],
};

/**
 * What has been published about this planet, by people who are not us.
 *
 * Two quotes, and the difference between them is the point. `catalogFit` is the
 * same authors' own fit to the same velocities, so it checks a pipeline against
 * a pipeline. `discovery` is a different instrument, a different team and a
 * different decade, so it checks a measurement against a measurement - and it
 * is the one that makes a replication a replication.
 *
 * `discovery.values` is deliberately null. The numbers are in the paper and are
 * not hard to find, but nothing in this repository has fetched and checksummed
 * them, and a provenance block whose whole purpose is that every number is
 * traceable must not carry one that is not. Fill it from the paper, with the
 * page it is on, or leave it null and the lesson will say the comparison has
 * not been made.
 */
export const PUBLISHED = {
  catalogFit: {
    source: 'Butler et al. (2017), Table 2',
    independent: false,
    note: 'The catalog authors fitting the same velocities with their own pipeline.',
    query:
      'https://vizier.cds.unistra.fr/viz-bin/asu-tsv?-source=J/AJ/153/208/table2&Name=HD217014&-out=Name,Ns,LR,Per,e_Per,K,e_K,Signal&-out.max=5',
    sourceSha256:
      '1080084fd26a107e97325fe504544b86db9b10434ba7358db5e765e3890c9e5d',
    retrieved: '2026-09-20',
    periodDays: 4.23077,
    periodError: 0.00005,
    kMs: 56.05,
    kError: 0.6,
    likelihoodRatio: 121.95,
  },
  discovery: {
    source: 'Mayor & Queloz (1995), Nature 378, 355',
    doi: '10.1038/378355a0',
    bibcode: '1995Natur.378..355M',
    instrument: 'ELODIE on the 1.93 m telescope at Haute-Provence',
    independent: true,
    note: 'The measurement this lesson is a replication of. A different instrument, a different team, twenty-two years earlier.',
    values: null,
  },
};

/**
 * The velocities: [BJD, radial velocity m/s, 1-sigma m/s, Ca II S-index].
 *
 * Published precision, published order. The S-index is carried because it is
 * the activity diagnostic, and a student who wonders whether a residual is the
 * star rather than the planet should be able to look rather than speculate.
 */
export const VELOCITIES = [
  [2453927.05042, 40.54, 0.97, 0.1333],
  [2453927.05119, 43.65, 0.96, 0.1263],
  [2453927.05193, 44.63, 0.94, 0.1268],
  [2453982.84764, 2.21, 0.94, 0.1354],
  [2453982.84838, 1.17, 1.04, 0.1388],
  [2453982.84911, 1.02, 1.12, 0.137],
  [2454085.79536, -72.53, 1.1, 0.1477],
  [2454085.79753, -71.59, 1.11, 0.1522],
  [2454085.79838, -74.79, 1.03, 0.1514],
  [2454337.09242, 31.91, 1.17, 0.1418],
  [2454398.85734, -73.58, 1.19, 0.1275],
  [2454806.76933, 33.55, 1.17, 0.1384],
  [2454838.73284, -75.22, 1.28, 0.136],
  [2454964.13091, 21.52, 1.16, 0.1405],
  [2454984.1, 16.37, 1.16, 0.1404],
  [2454985.11823, 33.46, 1.04, 0.1381],
  [2455015.05197, 10.16, 1.06, 0.1336],
  [2455016.06613, -59.96, 1.04, 0.1368],
  [2455019.01926, 31.43, 1.11, 0.1355],
  [2455041.92598, -67.48, 1.21, 0.1613],
  [2455078.07733, 33.52, 1.23, 0.1401],
  [2455106.7597, 13.81, 1.3, 0.1396],
  [2455135.7227, -31.37, 1.28, 0.1358],
  [2455189.68934, -73.86, 1.15, 0.1408],
  [2455190.69359, -38.07, 1.25, 0.1429],
  [2455192.68814, 10.64, 1.21, 0.1387],
  [2455379.09473, -2.82, 1.02, 0.1369],
  [2455404.92659, -43.54, 1.13, 0.1409],
  [2455435.04209, -66.83, 1.18, 0.1406],
  [2455704.0826, 37.47, 1.11, 0.14],
  [2455722.1083, -28.39, 1.04, 0.1401],
  [2455729.11002, 37.32, 1.03, 0.1433],
  [2455732.02669, -51.46, 0.99, 0.1348],
  [2455732.0299, -51.14, 1.05, 0.1338],
  [2455753.07133, -61.0, 1.13, 0.1403],
  [2455782.85598, -48.62, 1.28, 0.1378],
  [2455841.77766, -65.39, 1.15, 0.1288],
  [2456077.13053, 0.0, 1.11, 0.125],
  [2456477.10257, -13.16, 1.28, 0.1434],
  [2456529.88022, -3.16, 1.18, 0.1445],
  [2456584.73613, 6.53, 1.3, 0.1394],
  [2456639.68183, 9.25, 1.13, 0.1348],
  [2456676.745, 35.8, 1.2, 0.1544],
];

/** The time origin the lesson works in: the first epoch, rounded down. */
export const EPOCH_BJD = 2453927;

/**
 * The velocities as a recording the workspace can open.
 *
 * The shape js/radialVelocity.js hands to openRvWorkspace(), with every field
 * that describes a simulated run set to null rather than to a plausible value.
 * A real observing run has no cadence, no baseline setting, no noise sigma, no
 * world generation and no seed, and filling those in with something that looks
 * like an answer would make an exported fit claim a provenance it does not
 * have.
 *
 * `truth` is absent for the same reason, and the workspace already knows what
 * to do with that: truthParameters() returns null and the reveal control says
 * there is nothing to reveal. Nobody knows the true period of 51 Pegasi b. The
 * published values in PUBLISHED are measurements, not answers, and the lesson
 * compares against them rather than revealing them.
 *
 * @returns {object} A recording for openRvWorkspace()
 */
export function recording() {
  return {
    points: VELOCITIES.map(([bjd, rv, sigma]) => ({
      day: Number((bjd - EPOCH_BJD).toFixed(5)),
      rv,
      sigma,
    })),
    target: PROVENANCE.target,
    targetId: PROVENANCE.designation,
    // Not a scenario. This did not come from a world.
    scenario: null,
    seed: null,
    config: {
      cadenceDays: null,
      baselineDays: null,
      sigma: null,
      scheduleKind: 'observed',
      scheduleEpochs: null,
    },
    scheduleFingerprint: null,
    geometry: null,
    units: { time: 'days since BJD ' + EPOCH_BJD, velocity: 'm/s' },
    numerical: null,
    worldGeneration: null,
    interventionEpoch: null,
    plannedEpochs: null,
    recordedAt: null,
    // Carried through so an exported fit or a notebook entry names the archive,
    // the query and the checksum rather than just the star.
    observed: PROVENANCE,
  };
}

/**
 * The activity index beside each epoch, for the step that asks whether a
 * residual is the star.
 *
 * @returns {Array<{day: number, s: number}>} S-index against the lesson's clock
 */
export const activityIndex = () =>
  VELOCITIES.map(([bjd, , , s]) => ({
    day: Number((bjd - EPOCH_BJD).toFixed(5)),
    s,
  }));
