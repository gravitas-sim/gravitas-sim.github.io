// Start this investigation over (js/i18n/en.reset.js): the confirmation counts
// what it will delete from the record, offers a backup first, and the deleted
// record is held in memory so it can be undone until the investigation closes.
// Never written anywhere else. Fetched by the first press of the button; it
// reaches the record's helpers through the host and imports nothing of the
// lesson engine, so the bundler keeps it a leaf and no lesson route pays for it.

import { t } from '../i18n/index.js';
import { announce } from '../notify.js';

/** What a saved key says about a step rather than answering it. */
const META = /^(shown|locale|help|hint)$|^tool:|:(locale|src)$/;

/**
 * The saved keys that answer a step, by step id: a filled value that is not
 * metadata, in the tables given, for one investigation.
 * @param {string} id - Investigation id
 * @param {...object} tables - Saved values by key
 * @returns {Map<string, Set<string>>} Step id to its answering keys
 */
export function filledBySid(id, ...tables) {
  const bySid = new Map();
  for (const table of tables)
    for (const [key, v] of Object.entries(table ?? {})) {
      const [owner, sid, ...sub] = key.split(':');
      if (owner !== id || v === false || String(v ?? '').trim() === '')
        continue;
      if (META.test(sub.join(':'))) continue;
      bySid.set(sid, (bySid.get(sid) ?? new Set()).add(key));
    }
  return bySid;
}

/**
 * Count the saved answers and readings a record holds for one investigation:
 * an answer is a step answered, a reading is one filled field of a measure.
 * @param {{id: string, steps: object[]}} lesson - The open investigation
 * @param {...object} tables - Saved answers by key (the record's, and the ones kept from earlier versions)
 * @returns {{answers: number, readings: number, n: number}} The counts
 */
export function countSaved(lesson, ...tables) {
  const type = new Map(lesson.steps.map(s => [s.sid, s.type]));
  let answers = 0;
  let readings = 0;
  for (const [sid, keys] of filledBySid(lesson.id, ...tables))
    if (type.get(sid) === 'measure') readings += keys.size;
    else answers++;
  return { answers, readings, n: answers + readings };
}

/**
 * Two tables of saved values, merged a step at a time: a step answered in the
 * newer table is taken whole from it, so one step never mixes old and new
 * readings; every other step keeps the older values.
 * @param {string} id - Investigation id
 * @param {object} older - The table that was deleted
 * @param {object} newer - The table built since
 * @param {Set<string>} newSids - Steps answered in the newer table
 * @returns {object} The merged table
 */
export function mergeByStep(id, older, newer, newSids) {
  const sidOf = key => {
    const [owner, sid] = key.split(':');
    return owner === id ? sid : null;
  };
  const out = {};
  for (const [k, v] of Object.entries(older ?? {}))
    if (!newSids.has(sidOf(k))) out[k] = v;
  for (const [k, v] of Object.entries(newer ?? {}))
    if (newSids.has(sidOf(k)) || !(k in out)) out[k] = v;
  return out;
}

/** The record as it is now, copied, so nothing later changes it. */
const copy = (host, s) => ({
  id: s.active.id,
  key: s.key,
  step: s.stepIndex,
  responses: { ...s.responses },
  attempts: { ...s.attempts },
  visited: [...s.visited],
  startedAt: s.startedAt,
  earlier:
    host.kept.earlierFor(s.active.id) &&
    JSON.parse(JSON.stringify(host.kept.earlierFor(s.active.id))),
  drafts: host.kept.drafts(),
  after: [],
  host,
});

/**
 * A second restart before the first was undone: one record that holds both. A
 * step answered since the first restart is taken whole from the newer copy.
 * @param {object} old - The held record
 * @param {object} cur - The copy taken now
 * @returns {object} The record an undo would bring back
 */
export function combineHeld(old, cur) {
  const newSids = new Set(filledBySid(cur.id, cur.responses).keys());
  return {
    ...cur,
    step: newSids.size ? cur.step : old.step,
    responses: mergeByStep(cur.id, old.responses, cur.responses, newSids),
    attempts: mergeByStep(cur.id, old.attempts, cur.attempts, newSids),
    visited: [
      ...new Set([
        ...old.visited,
        ...cur.visited.filter(sid => !old.after.includes(sid)),
      ]),
    ],
    startedAt: old.startedAt,
    earlier: cur.earlier ?? old.earlier,
    drafts: { ...old.drafts, ...cur.drafts },
  };
}

/** The record deleted by the last restart, in memory only. */
let held = null;

const $ = id => document.getElementById(id);

/** Drop the held record and its notice: the investigation closed or another opened. */
export function forget() {
  held = null;
  const strip = $('investigationUndo');
  if (strip) strip.hidden = true;
}

/** The step's own title takes focus: the button that was pressed is gone or behind a dialog. */
function focusStep() {
  const title = document.querySelector('.inv-step-title');
  if (!title) return;
  title.tabIndex = -1;
  title.focus();
}

async function undo() {
  const was = held;
  const s = was?.host.state();
  // Another record is open now (an investigation opened without closing this one): nothing to undo here.
  if (!was || s.key !== was.key || s.active.id !== was.id) return forget();
  held = null;
  const { host, id } = was;
  const newSids = new Set(filledBySid(id, s.responses).keys());
  host.put({
    responses: mergeByStep(id, was.responses, s.responses, newSids),
    attempts: mergeByStep(id, was.attempts, s.attempts, newSids),
    visited: new Set([
      ...was.visited,
      ...[...s.visited].filter(sid => !was.after.includes(sid)),
    ]),
    startedAt: was.startedAt,
  });
  if (was.earlier) host.kept.keepEarlier(id, was.earlier);
  // Text typed since is newer than text typed before the restart.
  host.kept.drafts({ ...was.drafts, ...host.kept.drafts() });
  $('investigationUndo').hidden = true;
  await host.go(was.step, true);
  focusStep();
  announce(t('reset.undo.done'));
}

/** Delete the record, reset the scene, and keep the record for an undo. */
async function go(host) {
  const s = host.state();
  if (held && held.key !== s.key) held = null;
  const now = copy(host, s);
  held = held ? combineHeld(held, now) : now;
  const kept = held;
  host.put({
    responses: {},
    attempts: {},
    visited: new Set(),
    startedAt: new Date().toISOString(),
  });
  host.kept.forgetKept(s.active.id);
  // A restart also resets the scene: the first step's, built again (a staged one loads first).
  await host.go(0, true);
  // The step the restart itself opened is not something the student did.
  kept.after = [...host.state().visited];
  const strip = $('investigationUndo');
  if (!strip) return;
  const { n } = countSaved(s.active, kept.responses, kept.earlier?.responses);
  const said = t(n ? 'reset.undo.said' : 'reset.undo.none', { n });
  $('investigationUndoText').textContent = said;
  $('investigationUndoGo').hidden = false;
  strip.hidden = false;
  // One live-region path: the strip itself is not a live region.
  announce(said);
  focusStep();
}

/**
 * Ask first: how many answers and readings will go, that the scene resets too,
 * and a backup before any of it. With nothing saved it says only that the
 * place and the visited steps reset, and an undo is there for those.
 * @param {object} host - investigations.js: state(), put(progress), go(index, rebuild), kept
 */
export function ask(host) {
  const dialog = $('investigationRestart');
  const s = host.state();
  const now = countSaved(
    s.active,
    s.responses,
    host.kept.earlierFor(s.active.id)?.responses
  );
  const some = now.n > 0;
  $('investigationRestartN').textContent = now.n;
  $('investigationRestartCount').hidden = !some;
  $('investigationRestartNone').hidden = some;
  $('investigationRestartParts').hidden = !some;
  $('investigationRestartParts').textContent = t('reset.ask.parts', {
    a: now.answers,
    r: now.readings,
  });
  $('investigationRestartAssigned').hidden = !s.assigned;
  // Where the browser will not keep the answers, they are only in this tab: do not say "from this device".
  $('investigationRestartLost').textContent = t(
    some
      ? s.saved
        ? 'reset.ask.lost'
        : 'reset.ask.lost.mem'
      : 'reset.ask.progress'
  );
  $('investigationRestartBackup').hidden = !some;
  $('investigationRestartGo').textContent = t(
    some ? 'reset.ask.go' : 'reset.restart'
  );
  $('investigationRestartGo').onclick = () => {
    dialog.close();
    go(host);
  };
  $('investigationUndoGo').onclick = undo;
  dialog.showModal();
}
