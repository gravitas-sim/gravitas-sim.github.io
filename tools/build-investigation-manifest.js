#!/usr/bin/env node
// =============================================================================
// Generate js/data/investigations/manifest.js
// -----------------------------------------------------------------------------
// The lesson browser draws ten cards. Every field on a card - title, subtitle,
// duration, level, summary, thumbnail, series, step count, objective count -
// is a handful of bytes, and reading them out of the lessons themselves means
// loading 225KB of lesson text to render a grid.
//
// So the card-level fields are lifted into a manifest that ships with the
// application, and this script writes it. It is generated rather than
// hand-maintained because every value in it is a copy of a value in a lesson,
// and a copy someone has to remember to update is a copy that goes stale.
//
//   npm run manifest
//
// tests/investigationRegistry.test.js regenerates it in memory and fails if the
// checked-in file differs, so forgetting to run this is a red test rather than
// a browser quietly showing last month's step counts.
// =============================================================================

import { writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// Namespace import: Prettier's package exposes its API as named exports, and
// the default binding is absent under the test runner's ESM interop.
import * as prettier from 'prettier';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { mergeTranslation } from '../js/data/investigations/i18n.js';
// From the pure helper rather than from the barrel's re-export: this script has
// to run when js/data/investigations/manifest.js does not exist yet, and the
// barrel's own path to gradedSteps must not depend on the file being generated.
import { gradedSteps } from '../js/data/investigations/catalogue.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(HERE, '..', 'js', 'data', 'investigations');
export const MANIFEST_PATH = path.join(DIR, 'manifest.js');

/**
 * Locales with a translated manifest.
 *
 * The browser draws ten cards before any lesson is loaded, so the titles and
 * summaries on those cards cannot come from the lessons: they have to be in the
 * manifest, and therefore there has to be a manifest per language.
 */
export const TRANSLATED_LOCALES = ['es'];

/** Where a locale's manifest lives. English is the bare one. */
export const manifestPathFor = locale =>
  locale === 'en' ? MANIFEST_PATH : path.join(DIR, `manifest.${locale}.js`);

const HEADER = `// =============================================================================
// Lesson manifest - GENERATED, do not edit
// -----------------------------------------------------------------------------
// Written by tools/build-investigation-manifest.js from the lesson files in
// this directory. Run \`npm run manifest\` after changing a lesson's title,
// subtitle, duration, level, summary, thumbnail, series, steps or objectives.
//
// This is what the lesson browser reads. It carries exactly what a card shows
// and nothing else, so ten cards cost a few kilobytes instead of the 225KB the
// ten lessons weigh. The counts are counts rather than the arrays themselves:
// a card quotes "35 steps", it does not render them.
// =============================================================================
`;

/** The subset of a lesson that a browser card needs. */
const entryOf = inv => ({
  id: inv.id,
  title: inv.title,
  subtitle: inv.subtitle,
  duration: inv.duration,
  level: inv.level,
  summary: inv.summary,
  thumbnail: inv.thumbnail,
  ...(inv.series ? { series: inv.series } : {}),
  stepCount: inv.steps.length,
  gradedCount: gradedSteps(inv).length,
  objectiveCount: inv.objectives?.length || 0,
});

/**
 * The manifest as data.
 *
 * Separate from rendering it so a test can compare it against the checked-in
 * MANIFEST without going near Prettier: under the test runner the `prettier`
 * specifier resolves to the standalone build, which has no `resolveConfig`.
 * Data is the invariant that matters anyway - formatting is what
 * `npm run format:check` is for.
 *
 * @returns {Array<Object>} One entry per lesson, in catalogue order
 */
export const manifestEntries = (lessons = INVESTIGATIONS) =>
  lessons.map(entryOf);

/**
 * The catalogue in one language.
 *
 * Built by laying each translation over its lesson and reading the card fields
 * off the result, so a manifest cannot say something the lesson does not.
 *
 * @param {string} locale - A locale id
 * @returns {Promise<Array<Object>>} Manifest entries in that language
 */
export async function localisedEntries(locale) {
  if (locale === 'en') return manifestEntries();
  const translated = [];
  for (const inv of INVESTIGATIONS) {
    const words = (
      await import(`../js/data/investigations/${locale}/${inv.id}.js`)
    ).default;
    translated.push(mergeTranslation(inv, words));
  }
  return manifestEntries(translated);
}

/**
 * Render the manifest module.
 *
 * Run through Prettier with the repository's own configuration, because the
 * result is a checked-in source file that `npm run format:check` will read like
 * any other - a generator that emits JSON quoting would fail the format gate
 * every time it ran.
 *
 * @returns {Promise<string>} The file contents
 */
export async function renderManifest(locale = 'en') {
  const entries = await localisedEntries(locale);
  const raw = `${HEADER}\nexport const MANIFEST = ${JSON.stringify(entries, null, 2)};\n`;
  const options = (await prettier.resolveConfig(MANIFEST_PATH)) || {};
  return prettier.format(raw, { ...options, filepath: MANIFEST_PATH });
}

/** @returns {string} What is on disk today, or the empty string */
export const currentManifest = (locale = 'en') => {
  try {
    return readFileSync(manifestPathFor(locale), 'utf8');
  } catch {
    return '';
  }
};

// Only when run directly: importing this from a test must not write a file.
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  for (const locale of ['en', ...TRANSLATED_LOCALES]) {
    const file = manifestPathFor(locale);
    const next = await renderManifest(locale);
    const changed = currentManifest(locale) !== next;
    writeFileSync(file, next);
    console.log(
      `${changed ? 'Wrote' : 'Unchanged'}: ${path.relative(process.cwd(), file)} ` +
        `(${INVESTIGATIONS.length} lessons, ${locale})`
    );
  }
}
