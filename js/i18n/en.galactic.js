// =============================================================================
// The galactic instruments' words, in English
// -----------------------------------------------------------------------------
// Registered by js/galacticWidgets.js when the family loads, so no other page
// carries them (the split js/i18n/en.light.js made). galW.* ids.
// =============================================================================

export const EN_GALACTIC = {
  'galW.loading': 'loading the Gaia data…',
  'galW.row.source': 'What this is',
  'galW.sm.title': 'The Sun’s motion',
  'galW.sm.note':
    'Gaia DR3 stars with a radial velocity, each turned into a velocity (U toward the Galactic center, V in the direction of rotation, W toward the north Galactic pole). The Sun’s motion is minus the mean velocity of the stars you keep.',
  'galW.sm.control.maxPc': 'Use stars closer than',
  'galW.sm.control.frame': 'Measure the Sun’s V against',
  'galW.sm.control.view': 'Picture',
  'galW.sm.view.uv': 'Velocities, U against V',
  'galW.sm.view.sky': 'Sky map of the stars and the apex',
  'galW.sm.frame.stars': 'the mean of these stars',
  'galW.sm.frame.stromberg': 'the LSR by Strömberg’s correction',
  'galW.sm.frame.schonrich': 'the LSR of Schönrich et al. 2010',
  'galW.sm.preset.near': 'Within 100 pc',
  'galW.sm.preset.far': 'Within 1,000 pc',
  'galW.sm.preset.lsr': 'Strömberg LSR, sky map',
  'galW.sm.axisU': 'U, km/s (stars’ velocity as seen from the Sun)',
  'galW.sm.axisV': 'V, km/s',
  'galW.sm.apex': 'apex',
  'galW.sm.skyNote':
    'Galactic coordinates, Hammer-Aitoff, l = 0° in the middle',
  'galW.sm.value.source':
    'Measured: Gaia DR3 astrometry and radial velocities (ESA/Gaia/DPAC)',
  'galW.sm.row.n': 'Stars used',
  'galW.sm.row.U': 'Sun’s U (toward the Galactic center)',
  'galW.sm.row.V': 'Sun’s V (direction of rotation)',
  'galW.sm.row.W': 'Sun’s W (toward the north Galactic pole)',
  'galW.sm.row.speed': 'Speed',
  'galW.sm.row.apex': 'Apex (where the Sun is heading)',
  'galW.sm.value.apex': 'l = {l}°, b = {b}°',
  'galW.sm.row.sigmaU': 'Stars’ velocity dispersion σ_U',
  'galW.sm.row.lag': 'Strömberg lag, σ_U² ÷ 80 km/s',
  'galW.sm.row.frame': 'V is measured against',
  'galW.sm.about.stars':
    'the mean of the stars kept, which lag the Galaxy’s rotation',
  'galW.sm.about.stromberg':
    'the local standard of rest, taking the stars’ lag from their own dispersion (about 4 km/s)',
  'galW.sm.about.schonrich':
    'the local standard of rest of Schönrich, Binney and Dehnen 2010, which argue the lag depends on metallicity (12.24 km/s)',
  'galW.sm.row.assume': 'Assumption in use',
  'galW.sm.value.assume':
    'V = {v} km/s is adopted from the literature, not measured here; U and W are still measured.',
  'galW.rd.title': 'The rotating disk',
  'galW.rd.note':
    'Two measurements. The Oort constants A and B from the proper motions of 1,570 Gaia stars, and the Milky Way’s circular speed against radius from Bhattacharjee et al. 2014 (the set for R0 = 8.3 kpc and V0 = 244 km/s), against a model of bulge, disk and halo.',
  'galW.rd.control.view': 'Picture',
  'galW.rd.view.oort': 'Oort constants, from proper motions',
  'galW.rd.view.curve': 'Rotation curve and mass model',
  'galW.rd.control.weight': 'Oort fit weights the stars',
  'galW.rd.weight.distance': 'by distance (1 ÷ parallax²)',
  'galW.rd.weight.none': 'all alike',
  'galW.rd.control.fit': 'Model parameters',
  'galW.rd.fit.mine': 'from my sliders',
  'galW.rd.fit.halo': 'best fit, with a halo',
  'galW.rd.fit.stars': 'best fit, stars only (no halo)',
  'galW.rd.control.mdisk': 'Disk mass',
  'galW.rd.control.rd': 'Disk scale length',
  'galW.rd.control.vh': 'Halo speed, far out',
  'galW.rd.control.rc': 'Halo core radius',
  'galW.rd.preset.oort': 'Oort constants',
  'galW.rd.preset.stars': 'Stars only',
  'galW.rd.preset.halo': 'With a halo',
  'galW.rd.axisL': 'Galactic longitude l, degrees',
  'galW.rd.axisY': '4.74 μ_l × … km/s/kpc',
  'galW.rd.axisR': 'distance from the center, kpc',
  'galW.rd.axisV': 'circular speed, km/s',
  'galW.rd.value.oort':
    'Measured: Gaia DR3 proper motions, fitted for A, B and the Sun’s motion together',
  'galW.rd.row.n': 'Stars used',
  'galW.rd.row.A': 'Oort A',
  'galW.rd.row.B': 'Oort B',
  'galW.rd.row.omega': 'A − B, the angular speed of the local circular orbit',
  'galW.rd.row.v0': 'Circular speed at the Sun, (A − B) × 8.3 kpc',
  'galW.rd.row.weight': 'The fit',
  'galW.rd.about.distance':
    'weights each star by 1 ÷ parallax², because the nearest stars scatter most in these units',
  'galW.rd.about.none':
    'weights every star alike, so the nearest stars, with the largest scatter, dominate',
  'galW.rd.value.curve':
    'Measured: published rotation-curve points, three sets cited in the data package (this is the R0 = 8.3 kpc set). The curves are a model.',
  'galW.rd.row.points': 'Points (2 to 25 kpc)',
  'galW.rd.row.chi2': 'χ² against the points',
  'galW.rd.row.reduced': 'Reduced χ²',
  'galW.rd.row.disc': 'Disk mass',
  'galW.rd.row.halo': 'Halo speed, far out',
  'galW.rd.row.atSun': 'At 8.3 kpc',
  'galW.rd.value.atSun':
    'model {total} km/s: stars and gas {visible}, halo {halo}',
  'galW.rd.row.how': 'The model',
  'galW.rd.value.how':
    'A bulge fixed at 1.5 × 10¹⁰ M☉, an exponential disk, and a halo of constant speed far out. Errors are floored at 3 km/s. The disk is bounded at 8 × 10¹⁰ M☉ in the fits, since a disk with no bound can fit the curve alone and explain nothing.',
  'galW.cm.title': 'Cluster membership by motion',
  'galW.cm.note':
    'The 993 Gaia DR3 stars brighter than G = 17.5 within 14 arcminutes of the open cluster NGC 2420. A cluster and a field are fitted together; each star gets a probability of belonging to the cluster, not a label.',
  'galW.cm.control.view': 'Picture',
  'galW.cm.view.pm': 'Proper motions',
  'galW.cm.view.cmd': 'Color and magnitude diagram',
  'galW.cm.control.dims': 'The fit uses',
  'galW.cm.dims.two': 'proper motion only',
  'galW.cm.dims.three': 'proper motion and parallax',
  'galW.cm.control.threshold': 'Count as a member above probability',
  'galW.cm.preset.pm': 'Proper motions',
  'galW.cm.preset.cmd': 'Color and magnitude',
  'galW.cm.preset.strict': 'Strict: 0.99',
  'galW.cm.axisPmRa': 'proper motion in right ascension, mas/yr',
  'galW.cm.axisPmDec': 'in declination, mas/yr',
  'galW.cm.axisC': 'BP − RP, color',
  'galW.cm.axisG': 'G magnitude (brighter up)',
  'galW.cm.value.source':
    'Measured: Gaia DR3 astrometry and photometry (ESA/Gaia/DPAC). The membership is a model fit.',
  'galW.cm.row.n': 'Stars in the table',
  'galW.cm.row.members': 'Stars above the probability threshold',
  'galW.cm.row.expected': 'Expected members, the sum of all probabilities',
  'galW.cm.row.uncertain': 'Stars with a probability between 0.1 and 0.9',
  'galW.cm.row.pm': 'Cluster’s proper motion',
  'galW.cm.value.pm': '{a}, {d} mas/yr (right ascension, declination)',
  'galW.cm.row.width': 'Cluster’s spread in proper motion (before errors)',
  'galW.cm.row.parallax': 'Mean parallax of the members',
  'galW.cm.row.distance': 'Distance from that parallax',
  'galW.cm.value.distance':
    '{d} kpc, as 1 ÷ parallax, with no zero-point correction (about 0.02 mas) and no check against another method',
  'galW.cm.row.how': 'The fit',
  'galW.cm.value.how':
    'A narrow Gaussian for the cluster and a broad one for the field, fitted together by expectation-maximization from fixed starting values; each star’s own errors widen both.',
  'galW.sky.view': 'Picture',
  'galW.sky.view.galactic': 'Galactic map of the sources',
  'galW.sky.view.vectors': 'Proper-motion vectors on the sky',
  'galW.sky.aria.map':
    'Map of {n} sources in Galactic coordinates, Hammer-Aitoff projection',
  'galW.sky.note.map':
    '{n} sources placed by their Galactic longitude and latitude; their values are in the table below.',
  'galW.sky.aria.vectors':
    'Proper-motion arrows for {n} sources, right ascension increasing to the left',
  'galW.sky.note.vectors':
    '{n} sources, each with an arrow along its proper motion; the median proper motion is {v} mas/yr and its arrow is about a twentieth of the picture wide, all arrows on one scale.',
  'galW.sky.scale':
    'right ascension increases to the left; arrows on one scale, median {v} mas/yr',
};
