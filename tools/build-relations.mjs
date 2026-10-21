#!/usr/bin/env node
// =============================================================================
// Relations: what comes before, what comes next, what goes with it
// -----------------------------------------------------------------------------
//   node tools/build-relations.mjs --check    validate the relations in
//                                             library/library.json
//
// Roadmap III Prompt 163. tools/build-library.mjs calls `buildRelations` and
// writes the result into each entry as `rel`; this file is the one place that
// says how, and `problems` is the validator the build, the tests and --check
// share. Nothing here is written by hand: every relation is derived from what
// the Library already knows.
//
//   pre      the entry's own prerequisites (an id that does not exist fails)
//   next     the following entry of each sequence it is in, the following
//            lesson of each course it is in, then what lists it as a
//            prerequisite (a dataset an investigation prepares for), then
//            what is built on it (the investigations that open a scenario or
//            a dataset); at most 3
//   related  entries that share subjects, a sequence or a textbook chapter,
//            most in common first, at most 4, never the entry itself
//   uses     what it is built on, when it names something (the scenarios a
//            lesson's steps open, the datasets a guide opens)
//   in       the pathways it is in: ['seq', id, position] or ['course', id,
//            unit], so a sequence and a course holding the same items can say
//            which is which
//   teach    the instructor's page for it, when the site has one
//   why      only when there is no next entry: 'last' (it ends a pathway) or
//            'standalone' (it is in none), the stated reason of the contract
//
// Both languages are checked by the library schema (title and summary carry
// en and es); the relations are ids, so one set serves both.
// =============================================================================

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const MAX_NEXT = 3;
export const MAX_RELATED = 4;
export const WHY = Object.freeze(['last', 'standalone']);

/** The instructor's page for an entry, as a route, or null. */
export function teachRoute(
  entry,
  exists = rel => existsSync(path.join(ROOT, rel))
) {
  const [kind, rest] = entry.id.split(/:(.*)/s);
  const slug = kind === 'activity' ? rest.split('/')[0] : rest;
  if (kind !== 'investigation' && kind !== 'activity') return null;
  const route = `/teaching/${kind}/${slug}/`;
  return exists(`teaching/${kind}/${slug}/index.html`) ? route : null;
}

/**
 * Every entry's relations.
 * @param {object} library - A library document, with or without `rel`
 * @param {object} [o]
 * @param {(rel: string) => boolean} [o.exists] - Whether a site path exists
 * @param {Map<string, string[]>} [o.uses] - What an entry is built on: the
 *   scenarios a lesson's steps open, the datasets a guide opens
 * @returns {Map<string, object>} id to relations
 */
export function buildRelations(library, { exists, uses = new Map() } = {}) {
  const { entries, sequences } = library;
  const ids = new Set(entries.map(e => e.id));
  const inPath = new Map(entries.map(e => [e.id, []]));
  const follows = new Map(entries.map(e => [e.id, []]));
  const lastOf = new Set();

  for (const s of sequences) {
    s.entries.forEach((id, i) => {
      inPath.get(id)?.push(['seq', s.id, i]);
      const next = s.entries[i + 1];
      if (next) follows.get(id)?.push(next);
      else lastOf.add(id);
    });
  }
  for (const e of entries) {
    if (e.kind !== 'course' || !e.units) continue;
    const lessons = e.units.flatMap((u, i) =>
      u.lessons.map(l => ({ id: `investigation:${l}`, unit: i }))
    );
    lessons.forEach(({ id, unit }, i) => {
      if (!inPath.has(id)) return;
      inPath.get(id).push(['course', e.id.replace(/^course:/, ''), unit]);
      const next = lessons[i + 1]?.id;
      if (next) follows.get(id).push(next);
      else lastOf.add(id);
    });
  }
  const usedBy = new Map(entries.map(e => [e.id, []]));
  for (const [id, list] of uses)
    for (const u of list)
      if (usedBy.has(u) && ids.has(id)) usedBy.get(u).push(id);
  const unlocks = new Map(entries.map(e => [e.id, []]));
  for (const e of entries)
    for (const p of e.prerequisites ?? []) unlocks.get(p)?.push(e.id);

  const sameSequence = (a, b) =>
    inPath
      .get(a)
      .some(
        ([k, id]) =>
          k === 'seq' &&
          inPath.get(b).some(([k2, id2]) => k2 === k && id2 === id)
      );
  const chapter = e => (e.textbook ? `${e.textbook.chapter}` : null);

  const out = new Map();
  for (const e of entries) {
    const next = [];
    for (const id of [
      ...follows.get(e.id),
      ...unlocks.get(e.id).sort(),
      ...usedBy.get(e.id),
    ])
      if (id !== e.id && !next.includes(id)) next.push(id);
    const pre = [...(e.prerequisites ?? [])];

    const scored = [];
    for (const o of entries) {
      if (o.id === e.id || pre.includes(o.id) || next.includes(o.id)) continue;
      const shared = (e.subjects ?? []).filter(s =>
        o.subjects?.includes(s)
      ).length;
      let score = shared * 3;
      if (uses.get(e.id)?.includes(o.id)) score += 6;
      if (sameSequence(e.id, o.id)) score += 2;
      if (chapter(e) && chapter(e) === chapter(o)) score += 2;
      if (score === 0) continue;
      if (o.level === e.level) score += 0.5;
      // A different kind of thing about the same subject is worth more than a
      // fifth lesson: a dataset beside an investigation, a scenario beside both.
      if (o.kind !== e.kind) score += 0.25;
      scored.push([score, o.id]);
    }
    scored.sort((a, b) => b[0] - a[0] || (a[1] < b[1] ? -1 : 1));

    const rel = {
      pre,
      next: next.slice(0, MAX_NEXT),
      related: scored.slice(0, MAX_RELATED).map(([, id]) => id),
      in: inPath.get(e.id),
      teach: teachRoute(e, exists),
    };
    if (uses.get(e.id)?.length) rel.uses = [...uses.get(e.id)];
    if (!rel.next.length)
      rel.why =
        inPath.get(e.id).length || lastOf.has(e.id) ? 'last' : 'standalone';
    out.set(e.id, rel);
  }
  return out;
}

/**
 * What is wrong with a library's relations: dangling ids, repeats, an entry
 * with neither a next entry nor a stated reason.
 * @param {object} library - A library document with `rel` on every entry
 * @param {(rel: string) => boolean} [exists] - Whether a site path exists
 * @returns {string[]} Problems; empty when sound
 */
export function problems(
  library,
  exists = rel => existsSync(path.join(ROOT, rel))
) {
  const found = [];
  const ids = new Set(library.entries.map(e => e.id));
  const seqs = new Set(library.sequences.map(s => s.id));
  const courses = new Set(
    library.entries
      .filter(e => e.kind === 'course')
      .map(e => e.id.replace(/^course:/, ''))
  );
  for (const e of library.entries) {
    const r = e.rel;
    if (!r) {
      found.push(`${e.id}: no relations`);
      continue;
    }
    for (const list of [
      'pre',
      'next',
      'related',
      ...(r.uses ? ['uses'] : []),
    ]) {
      if (!Array.isArray(r[list])) {
        found.push(`${e.id}: rel.${list} is not a list`);
        continue;
      }
      if (new Set(r[list]).size !== r[list].length)
        found.push(`${e.id}: rel.${list} repeats an id`);
      for (const id of r[list]) {
        if (!ids.has(id))
          found.push(
            `${e.id}: rel.${list} names ${id}, which is not in the Library`
          );
        if (id === e.id) found.push(`${e.id}: rel.${list} names itself`);
      }
    }
    if (r.next?.length > MAX_NEXT)
      found.push(`${e.id}: more than ${MAX_NEXT} next entries`);
    if (r.related?.length > MAX_RELATED)
      found.push(`${e.id}: more than ${MAX_RELATED} related entries`);
    for (const [k, id, n] of r.in ?? []) {
      const known =
        k === 'seq' ? seqs.has(id) : k === 'course' ? courses.has(id) : false;
      if (!known || !Number.isInteger(n) || n < 0)
        found.push(`${e.id}: rel.in has ${JSON.stringify([k, id, n])}`);
    }
    if (r.teach && !exists(`${r.teach.replace(/^\//, '')}index.html`))
      found.push(`${e.id}: rel.teach ${r.teach} is not a page of the site`);
    if (!r.next?.length && !WHY.includes(r.why))
      found.push(`${e.id}: no next entry and no stated reason`);
    if (r.next?.length && r.why)
      found.push(`${e.id}: a reason with next entries`);
  }
  return found;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { readFileSync } = await import('node:fs');
  const library = JSON.parse(
    readFileSync(path.join(ROOT, 'library/library.json'), 'utf8')
  );
  const list = problems(library);
  for (const p of list) console.error(`  ${p}`);
  if (list.length) process.exitCode = 1;
  else
    console.log(`relations: ${library.entries.length} entries, none dangling`);
}
