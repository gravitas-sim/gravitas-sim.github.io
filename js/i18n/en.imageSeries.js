// =============================================================================
// The motion and parallax tool's words, in English
// -----------------------------------------------------------------------------
// Registered by js/observatory/imageSeries.js when the tool first opens (through
// the Observatory's translator), so no other page carries them. obs.ser.* ids;
// the panel's title is in en.observatory.js (it is on the page before the tool
// loads).
// =============================================================================

export const EN_IMAGESERIES = {
  'obs.ser.help':
    "Fit the positions of one source over time. Give its position at each epoch (type them, paste a table, or add a row from the mark of the image that is open, which uses the sky coordinates above), then choose what to fit. Two epochs give only a shift. A parallax is fitted together with the proper motion only when the epochs sample the parallactic ellipse: at least 8 epochs over at least 0.9 year, in at least 3 of the 4 quarters of the Earth's orbit.",
  'obs.ser.rows': 'Positions at each epoch',
  'obs.ser.col.n': 'Row',
  'obs.ser.col.epoch': 'Epoch',
  'obs.ser.col.ra': 'Right ascension',
  'obs.ser.col.dec': 'Declination',
  'obs.ser.col.sx': 'Uncertainty east (arcsec)',
  'obs.ser.col.sy': 'Uncertainty north (arcsec)',
  'obs.ser.col.remove': 'Remove',
  'obs.ser.removeRow': 'Remove row {n}',
  'obs.ser.cell': 'Row {n}: {col}',
  'obs.ser.format': 'Epoch given as',
  'obs.ser.format.jd': 'Julian date (JD)',
  'obs.ser.format.mjd': 'Modified Julian date (MJD)',
  'obs.ser.scale': 'Time scale',
  'obs.ser.scale.utc': 'UTC',
  'obs.ser.scale.tt': 'TT',
  'obs.ser.scale.tdb': 'TDB',
  'obs.ser.raHours': 'Right ascension in hours (otherwise degrees)',
  'obs.ser.addRow': 'Add a row',
  'obs.ser.tag': 'Tag of the marked source',
  'obs.ser.noTags': 'No tagged point marks',
  'obs.ser.addMark': "Add a row from this image's mark",
  'obs.ser.paste': 'Paste a table',
  'obs.ser.pasteHelp':
    'One epoch a line: epoch, right ascension, declination, uncertainty east and (optionally) north in arcseconds, separated by spaces, tabs, semicolons or, in English, commas. Lines starting with # are ignored. Loading replaces the table.',
  'obs.ser.pasteLabel': 'Rows to load',
  'obs.ser.pasteLoad': 'Load these rows',
  'obs.ser.kind': 'What to fit',
  'obs.ser.kind.shift': 'Two-epoch shift',
  'obs.ser.kind.motion': 'Proper motion',
  'obs.ser.kind.joint': 'Parallax and proper motion',
  'obs.ser.frame': 'Reference frame of the positions (optional)',
  'obs.ser.corr': 'Correction to absolute parallax, mas (optional)',
  'obs.ser.corrSigma': 'Its uncertainty, mas',
  'obs.ser.corrSource': 'Its source (required with a correction)',
  'obs.ser.fit': 'Fit',
  'obs.ser.csv': 'Save residuals as CSV',
  'obs.ser.keep': 'Keep in the ledger',
  'obs.ser.limits':
    'Limits: a straight-line motion at a constant rate; no orbital motion, no relativistic terms, no aberration or light deflection; the uncertainties are taken as independent. A parallax measured against the reference stars is relative, not absolute.',
  'obs.ser.no.row':
    'Row {index} is not a complete position: it needs a number for the epoch, a right ascension, a declination and a positive uncertainty.',
  'obs.ser.no.needTwo': 'A two-epoch shift needs exactly two rows.',
  'obs.ser.no.paste':
    'Each line needs at least four values: epoch, right ascension, declination and an uncertainty.',
  'obs.ser.no.noMark':
    'Choose a tag with a point mark on this image first (the marks panel places them).',
  'obs.ser.no.noTime':
    'This image states no time with a scale (UTC, TT or TDB), so the epoch is not known: type it in a row.',
  'obs.ser.no.noWcs':
    'This image has no sky coordinates yet: solve them or use its header in the panel above, or type the position.',
  'obs.ser.no.mismatch':
    "This image's time is in a different format or scale from the table's: set them to match, or type the row.",
  'obs.ser.no.ephemeris':
    'The ephemeris needed for a parallax could not be loaded; it is fetched the first time, so it needs the network.',
  'obs.ser.no.no-series': 'There are no epochs to fit.',
  'obs.ser.no.too-many': 'A series of more than {max} epochs is refused.',
  'obs.ser.no.bad-epoch':
    'Row {index} has an epoch this tool cannot read: it needs a number, a format (JD or MJD) and a time scale (UTC, TT or TDB).',
  'obs.ser.no.bad-position':
    'Row {index} has a position that is not a right ascension and a declination in degrees (or hours and minutes), or none at all.',
  'obs.ser.no.bad-sigma':
    'Row {index} has an uncertainty that is not a positive number of arcseconds.',
  'obs.ser.no.too-wide':
    'Row {index} is more than 3600 arcseconds from the others: these are not one source.',
  'obs.ser.no.no-baseline':
    'The epochs are less than a day apart: there is no baseline to measure over.',
  'obs.ser.no.too-few-epochs':
    'Not constrained: {n} epochs are too few. A proper motion needs at least 2, and a parallax needs at least 8 epochs that sample the parallactic ellipse (two epochs give only a shift).',
  'obs.ser.no.span':
    'Not constrained: the epochs span {spanYears} year, and a parallax needs at least 0.9 year.',
  'obs.ser.no.phase-coverage':
    "Not constrained: the epochs fall in {sectors} of the 4 quarters of the Earth's orbit, and a parallax needs at least 3.",
  'obs.ser.no.epoch-range':
    'The epochs, read as {format} in {scale}, fall outside the ephemeris this tool holds (JD {startJd} to {stopJd}, 2025 to 2045). Check that they are Julian dates and not modified ones (or the other way round), and the time scale.',
  'obs.ser.no.utc-before-2017':
    'UTC before 2017 needs leap seconds this tool does not hold: give the epochs in TT or TDB.',
  'obs.ser.no.correction':
    'A correction to absolute parallax needs its size and its uncertainty, both numbers of milliarcseconds.',
  'obs.ser.no.correction-source':
    'A correction to absolute parallax needs its source: there is no default or universal value.',
  'obs.ser.no.degenerate':
    'The epochs do not fix the fit (the system is singular).',
  'obs.ser.no.record': 'This is not a record of this tool.',
  'obs.ser.said.rowAdded': 'Row added: {n} rows.',
  'obs.ser.said.loaded': '{n} rows loaded.',
  'obs.ser.said.shift': 'Two-epoch shift made. It is not a parallax.',
  'obs.ser.said.fitted':
    'Fitted: {verdict}, chi-squared {chi2} on {dof} degrees of freedom.',
  'obs.ser.said.csv': 'Saved {n} rows as CSV.',
  'obs.ser.said.kept': 'Kept in the ledger.',
  'obs.ser.said.keepFailed': 'Could not keep it: {why}',
  'obs.ser.shiftLabel': 'shift under a fixed-motion assumption; not a parallax',
  'obs.ser.shift.disp':
    'Displacement: {x} ± {sx} arcsec east and {y} ± {sy} arcsec north.',
  'obs.ser.shift.rate':
    'Over {years} years that is {x} arcsec a year east and {y} arcsec a year north, if the source moved in a straight line.',
  'obs.ser.shift.assume.0':
    'The source moved in a straight line at a constant rate between the epochs.',
  'obs.ser.shift.assume.1':
    'There is no parallax in the shift: with two epochs a parallax and a motion cannot be told apart.',
  'obs.ser.params': 'Fitted parameters',
  'obs.ser.pcol.name': 'Parameter',
  'obs.ser.pcol.value': 'Value',
  'obs.ser.pcol.sigma': 'Uncertainty',
  'obs.ser.pcol.unit': 'Unit',
  'obs.ser.p.x0': 'Offset east at the reference epoch',
  'obs.ser.p.y0': 'Offset north at the reference epoch',
  'obs.ser.p.mux': 'Proper motion in right ascension (times cos dec)',
  'obs.ser.p.muy': 'Proper motion in declination',
  'obs.ser.p.parallax': 'Parallax (relative)',
  'obs.ser.stat':
    'Chi-squared {chi2} on {dof} degrees of freedom, p = {p}: {verdict}.',
  'obs.ser.exactNote':
    'With two epochs there is no residual to check: the solution is exact and nothing tests it.',
  'obs.ser.verdict.consistent': 'consistent with the stated uncertainties',
  'obs.ser.verdict.inconsistent': 'inconsistent with the stated uncertainties',
  'obs.ser.verdict.exact': 'exact',
  'obs.ser.hint.inconsistent':
    'The residuals are larger than the stated uncertainties allow. Check the epoch time scale and origin, the stated uncertainties, and whether the source moves in a straight line.',
  'obs.ser.hint.negative':
    'The parallax is negative by more than 3 times its uncertainty, which no source can have. Check the epoch time scale and origin (a shift of half a year turns a parallax into its negative), the reference stars and the stated uncertainties.',
  'obs.ser.dist.parallax': 'Parallax: {p} ± {s} mas.',
  'obs.ser.corrInfo':
    'Corrected to absolute: {abs} mas, the relative {rel} mas plus {c} mas ({source}).',
  'obs.ser.dist.value':
    'Distance 1/parallax: {d} pc. Read it with its interval: a distance from a parallax is not an unbiased estimate.',
  'obs.ser.dist.none': 'No distance: the parallax is not positive.',
  'obs.ser.dist.low':
    'The parallax is less than {n} times its uncertainty ({s}): the distance is poorly known.',
  'obs.ser.dist.int': '{level}% interval of the distance: {lo} to {hi} pc.',
  'obs.ser.dist.open':
    '{level}% interval of the distance: {lo} pc or more (the parallax interval reaches zero, so nothing bounds it above).',
  'obs.ser.dist.empty':
    '{level}% interval: the parallax interval lies below zero, so it allows no distance.',
  'obs.ser.dist.withheld.inconsistent':
    'No distance is presented: the residuals are larger than the stated uncertainties allow.',
  'obs.ser.dist.withheld.negative':
    'No distance is presented: the parallax is negative by more than 3 times its uncertainty.',
  'obs.ser.dist.method': 'Method: {method}.',
  'obs.ser.method.profile':
    'profile likelihood of the fit (a statement about repeated data, not a probability)',
  'obs.ser.zp.relative':
    'Relative parallax: measured against the reference frame of the positions, not absolute. No correction to absolute was applied. A relative parallax is smaller than the absolute one by the mean parallax of the reference stars, so the distance it gives is never smaller than the true distance if that mean parallax is positive.',
  'obs.ser.zp.corrected':
    'Relative parallax plus a correction to absolute that you supplied ({c} mas, from: {source}): the absolute parallax is only as good as that correction.',
  'obs.ser.assume.0':
    'The interval is a profile interval of a linear least-squares fit with the stated uncertainties: a statement about repeated data and not a probability of the distance.',
  'obs.ser.assume.1':
    'The distance interval is the image of the parallax interval under 1/parallax, open above when the interval reaches zero.',
  'obs.ser.assume.2':
    'A single distance 1/parallax is not an unbiased estimate: use the interval.',
  'obs.ser.assume.3':
    "The parallax is relative to the reference frame: add the reference stars' mean parallax, with its source, to make it absolute.",
  'obs.ser.resid': 'Residuals: observed minus fitted',
  'obs.ser.rcol.n': 'Epoch',
  'obs.ser.rcol.jd': 'Julian date (TDB)',
  'obs.ser.rcol.dx': 'East (mas)',
  'obs.ser.rcol.dy': 'North (mas)',
  'obs.ser.rcol.zx': 'East (sigma)',
  'obs.ser.rcol.zy': 'North (sigma)',
  'obs.ser.axis.x': 'East offset',
  'obs.ser.axis.y': 'North offset',
  'obs.ser.axis.t': 'Days since the first epoch',
  'obs.ser.axis.dx': 'Residual east',
  'obs.ser.axis.dy': 'Residual north',
  'obs.ser.model': 'Fitted path',
  'obs.ser.plot.path':
    'The positions at each epoch as offsets east and north in arcseconds, with the fitted path',
  'obs.ser.plot.resid':
    'The residuals east and north in milliarcseconds against days since the first epoch',
  'obs.ser.csvCol.n': 'epoch',
  'obs.ser.csvCol.jd': 'jd_tdb',
  'obs.ser.csvCol.dx': 'east_arcsec',
  'obs.ser.csvCol.dy': 'north_arcsec',
  'obs.ser.csvCol.zx': 'east_sigma',
  'obs.ser.csvCol.zy': 'north_sigma',
  'obs.ser.ledgerEntry': 'Motion and parallax of {title}',
  'obs.ser.q.x0': 'Offset east',
  'obs.ser.q.y0': 'Offset north',
  'obs.ser.q.mux': 'Proper motion in right ascension',
  'obs.ser.q.muy': 'Proper motion in declination',
  'obs.ser.q.parallax': 'Parallax',
  'obs.ser.q.distance': 'Distance',
};
