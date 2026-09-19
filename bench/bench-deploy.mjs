// MEASUREMENT ONLY. Compares the currently-deployed tree against a built-tree
// prototype, both staged from the same commit. Touches no deploy machinery.
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const CANDIDATES = {
  A: { label: 'current deployment (git archive, unbundled)', url: 'http://localhost:8031' },
  B: { label: 'built deployment prototype (dist/)', url: 'http://localhost:8032' },
};
const LESSON = 'keplers-laws';
const TRIALS = Number(process.env.TRIALS || 7);
const WARMUPS = 1;

// --- the reproducible profile ------------------------------------------------
// A 2019-Chromebook-class machine on a loaded school connection. Both numbers
// are emulation, not a real device; what matters is that both candidates see
// exactly the same one.
const NET = {
  offline: false,
  downloadThroughput: (4 * 1024 * 1024) / 8, // 4 Mbit/s
  uploadThroughput: (1 * 1024 * 1024) / 8,   // 1 Mbit/s
  latency: 80,                                // ms RTT
};
const CPU_RATE = 4;
const VIEWPORT = { width: 1366, height: 768 };

/**
 * The primary metric, defined mechanically and injected before navigation.
 *
 * Ready means all four of the things a student needs, and nothing weaker:
 *   the shell is up          - the investigation panel has laid out
 *   the lesson has loaded    - progress reads step 1 of N
 *   step 1 is rendered       - the step title has text
 *   its control can be used  - Next is present, enabled, has a box, and is the
 *                              element at its own centre, which is what proves
 *                              the welcome door is not covering it
 *
 * Step 1 of keplers-laws is a `read` step, so its control is Next. Polled on
 * rAF, so the timestamp is also evidence the main thread is servicing frames.
 */
const POLLER = `
window.__t0 = performance.now();
window.__ready = null;
window.__fcp = null;
try {
  new PerformanceObserver(list => {
    for (const e of list.getEntries()) {
      if (e.name === 'first-contentful-paint' && window.__fcp === null) window.__fcp = e.startTime;
    }
  }).observe({ type: 'paint', buffered: true });
} catch {}
(function poll() {
  if (window.__ready === null) {
    const q = s => document.querySelector(s);
    const prog = q('#investigationProgressText');
    const title = q('#investigationBody .inv-step-title');
    const next = q('#investigationNext');
    let ok = false;
    if (prog && title && next && /^1 of \\d+ steps/.test((prog.textContent||'').trim())
        && (title.textContent||'').trim().length > 0 && !next.disabled) {
      const r = next.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        ok = !!hit && (hit === next || next.contains(hit));
      }
    }
    if (ok) window.__ready = performance.now();
  }
  requestAnimationFrame(poll);
})();
`;

async function trial(browser, url, { measured }) {
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    // Cold every time: a fresh context has an empty HTTP cache and empty
    // storage. Explicitly no service worker, so this measures the network and
    // parse path rather than a precache race. The returning-student case is a
    // separate run below.
    serviceWorkers: 'block',
  });
  // A student who has seen the splash before. Set identically in both
  // candidates, before any script runs, so the welcome door is not in the way
  // and no human reaction time enters the number.
  await ctx.addInitScript(`try{localStorage.setItem('gravitas_welcome_seen_v1','1')}catch{}`);
  await ctx.addInitScript(POLLER);

  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', NET);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_RATE });

  let requests = 0, transferred = 0, decoded = 0;
  cdp.on('Network.responseReceived', () => { requests++; });
  cdp.on('Network.loadingFinished', e => {
    transferred += e.encodedDataLength || 0;
  });
  cdp.on('Network.dataReceived', e => { decoded += e.dataLength || 0; });

  const started = Date.now();
  await page.goto(`${url}/#investigation=${LESSON}`, { waitUntil: 'commit', timeout: 120000 });

  await page.waitForFunction(() => window.__ready !== null, null, { timeout: 120000 });
  const ready = await page.evaluate('window.__ready');
  const fcp = await page.evaluate('window.__fcp');

  // Validity: the control must really respond. A trial whose Next does not
  // advance the lesson is not a trial, it is a false positive on the predicate.
  await page.click('#investigationNext');
  await page.waitForFunction(
    () =>
      /^2 of \d+ steps/.test(
        (document.querySelector('#investigationProgressText') || {}).textContent || ''
      ),
    null,
    { timeout: 30000 }
  );

  await ctx.close();
  return measured ? { ready, fcp, requests, transferred, decoded, wall: Date.now() - started } : null;
}

const results = {};
const browser = await chromium.launch();
console.log(`chromium ${browser.version()}`);
console.log(`profile: ${NET.downloadThroughput * 8 / 1024 / 1024} Mbit/s down, ${NET.latency} ms RTT, CPU x${CPU_RATE}, ${VIEWPORT.width}x${VIEWPORT.height}, service worker BLOCKED\n`);

for (const [key, c] of Object.entries(CANDIDATES)) {
  results[key] = [];
  for (let i = 0; i < WARMUPS; i++) {
    await trial(browser, c.url, { measured: false });
    console.log(`${key} warm-up ${i + 1} done`);
  }
  for (let i = 0; i < TRIALS; i++) {
    const r = await trial(browser, c.url, { measured: true });
    results[key].push(r);
    console.log(`${key} trial ${i + 1}: ready ${r.ready.toFixed(0)} ms  fcp ${r.fcp === null ? 'n/a' : r.fcp.toFixed(0)}  ${r.requests} req  ${(r.transferred / 1024).toFixed(0)} KB xfer`);
  }
}
await browser.close();

const stats = xs => {
  const s = [...xs].sort((a, b) => a - b);
  const at = p => s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))];
  return { min: s[0], p25: at(0.25), median: at(0.5), p75: at(0.75), max: s[s.length - 1] };
};
const summary = {};
for (const k of Object.keys(results)) {
  summary[k] = {
    label: CANDIDATES[k].label,
    ready: stats(results[k].map(r => r.ready)),
    fcp: stats(results[k].map(r => r.fcp ?? NaN)),
    requests: stats(results[k].map(r => r.requests)),
    transferredKB: stats(results[k].map(r => r.transferred / 1024)),
    decodedKB: stats(results[k].map(r => r.decoded / 1024)),
  };
}
const delta = summary.B.ready.median - summary.A.ready.median;
summary.delta = {
  builtMinusCurrentMs: delta,
  percent: (delta / summary.A.ready.median) * 100,
  improvementMs: -delta,
};
writeFileSync('bench-deploy-results.json', JSON.stringify({ profile: { NET, CPU_RATE, VIEWPORT, serviceWorker: 'blocked' }, results, summary }, null, 2));
console.log('\n' + JSON.stringify(summary, null, 2));
