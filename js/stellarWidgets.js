// =============================================================================
// The Stellar Lab
// -----------------------------------------------------------------------------
// Three instruments over one model. The Hertzsprung-Russell diagram with a
// star preview beside it; a comparison stage for up to four pinned stars; and
// a synthetic population, shown twice.
//
// Everything they draw comes from js/stellarLab.js, which comes from
// js/stellar/, which comes from eight MIST tracks. No relation is implemented
// twice: the radius on the property card, the size of the disc in the preview
// and the position of the point on the diagram are three readings of the same
// number.
//
// The two things this file is careful about
// -----------------------------------------------------------------------------
// Temperature increases to the LEFT, and that convention lives in
// js/stellar/hr.js so that no drawing here can get it wrong on its own.
//
// A star drawn at "true relative size" is drawn at true relative size. A red
// dwarf beside a supergiant is a fraction of a pixel, and the honest response
// is a marker and a stated magnification, not a quiet enlargement that makes
// the scale a lie.
// =============================================================================

import { t } from './i18n/index.js';
import { ensureDeferredMessages } from './i18n/deferredMessages.js';

ensureDeferredMessages().catch(() => {});

import {
  surface,
  responsiveHeight,
  palette,
  MONO,
  TYPE,
  typeAt,
} from './widgetCanvas.js';
import { starColor, paintStarDisc } from './bodyVisuals.js';
// Through the seam, not the service: a widget definition is content, and the
// authoring CLI reads these modules in a plain Node process with no DOM. See
// js/widgetRuntime.js for why the direction matters.
import { captureToNotebook } from './widgetRuntime.js';
import {
  applySelection,
  nearestTrackByMass,
  pointForStar,
} from './lesson/starState.js';
import {
  AXES,
  GUIDE_RADII,
  constantRadiusLine,
  luminosityForY,
  regions as hrRegions,
  temperatureForX,
  xForTemperature,
  yForLuminosity,
} from './stellar/hr.js';
import {
  stateAtSample,
  trackBounds,
  trackIds,
  trackSamples,
} from './stellar/tracks.js';
import { countByType, fluxAt } from './stellar/population.js';
import {
  MAX_PINNED,
  MODE,
  ORBIT_REFERENCES,
  PACE,
  SIZE_MODE,
  adoptModel,
  ageForFraction,
  brightOf,
  comparison,
  createLab,
  fractionForAge,
  pin,
  pinModel,
  populationOf,
  resolveStarSpec,
  selection,
  setCursor,
  setMode,
  setPace,
  snapshotOf,
  trueScaleFor,
  unpin,
} from './stellarLab.js';

// -----------------------------------------------------------------------------
// Formatting
// -----------------------------------------------------------------------------

/** A temperature, to the precision a reader can act on. */
const kelvin = k =>
  Number.isFinite(k) ? `${Math.round(k).toLocaleString()} K` : '—';

/** A luminosity or a radius in solar units, over eleven decades. */
const solar = (v, unit) => {
  if (!Number.isFinite(v)) return '—';
  if (v >= 1000) return `${Math.round(v).toLocaleString()} ${unit}`;
  if (v >= 10) return `${v.toFixed(1)} ${unit}`;
  if (v >= 0.1) return `${v.toFixed(3)} ${unit}`;
  return `${v.toExponential(2)} ${unit}`;
};

/** An age, in the unit that reads. */
const years = y => {
  if (!Number.isFinite(y)) return '—';
  if (y >= 1e9) return `${(y / 1e9).toPrecision(3)} Gyr`;
  if (y >= 1e6) return `${(y / 1e6).toPrecision(3)} Myr`;
  if (y >= 1e3) return `${(y / 1e3).toPrecision(3)} kyr`;
  return `${Math.round(y).toLocaleString()} yr`;
};

/** A ratio, as a multiplier. */
const times = r => {
  if (!Number.isFinite(r)) return '—';
  if (r >= 1000) return `×${Math.round(r).toLocaleString()}`;
  if (r >= 10) return `×${r.toFixed(0)}`;
  return `×${r.toFixed(2)}`;
};

/** A hex string from the shared temperature-to-colour policy. */
function hexForTemperature(teffK) {
  const rgb = starColor(teffK);
  const h = n => n.toString(16).padStart(2, '0');
  return `#${h(rgb.r)}${h(rgb.g)}${h(rgb.b)}`;
}

// -----------------------------------------------------------------------------
// State, one lab per page
// -----------------------------------------------------------------------------

let lab = null;
let stampedSpec = '';

/**
 * Make sure the lab exists and carries the step's settings.
 *
 * One lab for the page, built once and never replaced. Two things follow from
 * that, and both are the point of doing it this way.
 *
 * The pinned comparison survives moving between steps. A lesson that asks a
 * student to pin the Sun on one step and a supergiant three steps later needs
 * the first one still to be there, and a lab rebuilt on every change of spec
 * would have thrown it away.
 *
 * And a step's declared settings are stamped when the step changes, not on
 * every redraw. A student who switches to the free cursor and then moves a
 * slider is not switched back: the step says where to start, not where to
 * stay. Only the population is allowed to invalidate anything, and it
 * invalidates its own cached sample rather than the lab around it.
 */
function ensureLab(spec = {}) {
  if (!lab) {
    lab = createLab({
      mode: spec.mode || MODE.MODEL,
      populationSeed: spec.populationSeed || 'stellar-population-1',
      populationCount: spec.populationCount || 400,
      guides: Boolean(spec.guides),
      regions: spec.regions !== false,
      pace: spec.pace || PACE.TIME,
    });
    if (spec.pins) seedPins(lab, spec.pins);
    stampedSpec = JSON.stringify([
      spec.mode,
      spec.guides,
      spec.regions,
      spec.populationSeed,
      spec.populationCount,
      spec.pins,
      spec.pace,
    ]);
    return lab;
  }
  const key = JSON.stringify([
    spec.mode,
    spec.guides,
    spec.regions,
    spec.populationSeed,
    spec.populationCount,
    spec.pins,
    spec.pace,
  ]);
  if (key !== stampedSpec) {
    stampedSpec = key;
    if (spec.pace && spec.pace !== lab.pace) setPace(lab, spec.pace);
    if (spec.pins) seedPins(lab, spec.pins);
    if (spec.mode && spec.mode !== lab.mode) setMode(lab, spec.mode);
    if (spec.guides !== undefined) lab.guides = Boolean(spec.guides);
    if (spec.regions !== undefined) lab.regions = spec.regions !== false;
    lab.populationSeed = spec.populationSeed || 'stellar-population-1';
    lab.populationCount = spec.populationCount || 400;
  }
  return lab;
}

/**
 * Forget the page's lab. Tests only: a page has exactly one.
 *
 * Everything module-scoped that hangs off the lab goes with it. A test that
 * reset the lab but left the comparison's seed key behind would find the next
 * step's stars silently not seeded, because the key would still match.
 */
export function resetLabForTests() {
  lab = null;
  stampedSpec = '';
  stagedPinKey = '';
  lastFocusValue = 0;
  pulledFrom = null;
  selectedPoint = null;
}

/**
 * Put the stars a step wants onto the comparison stage.
 *
 * A step that declares pins is setting up a comparison the student is about to
 * be asked about, so its list replaces whatever was there - it is the step's
 * stage, not the student's. Steps that want the student's own pins say nothing
 * and keep them, which is the ordinary case.
 *
 * The stars themselves come from `resolveStarSpec`, the same function
 * js/lessonStage.js resolves the canvas with, and each pin carries the
 * declaration's role and name. Both of those are new and both matter: this
 * used to drive the lab's own cursor to each star in turn and read the answer
 * back, which gave a *different* answer from the canvas for any declaration
 * that did not spell out an age, and gave the pin no identity beyond its
 * position in the sorted list.
 *
 * @param {object} state - The lab
 * @param {Array<object>} pins - Star declarations, or resolved staged stars
 */
function seedPins(state, pins) {
  unpin(state, true);
  for (const want of pins) {
    // A staged star arrives already resolved, with the identity the canvas
    // gave it. A declaration is resolved here, and its identity is the
    // declaration - so two steps that declare the same star pin the same
    // pinId and a capture taken under one is recognisable under the other.
    const model = want.model ?? resolveStarSpec(want);
    if (!model) continue;
    pinModel(state, model, {
      pinId: want.pinId ?? want.role ?? identityOf(want),
      name: want.name ?? null,
      bodyId: want.bodyId ?? null,
    });
  }
}

/** What the comparison last seeded itself from, so a tick does not re-seed. */
let stagedPinKey = '';

/**
 * Put the step's own staged stars on the comparison stage.
 *
 * `pinStaged` on a tool spec means "compare the stars that are standing on the
 * canvas", and the sample it reads is the one js/lessonStage.js built - the
 * same model states, the same names, the same body ids. Nothing is resolved
 * twice, so the card cannot drift from the scene.
 *
 * A list of roles instead of `true` pins a subset, which the main-sequence
 * shelf needs: eight stars stand on the canvas and only four will fit on the
 * card. The subset is still the canvas stars, named, rather than a second
 * declaration that happens to resemble them.
 *
 * @param {object} state - The lab
 * @param {object} ctx - The lesson context
 * @param {object} spec - The tool spec
 * @returns {Array<object>} The sample the card is showing
 */
function syncStagedPins(state, ctx, spec = {}) {
  if (!spec.pinStaged || typeof ctx?.stagedSample !== 'function') return [];
  const sample = ctx.stagedSample().filter(e => e.model);
  const wanted = Array.isArray(spec.pinStaged)
    ? spec.pinStaged
        .map(role => sample.find(e => e.role === role))
        .filter(Boolean)
    : sample;
  const key = `${ctx.stageKey?.() ?? ''}|${wanted.map(e => `${e.role}:${e.bodyId}`).join(',')}`;
  if (key !== stagedPinKey) {
    stagedPinKey = key;
    seedPins(state, wanted);
    // A new step's controls start from their own defaults while this module's
    // memory of where the focus control was sits at the old step's number.
    // Left alone, the first paint of the new step reads that as the reader
    // having just moved the control and selects a star nobody asked for.
    lastFocusValue = 0;
    state.focusPinId = null;
  }
  return wanted;
}

/** The `focus` value the last paint saw, so a deliberate move can be told. */
let lastFocusValue = 0;

/**
 * Which pinned star the reader is looking at.
 *
 * Two ways in, and they have to agree without fighting. Selecting a star on
 * the main canvas focuses its column here; moving the `focus` control selects
 * that star on the canvas. Whichever the reader just did is the one that wins,
 * which is why the control's previous position is remembered - without that,
 * the canvas selection would win every paint and the control could never move
 * off it.
 *
 * The control is the accessible half: a pointer is not the only way to say
 * which star you mean. It is also what makes the focus survive a change of
 * ordering, because what it sets is a pinId and not a position.
 *
 * @param {object} state - The lab
 * @param {Array<object>} rows - The ordered comparison rows
 * @param {object} v - The control values
 * @param {object} ctx - The lesson context
 * @returns {?string} The focused pinId
 */
function syncFocus(state, rows, v, ctx) {
  const n = Math.round(v?.focus ?? 0);
  if (n !== lastFocusValue) {
    lastFocusValue = n;
    const row = n > 0 ? rows[n - 1] : null;
    state.focusPinId = row?.pinId ?? null;
    // And the scene follows, so the star named on the card is the star whose
    // inspector is open and whose row the object list has highlighted.
    if (row?.bodyId !== null && row?.bodyId !== undefined) {
      ctx?.selectId?.(row.bodyId);
    }
    return state.focusPinId;
  }
  const selectedId = ctx?.selected?.id ?? null;
  if (selectedId !== null) {
    const hit = rows.find(r => r.bodyId === selectedId);
    if (hit) {
      state.focusPinId = hit.pinId;
      // Keep the control under the selection, so a reader who clicked a star
      // and then reaches for the keyboard starts from where they are.
      const at = rows.indexOf(hit) + 1;
      if (v && at !== n) {
        v.focus = at;
        lastFocusValue = at;
      }
      return hit.pinId;
    }
  }
  return state.focusPinId;
}

/** A declaration's own identity, for a pin that names no role. */
const identityOf = spec =>
  spec.track
    ? `${spec.track}@${Number.isFinite(spec.ageYr) ? `${spec.ageYr}yr` : (spec.at ?? 'ms')}`
    : `free@${spec.teffK}/${spec.lumSun}`;

/** The live lab, for tests and for a bridge. @returns {?object} state */
export const activeLab = () => lab;

/** Read the controls into the lab. */
function syncFromValues(v, spec = {}) {
  const state = ensureLab(spec);
  const ids = trackIds();
  const wanted = ids[Math.round(v.track ?? 2)] || ids[2];
  if (wanted !== state.trackId) {
    state.trackId = wanted;
    state.generation++;
  }
  if (Number.isFinite(v.age))
    state.ageFraction = Math.min(1, Math.max(0, v.age));
  if (state.mode === MODE.FREE) {
    setCursor(state, 10 ** (v.teff ?? 3.76), 10 ** (v.lum ?? 0));
  }
  return state;
}

/** Write the lab back into the controls, so the sliders follow an action. */
function syncToValues(state, v) {
  const ids = trackIds();
  v.track = Math.max(0, ids.indexOf(state.trackId));
  v.age = state.ageFraction;
  const s = selection(state);
  if (Number.isFinite(s.teffK)) {
    v.teff = Math.log10(s.teffK);
    v.lum = Math.log10(s.luminositySun);
  }
}

// -----------------------------------------------------------------------------
// Drawing: the diagram
// -----------------------------------------------------------------------------

/** A framed panel with a title in its corner. */
function frame(g, r, colors, title) {
  g.save();
  g.strokeStyle = colors.grid;
  g.lineWidth = 1;
  g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  if (title) {
    g.font = typeAt(TYPE.TICK);
    g.fillStyle = colors.muted;
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.fillText(title, r.x + 5, r.y + 4);
  }
  g.restore();
}

/** Map the plot's 0-to-1 coordinates onto a rectangle. */
const projector = plot => ({
  x: teffK => plot.x + xForTemperature(teffK) * plot.w,
  y: L => plot.y + (1 - yForLuminosity(L)) * plot.h,
});

/**
 * The Hertzsprung-Russell diagram.
 *
 * Regions first, then the guides, then the tracks, then the selection: a plot
 * is read from the background forwards and drawn in the same order.
 */
function drawDiagram(g, r, state, colors, opts = {}) {
  // The margins are sized from the type, not guessed. At nine pixels the old
  // 40/22/16 worked; at a legible eleven the exponent labels ran into the
  // rotated axis title on the left, the temperature ticks ran into the
  // "hotter / cooler" hints below, and the topmost exponent ran into the
  // panel's own heading. Eight pixels in each direction is what the extra two
  // pixels of type costs, and the plot is still the largest thing on screen.
  const padL = 48;
  const padB = 30;
  const padT = 24;
  const plot = {
    x: r.x + padL,
    y: r.y + padT,
    w: r.w - padL - 8,
    h: r.h - padT - padB,
  };
  // Where the axes ended up, for pick(): the panel's width decides the layout,
  // and a click has to be read against the same rectangle the last frame used
  // rather than one recomputed from a guess at the width.
  lastPlot = plot;
  const P = projector(plot);
  frame(g, r, colors, t('stelW.panel.hr'));

  g.save();
  g.beginPath();
  g.rect(plot.x, plot.y, plot.w, plot.h);
  g.clip();

  // Approximate regions, as soft blocks. Never labelled as boundaries.
  if (state.regions) {
    for (const region of hrRegions()) {
      g.beginPath();
      region.points.forEach((pt, i) => {
        const x = P.x(pt.teffK);
        const y = P.y(pt.luminositySun);
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      });
      g.closePath();
      g.globalAlpha = 0.1;
      g.fillStyle = colors.accent;
      g.fill();
      g.globalAlpha = 0.35;
      g.strokeStyle = colors.grid;
      g.setLineDash([3, 3]);
      g.stroke();
      g.setLineDash([]);
      g.globalAlpha = 1;
    }
  }

  // Constant-radius guides. Straight lines on these axes, which is the point.
  if (state.guides) {
    g.font = typeAt(TYPE.TICK);
    for (const radius of GUIDE_RADII) {
      const line = constantRadiusLine(radius);
      g.strokeStyle = colors.muted;
      g.globalAlpha = 0.45;
      g.setLineDash([2, 4]);
      g.beginPath();
      g.moveTo(P.x(line[0].teffK), P.y(line[0].luminositySun));
      g.lineTo(P.x(line[1].teffK), P.y(line[1].luminositySun));
      g.stroke();
      g.setLineDash([]);
      g.globalAlpha = 0.8;
      g.fillStyle = colors.muted;
      g.textAlign = 'left';
      g.textBaseline = 'bottom';
      const label = radius >= 1 ? `${radius} R☉` : `${radius} R☉`;
      g.fillText(label, plot.x + 3, P.y(line[0].luminositySun) - 2);
      g.globalAlpha = 1;
    }
  }

  // Every track, faint, with the one in hand picked out.
  for (const id of trackIds()) {
    const s = trackSamples(id);
    if (!s) continue;
    const active = state.mode === MODE.MODEL && id === state.trackId;
    g.strokeStyle = active ? colors.accent : colors.grid;
    g.globalAlpha = active ? 1 : 0.75;
    g.lineWidth = active ? 1.6 : 0.8;
    g.beginPath();
    for (let i = 0; i < s.count; i++) {
      const x = P.x(s.teffK[i]);
      const y = P.y(s.luminositySun[i]);
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
    g.globalAlpha = 1;
  }

  // Pinned stars, as rings.
  for (const p of state.pinned) {
    g.strokeStyle = colors.warn;
    g.lineWidth = 1.4;
    g.beginPath();
    g.arc(P.x(p.teffK), P.y(p.luminositySun), 5, 0, Math.PI * 2);
    g.stroke();
  }

  // The selection, in its own colour, with a crosshair so it is findable on a
  // busy plot and legible without relying on the colour.
  const sel = selection(state);
  if (Number.isFinite(sel.teffK)) {
    const x = P.x(sel.teffK);
    const y = P.y(sel.luminositySun);
    g.strokeStyle = colors.ink;
    g.globalAlpha = 0.55;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(plot.x, y);
    g.lineTo(plot.x + plot.w, y);
    g.moveTo(x, plot.y);
    g.lineTo(x, plot.y + plot.h);
    g.stroke();
    g.globalAlpha = 1;
    g.fillStyle = hexForTemperature(sel.teffK);
    g.beginPath();
    g.arc(x, y, 4.5, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = colors.ink;
    g.lineWidth = 1.2;
    g.stroke();
  }

  // The star the reader picked on the canvas, wherever the cursor happens to
  // be. Drawn as a ring rather than a filled dot so that it reads as "this one"
  // and not as a second selection: on a step in model mode the cursor may be
  // somewhere else entirely, and both are true at once.
  if (
    opts.markSelected !== false &&
    selectedPoint &&
    Number.isFinite(selectedPoint.teffK) &&
    Number.isFinite(selectedPoint.luminositySun)
  ) {
    g.save();
    g.strokeStyle = colors.good;
    g.lineWidth = 1.6;
    g.beginPath();
    g.arc(
      P.x(selectedPoint.teffK),
      P.y(selectedPoint.luminositySun),
      7,
      0,
      Math.PI * 2
    );
    g.stroke();
    g.restore();
  }

  // Nearby alternatives, where the cursor is somewhere several models pass.
  if (opts.showNearby !== false && sel.nearby?.length) {
    g.strokeStyle = colors.good;
    g.lineWidth = 1;
    for (const m of sel.nearby) {
      g.beginPath();
      g.arc(P.x(m.teffK), P.y(m.luminositySun), 3, 0, Math.PI * 2);
      g.stroke();
    }
  }
  g.restore();

  // Axes. Temperature runs the other way and the label says so.
  g.save();
  g.font = typeAt(TYPE.TICK);
  g.fillStyle = colors.muted;
  g.textAlign = 'center';
  g.textBaseline = 'top';
  for (const k of [40000, 20000, 10000, 5000, 3000]) {
    if (k < AXES.teffMinK || k > AXES.teffMaxK) continue;
    const x = P.x(k);
    g.strokeStyle = colors.grid;
    g.globalAlpha = 0.4;
    g.beginPath();
    g.moveTo(x, plot.y);
    g.lineTo(x, plot.y + plot.h);
    g.stroke();
    g.globalAlpha = 1;
    g.fillText(k >= 10000 ? `${k / 1000}k` : String(k), x, plot.y + plot.h + 3);
  }
  g.textAlign = 'right';
  g.textBaseline = 'middle';
  for (let e = -4; e <= 6; e += 2) {
    const L = 10 ** e;
    if (L < AXES.luminosityMin || L > AXES.luminosityMax) continue;
    const y = P.y(L);
    g.strokeStyle = colors.grid;
    g.globalAlpha = 0.4;
    g.beginPath();
    g.moveTo(plot.x, y);
    g.lineTo(plot.x + plot.w, y);
    g.stroke();
    g.globalAlpha = 1;
    g.fillStyle = colors.muted;
    g.fillText(`10${superscript(e)}`, plot.x - 6, y);
  }
  g.textAlign = 'left';
  g.textBaseline = 'bottom';
  g.fillText(t('stelW.axis.hotter'), plot.x + 2, r.y + r.h - 1);
  g.textAlign = 'right';
  g.fillText(t('stelW.axis.cooler'), plot.x + plot.w, r.y + r.h - 1);
  g.save();
  g.translate(r.x + 6, plot.y + plot.h / 2);
  g.rotate(-Math.PI / 2);
  g.textAlign = 'center';
  g.textBaseline = 'top';
  g.fillText(t('stelW.axis.luminosity'), 0, 0);
  g.restore();
  g.restore();
}

/** Unicode superscripts for the decade labels. */
function superscript(n) {
  const map = {
    '-': '⁻',
    0: '⁰',
    1: '¹',
    2: '²',
    3: '³',
    4: '⁴',
    5: '⁵',
    6: '⁶',
  };
  return String(n)
    .split('')
    .map(c => map[c] || c)
    .join('');
}

// -----------------------------------------------------------------------------
// Drawing: a star
// -----------------------------------------------------------------------------

/**
 * One star, at a radius in pixels, using the simulation's own painter.
 *
 * Below about a pixel the disc is replaced by a marker: a sub-pixel circle is
 * invisible, and quietly enlarging it would make a scale that says "true
 * relative sizes" into one that is not.
 *
 * @returns {boolean} Whether a disc was drawn rather than a marker
 */
function drawStar(g, cx, cy, radiusPx, teffK, colors) {
  const rgb = starColor(teffK);
  if (radiusPx >= 1.2) {
    g.save();
    g.translate(cx - radiusPx, cy - radiusPx);
    paintStarDisc(g, radiusPx * 2, rgb);
    g.restore();
    return true;
  }
  g.save();
  g.strokeStyle = colors.ink;
  g.lineWidth = 1;
  g.beginPath();
  g.arc(cx, cy, 4, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
  g.beginPath();
  g.arc(cx, cy, 1.1, 0, Math.PI * 2);
  g.fill();
  g.restore();
  return false;
}

/** The age at a slider position, under whichever pacing the lab is using. */
function sampleAgeFor(state, fraction) {
  const at = stateAtSample(state.trackId, fraction);
  return at ? at.ageYr : NaN;
}

/** The plot rectangle the H-R diagram was last drawn in. @type {?object} */
let lastPlot = null;

/**
 * Draw text broken at spaces to fit a width, and report the height it used.
 *
 * Canvas has no line breaking, and every caption here is a sentence rather
 * than a label: drawn as one line they run off the panel and across whatever
 * is beside them. Measured rather than guessed at, because the font is the
 * viewer's monospace and not necessarily the one this was written against.
 *
 * @param {CanvasRenderingContext2D} g - The context, already styled
 * @param {string} text - The caption
 * @param {number} x - Left edge, or centre when the context is centred
 * @param {number} top - Top of the first line
 * @param {number} maxWidth - The width to break to
 * @param {number} lineHeight - Baseline spacing
 * @returns {number} The height the caption occupied
 */
function wrapText(g, text, x, top, maxWidth, lineHeight) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && g.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  const base = g.textBaseline;
  g.textBaseline = 'top';
  lines.forEach((l, i) => g.fillText(l, x, top + i * lineHeight));
  g.textBaseline = base;
  return lines.length * lineHeight;
}

/**
 * The few of a list of models worth naming, chosen to show the variety.
 *
 * Taking the first few by distance would often name one mass four times - the
 * crowded parts of the diagram are crowded because one track crosses itself -
 * and the point being made is that a point on the diagram does not fix a mass.
 * So this takes one model per mass first, in distance order, and only then
 * fills the remaining slots with the next-closest whatever they are.
 *
 * @param {Array<object>} models - Candidates, already in distance order
 * @param {number} n - How many to name
 * @returns {Array<object>} At most n of them
 */
function showcase(models, n) {
  const seen = new Set();
  const first = [];
  const rest = [];
  for (const m of models) {
    if (seen.has(m.initialMassSun)) rest.push(m);
    else {
      seen.add(m.initialMassSun);
      first.push(m);
    }
  }
  return [...first, ...rest].slice(0, n);
}

/**
 * The selected star, drawn to fill its box, with the exposure stated.
 *
 * The disc is scaled to the box and the colour is the star's own. Its
 * brightness on screen is a display choice and carries no information: a star
 * a hundred thousand times fainter than the Sun is drawn just as brightly,
 * because otherwise it would be invisible. The caption says so.
 */
function drawPreview(g, r, state, colors) {
  frame(g, r, colors, t('stelW.panel.preview'));
  const sel = selection(state);
  const cx = r.x + r.w / 2;
  const inset = 5;
  const width = r.w - inset * 2;

  // The caption is measured before the disc is drawn, because how many lines
  // it takes is what is left over for the disc rather than the other way
  // round. This panel is narrow and the sentence is a sentence.
  g.save();
  g.font = typeAt(TYPE.TICK);
  const lineHeight = 11;
  const words = t('stelW.preview.exposure').split(/\s+/);
  let lines = 1;
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && g.measureText(next).width > width) {
      lines++;
      line = word;
    } else {
      line = next;
    }
  }
  const captionH = lines * lineHeight + 4;

  const top = r.y + 14;
  const cy = top + (r.h - 14 - captionH) / 2;
  const rad = Math.max(
    6,
    Math.min(width / 2 - 4, (r.h - 14 - captionH) / 2 - 4)
  );
  if (Number.isFinite(sel.teffK)) {
    drawStar(g, cx, cy, rad, sel.teffK, colors);
  }
  g.fillStyle = colors.muted;
  g.textAlign = 'center';
  wrapText(
    g,
    t('stelW.preview.exposure'),
    cx,
    r.y + r.h - captionH,
    width,
    lineHeight
  );
  g.restore();
}

// -----------------------------------------------------------------------------
// The lab widget
// -----------------------------------------------------------------------------

/** The keys the comparison stage can order by, in slider order. */
const ORDER_KEYS = ['radiusSun', 'teffK', 'luminositySun', 'massSun'];

/** Stack a set of rows into a rectangle, by weight. */
function stack(rect, weights, gap = 6) {
  const total = weights.reduce((a, b) => a + b, 0);
  const usable = rect.h - gap * (weights.length - 1);
  const out = [];
  let y = rect.y;
  for (const w of weights) {
    const h = (usable * w) / total;
    out.push({ x: rect.x, y, w: rect.w, h });
    y += h + gap;
  }
  return out;
}

const TRACK_IDS = trackIds();

// -----------------------------------------------------------------------------
// The bound star: one object, on the canvas and on the diagram
// -----------------------------------------------------------------------------
//
// A step that carries `bind: {star: ...}` and names that role in its tool spec
// is saying that the point on this diagram and a star in the scene are the
// same object. Two directions, and they are deliberately not symmetrical.
//
//   Selecting the star - by clicking it on the canvas, or from the lesson's
//   object list - moves the diagram to where that star already is. Once, on
//   the change of selection, because a reader who then drags the cursor means
//   to and should not be dragged back.
//
//   Everything else is the model writing its answer onto the star. The lab is
//   the state; the body on the canvas, the inspector card and the readout are
//   three views of it. That is why the step declares the star under
//   `prescribes`: the integrator is not also evolving it, so its temperature
//   has exactly one author.
//
// A free-cursor point is a hypothetical star, and js/lesson/starState.js keeps
// that honest. A temperature and a luminosity fix a radius; they fix nothing
// about mass, age or remaining lifetime, so none of those is written, and any
// left over from a modelled selection is taken back rather than left to be
// read as though somebody had computed it.

/** The catalogue the nearest-track lookup needs, built once. */
const TRACK_MASSES = TRACK_IDS.map(id => ({
  id,
  initialMassSun: trackBounds(id)?.initialMassSun ?? NaN,
}));

/** Which selection the lab last pulled from, so a pull happens once. */
let pulledFrom = null;

/**
 * Keep a bound star and the diagram showing the same thing.
 *
 * @param {object} state - The lab
 * @param {?object} ctx - The lesson context, when the step gave the widget one
 * @param {object} spec - The step's tool spec
 * @returns {?object} The bound body, if there is one
 */
function syncBoundStar(state, ctx, spec = {}) {
  const role = spec.bind;
  if (!role) {
    // No bound star, but the step may still have stars on the canvas - and
    // selecting one of those has to move the diagram to it. "Clicking a star
    // shows you where it is" is the one thing an H-R diagram beside a scene
    // is for, and without this the diagram sat wherever the controls had left
    // it while the reader clicked star after star in front of it.
    return followSelectedStar(state, ctx, spec);
  }
  if (typeof ctx?.role !== 'function') return null;
  const star = ctx.role(role);
  if (!star) {
    pulledFrom = null;
    return null;
  }
  const selected = ctx.selected === star;
  const key = `${star.id}`;
  if (selected && pulledFrom !== key) {
    pulledFrom = key;
    const point = pointForStar(star);
    if (point) {
      const track = nearestTrackByMass(point.initialMassSun, TRACK_MASSES);
      if (track && Number.isFinite(point.ageYr)) {
        adoptModel(state, { trackId: track, ageYr: point.ageYr });
      } else {
        // No age means no track position anybody computed, so the honest
        // answer is the free cursor at the two numbers the star does carry.
        setMode(state, MODE.FREE);
        setCursor(state, point.teffK, point.luminositySun);
      }
      return star;
    }
  }
  if (!selected) pulledFrom = null;
  // The model writes its answer onto the star, every frame and idempotently:
  // nothing is touched when the star already shows it.
  //
  // Through the stage rather than straight onto the body, because the star's
  // *drawn* size is a fourth number that has to be derived from the radius
  // and the stage's current scale. Writing the fields directly left it alone:
  // a reader dragging the cursor from the Sun to a thirty-thousand-kelvin,
  // thousand-luminosity star watched the numbers change, watched the colour
  // change, and watched a disc that stayed exactly the same size - on a
  // screen whose entire subject is that temperature and luminosity fix a
  // radius.
  const model = selection(state);
  if (typeof ctx?.restageStar === 'function') ctx.restageStar(role, model);
  else applySelection(star, model);
  return star;
}

/**
 * Move the diagram to whichever staged star the reader has selected.
 *
 * Read-only in the other direction from `syncBoundStar`: this never writes
 * back onto the star, because the star's state came from the model and the
 * reader is looking at it rather than editing it. It fires once per selection,
 * so the controls stay usable afterwards - a reader who selects a star and
 * then drags the age slider is exploring from where that star is, which is the
 * useful behaviour and not a fight with the selection.
 *
 * @param {object} state - The lab
 * @param {object} ctx - The lesson context
 * @param {object} spec - The tool spec
 * @returns {?object} The star followed, if any
 */
function followSelectedStar(state, ctx, spec = {}) {
  if (spec.followSelection === false) return null;
  const star = ctx?.selected;
  if (!star) {
    pulledFrom = null;
    selectedPoint = null;
    return null;
  }
  const point = pointForStar(star);
  selectedPoint = point;
  if (!point) return null;
  const key = `sel:${star.id}`;
  if (pulledFrom === key) return star;
  pulledFrom = key;

  // The cursor follows; the mode does not. A step puts the lab in one of its
  // two modes because its instruction depends on which - "drag the age slider
  // to the end of the track" is not an instruction you can follow with the
  // free cursor, and there is no age slider in that mode to drag. Selecting a
  // star used to switch modes underneath the reader, so clicking the
  // hypothetical white dwarf standing beside the Sun took away the control
  // the same screen had just told them to use.
  //
  // The selected star is marked on the diagram either way. Where it is is a
  // fact about the star; where the cursor is is the reader's business.
  if (state.mode === MODE.FREE) {
    setCursor(state, point.teffK, point.luminositySun);
    return star;
  }
  const track = nearestTrackByMass(point.initialMassSun, TRACK_MASSES);
  if (track && Number.isFinite(point.ageYr)) {
    adoptModel(state, { trackId: track, ageYr: point.ageYr });
  }
  // A star with no age is a point nobody modelled. In model mode there is
  // nowhere honest to put the cursor for it, so the cursor stays where it is
  // and the mark on the diagram is the whole answer.
  return star;
}

const STELLAR_LAB = {
  id: 'stellar-lab',
  // Given the lesson context, so a step that binds a star can put the same
  // object on the canvas and on the diagram. Steps that bind nothing are
  // unaffected: syncBoundStar returns immediately without a `bind` in the spec.
  live: true,
  get title() {
    return t('stelW.lab.title');
  },
  get note() {
    return t('stelW.lab.note');
  },
  animated: false,
  controls: [
    {
      id: 'track',
      get label() {
        return t('stelW.control.track');
      },
      min: 0,
      max: TRACK_IDS.length - 1,
      step: 1,
      value: 2,
      decimals: 0,
      format: v => {
        const id = TRACK_IDS[Math.round(v)];
        const s = id ? trackSamples(id) : null;
        return s ? `${s.initialMassSun} M☉` : '—';
      },
    },
    {
      id: 'age',
      get label() {
        return t('stelW.control.age');
      },
      min: 0,
      max: 1,
      step: 0.002,
      value: 0.947,
      decimals: 3,
      // Read from the lab rather than recomputed: under phase pacing the
      // handle is not a logarithmic age, and printing one here would be a
      // number that does not match the readout underneath.
      format: v =>
        lab && lab.pace === PACE.PHASE
          ? years(sampleAgeFor(lab, v))
          : years(ageForFraction(lab?.trackId ?? 'm100', v)),
    },
    {
      id: 'teff',
      get label() {
        return t('stelW.control.teff');
      },
      unit: 'K',
      min: Math.log10(AXES.teffMinK),
      max: Math.log10(AXES.teffMaxK),
      step: 0.004,
      value: Math.log10(5772),
      decimals: 3,
      format: v => kelvin(10 ** v),
    },
    {
      id: 'lum',
      get label() {
        return t('stelW.control.lum');
      },
      min: Math.log10(AXES.luminosityMin),
      max: Math.log10(AXES.luminosityMax),
      step: 0.01,
      value: 0,
      decimals: 2,
      format: v => solar(10 ** v, 'L☉'),
    },
  ],
  presets: TRACK_IDS.map((id, i) => ({
    get label() {
      const s = trackSamples(id);
      return t('stelW.preset.mass', { m: s ? s.initialMassSun : '?' });
    },
    values: { track: i, age: 0.947 },
    get note() {
      return t(`stelW.preset.note.${id}`);
    },
  })),
  actions: (spec = {}) => {
    const list = [
      {
        id: 'mode',
        get label() {
          return t('stelW.action.mode');
        },
      },
      {
        id: 'guides',
        get label() {
          return t('stelW.action.guides');
        },
      },
      {
        id: 'regions',
        get label() {
          return t('stelW.action.regions');
        },
      },
    ];
    if (spec.paceControl) {
      list.push({
        id: 'pace',
        get label() {
          return t('stelW.action.pace');
        },
      });
    }
    if (spec.compare !== false) {
      list.push({
        id: 'pin',
        get label() {
          return t('stelW.action.pin');
        },
      });
      list.push({
        id: 'unpin',
        get label() {
          return t('stelW.action.unpin');
        },
      });
    }
    list.push({
      id: 'adopt',
      get label() {
        return t('stelW.action.adopt');
      },
    });
    if (spec.capture) {
      list.push({
        id: 'capture',
        get label() {
          return t('stelW.action.capture');
        },
      });
    }
    return list;
  },

  reset(v, { spec = {} } = {}) {
    // The step's settings are stamped by ensureLab when the step changes.
    // Doing it here as well would undo the student's own toggles every time
    // they touched a slider.
    syncFromValues(v, spec);
  },

  // Arrow keys step these two, so the diagram is drivable without a mouse.
  // flipX because temperature increases to the left here: left has to mean
  // hotter for the keys as well as for the eye.
  pickAxes: { x: 'teff', y: 'lum', flipX: true },

  /**
   * Move the cursor to a point on the diagram.
   *
   * Only in free mode. In model mode the star is where the track puts it, and
   * a click that silently dragged it off the track would be the snapping this
   * lab is built not to do - so a click there is ignored and the age slider
   * stays the only way to move along a life.
   *
   * @param {Object} v - The widget's values, written in place
   * @param {{x: number, y: number, width: number, height: number}} at - Where
   *   the pointer is, in CSS pixels
   * @param {Object} spec - The step's tool spec
   * @returns {boolean} Whether anything moved
   */
  pick(v, at, spec = {}) {
    const state = ensureLab(spec);
    if (state.mode !== MODE.FREE || !lastPlot) return false;
    const fx = (at.x - lastPlot.x) / lastPlot.w;
    const fy = (at.y - lastPlot.y) / lastPlot.h;
    if (fx < -0.05 || fx > 1.05 || fy < -0.05 || fy > 1.05) return false;
    const teffK = temperatureForX(Math.min(1, Math.max(0, fx)));
    const luminositySun = luminosityForY(1 - Math.min(1, Math.max(0, fy)));
    setCursor(state, teffK, luminositySun);
    v.teff = Math.log10(state.teffK);
    v.lum = Math.log10(state.luminositySun);
    return true;
  },

  act(id, v, spec = {}) {
    const state = syncFromValues(v, spec);
    if (id === 'pace') {
      setPace(state, state.pace === PACE.PHASE ? PACE.TIME : PACE.PHASE);
      // The handle means a different thing now, so it moves to wherever the
      // star it was already showing sits under the new pacing.
      v.age = state.ageFraction;
    } else if (id === 'mode') {
      setMode(state, state.mode === MODE.FREE ? MODE.MODEL : MODE.FREE);
    } else if (id === 'guides') {
      state.guides = !state.guides;
    } else if (id === 'regions') {
      state.regions = !state.regions;
    } else if (id === 'pin') {
      pin(state);
    } else if (id === 'unpin') {
      unpin(state);
    } else if (id === 'adopt') {
      const sel = selection(state);
      if (sel.nearby?.length) adoptModel(state, sel.nearby[0]);
      else setMode(state, MODE.MODEL);
    } else if (id === 'capture') {
      captureLab(state);
    }
    syncToValues(state, v);
  },

  draw(canvas, v, ctx, spec = {}) {
    const state = syncFromValues(v, spec);
    syncBoundStar(state, ctx, spec);
    const H = responsiveHeight(340, 250);
    const { ctx: g, w } = surface(canvas, H);
    const colors = palette();
    const area = { x: 2, y: 2, w: w - 4, h: H - 4 };
    // The preview sits beside the diagram on a wide panel and under it on a
    // narrow one, so neither is squeezed to nothing on a phone.
    if (w >= 380) {
      const previewW = Math.min(120, w * 0.28);
      drawDiagram(
        g,
        { ...area, w: area.w - previewW - 6 },
        state,
        colors,
        spec
      );
      drawPreview(
        g,
        { x: area.x + area.w - previewW, y: area.y, w: previewW, h: area.h },
        state,
        colors
      );
    } else {
      const [top, bottom] = stack(area, [2.4, 1]);
      drawDiagram(g, top, state, colors, spec);
      drawPreview(g, bottom, state, colors);
    }
  },

  readout(v, ctx, spec = {}) {
    const state = syncFromValues(v, spec);
    const star = syncBoundStar(state, ctx, spec);
    const sel = selection(state);
    const rows = [];
    if (star) {
      // Named first, because the whole claim of a bound step is that this row
      // and the point on the diagram are one object.
      rows.push({
        label: t('stelW.lab.row.boundStar'),
        value: String(star.name ?? ''),
        emphasis: true,
      });
    }

    rows.push({
      label: t('stelW.row.mode'),
      value: t(`stelW.mode.${state.mode}`),
      emphasis: true,
    });
    if (!sel.inRange) {
      rows.push({
        label: t('stelW.row.outside'),
        value: t('stelW.value.outside'),
      });
    }
    rows.push({ label: t('stelW.row.teff'), value: kelvin(sel.teffK) });
    rows.push({
      label: t('stelW.row.luminosity'),
      value: solar(sel.luminositySun, 'L☉'),
    });
    rows.push({
      label: t('stelW.row.radius'),
      value: t('stelW.value.radius', { r: solar(sel.radiusSun, 'R☉') }),
    });
    rows.push({ label: t('stelW.row.spectral'), value: sel.spectralType });
    rows.push({
      label: t('stelW.row.class'),
      value: t(`stellar.class.${sel.luminosityClass}`),
    });

    if (state.mode === MODE.MODEL) {
      rows.push({
        label: t('stelW.row.mass'),
        value: t('stelW.value.mass', {
          now: solar(sel.massSun, 'M☉'),
          born: solar(sel.initialMassSun, 'M☉'),
        }),
        emphasis: true,
      });
      rows.push({ label: t('stelW.row.age'), value: years(sel.ageYr) });
      rows.push({
        label: t('stelW.row.phase'),
        value: t(`stellar.phase.${sel.phase}`),
      });
      rows.push({
        label: t('stelW.row.pace'),
        value: t(
          state.pace === PACE.PHASE
            ? 'stelW.value.pacePhase'
            : 'stelW.value.paceTime'
        ),
      });
      rows.push({
        label: t('stelW.row.mainSequence'),
        value: t('stelW.value.mainSequence', {
          total: years(sel.mainSequenceYr),
          left:
            sel.remainingMainSequenceYr > 0
              ? years(sel.remainingMainSequenceYr)
              : t('stelW.value.none'),
        }),
      });
      const b = trackBounds(state.trackId);
      if (b && !b.complete) {
        rows.push({
          label: t('stelW.row.trackEnds'),
          value: t('stelW.value.trackEnds', {
            age: years(b.endYr),
            why: t(`stelW.ends.${b.endsAtEep}`),
          }),
        });
      }
    } else {
      // Free mode. The three things a point fixes, and the one it does not.
      rows.push({
        label: t('stelW.row.hypothetical'),
        value: t('stelW.value.hypothetical'),
        emphasis: true,
      });
      rows.push({
        label: t('stelW.row.nearby'),
        value: sel.nearby.length
          ? t(
              sel.ambiguous
                ? 'stelW.value.nearbyMany'
                : 'stelW.value.nearbyOne',
              {
                n: sel.nearby.length,
                list: showcase(sel.nearby, 4)
                  .map(m =>
                    t('stelW.value.nearbyItem', {
                      m: m.initialMassSun,
                      phase: t(`stellar.phase.${m.phase}`),
                      age: years(m.ageYr),
                    })
                  )
                  .join('; '),
                more:
                  sel.nearby.length > 4
                    ? t('stelW.value.nearbyMore', { n: sel.nearby.length - 4 })
                    : '',
              }
            )
          : t('stelW.value.nearbyNone'),
      });
    }

    if (state.pinned.length) {
      rows.push({
        label: t('stelW.row.pinned'),
        value: t('stelW.value.pinned', {
          n: state.pinned.length,
          max: MAX_PINNED,
        }),
      });
    }
    if (state.guides) {
      rows.push({
        label: t('stelW.row.guides'),
        value: t('stelW.value.guides'),
      });
    }
    if (state.regions) {
      rows.push({
        label: t('stelW.row.regions'),
        value: t('stelW.value.regions'),
      });
    }
    return rows;
  },
};

/** Send the selection and the comparison to the notebook. */
/**
 * Write what the lab is showing into the notebook.
 *
 * Where the card was seeded from the step's own scene, the entry says so and
 * says how much of the scene it covers: four stars off a shelf of eight is
 * evidence about four stars, and an entry that did not carry the denominator
 * would be read as evidence about the shelf.
 *
 * @param {object} state - The lab
 * @param {object} [ctx] - The lesson context, where the widget has one
 * @param {object} [spec] - The tool spec
 */
function captureLab(state, ctx, spec = {}) {
  const snap = snapshotOf(state);
  if (spec.pinStaged) {
    snap.sampleFrom = 'scene';
    snap.sceneTotal =
      typeof ctx?.stagedSample === 'function'
        ? ctx.stagedSample().length
        : snap.pinned.length;
  }
  captureToNotebook((capture, provenance) =>
    capture.fromStellarObservation({ snapshot: snap, provenance })
  ).catch(() => {});
}

// -----------------------------------------------------------------------------
// The comparison stage
// -----------------------------------------------------------------------------

const STELLAR_COMPARE = {
  id: 'stellar-compare',
  get title() {
    return t('stelW.compare.title');
  },
  get note() {
    return t('stelW.compare.note');
  },
  animated: false,
  // Given the lesson context, because the stars on this card are the stars on
  // the canvas: the sample is read from the stage rather than resolved again,
  // and a selection made in either place shows in both.
  live: true,
  controls: [
    {
      id: 'order',
      get label() {
        return t('stelW.control.order');
      },
      min: 0,
      max: 3,
      step: 1,
      value: 0,
      decimals: 0,
      format: v =>
        t(
          `stelW.order.${['radiusSun', 'teffK', 'luminositySun', 'massSun'][Math.round(v)]}`
        ),
    },
    {
      id: 'size',
      get label() {
        return t('stelW.control.size');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(v >= 0.5 ? 'stelW.size.fit' : 'stelW.size.true'),
    },
    {
      id: 'sun',
      get label() {
        return t('stelW.control.sun');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 1,
      decimals: 0,
      format: v => t(v >= 0.5 ? 'stelW.on' : 'stelW.off'),
    },
    {
      // Which star, without a pointer. Zero is none, and the numbers count
      // the columns left to right as they are currently ordered - so the
      // reading is stable under a re-order even though the number is not,
      // because what it sets is a pinId.
      id: 'focus',
      get label() {
        return t('stelW.control.focus');
      },
      min: 0,
      max: MAX_PINNED,
      step: 1,
      value: 0,
      decimals: 0,
      format: v =>
        Math.round(v) === 0
          ? t('stelW.focus.none')
          : t('stelW.focus.nth', { n: Math.round(v) }),
    },
  ],
  actions(spec = {}) {
    const list = [
      {
        id: 'clear',
        get label() {
          return t('stelW.action.clear');
        },
      },
    ];
    if (spec.capture) {
      list.push({
        id: 'capture',
        get label() {
          return t('stelW.action.capture');
        },
      });
    }
    return list;
  },

  act(id, v, spec = {}, ctx) {
    const state = ensureLab(spec);
    syncStagedPins(state, ctx, spec);
    if (id === 'clear') {
      // A step whose stage is the canvas has no "clear": emptying the card
      // would leave it showing nothing while the stars it describes are still
      // standing there, and the next tick would put them straight back.
      if (spec.pinStaged) return;
      unpin(state, true);
    } else if (id === 'capture') captureLab(state, ctx, spec);
  },

  /**
   * Choose a star by clicking its column.
   *
   * The other half of the canvas selection: a reader who clicks the third disc
   * on the card selects the third star in the scene, which then shows its
   * inspector and its entry in the object list like any other body.
   */
  pick(v, at, spec = {}, ctx) {
    const state = ensureLab(spec);
    const wanted = syncStagedPins(state, ctx, spec);
    if (!wanted.length) return false;
    const rows = comparison(state, ORDER_KEYS[Math.round(v.order ?? 0)]);
    const withSun = v.sun >= 0.5 ? rows.length + 1 : rows.length;
    if (!withSun) return false;
    const i = Math.floor((at.x / Math.max(at.width, 1)) * withSun);
    const row = rows[i];
    // The Sun's reference disc is not one of the step's stars, so clicking it
    // selects nothing rather than selecting whatever happens to be next door.
    if (!row) return false;
    v.focus = i + 1;
    state.focusPinId = row.pinId;
    if (row.bodyId !== null) ctx?.selectId?.(row.bodyId);
    return true;
  },

  draw(canvas, v, ctx, spec = {}) {
    const state = ensureLab(spec);
    syncStagedPins(state, ctx, spec);
    state.sizeMode = v.size >= 0.5 ? SIZE_MODE.FIT : SIZE_MODE.TRUE;
    const H = responsiveHeight(280, 210);
    const { ctx: g, w } = surface(canvas, H);
    const colors = palette();
    const area = { x: 2, y: 2, w: w - 4, h: H - 4 };
    frame(g, area, colors, t('stelW.panel.compare'));

    const rows = comparison(state, ORDER_KEYS[Math.round(v.order ?? 0)]);
    const focusId = syncFocus(state, rows, v, ctx);
    const withSun =
      v.sun >= 0.5
        ? [
            ...rows,
            {
              key: 'sun',
              radiusSun: 1,
              teffK: 5772,
              luminositySun: 1,
              isSun: true,
            },
          ]
        : rows;
    if (!withSun.length) {
      g.save();
      g.font = `11px ${MONO}`;
      g.fillStyle = colors.muted;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(
        t('stelW.compare.empty'),
        area.x + area.w / 2,
        area.y + area.h / 2
      );
      g.restore();
      return;
    }

    // The sentence that used to run along the foot of this canvas is now the
    // "Sizes" row underneath it. Two reasons, and the second is the one that
    // matters: at a legible size it wrapped to two lines and ran into the
    // radius labels above it, and a caption is prose, which belongs in the
    // readout where a screen reader and a text zoom can both reach it. What
    // it cost the picture is given back to the discs.
    const labelH = 24;
    const slotW = area.w / withSun.length;
    const boxH = Math.max(40, area.h - 20 - labelH);
    const cy = area.y + 20 + boxH / 2;
    const labelTop = area.y + 20 + boxH + 2;
    const perPixel = trueScaleFor(withSun, Math.min(slotW - 14, boxH));

    withSun.forEach((star, i) => {
      const cx = area.x + slotW * (i + 0.5);
      let radiusPx;
      if (state.sizeMode === SIZE_MODE.TRUE) {
        radiusPx = star.radiusSun / perPixel;
      } else {
        radiusPx = Math.min(slotW / 2 - 8, boxH / 2 - 4);
      }
      radiusPx = Math.min(radiusPx, Math.min(slotW / 2 - 6, boxH / 2 - 2));
      const drewDisc = drawStar(g, cx, cy, radiusPx, star.teffK, colors);

      // The focused star, ringed. Drawn round the slot rather than round the
      // disc, because in true-size mode a disc can be a fraction of a pixel
      // and a ring round nothing marks nothing.
      if (!star.isSun && star.pinId && star.pinId === focusId) {
        g.save();
        g.strokeStyle = colors.good;
        g.lineWidth = 1.5;
        g.globalAlpha = 0.9;
        const pad = 4;
        g.strokeRect(
          cx - slotW / 2 + pad,
          area.y + 20 - pad,
          slotW - pad * 2,
          boxH + labelH + pad
        );
        g.restore();
      }

      g.save();
      g.font = typeAt(TYPE.TICK);
      g.fillStyle =
        !star.isSun && star.pinId === focusId ? colors.good : colors.muted;
      g.textAlign = 'center';
      g.textBaseline = 'top';
      // A step can ask for the stars to be unlabelled: the opening prediction
      // shows three of them and asks which is hottest before any number is on
      // screen to read it off.
      //
      // Otherwise the label is the star's *name* - the same name the object
      // list and the inspector use. It used to be the radius, which read as a
      // measurement and was in fact the only thing identifying the column, so
      // re-ordering the card renamed every star on it.
      g.fillText(
        star.isSun
          ? t('stelW.compare.sun')
          : spec.anonymous
            ? t('stelW.compare.anonymous', { n: i + 1 })
            : star.name || `${solar(star.radiusSun, 'R☉')}`,
        cx,
        labelTop
      );
      g.fillStyle = colors.muted;
      if (state.sizeMode === SIZE_MODE.FIT) {
        // The magnification, per star, because in this mode each one has its
        // own and the picture means nothing without them.
        g.fillText(
          t('stelW.compare.magnified', {
            n: times(radiusPx / (star.radiusSun / perPixel)),
          }),
          cx,
          labelTop + 11
        );
      } else if (!drewDisc) {
        // A slot is a quarter of a narrow canvas, so this has to be a mark
        // rather than a sentence. The sentence is in the readout.
        g.fillText(t('stelW.compare.subPixelShort'), cx, labelTop + 11);
      } else if (!spec.anonymous) {
        // The radius, on the second line, where it used to be the whole label.
        // It is a measurement about the star and not a name for it, and the
        // difference showed the moment two stars were re-ordered.
        g.fillText(`${solar(star.radiusSun, 'R☉')}`, cx, labelTop + 11);
      }
      g.restore();
    });

    // Solar System orbits, where something on screen is bigger than one.
    if (state.sizeMode === SIZE_MODE.TRUE) {
      const biggest = Math.max(...withSun.map(s => s.radiusSun || 0));
      const shown = ORBIT_REFERENCES.filter(o => o.radiusSun <= biggest * 1.4);
      g.save();
      g.font = typeAt(TYPE.TICK);
      g.setLineDash([2, 3]);
      const placed = [];
      for (const orbit of shown) {
        const px = orbit.radiusSun / perPixel;
        if (px < 6 || px > area.w) continue;
        g.strokeStyle = colors.good;
        g.globalAlpha = 0.6;
        g.beginPath();
        g.arc(area.x + area.w / 2, cy, px, 0, Math.PI * 2);
        g.stroke();
        // Each label sits on its own arc, up and to the right, so two orbits
        // whose circles are close on screen do not print over each other.
        // Anything that still lands on top of one already placed is dropped:
        // an unreadable label is worse than a circle without one.
        const lx = area.x + area.w / 2 + px * 0.7071 + 3;
        const ly = cy - px * 0.7071;
        if (
          ly < area.y + 14 ||
          placed.some(q => Math.abs(q.x - lx) < 40 && Math.abs(q.y - ly) < 10)
        ) {
          continue;
        }
        placed.push({ x: lx, y: ly });
        g.fillStyle = colors.good;
        g.globalAlpha = 0.9;
        g.textAlign = lx > area.x + area.w - 70 ? 'right' : 'left';
        g.textBaseline = 'middle';
        g.fillText(t(`stelW.orbit.${orbit.key}`), lx, ly);
      }
      g.setLineDash([]);
      g.globalAlpha = 1;
      g.restore();
    }
  },

  readout(v, ctx, spec = {}) {
    const state = ensureLab(spec);
    syncStagedPins(state, ctx, spec);
    const key = ORDER_KEYS[Math.round(v.order ?? 0)];
    const rows = comparison(state, key);
    const focusId = syncFocus(state, rows, v, ctx);
    if (!rows.length) {
      return [
        { label: t('stelW.compare.title'), value: t('stelW.compare.empty') },
      ];
    }
    const out = [
      {
        label: t('stelW.row.orderedBy'),
        value: t(`stelW.order.${key}`),
        emphasis: true,
      },
      {
        label: t('stelW.row.sizeMode'),
        value: t(
          state.sizeMode === SIZE_MODE.FIT
            ? 'stelW.size.fit.long'
            : 'stelW.size.true.long'
        ),
      },
    ];
    if (spec.anonymous) {
      // Withheld on purpose, and said once rather than once per star.
      out.push({
        label: t('stelW.row.withheld'),
        value: t('stelW.value.anonymous', { n: rows.length }),
        emphasis: true,
      });
      return out;
    }
    // Whether anything is drawn as a marker is a fact about the radii, not
    // about the canvas: on a stage a couple of hundred pixels across, a star
    // under a two-hundredth of the largest cannot reach one pixel.
    const radii = rows.map(r => r.radiusSun).filter(Number.isFinite);
    const extreme =
      radii.length > 1 && Math.min(...radii) / Math.max(...radii) < 1 / 200;
    if (state.sizeMode === SIZE_MODE.TRUE && extreme) {
      out.push({
        label: t('stelW.row.subPixel'),
        value: t('stelW.compare.subPixel'),
      });
    }
    if (spec.pinStaged) {
      // Which of the stars on the canvas are on the card. Said out loud
      // because the main-sequence shelf stands eight and compares four, and a
      // card that quietly showed half of them would be read as all of them.
      const total =
        typeof ctx?.stagedSample === 'function' ? ctx.stagedSample().length : 0;
      if (total > rows.length) {
        out.push({
          label: t('stelW.row.subset'),
          value: t('stelW.value.subset', { n: rows.length, of: total }),
        });
      }
    }
    rows.forEach((r, i) => {
      out.push({
        emphasis: r.pinId === focusId,
        // The star's own name, so a row means the same star before and after
        // a re-order. The position is still there, in front of it, because
        // the card is ordered and the reader is being asked to read an order.
        label: r.name
          ? t('stelW.row.namedStar', { n: i + 1, name: r.name })
          : t('stelW.row.star', { n: i + 1 }),
        value: t('stelW.value.star', {
          teff: kelvin(r.teffK),
          lum: solar(r.luminositySun, 'L☉'),
          radius: solar(r.radiusSun, 'R☉'),
          mass: Number.isFinite(r.massSun)
            ? solar(r.massSun, 'M☉')
            : t('stelW.value.unknownMass'),
          ratio: r.ratio === null ? '—' : times(r.ratio),
        }),
      });
    });
    return out;
  },
};

// -----------------------------------------------------------------------------
// The synthetic population
// -----------------------------------------------------------------------------

/** Where the star the reader selected sits on the diagram, if it has a place. */
let selectedPoint = null;

/** The population star the reader has selected on the canvas, by its own id. */
let populationFocus = null;

/**
 * Which population star a scene selection names.
 *
 * The stage gives a population body the role `pop-<id>`, so the star's own
 * identity comes back off the role rather than being matched by position or
 * by comparing temperatures - both of which would pick the wrong one of four
 * hundred stars sooner or later.
 *
 * @param {object} ctx - The lesson context
 * @returns {?string} The population star's id
 */
function populationIdFor(ctx) {
  const body = ctx?.selected;
  if (!body || typeof ctx.roleOf !== 'function') return null;
  const role = ctx.roleOf(body);
  return typeof role === 'string' && role.startsWith('pop-')
    ? role.slice(4)
    : null;
}

/**
 * Put the panel's cut and the scene's cut in step.
 *
 * One threshold, one distance, one definition of flux, read by both. The panel
 * used to hold the cut in `state.thresholdFlux` while the canvas held its own
 * copy in the lesson's stage declaration, and the two happened to agree at the
 * values that shipped - a flux of 1e-4 at 100 pc is a luminosity of 1 solar,
 * which is what the stage was filtering on. They would have parted company the
 * moment either was moved, which is exactly what the step invites.
 *
 * @param {object} state - The lab
 * @param {object} v - The control values
 * @param {object} ctx - The lesson context
 * @param {object} spec - The tool spec
 */
function syncPopulationScene(state, v, ctx, spec = {}) {
  state.thresholdFlux = 10 ** (v.threshold ?? -4);
  state.populationView = (v.view ?? 0) >= 0.5 ? 'bright' : 'all';
  if (spec.followScene === false) return;
  // Which of the four hundred the reader has clicked on the canvas, so the
  // plot can mark it. Matched on the star's own id, which the stage carries
  // through as the body's role - a population star keeps that id across a
  // change of threshold, so the mark survives the cut moving.
  populationFocus = populationIdFor(ctx);
  // "All" is the population with no cut applied, so the scene shows the whole
  // subsample; "bright" applies the same cut the plot is drawing.
  ctx?.restagePopulation?.({
    thresholdFlux:
      state.populationView === 'bright' ? state.thresholdFlux : null,
  });
}

/**
 * Write the population reading into the notebook.
 *
 * Four numbers, not one, because they are four different things and the whole
 * argument of these screens is the difference between them: how many stars
 * were drawn, how many of those the tracks could model, how many pass the cut,
 * and how many of the ones on the canvas are left standing.
 *
 * @param {object} state - The lab
 * @param {object} v - The control values
 * @param {object} ctx - The lesson context
 */
function capturePopulation(state, v, ctx) {
  const snap = snapshotOf(state);
  const survey = populationOf(state);
  const bright = brightOf(state);
  const scene = ctx?.population?.() ?? null;
  snap.population = {
    seed: survey.seed,
    requested: survey.requested,
    modelled: survey.stars.length,
    excludedEvolved: survey.excludedEvolved,
    excludedUnmodelled: survey.excludedUnmodelled,
    distancePc: bright.distancePc,
    thresholdFlux: bright.thresholdFlux,
    selected: bright.kept,
    view: state.populationView,
    onCanvas: scene?.shown ?? null,
    canvasSubsample: scene?.subsample ?? null,
  };
  captureToNotebook((capture, provenance) =>
    capture.fromStellarObservation({ snapshot: snap, provenance })
  ).catch(() => {});
}

const STELLAR_POPULATION = {
  id: 'stellar-population',
  get title() {
    return t('stelW.pop.title');
  },
  get note() {
    return t('stelW.pop.note');
  },
  animated: false,
  // Given the lesson context, because the threshold moves the scene as well as
  // the plot. Two views of one population is the entire claim of these three
  // screens, and until this was here only one of the two views moved.
  live: true,
  controls: [
    {
      id: 'view',
      get label() {
        return t('stelW.control.view');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(v >= 0.5 ? 'stelW.view.bright' : 'stelW.view.all'),
    },
    {
      id: 'threshold',
      get label() {
        return t('stelW.control.threshold');
      },
      min: -6,
      max: -2,
      step: 0.25,
      value: -4,
      decimals: 2,
      format: v => (10 ** v).toExponential(1),
    },
  ],
  actions(spec = {}) {
    return spec.capture
      ? [
          {
            id: 'capture',
            get label() {
              return t('stelW.action.capture');
            },
          },
        ]
      : [];
  },

  act(id, v, spec = {}, ctx) {
    const state = ensureLab(spec);
    syncPopulationScene(state, v, ctx, spec);
    if (id === 'capture') capturePopulation(state, v, ctx);
  },

  draw(canvas, v, ctx, spec = {}) {
    const state = ensureLab(spec);
    syncPopulationScene(state, v, ctx, spec);
    const H = responsiveHeight(300, 230);
    const { ctx: g, w } = surface(canvas, H);
    const colors = palette();
    const area = { x: 2, y: 2, w: w - 4, h: H - 4 };
    const [top, bottom] = stack(area, [2.4, 1]);

    const population = populationOf(state);
    const bright = brightOf(state);
    const showingBright = (v.view ?? 0) >= 0.5;

    // The scatter, on the same axes as the lab's own diagram.
    // Same margins as the main diagram, and for the same reason: the exponent
    // labels and the panel heading both need room at a legible size.
    const padL = 48;
    const plot = {
      x: top.x + padL,
      y: top.y + 22,
      w: top.w - padL - 8,
      h: top.h - 48,
    };
    frame(g, top, colors, t('stelW.panel.population'));
    const P = projector(plot);
    g.save();
    g.beginPath();
    g.rect(plot.x, plot.y, plot.w, plot.h);
    g.clip();
    for (const star of population.stars) {
      const isBright = bright.stars.includes(star);
      if (showingBright && !isBright) continue;
      const rgb = starColor(star.teffK);
      g.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
      g.globalAlpha = showingBright || isBright ? 1 : 0.55;
      g.beginPath();
      g.arc(
        P.x(star.teffK),
        P.y(star.luminositySun),
        isBright ? 2.6 : 1.7,
        0,
        Math.PI * 2
      );
      g.fill();
    }
    // The star the reader picked out of the crowd. Drawn last so nothing
    // covers it, and as a ring rather than a brighter dot: at this density a
    // dot that is merely bigger is not findable.
    const picked = populationFocus
      ? population.stars.find(x => x.id === populationFocus)
      : null;
    if (picked && !(showingBright && !bright.stars.includes(picked))) {
      g.globalAlpha = 1;
      g.strokeStyle = colors.good;
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(P.x(picked.teffK), P.y(picked.luminositySun), 5.5, 0, Math.PI * 2);
      g.stroke();
    }
    g.globalAlpha = 1;
    g.restore();

    g.save();
    g.font = typeAt(TYPE.TICK);
    g.fillStyle = colors.muted;
    g.textAlign = 'center';
    g.textBaseline = 'top';
    for (const k of [20000, 10000, 5000, 3000]) {
      g.fillText(
        k >= 10000 ? `${k / 1000}k` : String(k),
        P.x(k),
        plot.y + plot.h + 2
      );
    }
    g.textAlign = 'right';
    g.textBaseline = 'middle';
    for (let e = -4; e <= 4; e += 2) {
      g.fillText(`10${superscript(e)}`, plot.x - 6, P.y(10 ** e));
    }
    g.restore();

    // Counts by spectral type, for both views at once so the comparison is on
    // screen rather than in a reader's memory.
    frame(g, bottom, colors, t('stelW.panel.counts'));
    const all = countByType(population.stars);
    const few = countByType(bright.stars);
    const barsX = bottom.x + 8;
    const barsW = bottom.w - 16;
    const slot = barsW / all.length;
    const baseY = bottom.y + bottom.h - 14;
    const maxCount = Math.max(1, ...all.map(r => r.count));
    g.save();
    g.font = typeAt(TYPE.TICK);
    all.forEach((row, i) => {
      const x = barsX + slot * i;
      const hAll = ((bottom.h - 34) * row.count) / maxCount;
      const hFew = ((bottom.h - 34) * few[i].count) / maxCount;
      g.fillStyle = colors.grid;
      g.fillRect(x + 2, baseY - hAll, slot - 8, hAll);
      g.fillStyle = colors.accent;
      g.fillRect(x + 2, baseY - hFew, slot - 8, hFew);
      g.fillStyle = colors.muted;
      g.textAlign = 'center';
      g.textBaseline = 'top';
      g.fillText(row.type, x + (slot - 6) / 2, baseY + 2);
      g.fillStyle = colors.ink;
      g.textBaseline = 'bottom';
      g.fillText(String(row.count), x + (slot - 6) / 2, baseY - hAll - 1);
    });
    g.restore();
  },

  readout(v, ctx, spec = {}) {
    const state = ensureLab(spec);
    syncPopulationScene(state, v, ctx, spec);
    const population = populationOf(state);
    const bright = brightOf(state);
    const all = countByType(population.stars);
    const few = countByType(bright.stars);
    const rows = [
      {
        label: t('stelW.pop.row.synthetic'),
        value: t('stelW.pop.value.synthetic'),
        emphasis: true,
      },
      {
        label: t('stelW.pop.row.sample'),
        value: t('stelW.pop.value.sample', {
          n: population.stars.length,
          requested: population.requested,
          evolved: population.excludedEvolved,
          seed: population.seed,
        }),
      },
      {
        label: t('stelW.pop.row.imf'),
        value: t('stelW.pop.value.imf', { ref: population.imf.reference }),
      },
      {
        label: t('stelW.pop.row.threshold'),
        value: t('stelW.pop.value.threshold', {
          d: bright.distancePc,
          f: bright.thresholdFlux.toExponential(1),
          kept: bright.kept,
          total: bright.total,
        }),
        emphasis: true,
      },
    ];
    for (let i = 0; i < all.length; i++) {
      if (!all[i].count && !few[i].count) continue;
      rows.push({
        label: t('stelW.pop.row.type', { type: all[i].type }),
        value: t('stelW.pop.value.type', {
          all: all[i].count,
          allPct: (all[i].fraction * 100).toFixed(1),
          bright: few[i].count,
          brightPct: (few[i].fraction * 100).toFixed(1),
        }),
      });
    }
    // Four different populations, named apart. They are routinely conflated
    // and the conflation is the misconception these screens exist to break:
    // four hundred stars were drawn, fewer were modelled, fewer still pass the
    // cut, and what stands on the canvas is a bounded sample of those. A
    // reader who reads any one of those numbers as another has drawn the
    // wrong conclusion from the right picture.
    // The star the reader has picked, named and quantified. The plot rings it,
    // and this is the same fact in the accessible column - which for a
    // four-hundred-star scatter is the readable half.
    const survey2 = populationOf(state);
    const picked = populationFocus
      ? survey2.stars.find(x => x.id === populationFocus)
      : null;
    if (picked) {
      const kept =
        fluxAt(picked.luminositySun, bright.distancePc) >= bright.thresholdFlux;
      rows.push({
        label: t('stelW.pop.row.picked'),
        value: t('stelW.pop.value.picked', {
          type: picked.spectralType,
          teff: kelvin(picked.teffK),
          lum: solar(picked.luminositySun, 'L☉'),
          mass: solar(picked.massSun, 'M☉'),
          cut: t(kept ? 'stelW.pop.kept' : 'stelW.pop.cut'),
        }),
        emphasis: true,
      });
    }
    const scene = ctx?.population?.();
    if (scene) {
      rows.push({
        label: t('stelW.pop.row.onCanvas'),
        value: t('stelW.pop.value.onCanvas', {
          shown: scene.shown,
          subsample: scene.subsample,
          modelled: population.stars.length,
          requested: population.requested,
        }),
        emphasis: true,
      });
    }
    rows.push({
      label: t('stelW.pop.row.limits'),
      value: t('stelW.pop.value.limits'),
    });
    return rows;
  },
};

export const STELLAR_WIDGETS = [
  STELLAR_LAB,
  STELLAR_COMPARE,
  STELLAR_POPULATION,
];
export { fluxAt, fractionForAge };
