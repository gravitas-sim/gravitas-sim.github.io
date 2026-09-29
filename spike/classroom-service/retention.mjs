// T8: a session is gone within 60 s of its end, and none outlives 4 hours.
// The relay's clock is injected, so hours pass in a loop.

/* global console */
import process from 'node:process';
import { createRelay, DEFAULTS } from './server.mjs';
import { openSession, joinAdmitted, connect } from './client.mjs';

const PORT = Number(process.argv[2] || 4420);
const URL = `ws://127.0.0.1:${PORT}`;
let t = 1_000_000;
const relay = createRelay({ now: () => t, limits: { joinsPerMinute: 1e6 } });
await relay.listen(PORT);
const out = {
  purgeAfterMs: DEFAULTS.purgeAfterMs,
  hardLimitMs: DEFAULTS.hardLimitMs,
};

// A session that ends: purged at its grace period, and not a second before.
{
  const { inst, code } = await openSession(URL);
  const { st } = await joinAdmitted(URL, inst, code, 'a nickname');
  inst.send({ t: 'cmd', kind: 'broadcast', body: { n: 1 } });
  await st.next(m => m.t === 'log');
  inst.send({ t: 'end' });
  await st.next(m => m.t === 'ended');
  const endedAt = t;
  const present = [];
  for (const dt of [0, 29_000, 29_999, 30_000, 60_000]) {
    t = endedAt + dt;
    relay.sweep();
    present.push([dt, relay.sessions.has(code)]);
  }
  // After the purge the code does not resolve, even with the old token.
  const r = connect(URL);
  await r.opened;
  r.send({ t: 'resume', code, token: 'A'.repeat(22), have: 0 });
  const refused = await r.next(m => m.t === 'error');
  out.ended = {
    presentAt: present,
    purgedBy: present.find(([, p]) => !p)?.[0],
    afterPurge: refused.code,
  };
}

// A session nobody ends: ended at the hard limit, then purged.
{
  const { code } = await openSession(URL);
  const created = t;
  const seen = [];
  for (const dt of [
    3 * 3600_000,
    4 * 3600_000 - 1,
    4 * 3600_000,
    4 * 3600_000 + 30_000,
  ]) {
    t = created + dt;
    relay.sweep();
    const s = relay.sessions.get(code);
    seen.push([dt, s ? (s.endedAt ? 'ended' : 'live') : 'gone']);
  }
  out.abandoned = { states: seen };
}

const endedOk =
  out.ended.purgedBy !== undefined &&
  out.ended.purgedBy <= 60_000 &&
  out.ended.afterPurge === 'noSession';
const s = out.abandoned.states;
const abandonedOk =
  s[0][1] === 'live' &&
  s[1][1] === 'live' &&
  s[2][1] === 'ended' &&
  s[3][1] === 'gone';
out.T8 = endedOk && abandonedOk ? 'pass' : 'fail';
console.log(JSON.stringify(out, null, 2));
await relay.close();
process.exit(0);
