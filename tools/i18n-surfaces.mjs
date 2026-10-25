// =============================================================================
// Which surfaces are English only, and is that a decision or an accident?
// -----------------------------------------------------------------------------
// A page that carries no Spanish is a gap unless somebody decided it should.
// tools/i18n-surfaces.json is where the decision is written (id, path, reason,
// where it was decided); this file holds the pages to it:
//
//   * every page (directory/index.html, and the front door) carries Spanish -
//     a gs-en span with a gs-es span after it, or a data-i18n message id - or is
//     declared English only;
//   * a page declared English only carries none (the declaration is stale
//     otherwise, and a page that gained its Spanish should lose the exemption);
//   * every declaration names a path that exists, a reason and a source.
//
// Prose is not judged here. Pure of the clock; reads the pages and the file.
// =============================================================================

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { pageFiles, pageHtml } from './i18n-sources.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SURFACES_FILE = path.join(ROOT, 'tools', 'i18n-surfaces.json');

/** Whether a page's markup carries any Spanish. */
export const carriesSpanish = html =>
  /class="[^"]*\bgs-es\b/.test(html) || /\bdata-i18n(?:-[a-z-]+)?="/.test(html);

/**
 * Hold the pages and the declarations to each other.
 *
 * @param {object} [options] - Where to read
 * @param {object} [options.surfaces] - The declarations, parsed
 * @param {string[]} [options.pages] - Page paths
 * @param {(file: string) => string} [options.html] - A page's markup
 * @param {(file: string) => boolean} [options.exists] - Whether a path exists
 * @returns {{problems: string[], pages: number, declared: number}} Result
 */
export function checkSurfaces({
  surfaces = JSON.parse(readFileSync(SURFACES_FILE, 'utf8')),
  pages = pageFiles(),
  html = pageHtml,
  exists = f => existsSync(path.join(ROOT, f)),
} = {}) {
  const problems = [];
  const declared = new Map();
  for (const s of surfaces.englishOnly ?? []) {
    for (const field of ['id', 'kind', 'path', 'reason', 'decided'])
      if (typeof s[field] !== 'string' || !s[field].trim())
        problems.push(`surface ${s.id ?? '(no id)'}: "${field}" is missing`);
    if (declared.has(s.path))
      problems.push(`surface ${s.id}: ${s.path} is declared twice`);
    declared.set(s.path, s);
    if (s.path && !exists(s.path))
      problems.push(
        `surface ${s.id}: ${s.path} does not exist; remove the declaration`
      );
  }
  for (const page of pages) {
    const spanish = carriesSpanish(html(page));
    if (declared.has(page) && spanish)
      problems.push(
        `${page} is declared English only and carries Spanish; remove its declaration from tools/i18n-surfaces.json`
      );
    if (!declared.has(page) && !spanish)
      problems.push(
        `${page} carries no Spanish and is not declared English only; translate it, or declare it (TRANSLATION.md)`
      );
  }
  return { problems, pages: pages.length, declared: declared.size };
}
