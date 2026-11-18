#!/usr/bin/env node
// =============================================================================
// The lesson standard's ratchet
// -----------------------------------------------------------------------------
//   node tools/lesson-standard.mjs            check the lessons against the record
//   node tools/lesson-standard.mjs --list     every finding, by lesson and step
//   node tools/lesson-standard.mjs --record   lower the record to today's counts
//
// tools/authoring/standardRules.mjs finds the patterns. This holds the count of
// each rule per lesson in tools/lesson-standard-ratchet.json, seeded from the
// tip, so that a lesson already carrying a pattern is not failed for it and a
// lesson that does not carry one never starts. A count above its record fails.
// A count below it fails too, until `--record` lowers the file, so the record
// can only fall. The same discipline as tools/number-ratchet.mjs.
//
// The `content/completion` entry is the rule that warns when a lesson's last
// step is graded, run on every depth's layout. It is recorded at zero.
//
// `--record` also writes `leakFree` and the unreviewed `decision` markers into
// docs/lesson-acceptance.json, the one place a lesson's decision and leak
// status are read.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LEAK_RULES,
  REPORT_ONLY,
  STANDARD_RULES as FINDING_RULES,
  completionFindings,
  layOut,
  makeView,
  viewFindings,
} from './authoring/standardRules.mjs';
import { loadMap } from './authoring/neutralStart.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const RECORD = path.join(ROOT, 'tools', 'lesson-standard-ratchet.json');
export const ACCEPTANCE = path.join(ROOT, 'docs', 'lesson-acceptance.json');

/** What each rule is for, with the one that counts unreviewed decisions. */
export const STANDARD_RULES = {
  ...FINDING_RULES,
  'acceptance/decision-unreviewed':
    "A lesson's acceptance entry records what the student decides (docs/lesson-acceptance.json); an unreviewed one is counted, and may only fall",
};

/** The rule that counts lessons whose acceptance entry has not been read against Q4. */
export const DECISION_RULE = 'acceptance/decision-unreviewed';
/** The value that says so. */
export const UNREVIEWED = 'unreviewed';

/**
 * Every finding over the catalog, and the layouts the completion rule ran on.
 *
 * @param {object} inputs - From loadAuthoringInputs()
 * @param {object} depth - `{ depthSources, depthLessons }` from js/investigations/depth.js
 * @returns {Promise<{findings: Array<object>, layouts: number}>}
 */
export async function standardFindings(inputs, depth) {
  const findings = [];
  let layouts = 0;
  const context = { widgets: inputs.widgets, map: loadMap() };
  for (const core of inputs.investigations) {
    const { laid, shadows } = await layOut(core, {
      ...depth,
      shadow: inputs.translations?.es?.[core.id],
    });
    findings.push(...viewFindings(makeView(laid, shadows, context)));
    findings.push(...completionFindings(inputs, laid));
    layouts += 3;
  }
  return { findings, layouts };
}

/** `{ rule: { lesson: count } }`, with nothing recorded for a count of zero. */
export function countFindings(findings) {
  const out = Object.fromEntries(
    [...Object.keys(FINDING_RULES), DECISION_RULE].map(r => [r, {}])
  );
  for (const f of findings) {
    out[f.rule] ??= {};
    out[f.rule][f.lesson] = (out[f.rule][f.lesson] ?? 0) + 1;
  }
  return out;
}

/** The lessons whose acceptance entry marks its decision unreviewed, as findings. */
export function decisionFindings(acceptance) {
  return Object.entries(acceptance?.lessons ?? {})
    .filter(([, e]) => e?.decision === UNREVIEWED)
    .map(([id]) => ({
      rule: DECISION_RULE,
      lesson: id,
      step: null,
      sid: null,
      lang: 'en',
      message: 'its acceptance entry has not recorded what the student decides',
    }));
}

/**
 * Compare today's counts with the record.
 *
 * @param {object} counts - From countFindings()
 * @param {object} record - The parsed ratchet file
 * @returns {Array<{rule: string, lesson: string, level: string, message: string}>}
 */
export function compare(counts, record) {
  const out = [];
  const rules = new Set([
    ...Object.keys(counts),
    ...Object.keys(record?.rules ?? {}),
  ]);
  for (const rule of [...rules].sort()) {
    const have = counts[rule] ?? {};
    const held = record?.rules?.[rule] ?? {};
    const level = REPORT_ONLY.has(rule) ? 'warn' : 'error';
    for (const lesson of [
      ...new Set([...Object.keys(have), ...Object.keys(held)]),
    ].sort()) {
      const n = have[lesson] ?? 0;
      const r = held[lesson] ?? 0;
      if (n > r)
        out.push({
          rule,
          lesson,
          level,
          message: `${lesson} has ${n} finding(s) of ${rule}; the ratchet allows ${r}. Remove the new one, do not raise the record.`,
        });
      else if (n < r)
        out.push({
          rule,
          lesson,
          level,
          message: `${lesson} has ${n} finding(s) of ${rule}, below the recorded ${r}. Lower the record: node tools/lesson-standard.mjs --record`,
        });
    }
  }
  return out;
}

/** The record as it is written: sorted, one count per line. */
export function recordText(counts) {
  const rules = {};
  for (const rule of Object.keys(counts).sort()) {
    rules[rule] = Object.fromEntries(
      Object.entries(counts[rule])
        .filter(([, n]) => n > 0)
        .sort(([a], [b]) => (a < b ? -1 : 1))
    );
  }
  return `${JSON.stringify(
    {
      note: 'Findings of each lesson-standard rule per lesson (tools/authoring/standardRules.mjs), seeded from the tip. A lesson may not rise above its count, and one that falls has its count lowered here with node tools/lesson-standard.mjs --record. An absent lesson holds zero. `content/completion` is the rule that warns when a lesson ends on a graded step, run on the core, quantitative and advanced layouts, and is held at zero. `acceptance/decision-unreviewed` counts lessons whose acceptance entry has not yet recorded what the student decides.',
      rules,
    },
    null,
    2
  )}\n`;
}

// ---- docs/lesson-acceptance.json ----------------------------------------------

/**
 * The lessons that have no leak finding: leakFree in the acceptance map.
 *
 * @param {object} counts - From countFindings()
 * @param {Array<string>} ids - Lesson ids
 * @returns {Record<string, boolean>}
 */
export function leakFreeFrom(counts, ids) {
  return Object.fromEntries(
    ids.map(id => [id, LEAK_RULES.every(r => !(counts[r]?.[id] > 0))])
  );
}

/**
 * Where the acceptance map's `leakFree` disagrees with the counts: a lesson
 * marked free of leaks that has one, or one marked with leaks that has none.
 *
 * @param {object} acceptance - The parsed acceptance map
 * @param {object} counts - From countFindings()
 * @returns {Array<{rule: string, lesson: string, level: string, message: string}>}
 */
export function leakFreeProblems(acceptance, counts) {
  const lessons = acceptance?.lessons ?? {};
  const want = leakFreeFrom(counts, Object.keys(lessons));
  return Object.entries(lessons)
    .filter(([id, e]) => e.leakFree !== want[id])
    .map(([id, e]) => ({
      rule: 'acceptance/leak-free',
      lesson: id,
      level: 'error',
      message: `${id} is recorded leakFree: ${e.leakFree}, and its leak findings say ${want[id]}. Update it: node tools/lesson-standard.mjs --record`,
    }));
}

/**
 * Write `decision` and `leakFree` into the acceptance map's text, keeping its
 * formatting. A decision already recorded is left alone; a lesson with no
 * `decision` gets the unreviewed marker (or `none` where it has no measure step).
 *
 * @param {string} text - docs/lesson-acceptance.json
 * @param {Record<string, boolean>} leakFree - From leakFreeFrom()
 * @param {Set<string>} measuring - Lessons with a core measure step
 * @returns {string} The updated text
 */
export function syncAcceptance(text, leakFree, measuring) {
  const lines = text.split('\n');
  const out = [];
  let id = null;
  let sawDecision = false;
  let sawLeak = false;
  const lessonStart = /^ {4}"([^"]+)": \{$/;
  const close = /^ {4}\}(,?)$/;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const open = lessonStart.exec(line);
    if (open) {
      id = open[1];
      sawDecision = false;
      sawLeak = false;
    }
    if (id && /^ {6}"decision":/.test(line)) sawDecision = true;
    if (id && /^ {6}"leakFree":/.test(line)) {
      sawLeak = true;
      out.push(
        `      "leakFree": ${leakFree[id]}${/,$/.test(line) ? ',' : ''}`
      );
      continue;
    }
    const end = id && close.exec(line);
    if (end) {
      // The previous line is the last property: give it a comma, then append.
      const additions = [];
      if (!sawDecision)
        additions.push(
          `      "decision": ${JSON.stringify(measuring.has(id) ? UNREVIEWED : 'none')}`
        );
      if (!sawLeak) additions.push(`      "leakFree": ${leakFree[id]}`);
      if (additions.length) {
        const last = out.length - 1;
        out[last] = out[last].replace(/,?$/, ',');
        additions.forEach((a, k) =>
          out.push(a + (k < additions.length - 1 ? ',' : ''))
        );
      }
      id = null;
    }
    out.push(line);
  }
  return out.join('\n');
}

/**
 * The ratchet's verdict in the shape author:check prints.
 *
 * @param {object} inputs - From loadAuthoringInputs()
 * @returns {Promise<Array<object>>} Findings: level, rule, lesson, step, message
 */
export async function ratchetFindings(inputs) {
  const depthModule = await import('../js/investigations/depth.js');
  const { findings } = await standardFindings(inputs, {
    depthSources: depthModule.depthSources,
    depthLessons: depthModule.DEPTH_LESSONS,
  });
  findings.push(
    ...decisionFindings(JSON.parse(readFileSync(ACCEPTANCE, 'utf8')))
  );
  const record = JSON.parse(readFileSync(RECORD, 'utf8'));
  const counts = countFindings(findings);
  const acceptance = JSON.parse(readFileSync(ACCEPTANCE, 'utf8'));
  return [
    ...compare(counts, record),
    ...leakFreeProblems(acceptance, counts),
  ].map(p => ({
    level: p.level,
    rule: p.rule,
    lesson: p.lesson,
    step: null,
    message: `${p.message} (node tools/lesson-standard.mjs --list)`,
  }));
}

// ---- command line ---------------------------------------------------------------

async function main() {
  const argv = process.argv.slice(2);
  const [{ loadAuthoringInputs }, depthModule] = await Promise.all([
    import('./authoring/inputs.mjs'),
    import('../js/investigations/depth.js'),
  ]);
  const inputs = await loadAuthoringInputs();
  const depth = {
    depthSources: depthModule.depthSources,
    depthLessons: depthModule.DEPTH_LESSONS,
  };
  const acceptance = JSON.parse(readFileSync(ACCEPTANCE, 'utf8'));
  const { findings } = await standardFindings(inputs, depth);
  findings.push(...decisionFindings(acceptance));
  const counts = countFindings(findings);

  if (argv.includes('--list')) {
    for (const f of findings.sort(
      (a, b) =>
        a.rule.localeCompare(b.rule) ||
        a.lesson.localeCompare(b.lesson) ||
        (a.step ?? -1) - (b.step ?? -1)
    ))
      console.log(
        `${f.rule}  ${f.lesson}${f.step === null ? '' : `  step ${f.step + 1} (${f.sid})`}  [${f.lang}]  ${f.message}`
      );
    return 0;
  }

  if (argv.includes('--record')) {
    const measuring = new Set(
      inputs.investigations
        .filter(l => l.steps.some(s => s.type === 'measure'))
        .map(l => l.id)
    );
    const ids = inputs.investigations.map(l => l.id);
    const synced = syncAcceptance(
      readFileSync(ACCEPTANCE, 'utf8'),
      leakFreeFrom(counts, ids),
      measuring
    );
    writeFileSync(ACCEPTANCE, synced);
    // A decision just written changes the unreviewed count: recount.
    const again = countFindings([
      ...findings.filter(f => f.rule !== DECISION_RULE),
      ...decisionFindings(JSON.parse(synced)),
    ]);
    writeFileSync(RECORD, recordText(again));
    console.log(`Recorded ${path.relative(ROOT, RECORD)}.`);
    return 0;
  }

  const record = JSON.parse(readFileSync(RECORD, 'utf8'));
  const problems = [
    ...compare(counts, record),
    ...leakFreeProblems(acceptance, counts),
  ];
  for (const p of problems)
    console.error(`${p.level === 'warn' ? 'warn' : 'error'}  ${p.message}`);
  const total = Object.values(counts).reduce(
    (n, byLesson) => n + Object.values(byLesson).reduce((a, b) => a + b, 0),
    0
  );
  console.log(
    problems.length
      ? `${problems.length} lesson-standard count(s) differ from the record.`
      : `Lesson standard holds: ${total} recorded finding(s), none new.`
  );
  return problems.some(p => p.level === 'error') ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  process.exit(await main());
