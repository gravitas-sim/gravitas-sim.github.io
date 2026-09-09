// =============================================================================
// The sky: deterministic, distributed like a sky, and sized to the window
// -----------------------------------------------------------------------------
// The field this replaces was ten thousand uniformly white, uniformly bright
// stars from Math.random, the same count on a phone and a lecture projector,
// regenerated on every resize and repainted in full twenty-eight times a
// second. Every property below is one of the things that was wrong with it.
//
// The performance work that goes with this lives in js/render.js - three
// pre-rendered layers instead of ten thousand fills - and is measured by
// tools/starfield-probe.mjs rather than asserted here. What this file holds is
// the model: the same seed gives the same sky, the brightness distribution is
// the shape of a real field rather than a uniform scatter, the colours stay
// restrained, and the count follows the viewport.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import {
  LAYERS,
  LAYER_DEPTH,
  MAGNITUDE_BANDS,
  MAX_TWINKLERS,
  STAR_PALETTE,
  STARS_PER_MEGAPIXEL,
  GRID_CELL,
  bandFor,
  paletteIndexFor,
  mixSeed,
  starCountFor,
  generateStarfield,
  indexStarfield,
  DEFAULT_STAR_DENSITY,
} from '../js/starfield.js';

/** Every star in a field, whatever layer it is in. */
const allStars = field => LAYERS.flatMap(l => field.layers[l]);

const field = (over = {}) =>
  generateStarfield({ seed: 1234, width: 1440, height: 900, ...over });

describe('the same seed gives the same sky', () => {
  test('twice from the same inputs is identical', () => {
    expect(allStars(field())).toEqual(allStars(field()));
  });

  test('a different world seed gives a different sky', () => {
    expect(allStars(field({ seed: 1235 }))).not.toEqual(allStars(field()));
  });

  test('a different viewport gives a different sky', () => {
    // Not merely a rescaled one: a window of a different shape shows a
    // different patch, and stretching the old one would look like it.
    const wide = field({ width: 1920, height: 900 });
    expect(wide.count).not.toBe(field().count);
  });

  test('a window resized and restored gets its sky back', () => {
    // The property a reader notices: drag the window narrow and wide again and
    // the stars are where they were, rather than a new sky each time.
    const before = allStars(field());
    field({ width: 800, height: 600 });
    expect(allStars(field())).toEqual(before);
  });

  test('nothing in a star is left undefined', () => {
    for (const star of allStars(field()).slice(0, 200)) {
      for (const key of [
        'x',
        'y',
        'size',
        'alpha',
        'colour',
        'phase',
        'layer',
      ]) {
        expect(star[key]).toBeDefined();
      }
      expect(Number.isFinite(star.x)).toBe(true);
      expect(Number.isFinite(star.y)).toBe(true);
    }
  });

  test('mixSeed folds the viewport in, and is stable', () => {
    expect(mixSeed(7, 100, 200, 300)).toBe(mixSeed(7, 100, 200, 300));
    expect(mixSeed(7, 100, 200, 300)).not.toBe(mixSeed(7, 101, 200, 300));
    expect(mixSeed(7, 100, 200, 300)).not.toBe(mixSeed(8, 100, 200, 300));
    expect(mixSeed(undefined, 1, 1, 1)).toBeGreaterThanOrEqual(0);
  });
});

describe('it is distributed like a sky', () => {
  const stars = allStars(field());
  const share = predicate => stars.filter(predicate).length / stars.length;

  test('most stars are sub-pixel', () => {
    // The thing that makes a few thousand points read as a deep field: the
    // overwhelming majority are at the limit of visibility.
    expect(share(s => s.size < 1)).toBeGreaterThan(0.7);
  });

  test('a middle group is a pixel or two', () => {
    const medium = share(s => s.size >= 1 && s.size < 1.7);
    expect(medium).toBeGreaterThan(0.1);
    expect(medium).toBeLessThan(0.3);
  });

  test('only a tiny number are bright', () => {
    // A uniform distribution was tried first and reads as noise; a cube law
    // put thirteen per cent above two pixels and read as glitter.
    expect(share(s => s.size >= 1.7)).toBeLessThan(0.06);
  });

  test('the bands are declared, so the proportions are checkable', () => {
    const total = MAGNITUDE_BANDS.reduce((a, b) => a + b.share, 0);
    expect(total).toBeCloseTo(1, 9);
    for (const band of MAGNITUDE_BANDS) {
      expect(band.size[0]).toBeLessThan(band.size[1]);
      expect(band.alpha[0]).toBeLessThan(band.alpha[1]);
    }
  });

  test('bandFor covers the whole range and is monotonic', () => {
    expect(bandFor(0)).toBe(0);
    expect(bandFor(0.99)).toBe(2);
    let last = -1;
    for (let u = 0; u < 1; u += 0.01) {
      const b = bandFor(u);
      expect(b).toBeGreaterThanOrEqual(last);
      last = b;
    }
  });

  test('every star is inside the viewport', () => {
    const f = field();
    for (const star of allStars(f)) {
      expect(star.x).toBeGreaterThanOrEqual(0);
      expect(star.x).toBeLessThan(f.width);
      expect(star.y).toBeGreaterThanOrEqual(0);
      expect(star.y).toBeLessThan(f.height);
    }
  });
});

describe('the colours stay restrained', () => {
  test('the palette is short and physically plausible', () => {
    expect(STAR_PALETTE.length).toBeLessThanOrEqual(8);
    for (const c of STAR_PALETTE) {
      for (const v of [c.r, c.g, c.b]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(255);
      }
      // Starlight, not paint: no channel is far from the others.
      expect(Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b)).toBeLessThan(
        80
      );
    }
  });

  test('most of the sky is within a few percent of white', () => {
    const stars = allStars(field());
    const neutral = stars.filter(s => s.colour <= 1).length / stars.length;
    // Otherwise the background is confetti rather than a sky.
    expect(neutral).toBeGreaterThan(0.7);
  });

  test('the visibly coloured ones are rare but present', () => {
    const stars = allStars(field());
    const tinted = stars.filter(s => s.colour >= 2).length / stars.length;
    expect(tinted).toBeGreaterThan(0.05);
    expect(tinted).toBeLessThan(0.3);
  });

  test('paletteIndexFor never leaves the palette', () => {
    for (let u = 0; u < 1; u += 0.001) {
      const i = paletteIndexFor(u);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(STAR_PALETTE.length);
    }
  });
});

describe('the count follows the viewport and the tier', () => {
  test('a bigger window gets more stars', () => {
    expect(starCountFor(1920, 1080)).toBeGreaterThan(starCountFor(1280, 720));
  });

  test('it scales with area, not with a fixed number', () => {
    // The old field was 10,000 on a 320px phone and on a lecture projector.
    const small = starCountFor(1280, 720);
    const large = starCountFor(2560, 1440);
    expect(large / small).toBeGreaterThan(3);
    expect(large / small).toBeLessThan(4.5);
  });

  test('the low tier gets fewer', () => {
    expect(starCountFor(1440, 900, 'low')).toBeLessThan(
      starCountFor(1440, 900, 'full')
    );
    expect(STARS_PER_MEGAPIXEL.low).toBeLessThan(STARS_PER_MEGAPIXEL.full);
  });

  test('a phone still gets a sky, and a wall does not get a million', () => {
    expect(starCountFor(320, 700, 'low')).toBeGreaterThan(100);
    expect(starCountFor(7680, 4320, 'full')).toBeLessThan(12000);
  });

  test('a nonsense viewport does not produce a nonsense count', () => {
    for (const bad of [0, -100, NaN, undefined]) {
      expect(starCountFor(bad, bad)).toBeGreaterThan(0);
    }
  });

  test('the field honours an explicit count, for tests and for the probe', () => {
    expect(field({ count: 500 }).count).toBe(500);
  });
});

describe("the reader's own density control still works", () => {
  // star_density is a slider in the settings panel, so it has to reach the
  // sky. It used to be the literal number of stars; it is now a proportion of
  // the count this window and tier would choose on their own.
  const natural = starCountFor(1440, 900, 'full');

  test('the default means "whatever this window would choose"', () => {
    expect(starCountFor(1440, 900, 'full', DEFAULT_STAR_DENSITY)).toBe(natural);
  });

  test('halving it halves the sky', () => {
    const half = starCountFor(1440, 900, 'full', DEFAULT_STAR_DENSITY / 2);
    expect(half).toBeGreaterThan(natural * 0.45);
    expect(half).toBeLessThan(natural * 0.55);
  });

  test('zero empties it', () => {
    expect(starCountFor(1440, 900, 'full', 0)).toBe(0);
    expect(field({ density: 0 }).count).toBe(0);
  });

  test('the small-window floor does not overrule a deliberate choice', () => {
    // 240 stars is there so a phone gets a sky, not to refuse a reader who
    // asked for almost none.
    expect(starCountFor(1440, 900, 'full', 100)).toBeLessThan(240);
  });

  test('turning it up is still bounded', () => {
    expect(starCountFor(2560, 1440, 'full', 30000)).toBeLessThanOrEqual(9000);
  });

  test('a missing or nonsense density falls back to the natural count', () => {
    for (const bad of [undefined, null, NaN, 'lots']) {
      expect(starCountFor(1440, 900, 'full', bad)).toBe(natural);
    }
  });

  test('the density reaches the generated field, not just the count', () => {
    const sparse = field({ density: DEFAULT_STAR_DENSITY / 4 });
    const normal = field({});
    expect(sparse.count).toBeLessThan(normal.count / 3);
    const drawn = LAYERS.reduce((n, l) => n + sparse.layers[l].length, 0);
    expect(drawn).toBe(sparse.count);
  });
});

describe('the parallax layers', () => {
  test('there are three, ordered far to near', () => {
    expect(LAYERS).toEqual(['far', 'mid', 'near']);
    expect(LAYER_DEPTH.far).toBeGreaterThan(LAYER_DEPTH.mid);
    expect(LAYER_DEPTH.mid).toBeGreaterThan(LAYER_DEPTH.near);
  });

  test('the parallax is subtle: even the far layer moves a fraction of the pan', () => {
    // The renderer multiplies by 0.02. A sky that slides is worse than a flat
    // one, so the deepest layer moves two percent of the view.
    expect(LAYER_DEPTH.far).toBeLessThanOrEqual(1);
    expect(LAYER_DEPTH.near).toBeGreaterThan(0);
  });

  test('most of the sky is in the far layer', () => {
    const f = field();
    expect(f.layers.far.length).toBeGreaterThan(f.layers.near.length * 2);
    expect(
      f.layers.far.length + f.layers.mid.length + f.layers.near.length
    ).toBe(f.count);
  });

  test('each star records its own layer', () => {
    const f = field();
    for (const layer of LAYERS) {
      for (const star of f.layers[layer].slice(0, 50)) {
        expect(star.layer).toBe(layer);
      }
    }
  });
});

describe('only a few stars are animated', () => {
  test('the twinkling set is small and capped', () => {
    const f = field();
    expect(f.twinklers.length).toBeGreaterThan(0);
    expect(f.twinklers.length).toBeLessThanOrEqual(MAX_TWINKLERS);
    // Two percent of the sky at most: animating all of it was both wrong and
    // the reason the layers could never be cached.
    expect(f.twinklers.length / f.count).toBeLessThan(0.02);
  });

  test('a huge field does not animate proportionally more', () => {
    const big = generateStarfield({ seed: 1, width: 3840, height: 2160 });
    expect(big.twinklers.length).toBeLessThanOrEqual(MAX_TWINKLERS);
  });

  test('the ones that twinkle are the bright ones, and say so', () => {
    const f = field();
    for (const star of f.twinklers) {
      expect(star.band).toBe(2);
      expect(star.twinkles).toBe(true);
    }
    // And nothing else claims to.
    const claiming = allStars(f).filter(s => s.twinkles);
    expect(claiming).toHaveLength(f.twinklers.length);
  });

  test('each has its own phase, so they do not pulse in unison', () => {
    const phases = new Set(field().twinklers.map(s => s.phase));
    expect(phases.size).toBeGreaterThan(20);
  });
});

describe('finding the stars a distortion touches', () => {
  test('it returns exactly the stars within the radius', () => {
    const f = field({ count: 2000 });
    const index = indexStarfield(f);
    const [cx, cy, r] = [700, 400, 55];
    const found = index.near(cx, cy, r);
    const brute = allStars(f).filter(
      s => (s.x - cx) ** 2 + (s.y - cy) ** 2 <= r * r
    );
    expect(found.length).toBe(brute.length);
    expect(new Set(found.map(e => e.star))).toEqual(new Set(brute));
  });

  test('it says which layer each one is in', () => {
    const f = field({ count: 2000 });
    for (const entry of indexStarfield(f).near(700, 400, 120)) {
      expect(LAYERS).toContain(entry.layer);
      expect(f.layers[entry.layer]).toContain(entry.star);
    }
  });

  test('a query off the edge of the sky is empty, not an error', () => {
    const index = indexStarfield(field({ count: 500 }));
    expect(index.near(-500, -500, 10)).toEqual([]);
    expect(index.near(99999, 99999, 10)).toEqual([]);
  });

  test('a query larger than the sky returns all of it', () => {
    const f = field({ count: 400 });
    const found = indexStarfield(f).near(f.width / 2, f.height / 2, 99999);
    expect(found.length).toBe(f.count);
  });

  test('the grid is fine enough that a small query is cheap', () => {
    // Not a timing assertion - a structural one. A distortion patch is tens of
    // pixels across, so a cell has to be of that order or the index degenerates
    // into a scan of the whole sky.
    expect(GRID_CELL).toBeLessThanOrEqual(128);
    expect(GRID_CELL).toBeGreaterThanOrEqual(16);
  });
});
