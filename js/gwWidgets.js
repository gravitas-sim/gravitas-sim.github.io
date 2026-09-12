// =============================================================================
// The gravitational-wave observing lab
// -----------------------------------------------------------------------------
// Two instruments. `gw-lab` shows a modelled source: a schematic binary, an
// illustrative wave pattern, the strain a detector would record, and the
// frequency climbing towards the boundary where the model stops. `gw-real`
// shows the published GW150914 traces beside each other, unaltered.
//
// Every picture on this canvas is drawn from one timeline (js/gwLab.js holds
// it) evaluated at the moment the playhead is at. There is no second clock and
// no independent animation: the wavefronts, the orbit, the cursor on the strain
// plot and the audio are the same number read four times.
//
// What is schematic and what is not
// -----------------------------------------------------------------------------
// The strain plot and the frequency plot are the model. The source view is a
// reconstruction: the separation is Keplerian at the modelled frequency, but
// the bodies are drawn far larger than they are and the picture is not to
// scale. The wave pattern is an illustration of phase and wavelength, drawn
// from emission history rather than from the source's current phase, with the
// near field masked because a far-field formula does not apply there. Every one
// of those says so on the canvas, not only here.
//
// What is deliberately absent: the detector is never drawn beside the binary.
// A ring of test particles appears in its own inset, with the wave arriving out
// of the page, which is the only honest way to show a transverse deformation
// without implying that LIGO is parked next to two black holes.
// =============================================================================

import { t } from './i18n/index.js';
import { ensureDeferredMessages } from './i18n/deferredMessages.js';

ensureDeferredMessages().catch(() => {});

import {
  surface,
  responsiveHeight,
  palette,
  TYPE,
  typeAt,
} from './widgetCanvas.js';
import { prefersReducedMotion, currentTier } from './quality.js';
import {
  PRESETS,
  LIMITS,
  createLab,
  rebuild,
  advance,
  seekFraction,
  cursorFraction,
  replay,
  pin,
  unpin,
  comparison,
  newNoiseRealization,
  observedAt,
  noiseAt,
  signatureOf,
  snapshotOf,
  audioPlanFor,
  referenceStrainFor,
} from './gwLab.js';
import { TRACES, PROVENANCE, decodeTrace } from './data/gw/gw150914.js';
import { sampledTimeline } from './gw/timeline.js';
import { similarity as overlapOf, sampleOnto } from './gw/match.js';
// Through the seam, not the service: a widget definition is content, and the
// authoring CLI reads these modules in a plain Node process with no DOM. See
// js/widgetRuntime.js for why the direction matters.
import { captureToNotebook } from './widgetRuntime.js';
import {
  crestsFor,
  emissionTimes,
  illustrativeSpeed,
} from './lesson/gwWavefronts.js';
import {
  playSignal,
  stopSignal,
  signalIsPlaying as isPlaying,
  signalMapping as currentMapping,
  signalOwner,
  stopSignalIfOwner,
} from './widgetRuntime.js';

/**
 * A token naming exactly what a playback describes.
 *
 * The lab's own signature covers the model and its parameters; the step id is
 * added because the same signal in a different step is a different reading,
 * and closing the lesson has to release both. Everything the lab starts is
 * under one prefix so that a scope can be dropped in one call.
 *
 * @param {object} state - The lab
 * @param {object} spec - The step's tool spec
 * @returns {string} An owner token
 */
const audioOwnerFor = (state, spec = {}) =>
  `gw-lab:${spec.stepId ?? spec.preset ?? 'free'}:${state.signature}`;

/**
 * Whether this step is a controlled comparison being listened to.
 *
 * Two listening modes, and they answer different questions. **Comparison**
 * holds one reference amplitude fixed so that changing a parameter changes the
 * loudness in proportion to the strain - that is the mode a distance
 * comparison needs, and it is the default. **Peak-normalised** brings every
 * signal to full scale, which is the right choice when the question is what a
 * waveform sounds like rather than how loud it is, and a step asks for it
 * explicitly.
 *
 * @param {object} spec - The step's tool spec
 * @returns {boolean} True for the fixed-reference mode
 */
const comparisonListening = (spec = {}) => spec.listen !== 'peak';

/**
 * The strain that maps to full scale.
 *
 * @param {object} spec - The step's tool spec
 * @returns {number} A strain
 */
function audioReferenceFor(spec = {}) {
  if (Number.isFinite(spec.referenceStrain) && spec.referenceStrain > 0) {
    return spec.referenceStrain;
  }
  return referenceStrainFor(spec.preset || 'bbh');
}

/** How many wavefront rings the overlay may draw. Bounded, deliberately. */
const MAX_RINGS = 26;

/** Test particles around the polarization ring. */
const RING_PARTICLES = 16;

/**
 * How many wavefronts the radius holds at the frequency being emitted now.
 *
 * This sets the illustration's propagation speed, and it is a display choice
 * rather than a physical one. A binary neutron star sweeps from 60 Hz to
 * 1570 Hz inside one window; no single fixed speed draws both ends of that -
 * either the early wavelengths are wider than the picture or the late ones are
 * finer than a pixel. So the speed is recomputed from the frequency at the
 * playhead, which keeps the pattern legible throughout, and the legend says
 * that the propagation is both slowed and rescaled.
 *
 * What the rescaling does not touch is the thing worth seeing: within any one
 * frame the crests are still placed by emission history, so the ones further
 * out are still the ones emitted when the binary was turning more slowly, and
 * they are still further apart for exactly that reason.
 */
const RINGS_ACROSS_RADIUS = 9;

// -----------------------------------------------------------------------------
// Formatting
// -----------------------------------------------------------------------------

/** A strain, in the units the axis is labelled in. */
const strainText = h =>
  Number.isFinite(h) ? `${(h * 1e21).toFixed(2)} ×10⁻²¹` : '—';

/** A frequency, to a sensible number of digits for its size. */
const hz = f => {
  if (!Number.isFinite(f)) return '—';
  if (f >= 1000) return `${(f / 1000).toFixed(2)} kHz`;
  if (f >= 100) return `${f.toFixed(0)} Hz`;
  return `${f.toFixed(1)} Hz`;
};

/** A duration, in the unit that reads best. */
const secs = s => {
  if (!Number.isFinite(s)) return '—';
  const a = Math.abs(s);
  if (a >= 100) return `${s.toFixed(0)} s`;
  if (a >= 1) return `${s.toFixed(2)} s`;
  return `${(s * 1000).toFixed(0)} ms`;
};

// -----------------------------------------------------------------------------
// The lab's state, one per page
// -----------------------------------------------------------------------------

let lab = null;
/** Which lesson step's spec built the current lab, so a step change rebuilds. */
let labSpecKey = '';
/** Set by the audio bridge so the readout can say what is playing. */
let audioNote = null;

/** @param {object} note - {textKey, vars} or null */
export function setAudioNote(note) {
  audioNote = note;
}

/** The live lab, for the audio bridge and for tests. @returns {?object} state */
export const activeLab = () => lab;

const paramsFromValues = (v, spec = {}) => ({
  m1: v.m1,
  m2: v.m2,
  distanceMpc: v.distance,
  inclinationDeg: v.inclination,
  windowSeconds:
    spec.windowSeconds ?? presetById(spec.preset)?.windowSeconds ?? 1.2,
});

const presetById = id => PRESETS.find(p => p.id === id) || null;

/**
 * Make sure the lab exists and matches the controls.
 * @param {object} v - Control values
 * @param {object} spec - The step's tool spec
 * @returns {object} The lab state
 */
function ensureLab(v, spec = {}) {
  const key = `${spec.preset || ''}|${spec.windowSeconds || ''}|${spec.noiseSeed || ''}`;
  if (!lab || labSpecKey !== key) {
    lab = createLab({
      params: paramsFromValues(v, spec),
      noiseSeed: spec.noiseSeed || 'gw-lab-1',
      noiseOn: Boolean(spec.noise),
    });
    labSpecKey = key;
  }
  const wanted = paramsFromValues(v, spec);
  if (signatureOf(wanted) !== lab.signature) {
    lab.params = wanted;
    rebuild(lab);
  }
  return lab;
}

// -----------------------------------------------------------------------------
// Drawing
// -----------------------------------------------------------------------------

/**
 * Draw text into a width, wrapping at spaces, and say how tall it came out.
 *
 * The captions on this canvas are the part that must not be dropped - they are
 * what says the picture is schematic - so they wrap rather than being clipped
 * or shortened to the point of meaning nothing.
 *
 * @param {CanvasRenderingContext2D} g - Target
 * @param {string} text - The caption
 * @param {number} x - Left edge
 * @param {number} y - Top edge
 * @param {number} maxWidth - Wrap here
 * @param {number} lineHeight - Pixels per line
 * @param {number} [maxLines] - Stop after this many, with an ellipsis
 * @returns {number} Height used, in pixels
 */
function wrapText(g, text, x, y, maxWidth, lineHeight, maxLines = 4) {
  const words = String(text).split(/\s+/);
  let line = '';
  let lines = 0;
  let cursor = y;
  const flush = value => {
    g.fillText(value, x, cursor);
    cursor += lineHeight;
    lines++;
  };
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (g.measureText(next).width > maxWidth && line) {
      if (lines + 1 >= maxLines) {
        flush(`${line}…`);
        return cursor - y;
      }
      flush(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) flush(line);
  return cursor - y;
}

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

/**
 * The strain trace across the whole modelled span, with the playhead.
 *
 * Drawn from the timeline's envelope, which resolves a bucket analytically when
 * a whole cycle falls inside it. That is what lets a 780-cycle excerpt be drawn
 * into three hundred pixels without either aliasing into a moire pattern or
 * costing a hundred thousand evaluations.
 */
function drawStrainFull(g, r, state, colors, opts = {}) {
  const tl = state.timeline;
  const padL = 34;
  const padB = 14;
  const padT = 14;
  const plot = {
    x: r.x + padL,
    y: r.y + padT,
    w: r.w - padL - 6,
    h: r.h - padT - padB,
  };
  frame(g, r, colors, t('gwW.panel.strain'));

  const buckets = Math.max(24, Math.floor(plot.w));
  const env = tl.envelope(tl.tStart, tl.tEnd, buckets);
  let peak = 0;
  for (let i = 0; i < buckets; i++) {
    if (Number.isFinite(env.max[i]))
      peak = Math.max(peak, Math.abs(env.max[i]));
    if (Number.isFinite(env.min[i]))
      peak = Math.max(peak, Math.abs(env.min[i]));
  }
  // A fixed scale when the caller pins one, so that two distances can be
  // compared on one axis. Step 15 of the lesson depends on this.
  const scale = opts.fixedPeak || peak || 1;
  const mid = plot.y + plot.h / 2;
  const toY = h => mid - (h / scale) * (plot.h / 2) * 0.92;

  g.save();
  g.strokeStyle = colors.grid;
  g.setLineDash([2, 3]);
  g.beginPath();
  g.moveTo(plot.x, mid);
  g.lineTo(plot.x + plot.w, mid);
  g.stroke();
  g.setLineDash([]);

  // The noise first, behind, so the signal reads on top of it.
  if (state.noiseOn) {
    g.strokeStyle = colors.muted;
    g.globalAlpha = 0.5;
    g.beginPath();
    for (let i = 0; i < buckets; i++) {
      const time = tl.tStart + ((i + 0.5) / buckets) * tl.duration;
      const v = observedAt(state, time);
      const x = plot.x + (i / buckets) * plot.w;
      if (i === 0) g.moveTo(x, toY(v));
      else g.lineTo(x, toY(v));
    }
    g.stroke();
    g.globalAlpha = 1;
  }

  g.strokeStyle = colors.accent;
  g.lineWidth = 1;
  g.beginPath();
  for (let i = 0; i < buckets; i++) {
    const x = plot.x + (i / buckets) * plot.w;
    if (!Number.isFinite(env.max[i])) continue;
    g.moveTo(x, toY(env.max[i]));
    g.lineTo(x, toY(env.min[i]));
  }
  g.stroke();

  // The pinned comparison, drawn under the same scale.
  if (state.pinned && opts.showPinned !== false) {
    const pe = state.pinned.timeline.envelope(
      state.pinned.timeline.tStart,
      state.pinned.timeline.tEnd,
      buckets
    );
    g.strokeStyle = colors.warn;
    g.globalAlpha = 0.75;
    g.beginPath();
    for (let i = 0; i < buckets; i++) {
      if (!Number.isFinite(pe.max[i])) continue;
      const x = plot.x + (i / buckets) * plot.w;
      g.moveTo(x, toY(pe.max[i]));
      g.lineTo(x, toY(pe.min[i]));
    }
    g.stroke();
    g.globalAlpha = 1;
  }

  // Playhead.
  const cx = plot.x + cursorFraction(state) * plot.w;
  g.strokeStyle = colors.ink;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(cx, plot.y);
  g.lineTo(cx, plot.y + plot.h);
  g.stroke();

  g.font = typeAt(TYPE.TICK);
  g.fillStyle = colors.muted;
  g.textAlign = 'right';
  g.textBaseline = 'middle';
  g.fillText(`${(scale * 1e21).toFixed(1)}`, plot.x - 4, plot.y + 4);
  g.fillText('0', plot.x - 4, mid);
  g.fillText(`-${(scale * 1e21).toFixed(1)}`, plot.x - 4, plot.y + plot.h - 4);
  g.save();
  g.translate(r.x + 9, mid);
  g.rotate(-Math.PI / 2);
  g.textAlign = 'center';
  g.fillText(t('gwW.axis.strain'), 0, 0);
  g.restore();
  g.textAlign = 'left';
  g.textBaseline = 'bottom';
  g.fillText(secs(tl.tStart), plot.x, r.y + r.h - 3);
  g.textAlign = 'right';
  g.fillText(t('gwW.axis.merger'), plot.x + plot.w, r.y + r.h - 3);
  g.restore();
}

/**
 * A short window around the playhead, with individual cycles resolved.
 *
 * This is the view a student counts cycles in, and the only one in which added
 * noise means anything: at full span the noise is a grey band.
 */
function drawStrainLocal(g, r, state, colors) {
  const tl = state.timeline;
  frame(g, r, colors, t('gwW.panel.local'));
  const f = tl.frequencyAtTime(state.cursorT) || 40;
  const span = Math.min(tl.duration, Math.max(6 / f, tl.duration / 40));
  const half = span / 2;
  let a = state.cursorT - half;
  let b = state.cursorT + half;
  if (a < tl.tStart) {
    b += tl.tStart - a;
    a = tl.tStart;
  }
  if (b > tl.tEnd) {
    a -= b - tl.tEnd;
    b = tl.tEnd;
  }
  a = Math.max(a, tl.tStart);

  const padL = 30;
  const plot = { x: r.x + padL, y: r.y + 13, w: r.w - padL - 6, h: r.h - 26 };
  const n = Math.max(32, Math.floor(plot.w));
  let peak = 1e-30;
  const sig = new Float64Array(n);
  const obs = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const time = a + ((b - a) * i) / (n - 1);
    sig[i] = tl.strainAtTime(time);
    obs[i] = state.noiseOn ? sig[i] + noiseAt(state, time) : sig[i];
    if (Number.isFinite(obs[i])) peak = Math.max(peak, Math.abs(obs[i]));
  }
  const mid = plot.y + plot.h / 2;
  const toY = h => mid - (h / peak) * (plot.h / 2) * 0.9;

  g.save();
  g.strokeStyle = colors.grid;
  g.setLineDash([2, 3]);
  g.beginPath();
  g.moveTo(plot.x, mid);
  g.lineTo(plot.x + plot.w, mid);
  g.stroke();
  g.setLineDash([]);

  if (state.noiseOn) {
    g.strokeStyle = colors.muted;
    g.globalAlpha = 0.85;
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const x = plot.x + (i / (n - 1)) * plot.w;
      if (i === 0) g.moveTo(x, toY(obs[i]));
      else g.lineTo(x, toY(obs[i]));
    }
    g.stroke();
    g.globalAlpha = 1;
  }

  g.strokeStyle = colors.accent;
  g.lineWidth = state.noiseOn ? 1.4 : 1.2;
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const x = plot.x + (i / (n - 1)) * plot.w;
    if (i === 0) g.moveTo(x, toY(sig[i]));
    else g.lineTo(x, toY(sig[i]));
  }
  g.stroke();

  const cx = plot.x + ((state.cursorT - a) / (b - a)) * plot.w;
  g.strokeStyle = colors.ink;
  g.globalAlpha = 0.6;
  g.beginPath();
  g.moveTo(cx, plot.y);
  g.lineTo(cx, plot.y + plot.h);
  g.stroke();
  g.globalAlpha = 1;

  g.font = typeAt(TYPE.TICK);
  g.fillStyle = colors.muted;
  g.textAlign = 'left';
  g.textBaseline = 'bottom';
  g.fillText(
    t('gwW.local.span', { ms: (span * 1000).toFixed(0) }),
    plot.x,
    r.y + r.h - 3
  );
  g.restore();
}

/** Frequency against time, logarithmic, with the boundary the model stops at. */
function drawFrequency(g, r, state, colors) {
  const tl = state.timeline;
  frame(g, r, colors, t('gwW.panel.frequency'));
  const padL = 34;
  const plot = { x: r.x + padL, y: r.y + 13, w: r.w - padL - 6, h: r.h - 26 };
  const fLo = Math.max(10, tl.fStart * 0.7);
  const fHi = tl.fEnd * 1.35;
  const toY = f =>
    plot.y +
    plot.h -
    ((Math.log10(f) - Math.log10(fLo)) / (Math.log10(fHi) - Math.log10(fLo))) *
      plot.h;

  g.save();
  // Decade and half-decade gridlines, labelled.
  g.font = typeAt(TYPE.TICK);
  g.textAlign = 'right';
  g.textBaseline = 'middle';
  // Ticks generated for the range rather than taken from a fixed list: this
  // plot spans 20 to 90 Hz for a heavy black-hole binary and 60 to 2000 Hz for
  // a pair of neutron stars, and one list cannot label both.
  const ticks = [];
  for (let decade = 1; decade <= 10000; decade *= 10) {
    for (const m of [1, 1.5, 2, 3, 5, 7]) ticks.push(decade * m);
  }
  // Thinned to whatever fits: a heavy binary spans 20 to 90 Hz, where every
  // one of these ticks lands within a few pixels of the next.
  let lastY = Infinity;
  for (const f of ticks) {
    if (f < fLo || f > fHi) continue;
    const y = toY(f);
    if (lastY - y < 12) continue;
    lastY = y;
    g.strokeStyle = colors.grid;
    g.globalAlpha = 0.6;
    g.beginPath();
    g.moveTo(plot.x, y);
    g.lineTo(plot.x + plot.w, y);
    g.stroke();
    g.globalAlpha = 1;
    g.fillStyle = colors.muted;
    g.fillText(f < 10 ? f.toFixed(1) : String(Math.round(f)), plot.x - 4, y);
  }

  const track = tl.frequencyTrack(
    tl.tStart,
    tl.tEnd,
    Math.max(24, Math.floor(plot.w))
  );
  g.strokeStyle = colors.accent;
  g.lineWidth = 1.6;
  g.beginPath();
  for (let i = 0; i < track.length; i++) {
    const x = plot.x + (i / (track.length - 1)) * plot.w;
    const y = toY(track[i]);
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();

  // Where the model stops.
  const yIsco = toY(tl.fEnd);
  g.strokeStyle = colors.warn;
  g.setLineDash([4, 3]);
  g.beginPath();
  g.moveTo(plot.x, yIsco);
  g.lineTo(plot.x + plot.w, yIsco);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = colors.warn;
  // Right-aligned so it never lands on the panel's own title in the corner.
  g.textAlign = 'right';
  g.textBaseline = 'bottom';
  g.fillText(t('gwW.plot.isco'), plot.x + plot.w - 3, yIsco - 2);

  const cx = plot.x + cursorFraction(state) * plot.w;
  g.strokeStyle = colors.ink;
  g.beginPath();
  g.moveTo(cx, plot.y);
  g.lineTo(cx, plot.y + plot.h);
  g.stroke();

  g.fillStyle = colors.muted;
  g.save();
  g.translate(r.x + 9, plot.y + plot.h / 2);
  g.rotate(-Math.PI / 2);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(t('gwW.axis.frequency'), 0, 0);
  g.restore();
  g.restore();
}

/**
 * The schematic binary, and the illustrative wave pattern around it.
 *
 * The wavefronts carry *emission history*: a ring at screen radius R shows the
 * phase the source had when the wave now at R left it. That is what makes them
 * bunch up as the frequency rises, and it is why the pattern near the source is
 * not simply the source's current phase painted outwards.
 */
function drawSourceView(g, r, state, colors, opts = {}) {
  const tl = state.timeline;
  const tNow = state.cursorT;
  frame(g, r, colors, t('gwW.panel.source'));
  const captionRoom = r.w > 320 && opts.overlay ? 58 : 18;
  const cx = r.x + r.w / 2;
  const cy = r.y + 12 + (r.h - 12 - captionRoom) / 2;
  const maxR = Math.max(
    10,
    Math.min(r.w / 2 - 8, (r.h - 12 - captionRoom) / 2 - 2)
  );

  g.save();
  g.beginPath();
  g.rect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
  g.clip();

  if (opts.overlay) {
    drawWaveOverlay(g, { cx, cy, maxR }, state, colors);
  }

  // The binary. Separation from the model, compressed to the picture; the
  // bodies are drawn at a fixed size that has nothing to do with their radii.
  const sepRs = tl.separationRsAtTime(tNow);
  const sepStartRs = tl.separationRsAtTime(tl.tStart);
  const orbitPx =
    (Number.isFinite(sepRs) && sepStartRs > 0 ? sepRs / sepStartRs : 1) *
    maxR *
    0.3;
  const phase = tl.orbitalPhaseAtTime(tNow) || 0;
  const q = state.params.m1 / (state.params.m1 + state.params.m2);
  const bodies = [
    { r: orbitPx * (1 - q), ang: phase, m: state.params.m1 },
    { r: orbitPx * q, ang: phase + Math.PI, m: state.params.m2 },
  ];

  g.strokeStyle = colors.grid;
  g.globalAlpha = 0.55;
  for (const b of bodies) {
    g.beginPath();
    g.arc(cx, cy, b.r, 0, Math.PI * 2);
    g.stroke();
  }
  g.globalAlpha = 1;

  for (const b of bodies) {
    const x = cx + b.r * Math.cos(b.ang);
    const y = cy + b.r * Math.sin(b.ang);
    const rad = 3 + 3 * Math.cbrt(b.m / 30);
    g.fillStyle = colors.ink;
    g.beginPath();
    g.arc(x, y, rad, 0, Math.PI * 2);
    g.fill();
  }

  g.font = typeAt(TYPE.TICK);
  g.fillStyle = colors.muted;
  g.textAlign = 'left';
  g.textBaseline = 'top';
  // On a full-width panel the caption carries the whole legend; on the
  // half-width one it carries the short form, and the legend is a readout row
  // instead - which is where a reader using a screen reader gets it either way.
  const roomy = r.w > 320 && opts.overlay;
  const capLines = roomy ? 5 : 1;
  const capText = roomy
    ? t(opts.reduced ? 'gwW.overlay.legendStill' : 'gwW.overlay.legend')
    : t('gwW.source.short');
  wrapText(
    g,
    capText,
    r.x + 5,
    r.y + r.h - 4 - capLines * 10,
    r.w - 10,
    10,
    capLines
  );
  g.restore();
}

/**
 * Concentric wavefronts, from emission history.
 *
 * Bounded by construction: at most MAX_RINGS crests are drawn, found by
 * inverting the phase exactly rather than by searching. The near field is
 * masked, because the amplitude formula the ring brightness comes from is a
 * far-field result and does not describe the region a wavelength from a source
 * that is itself a wavelength across.
 */
function drawWaveOverlay(g, geom, state, colors) {
  const { cx, cy, maxR } = geom;
  const tl = state.timeline;
  const tNow = state.cursorT;
  const phiNow = tl.phaseAtTime(tNow);
  if (!Number.isFinite(phiNow)) return;

  const fNow = tl.frequencyAtTime(tNow) || 1;
  // Screen pixels per second of illustrative propagation. See the note on
  // RINGS_ACROSS_RADIUS: slowed, and rescaled with the frequency so that the
  // pattern stays readable across a twenty-six-fold sweep.
  const speed = (fNow * maxR) / RINGS_ACROSS_RADIUS;

  // The mask: two wavelengths of travel at the current frequency. Inside it
  // the far-field expression that sets these amplitudes does not apply, and it
  // is drawn as a soft hole rather than as a picture nobody should read.
  const maskR = Math.min(maxR * 0.5, Math.max(maxR * 0.2, (2 * speed) / fNow));

  // Detail, not signal: a low tier draws fewer wavefronts. Nothing about the
  // strain, the frequency or the audio depends on this number.
  const rings = currentTier() === 'low' ? Math.round(MAX_RINGS / 2) : MAX_RINGS;
  const crests = [];
  for (let k = 0; k < rings; k++) {
    // Crests are where the phase passes a multiple of 2 pi, going backwards
    // from the phase the source has now.
    const target =
      Math.ceil(phiNow / (2 * Math.PI)) * 2 * Math.PI - k * 2 * Math.PI;
    const tEmit = tl.timeAtPhase(target);
    if (!Number.isFinite(tEmit)) break;
    const radius = (tNow - tEmit) * speed;
    if (radius > maxR) break;
    if (radius < 1) continue;
    crests.push({ radius, tEmit });
  }

  g.save();
  for (const c of crests) {
    const env = tl.envelopeAtTime(c.tEmit);
    if (!Number.isFinite(env)) continue;
    // 1/r falloff of the illustration, and a fade towards the edge.
    const rel = c.radius / maxR;
    const near = Math.max(0, Math.min(1, (c.radius - maskR) / (maskR * 0.6)));
    const amp = (env / tl.meta.peakStrain) * (0.35 / Math.max(0.25, rel));
    const alpha = Math.max(0, Math.min(0.85, amp)) * near * (1 - rel * 0.55);
    if (alpha <= 0.01) continue;
    g.strokeStyle = colors.accent;
    g.globalAlpha = alpha;
    g.lineWidth = 1 + 1.6 * Math.min(1, amp);
    g.beginPath();
    g.arc(cx, cy, c.radius, 0, Math.PI * 2);
    g.stroke();
  }
  g.globalAlpha = 1;

  // The masked region, drawn as a soft disc so it reads as "not shown" rather
  // than as "nothing here".
  const grad = g.createRadialGradient(cx, cy, 0, cx, cy, maskR);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(cx - maskR, cy - maskR, maskR * 2, maskR * 2);
  g.strokeStyle = colors.muted;
  g.globalAlpha = 0.45;
  g.setLineDash([2, 4]);
  g.beginPath();
  g.arc(cx, cy, maskR, 0, Math.PI * 2);
  g.stroke();
  g.setLineDash([]);
  g.globalAlpha = 1;

  g.restore();
}

/**
 * A ring of free test particles at the detector, in its own inset.
 *
 * The wave arrives out of the page, so the deformation drawn is transverse by
 * construction. The two polarizations are the standard ones:
 *
 *   x' = x (1 + h+/2) + y (hx/2)
 *   y' = y (1 - h+/2) + x (hx/2)
 *
 * amplified by a stated factor, because the real one is a part in 10^21.
 */
/**
 * What the ring actually does, for this source's inclination.
 *
 * For a circular binary the two polarisations go as (1 + cos^2 i)/2 and cos i,
 * ninety degrees apart in phase. Which means three quite different pictures,
 * and only one of them is the one an introduction usually describes:
 *
 *   edge-on      cos i = 0, so h-cross vanishes. Linearly polarised: the ring
 *                stretches, passes exactly through a circle, and squeezes.
 *   face-on      the two are equal. Circularly polarised: the ellipse keeps
 *                its shape and ROTATES. It is never a circle, ever.
 *   in between   elliptically polarised, and it never quite closes either.
 *
 * The lesson used to promise "a moment when the ring is a perfect circle
 * again" on a face-on source, where the combined distortion never drops below
 * 99% of its peak. Now the introductory screens select an edge-on source, and
 * this row says which of the three is on screen wherever it is not.
 *
 * @param {number} inclinationDeg - 0 face-on, 90 edge-on
 * @returns {{kind: string, crossOverPlus: number}} What to say
 */
export function polarizationOf(inclinationDeg) {
  const i = ((Number(inclinationDeg) || 0) * Math.PI) / 180;
  const plus = (1 + Math.cos(i) ** 2) / 2;
  const cross = Math.abs(Math.cos(i));
  const ratio = plus > 0 ? cross / plus : 0;
  const kind =
    ratio < 0.05 ? 'linear' : ratio > 0.95 ? 'circular' : 'elliptical';
  return { kind, crossOverPlus: ratio };
}

function drawRingInset(g, r, state, colors) {
  frame(g, r, colors, t('gwW.panel.ring'));
  const tl = state.timeline;
  const captionRoom = 20;
  const cx = r.x + r.w / 2;
  const cy = r.y + 12 + (r.h - 12 - captionRoom) / 2;
  const rad = Math.max(
    6,
    Math.min(r.w / 2 - 10, (r.h - 12 - captionRoom) / 2 - 4)
  );
  const hp = tl.plusAtTime(state.cursorT);
  const hc = tl.crossAtTime(state.cursorT);
  const peak = tl.meta.peakStrain || 1;
  // Normalised to the loudest moment of this signal and then exaggerated to
  // something visible. The factor is printed, so the picture is not mistaken
  // for a measurement. A real strain of 1e-21 moves a ring of markers by
  // nothing a screen could show; every picture of one is amplified, and the
  // only honest thing to do is put the number next to it.
  const k = 0.32 * (state.ringGain ?? 1);
  const p = Number.isFinite(hp) ? (hp / peak) * k : 0;
  const c = Number.isFinite(hc) ? (hc / peak) * k : 0;

  g.save();
  g.strokeStyle = colors.grid;
  g.globalAlpha = 0.7;
  g.setLineDash([2, 3]);
  g.beginPath();
  g.arc(cx, cy, rad, 0, Math.PI * 2);
  g.stroke();
  g.setLineDash([]);
  g.globalAlpha = 1;

  g.fillStyle = colors.accent;
  const count = currentTier() === 'low' ? RING_PARTICLES / 2 : RING_PARTICLES;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const x0 = Math.cos(a) * rad;
    const y0 = Math.sin(a) * rad;
    const x = x0 * (1 + p / 2) + y0 * (c / 2);
    const y = y0 * (1 - p / 2) + x0 * (c / 2);
    g.beginPath();
    g.arc(cx + x, cy + y, 2, 0, Math.PI * 2);
    g.fill();
  }
  // The instrument, over the markers it is made of. Two arms at right angles,
  // which is the whole reason an observatory is an L: the wave lengthens one
  // and shortens the other at the same moment, and a difference between two
  // lengths is a far easier thing to measure well than either length.
  //
  // Drawn from the same two numbers as the ring, so the arms and the markers
  // cannot disagree. The lengths are exaggerated by the same printed factor.
  if (state.showArms !== false) {
    const armX = rad * (1 + p / 2);
    const armY = rad * (1 - p / 2);
    g.strokeStyle = colors.warn;
    g.globalAlpha = 0.9;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + armX, cy);
    g.moveTo(cx, cy);
    g.lineTo(cx, cy - armY);
    g.stroke();
    g.lineWidth = 1;
    g.globalAlpha = 1;
  }

  g.font = typeAt(TYPE.TICK);
  g.fillStyle = colors.muted;
  g.textAlign = 'left';
  g.textBaseline = 'top';
  wrapText(g, t('gwW.ring.short'), r.x + 5, r.y + r.h - 13, r.w - 10, 10, 1);
  g.restore();
}

// -----------------------------------------------------------------------------
// The lab widget
// -----------------------------------------------------------------------------

/** The rate and length the overlap is computed at. Bounded, and enough. */
const MATCH_RATE = 2048;
const MATCH_SAMPLES = 4096;

/** The last overlap, so a repaint does not recompute a transform every frame. */
let matchCache = { key: '', value: null };

/**
 * How much the current signal resembles the pinned one.
 *
 * A normalised, noise-weighted overlap maximised over time and phase - the
 * inner product a matched filter is built on. It is reported as "similarity"
 * everywhere and it is not a detection statistic: js/gw/match.js says why at
 * length, and the lesson makes a student find out for themselves.
 *
 * The *observed* trace goes in, so with noise switched on this is a comparison
 * of a template against something that has noise in it - which is the point of
 * the step that uses it.
 *
 * @param {object} state - Lab state
 * @returns {?number} 0 to 1, or null when nothing is pinned
 */
function similarityAgainstPinned(state) {
  if (!state.pinned) return null;
  const key = `${state.signature}|${state.pinned.signature}|${state.noiseOn ? state.noiseSeed : ''}`;
  if (matchCache.key === key) return matchCache.value;
  const tl = state.timeline;
  const pin = state.pinned.timeline;
  const observed = new Float64Array(MATCH_SAMPLES);
  for (let i = 0; i < MATCH_SAMPLES; i++) {
    const time = tl.tEnd - (MATCH_SAMPLES - 1 - i) / MATCH_RATE;
    const v = observedAt(state, time);
    observed[i] = Number.isFinite(v) ? v : 0;
  }
  const template = sampleOnto(pin, {
    sampleRate: MATCH_RATE,
    t0: pin.tEnd - (MATCH_SAMPLES - 1) / MATCH_RATE,
    t1: pin.tEnd,
    length: MATCH_SAMPLES,
  });
  let value = null;
  try {
    value = overlapOf(observed, template, {
      sampleRate: MATCH_RATE,
    }).similarity;
  } catch {
    value = null;
  }
  matchCache = { key, value };
  return value;
}

/** The numbers a caption has to quote about how a signal was made audible. */
function audioVars(plan) {
  return {
    low: hz(plan.lowHz),
    high: hz(plan.highHz),
    speed:
      plan.speed >= 1
        ? `${plan.speed.toFixed(1)}×`
        : `${(1 / plan.speed).toFixed(1)}×`,
    faster: plan.speed >= 1 ? '1' : '0',
    shift: Math.round(plan.shiftHz),
    sweep: plan.sweepFactor.toFixed(1),
    trueSweep: plan.trueSweepFactor.toFixed(1),
  };
}

/**
 * Send the current reading to the notebook.
 *
 * The snapshot is taken here, in the click's own task, and handed over frozen:
 * the lab keeps mutating its state on every frame, and evidence that changes
 * after it is recorded is not evidence.
 *
 * @param {object} state - Lab state
 * @param {object} spec - The step's tool spec
 * @returns {void}
 */
function captureLab(state, spec) {
  const snap = snapshotOf(state);
  const cmp = comparison(state);
  const sim = spec.similarity ? similarityAgainstPinned(state) : null;
  const tl = state.timeline;
  // A thinned envelope, which is what the trace looks like at report size.
  const buckets = 200;
  const env = tl.envelope(tl.tStart, tl.tEnd, buckets);
  const points = [];
  for (let i = 0; i < buckets; i++) {
    if (!Number.isFinite(env.max[i])) continue;
    points.push([tl.tStart + ((i + 0.5) / buckets) * tl.duration, env.max[i]]);
  }
  captureToNotebook((capture, provenance) =>
    capture.fromGwObservation({
      snapshot: snap,
      comparison: cmp,
      similarity: sim,
      provenance,
      envelope: points,
      // Only when something is actually sounding: a reading taken in silence
      // has no loudness to describe.
      audioMapping: isPlaying() ? currentMapping() : null,
    })
  ).catch(() => {});
}

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

// -----------------------------------------------------------------------------
// The binary on the main canvas
// -----------------------------------------------------------------------------
//
// A step that declares a `binary` stage and names it in the tool spec gets two
// selectable compact objects in the sandbox whose separation and orbital phase
// come from this timeline - the same one the waveform is plotted from. They
// are not being integrated: js/lessonStage.js hands them to the model, so the
// picture cannot drift away from the plot, and the sandbox is not quietly
// asserting an orbit of its own beside a computed one.
//
// It is a schematic source reconstruction and the readout says so. The
// separation is to scale in Schwarzschild radii of the total mass; the two
// bodies are markers at a fixed size, because a horizon and a neutron-star
// surface are not the same kind of quantity and drawing them to that scale
// would smuggle in a claim about neutron-star radii.

/**
 * Put the staged binary where the model says it is, this frame.
 *
 * @param {object} state - The lab
 * @param {?object} ctx - The lesson context, when the step gave the widget one
 * @param {object} spec - The step's tool spec
 * @returns {boolean} Whether the picture was driven
 */
function syncBinary(state, ctx, spec = {}, mode = 'binary') {
  if (!spec.binary || typeof ctx?.placeBinary !== 'function') return false;
  const tl = state.timeline;
  if (!tl) return false;
  const t = state.cursorT;
  if (mode !== 'binary') {
    // A single source. Static stays where it is; the pulsing one breathes,
    // driven by the same model clock so pause and seek hold it still.
    if (mode === 'pulsing' && typeof ctx.pulseSource === 'function') {
      const phase = tl.orbitalPhaseAtTime(t);
      ctx.pulseSource(Number.isFinite(phase) ? (phase / Math.PI) % 1 : 0);
    }
    return true;
  }
  // What the two objects are, before where they are. A preset can change the
  // pair from two black holes to two neutron stars, and until this was here
  // the canvas kept the old pair while every number in the panel described the
  // new one.
  if (typeof ctx.restageBinary === 'function') {
    ctx.restageBinary({
      kinds: kindsFor(state, spec),
      m1: state.params.m1,
      m2: state.params.m2,
      fit: true,
    });
  }
  return ctx.placeBinary(tl.separationRsAtTime(t), tl.orbitalPhaseAtTime(t), {
    m1: state.params.m1,
    m2: state.params.m2,
    // The orbit as the observer sees it. Edge-on the circle collapses to a
    // line, which is the same fact the polarisation row reports and the same
    // reason the strain falls.
    inclinationDeg: state.params.inclinationDeg,
  });
}

/**
 * What the two components are, for the masses the lab is set to.
 *
 * From the preset the reader selected where one matches, and otherwise from a
 * mass threshold that is stated rather than hidden: this is an illustration
 * choice and not a model output. The point-mass inspiral does not know what
 * its components are made of and never will - the same equations give the same
 * waveform whatever they are - so the readout says the kind was assumed.
 *
 * @param {object} state - The lab
 * @param {object} spec - The tool spec
 * @returns {Array<string>} Two of 'bh' or 'ns'
 */
function kindsFor(state, spec = {}) {
  if (Array.isArray(spec.kinds)) return spec.kinds;
  const { m1, m2 } = state.params;
  const exact = PRESETS.find(p => p.m1 === m1 && p.m2 === m2);
  if (exact?.kinds) return [...exact.kinds];
  // Above about two and a half solar masses no equation of state is known that
  // supports a neutron star, so heavier is drawn as a hole. The threshold is a
  // drawing choice; the readout says so.
  const kind = m => (m > NS_MAX_SUN ? 'bh' : 'ns');
  return [kind(m1), kind(m2)];
}

/** Where the illustration stops calling a compact object a neutron star. */
const NS_MAX_SUN = 2.5;

/**
 * Which source the reader has selected, and put it on the canvas.
 *
 * The control is a number; this turns it into the scene. Only acts on a
 * change, so the stage is not rebuilt four times a second, and only where the
 * step offered the control at all.
 *
 * @param {object} v - The control values
 * @param {?object} ctx - The lesson context
 * @param {object} spec - The tool spec
 * @returns {string} The active mode
 */
function syncSource(v, ctx, spec = {}) {
  const wanted = spec.binary
    ? SOURCE_MODES[Math.round(v.source ?? 2)] || 'binary'
    : 'binary';
  if (typeof ctx?.setSourceMode === 'function') ctx.setSourceMode(wanted);
  return wanted;
}

/**
 * Put the crests the model has emitted on the main canvas.
 *
 * From the model's own emission history, so the rings a reader sees at a given
 * playhead position are the rings that belong to it: pausing holds them,
 * seeking back shows the earlier pattern, restarting clears them. A source
 * with no changing quadrupole emits none, which is the whole argument of the
 * screens that switch the source.
 *
 * @param {object} state - The lab
 * @param {?object} ctx - The lesson context
 * @param {object} spec - The tool spec
 * @param {string} mode - The active source
 * @returns {void}
 */
function syncWavefronts(state, ctx, spec = {}, mode = 'binary') {
  if (typeof ctx?.showWavefronts !== 'function') return;
  if (spec.wavefronts === false || mode !== 'binary') {
    ctx.showWavefronts(null);
    return;
  }
  const tl = state.timeline;
  if (!tl) {
    ctx.showWavefronts(null);
    return;
  }
  const key = `${state.signature ?? ''}`;
  if (key !== wavefrontKey) {
    wavefrontKey = key;
    wavefrontTimes = emissionTimes(tl);
    // How far the rings reach, in the same world units the two components are
    // placed in. Taken from the pair's own starting separation rather than
    // from a constant: a fixed reach drew rings twenty times the size of the
    // binary, so the camera framed the source and the waves were a wall of
    // arcs across the whole canvas with the pair a speck at the middle.
    const startRs = tl.separationRsAtTime(tl.tStart);
    const perRs = ctx.binaryScale?.()?.unitsPerSchwarzschildRadius ?? 3.2;
    const span = Number.isFinite(startRs) ? startRs * perRs : 40;
    wavefrontReach = Math.max(30, span * WAVE_REACH_IN_SEPARATIONS);
    wavefrontSpeed = illustrativeSpeed(wavefrontTimes, wavefrontReach);
  }
  ctx.showWavefronts(
    crestsFor(wavefrontTimes, state.cursorT, {
      speed: wavefrontSpeed,
      maxRadius: wavefrontReach,
    })
  );
}

/**
 * How far the crests travel before leaving the picture, in starting
 * separations of the pair that emitted them.
 *
 * A display choice, like the propagation speed beside it. Three is enough for
 * a reader to see a ring leave, watch it go, and still have the source large
 * enough to see the two components turning.
 */
const WAVE_REACH_IN_SEPARATIONS = 3;

/** Memoised emission history, so the inverse is not solved every frame. */
let wavefrontKey = '';
let wavefrontTimes = [];
let wavefrontSpeed = 1;
let wavefrontReach = 40;

/** Forget the memoised wavefronts. Tests only. */
export const resetWavefrontsForTests = () => {
  wavefrontKey = '';
  wavefrontTimes = [];
  wavefrontSpeed = 1;
  wavefrontReach = 40;
};

/**
 * The three sources the beginner lesson compares, in control order.
 *
 * The order is the argument: a mass that does nothing, a mass that moves a
 * great deal and still radiates nothing, and a mass distribution whose shape
 * changes. Sliding from one to the next is the lesson's central point made
 * with a control rather than with a sentence.
 */
const SOURCE_MODES = Object.freeze(['static', 'pulsing', 'binary']);

/**
 * Display amplification for the strain picture.
 *
 * Powers of ten, because the quantity being amplified spans twenty of them.
 * Nothing computed changes: this scales what is drawn and the readout prints
 * the factor beside it.
 */
const AMPLIFY_STEPS = Object.freeze([1, 100, 10000, 1000000, 100000000]);

const GW_LAB = {
  id: 'gw-lab',
  // Given the lesson context, so a step that stages the binary can have the
  // two objects on the canvas be the ones this timeline describes.
  live: true,
  get title() {
    return t('gwW.lab.title');
  },
  get note() {
    return t('gwW.lab.note');
  },
  animated: true,
  controls: [
    {
      id: 'm1',
      get label() {
        return t('gwW.control.m1');
      },
      unit: 'M☉',
      min: LIMITS.m1.min,
      max: LIMITS.m1.max,
      step: 0.2,
      value: 36,
      decimals: 1,
    },
    {
      id: 'm2',
      get label() {
        return t('gwW.control.m2');
      },
      unit: 'M☉',
      min: LIMITS.m2.min,
      max: LIMITS.m2.max,
      step: 0.2,
      value: 29,
      decimals: 1,
    },
    {
      id: 'distance',
      get label() {
        return t('gwW.control.distance');
      },
      unit: 'Mpc',
      min: LIMITS.distanceMpc.min,
      max: LIMITS.distanceMpc.max,
      step: 10,
      value: 410,
      decimals: 0,
    },
    {
      id: 'inclination',
      get label() {
        return t('gwW.control.inclination');
      },
      unit: '°',
      min: LIMITS.inclinationDeg.min,
      max: LIMITS.inclinationDeg.max,
      step: 5,
      value: 0,
      decimals: 0,
    },
    {
      // Which of three sources is on the canvas. Not a display setting: the
      // control restages the scene, so a screen asking "does this radiate?"
      // has the thing it is asking about standing there. The beginner lesson
      // used to ask a reader to imagine a single static mass while a binary
      // orbited behind the question.
      id: 'source',
      get label() {
        return t('gwW.control.source');
      },
      min: 0,
      max: 2,
      step: 1,
      value: 2,
      decimals: 0,
      format: value => t(`gwW.source.${SOURCE_MODES[Math.round(value)]}`),
    },
    {
      // Display only, and the readout prints the factor. A real strain of
      // 1e-21 is invisible at any honest scale, so every picture of one is
      // amplified; what matters is that the number is on screen rather than
      // implied.
      id: 'amplify',
      get label() {
        return t('gwW.control.amplify');
      },
      min: 0,
      max: 4,
      step: 1,
      value: 2,
      decimals: 0,
      format: value => `×${AMPLIFY_STEPS[Math.round(value)].toLocaleString()}`,
    },
    {
      id: 'cursor',
      get label() {
        return t('gwW.control.cursor');
      },
      min: 0,
      max: 1,
      step: 0.002,
      value: 0,
      decimals: 3,
      format: value => `${(value * 100).toFixed(0)}%`,
    },
  ],
  presets: PRESETS.map(p => ({
    get label() {
      return t(`gwW.preset.${p.id}`);
    },
    values: {
      m1: p.m1,
      m2: p.m2,
      distance: p.distanceMpc,
      inclination: p.inclinationDeg,
      cursor: 0,
    },
    get note() {
      return t(`gwW.preset.${p.id}.note`);
    },
  })),
  actions: (spec = {}) => {
    const list = [
      {
        id: 'play',
        get label() {
          return t('gwW.action.play');
        },
      },
      {
        id: 'replay',
        get label() {
          return t('gwW.action.replay');
        },
      },
      // Offered on every screen and required on none. A student with the sound
      // off is never asked for anything they cannot read off the plots, which
      // e2e/gwLesson.spec.js walks the whole lesson to confirm.
      {
        id: 'listen',
        get label() {
          return t('gwW.action.listen');
        },
      },
    ];
    if (spec.noiseControls !== false) {
      list.push({
        id: 'noise',
        get label() {
          return t('gwW.action.noise');
        },
      });
      list.push({
        id: 'reroll',
        get label() {
          return t('gwW.action.reroll');
        },
      });
    }
    if (spec.compare) {
      list.push({
        id: 'pin',
        get label() {
          return t('gwW.action.pin');
        },
      });
      list.push({
        id: 'unpin',
        get label() {
          return t('gwW.action.unpin');
        },
      });
    }
    if (spec.capture) {
      list.push({
        id: 'capture',
        get label() {
          return t('gwW.action.capture');
        },
      });
    }
    return list;
  },

  reset(v, { autorun = true, spec = {}, fromControl = false } = {}) {
    const state = ensureLab(v, spec);
    // A cursor move is a seek, not a rebuild. Everything else already
    // rebuilt inside ensureLab().
    seekFraction(state, v.cursor ?? 0);
    // A reader moving a control is not the step opening, and must not restart
    // the transport. It used to: pausing and then dragging the playhead put
    // the playback straight back into motion, so the frame a reader had
    // stopped on was gone before they could read it, and the pause button
    // appeared not to work whenever anything else was touched.
    if (fromControl) return;
    // Never start moving on its own for a reader who has asked for less
    // motion. Every control still works, and the frequency plot, the readout
    // and the audio carry the same information without anything animating.
    state.playing =
      autorun &&
      spec.autoplay !== false &&
      !prefersReducedMotion() &&
      (v.cursor ?? 0) < 0.999;
    if (spec.noise !== undefined) state.noiseOn = Boolean(spec.noise);
  },

  act(id, v, spec = {}) {
    const state = ensureLab(v, spec);
    if (id === 'play') {
      if (cursorFraction(state) >= 0.999) replay(state);
      else state.playing = !state.playing;
    } else if (id === 'replay') {
      replay(state);
    } else if (id === 'noise') {
      state.noiseOn = !state.noiseOn;
    } else if (id === 'reroll') {
      newNoiseRealization(state);
    } else if (id === 'pin') {
      pin(state);
    } else if (id === 'unpin') {
      unpin(state);
    } else if (id === 'capture') {
      captureLab(state, spec);
    } else if (id === 'listen') {
      if (isPlaying()) {
        stopSignal();
        audioNote = { key: 'gwW.audio.stopped' };
      } else {
        const plan = audioPlanFor(state.timeline);
        const result = playSignal(state.timeline, {
          mode: plan.mode,
          speed: plan.speed,
          shiftHz: plan.shiftHz,
          // One reference for the whole comparison, and deliberately not
          // this signal's own peak: normalising against that made every
          // distance sound identical, which removed the very ratio the step
          // asks the student to hear. Order of preference - what the step
          // pins, then the preset's reference at its default parameters. Both
          // are independent of the controls, so loudness now tracks strain.
          normalise: comparisonListening(spec) ? 'fixed' : 'peak',
          referenceStrain: audioReferenceFor(spec),
          label: 'gw-lab',
          // What this sound describes. The moment it stops being true - a
          // different preset, a different distance, a different step - the
          // repaint below notices and stops it.
          owner: audioOwnerFor(state, spec),
        });
        audioNote = result.ok
          ? { key: 'gwW.audio.playing', vars: audioVars(plan) }
          : { key: `gwW.audio.refused.${result.reason}` };
      }
    }
    v.cursor = cursorFraction(state);
  },

  step(v, dt, spec = {}) {
    const state = ensureLab(v, spec);
    if (!state.playing) return;
    advance(state, dt);
    // The playhead is a control the student can also drag, so it is written
    // back: the engine syncs the slider from here on every repaint.
    v.cursor = cursorFraction(state);
  },

  draw(canvas, v, ctx, spec = {}) {
    const state = ensureLab(v, spec);
    // Display only: this scales what the ring inset draws and nothing that is
    // computed. The factor is printed in the readout beside it.
    state.ringGain = AMPLIFY_STEPS[Math.round(v.amplify ?? 2)] / 10000;
    const sourceMode = syncSource(v, ctx, spec);
    syncBinary(state, ctx, spec, sourceMode);
    syncWavefronts(state, ctx, spec, sourceMode);
    // A sound describes one configuration. If the configuration has moved -
    // another preset, another distance, another step - what is playing is
    // describing something that is no longer on screen, so it stops. Scoped by
    // owner, so a sound some other instrument started is left alone.
    const owner = audioOwnerFor(state, spec);
    const playingOwner = signalOwner();
    if (
      playingOwner &&
      playingOwner.startsWith('gw-lab:') &&
      playingOwner !== owner
    ) {
      stopSignalIfOwner(playingOwner);
    }
    const view = spec.view || 'signal';
    const tall = view === 'both' || view === 'source';
    const H = responsiveHeight(tall ? 340 : 300, tall ? 250 : 210);
    const { ctx: g, w } = surface(canvas, H);
    const colors = palette();
    const area = { x: 2, y: 2, w: w - 4, h: H - 4 };
    const reduced = prefersReducedMotion();

    if (view === 'source') {
      const [top, bottom] = stack(area, [2.3, 1]);
      drawSourceView(g, top, state, colors, {
        overlay: spec.overlay !== false,
        reduced,
      });
      drawRingInset(g, bottom, state, colors);
      return;
    }
    if (view === 'both') {
      const [top, mid, low] = stack(area, [2.2, 1.5, 1.3]);
      const halfW = (top.w - 6) / 2;
      drawSourceView(g, { ...top, w: halfW }, state, colors, {
        overlay: spec.overlay !== false,
        reduced,
        legend: false,
      });
      drawRingInset(
        g,
        { ...top, x: top.x + halfW + 6, w: halfW },
        state,
        colors
      );
      drawStrainFull(g, mid, state, colors, { fixedPeak: spec.fixedPeak });
      drawFrequency(g, low, state, colors);
      return;
    }
    // 'signal'
    const [a, b, c] = stack(area, [1.25, 1.1, 1]);
    drawStrainFull(g, a, state, colors, { fixedPeak: spec.fixedPeak });
    drawStrainLocal(g, b, state, colors);
    drawFrequency(g, c, state, colors);
  },

  readout(v, ctx, spec = {}) {
    const state = ensureLab(v, spec);
    state.ringGain = AMPLIFY_STEPS[Math.round(v.amplify ?? 2)] / 10000;
    const sourceMode = syncSource(v, ctx, spec);
    syncBinary(state, ctx, spec, sourceMode);
    syncWavefronts(state, ctx, spec, sourceMode);
    const tl = state.timeline;
    const f = state.facts;
    const tNow = state.cursorT;
    const rows = [];

    // Which source is standing on the canvas, and whether it radiates. First,
    // because on the screens that offer the control this is the question, and
    // because "moving masses emit gravitational waves" is the misconception
    // the three settings exist to take apart.
    if (spec.binary && !(spec.hide || []).includes('source')) {
      rows.push({
        label: t('gwW.row.emits'),
        value: t(`gwW.value.emits.${sourceMode}`),
        emphasis: true,
      });
      if (sourceMode === 'binary' && spec.wavefronts !== false) {
        rows.push({ label: t('gwW.row.rings'), value: t('gwW.value.rings') });
      }
    }
    if (!(spec.hide || []).includes('amplify')) {
      rows.push({
        label: t('gwW.row.amplify'),
        value: t('gwW.value.amplify', {
          n: AMPLIFY_STEPS[Math.round(v.amplify ?? 2)].toLocaleString(),
        }),
      });
    }

    // The ring, in numbers. A picture of a distortion is not a reading of one,
    // and a reader working from the keyboard or a screen reader has no picture
    // at all - so the two axes are here as strains, with the polarisation
    // named, on every screen that shows the inset.
    if (spec.view === 'source' || spec.view === 'both') {
      const pol = polarizationOf(state.params.inclinationDeg);
      const hp = tl?.plusAtTime(tNow);
      const hc = tl?.crossAtTime(tNow);
      if (Number.isFinite(hp) && Number.isFinite(hc)) {
        rows.push({
          label: t('gwW.row.ringNow'),
          value: t('gwW.value.ringNow', {
            plus: hp.toExponential(2),
            cross: hc.toExponential(2),
          }),
        });
      }
      rows.push({
        label: t('gwW.row.polarization'),
        value: t(`gwW.value.polarization.${pol.kind}`),
        emphasis: pol.kind !== 'linear',
      });
      // What the L would read. The arms are along the two axes the plus
      // polarisation stretches and squeezes, so their fractional changes are
      // +h/2 and -h/2 and what the instrument records is the difference
      // between them - which is h itself, and is why the shape works.
      if (Number.isFinite(hp)) {
        rows.push({
          label: t('gwW.row.arms'),
          value: t('gwW.value.arms', {
            x: (hp / 2).toExponential(2),
            y: (-hp / 2).toExponential(2),
            diff: hp.toExponential(2),
            metres: (hp * 4000).toExponential(2),
          }),
        });
      }
    }

    // What the two objects are drawn as, and that the model did not decide it.
    // The same equations give the same waveform whatever the components are
    // made of: a point-mass inspiral has two masses in it and no material.
    // Drawing a neutron star is an illustration of an astrophysical inference,
    // and a lesson that walks a reader from a black-hole pair to a
    // neutron-star pair has to say which half changed.
    if (spec.binary) {
      const kinds = kindsFor(state, spec);
      rows.push({
        label: t('gwW.row.components'),
        value: t(`gwW.value.components.${kinds.join('-')}`),
      });
    }

    rows.push({
      label: t('gwW.row.chirpMass'),
      value: `${f.chirpMassSun.toFixed(2)} M☉`,
      emphasis: true,
    });
    rows.push({
      label: t('gwW.row.now'),
      value: t('gwW.value.now', {
        freq: hz(tl.frequencyAtTime(tNow)),
        toMerger: secs(-tNow),
      }),
      emphasis: true,
    });
    // Two different quantities, and the lesson used to ask for one and point
    // at the other. The amplitude is the height of the oscillation at this
    // moment - always positive, and what "peak strain" means. The signed value
    // below it is where the wave happens to be within that oscillation, which
    // passes through zero twice a cycle and is the wrong thing to write down
    // as a peak.
    rows.push({
      label: t('gwW.row.strainAmplitude'),
      value: strainText(tl.envelopeAtTime(tNow)),
      emphasis: true,
    });
    rows.push({
      label: t('gwW.row.strainNow'),
      value: t('gwW.value.strainNow', {
        strain: strainText(tl.strainAtTime(tNow)),
      }),
    });
    rows.push({
      label: t('gwW.row.separation'),
      value: t('gwW.value.separation', {
        rs: (tl.separationRsAtTime(tNow) || 0).toFixed(2),
      }),
    });
    rows.push({
      label: t('gwW.row.velocity'),
      value: t(`gwW.fidelity.${tl.fidelityAtTime(tNow)}`, {
        v: (tl.velocityAtTime(tNow) || 0).toFixed(3),
      }),
    });
    rows.push({
      label: t('gwW.row.window'),
      value: f.excerpted
        ? t('gwW.value.windowExcerpt', {
            window: secs(f.windowActualSeconds),
            cycles: Math.round(f.cyclesInWindow).toLocaleString(),
            from: hz(f.fStartHz),
            full: secs(f.fullBandSeconds),
            fullCycles: Math.round(f.fullBandCycles).toLocaleString(),
          })
        : t('gwW.value.windowWhole', {
            window: secs(f.windowActualSeconds),
            cycles: Math.round(f.cyclesInWindow).toLocaleString(),
          }),
    });
    // The two legends belong in the readout as well as on the canvas: on a
    // half-width panel the canvas caption is the short form, and a reader
    // using a screen reader never sees either.
    if (
      spec.overlay !== false &&
      (spec.view === 'source' || spec.view === 'both')
    ) {
      rows.push({
        label: t('gwW.row.overlay'),
        value: t(
          prefersReducedMotion()
            ? 'gwW.overlay.legendStill'
            : 'gwW.overlay.legend'
        ),
      });
      rows.push({ label: t('gwW.row.ring'), value: t('gwW.ring.amplified') });
    }
    rows.push({
      label: t('gwW.row.stops'),
      value: t('gwW.value.stops', { isco: hz(f.iscoHz) }),
    });
    rows.push({
      label: t('gwW.row.effectiveDistance'),
      value: t('gwW.value.effectiveDistance', {
        d: Math.round(f.distanceMpc).toLocaleString(),
        eff: Math.round(f.effectiveDistanceMpc).toLocaleString(),
      }),
    });
    if (state.noiseOn) {
      rows.push({
        label: t('gwW.row.noise'),
        value: t('gwW.value.noise', { seed: state.noiseSeed }),
      });
    }
    const cmp = comparison(state);
    if (cmp) {
      rows.push({
        label: t('gwW.row.comparison'),
        value: cmp.changed.length
          ? t(
              cmp.controlled
                ? 'gwW.value.controlled'
                : 'gwW.value.uncontrolled',
              {
                changed: cmp.changed.map(k => t(`gwW.field.${k}`)).join(', '),
              }
            )
          : t('gwW.value.identical'),
        emphasis: true,
      });
    }
    if (spec.similarity) {
      const sim = similarityAgainstPinned(state);
      rows.push({
        label: t('gwW.row.similarity'),
        value:
          sim === null
            ? t('gwW.value.similarity.none')
            : t('gwW.value.similarity', { value: sim.toFixed(3) }),
        emphasis: true,
      });
      rows.push({
        label: t('gwW.row.notDetection'),
        value: t('gwW.value.notDetection'),
      });
    }
    if (audioNote) {
      rows.push({
        label: t('gwW.row.audio'),
        value: t(audioNote.key, audioNote.vars),
        emphasis: true,
      });
    }
    // The mapping, whenever a sound is actually playing. What the reader hears
    // is not the frequency the model computed, and the difference is printed
    // rather than left for them to assume away.
    if (currentMapping() && isPlaying()) {
      const plan = audioPlanFor(state.timeline);
      rows.push({
        label: t('gwW.row.mapping'),
        value: t(
          plan.mode === 'rate'
            ? 'gwW.value.mapping.rate'
            : 'gwW.value.mapping.shift',
          audioVars(plan)
        ),
      });
      rows.push({
        label: t('gwW.row.notSound'),
        value: t('gwW.value.notSound'),
      });
      // How loudness was set, and what that does and does not mean. A
      // comparison is only a comparison if the reader knows the reference did
      // not move with the thing being compared.
      const map = currentMapping();
      rows.push({
        label: t('gwW.row.loudness'),
        value: t(
          map.normalise === 'fixed'
            ? 'gwW.value.loudness.fixed'
            : 'gwW.value.loudness.peak',
          {
            percent: map.referenceStrain
              ? `${((map.peakStrain / map.referenceStrain) * 100).toPrecision(3)}%`
              : '—',
          }
        ),
      });
      // Said, not swallowed. A fixed reference cannot cover the whole range of
      // the distance control - the closest setting is forty times louder than
      // the default - so the engine clamps and this says it did.
      if (map.clippedSamples > 0) {
        rows.push({
          label: t('gwW.row.clipped'),
          value: t('gwW.value.clipped', { n: map.clippedSamples }),
        });
      }
    }
    rows.push({
      label: t('gwW.row.playback'),
      value: t('gwW.value.playback', { speed: state.playbackSpeed }),
    });
    return rows;
  },
};

// -----------------------------------------------------------------------------
// The real-data widget
// -----------------------------------------------------------------------------

/** Decoded traces, made once. */
const realCache = new Map();

/** @param {string} id - A trace id @returns {object} A sampled timeline */
function realTimeline(id) {
  if (!realCache.has(id)) {
    const d = decodeTrace(id);
    realCache.set(
      id,
      sampledTimeline({
        samples: d.values,
        sampleRate: d.sampleRate,
        t0: d.t0,
        id,
        meta: {
          event: PROVENANCE.event,
          detector: d.detector,
          role: d.role,
          unit: d.unit,
          doi: PROVENANCE.doi,
          license: PROVENANCE.license,
        },
      })
    );
  }
  return realCache.get(id);
}

/** One trace, drawn into a strip with its own label. */
function drawRealTrace(g, r, tl, colors, opts) {
  const { label, colour, shiftS = 0, invert = false, window: win, peak } = opts;
  const padL = 34;
  const plot = { x: r.x + padL, y: r.y + 12, w: r.w - padL - 6, h: r.h - 24 };
  const n = Math.max(32, Math.floor(plot.w));
  const mid = plot.y + plot.h / 2;
  const toY = h => mid - (h / peak) * (plot.h / 2) * 0.92;

  g.save();
  g.strokeStyle = colour;
  g.lineWidth = 1.2;
  g.beginPath();
  let started = false;
  for (let i = 0; i < n; i++) {
    const time = win[0] + ((win[1] - win[0]) * i) / (n - 1);
    let value = tl.strainAtTime(time + shiftS);
    if (!Number.isFinite(value)) {
      started = false;
      continue;
    }
    if (invert) value = -value;
    const x = plot.x + (i / (n - 1)) * plot.w;
    if (!started) {
      g.moveTo(x, toY(value));
      started = true;
    } else {
      g.lineTo(x, toY(value));
    }
  }
  g.stroke();
  g.font = typeAt(TYPE.TICK);
  g.fillStyle = colour;
  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.fillText(label, plot.x + 2, r.y + 2);
  g.restore();
}

const GW_REAL = {
  id: 'gw-real',
  get title() {
    return t('gwW.real.title');
  },
  get note() {
    return t('gwW.real.note');
  },
  animated: false,
  controls: [
    {
      id: 'shift',
      get label() {
        return t('gwW.control.shift');
      },
      unit: 'ms',
      min: -12,
      max: 12,
      step: 0.25,
      value: 0,
      decimals: 2,
    },
    {
      id: 'invert',
      get label() {
        return t('gwW.control.invert');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: value =>
        value >= 0.5 ? t('gwW.value.inverted') : t('gwW.value.asPublished'),
    },
  ],
  presets: [
    {
      get label() {
        return t('gwW.real.preset.published');
      },
      values: { shift: 0, invert: 0 },
      get note() {
        return t('gwW.real.preset.published.note');
      },
    },
    {
      get label() {
        return t('gwW.real.preset.aligned');
      },
      values: { shift: 6.9, invert: 1 },
      get note() {
        return t('gwW.real.preset.aligned.note');
      },
    },
  ],

  draw(canvas, v, _ctx, spec = {}) {
    const H = responsiveHeight(300, 220);
    const { ctx: g, w } = surface(canvas, H);
    const colors = palette();
    const area = { x: 2, y: 2, w: w - 4, h: H - 4 };
    const win = spec.window || [0.29, 0.45];
    const mode = spec.mode || 'detectors';

    // One shared vertical scale for every strip, so the traces can be compared.
    let peak = 0;
    for (const id of Object.keys(TRACES)) {
      if (TRACES[id].unit !== 'strain') continue;
      const tl = realTimeline(id);
      const e = tl.envelope(win[0], win[1], 120);
      for (let i = 0; i < 120; i++) {
        if (Number.isFinite(e.max[i]))
          peak = Math.max(peak, Math.abs(e.max[i]));
        if (Number.isFinite(e.min[i]))
          peak = Math.max(peak, Math.abs(e.min[i]));
      }
    }
    peak = peak || 1e-21;

    const rows =
      mode === 'reconstruction'
        ? [
            { id: 'observed-H1', key: 'obsH', colour: colors.accent },
            { id: 'reconstruction-H1', key: 'recH', colour: colors.good },
            { id: 'residual-H1', key: 'resH', colour: colors.warn },
          ]
        : [
            { id: 'observed-H1', key: 'obsH', colour: colors.accent },
            { id: 'observed-L1', key: 'obsL', colour: colors.warn },
          ];

    const rects = stack(
      area,
      rows.map(() => 1)
    );
    rows.forEach((row, i) => {
      frame(g, rects[i], colors, '');
      const isL = row.id.endsWith('L1');
      drawRealTrace(g, rects[i], realTimeline(row.id), colors, {
        label: t(`gwW.real.trace.${row.key}`),
        colour: row.colour,
        shiftS: isL ? -(v.shift || 0) / 1000 : 0,
        invert: isL && (v.invert || 0) >= 0.5,
        window: win,
        peak,
      });
    });

    g.save();
    g.font = typeAt(TYPE.TICK);
    g.fillStyle = colors.muted;
    g.textAlign = 'right';
    g.textBaseline = 'bottom';
    g.fillText(
      t('gwW.real.axis', { a: win[0].toFixed(2), b: win[1].toFixed(2) }),
      area.x + area.w - 4,
      area.y + area.h - 2
    );
    g.restore();
  },

  readout(v, _ctx, spec = {}) {
    const mode = spec.mode || 'detectors';
    const rows = [
      { label: t('gwW.real.row.event'), value: 'GW150914', emphasis: true },
      { label: t('gwW.real.row.source'), value: PROVENANCE.paper },
      { label: t('gwW.real.row.doi'), value: PROVENANCE.doi },
      {
        label: t('gwW.real.row.filtering'),
        value: t('gwW.real.value.filtering'),
      },
    ];
    if (mode === 'detectors') {
      rows.push({
        label: t('gwW.real.row.applied'),
        value: t('gwW.real.value.applied', {
          shift: (v.shift || 0).toFixed(2),
          sign:
            (v.invert || 0) >= 0.5
              ? t('gwW.value.inverted')
              : t('gwW.value.asPublished'),
        }),
        emphasis: true,
      });
      rows.push({
        label: t('gwW.real.row.measured'),
        value: t('gwW.real.value.measured', {
          lag: Math.abs(PROVENANCE.findings.observedHvsL.lagMs).toFixed(1),
          r: PROVENANCE.findings.observedHvsL.correlation.toFixed(2),
        }),
      });
    } else {
      rows.push({
        label: t('gwW.real.row.agreement'),
        value: t('gwW.real.value.agreement', {
          r: PROVENANCE.findings.observedVsReconstructionH1.correlation.toFixed(
            2
          ),
        }),
      });
      rows.push({
        label: t('gwW.real.row.residual'),
        value: t('gwW.real.value.residual'),
      });
    }
    rows.push({ label: t('gwW.real.row.licence'), value: PROVENANCE.license });
    return rows;
  },
};

export const GW_WIDGETS = [GW_LAB, GW_REAL];
export { snapshotOf, realTimeline };
