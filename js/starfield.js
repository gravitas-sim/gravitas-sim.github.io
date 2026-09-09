// =============================================================================
// The background sky: what is in it, and where
// -----------------------------------------------------------------------------
// Generation only. This module decides how many stars there are, where, how
// bright, what colour and in which parallax layer; js/render.js decides how to
// paint them. Keeping the two apart is what lets the whole model be tested
// without a canvas, and what lets the painting be rewritten - as it has been,
// from ten thousand individual fills per repaint to three blits - without
// touching the sky itself.
//
// What was here before
// -----------------------------------------------------------------------------
// Ten thousand stars, uniformly distributed, uniformly white, all the same
// brightness range, all twinkling, regenerated from Math.random on every
// resize, and repainted in full twenty-eight times a second. Measured at
// 1440x900: 4.1ms a repaint for an empty scene, 19.6ms for a crowded one. See
// tools/starfield-probe.mjs.
//
// Four things follow from that and shape everything below.
//
// It has to be deterministic. A screenshot of a seeded scenario, an A/B run, a
// shared link and a reset all have to show the same sky, and Math.random gives
// none of them that. Everything here comes from the world seed and the
// viewport size.
//
// It has to look like a sky. A uniform brightness distribution reads as noise;
// a real field is overwhelmingly faint stars with a handful of bright ones,
// which is what makes it look deep. The distribution below is a restrained
// version of that, and the field looks denser than its point count because of
// it.
//
// It has to be paintable once. The stars are split into three parallax layers
// so js/render.js can pre-render each to its own canvas and blit them, rather
// than walking every star every frame. Nothing here changes between repaints,
// which is the property that makes the caching sound.
//
// And it has to be cheap to ask "which stars are near this point", because the
// lensing and gravitational-wave distortion need exactly that and used to get
// it by testing all ten thousand.
// =============================================================================

import { mulberry32 } from './rng.js';

/** The three parallax depths, far to near. Also the paint order. */
export const LAYERS = Object.freeze(['far', 'mid', 'near']);

/** How much of the pan each layer moves by, as a fraction. */
export const LAYER_DEPTH = Object.freeze({ far: 1.0, mid: 0.6, near: 0.3 });

/** How the stars are split between them. Most of the sky is far away. */
const LAYER_SHARE = Object.freeze({ far: 0.55, mid: 0.3, near: 0.15 });

/**
 * Stars per megapixel of viewport, by quality tier.
 *
 * Chosen by measurement rather than by taste: at these counts the pre-rendered
 * layers below cost under a millisecond to build and nothing per frame, and
 * the magnitude distribution makes the field read as considerably denser than
 * the number suggests. The old fixed 10,000 was the same sky on a 320-pixel
 * phone and on a lecture projector - four times too dense on one and sparse on
 * the other.
 */
export const STARS_PER_MEGAPIXEL = Object.freeze({ full: 2600, low: 1000 });

/** Never fewer than this, however small the window. */
const MIN_STARS = 240;

/** At most this many stars are ever animated, whatever the field size. */
export const MAX_TWINKLERS = 48;

/** Linear interpolation, for reading a band's range. */
const lerp = (a, b, t) => a + (b - a) * t;

/** Never more than this, however large. A wall display is not a reason. */
const MAX_STARS = 9000;

/**
 * The star_density setting's default, and so the value that means "the natural
 * count for this window".
 *
 * The setting used to be the literal number of stars, which is why its default
 * is a round ten thousand. It is now read as a proportion of that: leaving it
 * alone gives the density this module chose for the window, halving it halves
 * the sky, and zero empties it. Keeping the same key and the same default
 * means saved states, share links and scenario definitions written before the
 * rewrite still describe the sky their author saw.
 */
export const DEFAULT_STAR_DENSITY = 10000;

/**
 * How many stars a viewport of this size gets.
 *
 * @param {number} width - Viewport width in pixels
 * @param {number} height - Viewport height in pixels
 * @param {string} [tier] - 'full' or 'low'
 * @param {number} [density] - The reader's star_density setting
 * @returns {number} A star count
 */
export function starCountFor(
  width,
  height,
  tier = 'full',
  density = DEFAULT_STAR_DENSITY
) {
  const w = Number(width);
  const h = Number(height);
  if (!(w > 0) || !(h > 0)) return MIN_STARS;
  const perMp = STARS_PER_MEGAPIXEL[tier] ?? STARS_PER_MEGAPIXEL.full;
  const megapixels = (w * h) / 1e6;
  const natural = Math.max(
    MIN_STARS,
    Math.min(MAX_STARS, Math.round(perMp * megapixels))
  );

  // A null reaches here from a settings object that has never been written to,
  // and means "unset" rather than "no stars".
  if (density == null) return natural;
  const asked = Number(density);
  if (!Number.isFinite(asked) || asked === DEFAULT_STAR_DENSITY) return natural;
  if (asked <= 0) return 0;
  // The floor is there so a small window still gets a sky, not to overrule a
  // reader who has deliberately asked for fewer stars.
  return Math.min(
    MAX_STARS,
    Math.round((natural * asked) / DEFAULT_STAR_DENSITY)
  );
}

/**
 * The colours a star may be.
 *
 * Deliberately short and deliberately weighted toward neutral. Real starlight
 * is subtly coloured and a sky of saturated dots is confetti, so the first two
 * entries - both within a few percent of white - take four fifths of the
 * field, and the visibly warm and visibly blue entries are rare enough to read
 * as a detail somebody noticed rather than as decoration.
 */
export const STAR_PALETTE = Object.freeze([
  { r: 255, g: 255, b: 255 }, // neutral
  { r: 255, g: 248, b: 240 }, // barely warm
  { r: 255, g: 231, b: 208 }, // K, amber
  { r: 255, g: 208, b: 176 }, // M, orange
  { r: 226, g: 236, b: 255 }, // A, cool white
  { r: 199, g: 219, b: 255 }, // B, blue
]);

const PALETTE_CUMULATIVE = Object.freeze([0.6, 0.79, 0.88, 0.92, 0.98, 1.0]);

/**
 * Pick a palette entry from a uniform draw.
 * @param {number} u - A value in [0, 1)
 * @returns {number} An index into STAR_PALETTE
 */
export function paletteIndexFor(u) {
  for (let i = 0; i < PALETTE_CUMULATIVE.length; i++) {
    if (u < PALETTE_CUMULATIVE[i]) return i;
  }
  return 0;
}

/**
 * The three magnitude bands, and how much of the sky each is.
 *
 * Written as bands rather than as a curve because the requirement is a
 * statement about proportions - many very dim, fewer medium, a tiny number of
 * bright - and a curve makes that something you have to integrate to check. A
 * cube law was tried first and put thirteen per cent of the field above two
 * pixels, which is not a tiny number and reads as glitter.
 *
 * `size` is the square's side in pixels: the faint band is sub-pixel on
 * purpose, which is what a star at the limit of visibility looks like.
 */
export const MAGNITUDE_BANDS = Object.freeze([
  { share: 0.78, size: [0.5, 0.95], alpha: [0.14, 0.4] },
  { share: 0.19, size: [0.95, 1.7], alpha: [0.4, 0.75] },
  { share: 0.03, size: [1.7, 2.8], alpha: [0.8, 1.0] },
]);

/**
 * Which band a uniform draw falls in.
 * @param {number} u - A value in [0, 1)
 * @returns {number} 0 faint, 1 medium, 2 bright
 */
export function bandFor(u) {
  let cut = 0;
  for (let i = 0; i < MAGNITUDE_BANDS.length; i++) {
    cut += MAGNITUDE_BANDS[i].share;
    if (u < cut) return i;
  }
  return MAGNITUDE_BANDS.length - 1;
}

/**
 * One deterministic star field for a seed and a viewport.
 *
 * @param {object} options
 * @param {number} options.seed - The world seed
 * @param {number} options.width - Viewport width in pixels
 * @param {number} options.height - Viewport height in pixels
 * @param {string} [options.tier] - 'full' or 'low'
 * @param {number} [options.count] - Override the computed count, for tests
 * @returns {object} `{ layers, twinklers, count, width, height, seed, tier }`
 */
export function generateStarfield({
  seed,
  width,
  height,
  tier = 'full',
  density = DEFAULT_STAR_DENSITY,
  count,
}) {
  const w = Math.max(1, Math.round(width) || 1);
  const h = Math.max(1, Math.round(height) || 1);
  const total = count ?? starCountFor(w, h, tier, density);

  // Seeded on the viewport as well as the world, so a window resized and
  // restored gets its sky back rather than a new one - and so two people
  // opening the same link on the same size of screen see the same sky.
  const rand = mulberry32(mixSeed(seed, w, h, total));

  const layers = { far: [], mid: [], near: [] };
  const twinklers = [];

  for (let i = 0; i < total; i++) {
    const layer =
      i < total * LAYER_SHARE.far
        ? 'far'
        : i < total * (LAYER_SHARE.far + LAYER_SHARE.mid)
          ? 'mid'
          : 'near';

    const bandIndex = bandFor(rand());
    const band = MAGNITUDE_BANDS[bandIndex];
    const within = rand();
    // Nearer stars read as nearer by being a little brighter, which with
    // parallax is the only depth cue a flat field has. Kept small: a near
    // layer that is obviously brighter looks like two skies, not one.
    const depthGain = layer === 'near' ? 1.12 : layer === 'mid' ? 1.05 : 1;

    const star = {
      x: rand() * w,
      y: rand() * h,
      size: lerp(band.size[0], band.size[1], within) * depthGain,
      alpha: Math.min(
        1,
        lerp(band.alpha[0], band.alpha[1], within) * depthGain
      ),
      colour: paletteIndexFor(rand()),
      phase: rand() * Math.PI * 2,
      band: bandIndex,
      // Recorded on the star rather than looked up later. The renderer needs
      // both of these per twinkler per repaint, and finding them by scanning
      // the layer arrays was an O(stars) walk forty-eight times a repaint.
      layer,
      twinkles: false,
    };
    layers[layer].push(star);

    // Only the bright ones twinkle, and only a handful of those. Atmospheric
    // scintillation is most visible on bright stars, and animating the whole
    // field was both wrong and the reason the layer could never be cached.
    if (bandIndex === 2 && twinklers.length < MAX_TWINKLERS) {
      star.twinkles = true;
      twinklers.push(star);
    }
  }

  return { layers, twinklers, count: total, width: w, height: h, seed, tier };
}

/**
 * Combine the world seed with the viewport into one 32-bit seed.
 * @param {number} seed - World seed
 * @param {number} w - Width
 * @param {number} h - Height
 * @param {number} n - Star count
 * @returns {number} An unsigned 32-bit seed
 */
export function mixSeed(seed, w, h, n) {
  let x = (Number(seed) || 0) >>> 0;
  for (const v of [w, h, n]) {
    x ^= (v | 0) + 0x9e3779b9 + (x << 6) + (x >>> 2);
    x >>>= 0;
  }
  return x >>> 0;
}

// --- Asking which stars are near something ------------------------------------

/** Side of one bucket in the lookup grid, in pixels. */
export const GRID_CELL = 64;

/**
 * A spatial index over one field, for the distortion passes.
 *
 * The lensing and gravitational-wave effects displace the stars inside a disc
 * a few dozen pixels across. Finding them used to mean testing every star in
 * the sky against every compact object on screen - ten thousand times a dozen,
 * every repaint, which is where the crowded scene's 19.6ms went. A grid turns
 * that into a walk over the handful of buckets the disc touches.
 *
 * @param {object} field - From generateStarfield
 * @returns {object} An index with a `near` method
 */
export function indexStarfield(field) {
  const cols = Math.max(1, Math.ceil(field.width / GRID_CELL));
  const rows = Math.max(1, Math.ceil(field.height / GRID_CELL));
  const cells = new Map();

  for (const layer of LAYERS) {
    for (const star of field.layers[layer]) {
      const cx = Math.min(
        cols - 1,
        Math.max(0, Math.floor(star.x / GRID_CELL))
      );
      const cy = Math.min(
        rows - 1,
        Math.max(0, Math.floor(star.y / GRID_CELL))
      );
      const key = cy * cols + cx;
      let bucket = cells.get(key);
      if (!bucket) {
        bucket = [];
        cells.set(key, bucket);
      }
      bucket.push({ star, layer });
    }
  }

  return {
    cols,
    rows,
    cells,
    /**
     * Every star whose position is within `radius` of (x, y).
     *
     * @param {number} x - Centre, pixels
     * @param {number} y - Centre, pixels
     * @param {number} radius - Pixels
     * @returns {Array<{star: object, layer: string}>} Matches
     */
    near(x, y, radius) {
      const out = [];
      const minX = Math.max(0, Math.floor((x - radius) / GRID_CELL));
      const maxX = Math.min(cols - 1, Math.floor((x + radius) / GRID_CELL));
      const minY = Math.max(0, Math.floor((y - radius) / GRID_CELL));
      const maxY = Math.min(rows - 1, Math.floor((y + radius) / GRID_CELL));
      const r2 = radius * radius;
      for (let cy = minY; cy <= maxY; cy++) {
        for (let cx = minX; cx <= maxX; cx++) {
          const bucket = cells.get(cy * cols + cx);
          if (!bucket) continue;
          for (const entry of bucket) {
            const dx = entry.star.x - x;
            const dy = entry.star.y - y;
            if (dx * dx + dy * dy <= r2) out.push(entry);
          }
        }
      }
      return out;
    },
  };
}
