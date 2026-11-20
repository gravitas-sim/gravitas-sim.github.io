// =============================================================================
// Body names on the main canvas: size, priority, cap, spacing, setting
// -----------------------------------------------------------------------------
// js/bodyLabels.js with a recording context. The browser half (the pilots at
// device pixel ratios 1 and 2, the cue) is e2e/bodyLabels.spec.js.
// =============================================================================

import { beforeEach, describe, expect, test } from '@jest/globals';

import { SETTINGS, state } from '../js/appState.js';
import {
  LABEL_CAP,
  LABEL_MIN_CSS_PX,
  LABEL_MODES,
  bodyLabel,
  claim,
  drawBodyMarks,
  drawnLabels,
  frameScale,
  hideMasses,
  labelFont,
  labelMode,
  nameSpots,
  setBoundTest,
} from '../js/bodyLabels.js';
import {
  BlackHole,
  Comet,
  GasGiant,
  NeutronStar,
  Planet,
  StarObject,
  WhiteDwarf,
  setStateReference,
} from '../js/physics.js';
import '../js/bodyDraw.js';
import { summaryText } from '../js/canvasSummary.js';
import { recordBuild } from '../js/quality.js';
import { EARTH_SYMBOL, SUN_SYMBOL } from '../js/utils.js';
import { formatNumber } from '../js/format.js';
import {
  EARTH_MASSES_PER_JUPITER_MASS,
  SOLAR_MASS_UNIT,
} from '../js/constants.js';

/** A context that records what is filled and stroked, with a plain text width. */
function recorder() {
  const drawn = [];
  const calls = [];
  const ctx = {
    font: '10px x',
    drawn,
    calls,
    save() {},
    restore() {},
    setTransform() {},
    beginPath: () => calls.push('beginPath'),
    arc: () => calls.push('arc'),
    moveTo: () => calls.push('moveTo'),
    lineTo: () => calls.push('lineTo'),
    stroke: () => calls.push('stroke'),
    measureText: s => ({
      width: String(s).length * parseFloat(ctx.font) * 0.6,
    }),
    fillText: (s, x, y) =>
      drawn.push({ text: String(s), x, y, font: ctx.font }),
  };
  return ctx;
}

const toScreen = p => p;
const body = (id, mass = 1) => ({ id, mass, pos: { x: 0, y: 0 }, radius: 1 });

beforeEach(() => {
  frameScale({ clientWidth: 1000, width: 1000 });
  setBoundTest(() => false);
  state.selectedObject = null;
  SETTINGS.body_labels = 'all';
  state.zoom = 1;
});

describe('sizes are CSS pixels', () => {
  test('a font is scaled by the canvas and never under 11 CSS px', () => {
    frameScale({ clientWidth: 500, width: 980 });
    expect(labelFont(11)).toBe('21.56px Roboto Mono');
    expect(labelFont(6)).toBe('21.56px Roboto Mono');
    expect(labelFont(12, 'Inter', 'bold')).toBe('bold 23.52px Inter');
    expect(LABEL_MIN_CSS_PX).toBe(11);
  });

  test('an unmeasured canvas counts as ratio 1', () => {
    expect(frameScale({ clientWidth: 0, width: 800 })).toBe(1);
  });
});

describe('the setting', () => {
  test('the modes are one setting: all, names, masses, bound, none', () => {
    expect(LABEL_MODES).toEqual(['all', 'names', 'masses', 'bound', 'none']);
  });

  test.each([
    ['all', 'all'],
    ['names', 'names'],
    ['masses', 'masses'],
    ['bound', 'bound'],
    ['none', 'none'],
    [undefined, 'all'],
    ['sideways', 'all'],
  ])('%s reads as %s', (value, expected) => {
    SETTINGS.body_labels = value;
    expect(labelMode()).toBe(expected);
  });

  test('none draws no names, bound draws the chosen and the lesson ones', () => {
    const a = body('a');
    const b = body('b');
    const c = body('c');
    setBoundTest(o => o === b);
    state.selectedObject = { type: 'Planet', object: a };
    const run = mode => {
      SETTINGS.body_labels = mode;
      for (const o of [a, b, c])
        bodyLabel(o, { x: 100 * o.id.charCodeAt(0), y: 50 }, 4, {
          px: 11,
          gate: true,
          name: o.id,
        });
      const ctx = recorder();
      drawBodyMarks(ctx, toScreen);
      return ctx.drawn.map(d => d.text).sort();
    };
    expect(run('all')).toEqual(['a', 'b', 'c']);
    expect(run('bound')).toEqual(['a', 'b']);
    expect(run('none')).toEqual([]);
  });

  test('a body below the level of detail is named only when chosen or bound', () => {
    const a = body('a');
    const b = body('b');
    const c = body('c');
    setBoundTest(o => o === b);
    state.selectedObject = { type: 'Planet', object: c };
    for (const o of [a, b, c])
      bodyLabel(o, { x: 100 * o.id.charCodeAt(0), y: 50 }, 4, {
        px: 11,
        gate: false,
        name: o.id,
      });
    const ctx = recorder();
    drawBodyMarks(ctx, toScreen);
    expect(ctx.drawn.map(d => d.text).sort()).toEqual(['b', 'c']);
  });
});

describe('a crowd', () => {
  const crowd = n =>
    Array.from({ length: n }, (_, i) => ({
      ...body(`n${i}`, i + 1),
      at: { x: 20 + (i % 10) * 90, y: 40 + Math.floor(i / 10) * 60 },
    }));

  test('is capped, heaviest first, and the lesson body always makes it', () => {
    const bodies = crowd(60);
    const lesson = bodies[0]; // the lightest
    setBoundTest(o => o === lesson);
    for (const o of bodies)
      bodyLabel(o, o.at, 4, {
        px: 11,
        gate: true,
        name: o.id,
      });
    const ctx = recorder();
    drawBodyMarks(ctx, toScreen);
    const names = ctx.drawn.map(d => d.text);
    expect(names).toHaveLength(LABEL_CAP + 1);
    expect(names).toContain('n0');
    expect(names).toContain('n59');
    expect(names).not.toContain('n10');
  });

  test('the selected body is first in line when the spots run out', () => {
    const a = { ...body('a', 1), at: { x: 100, y: 100 } };
    const b = { ...body('b', 99), at: { x: 100, y: 100 } };
    state.selectedObject = { type: 'Planet', object: a };
    for (const o of [b, a])
      bodyLabel(o, o.at, 4, { px: 11, gate: true, name: o.id });
    const ctx = recorder();
    drawBodyMarks(ctx, toScreen);
    const [first, second] = ctx.drawn;
    expect(first.text).toBe('a');
    // The heavier body sits on the same centre: its name moves down a row.
    expect(second.text).toBe('b');
    expect(second.y).toBeGreaterThan(first.y + 11);
  });

  test('a displaced name gets a leader line and none overlap', () => {
    const bodies = [1, 2, 3, 4].map(i => ({
      ...body(`b${i}`, 5 - i),
      at: { x: 300, y: 100 + i },
    }));
    setBoundTest(() => true);
    for (const o of bodies)
      bodyLabel(o, o.at, 4, { px: 11, gate: true, name: o.id });
    const ctx = recorder();
    drawBodyMarks(ctx, toScreen);
    expect(ctx.drawn).toHaveLength(4);
    const ys = ctx.drawn.map(d => d.y).sort((p, q) => p - q);
    for (let i = 1; i < ys.length; i++)
      expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(11);
    expect(ctx.calls.filter(c => c === 'lineTo').length).toBeGreaterThan(0);
  });

  test('a free name that cannot be placed is dropped, a bound one is not', () => {
    const near = i => ({ ...body(`f${i}`, 1), at: { x: 50, y: 50 } });
    const free = Array.from({ length: 12 }, (_, i) => near(i));
    for (const o of free)
      bodyLabel(o, o.at, 4, { px: 11, gate: true, name: o.id });
    const ctx = recorder();
    drawBodyMarks(ctx, toScreen);
    // Five spots are tried; the rest are left out rather than piled up.
    expect(ctx.drawn.length).toBeLessThan(12);
    expect(ctx.drawn.length).toBeGreaterThan(0);
  });
});

describe('a lesson body with no free spot', () => {
  test('is drawn at its home spot, recorded as drawn, and kept clear of by later labels', () => {
    const pile = Array.from({ length: 14 }, (_, i) => ({
      ...body(`p${i}`, 20 - i),
      at: { x: 300, y: 300 },
    }));
    setBoundTest(o => o.id.startsWith('p'));
    for (const o of pile)
      bodyLabel(o, o.at, 4, { px: 11, gate: true, name: o.id });
    // A free label queued with them goes last, and must keep off every one.
    bodyLabel(body('late', 1), { x: 300, y: 300 }, 4, {
      px: 11,
      gate: true,
      name: 'late',
    });
    const ctx = recorder();
    drawBodyMarks(ctx, toScreen);
    // All of the lesson ones, the ones that found no spot included, are
    // recorded as drawn, so the description names them.
    const names = drawnLabels();
    for (const o of pile) expect(names).toContain(o.id);
    const late = nameSpots().find(p => p.text === 'late');
    if (late)
      for (const p of nameSpots().filter(p => p !== late))
        expect(
          late.x0 < p.x1 && p.x0 < late.x1 && late.y0 < p.y1 && p.y0 < late.y1
        ).toBe(false);
  });
});

describe('the cue', () => {
  test('a ring and four corner ticks are drawn for the chosen body, whatever the setting', () => {
    const a = body('a');
    state.selectedObject = { type: 'Star', object: a };
    SETTINGS.body_labels = 'none';
    const ctx = recorder();
    drawBodyMarks(ctx, p => ({ x: 400, y: 300 + p.y }));
    expect(ctx.calls.filter(c => c === 'arc')).toHaveLength(2);
    expect(ctx.calls.filter(c => c === 'lineTo')).toHaveLength(8);
  });

  test('nothing is drawn with nothing chosen', () => {
    const ctx = recorder();
    drawBodyMarks(ctx, toScreen);
    expect(ctx.calls).toEqual([]);
  });
});

describe('claim', () => {
  test('takes a spot once', () => {
    const placed = [];
    expect(claim(placed, 10, 10, 20, 10)).toBe(true);
    expect(claim(placed, 15, 12, 20, 10)).toBe(false);
    expect(claim(placed, 100, 10, 20, 10)).toBe(true);
  });
});

/** A context that takes any call and does nothing, for a body's own draw path. */
const quiet = () =>
  new Proxy(
    { createRadialGradient: () => ({ addColorStop() {} }) },
    { get: (t, k) => (k in t ? t[k] : () => {}), set: () => true }
  );

describe('what a label says', () => {
  const view = {
    paused: true,
    zoom: 40,
    pan: { x: 0, y: 0 },
    frameOffset: { x: 0, y: 0 },
    frame_count: 0,
  };

  /** Draw one body through its own drawer; the label texts that result. */
  const labelsOf = (o, mode, zoom = 40) => {
    setStateReference(view);
    view.zoom = zoom;
    SETTINGS.body_labels = mode;
    frameScale({ clientWidth: 1000, width: 1000 });
    o.draw(quiet());
    const ctx = recorder();
    drawBodyMarks(ctx, p => ({ x: 500, y: 400 + 0 * p.x }));
    return ctx.drawn.map(d => d.text);
  };
  const named = (o, name) => ((o.name = name), o);
  const mkPlanet = () => {
    const p = new Planet({ x: 0, y: 0 }, { x: 0, y: 0 }, 5);
    p.alive = true;
    return p;
  };

  test('a mass label reads the mass of its body with its unit symbol and suffix, family by family', () => {
    const at = (Body, mass, ...more) =>
      Object.assign(new Body({ x: 0, y: 0 }, { x: 0, y: 0 }, mass, ...more), {
        alive: true,
      });
    const giant = at(GasGiant, 2);
    const cases = [
      [mkPlanet(), `${formatNumber(5)} M${EARTH_SYMBOL}`],
      [
        giant,
        `${Math.round(giant.massInJupiters * EARTH_MASSES_PER_JUPITER_MASS)} M${EARTH_SYMBOL}`,
      ],
      [at(StarObject, 1.5), `${formatNumber(1.5)} M${SUN_SYMBOL}`],
      [at(NeutronStar, 1.4), `${formatNumber(1.4)} M${SUN_SYMBOL} NS`],
      [at(WhiteDwarf, 0.6), `${formatNumber(0.6)} M${SUN_SYMBOL} WD`],
    ];
    for (const [o, want] of cases) {
      // The label is drawn in parts (number and letter, symbol, suffix).
      expect(labelsOf(o, 'masses').join('')).toBe(want);
    }
  });

  test('a comet and a black hole read their masses too', () => {
    const c = Object.assign(new Comet({ x: 0, y: 0 }, { x: 0, y: 0 }), {
      alive: true,
    });
    expect(labelsOf(c, 'masses', 5000).join('')).toContain(
      formatNumber(c.massInComets)
    );
    const b = Object.assign(new BlackHole({ x: 0, y: 0 }, { x: 0, y: 0 }, 10), {
      alive: true,
    });
    expect(labelsOf(b, 'masses').join('')).toBe(
      `${formatNumber(b.mass / SOLAR_MASS_UNIT)} M${SUN_SYMBOL}`
    );
  });

  test('names shows only a body with a name; masses never shows a name; all is today', () => {
    const p = named(mkPlanet(), 'Eris');
    expect(labelsOf(p, 'names')).toEqual(['Eris']);
    expect(labelsOf(p, 'masses').join('')).toBe(
      `${formatNumber(5)} M${EARTH_SYMBOL}`
    );
    // Named in the model (a Solar System planet): the default shows the name.
    p.isSolarSystemPlanet = true;
    expect(labelsOf(p, 'all')).toEqual(['Eris']);
    p.isSolarSystemPlanet = false;
    // Named only as data: the default is still its mass, as before.
    expect(labelsOf(mkPlanet(), 'all').join('')).toBe(
      `${formatNumber(5)} M${EARTH_SYMBOL}`
    );
    // Nameless in names mode: nothing, unless it is the chosen body.
    const n = named(mkPlanet(), '');
    expect(labelsOf(n, 'names')).toEqual([]);
    state.selectedObject = { type: 'Planet', object: n };
    expect(labelsOf(n, 'names')[0]).toBe(`${formatNumber(5)} M`);
    state.selectedObject = null;
  });

  test('hideMasses keeps every mass off the canvas, in each mode, and gives them back', () => {
    const star = () => {
      const s = new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 3);
      s.alive = true;
      s.radius = 9;
      s.name = ''; // masses only: a name is not what is hidden
      return s;
    };
    const mass = `${formatNumber(3)} M${SUN_SYMBOL}`;
    expect(labelsOf(star(), 'all').join('')).toBe(mass);
    hideMasses(true);
    try {
      for (const mode of LABEL_MODES)
        expect(labelsOf(star(), mode).join('')).toBe('');
      // The chosen star and a lesson's own are named by mass in names mode: still hidden.
      const chosen = star();
      state.selectedObject = { type: 'Star', object: chosen };
      expect(labelsOf(chosen, 'names').join('')).toBe('');
      state.selectedObject = null;
      setBoundTest(() => true);
      expect(labelsOf(star(), 'bound').join('')).toBe('');
      setBoundTest(() => false);
      // A name is not a mass: a Solar System body keeps it.
      const sun = named(star(), 'Sun');
      sun.isSolarSystemSun = true;
      expect(labelsOf(sun, 'all').join('')).toBe('Sun');
    } finally {
      hideMasses(false);
    }
    expect(labelsOf(star(), 'all').join('')).toBe(mass);
  });

  test('the text of what was drawn reaches the description', () => {
    const p = named(mkPlanet(), 'Eris');
    labelsOf(p, 'names');
    expect(drawnLabels()).toEqual(['Eris']);
    labelsOf(mkPlanet(), 'masses');
    expect(drawnLabels()).toEqual([`${formatNumber(5)} M⊕`]);
  });

  test('the description lists the labels and says what the tier left out', () => {
    const p = named(mkPlanet(), 'Eris');
    labelsOf(p, 'names');
    recordBuild(
      key => (key === 'num_planets' ? 12 : 0),
      {
        num_planets: 80,
        num_stars: 0,
        num_gas_giants: 0,
        num_asteroids: 0,
        enable_asteroids: true,
        num_comets: 0,
        num_micro_stars: 0,
      },
      0,
      [[1, 2, 3]]
    );
    const text = summaryText();
    expect(text).toContain('Labeled on the canvas: Eris.');
    expect(text).toContain(
      'Reduced population on this device: 3 of 71 bodies.'
    );
    recordBuild(null, {}, 0, []);
    expect(summaryText()).not.toContain('Reduced population');
  });
});
