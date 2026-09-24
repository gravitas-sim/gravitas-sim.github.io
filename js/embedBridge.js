// =============================================================================
// The embed's side of gravitas-embed/1: answering the page it is in
// -----------------------------------------------------------------------------
// Fetched only by an embed that opted into the contract (`ev=1`,
// js/embedOptions.js), after the interface exists. js/embedMessages.js says
// what a message may look like; this decides whether one is obeyed at all and
// does what it asks.
//
// The security model, in the order it is applied:
//
//   no parent origin    The figure tells whoever framed it that it is ready -
//                       the protocol and version and nothing else, to any
//                       origin, because a page cannot use that for anything -
//                       and listens to nobody. A figure pasted into a course
//                       page without an origin behaves exactly as a plain
//                       embed does.
//   a parent origin     Messages are read only from `window.parent` and only
//                       when their origin is that one, exactly. Anything else
//                       is dropped without an answer, so a page that is not
//                       the parent learns nothing by asking. Answers go to
//                       that origin and no other.
//   an opaque parent    A sandboxed page's origin is "null", which
//                       parentOrigin() never accepts, so it gets readiness
//                       only.
//
// Nothing a page can send navigates the frame or reads anything out of it: no
// message returns progress, submissions, instructor material or storage, and
// `load` takes a share fragment that Gravitas's own decoder accepts, not a URL.
// =============================================================================

import { REQUESTS, message, readMessage } from './embedMessages.js';
import { decodePayload } from './shareState.js';

// What the figure acts on is handed in by js/main.js rather than imported:
//
//   setPlaying(bool)          run or pause, as the transport's button does
//   applySharePayload(p)      build a decoded share state, as its link does
//   loadScenarioByKey(key)    build a scenario on its own terms
//   isPaused()                whether it is paused now
//   scenario()                the scenario on screen, by key
//
// This is a feature module and those live in the coordinator and the modules
// it wires; importing them would point this one upward and close a loop back
// through js/embed.js.

/** How often the figure checks whether its reader paused or resumed it. */
const STATUS_MS = 400;

/**
 * Put the figure back where Reset should.
 *
 * `authored` rebuilds the exact state the figure was made from - its bodies,
 * its settings, its camera, whether it opens paused - through the same path
 * its link took. `scenario` rebuilds the scenario that state was made in, on
 * the scenario's own terms. A figure made without a share state has nothing
 * to be authored from, and resets to its scenario either way.
 *
 * @param {Object} opts
 * @param {string} opts.reset - 'authored' or 'scenario'
 * @param {?string} opts.authored - The fragment the figure was opened with
 * @param {Object} opts.services - See the top of this file
 * @returns {Promise<void>}
 */
export async function resetFigure({ reset, authored, services }) {
  if (reset === 'authored' && authored) {
    services.applySharePayload(await decodePayload(authored));
    return;
  }
  const scenario = authored
    ? (await decodePayload(authored)).s
    : services.scenario();
  services.loadScenarioByKey(scenario);
}

/**
 * Start answering the embedding page.
 *
 * @param {Object} opts
 * @param {Object} opts.options - From readEmbedOptions()
 * @param {?string} opts.authored - The share fragment the figure opened with
 * @param {Object} opts.services - See the top of this file
 * @param {Window} [opts.win] - This window, for tests
 * @returns {Function} Stops listening
 */
export function startEmbedBridge({
  options,
  authored,
  services,
  win = window,
}) {
  const parentWin = win.parent;
  if (!parentWin || parentWin === win) return () => {};
  const origin = options.parent;
  const running = () => !services.isPaused();

  if (!origin) {
    parentWin.postMessage(message('ready', { requests: [] }), '*');
    return () => {};
  }

  const send = (type, fields) =>
    parentWin.postMessage(message(type, fields), origin);
  let lastRunning = running();
  const status = () => {
    lastRunning = running();
    send('status', { running: lastRunning });
  };

  const handle = async request => {
    switch (request.type) {
      case 'ping':
        send('ready', { requests: [...REQUESTS], running: running() });
        return;
      case 'play':
        services.setPlaying(true);
        return;
      case 'pause':
        services.setPlaying(false);
        return;
      case 'reset':
        await resetFigure({ reset: options.reset, authored, services });
        return;
      case 'load': {
        let payload;
        try {
          payload = await decodePayload(request.state);
        } catch {
          throw new Error('bad-state');
        }
        services.applySharePayload(payload);
        return;
      }
    }
  };

  const onMessage = event => {
    if (event.source !== parentWin || event.origin !== origin) return;
    const request = readMessage(event.data);
    if (!request.ok) {
      send('error', { id: request.id, code: request.code });
      return;
    }
    handle(request).then(
      () => {
        send('ack', { id: request.id });
        if (request.type !== 'ping') status();
      },
      err => {
        send('error', {
          id: request.id,
          code: err?.message === 'bad-state' ? 'bad-state' : 'failed',
        });
      }
    );
  };

  win.addEventListener('message', onMessage);
  // A reader can pause the figure too; the page hears about it.
  const timer = win.setInterval(() => {
    if (running() !== lastRunning) status();
  }, STATUS_MS);
  send('ready', { requests: [...REQUESTS], running: running() });

  return () => {
    win.removeEventListener('message', onMessage);
    win.clearInterval(timer);
  };
}
