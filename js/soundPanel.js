// =============================================================================
// The sound panel: the speaker button, the panel behind it and the readout of
// which bodies the sonification is voicing.
// -----------------------------------------------------------------------------
// Extracted from js/ui.js (Prompt 107, slice 5) without a change of behavior.
// It never imports ui.js back. The panel's markup stays with ui.js
// (SOUND_PANEL_MARKUP) and is mounted before initSoundPanel() runs; the one
// thing the panel needs from ui.js is the display name of a body type, handed
// over once as a function because that table is defined further down ui.js.
// =============================================================================

import { formatNumber } from './format.js';
import { formatTime } from './units.js';
import { t } from './i18n/index.js';
import {
  toggleSonification,
  getSonificationState,
  setSonificationVolume,
  watchSonification,
  getVoicedBodies,
} from './audio.js';
import { periodToCents } from './sonify/law.js';
import { ensureDeferredMessages } from './i18n/deferredMessages.js';
import { EV_SIGNAL_AUDIO, EV_STOP_SIGNAL_AUDIO } from './names.js';

// -----------------------------------------------------------------------------
// What the sound is carrying, as numbers (folded in from
// js/sonify/voiceReadout.js, Prompt 107 slice 5, so the sources routes keep
// their request counts)
// -----------------------------------------------------------------------------
// The non-audio path to the facts the sonification is trying to convey: not a
// description of the sound but of the thing it is about. The audible signal is
// lossy on purpose (js/audio.js compresses orbital frequency through
// log2(1 + f*40) and quantizes onto a minor pentatonic, so two orbits several
// percent apart can arrive at the same note), and a text equivalent that
// described what you hear would be lossy the same way. This describes what the
// audio is derived FROM, losslessly, from the very array js/audio.js hands its
// oscillators (getVoicedBodies()), so there is no second derivation of the
// frequency to drift. tests/voiceReadout.test.js holds this module to reading
// it only through that accessor. Periods come out in simulation time units;
// converting to days or years is presentation, and the ratio between two
// periods - which is what the pitches encode - is the same in every unit.
// -----------------------------------------------------------------------------

/**
 * A voiced body reduced to the quantity its pitch stands for.
 *
 * @typedef {object} VoiceRow
 * @property {string} type - The body's type key, for the feature layer to translate
 * @property {number} period - Orbital period in simulation time units
 * @property {number} ratio - This period over the reference period, >= 1
 * @property {number} cents - The same ratio as an interval, >= 0
 * @property {boolean} isReference - True for the one the others are measured from
 */

/**
 * Turn what is being voiced into what it means.
 *
 * The reference is the shortest period in the set - the fastest body, the
 * highest voice - so every interval comes out positive and a reader does not
 * have to hold a sign convention in their head while also holding three
 * numbers. See the header of js/sonify/law.js for why the sign is a hazard.
 *
 * A target whose orbital frequency is zero or non-finite is dropped rather than
 * reported as an infinite period. That happens for a body at rest and for one
 * sitting exactly at the origin, both of which are ordinary sandbox states; the
 * audio gives them no pitch either, so a row for them would be describing
 * silence.
 *
 * @param {Array<{type?: string, orbitalFrequency?: number}>} targets - From getVoicedBodies()
 * @returns {{rows: Array<VoiceRow>, referencePeriod: number}} Empty rows when nothing is voiced
 */
export function describeVoices(targets) {
  const usable = (Array.isArray(targets) ? targets : [])
    .filter(
      t =>
        t &&
        typeof t.orbitalFrequency === 'number' &&
        Number.isFinite(t.orbitalFrequency) &&
        t.orbitalFrequency > 0
    )
    .map(t => ({
      // A key, not a name: describeVoices stays a pure function of numbers,
      // testable without a catalog; renderVoiceReadout translates it.
      type: typeof t.type === 'string' && t.type ? t.type : 'Star',
      period: 1 / t.orbitalFrequency,
    }));

  if (!usable.length) return { rows: [], referencePeriod: 0 };

  const referencePeriod = Math.min(...usable.map(v => v.period));
  // Slowest last. The audio plays them together and has no order at all, so
  // this one is chosen for the reader: ascending period is descending pitch,
  // which is the order the intervals are quoted in.
  const sorted = [...usable].sort((a, b) => a.period - b.period);

  return {
    referencePeriod,
    rows: sorted.map(v => ({
      type: v.type,
      period: v.period,
      ratio: v.period / referencePeriod,
      cents: periodToCents(v.period, referencePeriod),
      isReference: v.period === referencePeriod,
    })),
  };
}

/** The display name of a body type; ui.js supplies the real one. */
let typeName = type => String(type);

// =============================================================================
// The speaker, and what it is honest about
// -----------------------------------------------------------------------------
// A speaker icon has to answer three different questions and used to answer
// one. Is sound permitted? Is anything audible right now? And which of the two
// entirely different things this application can play would it be - the
// sandbox's designed sonification, or a computed gravitational-wave signal?
//
// An AudioContext existing is not a sound. A reader who presses the speaker on
// a paused, empty sandbox has permitted audio and will hear nothing, and an
// icon that switches to a loudspeaker at that moment has told them something
// false. So the glyph distinguishes muted, permitted-but-silent, and actually
// playing, and the panel behind it spells out the rest: which mode, what is
// playing, the volume, a labeled example to check the speakers with, and a
// link to the lesson the signal audio belongs to.
//
// Mute stays one keystroke away on M rather than one click, because the button
// now opens the panel. The panel's first control is the switch.
// =============================================================================

const SOUND_GLYPH = {
  off: 'sound-off',
  ready: 'sound',
  playing: 'sound-on',
  blocked: 'sound-off',
};

/** Where a lesson route hangs off. The sandbox is the site root. */
const LESSON_ROUTE_BASE = '/';

/**
 * Which of the six states the sound is in.
 * @returns {string} One of unsupported, blocked, muted, ready, playing
 */
function soundStatusKey() {
  const s = getSonificationState();
  if (!s.supported) return 'unsupported';
  if (s.muted) return 'muted';
  if (s.blocked) return 'blocked';
  return s.playing ? 'playing' : 'ready';
}

const refreshSonificationToggle = () => {
  const toggle = document.getElementById('sonificationToggle');
  if (!toggle) return;
  // The glyph is an icon from css/icons.css; the state is also in the name.
  const glyph = toggle.querySelector('.readout-icon-glyph');
  const show = name =>
    glyph?.setAttribute('class', `readout-icon-glyph icon icon-${name}`);
  const status = soundStatusKey();

  if (status === 'unsupported') {
    show(SOUND_GLYPH.off);
    toggle.disabled = true;
    toggle.dataset.state = 'disabled';
    toggle.title = t('sound.state.unsupported');
    toggle.setAttribute('aria-label', t('sound.state.unsupported'));
    return;
  }

  toggle.disabled = false;
  show(
    status === 'playing'
      ? SOUND_GLYPH.playing
      : status === 'ready'
        ? SOUND_GLYPH.ready
        : SOUND_GLYPH.off
  );
  toggle.dataset.state = status;
  const label = t('sound.button.labeled', {
    state: t(`sound.state.${status}`),
  });
  toggle.title = label;
  toggle.setAttribute('aria-label', label);
  refreshSoundPanel();
};

/**
 * The non-audio path to what the sonification is carrying.
 *
 * Every number here comes from getVoicedBodies() - the same array the
 * oscillators are following - by way of js/sonify/voiceReadout.js. Nothing in
 * this function recomputes an orbital frequency, and tests/voiceReadout.test.js
 * fails if it ever starts to, because a second derivation is how a readout
 * comes to disagree with the thing it is reading out.
 *
 * Built as elements rather than as one string of markup: the labels come from
 * body types and the periods from formatTime(), and both go in through
 * textContent so that neither can put markup on the page. A translated string
 * carrying an HTML tag renders as literal angle brackets here, which is the
 * right failure and has happened before.
 *
 * @param {{set: Function, phrase: Function, phraseVars: Function}} io - refreshSoundPanel's local helpers
 */
function renderVoiceReadout({ set, phrase, phraseVars }) {
  const section = document.getElementById('soundPanelVoices');
  const list = document.getElementById('soundPanelVoicesList');
  if (!section || !list) return;

  const title = phrase('sound.voices.title');
  // The deferred catalog may not have landed yet. An untranslated section is
  // worse than none, so it stays hidden until the strings are real.
  if (!title) {
    section.hidden = true;
    return;
  }
  section.hidden = false;
  set('soundPanelVoicesTitle', title);
  set('soundPanelVoicesNote', phrase('sound.voices.note'));

  const { rows } = describeVoices(getVoicedBodies());
  list.textContent = '';

  if (!rows.length) {
    const empty = document.createElement('li');
    empty.textContent = phrase('sound.voices.none');
    list.append(empty);
    return;
  }

  for (const row of rows) {
    const item = document.createElement('li');
    item.textContent = row.isReference
      ? phraseVars('sound.voices.reference', {
          label: typeName(row.type),
          period: formatTime(row.period),
        })
      : phraseVars('sound.voices.row', {
          label: typeName(row.type),
          period: formatTime(row.period),
          // Four figures on the ratio and one decimal on the cents, which is
          // finer than it looks like it needs to be and is there for two
          // reasons. A reader comparing two periods wants the figure the
          // rounding would otherwise take away; and "1 cents" is what integer
          // cents produces for a near-unison pair, which is a plural bug in
          // every language at once. A decimal never reads as singular.
          ratio: formatNumber(row.ratio, { sig: 4 }),
          cents: row.cents.toFixed(1),
        });
    list.append(item);
  }
}

/** Fill the panel from the current state. Cheap; called on every change. */
function refreshSoundPanel() {
  const panel = document.getElementById('soundPanel');
  if (!panel || panel.hidden) return;
  const s = getSonificationState();
  const status = soundStatusKey();
  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  /**
   * A deferred string, or nothing.
   *
   * t() answers with the id when a message is missing, which is the right
   * behavior for a developer and the wrong thing to put in front of a reader.
   * The panel's prose is in the deferred half of the catalog and can be a
   * moment behind the panel itself, so an unresolved id becomes an empty
   * paragraph that fills in when the catalog lands - and the paragraph is
   * hidden while it is empty, rather than leaving a gap.
   */
  const phrase = key => {
    const value = t(key);
    return value === key ? '' : value;
  };
  const phraseVars = (key, vars) => {
    const value = t(key, vars);
    return value === key ? '' : value;
  };
  const prose = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = phrase(key);
    el.hidden = !el.textContent;
  };
  // The panel's own prose lives in the deferred catalog and is written from
  // here rather than through data-i18n, so that it is never on screen as a
  // message id while that catalog is still arriving.
  set('soundPanelTitle', phrase('sound.title'));
  prose('soundPanelPermission', 'sound.permission');
  prose('soundPanelPreviewNote', 'sound.preview.note');
  set('soundPanelModeLabel', phrase('sound.row.mode'));
  set('soundPanelNowLabel', phrase('sound.row.now'));
  set('soundPanelVolumeLabel', phrase('sound.row.volume'));
  const lesson = document.getElementById('soundPanelLesson');
  if (lesson) {
    lesson.textContent = phrase('sound.lesson.link');
    // A route, not an anchor, so it is set here rather than in the markup.
    lesson.href = `${LESSON_ROUTE_BASE}#investigation=listening-to-spacetime`;
    lesson.hidden = !lesson.textContent;
  }
  set('soundPanelState', phrase(`sound.state.long.${status}`));
  set('soundPanelMode', phrase(`sound.mode.${s.mode}`));

  const audio = signalAudioState();
  set(
    'soundPanelNow',
    audio.playing
      ? phraseVars('sound.now.signal', {
          seconds: audio.nowPlaying?.seconds.toFixed(1) ?? '?',
        })
      : s.playing
        ? phrase('sound.now.sandbox')
        : phrase('sound.now.nothing')
  );

  renderVoiceReadout({ set, phrase, phraseVars });

  const toggle = document.getElementById('soundPanelToggle');
  if (toggle) {
    toggle.textContent = s.muted
      ? phrase('sound.turnOn')
      : phrase('sound.turnOff');
    toggle.setAttribute('aria-pressed', String(!s.muted));
    toggle.disabled = !s.supported;
  }
  const preview = document.getElementById('soundPanelPreview');
  if (preview) {
    preview.textContent = phrase('sound.preview');
    preview.disabled = !s.supported || s.muted;
  }
  const stop = document.getElementById('soundPanelStop');
  if (stop) {
    stop.textContent = phrase('sound.stop');
    stop.disabled = !audio.playing;
  }
  const vol = document.getElementById('soundPanelVolume');
  const volOut = document.getElementById('soundPanelVolumeOut');
  if (vol && document.activeElement !== vol) vol.value = String(s.volume);
  if (volOut) volOut.textContent = `${Math.round(s.volume * 100)}%`;
}

/** Put the panel under its trigger, inside the viewport. */
function positionSoundPanel() {
  const panel = document.getElementById('soundPanel');
  const btn = document.getElementById('sonificationToggle');
  if (!panel || !btn || panel.hidden) return;
  const r = btn.getBoundingClientRect();
  const w = panel.offsetWidth || 280;
  const left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left));
  panel.style.left = `${left}px`;
  panel.style.top = `${Math.min(window.innerHeight - 40, r.bottom + 6)}px`;
  panel.style.maxHeight = `${Math.max(160, window.innerHeight - r.bottom - 20)}px`;
}

const soundPanelOpen = () => {
  const p = document.getElementById('soundPanel');
  return Boolean(p && !p.hidden);
};

function closeSoundPanel({ restoreFocus = false } = {}) {
  const panel = document.getElementById('soundPanel');
  if (!panel || panel.hidden) return;
  panel.hidden = true;
  document
    .getElementById('sonificationToggle')
    ?.setAttribute('aria-expanded', 'false');
  if (restoreFocus) document.getElementById('sonificationToggle')?.focus();
}

function openSoundPanel() {
  const panel = document.getElementById('soundPanel');
  if (!panel) return;
  // The panel's prose is deferred. Fetch it on the first open and repaint when
  // it lands; until then the labels below render in English from the fallback.
  ensureDeferredMessages()
    .then(() => refreshSoundPanel())
    .catch(() => {});
  panel.hidden = false;
  document
    .getElementById('sonificationToggle')
    ?.setAttribute('aria-expanded', 'true');
  refreshSoundPanel();
  positionSoundPanel();
  document.getElementById('soundPanelToggle')?.focus();
}

/**
 * A short, quiet, clearly labeled example.
 *
 * It is a modeled black-hole chirp rather than a beep, because a beep tells a
 * reader nothing about what this application would play and because the panel
 * has to link somewhere. The panel says in words that it is a model and not
 * the simulation's own sound. Loaded on demand: nothing about the lab is in
 * the start-up download.
 */
async function playSoundExample() {
  try {
    const [{ modelTimeline }, { play }, { audioPlanFor }] = await Promise.all([
      import('./gw/timeline.js'),
      import('./gwAudio.js'),
      import('./gwLab.js'),
    ]);
    const tl = modelTimeline({
      m1: 36,
      m2: 29,
      distanceMpc: 410,
      inclinationDeg: 0,
      fStart: 20,
      id: 'sound-example',
    });
    const plan = audioPlanFor(tl);
    play(tl, {
      mode: plan.mode,
      speed: plan.speed,
      shiftHz: plan.shiftHz,
      gain: 0.22,
      label: 'example',
    });
  } catch {
    // The example is a convenience. A failed import must not break the panel.
  }
  refreshSonificationToggle();
}

// The signal player talks to this control through window events rather than an
// import, in both directions. Importing js/gwAudio.js here to subscribe would
// fetch its chunk - and the waveform model behind it - on every page load, for
// a control most readers never open.
let lastSignalAudio = { playing: false, nowPlaying: null, mapping: null };
const signalAudioState = () => lastSignalAudio;
export const stopSignalAudio = () => {
  window.dispatchEvent(new CustomEvent(EV_STOP_SIGNAL_AUDIO));
};

/**
 * Wire the speaker button and its panel. Called once from ui.js at the point
 * its own start-up code used to run this.
 * @param {{typeName: (type: string) => string}} deps - the body-type naming function
 */
export function initSoundPanel(deps) {
  typeName = deps.typeName;
  const sonificationToggleBtn = document.getElementById('sonificationToggle');
  if (sonificationToggleBtn) {
    const panel = document.getElementById('soundPanel');
    // To <body>, for the same reason the object picker goes there: the readout
    // scrolls its own overflow and would clip this.
    if (panel && panel.parentElement !== document.body) {
      document.body.appendChild(panel);
    }
    refreshSonificationToggle();
    watchSonification(() => refreshSonificationToggle());

    // Fetch the panel's prose the moment the reader shows an interest in the
    // button, so that a click finds it already there. One small chunk, once, and
    // only for somebody who was about to open it.
    const primeSoundStrings = () => {
      ensureDeferredMessages()
        .then(() => refreshSoundPanel())
        .catch(() => {});
    };
    sonificationToggleBtn.addEventListener('pointerenter', primeSoundStrings, {
      once: true,
      passive: true,
    });
    sonificationToggleBtn.addEventListener('focus', primeSoundStrings, {
      once: true,
    });

    sonificationToggleBtn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      if (soundPanelOpen()) closeSoundPanel({ restoreFocus: true });
      else openSoundPanel();
    });

    document
      .getElementById('soundPanelToggle')
      ?.addEventListener('click', () => {
        toggleSonification();
        if (getSonificationState().muted) stopSignalAudio();
        refreshSonificationToggle();
      });

    document
      .getElementById('soundPanelVolume')
      ?.addEventListener('input', e => {
        setSonificationVolume(e.target.valueAsNumber);
      });

    document.getElementById('soundPanelStop')?.addEventListener('click', () => {
      stopSignalAudio();
      refreshSonificationToggle();
    });

    document
      .getElementById('soundPanelPreview')
      ?.addEventListener('click', () => {
        playSoundExample();
      });

    document.addEventListener('click', event => {
      if (!soundPanelOpen()) return;
      if (sonificationToggleBtn.contains(event.target)) return;
      if (document.getElementById('soundPanel')?.contains(event.target)) return;
      closeSoundPanel();
    });

    document
      .getElementById('soundPanel')
      ?.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          closeSoundPanel({ restoreFocus: true });
        }
      });

    window.addEventListener('resize', positionSoundPanel, { passive: true });
    window.addEventListener('scroll', positionSoundPanel, {
      passive: true,
      capture: true,
    });
  } else {
    console.warn('Sonification toggle button not found');
  }

  window.addEventListener(EV_SIGNAL_AUDIO, event => {
    lastSignalAudio = event.detail || lastSignalAudio;
    refreshSonificationToggle();
  });
}
