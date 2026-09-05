#!/usr/bin/env node
// =============================================================================
// One-time: give every lesson step a stable id
// -----------------------------------------------------------------------------
// Progress used to be keyed by a step's *position* - `tides:7` - and backups
// matched steps across lesson edits by a structural fingerprint. Position is
// not identity, and neither is structure: `detect-this-planet` has three
// four-option predict/choice steps whose fingerprints are byte-identical, so
// reordering two of them silently moved one student's answer onto the other's
// question.
//
// The fix is an identity that is neither: an opaque `sid` written into the
// lesson and never changed again. It survives reordering (it travels with the
// step), rewording (it is not derived from the words), and translation (the
// Spanish shadow cannot supply it - `sid` is in STRUCTURAL).
//
// This script exists to mint them once for the lessons that predate the scheme.
// New lessons get one from tools/new-investigation.mjs, and author:check
// enforces presence and uniqueness from here on. Running it again is a no-op:
// a step that already has an sid keeps it.
//
//   node tools/add-step-ids.mjs [--dry-run]
//
// The ids are slugs of the English title at minting time, because a human
// reading `gravitas_investigation_tides` in devtools should be able to tell
// which screen an answer belongs to. They are *labels*, not derivations: once
// written, renaming the step does not change its sid.
// =============================================================================

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';
import { INVESTIGATIONS } from '../js/data/investigations.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(HERE, '..', 'js', 'data', 'investigations');
const dryRun = process.argv.includes('--dry-run');

/** A short, readable, filename-safe label from a step's title. */
function slug(title, fallback) {
  const base = String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .split('-')
    .slice(0, 5)
    .join('-');
  return base || fallback;
}

/**
 * Find the object literals that are direct elements of a lesson's `steps` array.
 *
 * Parsed with acorn rather than scanned for braces. The first version of this
 * tracked quotes and template literals by hand and undercounted keplers-laws by
 * nine, because an apostrophe in a prose comment - "the student's answer" -
 * opened a string that swallowed the next brace. Lesson files are mostly
 * English prose inside a JavaScript file; there is no version of that scan that
 * is worth trusting.
 *
 * @param {string} src - The lesson module source
 * @returns {Array<{start: number, hasSid: boolean}>} One entry per step literal
 */
function stepLiterals(src) {
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module' });

  let steps = null;
  /** Walk for the `steps:` property whose value is an array of objects. */
  const visit = node => {
    if (!node || typeof node !== 'object' || steps) return;
    if (
      node.type === 'Property' &&
      ((node.key.type === 'Identifier' && node.key.name === 'steps') ||
        (node.key.type === 'Literal' && node.key.value === 'steps')) &&
      node.value.type === 'ArrayExpression'
    ) {
      steps = node.value;
      return;
    }
    for (const key of Object.keys(node)) {
      const child = node[key];
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child.type === 'string') visit(child);
    }
  };
  visit(ast);
  if (!steps) throw new Error('no steps array');

  return steps.elements.map(el => {
    if (!el || el.type !== 'ObjectExpression') {
      throw new Error(
        `a step is a ${el ? el.type : 'hole'}, not an object literal`
      );
    }
    return {
      start: el.start,
      hasSid: el.properties.some(
        p =>
          p.type === 'Property' &&
          ((p.key.type === 'Identifier' && p.key.name === 'sid') ||
            (p.key.type === 'Literal' && p.key.value === 'sid'))
      ),
    };
  });
}

let touched = 0;
let added = 0;

for (const lesson of Object.values(INVESTIGATIONS)) {
  const file = path.join(DIR, `${lesson.id}.js`);
  let src = await readFile(file, 'utf8');
  const literals = stepLiterals(src);

  if (literals.length !== lesson.steps.length) {
    throw new Error(
      `${lesson.id}: found ${literals.length} step literals but the module has ${lesson.steps.length} steps`
    );
  }

  const seen = new Set();
  const inserts = [];
  lesson.steps.forEach((step, i) => {
    if (step.sid) {
      seen.add(step.sid);
      return;
    }
    let id = slug(step.title, `step-${i + 1}`);
    let n = 2;
    while (seen.has(id)) id = `${slug(step.title, `step-${i + 1}`)}-${n++}`;
    seen.add(id);
    inserts.push({ at: literals[i].start, id });
  });

  if (!inserts.length) continue;

  // Back to front, so earlier offsets stay valid.
  for (const { at, id } of inserts.reverse()) {
    src = `${src.slice(0, at + 1)}\n      sid: '${id}',${src.slice(at + 1)}`;
  }

  added += inserts.length;
  touched++;
  if (!dryRun) await writeFile(file, src);
}

console.log(
  `${dryRun ? 'Would add' : 'Added'} ${added} step id(s) across ${touched} lesson(s).`
);
