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
// waiting worker and records it, so a future "reload for the new version"
// affordance has something to read; it does not act on it by itself.
// =============================================================================

/** What the worker reported at registration, for the diagnostics readout. */
let status = { supported: false, registered: false, waiting: false };

/** @returns {object} A snapshot of the worker's state */
export const offlineStatus = () => ({ ...status });

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
    const registration = await navigator.serviceWorker.register('./sw.js', {
      scope: './',
    });
    status.registered = true;
    status.waiting = Boolean(registration.waiting);

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
          status.waiting = true;
          window.dispatchEvent(new CustomEvent('gravitasUpdateReady'));
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
