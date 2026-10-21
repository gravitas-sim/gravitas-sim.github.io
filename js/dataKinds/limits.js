// =============================================================================
// Bounds before bytes: what a data kind may ask the page to hold (Prompt 157)
// -----------------------------------------------------------------------------
// Every reader in this folder asks here before it allocates, from numbers it
// has read and not yet trusted. A frame is decoded to Float64 (8 bytes a pixel),
// so a 2,048-square frame is one plane of 33,554,432 bytes (32 MiB) and the
// page's 64 MiB of decoded images (`decodedImageBytesPerPage` in
// tools/data-budget.json) holds two of them, or one with a variance plane. The
// limits are the cases of tools/data-kinds-cases.mjs, committed first.
//
// Pure, no imports, safe in a Worker. Not installed (DATA_KINDS in DATA_PACKS.md).
// =============================================================================

/** Why a file or a document was refused: a stable `code`, and a reason in words. */
export class DataKindError extends Error {
  constructor(code, message, detail) {
    super(message);
    this.name = 'DataKindError';
    this.code = code;
    if (detail !== undefined) this.detail = detail;
  }
}

export const LIMITS = Object.freeze({
  /** The longest side of a frame, in pixels. */
  maxAxis: 8192,
  /** Pixels in one plane: 2,048 x 2,048. */
  maxPixels: 4194304,
  /** Decoded bytes a pixel costs, by plane: Float64, Float64 and a 16-bit mask. */
  bytesPerPixel: Object.freeze({ data: 8, variance: 8, mask: 2 }),
  /** Decoded image bytes one page may hold (data-budget.json, decodedImageBytesPerPage). */
  maxDecodedBytes: 67108864,
  /** A FITS header, in 2,880-byte blocks of 36 cards. */
  maxHeaderBlocks: 16,
  /** Header-and-data units a reader walks to find the image. */
  maxHdus: 8,
  /** One admissible frame behind an empty primary header, padded. */
  maxFileBytes: 33647040,
  maxCards: 576,
  /** Frames in one sequence. */
  maxFrames: 256,
  maxGridAxes: 6,
  maxGridAxisLength: 4096,
  /** Values in a grid, outputs included: one Float64 plane's worth. */
  maxGridValues: 4194304,
  /** The longest side of what is drawn; the full-resolution array is what is measured. */
  maxDisplaySide: 1024,
});

/** Decoded bytes of the planes a frame holds, or NaN for a bad size. */
export function decodedBytes(width, height, planes = { data: true }) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height)) return NaN;
  const pixels = width * height;
  let per = 0;
  for (const [name, on] of Object.entries(planes))
    if (on) per += LIMITS.bytesPerPixel[name] ?? NaN;
  return pixels * per;
}

/**
 * Whether a frame of this shape may be decoded. Whole numbers first, then the
 * axis, the pixel count and the bytes, in that order, so the message names the
 * first limit it crosses.
 * @returns {{ok: true, pixels: number, bytes: number}|{ok: false, code: string, message: string}}
 */
export function checkFrame(width, height, planes = { data: true }) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1
  )
    return {
      ok: false,
      code: 'axis-invalid',
      message: `a frame is a whole number of pixels each way, at least 1; this is ${width} by ${height}`,
    };
  if (width > LIMITS.maxAxis || height > LIMITS.maxAxis)
    return {
      ok: false,
      code: 'too-large',
      message: `a side of ${Math.max(width, height)} pixels is more than the ${LIMITS.maxAxis} a frame may have`,
    };
  const pixels = width * height;
  if (pixels > LIMITS.maxPixels)
    return {
      ok: false,
      code: 'too-large',
      message: `${width} by ${height} is ${pixels} pixels; a frame may have ${LIMITS.maxPixels} (2,048 by 2,048)`,
    };
  const bytes = decodedBytes(width, height, planes);
  if (!(bytes <= LIMITS.maxDecodedBytes))
    return {
      ok: false,
      code: 'too-large',
      message: `${width} by ${height} with its planes decodes to ${bytes} bytes; a page may hold ${LIMITS.maxDecodedBytes}`,
    };
  return { ok: true, pixels, bytes };
}

/** How many frames of this shape fit in the page's decoded-image bytes at once. */
export function residentFrames(width, height, planes = { data: true }) {
  const each = decodedBytes(width, height, planes);
  return each > 0 ? Math.floor(LIMITS.maxDecodedBytes / each) : 0;
}

/**
 * How a frame is drawn: the whole-number factor that brings its longer side to
 * at most 1,024 pixels. The drawn copy is for the eye only: marks, apertures
 * and every measurement keep full-resolution coordinates (`toFull`).
 */
export function displayPlan(width, height) {
  const factor = Math.max(
    1,
    Math.ceil(Math.max(width, height) / LIMITS.maxDisplaySide)
  );
  const w = Math.ceil(width / factor);
  const h = Math.ceil(height / factor);
  return { factor, width: w, height: h, rgbaBytes: 4 * w * h };
}

/**
 * Block means of `k` by `k` pixels; an edge block averages the pixels it has,
 * a NaN is left out, and a block of nothing else is NaN.
 * @param {ArrayLike<number>} values - Row by row
 * @returns {{width: number, height: number, values: Float64Array}}
 */
export function downsampleMean(values, width, height, k) {
  const w = Math.ceil(width / k);
  const h = Math.ceil(height / k);
  const out = new Float64Array(w * h);
  for (let by = 0; by < h; by++) {
    const y1 = Math.min(height, by * k + k);
    for (let bx = 0; bx < w; bx++) {
      const x1 = Math.min(width, bx * k + k);
      let sum = 0;
      let n = 0;
      for (let y = by * k; y < y1; y++)
        for (let x = bx * k; x < x1; x++) {
          const v = values[y * width + x];
          if (v === v) {
            sum += v;
            n++;
          }
        }
      out[by * w + bx] = n ? sum / n : NaN;
    }
  }
  return { width: w, height: h, values: out };
}

/**
 * A drawn pixel's centre in full-resolution FITS coordinates (1 is the centre
 * of the first pixel): a drawn pixel covers `k` full pixels.
 */
export const toFull = (drawn, k) => (drawn - 0.5) * k + 0.5;
/** The drawn pixel a full-resolution coordinate falls in. */
export const toDrawn = (full, k) => (full - 0.5) / k + 0.5;
