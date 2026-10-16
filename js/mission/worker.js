// =============================================================================
// The mission core's Worker: where every solve and every window runs
// -----------------------------------------------------------------------------
// The page never computes an orbit; it asks this realm, which a client
// (./api.js) makes fresh for each request and terminates after it. The
// protocol is ./workerCore.js's.
// =============================================================================

import { handle } from './workerCore.js';

self.onmessage = ({ data }) =>
  handle(data, (message, transfer) =>
    self.postMessage(message, transfer || [])
  );
