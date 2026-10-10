// An image frame from a source list: point sources of stated total counts
// through a Gaussian point-spread function, on a flat background, on a pixel
// grid with a TAN world-coordinate system (js/observatory/wcs.js). Pixel values
// are the exact integral of the PSF over each pixel (error functions), in
// counts; the setup's white sigma is the per-pixel noise in counts.
//
// Pixel coordinates are FITS's: 1 at the centre of the first pixel.
import { applyNoise } from '../setup.js';
import { syntheticObservation, valueColumns } from '../observation.js';
import { requireSetup } from './common.js';

export const ID = 'image';
export const VERSION = '1.0.0';
const FWHM_PER_SIGMA = 2 * Math.sqrt(2 * Math.LN2);

/** erf to 1.5e-7 (Abramowitz and Stegun 7.1.26). */
export function erf(x) {
  const s = x < 0 ? -1 : 1;
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return s * y;
}

/** The fraction of a Gaussian of this sigma, centred at c, inside [lo, hi]. */
export const fractionIn = (lo, hi, c, sigma) =>
  0.5 *
  (erf((hi - c) / (sigma * Math.SQRT2)) - erf((lo - c) / (sigma * Math.SQRT2)));

export function run(state, rawSetup, opts = {}) {
  const setup = requireSetup(rawSetup, ['imager']);
  const { width, height, pixelScale, psfFwhm } = setup.instrument;
  if (!(pixelScale > 0 && psfFwhm > 0))
    throw new Error(
      'an image needs instrument.pixelScale and psfFwhm, in arcsec'
    );
  const sigmaPix = psfFwhm / pixelScale / FWHM_PER_SIGMA;
  const sources = state.sources ?? [];
  const background = state.background ?? 0;
  const n = width * height;
  const clean = new Float64Array(n).fill(background);
  const px = new Float64Array(n);
  const py = new Float64Array(n);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      px[y * width + x] = x + 1;
      py[y * width + x] = y + 1;
    }
  // Each source reaches 6 sigma; beyond that its counts are below 1e-9.
  const reach = Math.ceil(6 * sigmaPix) + 1;
  for (const src of sources) {
    const x0 = Math.max(1, Math.floor(src.x) - reach);
    const x1 = Math.min(width, Math.ceil(src.x) + reach);
    const y0 = Math.max(1, Math.floor(src.y) - reach);
    const y1 = Math.min(height, Math.ceil(src.y) + reach);
    for (let y = y0; y <= y1; y++) {
      const fy = fractionIn(y - 0.5, y + 0.5, src.y, sigmaPix);
      for (let x = x0; x <= x1; x++)
        clean[(y - 1) * width + (x - 1)] +=
          src.counts * fractionIn(x - 0.5, x + 0.5, src.x, sigmaPix) * fy;
    }
  }
  const idx = Int32Array.from({ length: n }, (_, i) => i);
  const noisy = applyNoise(clean, idx, idx, setup);
  const scaleDeg = pixelScale / 3600;
  const center = state.center ?? { ra: 0, dec: 0 };
  const wcs = {
    ctype: ['RA---TAN', 'DEC--TAN'],
    crpix: [(width + 1) / 2, (height + 1) / 2],
    crval: [center.ra, center.dec],
    cd: [
      [-scaleDeg, 0],
      [0, scaleDeg],
    ],
  };
  return syntheticObservation({
    model: ID,
    version: VERSION,
    setup,
    kind: 'image',
    title: opts.title ?? 'Synthetic image frame',
    columns: [
      { id: 'x', name: 'Pixel x', unit: 'pix', role: 'x', values: px },
      { id: 'y', name: 'Pixel y', unit: 'pix', role: 'x', values: py },
      ...valueColumns('counts', 'Counts', 'count', noisy.values, noisy.sigma),
    ],
    axes: { x: 'x', y: 'y' },
    truth: {
      parameters: [
        {
          id: 'background',
          name: 'background',
          value: background,
          unit: 'count',
        },
        { id: 'psfFwhm', name: 'PSF FWHM', value: psfFwhm, unit: 'arcsec' },
        ...sources.flatMap((s, k) => [
          { id: `src${k}.x`, name: `source ${k}: x`, value: s.x, unit: 'pix' },
          { id: `src${k}.y`, name: `source ${k}: y`, value: s.y, unit: 'pix' },
          {
            id: `src${k}.counts`,
            name: `source ${k}: total counts`,
            value: s.counts,
            unit: 'count',
          },
        ]),
      ],
      injected: noisy.injected,
      notes: [
        'Gaussian PSF, point sources, flat background; no cosmic rays, saturation, flat-field or bias structure.',
        'The pixel values are the exact PSF integral over each pixel.',
      ],
    },
    extra: { image: { width, height, wcs, x: 'x', y: 'y', value: 'counts' } },
  });
}
