// =============================================================================
// The 3-D kernel's Worker: one disposable realm per run
// -----------------------------------------------------------------------------
// The only place the 3-D kernel integrates. The page never does (it would
// freeze it), and no realm is reused, so no run can see another's bodies
// (MULTI_WORLD_DECISION.md). The protocol is ./workerCore.js's.
// =============================================================================

import { handle } from './workerCore.js';

self.onmessage = ({ data }) =>
  handle(data, (message, transfer) =>
    self.postMessage(message, transfer || [])
  );
