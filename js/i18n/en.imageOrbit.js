// =============================================================================
// The orbit and track tools' words, in English
// -----------------------------------------------------------------------------
// Registered by js/observatory/imageOrbit.js when the tools first open (through
// the Observatory's translator), so no other page carries them. obs.orb.* ids;
// the disclosure's title is in en.observatory.js (it is on the page before the
// tools load).
// =============================================================================

export const EN_IMAGEORBIT = {
  'obs.orb.help':
    'Two tools over a table you type or paste. The orbit tool fits the relative positions of a visual binary at several epochs, as a circular orbit seen obliquely or as a full Keplerian orbit (Thiele-Innes elements), and says "not constrained", with the reason, when the arc is too short to support it. The track tool finds a moving object among the static sources of several frames and measures its rate and position angle. Nothing is sent anywhere.',
  'obs.orb.mode': 'Tool',
  'obs.orb.mode.orbit': 'Orbit of a binary star',
  'obs.orb.mode.track': 'Track of a moving object',
  'obs.orb.depth': 'Orbit model',
  'obs.orb.depth.elliptical': 'Elliptical (Thiele-Innes elements)',
  'obs.orb.depth.circular': 'Circular, seen obliquely',
  'obs.orb.input': 'Positions given as',
  'obs.orb.input.offsets': 'Offsets north and east (arcsec)',
  'obs.orb.input.polar': 'Separation (arcsec) and angle (degrees)',
  'obs.orb.epochFormat': 'Epoch given as',
  'obs.orb.fmt.year': 'Julian year',
  'obs.orb.fmt.byear': 'Besselian year',
  'obs.orb.fmt.jd': 'Julian date (JD)',
  'obs.orb.fmt.mjd': 'Modified Julian date (MJD)',
  'obs.orb.scale': 'Time scale',
  'obs.orb.scale.utc': 'UTC',
  'obs.orb.scale.tt': 'TT',
  'obs.orb.scale.tdb': 'TDB',
  'obs.orb.coords': 'Positions given as',
  'obs.orb.coords.offsets': 'Offsets east and north (arcsec)',
  'obs.orb.coords.sky': 'Right ascension and declination (degrees)',
  'obs.orb.data': 'Table to fit',
  'obs.orb.dataHelp.orbit':
    'One epoch a line, separated by spaces, tabs, semicolons or, in English, commas: the epoch, then north and east offsets and their uncertainty (arcsec), or separation, angle from north through east, and the uncertainty of each. Lines starting with # are ignored.',
  'obs.orb.dataHelp.track':
    'One detection a line: the epoch of its frame, then the two coordinates and the uncertainty (arcsec; for sky positions, in degrees and arcseconds). Detections with the same epoch are one frame. Lines starting with # are ignored.',
  'obs.orb.plx': 'Parallax (mas, optional)',
  'obs.orb.plxSigma': 'Its uncertainty (mas)',
  'obs.orb.frame': 'The parallax is',
  'obs.orb.frame.relative': 'relative to reference stars',
  'obs.orb.frame.absolute': 'absolute (corrected)',
  'obs.orb.source': 'Source of the correction (absolute only)',
  'obs.orb.fit': 'Fit the orbit',
  'obs.orb.find': 'Find the mover',
  'obs.orb.example': 'Load a synthetic example',
  'obs.orb.csv': 'Save the residuals as CSV',
  'obs.orb.keep': 'Keep in the ledger',
  'obs.orb.limits':
    "Limits. A visual orbit from relative astrometry alone leaves the ascending node ambiguous by 180 degrees, so the node is given in 0 to 180 and the argument shifted to match. The orbit is fitted only when the arc covers enough of the period (at least 0.4 of it for a circular orbit and 0.5 for an elliptical one at the period's upper two-sigma value), the parameters are not nearly degenerate, the period is bounded on both sides, no other period fits as well, and the residuals agree with the stated uncertainties. It was tested on 12 epochs with 2 percent noise; other cases are not covered by that test. No perturbation, light-travel time or relative proper motion. A track is a rate and an angle and nothing more: three positions on a short arc do not give an orbit.",
  'obs.orb.elements': 'The orbit',
  'obs.orb.col.name': 'Element',
  'obs.orb.col.value': 'Value and uncertainty',
  'obs.orb.col.unit': 'Unit',
  'obs.orb.el.P': 'Period',
  'obs.orb.el.a': 'Semi-major axis',
  'obs.orb.el.e': 'Eccentricity',
  'obs.orb.el.i': 'Inclination',
  'obs.orb.el.Omega': 'Ascending node (0 to 180)',
  'obs.orb.el.omega': 'Argument of periastron',
  'obs.orb.el.latitude': 'Argument of latitude at the reference epoch',
  'obs.orb.el.T': 'Epoch of periastron',
  'obs.orb.u.yr': 'years',
  'obs.orb.u.mas': 'mas',
  'obs.orb.u.deg': 'degrees',
  'obs.orb.u.year': 'year',
  'obs.orb.u.arcsecHour': 'arcsec per hour',
  'obs.orb.eLimit': 'less than {e} (95 percent)',
  'obs.orb.period':
    'Period interval from the chi-square profile: {lo} to {hi} years (68.27 percent), {lo95} to {hi95} years (95 percent).',
  'obs.orb.criterion':
    'The arc covers {have} of the period at its upper two-sigma value (needed: {need}); the condition number of the normal matrix is {kappa} (at most {max}); chi-squared {chi2} for {dof} degrees of freedom, probability {p}.',
  'obs.orb.ecc.detected':
    'The eccentricity is detected: the elliptical model improves chi-squared by {d} over the circular one.',
  'obs.orb.ecc.none':
    'The eccentricity is not detected (the elliptical model improves chi-squared by only {d}), so the circular orbit is shown, with an upper limit on the eccentricity and no periastron.',
  'obs.orb.ecc.circular': 'A circular orbit was fitted, as chosen.',
  'obs.orb.node':
    'The ascending node cannot be told from the descending one without radial velocities: the node is given between 0 and 180 degrees and the argument shifted to match. The mass sum does not depend on the choice.',
  'obs.orb.mass':
    "Mass sum by Kepler's third law: {m} solar masses, {lo} to {hi} (68.27 percent) and {lo95} to {hi95} (95 percent), from a seeded Monte Carlo of the parallax and the orbit.",
  'obs.orb.frameStatement.relative':
    'The parallax is relative to the reference stars of its frame, which is smaller than the absolute parallax by their mean parallax: the distance and the mass sum read high by that much.',
  'obs.orb.frameStatement.absolute':
    'The parallax is absolute, corrected as stated by "{source}"; the correction and its uncertainty are in the parallax given.',
  'obs.orb.no.mass.parallax':
    'No mass sum: it needs a positive parallax and its uncertainty.',
  'obs.orb.no.mass.parallax-weak':
    'No mass sum: the parallax is only {snr} times its uncertainty and the mass sum needs at least {need}.',
  'obs.orb.no.mass.frame':
    'No mass sum: a parallax needs its reference-frame statement, and an absolute parallax needs the source of its correction.',
  'obs.orb.no.mass.no-orbit': 'No mass sum: there is no orbit.',
  'obs.orb.trackParams': 'The mover',
  'obs.orb.rate': 'Rate of motion',
  'obs.orb.pa': 'Position angle (north through east)',
  'obs.orb.trackFit':
    'Found in {n} frames among {s} static sources, moving at {sig} times the uncertainty of its rate; chi-squared {chi2} for {dof} degrees of freedom, probability {p}.',
  'obs.orb.paLocal':
    "The angle is the local one on the sky at the mover; the tangent plane's differs by the convergence of the meridians (under 0.01 degree for a field of a few arcminutes).",
  'obs.orb.paPlane':
    'The angle is measured in the plane of the offsets given, from its north.',
  'obs.orb.resid': 'Residuals',
  'obs.orb.rcol.n': 'Row',
  'obs.orb.rcol.year': 'Epoch (year)',
  'obs.orb.rcol.dx': 'North residual (mas)',
  'obs.orb.rcol.dy': 'East residual (mas)',
  'obs.orb.rcol.zx': 'North, in sigmas',
  'obs.orb.rcol.zy': 'East, in sigmas',
  'obs.orb.csvCol.n': 'row',
  'obs.orb.csvCol.year': 'epoch (year)',
  'obs.orb.csvCol.x': 'north (arcsec)',
  'obs.orb.csvCol.y': 'east (arcsec)',
  'obs.orb.csvCol.dx': 'north residual (arcsec)',
  'obs.orb.csvCol.dy': 'east residual (arcsec)',
  'obs.orb.csvCol.zx': 'north residual (sigma)',
  'obs.orb.csvCol.zy': 'east residual (sigma)',
  'obs.orb.axis.east': 'East offset',
  'obs.orb.axis.north': 'North offset',
  'obs.orb.axis.t': 'Years from the first epoch',
  'obs.orb.axis.dx': 'North residual',
  'obs.orb.axis.dy': 'East residual',
  'obs.orb.model': 'Fitted orbit',
  'obs.orb.plot.orbit':
    'The measured positions and the fitted apparent orbit, east against north',
  'obs.orb.plot.track':
    'The positions of the mover and its fitted straight line, east against north',
  'obs.orb.plot.resid': 'Residuals of the fit against time',
  'obs.orb.said.fitted': 'Orbit fitted to {n} epochs.',
  'obs.orb.said.found': 'A mover was found.',
  'obs.orb.said.csv': 'Saved {n} rows as CSV.',
  'obs.orb.said.kept': 'Kept in the ledger.',
  'obs.orb.said.keepFailed': 'Not kept: {why}',
  'obs.orb.said.example.orbit':
    'A synthetic binary was loaded: 12 epochs of an orbit made by a program from known elements (a 0.9 arcsec, e 0.45, i 62, node 35, omega 110 degrees, period 14.2 years, 15 mas noise), with a synthetic parallax of 100 mas.',
  'obs.orb.said.example.track':
    'A synthetic field was loaded: 5 frames of 7 static sources and one mover (0.8 arcsec per hour at 60 degrees, 40 mas noise), made by a program.',
  'obs.orb.ledgerEntry.orbit': 'Orbit of a binary star',
  'obs.orb.ledgerEntry.track': 'Track of a moving object',
  'obs.orb.q.P': 'Period',
  'obs.orb.q.a': 'Semi-major axis',
  'obs.orb.q.e': 'Eccentricity',
  'obs.orb.q.i': 'Inclination',
  'obs.orb.q.Omega': 'Ascending node',
  'obs.orb.q.omega': 'Argument',
  'obs.orb.q.T': 'Epoch of periastron',
  'obs.orb.q.mass': 'Mass sum',
  'obs.orb.q.rate': 'Rate',
  'obs.orb.q.pa': 'Position angle',
  'obs.orb.no.paste':
    'The table is not usable: every line needs {n} numbers at least (check the separators and the decimal mark).',
  'obs.orb.no.no-frames': 'There are no frames.',
  'obs.orb.no.bad-series': 'The table has no epochs.',
  'obs.orb.no.bad-epoch': 'Row {row} has no usable epoch.',
  'obs.orb.no.bad-position': 'Row {row} has no usable position.',
  'obs.orb.no.bad-sigma':
    'Row {row} needs positive uncertainties (and a correlation between -1 and 1).',
  'obs.orb.no.bad-source':
    'A source has no usable position or sits too far from the field center.',
  'obs.orb.no.span': 'The epochs must span at least one day.',
  'obs.orb.no.depth': 'Choose a circular or an elliptical orbit.',
  'obs.orb.no.too-many': 'The table is too large.',
  'obs.orb.no.too-large':
    'The frames hold too many sources to search for a track.',
  'obs.orb.no.epochs':
    'Not constrained: an orbit of this kind needs at least {need} epochs and there are {n}.',
  'obs.orb.no.coverage':
    "Not constrained: the arc covers too little of the period. At the period's upper two-sigma value it covers {have} of it, and this orbit needs {need}. Observe longer, or ask for a circular orbit if that is what the system is.",
  'obs.orb.no.conditioning':
    'Not constrained: over this arc the parameters trade against each other (the condition number of the normal matrix is {kappa}, above {max}).',
  'obs.orb.no.period-unbounded':
    'Not constrained: the data bound the period on neither or only one side, so no period is given.',
  'obs.orb.no.period-ambiguous':
    'Not constrained: another period, {alt} years, fits the epochs as well, so the data cannot choose between them. A regular cadence causes this; add epochs at other intervals.',
  'obs.orb.no.inconsistent':
    'Not constrained: the residuals do not agree with the stated uncertainties (probability {p}). The model does not describe the data (try the other model), or the uncertainties are too small.',
  'obs.orb.no.record': 'This is not a record of this tool.',
  'obs.orb.no.too-few-frames':
    'A track needs at least 3 frames; there are {n}.',
  'obs.orb.no.no-mover':
    'No mover: no source moves by more than 5 times the uncertainty of its rate ({static} static sources found).',
  'obs.orb.no.several-movers':
    '{movers} sources move, so none is chosen. Remove one from the table to measure the other.',
};
