// =============================================================================
// The completeness tool's words, in English
// -----------------------------------------------------------------------------
// Registered by js/observatory/imageInject.js when the tool first opens
// (through the Observatory's translator), so no other page carries them.
// obs.inj.* ids; the panel's title is in en.observatory.js (it is on the page
// before the tool loads).
// =============================================================================

export const EN_IMAGEINJECT = {
  'obs.inj.help':
    'Find what the detector misses. Sources of chosen magnitudes are added to a copy of this image, spread through the width of a star given below and carrying their own shot noise, and the same source finder looks again. The share it finds, by magnitude, is the completeness of this image: the chance of detecting a star of this width against this sky, and of no other.',
  'obs.inj.no.display-only':
    'This image is display-only: it can be marked, but adding sources needs pixel values that measure light, and its pixels have been stretched, re-encoded or never had their units recorded.',
  'obs.inj.no.no-contract':
    'This image states no pixel contract (units, gain, read noise, saturation), so it is display-only: it can be marked, and this tool waits for a contract.',
  'obs.inj.no.not-flux':
    'The pixel values are not a measure of light (flags, display levels or a unit nobody recorded), so there is nothing to add sources to.',
  'obs.inj.no.incomplete-contract':
    'This tool needs the pixel contract complete; this one lacks: {missing}.',
  'obs.inj.no.lossy-history':
    'The pixels went through a step that does not keep the measured light (a stretch, a lossy encoding or a resampling that does not conserve flux), so sources cannot be measured on them.',
  'obs.inj.no.raw-frame':
    'This frame is raw: its background still holds the bias, so the noise of the sky would be wrong. Calibrate it first.',
  'obs.inj.no.invalid': 'This is not a valid image description.',
  'obs.inj.no.unit':
    'The pixels are in {unit}, not electrons, so the added sources could not carry their own shot noise.',
  'obs.inj.no.too-large':
    'Adding sources needs {bytes} bytes of decoded pixels in all, more than the {limit} a page may hold.',
  'obs.inj.no.bad-parameter':
    'A setting is out of range ({name}). Use up to 500 sources in a trial, up to 200 trials and 20,000 sources in all, a width of a star between 0.5 and 50 pixels, a brightest magnitude that is not fainter than the faintest, and bins that give at most 60 steps.',
  'obs.inj.no.beyond-linearity':
    'The brightest magnitude is too bright: its peak would pass the level where the detector stops being linear. The brightest allowed is magnitude {allowed}.',
  'obs.inj.no.no-room':
    'There is no room for a source: the border margin and the distance kept from other sources leave no free place in this image.',
  'obs.inj.no.no-range':
    'The sky noise could not be read, so no range of magnitudes was chosen: enter both magnitudes.',
  'obs.inj.no.no-background':
    'The sky could not be estimated: every box of the image is masked or empty.',
  'obs.inj.no.range': 'Fill both magnitudes, or leave both empty.',
  'obs.inj.psf': 'Width of a star, FWHM (pixels)',
  'obs.inj.measure': 'Measure it from this image',
  'obs.inj.measuring': 'Measuring the width of the stars…',
  'obs.inj.psfDone': 'Width of the stars {fwhm} pixels, from {n} stars.',
  'obs.inj.psfFail':
    'No star could be measured. Enter a width of a star by hand.',
  'obs.inj.bright': 'Brightest magnitude',
  'obs.inj.faint': 'Faintest magnitude (depth)',
  'obs.inj.auto': 'automatic',
  'obs.inj.count': 'Sources in a trial',
  'obs.inj.trials': 'Trials',
  'obs.inj.seed': 'Seed',
  'obs.inj.settings': 'More settings',
  'obs.inj.bin': 'Width of a magnitude bin',
  'obs.inj.settingsNote':
    'Magnitudes are instrumental: minus 2.5 times the logarithm of the rate in electrons a second, as in the photometry tool. Left empty, the range runs from a signal to noise of 12 down to 2.5, for the width above and this image’s noise. The same seed and settings give the same run.',
  'obs.inj.run': 'Inject and look again',
  'obs.inj.stop': 'Stop',
  'obs.inj.csv': 'Save the lists as CSV',
  'obs.inj.keep': 'Keep in the ledger',
  'obs.inj.progress': 'Trial {t} of {n}…',
  'obs.inj.result':
    'Injected {injected} sources in {trials} trials; the detector found {recovered}.',
  'obs.inj.m50':
    'Half of the sources are found at magnitude {m} (between {lo} and {hi}, {level} percent).',
  'obs.inj.m50.open': 'Half of the sources are found at magnitude {m}.',
  'obs.inj.m50.never':
    'The completeness never falls below one half in this range, or starts below it: widen the range.',
  'obs.inj.m90':
    'Nine in ten are found at magnitude {m} (between {lo} and {hi}, {level} percent).',
  'obs.inj.m90.open': 'Nine in ten are found at magnitude {m}.',
  'obs.inj.m90.never':
    'The completeness never falls below nine in ten in this range, or starts below it.',
  'obs.inj.extra':
    'Detections that match no injected source and no source already in the image: {x} a trial.',
  'obs.inj.unplaced':
    '{n} sources could not be placed (the border margin and the distance kept from other sources); they are not counted.',
  'obs.inj.conditions':
    'This curve is the chance of detection for a star {fwhm} pixels wide ({source}) against this image’s sky noise of {noise} electrons a pixel, found with a threshold of {sigma} sigma and at least {area} pixels. For a different width of star, a different sky or different settings it is not the chance of detection: measure it again.',
  'obs.inj.source.measured': 'measured from this image',
  'obs.inj.source.entered': 'entered by hand',
  'obs.inj.limits':
    'Limits: sources are placed away from the border and from each other, so a crowded field is not tested; one width of star serves the whole image; the count in a bin is binomial, with its exact interval, and a bin’s completeness is an average across the bin.',
  'obs.inj.plot':
    'Completeness against instrumental magnitude: the share of injected sources found, with the edges of its interval drawn as two lines.',
  'obs.inj.axis.m': 'Instrumental magnitude',
  'obs.inj.axis.p': 'Share found',
  'obs.inj.lower': 'Lower edge of the interval',
  'obs.inj.upper': 'Upper edge of the interval',
  'obs.inj.table': 'Completeness by magnitude',
  'obs.inj.col.range': 'Magnitudes',
  'obs.inj.col.n': 'Injected',
  'obs.inj.col.k': 'Found',
  'obs.inj.col.p': 'Completeness',
  'obs.inj.col.lo': 'Lower edge',
  'obs.inj.col.hi': 'Upper edge',
  'obs.inj.csvCol.id': 'Source',
  'obs.inj.csvCol.x': 'x',
  'obs.inj.csvCol.y': 'y',
  'obs.inj.csvCol.m': 'Magnitude',
  'obs.inj.csvCol.flux': 'Light (e⁻)',
  'obs.inj.csvCol.found': 'Found',
  'obs.inj.csvCol.fx': 'Found at x',
  'obs.inj.csvCol.fy': 'Found at y',
  'obs.inj.said.done':
    'Injected {injected} sources, found {recovered}: half are found at magnitude {m}.',
  'obs.inj.said.doneNoHalf': 'Injected {injected} sources, found {recovered}.',
  'obs.inj.said.stopped': 'Stopped after {t} trials.',
  'obs.inj.said.csv': 'Saved a table of {n} rows.',
  'obs.inj.said.kept': 'Kept the completeness in the ledger.',
  'obs.inj.said.keepFailed': 'Could not keep it in the ledger: {why}',
  'obs.inj.ledgerEntry': 'Completeness of {title}',
  'obs.inj.q.m50': 'magnitude at half completeness',
  'obs.inj.q.m90': 'magnitude at nine tenths completeness',
  'obs.inj.q.bin': 'completeness from magnitude {lo} to {hi}',
  'obs.inj.q.extra': 'extra detections a trial',
};
