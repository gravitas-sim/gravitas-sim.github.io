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
  // reach for each other.
  const open = () =>
    ensureInvestigations()
      .then(() => import('./assignments/assignmentBridge.js'))
      .then(m => m.openAssignmentFromUrl())
      .catch(err =>
        console.warn('That assignment link could not be opened:', err)
      );

  const openActivity = () =>
    ensureInvestigations()
      .then(() => import('./activities/activityBridge.js'))
      .then(m => m.openActivityFromUrl())
      .catch(err =>
        console.warn('That activity link could not be opened:', err)
      );

  const openPack = () =>
    ensureInvestigations()
      .then(() => import('./remix/open.js'))
      .then(m => m.openPackFromUrl())
      .catch(() => {});

  if (assignmentInHash()) open();
  else if (activityInHash()) openActivity();
  else if (packInHash()) openPack();

  let last = location.hash;
  window.addEventListener('hashchange', () => {
    if (location.hash === last) return;
    last = location.hash;
    if (assignmentInHash()) open();
    else if (activityInHash()) openActivity();
    else if (packInHash()) openPack();
  });
}

export const authoringInUrl = () =>
  /[?&#]author=[\w-]+/.test(window.location.href || '');

/** The Lessons button's first press loads the engine, then stands down. */
function armLessonsButton() {
  const btn = document.getElementById('investigationsBtn');
  if (!btn) return;
  const firstClick = async () => {
    const mod = await ensureInvestigations();
    mod.openBrowser();
  };
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

  // An assignment link names a lesson, so the system is needed immediately.
  // initInvestigations() reads the hash itself and opens the right lesson.
  if (lessonInHash()) ensureInvestigations();

  // An authoring preview needs the system for the same reason and by the same
  // route. Without this the lesson engine is never imported on a fresh
  // ?author= load, so initInvestigations() never runs and the preview silently
  // does nothing - which is exactly what happened the first time.
  if (authoringInUrl()) ensureInvestigations();

  // And the assignment builder, and a student opening an assignment link.
  if (assignmentInUrl() || assignmentInHash()) ensureInvestigations();

  // Pasting a lesson link into an already-open tab changes only the fragment,
  // which navigates nothing.
  window.addEventListener('hashchange', () => {
    if (
      lessonInHash() ||
      authoringInUrl() ||
      assignmentInUrl() ||
      assignmentInHash()
    ) {
      ensureInvestigations();
    }
  });
}
