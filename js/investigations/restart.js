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
 * Count the saved answers and readings a record holds for one investigation:
 * an answer is a step answered, a reading is one filled field of a measure.
 * @param {{id: string, steps: object[]}} lesson - The open investigation
 * @param {...object} tables - Saved answers by key (the record's, and the ones kept from earlier versions)
 * @returns {{answers: number, readings: number, n: number}} The counts
 */
export function countSaved(lesson, ...tables) {
  const type = new Map(lesson.steps.map(s => [s.sid, s.type]));
  const bySid = new Map();
  for (const table of tables)
    for (const [key, v] of Object.entries(table ?? {})) {
      const [owner, sid, ...sub] = key.split(':');
      const rest = sub.join(':');
      if (owner !== lesson.id || v === false || String(v ?? '').trim() === '')
        continue;
      if (META.test(rest)) continue;
      bySid.set(sid, (bySid.get(sid) ?? new Set()).add(key));
    }
  let answers = 0;
  let readings = 0;
  for (const [sid, keys] of bySid)
    if (type.get(sid) === 'measure') readings += keys.size;
    else answers++;
  return { answers, readings, n: answers + readings };
}

/** The record as it is now, copied, so nothing later changes it. */
const copy = (host, s) => ({
  id: s.active.id,
  step: s.stepIndex,
  responses: { ...s.responses },
  attempts: { ...s.attempts },
  visited: [...s.visited],
  startedAt: s.startedAt,
  earlier:
    host.kept.earlierFor(s.active.id) &&
    JSON.parse(JSON.stringify(host.kept.earlierFor(s.active.id))),
  drafts: host.kept.drafts(),
  host,
});

/** The record deleted by the last restart, in memory only. */
let held = null;

const $ = id => document.getElementById(id);

/** Drop the held record and its notice: the investigation closed. */
export function forget() {
  held = null;
  const strip = $('investigationUndo');
  if (strip) strip.hidden = true;
}

function undo() {
  const was = held;
  const { host } = was ?? {};
  const s = host?.state();
  if (!was || s?.active?.id !== was.id) return;
  held = null;
  // What was deleted comes back; an answer given since to the same question is newer, so it stays.
  host.put({
    responses: { ...was.responses, ...s.responses },
    attempts: { ...was.attempts, ...s.attempts },
    visited: new Set([
      ...was.visited,
      ...[...s.visited].filter(sid => !was.after.includes(sid)),
    ]),
    startedAt: was.startedAt,
  });
  if (was.earlier) host.kept.keepEarlier(was.id, was.earlier);
  host.kept.drafts(was.drafts);
  host.go(was.step, true);
  $('investigationUndo').hidden = true;
  // The button that was pressed is gone; the panel's title is where a step starts.
  $('investigationTitle')?.focus();
  announce(t('reset.undo.done'));
}

/** Delete the record, reset the scene, and keep the record for an undo. */
function go(host) {
  const s = host.state();
  const { n } = countSaved(
    s.active,
    s.responses,
    host.kept.earlierFor(s.active.id)?.responses
  );
  held = copy(host, s);
  host.put({
    responses: {},
    attempts: {},
    visited: new Set(),
    startedAt: new Date().toISOString(),
  });
  host.kept.forgetKept(s.active.id);
  // A restart also resets the scene: the first step's, built again.
  host.go(0, true);
  // The step the restart itself opened is not something the student did.
  held.after = [...host.state().visited];
  const strip = $('investigationUndo');
  if (!strip) return;
  const said = $('investigationUndoText');
  said.textContent = t(n ? 'reset.undo.said' : 'reset.undo.none', { n });
  $('investigationUndoGo').hidden = !n;
  if (!n) held = null;
  strip.hidden = false;
  announce(said.textContent);
}

/**
 * Ask first: how many answers and readings will go, that the scene resets too,
 * and a backup before any of it.
 * @param {object} host - investigations.js: state(), put(progress), go(index, rebuild)
 */
export function ask(host) {
  const dialog = $('investigationRestart');
  const s = host.state();
  const now = countSaved(
    s.active,
    s.responses,
    host.kept.earlierFor(s.active.id)?.responses
  );
  $('investigationRestartN').textContent = now.n;
  $('investigationRestartParts').textContent = t('reset.ask.parts', {
    a: now.answers,
    r: now.readings,
  });
  $('investigationRestartAssigned').hidden = !s.assigned;
  $('investigationRestartGo').onclick = () => {
    dialog.close();
    go(host);
  };
  $('investigationUndoGo').onclick = undo;
  dialog.showModal();
}
