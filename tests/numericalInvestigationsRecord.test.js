// =============================================================================
// The numerical-methods investigations record (Roadmap III, Prompt 270)
// -----------------------------------------------------------------------------
// NUMERICAL_INVESTIGATIONS.md is a record: the five investigations were not built. This holds that
// the facts the record rests on are still facts about the tree, so that it cannot go stale in
// silence, and that the register states what the record states:
//
//   - none of the five investigations exists as a file or a manifest entry;
//   - the engine's integrator table, the 3-D kernel's schemes and its adaptive step with its
//     per-step hook are what section 3 says they are;
//   - 265's ensemble module is imported by nothing outside itself and 152's interpolation is still
//     not installed by the service worker (no page adopter yet);
//   - the two nearest lessons still say they run on the compute page;
//   - the instructor closure is under its cap and the file the record names has a line ceiling;
//   - the document names the five titles, the rows D-R10-270-01 to -03 exist and are DELEGATED,
//     and nothing in the document holds a home path.
// A build that lands the investigations updates this file in the same PR.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { sourcePathsFor } from '../tools/instructor-freshness.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(path.join(REPO, f), 'utf8');
const doc = read('NUMERICAL_INVESTIGATIONS.md');
const register = read('DECISION_REGISTER.md');

function walk(dir) {
  const out = [];
  for (const name of readdirSync(path.join(REPO, dir))) {
    const rel = `${dir}/${name}`;
    if (statSync(path.join(REPO, rel)).isDirectory()) out.push(...walk(rel));
    else if (rel.endsWith('.js') || rel.endsWith('.mjs')) out.push(rel);
  }
  return out;
}

describe('what was not built', () => {
  test('no investigation file or manifest entry for any of the five', () => {
    const files = readdirSync(path.join(REPO, 'js/data/investigations'));
    const pattern =
      /euler|adaptive-step|chaos-measured|periodogram-from-scratch|interpolating-the-models|numerics-sequence|numerical-investigations/;
    expect(files.filter(f => pattern.test(f))).toEqual([]);
    const manifest = read('js/data/investigations/manifest.js');
    expect(manifest).not.toMatch(pattern);
  });

  test('the instructor closure is under its cap and the record names a file with a line ceiling', () => {
    expect(sourcePathsFor(REPO).length).toBeLessThan(307);
    const ceilings = JSON.parse(
      read('tools/module-size-ceilings.json')
    ).ceilings;
    expect(typeof ceilings['js/data/investigations/gaia-sequence.js']).toBe(
      'number'
    );
  });
});

describe('the substrate the record describes', () => {
  test("the sandbox engine's integrator table", () => {
    expect(read('js/engine/state.js')).toMatch(
      /INTEGRATORS = \['Symplectic Euler', 'Velocity Verlet', 'RK4'\]/
    );
  });

  test("the 3-D kernel's schemes and its adaptive step with a per-step hook", () => {
    const kernel = read('js/lab3d/kernel.js');
    expect(kernel).toMatch(
      /SCHEMES = Object\.freeze\(\{ leapfrog, yoshida4, yoshida4c, rk4 \}\)/
    );
    expect(kernel).toMatch(/export function dopri5\(/);
    expect(kernel).toMatch(/onStep/);
    expect(kernel).not.toMatch(/explicit Euler|\beuler\b/i);
  });

  test("265's ensemble module has no importer outside itself", () => {
    const importers = walk('js')
      .filter(f => !f.startsWith('js/experiments/ensemble/'))
      .filter(f =>
        /from\s+'[^']*experiments\/ensemble\/|from\s+'\.\/ensemble\/|import\('[^']*ensemble\//.test(
          read(f)
        )
      );
    expect(importers).toEqual([]);
  });

  test("152's interpolation is not yet installed by the service worker", () => {
    expect(read('tools/build-service-worker.mjs')).toMatch(
      /\^js\\\/numeric\\\/\(roots\|interp\)\\\.js\$/
    );
  });

  test('the two nearest lessons are still compute-page companions, and the divergence module still refuses', () => {
    expect(read('js/data/investigations/integrators-in-practice.js')).toMatch(
      /on the compute page/
    );
    expect(read('js/data/investigations/two-periodograms.js')).toMatch(
      /compute page/
    );
    expect(read('js/chaos/divergence.js')).toMatch(
      /The refusal is the important part/
    );
  });
});

describe('the record and the register', () => {
  test('the document names the five investigations and the outcome', () => {
    for (const title of [
      'How wrong is Euler?',
      'Adaptive steps',
      'Chaos, measured',
      'A periodogram from scratch',
      'Interpolating the models',
    ]) {
      expect(doc).toContain(title);
    }
    expect(doc).toMatch(
      /\*\*Outcome: a record, not the five investigations\.\*\*/
    );
  });

  test('the rows D-R10-270-01 to -03 exist, are DELEGATED, and cite the record', () => {
    for (const id of ['D-R10-270-01', 'D-R10-270-02', 'D-R10-270-03']) {
      const line = register.split('\n').find(l => l.startsWith(`| ${id} |`));
      expect(line).toBeDefined();
      expect(line).toContain('**DELEGATED**');
      expect(line).toContain('NUMERICAL_INVESTIGATIONS.md');
      expect(line.trim().endsWith('| 270 |')).toBe(true);
    }
  });

  test('the document holds no home path and no instructor passphrase', () => {
    expect(doc).not.toMatch(/\/Users\/|\/home\/|C:\\\\Users/);
    expect(doc).not.toMatch(/passphrase\s*[:=]/i);
  });
});
