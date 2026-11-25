// The pause-at-event panel: the interface over js/pauseAtEvent.js, kept apart so
// detection stays free of the DOM. Owns the body selects, the units the reader
// types (AU, not simulation lengths), refusal sentences, and staying inert until
// opened.

import {
  bh_list,
  stars,
  planets,
  gas_giants,
  asteroids,
  comets,
  neutron_stars,
  white_dwarfs,
  onPhysicsStep,
  getPhysicsSetting,
  state,
} from './physics.js';
import { primaryOf, PRIMARY_KINDS } from './orbital.js';
import { currentTimeDays, transitAnalysis } from './lightCurve.js';
import { currentRadialVelocity } from './radialVelocity.js';
import { auToSim, simToAu } from './units.js';
import { formatNumber, withUnit } from './format.js';
import {
  EVENT_KINDS,
  annotateLastEvent,
  armEvent,
  armedEvent,
  disarm,
  lastEvent,
  onEvent,
  resetPauseAtEvent,
} from './pauseAtEvent.js';
import { getFrameCount, getSimClock, recordedExtent } from './timeline.js';
import {
  layoutObservationPanels,
  noteObservationPanelUsed,
} from './observationLayout.js';
import { t } from './i18n/index.js';
import { EV_SIMULATION_RESET } from './names.js';

let enabled = false;
let els = null;
let unsubscribe = null;

/** Everything a watch could name, in the order a reader scans for it. */
const selectableBodies = () =>
  [
    ...bh_list,
    ...stars,
    ...neutron_stars,
    ...white_dwarfs,
    ...gas_giants,
    ...planets,
    ...asteroids,
    ...comets,
  ].filter(b => b?.alive && b.id !== undefined);

function cacheElements() {
  if (els) return els;
  els = {
    container: document.getElementById('pauseEventContainer'),
    status: document.getElementById('pauseEventStatus'),
    kind: document.getElementById('pauseEventKind'),
    body: document.getElementById('pauseEventBody'),
    bodyField: document.getElementById('pauseEventBodyField'),
    primary: document.getElementById('pauseEventPrimary'),
    primaryField: document.getElementById('pauseEventPrimaryField'),
    separation: document.getElementById('pauseEventSeparation'),
    separationField: document.getElementById('pauseEventSeparationField'),
    arm: document.getElementById('pauseEventArm'),
    disarm: document.getElementById('pauseEventDisarm'),
    message: document.getElementById('pauseEventMessage'),
    readout: document.querySelector('#pauseEventResult .pause-event-readout'),
    result: document.getElementById('pauseEventResult'),
    time: document.getElementById('pauseEventTime'),
    precision: document.getElementById('pauseEventPrecision'),
    overshoot: document.getElementById('pauseEventOvershoot'),
    note: document.getElementById('pauseEventNote'),
    close: document.getElementById('pauseEventClose'),
    toggle: document.getElementById('togglePauseAtEvent'),
  };
  return els;
}

/** Fill the two body selects, keeping whatever was chosen if it still exists. */
function fillBodies() {
  const e = cacheElements();
  const bodies = selectableBodies();

  for (const select of [e.body, e.primary]) {
    if (!select) continue;
    const wanted = select.value;
    select.innerHTML = bodies
      .map(
        b =>
          `<option value="${b.id}">${escapeText(b.name || `${b.kind || 'Object'} ${b.id}`)}</option>`
      )
      .join('');
    if (bodies.some(b => String(b.id) === wanted)) select.value = wanted;
  }

  // First-time default: the selected object about its dominant primary.
  if (e.body && e.primary && !e.body.dataset.touched) {
    const chosen = state?.selectedObject?.object;
    const target = chosen?.alive ? chosen : bodies[bodies.length - 1];
    if (target) {
      e.body.value = String(target.id);
      const primary = primaryOf(
        target,
        bodies.filter(b => b !== target && PRIMARY_KINDS.has(b.kind))
      );
      if (primary) e.primary.value = String(primary.id);
    }
  }
}

const escapeText = s =>
  String(s).replace(
    /[&<>"']/g,
    c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]
  );

/** @param {string} id - A body id as a string @returns {?object} The body */
const resolveBody = id =>
  selectableBodies().find(b => String(b.id) === String(id)) ?? null;

/** Show or hide the fields the chosen event actually uses. */
function syncFields() {
  const e = cacheElements();
  const kind = e.kind?.value;
  // A transit names one body; everything else a pair (the radial-velocity
  // kinds too: the watch needs the star the spectrograph is on).
  const needsPair = kind !== EVENT_KINDS.TRANSIT;
  const needsSeparation =
    kind === EVENT_KINDS.SEPARATION_INWARD ||
    kind === EVENT_KINDS.SEPARATION_OUTWARD;

  if (e.bodyField) e.bodyField.hidden = !needsPair;
  if (e.primaryField) e.primaryField.hidden = !needsPair;
  if (e.separationField) e.separationField.hidden = !needsSeparation;

  // Starting radius: where the body is now, always inside its own orbit.
  if (needsSeparation && e.separation && !e.separation.value) {
    const body = resolveBody(e.body?.value);
    const primary = resolveBody(e.primary?.value);
    if (body && primary) {
      const r = Math.hypot(
        body.pos.x - primary.pos.x,
        body.pos.y - primary.pos.y
      );
      e.separation.value = simToAu(r).toFixed(3);
    }
  }
}

/** Turn a refusal into a sentence the reader can act on. */
function explain(verdict) {
  const d = verdict.detail || {};
  switch (verdict.reason) {
    case 'circular':
      return t('pauseEvent.refused.circular', {
        e: formatNumber(d.e ?? 0, { sig: 2 }),
      });
    case 'unbound':
      return t('pauseEvent.refused.unbound');
    case 'outsideOrbit':
      return t('pauseEvent.refused.outsideOrbit', {
        min: formatNumber(simToAu(d.periapsis ?? 0), { sig: 3 }),
        max: formatNumber(simToAu(d.apoapsis ?? 0), { sig: 3 }),
      });
    case 'badSeparation':
      return t('pauseEvent.refused.badSeparation');
    case 'noBody':
    case 'noPrimary':
      return t('pauseEvent.refused.noTarget');
    case 'samePrimary':
      return t('pauseEvent.refused.samePrimary');
    case 'noOrbit':
      return t('pauseEvent.refused.noOrbit');
    default:
      return t('pauseEvent.refused.unknown');
  }
}

function say(text, kind = 'info') {
  const e = cacheElements();
  if (!e.message) return;
  e.message.textContent = text || '';
  e.message.hidden = !text;
  e.message.dataset.kind = kind;
}

/** Arm a watch from whatever the form is showing. */
function arm() {
  const e = cacheElements();
  const kind = e.kind?.value;
  const spec = {
    kind,
    bodyId: e.body?.value ?? null,
    primaryId: e.primary?.value ?? null,
    separation:
      kind === EVENT_KINDS.SEPARATION_INWARD ||
      kind === EVENT_KINDS.SEPARATION_OUTWARD
        ? auToSim(Number(e.separation?.valueAsNumber))
        : null,
  };

  const verdict = armEvent(spec, watchDeps());

  if (!verdict.ok) {
    say(explain(verdict), 'refused');
    render();
    return;
  }
  say(t('pauseEvent.armed'), 'info');
  render();
}

/**
 * The dependency block the watcher needs, shared with lesson arming so there is
 * one definition of the clock.
 *
 * @returns {object} deps for armEvent
 */
function watchDeps() {
  return {
    resolveBody,
    pause: () => {
      if (state) state.paused = true;
    },
    clockDays: currentTimeDays,
    onStep: onPhysicsStep,
    G: () => getPhysicsSetting('gravitational_constant'),
    transitLog: () => transitAnalysis().log,
    // Rate of the line-of-sight velocity for the radial-velocity kinds,
    // differenced from the spectrograph's own reading so the watch fires at the
    // turning point of the curve the student sees.
    losRate: () => {
      const now = currentRadialVelocity();
      const t = currentTimeDays();
      const prev = lastLos;
      lastLos = Number.isFinite(now) ? { v: now, t } : null;
      if (!prev || !Number.isFinite(now) || t === prev.t) return NaN;
      return (now - prev.v) / (t - prev.t);
    },
  };
}

/** The previous line-of-sight sample, for differencing. */
let lastLos = null;

/**
 * Show a spec in the form without arming it: the reader presses Arm, since a
 * lesson that armed would answer its own question.
 *
 * @param {object} spec - {kind, bodyId, primaryId, separation}
 * @returns {boolean} Whether every part of the spec could be shown
 */
export function presetSelection(spec) {
  const e = cacheElements();
  if (!e.kind) return false;
  fillBodies();

  let complete = true;
  const set = (el, value) => {
    if (!el || value === null || value === undefined) return;
    const wanted = String(value);
    // Only if the option exists: assigning a missing value leaves the select on
    // a different body, which is worse than reporting incomplete.
    if (![...el.options].some(o => o.value === wanted)) {
      complete = false;
      return;
    }
    el.value = wanted;
  };

  set(e.kind, spec.kind);
  set(e.body, spec.bodyId);
  set(e.primary, spec.primaryId);
  if (Number.isFinite(spec.separation) && e.separation) {
    e.separation.value = simToAu(spec.separation).toFixed(3);
  }
  syncFields();
  render();
  return complete;
}

/**
 * Arm the spec a lesson step supplied, through the panel's own deps. A refusal
 * is shown in the panel as well as returned.
 *
 * @param {object} spec - {kind, bodyId, primaryId, separation, note}
 * @returns {{ok: boolean, reason?: string, detail?: object}} Outcome
 */
export function armFromSpec(spec) {
  presetSelection(spec);
  const verdict = armEvent(spec, watchDeps());
  if (!verdict.ok) {
    say(explain(verdict), 'refused');
    render();
    return verdict;
  }
  say(t('pauseEvent.armed'), 'info');
  render();
  return verdict;
}

/** Redraw the panel from the module's state. */
function render() {
  const e = cacheElements();
  const armedSpec = armedEvent();
  const event = lastEvent();
  // A lesson holding an answer (js/lesson/held.js) is told which event, not when.
  const held = Boolean(event && heldAnswer());

  if (e.status) {
    e.status.textContent = armedSpec
      ? t('pauseEvent.status.armed')
      : event
        ? t('pauseEvent.status.fired') +
          (held ? `: ${t(`pauseEvent.kind.${event.kind}`)}` : '')
        : t('pauseEvent.status.idle');
  }
  if (e.readout) e.readout.hidden = held;
  if (e.arm) e.arm.disabled = Boolean(armedSpec);
  if (e.disarm) e.disarm.disabled = !armedSpec;

  if (e.result) e.result.hidden = !event;
  if (!event) return;

  if (e.time)
    e.time.textContent = withUnit(
      formatNumber(event.timeDays, { sig: 6 }),
      'd'
    );
  if (e.precision) {
    e.precision.textContent =
      event.bracketDays > 0
        ? `± ${withUnit(formatNumber(event.bracketDays / 2, { sig: 2 }), 'd')}`
        : t('pauseEvent.exact');
  }
  if (e.overshoot) {
    e.overshoot.textContent = withUnit(
      formatNumber(event.overshootDays, { sig: 2 }),
      'd'
    );
  }
  if (e.note && e.note.value !== event.note) e.note.value = event.note || '';
}

/** Whether the open lesson holds an answer (HELD_ATTRIBUTE, js/lesson/held.js). */
const heldAnswer = () =>
  Boolean(
    document.querySelector(
      '#investigationPanel[data-answer-held]:not([hidden])'
    )
  );

/**
 * Open or close the panel. Closing disarms: a watch behind a closed panel would
 * stop the simulation with nothing on screen to say why.
 *
 * @param {boolean} on - Whether to show it
 */
export function setPauseAtEventEnabled(on) {
  const e = cacheElements();
  enabled = Boolean(on);
  if (e.container) e.container.style.display = enabled ? '' : 'none';
  if (enabled) noteObservationPanelUsed('pauseEventContainer');
  if (e.toggle) {
    e.toggle.setAttribute('aria-pressed', String(enabled));
    e.toggle.classList.toggle('active', enabled);
  }

  if (enabled) {
    fillBodies();
    syncFields();
    if (!unsubscribe) unsubscribe = onEvent(handleEvent);
    render();
  } else {
    disarm();
    unsubscribe?.();
    unsubscribe = null;
  }
  layoutObservationPanels();
}

/** Hide the panel and keep the watch running (a lesson's `pauseAt.quiet`). */
export function hidePauseAtEventPanel() {
  const e = cacheElements();
  if (e.container) e.container.style.display = 'none';
  layoutObservationPanels();
}

/** What the watcher has to say. */
function handleEvent(payload) {
  if (payload.type === 'fired') {
    say(t('pauseEvent.fired'), 'fired');
    // The stop is last, so no timeline change will follow; place the marker here.
    renderEventMarker({
      frameCount: getFrameCount(),
      simClock: getSimClock(),
    });
    // Focus the note so the reader can type what they saw.
    cacheElements().note?.focus();
  } else if (payload.type === 'disarmed' && payload.reason === 'targetGone') {
    say(t('pauseEvent.refused.targetGone'), 'refused');
  } else if (payload.type === 'disarmed' && payload.reason === 'worldReset') {
    say('', 'info');
  } else if (payload.type === 'cleared') {
    renderEventMarker({ frameCount: 0, simClock: 0 });
  }
  render();
}

/**
 * Place the fired event's marker on the timeline track, called from the
 * transport whenever the track changes; hidden until an event has fired.
 * Positioned by clock, not frame index, because the ring buffer's indices shift
 * as it fills.
 *
 * @param {{frameCount: number, simClock: number}} info - From the timeline
 */
export function renderEventMarker({ frameCount, simClock } = {}) {
  const marker = document.getElementById('timelineEventMarker');
  if (!marker) return;
  const event = lastEvent();
  const extent = recordedExtent();

  // Nothing to mark, or nothing to mark it on.
  if (!event || !frameCount || frameCount < 2 || !(extent.simTime > 0)) {
    marker.hidden = true;
    return;
  }

  // Fraction of the recorded window (the last extent.simTime ending now).
  const clockDays = simToDaysApprox(simClock);
  const spanDays = simToDaysApprox(extent.simTime);
  const age = clockDays - event.timeDays;
  if (!(spanDays > 0) || age < 0 || age > spanDays) {
    // The event has scrolled out of the recorded history.
    marker.hidden = true;
    return;
  }

  const fraction = 1 - age / spanDays;
  marker.hidden = false;
  marker.style.left = `${(fraction * 100).toFixed(2)}%`;
  const kind = t(`pauseEvent.kind.${event.kind}`);
  marker.title = heldAnswer()
    ? kind
    : t('pauseEvent.marker', {
        kind,
        time: formatNumber(event.timeDays, { sig: 4 }),
      });
}

/**
 * Simulation time to days without the light curve's private helper: the
 * conversion is linear, so the live-clock ratio converts a span too.
 */
function simToDaysApprox(simTime) {
  const now = currentTimeDays();
  const clock = getSimClock();
  if (!(Math.abs(clock) > 0)) return 0;
  return (simTime * now) / clock;
}

let wired = false;

/**
 * Wire the panel up, once: js/pauseAtEventBridge.js calls it when the tool is
 * first needed.
 */
export function initPauseAtEvent({ signal } = {}) {
  // Re-ask: an earlier call before the markup mounted cached nothing.
  if (!wired) els = null;
  const e = cacheElements();
  if (!e.container || wired) return;
  wired = true;
  // The toggle and window outlive the markup; their listeners go with the signal.
  const opts = signal ? { signal } : undefined;

  e.toggle?.addEventListener(
    'click',
    () => setPauseAtEventEnabled(!enabled),
    opts
  );
  e.close?.addEventListener('click', () => setPauseAtEventEnabled(false));
  e.arm?.addEventListener('click', arm);
  e.disarm?.addEventListener('click', () => {
    disarm();
    say('', 'info');
    render();
  });
  e.kind?.addEventListener('change', () => {
    syncFields();
    say('', 'info');
  });
  e.body?.addEventListener('change', () => {
    e.body.dataset.touched = '1';
    say('', 'info');
  });
  e.note?.addEventListener('input', () => annotateLastEvent(e.note.value));

  // A rebuilt world reuses ids for different objects.
  window.addEventListener(
    EV_SIMULATION_RESET,
    () => {
      resetPauseAtEvent();
      if (enabled) {
        // The selects' ids are stale.
        if (e.body) delete e.body.dataset.touched;
        fillBodies();
        syncFields();
        render();
      }
    },
    opts
  );

  e.container.style.display = 'none';
}

/**
 * Undo initPauseAtEvent(), for when the panel's markup leaves the document
 * (js/pauseAtEventBridge.js): close it, and forget the elements it bound.
 */
export function teardownPauseAtEvent() {
  if (!wired) return;
  setPauseAtEventEnabled(false);
  wired = false;
  els = null;
}
