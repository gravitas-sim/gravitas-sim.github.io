// Lets a lesson step drive the pause-at-event tool (js/pauseAtEvent.js), which
// does the real work: it watches integration steps and reports the overshoot.
// This module is the thin piece between a step and that tool and contains no
// physics.
//
// Opens the tool with the right bodies and event already chosen. Arming is the
// student's own click wherever the question is the moment itself ("when is
// periapsis?"). A step may arm for the student (`pauseAt.auto`, through
// armForLesson, js/investigations/eventWindow.js) only where the moment is the
// setting, not the answer; the author rule interaction/auto-arm
// (tools/authoring/autoArmRules.mjs) refuses an auto step that asks when.
//
// A reader's own watch is never taken: arming over a foreign watch is refused
// and needs a second, explicit press (`force`).
//
// No stale callback may land: every arm carries a generation and the world it
// was armed in, and a fire matching neither is dropped.
//
// Lazy: imported only from the step that needs it.

/** What the lesson's own watch is doing. */
export const WATCH = Object.freeze({
  /** Nothing armed by us. */
  IDLE: 'idle',
  /** Our watch is live. */
  ARMED: 'armed',
  /** It fired and the world is paused at the event. */
  FIRED: 'fired',
  /** The tool refused to arm; see `reason`. */
  REFUSED: 'refused',
  /** Somebody else's watch is armed and we will not take it. */
  FOREIGN: 'foreign',
});

/** Bumped by every arm, every release and every step change. */
let generation = 0;
/** Dropped on release, so a fired event cannot reach a closed step. */
let unsubscribe = null;
/** The last event OUR watch produced. Never anybody else's. */
let ourEvent = null;
/** State, for the step's own readout. */
let state = WATCH.IDLE;
/**
 * Whether a lesson step is currently offering this tool, with its world. The
 * ownership rule: a watch armed while a `pauseAt` step is showing is that
 * step's, whether armed by the step's button or the panel's Arm button; leaving
 * the step releases it. A watch armed with no such step showing is the
 * reader's. Ownership follows when it was armed, not which function armed it.
 */
let activity = null;

/** The loaded modules, once. */
let loaded = null;

/**
 * Load the tool and its panel.
 *
 * @returns {Promise<object>} { events, panel, physics, units }
 */
async function ensureLoaded() {
  if (!loaded) {
    // The bridge wires the panel once, so the timeline marker and screenshot
    // note see this watch's event.
    loaded = Promise.all([
      import('../pauseAtEventBridge.js').then(b => b.ensurePauseAtEvent()),
      import('../physics.js'),
    ]).then(([{ watch, panel }, physics]) => ({
      events: watch,
      panel,
      physics,
    }));
  }
  return loaded;
}

/** @returns {string} What the lesson's watch is doing */
export const lessonWatchState = () => state;

/**
 * The event our own watch produced. Not the tool's `lastEvent()`, which also
 * returns a reader's own watch and would fill a lesson field with a wrong answer.
 *
 * @returns {?object} The event, or null
 */
export const lastLessonEvent = () => (ourEvent ? { ...ourEvent } : null);

/**
 * Find a body by the name a lesson uses (lessons cannot know build ids). Exact
 * match first, then case-insensitive, never by prefix ("Star" vs "Star B").
 *
 * @param {Array<object>} bodies - Candidates
 * @param {string} name - As the lesson writes it
 * @returns {?object} The body
 */
export function resolveByName(bodies, name) {
  if (!name) return null;
  const want = String(name).trim();
  const list = (bodies || []).filter(b => b && b.alive !== false);
  return (
    list.find(b => b.name === want) ||
    list.find(b => String(b.name ?? '').toLowerCase() === want.toLowerCase()) ||
    null
  );
}

/**
 * Open the tool with the bodies and event chosen, and arm nothing. This begins
 * the activity: until release(), a watch that appears is this step's.
 *
 * @param {object} spec - { kind, bodyId, primaryId, separation }
 * @param {object} [opts] - { onFired }, called with our event when it fires
 * @returns {Promise<{ok: boolean, reason?: string}>} Whether it could be shown
 */
export async function openToolFor(
  spec,
  { onFired = null, quiet = false } = {}
) {
  const { events, panel, physics } = await ensureLoaded();

  // A watch armed before the step opened is the reader's; armForLesson refuses it.
  const preexisting = Boolean(events.armedEvent());
  const mine = ++generation;
  activity = {
    generation: mine,
    preexisting,
    world: physics.getWorldGeneration(),
    onFired,
    quiet,
  };

  unsubscribe?.();
  unsubscribe = events.onEvent(payload => {
    if (!activity || activity.generation !== mine) return;
    if (physics.getWorldGeneration() !== activity.world) {
      release();
      return;
    }
    if (payload?.type === 'fired') {
      // The event's moment on the simulation clock that recorded frames use:
      // days scale linearly from the same zero, so it is at
      // timeDays / (timeDays + overshootDays) of the clock now.
      const e = payload.event;
      const now = e.timeDays + e.overshootDays;
      const clock = physics.getSimulationTime();
      ourEvent = {
        ...e,
        lessonGeneration: mine,
        clock: now > 0 ? (clock * e.timeDays) / now : clock,
      };
      state = WATCH.FIRED;
      activity.armed = false;
      activity.onFired?.(lastLessonEvent());
    } else if (payload?.type === 'armed') {
      // Armed while this step shows, by either button: this activity's watch.
      activity.armed = true;
      activity.preexisting = false;
      state = WATCH.ARMED;
    } else if (payload?.type === 'disarmed') {
      activity.armed = false;
      if (state === WATCH.ARMED) state = WATCH.IDLE;
    }
  });

  panel.setPauseAtEventEnabled(true);
  // Via the panel's API, so only the panel knows its markup.
  const shown = panel.presetSelection?.(spec);
  // `pauseAt.quiet`: the same watch, its panel out of the scene's way.
  if (quiet) panel.hidePauseAtEventPanel?.();
  return shown === false ? { ok: false, reason: 'cannotSelect' } : { ok: true };
}

/**
 * Whether the tool already holds a watch that is not ours.
 * @returns {Promise<boolean>} True when somebody else's watch is armed
 */
export async function foreignWatchArmed() {
  const { events } = await ensureLoaded();
  if (!events.armedEvent()) return false;
  // Armed before this activity began, or with no activity at all: theirs.
  return !activity || activity.preexisting === true;
}

/**
 * Arm a watch on the lesson's behalf, once the student has asked. Refuses
 * rather than clobber a reader's own watch; `force` (a second press) takes it.
 *
 * @param {object} spec - { kind, bodyId, primaryId, separation, note }
 * @param {object} opts - { onFired, force }
 * @returns {Promise<{ok: boolean, reason?: string, detail?: object}>} Outcome
 */
export async function armForLesson(
  spec,
  { onFired = null, force = false } = {}
) {
  if (!force && (await foreignWatchArmed())) {
    state = WATCH.FOREIGN;
    return { ok: false, reason: 'foreignWatch' };
  }

  // No activity: no step is offering the tool.
  if (!activity) {
    await openToolFor(spec);
  }
  if (onFired) activity.onFired = onFired;
  const resolved = await armThroughPanel(spec);
  if (!resolved.ok) {
    state = WATCH.REFUSED;
    release({ keepEvent: true });
    return resolved;
  }
  state = WATCH.ARMED;
  return { ok: true };
}

/** Arm through the panel, which builds the watcher's deps in one place. */
async function armThroughPanel(spec) {
  const { panel } = await ensureLoaded();
  if (!panel.armFromSpec) return { ok: false, reason: 'noPanelArm' };
  return panel.armFromSpec(spec);
}

/**
 * Stop watching on the lesson's behalf (step change, lesson close, before a new
 * arm). Disarms only our own watch.
 *
 * @param {object} [opts] - `keepEvent` to leave a fired event in place
 */
export function release({ keepEvent = false } = {}) {
  generation++;
  // A watch that pre-dated the activity was never ours.
  const wasOurs = Boolean(activity && activity.armed && !activity.preexisting);
  const hidden = Boolean(activity?.quiet);
  activity = null;
  unsubscribe?.();
  unsubscribe = null;
  if (!keepEvent) {
    ourEvent = null;
    state = WATCH.IDLE;
  }
  // A panel this step hid closes with it.
  if (hidden && loaded)
    loaded.then(({ panel }) => panel.setPauseAtEventEnabled(false));
  if (wasOurs && loaded) {
    // Fire-and-forget: release() runs in synchronous teardown paths.
    loaded.then(({ events }) => {
      if (events.armedEvent()) events.disarm('lessonLeft');
    });
  }
}
