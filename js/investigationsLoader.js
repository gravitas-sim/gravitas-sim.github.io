// =============================================================================
// Loading the investigation system on demand
// -----------------------------------------------------------------------------
// The guided lessons are half the application by weight: the six lessons'
// content alone is 225KB of the production bundle, and the engine and its
// instruments add another 125KB on top. Almost nobody who opens Gravitas opens
// a lesson in the same visit, and until they do, none of it is needed.
//
// So the whole system loads the first time it is actually wanted: the
// Investigations button, the keyboard shortcut, a `#investigation=` link, or
// the front door's browse action. This module is the only part of it the
// start-up path imports, and everything behind it arrives as its own chunk.
//
// Loading is idempotent, and initInvestigations() runs before the promise
// resolves, so callers never have to think about ordering.
// =============================================================================

import {
  loadFragment,
  mountFragment,
  unmountFragment,
} from './i18n/deferredMessages.js';

let loading = null;

/** Run once, when the system is first requested, whichever route asked. */
const onFirstLoad = new Set();

/**
 * Load and initialize the investigation system, once.
 * @returns {Promise<Object>} The investigations module
 */
export function ensureInvestigations() {
  if (!loading) {
    for (const fn of onFirstLoad) {
      try {
        fn();
      } catch {
        /* a listener must not stop the lesson from opening */
      }
    }
    onFirstLoad.clear();
    // The panel's prose is not in the start-up catalog: js/investigations.js
    // is the only module that reads it, it is the largest family of strings in
    // the application, and a visitor who never opens a lesson was downloading
    // all of it. Registered here, before initInvestigations() renders anything.
    // The engine's markup is two js/fragments/ files, mounted before it binds
    // and after the deferred words, so it goes in translated
    // (INDEX_DECOMPOSITION.md).
    loading = Promise.all([
      import('./investigations.js'),
      import('./i18n/deferredMessages.js').then(m =>
        m.ensureDeferredMessages().catch(() => {})
      ),
      loadFragment('lesson'),
      loadFragment('lesson-finish'),
    ]).then(([mod, , lesson, finish]) => {
      const signal = mountFragment('lesson', lesson);
      mountFragment('lesson-finish', finish);
      mod.initInvestigations({ signal: signal ?? undefined });
      return mod;
    });
  }
  return loading;
}

/**
 * Hold the sandbox's frame loop until a lesson link's first screen is up.
 *
 * Nothing the sandbox draws while a lesson link opens is wanted: the lesson
 * stages its own world on its first step, and the canvas is not yet shown while
 * the splash plays. On a throttled phone each of those frames costs a few
 * hundred milliseconds and queues the lesson's own downloads and module
 * evaluation behind it, which was most of the time a lesson link took to be
 * usable. The promise resolves when the lesson's panel (or the chooser a link
 * to no lesson falls back to) is shown, when the engine failed to load, or
 * after a backstop, so the sandbox never stands still because a lesson did not
 * arrive. A load that names no lesson resolves at once.
 *
 * @param {number} [backstopMs] - The longest the frames are held for a lesson
 *   that does not arrive
 * @param {number} [settleMs] - How long they wait, once it is up, for the
 *   visitor's first click or key
 * @returns {Promise<void>} Resolves when the loop may start
 */
export function whenLessonShown(backstopMs = 20000, settleMs = 4000) {
  if (!lessonInHash()) return Promise.resolve();
  return new Promise(done => {
    let ticks = backstopMs / 50;
    const release = shown => {
      clearInterval(poll);
      if (!shown) return done();
      // The panel is up: the frames wait a little longer for the first thing
      // the visitor does, so that it is answered before they start.
      setTimeout(done, settleMs);
      for (const type of ['click', 'keydown'])
        window.addEventListener(type, done, { once: true });
    };
    const poll = setInterval(
      () =>
        document.querySelector(
          '#investigationPanel:not([hidden]), #investigationBrowser:not(.hidden)'
        )
          ? release(true)
          : --ticks < 0 && release(false),
      50
    );
    ensureInvestigations().catch(() => release(false));
  });
}

/**
 * Unmount the engine's markup; the Lessons button loads it afresh.
 * @returns {Promise<boolean>} Whether it was mounted
 */
export async function unmountInvestigations() {
  if (!loading) return false;
  const mod = await loading;
  mod.teardownInvestigations();
  loading = null;
  unmountFragment('lesson-finish');
  const was = unmountFragment('lesson');
  armLessonsButton();
  return was;
}

/**
 * Whether the address bar names a lesson.
 *
 * Exported because share.js has to know: it strips the fragment whenever the
 * world is rebuilt, and a lesson link is not a description of a world.
 *
 * @returns {boolean} True for a `#investigation=<id>` fragment
 */
export const lessonInHash = () =>
  /^#investigation=[\w-]+(\/\w+)?$/.test(window.location.hash || '');

/**
 * Whether the URL asks for the assignment builder.
 *
 * Needed for the same reason as the authoring test below, and it is the same
 * trap: without a trigger here the lesson engine is never imported, so
 * initInvestigations() never runs and ?assign= silently does nothing.
 *
 * @returns {boolean} True when ?assign= is present
 */
export const assignmentInUrl = () =>
  /[?&]assign=[A-Za-z0-9_-]+/.test(window.location.href);

/**
 * Whether the address bar holds an assignment link a student has opened.
 *
 * The third case of the same trap. An assignment fragment is not a lesson
 * fragment, so lessonInHash() does not see it, and without this the panel the
 * assignment wants to open into has never been initialized.
 *
 * @returns {boolean} True for an assignment fragment
 */
export const assignmentInHash = () => /^#a\d+[zr]./.test(location.hash || '');

/** An investigation link (#i1z..., js/composer/packLink.js). */
export const packInHash = () => /^#i\d+[zr]./.test(location.hash || '');

/**
 * Does the address bar name a classroom activity?
 *
 * `#activity=orbital-speed/guided`. Short and readable on purpose - it goes on
 * a slide and into an LMS - and resolved into an ordinary assignment when it is
 * opened. The predicate lives here beside the other one, so the bridge that
 * knows how to do that stays out of the start-up graph.
 *
 * @returns {boolean} True for an activity fragment
 */
export const activityInHash = () =>
  /^#activity=[a-z0-9-]+(\/[a-z0-9-]+)?$/i.test(location.hash || '');

/**
 * Open whatever assignment, activity or investigation link the address bar
 * names, now or later. The predicates live here and the machinery does not, so
 * a first-time visitor never downloads the codecs. The hashchange half is
 * needed: pasting a link into an open tab navigates nothing.
 */
export function watchForAssignments() {
  // The engine first, then the bridge. Doing it in this order is what lets the
  // bridge import js/investigations.js directly: the panel it opens into has
  // been initialized by the time it runs, and the two modules do not have to
  // reach for each other. A pack link that cannot be opened says nothing.
  const kinds = [
    [
      assignmentInHash,
      () => import('./assignments/assignmentBridge.js'),
      'openAssignmentFromUrl',
      'assignment',
    ],
    [
      activityInHash,
      () => import('./activities/activityBridge.js'),
      'openActivityFromUrl',
      'activity',
    ],
    [packInHash, () => import('./remix/open.js'), 'openPackFromUrl', ''],
  ];
  const open = () => {
    const kind = kinds.find(([isLink]) => isLink());
    if (!kind) return;
    const [, load, opener, what] = kind;
    ensureInvestigations()
      .then(load)
      .then(m => m[opener]())
      .catch(err => {
        if (what) console.warn(`That ${what} link could not be opened:`, err);
      });
  };

  open();
  let last = location.hash;
  window.addEventListener('hashchange', () => {
    if (location.hash === last) return;
    last = location.hash;
    open();
  });
}

export const authoringInUrl = () =>
  /[?&#]author=[\w-]+/.test(window.location.href || '');

/** The Lessons button's first press loads the engine, then stands down. */
function armLessonsButton() {
  const btn = document.getElementById('investigationsBtn');
  if (!btn) return;
  const firstClick = () => ensureInvestigations().then(m => m.openBrowser());
  btn.addEventListener('click', firstClick);
  onFirstLoad.add(() => btn.removeEventListener('click', firstClick));
}

/**
 * Watch for the first sign that a lesson is wanted.
 *
 * Called once from start-up. Nothing here reaches the lesson data: a button
 * listener and a hash test are all that stay resident until someone asks.
 */
export function watchForInvestigations() {
  // The rail button, but only until the system is loaded. initInvestigations()
  // attaches its own listener to the same button, which toggles the browser. If
  // both stayed attached the next click would open and immediately close it, so
  // this one handles the first activation and then stands down - however the
  // system came to be loaded.
  armLessonsButton();

  // `#investigations` is the shared shell's Investigations entry, which opens
  // the chooser until Prompt 54's Library replaces it.
  const browse = () => {
    if (location.hash === '#investigations')
      ensureInvestigations().then(mod => mod.openBrowser());
  };
  browse();
  window.addEventListener('hashchange', browse);

  // A lesson link, an authoring preview (without this the engine is never
  // imported on a fresh ?author= load and the preview silently does nothing),
  // the assignment builder and an assignment link all need the system at once:
  // initInvestigations() reads the address itself and opens the right lesson.
  // The same test runs again when a link is pasted into an open tab, which
  // changes only the fragment and navigates nothing.
  const wanted = () =>
    lessonInHash() ||
    authoringInUrl() ||
    assignmentInUrl() ||
    assignmentInHash();
  if (wanted()) ensureInvestigations();
  window.addEventListener('hashchange', () => {
    if (wanted()) ensureInvestigations();
  });
}
