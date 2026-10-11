// Prototype (spike): the sampler as a disposable Worker task, as the inference
// core runs its fits. A run message builds the gate's problem inside the
// Worker, advances the ensembles in batches sized to about 25 ms (measured),
// posts progress after every batch and yields between batches so that a
// cancel message is read within one batch. Answers with the report (the
// diagnostics, the trace tables and, only if the diagnostics pass, the
// summary), never the chain.
import { createRun } from './ensemble.js';
import { report } from './diagnostics.js';
import { problemG, problemB, problemP, problemT } from './problems.js';

let canceled = false;
self.onmessage = async e => {
  const m = e.data;
  if (m.type === 'cancel') {
    canceled = true;
    return;
  }
  if (m.type !== 'run') return;
  canceled = false;
  const problem =
    m.problem === 'G'
      ? problemG()
      : m.problem === 'B'
        ? problemB()
        : m.problem === 'P'
          ? problemP()
          : problemT(m.case || 'hd209458', m.noiseSeed || 1);
  const steps = m.steps ?? problem.steps;
  const run = createRun({
    logProb: problem.logProb,
    d: problem.d,
    steps,
    seed: `p103-${problem.id}-${m.seed || 1}`,
    center: problem.center,
    scale: problem.scale,
    lo: problem.lo,
    hi: problem.hi,
  });
  const t0 = performance.now();
  let batch = 1;
  let lastProgress = t0;
  let maxGap = 0;
  const heap0 = performance.memory ? performance.memory.usedJSHeapSize : 0;
  let heapPeak = heap0;
  while (!run.done()) {
    const b0 = performance.now();
    run.advance(batch);
    const dt = performance.now() - b0;
    // aim at 25 ms per batch
    batch = Math.max(1, Math.round((batch * 25) / Math.max(1, dt)));
    const now = performance.now();
    maxGap = Math.max(maxGap, now - lastProgress);
    lastProgress = now;
    if (performance.memory)
      heapPeak = Math.max(heapPeak, performance.memory.usedJSHeapSize);
    self.postMessage({ type: 'progress', step: run.step(), steps });
    await new Promise(r => setTimeout(r, 0));
    if (canceled) {
      self.postMessage({ type: 'canceled', ms: performance.now() - t0 });
      return;
    }
  }
  const ms = performance.now() - t0;
  const rep = report(run, problem.names);
  self.postMessage({
    type: 'done',
    ms,
    maxProgressGapMs: maxGap,
    retainedBytes: run.retainedBytes(),
    heapGrowthBytes: heapPeak - heap0,
    status: rep.status,
    reasons: rep.reasons,
    diagnostics: rep.diagnostics,
  });
};
