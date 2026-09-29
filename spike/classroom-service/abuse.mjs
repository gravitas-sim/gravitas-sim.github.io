// T5, T6 and T7: session guessing, malicious payloads, instructor privilege.
//
// T5  What a guessed code is worth, and whether the per-address join limit
//     holds. A code only puts a connection in the lobby; the instructor sees a
//     knock and admits or refuses it, so guessing a code is not joining.
// T6  10,000 fuzzed messages from connections inside and outside an honest
//     session, while an honest instructor and student measure their round
//     trip. Every one must be refused with a typed error (or, for an
//     over-size frame, a close with the RFC's code), none may reach the
//     honest student, and the server must not fall over or slow down.
// T7  An admitted student's connection tries every instructor-only command.

/* global console, performance, setTimeout */
import process from 'node:process';
import { createRelay, CODE_LENGTH } from './server.mjs';
import { INSTRUCTOR_ONLY, CMD_KINDS } from './protocol.mjs';
import { connect, openSession, joinAdmitted } from './client.mjs';

const PORT = Number(process.argv[2] || 4394);
const URL = `ws://127.0.0.1:${PORT}`;
const pause = ms => new Promise(r => setTimeout(r, ms));
const out = {};

// ---- T5: the join limit, with the defaults --------------------------------
{
  const relay = createRelay();
  await relay.listen(PORT);
  const { inst, code } = await openSession(URL);
  const g = connect(URL);
  await g.opened;
  const replies = [];
  g.onany = m => replies.push(m.code || m.t);
  // Thirty wrong codes from one address, as fast as it can send them. Each
  // guess needs a fresh connection in real life (a joined connection cannot
  // join again), so the guesser reconnects each time, from the same address.
  for (let i = 0; i < 30; i++) {
    const c = connect(URL);
    await c.opened;
    c.onany = m => replies.push(m.code || m.t);
    c.send({ t: 'join', code: 'ZZZZZZ' === code ? 'YYYYYY' : 'ZZZZZZ' });
    await pause(2);
    c.close();
  }
  await pause(100);
  const noSession = replies.filter(r => r === 'noSession').length;
  const limited = replies.filter(r => r === 'tooManyJoins').length;
  // The right code, knocked: the instructor sees it, and refuses it, and the
  // knocker sees no log and cannot send a status.
  const k = connect(URL);
  await k.opened;
  const kseen = [];
  k.onany = m => kseen.push(m.t === 'error' ? m.code : m.t);
  relay.sessions.get(code) && (relay.counts.refused = {});
  // A fresh address budget is not available on loopback, so the knock uses
  // the relay's own join path directly after the limit refills.
  await pause(6100); // one join token back at 10 a minute
  k.send({ t: 'join', code });
  const knock = await inst.next(m => m.t === 'knock');
  inst.send({ t: 'cmd', kind: 'broadcast', body: { text: 'secret' } });
  k.send({ t: 'status', step: 1, done: false });
  await pause(50);
  inst.send({ t: 'refuse', pid: knock.pid });
  const kclosed = await k.closed;
  const alphabet = 31;
  const space = alphabet ** CODE_LENGTH;
  const live = 1000;
  const guesses = 1000 * 10 * 60; // addresses x joins a minute x minutes
  out.T5 = {
    joinLimitPerMinute: 10,
    attemptsFromOneAddress: 30,
    answeredNoSession: noSession,
    refusedTooManyJoins: limited,
    codeSpace: space,
    guessesInAnHour: guesses,
    chanceOfAnyCodeHitInAnHour: 1 - Math.pow(1 - live / space, guesses),
    knockerSaw: kseen,
    knockerClosedWith: kclosed,
    verdict:
      noSession === 10 &&
      limited === 20 &&
      !kseen.includes('log') &&
      kseen.includes('forbidden') &&
      kseen.includes('refused')
        ? 'pass'
        : 'fail',
    note: 'A guessed code only knocks: the instructor admits or refuses every knock, so T5 passes by admission, not by the code being unguessable.',
  };
  await relay.close().catch(() => {});
  await pause(50);
}

// ---- T6 and T7: fuzz and privilege ----------------------------------------
{
  // The fuzzing connections send far faster than a person, so the per-message
  // limit is opened here to put every message through the parser; the limit
  // itself is checked at the end with the defaults.
  const relay = createRelay({
    limits: { joinsPerMinute: 1e6, msgPerSecond: 1e6, msgBurst: 1e6 },
  });
  await relay.listen(PORT + 1);
  const U = `ws://127.0.0.1:${PORT + 1}`;
  const honest = await openSession(U);
  const hs = await joinAdmitted(U, honest.inst, honest.code);
  await hs.st.next(m => m.t === 'replay');
  const unexpected = [];
  hs.st.onany = m => {
    if (m.t !== 'log' || typeof m.body?.sent !== 'number') unexpected.push(m);
  };

  // Round trip: instructor command to student receipt.
  const rtt = async samples => {
    const ms = [];
    for (let i = 0; i < samples; i++) {
      const sent = performance.now();
      honest.inst.send({ t: 'cmd', kind: 'broadcast', body: { sent } });
      const m = await hs.st.next(x => x.t === 'log' && x.body?.sent === sent);
      ms.push(performance.now() - m.body.sent);
      await pause(5);
    }
    ms.sort((a, b) => a - b);
    return ms[Math.floor(ms.length / 2)];
  };
  // A discarded warm-up first: the first run's baseline was taken cold and
  // the fuzzed run came out 22% faster than it, outside the +-20% band on the
  // wrong side. The threshold is unchanged; only the baseline is warm now.
  await rtt(400);
  const before = await rtt(400);

  // The attackers: one admitted into the honest session as a student, one
  // running its own session as an instructor (to reach the body checks and to
  // try to write into another session), and one never joined.
  const asStudent = await joinAdmitted(U, honest.inst, honest.code, 'mallory');
  await asStudent.st.next(m => m.t === 'replay');
  const own = await openSession(U);
  const bare = connect(U);
  await bare.opened;

  const deep = d => (d ? { a: deep(d - 1) } : 1);
  const rnd = n => Math.floor(Math.random() * n);
  const junk = n =>
    Array.from({ length: n }, () => String.fromCharCode(rnd(0xd7ff))).join('');
  const cases = [
    () => junk(1 + rnd(80)), // not JSON
    () => JSON.stringify([rnd(9), 'x']), // not an object
    () => JSON.stringify(rnd(2) ? null : 'help'),
    () => JSON.stringify({ t: 'x' + rnd(1e6) }), // unknown type
    () => JSON.stringify({ t: 'join', code: junk(6) }), // bad code
    () => JSON.stringify({ t: 'join', code: honest.code, extra: 1 }),
    () => JSON.stringify({ t: 'status', step: -1, done: 'yes' }),
    () => JSON.stringify({ t: 'status', step: 1.5, done: true }),
    () => '{"t":"help","__proto__":{"admin":true}}',
    () => '{"t":"help","constructor":{"prototype":{}}}',
    () => JSON.stringify({ t: 'cmd', kind: 'broadcast', body: deep(12) }),
    () => JSON.stringify({ t: 'cmd', kind: 'nuke', body: {} }),
    () =>
      JSON.stringify({
        t: 'cmd',
        kind: 'broadcast',
        body: { x: 'y'.repeat(300) },
      }),
    () =>
      JSON.stringify({
        t: 'cmd',
        kind: 'broadcast',
        body: { a: Array(100).fill(1) },
      }),
    () => JSON.stringify({ t: 'help', pad: 'z'.repeat(5000) }), // over 4 KB
    () =>
      JSON.stringify({
        t: 'resume',
        code: honest.code,
        token: 'A'.repeat(22),
        have: 0,
      }),
    () =>
      JSON.stringify({
        t: 'resume',
        code: honest.code,
        token: honest.token,
        have: 1e9,
      }),
    () => JSON.stringify({ t: 'signal', to: 'p1', kind: 'offer', data: 'x' }),
    () =>
      JSON.stringify({
        t: 'signal',
        to: 'i',
        kind: 'offer',
        data: 'x'.repeat(9000),
      }),
    () => JSON.stringify({ t: 'admit', pid: 'p' + rnd(99) }),
    () => '{"t":"help"' + ','.repeat(rnd(50)),
  ];
  const senders = [asStudent.st, own.inst, bare];
  const replies = new Map(senders.map(c => [c, []]));
  for (const c of senders) c.onany = m => replies.get(c).push(m);

  const FUZZ = 10_000;
  const perCase = new Array(cases.length).fill(0);
  let sent = 0;
  const during = rtt(400); // the honest pair, measured while the fuzz runs
  while (sent < FUZZ) {
    const i = rnd(cases.length);
    const c = senders[sent % senders.length];
    const text = cases[i]();
    // Some cases are valid for one sender (the own-session instructor's deep
    // body is not, but a pid admit may name a knock that does not exist):
    // every one must still earn an error, which is what is counted.
    c.send(text);
    perCase[i]++;
    sent++;
    if (sent % 200 === 0) await pause(1);
  }
  const duringMedian = await during;
  await pause(300);

  // The own-session instructor: its commands must never reach the honest
  // session. Send a valid one and check the honest student saw nothing.
  own.inst.send({ t: 'cmd', kind: 'broadcast', body: { leak: true } });
  await pause(100);
  const after = await rtt(400);

  const errors = [...replies.values()].flat().filter(m => m.t === 'error');
  const nonErrors = [...replies.values()]
    .flat()
    .filter(m => m.t !== 'error' && !(m.t === 'log' && m.body?.sent));
  // T7: every instructor-only command from the admitted student.
  const t7 = [];
  for (const t of INSTRUCTOR_ONLY) {
    const msgs = {
      admit: { t, pid: 'p1' },
      refuse: { t, pid: 'p1' },
      cmd: { t, kind: CMD_KINDS[0], body: {} },
      end: { t },
    };
    asStudent.st.onany = null;
    asStudent.st.clear();
    asStudent.st.send(msgs[t]);
    const r = await asStudent.st.next(m => m.t === 'error');
    t7.push([t, r.code]);
  }
  for (const kind of CMD_KINDS) {
    asStudent.st.clear();
    asStudent.st.send({ t: 'cmd', kind, body: {} });
    const r = await asStudent.st.next(m => m.t === 'error');
    t7.push([`cmd:${kind}`, r.code]);
  }
  const sessionStillLive = !relay.sessions.get(honest.code).endedAt;

  out.T6 = {
    fuzzed: FUZZ,
    perCase,
    typedErrors: errors.length,
    errorCodes: Object.fromEntries(
      [...new Set(errors.map(e => e.code))].map(c => [
        c,
        errors.filter(e => e.code === c).length,
      ])
    ),
    otherRepliesToAttackers: nonErrors.map(m => m.t),
    reachedHonestStudent: unexpected.length,
    honestMedianRttMs: { before, during: duringMedian, after },
    serverStillAnswers: after > 0,
  };
  // The own-session instructor's valid commands are appended to its own
  // session and echoed to it: those are the only non-error replies allowed.
  const onlyOwnEcho = nonErrors.every(m => m.t === 'log' || m.t === 'replay');
  out.T6.verdict =
    errors.length + nonErrors.filter(m => m.t === 'log').length >= FUZZ &&
    unexpected.length === 0 &&
    onlyOwnEcho &&
    Math.abs(duringMedian - before) <= 0.2 * before &&
    Math.abs(after - before) <= 0.2 * before
      ? 'pass'
      : 'fail';
  out.T7 = {
    tried: t7.length,
    refused: t7.filter(([, c]) => c === 'forbidden').length,
    sessionStillLive,
    verdict:
      t7.every(([, c]) => c === 'forbidden') && sessionStillLive
        ? 'pass'
        : 'fail',
  };

  // The per-message limit, with the defaults: a flood is refused, then closed.
  const strict = createRelay();
  await strict.listen(PORT + 2);
  const f = connect(`ws://127.0.0.1:${PORT + 2}`);
  await f.opened;
  const fr = [];
  f.onany = m => fr.push(m.code);
  for (let i = 0; i < 400; i++) f.send({ t: 'help' });
  const code = await Promise.race([f.closed, pause(3000).then(() => 'open')]);
  out.rateLimit = {
    sent: 400,
    refusedForbidden: fr.filter(c => c === 'forbidden').length,
    refusedRateLimited: fr.filter(c => c === 'rateLimited').length,
    closedWith: code,
  };
  await strict.close().catch(() => {});
  await relay.close().catch(() => {});
}

console.log(JSON.stringify(out, null, 2));
process.exit(0);
