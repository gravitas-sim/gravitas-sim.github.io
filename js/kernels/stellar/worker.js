// =============================================================================
// The stellar kernel's Worker: Lane-Emden and white-dwarf integrations off the
// page's thread. The protocol is ./workerCore.js's.
// =============================================================================

import { handle } from './workerCore.js';

self.onmessage = ({ data }) =>
  handle(data, message => self.postMessage(message));
