// =============================================================================
// The sky-coordinates tool's words, in English
// -----------------------------------------------------------------------------
// Registered by js/observatory/imageCalibration.js when the tool loads (through
// the Observatory's translator, `ctx.registerMessages`), so no other page carries
// them. obs.cal.* ids.
// =============================================================================

export const EN_IMAGECALIBRATION = {
  'obs.cal.intro':
    'Put sky coordinates on this image from stars you can name. Give at least three reference stars: where each is in the picture (in pixels, 1 at the center of the first pixel, y up) and where it is on the sky. The tool fits a tangent-plane projection with a scale, a rotation and, if you allow it, a skew, and shows what is left over.',
  'obs.cal.limits':
    'This is a linear fit with no distortion terms, so it suits a field of a few degrees or less; a wide field or a distorted image will show it in the residuals. A reading of any position through it is only as good as the stars that fix it.',
  'obs.cal.table': 'Reference stars',
  'obs.cal.col.name': 'Star',
  'obs.cal.col.x': 'x (pixels)',
  'obs.cal.col.y': 'y (pixels)',
  'obs.cal.col.ra': 'Right ascension',
  'obs.cal.col.dec': 'Declination',
  'obs.cal.col.sigma': 'Pixel uncertainty',
  'obs.cal.col.remove': 'Remove',
  'obs.cal.cell': 'Star {n}: {field}',
  'obs.cal.remove': 'Remove',
  'obs.cal.removeStar': 'Remove star {n}',
  'obs.cal.removed': 'Star {n} removed.',
  'obs.cal.cleared': 'The reference stars are cleared.',
  'obs.cal.add': 'Add a star',
  'obs.cal.marks': 'Use my point marks',
  'obs.cal.lookup': 'Look up positions by name',
  'obs.cal.clear': 'Clear the stars',
  'obs.cal.solve': 'Solve',
  'obs.cal.keep': 'Keep in the ledger',
  'obs.cal.coordsLabel': 'Positions are typed as',
  'obs.cal.coords.deg': 'degrees',
  'obs.cal.coords.hms': 'hours and degrees (hh mm ss, dd mm ss)',
  'obs.cal.modelLabel': 'Model',
  'obs.cal.model.affine': 'two scales, a rotation and a skew',
  'obs.cal.model.similarity': 'one scale and a rotation',
  'obs.cal.parityLabel': 'Orientation',
  'obs.cal.parity.-1': 'east to the left with north up',
  'obs.cal.parity.1': 'mirrored: east to the right with north up',
  'obs.cal.parity.standard': 'east to the left with north up',
  'obs.cal.parity.mirrored': 'mirrored: east to the right with north up',
  'obs.cal.tangentRa': 'Reference position, right ascension (optional)',
  'obs.cal.tangentDec': 'Reference position, declination (optional)',
  'obs.cal.epoch': 'Source and epoch of typed positions (for the record)',
  'obs.cal.noMarks':
    'There are no point marks on this image. Place some in the marks panel first.',
  'obs.cal.marksAdded':
    '{n} point marks are in the table. Type where each star is on the sky, or look the stars up by name.',
  'obs.cal.lookupNone':
    'Name a star in a row, and leave its sky position empty, to look it up.',
  'obs.cal.lookupDone':
    '{found} positions looked up in the bright-star catalog.',
  'obs.cal.lookupSome':
    '{found} positions looked up; not found, or not one star: {missing}.',
  'obs.cal.lookupFailed':
    'The bright-star catalog could not be fetched. Type the positions instead.',
  'obs.cal.refuse.cell':
    'Star {n}: the {field} is not a number the tool can read.',
  'obs.cal.refuse.tangent':
    'The reference position must be a right ascension and a declination, or both left empty.',
  'obs.cal.refuse.too-few':
    'Not constrained: {n} stars is too few. At least {min} are needed to put sky coordinates on an image.',
  'obs.cal.refuse.collinear':
    'Not constrained: the stars lie along a line (their spread across it is {pct} percent of their spread along it, and at least {min} percent is needed). A line of stars cannot fix the scale and the rotation across it.',
  'obs.cal.refuse.too-wide':
    'Not constrained: star {id} is more than {deg} degrees from the reference position. A tangent plane does not describe a field this wide.',
  'obs.cal.refuse.too-wide-all':
    'Not constrained: the stars are spread over so much of the sky that no tangent plane describes them.',
  'obs.cal.refuse.malformed':
    'Not constrained: star {id} has a position or an uncertainty that is not a usable number.',
  'obs.cal.refuse.duplicate':
    'Not constrained: stars {a} and {b} are at the same pixel.',
  'obs.cal.refuse.singular':
    'Not constrained: the stars do not fix a scale and a rotation together.',
  'obs.cal.solution': 'The solution',
  'obs.cal.res.ref': 'Reference position',
  'obs.cal.res.pix': 'Reference pixel',
  'obs.cal.res.scale': 'Scale, arcseconds per pixel',
  'obs.cal.res.pa': 'Position angle of the +y axis, degrees east of north',
  'obs.cal.res.parity': 'Orientation',
  'obs.cal.res.skew': 'Skew of the axes from a right angle, degrees',
  'obs.cal.res.fit': 'What is left over',
  'obs.cal.res.fitValue':
    'rms residual of {n} stars: {rms} pixel ({arcsec} arcseconds)',
  'obs.cal.residuals': 'Residuals of the reference stars',
  'obs.cal.rcol.star': 'Star',
  'obs.cal.rcol.dx': 'x residual (pixels)',
  'obs.cal.rcol.dy': 'y residual (pixels)',
  'obs.cal.rcol.pix': 'Residual (pixels)',
  'obs.cal.rcol.arcsec': 'Residual (arcseconds)',
  'obs.cal.verdict.consistent':
    'The residuals are consistent with the stated uncertainties (chi-squared {chi2} for {dof} degrees of freedom, p = {p}).',
  'obs.cal.verdict.inconsistent':
    'The residuals are too large for the stated uncertainties (chi-squared {chi2} for {dof} degrees of freedom, p = {p}). Check that each star is matched to the right catalog entry, and the pixel positions.',
  'obs.cal.verdict.exact':
    'The stars fix the numbers exactly: no degree of freedom is left, so the residuals are zero and nothing checks the match. Add stars to check it.',
  'obs.cal.verdictShort.consistent': 'consistent',
  'obs.cal.verdictShort.inconsistent': 'inconsistent, check the matches',
  'obs.cal.verdictShort.exact': 'exactly determined, no check',
  'obs.cal.solved': 'Solved from {n} stars: {verdict}.',
  'obs.cal.sigmaAssumed':
    'Stars with no pixel uncertainty were taken to be placed to {sigma} pixel, which is an assumption.',
  'obs.cal.headerCheck.consistent':
    "The image's own header fits these stars too (rms {rms} pixel).",
  'obs.cal.headerCheck.inconsistent':
    "The image's own header does not fit these stars (rms {rms} pixel): the header, the matches or the pixel positions are wrong.",
  'obs.cal.header.none':
    'This image carries no world coordinates in its header, so the sky coordinates come from reference stars.',
  'obs.cal.header.ok':
    "The image's header gives a tangent-plane projection about {pos}, {scale} arcseconds per pixel, position angle {pa} degrees, {parity}. It is the header's, not solved here.",
  'obs.cal.header.use': "Use the header's coordinates",
  'obs.cal.header.used': "The header's coordinates are in use.",
  'obs.cal.header.notSolved':
    "These are the header's coordinates, read and not solved here: there are no residuals. Solve from reference stars to measure how well they fit.",
  'obs.cal.header.display-only':
    'This image is display-only: its pixels have been stretched or re-encoded, so the sky coordinates are not offered for it.',
  'obs.cal.header.axes':
    "The header names {names}: only right ascension and declination, in that order, are read, so the header's coordinates are not used.",
  'obs.cal.header.projection':
    "The header uses the {name} projection. Only TAN is read, so the header's coordinates are not used.",
  'obs.cal.header.distortion':
    "The header carries a {name} distortion, which is not applied here, so the header's coordinates are not used.",
  'obs.cal.header.incomplete':
    "The header's world coordinates are incomplete, so they are not used.",
  'obs.cal.header.singular':
    "The header's matrix is singular, so its coordinates are not used.",
  'obs.cal.px': 'Pixel x',
  'obs.cal.py': 'Pixel y',
  'obs.cal.toSky': 'Show the sky position',
  'obs.cal.skyRa': 'Right ascension',
  'obs.cal.skyDec': 'Declination',
  'obs.cal.toPixel': 'Show the pixel',
  'obs.cal.needPixel': 'Solve first, then give an x and a y.',
  'obs.cal.needSky':
    'Solve first, then give a right ascension and a declination in the form chosen above.',
  'obs.cal.pixelAt': 'Pixel x {x}, y {y}.',
  'obs.cal.pixelOutside': 'Pixel x {x}, y {y}: outside the image.',
  'obs.cal.nothing': 'There is no solution to keep. Solve first.',
  'obs.cal.ledgerEntry': 'Sky coordinates for {title}',
  'obs.cal.kept': 'Kept in the ledger: {n} quantities.',
  'obs.cal.keepFailed': 'It could not be kept: {why}.',
  'obs.cal.replay.invalid': 'The saved calibration is not readable.',
  'obs.cal.replay.image-changed':
    'The saved calibration was made on different pixels, so it is not used.',
  'obs.cal.replay.differs':
    'Solved again from the saved stars, the numbers differ from the saved ones.',
  'obs.cal.q.crval.ra': 'Reference position, right ascension',
  'obs.cal.q.crval.dec': 'Reference position, declination',
  'obs.cal.q.crpix.x': 'Reference pixel, x',
  'obs.cal.q.crpix.y': 'Reference pixel, y',
  'obs.cal.q.scale': 'Scale, arcseconds per pixel',
  'obs.cal.q.rotation': 'Position angle of the +y axis, east of north',
  'obs.cal.q.skew': 'Skew of the axes from a right angle',
  'obs.cal.q.axisRatio': 'x scale over y scale',
  'obs.cal.q.centre.ra': 'Right ascension of the image center',
  'obs.cal.q.centre.dec': 'Declination of the image center',
  'obs.cal.q.rms': 'rms residual of the reference stars',
  'obs.cal.q.chi2': 'Chi-squared of the residuals',
  'obs.cal.q.dof': 'Degrees of freedom',
};
