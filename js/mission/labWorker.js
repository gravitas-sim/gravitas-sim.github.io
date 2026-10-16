// =============================================================================
// The mission lab's Worker: where every mission and window is computed
// -----------------------------------------------------------------------------
// It carries the ephemeris pack, so the page does not: the page asks, this
// realm computes, and the client (./api.js) ends it after each request. The
// protocol is ./labCore.js's.
// =============================================================================

import { handle } from './labCore.js';

self.onmessage = ({ data }) =>
  handle(data, (message, transfer) =>
    self.postMessage(message, transfer || [])
  );
