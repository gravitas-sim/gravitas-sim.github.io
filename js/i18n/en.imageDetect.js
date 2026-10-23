// =============================================================================
// The detection and PSF tool's words, in English
// -----------------------------------------------------------------------------
// Registered by js/observatory/imageDetect.js when the tool first opens
// (through the Observatory's translator), so no other page carries them.
// obs.dt.* ids; the panel's title is in en.observatory.js (it is on the page
// before the tool loads).
// =============================================================================

export const EN_IMAGEDETECT = {
  'obs.dt.help':
    'Find the sources in the image: every group of pixels that stands above the local sky by the number of sigma set below. Each gets a position, a size, a brightness measured as in the photometry tool, a shape and flags that say when not to trust it. Sources that touch are not separated, and a crowded field is not this tool’s job.',
  'obs.dt.no.display-only':
    'This image is display-only: it can be marked, but finding sources needs pixel values that measure light, and its pixels have been stretched, re-encoded or never had their units recorded.',
  'obs.dt.no.no-contract':
    'This image states no pixel contract (units, gain, read noise, saturation), so it is display-only: it can be marked, and detection waits for a contract.',
  'obs.dt.no.not-flux':
    'The pixel values are not a measure of light (flags, display levels or a unit nobody recorded), so there is nothing to detect.',
  'obs.dt.no.incomplete-contract':
    'Detection needs the pixel contract complete; this one lacks: {missing}.',
  'obs.dt.no.lossy-history':
    'The pixels went through a step that does not keep the measured light (a stretch, a lossy encoding or a resampling that does not conserve flux), so sources cannot be measured on them.',
  'obs.dt.no.raw-frame':
    'This frame is raw: its background still holds the bias, so the noise of the sky would be wrong. Calibrate it first.',
  'obs.dt.no.invalid': 'This is not a valid image description.',
  'obs.dt.no.bad-parameter':
    'A setting is out of range ({name}). Use a width between 0.5 and 50 pixels, a threshold of 2 to 100 sigma, a whole minimum area of at least 1 and a box of 4 to 256 pixels.',
  'obs.dt.no.no-background':
    'The sky could not be estimated: every box of the image is masked or empty.',
  'obs.dt.no.edge':
    'Not fitted: the square around the star reaches beyond the image.',
  'obs.dt.no.saturated':
    'Not fitted: pixels near the star reach the level where the detector stops being linear, so the shape of its light is not the star’s.',
  'obs.dt.no.masked':
    'Not fitted: {pixels} pixels around the star are masked or have no value.',
  'obs.dt.no.no-convergence': 'Not fitted: the fit did not settle.',
  'obs.dt.no.not-constrained':
    'Not fitted: the pixels do not fix every parameter of the model.',
  'obs.dt.no.no-stars':
    'No star could be fitted. Detect the sources first, and check that some are bright, round and not flagged; or lower the signal-to-noise limit.',
  'obs.dt.settings': 'Detection settings',
  'obs.dt.fwhm': 'Width of a star, FWHM (pixels)',
  'obs.dt.sigma': 'Threshold (sigma above the sky)',
  'obs.dt.area': 'Smallest source (pixels)',
  'obs.dt.box': 'Box for the sky (pixels)',
  'obs.dt.settingsNote':
    'The image is smoothed with a Gaussian of the width above, and a pixel counts when it stands more than the threshold times the smoothed noise above the sky of its 16-pixel box. A lower threshold or a smaller source finds fainter things and more false ones.',
  'obs.dt.detect': 'Find sources',
  'obs.dt.marks': 'Add as marks',
  'obs.dt.csv': 'Save as CSV',
  'obs.dt.picture':
    'The image with the sources found circled; the stars used for the width are circled in a second color. The table below lists them all.',
  'obs.dt.table': 'Sources found',
  'obs.dt.col.id': 'Source',
  'obs.dt.col.x': 'x',
  'obs.dt.col.y': 'y',
  'obs.dt.col.area': 'Area (pixels)',
  'obs.dt.col.peak': 'Peak (e⁻)',
  'obs.dt.col.flux': 'Net light (e⁻)',
  'obs.dt.col.fluxSigma': 'Error',
  'obs.dt.col.snr': 'Signal to noise',
  'obs.dt.col.ellipticity': 'Ellipticity',
  'obs.dt.col.orientation': 'Angle (°)',
  'obs.dt.col.fwhm': 'Width (pixels)',
  'obs.dt.col.flags': 'Flags',
  'obs.dt.col.psf': 'Used for the width',
  'obs.dt.yes': 'yes',
  'obs.dt.noFlux': 'not measured',
  'obs.dt.flag.saturated': 'saturated',
  'obs.dt.flag.edge': 'edge',
  'obs.dt.flag.masked': 'next to a mask',
  'obs.dt.flag.crowded': 'crowded',
  'obs.dt.flag.sharp': 'sharp',
  'obs.dt.flagHelp':
    'Saturated: a pixel passes the level where the detector is linear. Edge: it touches the border. Next to a mask: a masked pixel is beside it. Crowded: another source is near enough to reach its sky ring. Sharp: one pixel holds more than half its light, which is a cosmic ray or a hot pixel as often as a star.',
  'obs.dt.found': 'Found {n} sources, {m} of them flagged.',
  'obs.dt.truncated': 'Only the first {n} are listed.',
  'obs.dt.limits':
    'Limits: no deblending (two stars that touch are one source), no crowded fields, and the flux is the aperture of the photometry tool, not a fit.',
  'obs.dt.psfTitle': 'The width of the stars',
  'obs.dt.psfHelp':
    'A model of the star’s light is fitted to each star that is bright, round and alone, and the widths are combined. The stacked profile shows how the light falls away from the center.',
  'obs.dt.model': 'Model',
  'obs.dt.model.gaussian': 'Gaussian',
  'obs.dt.model.moffat': 'Moffat',
  'obs.dt.weights': 'Weights',
  'obs.dt.weights.poisson': 'By the noise of each pixel',
  'obs.dt.weights.none': 'Equal',
  'obs.dt.snr': 'Brightest stars only: signal to noise at least',
  'obs.dt.psf': 'Measure the width',
  'obs.dt.keep': 'Keep in the ledger',
  'obs.dt.fwhmLine': 'Width of the stars (FWHM): {fwhm} ± {sigma} pixels',
  'obs.dt.betaLine': 'Moffat beta {beta} ± {sigma}',
  'obs.dt.starsLine':
    'From {n} stars ({refused} refused). Reduced chi-square of the fits {chi2}.',
  'obs.dt.scaled':
    'The stars disagree more than their errors say, so the error is scaled up by the square root of their chi-square ({chi2}).',
  'obs.dt.modelLimited':
    'The fits leave more than noise behind: the profile may not be this model’s, and the error above is only the part the noise explains. A low chi-square does not show the model is right, because the faint wings sit under the sky noise: fit the other model too and compare the widths.',
  'obs.dt.profileLabel':
    'The stacked radial profile of {n} stars: the share of each star’s light in a pixel against its distance from the center, with the fitted model drawn through it.',
  'obs.dt.profile.table': 'Stacked radial profile',
  'obs.dt.profile.r': 'Distance from the center (pixels)',
  'obs.dt.profile.value': 'Light in a pixel, as a share of the star’s total',
  'obs.dt.profile.sem': 'Error of the mean',
  'obs.dt.profile.stars': 'Stars',
  'obs.dt.profile.model': 'Fitted model',
  'obs.dt.profile.width': 'Width read from the profile (FWHM): {w} pixels',
  'obs.dt.said.detected': 'Found {n} sources, {m} of them flagged.',
  'obs.dt.said.none': 'No source stands above the sky at {sigma} sigma.',
  'obs.dt.said.marks': 'Added {n} sources as point marks.',
  'obs.dt.said.marksFull': 'The marks table is full: added {n} of {total}.',
  'obs.dt.said.csv': 'Saved a table of {n} rows.',
  'obs.dt.said.psf':
    'Width of the stars {fwhm} ± {sigma} pixels from {n} stars.',
  'obs.dt.said.kept': 'Kept the width in the ledger.',
  'obs.dt.said.keepFailed': 'Could not keep it in the ledger: {why}',
  'obs.dt.said.working': 'Working…',
  'obs.dt.ledgerEntry': 'Point-spread function of {title}',
  'obs.dt.q.fwhm': 'width (FWHM)',
  'obs.dt.q.beta': 'Moffat beta',
};
