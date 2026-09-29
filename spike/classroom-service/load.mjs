// T1 and T2: 40 sessions of 1 instructor and 35 students (1,440 connections)
// against one relay process, for 60 s. Every instructor broadcasts once a
// second and every student sends a 1 Hz status. Latency is instructor send to
// student receipt, timed in this process (every client is here, so one clock).
// The relay runs as its own process so its memory is its own.
//
// All clients share 127.0.0.1, so the per-address join limit is opened for
// the run; the per-connection message limit keeps its default (a 1 Hz client
// is far under it).

/* global console, performance, setTimeout, setInterval, clearInterval, fetch, URL */
import process from 'node:process';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { openSession, joinAdmitted } from './client.mjs';

const PORT = Number(process.argv[2] || 4430);
const SESSIONS = Number(process.argv[3] || 40);
const STUDENTS = Number(process.argv[4] || 35);
const SECONDS = Number(process.argv[5] || 60);
const WS = `ws://127.0.0.1:${PORT}`;
const pause = ms => new Promise(r => setTimeout(r, ms));
const stats = () => fetch(`http://127.0.0.1:${PORT}/stats`).then(r => r.json());

const server = spawn(
  process.execPath,
  [
    '--expose-gc',
    fileURLToPath(new URL('./server.mjs', import.meta.url)),
    String(PORT),
    JSON.stringify({ joinsPerMinute: 1e7, maxMembers: STUDENTS + 5 }),
  ],
  { stdio: ['ignore', 'pipe', 'inherit'] }
);
await new Promise(r => server.stdout.once('data', r));
await pause(300);
const idle = await stats();

const lat = [];
const errors = [];
const sessions = [];
const t0 = performance.now();
for (let i = 0; i < SESSIONS; i++) {
  const s = await openSession(WS);
  s.inst.onany = m => m.t === 'error' && errors.push(m.code);
  s.students = [];
  for (let j = 0; j < STUDENTS; j++) {
    const a = await joinAdmitted(WS, s.inst, s.code);
    a.st.onany = m => {
      if (m.t === 'log' && typeof m.body.sent === 'number')
        lat.push(performance.now() - m.body.sent);
      else if (m.t === 'error') errors.push(m.code);
    };
    s.students.push(a);
  }
  s.inst.clear();
  sessions.push(s);
}
const setupMs = performance.now() - t0;
for (const s of sessions) for (const a of s.students) a.st.clear();
const loaded = await stats();

// Steady state: staggered 1 Hz broadcasts and 1 Hz statuses.
const timers = [];
sessions.forEach((s, i) => {
  setTimeout(
    () => {
      timers.push(
        setInterval(() => {
          s.inst.send({
            t: 'cmd',
            kind: 'broadcast',
            body: { sent: performance.now() },
          });
        }, 1000)
      );
    },
    (i * 1000) / SESSIONS
  );
  s.students.forEach(a => {
    setTimeout(() => {
      let step = 0;
      timers.push(
        setInterval(
          () => a.st.send({ t: 'status', step: step++ % 40, done: false }),
          1000
        )
      );
    }, Math.random() * 1000);
  });
});
// Instructors receive 35 statuses a second each; discard them, count them.
let statuses = 0;
for (const s of sessions)
  s.inst.onany = m =>
    m.t === 'status' ? statuses++ : m.t === 'error' && errors.push(m.code);

const cpu0 = (await stats()).cpuMicros;
const w0 = performance.now();
await pause(SECONDS * 1000);
const peak = await stats();
const wallMs = performance.now() - w0;
timers.forEach(clearInterval);
await pause(500);

lat.sort((a, b) => a - b);
const q = p => lat[Math.min(lat.length - 1, Math.floor(p * lat.length))];
const conns = SESSIONS * (STUDENTS + 1);
const perConnKB = (peak.rss - idle.rss) / conns / 1024;
const out = {
  machine: `${process.platform} ${process.arch}, Node ${process.version}`,
  sessions: SESSIONS,
  connections: conns,
  setupSeconds: setupMs / 1000,
  seconds: SECONDS,
  broadcastsReceived: lat.length,
  expectedAboutBroadcasts: SESSIONS * STUDENTS * SECONDS,
  statusesToInstructors: statuses,
  latencyMs: { p50: q(0.5), p95: q(0.95), p99: q(0.99), max: lat.at(-1) },
  serverRssMB: {
    idle: idle.rss / 2 ** 20,
    admitted: loaded.rss / 2 ** 20,
    underLoad: peak.rss / 2 ** 20,
  },
  perConnectionKB: perConnKB,
  serverCpuShareOfOneCore: (peak.cpuMicros - cpu0) / 1000 / wallMs,
  errors: [...new Set(errors)],
};
out.T1 =
  q(0.95) <= 100 && q(0.99) <= 250 && errors.length === 0 ? 'pass' : 'fail';
out.T2 = perConnKB <= 150 ? 'pass' : 'fail';
console.log(JSON.stringify(out, null, 2));
server.kill();
process.exit(0);
