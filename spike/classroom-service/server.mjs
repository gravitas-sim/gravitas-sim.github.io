// A minimal, ephemeral classroom session relay - the thing Prompt 40 asks
// whether Gravitas would need. Synthetic users on loopback only.
//
// What it holds, and only in memory: a session's join code, the instructor's
// and each admitted student's random token, a nickname the student typed (or
// none), and the session's command log. Nothing is written to disk. A session
// is purged a grace period after it ends and never outlives a hard limit.
//
// What it never holds: simulation state, a student's written answers, a name
// it could check, or anything from the application's storage. Commands are
// links and small parameters (the scenario to open, a pause, a group list),
// and a student's status is a step number and a done flag.

/* global console, setInterval */
import process from 'node:process';
import { createServer as createHttp } from 'node:http';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { accept } from './ws.mjs';
import { parse, INSTRUCTOR_ONLY } from './protocol.mjs';

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // 31, no 0/O, 1/I/L
export const CODE_LENGTH = 6;

export const DEFAULTS = Object.freeze({
  maxMembers: 60,
  msgBurst: 40, // per connection
  msgPerSecond: 20,
  joinsPerMinute: 10, // per address, join and resume together
  purgeAfterMs: 30_000, // after a session ends
  hardLimitMs: 4 * 3600_000,
  maxBytes: 4096,
});

const token = () => randomBytes(16).toString('base64url');

function bucket(capacity, perMs, now) {
  let level = capacity;
  let at = now();
  return () => {
    const t = now();
    level = Math.min(capacity, level + (t - at) * perMs);
    at = t;
    if (level < 1) return false;
    level -= 1;
    return true;
  };
}

/**
 * @param {object} [o]
 * @param {() => number} [o.now] - The clock, injectable for retention tests
 */
export function createRelay(o = {}) {
  const now = o.now || Date.now;
  const lim = { ...DEFAULTS, ...o.limits };
  const sessions = new Map(); // code -> session
  const ipJoins = new Map(); // address -> bucket
  const counts = {
    refused: {},
    relayed: 0,
    forbidden: 0,
    purged: 0,
    connections: 0,
  };

  const refuse = (conn, code) => {
    counts.refused[code] = (counts.refused[code] || 0) + 1;
    conn.send(JSON.stringify({ t: 'error', code }));
  };

  const newCode = () => {
    for (;;) {
      let c = '';
      for (let i = 0; i < CODE_LENGTH; i++)
        c += ALPHABET[randomInt(ALPHABET.length)];
      if (!sessions.has(c)) return c;
    }
  };

  const joinAllowed = ip => {
    if (!ipJoins.has(ip))
      ipJoins.set(
        ip,
        bucket(lim.joinsPerMinute, lim.joinsPerMinute / 60_000, now)
      );
    return ipJoins.get(ip)();
  };

  const deliver = (s, text) => {
    for (const m of s.members.values())
      if (m.conn?.open) {
        m.conn.send(text);
        counts.relayed++;
      }
    if (s.instructor.conn?.open) s.instructor.conn.send(text);
  };

  const replay = (conn, s, have) =>
    conn.send(
      JSON.stringify({
        t: 'replay',
        entries: s.log.slice(have),
        digest: s.digest,
      })
    );

  const end = s => {
    if (s.endedAt) return;
    s.endedAt = now();
    deliver(s, JSON.stringify({ t: 'ended' }));
    for (const m of s.members.values()) m.conn?.close(1000);
    for (const k of s.knocking.values()) k.conn.close(1000);
  };

  /** Ends what is over its hard limit and purges what ended long enough ago. */
  const sweep = () => {
    const t = now();
    for (const [code, s] of sessions) {
      if (!s.endedAt && t - s.created >= lim.hardLimitMs) end(s);
      if (s.endedAt && t - s.endedAt >= lim.purgeAfterMs) {
        sessions.delete(code);
        counts.purged++;
      }
    }
  };

  const handle = (conn, text) => {
    if (!conn.allow()) {
      if (++conn.overLimit > 200) return conn.close(1008);
      return refuse(conn, 'rateLimited');
    }
    const r = parse(text, lim.maxBytes);
    if (!r.ok) return refuse(conn, r.code);
    const m = r.msg;
    if (INSTRUCTOR_ONLY.includes(m.t) && conn.role !== 'instructor') {
      counts.forbidden++;
      return refuse(conn, 'forbidden');
    }
    const s = conn.session;
    switch (m.t) {
      case 'create': {
        if (conn.role) return refuse(conn, 'already');
        const code = newCode();
        const ns = {
          code,
          created: now(),
          endedAt: 0,
          instructor: { token: token(), conn },
          members: new Map(),
          knocking: new Map(),
          log: [],
          digest: '0'.repeat(64),
          next: 1,
        };
        sessions.set(code, ns);
        Object.assign(conn, { role: 'instructor', session: ns });
        return conn.send(
          JSON.stringify({ t: 'created', code, token: ns.instructor.token })
        );
      }
      case 'join': {
        if (conn.role) return refuse(conn, 'already');
        if (!joinAllowed(conn.ip)) return refuse(conn, 'tooManyJoins');
        const js = sessions.get(m.code);
        if (!js || js.endedAt) return refuse(conn, 'noSession');
        if (js.members.size + js.knocking.size >= lim.maxMembers)
          return refuse(conn, 'full');
        const pid = `p${js.next++}`;
        js.knocking.set(pid, { conn, nick: m.nick ?? null });
        Object.assign(conn, { role: 'knocking', session: js, pid });
        conn.send(JSON.stringify({ t: 'waiting', pid }));
        js.instructor.conn?.send(
          JSON.stringify({ t: 'knock', pid, nick: m.nick ?? null })
        );
        return;
      }
      case 'admit':
      case 'refuse': {
        const k = s.knocking.get(m.pid);
        if (!k) return refuse(conn, 'noSuchKnock');
        s.knocking.delete(m.pid);
        if (m.t === 'refuse') {
          refuse(k.conn, 'refused');
          return k.conn.close(1000);
        }
        const member = { token: token(), nick: k.nick, conn: k.conn };
        s.members.set(m.pid, member);
        k.conn.role = 'student';
        k.conn.send(
          JSON.stringify({ t: 'admitted', token: member.token, pid: m.pid })
        );
        return replay(k.conn, s, 0);
      }
      case 'resume': {
        if (conn.role) return refuse(conn, 'already');
        if (!joinAllowed(conn.ip)) return refuse(conn, 'tooManyJoins');
        const rs = sessions.get(m.code);
        if (!rs || rs.endedAt) return refuse(conn, 'noSession');
        if (m.have > rs.log.length) return refuse(conn, 'badHave');
        if (m.token === rs.instructor.token) {
          rs.instructor.conn = conn;
          Object.assign(conn, { role: 'instructor', session: rs });
          return replay(conn, rs, m.have);
        }
        for (const [pid, mem] of rs.members)
          if (mem.token === m.token) {
            mem.conn?.close(4000); // a second tab takes over
            mem.conn = conn;
            Object.assign(conn, { role: 'student', session: rs, pid });
            return replay(conn, rs, m.have);
          }
        return refuse(conn, 'badToken');
      }
      case 'cmd': {
        if (s.endedAt) return refuse(conn, 'ended');
        const entry = {
          seq: s.log.length + 1,
          kind: m.kind,
          body: m.body,
          at: now(),
        };
        s.digest = createHash('sha256')
          .update(s.digest + JSON.stringify(entry))
          .digest('hex');
        s.log.push(entry);
        return deliver(
          s,
          JSON.stringify({ t: 'log', ...entry, digest: s.digest })
        );
      }
      case 'status':
      case 'help': {
        if (conn.role !== 'student') return refuse(conn, 'forbidden');
        const out =
          m.t === 'status'
            ? { t: 'status', pid: conn.pid, step: m.step, done: m.done }
            : { t: 'help', pid: conn.pid };
        s.instructor.conn?.send(JSON.stringify(out));
        return;
      }
      case 'end':
        return end(s);
      case 'signal': {
        // Only within one session, and only between its instructor and one
        // admitted student: a star, never student to student.
        if (conn.role === 'instructor' && m.to !== 'i') {
          const mem = s.members.get(m.to);
          if (!mem?.conn?.open) return refuse(conn, 'noSuchMember');
          return mem.conn.send(
            JSON.stringify({
              t: 'signal',
              from: 'i',
              kind: m.kind,
              data: m.data,
            })
          );
        }
        if (conn.role === 'student' && m.to === 'i')
          return s.instructor.conn?.send(
            JSON.stringify({
              t: 'signal',
              from: conn.pid,
              kind: m.kind,
              data: m.data,
            })
          );
        return refuse(conn, 'forbidden');
      }
    }
  };

  const http = createHttp((req, res) => {
    if (req.url === '/stats') {
      if (globalThis.gc) globalThis.gc();
      const mem = process.memoryUsage();
      res.setHeader('content-type', 'application/json');
      return res.end(
        JSON.stringify({
          rss: mem.rss,
          heapUsed: mem.heapUsed,
          sessions: sessions.size,
          ...counts,
        })
      );
    }
    res.statusCode = 404;
    res.end();
  });
  const sockets = new Set();
  http.on('upgrade', (req, socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    const conn = accept(req, socket, { maxPayload: 16384 });
    if (!conn) return;
    counts.connections++;
    Object.assign(conn, {
      role: null,
      session: null,
      overLimit: 0,
      allow: bucket(lim.msgBurst, lim.msgPerSecond / 1000, now),
    });
    conn.onmessage = t => handle(conn, t);
    conn.onclose = () => {
      counts.connections--;
      const s = conn.session;
      if (conn.role === 'knocking' && s) s.knocking.delete(conn.pid);
    };
  });

  return {
    http,
    sweep,
    sessions,
    counts,
    listen: port =>
      new Promise(r => http.listen(port, '127.0.0.1', () => r(port))),
    // An upgraded socket is not a request http.close() waits out; end them.
    close: () =>
      new Promise(r => {
        for (const sk of sockets) sk.destroy();
        http.close(() => r());
      }),
  };
}

// As a process: `node server.mjs <port> [limits-json]`, for the load runs,
// so the server's memory is measured apart from the clients'.
if (
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].split('/').pop())
) {
  const port = Number(process.argv[2] || 4380);
  const relay = createRelay({ limits: JSON.parse(process.argv[3] || '{}') });
  setInterval(relay.sweep, 1000).unref();
  await relay.listen(port);
  console.log(`listening ${port}`);
}
