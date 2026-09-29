// The session protocol: every message a client may send, and the check each
// must pass before the server reads a field of it. The same rule as every
// Gravitas import (js/platform/checker.js): refuse for one reason, before any
// rule reads the value, anything that is not plain, small, known data.
//
// Client to server
//   create                                   instructor opens a session
//   join     {code, nick?}                   student knocks
//   admit    {pid}           instructor      let a knocking student in
//   refuse   {pid}           instructor
//   resume   {code, token, have}             rejoin after a drop
//   cmd      {kind, body}    instructor      appended to the session log
//   status   {step, done}    student         to the instructor only
//   help     {}              student         to the instructor only
//   end      {}              instructor      closes the session
//   signal   {to, kind, data}                WebRTC offer/answer/candidate, relayed
//                                            between the instructor and one student
//
// Server to client
//   created {code, token}, waiting {pid}, knock {pid, nick}, admitted {token,
//   pid}, log {seq, kind, body, digest}, replay {entries, digest},
//   status {pid, step, done}, help {pid}, ended {}, error {code}

import { Buffer } from 'node:buffer';

export const MAX_TEXT = 200;
/** A session description is kilobytes; it is the one long string allowed. */
export const SIGNAL_TEXT = 8000;
export const CMD_KINDS = Object.freeze([
  'scenario', // open an authored scenario or assignment (by link, not state)
  'pause',
  'resume',
  'checkpoint', // ask every student for a checkpoint status
  'groups', // group membership, as lists of pids
  'broadcast', // a short instructor message
  'milestone', // a named point to replay in the debrief
]);
export const INSTRUCTOR_ONLY = Object.freeze(['admit', 'refuse', 'cmd', 'end']);
const UNSAFE_KEY = new Set(['__proto__', 'constructor', 'prototype']);
const CODE = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/;
const TOKEN = /^[A-Za-z0-9_-]{22}$/;
const PID = /^p[0-9]{1,4}$/;

const isObj = v =>
  v !== null &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  Object.getPrototypeOf(v) === Object.prototype;

/** Plain data, small and shallow, with no key into a prototype. */
function plain(v, depth = 0, count = { n: 0 }) {
  if (++count.n > 400 || depth > 4) return false;
  if (v === null || typeof v === 'boolean') return true;
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v === 'string') return v.length <= MAX_TEXT;
  if (Array.isArray(v))
    return v.length <= 64 && v.every(x => plain(x, depth + 1, count));
  if (!isObj(v)) return false;
  for (const k of Object.keys(v)) {
    if (UNSAFE_KEY.has(k) || k.length > 32) return false;
    if (!plain(v[k], depth + 1, count)) return false;
  }
  return true;
}

const exact = (m, keys) => Object.keys(m).every(k => keys.includes(k));

const SHAPES = {
  create: m => exact(m, ['t']),
  join: m =>
    exact(m, ['t', 'code', 'nick']) &&
    CODE.test(m.code) &&
    (m.nick === undefined ||
      (typeof m.nick === 'string' && m.nick.length <= 40)),
  admit: m => exact(m, ['t', 'pid']) && PID.test(m.pid),
  refuse: m => exact(m, ['t', 'pid']) && PID.test(m.pid),
  resume: m =>
    exact(m, ['t', 'code', 'token', 'have']) &&
    CODE.test(m.code) &&
    TOKEN.test(m.token) &&
    Number.isInteger(m.have) &&
    m.have >= 0,
  cmd: m =>
    exact(m, ['t', 'kind', 'body']) &&
    CMD_KINDS.includes(m.kind) &&
    isObj(m.body),
  status: m =>
    exact(m, ['t', 'step', 'done']) &&
    Number.isInteger(m.step) &&
    m.step >= 0 &&
    m.step < 1000 &&
    typeof m.done === 'boolean',
  help: m => exact(m, ['t']),
  end: m => exact(m, ['t']),
  signal: m =>
    exact(m, ['t', 'to', 'kind', 'data']) &&
    (m.to === 'i' || PID.test(m.to)) &&
    ['offer', 'answer', 'cand'].includes(m.kind) &&
    typeof m.data === 'string' &&
    m.data.length <= SIGNAL_TEXT,
};

/**
 * Parse and check one client message.
 * @returns {{ok: true, msg: object} | {ok: false, code: string}}
 */
export function parse(text, maxBytes = 4096) {
  const limit = text?.startsWith?.('{"t":"signal"') ? 12288 : maxBytes;
  if (typeof text !== 'string' || Buffer.byteLength(text) > limit)
    return { ok: false, code: 'tooLarge' };
  let m;
  try {
    m = JSON.parse(text);
  } catch {
    return { ok: false, code: 'notJson' };
  }
  if (!isObj(m)) return { ok: false, code: 'notData' };
  const probe =
    m.t === 'signal' && typeof m.data === 'string' ? { ...m, data: '' } : m;
  if (!plain(probe)) return { ok: false, code: 'notData' };
  if (typeof m.t !== 'string' || !Object.hasOwn(SHAPES, m.t))
    return { ok: false, code: 'unknownType' };
  if (!SHAPES[m.t](m)) return { ok: false, code: 'badShape' };
  return { ok: true, msg: m };
}
