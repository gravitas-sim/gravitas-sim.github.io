// =============================================================================
// Registering the service worker
// -----------------------------------------------------------------------------
// The worker itself is sw.js at the root; this is the page's half of the
// arrangement. It is deliberately small and deliberately quiet: nothing here
// blocks start-up, nothing here shows a banner, and a browser without service
// workers - or a page opened over file:// - simply does not get offline support
// and is not told about it.
//
// Registered after the first frame rather than during boot. Installing means
// fetching 5.5MB, and doing that while the application is still building its
// first world competes for the same connection and the same main thread. The
// classroom case this exists for is the *second* half of a lesson, so there is
// no hurry.
//
// On updates: the worker does not call skipWaiting(), so a new build waits
// rather than swapping code under a running lesson. This module notices the
// waiting worker, says so, and provides the one action that completes the
// swap - but only when somebody asks for it.
//
// Why the reader has to ask
// -----------------------------------------------------------------------------
// Taking over automatically would be the wrong trade twice over. A class
// twenty minutes into an investigation would have the page reload under them,
// and - worse - a worker that claims its clients mid-session leaves tabs that
// have already fetched half a build from the old cache. Waiting is what keeps
// each tab on one coherent revision until the reader chooses otherwise.
//
// The swap, in order: post 'skip-waiting' to the waiting worker, wait for
// controllerchange, reload exactly once. Every open tab reloads, because every
// open tab is controlled by the worker that just changed - and each does it
// once, guarded below, because two reloads is a loop and none is a tab left on
// the old code with a new worker underneath it.
// =============================================================================

/** What the worker reported at registration, for the diagnostics readout. */
let status = { supported: false, registered: false, waiting: false };

/** The registration, kept so the update action has something to post to. */
let registration = null;

/** Set once a reload has been decided, so no tab does it twice. */
let reloading = false;

/** @returns {object} A snapshot of the worker's state */
export const offlineStatus = () => ({ ...status });

/** @returns {boolean} Whether a whole new version is installed and waiting */
export const updateReady = () => Boolean(registration?.waiting);

/** @returns {?string} The version the waiting worker will become, if known */
export const waitingVersion = () => status.waitingVersion ?? null;

/**
 * Reload, at most once per page.
 *
 * Both paths here can fire: the tab that pressed the button gets
 * controllerchange, and so does every other open tab. The guard is what turns
 * "every tab reloads" into "every tab reloads once".
 */
function reloadOnce() {
  if (reloading) return;
  reloading = true;
  location.reload();
}

/**
 * Complete the swap the reader just accepted.
 *
 * Gives the application a chance to write anything unsaved down first - the
 * lesson panel persists on every answer, but an update is not the moment to
 * rely on that - then asks the waiting worker to take over and reloads when it
 * has. If the worker never takes over, the reload does not happen and the
 * reader keeps the version they had: a failed update is not a broken tab.
 *
 * @param {number} [timeout] - How long to wait for the takeover
 * @returns {Promise<boolean>} Whether the swap was accepted
 */
export async function applyUpdate(timeout = 10_000) {
  const waiting = registration?.waiting;
  if (!waiting) return false;

  // Anything holding state that is not already on disk gets told first. The
  // listeners are synchronous by contract: an update is a user action, not a
  // moment to start awaiting things.
  try {
    window.dispatchEvent(new CustomEvent('gravitasBeforeUpdate'));
  } catch {
    /* a listener that throws must not strand the reader on the old build */
  }

  const took = await new Promise(resolve => {
    const timer = setTimeout(() => resolve(false), timeout);
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => {
        clearTimeout(timer);
        resolve(true);
      },
      { once: true }
    );
    waiting.postMessage({ type: 'skip-waiting' });
  });

  if (took) reloadOnce();
  return took;
}

/**
 * Ask the active worker what it has cached.
 *
 * Used by the diagnostics readout and by the offline tests, which need the
 * worker's own account rather than an inference from how fast something loaded.
 *
 * @param {number} [timeout] - How long to wait for a reply
 * @returns {Promise<?object>} The worker's status, or null
 */
export function cacheStatus(timeout = 3000) {
  const worker = navigator.serviceWorker?.controller;
  if (!worker) return Promise.resolve(null);
  return new Promise(resolve => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve(null), timeout);
    channel.port1.onmessage = event => {
      clearTimeout(timer);
      resolve(event.data);
    };
    try {
      worker.postMessage({ type: 'status' }, [channel.port2]);
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}

/**
 * Ask the worker to cache a locale's lesson files.
 *
 * The twelve Spanish lesson shadows are not precached - 439KB that most readers
 * never fetch - so they are warmed at the moment the interface switches to
 * Spanish, which is when they stop being hypothetical. Fire and forget: if the
 * network is already gone there is nothing to warm and nothing to report.
 *
 * @param {string} locale - The locale that just became active
 */
export function warmLocale(locale) {
  navigator.serviceWorker?.controller?.postMessage({
    type: 'warm-locale',
    locale,
  });
}

/**
 * Show the update badge, and wire its two buttons.
 *
 * Called once, when a version is actually waiting. Nothing is created up front:
 * the markup is in index.html so it is translated and styled with everything
 * else, and until there is something to say it stays `hidden`, which keeps it
 * out of the tab order and out of the accessibility tree.
 *
 * The badge never takes focus. A reader in the middle of a measurement should
 * not have the caret moved for a message about a version.
 */
function showUpdateBadge() {
  const badge = document.getElementById('updateBadge');
  if (!badge || badge.dataset.wired === 'yes') {
    if (badge) badge.hidden = false;
    return;
  }
  badge.dataset.wired = 'yes';

  const apply = document.getElementById('updateBadgeApply');
  const dismiss = document.getElementById('updateBadgeDismiss');

  apply?.addEventListener('click', () => {
    apply.disabled = true;
    applyUpdate().then(took => {
      // A swap that did not happen leaves the reader where they were, with the
      // badge back, rather than a dead button and no explanation.
      if (!took) apply.disabled = false;
    });
  });

  // Dismissing hides the message, not the update. The worker is still waiting
  // and the badge comes back on the next visit, which is the honest behavior:
  // "not now" is not "never".
  dismiss?.addEventListener('click', () => {
    badge.hidden = true;
  });

  badge.hidden = false;
}

/**
 * Register the worker. Safe to call once, from main.js, after the first frame.
 *
 * @returns {Promise<void>} Resolves when registration has been attempted
 */
export async function initOffline() {
  if (!('serviceWorker' in navigator)) return;
  // A worker cannot be registered from file:// and will not be from a test
  // harness that has opted out.
  if (!/^https?:$/.test(location.protocol)) return;
  status.supported = true;

  try {
    registration = await navigator.serviceWorker.register('./sw.js', {
      scope: './',
    });
    // A refusal does not always arrive as one. Playwright's `serviceWorkers:
    // 'block'` resolves this call with nothing instead of rejecting it, and
    // every line below reads the registration - so the browser console carried
    // "undefined is not an object (evaluating 'registration.waiting')" on every
    // page of every cross-browser run. Nothing registered is not a failure; it
    // is the same "no offline support" the catch below reports, reached
    // quietly.
    if (!registration) return;
    status.registered = true;

    // Every controlled tab reloads when the worker changes, and only then.
    //
    // The first claim of a page that had no controller is not an update - it is
    // this registration finishing - and reloading there would restart every
    // first visit. So the reload is conditional on there having been a
    // controller to replace.
    let controlled = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!controlled) {
        controlled = true;
        return;
      }
      reloadOnce();
    });

    // A worker can already be waiting when this page opens - another tab
    // installed it, or the reader closed the last one without accepting. That
    // is an update ready now, not one to wait for an updatefound that will
    // never come again.
    const announce = () => {
      status.waiting = true;
      showUpdateBadge();
      window.dispatchEvent(new CustomEvent('gravitasUpdateReady'));
    };
    if (registration.waiting && navigator.serviceWorker.controller) announce();

    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        // A worker that reaches 'installed' while another one controls the page
        // is a new build waiting its turn. Recorded, not acted on: swapping the
        // running code mid-lesson is the surprise this whole feature exists to
        // avoid.
        if (
          installing.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          announce();
        }
        // A worker that fails to install is a version that will not activate,
        // which is the core-precache guarantee doing its job. Worth saying so:
        // silence here looks identical to no update being available.
        if (installing.state === 'redundant' && !registration.waiting) {
          console.warn(
            '[gravitas] a new version failed to install and was discarded; ' +
              'the current one is still complete.'
          );
        }
      });
    });

    // Warm the current language's lessons once the worker is controlling, and
    // again whenever the language changes.
    const warmCurrent = () => {
      try {
        const locale = document.documentElement.lang;
        if (locale && locale !== 'en') warmLocale(locale);
      } catch {
        /* the language is optional information */
      }
    };
    if (navigator.serviceWorker.controller) warmCurrent();
    navigator.serviceWorker.addEventListener('controllerchange', warmCurrent);
    window.addEventListener('gravitasLocaleChanged', warmCurrent);
  } catch (err) {
    // A failed registration is not a failed application. The most common cause
    // is a browser configured to refuse workers, and the right response is to
    // carry on without offline support.
    console.warn('[gravitas] offline support unavailable:', err.message);
  }
}
