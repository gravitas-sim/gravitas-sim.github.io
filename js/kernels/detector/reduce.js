// =============================================================================
// The reduction nodes: from a raw frame to a flux with an error bar
// -----------------------------------------------------------------------------
// Each node is a pure function of its inputs and parameters. It returns the
// image (when it makes one) and a record in the shape of the measurement
// pipeline's nodes (js/measure/pipeline.js): the tool and its version, the
// parameters with their units, the quantities it gave each as measured, derived
// or assumed, warnings, and how it treats uncertainty. A reduction is the list
// of these records, so it can be read, checked and replayed.
//
//   combineFrames       mean or median of frames, pixel by pixel
//   masterBias          the median of the bias frames; its level and spread
//   masterDark          bias-subtracted darks, median combined, per second
//   masterFlat          bias- and dark-subtracted flats, mean, normalized to 1
//   gainFromPairs       the photon-transfer pair method for gain and read noise
//   calibrate           bias subtraction, dark scaling and subtraction, flat
//                       division, in one record per step
//   maskCosmicRays      pixels far above their 3 x 3 median, by the noise model
//   estimateBackground  clipped mean and scatter of an annulus
//   aperturePhotometry  net electrons in a circle, and its CCD-equation error
//   differentialMagnitude  the target against a comparison star, both errors
//
// Counts are what the converter wrote; electrons are counts times the gain, and
// photometry works in electrons because photon noise is a statement about them.
//
// Pure: no DOM.
// =============================================================================

import { noiseTerms } from './snr.js';

export const VERSION = '1.0.0';

/** The kinds of the pipeline (js/measure/pipeline.js KIND), by value. */
export const KIND = Object.freeze({
  MEASURED: 'measured',
  DERIVED: 'derived',
  ASSUMED: 'assumed',
});

const q = (id, value, unit, kind, extra = {}) => ({
  id,
  value,
  unit,
  kind,
  ...extra,
});
const record = (tool, params, quantities, extra = {}) => ({
  tool,
  version: VERSION,
  params,
  quantities,
  warnings: [],
  uncertainty: { treatment: 'kept' },
  ...extra,
});

const mean = a => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i];
  return s / a.length;
};
const variance = a => {
  const m = mean(a);
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - m) * (a[i] - m);
  return s / (a.length - 1);
};
export function median(a) {
  const s = Float64Array.from(a).sort();
  const k = s.length >> 1;
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2;
}
const mad = (a, m = median(a)) =>
  1.4826 * median(Float64Array.from(a, v => Math.abs(v - m)));

const sameSize = (a, b) => a.width === b.width && a.height === b.height;
const image = (like, values, extra = {}) => ({
  width: like.width,
  height: like.height,
  exposure: like.exposure,
  ...extra,
  values,
});

/** Combine frames pixel by pixel. @returns {Float64Array} */
export function combineFrames(frames, method = 'mean') {
  if (!frames.length) throw new Error('there are no frames to combine');
  const n = frames[0].values.length;
  for (const f of frames)
    if (f.values.length !== n || !sameSize(f, frames[0]))
      throw new Error('the frames to combine are not the same size');
  const out = new Float64Array(n);
  const buf = new Float64Array(frames.length);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < frames.length; k++) buf[k] = frames[k].values[i];
    out[i] = method === 'median' ? median(buf) : mean(buf);
  }
  return out;
}

/** The median of the bias frames. */
export function masterBias(frames, { gain } = {}) {
  const values = combineFrames(frames, 'median');
  const level = mean(values);
  const qs = [
    q('level', level, 'count', KIND.MEASURED),
    q('frames', frames.length, '', KIND.MEASURED),
  ];
  const warnings = [];
  if (frames.length >= 2 && Number.isFinite(gain)) {
    const d = Float64Array.from(
      frames[0].values,
      (v, i) => v - frames[1].values[i]
    );
    // Per-pixel difference of two frames: variance is twice one frame's.
    qs.push(
      q(
        'readNoise',
        (gain * Math.sqrt(variance(d))) / Math.SQRT2,
        'count',
        KIND.DERIVED,
        {
          note: 'electrons',
        }
      )
    );
  }
  if (frames.length < 5) warnings.push({ code: 'fewBias', n: frames.length });
  return {
    image: image(frames[0], values, { exposure: 0 }),
    node: record('masterBias', { combine: 'median', gain: gain ?? null }, qs, {
      warnings,
      uncertainty: {
        treatment: 'reduced',
        note: 'noise falls as 1.25 / sqrt(N)',
      },
    }),
  };
}

/** Subtract an image from another (counts). */
function subtract(a, b, scale = 1) {
  if (!sameSize(a, b)) throw new Error('the frames are not the same size');
  return Float64Array.from(a.values, (v, i) => v - scale * b.values[i]);
}

/** The master dark: bias-subtracted, median combined, in counts at its exposure. */
export function masterDark(frames, bias, { gain } = {}) {
  const exposure = frames[0].exposure;
  if (!(exposure > 0)) throw new Error('a dark frame has an exposure');
  for (const f of frames)
    if (f.exposure !== exposure)
      throw new Error('the dark frames have different exposures');
  const sub = frames.map(f => image(f, subtract(f, bias)));
  const values = combineFrames(sub, 'median');
  const level = median(values);
  const qs = [
    q('level', level, 'count', KIND.MEASURED),
    q('exposure', exposure, 's', KIND.ASSUMED),
    q('frames', frames.length, '', KIND.MEASURED),
  ];
  if (Number.isFinite(gain))
    qs.push(
      q('rate', (level * gain) / exposure, 'electron/s', KIND.DERIVED, {
        note: 'median pixel, electrons per second per pixel',
      })
    );
  return {
    image: image(frames[0], values, { exposure }),
    node: record('masterDark', { combine: 'median', gain: gain ?? null }, qs, {
      uncertainty: {
        treatment: 'reduced',
        note: 'the median drops cosmic rays',
      },
    }),
  };
}

/** The master flat: bias and dark subtracted, mean combined, normalized to a mean of 1. */
export function masterFlat(frames, bias, dark = null) {
  const sub = frames.map(f => {
    let v = subtract(f, bias);
    if (dark) {
      const s = f.exposure / dark.exposure;
      v = Float64Array.from(v, (x, i) => x - s * dark.values[i]);
    }
    return image(f, v);
  });
  const raw = combineFrames(sub, 'mean');
  const level = mean(raw);
  const values = Float64Array.from(raw, v => v / level);
  const rms = Math.sqrt(variance(values));
  return {
    image: image(frames[0], values, { exposure: null }),
    node: record(
      'masterFlat',
      { combine: 'mean', darkSubtracted: Boolean(dark) },
      [
        q('level', level, 'count', KIND.MEASURED),
        q('structure', rms, '', KIND.DERIVED, {
          note: 'rms of the normalized flat, a fraction',
        }),
        q('frames', frames.length, '', KIND.MEASURED),
      ],
      {
        uncertainty: {
          treatment: 'normalized',
          note: 'a ratio: its scale is lost on purpose',
        },
      }
    ),
  };
}

/**
 * Gain and read noise from two bias frames and two flats of the same level
 * (the photon-transfer pair method; Janesick 2001). The difference of a pair
 * cancels the fixed pattern, leaving noise only.
 *
 *   gain = (F1 + F2 - B1 - B2) / (var(F1 - F2) - var(B1 - B2))   electrons per count
 *   read = gain x sd(B1 - B2) / sqrt(2)                          electrons
 */
export function gainFromPairs(bias1, bias2, flat1, flat2) {
  const db = Float64Array.from(bias1.values, (v, i) => v - bias2.values[i]);
  const df = Float64Array.from(flat1.values, (v, i) => v - flat2.values[i]);
  const signal =
    mean(flat1.values) +
    mean(flat2.values) -
    mean(bias1.values) -
    mean(bias2.values);
  const vb = variance(db);
  const vf = variance(df);
  const gain = signal / (vf - vb);
  const readNoise = (gain * Math.sqrt(vb)) / Math.SQRT2;
  return {
    gain,
    readNoise,
    node: record(
      'gainFromPairs',
      {},
      [
        q('gain', gain, '', KIND.DERIVED, { note: 'electrons per count' }),
        q('readNoise', readNoise, 'count', KIND.DERIVED, { note: 'electrons' }),
        q('signal', signal, 'count', KIND.MEASURED),
      ],
      {
        uncertainty: {
          treatment: 'derived',
          note: 'from a ratio of variances; it improves with frame size',
        },
      }
    ),
  };
}

/**
 * Calibrate a science frame: subtract the bias, subtract the dark scaled to
 * the science exposure, divide by the normalized flat. Each step is a record.
 */
export function calibrate(raw, { bias, dark, flat } = {}) {
  const nodes = [];
  let values = Float64Array.from(raw.values);
  if (bias) {
    values = values.map((v, i) => v - bias.values[i]);
    nodes.push(
      record(
        'biasSubtract',
        {},
        [q('level', mean(bias.values), 'count', KIND.MEASURED)],
        {
          uncertainty: {
            treatment: 'added',
            note: 'the master bias adds its own small noise',
          },
        }
      )
    );
  }
  if (dark) {
    const s = raw.exposure / dark.exposure;
    values = values.map((v, i) => v - s * dark.values[i]);
    nodes.push(
      record(
        'darkSubtract',
        { scale: s },
        [
          q('scale', s, '', KIND.DERIVED, {
            note: 'science exposure over dark exposure',
          }),
        ],
        {
          uncertainty: {
            treatment: 'added',
            note: 'the master dark, scaled, adds its own noise',
          },
        }
      )
    );
  }
  if (flat) {
    values = values.map((v, i) => v / flat.values[i]);
    nodes.push(
      record(
        'flatDivide',
        {},
        [q('structure', Math.sqrt(variance(flat.values)), '', KIND.MEASURED)],
        {
          uncertainty: {
            treatment: 'scaled',
            note: 'noise divides by the flat, pixel by pixel',
          },
        }
      )
    );
  }
  return { image: image(raw, values), nodes };
}

/**
 * Flag cosmic rays: a pixel that stands more than `k` noise-sigmas above the
 * median of its 3 x 3 neighbors (noise from the neighbors' level, Poisson, and
 * the read noise) and whose excess is at least `sharpness` of its own value.
 * The second test spares a sharp star's core. Flagged pixels are replaced by
 * that median. Works in electrons.
 */
export function maskCosmicRays(
  img,
  { readNoise, k = 5.5, sharpness = 0.8 } = {}
) {
  const { width: W, height: H, values } = img;
  const out = Float64Array.from(values);
  const mask = new Uint8Array(values.length);
  const buf = new Float64Array(8);
  let count = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let m = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const xx = Math.min(W - 1, Math.max(0, x + dx));
          const yy = Math.min(H - 1, Math.max(0, y + dy));
          buf[m++] = values[yy * W + xx];
        }
      const med = median(buf);
      const sigma = Math.sqrt(Math.max(med, 0) + readNoise * readNoise);
      const i = y * W + x;
      // A star's core is also above its neighbors' median, but by a fraction of
      // its own value; a cosmic ray stands on a flat sky, so the excess is
      // nearly the whole pixel. Both conditions must hold.
      const excess = values[i] - med;
      if (excess > k * sigma && excess > sharpness * values[i]) {
        mask[i] = 1;
        out[i] = med;
        count++;
      }
    }
  return {
    image: image(img, out),
    mask,
    count,
    node: record(
      'maskCosmicRays',
      { k, sharpness, readNoise },
      [q('flagged', count, 'count', KIND.MEASURED, { note: 'pixels' })],
      {
        uncertainty: {
          treatment: 'kept',
          note: 'replaced pixels carry the median’s error, not their own',
        },
      }
    ),
  };
}

/** Sigma-clipped mean and the scatter of an annulus. */
export function estimateBackground(
  img,
  { x, y, rIn, rOut, mask = null, clip = 3 }
) {
  const { width: W, height: H, values } = img;
  const pix = [];
  for (
    let j = Math.max(0, Math.floor(y - rOut));
    j <= Math.min(H - 1, Math.ceil(y + rOut));
    j++
  )
    for (
      let i = Math.max(0, Math.floor(x - rOut));
      i <= Math.min(W - 1, Math.ceil(x + rOut));
      i++
    ) {
      const d = Math.hypot(i - x, j - y);
      if (d > rIn && d <= rOut && !(mask && mask[j * W + i]))
        pix.push(values[j * W + i]);
    }
  let use = Float64Array.from(pix);
  for (let it = 0; it < 4 && use.length > 3; it++) {
    const m = median(use);
    const s = mad(use, m);
    const kept = use.filter(v => Math.abs(v - m) <= clip * s);
    if (kept.length === use.length || kept.length < 3) break;
    use = kept;
  }
  return {
    level: mean(use),
    scatter: Math.sqrt(variance(use)),
    n: use.length,
    nAnnulus: pix.length,
    node: record(
      'estimateBackground',
      { x, y, rIn, rOut, clip },
      [
        q('level', mean(use), 'count', KIND.MEASURED, {
          note: 'electrons per pixel when the image is in electrons',
        }),
        q('scatter', Math.sqrt(variance(use)), 'count', KIND.MEASURED),
        q('pixels', use.length, 'count', KIND.MEASURED),
      ],
      {
        uncertainty: {
          treatment: 'derived',
          note: 'the mean of n pixels: its error is the scatter over sqrt(n)',
        },
      }
    ),
  };
}

/** Pixels whose centre lies within r of (x, y). */
export function aperturePixels(img, x, y, r) {
  const { width: W, height: H } = img;
  const out = [];
  for (
    let j = Math.max(0, Math.floor(y - r));
    j <= Math.min(H - 1, Math.ceil(y + r));
    j++
  )
    for (
      let i = Math.max(0, Math.floor(x - r));
      i <= Math.min(W - 1, Math.ceil(x + r));
      i++
    )
      if (Math.hypot(i - x, j - y) <= r) out.push(j * W + i);
  return out;
}

/**
 * Net electrons in a circular aperture, with the CCD equation's error.
 *
 * The image is in electrons. The sky per pixel comes from the annulus; the
 * error is the CCD equation with the dark's shot noise (`darkPerPixel`, the
 * electrons the dark made in this exposure) and any `extraVariance` per pixel
 * (the masters' own noise). Pixels at or above `saturation` electrons, and
 * masked pixels in the aperture, are reported as warnings.
 */
export function aperturePhotometry(
  img,
  {
    x,
    y,
    r,
    rIn,
    rOut,
    readNoise,
    darkPerPixel = 0,
    extraVariance = 0,
    mask = null,
    saturation = Infinity,
  }
) {
  const bg = estimateBackground(img, { x, y, rIn, rOut, mask });
  const ap = aperturePixels(img, x, y, r);
  let sum = 0;
  let masked = 0;
  let saturated = 0;
  for (const i of ap) {
    sum += img.values[i];
    if (mask && mask[i]) masked++;
    if (img.values[i] >= saturation) saturated++;
  }
  const npix = ap.length;
  const net = sum - npix * bg.level;
  const terms = noiseTerms({
    signal: Math.max(net, 0),
    npix,
    sky: Math.max(bg.level - 0, 0),
    dark: darkPerPixel,
    readNoise,
    nBackground: bg.n,
    extraVariance,
  });
  // The sky level already holds the sky's electrons; the dark was subtracted,
  // its shot noise is the extra term, so the sky term uses the sky alone.
  const warnings = [];
  if (masked) warnings.push({ code: 'maskedInAperture', n: masked });
  if (saturated) warnings.push({ code: 'saturatedInAperture', n: saturated });
  if (!(net > 0)) warnings.push({ code: 'noDetection' });
  return {
    net,
    sigma: terms.noise,
    snr: net / terms.noise,
    npix,
    sky: bg.level,
    terms,
    background: bg,
    warnings,
    node: record(
      'aperturePhotometry',
      { x, y, r, rIn, rOut, readNoise, darkPerPixel, extraVariance },
      [
        q('net', net, 'count', KIND.MEASURED, {
          error: terms.noise,
          errorKind: KIND.DERIVED,
          note: 'electrons',
        }),
        q('snr', net / terms.noise, '', KIND.DERIVED),
        q('pixels', npix, 'count', KIND.MEASURED, {
          note: 'pixels in the aperture',
        }),
        q('sky', bg.level, 'count', KIND.MEASURED, {
          note: 'electrons per pixel',
        }),
      ],
      {
        warnings,
        uncertainty: {
          treatment: 'propagated',
          note: 'the CCD equation: source, sky, dark and read terms, with the annulus’s own noise',
        },
      }
    ),
  };
}

/**
 * The target against a comparison star: delta m = -2.5 log10(Ft / Fc), with the
 * errors of both fluxes added in quadrature (they are independent measurements
 * of different pixels; what they share, the transparency, divides out).
 */
export function differentialMagnitude(target, comparison) {
  const ratio = target.net / comparison.net;
  const dm = -2.5 * Math.log10(ratio);
  const rel = Math.hypot(
    target.sigma / target.net,
    comparison.sigma / comparison.net
  );
  const sigma = (2.5 / Math.LN10) * rel;
  return {
    dm,
    sigma,
    node: record(
      'differentialMagnitude',
      {},
      [
        q('dm', dm, 'mag', KIND.DERIVED, {
          error: sigma,
          errorKind: KIND.DERIVED,
        }),
      ],
      {
        uncertainty: {
          treatment: 'propagated',
          note: 'relative errors of the two fluxes in quadrature',
        },
      }
    ),
  };
}

/**
 * The whole chain on one science frame: calibrate, convert to electrons, mask
 * cosmic rays, then photometer each named star. Returns the list of records.
 *
 * @param {object} raw - A science frame
 * @param {{bias, dark, flat}} masters - From masterBias, masterDark, masterFlat
 * @param {object} opts
 * @param {number} opts.gain
 * @param {number} opts.readNoise
 * @param {Array<{id, x, y}>} opts.stars - Positions to measure
 * @param {number} [opts.r=5] - Aperture radius, pixels
 * @param {number} [opts.rIn=8]
 * @param {number} [opts.rOut=13]
 * @param {number} [opts.darkRate] - electrons per second per pixel, for the dark's shot noise
 * @param {object} [opts.skip] - { bias, dark, flat, cosmic } set true to leave a step out
 */
export function reduceFrame(raw, masters, opts) {
  const skip = opts.skip ?? {};
  const cal = calibrate(raw, {
    bias: skip.bias ? null : masters.bias,
    dark: skip.dark ? null : masters.dark,
    flat: skip.flat ? null : masters.flat,
  });
  const nodes = [...cal.nodes];
  const electrons = image(
    cal.image,
    Float64Array.from(cal.image.values, v => v * opts.gain)
  );
  nodes.push(
    record('toElectrons', { gain: opts.gain }, [
      q('gain', opts.gain, '', KIND.ASSUMED, { note: 'electrons per count' }),
    ])
  );
  let work = electrons;
  let mask = null;
  if (!skip.cosmic) {
    const m = maskCosmicRays(electrons, { readNoise: opts.readNoise });
    work = m.image;
    mask = m.mask;
    nodes.push(m.node);
  }
  const darkPerPixel = (opts.darkRate ?? 0) * raw.exposure;
  const extraVariance = opts.extraVariance ?? 0;
  const photometry = {};
  for (const star of opts.stars) {
    const p = aperturePhotometry(work, {
      x: star.x,
      y: star.y,
      r: opts.r ?? 5,
      rIn: opts.rIn ?? 8,
      rOut: opts.rOut ?? 13,
      readNoise: opts.readNoise,
      darkPerPixel,
      extraVariance,
      mask,
    });
    photometry[star.id] = p;
    nodes.push({ ...p.node, star: star.id });
  }
  return { image: work, calibrated: cal.image, mask, photometry, nodes };
}
