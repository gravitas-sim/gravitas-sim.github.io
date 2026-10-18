#!/usr/bin/env node
// =============================================================================
// npm run lesson:coverage
// -----------------------------------------------------------------------------
// Which investigations and activities the lesson-engine golden has to record.
//
// The golden (tests/lessonGolden/) characterizes js/investigations.js before
// any seam moves. A hand-picked set would cover the lessons someone remembered;
// this derives the set. It walks every investigation (every depth laid in) and
// every activity format, lists each engine branch they exercise as a feature
// token, and picks the smallest set that covers every token (greedy set cover,
// ties broken by id so the answer is deterministic).
//
//   npm run lesson:coverage            print the table
//   npm run lesson:coverage -- --write rewrite tests/lessonGolden/coverage.json
//                                      and docs/LESSON_GOLDEN.md's table
//   npm run lesson:coverage -- --check fail when the committed table is stale
//
// Features come from the lesson data, not from a list written here, so a new
// step type, key or check shape shows up as a token nobody has covered and the
// set grows to take it.
// =============================================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const COVERAGE_FILE = 'tests/lessonGolden/coverage.json';
export const DOC_FILE = 'docs/LESSON_GOLDEN.md';
const MARK = ['<!-- coverage:start -->', '<!-- coverage:end -->'];

const load = rel => import(pathToFileURL(path.join(ROOT, rel)).href);

/** Step keys that are prose or identity: they never select an engine branch. */
const PROSE_KEYS = new Set(['sid', 'title', 'body', 'text', 'summary']);

const answerShape = a =>
  Array.isArray(a) ? 'list' : a === null ? 'null' : typeof a;

/**
 * The engine branches one lesson exercises.
 * @param {object} lesson - Merged lesson with every depth laid in
 * @param {{depths: string[], locales: string[]}} extra
 * @returns {Set<string>} Feature tokens
 */
export function lessonFeatures(lesson, { depths, locales }) {
  const f = new Set();
  for (const s of lesson.steps) {
    f.add(`type:${s.type}`);
    if (s.kind) f.add(`kind:${s.type}/${s.kind}`);
    for (const k of Object.keys(s)) {
      if (!PROSE_KEYS.has(k)) f.add(`key:${s.type}.${k}`);
    }
    if (s.type === 'question') {
      f.add(
        `check:${s.kind}/${answerShape(s.answer)}${
          s.tolerance === undefined ? '' : '+tolerance'
        }${s.unit ? '+unit' : ''}`
      );
    }
    if (s.depth) f.add(`depth-step:${s.depth}/${s.type}`);
    if (s.setup) f.add('setup:scenario');
  }
  for (const d of depths) f.add(`depth:${d}`);
  f.add(`lock:${JSON.stringify(lesson.lock ?? null)}`);
  f.add(`math:${lesson.mathematics}`);
  f.add(`audience:${lesson.audience}`);
  f.add(`prereq:${lesson.prerequisites?.length ? 'yes' : 'no'}`);
  for (const l of locales) f.add(`locale:${l}`);
  return f;
}

/**
 * What a classroom activity's cut exercises on top of its lesson.
 * @param {object} activity - From js/data/activities.js
 * @param {object} format - One of its formats
 * @param {{added: object[], unknown: string[], sids: string[]}} resolved
 * @param {object} lesson - The lesson the cut is made from
 * @returns {Set<string>} Feature tokens
 */
export function formatFeatures(activity, format, resolved, lesson) {
  const f = new Set(['assignment:cut']);
  f.add(`format:${format.id}`);
  f.add(`context:${format.context}`);
  f.add(`lecture:${format.lecture ? 'yes' : 'no'}`);
  f.add(`lesson-lock:${JSON.stringify(lesson.lock ?? null)}`);
  if (resolved.added.length) f.add('assignment:resolver-added');
  if (resolved.unknown.length) f.add('assignment:resolver-unknown');
  if (resolved.sids.length === 1) f.add('assignment:single-step');
  const bySid = new Map(lesson.steps.map(s => [s.sid, s]));
  for (const sid of resolved.sids) {
    const s = bySid.get(sid);
    if (!s) continue;
    f.add(`cut-type:${s.type}`);
    if (s.kind) f.add(`cut-kind:${s.type}/${s.kind}`);
    f.add(`cut-depth:${s.depth || 'core'}`);
  }
  f.add(`cut-first:${bySid.get(resolved.sids[0])?.type}`);
  f.add(`cut-last:${bySid.get(resolved.sids.at(-1))?.type}`);
  return f;
}

/**
 * Greedy set cover: repeatedly take the candidate that adds the most
 * uncovered tokens (ties: lowest id), until nothing is left to add.
 * @param {Map<string, Set<string>>} candidates - id -> tokens
 * @returns {{picked: string[], gain: Record<string, string[]>}}
 */
export function greedyCover(candidates) {
  const need = new Set([...candidates.values()].flatMap(s => [...s]));
  const picked = [];
  const gain = {};
  while (need.size) {
    let best = null;
    let bestGain = [];
    for (const id of [...candidates.keys()].sort()) {
      if (picked.includes(id)) continue;
      const g = [...candidates.get(id)].filter(t => need.has(t));
      if (g.length > bestGain.length) {
        best = id;
        bestGain = g;
      }
    }
    if (!best) break;
    picked.push(best);
    gain[best] = bestGain.sort();
    for (const t of bestGain) need.delete(t);
  }
  return { picked, gain };
}

/** Engine paths no lesson data selects: the golden's recorder runs each one. */
export const ENGINE_PATHS = Object.freeze([
  'token:plain',
  'token:assignment',
  'token:with-evidence',
  'token:with-depth',
  'progress:v2-record',
  'progress:resume-at-sid',
  'backup:build',
  'backup:restore-same-lesson',
  'report:ledger-entries',
  'author-bar:clean-step',
  'author-bar:step-jump',
  'pin:none',
  'pin:same',
  'pin:compatible',
  'pin:major',
  'pin:moved',
  'pin:unpinned',
]);

export async function derive() {
  const { INVESTIGATIONS, getInvestigation } = await load(
    'js/data/investigations.js'
  );
  const { withDepth } = await load('js/investigations/depth.js');
  const { depthsOf } = await load('js/investigations/depthPure.js');
  const { ACTIVITIES } = await load('js/data/activities.js');
  const { resolvedSteps } = await load('js/activities/activities.js');
  const { MANIFEST } = await load('js/data/investigations/registry.js');

  const lessons = new Map();
  const lessonTokens = new Map();
  for (const meta of INVESTIGATIONS) {
    const laid = await withDepth(await getInvestigation(meta.id), 'en');
    lessons.set(meta.id, laid);
    const locales = ['en', ...(MANIFEST?.[meta.id]?.locales ?? ['es'])].filter(
      (l, i, a) => a.indexOf(l) === i
    );
    lessonTokens.set(
      meta.id,
      lessonFeatures(laid, { depths: depthsOf(laid), locales })
    );
  }

  const activityTokens = new Map();
  const cuts = [];
  for (const a of ACTIVITIES) {
    for (const format of a.formats ?? []) {
      const lesson = lessons.get(a.lesson);
      const resolved = resolvedSteps(lesson, format);
      cuts.push({ activity: a.id, format: format.id, lesson: a.lesson });
      const tokens = formatFeatures(a, format, resolved, lesson);
      activityTokens.set(`${a.id}/${format.id}`, tokens);
    }
  }

  const lessonCover = greedyCover(lessonTokens);
  const activityCover = greedyCover(activityTokens);
  const totalTokens = new Set([...lessonTokens.values()].flatMap(s => [...s]))
    .size;
  const stepTypes = {};
  for (const l of lessons.values()) {
    for (const s of l.steps) stepTypes[s.type] = (stepTypes[s.type] || 0) + 1;
  }

  return {
    lessons: lessonCover.picked,
    lessonGain: lessonCover.gain,
    activities: activityCover.picked,
    activityGain: activityCover.gain,
    enginePaths: [...ENGINE_PATHS],
    totals: {
      investigations: lessons.size,
      steps: [...lessons.values()].reduce((n, l) => n + l.steps.length, 0),
      activityCuts: cuts.length,
      lessonTokens: totalTokens,
      activityTokens: new Set([...activityTokens.values()].flatMap(s => [...s]))
        .size,
      stepTypes,
    },
  };
}

export function table(d) {
  const rows = [
    '| # | Investigation | Tokens it adds |',
    '|---|---|---|',
    ...d.lessons.map(
      (id, i) =>
        `| ${i + 1} | \`${id}\` | ${d.lessonGain[id].length}: ${d.lessonGain[id]
          .slice(0, 6)
          .map(t => `\`${t}\``)
          .join(', ')}${d.lessonGain[id].length > 6 ? ', …' : ''} |`
    ),
    '',
    '| # | Activity cut | Tokens it adds |',
    '|---|---|---|',
    ...d.activities.map(
      (id, i) =>
        `| ${i + 1} | \`${id}\` | ${d.activityGain[id].map(t => `\`${t}\``).join(', ')} |`
    ),
  ];
  return rows.join('\n');
}

/** The doc with the table between its markers replaced. */
export function withTable(doc, d) {
  const a = doc.indexOf(MARK[0]);
  const b = doc.indexOf(MARK[1]);
  if (a < 0 || b < a) throw new Error(`${DOC_FILE} lost its coverage markers`);
  return `${doc.slice(0, a + MARK[0].length)}\n\n${table(d)}\n\n${doc.slice(b)}`;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const argv = process.argv.slice(2);
  const d = await derive();
  const json = JSON.stringify(d, null, 2) + '\n';
  const file = path.join(ROOT, COVERAGE_FILE);
  const docFile = path.join(ROOT, DOC_FILE);
  if (argv.includes('--write')) {
    writeFileSync(file, json);
    writeFileSync(docFile, withTable(readFileSync(docFile, 'utf8'), d));
    console.log(`wrote ${COVERAGE_FILE} and the table in ${DOC_FILE}`);
  } else if (argv.includes('--check')) {
    const have = existsSync(file) ? readFileSync(file, 'utf8') : '';
    const doc = readFileSync(docFile, 'utf8');
    if (have !== json || doc !== withTable(doc, d)) {
      console.error(
        `${COVERAGE_FILE} or the table in ${DOC_FILE} is stale: run npm run lesson:coverage -- --write`
      );
      process.exit(1);
    }
    console.log('lesson coverage table is current');
  } else {
    console.log(table(d));
    console.log(
      `\n${d.lessons.length} of ${d.totals.investigations} investigations, ` +
        `${d.activities.length} of ${d.totals.activityCuts} activity cuts cover ` +
        `${d.totals.lessonTokens} + ${d.totals.activityTokens} tokens.`
    );
  }
}
