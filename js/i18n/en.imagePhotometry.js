// =============================================================================
// The photometry tool's words, in English
// -----------------------------------------------------------------------------
// Registered by js/observatory/imagePhotometry.js when the tool first opens
// (through the Observatory's translator), so no other page carries them.
// obs.ph.* ids; the panel's title is in en.observatory.js (it is on the page
// before the tool loads).
// =============================================================================

export const EN_IMAGEPHOTOMETRY = {
  'obs.ph.help':
    'Measure the light a star sent, with the error that goes with it. Choose a mark or type a position, set the aperture (the circle that holds the star) and the annulus (the ring that measures the sky), and press Measure. Radii are in pixels: change them in the boxes, with the buttons, or by tapping the picture.',
  'obs.ph.no.display-only':
    'This image is display-only: it can be marked, but photometry needs pixel values that measure light, and its pixels have been stretched, re-encoded or never had their units and provenance recorded.',
  'obs.ph.no.no-contract':
    'This image states no pixel contract (units, gain, read noise, saturation), so it is display-only: it can be marked, and photometry waits for a contract.',
  'obs.ph.no.not-flux':
    'The pixel values are not a measure of light (flags, display levels or a unit nobody recorded), so there is no photometry to do.',
  'obs.ph.no.incomplete-contract':
    'Photometry needs the pixel contract complete; this one lacks: {missing}.',
  'obs.ph.no.lossy-history':
    'The pixels went through a step that does not keep the measured light (a stretch, a lossy encoding or a resampling that does not conserve flux), so they cannot be measured for it.',
  'obs.ph.no.raw-frame':
    'This frame is raw: its background still holds the bias, so the noise of the sky would be wrong. Calibrate it first.',
  'obs.ph.no.invalid': 'This is not a valid image description.',
  'obs.ph.no.saturated':
    'Not measured: {pixels} pixels in the aperture reach the level where the detector stops being linear, so the light there is not what the star sent.',
  'obs.ph.no.masked':
    'Not measured: {pixels} pixels in the aperture are masked or have no value.',
  'obs.ph.no.edge': 'Not measured: the aperture reaches beyond the image.',
  'obs.ph.no.crowded':
    'Not measured: another source ({with}) is close enough to reach this one’s sky ring. This tool does not separate neighbors.',
  'obs.ph.no.annulus':
    'Not measured: the sky ring holds only {pixels} usable pixels; it needs at least 20.',
  'obs.ph.no.centroid':
    'Not measured: the center could not be found ({reason}).',
  'obs.ph.reason.edge': 'the window reaches the edge',
  'obs.ph.reason.no-flux': 'there is no light above the sky in the window',
  'obs.ph.reason.not-converged': 'it did not settle',
  'obs.ph.noMarks': 'There are no point or count marks on this image yet.',
  'obs.ph.target': 'Source',
  'obs.ph.typed': 'A position typed here',
  'obs.ph.x': 'x (pixels)',
  'obs.ph.y': 'y (pixels)',
  'obs.ph.fwhm': 'Width of a star, FWHM (pixels)',
  'obs.ph.r': 'Aperture radius (pixels)',
  'obs.ph.rIn': 'Sky ring, inner radius (pixels)',
  'obs.ph.rOut': 'Sky ring, outer radius (pixels)',
  'obs.ph.edge': 'Aperture edge',
  'obs.ph.edge.exact': 'Partial pixels counted',
  'obs.ph.edge.center': 'Whole pixels only',
  'obs.ph.sky': 'Sky',
  'obs.ph.sky.annulus': 'Mean of the ring',
  'obs.ph.sky.plane': 'Plane through the ring',
  'obs.ph.recentre': 'Center on the star first (weighted centroid)',
  'obs.ph.ring': 'Resize the',
  'obs.ph.ring.aperture': 'aperture',
  'obs.ph.ring.inner': 'inner ring',
  'obs.ph.ring.outer': 'outer ring',
  'obs.ph.smaller': 'Smaller',
  'obs.ph.larger': 'Larger',
  'obs.ph.step': 'Step',
  'obs.ph.step.fine': 'Fine (0.25 px)',
  'obs.ph.step.normal': 'Normal (1 px)',
  'obs.ph.step.coarse': 'Coarse (4 px)',
  'obs.ph.picture':
    'The pixels around the source with the aperture and the sky ring drawn on them. Tap to set the chosen radius.',
  'obs.ph.measure': 'Measure',
  'obs.ph.curve': 'Curve of growth',
  'obs.ph.all': 'Measure all marks',
  'obs.ph.cancel': 'Stop',
  'obs.ph.keep': 'Keep in the ledger',
  'obs.ph.csv': 'Save as CSV',
  'obs.ph.readout': 'Result',
  'obs.ph.net': 'Net light {net} ± {sigma} electrons (signal to noise {snr})',
  'obs.ph.sky.line':
    'Sky {sky} ± {skySigma} electrons per pixel, from {n} pixels',
  'obs.ph.pos': 'Position x {x} ± {sx}, y {y} ± {sy} (pixels, counting from 1)',
  'obs.ph.mag': 'Instrumental magnitude {mag} ± {sigma}',
  'obs.ph.limit':
    'Not detected: the net light is under three times its error. At most {limit} electrons (instrumental magnitude {mag} or fainter).',
  'obs.ph.floor':
    'A pixel the aperture only partly covers is counted by its area, which assumes its light is spread evenly across it. A star of about 3 pixels width is not, so the light reads a little low: 0.16 percent at the default aperture (1.5 widths of the star), and up to 3 percent in an aperture of about 1 width or less. This is a floor of the method, not noise.',
  'obs.ph.area': 'Aperture area {area} pixels',
  'obs.ph.route.variance': 'noise from the image’s variance plane',
  'obs.ph.route.ccd': 'noise from the CCD equation (gain and read noise)',
  'obs.ph.table': 'Photometry of the marks',
  'obs.ph.col.mark': 'Mark',
  'obs.ph.col.x': 'x',
  'obs.ph.col.y': 'y',
  'obs.ph.col.net': 'Net light (e⁻)',
  'obs.ph.col.sigma': 'Error',
  'obs.ph.col.snr': 'Signal to noise',
  'obs.ph.col.sky': 'Sky per pixel (e⁻)',
  'obs.ph.col.skySigma': 'Sky error',
  'obs.ph.col.mag': 'Magnitude',
  'obs.ph.col.magSigma': 'Magnitude error',
  'obs.ph.col.status': 'Status',
  'obs.ph.status.measured': 'measured',
  'obs.ph.status.limit': 'upper limit',
  'obs.ph.growth.caption': 'Curve of growth',
  'obs.ph.growth.r': 'Radius (pixels)',
  'obs.ph.growth.net': 'Net light (e⁻)',
  'obs.ph.growth.frac': 'Of the largest',
  'obs.ph.said.measured': 'Measured {id}: {net} electrons ± {sigma}.',
  'obs.ph.said.limit': '{id} not detected: at most {limit} electrons.',
  'obs.ph.said.refused': '{id}: {why}',
  'obs.ph.said.batch':
    'Measured {n} of {total} marks; {other} refused or not detected.',
  'obs.ph.said.cancelled': 'Stopped after {n} of {total} marks.',
  'obs.ph.said.radius': '{ring} radius {r} pixels.',
  'obs.ph.said.target': '{id} chosen at x {x}, y {y}.',
  'obs.ph.said.kept': 'Kept {n} quantities in the ledger.',
  'obs.ph.said.keepFailed': 'Could not keep it in the ledger: {why}',
  'obs.ph.said.csv': 'Saved a table of {n} rows.',
  'obs.ph.said.curve': 'The light stops growing at about {r} pixels.',
  'obs.ph.ledgerEntry': 'Photometry of {title}',
  'obs.ph.q.net': 'net light',
  'obs.ph.q.x': 'x',
  'obs.ph.q.y': 'y',
  'obs.ph.q.snr': 'signal to noise',
  'obs.ph.q.sky': 'sky per pixel',
  'obs.ph.q.mag': 'instrumental magnitude',
};
