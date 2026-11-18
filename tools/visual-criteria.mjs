// =============================================================================
// The visual criteria, as code
// -----------------------------------------------------------------------------
// DESIGN_SYSTEM.md ("Visual direction") names three kinds of reason a visual
// change may give: perception (a student can read it), orientation (a student
// can find their way) and appearance (it is better to look at). The first two
// can be stated as a measurement, and this file is where the statements live:
//
//   I-8   layout: the scene is in view while a student works on a phone and a
//         tablet (e2e/visualCriteria.criteria.js)
//   I-9   drawing: labels, arrows, trails and plot type are readable and mean
//         what they show (e2e/visualCriteria.criteria.js, on demand; the
//         labels' passing baseline is in e2e/canvasLegibility.spec.js)
//
// Appearance has no executable test, on purpose: whether something is better
// to look at is a judgment, and it is shown as matched before-and-after
// captures (tools/visual-matrix.mjs), never decided here.
//
// Three kinds of thing are exported.
//
//   Constants   the numbers and the pilot states, in one place, so the specs,
//               the matrix and the documents read the same ones.
//   Judges      pure functions from a measurement to a verdict. They have no
//               DOM and no clock; tests/visualCriteria.test.js runs them on a
//               known-good and a known-bad measurement each, which is how the
//               harness is shown to be able to pass and to fail.
//   Page code   functions that run inside the page (they are serialised by
//               Playwright, so each is self-contained and reads nothing from
//               this module). They measure; they never judge.
//
// The thresholds are the roadmap's fixed criteria. A threshold is never moved
// to make a measurement pass: a miss is reported and the change that caused it
// is narrowed or reverted (section 12.2 of the roadmap, criteria I-8 and I-9).
// =============================================================================

/* global CanvasRenderingContext2D */

// --- Thresholds ------------------------------------------------------------------

/** I-9: the smallest effective label size, in CSS pixels, on the main canvas. */
export const LABEL_FLOOR_CSS_PX = 11;
/** Two label boxes overlap when they share more than this in both directions. */
export const OVERLAP_TOLERANCE_PX = 2;
/** I-8: the share of the viewport height that must be unobscured canvas. */
export const OPEN_HEIGHT_SHARE = 1 / 3;
/** A grid row (or column) counts as open canvas when this share of it is. */
export const OPEN_ROW_SHARE = 0.6;
/** I-8 at tablet width: the lesson panel must be at least this wide. */
export const PANEL_MIN_WIDTH_PX = 300;
/** I-9 plots: tick labels and axis titles, CSS pixels. */
export const PLOT_TICK_FLOOR_PX = 11;
export const PLOT_TITLE_FLOOR_PX = 12;
/** I-9 arrows: a body moving this much faster must have an arrow this much longer. */
export const ARROW_RATIO_FACTOR = 3;
export const ARROW_MONOTONIC_MARGIN = 1.15;
/** I-9 trails: the longest and shortest span, as a ratio, across frame rates. */
export const TRAIL_SPAN_MAX_RATIO = 1.05;
export const TRAIL_FRAME_RATES = [30, 60, 144];
/** The selected-body cue: changed pixels in the ring around the body. */
export const CUE_MIN_PIXELS = 24;
export const CUE_LUMA_STEP = 40;

/** Viewports of I-8 (phone, tablet) and of the desktop clause (335). */
export const PHONE_SIZES = [
  { width: 375, height: 812 },
  { width: 412, height: 915 },
];
export const TABLET_SIZE = { width: 768, height: 1024 };
export const DESKTOP_SIZES = [
  { width: 1366, height: 800 },
  { width: 1440, height: 900 },
];
export const MATRIX_WIDTHS = [375, 768, 1366];
export const THEMES = ['midnight', 'daylight'];
export const LANGUAGES = ['en', 'es'];
export const DEVICE_PIXEL_RATIOS = [1, 2];

/**
 * The accessible name of a control that lowers the lesson sheet or brings the
 * scene into view in one announced action: the sheet handle of a lesson on a
 * phone ("Lower the sheet to see the scene").
 */
export const SCENE_ACTION_NAME =
  /show (the )?scene|lower (the )?(sheet|lesson)|peek|collapse|minimi[sz]e (the )?(lesson|sheet)/i;

// --- The pilot states ----------------------------------------------------------------

/**
 * The five lesson pilots, at the step whose work uses the scene or the
 * instrument. `subject` says what I-8 looks for: the bound bodies of the scene
 * (`scene`) or the lesson's own instrument (`instrument`), because in the Moon
 * and Io lessons of 3.0 the canvas holds a staged star nothing in the step is
 * about.
 */
export const LESSON_PILOTS = [
  {
    id: 'keplers-2nd-law',
    label: "Kepler's 2nd Law",
    lesson: 'keplers-laws',
    sid: 'measure-the-two-orbits',
    subject: 'scene',
    scenario: "Kepler's 2nd Law",
  },
  {
    id: 'transit-lab',
    label: 'Transit Lab',
    lesson: 'transit-photometry',
    sid: 'your-first-transit',
    subject: 'scene',
    scenario: 'Transit Lab',
  },
  {
    id: 'weighing-stars-binary',
    label: "Weighing the Stars' binary",
    lesson: 'weighing-stars',
    sid: 'watch-them',
    subject: 'scene',
    scenario: 'the lesson stage (starPair)',
  },
  {
    id: 'galilean-resonance',
    label: 'Galilean Resonance (Io)',
    lesson: 'ios-fire',
    sid: 'heating-at-the-maximum',
    subject: 'instrument',
    scenario: 'a staged star beside the tides-heating instrument at 3.0',
  },
  {
    id: 'moon-image',
    label: 'Moon image',
    lesson: 'measuring-the-moon',
    sid: 'scale-from-the-disc',
    subject: 'instrument',
    scenario: 'a staged star beside the moon-marks image instrument at 3.0',
  },
];

/**
 * Other lesson steps the drawing criteria are measured on: the wedge labels of
 * Kepler's second law and the two plots the plot clause names.
 */
export const DRAWING_STATES = {
  wedges: {
    lesson: 'keplers-laws',
    sid: 'equal-areas-however-you-slice',
  },
  keplerPlot: { lesson: 'keplers-laws', sid: 'measure-four-planets' },
  transitCurve: { lesson: 'transit-photometry', sid: 'your-first-transit' },
};

/**
 * The four sandbox pilot scenes of the sandbox prompts (an orbital system, a
 * world seen close, a binary, a crowded scene), each as the committed scene
 * record it is captured from (tests/fixtures/scene-records). The 1366 record
 * is the base; the matrix derives the other widths and themes from it by
 * changing the viewport or the theme only.
 */
export const SANDBOX_PILOTS = [
  {
    id: 'orbital-system',
    label: 'An orbital system',
    base: 'solar-system-midnight-1366',
  },
  {
    id: 'close-world',
    label: 'A world seen close',
    base: 'galilean-resonance-zoomed-midnight-1366',
  },
  {
    id: 'binary',
    label: 'A binary',
    base: 'circumbinary-planet-lab-midnight-1366',
  },
  {
    id: 'crowded-scene',
    label: 'A crowded scene',
    base: 'star-cluster-midnight-1366',
  },
];

// --- Judges (pure) -------------------------------------------------------------------

/**
 * The size of a label in CSS pixels, from the font it was drawn at.
 *
 * The main canvas's backing store is the CSS box times `canvasScale` (js/quality.js
 * renderScale) and its context is not scaled to match, so a font of `fontPx`
 * drawn through a transform of `transformScale` covers
 * fontPx * transformScale / canvasScale CSS pixels.
 */
export function effectiveCssSize(fontPx, transformScale = 1, canvasScale = 1) {
  if (!(canvasScale > 0)) return NaN;
  return (fontPx * transformScale) / canvasScale;
}

/** One character that is not a letter or digit: a unit symbol, not a name. */
export const isSymbolGlyph = text =>
  [...String(text).trim()].length === 1 && !/[\p{L}\p{N}]/u.test(String(text));

/** Pairs of boxes that share more than `tolerance` pixels in both directions. */
export function overlappingPairs(boxes, tolerance = OVERLAP_TOLERANCE_PX) {
  const out = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const dx = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
      const dy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      if (dx <= tolerance || dy <= tolerance) continue;
      // A label drawn twice (a halo, then ink) is the technique, not a clash.
      if (
        a.text === b.text &&
        Math.abs(a.x0 - b.x0) < 3 &&
        Math.abs(a.y0 - b.y0) < 3
      )
        continue;
      out.push([a, b]);
    }
  }
  return out;
}

/**
 * I-9, label clause: every label at least `floor` CSS pixels, none on another.
 *
 * @param {Array<{text: string, size: number, x0: number, x1: number, y0: number, y1: number}>} boxes
 *   Boxes in CSS pixels, with `size` the effective CSS size
 */
export function judgeLabels(all, { floor = LABEL_FLOOR_CSS_PX } = {}) {
  // A single symbol glyph (the Earth or Sun sign after a mass) is drawn smaller
  // than the number it follows and is part of that label, not a label of its
  // own: it is neither judged nor allowed to count as an overlap.
  const boxes = all.filter(b => !isSymbolGlyph(b.text));
  const small = boxes
    .filter(b => b.size < floor - 1e-6)
    .map(b => `${b.size.toFixed(1)}px "${String(b.text).slice(0, 24)}"`);
  const overlaps = overlappingPairs(boxes).map(
    ([a, b]) =>
      `"${String(a.text).slice(0, 20)}" over "${String(b.text).slice(0, 20)}"`
  );
  return {
    pass: boxes.length > 0 && small.length === 0 && overlaps.length === 0,
    count: boxes.length,
    smallest: boxes.length ? Math.min(...boxes.map(b => b.size)) : null,
    small,
    overlaps,
  };
}

/**
 * The longest run of grid lines whose open share is at least `share`, in
 * pixels. `shares` is one number per line, in order, each line `step` px wide.
 */
export function longestOpenRun(shares, step, share = OPEN_ROW_SHARE) {
  let best = 0;
  let run = 0;
  for (const s of shares) {
    if (s >= share) {
      run++;
      best = Math.max(best, run);
    } else run = 0;
  }
  return best * step;
}

/**
 * I-8: is the scene in view while the student works?
 *
 * @param {object} m - What `measureLayoutInPage` reported
 * @param {{kind: 'phone'|'tablet'|'desktop', subject: 'scene'|'instrument'}} how
 * @returns {{pass: boolean, reasons: string[]}}
 */
export function judgeLayout(m, { kind, subject }) {
  const reasons = [];
  if (subject === 'scene') {
    if (!m.bodies.length) reasons.push('no body is bound by the step');
    for (const b of m.bodies)
      if (!b.inside) reasons.push(`${b.role} is outside the viewport`);
      else if (!b.visible)
        reasons.push(`${b.role} is under ${b.coveredBy || 'a panel'}`);
  } else if (!m.instrument?.visible) {
    reasons.push(
      `the instrument is not fully in view (${m.instrument?.reason || 'absent'})`
    );
  }
  if (kind === 'phone' && subject === 'scene') {
    if (m.openRunPx < m.vh * OPEN_HEIGHT_SHARE)
      reasons.push(
        `unobscured canvas is ${m.openRunPx} px tall, under a third of ${m.vh} px`
      );
  }
  if (kind === 'tablet') {
    if (!(m.panel && m.panel.width >= PANEL_MIN_WIDTH_PX))
      reasons.push('the lesson panel is narrower than 300 px');
    if (subject === 'scene' && m.openColsPx < m.vw * OPEN_HEIGHT_SHARE)
      reasons.push(
        `unobscured canvas is ${m.openColsPx} px wide, under a third of ${m.vw} px`
      );
    if (m.panelOverlapsTool)
      reasons.push('the step and the instrument overlap');
  }
  return { pass: reasons.length === 0, reasons };
}

/**
 * I-9, arrow clause: arrow length rises with magnitude. `lengths` is the drawn
 * shaft length for a body at the base speed and at `ARROW_RATIO_FACTOR` times
 * it.
 */
export function judgeArrows({ slow, fast }) {
  const pass =
    Number.isFinite(slow) &&
    Number.isFinite(fast) &&
    slow > 0 &&
    fast >= slow * ARROW_MONOTONIC_MARGIN;
  return { pass, slow, fast, ratio: slow > 0 ? fast / slow : null };
}

/** I-9, trail clause: the span in simulated time does not follow the frame rate. */
export function judgeTrailSpans(spans) {
  const values = spans.map(s => s.span).filter(Number.isFinite);
  const ratio = values.length
    ? Math.max(...values) / Math.min(...values)
    : Infinity;
  return {
    pass: values.length === spans.length && ratio <= TRAIL_SPAN_MAX_RATIO,
    ratio,
  };
}

/**
 * I-9, plot clause on measured text: ticks at least 11 px and labels (axis
 * titles and point names) at least 12 px, in CSS pixels. `texts` are
 * `{role: 'tick'|'label', size}`; a number is a tick, anything else a label.
 */
export function judgePlotType(texts) {
  const ticks = texts.filter(t => t.role === 'tick');
  const titles = texts.filter(t => t.role === 'label');
  const lowTicks = ticks.filter(t => t.size < PLOT_TICK_FLOOR_PX - 1e-6);
  const lowTitles = titles.filter(t => t.size < PLOT_TITLE_FLOOR_PX - 1e-6);
  return {
    pass: ticks.length > 0 && lowTicks.length === 0 && lowTitles.length === 0,
    ticks: ticks.length,
    smallestTick: ticks.length ? Math.min(...ticks.map(t => t.size)) : null,
    smallestLabel: titles.length ? Math.min(...titles.map(t => t.size)) : null,
  };
}

/**
 * I-9, plot clause on series: with more than one series, each differs from the
 * others by marker shape (colour and dash do not count), so a grayscale or a
 * colour-blind reader can tell them apart.
 *
 * @param {Array<{colour: string, marker: string|null, dash: string}>} series
 */
export function judgeSeriesWithoutColour(series) {
  if (series.length < 2) return { pass: true, series: series.length };
  const markers = series.map(s => s.marker);
  const distinct = new Set(markers.map(m => m ?? 'none'));
  return {
    pass: !markers.includes(null) && distinct.size === series.length,
    series: series.length,
    markers,
  };
}

/** The selected-body cue: enough pixels changed, in luminance, around the body. */
export function judgeCue({ changed }) {
  return { pass: changed >= CUE_MIN_PIXELS, changed };
}

// --- Page code ---------------------------------------------------------------------------

/**
 * Init script. Records every piece of text drawn on a canvas, one frame at a
 * time (a frame ends where that canvas is cleared whole), with the font, the
 * transform and where it landed in the backing store. `window.__canvasText[id]`
 * holds the last complete frame of the canvas called `id` in `last`; the main
 * canvas is `simulationCanvas`.
 */
export function installCanvasTextRecorder() {
  const stores = {};
  window.__canvasText = stores;
  const storeOf = canvas => {
    const id = canvas?.id || '';
    stores[id] ??= { frame: [], last: [], frames: 0 };
    return stores[id];
  };
  const proto = CanvasRenderingContext2D.prototype;
  const clear = proto.clearRect;
  proto.clearRect = function (x, y, w, h, ...rest) {
    if (
      this.canvas?.id &&
      x <= 0 &&
      y <= 0 &&
      w >= this.canvas.width - 1 &&
      h >= this.canvas.height - 1
    ) {
      const s = storeOf(this.canvas);
      s.last = s.frame;
      s.frame = [];
      s.frames++;
    }
    return clear.call(this, x, y, w, h, ...rest);
  };
  for (const name of ['fillText', 'strokeText']) {
    const original = proto[name];
    proto[name] = function (text, x, y, ...rest) {
      if (this.canvas?.id) {
        try {
          const size = parseFloat(
            String(this.font).match(/(\d+(?:\.\d+)?)px/)?.[1] || '0'
          );
          const w = this.measureText(String(text)).width;
          const h = size * 1.05;
          const x0 =
            this.textAlign === 'center'
              ? x - w / 2
              : this.textAlign === 'right' || this.textAlign === 'end'
                ? x - w
                : x;
          const y0 =
            this.textBaseline === 'top'
              ? y
              : this.textBaseline === 'middle'
                ? y - h / 2
                : this.textBaseline === 'bottom'
                  ? y - h
                  : y - h * 0.8;
          const m = this.getTransform();
          const at = (px, py) => ({
            x: m.a * px + m.c * py + m.e,
            y: m.b * px + m.d * py + m.f,
          });
          const c = [
            at(x0, y0),
            at(x0 + w, y0),
            at(x0, y0 + h),
            at(x0 + w, y0 + h),
          ];
          storeOf(this.canvas).frame.push({
            text: String(text),
            size,
            font: String(this.font),
            scale: Math.hypot(m.a, m.b),
            x0: Math.min(...c.map(p => p.x)),
            x1: Math.max(...c.map(p => p.x)),
            y0: Math.min(...c.map(p => p.y)),
            y1: Math.max(...c.map(p => p.y)),
          });
        } catch {
          /* a measurement failure must not break the drawing */
        }
      }
      return original.call(this, text, x, y, ...rest);
    };
  }
}

/**
 * Where the lesson's bound bodies are, what covers them and how much of the
 * viewport is open canvas. Runs in the page; reads the live lesson scene.
 *
 * @param {{step?: number}} [opts] - grid step in CSS pixels
 */
export async function measureLayoutInPage(opts = {}) {
  const STEP = opts.step ?? 8;
  const ls = await import('/js/lessonScene.js');
  const ui = await import('/js/ui.js');
  const canvas = document.getElementById('simulationCanvas');
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = canvas.width / canvas.clientWidth;
  const { state } = ui;
  const rect = el => {
    const b = el?.getBoundingClientRect();
    return b && b.width > 0 && b.height > 0
      ? { x: b.left, y: b.top, width: b.width, height: b.height }
      : null;
  };
  const label = el =>
    el
      ? el.id ||
        (el.getAttribute('class') || '').split(' ')[0] ||
        el.tagName.toLowerCase()
      : null;

  const rows = [];
  for (let y = STEP / 2; y < vh; y += STEP) {
    let open = 0;
    let n = 0;
    for (let x = STEP / 2; x < vw; x += STEP) {
      n++;
      if (document.elementFromPoint(x, y) === canvas) open++;
    }
    rows.push(open / n);
  }
  const cols = [];
  for (let x = STEP / 2; x < vw; x += STEP) {
    let open = 0;
    let n = 0;
    for (let y = STEP / 2; y < vh; y += STEP) {
      n++;
      if (document.elementFromPoint(x, y) === canvas) open++;
    }
    cols.push(open / n);
  }
  const run = (shares, share) => {
    let best = 0;
    let r = 0;
    for (const s of shares) {
      if (s >= share) {
        r++;
        best = Math.max(best, r);
      } else r = 0;
    }
    return best * STEP;
  };

  const bodies = [];
  for (const role of ls.boundRoles()) {
    const b = ls.roleBody(role);
    if (!b) continue;
    const sx =
      (canvas.width / 2 +
        state.pan.x +
        (b.pos.x - state.frameOffset.x) * state.zoom) /
      scale;
    const sy =
      (canvas.height / 2 +
        state.pan.y -
        (b.pos.y - state.frameOffset.y) * state.zoom) /
      scale;
    const inside = sx >= 0 && sx <= vw && sy >= 0 && sy <= vh;
    const top = inside ? document.elementFromPoint(sx, sy) : null;
    bodies.push({
      role,
      name: b.name,
      x: Math.round(sx),
      y: Math.round(sy),
      inside,
      visible: inside && top === canvas,
      coveredBy: inside && top !== canvas ? label(top) : null,
    });
  }

  const panel = rect(document.getElementById('investigationPanel'));
  const toolEl = document.getElementById('investigationTool');
  const tool = rect(toolEl);
  const toolCanvas = document.getElementById('investigationToolCanvas');
  const canvasEl = rect(toolCanvas) ? toolCanvas : toolEl;
  const ir = rect(canvasEl);
  let instrument = { visible: false, reason: 'absent' };
  if (tool && ir) {
    const inView =
      ir.x >= -1 &&
      ir.y >= -1 &&
      ir.x + ir.width <= vw + 1 &&
      ir.y + ir.height <= vh + 1;
    // Covered by a panel: the share of the instrument's box that another
    // panel's box lies over. (A hit test would not do: an instrument drawn as
    // an SVG panel with a transparent background lets the canvas show through
    // at its corners, which is not it being covered.)
    const others = [
      'investigationPanel',
      'timelineBar',
      'scenarioInfoBox',
      'overlay',
    ]
      .map(id => rect(document.getElementById(id)))
      .filter(Boolean);
    let covered = 0;
    for (const o of others) {
      const w = Math.min(ir.x + ir.width, o.x + o.width) - Math.max(ir.x, o.x);
      const h =
        Math.min(ir.y + ir.height, o.y + o.height) - Math.max(ir.y, o.y);
      if (w > 0 && h > 0)
        covered = Math.max(covered, (w * h) / (ir.width * ir.height));
    }
    instrument = {
      visible: inView && covered < 0.05,
      reason: !inView
        ? 'outside the viewport'
        : covered >= 0.05
          ? `${Math.round(covered * 100)}% of it is under another panel`
          : 'in view',
      rect: ir,
    };
  }
  const overlap = (a, b) =>
    !!a &&
    !!b &&
    Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 4 &&
    Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 4;

  return {
    vw,
    vh,
    canvasScale: scale,
    bodies,
    openRunPx: run(rows, 0.6),
    openColsPx: run(cols, 0.6),
    openAreaShare: rows.reduce((a, s) => a + s, 0) / Math.max(1, rows.length),
    panel,
    tool,
    statusCard: rect(document.getElementById('scenarioInfoBox')),
    timeline: rect(document.getElementById('timelineBar')),
    panelOverlapsTool: overlap(panel, tool),
    instrument,
  };
}

/**
 * Body labels and other text of the last complete frame, in CSS pixels, with
 * each text classed as a body label when its anchor lies within reach of a
 * body. Runs in the page, after `installCanvasTextRecorder`.
 */
export async function readMainCanvasLabels() {
  const ls = await import('/js/lessonScene.js');
  const ui = await import('/js/ui.js');
  const canvas = document.getElementById('simulationCanvas');
  const scale = canvas.width / canvas.clientWidth;
  const { state } = ui;
  const toCss = b => ({
    text: b.text,
    size: (b.size * b.scale) / scale,
    font: b.font,
    x0: b.x0 / scale,
    x1: b.x1 / scale,
    y0: b.y0 / scale,
    y1: b.y1 / scale,
  });
  const bodies = ls
    .allBodies()
    .filter(b => b && b.pos)
    .map(b => ({
      x:
        (canvas.width / 2 +
          state.pan.x +
          (b.pos.x - state.frameOffset.x) * state.zoom) /
        scale,
      y:
        (canvas.height / 2 +
          state.pan.y -
          (b.pos.y - state.frameOffset.y) * state.zoom) /
        scale,
      r: (b.radius || 0) * state.zoom,
    }));
  const frame = (window.__canvasText?.simulationCanvas?.last ?? [])
    .filter(b => b.text.trim())
    .map(toCss);
  const inView = b =>
    b.x1 >= 0 &&
    b.x0 <= canvas.clientWidth &&
    b.y1 >= 0 &&
    b.y0 <= canvas.clientHeight;
  const near = b => {
    if (/^[-+]?[\d.,]+%$/.test(b.text.trim())) return false;
    const cx = (b.x0 + b.x1) / 2;
    return bodies.some(
      p => Math.abs(cx - p.x) < 90 && b.y0 >= p.y - 6 && b.y0 <= p.y + p.r + 40
    );
  };
  const visible = frame.filter(inView);
  return {
    canvasScale: scale,
    frames: window.__canvasText?.simulationCanvas?.frames ?? 0,
    bodyLabels: visible.filter(near),
    otherText: visible.filter(b => !near(b)),
  };
}

// --- Opening a state (runs in Node, drives a Playwright page) ----------------------------

/**
 * Open a lesson at a step as a student does: write the lesson's progress with
 * the step's sid, open the lesson's link and wait until the step and its scene
 * are up. The page is left running, with the quality tier pinned to full.
 *
 * `origin` is '' under Playwright's test runner (its baseURL) and the static
 * server's origin in the tools.
 */
export async function openLessonStep(
  page,
  {
    origin = '',
    lesson,
    sid,
    language = 'en',
    theme = 'midnight',
    subject = 'scene',
  }
) {
  await page.goto(`${origin}/`, { waitUntil: 'load' });
  await page.evaluate(
    ([l, s, lang, th]) => {
      try {
        localStorage.setItem('gravitas_welcome_seen_v1', '1');
        localStorage.setItem('gravitas_locale', lang);
        localStorage.setItem('gravitas_theme', th);
        localStorage.setItem(
          `gravitas_investigation_${l}`,
          JSON.stringify({
            schema: 2,
            lesson: l,
            stepSid: s,
            responses: {},
            attempts: {},
            visited: [],
            startedAt: 1700000000000,
          })
        );
      } catch {
        /* storage unavailable: the lesson then opens at its first step */
      }
    },
    [lesson, sid, language, theme]
  );
  await page.goto(`${origin}/#investigation=${lesson}`, { waitUntil: 'load' });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.splashScreenEnded === true, null, {
    timeout: 30000,
  });
  await page.waitForFunction(
    () => document.querySelector('.inv-step-count')?.textContent?.trim(),
    null,
    { timeout: 30000 }
  );
  await page.evaluate(async () => {
    const ui = await import('/js/ui.js');
    ui.SETTINGS.quality_tier = 'full';
  });
  // Two frames: the step's scene is built on the first, drawn on the next.
  await page.evaluate(
    () =>
      new Promise(r =>
        requestAnimationFrame(() => requestAnimationFrame(() => r()))
      )
  );
  // The step's scene is bound, or its instrument is on screen, whichever the
  // step is about; the instrument is drawn a little after the step.
  for (let i = 0; i < 24; i++) {
    const ready = await page.evaluate(async subject => {
      const ls = await import('/js/lessonScene.js');
      const tool = document.getElementById('investigationTool');
      const toolOn = !!tool && tool.getBoundingClientRect().height > 0;
      return subject === 'instrument' ? toolOn : ls.boundRoles().length > 0;
    }, subject);
    if (ready) break;
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(600);
}

/** The text a canvas drew in its last complete frame, in CSS pixels, classed as tick or label. */
export function readCanvasText(id) {
  const canvas = document.getElementById(id);
  if (!canvas) return { found: false, texts: [] };
  const scale = canvas.width / canvas.clientWidth;
  const numeric = /^[-+\u2212]?[\d.,]+(e[-+\u2212]?\d+)?$/i;
  // A canvas drawn once (a plot) holds its picture in the current frame; one
  // redrawn every frame holds a whole picture in the last.
  const store = window.__canvasText?.[id] ?? { frame: [], last: [] };
  const texts = (
    store.frame.length >= store.last.length ? store.frame : store.last
  )
    .filter(b => b.text.trim())
    .map(b => ({
      text: b.text,
      size: (b.size * b.scale) / scale,
      role: numeric.test(b.text.trim()) ? 'tick' : 'label',
    }));
  return { found: true, scale, texts };
}

/** The same for an SVG plot's `text` nodes, whose font size is in viewBox units. */
export function readSvgPlotText(selector) {
  const svg = document.querySelector(selector);
  if (!svg) return { found: false, texts: [], series: [] };
  const vb = (svg.getAttribute('viewBox') || '').split(/\s+/).map(Number);
  const scale =
    vb.length === 4 && vb[2] > 0
      ? svg.getBoundingClientRect().width / vb[2]
      : 1;
  const numeric = /^[-+\u2212]?[\d.,]+(e[-+\u2212]?\d+)?$/i;
  const texts = [...svg.querySelectorAll('text')]
    .filter(t => t.textContent.trim())
    .map(t => ({
      text: t.textContent.trim(),
      size:
        parseFloat(
          t.getAttribute('font-size') || getComputedStyle(t).fontSize || '0'
        ) * scale,
      role: numeric.test(t.textContent.trim()) ? 'tick' : 'label',
    }));
  // Series: a mark that says its shape (`data-marker`: the dots' group, a line
  // series' markers, the fit line's triangles). A line that draws no markers is
  // one series with none, so a second series like it fails the judge.
  const series = [];
  for (const e of svg.querySelectorAll('[data-marker]')) {
    if (e.tagName === 'path' && !e.getAttribute('d')) continue;
    const css = getComputedStyle(e);
    const colour = [e.getAttribute('stroke'), e.getAttribute('fill')].find(
      c => c && c !== 'none'
    );
    series.push({
      colour: colour ?? (css.fill !== 'none' ? css.fill : css.stroke),
      marker: e.getAttribute('data-marker'),
      dash: e.getAttribute('stroke-dasharray') || '',
    });
  }
  return { found: true, scale, texts, series };
}

/**
 * The drawn length of the velocity arrow's shaft, in CSS pixels, for the
 * lesson's `role` body with its speed multiplied by `factor`. Draws one frame
 * with the arrow overlay on and puts everything back.
 */
export async function measureVelocityArrow({ role, factor }) {
  const ls = await import('/js/lessonScene.js');
  const ui = await import('/js/ui.js');
  const render = await import('/js/render.js');
  const canvas = document.getElementById('simulationCanvas');
  const scale = canvas.width / canvas.clientWidth;
  const body = ls.roleBody(role);
  const was = {
    vx: body.vel.x,
    vy: body.vel.y,
    on: ui.SETTINGS.show_velocity_vectors,
    sel: ui.state.selectedObject,
  };
  const proto = CanvasRenderingContext2D.prototype;
  const { moveTo, lineTo, stroke } = proto;
  const shafts = [];
  let first = null;
  let last = null;
  proto.moveTo = function (x, y) {
    first = [x, y];
    last = [x, y];
    return moveTo.call(this, x, y);
  };
  proto.lineTo = function (x, y) {
    last = [x, y];
    return lineTo.call(this, x, y);
  };
  proto.stroke = function (...a) {
    if (
      this.canvas?.id === 'simulationCanvas' &&
      String(this.strokeStyle).toLowerCase() === '#3ef2a0' &&
      first &&
      last
    )
      shafts.push(Math.hypot(last[0] - first[0], last[1] - first[1]));
    return stroke.apply(this, a);
  };
  try {
    body.vel.x *= factor;
    body.vel.y *= factor;
    ui.SETTINGS.show_velocity_vectors = true;
    ls.selectBody(body);
    render.drawScene();
  } finally {
    proto.moveTo = moveTo;
    proto.lineTo = lineTo;
    proto.stroke = stroke;
    body.vel.x = was.vx;
    body.vel.y = was.vy;
    ui.SETTINGS.show_velocity_vectors = was.on;
    ui.state.selectedObject = was.sel;
  }
  const legend = document.querySelector('.readout-legend')?.textContent ?? '';
  return {
    shaftCssPx: shafts.length ? shafts[0] / scale : null,
    drawn: shafts.length,
    legend,
  };
}

/**
 * The simulated time a trail covers at a given frame rate, from the app's own
 * planning: trail samples are taken on a fixed slice of simulated time and kept
 * for `trailSpan()` (js/trailSpan.js), whatever step the frame rate gives
 * (js/timestep.js). `samples` and `step` are reported for the message; the
 * engine-level proof at three frame rates is tests/trailSpan.test.js.
 */
export async function measureTrailSpan({ fps }) {
  const ui = await import('/js/ui.js');
  const physics = await import('/js/physics.js');
  const ts = await import('/js/timestep.js');
  const st = await import('/js/engine/state.js');
  const dtSim = ts.frameAdvance(1 / fps, ui.SETTINGS.sim_speed, physics.DT);
  const plan = ts.substepPlan(dtSim, ui.SETTINGS.max_timestep);
  return {
    fps,
    samples: st.trailBudget(),
    step: plan.step,
    substeps: plan.substeps,
    span: st.trailSpan(),
    maxTimestep: ui.SETTINGS.max_timestep,
  };
}

/**
 * Is the selected body marked on the canvas? Draws the frame twice, with the
 * body selected and not, and counts the pixels in the ring around the body
 * whose luminance moved by more than `CUE_LUMA_STEP`, so a cue that is only a
 * change of hue does not count. The vector overlay is off.
 */
export async function measureSelectionCue({ role, lumaStep }) {
  const ls = await import('/js/lessonScene.js');
  const ui = await import('/js/ui.js');
  const render = await import('/js/render.js');
  const canvas = document.getElementById('simulationCanvas');
  const ctx = canvas.getContext('2d');
  const scale = canvas.width / canvas.clientWidth;
  const body = ls.roleBody(role);
  const was = {
    sel: ui.state.selectedObject,
    v: ui.SETTINGS.show_velocity_vectors,
    a: ui.SETTINGS.show_acceleration_vectors,
  };
  ui.SETTINGS.show_velocity_vectors = false;
  ui.SETTINGS.show_acceleration_vectors = false;
  const sx =
    canvas.width / 2 +
    ui.state.pan.x +
    (body.pos.x - ui.state.frameOffset.x) * ui.state.zoom;
  const sy =
    canvas.height / 2 +
    ui.state.pan.y -
    (body.pos.y - ui.state.frameOffset.y) * ui.state.zoom;
  const reach = Math.max(8, (body.radius || 1) * ui.state.zoom + 28 * scale);
  const x0 = Math.max(0, Math.floor(sx - reach));
  const y0 = Math.max(0, Math.floor(sy - reach));
  const w = Math.min(canvas.width - x0, Math.ceil(reach * 2));
  const h = Math.min(canvas.height - y0, Math.ceil(reach * 2));
  const luma = d => 0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2];
  const grab = () => {
    render.drawScene();
    return ctx.getImageData(x0, y0, w, h).data;
  };
  try {
    ui.state.selectedObject = null;
    const a = grab();
    const a2 = grab();
    ls.selectBody(body);
    const b = grab();
    let noise = 0;
    let changed = 0;
    for (let i = 0; i < a.length; i += 4) {
      if (
        Math.abs(luma(a.subarray(i, i + 4)) - luma(a2.subarray(i, i + 4))) >
        lumaStep
      )
        noise++;
      if (
        Math.abs(luma(a.subarray(i, i + 4)) - luma(b.subarray(i, i + 4))) >
        lumaStep
      )
        changed++;
    }
    return {
      changed,
      noise,
      region: [x0, y0, w, h],
      selected: !!ui.state.selectedObject,
    };
  } finally {
    ui.state.selectedObject = was.sel;
    ui.SETTINGS.show_velocity_vectors = was.v;
    ui.SETTINGS.show_acceleration_vectors = was.a;
  }
}
