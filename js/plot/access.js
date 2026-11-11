// =============================================================================
// The series chart's accessibility layer (Prompt 280)
// -----------------------------------------------------------------------------
// js/plot/chart.js fetches this after a chart has drawn and is on a screen:
// the chart pays for a timer and a dynamic import and a page that never shows
// a chart pays for nothing.
//
// What it adds to a chart
//   - A DESCRIPTION, from ./describe.js, carried as the chart's accessible
//     description (aria-describedby on the <svg>). It is recomputed when the
//     chart takes focus and, for a chart that has stopped drawing, a moment
//     after its last draw: a series that grows fifteen times a second is
//     described when somebody asks, not fifteen times a second.
//   - A SOUND, from js/sonify/series.js: the first shown series as a six-second
//     sweep, started by S on the focused chart or the button below it, stopped
//     by Escape, the same button, a hidden tab or any other signal audio.
//   - A DISCLOSURE under the chart, hidden until the chart first takes focus
//     (a click or a Tab): the description as text, the sound's button and the
//     mapping the sound uses written out. A chart nobody focuses grows no
//     visible controls, which is what keeps forty charts' layouts as they were.
//
// Held predictions. When the lesson has marked the step as holding an answer
// (js/lesson/held.js), the description is only what the axes print and the
// sound is refused: a pitch contour tells the shape of the curve as surely as
// a sentence does.
//
// Nothing starts by itself. Sound is made on a key or a press, never on load,
// and the context is made on that gesture.
// =============================================================================

import { formatNumber } from '../format.js';
import { HELD_ATTRIBUTE } from '../lesson/held.js';
import { EV_STOP_SIGNAL_AUDIO } from '../names.js';
import { currentTier } from '../quality.js';
import { endSource, makeSource } from '../sonify/buffer.js';
import { explain, mapSeries, NOTES, renderSeries } from '../sonify/series.js';
import { describe, keysLine } from './describe.js';

/** How long after its last draw a chart is described without being asked. */
export const IDLE_MS = 1500;

const WORDS = {
  en: {
    summary: 'Describe and hear this chart',
    play: 'Play as sound',
    stop: 'Stop the sound',
    playing: s => `Playing the chart as sound, ${s} seconds.`,
    stopped: 'Sound stopped.',
    held: 'The sound is not available until the result of the prediction you made is shown.',
    none: 'There is no series of at least two points to play.',
    unsupported: 'This browser cannot play sound.',
    first: l => `The sound is of the series ${l}.`,
    note: 'Deterministic: the same data give the same sound. Not validated with listeners.',
  },
  es: {
    summary: 'Describir y escuchar este gráfico',
    play: 'Reproducir como sonido',
    stop: 'Detener el sonido',
    playing: s => `Reproduciendo el gráfico como sonido, ${s} segundos.`,
    stopped: 'Sonido detenido.',
    held: 'El sonido no está disponible hasta que se muestre el resultado de la predicción que hiciste.',
    none: 'No hay ninguna serie de al menos dos puntos para reproducir.',
    unsupported: 'Este navegador no puede reproducir sonido.',
    first: l => `El sonido es el de la serie ${l}.`,
    note: 'Determinista: los mismos datos dan el mismo sonido. No validado con oyentes.',
  },
};

const HIDDEN = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  margin: '-1px',
  padding: '0',
  whiteSpace: 'nowrap',
};

/** The page's language, as the interface keeps it. */
export const pageLanguage = () =>
  document.documentElement.lang === 'es' ? 'es' : 'en';

/** Whether the open lesson's step on screen holds an answer. */
export const heldNow = () =>
  document.body.classList.contains('investigation-open') &&
  Boolean(document.querySelector(`#investigationPanel[${HELD_ATTRIBUTE}]`));

/** The newest `cap` points of a series, as the chart draws them. */
const drawnPart = s => {
  const cut = Number.isFinite(s.cap) ? Math.max(0, s.x.length - s.cap) : 0;
  return cut
    ? { ...s, x: s.x.slice(cut), y: s.y.slice(cut), sigma: s.sigma?.slice(cut) }
    : s;
};

let count = 0;

/**
 * @param {{element: SVGElement, parts: Function, setAccess?: Function}} chart
 * @param {HTMLElement} host - The chart's host; the disclosure is its last child
 * @param {boolean} [fill] - The chart fills a fixed-height host
 * @returns {{touch: Function, refresh: Function, play: Function, stop: Function,
 *   destroy: Function, description: Function}}
 */
export function attach(chart, host, fill = false) {
  const svg = chart.element;
  const id = `ocDesc${++count}`;
  const desc = document.createElement('p');
  desc.id = id;
  Object.assign(desc.style, HIDDEN);
  const live = document.createElement('p');
  live.setAttribute('role', 'status');
  Object.assign(live.style, HIDDEN);
  // After the chart's own nodes (the tooltip follows the svg, and the chart's
  // parity test reads it there).
  svg.parentNode.append(desc, live);
  svg.setAttribute('aria-describedby', id);
  svg.setAttribute('aria-keyshortcuts', 'S');

  const box = document.createElement('details');
  box.className = 'plot-access';
  box.hidden = true;
  const summary = document.createElement('summary');
  const text = document.createElement('p');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ui-button subtle';
  const note = document.createElement('p');
  box.append(summary, text, button, note);
  // Inside the host, so a chart that is replaced or destroyed takes its
  // disclosure with it (a panel that is only hidden would otherwise keep one
  // per open). A chart that fills a fixed-height host has no room for it: it
  // keeps the description and the keys, and the disclosure stays hidden.
  host.append(box);

  let last = '';
  let lastHeld = null;
  let dirty = true;
  let timer = 0;
  let ctx = null;
  let playing = null;
  let current = null;
  const w = () => WORDS[pageLanguage()];
  const say = words => {
    live.textContent = words;
  };

  /** The description now, recomputed only when the data or the hold changed. */
  function refresh() {
    clearTimeout(timer);
    timer = 0;
    const held = heldNow();
    if (!dirty && held === lastHeld && last) return current;
    dirty = false;
    lastHeld = held;
    const lang = pageLanguage();
    const p = chart.parts();
    const series = p.series.map(drawnPart);
    current = describe(series, {
      lang,
      held,
      label: p.label,
      xTitle: p.xTitle,
      yTitle: p.yTitle,
    });
    const words = WORDS[lang];
    const first = series.find(s => !s.hidden);
    const number = v => formatNumber(v, { sig: 3, locale: lang });
    const map =
      held || !first
        ? null
        : mapSeries(first.x, first.y, {
            count: NOTES[currentTier() === 'low' ? 'low' : 'full'],
          });
    current.sound = map;
    const shown = series.filter(s => !s.hidden);
    note.textContent = held
      ? words.held
      : map
        ? `${shown.length > 1 ? `${words.first(first.label)} ` : ''}${explain(map.mapping, { lang, number })} ${words.note}`
        : words.none;
    summary.textContent = words.summary;
    button.textContent = playing ? words.stop : words.play;
    button.disabled = held || !map;
    const next = current.text + keysLine(lang);
    if (next !== last) {
      last = next;
      desc.textContent = next;
      text.textContent = current.text;
    }
    return current;
  }

  function stop(announce = true) {
    // The listeners exist only while a sound does: a chart that is never
    // destroyed (a panel that is only hidden) must hold none.
    window.removeEventListener(EV_STOP_SIGNAL_AUDIO, onStop);
    document.removeEventListener('visibilitychange', onHide);
    if (playing) {
      endSource(playing);
      playing = null;
      if (announce) say(w().stopped);
    }
    button.textContent = w().play;
  }

  async function play() {
    const d = refresh();
    const words = w();
    if (d.held) return say(words.held);
    if (!d.sound) return say(words.none);
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return say(words.unsupported);
    stop(false);
    // One thing sounding at a time: the gravitational-wave audio steps aside.
    window.dispatchEvent(new window.CustomEvent(EV_STOP_SIGNAL_AUDIO));
    ctx ??= new AC();
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
    const made = makeSource(
      ctx,
      ctx.destination,
      renderSeries(d.sound, ctx.sampleRate)
    );
    playing = made.source;
    window.addEventListener(EV_STOP_SIGNAL_AUDIO, onStop);
    document.addEventListener('visibilitychange', onHide);
    playing.onended = () => {
      if (playing === made.source) stop();
    };
    playing.start();
    button.textContent = words.stop;
    say(words.playing(d.sound.mapping.seconds));
  }

  // Four listeners a chart, no more: the leak census of the panels allows a
  // chart's lazily loaded layer four (e2e/lessonPerformance.spec.js).
  const toggle = () => (playing ? stop() : play());
  button.addEventListener('click', toggle);
  const reveal = () => {
    box.hidden = fill;
    refresh();
  };
  svg.addEventListener('focusin', reveal);
  box.addEventListener('toggle', refresh);
  svg.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      reveal();
      toggle();
    } else if (e.key === 'Escape') stop();
  });
  const onStop = () => stop(false);
  const onHide = () => {
    if (document.visibilityState !== 'visible') stop(false);
  };

  // The first description is carried before anyone asks for it.
  refresh();
  return {
    /** The chart drew: the description is stale, and recomputed once it settles. */
    touch() {
      dirty = true;
      clearTimeout(timer);
      timer = setTimeout(refresh, IDLE_MS);
    },
    refresh,
    play,
    stop,
    description: () => refresh().text,
    destroy() {
      clearTimeout(timer);
      stop(false);
      box.remove();
      ctx?.close?.().catch?.(() => {});
    },
  };
}
