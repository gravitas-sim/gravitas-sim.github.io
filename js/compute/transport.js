// =============================================================================
// The real seams of a session: fetching the frame and framing it
// -----------------------------------------------------------------------------
// The one place the page creates the sandboxed <iframe>. It is
// `sandbox="allow-scripts"` and never `allow-same-origin`, so the frame's
// origin is opaque whatever it is served from: it cannot read this page's
// storage, cookies or DOM, nor this page its. It has no permissions
// (allow=""), sends no referrer, and is hidden: the reader sees the page's own
// controls, not the frame. The compute page's Content-Security-Policy admits
// the compute origin and nothing else as a frame (tools/csp.mjs).
//
// postMessage to an opaque-origin frame can only name '*' as its target, so
// the hello carries nothing a reader would mind another page seeing; what
// follows travels on the MessagePort this hands the frame, which only that
// window holds.
// =============================================================================

import { FRAME_URL } from './origin.js';
import { message } from './messages.js';

/**
 * The frame's document, as text, for the hash check. No cookies, no referrer,
 * no cache, and a redirect is an error.
 * @returns {Promise<string>}
 */
export async function fetchFrame() {
  const r = await fetch(FRAME_URL, {
    cache: 'no-store',
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    redirect: 'error',
  });
  if (!r.ok) throw new Error(`the frame answered ${r.status}`);
  return r.text();
}

/**
 * Frame the document and hand it one port.
 * @param {Document} doc
 * @param {Element} host - Where the hidden frame goes
 * @param {string} title - The frame's accessible name
 * @returns {Promise<{port: MessagePort, close: () => void}>}
 */
export function connect(doc, host, title) {
  return new Promise(resolve => {
    const frame = doc.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.setAttribute('allow', '');
    frame.referrerPolicy = 'no-referrer';
    frame.title = title;
    frame.hidden = true;
    frame.setAttribute('aria-hidden', 'true');
    frame.addEventListener(
      'load',
      () => {
        const channel = new MessageChannel();
        frame.contentWindow.postMessage(message('hello'), '*', [channel.port2]);
        resolve({ port: channel.port1, close: () => frame.remove() });
      },
      { once: true }
    );
    frame.src = FRAME_URL;
    host.append(frame);
  });
}
