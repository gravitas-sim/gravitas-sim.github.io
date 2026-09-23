// =============================================================================
// Where the energy is, in time and frequency
// -----------------------------------------------------------------------------
// A constant-Q transform of whitened strain: for each of a ladder of centre
// frequencies, a Gaussian band-pass whose width grows with the frequency, and
// the energy of what comes out, sample by sample. A chirp is a curve on that
// map. It is the picture the collaborations' own event pages show, computed
// here from the data the widget was given and nothing else.
//
// What it is not
// -----------------------------------------------------------------------------
// It is not a search, and nothing that reads it may call it one. There is no
// template, no significance and no false-alarm rate. The map shows where
// excess energy is; whether that energy is an astrophysical signal is a
// question the catalog answered with far more than this, and the widget says
// which of the two is speaking.
//
// The one number it reports on its own authority
// -----------------------------------------------------------------------------
// loudestFrequencyAt() answers "at this instant, which frequency was loudest -
// and was it louder than noise could have made it?" The second half is the
// honest part. Each row of the map is normalised by its own median, and for
// Gaussian noise the normalised energy is exponentially distributed with
// median 1, so a noise pixel exceeds E with probability 2^-E. A slice that
// searches N pixels will find a noise pixel above log2(N) about half the time.
// The threshold is therefore derived from the number of pixels searched, not
// chosen: see noiseCeiling(). A slice that finds nothing above it says so, and
// that is a result - it is what a weak signal looks like one pixel at a time.
//
// The same normalisation has a consequence worth knowing: anything stationary
// normalises away. A steady tone, or one of a detector's spectral lines, is
// constant in its row and comes out at 1 everywhere. What the map shows is
// transient excess, which is what a merger is - and why the lines that
// dominate a raw spectrum do not clutter it.
// =============================================================================

import { fft, nextPowerOfTwo } from './fft.js';

/**
 * Frequencies spaced evenly in log, which is how a chirp spends its time.
 * @param {number} fMin - Hz
 * @param {number} fMax - Hz
 * @param {number} rows - How many
 * @returns {Float64Array} Centre frequencies, Hz
 */
export function logFrequencies(fMin, fMax, rows) {
  const out = new Float64Array(rows);
  const r = Math.log(fMax / fMin);
  for (let i = 0; i < rows; i++) out[i] = fMin * Math.exp((r * i) / (rows - 1));
  return out;
}

/**
 * The constant-Q energy map of a whitened series.
 *
 * @param {ArrayLike<number>} samples - Whitened strain
 * @param {object} opts
 * @param {number} opts.sampleRate - Hz
 * @param {number} opts.fMin - Lowest row, Hz
 * @param {number} opts.fMax - Highest row, Hz
 * @param {number} [opts.rows] - Frequency rows
 * @param {number} [opts.q] - Quality factor: centre frequency over bandwidth
 * @returns {{freq: Float64Array, energy: Float64Array[], length: number,
 *   sampleRate: number, q: number}} energy[row][sample], each row normalised
 *   to median 1
 */
export function qScan(
  samples,
  { sampleRate, fMin, fMax, rows = 48, q = 8 } = {}
) {
  const n0 = samples.length;
  const n = nextPowerOfTwo(n0);
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < n0; i++) re[i] = samples[i];
  fft(re, im, false);
  const df = sampleRate / n;
  const freq = logFrequencies(fMin, fMax, rows);
  const energy = [];
  const bre = new Float64Array(n);
  const bim = new Float64Array(n);
  for (const fc of freq) {
    const sigma = fc / q;
    bre.fill(0);
    bim.fill(0);
    // Positive frequencies only, doubled: the inverse transform is then the
    // analytic signal of the band, and its squared magnitude is the energy
    // envelope with no oscillation at the carrier.
    for (let k = 1; k < n / 2; k++) {
      const g = Math.exp(-0.5 * ((k * df - fc) / sigma) ** 2);
      if (g < 1e-12) continue;
      bre[k] = 2 * re[k] * g;
      bim[k] = 2 * im[k] * g;
    }
    fft(bre, bim, true);
    const row = new Float64Array(n0);
    for (let i = 0; i < n0; i++) row[i] = bre[i] * bre[i] + bim[i] * bim[i];
    const sorted = Float64Array.from(row).sort();
    const median = sorted[Math.floor(n0 / 2)] || 1;
    for (let i = 0; i < n0; i++) row[i] /= median;
    energy.push(row);
  }
  return { freq, energy, length: n0, sampleRate, q };
}

/**
 * The normalised energy noise alone reaches, about half the time, when N
 * pixels are searched, plus a margin. Exceeding it is what "above the noise"
 * means here.
 *
 * The margin of 8 makes a false positive about 1 in 256 per search, so a
 * table of nine slices shows a spurious entry a few per cent of the time. A
 * margin of 4 would have shown one in about four tables in ten. Neighbouring
 * pixels of a Q-scan are correlated, so the true number of independent pixels
 * is smaller than N and this ceiling errs high - which is the direction to
 * err in when the claim is "this is louder than noise".
 *
 * @param {number} pixels - How many pixels the search looks at
 * @param {number} [margin] - Extra factor of 2^-margin in false-alarm odds
 * @returns {number} Normalised energy
 */
export const noiseCeiling = (pixels, margin = 8) =>
  Math.log2(Math.max(2, pixels)) + margin;

/**
 * The loudest frequency in a short slice of the map, if it beats the noise.
 *
 * Interpolated between rows rather than read off the loudest one. Rows are a
 * few per cent apart, and a chirp's energy often lands between two of them
 * almost equally; reporting whichever row won would claim a precision the map
 * does not have, and would flip between neighbours on a perturbation of a
 * hundredth of the noise. Each row's peak within the slice is taken, and a
 * parabola through the loudest row and its two neighbours, in log frequency,
 * gives the vertex. That moves continuously with the data. It is the usual
 * sub-bin peak estimate and it cannot leave the interval between the
 * neighbours.
 *
 * @param {ReturnType<typeof qScan>} scan - From qScan()
 * @param {number} centre - Slice centre, seconds from the first sample
 * @param {number} [halfWidth] - Seconds either side
 * @returns {{freq: ?number, energy: number, ceiling: number}} freq is null
 *   when nothing in the slice is louder than the ceiling
 */
export function loudestFrequencyAt(scan, centre, halfWidth = 0.01) {
  const { energy, freq, sampleRate, length } = scan;
  const i0 = Math.max(0, Math.round((centre - halfWidth) * sampleRate));
  const i1 = Math.min(
    length - 1,
    Math.round((centre + halfWidth) * sampleRate)
  );
  const peaks = new Float64Array(energy.length);
  let row = 0;
  for (let r = 0; r < energy.length; r++) {
    let m = -1;
    for (let i = i0; i <= i1; i++) if (energy[r][i] > m) m = energy[r][i];
    peaks[r] = m;
    if (m > peaks[row]) row = r;
  }
  const best = peaks[row];
  const ceiling = noiseCeiling(energy.length * (i1 - i0 + 1));
  if (!(best > ceiling)) return { freq: null, energy: best, ceiling };
  let offset = 0;
  if (row > 0 && row < energy.length - 1) {
    const a = peaks[row - 1];
    const c = peaks[row + 1];
    const curve = a - 2 * best + c;
    if (curve < 0)
      offset = Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / curve));
  }
  // Rows are evenly spaced in log frequency, so the offset is in log steps.
  const step = Math.log(freq[freq.length - 1] / freq[0]) / (freq.length - 1);
  return { freq: freq[row] * Math.exp(offset * step), energy: best, ceiling };
}

/**
 * The loudest instant within a stretch of the map, across every row.
 *
 * Used to put the merger where the data put it, near a time the catalog
 * supplies. The catalog's GPS time is published to a tenth of a second, which
 * is too coarse for slices of twenty milliseconds, so the catalog says roughly
 * when and the data say exactly when.
 *
 * @param {ReturnType<typeof qScan>} scan - From qScan()
 * @param {number} from - Seconds from the first sample
 * @param {number} to - Seconds
 * @returns {{time: number, energy: number, ceiling: number}}
 */
export function loudestInstant(scan, from, to) {
  const { energy, sampleRate, length } = scan;
  const i0 = Math.max(0, Math.round(from * sampleRate));
  const i1 = Math.min(length - 1, Math.round(to * sampleRate));
  let best = -1;
  let at = i0;
  for (let i = i0; i <= i1; i++) {
    for (let r = 0; r < energy.length; r++) {
      if (energy[r][i] > best) {
        best = energy[r][i];
        at = i;
      }
    }
  }
  return {
    time: at / sampleRate,
    energy: best,
    ceiling: noiseCeiling(energy.length * (i1 - i0 + 1)),
  };
}

/**
 * The last instant, within a stretch of the map, that anything clears the
 * noise - where a chirp ends.
 *
 * The merger is the end of the chirp, not its loudest point, and for a light
 * binary the two are measurably different: its last cycles sweep through
 * frequencies where a detector is less sensitive, so the loudest pixel sits on
 * the track before the end. On GW190814 the loudest instant was 69 ms before
 * the catalog time; the end of the signal is 7 ms after it. Every reading of
 * "so many seconds before the merger" is taken from here, which is why it
 * matters which of the two it is.
 *
 * The ceiling is the one for the whole stretch searched, so a noise pixel
 * anywhere in it is as unlikely to be mistaken for the end as it is anywhere
 * else in this file.
 *
 * @param {ReturnType<typeof qScan>} scan - From qScan()
 * @param {number} from - Seconds from the first sample
 * @param {number} to - Seconds
 * @returns {{time: ?number, ceiling: number}} time is null when nothing in the
 *   stretch clears the noise
 */
export function signalEnd(scan, from, to) {
  const { energy, sampleRate, length } = scan;
  const i0 = Math.max(0, Math.round(from * sampleRate));
  const i1 = Math.min(length - 1, Math.round(to * sampleRate));
  const ceiling = noiseCeiling(energy.length * (i1 - i0 + 1));
  for (let i = i1; i >= i0; i--) {
    for (const row of energy) {
      if (row[i] > ceiling) return { time: i / sampleRate, ceiling };
    }
  }
  return { time: null, ceiling };
}
