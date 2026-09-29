// T3 and T4: reconnect and late join are exact. A student drops, misses
// commands, and resumes with the count it has; it must end with exactly the
// instructor's log (a rebuilt hash chain equal to the server's digest). A
// student who joins after 200 commands must reach the same digest by replay.

/* global console, performance, setTimeout */
import process from 'node:process';
import { createRelay } from './server.mjs';
import { connect, logCopy, openSession, joinAdmitted } from './client.mjs';

const PORT = Number(process.argv[2] || 4391);
const URL = `ws://127.0.0.1:${PORT}`;
const TRIALS = 100;

// This run is about the log, not the limits: the trials send commands far
// faster than an instructor would, so the rate limits are opened here and
// tested on their own (abuse.mjs). Any refusal fails the run.
const relay = createRelay({
  limits: { joinsPerMinute: 1e6, msgPerSecond: 1e6, msgBurst: 1e6 },
});
await relay.listen(PORT);

const { inst, code, token: instToken } = await openSession(URL);
const refusals = [];
inst.onany = m => m.t === 'error' && refusals.push(m.code);
let n = 0;
const command = () =>
  inst.send({ t: 'cmd', kind: 'broadcast', body: { n: ++n } });

// Five students, each keeping a checked copy of the log.
const students = [];
for (let i = 0; i < 5; i++) {
  const s = await joinAdmitted(URL, inst, code);
  s.copy = logCopy();
  const r = await s.st.next(m => m.t === 'replay');
  r.entries.forEach(s.copy.add);
  s.st.onany = m => m.t === 'log' && s.copy.add(m);
  students.push(s);
}
const settle = () => new Promise(r => setTimeout(r, 30));

const rejoinMs = [];
let exact = 0;
const faults = [];
for (let trial = 0; trial < TRIALS; trial++) {
  const s = students[trial % students.length];
  s.st.onany = null;
  s.st.close();
  await s.st.closed;
  const missed = 1 + Math.floor(Math.random() * 10);
  for (let k = 0; k < missed; k++) command();
  await settle();
  const t0 = performance.now();
  const st = connect(URL);
  await st.opened;
  st.send({ t: 'resume', code, token: s.token, have: s.copy.entries.length });
  const r = await st.next(m => m.t === 'replay' || m.t === 'error');
  if (r.t === 'error') throw new Error(`resume refused: ${r.code}`);
  r.entries.forEach(s.copy.add);
  rejoinMs.push(performance.now() - t0);
  s.st = st;
  s.st.onany = m => m.t === 'log' && s.copy.add(m);
  // Commands keep flowing to everyone, the rejoined student included.
  command();
  await settle();
  const server = relay.sessions.get(code);
  const ok =
    s.copy.faults.length === 0 &&
    s.copy.entries.length === server.log.length &&
    s.copy.digest === server.digest;
  if (ok) exact++;
  else faults.push({ trial, faults: s.copy.faults.slice(0, 3) });
}

// Every student, not only the one that dropped, ends exact.
const server = relay.sessions.get(code);
const allExact = students.every(
  s => s.copy.digest === server.digest && s.copy.faults.length === 0
);

// T4: a late joiner after 200 commands in total.
while (n < 200) command();
await settle();
const late = connect(URL);
await late.opened;
late.send({ t: 'join', code });
const { pid } = await late.next(m => m.t === 'waiting');
await inst.next(m => m.t === 'knock' && m.pid === pid);
const t0 = performance.now();
inst.send({ t: 'admit', pid });
await late.next(m => m.t === 'admitted');
const r = await late.next(m => m.t === 'replay');
const copy = logCopy();
r.entries.forEach(copy.add);
const lateMs = performance.now() - t0;
const lateExact =
  copy.faults.length === 0 &&
  copy.entries.length === relay.sessions.get(code).log.length &&
  copy.digest === relay.sessions.get(code).digest &&
  copy.digest === r.digest;

// The instructor can resume too, and its token is not a student's.
const inst2 = connect(URL);
await inst2.opened;
inst2.send({ t: 'resume', code, token: instToken, have: 0 });
const ir = await inst2.next(m => m.t === 'replay' || m.t === 'error');

rejoinMs.sort((a, b) => a - b);
const q = p =>
  rejoinMs[Math.min(rejoinMs.length - 1, Math.floor(p * rejoinMs.length))];
const result = {
  trials: TRIALS,
  exact,
  allStudentsExact: allExact,
  rejoinMs: { p50: q(0.5), p95: q(0.95), max: rejoinMs.at(-1) },
  lateJoin: { entries: copy.entries.length, exact: lateExact, ms: lateMs },
  instructorResume: ir.t === 'replay' ? ir.entries.length : ir.code,
  faults,
  refusals,
};
result.T3 =
  refusals.length === 0 &&
  exact === TRIALS &&
  allExact &&
  rejoinMs.at(-1) <= 1000
    ? 'pass'
    : 'fail';
result.T4 =
  lateExact && copy.entries.length >= 200 && lateMs <= 200 ? 'pass' : 'fail';
console.log(JSON.stringify(result, null, 2));
await relay.close().catch(() => {});
process.exit(0);
