// =============================================================================
// Letting a lesson step drive the pause-at-event tool
// -----------------------------------------------------------------------------
// Three lessons ask a student to catch a moment: periapsis and apoapsis of an
// eccentric planet, the top of a transfer arc, the middle of a transit. All
// three used to say "press Space and try to stop it near the right place",
// which measures reaction time rather than orbital mechanics - and on a fast
// machine the interesting instant goes past in two frames.
//
// js/pauseAtEvent.js already does the hard part properly: it watches
// integration steps rather than frames, brackets the crossing, and reports how
// far past the event the pause actually is. This module is the thin piece
// between a lesson step and that tool. It computes nothing about orbits and
// contains no physics; if it did, the lesson would be measuring something the
// tool is not.
//
// What it is actually for
// -----------------------------------------------------------------------------
//   Open the tool with the right bodies and the right event already chosen,
//   and stop there. Arming is the student's own click. A lesson that armed a
//   watch on their behalf would be a lesson that answered its own question,
//   and the panel's own Arm button is where that decision belongs.
//
//   Never clobber a watch the reader set up themselves. Somebody who armed a
//   separation crossing to answer their own question and then advanced a step
//   should not silently lose it: arming over a foreign watch is refused and
//   needs a second, explicit press.
//
//   Never let a stale callback land. A watch armed on step 11 must not fire
//   into step 12, into a rebuilt world, or into a closed lesson. Every arm
//   carries a generation and the world it was armed in, and a fire that does
//   not match both is dropped.
//
// Lazy, and imported only from the step that needs it: the tool, its panel and
// its prose are not in the start-up path and a lesson that never reaches one of
// these steps never fetches them.
// =============================================================================

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
let refusal = null;
/** The world our watch was armed in, so a rebuild invalidates it. */
let armedWorld = null;
/**
 * Whether a lesson step is currently offering this tool.
 *
 * The ownership rule, and it took a failing test to get it right. A watch
 * armed while a `pauseAt` step is on screen belongs to that step's activity,
 * however it was armed - through the step's own button or through the panel's
 * Arm button, which is what the step tells the reader to press. Leaving the
 * step releases it.
 *
 * A watch armed with no such step showing is the reader's own, and the lesson
 * will not take it. So "whose watch is this" is answered by *when* it was
 * armed rather than by *which function* armed it, which is the only version of
 * the question that matches what a reader would say.
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
    loaded = Promise.all([
      import('../pauseAtEvent.js'),
      import('../pauseAtEventPanel.js'),
      import('../physics.js'),
    ]).then(([events, panel, physics]) => ({ events, panel, physics }));
  }
  return loaded;
}

/** @returns {string} What the lesson's watch is doing */
export const lessonWatchState = () => state;

/** @returns {?string} Why the tool refused, when it did */
export const lessonWatchRefusal = () => refusal;

/**
 * The event our own watch produced.
 *
 * Deliberately not `lastEvent()` from the tool: that returns whatever fired
 * most recently including a watch the reader armed themselves, and a lesson
 * field filled from somebody else's event is a wrong answer that looks right.
 *
 * @returns {?object} The event, or null
 */
export const lastLessonEvent = () => (ourEvent ? { ...ourEvent } : null);

/**
 * Find a body by the name a lesson uses.
 *
 * Lessons name bodies - "Eccentric planet", "Probe" - because a lesson cannot
 * know the ids a world build hands out. Matched exactly first, then
 * case-insensitively, and never by prefix: "Star" and "Star B" are different
 * bodies and a prefix match would silently point the watch at the wrong one.
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
 * Open the tool with the right bodies and event chosen, and arm nothing.
 *
 * Opening also begins the activity: from here until release(), a watch that
 * appears is this step's, and the listener that watches for it is ours to drop.
 *
 * @param {object} spec - { kind, bodyId, primaryId, separation }
 * @returns {Promise<{ok: boolean, reason?: string}>} Whether it could be shown
 */
export async function openToolFor(spec) {
  const { events, panel, physics } = await ensureLoaded();

  // A watch already armed before the step opened is the reader's, and stays
  // theirs: the activity records that so armForLesson can refuse to take it.
  const preexisting = Boolean(events.armedEvent());
  const mine = ++generation;
  activity = {
    generation: mine,
    preexisting,
    world: physics.getWorldGeneration(),
  };

  unsubscribe?.();
  unsubscribe = events.onEvent(payload => {
    if (!activity || activity.generation !== mine) return;
    if (physics.getWorldGeneration() !== activity.world) {
      release();
      return;
    }
    if (payload?.type === 'fired') {
      ourEvent = { ...payload.event, lessonGeneration: mine };
      state = WATCH.FIRED;
      activity.armed = false;
      activity.onFired?.(lastLessonEvent());
    } else if (payload?.type === 'armed') {
      // Armed while this step is showing - by the step's button or by the
      // panel's - so it is this activity's watch.
      activity.armed = true;
      activity.preexisting = false;
      state = WATCH.ARMED;
      refusal = null;
    } else if (payload?.type === 'disarmed') {
      activity.armed = false;
      if (state === WATCH.ARMED) state = WATCH.IDLE;
      refusal = payload.reason ?? null;
    }
  });

  panel.setPauseAtEventEnabled(true);
  // Preselect through the panel's own API rather than by writing to its DOM,
  // so the panel stays the only thing that knows its markup.
  const shown = panel.presetSelection?.(spec);
  return shown === false ? { ok: false, reason: 'cannotSelect' } : { ok: true };
}

/**
 * Whether the tool already holds a watch that is not ours.
 *
 * @returns {Promise<boolean>} True when somebody else's watch is armed
 */
export async function foreignWatchArmed() {
  const { events } = await ensureLoaded();
  if (!events.armedEvent()) return false;
  // Armed before this activity began, or with no activity at all: theirs.
  return !activity || activity.preexisting === true;
}

/**
 * Arm a watch on the lesson's behalf, once the student has asked for it.
 *
 * Refuses rather than clobbering a watch the reader set up themselves; a
 * second call with `force` takes it, which is what a second press of a button
 * that has just said so amounts to.
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
    refusal = 'foreignWatch';
    return { ok: false, reason: 'foreignWatch' };
  }

  // No activity open means no step is offering the tool, so there is nothing
  // for a lesson to arm on behalf of.
  if (!activity) {
    await openToolFor(spec);
  }
  activity.onFired = onFired;
  armedWorld = activity.world;
  const resolved = await armThroughPanel(spec);
  if (!resolved.ok) {
    state = WATCH.REFUSED;
    refusal = resolved.reason ?? 'unknown';
    release({ keepEvent: true });
    return resolved;
  }
  state = WATCH.ARMED;
  refusal = null;
  return { ok: true };
}

/**
 * Arm through the panel, so the deps come from one place.
 *
 * The panel already builds the dependency block the watcher needs - the body
 * resolver, the pause, the clock, the step hook, the transit log - and a second
 * copy here would be a second thing that could disagree with it about what the
 * clock is.
 */
async function armThroughPanel(spec) {
  const { panel } = await ensureLoaded();
  if (!panel.armFromSpec) return { ok: false, reason: 'noPanelArm' };
  return panel.armFromSpec(spec);
}

/**
 * Stop watching on the lesson's behalf.
 *
 * Called on every step change, when the lesson closes, and before a new arm.
 * Disarms the tool only if the armed watch is ours: a reader's own watch is
 * theirs to keep.
 *
 * @param {object} [opts] - `keepEvent` to leave a fired event in place
 */
export function release({ keepEvent = false } = {}) {
  generation++;
  // Whatever this activity armed is this activity's, and goes with it. A watch
  // that pre-dated the activity was never ours and is left alone.
  const wasOurs = Boolean(activity && activity.armed && !activity.preexisting);
  activity = null;
  armedWorld = null;
  unsubscribe?.();
  unsubscribe = null;
  if (!keepEvent) {
    ourEvent = null;
    state = WATCH.IDLE;
    refusal = null;
  }
  if (wasOurs && loaded) {
    // Fire-and-forget: the modules are already resolved by the time a watch of
    // ours exists, and release() is called from synchronous teardown paths.
    loaded.then(({ events }) => {
      if (events.armedEvent()) events.disarm('lessonLeft');
    });
  }
}

/** For tests: the world generation our watch was armed in. */
export const armedWorldGeneration = () => armedWorld;

/** Forget everything, for tests. */
export function resetLessonWatch() {
  activity = null;
  release();
  ourEvent = null;
  state = WATCH.IDLE;
  refusal = null;
  generation = 0;
  loaded = null;
}
