#!/usr/bin/env node
// =============================================================================
// npm run label:golden:investigations [-- --regenerate-label-golden]
// -----------------------------------------------------------------------------
// The label golden of Roadmap III Prompt 144, third family: what the lesson
// engine's figures (js/investigations/*, js/lesson/*) and the Observatory
// (js/observatory/**, js/observatoryPage.js) print, in English and Spanish,
// recorded once so a migration to js/format.js can be shown to print the same.
//
//   npm run label:golden:investigations                      does the recording
//                                                            agree with the code?
//   npm run label:golden:investigations -- --regenerate-label-golden
//                                                            rewrite the fixtures
//
// Rewrites only when asked by name, for the reason tools/label-golden.mjs
// gives: re-recording accepts every difference, so it is done on purpose, in its
// own commit, with the diff read. What is recorded, and how, is in
// tests/labelGolden/investigations.mjs; the test is
// tests/labelGoldenInvestigations.test.js.
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
import { recordInvestigations } from '../tests/labelGolden/investigations.mjs';
import { FLAG, serialize } from './label-golden.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SURFACE_DIR = 'tests/labelGolden/fixtures/investigations';
export const COVERAGE_FILE = 'tests/labelGolden/coverage-investigations.json';

/** Which of the family's toFixed and toPrecision calls a recording ran. */
export function coverageOf(all) {
  const reached = new Set(all.reached);
  return {
    family:
      'js/investigations/*, js/lesson/*, js/observatory/**, js/observatoryPage.js',
    calls: all.sites.length,
    reached: all.sites.filter(s => reached.has(s)).length,
    unreached: all.sites.filter(s => !reached.has(s)),
    // What each reached call ever wrote or was handed that fixed() writes
    // differently; a site with neither is the only kind that moves.
    hazards: Object.fromEntries(
      Object.entries(all.hazards)
        .filter(([, h]) => h.hyphen || h.nonFinite)
        .map(([site, h]) => [
          site,
          [h.hyphen && 'hyphen', h.nonFinite && 'non-finite'].filter(Boolean),
        ])
    ),
  };
}

/** The committed fixtures, by surface. */
export function committed() {
  const dir = path.join(ROOT, SURFACE_DIR);
  const out = {};
  for (const f of readdirSync(dir).filter(f => f.endsWith('.json')))
    out[f.replace(/\.json$/, '')] = readFileSync(path.join(dir, f), 'utf8');
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const all = await recordInvestigations();
  const coverage = coverageOf(all);
  const plots = all.surfaces.plots.en;
  console.log(
    `${Object.keys(all.surfaces).length} surfaces, both locales: ` +
      `${all.surfaces.ellipse.en.positions} eccentricities, ` +
      `${Object.values(plots).reduce((n, l) => n + Object.keys(l).length, 0)} lesson plots, ` +
      `${all.surfaces.archive.en.length} archive positions; ` +
      `toFixed/toPrecision calls reached ${coverage.reached} of ${coverage.calls}`
  );
  if (process.argv.includes(FLAG)) {
    const dir = path.join(ROOT, SURFACE_DIR);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    for (const [name, rec] of Object.entries(all.surfaces))
      writeFileSync(path.join(dir, `${name}.json`), serialize(rec));
    writeFileSync(path.join(ROOT, COVERAGE_FILE), serialize(coverage));
    console.log(
      `wrote ${Object.keys(all.surfaces).length} fixtures in ${SURFACE_DIR}`
    );
  } else {
    const files = committed();
    const stale = Object.entries(all.surfaces)
      .filter(([name, rec]) => files[name] !== serialize(rec))
      .map(([name]) => name);
    const strays = Object.keys(files).filter(name => !all.surfaces[name]);
    if (stale.length || strays.length) {
      console.error(
        `The investigations label golden is out of date: ${[...stale, ...strays.map(s => `${s} (no surface)`)].join(', ')}.\n` +
          `If the change is meant: npm run label:golden:investigations -- ${FLAG}`
      );
      process.exit(1);
    }
    console.log('The investigations label golden agrees with the code.');
  }
}
