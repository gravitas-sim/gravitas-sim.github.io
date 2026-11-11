// =============================================================================
// A series as sound: one documented, deterministic mapping (Prompt 280)
// -----------------------------------------------------------------------------
// Any time series or spectrum of the record (two arrays) becomes a short list
// of notes, and the notes become samples. Nothing here touches the audio
// hardware, the clock or the DOM, so the same arrays give the same notes and
// the same samples on every machine and a test can read them in plain Node.
//
// The mapping, stated once and printed by explain() beside every sound:
//   - TIME is x. The range of x, left to right, takes SECONDS seconds, in
//     `count` equal slices of x. A slice is one note (or a tick).
//   - PITCH is value. A slice's note is the mean of the values that fall in
//     it. The lowest note is LOW_HZ, the highest is OCTAVES octaves above, and
//     the value in between is placed linearly in cents (js/sonify/law.js's
//     unit): equal steps in value are equal musical intervals. The range is
//     the data's own, so two charts are not comparable by pitch, and the text
//     says which values the two ends stand for.
//   - A GAP is a slice with no value in it. It is a short tick, never a note
//     held over from the last one, so a hole in the data is heard as a hole.
//   - RESOLUTION: values closer than the value that spans DISTINGUISHABLE_CENTS
//     are not assumed to sound different. That is a working figure of the
//     law's, not a measurement of any listener.
// A spectrum is the same map with wavelength (or frequency) as x and flux as
// the value: the sweep is the spectrum read left to right.
//
// The existing sounds are not this map and are not changed by it: the
// gravitational-wave audio (js/gw/audioRender.js) plays the waveform itself and
// the sandbox's voices (js/audio.js) are a designed scale. This module is what
// the plot component offers for a curve, and the one place the buffer
// lifecycle they share with it lives (./buffer.js).
// =============================================================================

import { CENTS_PER_OCTAVE, DISTINGUISHABLE_CENTS } from './law.js';

export const LOW_HZ = 220;
export const OCTAVES = 2;
export const SECONDS = 6;
/** Notes at the full tier, and at the low tier (js/quality.js). */
export const NOTES = Object.freeze({ full: 48, low: 24 });
/** The tick for a gap: a frequency no note of the map reaches, and its length. */
export const TICK_HZ = 2000;
export const TICK_SECONDS = 0.012;
/** Raised-cosine edges, so a note starts and ends without a click. */
const EDGE_SECONDS = 0.008;
/** The sounding part of a slice; the rest is the silence between notes. */
const SOUNDING = 0.8;

/**
 * The notes of a series.
 * @param {ArrayLike<number>} x
 * @param {ArrayLike<number>} y
 * @param {{count?: number, seconds?: number, kind?: string}} [o] - `count`
 *   is the most notes (NOTES.full), never more than the points there are
 * @returns {{notes: Array<{t: number, dur: number, hz: ?number, value: ?number,
 *   from: number, to: number}>, mapping: object}|null} Null with fewer than two
 *   finite points or no span in x
 */
export function mapSeries(
  x,
  y,
  { count = NOTES.full, seconds = SECONDS, kind = 'series' } = {}
) {
  const pts = [];
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    if (Number.isFinite(x[i]) && Number.isFinite(y[i])) pts.push([x[i], y[i]]);
  }
  if (pts.length < 2) return null;
  let x0 = Infinity;
  let x1 = -Infinity;
  for (const [px] of pts) {
    x0 = Math.min(x0, px);
    x1 = Math.max(x1, px);
  }
  if (!(x1 > x0)) return null;
  const n = Math.max(2, Math.min(Math.floor(count), pts.length));
  const sum = new Float64Array(n);
  const have = new Int32Array(n);
  for (const [px, py] of pts) {
    const k = Math.min(n - 1, Math.floor(((px - x0) / (x1 - x0)) * n));
    sum[k] += py;
    have[k]++;
  }
  const means = Array.from(sum, (s, k) => (have[k] ? s / have[k] : null));
  const seen = means.filter(v => v !== null);
  const lo = Math.min(...seen);
  const hi = Math.max(...seen);
  const flat = !(hi > lo);
  const slice = seconds / n;
  const notes = means.map((value, k) => {
    const t = k * slice;
    const from = x0 + (k / n) * (x1 - x0);
    const to = x0 + ((k + 1) / n) * (x1 - x0);
    if (value === null)
      return { t, dur: TICK_SECONDS, hz: null, value, from, to };
    const cents = flat
      ? (OCTAVES * CENTS_PER_OCTAVE) / 2
      : (OCTAVES * CENTS_PER_OCTAVE * (value - lo)) / (hi - lo);
    return {
      t,
      dur: slice * SOUNDING,
      hz: LOW_HZ * 2 ** (cents / CENTS_PER_OCTAVE),
      value,
      from,
      to,
    };
  });
  return {
    notes,
    mapping: {
      kind,
      count: n,
      gaps: have.reduce((g, c) => g + (c ? 0 : 1), 0),
      seconds,
      x0,
      x1,
      lowHz: LOW_HZ,
      highHz: LOW_HZ * 2 ** OCTAVES,
      valueLow: lo,
      valueHigh: hi,
      flat,
      // The change of value that spans DISTINGUISHABLE_CENTS, or null when the
      // series is flat.
      resolution: flat
        ? null
        : ((hi - lo) * DISTINGUISHABLE_CENTS) / (OCTAVES * CENTS_PER_OCTAVE),
    },
  };
}

/**
 * The samples of a mapped series: a sine per note with raised-cosine edges, a
 * click per gap.
 * @param {{notes: object[], mapping: object}} map - From mapSeries
 * @param {number} sampleRate
 * @param {{gain?: number}} [o]
 * @returns {Float32Array}
 */
export function renderSeries(map, sampleRate, { gain = 0.3 } = {}) {
  const out = new Float32Array(Math.ceil(map.mapping.seconds * sampleRate));
  const edge = Math.max(1, Math.round(EDGE_SECONDS * sampleRate));
  for (const { t, dur, hz } of map.notes) {
    const start = Math.round(t * sampleRate);
    const len = Math.min(out.length - start, Math.round(dur * sampleRate));
    const f = hz ?? TICK_HZ;
    for (let i = 0; i < len; i++) {
      const rise = Math.min(1, i / edge, (len - 1 - i) / edge);
      const shape =
        hz === null
          ? Math.exp((-6 * i) / len)
          : 0.5 - 0.5 * Math.cos(Math.PI * rise);
      out[start + i] +=
        gain * shape * Math.sin((2 * Math.PI * f * i) / sampleRate);
    }
  }
  return out;
}

const WORDS = {
  en: {
    sweep: 'Time is x',
    sweepSpectrum: 'Time is x, read left to right',
    pitch: 'Pitch is the value',
    gaps: n =>
      ` ${n} empty ${n === 1 ? 'slice is a tick' : 'slices are ticks'}, never a held note.`,
    low: (hz, v) => `the lowest value, ${v}, is ${hz} Hz`,
    high: (hz, v) => `the highest, ${v}, is ${hz} Hz`,
    flat: v => `every value is ${v}, so every note is the middle pitch`,
    res: v =>
      ` Values closer than ${v} are not assumed to sound different (a working figure, not a measurement of any listener).`,
    range: (a, b, s, n) =>
      `${s} seconds cover x from ${a} to ${b} in ${n} slices.`,
    unit: 'Equal steps in value are equal musical intervals.',
    own: "The range is this chart's own, so two charts cannot be compared by pitch.",
  },
  es: {
    sweep: 'El tiempo es x',
    sweepSpectrum: 'El tiempo es x, leído de izquierda a derecha',
    pitch: 'El tono es el valor',
    gaps: n =>
      ` ${n} ${n === 1 ? 'intervalo vacío suena como un chasquido' : 'intervalos vacíos suenan como chasquidos'}, nunca como una nota sostenida.`,
    low: (hz, v) => `el valor más bajo, ${v}, es ${hz} Hz`,
    high: (hz, v) => `el más alto, ${v}, es ${hz} Hz`,
    flat: v =>
      `todos los valores son ${v}, así que todas las notas tienen el tono medio`,
    res: v =>
      ` No se supone que valores más próximos que ${v} suenen distintos (una cifra de trabajo, no una medida de ningún oyente).`,
    range: (a, b, s, n) =>
      `${s} segundos cubren x de ${a} a ${b} en ${n} intervalos.`,
    unit: 'Pasos iguales de valor son intervalos musicales iguales.',
    own: 'El intervalo es el de este gráfico, así que dos gráficos no se comparan por el tono.',
  },
};

/**
 * The mapping as text, the equivalent of the sound.
 * @param {object} mapping - mapSeries(...).mapping
 * @param {{lang?: string, number?: (v: number) => string}} [o]
 * @returns {string}
 */
export function explain(
  mapping,
  { lang = 'en', number = v => String(Math.round(v * 1e4) / 1e4) } = {}
) {
  const w = WORDS[lang] ?? WORDS.en;
  const m = mapping;
  const parts = [
    `${m.kind === 'spectrum' ? w.sweepSpectrum : w.sweep}: ${w.range(number(m.x0), number(m.x1), m.seconds, m.count)}`,
    ` ${w.pitch}: ${
      m.flat
        ? w.flat(number(m.valueLow))
        : `${w.low(Math.round(m.lowHz), number(m.valueLow))}; ${w.high(Math.round(m.highHz), number(m.valueHigh))}`
    }. ${w.unit} ${w.own}`,
  ];
  if (m.gaps) parts.push(w.gaps(m.gaps));
  if (m.resolution) parts.push(w.res(number(m.resolution)));
  return parts.join('');
}
