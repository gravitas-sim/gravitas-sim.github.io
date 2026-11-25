// =============================================================================
// The sky: deterministic, distributed like a sky, and sized to the window
// -----------------------------------------------------------------------------
// The field this replaces was ten thousand uniformly white, uniformly bright
// stars from Math.random, the same count on a phone and a lecture projector,
// regenerated on every resize and repainted in full twenty or more times a
// second. Every property below is one of the things that was wrong with it.
//
// The performance work that goes with this lives in js/render.js - three
// pre-rendered layers instead of ten thousand fills - and is measured by
// tools/starfield-probe.mjs rather than asserted here. What this file holds is
// the model: the same seed gives the same sky, the brightness distribution is
// the shape of a real field rather than a uniform scatter, the colors stay
// restrained, and the count follows the viewport.
// =============================================================================

import { describe, test, expect, jest, afterEach } from '@jest/globals';
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
  displacementFrom,
  discCoversRect,
  DEFAULT_STAR_DENSITY,
} from '../js/bodyDrawSky.js';

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
        'color',
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

describe('the colors stay restrained', () => {
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
    const neutral = stars.filter(s => s.color <= 1).length / stars.length;
    // Otherwise the background is confetti rather than a sky.
    expect(neutral).toBeGreaterThan(0.7);
  });

  test('the visibly colored ones are rare but present', () => {
    const stars = allStars(field());
    const tinted = stars.filter(s => s.color >= 2).length / stars.length;
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

  test('the field honors an explicit count, for tests and for the probe', () => {
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

  test('asking for one layer returns that layer in the order the mixed query had it', () => {
    const f = field({ count: 3000 });
    const index = indexStarfield(f);
    for (const layer of LAYERS) {
      const mixed = index
        .near(700, 400, 300)
        .filter(e => e.layer === layer)
        .map(e => e.star);
      const own = index.near(700, 400, 300, layer).map(e => e.star);
      expect(own.length).toBeGreaterThan(0);
      expect(own).toEqual(mixed);
    }
  });

  test('a reused output array is emptied first and gets the same answer', () => {
    const index = indexStarfield(field({ count: 1500 }));
    const out = [{ stale: true }];
    const returned = index.near(500, 300, 150, 'mid', out);
    expect(returned).toBe(out);
    expect(out).toEqual(index.near(500, 300, 150, 'mid'));
    expect(out.some(e => e.stale)).toBe(false);
  });

  test('stamping entries lets a painter draw a star once across wrapped queries', () => {
    // A disc wider than the sky is asked for at the wrapped centres too, and
    // every query returns every star; the stamp is what makes it one each.
    const f = field({ count: 800 });
    const index = indexStarfield(f);
    const r = 2000;
    const centres = [
      [f.width / 2, f.height / 2],
      [f.width / 2 - f.width, f.height / 2],
      [f.width / 2, f.height / 2 - f.height],
      [f.width / 2 - f.width, f.height / 2 - f.height],
    ];
    const stamp = 1;
    const drawn = [];
    let returned = 0;
    for (const layer of LAYERS) {
      for (const [cx, cy] of centres) {
        for (const entry of index.near(cx, cy, r, layer)) {
          returned++;
          if (entry.mark === stamp) continue;
          entry.mark = stamp;
          drawn.push(entry.star);
        }
      }
    }
    expect(returned).toBeGreaterThan(f.count);
    expect(drawn.length).toBe(f.count);
    expect(new Set(drawn).size).toBe(f.count);
  });

  test('the grid is fine enough that a small query is cheap', () => {
    // Not a timing assertion - a structural one. A distortion patch is tens of
    // pixels across, so a cell has to be of that order or the index degenerates
    // into a scan of the whole sky.
    expect(GRID_CELL).toBeLessThanOrEqual(128);
    expect(GRID_CELL).toBeGreaterThanOrEqual(16);
  });
});

// --- How far a distortion moves a star ----------------------------------------

/**
 * The profile as it was written before the per-region constants were hoisted
 * out of the per-star call: every number worked out again for every star, with
 * a clock read each time. A copy, so that the optimised one is held to it.
 */
function referenceDisplacement(region, sx, sy, zoom) {
  const dx = sx - region.x;
  const dy = sy - region.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (region.kind === 'lens') {
    if (dist >= region.r) return null;
    const core = Math.max(region.r * 0.12, 1e-6);
    const b = Math.max(dist, core);
    const deflection = (region.strength * region.r * core) / b;
    const edge = 1 - dist / region.r;
    const lens = deflection * edge * edge;
    if (!(lens > 0)) return null;
    return {
      dx: (dx / (dist + 1e-6)) * lens,
      dy: (dy / (dist + 1e-6)) * lens,
      blur: region.blur * edge,
      color: region.color,
    };
  }
  const ripple = region.source;
  const now = globalThis.performance.now();
  const age = now - ripple.created;
  const mass = ripple.mass || 1.0;
  const gw = ripple.gw_strength !== undefined ? ripple.gw_strength : 1.0;
  const fade = ripple._fade !== undefined ? ripple._fade : 1.0;
  let amplitude = (8 + 10 * Math.log10(mass + 1)) * fade * gw;
  let wavelength = 80 + 40 * Math.log10(mass + 1);
  if (ripple.kilonova) {
    amplitude = (10 + 12 * Math.log10(mass + 1)) * fade * gw * 1.2;
  } else if (ripple.nswd_merger) {
    amplitude = (12 + 15 * Math.log10(mass + 1)) * fade * gw * 1.5;
    wavelength = 100 + 50 * Math.log10(mass + 1);
  } else if (ripple.wdwd_merger) {
    amplitude = (6 + 8 * Math.log10(mass + 1)) * fade * gw * 1.2;
    wavelength = 60 + 30 * Math.log10(mass + 1);
  }
  const c = 0.18;
  const radius = c * age * zoom;
  const progress = age / ripple.duration;
  if (dist >= region.r || dist <= 8) return null;
  const phase = (dist - radius) / wavelength;
  const local = amplitude * Math.exp(-Math.abs(phase));
  let factor = local * Math.sin(phase * Math.PI * 2 - progress * Math.PI * 2);
  if (ripple.kilonova) factor *= 1 + Math.sin(progress * Math.PI * 3) * 0.15;
  else if (ripple.nswd_merger) {
    factor *= 1 + Math.sin(progress * Math.PI * 3) * 0.2;
  }
  return {
    dx: (dx / dist) * factor,
    dy: (dy / dist) * factor,
    blur: 0,
    color: '#fff',
  };
}

describe('displacementFrom', () => {
  afterEach(() => jest.restoreAllMocks());

  const lens = {
    x: 700,
    y: 420,
    r: 310,
    kind: 'lens',
    strength: 3.0,
    blur: 2.5,
    color: '#fff',
  };
  const ripple = extra => ({
    x: 640,
    y: 380,
    r: 900,
    inner: 0,
    kind: 'ripple',
    source: {
      created: 12_000,
      duration: 4000,
      mass: 35,
      _fade: 0.8,
      ...extra,
    },
  });
  const probes = [];
  for (let i = 0; i < 400; i++) {
    probes.push([(i * 37.3) % 1440, (i * 91.7) % 900]);
  }

  const sameAsReference = (region, zoom) => {
    jest.spyOn(globalThis.performance, 'now').mockReturnValue(15_300.25);
    let compared = 0;
    for (const [sx, sy] of probes) {
      const want = referenceDisplacement(region, sx, sy, zoom);
      const got = displacementFrom(region, sx, sy, zoom);
      if (want === null) {
        expect(got).toBeNull();
        continue;
      }
      expect(Object.is(got.dx, want.dx)).toBe(true);
      expect(Object.is(got.dy, want.dy)).toBe(true);
      expect(got.blur).toBe(want.blur);
      expect(got.color).toBe(want.color);
      compared++;
    }
    expect(compared).toBeGreaterThan(20);
  };

  test('a lens moves each star exactly as it always did', () => {
    sameAsReference({ ...lens }, 1);
  });

  test.each([
    ['a plain ripple', {}],
    ['a kilonova', { kilonova: true }],
    ['a neutron star and white dwarf merger', { nswd_merger: true }],
    ['a white dwarf pair', { wdwd_merger: true }],
    ['a ripple with its own strength', { gw_strength: 0.4, mass: 0 }],
  ])('%s moves each star exactly as it always did', (_name, extra) => {
    sameAsReference(ripple(extra), 1.7);
  });

  test('a ripple reads the clock once per region, not once per star', () => {
    const now = jest
      .spyOn(globalThis.performance, 'now')
      .mockReturnValue(15_300.25);
    const region = ripple({});
    for (const [sx, sy] of probes) displacementFrom(region, sx, sy, 1);
    expect(now.mock.calls.length).toBe(1);
  });

  test('the answer is read before the next call and not kept', () => {
    jest.spyOn(globalThis.performance, 'now').mockReturnValue(15_300.25);
    const a = displacementFrom({ ...lens }, 650, 400, 1);
    const first = { dx: a.dx, dy: a.dy };
    const b = displacementFrom({ ...lens }, 760, 470, 1);
    expect(b).toBe(a);
    expect([b.dx, b.dy]).not.toEqual([first.dx, first.dy]);
  });
});

describe('a disc that covers the canvas', () => {
  test('covers it when the farthest corner is inside with room to spare', () => {
    expect(discCoversRect(720, 450, 900, 1440, 900)).toBe(true);
    // 720 across and 450 down to the corner is 849.1; 2 pixels of margin.
    expect(discCoversRect(720, 450, 851.2, 1440, 900)).toBe(true);
    expect(discCoversRect(720, 450, 851, 1440, 900)).toBe(false);
  });

  test('a centre off the canvas still has to reach the far side', () => {
    expect(discCoversRect(-300, 450, 1900, 1440, 900)).toBe(true);
    expect(discCoversRect(-300, 450, 1500, 1440, 900)).toBe(false);
    expect(discCoversRect(5000, -4000, 153000, 1440, 900)).toBe(true);
  });

  test('a disc that misses a corner does not', () => {
    expect(discCoversRect(100, 100, 1500, 1440, 900)).toBe(false);
    expect(discCoversRect(0, 0, 1701, 1440, 900)).toBe(true);
  });

  test('nothing is covered by an empty or undefined radius', () => {
    expect(discCoversRect(720, 450, 0, 1440, 900)).toBe(false);
    expect(discCoversRect(720, 450, NaN, 1440, 900)).toBe(false);
    expect(discCoversRect(720, 450, undefined, 1440, 900)).toBe(false);
  });
});
