/* global console, process */
// T1.* from the Node 22 builds of measure.sh. usage: node bytes.mjs <scratch m dir> kernelbytes.json thresholds.json out.json
import { readFileSync, writeFileSync } from 'node:fs';
const [, , M, kbPath, thrPath, out] = process.argv;
const T = JSON.parse(readFileSync(thrPath, 'utf8'));
const lim = id => T.checks.find(c => c.id === id).limits;
const rep = d => JSON.parse(readFileSync(`${M}/${d}.report.json`, 'utf8'));
const kb = JSON.parse(readFileSync(kbPath, 'utf8'));
const parse = f => {
  const rows = {};
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    const m = line.match(/^(sources|build)\s+(\S+)\s+([\d.]+) KB\s+(\d+) requests(?:\s+instrument ([\d.]+) KB (\d+) requests)?/);
    if (!m) continue;
    rows[`${m[1]}:${m[2]}`] = { kb: +m[3], req: +m[4] };
    if (m[5]) rows[`${m[1]}:${m[2]}:instrument`] = { kb: +m[5], req: +m[6] };
  }
  return rows;
};
const precache = (d, key) => +readFileSync(`${M}/${d}.data.log`, 'utf8').match(new RegExp(`${key}\\s+(\\d+) of`))[1];
const b = rep('base');
const diff = d => ({
  deferredAddedGzipB: rep(d).deferredJsGzipBytes - b.deferredJsGzipBytes,
  chunksAdded: rep(d).deferredChunks - b.deferredChunks,
  firstVisitAddedB: precache(d, 'precacheFirstVisitGzipBytes') - precache('base', 'precacheFirstVisitGzipBytes'),
  idleAddedB: precache(d, 'precacheIdleGzipBytes') - precache('base', 'precacheIdleGzipBytes'),
});
const routes = d => {
  const A = parse(`${M}/base.routes.log`);
  const B = parse(`${M}/${d}.routes.log`);
  let rise = 0;
  let req = 0;
  const worst = [];
  for (const k of Object.keys(A)) {
    const r = Math.round((B[k].kb - A[k].kb) * 10) / 10;
    rise = Math.max(rise, r);
    req = Math.max(req, B[k].req - A[k].req);
    if (r > 0 || B[k].req !== A[k].req) worst.push({ route: k, riseKb: r, requestsAdded: B[k].req - A[k].req });
  }
  return { routeRiseKbMax: rise, requestsAddedMax: req, changed: worst };
};
const ep = diff('ep');
const whole = diff('whole');
const rtw = routes('whole');
const rte = routes('ep');
const st = (pass, measured, note) => ({ status: pass ? 'pass' : 'fail', measured, ...(note ? { note } : {}) });
const checks = {
  'T1.ep.deferred': st(ep.deferredAddedGzipB <= lim('T1.ep.deferred').deferredGzipMax && kb.kernelEp.gzip <= lim('T1.ep.deferred').kernelGzipMax, { deferredAddedGzipB: ep.deferredAddedGzipB, kernelAloneGzipB: kb.kernelEp.gzip, kernelAloneRawB: kb.kernelEp.raw }),
  'T1.whole.deferred': st(whole.deferredAddedGzipB <= lim('T1.whole.deferred').deferredGzipMax && kb.kernelWhole.gzip <= lim('T1.whole.deferred').kernelGzipMax, { deferredAddedGzipB: whole.deferredAddedGzipB, kernelAloneGzipB: kb.kernelWhole.gzip, kernelAloneRawB: kb.kernelWhole.raw }),
  'T1.requests': st(whole.chunksAdded <= lim('T1.requests').chunksMax, { chunksAddedWhole: whole.chunksAdded, chunksAddedEp: ep.chunksAdded }),
  'T1.tier': st(Math.max(ep.firstVisitAddedB, whole.firstVisitAddedB) <= lim('T1.tier').firstVisitAddedMax && Math.max(ep.idleAddedB, whole.idleAddedB) <= lim('T1.tier').idleAddedMax, { firstVisitAddedB: whole.firstVisitAddedB, firstVisitAddedEpB: ep.firstVisitAddedB, idleAddedB: whole.idleAddedB }, 'the base build is exactly at tools/data-budget.json first-visit precache ceiling (5,188,079 B): any addition is over it; no budget file was edited'),
  'T1.routes': st(rtw.routeRiseKbMax <= lim('T1.routes').routeRiseKbMax && rtw.requestsAddedMax <= lim('T1.routes').requestsAddedMax && rte.routeRiseKbMax <= lim('T1.routes').routeRiseKbMax, { whole: rtw, ep: rte }),
};
writeFileSync(out, JSON.stringify(checks, null, 2));
console.log(JSON.stringify(Object.fromEntries(Object.entries(checks).map(([k, v]) => [k, [v.status, v.measured]])), null, 1).slice(0, 2500));
