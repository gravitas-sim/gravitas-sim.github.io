// =============================================================================
// The pause-at-event panel
// -----------------------------------------------------------------------------
// The interface over js/pauseAtEvent.js, kept apart from it so the detection
// stays free of the DOM and can be tested against an analytic orbit rather than
// by clicking things.
//
// What this layer owns: which bodies the two selects offer, the units the
// reader types in (AU, not simulation lengths), turning a refusal code into a
// sentence, and keeping the whole thing inert until somebody opens it.
// =============================================================================

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
import { dominantPrimary } from './orbital.js';
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
          `<option value="${b.id}">${escapeText(b.name || `${b.constructor?.name || 'Object'} ${b.id}`)}</option>`
      )
      .join('');
    if (bodies.some(b => String(b.id) === wanted)) select.value = wanted;
  }

  // A sensible default the first time: the selected object, about whatever it
  // is most strongly bound to, which is the orbit a reader is looking at.
  if (e.body && e.primary && !e.body.dataset.touched) {
    const chosen = state?.selectedObject?.object;
    const target = chosen?.alive ? chosen : bodies[bodies.length - 1];
    if (target) {
      e.body.value = String(target.id);
      const primary = dominantPrimary(
        target,
        bodies.filter(b => b !== target)
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
  // A transit names one body; everything else names a pair. The two
  // radial-velocity turning points name a pair too - the star and what it is
  // orbiting - because the watch has to know which star the spectrograph is on.
  const needsPair = kind !== EVENT_KINDS.TRANSIT;
  const needsSeparation =
    kind === EVENT_KINDS.SEPARATION_INWARD ||
    kind === EVENT_KINDS.SEPARATION_OUTWARD;

  if (e.bodyField) e.bodyField.hidden = !needsPair;
  if (e.primaryField) e.primaryField.hidden = !needsPair;
  if (e.separationField) e.separationField.hidden = !needsSeparation;

  // A helpful starting radius: where the body is now, which is always inside
  // its own orbit and therefore always a crossing that can happen.
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
        ? auToSim(Number(e.separation?.value))
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
 * The dependency block the watcher needs.
 *
 * Lifted out of arm() so a lesson can arm through the same one. A second copy
 * would be a second thing that could disagree with this about what the clock
 * is, and the clock is what every reported event time is in.
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
    // How fast the line-of-sight velocity is changing, for the two
    // radial-velocity turning points. Differenced from the reading the
    // spectrograph itself reports rather than derived independently, so the
    // watch fires at the turning point of the curve a student is looking at
    // and not at the turning point of a second quantity that resembles it.
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
 * Show a spec in the form without arming it.
 *
 * For the guided lessons: a step opens the tool with the right bodies and the
 * right event already chosen, and the reader presses Arm themselves. Selecting
 * is not arming, and a lesson that armed on their behalf would be answering
 * its own question.
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
    // Only if the option exists. Assigning a value a select does not have
    // leaves it on whatever it was showing, and a form that silently shows a
    // different body from the one the step named is worse than one that says
    // it could not.
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
 * Arm the spec a lesson step supplied, through the panel's own deps.
 *
 * Reports the refusal in the panel as well as returning it, so a reader who
 * pressed a lesson button sees the reason in the tool they are looking at.
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

  if (e.status) {
    e.status.textContent = armedSpec
      ? t('pauseEvent.status.armed')
      : event
        ? t('pauseEvent.status.fired')
        : t('pauseEvent.status.idle');
  }
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

/**
 * Open or close the panel.
 *
 * Closing disarms. A watch is a thing the reader asked for while looking at
 * this panel; leaving one running behind a closed panel would stop the
 * simulation later with nothing on screen to say why.
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

/** @returns {boolean} Whether the panel is open */
export const isPauseAtEventEnabled = () => enabled;

/** What the watcher has to say. */
function handleEvent(payload) {
  if (payload.type === 'fired') {
    say(t('pauseEvent.fired'), 'fired');
    // The stop is the last thing that happens, so the transport will not call
    // back with a timeline change to hang the marker on. Place it here.
    renderEventMarker({
      frameCount: getFrameCount(),
      simClock: getSimClock(),
    });
    // Focus the note so a reader can type what they saw without hunting for
    // the field: the moment they wanted has just arrived and gone.
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
 * Place the marker for the event that fired on the timeline track.
 *
 * Called from the transport whenever the track changes, and draws nothing until
 * an event has fired - the marker is the only trace of a pause that has already
 * happened, and the reader should be able to find it again after scrubbing
 * away from it.
 *
 * Positioned by clock rather than by frame index: the ring buffer's indices
 * shift as it fills, and the event's time does not.
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

  // Where the event sits in the recorded window, as a fraction. The window is
  // the last `extent.simTime` of simulated time ending at the current clock.
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
  marker.title = t('pauseEvent.marker', {
    kind: t(`pauseEvent.kind.${event.kind}`),
    time: formatNumber(event.timeDays, { sig: 4 }),
  });
}

/**
 * Simulation time to days, without importing the light curve's private helper.
 *
 * currentTimeDays() converts the live clock; this converts a span, and the
 * ratio is the same because the conversion is linear.
 */
function simToDaysApprox(simTime) {
  const now = currentTimeDays();
  const clock = getSimClock();
  if (!(Math.abs(clock) > 0)) return 0;
  return (simTime * now) / clock;
}

/** Wire the panel up. Called once at start-up. */
export function initPauseAtEvent() {
  const e = cacheElements();
  if (!e.container) return;

  e.toggle?.addEventListener('click', () => setPauseAtEventEnabled(!enabled));
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

  // A rebuilt world reuses body ids for different objects, so a watch that
  // survived would be watching something else under the same name.
  window.addEventListener('gravitasSimulationReset', () => {
    resetPauseAtEvent();
    if (enabled) {
      // The selects hold ids that no longer mean what they did.
      if (e.body) delete e.body.dataset.touched;
      fillBodies();
      syncFields();
      render();
    }
  });

  e.container.style.display = 'none';
}
