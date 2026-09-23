// =============================================================================
// Measuring an absorption feature in a spectrum
// -----------------------------------------------------------------------------
// The air-to-vacuum conversion, the window mean, and the band depth. No canvas,
// no state and no strings: js/stellarSpectraWidgets.js draws what this returns
// and tools/build-sdss-spectra.mjs measures with it at build time.
//
// One implementation on purpose. The build has to measure a feature in the
// full-resolution archive spectrum to say what the thinning cost, and the
// widget has to measure the same feature in the thinned copy to put a number
// under the plot. If those were two pieces of arithmetic the difference
// between them would be reported as the thinning error, and it would be wrong.
//
// The two conventions
// -----------------------------------------------------------------------------
// Feature windows are quoted in AIR wavelengths, because that is how the tables
// a reader will check them against quote them - H-alpha is 6562.8 in every
// textbook. SDSS records VACUUM wavelengths, which at H-alpha is 6564.6, and a
// band measured in the wrong one of those is measured 1.8 Angstroms off the
// line. Every window declared here is air and is converted on the way in, and
// that conversion is this file's job so that nothing else has to remember.
//
// A spectrum is a log-uniform grid, described by {logStart, step, flux} - the
// base-10 log of the first sample's wavelength, the log step, and the fluxes.
// Nothing here needs a wavelength array, because SDSS does not have one: its
// samples land on log10(lambda) = 1e-4 * i for integer i.
// =============================================================================

/**
 * Air wavelength to vacuum.
 *
 * Morton 2000, ApJS 130, 403 - the conversion the SDSS documentation cites for
 * its own wavelength scale.
 *
 * @param {number} air - Angstroms, in air
 * @returns {number} Angstroms, in vacuum
 */
export function airToVacuum(air) {
  const s = 1e4 / air;
  const n =
    1 + 0.0000834254 + 0.02406147 / (130 - s * s) + 0.00015998 / (38.9 - s * s);
  return air * n;
}

/**
 * Mean flux over a wavelength window.
 *
 * Each sample is weighted by how much of its own bin the window covers, rather
 * than by whether its center falls inside. The difference is not fussiness:
 * measured with whole samples, the apparent cost of thinning is dominated by
 * where the bin edges happen to land relative to the window edges, which moves
 * around as the bins widen and made the measured error non-monotonic in the
 * bin width. It was measuring the windowing, not the thinning. With coverage
 * weights the error falls monotonically, which is what a thinning error does.
 *
 * @param {{logStart: number, step: number, flux: ArrayLike<number>}} spec
 * @param {number} lo - Vacuum Angstroms
 * @param {number} hi - Vacuum Angstroms
 * @returns {number} Mean flux, or NaN if the window is off the end
 */
export function windowMean(spec, lo, hi) {
  const half = spec.step / 2;
  let num = 0;
  let den = 0;
  for (let i = 0; i < spec.flux.length; i++) {
    const center = spec.logStart + i * spec.step;
    const a = 10 ** (center - half);
    const b = 10 ** (center + half);
    if (a > hi) break;
    const overlap = Math.min(b, hi) - Math.max(a, lo);
    if (overlap > 0) {
      num += spec.flux[i] * overlap;
      den += overlap;
    }
  }
  return den > 0 ? num / den : NaN;
}

/**
 * How far a feature sits below the level either side of it.
 *
 * Deliberately not an equivalent width and deliberately not one of the
 * published indices. It is a fraction, defined here, and its value is that a
 * student can see on the plot what it means: the depth of the dip, against the
 * line drawn across it from the two reference windows. A published index would
 * be a better number and a worse teaching instrument, and the published ones
 * are still used - tioFiveIndex() below - where the job is to confirm a
 * classification rather than to be read off a picture.
 *
 * Where a feature declares the same window twice, the reference level is that
 * one window. The TiO band does: in an M star there is no continuum redward of
 * the band head to put a second window in, so the reference is the
 * pseudo-continuum immediately before it, and the depth is the drop across the
 * head rather than a dip inside a continuum.
 *
 * @param {{logStart: number, step: number, flux: ArrayLike<number>}} spec
 * @param {{line: number[], blue: number[], red: number[]}} feature - Air windows
 * @returns {number} 1 - line / reference. Zero where there is no feature.
 */
export function bandDepth(spec, feature) {
  const mean = w => windowMean(spec, airToVacuum(w[0]), airToVacuum(w[1]));
  const reference = (mean(feature.blue) + mean(feature.red)) / 2;
  return 1 - mean(feature.line) / reference;
}

/**
 * The TiO5 index of Reid, Hawley & Gizis 1995, AJ 110, 1838.
 *
 * Somebody else's definition of somebody else's quantity, which is the point
 * of having it here: it is what says an M star is an M star without appealing
 * to anything else in this project. Falls from about 1 in a star with no
 * titanium oxide to about 0.4 by M4.
 *
 * @param {{logStart: number, step: number, flux: ArrayLike<number>}} spec
 * @returns {number} The index
 */
export function tioFiveIndex(spec) {
  const mean = (a, b) => windowMean(spec, airToVacuum(a), airToVacuum(b));
  return mean(7126, 7135) / mean(7042, 7046);
}

/**
 * The four features this bundle's lesson asks a student to find.
 *
 * Each one does a different job, and between them they separate all four
 * classes. Ca II K is absent in A and enormous in G; the Balmer lines are
 * enormous in A and gone by K; sodium climbs steadily from A to M; titanium
 * oxide is absent in all of them until M. Two of those are not monotonic in
 * temperature, which is the whole reason a spectrum is not a color.
 *
 * `centerAir` is where the label points. The windows are what is measured.
 */
export const SPECTRAL_FEATURES = Object.freeze([
  Object.freeze({
    id: 'cak',
    centerAir: 3933.66,
    line: Object.freeze([3927, 3940]),
    blue: Object.freeze([3895, 3915]),
    red: Object.freeze([3944, 3952]),
  }),
  Object.freeze({
    id: 'hbeta',
    centerAir: 4861.33,
    line: Object.freeze([4853, 4871]),
    blue: Object.freeze([4800, 4830]),
    red: Object.freeze([4900, 4930]),
  }),
  Object.freeze({
    id: 'nad',
    centerAir: 5892.94,
    line: Object.freeze([5885, 5901]),
    blue: Object.freeze([5840, 5865]),
    red: Object.freeze([5920, 5945]),
  }),
  Object.freeze({
    id: 'tio',
    centerAir: 7100,
    line: Object.freeze([7080, 7130]),
    blue: Object.freeze([7000, 7045]),
    red: Object.freeze([7000, 7045]),
  }),
]);

/** One feature by id, or undefined. */
export const featureById = id => SPECTRAL_FEATURES.find(f => f.id === id);

/**
 * Vacuum wavelength to air.
 *
 * The inverse of airToVacuum(), to the accuracy that matters here. The
 * refractive index varies by about a part in a million across the optical
 * range, so evaluating it at the vacuum wavelength rather than the air one
 * leaves an error far below the hundredth of an Angstrom this is ever asked
 * for - and every alternative is an iteration in a drawing loop.
 *
 * Used where a plot's axis is labeled in the air wavelengths a reader will
 * look up while the data underneath it is on the archive's vacuum scale.
 *
 * @param {number} vacuum - Angstroms, in vacuum
 * @returns {number} Angstroms, in air
 */
export function vacuumToAir(vacuum) {
  return vacuum / (airToVacuum(vacuum) / vacuum);
}
