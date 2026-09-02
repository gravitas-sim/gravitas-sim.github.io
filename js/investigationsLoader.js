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
    loading = import('./investigations.js').then(mod => {
      mod.initInvestigations();
      return mod;
    });
  }
  return loading;
}

/** @returns {boolean} True once the system has been asked for */
export const investigationsRequested = () => loading !== null;

/**
 * Whether the address bar names a lesson.
 *
 * Exported because share.js has to know: it strips the fragment whenever the
 * world is rebuilt, and a lesson link is not a description of a world.
 *
 * @returns {boolean} True for a `#investigation=<id>` fragment
 */
export const lessonInHash = () =>
  /^#investigation=[\w-]+$/.test(window.location.hash || '');

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
  const btn = document.getElementById('investigationsBtn');
  if (btn) {
    const firstClick = async () => {
      const mod = await ensureInvestigations();
      mod.openBrowser();
    };
    btn.addEventListener('click', firstClick);
    onFirstLoad.add(() => btn.removeEventListener('click', firstClick));
  }

  // An assignment link names a lesson, so the system is needed immediately.
  // initInvestigations() reads the hash itself and opens the right lesson.
  if (lessonInHash()) ensureInvestigations();

  // Pasting a lesson link into an already-open tab changes only the fragment,
  // which navigates nothing.
  window.addEventListener('hashchange', () => {
    if (lessonInHash()) ensureInvestigations();
  });
}
