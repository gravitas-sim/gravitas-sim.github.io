/* global self, performance */
// The decode of a 2,048-pixel plane in a Worker, timed in the Worker's own realm
// (the page's CPU throttle does not slow a Worker; the gate multiplies by it).
// Spike code.
import { decodePlane } from '../../js/dataKinds/planes.js';

self.onmessage = e => {
  const { bytes, width, height } = e.data;
  const t0 = performance.now();
  const plane = decodePlane('uint16-le', bytes, width, height);
  const ms = performance.now() - t0;
  self.postMessage({ plane: plane.buffer, ms }, [plane.buffer]);
};
