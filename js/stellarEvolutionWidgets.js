// =============================================================================
// Watching a star live
// -----------------------------------------------------------------------------
// The Stellar Lab's diagram, its star renderer and its comparison scale, driven
// by one age instead of by a cursor. Nothing here computes a stellar property:
// js/stellar/evolution.js owns the playhead, js/stellar/tracks.js owns the
// physics and js/stellar/endpoints.js owns what happens after the track stops.
// This file draws them.
//
// Three things it draws that are not the star
// -----------------------------------------------------------------------------
// A **cloud**, before the track begins, with no position on the diagram and no
// temperature attached to it. MIST's pre-main-sequence tracks start at an
// object that already has a photosphere; a collapsing cloud does not, and
// putting one at a precise point on an H-R diagram would be inventing numbers
// the model does not contain. It is an illustration and the panel says so.
//
// An **interior**, schematic, optional and labelled as conceptual. The bundled
// tracks are surface quantities: a temperature, a luminosity, a mass. They
// carry no radial structure at all, so the shells drawn here are a diagram of
// which process is releasing the energy, sized to be legible and to nothing
// else.
//
// A **remnant card**, once the track ends. A white dwarf keeps its place on
// the diagram because it has a photosphere and MIST followed it there. A
// neutron star and a black hole do not get one: the track ends, the marker
// stops, and what is left is described in words beside it rather than plotted
// at an invented temperature or at log(0).
//
// Determinism
// -----------------------------------------------------------------------------
// Everything drawn is a pure function of the playhead. The shells in the cloud
// and in an expelled envelope come from a seeded generator keyed on the track
// id, so they are in the same places on every run and seeking backwards
// removes them rather than leaving them behind. There are no particles with
// lives of their own anywhere in this file.
// =============================================================================

import { t } from './i18n/index.js';
import { ensureDeferredMessages } from './i18n/deferredMessages.js';
import { surface, responsiveHeight, palette, MONO } from './widgetCanvas.js';
import { starColor, paintStarDisc } from './bodyVisuals.js';
import { captureToNotebook } from './notebookBridge.js';
import { prefersReducedMotion } from './quality.js';
import { mulberry32, normalizeSeed } from './rng.js';
import {
  regions as hrRegions,
  xForTemperature,
  yForLuminosity,
} from './stellar/hr.js';
import { trackIds, trackSamples, trackBounds } from './stellar/tracks.js';
import { endpointFor, massLostOnTrack } from './stellar/endpoints.js';
import {
  PACE,
  STAGE,
  advance,
  ageAt,
  createPlayback,
  durationSummary,
  frameOf,
  phaseMarks,
  restart,
  seek,
  stageAt,
  stepPhase,
  traceTo,
  trackEndsAt,
  trackStartsAt,
} from './stellar/evolution.js';
import { spectralType } from './stellar/state.js';

const TRACK_LIST = () => trackIds();

// -----------------------------------------------------------------------------
// Formatting
// -----------------------------------------------------------------------------

const kelvin = k =>
  Number.isFinite(k) ? `${Math.round(k).toLocaleString()} K` : '—';

const solar = (v, unit) => {
  if (!Number.isFinite(v)) return '—';
  if (v === 0) return `0 ${unit}`;
  const a = Math.abs(v);
  if (a >= 1e5 || a < 1e-3) return `${v.toExponential(2)} ${unit}`;
  if (a >= 100) return `${Math.round(v).toLocaleString()} ${unit}`;
  return `${v.toPrecision(3)} ${unit}`;
};

/** Years, in the largest unit that leaves a readable number. */
function years(v) {
  if (!Number.isFinite(v)) return '—';
  if (v >= 1e12) return `${(v / 1e12).toPrecision(3)} trillion yr`;
  if (v >= 1e9) return `${(v / 1e9).toPrecision(3)} Gyr`;
  if (v >= 1e6) return `${(v / 1e6).toPrecision(3)} Myr`;
  if (v >= 1e3) return `${(v / 1e3).toPrecision(3)} kyr`;
  return `${Math.round(v)} yr`;
}

const percent = f => `${(f * 100).toPrecision(f >= 0.01 ? 3 : 2)}%`;

// -----------------------------------------------------------------------------
// State, one playback per page
// -----------------------------------------------------------------------------

let play = null;
let stampedSpec = '';
/** A second track, drawn as a ghost for comparison. */
let ghostTrackId = null;

/** Make sure the playback exists and carries the step's settings. */
function ensurePlay(spec = {}) {
  if (!play) {
    play = createPlayback({
      trackId: spec.track || 'm100',
      pace: spec.pace || PACE.PHASE,
    });
    stampedSpec = JSON.stringify([spec.track, spec.pace, spec.ghost]);
    ghostTrackId = spec.ghost || null;
    return play;
  }
  const key = JSON.stringify([spec.track, spec.pace, spec.ghost]);
  if (key !== stampedSpec) {
    stampedSpec = key;
    // Stamped when the step changes, not on every redraw: a viewer who
    // switched the pacing themselves is not switched back the moment they
    // touch the playhead.
    if (spec.track && spec.track !== play.trackId) {
      play.trackId = spec.track;
      restart(play);
    }
    if (spec.pace && spec.pace !== play.pace) setPace(play, spec.pace);
    if (spec.ghost !== undefined) ghostTrackId = spec.ghost || null;
  }
  return play;
}

/** The live playback, for tests. @returns {?object} state */
export const activePlayback = () => play;

/** Forget it. Tests only: a page has exactly one. */
export function resetPlaybackForTests() {
  play = null;
  stampedSpec = '';
  ghostTrackId = null;
}

/**
 * Change the pacing, keeping the star where it is.
 *
 * The playhead means a different thing afterwards, so it is re-derived from
 * the age rather than carried across: a viewer watching a red giant is still
 * watching that red giant.
 */
function setPace(state, pace) {
  if (pace === state.pace) return;
  const where = stageAt(state);
  const age = ageAt(state);
  state.pace = pace;
  if (where.stage === STAGE.TRACK && Number.isFinite(age)) {
    const t = trackSamples(state.trackId);
    let f = 0;
    if (t) {
      const bounds = trackBounds(state.trackId);
      if (pace === PACE.PHASE) {
        // Nearest sample by age.
        let lo = 0;
        while (lo < t.count - 1 && t.ageYr[lo + 1] <= age) lo++;
        f = t.count > 1 ? lo / (t.count - 1) : 0;
      } else {
        const a = Math.log10(Math.max(bounds.startYr, 1));
        const b = Math.log10(bounds.endYr);
        f = b > a ? (Math.log10(Math.max(age, 1)) - a) / (b - a) : 0;
      }
    }
    const start = trackStartsAt(state.trackId);
    const span = trackEndsAt(state.trackId) - start;
    seek(state, start + Math.max(0, Math.min(1, f)) * span);
  }
  state.generation++;
}

/** Read the controls into the playback. */
function syncFromValues(v, spec = {}) {
  const state = ensurePlay(spec);
  const ids = TRACK_LIST();
  const wanted = ids[Math.round(v.track ?? 2)] || ids[2];
  if (wanted !== state.trackId) {
    state.trackId = wanted;
    restart(state);
    v.position = 0;
  }
  if (Number.isFinite(v.position) && v.position !== state.position) {
    seek(state, v.position);
  }
  if (Number.isFinite(v.speed)) state.rate = 0.01 * 10 ** v.speed;
  return state;
}

// -----------------------------------------------------------------------------
// Drawing
// -----------------------------------------------------------------------------

/** A titled box. */
function frame(g, r, colors, title) {
  g.save();
  g.strokeStyle = colors.grid;
  g.globalAlpha = 0.5;
  g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  g.globalAlpha = 1;
  if (title) {
    g.font = `9px ${MONO}`;
    g.fillStyle = colors.muted;
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.fillText(title, r.x + 5, r.y + 4);
  }
  g.restore();
}

/** Text broken at spaces to fit a width. @returns {number} height used */
function wrapText(g, text, x, top, maxWidth, lineHeight, maxLines = 99) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && g.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines) break;
    } else {
      line = next;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  const base = g.textBaseline;
  g.textBaseline = 'top';
  lines.forEach((l, i) => g.fillText(l, x, top + i * lineHeight));
  g.textBaseline = base;
  return lines.length * lineHeight;
}

/** The diagram's plot rectangle and its two mappings. */
function projector(plot) {
  return {
    x: teffK => plot.x + xForTemperature(teffK) * plot.w,
    y: L => plot.y + (1 - yForLuminosity(L)) * plot.h,
  };
}

/** The H-R diagram, with the path the star has taken. */
function drawDiagram(g, r, state, colors, spec) {
  const plot = { x: r.x + 34, y: r.y + 15, w: r.w - 42, h: r.h - 37 };
  const P = projector(plot);
  frame(g, r, colors, t('stelE.panel.diagram'));

  g.save();
  g.beginPath();
  g.rect(plot.x, plot.y, plot.w, plot.h);
  g.clip();

  if (spec.regions !== false) {
    for (const region of hrRegions()) {
      g.beginPath();
      region.points.forEach((pt, i) => {
        const x = P.x(pt.teffK);
        const y = P.y(pt.luminositySun);
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      });
      g.closePath();
      g.globalAlpha = 0.08;
      g.fillStyle = colors.accent;
      g.fill();
      g.globalAlpha = 1;
    }
  }

  // The whole track, faint, so the path already walked reads against where it
  // is going rather than against nothing.
  const whole = trackSamples(state.trackId);
  if (whole) {
    g.beginPath();
    for (let i = 0; i < whole.count; i++) {
      const x = P.x(whole.teffK[i]);
      const y = P.y(whole.luminositySun[i]);
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.strokeStyle = colors.grid;
    g.globalAlpha = 0.55;
    g.lineWidth = 1;
    g.stroke();
    g.globalAlpha = 1;
  }

  // A second track, for comparison, drawn as a ghost and never as a marker:
  // it has no playhead of its own and is not where any star is now.
  if (ghostTrackId && ghostTrackId !== state.trackId) {
    const other = trackSamples(ghostTrackId);
    if (other) {
      g.beginPath();
      for (let i = 0; i < other.count; i++) {
        const x = P.x(other.teffK[i]);
        const y = P.y(other.luminositySun[i]);
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.strokeStyle = colors.warn;
      g.globalAlpha = 0.5;
      g.setLineDash([3, 3]);
      g.stroke();
      g.setLineDash([]);
      g.globalAlpha = 1;
    }
  }

  // The path so far.
  const trace = traceTo(state);
  if (trace.length > 1) {
    g.beginPath();
    trace.forEach((pt, i) => {
      const x = P.x(pt.teffK);
      const y = P.y(pt.luminositySun);
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    });
    g.strokeStyle = colors.accent;
    g.lineWidth = 2;
    g.stroke();
    g.lineWidth = 1;
  }

  // Where the star is, if it is anywhere.
  const f = frameOf(state);
  if (f.onDiagram) {
    const now = starNow(state);
    if (now) {
      const x = P.x(now.teffK);
      const y = P.y(now.luminositySun);
      g.beginPath();
      g.arc(x, y, 4, 0, Math.PI * 2);
      g.fillStyle = starColor(now.teffK);
      g.fill();
      g.strokeStyle = colors.text;
      g.globalAlpha = 0.8;
      g.stroke();
      g.globalAlpha = 1;
    }
  }
  g.restore();

  // Axes.
  g.save();
  g.font = `8px ${MONO}`;
  g.fillStyle = colors.muted;
  g.textAlign = 'center';
  g.textBaseline = 'top';
  for (const k of [40000, 20000, 10000, 5000, 3000]) {
    const x = P.x(k);
    if (x < plot.x || x > plot.x + plot.w) continue;
    g.fillText(k >= 10000 ? `${k / 1000}k` : String(k), x, plot.y + plot.h + 3);
  }
  g.textAlign = 'right';
  g.textBaseline = 'middle';
  for (let e = -4; e <= 6; e += 2) {
    const y = P.y(10 ** e);
    if (y < plot.y - 1 || y > plot.y + plot.h + 1) continue;
    g.fillText(`1e${e}`, plot.x - 4, y);
  }
  g.textAlign = 'left';
  g.textBaseline = 'bottom';
  g.fillText(t('stelE.axis.hotter'), plot.x + 2, r.y + r.h - 1);
  g.restore();
}

/** The star as it is now: from the track, or null off it. */
function starNow(state) {
  const where = stageAt(state);
  if (where.stage === STAGE.CLOUD) return null;
  const t2 = trackSamples(state.trackId);
  if (!t2) return null;
  const upTo =
    where.stage === STAGE.REMNANT
      ? 1
      : positionAlong(state, where.trackFraction);
  const exact = Math.max(0, Math.min(1, upTo)) * (t2.count - 1);
  const i = Math.min(t2.count - 2, Math.floor(exact));
  const fr = t2.count > 1 ? exact - i : 0;
  const mix = (a, b) => a + (b - a) * fr;
  return {
    teffK: mix(t2.teffK[i], t2.teffK[i + 1]),
    luminositySun: mix(t2.luminositySun[i], t2.luminositySun[i + 1]),
    radiusSun: mix(t2.radiusSun[i], t2.radiusSun[i + 1]),
    massSun: mix(t2.massSun[i], t2.massSun[i + 1]),
    phase: t2.phase[fr < 0.5 ? i : i + 1],
  };
}

/** A fraction along the track, as a fraction of its stored samples. */
function positionAlong(state, trackFraction) {
  if (state.pace === PACE.PHASE) return trackFraction;
  const bounds = trackBounds(state.trackId);
  if (!bounds) return trackFraction;
  const lo = Math.log10(Math.max(bounds.startYr, 1));
  const hi = Math.log10(bounds.endYr);
  const age = 10 ** (lo + trackFraction * (hi - lo));
  const t2 = trackSamples(state.trackId);
  let i = 0;
  while (i < t2.count - 1 && t2.ageYr[i + 1] <= age) i++;
  return t2.count > 1 ? i / (t2.count - 1) : 0;
}

/**
 * The stage panel: a cloud, a star, or a remnant card.
 *
 * One scale runs through the star's whole life, set by the largest radius the
 * track ever reaches, so a main-sequence star really is a speck beside the
 * supergiant it becomes. A star too small to draw at that scale is drawn as a
 * marker and labelled, exactly as the comparison stage does it.
 */
function drawStage(g, r, state, colors, spec) {
  const f = frameOf(state);
  frame(g, r, colors, t('stelE.panel.stage'));
  const cx = r.x + r.w / 2;
  const top = r.y + 14;
  // The caption is measured first: how many lines it takes is what is left
  // over for the picture, rather than the other way round. This panel is
  // narrow and every caption on it is a sentence.
  const layout = text => {
    const h = captionHeight(g, text, r.w - 10);
    return {
      h,
      cy: top + (r.h - 14 - h) / 2,
      room: Math.max(6, Math.min(r.w / 2 - 8, (r.h - 14 - h) / 2 - 4)),
    };
  };

  if (f.stage === STAGE.CLOUD) {
    const l = layout(t('stelE.stage.cloudCaption'));
    drawCloud(g, cx, l.cy, l.room, state, colors, f.within);
    caption(g, r, colors, t('stelE.stage.cloudCaption'), l.h);
    return;
  }
  const captionH = 26;
  const cy = top + (r.h - 14 - captionH) / 2;
  const room = Math.min(r.w / 2 - 8, (r.h - 14 - captionH) / 2 - 4);

  const now = starNow(state);
  // A white dwarf is still a star and is drawn as one; the card is for the
  // remnants that are not.
  if (f.stage === STAGE.REMNANT && !f.endpoint?.plottable) {
    drawRemnant(g, r, cx, cy, room, state, colors, f);
    return;
  }
  if (!now) return;

  const peak = peakRadius(state.trackId);
  const trueScale = peak > 0 ? room / peak : 1;
  const fitted = spec.sizeMode === 'fit';
  // Fitted draws the star at whatever size the box allows, which shows the
  // colour and the phase at every moment and says nothing about size. True
  // scale keeps one scale for the whole life, which is the only way the
  // expansion means anything - and makes a main-sequence star a speck.
  const px = fitted ? Math.max(4, room * 0.72) : now.radiusSun * trueScale;

  // Anything the star has already thrown off, drawn as bounded shells at fixed
  // seeded angles. Not particles: there is nothing to update and nothing to
  // clean up when the playhead moves backwards.
  const lost = trackSamples(state.trackId).initialMassSun - now.massSun;
  if (lost > 0.02) drawShells(g, cx, cy, room, state, colors, lost);

  if (px < 1) {
    g.save();
    g.strokeStyle = starColor(now.teffK);
    g.beginPath();
    g.arc(cx, cy, 3, 0, Math.PI * 2);
    g.stroke();
    g.restore();
  } else {
    g.save();
    g.translate(cx - px, cy - px);
    paintStarDisc(g, px * 2, hexToRgb(starColor(now.teffK)));
    g.restore();
  }

  if (spec.interior && px >= 12) drawInterior(g, cx, cy, px, now, colors);

  const text = fitted
    ? t('stelE.stage.fitCaption', {
        n: `${(px / Math.max(1e-9, now.radiusSun * trueScale)).toPrecision(2)}×`,
      })
    : px < 1
      ? t('stelE.stage.tinyCaption', { peak: solar(peak, 'R☉') })
      : t('stelE.stage.caption', {
          peak: solar(peak, 'R☉'),
          frac: `${((now.radiusSun / peak) * 100).toPrecision(2)}%`,
        });
  caption(g, r, colors, text, captionHeight(g, text, r.w - 10));
}

/** How tall a caption will be in this panel, at the caption font. */
function captionHeight(g, text, width) {
  const previous = g.font;
  g.font = `8px ${MONO}`;
  let lines = 1;
  let line = '';
  for (const word of String(text).split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && g.measureText(next).width > width) {
      lines++;
      line = word;
    } else {
      line = next;
    }
  }
  g.font = previous;
  return Math.min(lines, 5) * 9 + 3;
}

/** A caption at the foot of a panel, wrapped, never clipped. */
function caption(g, r, colors, text, height) {
  g.save();
  g.font = `8px ${MONO}`;
  g.fillStyle = colors.muted;
  g.textAlign = 'left';
  wrapText(g, text, r.x + 5, r.y + r.h - height, r.w - 10, 9, 5);
  g.restore();
}

/** The largest radius a track ever reaches, which sets the stage's scale. */
const peakCache = new Map();
function peakRadius(trackId) {
  if (peakCache.has(trackId)) return peakCache.get(trackId);
  const t2 = trackSamples(trackId);
  let peak = 0;
  if (t2)
    for (let i = 0; i < t2.count; i++) peak = Math.max(peak, t2.radiusSun[i]);
  peakCache.set(trackId, peak);
  return peak;
}

/** "#rrggbb" to the {r, g, b} the shared star painter takes. */
function hexToRgb(hex) {
  const s = String(hex).replace('#', '');
  const n = parseInt(s.length === 3 ? s.replace(/./g, c => c + c) : s, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/**
 * A collapsing cloud, before there is a star.
 *
 * Deliberately crude: a few seeded blobs contracting towards a brightening
 * centre. It carries no temperature, no radius and no age, because the model
 * behind everything else in this panel does not describe this stage at all.
 */
function drawCloud(g, cx, cy, room, state, colors, within) {
  const rand = mulberry32(normalizeSeed(`cloud:${state.trackId}`));
  const blobs = [];
  for (let i = 0; i < 14; i++) {
    blobs.push({
      a: rand() * Math.PI * 2,
      d: 0.35 + rand() * 0.65,
      s: 0.12 + rand() * 0.22,
    });
  }
  // Contract towards the centre as the stage runs. With reduced motion the
  // stage is drawn at a fixed halfway point instead of animating.
  const shrink = prefersReducedMotion() ? 0.5 : 1 - 0.75 * within;
  g.save();
  for (const b of blobs) {
    const d = room * b.d * shrink;
    const x = cx + Math.cos(b.a) * d;
    const y = cy + Math.sin(b.a) * d * 0.7;
    g.beginPath();
    g.arc(x, y, room * b.s * (0.6 + 0.4 * shrink), 0, Math.PI * 2);
    g.fillStyle = colors.muted;
    g.globalAlpha = 0.13;
    g.fill();
  }
  // A brightening centre, not yet a photosphere.
  g.globalAlpha = 0.25 + 0.55 * within;
  g.beginPath();
  g.arc(cx, cy, Math.max(2, room * 0.12 * (0.4 + within)), 0, Math.PI * 2);
  g.fillStyle = colors.warn;
  g.fill();
  g.globalAlpha = 1;
  g.restore();
}

/**
 * Shells of material the star has already lost.
 *
 * Seeded and bounded: the same shells in the same places on every run, and
 * their number does not grow with time - only their radius and how much of the
 * lost mass they represent. Nothing here creates mass; the amount comes from
 * the track's own record of what the star weighs now against what it started
 * at.
 */
function drawShells(g, cx, cy, room, state, colors, lostFraction) {
  const rand = mulberry32(normalizeSeed(`shells:${state.trackId}`));
  const n = 3;
  g.save();
  for (let i = 0; i < n; i++) {
    const phase = (i + 1) / (n + 1);
    const rr =
      room * (0.75 + 0.35 * phase) * (0.6 + 0.4 * Math.min(1, lostFraction));
    g.beginPath();
    g.ellipse(cx, cy, rr, rr * (0.8 + 0.2 * rand()), 0, 0, Math.PI * 2);
    g.strokeStyle = colors.muted;
    g.globalAlpha = 0.28 - i * 0.06;
    g.setLineDash([2, 4]);
    g.stroke();
  }
  g.setLineDash([]);
  g.globalAlpha = 1;
  g.restore();
}

/**
 * A schematic of where the energy is coming from.
 *
 * Conceptual, and labelled as conceptual wherever it is shown. The bundled
 * tracks are surface quantities and contain no radial structure whatsoever, so
 * the radii of these shells are chosen to be legible and mean nothing. What
 * they do carry is which process the track's phase says is running, which is
 * real information.
 */
function drawInterior(g, cx, cy, px, now, colors) {
  const core = Math.max(3, px * 0.22);
  const shell = Math.max(core + 3, px * 0.42);
  const burning = /main-sequence|pre-main/.test(now.phase)
    ? 'core-h'
    : /red-giant|asymptotic/.test(now.phase)
      ? 'shell-h'
      : /helium|advanced/.test(now.phase)
        ? 'core-he'
        : 'none';
  g.save();
  g.globalAlpha = 0.85;
  if (burning === 'shell-h' || burning === 'core-he') {
    g.beginPath();
    g.arc(cx, cy, shell, 0, Math.PI * 2);
    g.strokeStyle = colors.warn;
    g.setLineDash([3, 2]);
    g.lineWidth = 2;
    g.stroke();
    g.setLineDash([]);
    g.lineWidth = 1;
  }
  g.beginPath();
  g.arc(cx, cy, core, 0, Math.PI * 2);
  g.fillStyle = burning === 'none' ? colors.muted : colors.accent;
  g.globalAlpha = burning === 'none' ? 0.4 : 0.75;
  g.fill();
  g.globalAlpha = 1;
  g.restore();
}

/**
 * A bounded, seeded shell standing in for an explosion.
 *
 * Three rings at fixed radii, expanding with the remnant stage's own progress
 * and fading as they go. There is nothing to spawn and nothing to clean up, so
 * seeking backwards through this removes it completely; with reduced motion it
 * is drawn at a fixed moment instead of expanding.
 *
 * The time it takes on screen is the remnant card's time and has no relation
 * to how long a supernova lasts, how long its light is visible, or how long
 * the ejecta take to disperse. Three different durations, none of them here.
 */
function drawTransient(g, cx, cy, room, state, colors, within) {
  const rand = mulberry32(normalizeSeed(`sn:${state.trackId}`));
  const at = prefersReducedMotion() ? 0.55 : within;
  g.save();
  for (let i = 0; i < 3; i++) {
    const lead = at - i * 0.12;
    if (lead <= 0) continue;
    const rr = room * (0.35 + 1.5 * lead);
    g.beginPath();
    g.ellipse(cx, cy, rr, rr * (0.85 + 0.15 * rand()), 0, 0, Math.PI * 2);
    g.strokeStyle = colors.warn;
    g.globalAlpha = Math.max(0, 0.5 * (1 - lead)) - i * 0.08;
    g.lineWidth = 2;
    g.stroke();
  }
  g.lineWidth = 1;
  g.globalAlpha = 1;
  g.restore();
}

/**
 * The card that replaces the star once the track ends.
 *
 * A white dwarf is still drawn as a star, because it is one and MIST followed
 * it. A neutron star and a black hole are drawn as marks with their sizes
 * stated in words, because neither has a photosphere and neither belongs
 * anywhere on the diagram beside them.
 */
function drawRemnant(g, r, cx, cy, room, state, colors, f) {
  const end = f.endpoint;
  const kind = end?.kind ?? 'unfinished';
  // An explosion, only where the endpoint model says there is one, drawn as a
  // bounded seeded shell rather than as particles. It is an illustration of an
  // event, not a hydrodynamic calculation, and it is deliberately kept out of
  // the diagram beside it: a supernova's brightness is a transient and is not
  // the progenitor's photospheric track.
  if (end?.supernova === 'expected') {
    drawTransient(g, cx, cy, room, state, colors, f.within);
  }
  g.save();
  if (kind === 'black-hole') {
    g.beginPath();
    g.arc(cx, cy, Math.max(8, room * 0.35), 0, Math.PI * 2);
    g.fillStyle = '#05070c';
    g.fill();
    g.strokeStyle = colors.warn;
    g.globalAlpha = 0.7;
    g.stroke();
    g.globalAlpha = 1;
  } else if (kind === 'neutron-star') {
    g.beginPath();
    g.arc(cx, cy, 4, 0, Math.PI * 2);
    g.fillStyle = '#dfe8ff';
    g.fill();
    g.beginPath();
    g.arc(cx, cy, Math.max(9, room * 0.28), 0, Math.PI * 2);
    g.strokeStyle = '#8fa8ff';
    g.globalAlpha = 0.35;
    g.stroke();
    g.globalAlpha = 1;
  } else {
    g.beginPath();
    g.arc(cx, cy, 4, 0, Math.PI * 2);
    g.fillStyle = '#eaf2ff';
    g.fill();
  }
  g.restore();

  g.save();
  g.font = `9px ${MONO}`;
  g.fillStyle = colors.text;
  g.textAlign = 'center';
  g.textBaseline = 'top';
  // Below the halo, not across it.
  g.fillText(t(`stelE.remnant.${kind}`), cx, cy + room * 0.55 + 10);
  g.restore();
  const note = t(`stelE.remnant.${kind}.caption`);
  caption(g, r, colors, note, captionHeight(g, note, r.w - 10));
}

// -----------------------------------------------------------------------------
// The widget
// -----------------------------------------------------------------------------

const STELLAR_EVOLUTION = {
  id: 'stellar-evolution',
  get title() {
    return t('stelE.title');
  },
  get note() {
    return t('stelE.note');
  },
  animated: true,
  controls: [
    {
      id: 'track',
      get label() {
        return t('stelE.control.track');
      },
      min: 0,
      max: TRACK_LIST().length - 1,
      step: 1,
      value: 2,
      decimals: 0,
      format: v => {
        const id = TRACK_LIST()[Math.round(v)];
        const s = id ? trackSamples(id) : null;
        return s ? `${s.initialMassSun} M☉` : '—';
      },
    },
    {
      id: 'position',
      get label() {
        return t('stelE.control.position');
      },
      min: 0,
      max: 1,
      step: 0.002,
      value: 0,
      decimals: 3,
      format: v => {
        if (!play) return '—';
        const where = stageAt(play, v);
        if (where.stage === STAGE.CLOUD) return t('stelE.stage.cloud');
        if (where.stage === STAGE.REMNANT) return t('stelE.stage.remnant');
        const age = ageAt({ ...play, position: v });
        return years(age);
      },
    },
    {
      id: 'speed',
      get label() {
        return t('stelE.control.speed');
      },
      min: -0.5,
      max: 1.2,
      step: 0.1,
      value: 0.6,
      decimals: 1,
      format: v => `${(10 ** v).toPrecision(2)}×`,
    },
  ],
  presets: TRACK_LIST().map((id, i) => ({
    get label() {
      const s = trackSamples(id);
      return t('stelE.preset.mass', { m: s ? s.initialMassSun : '?' });
    },
    get note() {
      const end = endpointFor(id);
      return end ? end.note : '';
    },
    values: { track: i, position: 0 },
  })),

  actions(spec = {}) {
    const list = [
      {
        id: 'play',
        get label() {
          return t(play?.playing ? 'stelE.action.pause' : 'stelE.action.play');
        },
      },
      {
        id: 'restart',
        get label() {
          return t('stelE.action.restart');
        },
      },
      {
        id: 'prev',
        get label() {
          return t('stelE.action.prev');
        },
      },
      {
        id: 'next',
        get label() {
          return t('stelE.action.next');
        },
      },
    ];
    if (spec.paceControl !== false) {
      list.push({
        id: 'pace',
        get label() {
          return t('stelE.action.pace');
        },
      });
    }
    if (spec.interiorControl !== false) {
      list.push({
        id: 'interior',
        get label() {
          return t('stelE.action.interior');
        },
      });
    }
    list.push({
      id: 'size',
      get label() {
        return t('stelE.action.size');
      },
    });
    if (spec.compare !== false) {
      list.push({
        id: 'ghost',
        get label() {
          return t('stelE.action.ghost');
        },
      });
    }
    if (spec.capture) {
      list.push({
        id: 'capture',
        get label() {
          return t('stelE.action.capture');
        },
      });
    }
    return list;
  },

  reset(v, { autorun = false, spec = {} } = {}) {
    const state = syncFromValues(v, spec);
    // A step can ask for the playback to sit still. Reduced motion does the
    // same thing: the whole life stays reachable by the playhead and by the
    // phase buttons, and nothing moves on its own.
    state.playing = Boolean(
      autorun && spec.autoplay !== false && !prefersReducedMotion()
    );
  },

  act(id, v, spec = {}) {
    const state = syncFromValues(v, spec);
    if (id === 'play') {
      state.playing = !state.playing;
      // Pressing play at the very end restarts rather than doing nothing.
      if (state.playing && state.position >= 1) seek(state, 0);
    } else if (id === 'restart') {
      restart(state);
      v.position = 0;
    } else if (id === 'prev' || id === 'next') {
      state.playing = false;
      stepPhase(state, id === 'next' ? 1 : -1);
      v.position = state.position;
    } else if (id === 'pace') {
      setPace(state, state.pace === PACE.PHASE ? PACE.TIME : PACE.PHASE);
      v.position = state.position;
    } else if (id === 'interior') {
      spec.interior = !spec.interior;
    } else if (id === 'size') {
      spec.sizeMode = spec.sizeMode === 'fit' ? 'true' : 'fit';
    } else if (id === 'ghost') {
      // Pin the track being watched, so the next one is drawn against it.
      ghostTrackId = ghostTrackId === state.trackId ? null : state.trackId;
    } else if (id === 'capture') {
      capture(state);
    }
  },

  step(v, dt, spec = {}) {
    const state = syncFromValues(v, spec);
    if (!state.playing) return;
    advance(state, dt);
    // The playhead is a control a viewer can also drag, so it is written back
    // and the engine syncs the slider from here on every repaint.
    v.position = state.position;
  },

  draw(canvas, v, _ctx, spec = {}) {
    const state = syncFromValues(v, spec);
    const H = responsiveHeight(330, 250);
    const { ctx: g, w } = surface(canvas, H);
    const colors = palette();
    // The timeline strip gets its own band at the foot. It used to be drawn
    // over whatever the diagram had already put there, which was the axis
    // labels.
    const STRIP = 14;
    const outer = { x: 2, y: 2, w: w - 4, h: H - 4 };
    const area = { ...outer, h: outer.h - STRIP };
    if (w >= 380) {
      const stageW = Math.min(140, w * 0.34);
      drawDiagram(g, { ...area, w: area.w - stageW - 6 }, state, colors, spec);
      drawStage(
        g,
        { x: area.x + area.w - stageW, y: area.y, w: stageW, h: area.h },
        state,
        colors,
        spec
      );
    } else {
      const split = Math.round(area.h * 0.58);
      drawDiagram(g, { ...area, h: split - 3 }, state, colors, spec);
      drawStage(
        g,
        { x: area.x, y: area.y + split + 3, w: area.w, h: area.h - split - 3 },
        state,
        colors,
        spec
      );
    }
    drawTimeline(g, outer, state, colors);
  },

  readout(v, _ctx, spec = {}) {
    const state = syncFromValues(v, spec);
    const f = frameOf(state);
    const rows = [];
    const samples = trackSamples(state.trackId);

    rows.push({
      label: t('stelE.row.star'),
      value: t('stelE.value.star', { m: samples?.initialMassSun ?? '?' }),
      emphasis: true,
    });

    if (f.stage === STAGE.CLOUD) {
      rows.push({
        label: t('stelE.row.stage'),
        value: t('stelE.value.cloud'),
      });
      rows.push({
        label: t('stelE.row.noNumbers'),
        value: t('stelE.value.noNumbers'),
      });
      return rows;
    }

    const now = starNow(state);
    if (f.stage === STAGE.REMNANT && !f.endpoint?.plottable) {
      return [...rows, ...remnantRows(state, f)];
    }
    if (!now) return rows;

    rows.push({
      label: t('stelE.row.age'),
      value: years(f.ageYr),
      emphasis: true,
    });
    rows.push({
      label: t('stelE.row.phase'),
      value: t(`stellar.phase.${now.phase}`),
    });
    rows.push({ label: t('stelE.row.teff'), value: kelvin(now.teffK) });
    rows.push({
      label: t('stelE.row.luminosity'),
      value: solar(now.luminositySun, 'L☉'),
    });
    rows.push({
      label: t('stelE.row.radius'),
      value: solar(now.radiusSun, 'R☉'),
    });
    rows.push({
      label: t('stelE.row.mass'),
      value: t('stelE.value.mass', {
        now: solar(now.massSun, 'M☉'),
        born: solar(samples.initialMassSun, 'M☉'),
        lost: solar(samples.initialMassSun - now.massSun, 'M☉'),
      }),
    });
    rows.push({
      label: t('stelE.row.spectral'),
      value: spectralType(now.teffK),
    });
    if (now.phase === 'main-sequence') {
      const drift = mainSequenceDrift(state.trackId, f.ageYr);
      if (drift) {
        rows.push({
          label: t('stelE.row.drift'),
          value: t('stelE.value.drift', {
            lum: `${drift.luminosityRatio.toPrecision(3)}×`,
            teff: `${Math.round(drift.teffChangeK)} K`,
          }),
        });
      }
    }
    rows.push({
      label: t('stelE.row.sizeMode'),
      value: t(
        spec.sizeMode === 'fit'
          ? 'stelE.value.sizeFit'
          : 'stelE.value.sizeTrue',
        { peak: solar(peakRadius(state.trackId), 'R☉') }
      ),
    });

    // What the pacing is doing to the sense of time, always, not only when it
    // is the unusual setting.
    rows.push({
      label: t('stelE.row.pace'),
      value: t(
        state.pace === PACE.PHASE
          ? 'stelE.value.pacePhase'
          : 'stelE.value.paceTime'
      ),
    });
    // What this phase is, where the phase itself invites a wrong reading.
    // Only where there is something to correct: most phases get nothing.
    const NOTED = new Set([
      'pre-main-sequence',
      'main-sequence',
      'red-giant-branch',
      'post-agb-and-cooling',
    ]);
    if (NOTED.has(now.phase)) {
      rows.push({
        label: t('stelE.row.phaseNote'),
        value: t(`stelE.phaseNote.${now.phase}`),
      });
    }
    const here = durationSummary(state).find(d => d.key === now.phase);
    if (here) {
      rows.push({
        label: t('stelE.row.thisPhase'),
        value: t('stelE.value.thisPhase', {
          real: years(here.durationYr),
          life: percent(here.fractionOfLife),
          share: percent(here.shareOfPlayback),
        }),
      });
    }
    if (spec.interior) {
      rows.push({
        label: t('stelE.row.interior'),
        value: t('stelE.value.interior'),
      });
    }
    if (ghostTrackId && ghostTrackId !== state.trackId) {
      const other = trackSamples(ghostTrackId);
      rows.push({
        label: t('stelE.row.ghost'),
        value: t('stelE.value.ghost', { m: other?.initialMassSun ?? '?' }),
      });
    }
    if (f.stage === STAGE.REMNANT) rows.push(...remnantRows(state, f));
    return rows;
  },
};

/**
 * How far a star has already moved along its main sequence.
 *
 * Because "the main sequence" invites the reading that a star sits at one
 * immutable point for ten billion years, and it does not: the Sun is about
 * forty per cent brighter now than when it arrived.
 *
 * @param {string} trackId - A bundled track
 * @param {number} ageYr - Where it is now
 * @returns {?{luminosityRatio: number, teffChangeK: number}} The change since
 *   the zero-age main sequence, or null off it
 */
function mainSequenceDrift(trackId, ageYr) {
  const t2 = trackSamples(trackId);
  if (!t2 || !Number.isFinite(ageYr)) return null;
  let zams = -1;
  for (let i = 0; i < t2.count; i++) {
    if (t2.phase[i] === 'main-sequence') {
      zams = i;
      break;
    }
  }
  if (zams < 0) return null;
  let here = zams;
  while (here < t2.count - 1 && t2.ageYr[here + 1] <= ageYr) here++;
  if (here === zams) return null;
  return {
    luminosityRatio: t2.luminositySun[here] / t2.luminositySun[zams],
    teffChangeK: t2.teffK[here] - t2.teffK[zams],
  };
}

/** The rows describing what the star ended as. */
function remnantRows(state, f) {
  const end = f.endpoint;
  if (!end) return [];
  const rows = [
    {
      label: t('stelE.row.endsAs'),
      value: t(`stelE.remnant.${end.kind}`),
      emphasis: true,
    },
  ];
  // Where the number came from is as much of the answer as the number.
  rows.push({
    label: t('stelE.row.howKnown'),
    value: end.fromTrack
      ? t('stelE.value.fromTrack')
      : t('stelE.value.fromPrescription', {
          cite: end.source?.cite ?? '—',
          phase: t(`stellar.phase.${end.trackEndsAtPhase}`),
          mass: solar(end.massAtTrackEndSun, 'M☉'),
        }),
  });
  if (Number.isFinite(end.remnantMassSun)) {
    rows.push({
      label: t('stelE.row.remnantMass'),
      value: end.remnantRange
        ? t('stelE.value.remnantRange', {
            m: solar(end.remnantMassSun, 'M☉'),
            lo: end.remnantRange[0],
            hi: end.remnantRange[1],
          })
        : solar(end.remnantMassSun, 'M☉'),
    });
  } else if (end.remnantRange) {
    rows.push({
      label: t('stelE.row.remnantMass'),
      value: t('stelE.value.remnantUnknown', {
        lo: end.remnantRange[0],
        hi: end.remnantRange[1],
      }),
    });
  }
  rows.push({
    label: t('stelE.row.supernova'),
    value: t(`stelE.supernova.${end.supernova}`),
  });
  if (!end.plottable) {
    rows.push({
      label: t('stelE.row.offDiagram'),
      value: t('stelE.value.offDiagram'),
    });
  }
  if (end.supernova === 'expected') {
    rows.push({
      label: t('stelE.row.transient'),
      value: t('stelE.value.transient'),
    });
  }
  rows.push({
    label: t('stelE.row.returned'),
    value: t('stelE.value.returned', {
      mass: solar(massLostOnTrack(state.trackId), 'M☉'),
    }),
  });
  rows.push({ label: t('stelE.row.endNote'), value: end.note });
  return rows;
}

/**
 * A strip under the panel showing where the playhead is among the phases.
 *
 * Drawn to the width of the playhead, not to the width of time, and the
 * readout says which. Its point is navigation: the phase boundaries are the
 * places the previous and next buttons jump to.
 */
function drawTimeline(g, area, state, colors) {
  const y = area.y + area.h - 9;
  const x0 = area.x + 4;
  const w = area.w - 8;
  g.save();
  g.strokeStyle = colors.grid;
  g.globalAlpha = 0.6;
  g.beginPath();
  g.moveTo(x0, y);
  g.lineTo(x0 + w, y);
  g.stroke();
  g.globalAlpha = 1;
  for (const mark of phaseMarks(state)) {
    const x = x0 + w * Math.max(0, Math.min(1, mark.at));
    g.beginPath();
    g.moveTo(x, y - 3);
    g.lineTo(x, y + 3);
    g.strokeStyle = colors.muted;
    g.stroke();
  }
  const px = x0 + w * Math.max(0, Math.min(1, state.position));
  g.beginPath();
  g.arc(px, y, 3, 0, Math.PI * 2);
  g.fillStyle = colors.accent;
  g.fill();
  g.restore();
}

/** Send the current state to the notebook. */
function capture(state) {
  const f = frameOf(state);
  const now = starNow(state);
  const samples = trackSamples(state.trackId);
  captureToNotebook((cap, provenance) =>
    cap.fromStellarObservation({
      snapshot: {
        source: 'model',
        trackId: state.trackId,
        teffK: now?.teffK ?? NaN,
        luminositySun: now?.luminositySun ?? NaN,
        radiusSun: now?.radiusSun ?? NaN,
        massSun: now?.massSun ?? NaN,
        initialMassSun: samples?.initialMassSun ?? NaN,
        ageYr: f.ageYr ?? NaN,
        mainSequenceYr: NaN,
        phase: now?.phase ?? f.stage,
        grid: 'MIST v1.2, [Fe/H] = 0, no rotation',
        trackComplete: Boolean(f.endpoint?.fromTrack),
        trackEndsBecause: f.endpoint?.trackEndsAtPhase ?? '',
        sizeMode: 'true',
        pinned: [],
        ambiguous: false,
        nearbyCount: 0,
        // What the playback adds to an ordinary lab reading.
        stage: f.stage,
        pace: state.pace,
        endpointKind: f.endpoint?.kind ?? null,
        endpointFromTrack: Boolean(f.endpoint?.fromTrack),
        endpointSource: f.endpoint?.source?.cite ?? null,
      },
      provenance,
    })
  ).catch(() => {});
}

/** Every widget this module contributes. */
export const STELLAR_EVOLUTION_WIDGETS = [STELLAR_EVOLUTION];

/** Loaded with the rest of the catalogue's prose. */
ensureDeferredMessages().catch(() => {});
