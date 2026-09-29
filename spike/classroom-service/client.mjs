// A synthetic client on Node's built-in WebSocket, and the log check every
// client runs: the session log is a hash chain, so a client that rebuilds
// the chain from what it received knows whether it has exactly the log the
// server has - not merely the same length.

/* global WebSocket, setTimeout */
import { createHash } from 'node:crypto';

export const ZERO = '0'.repeat(64);

export const chain = (prev, e) =>
  createHash('sha256')
    .update(
      prev +
        JSON.stringify({ seq: e.seq, kind: e.kind, body: e.body, at: e.at })
    )
    .digest('hex');

/** A client's copy of a session log, checked entry by entry. */
export function logCopy() {
  const copy = { entries: [], digest: ZERO, faults: [] };
  copy.add = e => {
    if (e.seq !== copy.entries.length + 1)
      copy.faults.push(`seq ${e.seq} after ${copy.entries.length}`);
    copy.entries.push(e);
    copy.digest = chain(copy.digest, e);
  };
  return copy;
}

/**
 * @param {string} url
 * @param {{keep?: boolean}} [o] - keep: queue unclaimed messages for next()
 */
export function connect(url, { keep = true } = {}) {
  const ws = new WebSocket(url);
  const queue = [];
  const waiters = [];
  const c = {
    ws,
    onany: null,
    sent: 0,
    send(m) {
      c.sent++;
      ws.send(typeof m === 'string' ? m : JSON.stringify(m));
    },
    /** The next message matching pred, from the queue or as it arrives. */
    next(pred = () => true, ms = 5000) {
      const i = queue.findIndex(pred);
      if (i >= 0) return Promise.resolve(queue.splice(i, 1)[0]);
      return new Promise((res, rej) => {
        const w = { pred, res };
        waiters.push(w);
        setTimeout(() => {
          const j = waiters.indexOf(w);
          if (j >= 0) {
            waiters.splice(j, 1);
            rej(new Error(`no matching message in ${ms} ms`));
          }
        }, ms);
      });
    },
    /** Forget every queued message. */
    clear: () => queue.splice(0),
    close: () => ws.close(),
    opened: new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = rej;
    }),
    closed: new Promise(res => {
      ws.onclose = e => res(e.code);
    }),
  };
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    c.onany?.(m);
    const i = waiters.findIndex(w => w.pred(m));
    if (i >= 0) waiters.splice(i, 1)[0].res(m);
    else if (keep) queue.push(m);
  };
  return c;
}

/** Open a session: the instructor client, its code and token. */
export async function openSession(url) {
  const inst = connect(url);
  await inst.opened;
  inst.send({ t: 'create' });
  const { code, token } = await inst.next(m => m.t === 'created');
  return { inst, code, token };
}

/** Join and be admitted: the student client, its pid and token. */
export async function joinAdmitted(url, inst, code, nick) {
  const st = connect(url);
  await st.opened;
  st.send(nick ? { t: 'join', code, nick } : { t: 'join', code });
  const { pid } = await st.next(m => m.t === 'waiting');
  await inst.next(m => m.t === 'knock' && m.pid === pid);
  inst.send({ t: 'admit', pid });
  const { token } = await st.next(m => m.t === 'admitted');
  return { st, pid, token };
}
