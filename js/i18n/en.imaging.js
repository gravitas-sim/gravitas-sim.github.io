// =============================================================================
// The image-measurement instruments' words, in English
// -----------------------------------------------------------------------------
// Registered by js/imagingWidgets.js when the family loads, so no other page
// carries them. imgW.* ids. The same keys are in es.imaging.js.
// =============================================================================

export const EN_IMAGING = {
  'imgW.row.source': 'What this is',
  'imgW.row.how': 'What is left out',
  'imgW.waiting': 'Loading the data this instrument needs',
  'imgW.refused': 'Not constrained',
  'imgW.m.title': 'Marking the Moon',
  'imgW.m.note':
    'A real picture of the Moon from the Galileo spacecraft, 7 December 1992, shown in gray. Mark the full width of the disc with a reference pair of known length, then circle a feature: the scale comes from the pair and nowhere else.',
  'imgW.m.legend': 'reference pair · circle',
  'imgW.m.loading': 'Loading the picture',
  'imgW.m.failed': 'The picture could not be loaded',
  'imgW.m.control.x1': 'Left end of the pair, x',
  'imgW.m.control.x2': 'Right end of the pair, x',
  'imgW.m.control.cx': 'Circle center, x',
  'imgW.m.control.cy': 'Circle center, y',
  'imgW.m.control.r': 'Circle radius',
  'imgW.m.preset.reset': 'Reset the circle',
  'imgW.m.value.source':
    'A real picture, enhanced color of a Galileo flyby shown in gray: its gray levels are for the eye and not a measure of light, so the Observatory marks it as display-only',
  'imgW.m.row.pair': 'Length of the pair',
  'imgW.m.row.assumed': 'Length the pair is taken to span',
  'imgW.m.value.assumed': '{km} km, the Moon’s mean diameter (assumed)',
  'imgW.m.row.scale': 'Scale from the pair',
  'imgW.m.row.radius': 'Radius of the circle',
  'imgW.m.row.diameterPx': 'Diameter of the circle',
  'imgW.m.row.diameterKm': 'Diameter of the circle in kilometers',
  'imgW.m.row.offset':
    'Distance of the circle from the disc’s center, in disc radii',
  'imgW.m.row.foreshort':
    'Width of a round feature there along that direction, as a share of its true width',
  'imgW.m.value.how':
    'The stated uncertainty is only the rounding of each placement (one pixel is a step of 0.29 pixel); how sharp the edge is, and whether the picture is cropped, are not in it',
  'imgW.m.value.none': 'not set',
  'imgW.p.title': 'The path of a star on the sky',
  'imgW.p.note':
    'Fourteen positions of one synthetic star over about two years, each with a 4 milliarcsecond uncertainty, made from the exact geometry of the Earth’s orbit. Choose what to fit: a two-epoch shift, a straight proper motion, or a proper motion with a parallax.',
  'imgW.p.legend': 'positions · fit · east →, north ↑ (mas)',
  'imgW.p.control.fit': 'What to fit',
  'imgW.p.control.n': 'Epochs used',
  'imgW.p.control.zero': 'Correction to absolute parallax',
  'imgW.p.fit.shift': 'two-epoch shift',
  'imgW.p.fit.motion': 'proper motion',
  'imgW.p.fit.joint': 'parallax and motion',
  'imgW.p.preset.shift': 'Shift, first to last',
  'imgW.p.preset.motion': 'Motion only',
  'imgW.p.preset.joint': 'Parallax and motion',
  'imgW.p.value.source':
    'Synthetic: a star at a distance and with a motion the investigation chose, seen from the Earth’s moving position, with seeded noise; the truth is not shown here',
  'imgW.p.row.n': 'Epochs used',
  'imgW.p.row.span': 'Time covered',
  'imgW.p.row.label': 'What this result is',
  'imgW.p.value.shiftLabel':
    'A shift under a fixed-motion assumption, not a parallax',
  'imgW.p.row.dx': 'Shift east',
  'imgW.p.row.dy': 'Shift north',
  'imgW.p.row.sep': 'Size of the shift',
  'imgW.p.row.rate': 'Rate if it were all motion',
  'imgW.p.row.lever': 'Parallax the shift could hide, per 100 mas',
  'imgW.p.row.mux': 'Proper motion east',
  'imgW.p.row.muy': 'Proper motion north',
  'imgW.p.row.chi2': 'Chi-square of the fit',
  'imgW.p.row.dof': 'Degrees of freedom',
  'imgW.p.row.pValue': 'Chance of a fit this bad if the model were right',
  'imgW.p.row.verdict': 'Residuals',
  'imgW.p.verdict.consistent': 'consistent with the stated uncertainties',
  'imgW.p.verdict.inconsistent':
    'not consistent with the stated uncertainties: the model does not describe the data',
  'imgW.p.row.parallax': 'Parallax, relative',
  'imgW.p.row.correction': 'Correction to absolute',
  'imgW.p.value.correction': '{value} mas ± {sigma} (a stated assumption)',
  'imgW.p.value.noCorrection': 'none applied',
  'imgW.p.row.absolute': 'Parallax, absolute',
  'imgW.p.row.distance': 'Distance, 1 over the parallax',
  'imgW.p.row.interval68': 'Distance, 68 percent interval',
  'imgW.p.row.interval95': 'Distance, 95 percent interval',
  'imgW.p.row.signif': 'Parallax over its uncertainty',
  'imgW.p.row.frame': 'Reference frame',
  'imgW.p.value.relative':
    'The parallax is relative to the reference stars, so it is smaller than the absolute one by their mean parallax and the distance is never smaller than the true one',
  'imgW.p.value.corrected':
    'A correction to absolute was applied; the absolute parallax is only as good as that correction',
  'imgW.p.row.no': 'Why',
  'imgW.p.no.too-few-epochs':
    'A parallax needs at least {min} epochs that sample the Earth’s orbit; {n} do not: this is not constrained',
  'imgW.p.no.span':
    'A parallax needs epochs over at least {min} year; these cover {spanYears}',
  'imgW.p.no.phase-coverage':
    'The epochs do not sample the Earth’s orbit: not constrained',
  'imgW.p.no.other': 'The fit was refused: {code}',
  'imgW.p.value.how':
    'Independent errors and a straight proper motion; no orbital motion, no light bending, and the errors common to the reference stars are not modeled',
  'imgW.o.title': 'The orbit of a binary star',
  'imgW.o.note':
    'Twelve positions of a companion relative to its star over sixteen years, each with a 15 milliarcsecond uncertainty, from a synthetic binary. The curve is the orbit fitted to the epochs used; a refusal is the answer when the epochs cannot support one.',
  'imgW.o.legend': 'companion · fitted orbit · east →, north ↑ (arcsec)',
  'imgW.o.control.n': 'Epochs used',
  'imgW.o.control.model': 'Orbit model',
  'imgW.o.control.plx': 'Parallax, relative',
  'imgW.o.model.ellipse': 'elliptical',
  'imgW.o.model.circle': 'circular',
  'imgW.o.preset.all': 'All twelve, elliptical',
  'imgW.o.preset.six': 'First six',
  'imgW.o.value.source':
    'Synthetic: a binary of chosen elements seen at an angle, with seeded noise; the truth is not shown here',
  'imgW.o.row.n': 'Epochs used',
  'imgW.o.row.span': 'Years covered',
  'imgW.o.row.period': 'Period',
  'imgW.o.row.a': 'Semi-major axis',
  'imgW.o.row.e': 'Eccentricity',
  'imgW.o.row.i': 'Inclination',
  'imgW.o.row.node': 'Ascending node',
  'imgW.o.row.omega': 'Argument of periastron',
  'imgW.o.row.T': 'Epoch of periastron',
  'imgW.o.row.chi2': 'Chi-square and degrees of freedom',
  'imgW.o.row.pValue': 'Chance of a fit this bad if the model were right',
  'imgW.o.row.coverage': 'Share of a period the epochs cover',
  'imgW.o.row.mass': 'Mass sum',
  'imgW.o.row.mass68': 'Mass sum, 68 percent interval',
  'imgW.o.row.mass95': 'Mass sum, 95 percent interval',
  'imgW.o.row.plx': 'Parallax used',
  'imgW.o.value.plx': '{value} mas ± {sigma}, relative to reference stars',
  'imgW.o.row.frame': 'Reference frame',
  'imgW.o.value.frame':
    'The parallax is relative: the distance and the mass sum read high by the reference stars’ mean parallax',
  'imgW.o.row.nodeNote': 'The node',
  'imgW.o.value.nodeNote':
    'Positions alone cannot tell which of the two crossings is ascending, so the node is given from 0 to 180 degrees',
  'imgW.o.row.no': 'Why',
  'imgW.o.no.epochs':
    'The {depth} orbit needs at least {need} epochs; {n} given: not constrained',
  'imgW.o.no.inconsistent':
    'The residuals are not consistent with the stated uncertainties (chi-square {chi2} for {dof} degrees of freedom): this model does not describe the data',
  'imgW.o.no.coverage':
    'The epochs cover too little of one period to fix an orbit: not constrained',
  'imgW.o.no.other': 'The fit was refused: {code}',
  'imgW.o.value.how':
    'Positions alone give no masses of the two stars apart, only their sum; the sum assumes the distance, and its uncertainty carries the parallax’s, cubed',
  'imgW.f.title': 'A field of stars',
  'imgW.f.note':
    'One synthetic frame, 192 by 192 pixels, of forty stars of every brightness on a noisy sky, made by the detector kernel with seeded noise. Set the threshold and read what the detector lists and the width of the stars it measures from the bright ones. The stars that were really placed can be shown, and only then.',
  'imgW.f.legend': 'sources the detector lists (circled)',
  'imgW.f.legendTruth': 'sources listed (circled) · stars placed (+)',
  'imgW.f.control.sigma': 'Threshold',
  'imgW.f.control.truth': 'Placed stars',
  'imgW.f.truth.on': 'shown',
  'imgW.f.truth.off': 'hidden',
  'imgW.f.preset.default': 'Threshold 4, truth hidden',
  'imgW.f.preset.low': 'Threshold 2.5, truth shown',
  'imgW.f.value.source':
    'Synthetic: forty stars of a table the investigation made, on a detector with a sky of 90 electrons a pixel and 8 of read noise, with seeded noise; the truth is hidden until it is switched on',
  'imgW.f.row.sigma': 'Threshold, in sigma of the smoothed noise',
  'imgW.f.row.sources': 'Sources listed',
  'imgW.f.row.flagged':
    'Sources carrying a flag (crowded, edge, saturated, sharp)',
  'imgW.f.row.stars': 'Stars used for the width',
  'imgW.f.row.width': 'Width of the stars (FWHM)',
  'imgW.f.row.check': 'Does the model describe them?',
  'imgW.f.value.agree':
    'Yes as far as this check goes: a Gaussian and a Moffat give the same width, and the reduced chi-square is {chi2}',
  'imgW.f.value.limited':
    'No: the width depends on the model, and the reduced chi-square is {chi2}',
  'imgW.f.value.nostars':
    'No star is bright and clean enough: none has a signal to noise of 30 or more with no flag',
  'imgW.f.row.placed': 'Stars that were placed',
  'imgW.f.row.found': 'Of them, listed as a source',
  'imgW.f.row.missed': 'Of them, not listed',
  'imgW.f.row.false': 'Sources that are not a star that was placed',
  'imgW.f.value.how':
    'The list is of what stands out of the noise at this threshold, not of what is there. The width is a circular Gaussian fitted to the six or so brightest clean stars: it is the width of this frame only, and it does not see a profile the model cannot draw',
  'imgW.c.title': 'How faint can the detector see?',
  'imgW.c.note':
    'Stars of known brightness are added to a copy of the same frame, the detector looks again, and the share it finds, by magnitude, is the completeness of this search of this frame. Magnitudes here are instrumental: minus 2.5 times the logarithm of the electrons a second, so a smaller number is brighter.',
  'imgW.c.legend': 'share found · 68 percent interval',
  'imgW.c.axis': 'instrumental magnitude (brighter to the left)',
  'imgW.c.control.sigma': 'Threshold',
  'imgW.c.control.width': 'Width of added stars',
  'imgW.c.control.truth': 'Field’s own stars',
  'imgW.c.preset.default': 'Threshold 4, width 3',
  'imgW.c.preset.three': 'Threshold 3, width 3',
  'imgW.c.value.source':
    'Synthetic: stars injected at random places of a copy of the synthetic field, twelve trials of twenty, between magnitude minus 3.4 and minus 1.6, with seeded shot noise',
  'imgW.c.row.width': 'Width of the injected stars',
  'imgW.c.value.width': '{width} px, entered',
  'imgW.c.row.measured': 'Width measured from the field’s stars',
  'imgW.c.no.other': 'The injection was refused: {code}',
  'imgW.c.row.injected': 'Stars injected',
  'imgW.c.value.injected': '{n} in {trials} trials',
  'imgW.c.row.bin': 'Magnitude {bin}',
  'imgW.c.value.bin': '{k} of {n} found ({p} percent, interval {lo} to {hi})',
  'imgW.c.row.m50': 'Magnitude at 50 percent found',
  'imgW.c.row.m90': 'Magnitude at 90 percent found',
  'imgW.c.value.cross': '{m} (the interval’s edges cross at {lo} and {hi})',
  'imgW.c.value.never': 'the curve never crosses it',
  'imgW.c.row.extra': 'Sources listed that were not injected, a trial',
  'imgW.c.row.applies':
    'Describes the first instrument’s search (threshold 4, width 3)?',
  'imgW.c.value.applies': 'Yes: the same width, noise and settings',
  'imgW.c.value.differs':
    'No: it differs in {what}. This curve is the answer for the search it was measured under and for no other',
  'imgW.c.row.expected': 'Stars of the field this curve says a search finds',
  'imgW.c.row.found': 'Stars of the field the search listed',
  'imgW.c.value.how':
    'Isolated stars only: crowded fields are another measurement. One width for the whole frame, instrumental magnitudes with no zero point, and the bin’s share is an average across the bin. It is the detection chance for this frame and this search, not for the instrument',
};
