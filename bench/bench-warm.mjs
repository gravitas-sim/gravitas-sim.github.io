// MEASUREMENT ONLY. The returning-student case for the CURRENT deployment:
// same page, same profile, but with the service worker already installed and
// its precache populated. Establishes the bar any deploy rewrite must not
// regress. Candidate B cannot be measured this way until the service-worker
// generator describes the built tree, which is a deliverable of the rewrite,
// not something to fake here.
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const URL_A = 'http://localhost:8031';
const LESSON = 'keplers-laws';
const TRIALS = Number(process.env.TRIALS || 7);

const NET = { offline: false, downloadThroughput: (4 * 1024 * 1024) / 8, uploadThroughput: (1 * 1024 * 1024) / 8, latency: 80 };
const CPU_RATE = 4;
const VIEWPORT = { width: 1366, height: 768 };

const POLLER = `
window.__ready = null; window.__fcp = null;
try { new PerformanceObserver(l => { for (const e of l.getEntries())
  if (e.name === 'first-contentful-paint' && window.__fcp === null) window.__fcp = e.startTime;
}).observe({ type: 'paint', buffered: true }); } catch {}
(function poll(){
  if (window.__ready === null) {
    const q = s => document.querySelector(s);
    const p = q('#investigationProgressText'), t = q('#investigationBody .inv-step-title'), n = q('#investigationNext');
    let ok = false;
    if (p && t && n && /^1 of \\d+ steps/.test((p.textContent||'').trim()) && (t.textContent||'').trim() && !n.disabled) {
      const r = n.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        const h = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
        ok = !!h && (h === n || n.contains(h));
      }
    }
    if (ok) window.__ready = performance.now();
  }
  requestAnimationFrame(poll);
})();
`;

const browser = await chromium.launch();
// One persistent context so the service worker survives between navigations,
// which is the whole point of this run.
const ctx = await browser.newContext({ viewport: VIEWPORT });
// Clear saved lesson progress before every load, keep the service-worker
// cache. Without this the second trial resumes on step 2 - the click that
// validates trial 1 is itself persisted - and the readiness predicate, which
// requires step 1, waits forever. The cold runs use a fresh context each time
// and never saw it.
await ctx.addInitScript(`try{
  for (const k of Object.keys(localStorage)) if (/investigation|lesson|progress|session/i.test(k)) localStorage.removeItem(k);
  localStorage.setItem('gravitas_welcome_seen_v1','1');
}catch{}`);
await ctx.addInitScript(POLLER);

// Install pass: let the worker register and finish precaching, unthrottled so
// this setup does not take all afternoon. Not measured.
{
  const page = await ctx.newPage();
  await page.goto(URL_A + '/', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    return !!(r && r.active);
  }, null, { timeout: 120000 });
  // Give the precache time to settle, then confirm the cache is populated.
  await page.waitForTimeout(20000);
  const cached = await page.evaluate(async () => {
    const keys = await caches.keys();
    let n = 0;
    for (const k of keys) n += (await (await caches.open(k)).keys()).length;
    return { keys, entries: n, controlled: !!navigator.serviceWorker.controller };
  });
  console.log('precache after install:', JSON.stringify(cached));
  await page.close();
}

const rows = [];
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions', NET);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_RATE });
let requests = 0, transferred = 0;
cdp.on('Network.responseReceived', () => requests++);
cdp.on('Network.loadingFinished', e => { transferred += e.encodedDataLength || 0; });

for (let i = 0; i < TRIALS; i++) {
  requests = 0; transferred = 0;
  await page.goto('about:blank');
  await page.goto(`${URL_A}/#investigation=${LESSON}`, { waitUntil: 'commit', timeout: 120000 });
  await page.waitForFunction(() => window.__ready !== null, null, { timeout: 120000 });
  const ready = await page.evaluate('window.__ready');
  const fcp = await page.evaluate('window.__fcp');
  await page.click('#investigationNext');
  await page.waitForFunction(
    () => /^2 of \d+ steps/.test((document.querySelector('#investigationProgressText') || {}).textContent || ''),
    null, { timeout: 30000 }
  );
  rows.push({ ready, fcp, requests, transferred });
  console.log(`warm trial ${i + 1}: ready ${ready.toFixed(0)} ms  fcp ${fcp === null ? 'n/a' : fcp.toFixed(0)}  ${requests} req  ${(transferred / 1024).toFixed(0)} KB xfer`);
}
await browser.close();

const s = [...rows.map(r => r.ready)].sort((a, b) => a - b);
const at = p => s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))];
const out = { rows, median: at(0.5), p25: at(0.25), p75: at(0.75), min: s[0], max: s[s.length - 1] };
writeFileSync('bench-warm-results.json', JSON.stringify(out, null, 2));
console.log('\n' + JSON.stringify(out, null, 2));
