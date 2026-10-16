// =============================================================================
// The messages an embedded figure exchanges with its page: gravitas-embed/1
// -----------------------------------------------------------------------------
// Pure: what a message may look like, and what the figure sends. Whether one
// is obeyed at all - the origin it came from, the window that sent it - is
// js/embedBridge.js's to decide, before anything here reads it.
//
// Every message is a plain object:
//
//   { protocol: 'gravitas-embed', version: 1, type, id?, state? }
//
// A page may send  ping | play | pause | reset | load
// The figure sends ready | status | ack | error
//
// `id` is the page's own label for a request, echoed in the ack or error;
// `state` is a Gravitas share fragment, and only `load` carries one. Anything
// else in a message - another key, a longer id, a bigger message - is refused
// rather than ignored: a small contract that refuses what it does not define
// is one that can grow later without a page's old messages meaning something
// new. EMBEDDING.md is the public description.
// =============================================================================

export const PROTOCOL = 'gravitas-embed';
export const PROTOCOL_VERSION = 1;

/** What a page may ask for, in the order `ready` lists them. */
export const REQUESTS = Object.freeze([
  'ping',
  'play',
  'pause',
  'reset',
  'load',
]);

/** The largest message read at all, as JSON. */
export const MAX_MESSAGE_CHARS = 16384;

/** A share fragment's shape; decoding is what says it is a real one. */
const STATE = /^#?\d+[zr][A-Za-z0-9_-]+$/;
/** Longer than any address bar keeps comfortably, and the payload's limit. */
export const MAX_STATE_CHARS = 8000;
const ID = /^[A-Za-z0-9_.:-]{1,64}$/;
const KEYS = new Set(['protocol', 'version', 'type', 'id']);

/**
 * Read a message a page sent.
 *
 * @param {*} data - MessageEvent.data, as the structured clone delivered it
 * @returns {{ok: true, type: string, id: ?string, state?: string} |
 *   {ok: false, code: string, id: ?string}} code is one of bad-message,
 *   unsupported-version, unknown-type, bad-state
 */
export function readMessage(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, code: 'bad-message', id: null };
  }
  if (Object.getPrototypeOf(data) !== Object.prototype) {
    return { ok: false, code: 'bad-message', id: null };
  }
  let size;
  try {
    size = JSON.stringify(data).length;
  } catch {
    return { ok: false, code: 'bad-message', id: null };
  }
  const id = typeof data.id === 'string' && ID.test(data.id) ? data.id : null;
  if (size > MAX_MESSAGE_CHARS) return { ok: false, code: 'bad-message', id };
  if (data.protocol !== PROTOCOL) return { ok: false, code: 'bad-message', id };
  if (data.version !== PROTOCOL_VERSION) {
    return { ok: false, code: 'unsupported-version', id };
  }
  if ('id' in data && id === null)
    return { ok: false, code: 'bad-message', id };
  if (!REQUESTS.includes(data.type)) {
    return { ok: false, code: 'unknown-type', id };
  }
  for (const key of Object.keys(data)) {
    if (!KEYS.has(key) && !(key === 'state' && data.type === 'load')) {
      return { ok: false, code: 'bad-message', id };
    }
  }
  if (data.type === 'load') {
    const state = data.state;
    if (
      typeof state !== 'string' ||
      state.length > MAX_STATE_CHARS ||
      !STATE.test(state)
    ) {
      return { ok: false, code: 'bad-state', id };
    }
    return { ok: true, type: 'load', id, state: state.replace(/^#/, '') };
  }
  return { ok: true, type: data.type, id };
}

/**
 * A message the figure sends.
 * @param {string} type - ready | status | ack | error
 * @param {Object} [fields] - Its own fields
 * @returns {Object} The message
 */
export const message = (type, fields = {}) => ({
  protocol: PROTOCOL,
  version: PROTOCOL_VERSION,
  type,
  ...fields,
});
