// T9: how long a WebRTC DataChannel takes to open between an instructor's
// page and a student's, signaled through the relay (offer, answer, and the
// candidates inside them). Two Chromium pages on loopback, 20 pairs.
//
// This measures the easy case on purpose: loopback has no NAT, so host
// candidates connect directly. Across a campus or home network a real
// deployment also needs STUN, and TURN for the networks where peers cannot
// reach each other - a relay service in its own right, and the reason WebRTC
// does not remove the need for a server.

/* global console, window, RTCPeerConnection, WebSocket, performance, setTimeout */
import process from 'node:process';
import { chromium } from 'playwright';
import { createRelay } from './server.mjs';

const PORT = Number(process.argv[2] || 4440);
const TRIALS = 20;
// --default: Chrome's own settings, where host candidates are hidden behind
// random .local names that must resolve by multicast DNS. The measured run
// turns that off, so the loopback addresses are offered as they are.
const DEFAULT = process.argv.includes('--default');
const relay = createRelay({ limits: { joinsPerMinute: 1e6 } });
await relay.listen(PORT);

const browser = await chromium.launch(
  DEFAULT ? {} : { args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] }
);
const version = browser.version();
const ctxA = await browser.newContext();
const ctxB = await browser.newContext();
const inst = await ctxA.newPage();
const stud = await ctxB.newPage();

// The same small client in both pages: a socket, and a queue of messages.
const boot = async (page, url) => {
  await page.setContent('<!doctype html><title>probe</title>');
  await page.evaluate(u => {
    window.q = [];
    window.waiters = [];
    window.ws = new WebSocket(u);
    window.ws.onmessage = e => {
      const m = JSON.parse(e.data);
      const i = window.waiters.findIndex(w => w.p(m));
      if (i >= 0) window.waiters.splice(i, 1)[0].r(m);
      else window.q.push(m);
    };
    window.next = p =>
      new Promise(r => {
        const i = window.q.findIndex(p);
        if (i >= 0) return r(window.q.splice(i, 1)[0]);
        window.waiters.push({ p, r });
      });
    window.gathered = pc =>
      new Promise(r => {
        if (pc.iceGatheringState === 'complete') return r();
        pc.addEventListener('icegatheringstatechange', () => {
          if (pc.iceGatheringState === 'complete') r();
        });
      });
    return new Promise(r => (window.ws.onopen = r));
  }, url);
};
await boot(inst, `ws://127.0.0.1:${PORT}`);
await boot(stud, `ws://127.0.0.1:${PORT}`);

const code = await inst.evaluate(async () => {
  window.ws.send(JSON.stringify({ t: 'create' }));
  return (await window.next(m => m.t === 'created')).code;
});
const pid = await stud.evaluate(async c => {
  window.ws.send(JSON.stringify({ t: 'join', code: c }));
  return (await window.next(m => m.t === 'waiting')).pid;
}, code);
await inst.evaluate(async p => {
  await window.next(m => m.t === 'knock');
  window.ws.send(JSON.stringify({ t: 'admit', pid: p }));
}, pid);
await stud.evaluate(() => window.next(m => m.t === 'admitted'));

// The student answers every offer it is sent.
await stud.evaluate(() => {
  const answer = async () => {
    const m = await window.next(x => x.t === 'signal' && x.kind === 'offer');
    const pc = new RTCPeerConnection();
    pc.ondatachannel = e => {
      e.channel.onmessage = ev => e.channel.send(`echo:${ev.data}`);
    };
    await pc.setRemoteDescription({ type: 'offer', sdp: m.data });
    await pc.setLocalDescription(await pc.createAnswer());
    await window.gathered(pc);
    window.ws.send(
      JSON.stringify({
        t: 'signal',
        to: 'i',
        kind: 'answer',
        data: pc.localDescription.sdp,
      })
    );
    answer();
  };
  answer();
});

const results = [];
for (let i = 0; i < (DEFAULT ? 3 : TRIALS); i++) {
  const r = await inst.evaluate(async p => {
    const t0 = performance.now();
    const pc = new RTCPeerConnection();
    const dc = pc.createDataChannel('probe');
    const opened = new Promise(r => (dc.onopen = r));
    await pc.setLocalDescription(await pc.createOffer());
    await window.gathered(pc);
    const sdp = pc.localDescription.sdp;
    window.ws.send(
      JSON.stringify({ t: 'signal', to: p, kind: 'offer', data: sdp })
    );
    const a = await window.next(m => m.t === 'signal' && m.kind === 'answer');
    await pc.setRemoteDescription({ type: 'answer', sdp: a.data });
    const ok = await Promise.race([
      opened.then(() => true),
      new Promise(r => setTimeout(() => r(false), 10000)),
    ]);
    const openMs = performance.now() - t0;
    let echoMs = null;
    if (ok) {
      const s = performance.now();
      const echo = new Promise(r => (dc.onmessage = e => r(e.data)));
      dc.send('ping');
      await echo;
      echoMs = performance.now() - s;
    }
    pc.close();
    return {
      ok,
      openMs,
      echoMs,
      offerBytes: sdp.length,
      hostMdns: /\.local/.test(sdp),
    };
  }, pid);
  results.push(r);
}
await browser.close();
await relay.close();

const open = results
  .filter(r => r.ok)
  .map(r => r.openMs)
  .sort((a, b) => a - b);
const q = p => open[Math.min(open.length - 1, Math.floor(p * open.length))];
const n = 36; // a class: the instructor and 35 students
const out = {
  browser: `Chromium ${version} (Playwright, headless)`,
  mdnsHiding: DEFAULT
    ? 'on (Chrome default)'
    : 'off (--disable-features=WebRtcHideLocalIpsWithMdns)',
  trials: DEFAULT ? 3 : TRIALS,
  opened: open.length,
  openMs: { p50: q(0.5), p95: q(0.95), max: open.at(-1) },
  echoMs: results
    .map(r => r.echoMs)
    .filter(x => x !== null)
    .sort((a, b) => a - b)[Math.floor(TRIALS / 2)],
  offerBytes: results[0]?.offerBytes,
  mdnsHostCandidates: results.some(r => r.hostMdns),
  connectionsFor36: { mesh: (n * (n - 1)) / 2, star: n - 1 },
};
out.T9 = DEFAULT
  ? 'not a T9 run'
  : open.length === TRIALS && q(0.95) <= 2000
    ? 'pass'
    : 'fail';
console.log(JSON.stringify(out, null, 2));
process.exit(0);
