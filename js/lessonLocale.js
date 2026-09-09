// =============================================================================
// Telling the lesson registry what language to fetch lessons in
// -----------------------------------------------------------------------------
// Three lines of wiring that used to live in js/main.js, pulled out for two
// reasons.
//
// The registry is deferred. A static `import { setLessonLocale }` drags in
// js/data/investigations/registry.js, and the registry drags in the English
// lesson manifest - twelve and a half kilobytes of card titles, durations and
// step counts, in the start-up download of every visitor who opens the sandbox
// and never touches a lesson. The registry has to arrive on demand, which makes
// this an async bridge rather than a function call.
//
// The direction is inverted, and that took two attempts to get right.
//
// Importing the registry dynamically from js/main.js fixed the download and
// broke two other things: the locale was assigned only after the module
// arrived, so a lesson opened in that window came back in the language the
// reader had just left (e2e/assignment.spec.js caught it), and the registry was
// fetched on every boot anyway, so the saving was only half made.
//
// So nobody imports anybody. This module holds one string. js/main.js writes it
// synchronously and imports nothing. The registry reads it when something else
// loads the registry - opening the lesson browser, or a share link naming a
// lesson - and registers its own setter here on the way past, so a language
// change made afterwards reaches it directly. Start-up costs one assignment and
// no network request at all.
//
// See tests/lessonLocale.test.js and e2e/lessonLocale.spec.js.
// =============================================================================

/**
 * The language most recently asked for, whatever is still in flight.
 *
 * This is the value that matters, and it is set synchronously. The registry
 * reads it when it loads, so a reader who switches to Spanish and opens a
 * lesson in the same breath gets a Spanish lesson even though the registry
 * arrived somewhere in between - which is the defect the first version of this
 * bridge introduced: `lessonLocale` used to be assigned on the locale-change
 * event itself, and putting a module load in front of it opened a window in
 * which the next lesson was fetched in English.
 */
let wanted = null;

/**
 * The registry's own setter, once the registry exists.
 *
 * The registry announces itself rather than being asked for, which is what
 * lets start-up cost nothing at all: js/main.js records the language and never
 * imports anything, the registry reads that language when something else loads
 * it, and only a language change made *after* that point needs pushing.
 */
let registrySetter = null;

/**
 * Record the language lessons should be fetched in, right now.
 *
 * Synchronous and free: no import, no promise, one assignment. Call it on
 * every locale change. If the registry is already loaded it is told directly;
 * if it is not, it reads this value for itself when it loads.
 *
 * @param {string} locale - A locale id
 */
export function setRequestedLessonLocale(locale) {
  wanted = locale || 'en';
  // Already loaded: tell it now. Not loaded: it will read `wanted` itself.
  // Either way nothing is fetched on account of a language change alone.
  if (registrySetter) {
    try {
      registrySetter(wanted);
    } catch (err) {
      console.warn('Could not set the lesson locale:', err);
    }
  }
}

/**
 * Called by the registry when it loads, so later changes reach it directly.
 *
 * @param {Function} setter - The registry's setLessonLocale
 */
export function registerLessonLocaleSink(setter) {
  registrySetter = typeof setter === 'function' ? setter : null;
}

/** Forget the recorded locale and the registered sink. For tests. */
export function resetLessonLocaleBridge() {
  wanted = null;
  registrySetter = null;
}

/** The language most recently asked for. For tests. */
export const requestedLessonLocale = () => wanted;
