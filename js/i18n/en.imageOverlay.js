// =============================================================================
// The catalog overlay, blink and compare tool's words, in English
// -----------------------------------------------------------------------------
// Registered by js/observatory/imageOverlay.js when the tool first opens
// (through the Observatory's translator), so no other page carries them.
// obs.ov.* ids; the panel's title is in en.observatory.js (it is on the page
// before the tool loads).
// =============================================================================

export const EN_IMAGEOVERLAY = {
  'obs.ov.help':
    'Two things you can do with an image once it has sky coordinates: draw the catalog over it, and lay a second image over it to find what moves or changes. Everything stays in your browser.',
  'obs.ov.overlayTitle': 'Catalog overlay',
  'obs.ov.overlayHelp':
    'Draw the bright stars and the planets over the image, at the time it was taken. They are placed with the image’s sky coordinates: the calibration you solved in the sky-coordinates tool, or else the image’s own header. A catalog entry that falls outside the picture is not drawn and not listed.',
  'obs.ov.stars': 'Bright stars',
  'obs.ov.planets': 'Planets',
  'obs.ov.names': 'Names on the picture',
  'obs.ov.magnitude': 'Faintest star (V magnitude)',
  'obs.ov.show': 'Show the catalogs',
  'obs.ov.picture':
    'The image with the catalog stars circled in yellow and the planets marked in blue, each planet inside a dashed circle that is the bound of its position. The table below lists them all.',
  'obs.ov.where.calibration':
    'Sky coordinates: the calibration you solved in the sky-coordinates tool.',
  'obs.ov.where.header':
    'Sky coordinates: the image’s own header, as read (not solved here).',
  'obs.ov.epoch.moved':
    'Epoch: the star catalog gives positions for J2000.0. Each star is moved to the time of the image ({time}) by its proper motion, in a straight line; radial velocity, parallax and aberration are not applied.',
  'obs.ov.epoch.notMoved':
    'Epoch: the stars are drawn where the catalog has them at J2000.0, not moved by proper motion, because {why}.',
  'obs.ov.why.no-time': 'the image has no time',
  'obs.ov.why.time-scale':
    'its time scale ({scale}) cannot be moved to Terrestrial Time here',
  'obs.ov.why.time': 'its time cannot be read',
  'obs.ov.planets.bound':
    'Planets: geometric positions from orbital elements, good to {deg} degree. The dashed circle shows that bound: use it to find the neighborhood, not to measure; for most images it is larger than the picture.',
  'obs.ov.planets.no': 'Planets are not drawn: {why}.',
  'obs.ov.counts': '{stars} stars and {planets} planets are in this frame.',
  'obs.ov.leftOut':
    '{n} fainter stars are left out by the limit of {max} entries.',
  'obs.ov.reach':
    '{name} may be in the field: its predicted position is {pixels} pixels outside the frame, and its position bound reaches the frame.',
  'obs.ov.noSigma':
    'The uncertainty of a position is shown only for a calibration solved here; a header’s is not known.',
  'obs.ov.no.display-only':
    'This image is display-only: it can be marked, but a position in it is not a position on the sky, because its pixels have been stretched, re-encoded or never had their units and provenance recorded.',
  'obs.ov.no.geometry-unrecorded':
    'The image was changed by a step that moves pixels without its sky coordinates following, so its positions no longer match the sky.',
  'obs.ov.no.no-wcs':
    'This image has no sky coordinates. Solve them in the sky-coordinates tool from reference stars, or open an image whose header has them.',
  'obs.ov.no.axes':
    'The image’s header does not have right ascension and declination as its two axes ({names}).',
  'obs.ov.no.distortion':
    'The image’s header carries a {name} distortion, which this tool does not apply.',
  'obs.ov.no.projection':
    'The image’s header uses the {name} projection; only TAN is read here.',
  'obs.ov.no.incomplete':
    'The image’s header does not give a complete sky coordinate system.',
  'obs.ov.no.singular':
    'The image’s header gives a degenerate sky coordinate system.',
  'obs.ov.no.stars-file':
    'The bright-star file could not be loaded. It is fetched from this site the first time the stars are drawn, so it needs the network once.',
  'obs.ov.table': 'Catalog entries in this frame (read-only)',
  'obs.ov.tableNote':
    'These rows are the catalog’s, not your marks: they are not saved with your marks and cannot be edited.',
  'obs.ov.col.name': 'Name',
  'obs.ov.col.kind': 'Kind',
  'obs.ov.col.x': 'x',
  'obs.ov.col.y': 'y',
  'obs.ov.col.ra': 'Right ascension',
  'obs.ov.col.dec': 'Declination',
  'obs.ov.col.mag': 'Magnitude or position bound',
  'obs.ov.col.sigma': 'Position uncertainty (pixels)',
  'obs.ov.kind.star': 'star',
  'obs.ov.kind.planet': 'planet',
  'obs.ov.bound': '± {deg} degree',
  'obs.ov.planet.mercury': 'Mercury',
  'obs.ov.planet.venus': 'Venus',
  'obs.ov.planet.mars': 'Mars',
  'obs.ov.planet.jupiter': 'Jupiter',
  'obs.ov.planet.saturn': 'Saturn',
  'obs.ov.said.drawn': '{stars} stars and {planets} planets drawn.',
  'obs.ov.compareTitle': 'Blink and compare two frames',
  'obs.ov.compareHelp':
    'Lay a second image over this one to find what moves or changes: blink between them, put them side by side with linked cursors, or, for two calibrated frames, subtract them. Blinking and side by side work on any two images. The difference is a picture to look at, not a measurement.',
  'obs.ov.take': 'Use the next image I open as the second frame',
  'obs.ov.cancelTake': 'Cancel',
  'obs.ov.clear': 'Remove the second frame',
  'obs.ov.waiting':
    'Waiting: choose the second image with the file box above, or open one of the examples. It is read in your browser.',
  'obs.ov.cancelled': 'Canceled: the next image opens as usual.',
  'obs.ov.taken': 'The second frame is {title}.',
  'obs.ov.cleared': 'The second frame is removed.',
  'obs.ov.second': 'Second frame: {title} ({width} by {height} pixels).',
  'obs.ov.secondNone': 'There is no second frame yet.',
  'obs.ov.tie': 'How the frames line up',
  'obs.ov.tie.sky': 'Sky coordinates',
  'obs.ov.tie.pairs': 'Matched stars',
  'obs.ov.tie.identity': 'Same pixels',
  'obs.ov.tied.sky': 'Tied through the sky: both frames have sky coordinates.',
  'obs.ov.tied.identity':
    'Tied pixel for pixel: the frames are the same size and nothing is moved.',
  'obs.ov.tied.pairs':
    'Tied by {n} matched stars: rotation {theta}° ± {sigmaTheta}°, shift {dx}, {dy} pixels, scatter {rms} pixel; {verdict}.',
  'obs.ov.verdict.consistent': 'the stars agree with one rotation and shift',
  'obs.ov.verdict.inconsistent':
    'the stars do NOT agree with one rotation and shift: check that each pair is the same star',
  'obs.ov.verdict.exact':
    'three stars fix the rotation and shift exactly, so nothing checks the match',
  'obs.ov.noTie.sky-first':
    'The frames are not tied through the sky. The first frame: {why}',
  'obs.ov.noTie.sky-second':
    'The frames are not tied through the sky. The second frame: {why}',
  'obs.ov.noTie.shape':
    'The frames are {first} and {second} pixels, so the same pixels are not the same places. Use matched stars or sky coordinates.',
  'obs.ov.noTie.too-few':
    '{n} matched stars: at least {min} are needed to line the frames up and say how well.',
  'obs.ov.noTie.degenerate':
    'The stars lie within {rms} pixel of one another in the first frame, so they cannot fix a rotation. Pick stars spread across the frame.',
  'obs.ov.noTie.malformed':
    'Pair {id} has not got two positions and positive numbers.',
  'obs.ov.pairCol.0': 'First frame x',
  'obs.ov.pairCol.1': 'First frame y',
  'obs.ov.pairCol.2': 'Second frame x',
  'obs.ov.pairCol.3': 'Second frame y',
  'obs.ov.addPair': 'Add a pair',
  'obs.ov.pairFromCursors': 'Add a pair from the cursors',
  'obs.ov.removePair': 'Remove',
  'obs.ov.view': 'View',
  'obs.ov.view.blink': 'Blink',
  'obs.ov.view.side': 'Side by side',
  'obs.ov.view.difference': 'Difference',
  'obs.ov.rate': 'Blink rate',
  'obs.ov.rate.0.5': 'Every 2 seconds',
  'obs.ov.rate.1': 'Once a second',
  'obs.ov.rate.2': 'Twice a second',
  'obs.ov.rate.4': 'Four times a second',
  'obs.ov.blinkStart': 'Start blinking',
  'obs.ov.blinkStop': 'Stop blinking',
  'obs.ov.flip': 'Show the other frame',
  'obs.ov.reduced':
    'Your device asks for reduced motion, so the frames do not blink by themselves: use the button to show the other frame.',
  'obs.ov.showing.first': 'Showing the first frame.',
  'obs.ov.showing.second':
    'Showing the second frame, carried onto the first frame’s pixels.',
  'obs.ov.showing.difference': 'Showing the second frame less the first.',
  'obs.ov.sideNote':
    'The first frame and the second in its own pixels. Each cursor is marked in both; when the frames are tied and the cursors are linked, moving one moves the other.',
  'obs.ov.said.blinking': 'Blinking at {rate} a second.',
  'obs.ov.said.stopped': 'Blinking stopped.',
  'obs.ov.diff.legend':
    'Second minus first, in {unit}: gray is no change. A picture for the eye: the second frame is resampled by bilinear interpolation, so this is not a measurement and is not saved.',
  'obs.ov.noDiff.no-tie':
    'No difference yet: the frames are not tied. Tie them above first (through the sky, by matched stars or pixel for pixel).',
  'obs.ov.noDiff.display-only':
    'No difference: {which} frame is display-only, and a difference needs pixel values that measure light.',
  'obs.ov.noDiff.incomplete-contract':
    'No difference: the pixel contract of the {which} frame is not complete (it lacks {missing}).',
  'obs.ov.noDiff.contract-none':
    'No difference: the {which} frame states no pixel contract, so its pixels are not known to measure light.',
  'obs.ov.noDiff.contract-invalid':
    'No difference: the pixel contract of the {which} frame is not a valid description.',
  'obs.ov.noDiff.contract-lossy-history':
    'No difference: the pixels of the {which} frame went through a step that does not keep the measured light (a stretch, a lossy encoding or a resampling that does not conserve flux).',
  'obs.ov.noDiff.not-flux':
    'No difference: the {which} frame’s pixel values are not a measure of light.',
  'obs.ov.noDiff.calibration-state':
    'No difference: the frames are at different stages of calibration ({first} and {second}), so their difference would be the calibration and not the sky.',
  'obs.ov.noDiff.unit':
    'No difference: the frames’ pixels are in different units ({first} and {second}).',
  'obs.ov.noDiff.exposure':
    'No difference: the frames are in a count unit with different exposures ({first} s and {second} s), so their difference would be the exposure and not the sky.',
  'obs.ov.noDiff.shape':
    'No difference: the frames are {first} and {second} pixels, so the same pixels are not the same places.',
  'obs.ov.noDiff.too-large':
    'No difference: it holds four pictures of the frame at once, and that is more than a page may keep of decoded images.',
  'obs.ov.noDiff.registration':
    'No difference: the matched stars do not agree with one rotation and shift, so the frames are not known to be aligned.',
  'obs.ov.which.first': 'first',
  'obs.ov.which.second': 'second',
  'obs.ov.state.raw': 'raw',
  'obs.ov.state.bias-subtracted': 'bias subtracted',
  'obs.ov.state.dark-subtracted': 'dark subtracted',
  'obs.ov.state.flat-fielded': 'flat fielded',
  'obs.ov.state.calibrated': 'calibrated',
  'obs.ov.cursorFirst': 'Cursor: first frame ({x}, {y}).',
  'obs.ov.cursorSecond': 'Second frame ({x}, {y}).',
  'obs.ov.cursorSky': 'Sky {ra} {dec}.',
  'obs.ov.picFirst':
    'The first frame with its cursor. The arrow keys move the cursor one pixel, a quarter pixel with Alt and four with Shift; a click puts it there.',
  'obs.ov.picSecond':
    'The second frame with its cursor. The arrow keys move the cursor one pixel, a quarter pixel with Alt and four with Shift; a click puts it there.',
  'obs.ov.left': 'Cursor left',
  'obs.ov.right': 'Cursor right',
  'obs.ov.up': 'Cursor up',
  'obs.ov.down': 'Cursor down',
  'obs.ov.step': 'Step (pixels)',
  'obs.ov.step.0.25': '0.25',
  'obs.ov.step.1': '1',
  'obs.ov.step.4': '4',
  'obs.ov.link': 'Link the cursors',
};
