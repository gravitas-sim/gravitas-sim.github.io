#!/usr/bin/env node
// =============================================================================
// npm run label:golden [-- --regenerate-label-golden]
// -----------------------------------------------------------------------------
// The label golden of Roadmap III Prompt 144: every number and unit string the
// lesson data and the instrument widgets print, in English and Spanish,
// recorded once so a migration to js/format.js and js/units/registry.js can be
// shown to print the same.
//
//   npm run label:golden                              what is recorded, and
//                                                     whether the files agree
//   npm run label:golden -- --regenerate-label-golden rewrite the fixtures
//
// Rewrites only when asked by name, for the reason tools/lesson-golden.mjs
// gives: rerecording accepts every difference between the golden and the
// lessons, so it is done on purpose, in its own commit, with the diff read.
// What is recorded, and how, is in tests/labelGolden/record.mjs (the lessons)
// and tests/labelGolden/widgets.mjs (the instruments); the tests are
// tests/labelGolden.test.js and tests/labelGoldenWidgets.test.js.
// =============================================================================

import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { recordAll } from '../tests/labelGolden/record.mjs';
import { recordWidgets } from '../tests/labelGolden/widgets.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const LESSON_DIR = 'tests/labelGolden/fixtures/lessons';
export const COVERAGE_FILE = 'tests/labelGolden/coverage.json';
export const FLAG = '--regenerate-label-golden';
export const WIDGET_DIR = 'tests/labelGolden/fixtures/widgets';
export const WIDGET_COVERAGE_FILE = 'tests/labelGolden/coverage-widgets.json';

/**
 * A recording as text: one line per step, per label list and per finding, so a
 * changed label is a changed line in a review rather than a changed file.
 * @param {*} value
 * @returns {string}
 */
export function serialize(value) {
  const write = (v, depth) => {
    if (v === null || typeof v !== 'object' || depth >= 4)
      return JSON.stringify(v);
    const pad = ' '.repeat(depth + 1);
    const end = ' '.repeat(depth);
    if (Array.isArray(v))
      return v.length
        ? `[\n${v.map(x => pad + write(x, depth + 1)).join(',\n')}\n${end}]`
        : '[]';
    const keys = Object.keys(v);
    return keys.length
      ? `{\n${keys
          .map(k => `${pad}${JSON.stringify(k)}: ${write(v[k], depth + 1)}`)
          .join(',\n')}\n${end}}`
      : '{}';
  };
  return `${write(value, 0)}\n`;
}

/** Which of the family's toFixed and toPrecision calls a recording ran. */
export function coverageOf(all) {
  const reached = new Set(all.reached);
  return {
    family: 'js/data/investigations',
    calls: all.sites.length,
    reached: all.sites.filter(s => reached.has(s)).length,
    unreached: all.sites.filter(s => !reached.has(s)),
  };
}

/** Which of the widgets' toFixed and toPrecision calls a recording ran. */
export function widgetCoverageOf(all) {
  const reached = new Set(all.reached);
  return {
    family: 'js/*Widgets.js',
    calls: all.sites.length,
    reached: all.sites.filter(s => reached.has(s)).length,
    unreached: all.sites.filter(s => !reached.has(s)),
    // A widget that threw while it was read: a reading the golden cannot
    // vouch for, so the list is held.
    threw: Object.values(all.families)
      .flatMap(f => Object.entries(f))
      .filter(([, rec]) => /"threw"/.test(JSON.stringify(rec.en)))
      .map(([id]) => id),
  };
}

export const fixtureName = id => `${id}.json`;

/** The committed widget fixtures, by family. */
export function committedWidgets() {
  const dir = path.join(ROOT, WIDGET_DIR);
  const out = {};
  for (const f of readdirSync(dir).filter(f => f.endsWith('.json')))
    out[f.replace(/\.json$/, '')] = readFileSync(path.join(dir, f), 'utf8');
  return out;
}

/** The committed fixtures, by lesson id. */
export function committed() {
  const dir = path.join(ROOT, LESSON_DIR);
  const out = {};
  for (const f of readdirSync(dir).filter(f => f.endsWith('.json')))
    out[f.replace(/\.json$/, '')] = readFileSync(path.join(dir, f), 'utf8');
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const all = await recordAll();
  const widgetRecording = await recordWidgets();
  const coverage = coverageOf(all);
  const lessons = Object.values(all.lessons);
  const count = pick => lessons.reduce((n, l) => n + pick(l), 0);
  const steps = locale =>
    count(l => {
      const s =
        l.steps[locale === 'es' && l.steps.es === 'same' ? 'en' : locale];
      return Object.keys(s).length;
    });
  console.log(
    `${lessons.length} lessons, both locales: ` +
      `${count(l => l.static.en.units.length)} unit strings, ` +
      `${count(l => l.static.en.numbered.length)} numbered labels ` +
      `(${count(l => l.static.es.numbered.length)} that differ in Spanish), ` +
      `${steps('en')} steps with a printing function, ` +
      `${count(l => l.numeric.answers.length)} numeric answers; ` +
      `toFixed/toPrecision calls reached ${coverage.reached} of ${coverage.calls}; ` +
      `${count(l => l.precision.length)} precision finding(s)`
  );
  const wc = widgetCoverageOf(widgetRecording);
  const widgetList = Object.values(widgetRecording.families).flatMap(f =>
    Object.values(f)
  );
  console.log(
    `${widgetList.length} instrument widgets in ${Object.keys(widgetRecording.families).length} families, both locales: ` +
      `${widgetList.reduce((n, w) => n + w.en.frames, 0)} readings; ` +
      `toFixed/toPrecision calls reached ${wc.reached} of ${wc.calls}; ` +
      `${widgetList.reduce((n, w) => n + w.en.precision.length, 0)} precision finding(s)`
  );
  if (process.argv.includes(FLAG)) {
    const dir = path.join(ROOT, LESSON_DIR);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    for (const [id, rec] of Object.entries(all.lessons))
      writeFileSync(path.join(dir, fixtureName(id)), serialize(rec));
    writeFileSync(path.join(ROOT, COVERAGE_FILE), serialize(coverage));
    console.log(`wrote ${lessons.length} fixtures in ${LESSON_DIR}`);
    const wdir = path.join(ROOT, WIDGET_DIR);
    rmSync(wdir, { recursive: true, force: true });
    mkdirSync(wdir, { recursive: true });
    for (const [family, rec] of Object.entries(widgetRecording.families))
      writeFileSync(path.join(wdir, fixtureName(family)), serialize(rec));
    writeFileSync(
      path.join(ROOT, WIDGET_COVERAGE_FILE),
      serialize(widgetCoverageOf(widgetRecording))
    );
    console.log(
      `wrote ${Object.keys(widgetRecording.families).length} fixtures in ${WIDGET_DIR}`
    );
  } else {
    const files = committed();
    const stale = Object.entries(all.lessons)
      .filter(([id, rec]) => files[id] !== serialize(rec))
      .map(([id]) => id);
    const strays = Object.keys(files).filter(id => !all.lessons[id]);
    const wfiles = committedWidgets();
    const wstale = Object.entries(widgetRecording.families)
      .filter(([f, rec]) => wfiles[f] !== serialize(rec))
      .map(([f]) => `${f} (widgets)`);
    const wstrays = Object.keys(wfiles)
      .filter(f => !widgetRecording.families[f])
      .map(f => `${f} (widgets, no family)`);
    if (stale.length || strays.length || wstale.length || wstrays.length) {
      console.error(
        `The label golden is out of date: ${[...stale, ...strays.map(s => `${s} (no lesson)`), ...wstale, ...wstrays].join(', ')}.\n` +
          `If the change is meant: npm run label:golden -- ${FLAG}`
      );
      process.exit(1);
    }
    console.log('The label golden agrees with the lessons.');
  }
}
