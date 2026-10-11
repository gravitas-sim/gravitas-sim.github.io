// =============================================================================
// The 3-D lab as an embedded figure: gravitas-embed/1
// -----------------------------------------------------------------------------
// Roadmap II Prompt 105 (EMBEDDING.md, "The 3-D figure"). `/3d/?embed=1` is
// the lab with its page around it removed, and `ev=1` beside it opts into the
// same options and the same messages as the Sandbox's figure
// (js/embedOptions.js, js/embedMessages.js), with the same security model as
// js/embedBridge.js: no parent origin, readiness and nothing else; a parent
// origin, messages only from the parent window and that origin, answers to it
// alone.
//
// What differs, and is said in the figure's `ready`:
//   - the figure starts at reduced quality and reduced motion, whatever the
//     machine; `quality=full` asks for the full tier, and there is no way to
//     ask for more motion, as in the Sandbox's contract
//   - `ready.requests` lists ping, play, pause and reset; `load` is refused
//     with unknown-type, because a 3-D system arrives in the link's fragment
//     (js/lab3d/link.js) and not in a message
//   - `theme` is applied without being remembered; `lang` is read before the
//     catalog loads; `controls=none` removes the transport
//
// Loaded by URL only when `embed=1` is asked for, in a bundle of its own
// (build.js), so the lab's own download does not carry it.
// =============================================================================

import { readEmbedOptions } from '../embedOptions.js';
import { message, readMessage } from '../embedMessages.js';

/** What the figure answers to, in the order `ready` lists them. */
export const REQUESTS = Object.freeze(['ping', 'play', 'pause', 'reset']);
const STATUS_MS = 400;
const THEMES = ['midnight', 'deep', 'observatory', 'daylight'];

/**
 * The options an embed URL asks for, and the settings they imply here.
 * @param {string} search - The page's query string
 * @returns {{options: object, low: boolean, reduced: boolean}}
 */
export function embedSettings(search) {
  const { options } = readEmbedOptions(search);
  return { options, low: options.quality !== 'full', reduced: true };
}

/** Put the figure's page in its embed form (without remembering a theme). */
export function applyEmbed(options, root = document.documentElement) {
  root.dataset.embed = '1';
  if (options.controls === 'none') root.dataset.controls = 'none';
  if (options.theme && THEMES.includes(options.theme)) {
    if (options.theme === 'midnight') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', options.theme);
    root.style.colorScheme = options.theme === 'daylight' ? 'light' : 'dark';
  }
}

/**
 * Start answering the embedding page.
 * @param {object} o
 * @param {object} o.options - From embedSettings()
 * @param {{playing: Function, play: Function, restart: Function}} o.services
 * @param {Window} [o.win] - This window, for tests
 * @returns {Function} Stops listening
 */
export function startBridge({ options, services, win = window }) {
  const parentWin = win.parent;
  if (!parentWin || parentWin === win) return () => {};
  const origin = options.parent;
  if (!origin) {
    parentWin.postMessage(message('ready', { requests: [] }), '*');
    return () => {};
  }
  const send = (type, fields) =>
    parentWin.postMessage(message(type, fields), origin);
  let last = services.playing();
  const status = () => {
    last = services.playing();
    send('status', { running: last });
  };
  const handle = async request => {
    switch (request.type) {
      case 'ping':
        send('ready', { requests: [...REQUESTS], running: services.playing() });
        return;
      case 'play':
        services.play(true);
        return;
      case 'pause':
        services.play(false);
        return;
      case 'reset':
        await services.restart();
        return;
      default:
        throw new Error('unknown-type');
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
      err =>
        send('error', {
          id: request.id,
          code: err?.message === 'unknown-type' ? 'unknown-type' : 'failed',
        })
    );
  };
  win.addEventListener('message', onMessage);
  const timer = win.setInterval(() => {
    if (services.playing() !== last) status();
  }, STATUS_MS);
  send('ready', { requests: [...REQUESTS], running: services.playing() });
  return () => {
    win.removeEventListener('message', onMessage);
    win.clearInterval(timer);
  };
}
