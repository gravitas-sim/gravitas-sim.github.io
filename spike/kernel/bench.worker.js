// SPIKE (Prompt 21): the optimized JavaScript kernels in a Worker, timed there.
import { glsJs, blsJs } from './kernels.mjs';
self.onmessage = e => {
  const d = e.data;
  const t0 = performance.now();
  const power = d.kind === 'gls' ? glsJs(d.t, d.y, d.dy, d.f0, d.df, d.m) : blsJs(d.t, d.y, null, d.periods, d.dmin, d.durations);
  const compute = performance.now() - t0;
  self.postMessage({ compute, power }, [power.buffer]);
};
