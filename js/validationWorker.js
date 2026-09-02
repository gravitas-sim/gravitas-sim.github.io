// =============================================================================
// The validation suite, run in a worker
// -----------------------------------------------------------------------------
// The /validation/ page ships a committed results table, and a reader is
// entitled to ask whether those numbers are real. So the page can run the whole
// suite again, in front of them, on their machine, against the same modules the
// simulation itself loads.
//
// It runs here rather than on the page's own thread because the suite integrates
// orbits for about ten seconds and would otherwise freeze the tab solid for the
// whole of it. Nothing here touches the DOM: physics-checks.mjs installs a stub
// document when it does not find one, which is exactly the situation in a
// worker.
//
// Reusing the real suite matters more than it looks. A page that recomputed a
// few headline numbers with its own copy of the arithmetic would be checking
// that copy, not the engine.
// =============================================================================

import { runChecks } from '../tools/physics-checks.mjs';

self.onmessage = async () => {
  const started = performance.now();
  try {
    const checks = await runChecks();
    const passed = checks.filter(c => c.pass).length;
    self.postMessage({
      ok: true,
      passed,
      failed: checks.length - passed,
      elapsedMs: Math.round(performance.now() - started),
      checks,
    });
  } catch (err) {
    // A worker that dies silently looks identical to one that is still
    // thinking, so the page is told what went wrong and can say so.
    self.postMessage({ ok: false, error: String(err?.message || err) });
  }
};
